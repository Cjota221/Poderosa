/**
 * LUCRO CERTO - Servidor de Pagamentos
 * Integração com Mercado Pago
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração do Mercado Pago
const isTestMode = process.env.MERCADO_PAGO_MODE === 'test';
const accessToken = isTestMode 
    ? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST 
    : process.env.MERCADO_PAGO_ACCESS_TOKEN;

const client = new MercadoPagoConfig({ 
    accessToken: accessToken,
    options: { timeout: 5000 }
});

// ================================
// PLANOS DO LUCRO CERTO
// ================================
const PLANOS = {
    starter: {
        id: 'starter',
        title: 'Lucro Certo - Plano Starter',
        description: 'Até 20 produtos, 20 clientes, Controle financeiro básico',
        price_monthly: 19.90,
        price_annual: 178.92 // 25% desconto
    },
    pro: {
        id: 'pro',
        title: 'Lucro Certo - Plano Profissional',
        description: 'Produtos ilimitados, Catálogo digital, Relatórios avançados',
        price_monthly: 34.90,
        price_annual: 314.10 // 25% desconto
    },
    premium: {
        id: 'premium',
        title: 'Lucro Certo - Plano Premium',
        description: 'Tudo do Pro + Suporte VIP 24h, Consultoria mensal',
        price_monthly: 49.90,
        price_annual: 449.10 // 25% desconto
    }
};

// ================================
// CUPONS DE DESCONTO
// ================================
const CUPONS = {
    'LUCRO10': { desconto: 10, tipo: 'percentual', ativo: true },
    'BEMVINDA': { desconto: 15, tipo: 'percentual', ativo: true },
    'PROMO20': { desconto: 20, tipo: 'percentual', ativo: true }
};

// ================================
// ROTAS
// ================================

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Lucro Certo Payment Server',
        mode: isTestMode ? 'TEST' : 'PRODUCTION'
    });
});

// Criar preferência de pagamento
app.post('/api/create-preference', async (req, res) => {
    try {
        // Aceitar ambos os formatos de dados (frontend atual e legacy)
        const { 
            plan, plano,           // plano pode vir como "plan" ou "plano"
            billing, periodo,      // período pode vir como "billing" ou "periodo"
            coupon, cupom,         // cupom pode vir como "coupon" ou "cupom"
            payer,                 // dados do pagador (formato novo)
            email, nome,           // formato antigo
            unitPrice              // preço calculado pelo frontend
        } = req.body;

        // Normalizar dados
        const planoKey = plan || plano || 'pro';
        const periodoValue = billing || periodo || 'monthly';
        const cupomValue = coupon || cupom || null;
        const payerEmail = payer?.email || email || '';
        const payerName = payer?.name || nome || '';
        const payerSurname = payer?.surname || '';

        // Validar plano
        const planoData = PLANOS[planoKey];
        if (!planoData) {
            return res.status(400).json({ error: 'Plano inválido', planoRecebido: planoKey });
        }

        // Calcular preço (usar unitPrice do frontend se disponível, senão calcular)
        let preco = unitPrice || (periodoValue === 'annual' || periodoValue === 'anual' 
            ? planoData.price_annual 
            : planoData.price_monthly);
        let descricaoPeriodo = (periodoValue === 'annual' || periodoValue === 'anual') ? 'Anual' : 'Mensal';

        // Aplicar cupom se válido (só se não veio unitPrice já calculado)
        let descontoAplicado = 0;
        if (!unitPrice && cupomValue && CUPONS[cupomValue.toUpperCase()]) {
            const cupomData = CUPONS[cupomValue.toUpperCase()];
            if (cupomData.ativo) {
                if (cupomData.tipo === 'percentual') {
                    descontoAplicado = preco * (cupomData.desconto / 100);
                    preco = preco - descontoAplicado;
                }
            }
        }

        // Criar preferência no Mercado Pago
        const preference = new Preference(client);
        
        // URLs de retorno
        const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const backendUrl = process.env.BASE_URL || 'http://localhost:3001';
        const isLocalhost = siteUrl.includes('localhost');
        
        const preferenceData = {
            items: [
                {
                    id: `${planoKey}_${periodoValue}`,
                    title: `${planoData.title} - ${descricaoPeriodo}`,
                    description: planoData.description,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: parseFloat(Number(preco).toFixed(2))
                }
            ],
            payer: {
                email: payerEmail,
                name: payerName,
                surname: payerSurname
            },
            // back_urls só funciona com URLs públicas (não localhost)
            // Em produção, descomente as back_urls
            /*
            back_urls: {
                success: `${siteUrl}/pagamento-sucesso.html?plano=${planoKey}&periodo=${periodoValue}`,
                failure: `${siteUrl}/pagamento-erro.html`,
                pending: `${siteUrl}/pagamento-pendente.html`
            },
            auto_return: 'approved',
            */
            external_reference: JSON.stringify({
                plano: planoKey,
                periodo: periodoValue,
                email: payerEmail,
                cupom: cupomValue,
                desconto: descontoAplicado
            }),
            statement_descriptor: 'LUCRO CERTO',
            payment_methods: {
                excluded_payment_types: [],
                installments: (periodoValue === 'annual' || periodoValue === 'anual') ? 12 : 3
            }
        };

        console.log('📦 Criando preferência:', JSON.stringify(preferenceData, null, 2));

        const response = await preference.create({ body: preferenceData });

        console.log('✅ Preferência criada:', response.id);

        res.json({
            success: true,
            id: response.id,
            init_point: response.init_point,
            sandbox_init_point: response.sandbox_init_point,
            plano: planoData.title,
            preco: Number(preco).toFixed(2),
            descontoAplicado: descontoAplicado.toFixed(2)
        });

    } catch (error) {
        console.error('Erro ao criar preferência:', error);
        res.status(500).json({ 
            error: 'Erro ao processar pagamento',
            details: error.message 
        });
    }
});

