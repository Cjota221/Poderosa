// Netlify Function - Completa o cadastro do usuário (cria senha)
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Hash seguro para senha (bcrypt com 12 rounds)
async function hashPassword(password) {
    const saltRounds = 12; // Mais seguro que o padrão (10)
    return await bcrypt.hash(password, saltRounds);
}

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
        const { email, password, nome, telefone } = JSON.parse(event.body);

        if (!email || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email e senha são obrigatórios' })
            };
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Configuração do banco não encontrada' })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const emailLower = email.toLowerCase().trim();

        console.log('========================================');
        console.log('📧 CADASTRO - Email recebido:', email);
        console.log('📧 CADASTRO - Email normalizado:', emailLower);
        console.log('========================================');

        // Verificar se usuário existe
        console.log('🔍 Buscando usuário no Supabase...');
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('id, email, nome, plano')
            .eq('email', emailLower)
            .single();

        console.log('📊 Resultado da busca:', { user, userError });

        let userId;
        let userPlan = 'starter';

        if (userError || !user) {
            console.log('❌ ERRO: Usuário não encontrado no banco!');
            console.log('❌ Detalhes do erro:', userError);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    error: 'Nenhum pagamento encontrado para este email',
                    message: 'Você precisa fazer o pagamento primeiro. O email cadastrado foi: ' + emailLower,
                    debug: {
                        emailProcurado: emailLower,
                        erro: userError?.message
                    }
                })
            };
        }

        console.log('✅ Usuário encontrado:', user);
        userId = user.id;
        userPlan = user.plano;

        // Verificar assinatura ativa (opcional)
        console.log('🔍 Buscando assinatura...');
        const { data: subscription } = await supabase
            .from('assinaturas')
            .select('id, plano, status, data_expiracao')
            .eq('usuario_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        console.log('📊 Assinatura encontrada:', subscription);

        // Se tem assinatura, usar o plano dela
        if (subscription) {
            userPlan = subscription.plano;
            console.log('✅ Usando plano da assinatura:', userPlan);
        } else {
            console.log('⚠️ Sem assinatura ativa, usando plano do usuário:', userPlan);
        }

        // Atualizar usuário com senha e dados
        console.log('💾 Atualizando usuário com senha...');
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({
                senha_hash: await hashPassword(password),
                nome: nome || user.nome,
                telefone: telefone || null,
                cadastro_completo: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('❌ Erro ao atualizar usuário:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Erro ao salvar cadastro' })
            };
        }

        console.log('✅ Cadastro completo para:', emailLower, '- Plano:', userPlan);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Cadastro realizado com sucesso!',
                user: {
                    id: userId,
                    email: emailLower,
                    nome: nome,
                    plano: userPlan
                },
                subscription: subscription || null
            })
        };

    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro ao processar cadastro',
                details: error.message 
            })
        };
    }
};
