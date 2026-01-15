-- ============================================ 
-- REMOVER TODAS AS RESTRIÇÕES PARA TESTE
-- ============================================

-- 1. DESABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE vendas DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;

-- 2. DROPAR TODAS AS POLÍTICAS RLS (se existirem)
-- Execute cada linha separadamente, ignore erros "policy does not exist"
DROP POLICY IF EXISTS "vendas_policy" ON vendas;
DROP POLICY IF EXISTS "itens_venda_policy" ON itens_venda;
DROP POLICY IF EXISTS "usuarios_policy" ON usuarios;
DROP POLICY IF EXISTS "produtos_policy" ON produtos;
DROP POLICY IF EXISTS "clientes_policy" ON clientes;

-- 3. TESTE DE INSERÇÃO APÓS REMOVER RESTRIÇÕES
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
    '11111111-2222-3333-4444-555555555555',
    '7fd505a4-7313-43c9-baef-3fc82117bf8d',
    'TESTE-SEM-RLS',
    NOW(),
    99.99,
    99.99,
    'teste',
    'teste'
);

-- 4. INSERIR ITEM CORRESPONDENTE
INSERT INTO itens_venda (
    id,
    venda_id,
    produto_nome,
    quantidade,
    preco_unitario,
    subtotal
) VALUES (
    '22222222-3333-4444-5555-666666666666',
    '11111111-2222-3333-4444-555555555555',
    'Produto Teste SEM RLS',
    1,
    99.99,
    99.99
);

-- 5. VERIFICAR RESULTADO
SELECT 'APÓS DESABILITAR RLS' as status;
SELECT 'VENDAS' as tipo, COUNT(*) as total FROM vendas;
SELECT 'ITENS' as tipo, COUNT(*) as total FROM itens_venda;

-- 6. VER DADOS INSERIDOS
SELECT 
    v.numero_venda,
    v.valor_final,
    iv.produto_nome,
    'SUCESSO!' as resultado
FROM vendas v 
JOIN itens_venda iv ON v.id = iv.venda_id 
WHERE v.numero_venda = 'TESTE-SEM-RLS';