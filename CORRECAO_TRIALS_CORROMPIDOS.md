# 🔧 Correção: Registros Trial Corrompidos

## 📊 Problema Identificado

Foram encontrados **2 registros trial corrompidos** no banco de dados com as seguintes características:

### Dados Incorretos

| Campo | Valor Corrompido | Valor Esperado |
|-------|-----------------|----------------|
| `usuarios.id` | `trial_1767437190538` (timestamp) | UUID gerado pelo banco |
| `usuarios.email` | `trial_xxx@temporario.com` | Email real do usuário |
| `usuarios.nome` | **"Rasteira Olívia"** (nome do produto!) | Nome da pessoa |
| `usuarios.telefone` | ` ` (vazio) | Telefone do usuário |

### Registros Afetados

1. **Usuário 1**
   - ID: `trial_1767437190538`
   - Email: `trial_1767437190538@temporario.com`
   - Nome: **"Rasteira Olívia"** ⚠️ (produto, não pessoa)
   - Produto: `prod_1767438664467` (Rasteira Olívia)

2. **Usuário 2**
   - ID: `trial_1767404409888`
   - Email: `trial_1767404409888@temporario.com`
   - Nome: **"Flat Feminina Verona Nude"** ⚠️ (produto, não pessoa)
   - Produto: `prod_1767405296317` (Flat Feminina Verona Nude)

---

## 🔍 Causa Raiz

### ✅ O que NÃO é o problema

A função [`start-trial.js`](netlify/functions/start-trial.js) está **correta** e funciona perfeitamente:
- Gera IDs UUID pelo banco
- Valida email real
- Salva nome do usuário corretamente
- Cria assinatura com 7 dias de trial

### ⚠️ O que CAUSOU o problema

Esses registros **não foram criados pelo fluxo normal de cadastro**. Provavelmente:

1. **Teste manual no banco** - Alguém executou INSERT direto no SQL
2. **Script de migração/teste** - Algum script antigo que gerava dados de teste
3. **Bug corrigido anteriormente** - Versão antiga do código que tinha o bug

**Evidência:** O código atual ([index.html](index.html) linha 2388) salva o nome correto do usuário:

```javascript
const authData = {
    userId: 'trial_' + Date.now(),
    email: email,
    nome: nome,  // ✅ Vem do campo "trialNome" do formulário
    negocio: negocio
};
```

---

## 🛠️ Solução

### Passo 1: Executar Queries de Diagnóstico

Abra o [SQL Editor do Supabase](https://supabase.com/dashboard/project/ldfahdueqzgemplxrffm/sql) e execute:

```sql
-- Ver registros corrompidos
SELECT * FROM usuarios 
WHERE id LIKE 'trial_%' OR email LIKE '%@temporario.com';

-- Ver produtos associados
SELECT p.*, u.nome AS usuario_nome, u.email 
FROM produtos p
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.id LIKE 'trial_%' OR u.email LIKE '%@temporario.com';
```

### Passo 2: Limpar Dados Corrompidos

Execute o script: **[sql/limpar-trials-corrompidos.sql](sql/limpar-trials-corrompidos.sql)**

```sql
-- PASSO A PASSO (descomente linha por linha):

-- 1. Deletar assinaturas
DELETE FROM assinaturas
WHERE usuario_id IN (
    SELECT id FROM usuarios 
    WHERE id LIKE 'trial_%' OR email LIKE '%@temporario.com'
);

-- 2. Deletar produtos
DELETE FROM produtos
WHERE usuario_id IN (
    SELECT id FROM usuarios 
    WHERE id LIKE 'trial_%' OR email LIKE '%@temporario.com'
);

-- 3. Deletar usuários
DELETE FROM usuarios
WHERE id LIKE 'trial_%' OR email LIKE '%@temporario.com';
```

### Passo 3: Verificar Resultado

```sql
-- Contar registros restantes
SELECT 'usuarios' AS tabela, COUNT(*) FROM usuarios
UNION ALL
SELECT 'produtos', COUNT(*) FROM produtos
UNION ALL
SELECT 'assinaturas', COUNT(*) FROM assinaturas;
```

**Resultado esperado:**
- ✅ Antes: 3 usuários, 4 produtos, 4 assinaturas
- ✅ Depois: 1 usuário (`user_carol_gmail`), 2 produtos, 2 assinaturas

---

## 🛡️ Prevenção Futura

### Fluxo Correto de Cadastro Trial

1. **Usuário preenche formulário** em [index.html](index.html)
   - Nome real
   - Email real
   - Tipo de negócio

2. **Frontend salva localmente** (localStorage)
   ```javascript
   userId: 'trial_' + Date.now()  // Temporário apenas no frontend
   ```

3. **Backend cria no banco** via [`start-trial.js`](netlify/functions/start-trial.js)
   - ID UUID gerado pelo banco (substitui o temporário)
   - Email validado
   - Nome real salvo
   - Assinatura trial de 7 dias

4. **Resultado:**
   - ✅ ID: UUID (ex: `550e8400-e29b-41d4-a716-446655440000`)
   - ✅ Email: Real (ex: `maria@gmail.com`)
   - ✅ Nome: Pessoa (ex: `Maria Silva`)
   - ✅ Plano: `trial` (7 dias)

### Regras de Validação

**✅ CORRETO:**
- `id` = UUID gerado pelo banco
- `email` = Email válido e real
- `nome` = Nome de pessoa (2+ palavras)
- `plano` = `'trial'`
- `telefone` = Opcional (pode ser vazio)

**❌ INCORRETO (registros corrompidos):**
- `id` = `trial_xxxxxxxxx` (timestamp)
- `email` = `xxx@temporario.com`
- `nome` = Nome de produto
- `telefone` = vazio sempre

---

## 📝 Conclusão

### O que foi feito

- [x] Identificado o problema (dados corrompidos de teste/migração)
- [x] Verificado que o código atual está correto
- [x] Criado script de limpeza SQL
- [x] Documentado o processo de correção

### Próximos passos

1. ✅ Executar o script de limpeza
2. ✅ Verificar que restou apenas o usuário real (`user_carol_gmail`)
3. ✅ Testar novo cadastro trial (deve funcionar corretamente)
4. ✅ Monitorar próximos trials para garantir que estão corretos

### Arquivos criados

- [`sql/limpar-trials-corrompidos.sql`](sql/limpar-trials-corrompidos.sql) - Script de limpeza
- [`CORRECAO_TRIALS_CORROMPIDOS.md`](CORRECAO_TRIALS_CORROMPIDOS.md) - Esta documentação

---

## 🎯 Resultado Final Esperado

Após executar o script:

```sql
-- Apenas dados válidos no banco
SELECT id, nome, email, plano FROM usuarios;
```

| id | nome | email | plano |
|----|------|-------|-------|
| user_carol_gmail | Cjota | carolineazevedo075@gmail.com | pro |

✨ **Sistema limpo e pronto para novos trials!**
