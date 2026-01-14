-- Criar slug para VEX Relógios automaticamente
-- Execute no Supabase SQL Editor

-- Ver todos os usuários sem slug
SELECT id, nome, email, slug 
FROM usuarios 
WHERE slug IS NULL
ORDER BY created_at DESC;

-- Criar slug para usuário VEX (SUBSTITUA O EMAIL)
UPDATE usuarios 
SET slug = 'vex-relogios'
WHERE email = 'SEU_EMAIL_AQUI'  -- ← TROQUE PELO EMAIL DO CADASTRO VEX
AND slug IS NULL;

-- Verificar se foi criado
SELECT id, nome, email, slug, logo_catalogo IS NOT NULL as tem_logo, cor_catalogo
FROM usuarios 
WHERE slug = 'vex-relogios';

-- Ativar produtos para aparecer no catálogo
UPDATE produtos 
SET visivel_catalogo = true, ativo = true
WHERE usuario_id = (
    SELECT id FROM usuarios WHERE slug = 'vex-relogios' LIMIT 1
);

-- Ver quantos produtos foram ativados
SELECT COUNT(*) as produtos_ativados
FROM produtos 
WHERE usuario_id = (SELECT id FROM usuarios WHERE slug = 'vex-relogios' LIMIT 1)
AND visivel_catalogo = true;
