-- Limpar todos os usuários de teste
-- Execute este arquivo no Supabase SQL Editor

-- OPÇÃO 1: Deletar usuários específicos de teste
DELETE FROM usuarios 
WHERE email IN (
    'teste@gmail.com',
    'cjotarasteirinhas075@gmail.com',
    'joseciro@gmail.com',
    'josemartins@hotmail.com',
    'joseciromartins075@gmail.com',
    'carolinecarvalho075@gmail.com'
);

-- OPÇÃO 2: Deletar TODOS os usuários (usar com cuidado!)
-- DELETE FROM usuarios;

-- Verificar resultado
SELECT id, email, nome, created_at 
FROM usuarios 
ORDER BY created_at DESC;
