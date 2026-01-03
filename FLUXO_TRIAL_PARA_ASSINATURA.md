# 🔄 Fluxo: Trial → Assinatura Paga

## 📊 Diagrama do Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. USUÁRIO ENTRA NO TRIAL                    │
│                                                                 │
│  Landing Page (index.html)                                      │
│    ↓                                                            │
│  Cadastro com Email                                             │
│    ↓                                                            │
│  localStorage salva:                                            │
│    • lucrocerto_trial = { email, nome, userId }                 │
│    • lucrocerto_user = { email, nome, id }                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              2. USUÁRIO USA O APP NO TRIAL (7 DIAS)             │
│                                                                 │
│  • Adiciona produtos                                            │
│  • Cria clientes                                                │
│  • Faz vendas                                                   │
│  • Gera catálogos                                               │
│                                                                 │
│  TODOS OS DADOS SALVOS NO localStorage COM O EMAIL DELE         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│           3. USUÁRIO DECIDE ASSINAR ANTES DE EXPIRAR            │
│                                                                 │
│  Clica em "Assinar Agora" no banner do trial                    │
│    ↓                                                            │
│  Redireciona para:                                              │
│    /checkout?source=trial_banner                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              4. CHECKOUT DETECTA USUÁRIO LOGADO ✨               │
│                                                                 │
│  checkout.html → autoFillUserData()                             │
│                                                                 │
│  Busca dados em ordem de prioridade:                            │
│    1. lucrocerto_user                                           │
│    2. lucrocerto_auth                                           │
│    3. lucrocerto_trial                                          │
│                                                                 │
│  Se encontrar:                                                  │
│    ✅ Preenche campo "email" automaticamente                    │
│    ✅ Preenche campo "nome" automaticamente                     │
│    ✅ Bloqueia edição do email (read-only)                      │
│    ✅ Mostra indicador "✓ Usuário identificado"                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  5. USUÁRIO PREENCHE DADOS                      │
│                                                                 │
│  Email: [email protected] (BLOQUEADO)               │
│  Nome: Carol (já preenchido)                                    │
│  Sobrenome: Azevedo                                             │
│  CPF: 000.000.000-00                                            │
│  Telefone: (62) 98223-7075                                      │
│                                                                 │
│  Escolhe método: [Cartão] ou [PIX]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              6. SISTEMA ENVIA DADOS PARA BACKEND ✨              │
│                                                                 │
│  checkout.html coleta:                                          │
│    • email: [email protected]                       │
│    • isExistingUser: true                                       │
│    • userId: "123abc" (do localStorage)                         │
│                                                                 │
│  Envia para:                                                    │
│    • process-payment.js (cartão)                                │
│    • pix-payment.js (PIX)                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│           7. BACKEND ASSOCIA PAGAMENTO AO USUÁRIO ✨             │
│                                                                 │
│  process-payment.js / pix-payment.js:                           │
│                                                                 │
│  if (isExistingUser && userId) {                                │
│    // Usar o ID fornecido                                       │
│    userIdToUse = userId;                                        │
│                                                                 │
│    // Atualizar plano do usuário                                │
│    UPDATE usuarios                                              │
│    SET plano = 'pro'                                            │
│    WHERE id = userId;                                           │
│                                                                 │
│    // Criar assinatura ativa                                    │
│    INSERT INTO assinaturas (                                    │
│      usuario_id: userId,                                        │
│      plano: 'pro',                                              │
│      status: 'active',                                          │
│      data_expiracao: +30 dias                                   │
│    );                                                           │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│            8. SISTEMA ATUALIZA STATUS DO USUÁRIO                │
│                                                                 │
│  Banco de Dados:                                                │
│    usuarios.plano = 'trial' → 'pro'                             │
│                                                                 │
│  localStorage:                                                  │
│    lucrocerto_auth = {                                          │
│      email: [email protected],                      │
│      plano: 'pro',                                              │
│      userId: "123abc"                                           │
│    }                                                            │
│                                                                 │
│  Remove trial:                                                  │
│    localStorage.removeItem('lucrocerto_trial')                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              9. USUÁRIO VOLTA PARA O APP                        │
│                                                                 │
│  • Mesmo email                                                  │
│  • Mesmos dados (produtos, clientes, vendas)                    │
│  • Agora com plano PRO ativo                                    │
│  • Sem limite de tempo                                          │
│                                                                 │
│  ✅ TUDO PRESERVADO!                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Pontos-Chave da Implementação

### 1. **Detecção Automática de Usuário** ✨

```javascript
// checkout.html
function autoFillUserData() {
    const userData = JSON.parse(localStorage.getItem('lucrocerto_user') || '{}');
    const trialData = JSON.parse(localStorage.getItem('lucrocerto_trial') || '{}');
    const authData = JSON.parse(localStorage.getItem('lucrocerto_auth') || '{}');
    
    // Prioridade: userData > authData > trialData
    let userEmail = userData.email || authData.email || trialData.email;
    let userName = userData.nome || authData.nome || trialData.nome;
    
    if (userEmail) {
        // Preenche e bloqueia email
        emailInput.value = userEmail;
        emailInput.readOnly = true;
        emailInput.style.background = '#f5f5f5';
        
        // Mostra indicador
        indicator.innerHTML = '✓ Usuário identificado';
    }
}
```

### 2. **Identificação no Pagamento** 🎯

```javascript
// checkout.html - Ao processar pagamento
const existingUserData = JSON.parse(localStorage.getItem('lucrocerto_user') || '{}');
const isExistingUser = !!existingUserData.email;
const existingUserId = existingUserData.id;

// Envia para backend
body: JSON.stringify({
    // ... outros dados ...
    isExistingUser: isExistingUser,  // ✨ NOVO
    userId: existingUserId           // ✨ NOVO
})
```

### 3. **Backend Associa Corretamente** 🔗

```javascript
// netlify/functions/process-payment.js
const { isExistingUser, userId } = body;

if (isExistingUser && userId) {
    // Usar ID fornecido
    userIdToUse = userId;
    
    // Atualizar plano
    await supabase
        .from('usuarios')
        .update({ plano: plano })
        .eq('id', userId);
} else {
    // Criar novo usuário
}
```

---

## 📝 Cenários de Uso

### ✅ Cenário 1: Trial → Assinar no meio do trial

1. Usuário entra no trial: `carol@email.com`
2. Adiciona 5 produtos
3. Cria 3 clientes
4. No dia 3, decide assinar
5. Checkout já vem com email preenchido
6. Faz pagamento
7. **Sistema associa ao mesmo usuário**
8. Produtos e clientes preservados ✅

### ✅ Cenário 2: Trial expira → Assina depois

1. Usuário usa trial por 7 dias
2. Trial expira, mostra modal de expiração
3. Clica em "Assinar Agora"
4. Checkout detecta email do trial expirado
5. Preenche automaticamente
6. Faz pagamento
7. **Sistema reativa usuário com plano PRO**
8. Todos os dados voltam ✅

### ✅ Cenário 3: Usuário novo (sem trial)

1. Vai direto para checkout da landing
2. Não tem dados no localStorage
3. Preenche tudo manualmente
4. Sistema cria novo usuário
5. Normal ✅

---

## 🔒 Proteções Implementadas

1. **Email não pode ser editado** se usuário já está logado
2. **Sistema sempre usa o userId correto** (do trial ou existente)
3. **Dados do trial são preservados** no banco
4. **Indicador visual** mostra que usuário foi identificado
5. **Logs no backend** para debug (`console.log('🔍 Verificação de usuário')`)

---

## 🚀 Como Testar

### Teste 1: Trial → Checkout

```bash
1. Abra index.html
2. Faça cadastro trial com: teste@email.com
3. Entre no app, adicione dados
4. Clique no banner "Assinar Agora"
5. Verificar: Email já está preenchido e bloqueado ✅
6. Pagar com cartão de teste
7. Verificar: Dados preservados no app ✅
```

### Teste 2: Verificar no Banco

```sql
-- Ver se o usuário foi atualizado corretamente
SELECT email, plano, created_at, updated_at 
FROM usuarios 
WHERE email = 'teste@email.com';

-- Ver assinaturas do usuário
SELECT u.email, a.plano, a.status, a.data_expiracao
FROM assinaturas a
JOIN usuarios u ON a.usuario_id = u.id
WHERE u.email = 'teste@email.com'
ORDER BY a.created_at DESC;
```

---

## 📊 Fluxo de Dados no localStorage

```javascript
// Estado 1: Trial ativo
localStorage = {
  lucrocerto_trial: {
    email: "carol@email.com",
    nome: "Carol",
    userId: "123abc",
    dataExpiracao: "2026-01-10"
  },
  lucrocerto_user: {
    email: "carol@email.com",
    nome: "Carol",
    id: "123abc"
  }
}

// Estado 2: Checkout detecta usuário
checkout.html → autoFillUserData()
  ↓
Preenche email: carol@email.com (read-only)
Envia: isExistingUser=true, userId="123abc"

// Estado 3: Após pagamento aprovado
localStorage = {
  lucrocerto_auth: {
    email: "carol@email.com",
    nome: "Carol",
    plano: "pro",
    userId: "123abc"
  },
  lucrocerto_user: {
    email: "carol@email.com",
    nome: "Carol",
    id: "123abc"
  }
  // lucrocerto_trial foi removido
}
```

---

## ✅ Resultado Final

**Problema resolvido:**
- ✅ Sistema identifica usuário do trial automaticamente
- ✅ Email preenchido e bloqueado no checkout
- ✅ Backend associa pagamento ao usuário correto
- ✅ Dados do trial preservados (produtos, clientes, vendas)
- ✅ Usuário continua com mesmo email e dados após assinar
- ✅ Funciona com cartão e PIX
- ✅ Indicador visual para usuário saber que foi identificado

**Antes:**
```
Trial → Checkout → Cria novo usuário → Perde dados do trial ❌
```

**Agora:**
```
Trial → Checkout (email auto) → Atualiza usuário existente → Preserva tudo ✅
```

---

## 🎨 Visual no Checkout

```
┌─────────────────────────────────────────────────┐
│  Email                                          │
│  ┌──────────────────────────────────────────┐  │
│  │ carol@email.com                🔒       │  │ (bloqueado)
│  └──────────────────────────────────────────┘  │
│  ✓ Usuário identificado                         │ (verde)
│                                                 │
│  Nome                                           │
│  ┌──────────────────────────────────────────┐  │
│  │ Carol                                    │  │ (preenchido)
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 📞 Contato

**Sistema desenvolvido para Lucro Certo**  
WhatsApp: (62) 98223-7075
