const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis SUPABASE não configuradas');
}

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS (preflight)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, newPlan, billing, paymentId, valor } = JSON.parse(event.body);

        console.log('🔄 Mudança de plano solicitada:', { email, newPlan, billing, valor });

        if (!email || !newPlan) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email e novo plano são obrigatórios' })
            };
        }

        // 1. Buscar usuário pelo email
        const { data: usuarios, error: userError } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .single();

        if (userError || !usuarios) {
            console.error('❌ Usuário não encontrado:', userError);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Usuário não encontrado' })
            };
        }

        const userId = usuarios.id;

        // 2. Atualizar assinatura do usuário
        const dataExpiracao = new Date();
        dataExpiracao.setMonth(dataExpiracao.getMonth() + (billing === 'annual' ? 12 : 1));

        const { data: assinatura, error: updateError } = await supabase
            .from('assinaturas')
            .update({
                plano: newPlan,
                periodo: billing === 'annual' ? 'annual' : 'monthly',
                status: 'ativa',
                data_expiracao: dataExpiracao.toISOString(),
                valor_pago: valor || 0,
                payment_id: paymentId || null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Erro ao atualizar assinatura:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Erro ao atualizar assinatura', details: updateError.message })
            };
        }

        // 3. Atualizar limites baseado no plano
        const planoLimites = {
            starter: {
                max_produtos: 50,
                max_clientes: 30,
                max_vendas_mes: 100,
                max_usuarios: 1
            },
            pro: {
                max_produtos: 200,
                max_clientes: 100,
                max_vendas_mes: -1, // ilimitado
                max_usuarios: 3
            },
            premium: {
                max_produtos: -1, // ilimitado
                max_clientes: -1, // ilimitado
                max_vendas_mes: -1, // ilimitado
                max_usuarios: -1 // ilimitado
            }
        };

        const limites = planoLimites[newPlan] || planoLimites.pro;

        const { error: limitesError } = await supabase
            .from('usuarios')
            .update({
                plano: newPlan,
                max_produtos: limites.max_produtos,
                max_clientes: limites.max_clientes,
                max_vendas_mes: limites.max_vendas_mes,
                max_usuarios: limites.max_usuarios,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (limitesError) {
            console.warn('⚠️ Erro ao atualizar limites do usuário:', limitesError);
        }

        // 4. Registrar histórico da mudança de plano
        const { error: historicoError } = await supabase
            .from('historico_planos')
            .insert({
                user_id: userId,
                plano_anterior: assinatura.plano || 'starter',
                plano_novo: newPlan,
                periodo: billing === 'annual' ? 'annual' : 'monthly',
                valor: valor || 0,
                payment_id: paymentId || null,
                data_mudanca: new Date().toISOString()
            });

        if (historicoError) {
            console.warn('⚠️ Erro ao registrar histórico (não crítico):', historicoError);
        }

        console.log('✅ Plano alterado com sucesso:', { userId, newPlan, billing });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Plano alterado com sucesso',
                userId,
                newPlan,
                billing,
                expiry: dataExpiracao.toISOString(),
                limites
            })
        };

    } catch (error) {
        console.error('❌ Erro na mudança de plano:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Erro ao processar mudança de plano',
                details: error.message
            })
        };
    }
};
