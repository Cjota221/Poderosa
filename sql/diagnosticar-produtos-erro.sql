-- ============================================
-- DIAGNÓSTICO: Por que produtos não salvam?
-- ============================================

-- 1️⃣ Verificar estrutura da tabela produtos
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'produtos'
ORDER BY ordinal_position;

-- 2️⃣ Verificar seu usuário e ID
SELECT id, email, nome, created_at
FROM usuarios
WHERE email = 'carolineazevedo075@gmail.com';

-- 3️⃣ Ver todos os produtos do seu usuário
SELECT 
    id,
    nome,
    preco_venda,
    ativo,
    visivel_catalogo,
    created_at
FROM produtos
WHERE usuario_id = (
    SELECT id FROM usuarios WHERE email = 'carolineazevedo075@gmail.com' LIMIT 1
)
ORDER BY created_at DESC
LIMIT 20;

-- 4️⃣ Verificar políticas RLS da tabela produtos
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'produtos';

-- 5️⃣ Tentar inserir um produto de teste (MANUAL)
-- ⚠️ SUBSTITUA o usuario_id pelo ID encontrado no passo 2
/*
INSERT INTO produtos (
    usuario_id,
    nome,
    preco_venda,
    custo_base,
    ativo,
    visivel_catalogo
) VALUES (
    'SEU_USER_ID_AQUI',  -- ← Coloque seu ID do passo 2
    'Produto Teste SQL',
    99.90,
    50.00,
    true,
    true
);
*/

-- 6️⃣ Ver se o produto foi criado
-- SELECT * FROM produtos WHERE nome = 'Produto Teste SQL';
