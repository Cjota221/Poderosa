# 🔔 SISTEMA DE AVISOS E BLOQUEIO AUTOMÁTICO

## 🎯 **O QUE FOI IMPLEMENTADO:**

Sistema inteligente que monitora a data de expiração da assinatura e:
1. **Avisa quando está perto de expirar** (3 dias antes)
2. **Dá período de carência** (2 dias após expirar)
3. **Bloqueia acesso automaticamente** após período de carência

---

## 📊 **COMO FUNCIONA:**

### **Status da Assinatura:**

| Status | O que significa | O que acontece |
|--------|-----------------|----------------|
| `active` | Plano está ativo e válido | ✅ Acesso total ao sistema |
| `expiring_soon` | Faltam 3 dias ou menos para expirar | ⚠️ Banner amarelo de aviso |
| `grace_period` | Já expirou mas está nos 2 dias de carência | 🚨 Banner vermelho urgente |
| `expired` | Expirou há mais de 2 dias | ❌ Bloqueado, não consegue entrar |

---

## 🗓️ **EXEMPLO PRÁTICO:**

Cliente pagou em: **10/12/2025**  
Data de expiração: **09/01/2026** (30 dias depois)

### **Linha do Tempo:**

**📅 06/01/2026 (3 dias antes)**
- Status: `expiring_soon`
- Dashboard mostra: Banner amarelo ⚠️
- Mensagem: "⏰ Seu plano expira em 3 dias! Renove agora"
- Botão: "Renovar Agora"
- **ACESSO:** ✅ Funcionando normal

**📅 07/01/2026 (2 dias antes)**
- Status: `expiring_soon`
- Mensagem: "⏰ Seu plano expira em 2 dias!"
- **ACESSO:** ✅ Funcionando normal

**📅 08/01/2026 (1 dia antes)**
- Status: `expiring_soon`
- Mensagem: "⏰ Seu plano expira em 1 dia!"
- **ACESSO:** ✅ Funcionando normal

**📅 09/01/2026 (DIA DA EXPIRAÇÃO)**
- Status: `expiring_soon`
- Mensagem: "⏰ Seu plano expira hoje!"
- **ACESSO:** ✅ Funcionando normal até meia-noite

---

### **🚨 PERÍODO DE CARÊNCIA:**

**📅 10/01/2026 (1 dia após expirar)**
- Status: `grace_period`
- Dashboard mostra: Banner VERMELHO pulsante 🚨
- Mensagem: "🚨 SEU PLANO EXPIROU! Você tem apenas 2 dias para renovar"
- Botão vermelho: "RENOVAR URGENTE"
- **ACESSO:** ✅ Ainda funciona (carência de 2 dias)

**📅 11/01/2026 (2 dias após expirar)**
- Status: `grace_period`
- Mensagem: "🚨 SEU PLANO EXPIROU! Você tem apenas 1 dia para renovar"
- **ACESSO:** ✅ Ainda funciona (último dia de carência)

---

### **❌ BLOQUEIO TOTAL:**

**📅 12/01/2026 (3 dias após expirar)**
- Status: `expired`
- **BLOQUEIO:** Cliente tenta fazer login
- Erro: "❌ Seu plano expirou! Renove sua assinatura para continuar"
- Popup: "Seu plano expirou! Deseja renovar agora?" → Redireciona para `/precos`
- **ACESSO:** ❌ BLOQUEADO - não entra no sistema

---

## 🎨 **VISUAL DOS AVISOS:**

