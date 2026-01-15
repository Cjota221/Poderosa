-- ============================================
-- VERIFICAR E ADICIONAR CAMPOS DO CATÁLOGO
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. VERIFICAR SE COLUNAS EXISTEM
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name IN ('logo_catalogo', 'cor_catalogo', 'slug');

-- 2. ADICIONAR COLUNA cor_catalogo SE NÃO EXISTIR
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS cor_catalogo TEXT DEFAULT 'pink';

-- 3. ADICIONAR COLUNA logo_catalogo SE NÃO EXISTIR
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS logo_catalogo TEXT;

-- 4. ADICIONAR COLUNA slug SE NÃO EXISTIR
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 5. VER DADOS ATUAIS DO SEU USUÁRIO
SELECT 
    id,
    email,
    nome,
    slug,
    CASE WHEN logo_catalogo IS NOT NULL AND logo_catalogo != '' 
         THEN '✅ TEM LOGO (' || LEFT(logo_catalogo, 30) || '...)' 
         ELSE '❌ SEM LOGO' END as logo_status,
    cor_catalogo,
    telefone
FROM usuarios 
ORDER BY created_at DESC
LIMIT 5;

-- 6. TESTAR ATUALIZAÇÃO MANUAL (substitua o ID pelo seu)
-- UPDATE usuarios 
-- SET cor_catalogo = 'purple', 
--     logo_catalogo = 'data:image/png;base64,TEST...'
-- WHERE id = '7fd505a4-7313-43c9-baef-3fc82117bf8d';

-- 7. VERIFICAR SE ATUALIZAÇÃO FUNCIONOU
-- SELECT id, email, cor_catalogo, 
--        CASE WHEN logo_catalogo IS NOT NULL THEN 'TEM LOGO' ELSE 'SEM LOGO' END
-- FROM usuarios 
-- WHERE id = '7fd505a4-7313-43c9-baef-3fc82117bf8d';
