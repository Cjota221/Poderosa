-- ============================================
-- CANCELAR ASSINATURAS PENDENTES ANTIGAS
-- Data: 01/02/2026
-- ============================================

-- Assinaturas pendentes há mais de 3 dias são consideradas expiradas
-- (PIX e boleto expiram em 24-48h normalmente)

-- 1. Marcar como 'cancelled' as assinaturas pending antigas
UPDATE assinaturas 
SET 
    status = 'cancelled',
    updated_at = NOW()
WHERE status = 'pending' 
AND data_inicio < NOW() - INTERVAL '3 days';

-- 2. Verificar resultado
SELECT 
    u.email,
    u.nome,
    a.plano,
    a.status,
    a.valor,
    a.data_inicio,
    a.payment_id
FROM assinaturas a
JOIN usuarios u ON u.id = a.usuario_id
WHERE a.status IN ('pending', 'cancelled')
ORDER BY a.data_inicio DESC;
