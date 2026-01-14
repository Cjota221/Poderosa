-- ============================================
-- INVESTIGAÇÃO PROFUNDA: TRIALS FANTASMAS
-- ============================================
-- Análise detalhada para encontrar a causa raiz
-- dos usuários trial corrompidos
-- ============================================

-- 🔍 ANÁLISE 1: PADRÕES DE CRIAÇÃO
-- ============================================
-- Ver quando e como os trials foram criados

SELECT 
    '📅 PADRÃO TEMPORAL DE CRIAÇÃO' AS analise;

SELECT 
    u.id,
    u.nome,
    u.email,
    u.created_at,
    u.updated_at,
    EXTRACT(EPOCH FROM (u.updated_at - u.created_at)) AS segundos_entre_created_updated,
    CASE 
        WHEN u.created_at = u.updated_at THEN '🟡 CRIADO E NUNCA MODIFICADO'
        WHEN EXTRACT(EPOCH FROM (u.updated_at - u.created_at)) < 1 THEN '🔴 MODIFICADO EM < 1 SEGUNDO (SUSPEITO)'
        ELSE '🟢 MODIFICADO NORMALMENTE'
    END AS padrao_temporal
FROM usuarios u
WHERE u.plano = 'trial'
ORDER BY u.created_at DESC;

-- ============================================
-- 🔍 ANÁLISE 2: PADRÃO DE IDs
-- ============================================
-- Investigar formato dos IDs (UUID vs timestamp)

SELECT 
    '🔑 ANÁLISE DE IDs' AS analise;

SELECT 
    u.id,
    u.email,
    CASE 
        WHEN u.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID VÁLIDO (gerado pelo banco)'
        WHEN u.id ~ '^trial_[0-9]+$' THEN '❌ ID TIMESTAMP (gerado manualmente/frontend)'
        WHEN u.id ~ '^user_' THEN '🟡 ID CUSTOMIZADO (pode ser legacy)'
        ELSE '⚠️ FORMATO DESCONHECIDO'
    END AS tipo_id,
    LENGTH(u.id) AS tamanho_id,
    u.id LIKE 'trial_%' AS eh_trial_timestamp,
    u.email LIKE '%@temporario.com' AS eh_email_fake
FROM usuarios u
WHERE u.plano = 'trial'
ORDER BY tipo_id;

-- ============================================
-- 🔍 ANÁLISE 3: COMPLETUDE DE DADOS
-- ============================================
-- Ver quais campos estão preenchidos

SELECT 
    '📊 COMPLETUDE DE CADASTRO' AS analise;

SELECT 
    u.id,
    u.email,
    CASE WHEN u.senha_hash IS NOT NULL THEN '✅' ELSE '❌' END AS tem_senha,
    CASE WHEN u.nome IS NOT NULL AND u.nome != '' THEN '✅' ELSE '❌' END AS tem_nome,
    CASE WHEN u.telefone IS NOT NULL AND u.telefone != '' THEN '✅' ELSE '❌' END AS tem_telefone,
    CASE WHEN u.slug IS NOT NULL THEN '✅' ELSE '❌' END AS tem_slug,
    u.cadastro_completo AS cadastro_completo_flag,
    u.tour_concluido,
    -- Score de completude
    (
        CASE WHEN u.senha_hash IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN u.nome IS NOT NULL AND u.nome != '' THEN 1 ELSE 0 END +
        CASE WHEN u.telefone IS NOT NULL AND u.telefone != '' THEN 1 ELSE 0 END +
        CASE WHEN u.slug IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN u.cadastro_completo THEN 1 ELSE 0 END
    ) AS score_completude
FROM usuarios u
WHERE u.plano = 'trial'
ORDER BY score_completude DESC;

-- ============================================
-- 🔍 ANÁLISE 4: RELAÇÃO NOME x PRODUTO
-- ============================================
-- Investigar se nome do usuário = nome do produto (BUG)

SELECT 
    '🐛 DETECÇÃO DO BUG: NOME DUPLICADO' AS analise;

SELECT 
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    u.email,
    p.id AS produto_id,
    p.nome AS produto_nome,
    CASE 
        WHEN u.nome = p.nome THEN '🔴 DUPLICADO! (usuário tem nome do produto)'
        ELSE '✅ OK'
    END AS status_bug,
    p.created_at AS produto_criado_em
FROM usuarios u
JOIN produtos p ON p.usuario_id = u.id
WHERE u.plano = 'trial'
ORDER BY status_bug DESC;

-- ============================================
-- 🔍 ANÁLISE 5: ORDEM DE CRIAÇÃO
-- ============================================
-- Ver se produto foi criado ANTES ou DEPOIS do usuário

SELECT 
    '⏰ ORDEM DE CRIAÇÃO: USUÁRIO vs PRODUTO' AS analise;

