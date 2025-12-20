// Netlify Function - Criar usuário no Supabase após pagamento
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ldfahdueqzgemplxrffm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { email, nome, plano, periodo, paymentId, valor } = body;

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email é obrigatório' })
            };
        }

        // Criar cliente Supabase com service key (para bypass RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verificar se usuário já existe
        const { data: existingUser } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .single();

        let userId;

        if (existingUser) {
            userId = existingUser.id;
            console.log('Usuário existente:', userId);
        } else {
            // Criar novo usuário
            const { data: newUser, error: userError } = await supabase
                .from('usuarios')
                .insert({
                    email: email,
                    nome: nome || email.split('@')[0]
                })
                .select()
                .single();

            if (userError) {
                throw new Error('Erro ao criar usuário: ' + userError.message);
            }

            userId = newUser.id;
            console.log('Novo usuário criado:', userId);
        }

        // Calcular data de expiração
        const dataInicio = new Date();
        const dataFim = new Date();
        if (periodo === 'annual') {
            dataFim.setFullYear(dataFim.getFullYear() + 1);
        } else {
            dataFim.setMonth(dataFim.getMonth() + 1);
        }

        // Criar assinatura
        const { data: assinatura, error: assinaturaError } = await supabase
            .from('assinaturas')
            .insert({
                usuario_id: userId,
                plano: plano || 'pro',
                periodo: periodo || 'monthly',
                status: 'active',
                data_inicio: dataInicio.toISOString(),
                data_fim: dataFim.toISOString(),
                payment_id: paymentId,
                valor: valor || 0
            })
            .select()
            .single();

        if (assinaturaError) {
            console.error('Erro ao criar assinatura:', assinaturaError);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                userId: userId,
                assinaturaId: assinatura?.id,
                message: 'Usuário e assinatura criados com sucesso'
            })
        };

    } catch (error) {
        console.error('Erro:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
