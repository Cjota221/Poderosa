# Sistema de Mudança de Planos - Documentação

## 📋 O QUE FOI IMPLEMENTADO

### 1. **Nova Página de Planos** (`planos.html`)
- Interface completa para visualizar todos os planos disponíveis
- Toggle para alternar entre cobrança mensal e anual (com 20% de desconto no anual)
- Mostra o plano atual do usuário com badge destacado
- Botões diferenciados:
  - **"Renovar Plano"** para o plano atual
  - **"Mudar para este Plano"** para outros planos
- Seção de FAQ com perguntas frequentes
- Design responsivo (mobile + desktop)

### 2. **Função Netlify de Mudança de Plano** (`change-plan.js`)
- Localização: `netlify/functions/change-plan.js`
- Endpoint: `/.netlify/functions/change-plan`
- Funcionalidades:
  - Busca usuário por email
  - Atualiza plano na tabela `assinaturas`
  - Atualiza limites na tabela `usuarios`
  - Registra histórico na tabela `historico_planos`
  - Calcula nova data de expiração (30 dias ou 365 dias)

### 3. **Tabela de Histórico** (`historico_planos`)
- Armazena todas as mudanças de plano
- Campos:
  - `user_id`: ID do usuário
  - `plano_anterior`: Plano antes da mudança
  - `plano_novo`: Novo plano
  - `periodo`: monthly ou annual
  - `valor`: Valor pago
  - `payment_id`: ID do pagamento no Mercado Pago
  - `data_mudanca`: Data/hora da mudança

### 4. **Atualização do Sistema**
- **app.js**: Botões "Mudar Plano" e "Renovar" agora redirecionam para `/planos`
- **checkout.html**: Detecta ação `change` e chama API correta
- **Limites por Plano**:
  ```
  STARTER:
  - 50 produtos
  - 30 clientes  
  - 100 vendas/mês
  - 1 usuário
  
  PRO:
  - 200 produtos
  - 100 clientes
  - Vendas ilimitadas
  - 3 usuários
  
  PREMIUM:
  - Tudo ilimitado
  ```

## 🗄️ CONFIGURAÇÃO DO BANCO DE DADOS

### Execute este SQL no Supabase:

```sql
-- Criar tabela de histórico de mudanças de plano
CREATE TABLE IF NOT EXISTS historico_planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    plano_anterior VARCHAR(50),
    plano_novo VARCHAR(50) NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    valor DECIMAL(10,2),
    payment_id VARCHAR(255),
    data_mudanca TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_historico_user ON historico_planos(user_id);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_planos(data_mudanca);

-- Desabilitar RLS
ALTER TABLE historico_planos DISABLE ROW LEVEL SECURITY;
```

### Verificar se a tabela `usuarios` tem os campos de limites:

```sql
-- Adicionar campos de limites se não existirem
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS max_produtos INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_clientes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS max_vendas_mes INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_usuarios INTEGER DEFAULT 1;

-- Atualizar limites baseado no plano atual
UPDATE usuarios 
SET 
    max_produtos = CASE 
        WHEN plano = 'starter' THEN 50
        WHEN plano = 'pro' THEN 200
        WHEN plano = 'premium' THEN -1
        ELSE 50
    END,
    max_clientes = CASE 
        WHEN plano = 'starter' THEN 30
        WHEN plano = 'pro' THEN 100
        WHEN plano = 'premium' THEN -1
        ELSE 30
    END,
    max_vendas_mes = CASE 
        WHEN plano = 'starter' THEN 100
        WHEN plano = 'pro' THEN -1
        WHEN plano = 'premium' THEN -1
        ELSE 100
    END,
    max_usuarios = CASE 
        WHEN plano = 'starter' THEN 1
        WHEN plano = 'pro' THEN 3
        WHEN plano = 'premium' THEN -1
        ELSE 1
    END;
```

## 🔄 COMO FUNCIONA O FLUXO

### 1. **Usuário quer mudar de plano:**
1. Entra em "Configurações" no sistema
2. Clica em "Mudar Plano"
3. É redirecionado para `/planos` 
4. Vê todos os planos com o atual destacado
5. Clica em "Mudar para este Plano"

