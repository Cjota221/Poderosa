// Netlify Function - Verificar se email existe e status do trial
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
        const { email } = body;

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email é obrigatório' })
            };
        }

        // Validação básica de formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Email inválido',
                    valid: false 
                })
            };
        }

        // Criar cliente Supabase
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Buscar usuário pelo email
        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select(`
                id,
                email,
                nome,
                plano,
                created_at,
                assinaturas (
                    plano,
                    status,
                    data_inicio,
                    data_expiracao
                )
            `)
            .eq('email', email.toLowerCase())
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = não encontrado (ok, email novo)
            throw error;
        }

        // Se não encontrou usuário
        if (!usuario) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    exists: false,
                    canTrial: true,
                    message: 'Email disponível para novo cadastro'
                })
            };
        }

        // Usuário existe - verificar status
        const assinatura = usuario.assinaturas && usuario.assinaturas[0];
        const createdAt = new Date(usuario.created_at);
        const now = new Date();
        const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        // Verificar se trial expirou
        const trialExpired = usuario.plano === 'trial' && daysSinceCreation >= 7;

        // Verificar se tem assinatura ativa
        const hasActiveSubscription = assinatura && 
            assinatura.status === 'active' && 
            (!assinatura.data_expiracao || new Date(assinatura.data_expiracao) > now);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                exists: true,
                canTrial: false, // Já usou o trial
                userId: usuario.id,
                nome: usuario.nome,
                plano: hasActiveSubscription ? assinatura.plano : usuario.plano,
                status: hasActiveSubscription ? 'active' : (trialExpired ? 'expired' : 'trial'),
                trialExpired: trialExpired,
                hasActiveSubscription: hasActiveSubscription,
                daysUsed: daysSinceCreation,
                daysLeft: usuario.plano === 'trial' ? Math.max(0, 7 - daysSinceCreation) : null,
                message: trialExpired 
                    ? 'Seu período de teste expirou. Escolha um plano para continuar.'
                    : hasActiveSubscription 
                        ? 'Você já tem uma assinatura ativa.'
                        : `Você está no período de teste. Restam ${Math.max(0, 7 - daysSinceCreation)} dias.`
            })
        };

    } catch (error) {
        console.error('Erro ao verificar email:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
    }
};
