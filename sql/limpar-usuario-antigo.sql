-- ============================================
-- LIMPAR USUÁRIO ANTIGO E COMEÇAR DO ZERO
-- ============================================

-- 1. DELETAR USUÁRIO ANTIGO (isso vai deletar tudo em cascata: produtos, clientes, vendas)
DELETE FROM usuarios 
WHERE email = 'comercial@cjotarasteirinhas.com';

-- Resultado esperado: "DELETE 1"

-- 2. VERIFICAR SE FOI DELETADO
SELECT COUNT(*) as usuarios_restantes FROM usuarios;

-- 3. AGORA SAIA DO SISTEMA E FAÇA UM NOVO CADASTRO
-- Com os dados corretos que você quer usar
