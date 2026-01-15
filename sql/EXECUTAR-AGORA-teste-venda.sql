-- ==================================================
-- EXECUTAR ESTE SCRIPT NO SUPABASE PARA TESTAR
-- ==================================================

-- 1. CRIAR VENDA DE TESTE
INSERT INTO vendas (
    id,
    usuario_id,
    numero_venda,
    data_venda,
    valor_total,
    valor_final,
    forma_pagamento,
    status_pagamento
) VALUES (
    gen_random_uuid(),
    '7fd505a4-7313-43c9-baef-3fc82117bf8d',
    'TESTE-' || extract(epoch from now())::text,
    now(),
    100.00,
    100.00,
    'dinheiro',
    'concluida'
);

-- 2. CRIAR ITENS DA VENDA
INSERT INTO itens_venda (
    id,
    venda_id,
    produto_nome,
    quantidade,
    preco_unitario,
    subtotal
)
SELECT 
    gen_random_uuid(),
    v.id,
    'Produto Teste',
    1,
    100.00,
    100.00
FROM vendas v 
ORDER BY v.created_at DESC 
LIMIT 1;

-- 3. VERIFICAR RESULTADO
SELECT 
    '🎯 VENDAS CRIADAS' as status,
    COUNT(*) as quantidade
FROM vendas;

SELECT 
    '🎯 ITENS CRIADOS' as status,
    COUNT(*) as quantidade
FROM itens_venda;