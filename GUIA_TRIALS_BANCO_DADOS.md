# 📊 Guia: Ver Usuários Trial no Banco de Dados

## 🎯 Objetivo

Ter visibilidade completa dos usuários em teste grátis diretamente no Supabase, com informações como:
- Quantos dias faltam para expirar
- Status visual (Ativo, Expirando, Expirado)
- Progresso do trial
- Último acesso

---

## 🚀 Passo 1: Criar a View no Supabase

1. **Acesse o Supabase:** https://supabase.com
2. **Vá em:** SQL Editor (menu lateral)
3. **Copie e cole** o conteúdo do arquivo: `sql/view-usuarios-trial.sql`
4. **Execute** (botão Run)

✅ Isso cria uma VIEW chamada `v_usuarios_trial` que mostra todos os dados processados.

---

## 📊 Passo 2: Visualizar os Dados

### Opção 1: Via SQL Editor (Supabase)

Abra o **SQL Editor** e execute qualquer uma dessas queries:

#### 🔹 Ver todos os trials ativos

```sql
SELECT 
    nome,
    email,
    TO_CHAR(data_cadastro, 'DD/MM/YYYY') as cadastro,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY HH24:MI') as expira_em,
    dias_restantes,
    status_visual,
    progresso_percent || '%' as progresso
FROM v_usuarios_trial
WHERE status_visual != 'EXPIRADO'
ORDER BY dias_restantes ASC;
```

**Resultado:**
```
nome          | email              | cadastro   | expira_em        | dias_restantes | status_visual | progresso
--------------|--------------------|------------|------------------|----------------|---------------|----------
Maria Silva   | maria@email.com    | 04/01/2026 | 06/01/2026 14:30 | 2              | EXPIRANDO     | 71%
João Santos   | joao@email.com     | 02/01/2026 | 09/01/2026 10:15 | 5              | ATIVO         | 28%
```

---

#### 🔹 Ver trials URGENTES (expiram hoje ou amanhã)

```sql
SELECT 
    nome,
    email,
    telefone,
    dias_restantes,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY HH24:MI') as expira_em,
    CASE 
        WHEN ultimo_login > NOW() - INTERVAL '24 hours' THEN '✅ Ativo'
        ELSE '⚠️ Inativo'
    END as engajamento
FROM v_usuarios_trial
WHERE dias_restantes BETWEEN 0 AND 1
ORDER BY dias_restantes DESC;
```

**Use para:**
- Enviar email de lembrete
- Ligar para o cliente
- Oferecer desconto de última hora

---

#### 🔹 Estatísticas gerais

```sql
SELECT 
    status_visual,
    COUNT(*) as quantidade,
    ROUND(AVG(dias_restantes), 1) as media_dias_restantes,
    ROUND(AVG(progresso_percent)) || '%' as progresso_medio
FROM v_usuarios_trial
GROUP BY status_visual
ORDER BY 
    CASE status_visual
        WHEN 'EXPIRADO' THEN 1
        WHEN 'EXPIRANDO' THEN 2
        WHEN 'ATIVO' THEN 3
    END;
```

**Resultado:**
```
status_visual | quantidade | media_dias_restantes | progresso_medio
--------------|------------|----------------------|----------------
EXPIRADO      | 3          | 0                    | 100%
EXPIRANDO     | 2          | 1.5                  | 78%
ATIVO         | 12         | 4.8                  | 31%
```

---

#### 🔹 Trials que já expiraram

```sql
SELECT 
    id,
    email,
    nome,
    telefone,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY') as expirou_em,
    DATE_PART('day', NOW() - trial_expiracao)::INTEGER as dias_expirado,
    CASE 
        WHEN ultimo_login > NOW() - INTERVAL '7 days' THEN '🟢 Engajado'
        ELSE '🔴 Não engajado'
    END as perfil
FROM v_usuarios_trial
WHERE status_visual = 'EXPIRADO'
ORDER BY trial_expiracao DESC;
```

