-- Execute este SQL no Supabase SQL Editor
-- Painel: https://supabase.com/dashboard/project/ldfahdueqzgemplxrffm/sql

-- 1. Criar usuário
INSERT INTO usuarios (id, email, nome, plano)
VALUES ('user_carol_gmail', 'carolineazevedo075@gmail.com', 'Caroline Azevedo', 'starter')
ON CONFLICT (email) DO UPDATE SET
    nome = EXCLUDED.nome,
    plano = EXCLUDED.plano;

-- 2. Criar assinatura ativa
INSERT INTO assinaturas (id, usuario_id, plano, status, periodo, data_inicio, data_fim)
VALUES (
    'sub_carol_gmail_' || to_char(now(), 'YYYYMMDD'),
    'user_carol_gmail',
    'starter',
    'active',
    'monthly',
    now(),
    now() + interval '1 month'
)
ON CONFLICT DO NOTHING;

-- 3. Verificar se criou corretamente
SELECT u.id, u.email, u.nome, u.plano, a.status, a.data_fim
FROM usuarios u
LEFT JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.email = 'carolineazevedo075@gmail.com';
