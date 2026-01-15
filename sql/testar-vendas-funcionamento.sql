-- ===================================================
-- TESTE DE VENDAS - VERIFICAR SE ESTÁ SALVANDO
-- ===================================================

-- 1. Ver quantas vendas existem no total
SELECT 
    COUNT(*) as total_vendas,
    COUNT(DISTINCT usuario_id) as usuarios_com_vendas
FROM vendas;

-- 2. Ver última venda criada (se existir)
SELECT 
    v.*,
    'Venda ID: ' || v.id as info
FROM vendas v
ORDER BY v.created_at DESC
LIMIT 1;

-- 3. Ver itens da última venda (se existir)
SELECT 
    iv.*,
    'Item da venda: ' || iv.venda_id as info
FROM itens_venda iv
JOIN vendas v ON iv.venda_id = v.id
ORDER BY v.created_at DESC, iv.created_at DESC
LIMIT 5;

-- 4. Ver vendas do usuário específico (comercial@cjotarasteirinhas.com)
SELECT 
    v.id,
    v.numero_venda,
    v.data_venda,
    v.valor_total,
    v.valor_final,
    v.forma_pagamento,
    v.status_pagamento,
    COUNT(iv.id) as qtd_itens
FROM vendas v
LEFT JOIN itens_venda iv ON v.id = iv.venda_id
JOIN usuarios u ON v.usuario_id = u.id
WHERE u.email = 'comercial@cjotarasteirinhas.com'
GROUP BY v.id, v.numero_venda, v.data_venda, v.valor_total, v.valor_final, v.forma_pagamento, v.status_pagamento
ORDER BY v.created_at DESC;

-- 5. Verificar integridade dos dados
SELECT 
    'Vendas sem itens' as problema,
    COUNT(*) as quantidade
FROM vendas v
WHERE NOT EXISTS (
    SELECT 1 FROM itens_venda iv WHERE iv.venda_id = v.id
)

UNION ALL

SELECT 
    'Itens órfãos (sem venda)' as problema,
    COUNT(*) as quantidade
FROM itens_venda iv
WHERE NOT EXISTS (
    SELECT 1 FROM vendas v WHERE v.id = iv.venda_id
);

-- 6. Detalhes da última venda com itens (para debug)
WITH ultima_venda AS (
    SELECT id FROM vendas ORDER BY created_at DESC LIMIT 1
)
SELECT 
    'VENDA' as tipo,
    v.id::text as id,
    v.numero_venda as numero,
    v.valor_total::text as valor,
    v.forma_pagamento as info,
    v.created_at::text as data_criacao
FROM vendas v
JOIN ultima_venda uv ON v.id = uv.id

UNION ALL

SELECT 
    'ITEM' as tipo,
    iv.id::text as id,
    iv.produto_nome as numero,
    iv.preco_unitario::text as valor,
    (iv.quantidade::text || ' unidades') as info,
    iv.created_at::text as data_criacao
FROM itens_venda iv
JOIN ultima_venda uv ON iv.venda_id = uv.id
ORDER BY tipo, data_criacao;