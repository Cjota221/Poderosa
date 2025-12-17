-- ============================================
-- SCHEMA MÍNIMO - SEM TRIGGERS/VIEWS/RLS
-- ============================================
-- Execute este PRIMEIRO para testar
-- ============================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    telefone TEXT,
    foto_perfil TEXT,
    logo_catalogo TEXT,
    plano TEXT DEFAULT 'trial',
    status_assinatura TEXT DEFAULT 'trial',
    data_assinatura TIMESTAMP WITH TIME ZONE,
    data_expiracao TIMESTAMP WITH TIME ZONE,
    periodo_cobranca TEXT DEFAULT 'monthly',
    payment_id TEXT,
    subscription_id TEXT,
    payment_method TEXT,
    primeiro_login BOOLEAN DEFAULT true,
    viu_boas_vindas BOOLEAN DEFAULT false,
    ultima_atividade TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    sku TEXT,
    custo_base DECIMAL(10,2) NOT NULL DEFAULT 0,
    preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0,
    margem_lucro DECIMAL(5,2),
    tipo_variacao TEXT DEFAULT 'none',
    estoque JSONB NOT NULL DEFAULT '{}',
    estoque_minimo INTEGER DEFAULT 5,
    variacoes JSONB DEFAULT '[]',
    imagem_url TEXT,
    imagens JSONB DEFAULT '[]',
    ativo BOOLEAN DEFAULT true,
    visivel_catalogo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cpf TEXT,
    data_nascimento DATE,
    endereco JSONB,
    total_compras INTEGER DEFAULT 0,
    valor_total_gasto DECIMAL(10,2) DEFAULT 0,
    ticket_medio DECIMAL(10,2) DEFAULT 0,
    ultima_compra TIMESTAMP WITH TIME ZONE,
    tags JSONB DEFAULT '[]',
    nivel TEXT DEFAULT 'bronze',
    notas TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    numero_venda TEXT,
    itens JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0,
    frete DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    forma_pagamento TEXT NOT NULL,
    status_pagamento TEXT DEFAULT 'pendente',
    parcelas INTEGER DEFAULT 1,
    tipo_entrega TEXT,
    status_entrega TEXT DEFAULT 'aguardando',
    codigo_rastreio TEXT,
    data_entrega TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    observacoes_internas TEXT,
    data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE DESPESAS
CREATE TABLE IF NOT EXISTS despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    categoria TEXT,
    valor DECIMAL(10,2) NOT NULL,
    recorrente BOOLEAN DEFAULT false,
    frequencia TEXT,
    dia_vencimento INTEGER,
    status TEXT DEFAULT 'pendente',
    data_vencimento DATE,
    data_pagamento DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA DE TRANSAÇÕES
CREATE TABLE IF NOT EXISTS transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_transacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL,
    despesa_id UUID REFERENCES despesas(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABELA DE METAS
CREATE TABLE IF NOT EXISTS metas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor_objetivo DECIMAL(10,2) NOT NULL,
    valor_atual DECIMAL(10,2) DEFAULT 0,
    periodo TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status TEXT DEFAULT 'ativa',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABELA DE CONQUISTAS
CREATE TABLE IF NOT EXISTS conquistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    icone TEXT,
    desbloqueada BOOLEAN DEFAULT false,
    visualizada BOOLEAN DEFAULT false,
    data_desbloqueio TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABELA DE APP STATE
CREATE TABLE IF NOT EXISTS app_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    state JSONB NOT NULL,
    versao TEXT DEFAULT '1.4',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_usuario_state UNIQUE (usuario_id)
);

-- ============================================
-- ÍNDICES BÁSICOS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_produtos_usuario ON produtos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_usuario ON clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vendas_usuario ON vendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_despesas_usuario ON despesas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_usuario ON transacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_metas_usuario ON metas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conquistas_usuario ON conquistas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_app_state_usuario ON app_state(usuario_id);

-- ============================================
-- PRONTO! Tabelas criadas.
-- Vá em "Table Editor" para verificar
-- ============================================
