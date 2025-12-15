// Netlify Function - Webhook Mercado Pago
// Recebe notificações de pagamento do Mercado Pago

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Mercado Pago envia GET para verificar e POST para notificar
    if (event.httpMethod === 'GET') {
        return { 
            statusCode: 200, 
            headers,
            body: JSON.stringify({ status: 'Webhook ativo' }) 
        };
    }

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }) 
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { type, data, action } = body;

        console.log('🔔 Webhook recebido:', JSON.stringify({ type, action, data }, null, 2));

        // Tipos de notificação do Mercado Pago
        if (type === 'payment') {
            const paymentId = data?.id;
            
            if (paymentId) {
                console.log(`💳 Notificação de pagamento: ${paymentId}`);
                
                // Aqui você pode:
                // 1. Buscar detalhes do pagamento na API do MP
                // 2. Atualizar status no banco de dados (Supabase)
                // 3. Enviar email de confirmação
                // 4. Ativar assinatura do usuário
                
                // Por enquanto, apenas logamos
                // TODO: Integrar com Supabase
            }
        }

        if (type === 'subscription_preapproval') {
            console.log('📋 Notificação de assinatura:', data?.id);
            // Lidar com assinaturas recorrentes
        }

        // Sempre retornar 200 para o Mercado Pago saber que recebemos
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ received: true })
        };

    } catch (error) {
        console.error('Erro no webhook:', error);
        // Mesmo com erro, retornamos 200 para evitar retentativas infinitas
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ received: true, error: error.message })
        };
    }
};
