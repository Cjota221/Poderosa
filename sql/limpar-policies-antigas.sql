-- ============================================
-- LIMPAR POLICIES ANTIGAS DUPLICADAS
-- ============================================
-- Execute no Supabase SQL Editor
-- Data: 14/01/2026

-- 🎯 Objetivo: Remover policies antigas que ficaram duplicadas

-- USUARIOS
DROP POLICY IF EXISTS "Service role full access usuarios" ON usuarios;

-- ASSINATURAS
DROP POLICY IF EXISTS "Service role full access assinaturas" ON assinaturas;

-- PRODUTOS
DROP POLICY IF EXISTS "service_role_all_produtos" ON produtos;

-- CLIENTES
DROP POLICY IF EXISTS "service_role_all_clientes" ON clientes;

-- VENDAS
DROP POLICY IF EXISTS "service_role_all_vendas" ON vendas;

-- DESPESAS
DROP POLICY IF EXISTS "service_role_all_despesas" ON despesas;

-- METAS
DROP POLICY IF EXISTS "service_role_all_metas" ON metas;

-- Verificar policies restantes
SELECT 
    tablename,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
/*
Cada tabela deve ter apenas as policies necessárias:

- usuarios: 4 policies (select, update user + insert, update service)
- produtos: 5 policies (select, insert, update, delete user + all service)
- clientes: 5 policies (select, insert, update, delete user + all service)
- vendas: 5 policies (select, insert, update, delete user + all service)
- despesas: 5 policies (select, insert, update, delete user + all service)
- transacoes: 3 policies (select, insert user + all service)
- metas: 5 policies (select, insert, update, delete user + all service)
- conquistas: 2 policies (select user + all service)
- app_state: 4 policies (select, insert, update user + all service)
- assinaturas: 1 policy (all service)

✅ Total: ~38 policies (sem duplicatas)
*/
