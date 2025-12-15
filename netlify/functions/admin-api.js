// Netlify Function - API Admin para buscar dados do Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Verificação simples de admin (em produção, usar autenticação real)
    const authHeader = event.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || 'lucrocerto2024';
    
    if (authHeader !== `Bearer ${adminPassword}`) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Não autorizado' })
        };
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const path = event.path.replace('/.netlify/functions/admin-api', '');
        const action = event.queryStringParameters?.action || 'dashboard';

        // Dashboard - Estatísticas gerais
        if (action === 'dashboard') {
            // Contar usuários
            const { count: totalUsuarios } = await supabase
                .from('usuarios')
                .select('*', { count: 'exact', head: true });

            // Contar assinantes ativos (não trial)
            const { count: totalAssinantes } = await supabase
                .from('assinaturas')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')
                .neq('plano', 'trial');

            // Contar trials
            const { count: totalTrials } = await supabase
                .from('usuarios')
                .select('*', { count: 'exact', head: true })
                .eq('plano', 'trial');

            // Receita total (soma das assinaturas ativas)
            const { data: assinaturas } = await supabase
                .from('assinaturas')
                .select('valor')
                .eq('status', 'active')
                .neq('plano', 'trial');

            const receitaTotal = assinaturas?.reduce((sum, a) => sum + (a.valor || 0), 0) || 0;

            // Usuários recentes
            const { data: usuariosRecentes } = await supabase
                .from('usuarios')
                .select('id, email, nome, plano, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    totalUsuarios: totalUsuarios || 0,
                    totalAssinantes: totalAssinantes || 0,
                    totalTrials: totalTrials || 0,
                    receitaTotal: receitaTotal,
                    receitaMensal: receitaTotal, // Simplificado
                    usuariosRecentes: usuariosRecentes || []
                })
            };
        }

        // Listar todos os usuários
        if (action === 'usuarios') {
            const { data: usuarios, error } = await supabase
                .from('usuarios')
                .select(`
                    id,
                    email,
                    nome,
                    telefone,
                    plano,
                    created_at,
                    assinaturas (
                        plano,
                        status,
                        valor,
                        data_inicio,
                        data_expiracao,
                        payment_id
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ usuarios: usuarios || [] })
            };
        }

        // Listar assinantes (pagos)
        if (action === 'assinantes') {
            const { data: assinantes, error } = await supabase
                .from('assinaturas')
                .select(`
                    id,
                    plano,
                    status,
                    periodo,
                    valor,
                    data_inicio,
                    data_expiracao,
                    payment_id,
                    created_at,
                    usuarios (
                        id,
                        email,
                        nome,
                        telefone
                    )
                `)
                .neq('plano', 'trial')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ assinantes: assinantes || [] })
            };
        }

        // Listar trials
        if (action === 'trials') {
            const { data: trials, error } = await supabase
                .from('usuarios')
                .select('id, email, nome, created_at')
                .eq('plano', 'trial')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ trials: trials || [] })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Ação inválida' })
        };

    } catch (error) {
        console.error('Erro na API admin:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno', details: error.message })
        };
    }
};
