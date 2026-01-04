# 🚀 Como Criar a View no Supabase - PASSO A PASSO

## ❌ Erro que você viu:
```
relation "v_usuarios_trial" does not exist
```

**Causa:** A VIEW ainda não foi criada no banco.

---

## ✅ SOLUÇÃO - Execute em Ordem:

### **PASSO 1: Criar a View**

1. Abra: https://supabase.com/dashboard
2. Vá em: **SQL Editor** (menu lateral esquerdo)
3. Clique em: **+ New query** (nova consulta)
4. **Copie TODO** o conteúdo do arquivo: `sql/1-criar-view-trials.sql`
5. **Cole** no editor
6. Clique em: **RUN** (botão verde no canto inferior direito)

**✅ Você verá:** "Success. No rows returned"

Isso é NORMAL! Significa que a VIEW foi criada com sucesso.

---

### **PASSO 2: Testar a View**

Agora execute qualquer query do arquivo: `sql/2-queries-trials.sql`

Exemplo - Ver todos os trials:
```sql
SELECT * FROM v_usuarios_trial;
```

**✅ Você verá:** Uma tabela com todos os usuários trial!

---

## 📊 Queries Prontas Para Usar

### 1️⃣ **Ver TODOS os trials**
```sql
SELECT * FROM v_usuarios_trial;
```

### 2️⃣ **Ver apenas ATIVOS (não expirados)**
```sql
SELECT 
    nome,
    email,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY HH24:MI') as expira_em,
    dias_restantes,
    status_visual,
    progresso_percent || '%' as progresso
FROM v_usuarios_trial
WHERE status_visual != 'EXPIRADO'
ORDER BY dias_restantes ASC;
```

### 3️⃣ **Ver trials URGENTES (expiram hoje/amanhã)**
```sql
SELECT 
    nome,
    email,
    telefone,
    dias_restantes,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY HH24:MI') as expira_em
FROM v_usuarios_trial
WHERE dias_restantes <= 1
ORDER BY dias_restantes DESC;
```

### 4️⃣ **Estatísticas gerais**
```sql
SELECT 
    status_visual,
    COUNT(*) as quantidade,
    ROUND(AVG(dias_restantes), 1) as media_dias
FROM v_usuarios_trial
GROUP BY status_visual;
```

**Resultado esperado:**
```
status_visual | quantidade | media_dias
--------------|------------|------------
ATIVO         | 12         | 4.8
EXPIRANDO     | 2          | 1.5
EXPIRADO      | 3          | 0.0
```

### 5️⃣ **Ver quem já EXPIROU**
```sql
SELECT 
    email,
    nome,
    TO_CHAR(trial_expiracao, 'DD/MM/YYYY') as expirou_em,
    DATE_PART('day', NOW() - trial_expiracao)::INTEGER as dias_expirado
FROM v_usuarios_trial
WHERE status_visual = 'EXPIRADO'
ORDER BY trial_expiracao DESC;
```

---

## 🎯 Resumo Rápido

**1. Execute:** `sql/1-criar-view-trials.sql` (cria a view)
**2. Execute:** Qualquer query de `sql/2-queries-trials.sql` (testa)

✅ **Pronto!** Agora você pode ver todos os trials no banco!

---

## 🔧 Se der erro novamente:

### Erro: "permission denied"
```sql
-- Execute isso antes:
GRANT SELECT ON v_usuarios_trial TO authenticated;
GRANT SELECT ON v_usuarios_trial TO anon;
```

### Erro: "column does not exist"
Pode ser que as colunas do seu banco tenham nomes diferentes.

**Verificar colunas da tabela usuarios:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios';
```

**Verificar colunas da tabela assinaturas:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assinaturas';
```

---

## ✅ Validação Final

Execute para confirmar que funcionou:

```sql
-- Deve retornar um número (quantidade de trials)
SELECT COUNT(*) as total_trials FROM v_usuarios_trial;
```

Se retornar um número → **SUCESSO!** ✅

---

## 📱 Opção Visual (Sem SQL)

Depois de criar a view, você pode ver os dados visualmente:

1. Supabase → **Table Editor**
2. Clique na aba **Views** (ao lado de Tables)
3. Clique em **v_usuarios_trial**
4. Veja os dados em formato de tabela!

---

## 🎨 Entendendo as Colunas

| Coluna | O que mostra | Exemplo |
|--------|--------------|---------|
| `nome` | Nome do usuário | Maria Silva |
| `email` | Email | maria@email.com |
| `dias_restantes` | Dias até expirar | 3 |
| `status_visual` | Status atual | ATIVO / EXPIRANDO / EXPIRADO |
| `progresso_percent` | % do trial usado | 57% |
| `trial_expiracao` | Quando expira | 2026-01-11 14:30 |

---

## 📞 Para Enviar WhatsApp/Email

```sql
-- Buscar quem expira amanhã
SELECT 
    nome,
    email,
    telefone,
    dias_restantes
FROM v_usuarios_trial
WHERE dias_restantes = 1
  AND telefone IS NOT NULL;
```

Copie o resultado e envie mensagens! 📱
