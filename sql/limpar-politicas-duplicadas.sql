-- ============================================
-- LIMPAR: Remover políticas duplicadas antigas
-- ============================================

-- Remover políticas antigas (com espaço no nome)
DROP POLICY IF EXISTS "Service role full access clientes" ON clientes;
DROP POLICY IF EXISTS "Service role full access vendas" ON vendas;
DROP POLICY IF EXISTS "Service role full access despesas" ON despesas;
DROP POLICY IF EXISTS "Service role full access metas" ON metas;

-- Verificar resultado final (deve ter apenas 1 por tabela)
SELECT 
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('produtos', 'clientes', 'vendas', 'despesas', 'metas')
ORDER BY tablename, policyname;
