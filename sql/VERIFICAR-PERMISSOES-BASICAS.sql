-- =======================================
-- VERIFICAÇÃO BÁSICA DO SUPABASE
-- =======================================

-- 1. Verificar conexão e usuário atual
SELECT 
    current_user as usuario_conectado,
    current_database() as banco_atual,
    NOW() as timestamp_atual;

-- 2. Listar TODAS as tabelas no schema public
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. Verificar se consegue fazer INSERT básico em qualquer tabela
-- Teste com a tabela usuarios (que sabemos que existe)
SELECT 
    'USUARIOS EXISTEM' as status,
    COUNT(*) as total 
FROM usuarios;

-- 4. Verificar permissões do usuário atual
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND grantee = current_user
ORDER BY table_name;

-- 5. Tentar criação de tabela teste simples
CREATE TABLE IF NOT EXISTS teste_permissoes (
    id SERIAL PRIMARY KEY,
    texto TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 6. Tentar inserir na tabela teste
INSERT INTO teste_permissoes (texto) VALUES ('Teste de permissão ' || NOW());

-- 7. Verificar se inseriu
SELECT * FROM teste_permissoes;

-- 8. Limpar teste
DROP TABLE IF EXISTS teste_permissoes;