-- ============================================
-- SCHEMA COMPLETO DO LUCRO CERTO - SUPABASE
-- ============================================
-- Data: 16/12/2025
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ============================================
-- LIMPEZA COMPLETA (SE NECESSÁRIO)
-- ============================================
-- ATENÇÃO: Isso vai DELETAR todas as tabelas e dados existentes!
-- Descomente as linhas abaixo apenas se quiser começar do zero

-- DROP POLICY IF EXISTS "Service role tem acesso total a app_state" ON app_state;
-- DROP POLICY IF EXISTS "Service role tem acesso total a conquistas" ON conquistas;
-- DROP POLICY IF EXISTS "Service role tem acesso total a metas" ON metas;
-- DROP POLICY IF EXISTS "Service role tem acesso total a transacoes" ON transacoes;
-- DROP POLICY IF EXISTS "Service role tem acesso total a despesas" ON despesas;
-- DROP POLICY IF EXISTS "Service role tem acesso total a vendas" ON vendas;
-- DROP POLICY IF EXISTS "Service role tem acesso total a clientes" ON clientes;
-- DROP POLICY IF EXISTS "Service role tem acesso total a produtos" ON produtos;
-- DROP POLICY IF EXISTS "Service role tem acesso total a usuarios" ON usuarios;

-- DROP VIEW IF EXISTS view_resumo_financeiro;
-- DROP TRIGGER IF EXISTS trigger_atualizar_stats_cliente ON vendas;
-- DROP TRIGGER IF EXISTS update_app_state_updated_at ON app_state;
-- DROP TRIGGER IF EXISTS update_metas_updated_at ON metas;
-- DROP TRIGGER IF EXISTS update_despesas_updated_at ON despesas;
-- DROP TRIGGER IF EXISTS update_vendas_updated_at ON vendas;
-- DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
-- DROP TRIGGER IF EXISTS update_produtos_updated_at ON produtos;
-- DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
-- DROP FUNCTION IF EXISTS atualizar_estatisticas_cliente();
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- DROP TABLE IF EXISTS app_state CASCADE;
-- DROP TABLE IF EXISTS conquistas CASCADE;
-- DROP TABLE IF EXISTS metas CASCADE;
-- DROP TABLE IF EXISTS transacoes CASCADE;
-- DROP TABLE IF EXISTS despesas CASCADE;
-- DROP TABLE IF EXISTS vendas CASCADE;
-- DROP TABLE IF EXISTS clientes CASCADE;
-- DROP TABLE IF EXISTS produtos CASCADE;
-- DROP TABLE IF EXISTS usuarios CASCADE;

-- ============================================

-- 1. TABELA DE USUÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    telefone TEXT,
    foto_perfil TEXT,
    logo_catalogo TEXT,
    
    -- Plano e Assinatura
    plano TEXT DEFAULT 'trial' CHECK (plano IN ('trial', 'starter', 'pro', 'premium')),
    status_assinatura TEXT DEFAULT 'trial' CHECK (status_assinatura IN ('trial', 'active', 'expired', 'cancelled')),
    data_assinatura TIMESTAMP WITH TIME ZONE,
    data_expiracao TIMESTAMP WITH TIME ZONE,
    periodo_cobranca TEXT DEFAULT 'monthly' CHECK (periodo_cobranca IN ('monthly', 'yearly')),
    
    -- Pagamento
    payment_id TEXT,
    subscription_id TEXT,
    payment_method TEXT,
    
    -- Controle
    primeiro_login BOOLEAN DEFAULT true,
    viu_boas_vindas BOOLEAN DEFAULT false,
    ultima_atividade TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_plano ON usuarios(plano);
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON usuarios(status_assinatura);


-- 2. TABELA DE PRODUTOS
-- ============================================
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados básicos
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    sku TEXT,
    
    -- Precificação
    custo_base DECIMAL(10,2) NOT NULL DEFAULT 0,
    preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0,
    margem_lucro DECIMAL(5,2), -- Calculado automaticamente
    
    -- Estoque
    tipo_variacao TEXT DEFAULT 'none' CHECK (tipo_variacao IN ('none', 'simple', 'matrix')),
    estoque JSONB NOT NULL DEFAULT '{}', -- { "total": 10 } ou { "P": 5, "M": 3 }
    estoque_minimo INTEGER DEFAULT 5,
    estoque_total INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN jsonb_typeof(estoque) = 'object' 
            THEN (SELECT SUM(value::int) FROM jsonb_each_text(estoque))
            ELSE 0
        END
    ) STORED,
    
    -- Variações
    variacoes JSONB DEFAULT '[]', -- [{ "nome": "Tamanho", "opcoes": ["P", "M", "G"] }]
    
    -- Imagens
    imagem_url TEXT,
    imagens JSONB DEFAULT '[]', -- Array de URLs
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    visivel_catalogo BOOLEAN DEFAULT true,
    
    -- Controle
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_produtos_usuario ON produtos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);


