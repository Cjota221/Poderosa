-- ==================================================
-- PASSO 2: TESTAR A VIEW (EXECUTE DEPOIS)
-- ==================================================

-- ✅ Query 1: Ver todos os trials
SELECT * FROM v_usuarios_trial;

-- ✅ Query 2: Ver apenas ativos (não expirados)
SELECT 
    nome,
    email,
    TO_CHAR(data_cadastro, 'DD/MM/YYYY') as cadastro,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY HH24:MI') as expira_em,
    dias_restantes,
    status_visual,
    progresso_percent || '%' as progresso
FROM v_usuarios_trial
WHERE status_visual != 'EXPIRADO'
ORDER BY dias_restantes ASC;

-- ✅ Query 3: Ver trials URGENTES (expiram hoje ou amanhã)
SELECT 
    nome,
    email,
    telefone,
    dias_restantes,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY HH24:MI') as expira_em
FROM v_usuarios_trial
WHERE dias_restantes BETWEEN 0 AND 1
ORDER BY dias_restantes DESC;

-- ✅ Query 4: Estatísticas gerais
SELECT 
    status_visual,
    COUNT(*) as quantidade,
    ROUND(AVG(dias_restantes), 1) as media_dias_restantes,
    ROUND(AVG(progresso_percent)) as progresso_medio
FROM v_usuarios_trial
GROUP BY status_visual
ORDER BY 
    CASE status_visual
        WHEN 'EXPIRADO' THEN 1
        WHEN 'EXPIRANDO' THEN 2
        WHEN 'ATIVO' THEN 3
    END;

-- ✅ Query 5: Ver quem já expirou
SELECT 
    id,
    email,
    nome,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY') as expirou_em,
    DATE_PART('day', NOW() - trial_expiracao)::INTEGER as dias_expirado
FROM v_usuarios_trial
WHERE status_visual = 'EXPIRADO'
ORDER BY trial_expiracao DESC;
