-- ==================================================
-- DIAGNÓSTICO: Encontrar TODOS os usuários trial
-- ==================================================

-- 1️⃣ Ver TODOS os usuários (não só trial)
SELECT 
    id,
    email,
    nome,
    plano,
    TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as cadastrado_em
FROM usuarios
ORDER BY created_at DESC;

-- 2️⃣ Contar usuários por plano
SELECT 
    COALESCE(plano, 'SEM PLANO') as plano,
    COUNT(*) as quantidade
FROM usuarios
GROUP BY plano
ORDER BY quantidade DESC;

-- 3️⃣ Ver usuários que TÊM assinatura trial (mas plano diferente)
SELECT 
    u.id,
    u.email,
    u.nome,
    u.plano as plano_usuario,
    a.plano as plano_assinatura,
    a.status,
    TO_CHAR(a.data_expiracao, 'DD/MM/YYYY HH24:MI') as expira_em,
    DATE_PART('day', a.data_expiracao - NOW())::INTEGER as dias_restantes
FROM usuarios u
INNER JOIN assinaturas a ON u.id = a.usuario_id
WHERE a.plano = 'trial'
ORDER BY a.created_at DESC;

-- 4️⃣ CONVERTER TODOS os usuários que têm assinatura trial para plano trial
UPDATE usuarios
SET plano = 'trial'
WHERE id IN (
    SELECT usuario_id 
    FROM assinaturas 
    WHERE plano = 'trial' 
    AND status = 'active'
)
AND plano != 'trial';

-- 5️⃣ Verificar quantos foram convertidos
SELECT COUNT(*) as total_trials FROM v_usuarios_trial;

-- 6️⃣ Ver todos os trials agora
SELECT 
    nome,
    email,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY HH24:MI') as expira_em,
    dias_restantes,
    status_visual
FROM v_usuarios_trial
ORDER BY dias_restantes ASC;
