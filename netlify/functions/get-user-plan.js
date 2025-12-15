// Netlify Function - Obter dados do usuário e seu plano
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ldfahdueqzgemplxrffm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Definição das funcionalidades por plano
const PLAN_FEATURES = {
    trial: {
        name: 'Teste Grátis',
        duration: 7,
        limits: { produtos: 3, clientes: 5, vendas: 10, catalogos: 0 },
        features: {
            dashboard: true,
            produtos: true,
            clientes: true,
            vendas: true,
            precificacao: true,
            despesas: false,
            relatorios: false,
            catalogo: false,
            exportarPdf: false,
            suportePrioritario: false
        }
    },
    starter: {
        name: 'Starter',
        limits: { produtos: 20, clientes: 20, vendas: -1, catalogos: 0 },
        features: {
            dashboard: true,
            produtos: true,
            clientes: true,
            vendas: true,
            precificacao: true,
            despesas: true,
            relatorios: false,
            catalogo: false,
            exportarPdf: false,
            suportePrioritario: false
        }
    },
    pro: {
        name: 'Profissional',
        limits: { produtos: -1, clientes: -1, vendas: -1, catalogos: 1 },
        features: {
            dashboard: true,
            produtos: true,
            clientes: true,
            vendas: true,
            precificacao: true,
            despesas: true,
            relatorios: true,
            catalogo: true,
            exportarPdf: false,
            suportePrioritario: false
        }
    },
    premium: {
        name: 'Premium',
        limits: { produtos: -1, clientes: -1, vendas: -1, catalogos: -1 },
        features: {
            dashboard: true,
            produtos: true,
            clientes: true,
            vendas: true,
            precificacao: true,
            despesas: true,
            relatorios: true,
            catalogo: true,
            exportarPdf: true,
            suportePrioritario: true
        }
    }
};

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
        const { email, userId } = body;

        if (!email && !userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email ou userId é obrigatório' })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Buscar usuário
        let query = supabase
            .from('usuarios')
            .select(`
                id,
                email,
                nome,
                telefone,
                negocio,
                plano,
                plano_expira_em,
                created_at,
                assinaturas (
                    id,
                    plano,
                    status,
                    periodo,
                    valor,
                    data_inicio,
                    data_expiracao,
                    payment_id
                )
            `);

        if (userId) {
            query = query.eq('id', userId);
        } else {
            query = query.eq('email', email.toLowerCase());
        }

        const { data: usuario, error } = await query.single();

        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Usuário não encontrado' })
                };
            }
            throw error;
        }

        // Calcular status do plano
        const now = new Date();
        const createdAt = new Date(usuario.created_at);
        const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        // Buscar assinatura ativa (mais recente)
        const assinaturaAtiva = usuario.assinaturas
            ?.filter(a => a.status === 'active')
            ?.sort((a, b) => new Date(b.data_inicio) - new Date(a.data_inicio))[0];

        let planoAtual = usuario.plano || 'trial';
        let status = 'trial';
        let daysLeft = null;
        let isExpired = false;

        console.log('🔍 DEBUG get-user-plan:');
        console.log('   Usuario plano:', usuario.plano);
        console.log('   Assinatura ativa:', assinaturaAtiva);

        if (assinaturaAtiva) {
            // ✅ TEM ASSINATURA ATIVA - USAR SEMPRE O PLANO DA ASSINATURA
            planoAtual = assinaturaAtiva.plano;
            console.log('   ✅ Usando plano da assinatura:', planoAtual);
            
            // Verificar se é trial ou pago
            if (assinaturaAtiva.plano !== 'trial') {
                // Assinatura PAGA
                status = 'active';
                
                if (assinaturaAtiva.data_expiracao) {
                    const expDate = new Date(assinaturaAtiva.data_expiracao);
                    if (expDate < now) {
                        status = 'expired';
                        isExpired = true;
                        console.log('   ⚠️ Assinatura EXPIRADA');
                    } else {
                        daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
                        console.log('   ✅ Assinatura válida, dias restantes:', daysLeft);
                    }
                } else {
                    // Sem data de expiração = válida indefinidamente
                    daysLeft = null;
                    console.log('   ✅ Assinatura válida (sem expiração)');
                }
            } else {
                // Assinatura TRIAL
                status = 'trial';
                daysLeft = Math.max(0, 7 - daysSinceCreation);
                isExpired = daysLeft === 0;
                console.log('   🧪 Assinatura trial, dias restantes:', daysLeft);
            }
        } else if (usuario.plano && usuario.plano !== 'trial') {
            // Não tem assinatura mas tem plano PAGO no usuário
            planoAtual = usuario.plano;
            status = 'active';
            console.log('   ✅ Sem assinatura, mas plano do usuário:', planoAtual);
        } else {
            // Está em trial
            planoAtual = 'trial';
            daysLeft = Math.max(0, 7 - daysSinceCreation);
            isExpired = daysLeft === 0;
            status = isExpired ? 'expired' : 'trial';
            console.log('   🧪 Modo trial, dias restantes:', daysLeft);
        }

        console.log('   📊 RESULTADO FINAL - Plano:', planoAtual, 'Status:', status);

        // Obter configurações do plano
        const planConfig = PLAN_FEATURES[planoAtual] || PLAN_FEATURES.trial;

        // Contar itens do usuário
        const [produtosCount, clientesCount, vendasCount] = await Promise.all([
            supabase.from('produtos').select('id', { count: 'exact', head: true }).eq('usuario_id', usuario.id),
            supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('usuario_id', usuario.id),
            supabase.from('vendas').select('id', { count: 'exact', head: true }).eq('usuario_id', usuario.id)
        ]);

        const currentCounts = {
            produtos: produtosCount.count || 0,
            clientes: clientesCount.count || 0,
            vendas: vendasCount.count || 0
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user: {
                    id: usuario.id,
                    email: usuario.email,
                    nome: usuario.nome,
                    telefone: usuario.telefone,
                    negocio: usuario.negocio,
                    createdAt: usuario.created_at
                },
                subscription: {
                    plano: planoAtual,
                    planoNome: planConfig.name,
                    status: status,
                    isExpired: isExpired,
                    daysLeft: daysLeft,
                    isTrial: planoAtual === 'trial',
                    periodo: assinaturaAtiva?.periodo || 'trial',
                    dataInicio: assinaturaAtiva?.data_inicio || usuario.created_at,
                    dataExpiracao: assinaturaAtiva?.data_expiracao || usuario.plano_expira_em
                },
                limits: planConfig.limits,
                features: planConfig.features,
                currentUsage: currentCounts,
                canAdd: {
                    produtos: planConfig.limits.produtos === -1 || currentCounts.produtos < planConfig.limits.produtos,
                    clientes: planConfig.limits.clientes === -1 || currentCounts.clientes < planConfig.limits.clientes,
                    vendas: planConfig.limits.vendas === -1 || currentCounts.vendas < planConfig.limits.vendas
                }
            })
        };

    } catch (error) {
        console.error('Erro ao obter usuário:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno do servidor' })
        };
    }
};