**Use para:**
- Enviar email de "sentimos sua falta"
- Oferecer desconto especial
- Limpar da base (GDPR)

---

#### 🔹 Trials mais engajados (acessaram recentemente)

```sql
SELECT 
    nome,
    email,
    dias_restantes,
    TO_CHAR(ultimo_login, 'DD/MM/YYYY HH24:MI') as ultimo_acesso,
    CASE 
        WHEN ultimo_login > NOW() - INTERVAL '24 hours' THEN '🟢 Hoje'
        WHEN ultimo_login > NOW() - INTERVAL '3 days' THEN '🟡 Esta semana'
        WHEN ultimo_login > NOW() - INTERVAL '7 days' THEN '🟠 Semana passada'
        ELSE '🔴 Inativo há muito tempo'
    END as engajamento
FROM v_usuarios_trial
WHERE status_visual != 'EXPIRADO'
ORDER BY ultimo_login DESC NULLS LAST;
```

---

### Opção 2: Via Table Editor (Visual)

1. **Vá em:** Table Editor → Views
2. **Clique em:** `v_usuarios_trial`
3. **Veja os dados** em formato de tabela visual

✅ Mais fácil para quem não gosta de SQL!

---

## 🛠️ Passo 3: Funções Úteis

### Limpar trials expirados automaticamente

```sql
-- Ver quais serão afetados (SEM executar)
SELECT email 
FROM v_usuarios_trial 
WHERE status_visual = 'EXPIRADO' 
  AND DATE_PART('day', NOW() - trial_expiracao) > 7;

-- Executar limpeza (expirados há mais de 7 dias)
SELECT * FROM limpar_trials_expirados();
```

**O que faz:**
1. Busca trials expirados há mais de 7 dias
2. Muda plano para `expired`
3. Atualiza status da assinatura
4. Retorna lista de emails afetados

---

## 📱 Passo 4: Integrar com o Painel Admin

O painel admin **já está pronto** para usar esses dados! A API busca automaticamente:

```javascript
// netlify/functions/admin-api.js já faz isso:
GET /.netlify/functions/admin-api?action=usuarios
→ Retorna todos os usuários incluindo trials
→ Frontend calcula dias restantes
→ Exibe na seção "Teste Grátis"
```

---

## 📊 Colunas da View Explicadas

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| `email` | Email do usuário | maria@email.com |
| `nome` | Nome completo | Maria Silva |
| `data_cadastro` | Quando criou a conta | 2026-01-04 |
| `trial_inicio` | Quando iniciou trial | 2026-01-04 14:30 |
| `trial_expiracao` | Quando expira | 2026-01-11 14:30 |
| `dias_restantes` | Dias até expirar | 3 |
| `dias_usados` | Dias já usados | 4 |
| `progresso_percent` | % do trial usado | 57% |
| `status_visual` | Status atual | ATIVO / EXPIRANDO / EXPIRADO |
| `ultimo_login` | Último acesso | 2026-01-04 16:45 |

---

## 🎨 Códigos de Cores (Status Visual)

- 🟢 **ATIVO** - 3+ dias restantes (tudo bem)
- 🟡 **EXPIRANDO** - 1-2 dias restantes (urgente!)
- 🔴 **EXPIRADO** - 0 dias (perdeu acesso)

---

## 📧 Automações Possíveis

### 1. Email automático quando faltam 2 dias

```sql
-- Buscar emails para enviar
SELECT email, nome, dias_restantes
FROM v_usuarios_trial
WHERE dias_restantes = 2
  AND status_visual = 'EXPIRANDO';
```

### 2. WhatsApp quando faltam 1 dia

```sql
-- Buscar telefones para enviar WhatsApp
SELECT telefone, nome, email
FROM v_usuarios_trial
WHERE dias_restantes = 1
  AND telefone IS NOT NULL;
```

### 3. Notificação no painel quando trial expira hoje

