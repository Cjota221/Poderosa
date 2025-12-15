// Netlify Function - Login de usuário
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Hash simples para senha
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
        const { email, password } = JSON.parse(event.body);

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
        const senhaHash = hashPassword(password);

        console.log('🔐 Tentativa de login:', emailLower);

        // Buscar usuário
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('id, email, nome, plano, senha_hash, cadastro_completo')
            .eq('email', emailLower)
            .single();

        if (userError || !user) {
            console.log('❌ Usuário não encontrado:', emailLower);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Email ou senha incorretos' })
            };
        }

        // Verificar se o cadastro foi completo
        if (!user.cadastro_completo || !user.senha_hash) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ 
                    error: 'Cadastro incompleto',
                    message: 'Complete seu cadastro primeiro.',
                    redirect: '/cadastro.html?email=' + encodeURIComponent(emailLower)
                })
            };
        }

        // Verificar senha
        if (user.senha_hash !== senhaHash) {
            console.log('❌ Senha incorreta para:', emailLower);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Email ou senha incorretos' })
            };
        }

        // Buscar assinatura ativa
        const { data: subscription } = await supabase
            .from('assinaturas')
            .select('id, plano, status, periodo, data_expiracao, data_inicio')
            .eq('usuario_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // Verificar se assinatura está ativa e não expirou
        let planoAtivo = 'trial';
        let assinaturaInfo = null;
        
        if (subscription) {
            const expiracao = new Date(subscription.data_expiracao);
            if (expiracao > new Date()) {
                planoAtivo = subscription.plano;
                assinaturaInfo = {
                    plano: subscription.plano,
                    status: subscription.status,
                    periodo: subscription.periodo,
                    data_inicio: subscription.data_inicio,
                    data_expiracao: subscription.data_expiracao
                };
            } else {
                // Assinatura expirou - atualizar status
                await supabase
                    .from('assinaturas')
                    .update({ status: 'expired' })
                    .eq('id', subscription.id);
            }
        }

        // Atualizar último login
        await supabase
            .from('usuarios')
            .update({ ultimo_login: new Date().toISOString() })
            .eq('id', user.id);

        console.log('✅ Login bem-sucedido:', emailLower, '- Plano:', planoAtivo);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Login realizado com sucesso!',
                user: {
                    id: user.id,
                    email: user.email,
                    nome: user.nome,
                    plano: planoAtivo
                },
                subscription: assinaturaInfo,
                isFirstLogin: !user.ultimo_login // Para mostrar tour de boas-vindas
            })
        };

    } catch (error) {
        console.error('❌ Erro no login:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro ao processar login',
                details: error.message 
            })
        };
    }
};
