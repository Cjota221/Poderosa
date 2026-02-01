// Netlify Function - Definir senha para usuário trial
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Hash seguro para senha (bcrypt com 12 rounds)
async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

exports.handler = async (event) => {
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
        const { email, password, userId } = JSON.parse(event.body);

        // Validações
        if (!email && !userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email ou userId é obrigatório' })
            };
        }

        if (!password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Senha é obrigatória' })
            };
        }

        if (password.length < 6) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Senha deve ter no mínimo 6 caracteres' })
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
        
        // Buscar usuário
        let query = supabase.from('usuarios').select('id, email, nome, senha_hash');
        
        if (userId) {
            query = query.eq('id', userId);
        } else {
            query = query.eq('email', email.toLowerCase().trim());
        }
        
        const { data: user, error: userError } = await query.single();

        if (userError || !user) {
            console.log('❌ Usuário não encontrado:', userError);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Usuário não encontrado' })
            };
        }

        // Verificar se já tem senha
        const temSenha = user.senha_hash && 
                         user.senha_hash !== 'TRIAL_NO_PASSWORD' && 
                         user.senha_hash.startsWith('$2');
        
        if (temSenha) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Você já tem uma senha definida',
                    message: 'Use a opção "Esqueci minha senha" para alterar'
                })
            };
        }

        // Criar hash da senha
        const senhaHash = await hashPassword(password);
        console.log('✅ Senha hasheada para usuário:', user.id);

        // Atualizar usuário com a nova senha
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({
                senha_hash: senhaHash,
                cadastro_completo: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Erro ao atualizar senha:', updateError);
            throw updateError;
        }

        console.log('✅ Senha definida com sucesso para:', user.email);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Senha definida com sucesso! Agora você pode fazer login de qualquer dispositivo.',
                email: user.email
            })
        };

    } catch (error) {
        console.error('❌ Erro:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro interno',
                message: error.message 
            })
        };
    }
};
