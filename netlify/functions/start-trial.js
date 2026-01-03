// Netlify Function - Iniciar Trial (salva no banco)
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ldfahdueqzgemplxrffm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { email, nome, negocio } = body;

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email é obrigatório' })
            };
        }

        // Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email inválido' })
            };
        }

        // Verificar se Supabase está configurado
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('❌ SUPABASE não configurado');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Configuração do banco de dados não encontrada',
                    details: 'SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados'
                })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('🔍 Verificando email:', email);

        // Verificar se email já existe
        const { data: existingUser, error: checkError } = await supabase
            .from('usuarios')
            .select('id, plano, created_at')
            .eq('email', email.toLowerCase())
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 = não encontrado, isso é OK
            console.error('❌ Erro ao verificar email:', checkError);
            throw checkError;
        }

        if (existingUser) {
            console.log('⚠️ Email já existe:', email);
            const createdAt = new Date(existingUser.created_at);
            const now = new Date();
            const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
            
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({ 
                    error: 'Este email já foi usado',
                    canTrial: false,
                    trialExpired: daysSinceCreation >= 7,
                    daysLeft: Math.max(0, 7 - daysSinceCreation),
                    message: 'Este email já possui uma conta. Faça login ou use outro email.'
                })
            };
        }

        // Criar novo usuário com trial
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        console.log('✅ Criando novo usuário trial:', email);

        const { data: newUser, error: createError } = await supabase
            .from('usuarios')
            .insert({
                email: email.toLowerCase(),
                nome: nome || email.split('@')[0],
                negocio: negocio || '',
                plano: 'trial',
                plano_expira_em: trialEndDate.toISOString()
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Erro ao criar usuário:', createError);
            throw createError;
        }

        console.log('✅ Usuário criado:', newUser.id);

        // Criar registro de assinatura trial
        const { error: assinaturaError } = await supabase
            .from('assinaturas')
            .insert({
                usuario_id: newUser.id,
                plano: 'trial',
                status: 'active',
                periodo: 'trial',
                valor: 0,
                data_inicio: new Date().toISOString(),
                data_expiracao: trialEndDate.toISOString()
            });

        if (assinaturaError) {
            console.error('⚠️ Erro ao criar assinatura (não crítico):', assinaturaError);
            // Não falha - assinatura é secundária
        } else {
            console.log('✅ Assinatura trial criada');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                userId: newUser.id,
                email: newUser.email,
                nome: newUser.nome,
                plano: 'trial',
                trialStartDate: newUser.created_at,
                trialEndDate: trialEndDate.toISOString(),
                daysLeft: 7,
                limits: {
                    produtos: 10,
                    clientes: 20,
                    vendas: 50,
                    catalogos: 1
                },
                features: {
                    dashboard: true,
                    produtos: true,
                    clientes: true,
                    vendas: true,
                    precificacao: true,
                    despesas: true,      // ✅ LIBERADO
                    relatorios: true,    // ✅ LIBERADO
                    catalogo: true       // ✅ LIBERADO
                },
                message: 'Conta trial criada com sucesso! Você tem 7 dias para testar TODAS as funcionalidades.'
            })
        };

    } catch (error) {
        console.error('❌ Erro ao criar trial:', error);
        console.error('Stack:', error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro interno do servidor',
                details: error.message || 'Erro desconhecido',
                code: error.code || 'UNKNOWN'
            })
        };
    }
};
