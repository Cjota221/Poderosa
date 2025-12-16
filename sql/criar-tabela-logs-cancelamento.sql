-- ============================================
-- CRIAR TABELA DE LOGS DE CANCELAMENTO
-- ============================================
-- Esta tabela guarda histórico de todos os cancelamentos
-- para você analisar motivos e melhorar o produto

CREATE TABLE IF NOT EXISTS logs_cancelamento (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuarios(id),
    email VARCHAR(255) NOT NULL,
    motivo TEXT,
    dias_usados INTEGER,
    dentro_garantia BOOLEAN DEFAULT false,
    valor_pago DECIMAL(10, 2),
    payment_id VARCHAR(255),
    data_cancelamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX idx_logs_cancelamento_email ON logs_cancelamento(email);
CREATE INDEX idx_logs_cancelamento_data ON logs_cancelamento(data_cancelamento);
CREATE INDEX idx_logs_cancelamento_garantia ON logs_cancelamento(dentro_garantia);

-- Comentários explicativos
COMMENT ON TABLE logs_cancelamento IS 'Histórico de cancelamentos para análise e melhoria do produto';
COMMENT ON COLUMN logs_cancelamento.motivo IS 'Motivo do cancelamento informado pelo cliente';
COMMENT ON COLUMN logs_cancelamento.dias_usados IS 'Quantos dias o cliente usou antes de cancelar';
COMMENT ON COLUMN logs_cancelamento.dentro_garantia IS 'Se está dentro dos 7 dias de garantia (direito a reembolso)';

-- ============================================
-- CONSULTAS ÚTEIS
-- ============================================

-- Ver todos os cancelamentos recentes
SELECT 
    email,
    motivo,
    dias_usados,
    dentro_garantia,
    valor_pago,
    data_cancelamento
FROM logs_cancelamento
ORDER BY data_cancelamento DESC
LIMIT 20;

-- Cancelamentos que precisam de reembolso
SELECT 
    email,
    motivo,
    dias_usados,
    valor_pago,
    payment_id,
    data_cancelamento
FROM logs_cancelamento
WHERE dentro_garantia = true
ORDER BY data_cancelamento DESC;

-- Análise de motivos de cancelamento
SELECT 
    motivo,
    COUNT(*) as quantidade,
    AVG(dias_usados) as media_dias_uso,
    SUM(CASE WHEN dentro_garantia THEN 1 ELSE 0 END) as com_reembolso
FROM logs_cancelamento
GROUP BY motivo
ORDER BY quantidade DESC;

-- Taxa de cancelamento por mês
SELECT 
    TO_CHAR(data_cancelamento, 'YYYY-MM') as mes,
    COUNT(*) as total_cancelamentos,
    SUM(CASE WHEN dentro_garantia THEN valor_pago ELSE 0 END) as valor_reembolsado
FROM logs_cancelamento
GROUP BY TO_CHAR(data_cancelamento, 'YYYY-MM')
ORDER BY mes DESC;
