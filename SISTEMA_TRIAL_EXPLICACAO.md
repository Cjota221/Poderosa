# 🧪 Sistema de Trial - Como Funciona

## 📋 Resumo Executivo

O sistema oferece **7 dias de teste grátis** para novos usuários. A contagem é automática e baseada na data de criação da conta no banco de dados.

---

## 🔄 Fluxo Completo do Trial

### 1️⃣ **Quando o Usuário Inicia o Trial**

**Local:** `netlify/functions/start-trial.js`

```javascript
// Quando o usuário se cadastra para trial:
1. Verifica se o email já existe no banco
2. Cria o usuário com plano = 'trial'
3. Salva created_at (data de criação) automaticamente
4. Cria registro na tabela assinaturas com:
   - data_inicio: agora
   - data_expiracao: agora + 7 dias
   - status: 'active'
```

**O que acontece:**
- ✅ Usuário é criado no banco com `plano: 'trial'`
- ✅ Campo `created_at` é preenchido automaticamente pelo Postgres
- ✅ Assinatura trial é criada com data de expiração (hoje + 7 dias)
- ✅ Retorna `daysLeft: 7` para o frontend

---

### 2️⃣ **Como a Contagem dos 7 Dias Funciona**

**A contagem é baseada em 2 pontos:**

#### A) No Backend (Fonte da Verdade)
**Local:** `netlify/functions/check-email.js` e `get-user-plan.js`

```javascript
// Calcular dias desde a criação
const createdAt = new Date(usuario.created_at);
const now = new Date();
const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

// Trial expira após 7 dias
const trialExpired = usuario.plano === 'trial' && daysSinceCreation >= 7;
const daysLeft = Math.max(0, 7 - daysSinceCreation);
```

**Exemplo:**
- **Dia 0** (criação): `daysLeft = 7`
- **Dia 1**: `daysLeft = 6`
- **Dia 2**: `daysLeft = 5`
- **Dia 6**: `daysLeft = 1`
- **Dia 7**: `daysLeft = 0` → **EXPIRADO!**

#### B) No Frontend (Sincroniza com Backend)
**Local:** `public/js/app.js` - função `initTrialMode()`

```javascript
// 1. Busca data de expiração do banco
const trialEndDate = Storage.get('trial_end');

// 2. Calcula dias restantes
const endDate = new Date(trialEndDate);
const today = new Date();
const diffTime = endDate - today;
const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
```

---

### 3️⃣ **O que Acontece Durante o Trial**

**Banner Visual (muda com os dias):**

#### 🟣 **7-3 dias restantes** (Banner Roxo)
```
🌟 Teste Grátis - X dias restantes
```
- Cor: Roxo/Azul suave
- Mensagem: Tranquila, sem urgência

#### 🟡 **2 dias restantes** (Banner Amarelo)
```
⚠️ Seu teste expira em 2 dias! Faça upgrade para não perder acesso
```
- Cor: Amarelo
- Mensagem: Aviso leve

#### 🟠 **1 dia restante** (Banner Laranja)
```
🔥 ÚLTIMO DIA de teste! Assine agora para continuar usando
```
- Cor: Laranja/Vermelho
- Mensagem: Urgência alta

---

### 4️⃣ **O que Acontece Quando os 7 Dias Expiram**

#### No Backend:
**Local:** `netlify/functions/get-user-plan.js`

```javascript
if (usuario.plano === 'trial' && daysSinceCreation >= 7) {
    return {
        isExpired: true,
        isTrial: true,
        status: 'expired',
        message: 'Seu período de teste expirou'
    }
}
```

#### No Frontend:
**Local:** `public/js/app.js` - função `showTrialExpiredModal()`

**O que acontece:**
1. ❌ Banner some
2. 🚫 Modal de bloqueio aparece em tela cheia
3. 🔒 Usuário NÃO consegue usar o app
4. 💳 Único botão disponível: "Assinar Agora"

**Modal exibe:**
```
🚫 Seu Teste Grátis Expirou

Seus 7 dias de teste chegaram ao fim!
Seus dados estão salvos e seguros.

Assine agora para continuar usando TODAS as funcionalidades:
✅ Dashboard completo com métricas
✅ Produtos, clientes e vendas ilimitados
✅ Precificação inteligente
✅ Catálogo digital profissional
✅ Relatórios e controle financeiro

[🚀 Assinar Agora - A partir de R$ 34,90/mês]

[Sair da conta]
```

---

## 🔑 Pontos-Chave do Sistema

### ✅ O que está CORRETO e FUNCIONANDO:

