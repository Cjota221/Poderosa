-- ===============================================
-- INSERIR VENDA DE TESTE DIRETO NO BANCO
-- ===============================================

-- 1. Buscar o ID do usuário
SELECT id, email FROM usuarios WHERE email = 'comercial@cjotarasteirinhas.com';

-- 2. Inserir venda de teste (substitua USER_ID_AQUI pelo ID real do usuário)
INSERT INTO vendas (
    id,
    usuario_id,
    cliente_id,
    numero_venda,
    data_venda,
    valor_total,
    valor_desconto,
    valor_final,
    custo_total,
    lucro_total,
    forma_pagamento,
    status_pagamento,
    observacoes
) VALUES (
    gen_random_uuid(),
    '7fd505a4-7313-43c9-baef-3fc82117bf8d', -- ID do usuário carol
    NULL, -- Sem cliente específico
    'TESTE001',
    NOW(),
    150.00,
    10.00,
    140.00,
    0.00,
    140.00,
    'dinheiro',
    'concluida',
    'Venda de teste para validar sistema'
);

-- 3. Pegar o ID da venda que acabou de ser criada
SELECT id, numero_venda, valor_final FROM vendas ORDER BY created_at DESC LIMIT 1;

-- 4. Inserir itens da venda (substitua VENDA_ID_AQUI pelo ID da venda criada)
-- Primeiro, vamos guardar o ID da venda em uma variável
WITH ultima_venda AS (
    SELECT id FROM vendas ORDER BY created_at DESC LIMIT 1
)
INSERT INTO itens_venda (
    id,
    venda_id,
    produto_id,
    produto_nome,
    quantidade,
    preco_unitario,
    subtotal
)
SELECT 
    gen_random_uuid(),
    uv.id,
    NULL,
    'Produto Teste 1',
    2,
    50.00,
    100.00
FROM ultima_venda uv

UNION ALL

SELECT 
    gen_random_uuid(),
    uv.id,
    NULL,
    'Produto Teste 2',
    1,
    50.00,
    50.00
FROM ultima_venda uv;

-- 5. Verificar se foi criado corretamente
SELECT 
    'RESULTADO' as status,
    COUNT(*) as vendas_criadas
FROM vendas 
WHERE numero_venda = 'TESTE001';

SELECT 
    'RESULTADO' as status,
    COUNT(*) as itens_criados
FROM itens_venda iv
JOIN vendas v ON iv.venda_id = v.id
WHERE v.numero_venda = 'TESTE001';

-- 6. Ver a venda completa criada
SELECT 
    v.numero_venda,
    v.valor_final,
    v.forma_pagamento,
    v.status_pagamento,
    COUNT(iv.id) as total_itens,
    SUM(iv.subtotal) as soma_itens
FROM vendas v
LEFT JOIN itens_venda iv ON v.id = iv.venda_id
WHERE v.numero_venda = 'TESTE001'
GROUP BY v.id, v.numero_venda, v.valor_final, v.forma_pagamento, v.status_pagamento;