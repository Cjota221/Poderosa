-- ============================================
-- RECRIAR TODAS AS TABELAS DO SISTEMA
-- ============================================
-- ⚠️ ATENÇÃO: Este script DELETA todas as tabelas!
-- Execute APENAS se tiver certeza e backup dos dados
-- ============================================

-- ============================================
-- PASSO 1: BACKUP DOS DADOS ATUAIS
-- ============================================
-- Execute estas queries ANTES de deletar para salvar os dados:
-- 
-- SELECT * FROM usuarios;
-- SELECT * FROM produtos;
-- SELECT * FROM assinaturas;
-- SELECT * FROM vendas;
-- SELECT * FROM clientes;
-- SELECT * FROM despesas;
--
-- Salve os resultados em CSV ou JSON
-- ============================================

-- ============================================
-- PASSO 2: DELETAR TABELAS (CUIDADO!)
-- ============================================
-- ⚠️ DESCOMENTADO - Vai deletar as tabelas antigas!

DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS despesas CASCADE;
DROP TABLE IF EXISTS metas CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS assinaturas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ============================================
-- PASSO 3: CRIAR TABELA USUARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS usuarios (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT,
    
    -- Dados pessoais
    nome TEXT NOT NULL,
    telefone TEXT,
    foto_perfil TEXT,
    
    -- Dados do negócio
    logo_catalogo TEXT,
    slug TEXT UNIQUE,
    
    -- Plano e limites
    plano TEXT NOT NULL DEFAULT 'trial',
    plano_atual TEXT DEFAULT 'starter',
    status TEXT DEFAULT 'active',
    max_produtos INTEGER DEFAULT 50,
    max_clientes INTEGER DEFAULT 30,
    max_vendas_mes INTEGER DEFAULT 100,
    max_usuarios INTEGER DEFAULT 1,
    
    -- Flags de controle
    cadastro_completo BOOLEAN DEFAULT false,
    tour_concluido BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT email_valido CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT plano_valido CHECK (plano IN ('trial', 'starter', 'pro', 'premium')),
    CONSTRAINT status_valido CHECK (status IN ('active', 'inactive', 'suspended', 'cancelled'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_slug ON usuarios(slug);
CREATE INDEX IF NOT EXISTS idx_usuarios_plano ON usuarios(plano);
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON usuarios(created_at);

-- Comentários
COMMENT ON TABLE usuarios IS 'Tabela principal de usuários do sistema';
COMMENT ON COLUMN usuarios.id IS 'ID único gerado automaticamente (UUID)';
COMMENT ON COLUMN usuarios.email IS 'Email único do usuário (validado)';
COMMENT ON COLUMN usuarios.senha_hash IS 'Senha criptografada com bcrypt';
COMMENT ON COLUMN usuarios.slug IS 'Slug único para catálogo público';
COMMENT ON COLUMN usuarios.plano IS 'Plano atual: trial, starter, pro, premium';

-- ============================================
-- PASSO 4: CRIAR TABELA ASSINATURAS
-- ============================================

CREATE TABLE IF NOT EXISTS assinaturas (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados do plano
    plano TEXT NOT NULL,
    periodo TEXT DEFAULT 'monthly',
    status TEXT NOT NULL DEFAULT 'active',
    valor NUMERIC(10,2) DEFAULT 0,
    
    -- Pagamento
    payment_id TEXT,
    payment_method TEXT,
    
    -- Datas
    data_inicio TIMESTAMPTZ DEFAULT NOW(),
    data_expiracao TIMESTAMPTZ,
    data_cancelamento TIMESTAMPTZ,
    
    -- Motivo cancelamento
    motivo_cancelamento TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT plano_assinatura_valido CHECK (plano IN ('trial', 'starter', 'pro', 'premium')),
    CONSTRAINT periodo_valido CHECK (periodo IN ('monthly', 'annual', 'trial')),
    CONSTRAINT status_assinatura_valido CHECK (status IN ('active', 'cancelled', 'expired', 'pending'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_assinaturas_usuario ON assinaturas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_plano ON assinaturas(plano);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_expiracao ON assinaturas(data_expiracao);

COMMENT ON TABLE assinaturas IS 'Histórico de assinaturas dos usuários';
COMMENT ON COLUMN assinaturas.data_expiracao IS 'Data de expiração (trials = 7 dias)';

-- ============================================
-- PASSO 5: CRIAR TABELA PRODUTOS
-- ============================================

CREATE TABLE IF NOT EXISTS produtos (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados do produto
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    
    -- Preços e custos
    preco_custo NUMERIC(10,2) DEFAULT 0,
    preco_venda NUMERIC(10,2) NOT NULL,
    margem_lucro NUMERIC(5,2),
    
    -- Estoque
    estoque_atual INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    
    -- Imagens
    imagem_url TEXT,
    imagens_adicionais TEXT[],
    
    -- Flags
    ativo BOOLEAN DEFAULT true,
    visivel_catalogo BOOLEAN DEFAULT false,
    produto_destaque BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT preco_venda_positivo CHECK (preco_venda >= 0),
    CONSTRAINT preco_custo_positivo CHECK (preco_custo >= 0),
    CONSTRAINT estoque_nao_negativo CHECK (estoque_atual >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_produtos_usuario ON produtos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_catalogo ON produtos(visivel_catalogo);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);

COMMENT ON TABLE produtos IS 'Produtos cadastrados pelos usuários';
COMMENT ON COLUMN produtos.visivel_catalogo IS 'Se true, aparece no catálogo público';

-- ============================================
-- PASSO 6: CRIAR TABELA CLIENTES
-- ============================================

CREATE TABLE IF NOT EXISTS clientes (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados pessoais
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cpf TEXT,
    
    -- Endereço
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    
    -- Dados comerciais
    tipo_cliente TEXT DEFAULT 'pessoa_fisica',
    limite_credito NUMERIC(10,2) DEFAULT 0,
    
    -- Flags
    ativo BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT tipo_cliente_valido CHECK (tipo_cliente IN ('pessoa_fisica', 'pessoa_juridica'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clientes_usuario ON clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);

COMMENT ON TABLE clientes IS 'Clientes cadastrados pelos usuários';

-- ============================================
-- PASSO 7: CRIAR TABELA VENDAS
-- ============================================

CREATE TABLE IF NOT EXISTS vendas (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    
    -- Dados da venda
    numero_venda TEXT UNIQUE,
    data_venda TIMESTAMPTZ DEFAULT NOW(),
    
    -- Valores
    valor_total NUMERIC(10,2) NOT NULL,
    valor_desconto NUMERIC(10,2) DEFAULT 0,
    valor_final NUMERIC(10,2) NOT NULL,
    custo_total NUMERIC(10,2) DEFAULT 0,
    lucro_total NUMERIC(10,2) DEFAULT 0,
    
    -- Pagamento
    forma_pagamento TEXT,
    status_pagamento TEXT DEFAULT 'pendente',
    
    -- Observações
    observacoes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valor_final_positivo CHECK (valor_final >= 0),
    CONSTRAINT forma_pagamento_valida CHECK (forma_pagamento IN ('dinheiro', 'cartao', 'pix', 'boleto', 'outros')),
    CONSTRAINT status_pagamento_valido CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vendas_usuario ON vendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status_pagamento);

COMMENT ON TABLE vendas IS 'Vendas realizadas pelos usuários';

-- ============================================
-- PASSO 8: CRIAR TABELA DESPESAS
-- ============================================

CREATE TABLE IF NOT EXISTS despesas (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados da despesa
    descricao TEXT NOT NULL,
    categoria TEXT,
    valor NUMERIC(10,2) NOT NULL,
    
    -- Datas
    data_vencimento DATE,
    data_pagamento DATE,
    
    -- Status
    status TEXT DEFAULT 'pendente',
    
    -- Observações
    observacoes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valor_despesa_positivo CHECK (valor >= 0),
    CONSTRAINT status_despesa_valido CHECK (status IN ('pendente', 'pago', 'cancelado'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_despesas_usuario ON despesas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas(categoria);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas(status);
CREATE INDEX IF NOT EXISTS idx_despesas_vencimento ON despesas(data_vencimento);

COMMENT ON TABLE despesas IS 'Despesas cadastradas pelos usuários';

-- ============================================
-- PASSO 9: CRIAR TABELA METAS
-- ============================================

CREATE TABLE IF NOT EXISTS metas (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Dados da meta
    titulo TEXT NOT NULL,
    descricao TEXT,
    valor_meta NUMERIC(10,2) NOT NULL,
    valor_atual NUMERIC(10,2) DEFAULT 0,
    
    -- Período
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'em_andamento',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valor_meta_positivo CHECK (valor_meta > 0),
    CONSTRAINT valor_atual_nao_negativo CHECK (valor_atual >= 0),
    CONSTRAINT periodo_valido CHECK (data_fim >= data_inicio),
    CONSTRAINT status_meta_valido CHECK (status IN ('em_andamento', 'concluida', 'cancelada'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_metas_usuario ON metas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_metas_status ON metas(status);
CREATE INDEX IF NOT EXISTS idx_metas_periodo ON metas(data_inicio, data_fim);

COMMENT ON TABLE metas IS 'Metas financeiras dos usuários';

-- ============================================
-- PASSO 10: CRIAR VIEWS ÚTEIS
-- ============================================

-- View de trials ativos
CREATE OR REPLACE VIEW v_usuarios_trial AS
SELECT 
    u.id,
    u.email,
    u.nome,
    u.telefone,
    u.plano,
    u.created_at AS data_cadastro,
    a.id AS assinatura_id,
    a.data_inicio AS trial_inicio,
    a.data_expiracao AS trial_expiracao,
    a.status AS trial_status,
    CASE 
        WHEN a.data_expiracao IS NULL THEN 7
        ELSE GREATEST(0, EXTRACT(DAY FROM (a.data_expiracao - NOW()))::INTEGER)
    END AS dias_restantes,
    CASE 
        WHEN a.data_expiracao IS NULL THEN 'ATIVO'
        WHEN EXTRACT(DAY FROM (a.data_expiracao - NOW())) <= 0 THEN 'EXPIRADO'
        WHEN EXTRACT(DAY FROM (a.data_expiracao - NOW())) <= 2 THEN 'EXPIRANDO'
        ELSE 'ATIVO'
    END AS status_visual
FROM usuarios u
LEFT JOIN assinaturas a ON u.id = a.usuario_id AND a.plano = 'trial'
WHERE u.plano = 'trial'
ORDER BY 
    CASE 
        WHEN a.data_expiracao IS NULL THEN 0
        ELSE EXTRACT(DAY FROM (a.data_expiracao - NOW()))
    END,
    u.created_at DESC;

COMMENT ON VIEW v_usuarios_trial IS 'View com informações consolidadas dos trials';

-- ============================================
-- PASSO 11: HABILITAR RLS (ROW LEVEL SECURITY)
-- ============================================

-- Ativar RLS em todas as tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

-- Policy para service_role ter acesso total
CREATE POLICY "Service role full access usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "Service role full access assinaturas" ON assinaturas FOR ALL USING (true);
CREATE POLICY "Service role full access produtos" ON produtos FOR ALL USING (true);
CREATE POLICY "Service role full access clientes" ON clientes FOR ALL USING (true);
CREATE POLICY "Service role full access vendas" ON vendas FOR ALL USING (true);
CREATE POLICY "Service role full access despesas" ON despesas FOR ALL USING (true);
CREATE POLICY "Service role full access metas" ON metas FOR ALL USING (true);

-- Policy para produtos no catálogo (acesso público)
CREATE POLICY "Produtos publicos no catalogo" ON produtos 
FOR SELECT 
USING (ativo = true AND visivel_catalogo = true);

-- ============================================
-- PASSO 12: CRIAR TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assinaturas_updated_at BEFORE UPDATE ON assinaturas
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

-- ============================================
-- ✅ RESULTADO ESPERADO
-- ============================================
-- Após executar este script:
-- ✅ 7 tabelas criadas com estrutura correta
-- ✅ Relacionamentos (foreign keys) configurados
-- ✅ Índices para performance
-- ✅ Constraints de validação
-- ✅ RLS habilitado
-- ✅ Triggers de updated_at
-- ✅ View v_usuarios_trial
-- ✅ Sistema pronto para receber dados!
-- ============================================
