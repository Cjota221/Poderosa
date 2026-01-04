# 🐛 Correção: Sistema de Contagem de Dias do Trial

## 📋 Problema Identificado

Usuários do trial **não viam a contagem de dias** restantes. O banner mostrava apenas "Teste Grátis" sem informar quantos dias faltavam para expirar.

### 🔍 Causa Raiz

O sistema tinha **3 problemas**:

1. **Cadastro** salvava apenas `trial_start` (data de início)
2. **Login** NÃO recuperava a data de expiração do banco
3. **app.js** tentava calcular dias usando `trial_start`, mas:
   - No cadastro: salvava corretamente
   - No login posterior: **não recuperava do banco** ❌

**Resultado:** Usuário fazia login e o sistema **não sabia quando o trial expirava**.

---

## ✅ Solução Implementada

### 1. **Cadastro agora salva data de expiração** (index.html)

```javascript
// ANTES
const authData = {
    trialStartDate: new Date().toISOString()
};
localStorage.setItem('lucrocerto_trial_start', authData.trialStartDate);

// DEPOIS ✅
const trialStart = new Date();
const trialEnd = new Date();
trialEnd.setDate(trialEnd.getDate() + 7); // 7 dias

const authData = {
    trialStartDate: trialStart.toISOString(),
    trialEndDate: trialEnd.toISOString() // 🎯 NOVO
};

localStorage.setItem('lucrocerto_trial_start', trialStart.toISOString());
localStorage.setItem('lucrocerto_trial_end', trialEnd.toISOString()); // 🎯 NOVO
```

---

### 2. **Login recupera data de expiração do banco** (login.html)

```javascript
// ANTES
if (result.user.plano === 'trial') {
    localStorage.setItem('lucrocerto_trial', 'true');
    // ❌ Não salvava a data de expiração
}

// DEPOIS ✅
if (result.user.plano === 'trial' && result.subscription?.data_expiracao) {
    // Calcular data de início (7 dias antes da expiração)
    const dataExpiracao = new Date(result.subscription.data_expiracao);
    const dataInicio = new Date(dataExpiracao);
    dataInicio.setDate(dataInicio.getDate() - 7);
    
    // Salvar informações do trial
    localStorage.setItem('lucrocerto_trial', 'true');
    localStorage.setItem('lucrocerto_trial_start', dataInicio.toISOString());
    localStorage.setItem('lucrocerto_trial_end', dataExpiracao.toISOString()); // 🎯 NOVO
    
    const hoje = new Date();
    const diasRestantes = Math.max(0, Math.ceil((dataExpiracao - hoje) / (1000 * 60 * 60 * 24)));
    
    console.log(`🧪 Trial configurado: ${diasRestantes} dias restantes`);
}
```

---

### 3. **app.js prioriza data de expiração** (public/js/app.js)

```javascript
// ANTES
const trialStartDate = Storage.get('trial_start');
let daysLeft = 7;

if (trialStartDate) {
    const startDate = new Date(trialStartDate);
    const today = new Date();
    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    daysLeft = Math.max(0, 7 - diffDays);
}

// DEPOIS ✅
const trialEndDate = Storage.get('trial_end'); // 🎯 PRIORIZA DATA DE EXPIRAÇÃO
const trialStartDate = Storage.get('trial_start');
let daysLeft = 7;

if (trialEndDate) {
    // USAR DATA DE EXPIRAÇÃO DO BANCO (mais confiável)
    const endDate = new Date(trialEndDate);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    daysLeft = Math.max(0, diffDays);
    
    console.log('📅 Data expiração trial:', endDate.toLocaleDateString('pt-BR'));
    console.log('📊 Dias restantes:', daysLeft);
} else if (trialStartDate) {
    // FALLBACK: Calcular baseado na data de início
    const startDate = new Date(trialStartDate);
    const today = new Date();
    const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    daysLeft = Math.max(0, 7 - diffDays);
}
```

---

## 📊 Fluxo Corrigido

### Cenário 1: Novo Cadastro Trial

```
1. Usuário preenche formulário
   ↓
2. Sistema cria datas:
   - trial_start: 04/01/2026
   - trial_end: 11/01/2026 (+ 7 dias)
   ↓
3. Salva no localStorage:
   ✅ lucrocerto_trial_start
   ✅ lucrocerto_trial_end
   ↓
4. Salva no banco (Supabase):
   ✅ assinaturas.data_expiracao = 11/01/2026
   ↓
5. Banner mostra: "Teste Grátis - 7 dias restantes"
```

### Cenário 2: Login Posterior

