-- ============================================
-- CONFIGURAÇÃO DO CATÁLOGO
-- ============================================
-- Execute no Supabase SQL Editor

-- PASSO 1: Adicionar coluna cor_catalogo na tabela usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS cor_catalogo TEXT DEFAULT 'pink';

COMMENT ON COLUMN usuarios.cor_catalogo IS 'Cor do tema do catálogo público';

-- Atualizar usuários existentes para ter uma cor padrão
UPDATE usuarios 
SET cor_catalogo = 'pink' 
WHERE cor_catalogo IS NULL;

-- ============================================
-- PASSO 2: Ativar produtos no catálogo
-- ============================================

-- Ver seus usuários e IDs:
SELECT id, email, nome FROM usuarios ORDER BY created_at DESC LIMIT 10;

-- Depois de ver seu ID acima, SUBSTITUA o email abaixo:
-- ⚠️ TROQUE 'seu-email@exemplo.com' pelo SEU email real

UPDATE produtos 
SET visivel_catalogo = true, 
    ativo = true 
WHERE usuario_id = (
    SELECT id FROM usuarios 
    WHERE email = 'carolineazevedo075@gmail.com'  -- ← TROQUE SEU EMAIL AQUI
    LIMIT 1
);

-- Verificar quantos produtos foram atualizados:
SELECT COUNT(*) as produtos_visiveis 
FROM produtos 
WHERE visivel_catalogo = true 
AND usuario_id = (
    SELECT id FROM usuarios 
    WHERE email = 'carolineazevedo075@gmail.com'  -- ← TROQUE SEU EMAIL AQUI
    LIMIT 1
);
