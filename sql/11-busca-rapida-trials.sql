-- ==================================================
-- BUSCA RÁPIDA - DADOS DOS TRIALS (SEM ERROS)
-- ==================================================
-- Execute estas queries UMA POR VEZ no Supabase

-- ✅ QUERY 1: Ver todas as tabelas disponíveis
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ✅ QUERY 2: Ver clientes cadastrados por trials
SELECT * FROM clientes 
WHERE usuario_id LIKE 'trial_%';

-- ✅ QUERY 3: Ver vendas feitas por trials
SELECT * FROM vendas 
WHERE usuario_id LIKE 'trial_%';

-- ✅ QUERY 4: Ver despesas dos trials
SELECT * FROM despesas 
WHERE usuario_id LIKE 'trial_%';

-- ✅ QUERY 5: Ver produtos dos trials (com TODOS os detalhes)
SELECT * FROM produtos 
WHERE usuario_id LIKE 'trial_%'
ORDER BY created_at DESC;

-- ✅ QUERY 6: Ver estrutura da tabela produtos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'produtos'
ORDER BY ordinal_position;

-- ✅ QUERY 7: Ver se existe email/contato em outras colunas
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    column_name LIKE '%email%' 
    OR column_name LIKE '%telefone%' 
    OR column_name LIKE '%whatsapp%'
    OR column_name LIKE '%contato%'
)
ORDER BY table_name, column_name;

-- ✅ QUERY 8: Buscar no Supabase Auth
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email LIKE '%trial%' 
   OR email LIKE '%temporario%'
   OR raw_user_meta_data::text LIKE '%trial_%'
ORDER BY created_at DESC;

-- ✅ QUERY 9: Ver TODOS os usuários cadastrados (para comparar)
SELECT 
    id,
    email,
    nome,
    telefone,
    plano,
    created_at
FROM usuarios
ORDER BY created_at DESC
LIMIT 20;

-- ✅ QUERY 10: Resumo completo dos 2 trials
SELECT 
    u.id,
    u.email,
    u.nome,
    u.telefone,
    u.plano,
    u.created_at as usuario_criado_em,
    COUNT(p.id) as total_produtos,
    STRING_AGG(DISTINCT p.nome, ', ') as produtos,
    MIN(p.created_at) as primeiro_produto_em,
    MAX(p.created_at) as ultimo_produto_em
FROM usuarios u
LEFT JOIN produtos p ON u.id = p.usuario_id
WHERE u.id LIKE 'trial_%'
GROUP BY u.id, u.email, u.nome, u.telefone, u.plano, u.created_at;
