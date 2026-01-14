-- ============================================
-- LIMPAR DADOS CORROMPIDOS DO BYPASS
-- ============================================
-- Execute no Supabase SQL Editor
-- Data: 14/01/2026

-- 🎯 Objetivo: Remover dados criados com o ID falso do bypass

-- ============================================
-- OPÇÃO 1: Verificar se existem dados corrompidos
-- ============================================

-- Ver todos os usuários
SELECT id, email, nome, created_at 
FROM usuarios 
ORDER BY created_at DESC 
LIMIT 20;

-- ============================================
-- OPÇÃO 2: Limpar produtos sem usuario_id válido
-- ============================================

-- Ver produtos órfãos (sem usuário válido)
SELECT p.id, p.nome, p.usuario_id, p.criado_em
FROM produtos p
LEFT JOIN usuarios u ON p.usuario_id = u.id
WHERE u.id IS NULL;

-- Deletar produtos órfãos (CUIDADO!)
-- DELETE FROM produtos p
-- WHERE NOT EXISTS (
--     SELECT 1 FROM usuarios u WHERE u.id = p.usuario_id
-- );

-- ============================================
-- OPÇÃO 3: Limpar TUDO de um usuário específico
-- ============================================

-- Primeiro, encontre o ID correto do usuário:
SELECT id, email, nome FROM usuarios WHERE email = 'carolineazevedo075@gmail.com';

-- Depois, se quiser limpar TODOS os dados deste usuário:
-- (Substitua 'ID_AQUI' pelo ID real do SELECT acima)

-- DELETE FROM vendas WHERE usuario_id = 'ID_AQUI';
-- DELETE FROM clientes WHERE usuario_id = 'ID_AQUI';
-- DELETE FROM produtos WHERE usuario_id = 'ID_AQUI';
-- DELETE FROM despesas WHERE usuario_id = 'ID_AQUI';
-- DELETE FROM metas WHERE usuario_id = 'ID_AQUI';

-- ============================================
-- OPÇÃO 4: Verificar integridade geral
-- ============================================

-- Contar produtos por usuário
SELECT 
    u.email,
    u.nome,
    COUNT(p.id) as total_produtos
FROM usuarios u
LEFT JOIN produtos p ON p.usuario_id = u.id
GROUP BY u.id, u.email, u.nome
ORDER BY total_produtos DESC;

-- Contar clientes por usuário
SELECT 
    u.email,
    u.nome,
    COUNT(c.id) as total_clientes
FROM usuarios u
LEFT JOIN clientes c ON c.usuario_id = u.id
GROUP BY u.id, u.email, u.nome
ORDER BY total_clientes DESC;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================

/*
Após executar os SELECTs, você verá:

1. Lista de usuários reais (com UUID válidos)
2. Produtos órfãos (se houver)
3. Distribuição de dados por usuário

Se quiser começar limpo:
1. Copie o ID do seu usuário
2. Descomente os DELETEs da OPÇÃO 3
3. Substitua 'ID_AQUI' pelo seu ID real
4. Execute os DELETEs

✅ Recomendação: NÃO deletar nada ainda, apenas ver os dados
*/
