-- Corrigir assinaturas existentes SEM data_expiracao
-- Execute este SQL no Supabase SQL Editor

-- 1. Atualizar assinaturas com periodo 'monthly' (30 dias)
UPDATE assinaturas
SET data_expiracao = (data_inicio + INTERVAL '30 days')::timestamptz
WHERE data_expiracao IS NULL
  AND periodo = 'monthly'
  AND status = 'active';

-- 2. Atualizar assinaturas com periodo 'annual' (365 dias)
UPDATE assinaturas
SET data_expiracao = (data_inicio + INTERVAL '365 days')::timestamptz
WHERE data_expiracao IS NULL
  AND periodo = 'annual'
  AND status = 'active';

-- 3. Se periodo for NULL, assumir monthly (30 dias)
UPDATE assinaturas
SET 
    periodo = 'monthly',
    data_expiracao = (data_inicio + INTERVAL '30 days')::timestamptz
WHERE data_expiracao IS NULL
  AND periodo IS NULL
  AND status = 'active';

-- 4. Verificar resultado - VER TODAS AS ASSINATURAS ATIVAS
SELECT 
    id,
    usuario_id,
    plano,
    status,
    periodo,
    valor,
    data_inicio::date as inicio,
    data_expiracao::date as expiracao,
    CASE 
        WHEN data_expiracao IS NULL THEN 'SEM EXPIRAÇÃO'
        WHEN data_expiracao > NOW() THEN CONCAT(CEIL(EXTRACT(EPOCH FROM (data_expiracao - NOW())) / 86400), ' dias restantes')
        ELSE 'EXPIRADA'
    END as status_validade,
    payment_id
FROM assinaturas
WHERE status = 'active'
ORDER BY data_inicio DESC;

-- 5. Verificar ESPECIFICAMENTE sua assinatura
SELECT 
    u.email,
    u.nome,
    u.plano as plano_usuario,
    a.plano as plano_assinatura,
    a.status,
    a.periodo,
    a.valor,
    a.data_inicio::date as inicio,
    a.data_expiracao::date as expiracao,
    CASE 
        WHEN a.data_expiracao IS NULL THEN 'SEM EXPIRAÇÃO - PRECISA CORRIGIR!'
        WHEN a.data_expiracao > NOW() THEN CONCAT('✅ ATIVA - ', CEIL(EXTRACT(EPOCH FROM (a.data_expiracao - NOW())) / 86400), ' dias restantes')
        ELSE '❌ EXPIRADA'
    END as status_detalhado
FROM usuarios u
LEFT JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.email = 'cjotarasteirinhas@hotmail.com'
ORDER BY a.data_inicio DESC;
