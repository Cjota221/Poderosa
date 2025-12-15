// Verifica status de um pagamento no Mercado Pago
const mercadopago = require('mercadopago');

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
        const { payment_id } = JSON.parse(event.body);

        if (!payment_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'payment_id é obrigatório' })
            };
        }

        // Configurar Mercado Pago
        const client = new mercadopago.MercadoPagoConfig({
            accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
        });

        const payment = new mercadopago.Payment(client);
        
        // Buscar dados do pagamento
        const paymentData = await payment.get({ id: payment_id });

        console.log('📊 Status do pagamento:', payment_id, '->', paymentData.status);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                id: paymentData.id,
                status: paymentData.status,
                status_detail: paymentData.status_detail,
                date_approved: paymentData.date_approved
            })
        };

    } catch (error) {
        console.error('❌ Erro ao verificar pagamento:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro ao verificar pagamento',
                details: error.message 
            })
        };
    }
};
