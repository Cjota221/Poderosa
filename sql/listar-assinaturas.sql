-- ============================================
-- LISTAR TODAS AS ASSINATURAS COM DADOS DO USUÁRIO
-- ============================================

SELECT 
    u.email,
    u.nome,
    u.telefone,
    a.plano,
    a.periodo,
    a.status,
    a.valor,
    a.data_inicio,
    a.data_expiracao,
    a.payment_id
FROM assinaturas a
JOIN usuarios u ON u.id = a.usuario_id
ORDER BY a.status, a.plano;
