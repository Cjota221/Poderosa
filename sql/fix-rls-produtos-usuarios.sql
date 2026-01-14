-- ============================================
-- CORRIGIR RLS: Permitir usuários gerenciarem produtos
-- ============================================

-- 🔥 PROBLEMA: Usuários autenticados não conseguem INSERT/UPDATE/DELETE
-- 📋 SOLUÇÃO: Criar políticas para operações do próprio usuário

-- ============================================
-- POLÍTICA: Usuários podem ver seus produtos
-- ============================================
DROP POLICY IF EXISTS "Usuarios veem seus produtos" ON produtos;

CREATE POLICY "Usuarios veem seus produtos"
ON produtos
FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

-- ============================================
-- POLÍTICA: Usuários podem criar seus produtos
-- ============================================
DROP POLICY IF EXISTS "Usuarios criam seus produtos" ON produtos;

CREATE POLICY "Usuarios criam seus produtos"
ON produtos
FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid());

-- ============================================
-- POLÍTICA: Usuários podem atualizar seus produtos
-- ============================================
DROP POLICY IF EXISTS "Usuarios atualizam seus produtos" ON produtos;

CREATE POLICY "Usuarios atualizam seus produtos"
ON produtos
FOR UPDATE
TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

-- ============================================
-- POLÍTICA: Usuários podem deletar seus produtos
-- ============================================
DROP POLICY IF EXISTS "Usuarios deletam seus produtos" ON produtos;

CREATE POLICY "Usuarios deletam seus produtos"
ON produtos
FOR DELETE
TO authenticated
USING (usuario_id = auth.uid());

-- ============================================
-- VERIFICAR: Listar todas as políticas
-- ============================================
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'produtos'
ORDER BY cmd, policyname;
