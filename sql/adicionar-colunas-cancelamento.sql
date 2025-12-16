-- ============================================
-- ADICIONAR COLUNAS DE CANCELAMENTO
-- ============================================
-- Execute este script no Supabase SQL Editor
-- Adiciona colunas necessárias para gerenciar cancelamentos

-- 1. ADICIONAR COLUNA data_cancelamento
ALTER TABLE assinaturas
ADD COLUMN IF NOT EXISTS data_cancelamento TIMESTAMP WITH TIME ZONE;

-- 2. ADICIONAR COLUNA motivo_cancelamento
ALTER TABLE assinaturas
ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- 3. VERIFICAR SE AS COLUNAS FORAM CRIADAS
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'assinaturas'
AND column_name IN ('data_cancelamento', 'motivo_cancelamento');

-- Resultado esperado:
/*
column_name              | data_type                    | is_nullable
data_cancelamento        | timestamp with time zone     | YES
motivo_cancelamento      | text                         | YES
*/

-- ============================================
-- TESTE: VERIFICAR ESTRUTURA COMPLETA DA TABELA
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'assinaturas'
ORDER BY ordinal_position;
