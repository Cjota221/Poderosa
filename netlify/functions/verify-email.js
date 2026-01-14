// ============================================
// VERIFICAÇÃO DE EMAIL - Netlify Function
// ============================================
// Endpoint: /.netlify/functions/verify-email

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { validateSupabaseConfig, logEnvStatus } = require('./utils/validateEnv');

// Validar variáveis de ambiente no startup
try {
    const config = validateSupabaseConfig();
    console.log('✅ Configuração do Supabase validada');
} catch (error) {
    console.error('❌ ERRO CRÍTICO:', error.message);
    logEnvStatus();
    throw error;
}

// Configuração Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Gerar código de 6 dígitos
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Enviar email (simulado - integrar com serviço real)
async function sendVerificationEmail(email, code) {
    // TODO: Integrar com SendGrid, Mailgun, ou serviço de email
    console.log(`📧 Enviando código ${code} para ${email}`);
    
    // Por enquanto, apenas loga (para desenvolvimento)
    // Em produção, implementar:
    // - SendGrid API
    // - Mailgun API
    // - Amazon SES
    // - Ou serviço similar
    
    return true; // Simula sucesso
}

exports.handler = async (event) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Suportar preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Apenas POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método não permitido' }),
        };
    }

    try {
        const { email, code, action } = JSON.parse(event.body);

        // ============================================
        // AÇÃO: ENVIAR CÓDIGO
        // ============================================
        if (action === 'send') {
            if (!email) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Email obrigatório' }),
                };
            }

            // Verificar se usuário existe
            const { data: usuario, error: userError } = await supabase
                .from('usuarios')
                .select('id, email, email_verificado')
                .eq('email', email)
                .single();

            if (userError || !usuario) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Usuário não encontrado' }),
                };
            }

            // Se já verificado, não precisa enviar
            if (usuario.email_verificado) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Email já verificado',
                        already_verified: true,
                    }),
                };
            }

            // Gerar código
            const verificationCode = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

            // Salvar código no banco
            const { error: updateError } = await supabase
                .from('usuarios')
                .update({
                    codigo_verificacao: verificationCode,
                    codigo_expira_em: expiresAt.toISOString(),
                    atualizado_em: new Date().toISOString(),
                })
                .eq('id', usuario.id);

            if (updateError) {
                console.error('❌ Erro ao salvar código:', updateError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Erro ao gerar código' }),
                };
            }

            // Enviar email
            await sendVerificationEmail(email, verificationCode);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Código enviado para ' + email,
                    // Em produção, NÃO retornar o código!
                    // Apenas para desenvolvimento:
                    debug_code: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
                }),
            };
        }

        // ============================================
        // AÇÃO: VERIFICAR CÓDIGO
        // ============================================
        if (action === 'verify') {
            if (!email || !code) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Email e código obrigatórios' }),
                };
            }

            // Buscar usuário
            const { data: usuario, error: userError } = await supabase
                .from('usuarios')
                .select('id, codigo_verificacao, codigo_expira_em, email_verificado')
                .eq('email', email)
                .single();

            if (userError || !usuario) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Usuário não encontrado' }),
                };
            }

            // Se já verificado
            if (usuario.email_verificado) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Email já verificado',
                        already_verified: true,
                    }),
                };
            }

            // Verificar código
            if (usuario.codigo_verificacao !== code) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Código inválido' }),
                };
            }

            // Verificar expiração
            const now = new Date();
            const expiresAt = new Date(usuario.codigo_expira_em);
            if (now > expiresAt) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Código expirado. Solicite um novo.' }),
                };
            }

            // Marcar email como verificado
            const { error: updateError } = await supabase
                .from('usuarios')
                .update({
                    email_verificado: true,
                    codigo_verificacao: null,
                    codigo_expira_em: null,
                    atualizado_em: new Date().toISOString(),
                })
                .eq('id', usuario.id);

            if (updateError) {
                console.error('❌ Erro ao verificar email:', updateError);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Erro ao verificar email' }),
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Email verificado com sucesso! ✅',
                }),
            };
        }

        // Ação inválida
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Ação inválida. Use "send" ou "verify"' }),
        };

    } catch (error) {
        console.error('❌ Erro:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Erro interno do servidor' }),
        };
    }
};
