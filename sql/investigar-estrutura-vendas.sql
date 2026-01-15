-- ==========================================
-- INVESTIGAR ESTRUTURA COMPLETA DE VENDAS
-- ==========================================

-- 1. Ver todas as tabelas relacionadas a vendas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%venda%';

-- 2. Ver todas as colunas da tabela vendas com tipos
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'vendas' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Buscar tabelas que podem ser relacionadas (itens, produtos_vendas, etc)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%item%' OR 
    table_name LIKE '%produto%' OR
    table_name LIKE '%venda%'
);

-- 4. Ver se existe alguma constraint FK relacionada à vendas
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name = 'vendas' OR ccu.table_name = 'vendas');