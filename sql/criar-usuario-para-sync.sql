-- ============================================
-- CRIAR USUÁRIO PARA SINCRONIZAÇÃO DE PRODUTOS
-- ============================================

-- Inserir usuário com UUID correto
INSERT INTO usuarios (
    id,
    email,
    nome,
    telefone,
    plano_atual,
    slug,
    logo_catalogo,
    cor_catalogo,
    created_at
)
VALUES (
    '7fd505a4-7313-43c9-baef-3fc82117bf8d',  -- UUID do usuário atual
    'comercial@cjotarasteirinhas.com',
    'jose biju',
    '62981480687',
    'trial',
    'jose-biju',
    '',  -- logo em base64 (pode adicionar depois)
    'blue',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    slug = EXCLUDED.slug,
    cor_catalogo = EXCLUDED.cor_catalogo;

-- Verificar se foi criado
SELECT id, email, nome, slug, plano_atual 
FROM usuarios 
WHERE id = '7fd505a4-7313-43c9-baef-3fc82117bf8d';

-- AGORA tente cadastrar o produto novamente!