-- 3. TABELA DE CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados pessoais
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cpf TEXT,
    data_nascimento DATE,
    
    -- Endereço
    endereco JSONB, -- { "rua": "...", "numero": "...", "cidade": "...", "cep": "..." }
    
    -- Estatísticas
    total_compras INTEGER DEFAULT 0,
    valor_total_gasto DECIMAL(10,2) DEFAULT 0,
    ticket_medio DECIMAL(10,2) DEFAULT 0,
    ultima_compra TIMESTAMP WITH TIME ZONE,
    
    -- Segmentação
    tags JSONB DEFAULT '[]', -- ["VIP", "Atacado", "Fiel"]
    nivel TEXT DEFAULT 'bronze' CHECK (nivel IN ('bronze', 'prata', 'ouro', 'diamante')),
    
    -- Observações
    notas TEXT,
    
    -- Controle
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_usuario ON clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);


-- 4. TABELA DE VENDAS
-- ============================================
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    
    -- Dados da venda
    numero_venda TEXT, -- V-20251216-001
    itens JSONB NOT NULL, -- [{ "produto_id": "...", "nome": "...", "quantidade": 2, "preco": 50, "variacao": "P" }]
    
    -- Valores
    subtotal DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0,
    frete DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    
    -- Pagamento
    forma_pagamento TEXT NOT NULL, -- "pix", "credito", "debito", "dinheiro", "boleto"
    status_pagamento TEXT DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado', 'estornado')),
    parcelas INTEGER DEFAULT 1,
    
    -- Entrega
    tipo_entrega TEXT, -- "retirada", "entrega", "correios"
    status_entrega TEXT DEFAULT 'aguardando' CHECK (status_entrega IN ('aguardando', 'preparando', 'enviado', 'entregue', 'cancelado')),
    codigo_rastreio TEXT,
    data_entrega TIMESTAMP WITH TIME ZONE,
    
    -- Observações
    observacoes TEXT,
    observacoes_internas TEXT,
    
    -- Controle
    data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vendas_usuario ON vendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status_pagamento ON vendas(status_pagamento);


-- 5. TABELA DE DESPESAS
-- ============================================
CREATE TABLE IF NOT EXISTS despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados básicos
    descricao TEXT NOT NULL,
    categoria TEXT, -- "fixa", "variavel", "fornecedor", "marketing", etc
    valor DECIMAL(10,2) NOT NULL,
    
    -- Recorrência
    recorrente BOOLEAN DEFAULT false,
    frequencia TEXT, -- "mensal", "anual", "semanal"
    dia_vencimento INTEGER, -- 1-31
    
    -- Status
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'paga', 'atrasada', 'cancelada')),
    data_vencimento DATE,
    data_pagamento DATE,
    
    -- Controle
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_despesas_usuario ON despesas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_despesas_data_vencimento ON despesas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas(status);


-- 6. TABELA DE TRANSAÇÕES (FLUXO DE CAIXA)
-- ============================================
CREATE TABLE IF NOT EXISTS transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Tipo
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    categoria TEXT NOT NULL, -- "venda", "despesa", "devolucao", "reembolso", etc
    
    -- Dados
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_transacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Referências
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
    despesa_id UUID REFERENCES despesas(id) ON DELETE SET NULL,
    
    -- Controle
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario ON transacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data_transacao);


