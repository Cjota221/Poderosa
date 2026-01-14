-- Adicionar coluna cor_catalogo na tabela usuarios
-- Execute no Supabase SQL Editor

ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS cor_catalogo TEXT DEFAULT 'pink';

-- Comentário
COMMENT ON COLUMN usuarios.cor_catalogo IS 'Cor do tema do catálogo público';

-- Atualizar usuários existentes para ter uma cor padrão
UPDATE usuarios 
SET cor_catalogo = 'pink' 
WHERE cor_catalogo IS NULL;
