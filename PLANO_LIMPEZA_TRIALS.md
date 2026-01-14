# 🗑️ Limpeza de Trials + Sistema de Recuperação

## 📋 Plano de Ação Completo

### 1️⃣ Deletar Todos os Trials (Limpeza)

**Execute:** [`sql/deletar-todos-trials.sql`](sql/deletar-todos-trials.sql)

```sql
-- Deletar TUDO relacionado a trials
DELETE FROM vendas WHERE usuario_id IN (SELECT id FROM usuarios WHERE plano = 'trial');
DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE plano = 'trial');
DELETE FROM despesas WHERE usuario_id IN (SELECT id FROM usuarios WHERE plano = 'trial');
DELETE FROM assinaturas WHERE usuario_id IN (SELECT id FROM usuarios WHERE plano = 'trial');
DELETE FROM produtos WHERE usuario_id IN (SELECT id FROM usuarios WHERE plano = 'trial');
DELETE FROM usuarios WHERE plano = 'trial';
```

**Resultado:**
- ✅ Remove TODOS os trials (fake e reais)
- ✅ Mantém dados da Carol intactos (user_carol_gmail)
- ✅ Banco limpo e pronto para novos cadastros

---

### 2️⃣ Sistema de Alerta para Usuários Antigos

**Arquivos modificados:**

#### A. [login.html](login.html) - Detecta Trial Expirado
```javascript
// 🚨 NOVO: Detecta quando trial antigo tenta fazer login
if (response.status === 404) {
    showError('⚠️ Seu período de teste expirou. Por favor, faça um novo cadastro.');
    
    setTimeout(() => {
        if (confirm('Seu trial expirou! Deseja criar uma conta completa agora?')) {
            window.location.href = '/cadastro?email=' + email;
        }
    }, 1500);
}
```

**O que acontece:**
1. Pessoa tenta fazer login com email antigo
2. Sistema detecta que usuário não existe mais
3. Mostra mensagem: "Seu trial expirou"
4. Oferece botão para criar conta nova

---

#### B. [index.html](index.html) - Novo Fluxo de Trial
```javascript
// 🔥 NOVO: Trial agora cria conta completa no banco
await fetch('/.netlify/functions/start-trial', {
    method: 'POST',
    body: JSON.stringify({ email, nome, negocio, createAccount: true })
});

// Redireciona para completar cadastro (senha + telefone)
window.location.href = '/cadastro?trial=true&email=' + email;
```

**Novo fluxo:**
1. Pessoa pede trial no site
2. Sistema cria usuário no banco imediatamente
3. Redireciona para página de cadastro completar senha
4. Usuário já entra logado no sistema

---

### 3️⃣ Comunicação com Usuários Afetados

**Mensagem sugerida para enviar:**

```
📧 Email/WhatsApp:

Oi [Nome]! 👋

Percebemos que você estava testando o Lucro Certo. 

🔄 Fizemos uma atualização no sistema e seu trial anterior expirou.

Boa notícia: você pode criar uma nova conta completa e continuar testando!

✨ Basta acessar: https://sistemalucrocerto.com

Suas vantagens:
✅ 7 dias de teste grátis
✅ Todas as funcionalidades liberadas
✅ Suporte completo

Qualquer dúvida, estou aqui! 💖

Carol - Lucro Certo
```

---

### 4️⃣ Experiência do Usuário

#### Cenário 1: Usuário tenta fazer login
```
1. Acessa sistemalucrocerto.com/login
2. Digite email antigo + qualquer senha
3. Ver mensagem: "Seu trial expirou! Crie nova conta?"
4. Clica "Sim"
5. Redireciona para cadastro com email já preenchido
6. Cadastra senha e telefone
7. Entra no sistema com 7 dias trial novos
```

#### Cenário 2: Novo usuário pede trial
```
1. Acessa sistemalucrocerto.com
2. Clica "Testar Grátis"
3. Preenche nome, email, tipo negócio
4. Sistema cria conta no banco
5. Redireciona para completar senha
6. Entra logado com 7 dias trial
```

---

## 🎯 Resultado Final

### Antes da Limpeza
```
usuarios:
├── user_carol_gmail (Carol) ✅
├── trial_xxxx (pessoa 1 testando) ❌
├── trial_yyyy (pessoa 2 testando) ❌
└── trial_zzzz (dados fake) ❌
```

### Depois da Limpeza
```
usuarios:
└── user_carol_gmail (Carol) ✅

Sistema limpo e pronto!
```

### Quando usuários voltarem
```
usuarios:
├── user_carol_gmail (Carol) ✅
├── [UUID] (pessoa 1 - nova conta) ✅
└── [UUID] (pessoa 2 - nova conta) ✅

Todos com cadastros completos!
```

---

## ✅ Checklist de Execução

### Passo 1: Backup (Segurança)
- [ ] Exportar dados do Supabase (opcional)
- [ ] Anotar emails dos trials ativos para contato

### Passo 2: Executar Limpeza
- [ ] Abrir [Supabase SQL Editor](https://supabase.com/dashboard/project/ldfahdueqzgemplxrffm/sql)
- [ ] Copiar [`sql/deletar-todos-trials.sql`](sql/deletar-todos-trials.sql)
- [ ] Executar query por query (descomentando cada DELETE)
- [ ] Verificar que restou apenas 1 usuário (Carol)

### Passo 3: Deploy das Mudanças
- [ ] Commit arquivos modificados:
  - `login.html` (sistema de alerta)
  - `index.html` (novo fluxo trial)
- [ ] Push para GitHub
- [ ] Verificar deploy no Netlify

### Passo 4: Comunicar Usuários
- [ ] Enviar mensagem para pessoa 1 (email/WhatsApp)
- [ ] Enviar mensagem para pessoa 2 (email/WhatsApp)
- [ ] Explicar que podem criar nova conta

### Passo 5: Testar
- [ ] Criar novo trial no site
- [ ] Verificar se redireciona para cadastro
- [ ] Completar cadastro com senha
- [ ] Confirmar que usuário entra logado
- [ ] Verificar que tem 7 dias trial

---

## 💡 Vantagens do Novo Sistema

### Antes (Problema)
- ❌ Trials sem senha
- ❌ Dados incompletos
- ❌ Email fake (@temporario.com)
- ❌ IDs temporários (trial_xxx)
- ❌ Usuários não conseguem voltar

### Depois (Solução)
- ✅ Trial com senha obrigatória
- ✅ Cadastro completo desde o início
- ✅ Email real validado
- ✅ UUID do banco
- ✅ Usuários podem fazer login novamente

---

## 🚀 Pronto para Executar!

1. Execute [`sql/deletar-todos-trials.sql`](sql/deletar-todos-trials.sql)
2. Faça commit e push das mudanças
3. Avise os usuários afetados
4. Sistema pronto para novos trials! 🎉
