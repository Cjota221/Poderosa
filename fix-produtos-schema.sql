-- ============================================
-- VERIFICAR E CORRIGIR SCHEMA DA TABELA PRODUTOS
-- ============================================

-- 1. VER COLUNAS ATUAIS DA TABELA
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'produtos' 
ORDER BY ordinal_position;

-- ============================================
-- SE A TABELA ESTIVER INCORRETA, EXECUTE ABAIXO:
-- ============================================

-- OPÇÃO 1: ADICIONAR COLUNA FALTANDO (se a tabela já existe com dados)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo_base DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS margem_lucro DECIMAL(5,2);

-- OPÇÃO 2: RECRIAR TABELA DO ZERO (se não tem dados importantes)
DROP TABLE IF NOT EXISTS produtos CASCADE;

CREATE TABLE produtos (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    sku TEXT,
    custo_base DECIMAL(10,2) NOT NULL DEFAULT 0,
    preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0,
    margem_lucro DECIMAL(5,2),
    tipo_variacao TEXT DEFAULT 'none',
    estoque JSONB NOT NULL DEFAULT '{}',
    estoque_minimo INTEGER DEFAULT 5,
    variacoes JSONB DEFAULT '[]',
    imagem_url TEXT,
    imagens JSONB DEFAULT '[]',
    ativo BOOLEAN DEFAULT true,
    visivel_catalogo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_usuario ON produtos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);

-- ============================================
-- DESABILITAR RLS
-- ============================================
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
