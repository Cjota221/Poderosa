-- ============================================
-- CORREÇÃO URGENTE: Corrigir plano para PRO
-- ============================================
-- Este script corrige sua assinatura para plano PRO (R$34,90)
-- Execute no Supabase SQL Editor

-- 1. ATUALIZAR ASSINATURA PARA PLANO PRO
UPDATE assinaturas
SET 
    plano = 'pro',
    data_expiracao = COALESCE(data_expiracao, data_inicio + INTERVAL '30 days'),
    periodo = COALESCE(periodo, 'monthly')
WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'cjotarasteirinhas@hotmail.com')
AND status = 'active';

-- 2. ATUALIZAR TABELA USUARIOS PARA PRO
UPDATE usuarios
SET plano = 'pro'
WHERE email = 'cjotarasteirinhas@hotmail.com';

-- 3. VERIFICAR SE CORRIGIU
SELECT 
    a.id,
    a.plano as plano_assinatura,
    a.periodo,
    a.data_inicio,
    a.data_expiracao,
    a.status,
    a.valor,
    u.plano as plano_usuario,
    CASE 
        WHEN a.plano = 'pro' AND u.plano = 'pro' THEN '✅ CORRETO!'
        ELSE '❌ AINDA ERRADO'
    END as status_correcao
FROM assinaturas a
JOIN usuarios u ON u.id = a.usuario_id
WHERE u.email = 'cjotarasteirinhas@hotmail.com'
AND a.status = 'active'
ORDER BY a.data_inicio DESC
LIMIT 1;

