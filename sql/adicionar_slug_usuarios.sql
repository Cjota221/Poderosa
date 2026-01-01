-- ===========================================
-- ADICIONAR COLUNA SLUG NA TABELA USUARIOS
-- ===========================================
-- Execute este SQL no Supabase SQL Editor
-- Data: 29/12/2025
-- Objetivo: Permitir URLs amigáveis para catálogos
-- Ex: /catalogo/minha-loja ao invés de /catalogo?loja=BASE64...

-- 1. Adicionar coluna slug (única, pode ser nula inicialmente)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Criar índice para buscas rápidas por slug
CREATE INDEX IF NOT EXISTS idx_usuarios_slug ON usuarios(slug);

-- 3. Função para gerar slug a partir do nome (sem dependência de unaccent)
CREATE OR REPLACE FUNCTION gerar_slug(nome TEXT)
RETURNS TEXT AS $$
DECLARE
    slug_base TEXT;
    slug_final TEXT;
    contador INT := 0;
BEGIN
    -- Normalizar: lowercase e substituir caracteres especiais
    slug_base := lower(coalesce(nome, 'loja'));
    
    -- Remover acentos manualmente (substituições comuns em português)
    slug_base := replace(slug_base, 'á', 'a');
    slug_base := replace(slug_base, 'à', 'a');
    slug_base := replace(slug_base, 'ã', 'a');
    slug_base := replace(slug_base, 'â', 'a');
    slug_base := replace(slug_base, 'ä', 'a');
    slug_base := replace(slug_base, 'é', 'e');
    slug_base := replace(slug_base, 'è', 'e');
    slug_base := replace(slug_base, 'ê', 'e');
    slug_base := replace(slug_base, 'ë', 'e');
    slug_base := replace(slug_base, 'í', 'i');
    slug_base := replace(slug_base, 'ì', 'i');
    slug_base := replace(slug_base, 'î', 'i');
    slug_base := replace(slug_base, 'ï', 'i');
    slug_base := replace(slug_base, 'ó', 'o');
    slug_base := replace(slug_base, 'ò', 'o');
    slug_base := replace(slug_base, 'õ', 'o');
    slug_base := replace(slug_base, 'ô', 'o');
    slug_base := replace(slug_base, 'ö', 'o');
    slug_base := replace(slug_base, 'ú', 'u');
    slug_base := replace(slug_base, 'ù', 'u');
    slug_base := replace(slug_base, 'û', 'u');
    slug_base := replace(slug_base, 'ü', 'u');
    slug_base := replace(slug_base, 'ç', 'c');
    slug_base := replace(slug_base, 'ñ', 'n');
    
    -- Substituir caracteres não alfanuméricos por hífen
    slug_base := regexp_replace(slug_base, '[^a-z0-9]+', '-', 'g');
    -- Remover hífens do início e fim
    slug_base := regexp_replace(slug_base, '^-|-$', '', 'g');
    
    -- Se ficou vazio, usar 'loja'
    IF slug_base = '' OR slug_base IS NULL THEN
        slug_base := 'loja';
    END IF;
    
    slug_final := slug_base;
    
    -- Verificar unicidade e adicionar número se necessário
    WHILE EXISTS (SELECT 1 FROM usuarios WHERE slug = slug_final) LOOP
        contador := contador + 1;
        slug_final := slug_base || '-' || contador;
    END LOOP;
    
    RETURN slug_final;
END;
$$ LANGUAGE plpgsql;

-- 4. Popular slugs para usuários existentes que ainda não têm
UPDATE usuarios 
SET slug = gerar_slug(nome)
WHERE slug IS NULL OR slug = '';

-- 5. Tornar a coluna slug obrigatória (após popular os existentes)
ALTER TABLE usuarios 
ALTER COLUMN slug SET NOT NULL;

-- ===========================================
-- VERIFICAR SE FUNCIONOU
-- ===========================================
-- SELECT id, email, nome, slug FROM usuarios LIMIT 10;
