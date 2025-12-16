const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
    // Apenas POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    try {
        const { email, reason } = JSON.parse(event.body);

        if (!email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Email é obrigatório' })
            };
        }

        // 1. Buscar usuário e assinatura ativa
        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('id, email, plano')
            .eq('email', email)
            .single();

        if (userError || !usuario) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Usuário não encontrado' })
            };
        }

        // 2. Buscar assinatura ativa do usuário
        const { data: assinatura, error: subsError } = await supabase
            .from('assinaturas')
            .select('*')
            .eq('usuario_id', usuario.id)
            .eq('status', 'active')
            .order('data_inicio', { ascending: false })
            .limit(1)
            .single();

        if (subsError || !assinatura) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Assinatura ativa não encontrada' })
            };
        }

        // 3. Verificar se está dentro do período de garantia (7 dias)
        const dataInicio = new Date(assinatura.data_inicio);
        const hoje = new Date();
        const diasUsados = Math.floor((hoje - dataInicio) / (1000 * 60 * 60 * 24));
        const withinGuarantee = diasUsados <= 7;

        // 4. Cancelar assinatura no banco
        const { error: updateSubsError } = await supabase
            .from('assinaturas')
            .update({
                status: 'cancelled',
                data_cancelamento: new Date().toISOString(),
                motivo_cancelamento: reason || 'Não informado'
            })
            .eq('id', assinatura.id);

        if (updateSubsError) {
            throw new Error('Erro ao cancelar assinatura: ' + updateSubsError.message);
        }

        // 5. Atualizar plano do usuário para 'cancelled'
        const { error: updateUserError } = await supabase
            .from('usuarios')
            .update({ plano: 'cancelled' })
            .eq('id', usuario.id);

        if (updateUserError) {
            throw new Error('Erro ao atualizar usuário: ' + updateUserError.message);
        }

        // 6. Registrar log de cancelamento (opcional - para análise)
        await supabase
            .from('logs_cancelamento')
            .insert({
                usuario_id: usuario.id,
                email: email,
                motivo: reason,
                dias_usados: diasUsados,
                dentro_garantia: withinGuarantee,
                valor_pago: assinatura.valor,
                payment_id: assinatura.payment_id,
                data_cancelamento: new Date().toISOString()
            })
            .select();

        // 7. TODO: Se estiver dentro da garantia, fazer estorno no Mercado Pago
        // Por enquanto, apenas notifica que precisa fazer manual
        if (withinGuarantee) {
            console.log(`⚠️ REEMBOLSO PENDENTE: ${email} - Payment ID: ${assinatura.payment_id} - R$ ${assinatura.valor}`);
            // Aqui você pode implementar integração com Mercado Pago para estorno automático
            // ou enviar email/notificação para você fazer o estorno manual
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Assinatura cancelada com sucesso',
                withinGuarantee: withinGuarantee,
                diasUsados: diasUsados,
                paymentId: assinatura.payment_id,
                valorPago: assinatura.valor
            })
        };

    } catch (error) {
        console.error('Erro ao cancelar assinatura:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: 'Erro interno ao cancelar assinatura',
                error: error.message 
            })
        };
    }
};
