-- ============================================
-- DELETAR TODOS OS TRIALS - LIMPEZA COMPLETA
-- ============================================
-- Este script remove TODOS os usuários trial
-- As pessoas precisarão refazer cadastro completo
-- ============================================

-- 🔍 PASSO 1: VER O QUE SERÁ DELETADO
SELECT 
    '📊 RESUMO - TODOS OS TRIALS SERÃO DELETADOS' AS info;

-- TODOS os trials que serão deletados
SELECT 
    COUNT(DISTINCT u.id) AS total_usuarios_trial,
    COUNT(DISTINCT p.id) AS total_produtos_trial,
    COUNT(DISTINCT a.id) AS total_assinaturas_trial
FROM usuarios u
LEFT JOIN produtos p ON p.usuario_id = u.id
LEFT JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.plano = 'trial';

-- Ver detalhes de TODOS os trials que serão deletados
SELECT 
    '❌ TODOS OS TRIALS QUE SERÃO DELETADOS:' AS info;
    
SELECT 
    u.id,
    u.nome,
    u.email,
    u.created_at,
    COUNT(DISTINCT p.id) AS produtos_cadastrados,
    CASE WHEN u.senha_hash IS NOT NULL THEN 'SIM' ELSE 'NÃO' END AS tem_senha
FROM usuarios u
LEFT JOIN produtos p ON p.usuario_id = u.id
WHERE u.plano = 'trial'
GROUP BY u.id, u.nome, u.email, u.created_at, u.senha_hash
ORDER BY u.created_at DESC;

-- ============================================
-- 🗑️ PASSO 2: DELETAR TODOS OS TRIALS
-- ============================================
-- ⚠️ DELETA TODOS OS USUÁRIOS COM PLANO TRIAL
-- Incluindo emails reais (Carol, etc)
-- ============================================

-- 2A. Deletar vendas dos trials FAKE (protege Carol)
DELETE FROM vendas 
WHERE usuario_id IN (
    SELECT id FROM usuarios 
    WHERE plano = 'trial' 
    AND email != 'carolineazevedo075@gmail.com'
);

-- 2B. Deletar clientes dos trials FAKE (protege Carol)
DELETE FROM clientes 
WHERE usuario_id IN (
    SELECT id FROM usuarios 
    WHERE plano = 'trial' 
    AND email != 'carolineazevedo075@gmail.com'
);

-- 2C. Deletar despesas dos trials FAKE (protege Carol)
DELETE FROM despesas 
WHERE usuario_id IN (
    SELECT id FROM usuarios 
    WHERE plano = 'trial' 
    AND email != 'carolineazevedo075@gmail.com'
);

-- 2D. Deletar metas dos trials FAKE (protege Carol)
DELETE FROM metas 
WHERE usuario_id IN (
    SELECT id FROM usuarios 
    WHERE plano = 'trial' 
    AND email != 'carolineazevedo075@gmail.com'
);

-- 2E. Deletar assinaturas dos trials FAKE (protege Carol)
DELETE FROM assinaturas 
WHERE usuario_id IN (
    SELECT id FROM usuarios 
    WHERE plano = 'trial' 
    AND email != 'carolineazevedo075@gmail.com'
);

-- 2F. Deletar produtos dos trials FAKE (protege Carol)
DELETE FROM produtos 
WHERE usuario_id IN (
    SELECT id FROM usuarios 
    WHERE plano = 'trial' 
    AND email != 'carolineazevedo075@gmail.com'
);

-- 2G. Deletar usuários trial FAKE (protege Carol)
DELETE FROM usuarios 
WHERE plano = 'trial' 
AND email != 'carolineazevedo075@gmail.com';

-- ============================================
-- ✅ PASSO 3: VERIFICAR LIMPEZA
-- ============================================

SELECT 
    '✅ VERIFICAÇÃO PÓS-LIMPEZA' AS info;

-- Contar trials restantes (deve ser 1 = Carol)
SELECT 
    COUNT(*) AS trials_restantes
FROM usuarios
WHERE plano = 'trial';

-- Ver todos os usuários restantes
SELECT 
    'USUÁRIOS RESTANTES:' AS info;

SELECT 
    id,
    nome,
    email,
    plano,
    created_at
FROM usuarios
ORDER BY created_at DESC;

-- ============================================
-- 📝 RESULTADO ESPERADO
-- ============================================
-- Antes: 3 usuários trial (2 fake + Carol)
-- Depois: 1 usuário trial (APENAS CAROL)
-- ✅ CAROL É MANTIDA - email protegido!
-- ============================================

-- ============================================
-- 🔔 PRÓXIMO PASSO
-- ============================================
-- 1. Implementar alerta na tela de login
-- 2. Redirecionar trials antigos para cadastro completo
-- 3. Sistema vai detectar email antigo e pedir nova senha
-- ============================================
