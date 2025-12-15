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
        console.log('🔍 DEBUG - Dados completos do pagamento:', JSON.stringify(paymentData, null, 2));

        // Se aprovado, salvar no Supabase
        if (paymentData.status === 'approved' && supabaseUrl && supabaseServiceKey) {
            try {
                console.log('✅ Pagamento APROVADO! Iniciando salvamento...');
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                
                const email = paymentData.payer?.email?.toLowerCase();
                const nome = `${paymentData.payer?.first_name || ''} ${paymentData.payer?.last_name || ''}`.trim() 
                           || user_data?.nome 
                           || email?.split('@')[0];
                const valor = paymentData.transaction_amount;
                
                console.log('📧 DEBUG - Email do pagador:', email);
                console.log('👤 DEBUG - Nome do pagador:', nome);
                console.log('💰 DEBUG - Valor:', valor);
                
                // Determinar plano pelo valor
                let plano = 'starter';
                if (valor >= 49) plano = 'premium';
                else if (valor >= 29) plano = 'pro';
                
                // Determinar período
                let periodo = 'monthly';
                if (valor >= 150) periodo = 'annual'; // Valores anuais são maiores
                
                console.log('� DEBUG - Plano determinado:', plano);
                console.log('📅 DEBUG - Período:', periodo);
                console.log('�💾 Salvando no Supabase:', { email, nome, plano, valor });
                
                if (email) {
                    console.log('🔍 Buscando usuário existente...');
                    // Verificar se usuário já existe
                    const { data: existingUser, error: searchError } = await supabase
                        .from('usuarios')
                        .select('id, plano')
                        .eq('email', email)
                        .single();
                    
                    console.log('📊 Resultado da busca:', { existingUser, searchError });
                    
                    let userId;
                    
                    if (existingUser) {
                        userId = existingUser.id;
                        console.log('✅ Usuário JÁ EXISTE:', userId);
                        // Atualizar plano do usuário existente
                        const { error: updateError } = await supabase
                            .from('usuarios')
                            .update({ 
                                plano: plano,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', userId);
                        
                        if (updateError) {
                            console.error('❌ Erro ao atualizar usuário:', updateError);
                        } else {
                            console.log('✅ Usuário atualizado com plano:', plano);
                        }
                    } else {
                        console.log('📝 Usuário NÃO existe, criando novo...');
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
                            console.error('❌ Detalhes:', JSON.stringify(userError, null, 2));
                        } else {
                            userId = newUser.id;
                            console.log('✅ Novo usuário criado! ID:', userId);
                            console.log('✅ Dados salvos:', { email, nome, plano });
                        }
                    }
                    
                    if (userId) {
                        console.log('🔍 Verificando assinatura existente...');
                        // Verificar se já existe assinatura com este payment_id
                        const { data: existingSub } = await supabase
                            .from('assinaturas')
                            .select('id')
                            .eq('payment_id', payment_id.toString())
                            .single();
                        
                        console.log('📊 Assinatura existente:', existingSub);
                        
                        if (existingSub) {
                            console.log('📝 Atualizando assinatura existente...');
                            // Atualizar assinatura existente
                            const { error: subUpdateError } = await supabase
                                .from('assinaturas')
                                .update({
                                    status: 'active',
                                    data_pagamento: new Date().toISOString()
                                })
                                .eq('id', existingSub.id);
                            
                            if (subUpdateError) {
                                console.error('❌ Erro ao atualizar assinatura:', subUpdateError);
                            } else {
                                console.log('✅ Assinatura atualizada para active');
                            }
                        } else {
                            console.log('📝 Criando NOVA assinatura...');
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
                                console.error('❌ Detalhes:', JSON.stringify(subError, null, 2));
                            } else {
                                console.log('✅✅✅ Nova assinatura CRIADA com sucesso!');
                                console.log('✅ Dados: userId=' + userId + ', plano=' + plano + ', status=active');
                            }
                        }
                    } else {
                        console.error('❌❌❌ ERRO CRÍTICO: userId não foi definido!');
                    }
                } else {
                    console.error('❌❌❌ ERRO CRÍTICO: Email do pagador não encontrado!');
                }
            } catch (dbError) {
                console.error('❌ Erro ao salvar no banco:', dbError);
                console.error('❌ Stack:', dbError.stack);
            }
        } else {
            console.log('⚠️ Pagamento não aprovado ou Supabase não configurado');
            console.log('⚠️ Status:', paymentData.status);
            console.log('⚠️ Supabase URL:', supabaseUrl ? 'OK' : 'FALTANDO');
            console.log('⚠️ Supabase Key:', supabaseServiceKey ? 'OK' : 'FALTANDO');
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
