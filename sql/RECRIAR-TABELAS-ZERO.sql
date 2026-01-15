-- ==========================================
-- RECREAR TABELAS DO ZERO - SOLUÇÃO RADICAL
-- ==========================================

-- 1. DROPAR TABELAS EXISTENTES (pode dar erro se não existirem - ignore)
DROP TABLE IF EXISTS itens_venda CASCADE;
DROP TABLE IF EXISTS vendas CASCADE;

-- 2. CRIAR TABELA VENDAS LIMPA
CREATE TABLE vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    cliente_id UUID,
    numero_venda TEXT,
    data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_desconto NUMERIC(10,2) DEFAULT 0,
    valor_final NUMERIC(10,2) NOT NULL DEFAULT 0,
    custo_total NUMERIC(10,2) DEFAULT 0,
    lucro_total NUMERIC(10,2) DEFAULT 0,
    forma_pagamento TEXT,
    status_pagamento TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR TABELA ITENS_VENDA LIMPA
CREATE TABLE itens_venda (
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

-- 4. CRIAR FOREIGN KEY
ALTER TABLE itens_venda 
ADD CONSTRAINT fk_itens_venda_venda_id 
FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE;

-- 5. DESABILITAR RLS (para facilitar testes)
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda DISABLE ROW LEVEL SECURITY;

-- 6. VERIFICAR SE TABELAS FORAM CRIADAS
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name IN ('vendas', 'itens_venda') 
ORDER BY table_name;

-- 7. TESTE IMEDIATO DE INSERÇÃO
INSERT INTO vendas (
    id, usuario_id, numero_venda, valor_total, valor_final, forma_pagamento, status_pagamento
) VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    '7fd505a4-7313-43c9-baef-3fc82117bf8d',
    'CRIACAO-NOVA',
    100.00,
    100.00,
    'dinheiro',
    'concluida'
);

INSERT INTO itens_venda (
    id, venda_id, produto_nome, quantidade, preco_unitario, subtotal
) VALUES (
    'ffffffff-0000-1111-2222-333333333333',
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'Produto Nova Criacao',
    1,
    100.00,
    100.00
);

-- 8. VERIFICAR RESULTADO FINAL
SELECT 'APÓS RECRIAR' as status;
SELECT 'VENDAS' as tipo, COUNT(*) as total FROM vendas;
SELECT 'ITENS' as tipo, COUNT(*) as total FROM itens_venda;

-- 9. VER DADOS INSERIDOS
SELECT v.numero_venda, v.valor_final, iv.produto_nome, 'TABELAS RECRIADAS!' as status
FROM vendas v 
JOIN itens_venda iv ON v.id = iv.venda_id;