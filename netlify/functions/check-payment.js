// Verifica status de um pagamento no Mercado Pago e salva no Supabase
const mercadopago = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

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
        const { payment_id, user_data } = JSON.parse(event.body);

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

        // Se aprovado, salvar no Supabase
        if (paymentData.status === 'approved' && supabaseUrl && supabaseServiceKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                
                const email = paymentData.payer?.email?.toLowerCase();
                const nome = `${paymentData.payer?.first_name || ''} ${paymentData.payer?.last_name || ''}`.trim() 
                           || user_data?.nome 
                           || email?.split('@')[0];
                const valor = paymentData.transaction_amount;
                
                // Determinar plano pelo valor
                let plano = 'starter';
                if (valor >= 49) plano = 'premium';
                else if (valor >= 29) plano = 'pro';
                
                // Determinar período
                let periodo = 'monthly';
                if (valor >= 150) periodo = 'annual'; // Valores anuais são maiores
                
                console.log('💾 Salvando no Supabase:', { email, nome, plano, valor });
                
                if (email) {
                    // Verificar se usuário já existe
                    const { data: existingUser } = await supabase
                        .from('usuarios')
                        .select('id, plano')
                        .eq('email', email)
                        .single();
                    
                    let userId;
                    
                    if (existingUser) {
                        userId = existingUser.id;
                        // Atualizar plano do usuário existente
                        await supabase
                            .from('usuarios')
                            .update({ 
                                plano: plano,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', userId);
                        console.log('✅ Usuário atualizado:', userId);
                    } else {
                        // Criar novo usuário
                        const { data: newUser, error: userError } = await supabase
                            .from('usuarios')
                            .insert({
                                email: email,
                                nome: nome,
                                plano: plano
                            })
                            .select()
                            .single();
                        
                        if (userError) {
                            console.error('❌ Erro ao criar usuário:', userError);
                        } else {
                            userId = newUser.id;
                            console.log('✅ Novo usuário criado:', userId);
                        }
                    }
                    
                    if (userId) {
                        // Verificar se já existe assinatura com este payment_id
                        const { data: existingSub } = await supabase
                            .from('assinaturas')
                            .select('id')
                            .eq('payment_id', payment_id.toString())
                            .single();
                        
                        if (existingSub) {
                            // Atualizar assinatura existente
                            await supabase
                                .from('assinaturas')
                                .update({
                                    status: 'active',
                                    data_pagamento: new Date().toISOString()
                                })
                                .eq('id', existingSub.id);
                            console.log('✅ Assinatura atualizada para active');
                        } else {
                            // Criar nova assinatura
                            const { error: subError } = await supabase
                                .from('assinaturas')
                                .insert({
                                    usuario_id: userId,
                                    plano: plano,
                                    status: 'active',
                                    periodo: periodo,
                                    valor: valor,
                                    data_inicio: new Date().toISOString(),
                                    data_pagamento: new Date().toISOString(),
                                    payment_id: payment_id.toString()
                                });
                            
                            if (subError) {
                                console.error('❌ Erro ao criar assinatura:', subError);
                            } else {
                                console.log('✅ Nova assinatura criada!');
                            }
                        }
                    }
                }
            } catch (dbError) {
                console.error('❌ Erro ao salvar no banco:', dbError);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                id: paymentData.id,
                status: paymentData.status,
                status_detail: paymentData.status_detail,
                date_approved: paymentData.date_approved,
                payer_email: paymentData.payer?.email
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
