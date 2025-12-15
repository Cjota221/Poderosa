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

        // Verificar se usuário existe e tem assinatura ativa
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('id, email, nome, plano')
            .eq('email', emailLower)
            .single();

        if (userError || !user) {
            console.log('❌ Usuário não encontrado:', emailLower);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'Nenhum pagamento encontrado para este email',
                    message: 'Você precisa fazer o pagamento primeiro. Use o mesmo email do checkout.'
                })
            };
        }

        // Verificar assinatura ativa
        const { data: subscription } = await supabase
            .from('assinaturas')
            .select('id, plano, status, data_expiracao')
            .eq('usuario_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!subscription) {
            console.log('❌ Sem assinatura ativa para:', emailLower);
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ 
                    error: 'Nenhuma assinatura ativa encontrada',
                    message: 'Seu pagamento ainda não foi confirmado ou a assinatura expirou.'
                })
            };
        }

        // Atualizar usuário com senha e dados
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({
                senha_hash: hashPassword(password),
                nome: nome || user.nome,
                telefone: telefone || null,
                cadastro_completo: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Erro ao atualizar usuário:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Erro ao salvar cadastro' })
            };
        }

        console.log('✅ Cadastro completo para:', emailLower, '- Plano:', subscription.plano);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Cadastro realizado com sucesso!',
                user: {
                    id: user.id,
                    email: user.email,
                    nome: nome || user.nome,
                    plano: subscription.plano
                },
                subscription: {
                    plano: subscription.plano,
                    status: subscription.status,
                    expira_em: subscription.data_expiracao
                }
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
