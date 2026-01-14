-- ============================================
-- DIAGNÓSTICO COMPLETO DO CATÁLOGO
-- ============================================
-- Execute cada query separadamente e me envie os resultados

-- 1. VER DADOS DO USUÁRIO ATUAL
SELECT 
    id,
    email,
    nome,
    slug,
    telefone,
    logo_catalogo,
    cor_catalogo
FROM usuarios 
WHERE email = 'comercial@cjotarasteirinhas.com';


-- 2. VER PRODUTOS DO USUÁRIO
SELECT 
    id,
    nome,
    preco_venda,
    ativo,
    visivel_catalogo,
    imagem_url,
    tipo_variacao
FROM produtos 
WHERE usuario_id = (
    SELECT id FROM usuarios WHERE email = 'comercial@cjotarasteirinhas.com'
);


-- 3. SE NÃO TEM SLUG, CRIAR AGORA
UPDATE usuarios 
SET slug = 'cjota-rasteirinhas'
WHERE email = 'comercial@cjotarasteirinhas.com'
AND slug IS NULL;


-- 4. SE PRODUTOS NÃO ESTÃO VISÍVEIS, ATIVAR
UPDATE produtos 
SET 
    visivel_catalogo = true,
    ativo = true
WHERE usuario_id = (
    SELECT id FROM usuarios WHERE email = 'comercial@cjotarasteirinhas.com'
);


-- 5. VERIFICAR SE FUNCIONOU
SELECT 
    'URL do Catálogo:' as info,
    'https://sistemalucrocerto.com/catalogo/' || u.slug as url_catalogo,
    COUNT(p.id) as total_produtos_visiveis
FROM usuarios u
LEFT JOIN produtos p ON p.usuario_id = u.id AND p.visivel_catalogo = true AND p.ativo = true
WHERE u.email = 'comercial@cjotarasteirinhas.com'
GROUP BY u.slug;
