-- ============================================
-- ADICIONAR COLUNAS DE VARIAÇÕES À TABELA PRODUTOS
-- ============================================

-- Adicionar colunas que faltam para suportar variações
ALTER TABLE produtos 
    ADD COLUMN IF NOT EXISTS tipo_variacao TEXT DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS variacoes JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS estoque JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS imagens_variacoes JSONB DEFAULT '{}';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_tipo_variacao ON produtos(tipo_variacao);
CREATE INDEX IF NOT EXISTS idx_produtos_variacoes ON produtos USING GIN (variacoes);

-- Verificar colunas atualizadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'produtos'
ORDER BY ordinal_position;

-- DONE! Agora as variações vão sincronizar corretamente
