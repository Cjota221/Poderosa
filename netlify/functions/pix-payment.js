// Netlify Function - Pagamento PIX
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configuração do Mercado Pago
const getClient = () => {
    const isTestMode = process.env.MERCADO_PAGO_MODE === 'test';
    const accessToken = isTestMode 
        ? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST 
        : process.env.MERCADO_PAGO_ACCESS_TOKEN;
    
    return new MercadoPagoConfig({ 
        accessToken: accessToken,
        options: { timeout: 5000 }
    });
};

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
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
        const body = JSON.parse(event.body);
        const { 
            transaction_amount,
            description,
            payer,
            external_reference
        } = body;

        // Validações
        if (!transaction_amount || !payer?.email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Dados incompletos para PIX' })
            };
        }

        const client = getClient();
        const payment = new Payment(client);

        const paymentData = {
            transaction_amount: parseFloat(transaction_amount),
            description: description || 'Assinatura Lucro Certo',
            payment_method_id: 'pix',
            payer: {
                email: payer.email,
                first_name: payer.first_name || '',
                last_name: payer.last_name || '',
                identification: payer.identification ? {
                    type: payer.identification.type || 'CPF',
                    number: payer.identification.number
                } : undefined
            },
            external_reference: external_reference
        };

        console.log('📱 Gerando PIX:', JSON.stringify(paymentData, null, 2));

        const result = await payment.create({ body: paymentData });

        console.log('✅ PIX gerado:', result.id);

        // Extrair dados do PIX
        const pixData = result.point_of_interaction?.transaction_data;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                id: result.id,
                status: result.status,
                qr_code: pixData?.qr_code || '',
                qr_code_base64: pixData?.qr_code_base64 || '',
                ticket_url: pixData?.ticket_url || ''
            })
        };

    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro ao gerar PIX',
                details: error.message
            })
        };
    }
};
