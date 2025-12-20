// Netlify Function - Login de usuário
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// 🚨 MODO EMERGÊNCIA - Senha mestra temporária
const EMERGENCY_PASSWORD = 'lucrocerto2025';

// Hash SHA-256 (LEGADO - apenas para compatibilidade com senhas antigas)
function hashPasswordLegacy(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Verificar senha (suporta bcrypt E SHA-256 legado E senha mestra)
async function verifyPassword(password, storedHash) {
    // 🚨 EMERGÊNCIA: Senha mestra para debug
    if (password === EMERGENCY_PASSWORD) {
        console.log('🚨 LOGIN COM SENHA MESTRA!');
        return true;
    }
    
    // Se o hash começa com $2b$ ou $2a$, é bcrypt
    if (storedHash && (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$'))) {
        return await bcrypt.compare(password, storedHash);
    }
    
    // Caso contrário, é SHA-256 legado
    if (storedHash) {
        const sha256Hash = hashPasswordLegacy(password);
        return sha256Hash === storedHash;
    }
    
    return false;
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
        const { email, password } = JSON.parse(event.body);

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

        console.log('🔐 Tentativa de login:', emailLower);

        // Buscar usuário
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('id, email, nome, plano, senha_hash, cadastro_completo')
            .eq('email', emailLower)
            .single();

        if (userError || !user) {
            console.log('❌ Usuário não encontrado:', emailLower);
            console.log('❌ Erro:', userError);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Email ou senha incorretos',
                    debug: { email: emailLower, dbError: userError?.message }
                })
            };
        }

        console.log('✅ Usuário encontrado:', user.email, 'cadastro_completo:', user.cadastro_completo);

        // 🚨 TEMPORÁRIO: Verificação de cadastro_completo DESATIVADA para debug
        // Permitir login mesmo sem cadastro_completo

        // Verificar senha (suporta bcrypt E SHA-256 legado E senha mestra)
        const senhaValida = await verifyPassword(password, user.senha_hash);
        
        if (!senhaValida) {
            console.log('❌ Senha incorreta para:', emailLower);
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Email ou senha incorretos' })
            };
        }

        // Buscar assinatura ativa
        const { data: subscription } = await supabase
            .from('assinaturas')
            .select('id, plano, status, periodo, data_expiracao, data_inicio')
            .eq('usuario_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // Determinar plano ativo - PRIORIDADE: subscription > usuario.plano > trial
        let planoAtivo = 'trial';
        let assinaturaInfo = null;
        let assinaturaStatus = 'none'; // none, active, expiring_soon, expired, grace_period
        
        if (subscription) {
            // Tem assinatura - verificar se está válida
            if (subscription.data_expiracao) {
                const expiracao = new Date(subscription.data_expiracao);
                const hoje = new Date();
                const diasRestantes = Math.ceil((expiracao - hoje) / (1000 * 60 * 60 * 24));
                
                // PERÍODO DE CARÊNCIA: 2 dias após expirar
                const gracePeriodDays = 2;
                const diasAposExpiracao = Math.ceil((hoje - expiracao) / (1000 * 60 * 60 * 24));
                
                if (diasRestantes > 0) {
                    // Ainda está ativo
                    planoAtivo = subscription.plano;
                    
                    // Avisar se está perto de expirar (3 dias ou menos)
                    if (diasRestantes <= 3) {
                        assinaturaStatus = 'expiring_soon';
                    } else {
                        assinaturaStatus = 'active';
                    }
                    
                    assinaturaInfo = {
                        plano: subscription.plano,
                        status: subscription.status,
                        periodo: subscription.periodo,
                        data_inicio: subscription.data_inicio,
                        data_expiracao: subscription.data_expiracao,
                        dias_restantes: diasRestantes,
                        aviso_expiracao: diasRestantes <= 3
                    };
                    console.log(`✅ Assinatura válida: ${planoAtivo} (${diasRestantes} dias restantes)`);
                    
                } else if (diasAposExpiracao <= gracePeriodDays) {
                    // PERÍODO DE CARÊNCIA: Expirou mas ainda tem até 2 dias
                    planoAtivo = subscription.plano; // Mantém acesso temporário
                    assinaturaStatus = 'grace_period';
                    
                    assinaturaInfo = {
                        plano: subscription.plano,
                        status: 'expired_grace',
                        periodo: subscription.periodo,
                        data_inicio: subscription.data_inicio,
                        data_expiracao: subscription.data_expiracao,
                        dias_restantes: 0,
                        dias_apos_expiracao: diasAposExpiracao,
                        dias_carencia_restantes: gracePeriodDays - diasAposExpiracao,
                        em_periodo_carencia: true
                    };
                    console.log(`⚠️ PERÍODO DE CARÊNCIA: ${diasAposExpiracao}/${gracePeriodDays} dias - ${gracePeriodDays - diasAposExpiracao} dias restantes`);
                    
                } else {
                    // EXPIROU E PASSOU DO PERÍODO DE CARÊNCIA
                    assinaturaStatus = 'expired';
                    planoAtivo = 'expired'; // Bloqueia acesso
                    
                    assinaturaInfo = {
                        plano: subscription.plano,
                        status: 'expired',
                        periodo: subscription.periodo,
                        data_inicio: subscription.data_inicio,
                        data_expiracao: subscription.data_expiracao,
                        dias_restantes: 0,
                        dias_apos_expiracao: diasAposExpiracao,
                        bloqueado: true
                    };
                    
                    console.log(`❌ Assinatura EXPIRADA há ${diasAposExpiracao} dias - BLOQUEADO`);
                    
                    // Atualizar status no banco
                    await supabase
                        .from('assinaturas')
                        .update({ status: 'expired' })
                        .eq('id', subscription.id);
                    
                    await supabase
                        .from('usuarios')
                        .update({ plano: 'expired' })
                        .eq('id', user.id);
                }
            } else {
                // Assinatura sem data de expiração = válida indefinidamente
                planoAtivo = subscription.plano;
                assinaturaStatus = 'active';
                assinaturaInfo = {
                    plano: subscription.plano,
                    status: subscription.status,
                    periodo: subscription.periodo,
                    data_inicio: subscription.data_inicio,
                    data_expiracao: null
                };
                console.log('✅ Assinatura válida (sem expiração):', planoAtivo);
            }
        } else if (user.plano && user.plano !== 'trial') {
            // Não tem assinatura mas tem plano salvo no usuário
            planoAtivo = user.plano;
            assinaturaStatus = 'active';
            console.log('✅ Usando plano do usuário (sem assinatura):', planoAtivo);
        } else {
            console.log('⚠️ Nenhuma assinatura encontrada - modo trial');
            assinaturaStatus = 'none';
        }

        // Atualizar último login
        await supabase
            .from('usuarios')
            .update({ ultimo_login: new Date().toISOString() })
            .eq('id', user.id);

        console.log('✅ Login bem-sucedido:', emailLower, '- Plano:', planoAtivo, '- Status:', assinaturaStatus);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Login realizado com sucesso!',
                user: {
                    id: user.id,
                    email: user.email,
                    nome: user.nome,
                    plano: planoAtivo
                },
                subscription: assinaturaInfo,
                subscriptionStatus: assinaturaStatus, // Status da assinatura
                isFirstLogin: !user.ultimo_login, // Para mostrar tour de boas-vindas
                tourCompleted: user.tour_completed || false // Se já completou o tour
            })
        };

    } catch (error) {
        console.error('❌ Erro no login:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Erro ao processar login',
                details: error.message 
            })
        };
    }
};
