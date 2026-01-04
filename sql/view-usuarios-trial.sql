-- ==================================================
-- VIEW: Usuários em Trial com Informações Completas
-- ==================================================
-- Esta view facilita visualizar todos os usuários em trial
-- com dias restantes, status e informações importantes

CREATE OR REPLACE VIEW v_usuarios_trial AS
SELECT 
    u.id,
    u.email,
    u.nome,
    u.telefone,
    u.plano,
    u.created_at as data_cadastro,
    u.ultimo_login,
    
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

-- ==================================================
-- QUERIES ÚTEIS PARA ANÁLISE
-- ==================================================

-- ✅ Query 1: Ver todos os trials ativos
-- Mostra usuários trial com dias restantes
/*
SELECT 
    nome,
    email,
    TO_CHAR(data_cadastro, 'DD/MM/YYYY') as cadastro,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY') as expira_em,
    dias_restantes,
    status_visual,
    progresso_percent || '%' as progresso
FROM v_usuarios_trial
WHERE status_visual != 'EXPIRADO'
ORDER BY dias_restantes ASC;
*/

-- ✅ Query 2: Ver trials que expiram hoje ou amanhã (URGENTE)
/*
SELECT 
    nome,
    email,
    telefone,
    dias_restantes,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY HH24:MI') as expira_em
FROM v_usuarios_trial
WHERE dias_restantes BETWEEN 0 AND 1
ORDER BY dias_restantes DESC;
*/

-- ✅ Query 3: Estatísticas gerais dos trials
/*
SELECT 
    status_visual,
    COUNT(*) as quantidade,
    ROUND(AVG(dias_restantes)) as media_dias_restantes,
    ROUND(AVG(progresso_percent)) as progresso_medio
FROM v_usuarios_trial
GROUP BY status_visual
ORDER BY 
    CASE status_visual
        WHEN 'EXPIRADO' THEN 1
        WHEN 'EXPIRANDO' THEN 2
        WHEN 'ATIVO' THEN 3
    END;
*/

-- ✅ Query 4: Trials que já expiraram (para limpar ou converter)
/*
SELECT 
    id,
    email,
    nome,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY') as expirou_em,
    DATE_PART('day', NOW() - trial_expiracao)::INTEGER as dias_expirado
FROM v_usuarios_trial
WHERE status_visual = 'EXPIRADO'
ORDER BY trial_expiracao DESC;
*/

-- ✅ Query 5: Trials mais engajados (fizeram login recente)
/*
SELECT 
    nome,
    email,
    dias_restantes,
    TO_CHAR(ultimo_login, 'DD/MM/YYYY HH24:MI') as ultimo_acesso,
    CASE 
        WHEN ultimo_login > NOW() - INTERVAL '24 hours' THEN '🟢 Hoje'
        WHEN ultimo_login > NOW() - INTERVAL '3 days' THEN '🟡 Esta semana'
        ELSE '🔴 Inativo'
    END as engajamento
FROM v_usuarios_trial
WHERE status_visual != 'EXPIRADO'
ORDER BY ultimo_login DESC NULLS LAST;
*/

-- ==================================================
-- FUNCTION: Limpar trials expirados automaticamente
-- ==================================================

CREATE OR REPLACE FUNCTION limpar_trials_expirados()
RETURNS TABLE(
    emails_afetados TEXT[],
    quantidade INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    emails_array TEXT[];
    total INTEGER;
BEGIN
    -- Buscar emails dos trials expirados
    SELECT ARRAY_AGG(email) INTO emails_array
    FROM v_usuarios_trial
    WHERE status_visual = 'EXPIRADO'
    AND DATE_PART('day', NOW() - trial_expiracao) > 7; -- Expirou há mais de 7 dias
    
    -- Contar quantos serão afetados
    GET DIAGNOSTICS total = ROW_COUNT;
    
    -- Atualizar plano para 'expired'
    UPDATE usuarios
    SET 
        plano = 'expired',
        updated_at = NOW()
    WHERE email = ANY(emails_array);
    
    -- Atualizar status da assinatura
    UPDATE assinaturas
    SET status = 'expired'
    WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email = ANY(emails_array)
    );
    
    RETURN QUERY SELECT emails_array, total;
END;
$$;

-- Para executar a limpeza:
-- SELECT * FROM limpar_trials_expirados();

-- ==================================================
-- TRIGGER: Notificar quando trial está expirando
-- ==================================================

CREATE OR REPLACE FUNCTION notificar_trial_expirando()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    dias_restantes INTEGER;
BEGIN
    -- Calcular dias restantes
    dias_restantes := DATE_PART('day', NEW.data_expiracao - NOW())::INTEGER;
    
    -- Se faltam 2 dias ou menos, registrar para notificação
    IF dias_restantes <= 2 AND dias_restantes >= 0 THEN
        -- Aqui você pode adicionar lógica para enviar email/notificação
        RAISE NOTICE 'Trial expirando em % dias para usuário: %', dias_restantes, NEW.usuario_id;
        
        -- Exemplo: Inserir em uma tabela de notificações
        -- INSERT INTO notificacoes (usuario_id, tipo, mensagem)
        -- VALUES (NEW.usuario_id, 'trial_expirando', 'Seu trial expira em ' || dias_restantes || ' dias');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Criar trigger (descomente para ativar)
/*
DROP TRIGGER IF EXISTS trigger_notificar_trial ON assinaturas;
CREATE TRIGGER trigger_notificar_trial
    AFTER UPDATE ON assinaturas
    FOR EACH ROW
    WHEN (OLD.plano = 'trial' AND NEW.plano = 'trial')
    EXECUTE FUNCTION notificar_trial_expirando();
*/

-- ==================================================
-- PERMISSÕES (ajuste conforme necessário)
-- ==================================================

-- Permitir que o painel admin acesse a view
GRANT SELECT ON v_usuarios_trial TO authenticated;
GRANT SELECT ON v_usuarios_trial TO anon;
