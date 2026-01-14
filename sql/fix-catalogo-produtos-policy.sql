-- ============================================
-- FIX: PRODUTOS NÃO APARECEM NO CATÁLOGO
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- Painel: https://supabase.com/dashboard/project/ldfahdueqzgemplxrffm/sql
-- ============================================

-- 🔍 PROBLEMA IDENTIFICADO:
-- O RLS (Row Level Security) está ativado na tabela produtos,
-- mas não existe uma policy permitindo leitura pública dos produtos
-- visíveis no catálogo. A função get-catalog.js usa o SERVICE_KEY
-- mas pode haver casos onde o RLS ainda bloqueia.

-- ============================================
-- SOLUÇÃO: Adicionar Policy de Leitura Pública
-- ============================================

-- 1. Verificar policies existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'produtos';

-- 2. Remover policy antiga se existir (evitar duplicação)
DROP POLICY IF EXISTS "Produtos públicos são visíveis no catálogo" ON produtos;
DROP POLICY IF EXISTS "Produtos visiveis no catalogo sao publicos" ON produtos;
DROP POLICY IF EXISTS "Public read produtos visiveis" ON produtos;

-- 3. Criar nova policy permitindo leitura pública de produtos visíveis
CREATE POLICY "Produtos visiveis no catalogo sao publicos" 
ON produtos 
FOR SELECT 
USING (
    ativo = true 
    AND visivel_catalogo = true
);

-- 4. Garantir que o service role tem acesso total (já existe, mas recriar)
DROP POLICY IF EXISTS "Service role tem acesso total a produtos" ON produtos;
CREATE POLICY "Service role tem acesso total a produtos" 
ON produtos 
FOR ALL 
USING (true);

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Ver todas as policies da tabela produtos
SELECT 
    policyname, 
    permissive,
    cmd,
    qual 
FROM pg_policies 
WHERE tablename = 'produtos';

-- Contar produtos visíveis no catálogo
SELECT 
    u.nome AS loja,
    COUNT(p.id) AS total_produtos,
    COUNT(CASE WHEN p.visivel_catalogo THEN 1 END) AS produtos_visiveis
FROM usuarios u
LEFT JOIN produtos p ON p.usuario_id = u.id
GROUP BY u.id, u.nome
ORDER BY u.nome;

-- Ver produtos da cliente específica (troque o email)
SELECT 
    p.id,
    p.nome,
    p.preco_venda,
    p.ativo,
    p.visivel_catalogo,
    p.imagem_url
FROM usuarios u
JOIN produtos p ON p.usuario_id = u.id
WHERE u.email = 'carolineazevedo075@gmail.com' -- TROCAR PELO EMAIL DA CLIENTE
ORDER BY p.id DESC;

-- ============================================
-- 🎯 RESULTADO ESPERADO
-- ============================================
-- Depois de executar este script:
-- ✅ Produtos com ativo=true e visivel_catalogo=true devem aparecer no catálogo
-- ✅ O catálogo público deve carregar os produtos corretamente
-- ✅ A função get-catalog.js vai conseguir buscar os produtos

-- ============================================
-- 📝 OBSERVAÇÕES
-- ============================================
-- Se os produtos ainda não aparecerem:
-- 1. Verifique se os produtos têm ativo=true e visivel_catalogo=true
-- 2. Confira se a SUPABASE_SERVICE_KEY está configurada no Netlify
-- 3. Teste a função get-catalog.js direto no navegador:
--    https://sistemalucrocerto.com/.netlify/functions/get-catalog?loja=SLUG_OU_EMAIL
-- 4. Verifique os logs do console do navegador (F12)
