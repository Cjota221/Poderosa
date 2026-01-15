-- ============================================
-- DIAGNÓSTICO COMPLETO DO SUPABASE
-- ============================================

-- 1. VERIFICAR SE TABELAS EXISTEM
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('vendas', 'itens_venda', 'usuarios', 'produtos')
ORDER BY table_name;

-- 2. VERIFICAR RLS (Row Level Security)
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('vendas', 'itens_venda')
ORDER BY tablename;

-- 3. VERIFICAR POLÍTICAS RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('vendas', 'itens_venda')
ORDER BY tablename, policyname;

-- 4. VERIFICAR CONSTRAINTS
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('vendas', 'itens_venda')
ORDER BY tc.table_name, tc.constraint_type;

-- 5. TESTE DE INSERÇÃO SIMPLES (se falhar, veremos o erro)
-- COPIE E EXECUTE SEPARADAMENTE:
/*
INSERT INTO vendas (id, usuario_id, numero_venda, valor_total, valor_final) 
VALUES ('12345678-1234-4567-8901-123456789012', '7fd505a4-7313-43c9-baef-3fc82117bf8d', 'TESTE', 1.00, 1.00);
*/

-- 6. VERIFICAR PERMISSÕES DE USUÁRIO ATUAL
SELECT current_user as usuario_atual, current_database() as banco_atual;

-- 7. VERIFICAR SE USUÁRIO EXISTE NA TABELA
SELECT id, email, nome FROM usuarios WHERE email = 'comercial@cjotarasteirinhas.com';