```sql
-- Buscar trials que expiram hoje
SELECT COUNT(*) as expirando_hoje
FROM v_usuarios_trial
WHERE dias_restantes = 0
  AND status_visual = 'EXPIRADO';
```

---

## 🔧 Queries de Manutenção

### Ver estrutura da view

```sql
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'v_usuarios_trial'
ORDER BY ordinal_position;
```

### Atualizar view (se mudar algo)

```sql
-- Deletar view antiga
DROP VIEW IF EXISTS v_usuarios_trial;

-- Recriar (copiar do arquivo SQL)
CREATE OR REPLACE VIEW v_usuarios_trial AS ...
```

---

## 📊 Dashboard SQL Completo

Se quiser ver TUDO de uma vez:

```sql
-- DASHBOARD COMPLETO DE TRIALS
WITH stats AS (
    SELECT 
        COUNT(*) FILTER (WHERE status_visual = 'ATIVO') as ativos,
        COUNT(*) FILTER (WHERE status_visual = 'EXPIRANDO') as expirando,
        COUNT(*) FILTER (WHERE status_visual = 'EXPIRADO') as expirados,
        ROUND(AVG(progresso_percent)) as progresso_medio,
        COUNT(*) FILTER (WHERE ultimo_login > NOW() - INTERVAL '24 hours') as ativos_hoje
    FROM v_usuarios_trial
)
SELECT 
    '📊 TOTAL DE TRIALS' as metrica,
    (ativos + expirando + expirados)::TEXT as valor
FROM stats

UNION ALL

SELECT '🟢 Ativos', ativos::TEXT FROM stats
UNION ALL
SELECT '🟡 Expirando (1-2 dias)', expirando::TEXT FROM stats
UNION ALL
SELECT '🔴 Expirados', expirados::TEXT FROM stats
UNION ALL
SELECT '📈 Progresso Médio', progresso_medio || '%' FROM stats
UNION ALL
SELECT '✅ Acessaram Hoje', ativos_hoje::TEXT FROM stats;
```

**Resultado:**
```
metrica                    | valor
---------------------------|-------
📊 TOTAL DE TRIALS         | 17
🟢 Ativos                  | 12
🟡 Expirando (1-2 dias)    | 2
🔴 Expirados               | 3
📈 Progresso Médio         | 42%
✅ Acessaram Hoje          | 8
```

---

## 🚨 Alertas Importantes

### ⚠️ Trials que não fizeram login há 3+ dias

```sql
SELECT 
    nome,
    email,
    dias_restantes,
    DATE_PART('day', NOW() - ultimo_login)::INTEGER as dias_sem_acessar
FROM v_usuarios_trial
WHERE ultimo_login < NOW() - INTERVAL '3 days'
  AND status_visual != 'EXPIRADO'
ORDER BY ultimo_login ASC NULLS LAST;
```

**Ação:** Enviar email "Está com dificuldades?"

---

## 🎯 Resumo de Comandos Rápidos

```sql
-- Ver todos os trials
SELECT * FROM v_usuarios_trial;

-- Ver só os ativos
SELECT * FROM v_usuarios_trial WHERE status_visual = 'ATIVO';

-- Ver urgentes (1-2 dias)
SELECT * FROM v_usuarios_trial WHERE dias_restantes <= 2;

-- Contar por status
SELECT status_visual, COUNT(*) FROM v_usuarios_trial GROUP BY status_visual;

-- Limpar expirados há mais de 7 dias
SELECT * FROM limpar_trials_expirados();
```

---

## ✅ Checklist de Implementação

- [ ] Executar `sql/view-usuarios-trial.sql` no Supabase
- [ ] Testar query: `SELECT * FROM v_usuarios_trial;`
- [ ] Verificar painel admin: seção "Teste Grátis"
- [ ] Configurar alertas de expirações (email/WhatsApp)
- [ ] Agendar limpeza semanal de trials expirados

---

## 🔗 Links Úteis

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Painel Admin Local:** http://localhost:8888/admin
- **Painel Admin Produção:** https://seu-site.netlify.app/admin
