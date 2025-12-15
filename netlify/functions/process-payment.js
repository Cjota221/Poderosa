// Netlify Function - Processar Pagamento (Checkout Transparente)
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Configuração do Mercado Pago
const getClient = () => {
    const isTestMode = process.env.MERCADO_PAGO_MODE === 'test';
    const accessToken = isTestMode 
        ? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST 
        : process.env.MERCADO_PAGO_ACCESS_TOKEN;
    
    // Log para debug (remover depois)
    console.log('=== MERCADO PAGO CONFIG ===');
    console.log('Mode:', process.env.MERCADO_PAGO_MODE);
    console.log('Is Test Mode:', isTestMode);
    console.log('Token starts with:', accessToken ? accessToken.substring(0, 20) + '...' : 'UNDEFINED');
    
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
            token,
            payment_method_id,
            installments,
            issuer_id,
            payer,
            transaction_amount,
            description,
            external_reference
        } = body;

        // Validações
        if (!token || !payment_method_id || !payer?.email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Dados incompletos para pagamento' })
            };
        }

        const client = getClient();
        const payment = new Payment(client);

        const paymentData = {
            transaction_amount: parseFloat(transaction_amount),
            token: token,
            description: description || 'Assinatura Lucro Certo',
            installments: parseInt(installments) || 1,
            payment_method_id: payment_method_id,
            issuer_id: issuer_id ? parseInt(issuer_id) : undefined,
            payer: {
                email: payer.email,
                identification: payer.identification ? {
                    type: payer.identification.type || 'CPF',
                    number: payer.identification.number
                } : undefined
            },
            external_reference: external_reference,
            statement_descriptor: 'LUCROCERTO'
        };

        console.log('💳 Processando pagamento:', JSON.stringify(paymentData, null, 2));

        const result = await payment.create({ body: paymentData });

        console.log('✅ Pagamento processado:', result.id, result.status);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                id: result.id,
                status: result.status,
                status_detail: result.status_detail,
                payment_method_id: result.payment_method_id,
                payment_type_id: result.payment_type_id
            })
        };

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro ao processar pagamento',
                details: error.message,
                cause: error.cause
            })
        };
    }
};
