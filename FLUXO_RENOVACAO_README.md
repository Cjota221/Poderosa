# 🔄 FLUXO DE RENOVAÇÃO DE ASSINATURA

## 🎯 **O QUE ACONTECE QUANDO CLIENTE RENOVA:**

### **CENÁRIO 1: Primeiro Pagamento (Cliente Novo)**
```
Cliente → /checkout → Paga → Cadastro → Login → /app
```

### **CENÁRIO 2: Renovação (Cliente Existente)**
```
Cliente → /checkout → Paga → renovacao-sucesso.html → /app (SEM BANNERS!)
```

---

## 📋 **PASSO A PASSO DA RENOVAÇÃO:**

### **1. Cliente vê avisos de expiração** ⚠️

**3 dias antes:**
- Banner amarelo no dashboard
- "⏰ Seu plano expira em X dias!"
- Botão: "Renovar Agora" → `/precos` ou `/checkout`

**Durante carência (já expirou):**
- Banner vermelho pulsante
- "🚨 SEU PLANO EXPIROU! X dias para renovar"
- Botão vermelho: "RENOVAR URGENTE"

---

### **2. Cliente clica para renovar** 💳

**Link leva para:** `/checkout?plan=pro&billing=monthly`

O sistema detecta:
```javascript
const isRenewal = !!localStorage.getItem('lucrocerto_auth');
// Se tem authData salvo = É RENOVAÇÃO
// Se não tem = É PRIMEIRO PAGAMENTO
```

---

### **3. Cliente paga** ✅

**Opção A: PIX**
1. Cliente gera QR Code
2. Sistema verifica pagamento a cada 5 segundos
3. Quando aprovado:
   ```javascript
   if (isRenewal) {
       window.location.href = '/renovacao-sucesso?payment_id=...&email=...';
   } else {
       // Mostrar tela de cadastro
   }
   ```

**Opção B: Cartão**
1. Cliente preenche dados
2. Mercado Pago processa
3. Se aprovado:
   ```javascript
   if (isRenewal) {
       window.location.href = '/renovacao-sucesso?payment_id=...&email=...';
   } else {
       // Mostrar tela de cadastro
   }
   ```

---

### **4. Página de Renovação Sucesso** 🎉

**URL:** `/renovacao-sucesso?payment_id=123456&email=cliente@email.com`

**O que acontece:**

1. **Confetti explode** 🎊
2. **Chama API:** `/.netlify/functions/renew-subscription`
   - Recebe: `paymentId` e `email`
   - Busca assinatura antiga do usuário
   - **Atualiza banco:**
     - `status = 'active'`
     - `data_expiracao = NOW() + 30 dias`
     - `data_inicio = NOW()` (reinicia contagem)
     - `payment_id = novo ID`
   - **Atualiza usuário:**
     - `plano = 'pro'`
3. **Atualiza localStorage:**
   - `subscriptionStatus = 'active'`
   - `subscription.data_expiracao = nova data`
4. **Mostra informações:**
   - ✅ Renovação Realizada!
   - 📦 Plano: Profissional
   - 💰 Valor: R$ 34,90
   - 📅 Válido até: DD/MM/AAAA
   - ✨ Status: ATIVO
5. **Redireciona em 5 segundos** → `/app`

---

## 🗄️ **O QUE MUDA NO BANCO DE DADOS:**

### **ANTES DA RENOVAÇÃO:**
```sql
-- Tabela: assinaturas
status: 'expired' (ou 'active' se ainda em carência)
data_expiracao: '2026-01-09 23:59:59' (já passou)
data_inicio: '2025-12-10'
payment_id: '13741425299' (pagamento antigo)

-- Tabela: usuarios
plano: 'expired' (ou 'pro' se em carência)
```

