# ✅ CHECKLIST PRÉ-LANÇAMENTO - SISTEMA PODEROSA

**Data:** 15 de dezembro de 2025  
**Objetivo:** Garantir que tudo está funcionando antes da divulgação pública

---

## 🔐 1. AUTENTICAÇÃO E CADASTRO

### 1.1 Fluxo de Pagamento PIX
- [ ] Acessar página de preços (https://poderosa.netlify.app/precos.html)
- [ ] Selecionar plano PRO (R$ 34,90)
- [ ] Escolher PIX como forma de pagamento
- [ ] QR Code é exibido corretamente
- [ ] Fazer pagamento de teste no Mercado Pago
- [ ] Sistema detecta pagamento aprovado automaticamente
- [ ] Redireciona para página de cadastro (/cadastro.html?email=...)
- [ ] Email vem preenchido automaticamente

### 1.2 Fluxo de Pagamento CARTÃO
- [ ] Acessar página de preços
- [ ] Selecionar plano PRO (R$ 34,90)
- [ ] Escolher Cartão como forma de pagamento
- [ ] Formulário do Mercado Pago carrega corretamente
- [ ] Preencher dados do cartão de teste
- [ ] Pagamento é aprovado
- [ ] Redireciona para cadastro com email preenchido

### 1.3 Cadastro Após Pagamento
- [ ] Email vem preenchido (não editável)
- [ ] Campo de senha funciona
- [ ] Campo de confirmar senha funciona
- [ ] Validação: senhas devem coincidir
- [ ] Validação: senha mínima de 6 caracteres
- [ ] Botão "Criar Conta" funciona
- [ ] Dados são salvos no Supabase (tabela `usuarios`)
- [ ] Senha é salva com hash (SHA-256)
- [ ] Assinatura é vinculada ao usuário (tabela `assinaturas`)
- [ ] Redireciona automaticamente para login

### 1.4 Login
- [ ] Acessar /login.html
- [ ] Inserir email cadastrado
- [ ] Inserir senha correta
- [ ] Login bem-sucedido
- [ ] Redireciona para /app (com ?welcome=true na primeira vez)
- [ ] Email ou senha incorretos mostram erro claro
- [ ] Usuário sem assinatura ativa é bloqueado

---

## 🎓 2. TOUR DE BOAS-VINDAS

### 2.1 Primeiro Acesso
- [ ] Após primeiro login, tour inicia automaticamente
- [ ] Tour mostra 6 etapas:
  - [ ] Etapa 1: Produtos (destaca menu lateral)
  - [ ] Etapa 2: Vendas (destaca menu lateral)
  - [ ] Etapa 3: Despesas (destaca menu lateral)
  - [ ] Etapa 4: Financeiro (destaca menu lateral)
  - [ ] Etapa 5: Relatórios (destaca menu lateral)
  - [ ] Etapa 6: Mensagem final de boas-vindas
- [ ] Spotlight destaca elemento correto em cada etapa
- [ ] Botões "Próximo" e "Anterior" funcionam
- [ ] Botão "Fechar" funciona
- [ ] No mobile: tour fica fixo na parte inferior
- [ ] No mobile: spotlight não aparece (só tooltip)

### 2.2 Tour Só Aparece Uma Vez
- [ ] Fechar tour e fazer logout
- [ ] Fazer login novamente
- [ ] Tour NÃO deve aparecer de novo
- [ ] Verificar no Supabase: `tour_completed = true`

---

## 📦 3. GESTÃO DE PRODUTOS

### 3.1 Cadastrar Produto Simples (Sem Variação)
- [ ] Clicar em "Adicionar Produto"
- [ ] Preencher nome do produto
- [ ] Adicionar foto (testar upload)
- [ ] Adicionar múltiplas fotos (galeria)
- [ ] Definir foto principal
- [ ] Remover foto da galeria
- [ ] Preencher custo base (ex: R$ 25,00)
- [ ] Sistema mostra sugestão automática de preço ✨
- [ ] Emoji de feedback aparece (😍 = ideal)
- [ ] Ajustar slider de preço
- [ ] Feedback muda em tempo real (💀😐😊😍🤑)
- [ ] Mensagens explicativas aparecem
- [ ] Selecionar "Sem Variação"
- [ ] Definir quantidade em estoque
- [ ] Salvar produto
- [ ] Produto aparece na lista

### 3.2 Cadastrar Produto com Variação Simples
- [ ] Criar novo produto
- [ ] Preencher informações básicas
- [ ] Selecionar "Variação Simples"
- [ ] Definir nome da variação (ex: "Tamanho")
- [ ] Adicionar opções (ex: P, M, G)
- [ ] Escolher cor hexadecimal para cada opção
- [ ] Definir estoque individual por opção
- [ ] Salvar produto
- [ ] Variações aparecem corretamente

### 3.3 Cadastrar Produto com Variação Combinada
- [ ] Criar novo produto
- [ ] Selecionar "Variação Combinada"
- [ ] Definir primeira variação (ex: "Cor")
- [ ] Adicionar opções da primeira variação
- [ ] Definir segunda variação (ex: "Tamanho")
- [ ] Adicionar opções da segunda variação
- [ ] Sistema gera combinações automaticamente
- [ ] Definir estoque para cada combinação
- [ ] Salvar produto
- [ ] Combinações aparecem corretamente

### 3.4 Editar e Deletar Produtos
- [ ] Clicar em "Editar" em um produto
- [ ] Modificar informações
- [ ] Salvar alterações
- [ ] Alterações são refletidas
- [ ] Deletar um produto
- [ ] Confirmação de exclusão aparece
- [ ] Produto é removido da lista

---

## 💰 4. SISTEMA DE PRECIFICAÇÃO INTELIGENTE

### 4.1 Sugestão Automática
- [ ] Ao digitar custo do produto, sugestão aparece imediatamente
- [ ] Sugestão usa margem de 67% (padrão ideal)
- [ ] Mostra valor em reais (R$)
- [ ] Explica o motivo da sugestão
- [ ] Box de sugestão tem fundo verde com ✨

### 4.2 Feedback Visual
- [ ] Testar margem < 0%: Emoji 💀 "PREJUÍZO!"
- [ ] Testar margem 20%: Emoji 😐 "Lucro Muito Baixo"
- [ ] Testar margem 40%: Emoji 😊 "Lucro Razoável"
- [ ] Testar margem 67%: Emoji 😍 "Preço Ideal!"
- [ ] Testar margem 100%: Emoji 🤑 "Lucro Alto"
- [ ] Testar margem 150%: Emoji 🤯 "Preço Muito Alto!"
- [ ] Mensagens mudam conforme ajuste do slider
- [ ] Cores do feedback mudam (vermelho → amarelo → verde → azul)

### 4.3 Cálculo Correto
- [ ] Custo R$ 25,00 + despesas R$ 5,00 = Custo total R$ 30,00
- [ ] Margem 67% deve dar preço ~R$ 50,00
- [ ] Lucro deve ser R$ 20,00
- [ ] Detalhamento mostra todos os custos separados
- [ ] Valores batem com calculadora manual

---

## 💵 5. VENDAS

### 5.1 Registrar Venda Simples
- [ ] Ir para "Vendas"
- [ ] Clicar em "Nova Venda"
- [ ] Selecionar cliente (ou adicionar novo)
- [ ] Adicionar produto sem variação
- [ ] Definir quantidade
- [ ] Sistema calcula total automaticamente
- [ ] Escolher forma de pagamento (Dinheiro/PIX/Cartão)
- [ ] Salvar venda
- [ ] Estoque é descontado automaticamente
- [ ] Venda aparece na lista

### 5.2 Registrar Venda com Variação
- [ ] Nova venda
- [ ] Adicionar produto com variação
- [ ] Selecionar variação específica (ex: "M - Vermelho")
- [ ] Definir quantidade
- [ ] Salvar venda
- [ ] Estoque da variação específica é descontado

### 5.3 Venda com Múltiplos Produtos
- [ ] Nova venda
- [ ] Adicionar produto 1
- [ ] Adicionar produto 2
- [ ] Adicionar produto 3
- [ ] Total é calculado corretamente
- [ ] Salvar venda
- [ ] Todos os estoques são atualizados

---

## 📊 6. DESPESAS E CUSTOS

### 6.1 Custos Fixos
- [ ] Acessar "Despesas"
- [ ] Adicionar custo fixo manual (ex: Aluguel R$ 500)
- [ ] Custo aparece na lista
- [ ] Total de custos fixos atualiza
- [ ] Remover custo fixo
- [ ] Total recalcula

### 6.2 Custos Variáveis
- [ ] Adicionar custo variável em % (ex: Comissão 10%)
- [ ] Adicionar custo variável fixo (ex: Embalagem R$ 2,00)
- [ ] Custos aparecem na lista
- [ ] Remover custo variável
- [ ] Sistema recalcula preços dos produtos automaticamente

### 6.3 Meta de Vendas
- [ ] Definir meta mensal (ex: 100 unidades)
- [ ] Sistema usa meta para calcular custo fixo por unidade
- [ ] Alterar meta
- [ ] Precificação recalcula automaticamente

---

## 💳 7. FINANCEIRO

### 7.1 Cadastrar Contas
- [ ] Adicionar conta a pagar (ex: Fornecedor)
- [ ] Adicionar conta a receber (ex: Cliente parcelado)
- [ ] Definir data de vencimento
- [ ] Marcar como recorrente
- [ ] Marcar como "custo do negócio"
- [ ] Conta recorrente aparece automaticamente em Despesas

### 7.2 Pagar/Receber Contas
- [ ] Marcar conta como paga
- [ ] Status muda para "Pago"
- [ ] Marcar conta como recebida
- [ ] Filtrar por status (Pendente/Pago/Atrasado)

---

## 📈 8. RELATÓRIOS

### 8.1 Visão Geral
- [ ] Dashboard mostra total de vendas
- [ ] Dashboard mostra total de despesas
- [ ] Dashboard mostra lucro líquido
- [ ] Dashboard mostra produtos mais vendidos
- [ ] Dashboard mostra estoque baixo (alertas)

### 8.2 Filtros
- [ ] Filtrar por período (7 dias, 30 dias, personalizado)
- [ ] Filtrar vendas por produto
- [ ] Filtrar vendas por cliente
- [ ] Gráficos atualizam conforme filtros

---

## 🔒 9. PLANOS E ASSINATURAS

### 9.1 Plano PRO (Pago)
- [ ] Usuário PRO tem acesso total
- [ ] Banner de "Modo Teste Grátis" NÃO aparece
- [ ] Data de expiração está correta no banco
- [ ] Status da assinatura = 'active'

### 9.2 Plano TRIAL (Teste Grátis)
- [ ] Acessar /trial (sem pagamento)
- [ ] Banner amarelo aparece no topo
- [ ] Banner mostra dias restantes
- [ ] Funcionalidades limitadas aparecem
- [ ] Link "Assinar Agora" funciona
- [ ] Após 7 dias, sistema bloqueia acesso

### 9.3 Verificação no Supabase
- [ ] Tabela `usuarios`: plano correto
- [ ] Tabela `assinaturas`: status = 'active'
- [ ] Tabela `assinaturas`: data_expiracao preenchida
- [ ] Tabela `assinaturas`: payment_id vinculado
- [ ] Tabela `usuarios`: senha_hash preenchido (não senha em texto)

---

## 📱 10. RESPONSIVIDADE

### 10.1 Desktop
- [ ] Layout limpo e organizado
- [ ] Menu lateral fixo
- [ ] Cards bem distribuídos
- [ ] Formulários centralizados

### 10.2 Tablet
- [ ] Menu lateral responsivo
- [ ] Cards se ajustam
- [ ] Tabelas rolam horizontalmente

### 10.3 Mobile
- [ ] Menu vira hambúrguer
- [ ] Tour fica fixo na parte inferior
- [ ] Formulários ocupam largura total
- [ ] Botões grandes e clicáveis
- [ ] Galeria de fotos desliza horizontal
- [ ] Tabelas rolam bem

---

## 🔄 11. SINCRONIZAÇÃO ENTRE DISPOSITIVOS

### 11.1 Dados no Supabase
- [ ] Cadastrar produto no PC
- [ ] Fazer login no celular
- [ ] Produto aparece no celular
- [ ] Registrar venda no celular
- [ ] Venda aparece no PC após recarregar

### 11.2 Tour Completado
- [ ] Completar tour no PC
- [ ] Fazer login no celular
- [ ] Tour NÃO aparece no celular (flag sincronizada)

---

## 🚨 12. SEGURANÇA

### 12.1 Senhas
- [ ] Senhas são salvas com hash (SHA-256)
- [ ] Não é possível ver senha no banco de dados
- [ ] Login só funciona com senha correta

### 12.2 Variáveis de Ambiente
- [ ] Chaves do Supabase estão no Netlify (não no código)
- [ ] Chave do Mercado Pago está no Netlify
- [ ] Código no GitHub não expõe chaves

### 12.3 Autorização
- [ ] Usuário não logado não acessa /app
- [ ] Usuário sem assinatura ativa é bloqueado
- [ ] Funções Netlify validam email antes de executar

---

## 🎨 13. EXPERIÊNCIA DO USUÁRIO

### 13.1 Visual
- [ ] Cores seguem identidade visual (rosa #E91E63)
- [ ] Ícones Lucide carregam corretamente
- [ ] Animações suaves (sem travamentos)
- [ ] Loading spinners aparecem quando necessário

### 13.2 Mensagens
- [ ] Mensagens de sucesso são claras
- [ ] Mensagens de erro são compreensíveis
- [ ] Validações acontecem antes de salvar
- [ ] Confirmações aparecem em ações críticas (deletar)

### 13.3 Performance
- [ ] Páginas carregam rápido (< 3 segundos)
- [ ] Imagens são comprimidas
- [ ] Não trava ao adicionar muitos produtos
- [ ] Scroll é suave

---

## 🐛 14. BUGS CONHECIDOS (RESOLVER ANTES DO LANÇAMENTO)

### 14.1 Críticos (Impedem uso)
- [ ] ~~Banner trial aparecia para usuário pago~~ ✅ RESOLVIDO

### 14.2 Importantes (Atrapalham experiência)
- [ ] Verificar se multi-upload de fotos funciona
- [ ] Testar exclusão de fotos da galeria

### 14.3 Menores (Melhorias futuras)
- [ ] Adicionar botão "Esqueci minha senha"
- [ ] Adicionar edição de perfil do usuário
- [ ] Permitir mudar foto de perfil

---

## 📋 15. CHECKLIST FINAL DE LANÇAMENTO

- [ ] Todos os testes acima passaram
- [ ] Mercado Pago em modo PRODUÇÃO (não sandbox)
- [ ] Supabase em modo PRODUÇÃO
- [ ] Netlify configurado com domínio personalizado (se tiver)
- [ ] Variáveis de ambiente corretas no Netlify
- [ ] SQL do tour_completed executado no Supabase
- [ ] Backup do banco de dados feito
- [ ] Documentação interna atualizada
- [ ] Política de privacidade e termos de uso criados
- [ ] Link de suporte/contato funcionando
- [ ] Testar com 3-5 pessoas reais antes de divulgar

---

## 🎯 APÓS LANÇAMENTO

### Primeira Semana
- [ ] Monitorar erros no console do Netlify
- [ ] Verificar logs de pagamento no Mercado Pago
- [ ] Coletar feedback dos primeiros usuários
- [ ] Corrigir bugs urgentes rapidamente

### Primeiro Mês
- [ ] Analisar taxa de conversão (visitantes → pagamentos)
- [ ] Identificar pontos de abandono no funil
- [ ] Implementar melhorias baseadas em feedback
- [ ] Adicionar FAQ com dúvidas mais comuns

---

## 📞 SUPORTE

**Se algo não funcionar:**
1. Verificar console do navegador (F12)
2. Verificar logs do Netlify Functions
3. Verificar dados no Supabase
4. Consultar documentação: ARCHITECTURE.md, WHAT_WAS_DONE.md

**Contatos de Emergência:**
- Mercado Pago: https://www.mercadopago.com.br/developers/panel
- Supabase: https://app.supabase.com/
- Netlify: https://app.netlify.com/

---

✅ **SISTEMA PRONTO PARA LANÇAMENTO QUANDO TODOS OS ITENS ESTIVEREM MARCADOS!**
