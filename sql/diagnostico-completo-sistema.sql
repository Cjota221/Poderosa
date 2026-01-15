-- ===============================================
-- DIAGNÓSTICO COMPLETO - VERIFICAR TUDO
-- ===============================================

-- 1. Verificar se há vendas na tabela vendas
SELECT COUNT(*) as total_vendas FROM vendas;

-- 2. Verificar se há itens na tabela itens_venda  
SELECT COUNT(*) as total_itens FROM itens_venda;

-- 3. Verificar se usuário existe
SELECT 
    id,
    email,
    nome,
    slug,
    created_at
FROM usuarios 
WHERE email = 'comercial@cjotarasteirinhas.com';

-- 4. Ver últimas ações no sistema (se houver logs)
SELECT 
    'Últimas vendas' as tipo,
    COUNT(*) as quantidade
FROM vendas 
WHERE created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Últimos produtos' as tipo,
    COUNT(*) as quantidade
FROM produtos 
WHERE updated_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Últimos usuários' as tipo,
    COUNT(*) as quantidade
FROM usuarios 
WHERE updated_at > NOW() - INTERVAL '24 hours';

-- 5. Verificar estrutura completa das tabelas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('vendas', 'itens_venda', 'usuarios', 'produtos')
ORDER BY tablename;