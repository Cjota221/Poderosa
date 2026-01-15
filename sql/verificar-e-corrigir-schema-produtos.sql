-- ============================================
-- VERIFICAR E CORRIGIR SCHEMA DA TABELA PRODUTOS
-- ============================================

-- 1. VERIFICAR COLUNAS ATUAIS
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'produtos'
ORDER BY ordinal_position;

-- Se a coluna 'custo_base' NÃO aparecer, execute:

-- 2. ADICIONAR COLUNAS FALTANTES (se necessário)
ALTER TABLE produtos 
    ADD COLUMN IF NOT EXISTS custo_base DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margem_lucro DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS tipo_variacao TEXT DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS variacoes JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS imagens JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS imagem_url TEXT,
    ADD COLUMN IF NOT EXISTS imagens_variacoes JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS visivel_catalogo BOOLEAN DEFAULT true;

-- 3. VERIFICAR NOVAMENTE
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'produtos'
ORDER BY ordinal_position;

-- 4. DESABILITAR RLS (se necessário)
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;

-- DONE! Agora tente cadastrar produto novamente
