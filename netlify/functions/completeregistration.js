// Netlify Function - Completa o cadastro do usuário (cria senha)
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Hash simples para senha (em produção use bcrypt)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { email, password, nome, telefone } = JSON.parse(event.body);

        if (!email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email e senha são obrigatórios' })
            };
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Configuração do banco não encontrada' })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const emailLower = email.toLowerCase().trim();

        console.log('📧 Verificando cadastro para:', emailLower);

        // Verificar se usuário existe
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('id, email, nome, plano')
            .eq('email', emailLower)
            .single();

        let userId;
        let userPlan = 'starter';

        if (userError || !user) {
            console.log('⚠️ Usuário não encontrado, criando novo:', emailLower);
            // Criar usuário se não existir
            const { data: newUser, error: createError } = await supabase
                .from('usuarios')
                .insert({
                    email: emailLower,
                    nome: nome || emailLower.split('@')[0],
                    plano: 'starter',
                    senha_hash: hashPassword(password),
                    telefone: telefone || null,
                    cadastro_completo: true
                })
                .select()
                .single();

            if (createError) {
                console.error('❌ Erro ao criar usuário:', createError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Erro ao criar usuário: ' + createError.message })
                };
            }

            userId = newUser.id;
            userPlan = newUser.plano;
        } else {
            userId = user.id;
            userPlan = user.plano;
        }

        // Verificar assinatura ativa (opcional)
        const { data: subscription } = await supabase
            .from('assinaturas')
            .select('id, plano, status, data_expiracao')
            .eq('usuario_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // Se tem assinatura, usar o plano dela
        if (subscription) {
            userPlan = subscription.plano;
        }

        // Atualizar usuário com senha e dados (se já existia)
        if (user) {
            const { error: updateError } = await supabase
                .from('usuarios')
                .update({
                    senha_hash: hashPassword(password),
                    nome: nome || user.nome,
                    telefone: telefone || null,
                    cadastro_completo: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                console.error('❌ Erro ao atualizar usuário:', updateError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Erro ao salvar cadastro' })
                };
            }
        }

        console.log('✅ Cadastro completo para:', emailLower, '- Plano:', userPlan);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Cadastro realizado com sucesso!',
                user: {
                    id: userId,
                    email: emailLower,
                    nome: nome,
                    plano: userPlan
                },
                subscription: subscription || null
            })
        };

    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro ao processar cadastro',
                details: error.message 
            })
        };
    }
};
