// ============================================
// VALIDADOR DE VARIÁVEIS DE AMBIENTE
// ============================================
// Shared utility para validar env vars em todas as functions

/**
 * Valida variáveis de ambiente obrigatórias
 * @param {string[]} requiredVars - Array de nomes das variáveis obrigatórias
 * @throws {Error} Se alguma variável estiver faltando
 */
function validateEnvVars(requiredVars) {
    const missing = [];
    
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }
    
    if (missing.length > 0) {
        const error = `❌ Variáveis de ambiente faltando: ${missing.join(', ')}`;
        console.error(error);
        throw new Error(error);
    }
}

/**
 * Valida configuração do Supabase
 * @returns {Object} - { supabaseUrl, supabaseKey }
 * @throws {Error} Se variáveis estiverem faltando
 */
function validateSupabaseConfig() {
    validateEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']);
    
    return {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_KEY
    };
}

/**
 * Valida configuração do Mercado Pago
 * @returns {Object} - { accessToken, publicKey }
 * @throws {Error} Se variáveis estiverem faltando
 */
function validateMercadoPagoConfig() {
    validateEnvVars(['MERCADO_PAGO_ACCESS_TOKEN']);
    
    return {
        accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
        publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || null, // Opcional
        webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || null // Opcional mas recomendado
    };
}

/**
 * Valida configuração de email (opcional - para futuro)
 * @returns {Object|null} - Config do serviço de email ou null
 */
function validateEmailConfig() {
    // SendGrid
    if (process.env.SENDGRID_API_KEY) {
        return {
            provider: 'sendgrid',
            apiKey: process.env.SENDGRID_API_KEY
        };
    }
    
    // Mailgun
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
        return {
            provider: 'mailgun',
            apiKey: process.env.MAILGUN_API_KEY,
            domain: process.env.MAILGUN_DOMAIN
        };
    }
    
    // AWS SES
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
        return {
            provider: 'ses',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        };
    }
    
    console.warn('⚠️ Nenhum serviço de email configurado');
    return null;
}

/**
 * Log de variáveis de ambiente (para debug - NÃO loga valores sensíveis)
 */
function logEnvStatus() {
    console.log('📋 Status das variáveis de ambiente:');
    console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurada' : '❌ Faltando');
    console.log('  SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Configurada' : '❌ Faltando');
    console.log('  MERCADO_PAGO_ACCESS_TOKEN:', process.env.MERCADO_PAGO_ACCESS_TOKEN ? '✅ Configurada' : '❌ Faltando');
    console.log('  MERCADO_PAGO_PUBLIC_KEY:', process.env.MERCADO_PAGO_PUBLIC_KEY ? '✅ Configurada' : '⚠️ Opcional');
    console.log('  MERCADO_PAGO_WEBHOOK_SECRET:', process.env.MERCADO_PAGO_WEBHOOK_SECRET ? '✅ Configurada' : '⚠️ Recomendado');
    console.log('  Email Service:', validateEmailConfig() ? '✅ Configurado' : '⚠️ Não configurado');
}

module.exports = {
    validateEnvVars,
    validateSupabaseConfig,
    validateMercadoPagoConfig,
    validateEmailConfig,
    logEnvStatus
};
