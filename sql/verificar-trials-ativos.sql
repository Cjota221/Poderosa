-- ============================================
-- VERIFICAR QUAIS TRIALS SÃO REAIS
-- ============================================
-- NÃO DELETE NADA AINDA! Vamos ver quem está usando
-- ============================================

-- 1. Ver TODOS os detalhes dos usuários trial
SELECT 
    id,
    nome,
    email,
    telefone,
    plano,
    status,
    cadastro_completo,
    tour_concluido,
    created_at,
    updated_at,
    CASE 
        WHEN senha_hash IS NOT NULL THEN '✅ TEM SENHA'
        ELSE '❌ SEM SENHA'
    END AS tem_senha,
    CASE 
        WHEN email LIKE '%@temporario.com' THEN '❌ EMAIL FAKE'
        ELSE '✅ EMAIL REAL'
    END AS tipo_email
FROM usuarios 
WHERE plano = 'trial'
ORDER BY created_at DESC;

-- 2. Ver PRODUTOS cadastrados por cada trial (sinal de uso real)
SELECT 
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.email,
    COUNT(p.id) AS total_produtos,
    MAX(p.created_at) AS ultimo_produto_criado,
    STRING_AGG(p.nome, ', ') AS produtos
FROM usuarios u
LEFT JOIN produtos p ON p.usuario_id = u.id
WHERE u.plano = 'trial'
GROUP BY u.id, u.nome, u.email
ORDER BY total_produtos DESC;

-- 3. Ver VENDAS (se fez venda, está usando!)
SELECT 
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.email,
    COUNT(v.id) AS total_vendas,
    MAX(v.created_at) AS ultima_venda
FROM usuarios u
LEFT JOIN vendas v ON v.usuario_id = u.id
WHERE u.plano = 'trial'
GROUP BY u.id, u.nome, u.email;

-- 4. Ver CLIENTES cadastrados
SELECT 
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.email,
    COUNT(c.id) AS total_clientes
FROM usuarios u
LEFT JOIN clientes c ON c.usuario_id = u.id
WHERE u.plano = 'trial'
GROUP BY u.id, u.nome, u.email;

-- 5. Ver DESPESAS cadastradas
SELECT 
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.email,
    COUNT(d.id) AS total_despesas
FROM usuarios u
LEFT JOIN despesas d ON d.usuario_id = u.id
WHERE u.plano = 'trial'
GROUP BY u.id, u.nome, u.email;

-- ============================================
-- 📊 ANÁLISE: Como identificar trial REAL
-- ============================================
-- ✅ Trial REAL (NÃO DELETAR):
--    • Tem senha_hash
--    • Email real (não @temporario.com)
--    • Cadastrou produtos
--    • Fez vendas ou cadastrou clientes
--    • tour_concluido = true
--
-- ❌ Trial FAKE (PODE DELETAR):
--    • Sem senha_hash
--    • Email fake (@temporario.com)
--    • Nenhum produto/venda/cliente
--    • tour_concluido = false
-- ============================================

-- 6. RESUMO CONSOLIDADO (executar por último)
SELECT 
    u.id,
    u.nome,
    u.email,
    u.telefone,
    u.created_at,
    CASE WHEN u.senha_hash IS NOT NULL THEN '✅' ELSE '❌' END AS tem_senha,
    CASE WHEN u.email NOT LIKE '%@temporario.com' THEN '✅' ELSE '❌' END AS email_real,
    CASE WHEN u.cadastro_completo THEN '✅' ELSE '❌' END AS cadastro_ok,
    COALESCE(COUNT(DISTINCT p.id), 0) AS produtos,
    COALESCE(COUNT(DISTINCT v.id), 0) AS vendas,
    COALESCE(COUNT(DISTINCT c.id), 0) AS clientes,
    CASE 
        WHEN COALESCE(COUNT(DISTINCT p.id), 0) > 0 OR 
             COALESCE(COUNT(DISTINCT v.id), 0) > 0 OR 
             COALESCE(COUNT(DISTINCT c.id), 0) > 0 
        THEN '🟢 TRIAL ATIVO (NÃO DELETAR!)'
        WHEN u.senha_hash IS NOT NULL 
        THEN '🟡 TEM SENHA MAS INATIVO'
        ELSE '🔴 TRIAL FAKE (PODE DELETAR)'
    END AS status_real
FROM usuarios u
LEFT JOIN produtos p ON p.usuario_id = u.id
LEFT JOIN vendas v ON v.usuario_id = u.id
LEFT JOIN clientes c ON c.usuario_id = u.id
WHERE u.plano = 'trial'
GROUP BY u.id, u.nome, u.email, u.telefone, u.created_at, u.senha_hash, u.cadastro_completo
ORDER BY status_real, u.created_at DESC;
