-- ==================================================
-- ENCONTRAR USUÁRIOS TRIAL "FANTASMAS"
-- ==================================================
-- Esses são usuários que estão usando o sistema mas NÃO estão no banco
-- Eles têm formato: trial_1767404409888 (trial_ + timestamp)

-- 🔍 QUERY 1: Ver todos os usuario_id únicos na tabela produtos
SELECT DISTINCT usuario_id 
FROM produtos 
ORDER BY usuario_id;

-- 🔍 QUERY 2: Encontrar IDs que começam com "trial_"
SELECT DISTINCT usuario_id 
FROM produtos 
WHERE usuario_id LIKE 'trial_%'
ORDER BY usuario_id;

-- 🔍 QUERY 3: Contar quantos trials fantasmas existem
SELECT COUNT(DISTINCT usuario_id) as total_trials_fantasmas
FROM produtos 
WHERE usuario_id LIKE 'trial_%';

-- 🔍 QUERY 4: Ver produtos dos trials fantasmas
SELECT 
    usuario_id,
    COUNT(*) as total_produtos,
    MIN(created_at) as primeiro_produto,
    MAX(created_at) as ultimo_produto
FROM produtos 
WHERE usuario_id LIKE 'trial_%'
GROUP BY usuario_id
ORDER BY primeiro_produto DESC;

-- 🔍 QUERY 5: Ver se esses IDs existem na tabela usuarios
SELECT 
    p.usuario_id as id_no_produto,
    u.id as id_no_usuarios,
    u.email,
    u.nome,
    u.plano,
    COUNT(p.id) as total_produtos
FROM produtos p
LEFT JOIN usuarios u ON p.usuario_id = u.id
WHERE p.usuario_id LIKE 'trial_%'
GROUP BY p.usuario_id, u.id, u.email, u.nome, u.plano;

-- 🔍 QUERY 6: Encontrar trials fantasmas que NÃO estão no banco usuarios
SELECT DISTINCT p.usuario_id
FROM produtos p
LEFT JOIN usuarios u ON p.usuario_id = u.id
WHERE p.usuario_id LIKE 'trial_%'
AND u.id IS NULL;

-- 🔍 QUERY 7: Ver TODOS os detalhes dos produtos dos fantasmas
SELECT 
    p.usuario_id,
    p.nome as produto_nome,
    p.categoria,
    p.preco_venda,
    p.created_at as cadastrado_em
FROM produtos p
LEFT JOIN usuarios u ON p.usuario_id = u.id
WHERE p.usuario_id LIKE 'trial_%'
AND u.id IS NULL
ORDER BY p.created_at DESC;