```
1. Usuário faz login com email do trial
   ↓
2. Backend busca assinatura no banco
   ✅ Encontra: data_expiracao = 11/01/2026
   ↓
3. Frontend recebe:
   - result.subscription.data_expiracao
   - result.subscription.dias_restantes
   ↓
4. Salva no localStorage:
   ✅ lucrocerto_trial_end = 11/01/2026
   ✅ lucrocerto_trial_start = 04/01/2026 (calculado)
   ↓
5. app.js calcula dias:
   - Hoje: 08/01/2026
   - Expiração: 11/01/2026
   - Dias restantes: 3
   ↓
6. Banner mostra: "Teste Grátis - 3 dias restantes" 🎉
```

---

## 🎨 Banner Visual Atualizado

```
Dia 7-5: 🟢 Verde/Roxo
┌─────────────────────────────────────────────────┐
│ ✨ Teste Grátis - 5 dias restantes              │
│                              [Assinar Agora]    │
└─────────────────────────────────────────────────┘

Dia 4-3: 🟡 Amarelo
┌─────────────────────────────────────────────────┐
│ ⚠️ Seu teste expira em 3 dias!                 │
│                              [Assinar Agora]    │
└─────────────────────────────────────────────────┘

Dia 2: 🟠 Laranja
┌─────────────────────────────────────────────────┐
│ 🔥 Seu teste expira em 2 dias!                 │
│                              [Assinar Agora]    │
└─────────────────────────────────────────────────┘

Dia 1: 🔴 Vermelho
┌─────────────────────────────────────────────────┐
│ 🔥 ÚLTIMO DIA de teste! Assine para continuar  │
│                              [Assinar Agora]    │
└─────────────────────────────────────────────────┘
```

---

## 🧪 Como Testar

### Teste 1: Novo Trial

```bash
1. Limpar localStorage
2. Ir para landing page (index.html)
3. Criar conta trial
4. Verificar console:
   - ✅ "Trial criado: 7 dias restantes"
   - ✅ "Data início: 04/01/2026"
   - ✅ "Data expiração: 11/01/2026"
5. Ver banner: "Teste Grátis - 7 dias restantes"
```

### Teste 2: Login Existente

```bash
1. Fazer logout
2. Fazer login com email do trial
3. Verificar console:
   - ✅ "Trial configurado: X dias restantes"
   - ✅ "Data expiração: 11/01/2026"
4. Ver banner com contagem correta
```

### Teste 3: Verificar Banco de Dados

```sql
-- Ver assinaturas trial ativas
SELECT 
    u.email,
    u.nome,
    a.plano,
    a.data_inicio,
    a.data_expiracao,
    DATE_PART('day', a.data_expiracao - NOW()) as dias_restantes
FROM assinaturas a
JOIN usuarios u ON a.usuario_id = u.id
WHERE a.plano = 'trial'
  AND a.status = 'active'
ORDER BY a.data_expiracao;
```

---

## 🔍 Logs para Debug

O sistema agora gera logs detalhados:

```javascript
// Cadastro
console.log('🧪 Trial criado:', {
    email: 'usuario@email.com',
    inicio: '04/01/2026',
    expiracao: '11/01/2026',
    diasRestantes: 7
});

// Login
console.log('🧪 Configurando modo TRIAL...');
console.log('🧪 Trial configurado: 3 dias restantes');
console.log('📅 Data início: 04/01/2026');
console.log('📅 Data expiração: 11/01/2026');

// app.js
console.log('📅 Data expiração trial: 11/01/2026');
console.log('📊 Dias restantes calculados: 3');
```

---

## ✅ Resultado Final

**Antes:**
```
❌ Banner: "Teste Grátis" (sem contagem)
❌ Usuário não sabe quando expira
❌ Dados perdidos ao fazer login
```

**Depois:**
```
✅ Banner: "Teste Grátis - 3 dias restantes"
✅ Contagem precisa baseada no banco
✅ Sincronização entre cadastro e login
✅ Cores progressivas (verde → amarelo → laranja)
✅ Logs detalhados para debug
```

---

## 📦 Arquivos Modificados

1. **index.html** (linha ~2380-2410)
   - Salva `trial_end` no cadastro
   - Log de criação do trial

2. **login.html** (linha ~552-590)
   - Recupera `data_expiracao` do banco
   - Calcula e salva `trial_start` e `trial_end`
   - Log de configuração do trial

3. **public/js/app.js** (linha ~5875-5920)
   - Prioriza `trial_end` sobre `trial_start`
   - Cálculo preciso de dias restantes
   - Fallback para data de início
   - Logs detalhados

---

## 🚀 Deploy

Alterações já estão no ar:
- ✅ Commit: `43b4168`
- ✅ Push: `main`
- ✅ Netlify: Deploy automático

---

## 📞 Suporte

Se ainda houver problemas:
1. Verificar console do navegador (F12)
2. Procurar logs: `🧪 Trial` ou `📅 Data`
3. Verificar localStorage: `lucrocerto_trial_end`
4. Consultar banco: `SELECT * FROM assinaturas WHERE plano = 'trial'`