// ================================
// CHECKOUT TRANSPARENTE - CARTÃO (com dados diretos)
// Processa pagamento usando dados do cartão diretamente
// ================================
app.post('/api/process-card-payment', async (req, res) => {
    try {
        const {
            card,
            transaction_amount,
            installments,
            payer,
            description,
            plan,
            billing
        } = req.body;

        console.log('💳 Processando pagamento com cartão:', {
            amount: transaction_amount,
            installments,
            email: payer?.email,
            cardLast4: card?.number?.slice(-4)
        });

        // Detectar bandeira do cartão
        const cardNumber = card.number.replace(/\s/g, '');
        let paymentMethodId = 'visa';
        if (cardNumber.startsWith('5')) paymentMethodId = 'master';
        else if (cardNumber.startsWith('34') || cardNumber.startsWith('37')) paymentMethodId = 'amex';
        else if (cardNumber.startsWith('636') || cardNumber.startsWith('504')) paymentMethodId = 'elo';

        const payment = new Payment(client);
        
        // Para ambiente de teste, usamos dados simulados
        // Em produção, você usaria um token de cartão
        const paymentData = {
            transaction_amount: parseFloat(transaction_amount),
            description: description || 'Assinatura Lucro Certo',
            installments: parseInt(installments) || 1,
            payment_method_id: paymentMethodId,
            payer: {
                email: payer.email,
                first_name: payer.first_name,
                last_name: payer.last_name,
                identification: payer.identification
            },
            // Dados do cartão para teste
            card: {
                number: cardNumber,
                security_code: card.security_code,
                expiration_month: parseInt(card.expiration_month),
                expiration_year: parseInt(card.expiration_year),
                cardholder: {
                    name: card.holder_name,
                    identification: payer.identification
                }
            },
            statement_descriptor: 'LUCRO CERTO',
            external_reference: JSON.stringify({
                plan,
                billing,
                email: payer.email
            })
        };

        console.log('📤 Enviando para Mercado Pago...');
        
        const result = await payment.create({ body: paymentData });

        console.log('📋 Resultado do pagamento:', {
            id: result.id,
            status: result.status,
            status_detail: result.status_detail
        });

        res.json({
            id: result.id,
            status: result.status,
            status_detail: result.status_detail,
            payment_method_id: result.payment_method_id,
            transaction_amount: result.transaction_amount
        });

    } catch (error) {
        console.error('❌ Erro ao processar pagamento:', error);
        
        // Extrair mensagem de erro mais específica
        let errorMessage = 'Erro ao processar pagamento';
        let errorDetail = 'unknown_error';
        
        if (error.cause && error.cause.length > 0) {
            errorDetail = error.cause[0]?.code || 'unknown_error';
            errorMessage = error.cause[0]?.description || errorMessage;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(400).json({
            status: 'rejected',
            status_detail: errorDetail,
            message: errorMessage
        });
    }
});

// ================================
// CHECKOUT TRANSPARENTE - CARTÃO (com token)
// Processa pagamento direto no seu site
// ================================
app.post('/api/process-payment', async (req, res) => {
    try {
        const {
            token,
            transaction_amount,
            installments,
            payment_method_id,
            payer,
            description,
            plan,
            billing
        } = req.body;

        console.log('💳 Processando pagamento com cartão:', {
            amount: transaction_amount,
            installments,
            payment_method_id,
            email: payer?.email
        });

        const payment = new Payment(client);
        
        const paymentData = {
            transaction_amount: parseFloat(transaction_amount),
            token: token,
            description: description || 'Assinatura Lucro Certo',
            installments: parseInt(installments) || 1,
            payment_method_id: payment_method_id || 'visa',
            payer: {
                email: payer.email,
                first_name: payer.first_name,
                last_name: payer.last_name,
                identification: payer.identification
            },
            statement_descriptor: 'LUCRO CERTO',
            external_reference: JSON.stringify({
                plan,
                billing,
                email: payer.email
            })
        };

        const result = await payment.create({ body: paymentData });

        console.log('📋 Resultado do pagamento:', {
            id: result.id,
            status: result.status,
            status_detail: result.status_detail
        });

        res.json({
            id: result.id,
            status: result.status,
            status_detail: result.status_detail,
            payment_method_id: result.payment_method_id,
            transaction_amount: result.transaction_amount
        });

    } catch (error) {
        console.error('❌ Erro ao processar pagamento:', error);
        res.status(500).json({
            status: 'error',
            status_detail: error.message || 'Erro ao processar pagamento'
        });
    }
});

// ================================
// CHECKOUT TRANSPARENTE - PIX
// ================================
app.post('/api/create-pix', async (req, res) => {
    try {
        const { transaction_amount, payer, description, plan, billing } = req.body;

        console.log('📱 Gerando PIX:', { amount: transaction_amount, email: payer?.email });

        const payment = new Payment(client);
        
        const paymentData = {
            transaction_amount: parseFloat(transaction_amount),
            payment_method_id: 'pix',
            description: description || 'Assinatura Lucro Certo',
            payer: {
                email: payer.email,
                first_name: payer.first_name,
                last_name: payer.last_name,
                identification: payer.identification
            },
            external_reference: JSON.stringify({ plan, billing, email: payer.email })
        };

        const result = await payment.create({ body: paymentData });

        console.log('✅ PIX gerado:', result.id);

        res.json({
            id: result.id,
            status: result.status,
            qr_code: result.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: result.point_of_interaction?.transaction_data?.ticket_url
        });

    } catch (error) {
        console.error('❌ Erro ao gerar PIX:', error);
        res.status(500).json({ error: 'Erro ao gerar PIX', details: error.message });
    }
});

// ================================
// CHECKOUT TRANSPARENTE - BOLETO
// ================================
app.post('/api/create-boleto', async (req, res) => {
    try {
        const { transaction_amount, payer, description, plan, billing } = req.body;

        console.log('📄 Gerando Boleto:', { amount: transaction_amount, email: payer?.email });

        const payment = new Payment(client);
        
        // Data de vencimento (3 dias)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);

        const paymentData = {
            transaction_amount: parseFloat(transaction_amount),
            payment_method_id: 'bolbradesco', // ou 'pec' para outros bancos
            description: description || 'Assinatura Lucro Certo',
            payer: {
                email: payer.email,
                first_name: payer.first_name,
                last_name: payer.last_name,
                identification: payer.identification
            },
            external_reference: JSON.stringify({ plan, billing, email: payer.email }),
            date_of_expiration: dueDate.toISOString()
        };

        const result = await payment.create({ body: paymentData });

        console.log('✅ Boleto gerado:', result.id);

        res.json({
            id: result.id,
            status: result.status,
            boleto_url: result.transaction_details?.external_resource_url,
            barcode: result.barcode?.content,
            due_date: dueDate.toLocaleDateString('pt-BR')
        });

    } catch (error) {
        console.error('❌ Erro ao gerar boleto:', error);
        res.status(500).json({ error: 'Erro ao gerar boleto', details: error.message });
    }
});

// Webhook do Mercado Pago (notificações de pagamento)
app.post('/api/webhook', async (req, res) => {
    try {
        const { type, data } = req.body;

        console.log('📩 Webhook recebido:', { type, data });

        if (type === 'payment') {
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: data.id });

            console.log('💳 Pagamento:', {
                id: paymentInfo.id,
                status: paymentInfo.status,
                amount: paymentInfo.transaction_amount,
                payer: paymentInfo.payer?.email
            });

            if (paymentInfo.status === 'approved') {
                // Pagamento aprovado!
                const externalRef = JSON.parse(paymentInfo.external_reference || '{}');
                
                console.log('✅ PAGAMENTO APROVADO!', {
                    email: externalRef.email,
                    plano: externalRef.plano,
                    periodo: externalRef.periodo
                });

                // TODO: Aqui você ativa a conta do usuário no banco de dados
                // Exemplo: await activateUserSubscription(externalRef.email, externalRef.plano);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.sendStatus(500);
    }
});

// Verificar status de pagamento
app.get('/api/payment-status/:paymentId', async (req, res) => {
    try {
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: req.params.paymentId });

        res.json({
            id: paymentInfo.id,
            status: paymentInfo.status,
            status_detail: paymentInfo.status_detail,
            amount: paymentInfo.transaction_amount,
            payer_email: paymentInfo.payer?.email
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar pagamento' });
    }
});

// Validar cupom
app.post('/api/validate-coupon', (req, res) => {
    const { cupom, plano, periodo } = req.body;
    
    const cupomData = CUPONS[cupom?.toUpperCase()];
    
    if (!cupomData || !cupomData.ativo) {
        return res.json({ valid: false, message: 'Cupom inválido ou expirado' });
    }

    const planoData = PLANOS[plano];
    if (!planoData) {
        return res.json({ valid: false, message: 'Plano inválido' });
    }

    const precoOriginal = periodo === 'anual' ? planoData.price_annual : planoData.price_monthly;
    const desconto = precoOriginal * (cupomData.desconto / 100);
    const precoFinal = precoOriginal - desconto;

    res.json({
        valid: true,
        cupom: cupom.toUpperCase(),
        desconto: cupomData.desconto,
        tipo: cupomData.tipo,
        precoOriginal: precoOriginal.toFixed(2),
        valorDesconto: desconto.toFixed(2),
        precoFinal: precoFinal.toFixed(2)
    });
});

// Listar planos
app.get('/api/planos', (req, res) => {
    res.json(PLANOS);
});

// ================================
// INICIAR SERVIDOR
// ================================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║          💖 LUCRO CERTO - Payment Server          ║
╠═══════════════════════════════════════════════════╣
║  Servidor rodando em: http://localhost:${PORT}        ║
║  Modo: ${isTestMode ? '🧪 TESTE (Sandbox)' : '🚀 PRODUÇÃO'}                      ║
╚═══════════════════════════════════════════════════╝
    `);
});
