-- ==================================================
-- CRIAR USUÁRIOS NO BANCO PARA OS TRIALS FANTASMAS
-- ==================================================
-- Este SQL vai criar registros na tabela usuarios para os trials que só existem no localStorage

-- ⚠️ IMPORTANTE: Execute as queries na ordem!

-- 📊 PASSO 1: Ver quantos trials fantasmas existem
SELECT COUNT(DISTINCT usuario_id) as total_trials_fantasmas
FROM produtos 
WHERE usuario_id LIKE 'trial_%';

-- 📊 PASSO 2: Ver a lista de trials fantasmas com dados
SELECT 
    p.usuario_id,
    MIN(p.nome) as primeiro_produto_nome,
    COUNT(*) as total_produtos,
    MIN(p.created_at) as primeira_atividade,
    MAX(p.created_at) as ultima_atividade
FROM produtos p
LEFT JOIN usuarios u ON p.usuario_id = u.id
WHERE p.usuario_id LIKE 'trial_%'
AND u.id IS NULL
GROUP BY p.usuario_id
ORDER BY primeira_atividade DESC;

-- 🔧 PASSO 3: Criar usuários na tabela usuarios para cada trial fantasma
-- Usa o usuario_id do produto como ID do usuário
INSERT INTO usuarios (id, email, nome, telefone, plano)
SELECT DISTINCT
    p.usuario_id as id,
    CONCAT('trial_', SUBSTRING(p.usuario_id FROM 7), '@temporario.com') as email,
    COALESCE(MIN(p.nome), 'Usuário Trial') as nome,
    '' as telefone,
    'trial' as plano
FROM produtos p
LEFT JOIN usuarios u ON p.usuario_id = u.id
WHERE p.usuario_id LIKE 'trial_%'
AND u.id IS NULL
GROUP BY p.usuario_id
ON CONFLICT (id) DO NOTHING;

-- 🔧 PASSO 4: Criar assinaturas para os trials criados
INSERT INTO assinaturas (usuario_id, plano, status, periodo, valor, data_inicio, data_expiracao)
SELECT 
    p.usuario_id,
    'trial' as plano,
    CASE 
        WHEN MAX(p.created_at) >= NOW() - INTERVAL '7 days' THEN 'active'
        ELSE 'expired'
    END as status,
    'trial' as periodo,
    0 as valor,
    MIN(p.created_at) as data_inicio,
    MIN(p.created_at) + INTERVAL '7 days' as data_expiracao
FROM produtos p
INNER JOIN usuarios u ON p.usuario_id = u.id
WHERE p.usuario_id LIKE 'trial_%'
AND NOT EXISTS (
    SELECT 1 FROM assinaturas a WHERE a.usuario_id = p.usuario_id
)
GROUP BY p.usuario_id;

-- ✅ PASSO 5: Verificar se funcionou
SELECT 
    u.id,
    u.email,
    u.nome,
    u.plano,
    u.created_at as cadastrado_em,
    a.status as status_assinatura,
    a.data_expiracao,
    (SELECT COUNT(*) FROM produtos WHERE usuario_id = u.id) as total_produtos
FROM usuarios u
LEFT JOIN assinaturas a ON u.id = a.usuario_id
WHERE u.id LIKE 'trial_%'
ORDER BY u.created_at DESC;

-- 📊 PASSO 6: Estatísticas finais
SELECT 
    COUNT(*) as total_usuarios_trial,
    COUNT(CASE WHEN a.status = 'active' THEN 1 END) as trials_ativos,
    COUNT(CASE WHEN a.status = 'expired' THEN 1 END) as trials_expirados,
    SUM((SELECT COUNT(*) FROM produtos WHERE usuario_id = u.id)) as total_produtos_criados
FROM usuarios u
LEFT JOIN assinaturas a ON u.id = a.usuario_id
WHERE u.id LIKE 'trial_%';
