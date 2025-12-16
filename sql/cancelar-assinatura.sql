-- ============================================
-- CANCELAR ASSINATURA E BLOQUEAR ACESSO
-- ============================================
-- Use este script quando cliente pedir reembolso/cancelamento

-- ============================================
-- PASSO 1: ENCONTRAR A ASSINATURA DO CLIENTE
-- ============================================
-- Substitua 'email@cliente.com' pelo email real do cliente
SELECT 
    u.email,
    u.plano as plano_usuario,
    a.id as assinatura_id,
    a.plano as plano_assinatura,
    a.status,
    a.data_inicio,
    a.data_expiracao,
    a.payment_id,
    a.valor,
    -- Quantos dias já usou
    EXTRACT(DAY FROM (NOW() - a.data_inicio)) as dias_usados,
    -- Quantos dias restam
    EXTRACT(DAY FROM (a.data_expiracao - NOW())) as dias_restantes,
    -- Está dentro dos 7 dias de garantia?
    CASE 
        WHEN EXTRACT(DAY FROM (NOW() - a.data_inicio)) <= 7 THEN '✅ DENTRO DA GARANTIA (pode reembolsar)'
        ELSE '❌ FORA DA GARANTIA (mais de 7 dias)'
    END as status_garantia
FROM usuarios u
JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.email = 'email@cliente.com'  -- ⚠️ SUBSTITUA AQUI
AND a.status = 'active'
ORDER BY a.data_inicio DESC
LIMIT 1;


-- ============================================
-- PASSO 2: CANCELAR A ASSINATURA
-- ============================================
-- Depois de fazer o estorno no Mercado Pago, execute isso:

UPDATE assinaturas
SET 
    status = 'cancelled',
    data_cancelamento = NOW(),
    motivo_cancelamento = 'Reembolso solicitado pelo cliente dentro de 7 dias'
WHERE usuario_id = (
    SELECT id FROM usuarios WHERE email = 'email@cliente.com'  -- ⚠️ SUBSTITUA AQUI
)
AND status = 'active';


-- ============================================
-- PASSO 3: ATUALIZAR PLANO DO USUÁRIO
-- ============================================
-- Isso garante que o cliente não terá mais acesso

UPDATE usuarios
SET plano = 'cancelled'
WHERE email = 'email@cliente.com';  -- ⚠️ SUBSTITUA AQUI


-- ============================================
-- PASSO 4: VERIFICAR SE CANCELOU CORRETAMENTE
-- ============================================
SELECT 
    u.email,
    u.plano as plano_usuario,
    a.status as status_assinatura,
    a.data_cancelamento,
    a.motivo_cancelamento,
    CASE 
        WHEN a.status = 'cancelled' AND u.plano = 'cancelled' THEN '✅ CANCELADO COM SUCESSO!'
        ELSE '❌ ALGO DEU ERRADO'
    END as resultado
FROM usuarios u
JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.email = 'email@cliente.com'  -- ⚠️ SUBSTITUA AQUI
ORDER BY a.data_inicio DESC
LIMIT 1;


-- ============================================
-- PASSO 5 (OPCIONAL): VER HISTÓRICO COMPLETO
-- ============================================
-- Ver todas as assinaturas do cliente (incluindo canceladas)

SELECT 
    a.id,
    a.plano,
    a.status,
    a.valor,
    a.data_inicio,
    a.data_expiracao,
    a.data_cancelamento,
    a.motivo_cancelamento,
    a.payment_id
FROM assinaturas a
JOIN usuarios u ON u.id = a.usuario_id
WHERE u.email = 'email@cliente.com'  -- ⚠️ SUBSTITUA AQUI
ORDER BY a.data_inicio DESC;


-- ============================================
-- EXEMPLO PRÁTICO
-- ============================================
-- Cliente: maria@example.com pediu reembolso no dia 3

-- 1. Ver informações (exemplo de resultado):
/*
email: maria@example.com
plano_usuario: pro
status: active
data_inicio: 2025-12-10 14:30:00
data_expiracao: 2026-01-09 14:30:00
dias_usados: 3
dias_restantes: 27
status_garantia: ✅ DENTRO DA GARANTIA
*/

-- 2. Fazer estorno no Mercado Pago (R$ 34,90)

-- 3. Executar cancelamento:
UPDATE assinaturas
SET 
    status = 'cancelled',
    data_cancelamento = NOW(),
    motivo_cancelamento = 'Cliente não gostou - reembolso realizado'
WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'maria@example.com')
AND status = 'active';

UPDATE usuarios
SET plano = 'cancelled'
WHERE email = 'maria@example.com';

-- 4. Cliente NÃO consegue mais fazer login ✅


-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
📌 O QUE ACONTECE NO BANCO:

ANTES DO CANCELAMENTO:
usuarios.plano = 'pro'
assinaturas.status = 'active'
assinaturas.data_expiracao = '2026-01-09'
→ Cliente TEM ACESSO ✅

DEPOIS DO CANCELAMENTO:
usuarios.plano = 'cancelled'
assinaturas.status = 'cancelled'
assinaturas.data_cancelamento = '2025-12-13' (dia que cancelou)
→ Cliente NÃO TEM MAIS ACESSO ❌

📌 COMO O SISTEMA BLOQUEIA:
- Na função login.js, ela verifica se plano = 'cancelled'
- Se for, retorna erro: "Sua assinatura foi cancelada"
- Cliente não consegue entrar no /app

📌 GARANTIA DE 7 DIAS:
- Sistema guarda data_inicio (dia que pagou)
- Você calcula: dias_usados = hoje - data_inicio
- Se dias_usados <= 7: pode reembolsar
- Se dias_usados > 7: NÃO pode reembolsar (fora da garantia)

📌 HISTÓRICO:
- O registro NÃO é deletado, só marcado como 'cancelled'
- Você sempre pode ver quantas pessoas cancelaram
- Pode gerar relatório: "5 cancelamentos este mês"
*/