### **DEPOIS DA RENOVAÇÃO:**
```sql
-- Tabela: assinaturas
status: 'active' ✅
data_expiracao: '2026-02-15 12:30:00' (30 dias a partir de HOJE)
data_inicio: '2026-01-16 12:30:00' (hoje)
payment_id: '13999999999' (novo payment ID)
renovado_em: '2026-01-16 12:30:00'

-- Tabela: usuarios
plano: 'pro' ✅
ultimo_login: '2026-01-16 12:30:00'
```

---

## 🎨 **O QUE CLIENTE VÊ:**

### **1. Durante Renovação:**
```
┌────────────────────────────────────┐
│    💳 CHECKOUT - RENOVAÇÃO         │
│                                     │
│  Plano Profissional                │
│  R$ 34,90/mês                      │
│                                     │
│  [Pagar com PIX]                   │
│  [Pagar com Cartão]                │
└────────────────────────────────────┘
```

### **2. Após Pagamento Aprovado:**
```
┌────────────────────────────────────┐
│        ✅                           │
│                                     │
│   🎉 RENOVAÇÃO REALIZADA!          │
│                                     │
│   Seu plano foi renovado           │
│   com sucesso!                     │
│                                     │
│   📦 Plano: Profissional           │
│   💰 Pago: R$ 34,90                │
│   📅 Expira: 15/02/2026            │
│   ✨ Status: ATIVO                 │
│                                     │
│   [Ir para o Sistema] ←─────       │
│                                     │
│   Redirecionando em 5s...          │
└────────────────────────────────────┘

🎊 CONFETTI EXPLODINDO! 🎊
```

### **3. Volta para o Dashboard:**
```
┌────────────────────────────────────┐
│  Bom dia, Maria! 😊                │
│  Pronta para conquistar o mundo?   │
│                                     │
│  ✅ NENHUM BANNER DE AVISO!        │
│  (Banners de expiração SUMIRAM)    │
│                                     │
│  [Produtos] [Vendas] [Relatórios]  │
│  ... resto do dashboard normal     │
└────────────────────────────────────┘
```

---

## 🔧 **CÓDIGO CRÍTICO:**

### **renew-subscription.js** (Netlify Function)
```javascript
// Calcular nova data (30 dias a partir de HOJE)
const now = new Date();
const newExpiryDate = new Date(now);
newExpiryDate.setDate(newExpiryDate.getDate() + 30);

// Atualizar assinatura
await supabase
    .from('assinaturas')
    .update({
        status: 'active',
        data_expiracao: newExpiryDate.toISOString(),
        data_inicio: now.toISOString(),
        payment_id: paymentId,
        renovado_em: now.toISOString()
    })
    .eq('id', oldSubscription.id);

// Atualizar usuário
await supabase
    .from('usuarios')
    .update({ 
        plano: 'pro',
        ultimo_login: now.toISOString()
    })
    .eq('id', usuario.id);
```

### **checkout.html** (Detectar Renovação)
```javascript
// No início do script
const isRenewal = !!localStorage.getItem('lucrocerto_auth');

// Quando pagamento aprovado
if (isRenewal) {
    // RENOVAÇÃO
    window.location.href = `/renovacao-sucesso?payment_id=${result.id}&email=${email}`;
} else {
    // PRIMEIRO PAGAMENTO
    document.getElementById('success-overlay').classList.add('active');
}
```

### **renovacao-sucesso.html** (Atualizar)
```javascript
// Chamar API
await fetch('/.netlify/functions/renew-subscription', {
    method: 'POST',
    body: JSON.stringify({ paymentId, email })
});

// Atualizar localStorage
const authData = JSON.parse(localStorage.getItem('lucrocerto_auth'));
authData.subscriptionStatus = 'active';
authData.subscription.data_expiracao = novaData;
localStorage.setItem('lucrocerto_auth', JSON.stringify(authData));

// Redirecionar após 5s
setTimeout(() => window.location.href = '/app', 5000);
```

---

## ✅ **CHECKLIST DE TESTE:**