SELECT 
    u.id,
    u.nome AS usuario_nome,
    u.created_at AS usuario_criado,
    p.nome AS produto_nome,
    p.created_at AS produto_criado,
    EXTRACT(EPOCH FROM (p.created_at - u.created_at)) AS diferenca_segundos,
    CASE 
        WHEN p.created_at < u.created_at THEN '🔴 PRODUTO ANTES DO USUÁRIO (IMPOSSÍVEL!)'
        WHEN p.created_at = u.created_at THEN '🟡 MESMO SEGUNDO (SUSPEITO)'
        WHEN EXTRACT(EPOCH FROM (p.created_at - u.created_at)) < 5 THEN '🟠 < 5 SEGUNDOS (MUITO RÁPIDO)'
        ELSE '🟢 TEMPO NORMAL'
    END AS analise_temporal
FROM usuarios u
JOIN produtos p ON p.usuario_id = u.id
WHERE u.plano = 'trial'
ORDER BY diferenca_segundos ASC;

-- ============================================
-- 🔍 ANÁLISE 6: IP E ORIGEM (se houver tracking)
-- ============================================
-- Ver se existem campos de rastreamento

SELECT 
    '🌐 VERIFICAR CAMPOS DE TRACKING' AS analise;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
AND (
    column_name LIKE '%ip%' OR
    column_name LIKE '%user_agent%' OR
    column_name LIKE '%origem%' OR
    column_name LIKE '%source%' OR
    column_name LIKE '%referrer%'
)
ORDER BY column_name;

-- ============================================
-- 🔍 ANÁLISE 7: ASSINATURAS TRIAL
-- ============================================
-- Ver como as assinaturas foram configuradas

SELECT 
    '💳 ANÁLISE DE ASSINATURAS TRIAL' AS analise;

SELECT 
    u.id,
    u.email,
    a.id AS assinatura_id,
    a.plano,
    a.status,
    a.periodo,
    a.valor,
    a.data_inicio,
    a.data_expiracao,
    a.payment_id,
    CASE 
        WHEN a.payment_id IS NULL THEN '✅ OK (trial sem pagamento)'
        ELSE '⚠️ SUSPEITO (trial com payment_id)'
    END AS status_payment,
    EXTRACT(DAY FROM (a.data_expiracao - a.data_inicio)) AS dias_trial
FROM usuarios u
JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.plano = 'trial'
ORDER BY a.data_inicio DESC;

-- ============================================
-- 🔍 ANÁLISE 8: BUSCAR TRIGGERS/FUNCTIONS
-- ============================================
-- Ver se existe algum trigger automático criando dados

SELECT 
    '⚙️ TRIGGERS NA TABELA USUARIOS' AS analise;

SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'usuarios'
ORDER BY trigger_name;

-- Ver functions relacionadas
SELECT 
    '⚙️ FUNCTIONS RELACIONADAS A TRIAL' AS analise;

SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%trial%' OR
    routine_name LIKE '%usuario%' OR
    routine_definition LIKE '%trial%'
)
ORDER BY routine_name;

-- ============================================
-- 🔍 ANÁLISE 9: CAMPOS INESPERADOS
-- ============================================
-- Verificar se existem campos extras populados

SELECT 
    '🔎 CAMPOS COM VALORES INESPERADOS' AS analise;

SELECT 
    u.id,
    u.email,
    u.plano_atual,
    u.status,
    u.max_produtos,
    u.max_clientes,
    u.max_vendas_mes,
    u.max_usuarios,
    CASE 
        WHEN u.plano = 'trial' AND u.plano_atual != 'starter' THEN '⚠️ plano_atual diferente do esperado'
        WHEN u.plano = 'trial' AND u.status != 'active' THEN '⚠️ status não é active'
        ELSE '✅ OK'
    END AS analise
FROM usuarios u
WHERE u.plano = 'trial';

-- ============================================
-- 📋 RESUMO DA INVESTIGAÇÃO
-- ============================================

SELECT 
    '📊 RESUMO FINAL' AS analise;

SELECT 
    COUNT(*) AS total_trials,
    COUNT(CASE WHEN u.id LIKE 'trial_%' THEN 1 END) AS trials_com_id_timestamp,
    COUNT(CASE WHEN u.email LIKE '%@temporario.com' THEN 1 END) AS trials_email_fake,
    COUNT(CASE WHEN u.senha_hash IS NULL THEN 1 END) AS trials_sem_senha,
    COUNT(CASE WHEN u.nome = (SELECT p.nome FROM produtos p WHERE p.usuario_id = u.id LIMIT 1) THEN 1 END) AS trials_nome_duplicado,
    COUNT(CASE WHEN u.cadastro_completo = false THEN 1 END) AS trials_cadastro_incompleto
FROM usuarios u
WHERE u.plano = 'trial';

-- ============================================
-- 🎯 HIPÓTESES BASEADAS NOS DADOS
-- ============================================
-- 1. IDs timestamp (trial_xxx) = criados no frontend
-- 2. Emails @temporario.com = gerados automaticamente
-- 3. Nome duplicado = algum código pegou produto.nome em vez de usuario.nome
-- 4. Sem senha = nunca completaram cadastro
-- 5. Criados no mesmo segundo = processo automatizado/script
-- ============================================
