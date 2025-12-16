const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    try {
        const { paymentId, email } = JSON.parse(event.body);

        if (!paymentId || !email) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'paymentId e email são obrigatórios' })
            };
        }

        console.log(`🔄 Renovando assinatura: ${email} - Payment ID: ${paymentId}`);

        // 1. Buscar usuário
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

        // 2. Buscar assinatura antiga (pode estar expirada ou em carência)
        const { data: oldSubscription } = await supabase
            .from('assinaturas')
            .select('*')
            .eq('usuario_id', usuario.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // 3. Calcular nova data de expiração (30 dias a partir de HOJE)
        const now = new Date();
        const newExpiryDate = new Date(now);
        newExpiryDate.setDate(newExpiryDate.getDate() + 30);

        // 4. Atualizar assinatura existente ou criar nova
        if (oldSubscription) {
            // Atualizar assinatura existente
            const { error: updateError } = await supabase
                .from('assinaturas')
                .update({
                    status: 'active',
                    data_expiracao: newExpiryDate.toISOString(),
                    data_inicio: now.toISOString(), // Reinicia contagem
                    payment_id: paymentId,
                    renovado_em: now.toISOString()
                })
                .eq('id', oldSubscription.id);

            if (updateError) {
                throw new Error('Erro ao atualizar assinatura: ' + updateError.message);
            }

            console.log(`✅ Assinatura atualizada: ID ${oldSubscription.id}`);
        } else {
            // Criar nova assinatura (caso não exista)
            const { error: insertError } = await supabase
                .from('assinaturas')
                .insert({
                    usuario_id: usuario.id,
                    plano: 'pro',
                    status: 'active',
                    periodo: 'monthly',
                    valor: 34.90,
                    data_inicio: now.toISOString(),
                    data_expiracao: newExpiryDate.toISOString(),
                    payment_id: paymentId
                });

            if (insertError) {
                throw new Error('Erro ao criar assinatura: ' + insertError.message);
            }

            console.log(`✅ Nova assinatura criada para: ${email}`);
        }

        // 5. Atualizar status do usuário para 'pro' (ativo)
        const { error: updateUserError } = await supabase
            .from('usuarios')
            .update({ 
                plano: 'pro',
                ultimo_login: now.toISOString()
            })
            .eq('id', usuario.id);

        if (updateUserError) {
            throw new Error('Erro ao atualizar usuário: ' + updateUserError.message);
        }

        // 6. Buscar assinatura atualizada para retornar
        const { data: updatedSubscription } = await supabase
            .from('assinaturas')
            .select('*')
            .eq('usuario_id', usuario.id)
            .eq('status', 'active')
            .single();

        console.log(`✅ Renovação concluída: ${email} - Expira em ${newExpiryDate.toLocaleDateString('pt-BR')}`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Assinatura renovada com sucesso!',
                subscription: {
                    plano: updatedSubscription.plano,
                    status: updatedSubscription.status,
                    data_inicio: updatedSubscription.data_inicio,
                    data_expiracao: updatedSubscription.data_expiracao,
                    valor: updatedSubscription.valor,
                    periodo: updatedSubscription.periodo
                }
            })
        };

    } catch (error) {
        console.error('❌ Erro ao renovar assinatura:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: 'Erro ao renovar assinatura',
                error: error.message
            })
        };
    }
};
