-- Verificar dados do catálogo da VEX Relógios
-- Execute no Supabase SQL Editor

-- 1. Ver dados do usuário (slug, logo, cor)
SELECT 
    id,
    nome,
    email,
    slug,
    logo_catalogo IS NOT NULL as tem_logo,
    cor_catalogo,
    created_at
FROM usuarios 
WHERE slug = 'vex-relogios' 
   OR nome ILIKE '%vex%'
   OR email ILIKE '%vex%'
ORDER BY created_at DESC;

-- 2. Ver produtos do usuário
SELECT 
    p.id,
    p.nome,
    p.preco_venda,
    p.ativo,
    p.visivel_catalogo,
    p.imagem_url IS NOT NULL as tem_imagem,
    u.nome as usuario_nome,
    u.slug as usuario_slug
FROM produtos p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.slug = 'vex-relogios'
   OR u.nome ILIKE '%vex%'
ORDER BY p.created_at DESC;

-- 3. Se não encontrou por slug, buscar todos slugs disponíveis
SELECT slug, nome, email 
FROM usuarios 
WHERE slug IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 20;
