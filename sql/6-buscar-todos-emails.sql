-- ==================================================
-- BUSCAR TODOS OS EMAILS - VERSÃO SIMPLES E DIRETA
-- ==================================================
-- Execute estas queries NO SUPABASE SQL EDITOR
-- Vai mostrar TODOS os emails que existem no banco

-- 🔍 QUERY 1: TODOS OS EMAILS (mais simples possível)
SELECT * FROM usuarios;

-- 🔍 QUERY 2: Só emails e nomes
SELECT 
    email,
    nome,
    telefone,
    plano,
    created_at as cadastro
FROM usuarios
ORDER BY created_at DESC;

-- 🔍 QUERY 3: Contar quantos usuários existem
SELECT COUNT(*) as total FROM usuarios;

-- 🔍 QUERY 4: Ver estrutura da tabela usuarios
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios';

-- 🔍 QUERY 5: TODOS os dados das assinaturas
SELECT * FROM assinaturas;

-- 🔍 QUERY 6: Ver quem tem assinatura mas não aparece
SELECT 
    a.usuario_id,
    a.plano as plano_assinatura,
    a.status,
    a.created_at,
    u.email,
    u.nome,
    u.plano as plano_usuario
FROM assinaturas a
LEFT JOIN usuarios u ON a.usuario_id = u.id
ORDER BY a.created_at DESC;

-- 🔍 QUERY 7: Buscar usuários que têm created_at recente
SELECT 
    id,
    email,
    nome,
    telefone,
    plano,
    created_at
FROM usuarios
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- 🔍 QUERY 8: Ver se tem usuarios com email NULL ou vazio
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN email IS NULL THEN 1 END) as sem_email,
    COUNT(CASE WHEN email = '' THEN 1 END) as email_vazio
FROM usuarios;
