-- ==================================================
-- PREPARAR EMAILS PARA CONTATAR OS USUÁRIOS TRIAL
-- ==================================================

-- 📧 DADOS DOS 2 USUÁRIOS TRIAL QUE PRECISAM ATUALIZAR CADASTRO:

-- trial_1767437190538
-- - Produto: Rasteira Olívia
-- - Preço: R$ 90,00
-- - Cadastrado em: 03/01/2026 às 11:11

-- trial_1767404409888
-- - Produto: Flat Feminina Verona Nude  
-- - Preço: R$ 107,25
-- - Cadastrado em: 03/01/2026 às 01:54

-- ==================================================
-- MENSAGEM PARA ENVIAR POR EMAIL/WHATSAPP:
-- ==================================================

/*
📱 MENSAGEM SUGERIDA:

Olá! 👋

Vimos que você começou a usar o Lucro Certo para cadastrar seus produtos! 🎉

Identificamos que você está usando o sistema mas ainda não completou seu cadastro.

Para garantir que você não perca acesso à sua conta e aos produtos que já cadastrou, por favor atualize seus dados aqui:

🔗 https://lucrocerto.com.br/atualizar-dados.html

São só 2 minutos e você garante:
✅ Acesso contínuo aos seus produtos
✅ Suporte sempre que precisar  
✅ Não perder nenhuma novidade

Seu período de teste grátis ainda está ativo! 🎁

Qualquer dúvida, é só responder este email.

Abraços,
Equipe Lucro Certo 💖
*/

-- ==================================================
-- QUERY PARA GERAR LISTA DE CONTATO
-- ==================================================

SELECT 
    u.id,
    u.email,
    u.nome,
    u.created_at as cadastrado_em,
    a.data_expiracao as expira_em,
    DATE_PART('day', a.data_expiracao - NOW()) as dias_restantes,
    (SELECT COUNT(*) FROM produtos WHERE usuario_id = u.id) as total_produtos,
    (SELECT STRING_AGG(nome, ', ') FROM produtos WHERE usuario_id = u.id LIMIT 3) as produtos_exemplo
FROM usuarios u
LEFT JOIN assinaturas a ON u.id = a.usuario_id AND a.plano = 'trial'
WHERE u.id LIKE 'trial_%'
ORDER BY u.created_at DESC;

-- ==================================================
-- SE CONSEGUIR OS EMAILS DE OUTRA FORMA, USE ESTE UPDATE:
-- ==================================================

-- EXEMPLO: Se descobrir que trial_1767437190538 é maria@exemplo.com
-- UPDATE usuarios 
-- SET email = 'maria@exemplo.com', 
--     nome = 'Maria Silva'
-- WHERE id = 'trial_1767437190538';

-- EXEMPLO: Se descobrir que trial_1767404409888 é joao@exemplo.com
-- UPDATE usuarios 
-- SET email = 'joao@exemplo.com',
--     nome = 'João Santos'  
-- WHERE id = 'trial_1767404409888';
