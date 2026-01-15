-- =====================================================
-- VERIFICAR E CRIAR ESTRUTURA COMPLETA PARA VENDAS
-- =====================================================

-- 1. Verificar se tabela itens_venda existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'itens_venda'
) as tabela_itens_venda_existe;

-- 2. Ver estrutura da tabela itens_venda se existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'itens_venda' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Criar tabela itens_venda se não existir
CREATE TABLE IF NOT EXISTS itens_venda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL,
    produto_id UUID,
    produto_nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON itens_venda(produto_id);

-- 5. Adicionar constraint de foreign key se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_itens_venda_venda_id' 
        AND table_name = 'itens_venda'
    ) THEN
        ALTER TABLE itens_venda 
        ADD CONSTRAINT fk_itens_venda_venda_id 
        FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE;
    END IF;
END$$;

-- 6. Verificar estrutura final
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_name IN ('vendas', 'itens_venda')
ORDER BY t.table_name, c.ordinal_position;

-- 7. Desabilitar RLS para testes (ativar depois)
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda DISABLE ROW LEVEL SECURITY;