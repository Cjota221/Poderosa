-- ==================================================
-- CONVERTER USUÁRIO STARTER PARA TRIAL
-- ==================================================

-- PASSO 1: Ver o usuário atual
SELECT id, email, nome, plano, created_at 
FROM usuarios 
WHERE plano = 'starter';

-- PASSO 2: Atualizar para trial (apenas o plano)
UPDATE usuarios 
SET plano = 'trial'
WHERE plano = 'starter';

-- PASSO 3: Criar assinatura trial para ele
INSERT INTO assinaturas (usuario_id, plano, status, periodo, valor, data_inicio, data_expiracao)
SELECT 
    id,
    'trial' as plano,
    'active' as status,
    'trial' as periodo,
    0 as valor,
    NOW() as data_inicio,
    NOW() + INTERVAL '7 days' as data_expiracao
FROM usuarios 
WHERE plano = 'trial'
AND id NOT IN (SELECT usuario_id FROM assinaturas WHERE plano = 'trial');

-- PASSO 4: Verificar se funcionou
SELECT COUNT(*) as total_trials FROM v_usuarios_trial;

-- PASSO 5: Ver os dados
SELECT * FROM v_usuarios_trial;
