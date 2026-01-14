-- ============================================
-- LIMPAR REGISTROS TRIAL CORROMPIDOS
-- ============================================
-- Esses registros têm:
-- 1. IDs no formato trial_xxxxxxxxx (timestamps)
-- 2. Emails trial_xxxx@temporario.com
-- 3. Nome do usuário = nome do produto (ERRADO)
-- ============================================

-- 🔍 PASSO 1: VER O QUE SERÁ DELETADO
-- ============================================
SELECT 
    'USUARIOS' AS tabela,
    u.id,
    u.nome,
    u.email,
    u.telefone,
    u.plano,
    u.created_at
FROM usuarios u
WHERE u.id LIKE 'trial_%'
   OR u.email LIKE '%@temporario.com'
ORDER BY u.created_at DESC;

-- Ver produtos associados
SELECT 
    'PRODUTOS' AS tabela,
    p.id,
    p.usuario_id,
    p.nome AS produto_nome,
    u.nome AS usuario_nome,
    u.email
FROM produtos p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.id LIKE 'trial_%'
   OR u.email LIKE '%@temporario.com'
ORDER BY p.created_at DESC;

-- Ver assinaturas associadas
SELECT 
    'ASSINATURAS' AS tabela,
    a.usuario_id,
    a.plano,
    a.status,
    a.data_inicio,
    a.data_expiracao,
    u.nome,
    u.email
FROM assinaturas a
JOIN usuarios u ON a.usuario_id = u.id
WHERE u.id LIKE 'trial_%'
   OR u.email LIKE '%@temporario.com'
ORDER BY a.data_inicio DESC;

-- ============================================
-- 🧹 PASSO 2: DELETAR OS DADOS CORROMPIDOS
-- ============================================
-- ⚠️ ATENÇÃO: Execute PASSO A PASSO
-- Descomente cada bloco e execute separadamente
-- ============================================

-- 2A. Deletar assinaturas dos trials corrompidos
-- DELETE FROM assinaturas
-- WHERE usuario_id IN (
--     SELECT id FROM usuarios 
--     WHERE id LIKE 'trial_%' 
--        OR email LIKE '%@temporario.com'
-- );

-- 2B. Deletar produtos dos trials corrompidos  
-- DELETE FROM produtos
-- WHERE usuario_id IN (
--     SELECT id FROM usuarios 
--     WHERE id LIKE 'trial_%' 
--        OR email LIKE '%@temporario.com'
-- );

-- 2C. Deletar os usuários trial corrompidos
-- DELETE FROM usuarios
-- WHERE id LIKE 'trial_%' 
--    OR email LIKE '%@temporario.com';

-- ============================================
-- ✅ PASSO 3: VERIFICAR SE FOI DELETADO
-- ============================================

-- Contar o que restou
SELECT 
    'usuarios' AS tabela,
    COUNT(*) AS total
FROM usuarios
UNION ALL
SELECT 
    'produtos' AS tabela,
    COUNT(*) AS total
FROM produtos
UNION ALL
SELECT 
    'assinaturas' AS tabela,
    COUNT(*) AS total
FROM assinaturas;

-- Ver todos os usuários restantes
SELECT 
    id,
    nome,
    email,
    plano,
    created_at
FROM usuarios
ORDER BY created_at DESC;

-- ============================================
-- 📋 RESULTADO ESPERADO
-- ============================================
-- ✅ Antes: 3 usuários, 4 produtos, 4 assinaturas
-- ✅ Depois: 1 usuário (user_carol_gmail), 2 produtos, 2 assinaturas
-- ============================================

-- ============================================
-- 🛡️ PREVENÇÃO FUTURA
-- ============================================
-- Os trials corretos devem ter:
-- - ID gerado pelo banco (UUID automático)
-- - Email real fornecido pelo usuário
-- - Nome real da pessoa, não do produto
-- 
-- A função start-trial.js já faz isso corretamente!
-- ============================================