### **1. Aviso Amarelo (3 dias antes):**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  ⏰ Seu plano expira em 3 dias!                      │
│     Renove agora para não perder o acesso.              │
│                                        [Renovar Agora]   │
└─────────────────────────────────────────────────────────┘
Cor: Amarelo (#FFF3CD)
Ícone: alert-triangle
Aparece: No topo do dashboard
```

### **2. Aviso Vermelho Pulsante (período de carência):**
```
┌─────────────────────────────────────────────────────────┐
│ 🚨  🚨 SEU PLANO EXPIROU!                               │
│     Você tem apenas 2 dias para renovar antes de        │
│     perder o acesso!                                     │
│     Todos os seus dados serão mantidos.                 │
│                                      [RENOVAR URGENTE]   │
└─────────────────────────────────────────────────────────┘
Cor: Vermelho (#FFEBEE)
Ícone: alert-octagon
Aparece: No topo do dashboard
Animação: Pulsa constantemente
```

### **3. Bloqueio no Login:**
```
┌──────────────────────────────────────────┐
│  ❌ SEU PLANO EXPIROU!                   │
│                                           │
│  Renove sua assinatura para              │
│  continuar usando o sistema.             │
│                                           │
│  [OK]                                    │
└──────────────────────────────────────────┘

⏬ Popup aparece:
"Seu plano expirou! Deseja renovar agora?"
[Cancelar] [Sim, Renovar]
```

---

## 💻 **LÓGICA NO CÓDIGO:**

### **1. Login (login.js):**
```javascript
// Calcula dias restantes
const diasRestantes = (dataExpiracao - hoje) / (1000 * 60 * 60 * 24);

if (diasRestantes > 0) {
    // Ainda ativo
    if (diasRestantes <= 3) {
        status = 'expiring_soon'; // Aviso amarelo
    } else {
        status = 'active'; // Normal
    }
} else {
    // Já expirou
    const diasAposExpiracao = Math.abs(diasRestantes);
    
    if (diasAposExpiracao <= 2) {
        status = 'grace_period'; // Carência - ainda funciona
    } else {
        status = 'expired'; // BLOQUEADO
        // Atualiza banco para 'expired'
    }
}
```

### **2. Dashboard (app.js):**
```javascript
const subscriptionStatus = authData.subscriptionStatus;

if (subscriptionStatus === 'expiring_soon') {
    // Mostra banner amarelo
}

if (subscriptionStatus === 'grace_period') {
    // Mostra banner vermelho pulsante
}
```

### **3. Login.html:**
```javascript
if (result.subscriptionStatus === 'expired') {
    // Mostra erro
    // Não permite entrar
    // Oferece renovação
}
```

---

## 🗄️ **O QUE ACONTECE NO BANCO:**

### **Antes de Expirar (active):**
```sql
SELECT * FROM assinaturas WHERE usuario_id = 123;
```
```
status: 'active'
data_expiracao: '2026-01-09 23:59:59'
plano: 'pro'
```

### **Após Expirar (expired):**
```sql
-- Sistema atualiza automaticamente:
UPDATE assinaturas 
SET status = 'expired' 
WHERE data_expiracao < NOW() 
AND status = 'active';

UPDATE usuarios
SET plano = 'expired'
WHERE id IN (SELECT usuario_id FROM assinaturas WHERE status = 'expired');
```
```
status: 'expired'
data_expiracao: '2026-01-09 23:59:59'
plano: 'pro' (mantém registro do plano anterior)
```

---

## 📧 **EMAILS AUTOMÁTICOS (Futuro):**

Você pode implementar emails automáticos:

**3 dias antes:**
```
Assunto: ⏰ Seu plano expira em 3 dias!

Olá [Nome],

Seu plano Profissional expira em 3 dias (09/01/2026).

Renove agora para não perder acesso:
[Renovar Agora]

Att,
Equipe Poderosa
```

**No dia da expiração:**
```
Assunto: 🚨 Seu plano expira hoje!

Olá [Nome],

Seu plano expira HOJE às 23:59h.

Após isso, você terá 2 dias de carência.
Renove agora:
[Renovar Agora]
```

**Durante carência:**
```
Assunto: ⚠️ URGENTE: Restam X dias de carência

Olá [Nome],

Seu plano expirou! Você tem apenas X dias
para renovar antes de perder o acesso.

[RENOVAR URGENTE]
```

**Após bloqueio:**
```
Assunto: ❌ Seu acesso foi bloqueado

Olá [Nome],

Seu plano expirou e não foi renovado.
Seu acesso foi bloqueado.

Seus dados estão seguros! Para reativar:
[Renovar Agora]
```

---

## 🔧 **CONFIGURAÇÕES:**

### **Alterar Período de Carência:**

Arquivo: `netlify/functions/login.js`

```javascript
// Atualmente: 2 dias
const gracePeriodDays = 2;

// Para mudar para 5 dias:
const gracePeriodDays = 5;

// Para desabilitar carência (bloqueio imediato):
const gracePeriodDays = 0;
```

### **Alterar Aviso Antecipado:**

```javascript
// Atualmente: avisa 3 dias antes
if (diasRestantes <= 3) {
    assinaturaStatus = 'expiring_soon';
}

// Para avisar 7 dias antes:
if (diasRestantes <= 7) {
    assinaturaStatus = 'expiring_soon';
}
```

---

## 📊 **RELATÓRIO DE EXPIRAÇÃO:**

Ver quem está prestes a expirar:

```sql
-- Expira nos próximos 3 dias
SELECT 
    u.email,
    u.nome,
    a.plano,
    a.data_expiracao,
    EXTRACT(DAY FROM (a.data_expiracao - NOW())) as dias_restantes
FROM usuarios u
JOIN assinaturas a ON a.usuario_id = u.id
WHERE a.status = 'active'
AND a.data_expiracao BETWEEN NOW() AND NOW() + INTERVAL '3 days'
ORDER BY a.data_expiracao ASC;
```

Ver quem está em período de carência:

```sql
-- Expirou mas ainda tem carência (últimos 2 dias)
SELECT 
    u.email,
    u.nome,
    a.plano,
    a.data_expiracao,
    EXTRACT(DAY FROM (NOW() - a.data_expiracao)) as dias_apos_expiracao
FROM usuarios u
JOIN assinaturas a ON a.usuario_id = u.id
WHERE a.status = 'active'
AND a.data_expiracao < NOW()
AND a.data_expiracao > NOW() - INTERVAL '2 days'
ORDER BY a.data_expiracao ASC;
```

Ver quem foi bloqueado:

```sql
-- Bloqueados (mais de 2 dias após expirar)
SELECT 
    u.email,
    u.nome,
    a.plano,
    a.data_expiracao,
    EXTRACT(DAY FROM (NOW() - a.data_expiracao)) as dias_apos_expiracao
FROM usuarios u
JOIN assinaturas a ON a.usuario_id = u.id
WHERE a.status = 'expired'
ORDER BY a.data_expiracao DESC;
```

---

## ✅ **CHECKLIST DE TESTE:**

Antes de divulgar:

- [ ] Testar aviso 3 dias antes (alterar data_expiracao no banco para testar)
- [ ] Testar período de carência (banner vermelho aparece)
- [ ] Testar bloqueio após carência (não consegue fazer login)
- [ ] Verificar se popup de renovação aparece no login
- [ ] Confirmar que dados não são perdidos após bloqueio
- [ ] Testar renovação após bloqueio (reativa acesso)

---

## 🎯 **BENEFÍCIOS:**

✅ **Cliente é avisado com antecedência** (3 dias antes)  
✅ **Não perde acesso imediatamente** (2 dias de carência)  
✅ **Bloqueio automático** (você não precisa fazer nada)  
✅ **Dados são mantidos** (não deleta nada)  
✅ **Incentiva renovação** (avisos visuais urgentes)  
✅ **Reduz inadimplência** (lembretes constantes)  

---

## 📞 **SUPORTE:**

Se cliente reclamar que foi bloqueado:
1. Verificar no Supabase: `data_expiracao`
2. Ver quantos dias após expiracao: `NOW() - data_expiracao`
3. Se < 2 dias: ainda deve ter acesso (bug?)
4. Se > 2 dias: bloqueio correto
5. Para reativar: renovar pagamento ou estender data_expiracao manualmente

**SQL para estender manualmente (emergência):**
```sql
UPDATE assinaturas
SET 
    data_expiracao = NOW() + INTERVAL '30 days',
    status = 'active'
WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'cliente@email.com');

UPDATE usuarios
SET plano = 'pro'
WHERE email = 'cliente@email.com';
```

---

✅ **Sistema pronto! Aguarde ~2 minutos para deploy no Netlify.**
