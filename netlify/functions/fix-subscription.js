const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    console.log('🔧 Iniciando correção de assinatura...');

    // CORS headers
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
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método não permitido' })
        };
    }

    try {
        const { email, paymentId } = JSON.parse(event.body || '{}');

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email é obrigatório' })
            };
        }

        // Conectar ao Supabase com SERVICE_KEY
        const supabaseUrl = process.env.SUPABASE_URL || 'https://ldfahdueqzgemplxrffm.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseServiceKey) {
            throw new Error('SUPABASE_SERVICE_KEY não configurada');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('📧 Buscando usuário:', email);

        // 1. Buscar usuário
        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('id, email, plano')
            .eq('email', email)
            .single();

        if (userError || !usuario) {
            console.error('❌ Erro ao buscar usuário:', userError);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Usuário não encontrado' })
            };
        }

        console.log('✅ Usuário encontrado:', usuario.id);

        // 2. Buscar assinatura ativa
        let query = supabase
            .from('assinaturas')
            .select('*')
            .eq('usuario_id', usuario.id)
            .eq('status', 'active')
            .order('data_inicio', { ascending: false })
            .limit(1);

        if (paymentId) {
            query = query.eq('payment_id', paymentId);
        }

        const { data: assinaturas, error: subError } = await query;

        if (subError) {
            console.error('❌ Erro ao buscar assinatura:', subError);
            throw subError;
        }

        if (!assinaturas || assinaturas.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Nenhuma assinatura ativa encontrada' })
            };
        }

        const assinatura = assinaturas[0];
        console.log('📋 Assinatura encontrada:', {
            id: assinatura.id,
            payment_id: assinatura.payment_id,
            data_inicio: assinatura.data_inicio,
            data_expiracao: assinatura.data_expiracao,
            periodo: assinatura.periodo,
            plano: assinatura.plano
        });

        // 3. Verificar se precisa correção
        if (assinatura.data_expiracao && assinatura.data_expiracao !== null) {
            console.log('ℹ️ Assinatura já tem data_expiracao:', assinatura.data_expiracao);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Assinatura já está correta',
                    assinatura: assinatura,
                    changed: false
                })
            };
        }

        // 4. Calcular data_expiracao
        const dataInicio = new Date(assinatura.data_inicio);
        const dataExpiracao = new Date(dataInicio);

        // Adicionar dias baseado no período
        if (assinatura.periodo === 'annual') {
            dataExpiracao.setDate(dataExpiracao.getDate() + 365);
        } else {
            // Padrão: monthly (30 dias)
            dataExpiracao.setDate(dataExpiracao.getDate() + 30);
        }

        console.log('📅 Calculando data_expiracao:', {
            data_inicio: dataInicio.toISOString(),
            periodo: assinatura.periodo || 'monthly',
            data_expiracao_calculada: dataExpiracao.toISOString()
        });

        // 5. Atualizar assinatura
        const { data: updated, error: updateError } = await supabase
            .from('assinaturas')
            .update({
                data_expiracao: dataExpiracao.toISOString(),
                periodo: assinatura.periodo || 'monthly'
            })
            .eq('id', assinatura.id)
            .select();

        if (updateError) {
            console.error('❌ Erro ao atualizar assinatura:', updateError);
            throw updateError;
        }

        console.log('✅ Assinatura atualizada com sucesso!');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Assinatura corrigida com sucesso!',
                antes: {
                    data_expiracao: assinatura.data_expiracao,
                    periodo: assinatura.periodo
                },
                depois: {
                    data_expiracao: dataExpiracao.toISOString(),
                    periodo: assinatura.periodo || 'monthly'
                },
                assinatura: updated[0],
                changed: true
            })
        };

    } catch (error) {
        console.error('❌ Erro ao corrigir assinatura:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Erro ao corrigir assinatura',
                details: error.message
            })
        };
    }
};