1. **Criação do Trial**
   - ✅ Usuário é criado no banco
   - ✅ `created_at` é salvo automaticamente
   - ✅ Data de expiração é calculada (hoje + 7 dias)

2. **Contagem dos Dias**
   - ✅ Backend calcula baseado em `created_at`
   - ✅ Frontend sincroniza com backend
   - ✅ Banner muda de cor conforme dias restantes

3. **Expiração**
   - ✅ Após 7 dias, trial é marcado como expirado
   - ✅ Modal de bloqueio aparece
   - ✅ Usuário não consegue usar o app

4. **Sincronização**
   - ✅ Toda vez que usuário faz login, dados são sincronizados
   - ✅ `get-user-plan` retorna status atualizado
   - ✅ Frontend atualiza localStorage com dados do banco

### 🔍 Como Verificar se Está Funcionando:

#### No Banco de Dados (Supabase):
```sql
SELECT 
    id,
    email,
    nome,
    plano,
    created_at,
    DATE_PART('day', NOW() - created_at) as dias_desde_criacao
FROM usuarios
WHERE plano = 'trial';
```

#### No Console do Navegador:
```javascript
// Ver dados do trial
const auth = JSON.parse(localStorage.getItem('lucrocerto_auth'));
console.log('Plano:', auth.plano);
console.log('Dias restantes:', auth.daysLeft);
console.log('Expirado?', auth.isExpired);
```

---

## 🎯 Exemplos Práticos

### Exemplo 1: Usuário Novo (Dia 0)
```javascript
// Backend retorna:
{
    plano: 'trial',
    daysLeft: 7,
    isExpired: false,
    trialEndDate: '2026-01-21T12:00:00Z'
}

// Frontend mostra:
🌟 Banner roxo: "Teste Grátis - 7 dias restantes"
```

### Exemplo 2: Usuário no Dia 5
```javascript
// Backend retorna:
{
    plano: 'trial',
    daysLeft: 2,
    isExpired: false
}

// Frontend mostra:
⚠️ Banner amarelo: "Seu teste expira em 2 dias!"
```

### Exemplo 3: Usuário no Dia 7 (Expirado)
```javascript
// Backend retorna:
{
    plano: 'trial',
    daysLeft: 0,
    isExpired: true,
    status: 'expired'
}

// Frontend mostra:
🚫 Modal de bloqueio em tela cheia
Botão: "Assinar Agora"
```

---

## 🛠️ Troubleshooting

### Problema: "Dias não estão contando"
**Solução:** Verificar no banco se `created_at` está preenchido:
```sql
SELECT email, created_at FROM usuarios WHERE email = 'usuario@email.com';
```

### Problema: "Trial não expira"
**Solução:** Verificar se função `get-user-plan` está sendo chamada no login
- Ver console: deve aparecer "📊 SYNC - Plano do usuário: trial"

### Problema: "Modal não aparece quando expira"
**Solução:** Verificar se `isExpired` está chegando do backend:
```javascript
// No console:
const auth = JSON.parse(localStorage.getItem('lucrocerto_auth'));
console.log('Expirado?', auth.isExpired);
```

---

## 📊 Resumo Visual

```
DIA 0 (Cadastro)
└─> Usuário criado no banco
    └─> created_at = 2026-01-14
    └─> trial_end = 2026-01-21
    └─> daysLeft = 7
    └─> Banner: 🟣 "Teste Grátis - 7 dias"

DIA 1-4
└─> daysLeft = 6-3
    └─> Banner: 🟣 "Teste Grátis - X dias"

DIA 5
└─> daysLeft = 2
    └─> Banner: 🟡 "⚠️ Expira em 2 dias!"

DIA 6
└─> daysLeft = 1
    └─> Banner: 🟠 "🔥 ÚLTIMO DIA!"

DIA 7
└─> daysLeft = 0
    └─> isExpired = true
    └─> Modal: 🚫 "Trial Expirado"
    └─> App BLOQUEADO
```

---

## ✅ Conclusão

O sistema está **COMPLETO e FUNCIONAL**:

1. ✅ **Contagem automática** baseada em `created_at`
2. ✅ **Backend calcula** dias restantes
3. ✅ **Frontend sincroniza** a cada login
4. ✅ **Banner visual** muda conforme urgência
5. ✅ **Modal de bloqueio** quando expira
6. ✅ **Dados salvos** (não são perdidos)
7. ✅ **Upgrade simples** via botão "Assinar"

**A lógica está correta e funcionando!** 🎉
