// Netlify Function - Iniciar Trial (salva no banco)
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
        const { email, nome, negocio } = body;

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email é obrigatório' })
            };
        }

        // Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email inválido' })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verificar se email já existe
        const { data: existingUser } = await supabase
            .from('usuarios')
            .select('id, plano, created_at')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            const createdAt = new Date(existingUser.created_at);
            const now = new Date();
            const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
            
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({ 
                    error: 'Este email já foi usado',
                    canTrial: false,
                    trialExpired: daysSinceCreation >= 7,
                    daysLeft: Math.max(0, 7 - daysSinceCreation),
                    message: 'Este email já possui uma conta. Faça login ou use outro email.'
                })
            };
        }

        // Criar novo usuário com trial
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        const { data: newUser, error: createError } = await supabase
            .from('usuarios')
            .insert({
                email: email.toLowerCase(),
                nome: nome || email.split('@')[0],
                negocio: negocio || '',
                plano: 'trial',
                plano_expira_em: trialEndDate.toISOString()
            })
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        // Criar registro de assinatura trial
        await supabase
            .from('assinaturas')
            .insert({
                usuario_id: newUser.id,
                plano: 'trial',
                status: 'active',
                periodo: 'trial',
                valor: 0,
                data_inicio: new Date().toISOString(),
                data_expiracao: trialEndDate.toISOString()
            });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                userId: newUser.id,
                email: newUser.email,
                nome: newUser.nome,
                plano: 'trial',
                trialStartDate: newUser.created_at,
                trialEndDate: trialEndDate.toISOString(),
                daysLeft: 7,
                limits: {
                    produtos: 3,
                    clientes: 5,
                    vendas: 10
                },
                features: {
                    dashboard: true,
                    produtos: true,
                    clientes: true,
                    vendas: true,
                    precificacao: true,
                    despesas: false,
                    relatorios: false,
                    catalogo: false
                },
                message: 'Conta trial criada com sucesso! Você tem 7 dias para testar.'
            })
        };

    } catch (error) {
        console.error('Erro ao criar trial:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
    }
};
