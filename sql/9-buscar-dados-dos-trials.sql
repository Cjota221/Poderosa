-- ==================================================
-- BUSCAR DADOS DOS USUÁRIOS TRIAL EM OUTRAS TABELAS
-- ==================================================

-- 🔍 QUERY 1: Ver todas as tabelas que existem no banco
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 🔍 QUERY 2: Verificar se tem dados na tabela clientes (podem ter salvado contato lá)
SELECT * FROM clientes 
WHERE usuario_id LIKE 'trial_%'
LIMIT 100;

-- 🔍 QUERY 3: Verificar se tem dados na tabela vendas
SELECT * FROM vendas 
WHERE usuario_id LIKE 'trial_%'
LIMIT 100;

-- 🔍 QUERY 4: Verificar se tem logs ou histórico
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (column_name LIKE '%email%' OR column_name LIKE '%nome%')
ORDER BY table_name, ordinal_position;

-- 🔍 QUERY 5: Buscar em TODAS as tabelas por trial_1767437190538
-- (substitua pelo ID que você quer investigar)
DO $$
DECLARE
    r RECORD;
    v_sql TEXT;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    LOOP
        BEGIN
            v_sql := format('SELECT ''%s'' as tabela, * FROM %I WHERE usuario_id = ''trial_1767437190538'' LIMIT 5', 
                           r.table_name, r.table_name);
            RAISE NOTICE 'Checking table: %', r.table_name;
            EXECUTE v_sql;
        EXCEPTION WHEN OTHERS THEN
            -- Ignora tabelas que não têm coluna usuario_id
            NULL;
        END;
    END LOOP;
END $$;

-- 🔍 QUERY 6: Ver estrutura da tabela produtos (pode ter mais colunas)
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'produtos'
ORDER BY ordinal_position;

-- 🔍 QUERY 7: Ver TODOS os dados dos produtos dos trials (talvez tenha pista no nome/descrição)
SELECT 
    usuario_id,
    nome,
    descricao,
    categoria,
    created_at,
    updated_at
FROM produtos
WHERE usuario_id LIKE 'trial_%'
ORDER BY created_at DESC;

-- 🔍 QUERY 8: Verificar se Supabase Auth tem esses usuários
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users
WHERE email LIKE '%trial%' OR email LIKE '%temporario%'
ORDER BY created_at DESC;

-- ==================================================
-- FIM DAS QUERIES
-- ==================================================
-- Se encontrar dados em alguma tabela, use UPDATE para atualizar o email:
-- UPDATE usuarios SET email = 'email_encontrado@exemplo.com' WHERE id = 'trial_1767437190538';
