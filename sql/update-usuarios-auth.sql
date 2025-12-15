-- Atualizar tabela usuarios para sistema de cadastro/login
-- Execute este SQL no Supabase SQL Editor

-- Adicionar colunas necessárias para autenticação
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS senha_hash TEXT,
ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
ADD COLUMN IF NOT EXISTS cadastro_completo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;

-- Adicionar coluna data_pagamento na tabela assinaturas se não existir
ALTER TABLE assinaturas
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE;

-- Criar índice para busca por email (performance)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Criar índice para busca de assinaturas ativas
CREATE INDEX IF NOT EXISTS idx_assinaturas_usuario_status ON assinaturas(usuario_id, status);

-- Confirmar estrutura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios';
