// Netlify Function - Criar Preferência de Pagamento
const { MercadoPagoConfig, Preference } = require('mercadopago');

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

// Planos do Lucro Certo
const PLANOS = {
    starter: {
        id: 'starter',
        title: 'Lucro Certo - Plano Starter',
        description: 'Até 20 produtos, 20 clientes, Controle financeiro básico',
        price_monthly: 19.90,
        price_annual: 14.93
    },
    pro: {
        id: 'pro',
        title: 'Lucro Certo - Plano Profissional',
        description: 'Produtos ilimitados, Catálogo digital, Relatórios avançados',
        price_monthly: 34.90,
        price_annual: 26.18
    },
    premium: {
        id: 'premium',
        title: 'Lucro Certo - Plano Premium',
        description: 'Tudo do Pro + Suporte VIP 24h, Consultoria mensal',
        price_monthly: 49.90,
        price_annual: 37.43
    }
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
            plan, plano, 
            billing, periodo, 
            payer, 
            email, nome,
            unitPrice
        } = body;

        // Normalizar dados
        const planoKey = plan || plano || 'pro';
        const periodoValue = billing || periodo || 'monthly';
        const payerEmail = payer?.email || email || '';
        const payerName = payer?.name || nome || '';
        const payerSurname = payer?.surname || '';

        // Validar plano
        const planoData = PLANOS[planoKey];
        if (!planoData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Plano inválido', planoRecebido: planoKey })
            };
        }

        // Calcular preço
        const isAnnual = periodoValue === 'annual' || periodoValue === 'anual';
        let preco = unitPrice || (isAnnual ? planoData.price_annual * 12 : planoData.price_monthly);
        let descricaoPeriodo = isAnnual ? 'Anual' : 'Mensal';

        // Criar preferência
        const client = getClient();
        const preference = new Preference(client);
        
        const siteUrl = process.env.URL || 'https://sistemalucrocerto.com';
        
        const preferenceData = {
            items: [{
                id: `${planoKey}_${periodoValue}`,
                title: `${planoData.title} - ${descricaoPeriodo}`,
                description: planoData.description,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: parseFloat(Number(preco).toFixed(2))
            }],
            payer: {
                email: payerEmail,
                name: payerName,
                surname: payerSurname
            },
            back_urls: {
                success: `${siteUrl}/pagamento-sucesso?plano=${planoKey}&periodo=${periodoValue}`,
                failure: `${siteUrl}/pagamento-erro`,
                pending: `${siteUrl}/pagamento-pendente`
            },
            auto_return: 'approved',
            external_reference: JSON.stringify({
                plano: planoKey,
                periodo: periodoValue,
                email: payerEmail
            }),
            statement_descriptor: 'LUCRO CERTO',
            payment_methods: {
                installments: isAnnual ? 12 : 3
            }
        };

        console.log('📦 Criando preferência:', JSON.stringify(preferenceData, null, 2));

        const response = await preference.create({ body: preferenceData });

        console.log('✅ Preferência criada:', response.id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                id: response.id,
                init_point: response.init_point,
                sandbox_init_point: response.sandbox_init_point,
                plano: planoData.title,
                preco: Number(preco).toFixed(2)
            })
        };

    } catch (error) {
        console.error('Erro ao criar preferência:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro ao processar pagamento',
                details: error.message 
            })
        };
    }
};