-- 7. TABELA DE METAS
-- ============================================
CREATE TABLE IF NOT EXISTS metas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados da meta
    tipo TEXT NOT NULL CHECK (tipo IN ('receita_mensal', 'vendas_quantidade', 'novos_clientes', 'ticket_medio', 'lucro', 'custom')),
    nome TEXT NOT NULL,
    descricao TEXT,
    
    -- Valores
    valor_objetivo DECIMAL(10,2) NOT NULL,
    valor_atual DECIMAL(10,2) DEFAULT 0,
    progresso DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN valor_objetivo > 0 THEN (valor_atual / valor_objetivo * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Período
    periodo TEXT NOT NULL CHECK (periodo IN ('diario', 'semanal', 'mensal', 'anual')),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada', 'expirada')),
    
    -- Controle
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_metas_usuario ON metas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_metas_status ON metas(status);


-- 8. TABELA DE CONQUISTAS
-- ============================================
CREATE TABLE IF NOT EXISTS conquistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados da conquista
    tipo TEXT NOT NULL, -- "primeira_venda", "100_vendas", "meta_atingida", etc
    titulo TEXT NOT NULL,
    descricao TEXT,
    icone TEXT, -- Nome do ícone Lucide
    
    -- Status
    desbloqueada BOOLEAN DEFAULT false,
    visualizada BOOLEAN DEFAULT false,
    data_desbloqueio TIMESTAMP WITH TIME ZONE,
    
    -- Controle
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conquistas_usuario ON conquistas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conquistas_desbloqueada ON conquistas(desbloqueada);


-- 9. TABELA DE APP STATE (BACKUP AUTOMÁTICO)
-- ============================================
CREATE TABLE IF NOT EXISTS app_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Estado completo do app (backup do localStorage)
    state JSONB NOT NULL,
    
    -- Controle
    versao TEXT DEFAULT '1.4',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir apenas 1 registro por usuário
    CONSTRAINT unique_usuario_state UNIQUE (usuario_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_app_state_usuario ON app_state(usuario_id);


-- ============================================
-- TRIGGERS PARA ATUALIZAR "atualizado_em"
-- ============================================

-- Função genérica de atualização
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas relevantes
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON despesas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON metas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_state_updated_at BEFORE UPDATE ON app_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conquistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Políticas: Permitir acesso total via Service Role Key (para Netlify Functions)
-- As functions usam SUPABASE_SERVICE_KEY que bypassa RLS
CREATE POLICY "Service role tem acesso total a usuarios" ON usuarios
    FOR ALL USING (true);

CREATE POLICY "Service role tem acesso total a produtos" ON produtos
    FOR ALL USING (true);

CREATE POLICY "Service role tem acesso total a clientes" ON clientes
    FOR ALL USING (true);

CREATE POLICY "Service role tem acesso total a vendas" ON vendas
    FOR ALL USING (true);

CREATE POLICY "Service role tem acesso total a despesas" ON despesas
    FOR ALL USING (true);

CREATE POLICY "Service role tem acesso total a transacoes" ON transacoes
    FOR ALL USING (true);

CREATE POLICY "Service role tem acesso total a metas" ON metas
    FOR ALL USING (true);

CREATE POLICY "Service role tem acesso total a conquistas" ON conquistas
    FOR ALL USING (true);

CREATE POLICY "Service role tem acesso total a app_state" ON app_state
    FOR ALL USING (true);


-- ============================================
-- VIEWS ÚTEIS PARA DASHBOARD
-- ============================================

-- View: Resumo financeiro por usuário
CREATE OR REPLACE VIEW view_resumo_financeiro AS
SELECT 
    u.id AS usuario_id,
    u.nome AS usuario_nome,
    
    -- Vendas
    COUNT(DISTINCT v.id) AS total_vendas,
    COALESCE(SUM(v.total), 0) AS receita_total,
    COALESCE(AVG(v.total), 0) AS ticket_medio,
    
    -- Despesas
    COALESCE(SUM(CASE WHEN d.status = 'paga' THEN d.valor ELSE 0 END), 0) AS despesas_pagas,
    COALESCE(SUM(CASE WHEN d.status = 'pendente' THEN d.valor ELSE 0 END), 0) AS despesas_pendentes,
    
    -- Lucro
    COALESCE(SUM(v.total), 0) - COALESCE(SUM(CASE WHEN d.status = 'paga' THEN d.valor ELSE 0 END), 0) AS lucro_liquido,
    
    -- Produtos
    COUNT(DISTINCT p.id) AS total_produtos,
    COALESCE(SUM(p.estoque_total), 0) AS estoque_total_itens,
    
    -- Clientes
    COUNT(DISTINCT c.id) AS total_clientes
    
FROM usuarios u
LEFT JOIN vendas v ON u.id = v.usuario_id AND v.status_pagamento = 'pago'
LEFT JOIN despesas d ON u.id = d.usuario_id
LEFT JOIN produtos p ON u.id = p.usuario_id AND p.ativo = true
LEFT JOIN clientes c ON u.id = c.usuario_id AND c.ativo = true
GROUP BY u.id, u.nome;


-- ============================================
-- FUNÇÕES ÚTEIS
-- ============================================

-- Função: Atualizar estatísticas do cliente após venda
CREATE OR REPLACE FUNCTION atualizar_estatisticas_cliente()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status_pagamento = 'pago' AND NEW.cliente_id IS NOT NULL THEN
        UPDATE clientes
        SET 
            total_compras = (
                SELECT COUNT(*) FROM vendas 
                WHERE cliente_id = NEW.cliente_id AND status_pagamento = 'pago'
            ),
            valor_total_gasto = (
                SELECT COALESCE(SUM(total), 0) FROM vendas 
                WHERE cliente_id = NEW.cliente_id AND status_pagamento = 'pago'
            ),
            ticket_medio = (
                SELECT COALESCE(AVG(total), 0) FROM vendas 
                WHERE cliente_id = NEW.cliente_id AND status_pagamento = 'pago'
            ),
            ultima_compra = NEW.data_venda
        WHERE id = NEW.cliente_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar stats do cliente
CREATE TRIGGER trigger_atualizar_stats_cliente
AFTER INSERT OR UPDATE ON vendas
FOR EACH ROW EXECUTE FUNCTION atualizar_estatisticas_cliente();


-- ============================================
-- DADOS INICIAIS (OPCIONAL)
-- ============================================

-- Inserir categorias padrão, tags, etc (se necessário)
-- Você pode adicionar aqui dados iniciais que todo usuário deve ter


-- ============================================
-- FIM DO SCHEMA
-- ============================================

-- INSTRUÇÕES DE USO:
-- 1. Vá em https://supabase.com/dashboard
-- 2. Clique no seu projeto
-- 3. Vá em "SQL Editor"
-- 4. Cole TODO este script
-- 5. Clique em "Run" (ou Ctrl+Enter)
-- 6. Verifique se todas as tabelas foram criadas em "Table Editor"
