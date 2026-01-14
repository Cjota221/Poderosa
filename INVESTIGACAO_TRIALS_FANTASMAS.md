# 🔍 INVESTIGAÇÃO: Trials Fantasmas - Análise Completa

## 📊 Resumo Executivo

**Encontrados:** 2 registros trial corrompidos + 1 trial válido (Carol)

### Registros Corrompidos Identificados:
```
1. trial_1767404409888 - Flat Feminina Verona Nude
2. trial_1767437190538 - Rasteira Olívia
```

### Registro Válido (Protegido):
```
3. user_carol_gmail - Cjota (carolineazevedo075@gmail.com)
```

---

## 🕵️ Análise Técnica Detalhada

### 1. Padrão de IDs Suspeitos

| ID | Tipo | Análise |
|----|------|---------|
| `trial_1767404409888` | ❌ Timestamp (ms) | Gerado manualmente, não pelo banco |
| `trial_1767437190538` | ❌ Timestamp (ms) | Gerado manualmente, não pelo banco |
| `user_carol_gmail` | 🟡 Customizado | ID legacy válido |

**Evidência:**
- IDs corrompidos seguem padrão: `trial_[timestamp_milissegundos]`
- Banco Supabase deveria gerar UUIDs automáticos
- IDs timestamp = **criados via código frontend**

---

### 2. Emails Falsos Sistemáticos

```javascript
trial_1767404409888@temporario.com  // ❌ Gerado automaticamente
trial_1767437190538@temporario.com  // ❌ Gerado automaticamente
carolineazevedo075@gmail.com        // ✅ Email real
```

**Padrão identificado:**
- Domínio `@temporario.com` não é real
- Email segue formato: `[id_timestamp]@temporario.com`
- **Conclusão:** Sistema frontend gera email fake quando usuário não fornece

---

### 3. Bug Crítico: Nome Duplicado

| Usuário ID | Nome do Usuário | Nome do Produto | Status |
|------------|----------------|-----------------|--------|
| trial_1767437190538 | **Rasteira Olívia** | **Rasteira Olívia** | 🔴 DUPLICADO |
| trial_1767404409888 | **Flat Feminina Verona Nude** | **Flat Feminina Verona Nude** | 🔴 DUPLICADO |
| user_carol_gmail | Cjota | Rasteirinha | ✅ OK |

**Causa raiz identificada:**
Algum código está pegando `produto.nome` e salvando como `usuario.nome`

---

### 4. Completude de Cadastro

| Campo | trial_xxx | Carol |
|-------|-----------|-------|
| senha_hash | ❌ null | ✅ Preenchido |
| nome | ❌ Nome produto | ✅ Nome pessoa |
| email | ❌ Fake | ✅ Real |
| telefone | ❌ Vazio | ✅ Preenchido |
| slug | ❌ null | ✅ Preenchido |
| cadastro_completo | ❌ false | ✅ true |
| tour_concluido | ❌ false | ? |

**Score de completude:**
- Trials corrompidos: 0/5 ⭐
- Carol: 5/5 ⭐⭐⭐⭐⭐

---

### 5. Cronologia Temporal

```
2026-01-04 12:35:55 - trial_1767404409888 criado
2026-01-04 12:35:55 - trial_1767437190538 criado
```

**Análise temporal:**
- ⚠️ Ambos criados no **MESMO SEGUNDO**
- ⚠️ `created_at` = `updated_at` (nunca modificados)
- **Conclusão:** Criação automatizada via script/teste

---

## 🎯 Fluxos de Criação Identificados

### Fluxo A: Trial via Landing Page (index.html)
```javascript
// CÓDIGO ATUAL (ANTIGO):
const authData = {
    userId: 'trial_' + Date.now(),  // ❌ BUG: ID timestamp
    email: email,                    // ✅ Email fornecido pelo usuário
    nome: nome,                      // ✅ Nome fornecido pelo usuário
};

// Backend: start-trial.js
// ✅ Cria usuário correto no banco
// ✅ Gera UUID automático
```

**Status:** ✅ Código corrigido no commit anterior

---

### Fluxo B: Cadastro após Pagamento (create-user.js)
```javascript
const { data: newUser } = await supabase
    .from('usuarios')
    .insert({
        email: email,
        nome: nome || email.split('@')[0],
        slug: userSlug
    })
    .select()
    .single();
```

**Status:** ✅ Código correto, cria UUID automático

---

### Fluxo C: Completar Cadastro (register.js)
```javascript
// Atualiza usuário existente com senha
const { error: updateError } = await supabase
    .from('usuarios')
    .update({
        senha_hash: await hashPassword(password),
        nome: nome || user.nome,
        telefone: telefone || null,
        cadastro_completo: true
    })
    .eq('id', userId);
```

**Status:** ✅ Código correto, apenas UPDATE

---

### Fluxo D: Start Trial (start-trial.js)
```javascript
const { data: newUser } = await supabase
    .from('usuarios')
    .insert({
        email: email.toLowerCase(),
        nome: nome || email.split('@')[0],  // ✅ Nome correto
        telefone: '',
        plano: 'trial'
    })
    .select()
    .single();
```

**Status:** ✅ Código correto

---

