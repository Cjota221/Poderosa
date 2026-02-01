-- ============================================
-- ATIVAR ASSINATURA - Caroline Azevedo
-- Email: carolineazevedo075@gmail.com
-- Data: 01/02/2026
-- ============================================

-- 1. Atualizar campo plano do usuário para 'starter'
UPDATE usuarios 
SET 
    plano = 'starter',
    updated_at = NOW()
WHERE email = 'carolineazevedo075@gmail.com';

-- 2. Ativar a assinatura starter (que estava pending)
UPDATE assinaturas 
SET 
    status = 'active',
    data_inicio = NOW(),
    data_expiracao = NOW() + INTERVAL '30 days'
WHERE usuario_id = (
    SELECT id FROM usuarios WHERE email = 'carolineazevedo075@gmail.com'
)
AND plano = 'starter';

-- 3. Desativar a assinatura trial antiga
UPDATE assinaturas 
SET status = 'expired'
WHERE usuario_id = (
    SELECT id FROM usuarios WHERE email = 'carolineazevedo075@gmail.com'
)
AND plano = 'trial';

-- 4. Verificar resultado
SELECT 
    u.email,
    u.nome,
    u.plano as plano_usuario,
    a.plano as plano_assinatura,
    a.status,
    a.data_inicio,
    a.data_expiracao
FROM usuarios u
LEFT JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.email = 'carolineazevedo075@gmail.com';
