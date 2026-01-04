-- ==================================================
-- PASSO 1: CRIAR A VIEW (EXECUTE ISSO PRIMEIRO)
-- ==================================================

CREATE OR REPLACE VIEW v_usuarios_trial AS
SELECT 
    u.id,
    u.email,
    u.nome,
    u.telefone,
    u.plano,
    u.created_at as data_cadastro,
    
    -- Informações da assinatura trial
    a.id as assinatura_id,
    a.data_inicio as trial_inicio,
    a.data_expiracao as trial_expiracao,
    a.status as trial_status,
    
    -- Calcular dias restantes
    CASE 
        WHEN a.data_expiracao IS NULL THEN 7
        ELSE GREATEST(0, DATE_PART('day', a.data_expiracao - NOW())::INTEGER)
    END as dias_restantes,
    
    -- Status baseado nos dias
    CASE 
        WHEN a.data_expiracao IS NULL THEN 'ATIVO'
        WHEN DATE_PART('day', a.data_expiracao - NOW()) <= 0 THEN 'EXPIRADO'
        WHEN DATE_PART('day', a.data_expiracao - NOW()) <= 2 THEN 'EXPIRANDO'
        ELSE 'ATIVO'
    END as status_visual,
    
    -- Quantos dias já usou
    CASE 
        WHEN a.data_inicio IS NULL THEN 0
        ELSE DATE_PART('day', NOW() - a.data_inicio)::INTEGER
    END as dias_usados,
    
    -- Porcentagem do trial usado
    CASE 
        WHEN a.data_inicio IS NULL OR a.data_expiracao IS NULL THEN 0
        ELSE ROUND(
            (DATE_PART('day', NOW() - a.data_inicio) / 
             NULLIF(DATE_PART('day', a.data_expiracao - a.data_inicio), 0)) * 100
        )::INTEGER
    END as progresso_percent

FROM usuarios u
LEFT JOIN assinaturas a ON u.id = a.usuario_id AND a.plano = 'trial'
WHERE u.plano = 'trial'
ORDER BY 
    CASE 
        WHEN a.data_expiracao IS NULL THEN 0
        ELSE DATE_PART('day', a.data_expiracao - NOW())
    END ASC,
    u.created_at DESC;
