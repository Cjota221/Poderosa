-- ===========================================
-- TESTE DIRETO - INSERIR VENDA MANUAL 
-- ===========================================

-- EXECUTE LINHA POR LINHA NO SUPABASE:

-- 1. Inserir venda teste
INSERT INTO vendas (
    id, usuario_id, numero_venda, data_venda, 
    valor_total, valor_final, forma_pagamento, status_pagamento
) VALUES (
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    '7fd505a4-7313-43c9-baef-3fc82117bf8d',
    'MANUAL001', NOW(), 50.00, 50.00, 'dinheiro', 'concluida'
);

-- 2. Inserir item da venda
INSERT INTO itens_venda (
    id, venda_id, produto_nome, quantidade, preco_unitario, subtotal
) VALUES (
    'f1e2d3c4-b5a6-4987-8765-4321abcdef12',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Produto Manual', 1, 50.00, 50.00
);

-- 3. Verificar resultado
SELECT 'VENDAS' as tipo, COUNT(*) as total FROM vendas
UNION ALL
SELECT 'ITENS' as tipo, COUNT(*) as total FROM itens_venda;

-- 4. Ver dados criados
SELECT v.numero_venda, v.valor_final, iv.produto_nome, iv.quantidade
FROM vendas v 
JOIN itens_venda iv ON v.id = iv.venda_id 
WHERE v.numero_venda = 'MANUAL001';