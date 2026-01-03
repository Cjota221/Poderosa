// Netlify Function - Processar Pagamento (Checkout Transparente)
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Configuração do Mercado Pago
const getClient = () => {
    const isTestMode = process.env.MERCADO_PAGO_MODE === 'test';
    const accessToken = isTestMode 
        ? process.env.MERCADO_PAGO_ACCESS_TOKEN_TEST 
        : process.env.MERCADO_PAGO_ACCESS_TOKEN;
    
    // Log para debug (SEGURO - não expõe token)
    console.log('=== MERCADO PAGO CONFIG ===');
    console.log('Mode:', process.env.MERCADO_PAGO_MODE);
    console.log('Is Test Mode:', isTestMode);
    console.log('Access Token:', accessToken ? '✅ Configurado' : '❌ FALTANDO');
    
    return new MercadoPagoConfig({ 
        accessToken: accessToken,
        options: { 
            timeout: 15000, // 15 segundos (aumentado de 5s)
            retries: 2 // Tenta 2x antes de falhar
        }
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
            external_reference,
            isExistingUser, // 🎯 NOVO: Indica se é usuário existente
            userId // 🎯 NOVO: ID do usuário se existir
        } = body;

        // Validações
        if (!token || !payment_method_id || !payer?.email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Dados incompletos para pagamento' })
            };
        }

        console.log('🔍 USUÁRIO EXISTENTE:', isExistingUser, '- ID:', userId);

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

        // Se pagamento aprovado, salvar no banco de dados
        console.log('=== VERIFICANDO SUPABASE ===');
        console.log('SUPABASE_URL:', supabaseUrl ? 'Configurado' : 'NÃO CONFIGURADO');
        console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Configurado' : 'NÃO CONFIGURADO');
        
        if (result.status === 'approved' && supabaseUrl && supabaseServiceKey) {
            try {
                console.log('📦 Iniciando salvamento no Supabase...');
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                
                // Extrair dados do body original
                const bodyData = JSON.parse(event.body);
                const plano = bodyData.plan || 'starter';
                const periodo = bodyData.billing || 'monthly';
                const nome = bodyData.payer?.first_name || '';
                const sobrenome = bodyData.payer?.last_name || '';
                const nomeCompleto = `${nome} ${sobrenome}`.trim();
                
                console.log('📧 Email:', payer.email);
                console.log('📋 Plano:', plano);
                console.log('📅 Período:', periodo);

                let userIdToUse = userId; // ID passado do frontend (se existir)

                // 🎯 SE É USUÁRIO EXISTENTE, USAR O ID FORNECIDO
                if (isExistingUser && userId) {
                    console.log('✅ Usando ID de usuário existente:', userId);
                    userIdToUse = userId;
                    
                    // Atualizar plano do usuário existente
                    const { error: updateError } = await supabase
                        .from('usuarios')
                        .update({ 
                            plano: plano,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', userId);
                    
                    if (updateError) {
                        console.error('Erro ao atualizar usuário:', updateError);
                    } else {
                        console.log('✅ Plano do usuário atualizado!');
                    }
                } else {
                    // BUSCAR OU CRIAR USUÁRIO
                    // Verificar se usuário já existe
                    const { data: existingUser, error: searchError } = await supabase
                        .from('usuarios')
                        .select('id')
                        .eq('email', payer.email.toLowerCase())
                        .single();
                    
                    if (searchError && searchError.code !== 'PGRST116') {
                        console.error('Erro ao buscar usuário:', searchError);
                    }

                    if (existingUser) {
                        userIdToUse = existingUser.id;
                        console.log('👤 Usuário encontrado no banco:', userIdToUse);
                    } else {
                        // Criar novo usuário
                        const { data: newUser, error: userError } = await supabase
                            .from('usuarios')
                            .insert({
                                email: payer.email.toLowerCase(),
                                nome: nomeCompleto || payer.email.split('@')[0],
                                plano: plano
                            })
                            .select()
                            .single();

                        if (userError) {
                            console.error('Erro ao criar usuário:', userError);
                        } else {
                            userIdToUse = newUser.id;
                            console.log('👤 Novo usuário criado:', userIdToUse);
                        }
                    }
                }

                if (userIdToUse) {
                    // Calcular data de expiração
                    const dataExpiracao = new Date();
                    if (periodo === 'annual') {
                        dataExpiracao.setFullYear(dataExpiracao.getFullYear() + 1);
                    } else {
                        dataExpiracao.setMonth(dataExpiracao.getMonth() + 1);
                    }

                    // Criar/atualizar assinatura
                    const { error: subError } = await supabase
                        .from('assinaturas')
                        .insert({
                            usuario_id: userIdToUse,
                            plano: plano,
                            status: 'active',
                            periodo: periodo,
                            valor: transaction_amount,
                            data_inicio: new Date().toISOString(),
                            data_expiracao: dataExpiracao.toISOString(),
                            payment_id: result.id.toString()
                        });

                    if (subError) {
                        console.error('Erro ao criar assinatura:', subError);
                    } else {
                        console.log('✅ Assinatura salva no banco!');
                    }

                    // Atualizar plano do usuário (garantir que está atualizado)
                    await supabase
                        .from('usuarios')
                        .update({ plano: plano })
                        .eq('id', userIdToUse);
                }

            } catch (dbError) {
                console.error('Erro ao salvar no banco:', dbError);
                // Não falhar o pagamento por erro no banco
            }
        }

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
