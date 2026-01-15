-- ============================================
-- VERIFICAR E CORRIGIR CAMPOS DO CATÁLOGO
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. VERIFICAR ESTRUTURA DA TABELA USUARIOS
SELECT 
    column_name as campo,
    data_type as tipo,
    column_default as padrao
FROM information_schema.columns 
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- 2. ADICIONAR COLUNA cor_catalogo SE NÃO EXISTIR
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS cor_catalogo TEXT DEFAULT 'pink';

-- 3. VERIFICAR DADOS ATUAIS DO SEU USUÁRIO
-- Substitua pelo seu email:
SELECT 
    id,
    email,
    nome,
    slug,
    logo_catalogo,
    cor_catalogo,
    telefone
FROM usuarios 
WHERE email = 'seu-email@exemplo.com';

-- 4. LISTAR TODOS OS USUÁRIOS
SELECT 
    id,
    email,
    nome,
    slug,
    CASE WHEN logo_catalogo IS NOT NULL THEN '✅ Tem logo' ELSE '❌ Sem logo' END as logo,
    cor_catalogo,
    created_at
FROM usuarios 
ORDER BY created_at DESC;

-- 5. VERIFICAR PRODUTOS VISÍVEIS NO CATÁLOGO
SELECT 
    p.id,
    p.nome,
    p.preco_venda,
    p.visivel_catalogo,
    p.ativo,
    u.email as usuario
FROM produtos p
JOIN usuarios u ON p.usuario_id = u.id
WHERE p.visivel_catalogo = true AND p.ativo = true
ORDER BY p.created_at DESC;

-- 6. ATIVAR TODOS OS PRODUTOS NO CATÁLOGO (opcional)
-- ⚠️ CUIDADO: Isso ativa TODOS os produtos de TODOS os usuários
-- UPDATE produtos SET visivel_catalogo = true, ativo = true;

-- 7. ATIVAR PRODUTOS DE UM USUÁRIO ESPECÍFICO
-- Substitua pelo ID do seu usuário:
-- UPDATE produtos 
-- SET visivel_catalogo = true, ativo = true 
-- WHERE usuario_id = 'SEU-UUID-AQUI';
