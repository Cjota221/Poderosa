-- ================================================================
-- SCRIPT PARA CORRIGIR SCHEMA DO SUPABASE - LUCRO CERTO
-- Execute no SQL Editor: https://supabase.com/dashboard/project/ldfahdueqzgemplxrffm/sql
-- ================================================================

-- ================================================
-- 1. VERIFICAR ESTRUTURA ATUAL DAS TABELAS
-- ================================================
-- Descomente para ver as colunas atuais:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'produtos';
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'clientes';
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'vendas';

-- ================================================
-- 2. RECRIAR TABELA PRODUTOS (com schema correto)
-- ================================================
DROP TABLE IF EXISTS produtos CASCADE;

CREATE TABLE produtos (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    categoria TEXT DEFAULT 'Geral',
    custo_base NUMERIC DEFAULT 0,
    preco_venda NUMERIC DEFAULT 0,
    margem_lucro NUMERIC DEFAULT 0,
    tipo_variacao TEXT DEFAULT 'none',
    variacoes JSONB DEFAULT '[]'::jsonb,
    estoque JSONB DEFAULT '{}'::jsonb,
    imagens JSONB DEFAULT '[]'::jsonb,
    imagem_url TEXT DEFAULT '',
    imagens_variacoes JSONB DEFAULT '{}'::jsonb,
    ativo BOOLEAN DEFAULT true,
    visivel_catalogo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- 3. RECRIAR TABELA CLIENTES (com schema correto)
-- ================================================
DROP TABLE IF EXISTS clientes CASCADE;

CREATE TABLE clientes (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    endereco TEXT DEFAULT '',
    cidade TEXT DEFAULT '',
    estado TEXT DEFAULT '',
    notas TEXT DEFAULT '',
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- 4. RECRIAR TABELA VENDAS (com schema correto)
-- ================================================
DROP TABLE IF EXISTS vendas CASCADE;

CREATE TABLE vendas (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    cliente_id TEXT,
    produtos JSONB DEFAULT '[]'::jsonb,
    valor_total NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'concluida',
    metodo_pagamento TEXT DEFAULT 'dinheiro',
    data_venda TIMESTAMPTZ DEFAULT now(),
    notas TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- 5. RECRIAR TABELA USUARIOS (com schema correto)
-- ================================================
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT,
    nome TEXT DEFAULT '',
    telefone TEXT DEFAULT '',
    foto_perfil TEXT DEFAULT '',
    logo_catalogo TEXT DEFAULT '',
    plano TEXT DEFAULT 'starter',
    plano_atual TEXT DEFAULT 'starter',
    status TEXT DEFAULT 'active',
    cadastro_completo BOOLEAN DEFAULT false,
    tour_concluido BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- 6. RECRIAR TABELA ASSINATURAS (com schema correto)
-- ================================================
DROP TABLE IF EXISTS assinaturas CASCADE;

CREATE TABLE assinaturas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    usuario_id TEXT NOT NULL,
    plano TEXT DEFAULT 'starter',
    status TEXT DEFAULT 'active',
    periodo TEXT DEFAULT 'monthly',
    payment_id TEXT,
    subscription_id TEXT,
    payment_method TEXT,
    valor NUMERIC DEFAULT 0,
    data_inicio TIMESTAMPTZ DEFAULT now(),
    data_fim TIMESTAMPTZ DEFAULT now() + interval '1 month',
    data_expiracao TIMESTAMPTZ DEFAULT now() + interval '1 month',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- 7. DESABILITAR RLS EM TODAS AS TABELAS
-- ================================================
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas DISABLE ROW LEVEL SECURITY;

-- ================================================
-- 8. CRIAR USUÁRIO CAROL (após pagamento PIX)
-- ================================================
-- Senha: 123456 (hash bcrypt)
INSERT INTO usuarios (id, email, nome, plano, plano_atual, status, senha_hash, cadastro_completo)
VALUES (
    'user_carol_gmail', 
    'carolineazevedo075@gmail.com', 
    'Caroline Azevedo', 
    'starter', 
    'starter', 
    'active',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.TGvPLwZVqYJVG2',
    true
)
ON CONFLICT (email) DO UPDATE SET
    nome = EXCLUDED.nome,
    plano = EXCLUDED.plano,
    plano_atual = EXCLUDED.plano_atual,
    senha_hash = EXCLUDED.senha_hash,
    cadastro_completo = true;

-- ================================================
-- 9. CRIAR ASSINATURA PARA CAROL
-- ================================================
INSERT INTO assinaturas (id, usuario_id, plano, status, periodo, data_inicio, data_fim, data_expiracao)
VALUES (
    'sub_carol_' || to_char(now(), 'YYYYMMDDHH24MISS'),
    'user_carol_gmail',
    'starter',
    'active',
    'monthly',
    now(),
    now() + interval '1 month',
    now() + interval '1 month'
);

-- ================================================
-- 10. VERIFICAR SE TUDO FOI CRIADO CORRETAMENTE
-- ================================================
SELECT 'USUARIOS' as tabela, count(*) as registros FROM usuarios
UNION ALL
SELECT 'ASSINATURAS', count(*) FROM assinaturas
UNION ALL
SELECT 'PRODUTOS', count(*) FROM produtos
UNION ALL
SELECT 'CLIENTES', count(*) FROM clientes
UNION ALL
SELECT 'VENDAS', count(*) FROM vendas;

-- Verificar usuário Carol
SELECT u.id, u.email, u.nome, u.plano, a.status as assinatura_status, a.data_fim
FROM usuarios u
LEFT JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.email = 'carolineazevedo075@gmail.com';
