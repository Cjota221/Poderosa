# 💸 COMO FAZER ESTORNO/DEVOLUÇÃO NO MERCADO PAGO

## 📋 **SITUAÇÃO: Cliente quer devolução dentro de 7 dias**

### **Opção 1: Estorno Manual (Mais Rápido)**

1. **Acessar Mercado Pago:**
   - Entre em https://www.mercadopago.com.br/
   - Vá em **"Atividade"** no menu

2. **Encontrar o Pagamento:**
   - Procure pelo email do cliente ou valor (R$ 34,90)
   - Clique no pagamento específico

3. **Fazer Estorno:**
   - Clique em **"Devolver dinheiro"**
   - Escolha:
     - **Total**: Devolve R$ 34,90 completo
     - **Parcial**: Devolve parte do valor
   - Confirme a devolução

4. **Prazo para Cliente Receber:**
   - **PIX**: Devolução cai na hora
   - **Cartão de crédito**: 5-10 dias úteis (depende do banco)

5. **Bloquear Acesso no Sistema:**
   - Entre no Supabase
   - Tabela `assinaturas`
   - Encontre a assinatura do cliente (pelo email)
   - Mude o `status` de `'active'` para `'cancelled'`
   - Cliente será bloqueado no próximo login

---

### **Opção 2: API do Mercado Pago (Automático - Requer Programação)**

Você pode criar uma função Netlify que faz estorno automático:

```javascript
// netlify/functions/cancel-subscription.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { email, paymentId, reason } = JSON.parse(event.body);
    
    // 1. Fazer estorno no Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    
    // 2. Atualizar Supabase
    await supabase
        .from('assinaturas')
        .update({ 
            status: 'cancelled',
            motivo_cancelamento: reason,
            data_cancelamento: new Date().toISOString()
        })
        .eq('payment_id', paymentId);
    
    return { statusCode: 200, body: 'Estorno realizado' };
};
```

**Vantagem:** Cliente pode cancelar sozinho dentro do app.  
**Desvantagem:** Mais complexo de implementar.

---

## 💳 **2. COBRANÇA RECORRENTE (CARTÃO DE CRÉDITO)**

### **❌ O Que NÃO Está Funcionando Ainda:**

O sistema atual faz apenas **pagamento único** de R$ 34,90. Isso significa:
- Cliente paga uma vez
- Tem acesso até a `data_expiracao` (30 dias)
- Depois **o acesso é bloqueado**
- Cliente precisa **pagar manualmente de novo**

### **✅ Para Ter Cobrança Recorrente Automática:**

Você precisa implementar **Assinatura Mercado Pago**:

#### **Como Funciona:**
1. Cliente assina (não paga)
2. Mercado Pago **cobra automaticamente** todo mês
3. Se pagamento for aprovado → renovar acesso
4. Se pagamento falhar → bloquear acesso

#### **Implementação:**

```javascript
// netlify/functions/create-subscription.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { email, planId } = JSON.parse(event.body);
    
    // Criar plano de assinatura no Mercado Pago
    const subscription = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            reason: 'Assinatura Poderosa - Plano PRO',
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: 34.90,
                currency_id: 'BRL'
            },
            back_url: 'https://poderosa.netlify.app/cadastro',
            payer_email: email
        })
    });
    
    const data = await subscription.json();
    
    return {
        statusCode: 200,
        body: JSON.stringify({ 
            subscriptionId: data.id,
            initPoint: data.init_point // URL para cliente assinar
        })
    };
};
```

#### **Webhooks para Renovação Automática:**

```javascript
// netlify/functions/mercadopago-webhook.js
exports.handler = async (event) => {
    const { type, data } = JSON.parse(event.body);
    
    // Mercado Pago notifica sobre eventos
    if (type === 'preapproval') {
        const subscriptionId = data.id;
        
        // Buscar dados da assinatura
        const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
            headers: {
                'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
            }
        });
        
        const subscription = await response.json();
        
        // Atualizar Supabase
        if (subscription.status === 'authorized') {
            // Renovar acesso
            await supabase
                .from('assinaturas')
                .update({ 
                    data_expiracao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    status: 'active'
                })
                .eq('subscription_id', subscriptionId);
        } else if (subscription.status === 'cancelled') {
            // Bloquear acesso
            await supabase
                .from('assinaturas')
                .update({ status: 'cancelled' })
                .eq('subscription_id', subscriptionId);
        }
    }
    
    return { statusCode: 200, body: 'OK' };
};
```

---

## 🎯 **RESUMO DAS OPÇÕES:**

### **Para Estorno (7 dias):**

| Opção | Complexidade | Automação |
|-------|--------------|-----------|
| **Manual no Mercado Pago** | ⭐ Fácil | ❌ Cliente entra em contato |
| **Botão "Cancelar" no App** | ⭐⭐⭐ Médio | ✅ Cliente cancela sozinho |

**Recomendação:** Comece com manual, implemente botão depois.

---

### **Para Cobrança Recorrente:**

| Opção | Complexidade | Quando Usar |
|-------|--------------|-------------|
| **Pagamento Único** (atual) | ⭐ Fácil | Fase de teste |
| **Assinatura Mercado Pago** | ⭐⭐⭐⭐ Difícil | Produto maduro |

**Recomendação:** Mantenha pagamento único por enquanto. Depois de ter 50-100 clientes, implemente assinatura recorrente.

---

## ⚠️ **O QUE FAZER AGORA:**

### **Curto Prazo (Antes de Divulgar):**
1. ✅ Estorno manual pelo Mercado Pago
2. ✅ Adicionar no site: "Contate-nos para cancelamento"
3. ✅ Criar WhatsApp/Email de suporte

### **Médio Prazo (Após Primeiros Clientes):**
1. Adicionar botão "Cancelar Assinatura" no app
2. Implementar função de estorno automático
3. Enviar email de confirmação de cancelamento

### **Longo Prazo (Produto Escalado):**
1. Implementar assinatura recorrente
2. Cobrança automática mensal
3. Webhook para renovação/cancelamento
4. Dashboard de assinaturas

---

## 📞 **SUPORTE A CLIENTES:**

Adicione essa mensagem no seu site/app:

> **"Garantia de 7 dias: Não gostou? Devolvemos seu dinheiro!**
> 
> Para solicitar reembolso, entre em contato:
> - 📱 WhatsApp: (seu número)
> - 📧 Email: suporte@poderosa.com
> 
> Processamos reembolsos em até 24 horas."

---

## 🔗 **Links Úteis:**

- **Estornos Mercado Pago:** https://www.mercadopago.com.br/developers/pt/docs/checkout-api/payment-management/cancellations-and-refunds
- **Assinaturas Mercado Pago:** https://www.mercadopago.com.br/developers/pt/docs/subscriptions/introduction
- **Webhooks:** https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
