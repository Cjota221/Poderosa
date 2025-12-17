-- ============================================
-- LIMPEZA COMPLETA DO BANCO DE DADOS
-- ============================================
-- ATENÇÃO: Isso vai DELETAR TUDO!
-- Use apenas se quiser recomeçar do zero
-- ============================================

-- Deletar políticas
DROP POLICY IF EXISTS "Service role tem acesso total a app_state" ON app_state;
DROP POLICY IF EXISTS "Service role tem acesso total a conquistas" ON conquistas;
DROP POLICY IF EXISTS "Service role tem acesso total a metas" ON metas;
DROP POLICY IF EXISTS "Service role tem acesso total a transacoes" ON transacoes;
DROP POLICY IF EXISTS "Service role tem acesso total a despesas" ON despesas;
DROP POLICY IF EXISTS "Service role tem acesso total a vendas" ON vendas;
DROP POLICY IF EXISTS "Service role tem acesso total a clientes" ON clientes;
DROP POLICY IF EXISTS "Service role tem acesso total a produtos" ON produtos;
DROP POLICY IF EXISTS "Service role tem acesso total a usuarios" ON usuarios;

-- Deletar views
DROP VIEW IF EXISTS view_resumo_financeiro;

-- Deletar triggers
DROP TRIGGER IF EXISTS trigger_atualizar_stats_cliente ON vendas;
DROP TRIGGER IF EXISTS update_app_state_updated_at ON app_state;
DROP TRIGGER IF EXISTS update_metas_updated_at ON metas;
DROP TRIGGER IF EXISTS update_despesas_updated_at ON despesas;
DROP TRIGGER IF EXISTS update_vendas_updated_at ON vendas;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
DROP TRIGGER IF EXISTS update_produtos_updated_at ON produtos;
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;

-- Deletar funções
DROP FUNCTION IF EXISTS atualizar_estatisticas_cliente();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Deletar tabelas (CASCADE remove todas as dependências)
DROP TABLE IF EXISTS app_state CASCADE;
DROP TABLE IF EXISTS conquistas CASCADE;
DROP TABLE IF EXISTS metas CASCADE;
DROP TABLE IF EXISTS transacoes CASCADE;
DROP TABLE IF EXISTS despesas CASCADE;
DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ============================================
-- PRONTO! Banco limpo.
-- Agora execute o supabase-schema.sql
-- ============================================
