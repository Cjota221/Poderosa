-- ============================================
-- ADICIONAR CAMPOS PARA VERIFICAÇÃO DE EMAIL
-- ============================================
-- Execute no Supabase SQL Editor
-- Data: 14/01/2026

-- Adicionar colunas de verificação de email
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS codigo_verificacao TEXT,
ADD COLUMN IF NOT EXISTS codigo_expira_em TIMESTAMP WITH TIME ZONE;

-- Criar índice para busca rápida por código
CREATE INDEX IF NOT EXISTS idx_usuarios_codigo_verificacao 
ON usuarios(codigo_verificacao) 
WHERE codigo_verificacao IS NOT NULL;

-- Comentários
COMMENT ON COLUMN usuarios.email_verificado IS 'Se o email foi verificado pelo usuário';
COMMENT ON COLUMN usuarios.codigo_verificacao IS 'Código de 6 dígitos enviado por email';
COMMENT ON COLUMN usuarios.codigo_expira_em IS 'Quando o código expira (15 minutos)';

-- Verificar colunas criadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
    AND column_name IN ('email_verificado', 'codigo_verificacao', 'codigo_expira_em')
ORDER BY column_name;