## 🔎 Origem Provável dos Dados Corrompidos

### Hipótese Principal: **Script de Teste/Migração Manual**

**Evidências:**
1. ✅ IDs timestamp (não gerados pelo banco)
2. ✅ Emails fake (@temporario.com)
3. ✅ Criados simultaneamente (mesmo segundo)
4. ✅ Sem senha (nunca completaram cadastro)
5. ✅ Nome duplicado (bug na query de inserção)
6. ✅ Nunca modificados (created_at = updated_at)

**Possíveis origens:**
- [ ] Script SQL executado manualmente no Supabase
- [ ] Ferramenta de teste/seeding
- [ ] Código frontend antigo (já corrigido)
- [ ] Migration script que tinha bug

---

### Hipótese Secundária: **Cadastro via Catálogo (?)

Verificar se existe algum fluxo onde:
1. Usuário cria produto ANTES de criar conta
2. Sistema tenta criar usuario + produto juntos
3. Bug inverte os dados (nome produto → nome usuário)

---

## 🐛 Bug Específico: Inversão de Dados

### Teoria do Bug:

Algum código (provavelmente antigo/depreciado) fez:

```javascript
// ❌ ERRADO (código hipotético que causou o bug):
const usuario = {
    id: 'trial_' + Date.now(),
    nome: produtoNome,  // BUG: pegou nome do produto!
    email: 'trial_' + Date.now() + '@temporario.com'
};

const produto = {
    id: 'prod_' + Date.now(),
    nome: produtoNome,
    usuario_id: usuario.id
};

// Insere ambos
await db.insert('usuarios', usuario);
await db.insert('produtos', produto);
```

**Resultado:**
- Usuario.nome = Produto.nome ✅ (confirmado nos dados)
- IDs timestamp ✅ (confirmado)
- Email fake ✅ (confirmado)

---

## 📋 Queries de Investigação Criadas

**Arquivo:** [`sql/investigar-trials-fantasmas.sql`](sql/investigar-trials-fantasmas.sql)

### Análises Incluídas:
1. ✅ Padrão temporal de criação
2. ✅ Análise de formato de IDs
3. ✅ Completude de cadastro
4. ✅ Detecção de nome duplicado
5. ✅ Ordem de criação (usuário vs produto)
6. ✅ Campos de tracking
7. ✅ Análise de assinaturas
8. ✅ Busca por triggers/functions
9. ✅ Resumo consolidado

---

## ✅ Scripts de Correção

### 1. Deletar Dados Corrompidos
**Arquivo:** [`sql/deletar-todos-trials.sql`](sql/deletar-todos-trials.sql)

**Proteção implementada:**
```sql
DELETE FROM usuarios 
WHERE plano = 'trial' 
AND email != 'carolineazevedo075@gmail.com';  -- Protege Carol
```

**O que deleta:**
- ✅ 2 usuários fake (trial_xxx)
- ✅ 2 produtos associados
- ✅ 2 assinaturas fake
- ❌ Carol é mantida intacta

---

### 2. Verificar Trials Ativos
**Arquivo:** [`sql/verificar-trials-ativos.sql`](sql/verificar-trials-ativos.sql)

Mostra quem está usando vs quem é lixo.

---

## 🛡️ Prevenção Futura

### Medidas Implementadas:

1. **Frontend (index.html):**
   - ✅ Removido criação de ID temporário
   - ✅ Redirecionamento para cadastro completo
   - ✅ Validação de email obrigatória

2. **Backend (start-trial.js):**
   - ✅ Validação de email
   - ✅ UUID gerado automaticamente
   - ✅ Nome real obrigatório

3. **Login (login.html):**
   - ✅ Detecção de trial expirado
   - ✅ Redirecionamento para novo cadastro

---

## 🎯 Próximos Passos

### Imediato:
1. [ ] Executar [`sql/investigar-trials-fantasmas.sql`](sql/investigar-trials-fantasmas.sql) no Supabase
2. [ ] Analisar resultados para confirmar hipóteses
3. [ ] Executar [`sql/deletar-todos-trials.sql`](sql/deletar-todos-trials.sql)
4. [ ] Verificar que restou apenas Carol

### Curto Prazo:
1. [ ] Buscar por código frontend que cria produtos com usuário temporário
2. [ ] Verificar se há migrations antigas com bugs
3. [ ] Revisar funções do catálogo que possam criar usuários
4. [ ] Adicionar constraints no banco:
   ```sql
   ALTER TABLE usuarios 
   ADD CONSTRAINT email_formato_valido 
   CHECK (email NOT LIKE '%@temporario.com');
   ```

### Médio Prazo:
1. [ ] Implementar logging de criação de usuários
2. [ ] Adicionar validação de nome (não pode ser nome de produto)
3. [ ] Monitorar novos trials por 30 dias

---

## 📊 Resultado Esperado

### Antes:
```
usuarios: 3 (2 fake + Carol)
produtos: 4 (2 fake + 2 Carol)
assinaturas: 4 (2 fake + 2 Carol)
```

### Depois:
```
usuarios: 1 (Carol)
produtos: 2 (Carol)
assinaturas: 2 (Carol)
```

### Banco Limpo! ✨
