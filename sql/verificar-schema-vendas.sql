-- ============================================
-- VERIFICAR E CORRIGIR SCHEMA DA TABELA VENDAS
-- ============================================

-- 1. VERIFICAR COLUNAS ATUAIS DA TABELA VENDAS
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendas'
ORDER BY ordinal_position;

-- Se não existe, criar:
-- 2. CRIAR TABELA VENDAS (se necessário)
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    cliente_id UUID,
    produtos JSONB DEFAULT '[]',
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'concluida',
    metodo_pagamento TEXT DEFAULT 'dinheiro',
    data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_vendas_usuario ON vendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);

-- 4. DESABILITAR RLS
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;

-- DONE! Agora as vendas devem salvar corretamente