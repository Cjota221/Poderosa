-- ==================================================
-- VER TODOS OS USUÁRIOS CADASTRADOS NO SISTEMA
-- ==================================================
-- Use este SQL no Supabase para ver TODOS os cadastros

-- 📊 QUERY 1: Ver TODOS os usuários (ordenado por data de cadastro)
SELECT 
    u.id,
    u.email,
    u.nome,
    u.telefone,
    u.plano as plano_usuario,
    u.slug as loja_slug,
    u.created_at as cadastrado_em,
    
    -- Dados da assinatura (se existir)
    a.plano as plano_assinatura,
    a.status as status_assinatura,
    a.periodo,
    a.valor,
    a.data_inicio,
    a.data_expiracao,
    a.payment_id
    
FROM usuarios u
LEFT JOIN assinaturas a ON u.id = a.usuario_id
ORDER BY u.created_at DESC;


-- 📊 QUERY 2: Contagem por plano
SELECT 
    plano,
    COUNT(*) as quantidade
FROM usuarios
GROUP BY plano
ORDER BY quantidade DESC;


-- 📊 QUERY 3: Usuários sem assinatura (só cadastro)
SELECT 
    u.id,
    u.email,
    u.nome,
    u.plano,
    u.created_at
FROM usuarios u
LEFT JOIN assinaturas a ON u.id = a.usuario_id
WHERE a.id IS NULL
ORDER BY u.created_at DESC;


-- 📊 QUERY 4: Usuários com assinatura ativa
SELECT 
    u.email,
    u.nome,
    u.plano as plano_usuario,
    a.plano as plano_assinatura,
    a.status,
    a.valor,
    a.data_expiracao
FROM usuarios u
INNER JOIN assinaturas a ON u.id = a.usuario_id
WHERE a.status = 'active'
ORDER BY a.created_at DESC;


-- 📊 QUERY 5: Estatísticas gerais
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN plano = 'trial' THEN 1 END) as total_trials,
    COUNT(CASE WHEN plano = 'starter' THEN 1 END) as total_starters,
    COUNT(CASE WHEN plano = 'pro' THEN 1 END) as total_pro,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as novos_ultimos_7_dias,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as novos_ultimos_30_dias
FROM usuarios;


-- 📊 QUERY 6: Ver últimos 20 cadastros
SELECT 
    u.id,
    u.email,
    u.nome,
    u.telefone,
    u.plano,
    u.created_at,
    a.status as status_assinatura
FROM usuarios u
LEFT JOIN assinaturas a ON u.id = a.usuario_id
ORDER BY u.created_at DESC
LIMIT 20;