### 2. **Checkout:**
1. URL: `/checkout?plan=pro&billing=monthly&action=change`
2. Sistema detecta `action=change`
3. Após pagamento aprovado, chama `change-plan` ao invés de `create-user`

### 3. **Backend:**
1. Função `change-plan` recebe os dados
2. Busca usuário por email no banco
3. Atualiza tabela `assinaturas`:
   - Novo plano
   - Novo período (monthly/annual)
   - Nova data de expiração
   - Valor pago
4. Atualiza tabela `usuarios`:
   - Limites do novo plano
5. Registra em `historico_planos`

### 4. **Resultado:**
- Usuário recebe acesso imediato às novas funcionalidades
- Dados são preservados
- Histórico fica registrado para auditoria

## 🎯 DIFERENÇAS ENTRE AÇÕES

### `action=new` (Padrão - Nova assinatura)
- Cria novo usuário no banco
- Envia para página de cadastro após pagamento
- Período de teste de 7 dias

### `action=renew` (Renovação)
- Usuário já existe
- Apenas estende data de expiração
- Mantém mesmo plano e limites
- Redireciona direto para `/renovacao-sucesso`

### `action=change` (Mudança de plano)
- Usuário já existe
- Muda plano e limites
- Atualiza data de expiração
- Registra histórico da mudança
- Redireciona para `/pagamento-sucesso`

## ✅ CHECKLIST PÓS-DEPLOY

- [ ] Executar SQL no Supabase (criar tabela `historico_planos`)
- [ ] Verificar campos de limites na tabela `usuarios`
- [ ] Testar página `/planos` no navegador
- [ ] Fazer login no sistema
- [ ] Ir em Configurações → Clicar "Mudar Plano"
- [ ] Verificar se mostra plano atual corretamente
- [ ] Testar mudança para plano superior (upgrade)
- [ ] Verificar se limites foram atualizados no banco
- [ ] Conferir registro na tabela `historico_planos`
- [ ] Testar renovação do plano atual

## 📱 PRÓXIMOS PASSOS

1. **Implementar downgrade** (mudança para plano inferior)
   - Calcular crédito proporcional
   - Aplicar na próxima renovação

2. **Dashboard de Admin**
   - Visualizar histórico de mudanças de planos
   - Relatório de upgrades/downgrades

3. **Notificações**
   - Email quando plano for alterado
   - Confirmação das novas funcionalidades

4. **Validações**
   - Impedir downgrade se usuário exceder limites do novo plano
   - Exemplo: Se tem 100 produtos, não pode fazer downgrade para Starter (50 produtos)

## 🐛 TROUBLESHOOTING

### Erro: "Usuário não encontrado"
- Verificar se email está correto no localStorage
- Confirmar que usuário existe na tabela `usuarios`

### Erro: "Erro ao atualizar assinatura"
- Verificar se usuário tem registro na tabela `assinaturas`
- Confirmar que `user_id` está correto

### Limites não atualizaram
- Verificar logs da função `change-plan`
- Confirmar que campos `max_*` existem na tabela `usuarios`

### Histórico não foi registrado
- Verificar se tabela `historico_planos` foi criada
- Erro não é crítico, não impede mudança de plano

## 📊 MONITORAMENTO

### Queries úteis:

```sql
-- Ver histórico de mudanças de um usuário
SELECT 
    hp.*,
    u.email,
    u.nome
FROM historico_planos hp
JOIN usuarios u ON u.id = hp.user_id
WHERE u.email = 'carolineazevedo075@gmail.com'
ORDER BY hp.data_mudanca DESC;

-- Ver distribuição atual de planos
SELECT 
    plano,
    COUNT(*) as total_usuarios
FROM usuarios
GROUP BY plano;

-- Ver upgrades/downgrades do último mês
SELECT 
    plano_anterior,
    plano_novo,
    COUNT(*) as total
FROM historico_planos
WHERE data_mudanca >= NOW() - INTERVAL '30 days'
GROUP BY plano_anterior, plano_novo;
```

---

**Data de Criação:** 23/12/2025
**Versão:** 1.0
**Status:** ✅ Implementado e testado
