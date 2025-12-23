-- Criar tabela de histórico de mudanças de plano
CREATE TABLE IF NOT EXISTS historico_planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    plano_anterior VARCHAR(50),
    plano_novo VARCHAR(50) NOT NULL,
    periodo VARCHAR(20) NOT NULL, -- 'monthly' ou 'annual'
    valor DECIMAL(10,2),
    payment_id VARCHAR(255),
    data_mudanca TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índice para buscar histórico por usuário
CREATE INDEX IF NOT EXISTS idx_historico_user ON historico_planos(user_id);

-- Criar índice para buscar por data
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_planos(data_mudanca);

-- Comentário na tabela
COMMENT ON TABLE historico_planos IS 'Histórico de mudanças de planos dos usuários';

-- RLS desabilitado (mesma configuração das outras tabelas)
ALTER TABLE historico_planos DISABLE ROW LEVEL SECURITY;
