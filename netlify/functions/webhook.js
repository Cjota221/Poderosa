// Netlify Function - Webhook Mercado Pago
// Recebe notificações de pagamento do Mercado Pago
const mercadopago = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Configuração do Mercado Pago
function getMPClient() {
    return new mercadopago.MercadoPagoConfig({
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
    });
}

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
        if (type === 'payment' && data?.id) {
            const paymentId = data.id;
            console.log(`💳 Notificação de pagamento: ${paymentId}`);
            
            try {
                // Buscar detalhes do pagamento no Mercado Pago
                const client = getMPClient();
                const paymentAPI = new mercadopago.Payment(client);
                const paymentData = await paymentAPI.get({ id: paymentId });
                
                console.log('� Status do pagamento:', paymentData.status);
                console.log('📧 Email do pagador:', paymentData.payer?.email);
                
                // Se o pagamento foi aprovado, atualizar no Supabase
                if (paymentData.status === 'approved' && supabaseUrl && supabaseServiceKey) {
                    const supabase = createClient(supabaseUrl, supabaseServiceKey);
                    const email = paymentData.payer?.email?.toLowerCase();
                    
                    if (email) {
                        // Buscar usuário pelo email
                        const { data: user } = await supabase
                            .from('usuarios')
                            .select('id')
                            .eq('email', email)
                            .single();
                        
                        if (user) {
                            // Determinar o plano pelo valor
                            let plano = 'starter';
                            const valor = paymentData.transaction_amount;
                            if (valor >= 49) plano = 'premium';
                            else if (valor >= 29) plano = 'pro';
                            
                            // Atualizar plano do usuário
                            await supabase
                                .from('usuarios')
                                .update({ 
                                    plano: plano,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', user.id);
                            
                            // Atualizar ou criar assinatura
                            const { data: existingSub } = await supabase
                                .from('assinaturas')
                                .select('id')
                                .eq('payment_id', paymentId.toString())
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
                                
                                console.log('✅ Assinatura atualizada para active:', existingSub.id);
                            } else {
                                // Criar nova assinatura
                                await supabase
                                    .from('assinaturas')
                                    .insert({
                                        usuario_id: user.id,
                                        plano: plano,
                                        status: 'active',
                                        periodo: 'monthly',
                                        valor: valor,
                                        data_inicio: new Date().toISOString(),
                                        data_pagamento: new Date().toISOString(),
                                        payment_id: paymentId.toString()
                                    });
                                
                                console.log('✅ Nova assinatura criada para:', email);
                            }
                            
                            console.log(`✅ Usuário ${email} atualizado para plano ${plano}`);
                        } else {
                            console.log('⚠️ Usuário não encontrado:', email);
                        }
                    }
                }
            } catch (mpError) {
                console.error('Erro ao processar pagamento:', mpError);
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