### **Testar Renovação Completa:**
- [ ] 1. Criar usuário com assinatura expirada no banco
- [ ] 2. Fazer login (deve mostrar banner vermelho de carência)
- [ ] 3. Clicar em "RENOVAR URGENTE"
- [ ] 4. Redireciona para `/checkout`
- [ ] 5. Escolher PIX ou Cartão
- [ ] 6. Fazer pagamento de teste
- [ ] 7. Redireciona para `/renovacao-sucesso` (não para cadastro!)
- [ ] 8. Ver confetti e informações da renovação
- [ ] 9. Aguardar 5s ou clicar "Ir para o Sistema"
- [ ] 10. Verificar no dashboard: **SEM BANNERS DE AVISO** ✅
- [ ] 11. Verificar no Supabase:
  - `assinaturas.status = 'active'`
  - `assinaturas.data_expiracao` atualizada (30 dias a partir de hoje)
  - `usuarios.plano = 'pro'`

### **Testar Primeiro Pagamento:**
- [ ] 1. Limpar localStorage (simular usuário novo)
- [ ] 2. Acessar `/checkout`
- [ ] 3. Fazer pagamento
- [ ] 4. Deve mostrar overlay "Criar Minha Conta"
- [ ] 5. Ir para `/cadastro`
- [ ] 6. Cadastrar senha
- [ ] 7. Fazer login
- [ ] 8. Entrar no `/app`

---

## 📊 **SQL PARA TESTAR:**

### **Simular Assinatura Expirada:**
```sql
-- Criar usuário com assinatura expirada
UPDATE assinaturas
SET 
    status = 'active',
    data_expiracao = NOW() - INTERVAL '3 days' -- Expirou há 3 dias
WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'teste@email.com');
```

### **Ver Dados Após Renovação:**
```sql
SELECT 
    u.email,
    u.plano as plano_usuario,
    a.status,
    a.data_inicio,
    a.data_expiracao,
    a.renovado_em,
    a.payment_id,
    EXTRACT(DAY FROM (a.data_expiracao - NOW())) as dias_restantes
FROM usuarios u
JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.email = 'teste@email.com'
ORDER BY a.created_at DESC
LIMIT 1;
```

---

## 🎯 **BENEFÍCIOS:**

✅ **Cliente renova sem criar nova conta**  
✅ **Banners de aviso somem automaticamente**  
✅ **Página de comemoração (confetti!)**  
✅ **Atualização automática no banco**  
✅ **Histórico de renovações mantido**  
✅ **30 dias a partir da data de renovação**  

---

## 🚨 **IMPORTANTE:**

### **NUNCA DELETAR DADOS:**
- Assinatura antiga não é deletada, só atualizada
- Histórico de pagamentos é mantido
- Dados do usuário ficam intactos

### **DATA DE EXPIRAÇÃO:**
- Sempre 30 dias a partir do dia da renovação (HOJE)
- Não importa se renovou 1 dia ou 10 dias após expirar
- Cliente sempre ganha 30 dias completos

### **MÚLTIPLAS RENOVAÇÕES:**
- Cliente pode renovar quantas vezes quiser
- Cada renovação: novo payment_id, nova data_expiracao
- Sistema guarda em `renovado_em` a última renovação

---

## 📞 **TROUBLESHOOTING:**

**P: Banner não sumiu após renovação**  
R: Verificar se `subscriptionStatus` foi atualizado no localStorage. Cliente precisa recarregar página ou fazer logout/login.

**P: data_expiracao não atualizou**  
R: Verificar console do Netlify Functions. API `renew-subscription` pode ter falhado.

**P: Cliente renovousomou mas continua bloqueado**  
R: Verificar se `usuarios.plano` foi atualizado para 'pro' e `assinaturas.status` para 'active'.

**P: Confetti não aparece**  
R: Verificar se biblioteca canvas-confetti está carregando corretamente.

---

✅ **SISTEMA COMPLETO DE RENOVAÇÃO PRONTO!**
