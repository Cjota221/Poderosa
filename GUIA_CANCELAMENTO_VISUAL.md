# 🔴 GUIA: COMO CANCELAR ASSINATURA E BLOQUEAR CLIENTE

## 📋 SITUAÇÃO REAL:

**Cliente:** maria@example.com  
**Pagou:** 10/12/2025 às 14:30  
**Valor:** R$ 34,90  
**Hoje:** 13/12/2025 (3 dias depois)  
**Motivo:** Não gostou do sistema, quer reembolso

---

## 🎯 OBJETIVO:
1. ✅ Devolver R$ 34,90 para a cliente
2. ✅ Bloquear acesso dela ao sistema
3. ✅ Manter histórico no banco de dados

---

## 📊 COMO ESTÁ NO BANCO ANTES DO CANCELAMENTO:

### **Tabela: usuarios**
```
email: maria@example.com
senha_hash: $2a$10$... (criptografada)
plano: pro  ← Cliente TEM acesso
tour_completed: true
```

### **Tabela: assinaturas**
```
usuario_id: 123
plano: pro
status: active  ← Cliente ATIVO
data_inicio: 2025-12-10 14:30:00
data_expiracao: 2026-01-09 14:30:00  ← 30 dias depois
payment_id: 13741425299
valor: 34.90
periodo: monthly
data_cancelamento: NULL
motivo_cancelamento: NULL
```

**RESULTADO:** Cliente consegue fazer login e usar o sistema ✅

---

## 🔧 PASSO A PASSO PARA CANCELAR:

### **PASSO 1: Verificar se está dentro dos 7 dias** ⏰

Abra o Supabase SQL Editor e cole:

```sql
SELECT 
    u.email,
    a.data_inicio,
    a.valor,
    EXTRACT(DAY FROM (NOW() - a.data_inicio)) as dias_usados,
    CASE 
        WHEN EXTRACT(DAY FROM (NOW() - a.data_inicio)) <= 7 THEN '✅ PODE REEMBOLSAR'
        ELSE '❌ FORA DA GARANTIA'
    END as status_garantia
FROM usuarios u
JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.email = 'maria@example.com'
AND a.status = 'active';
```

**Resultado esperado:**
```
email: maria@example.com
data_inicio: 2025-12-10 14:30:00
valor: 34.90
dias_usados: 3
status_garantia: ✅ PODE REEMBOLSAR
```

✅ **Decisão:** Está dentro dos 7 dias, pode devolver o dinheiro!

---

### **PASSO 2: Fazer estorno no Mercado Pago** 💸

1. Entre em: https://www.mercadopago.com.br/
2. Vá em **"Atividade"**
3. Procure por:
   - Email: `maria@example.com`
   - Valor: `R$ 34,90`
   - Data: `10/12/2025`
4. Clique no pagamento
5. Clique em **"Devolver dinheiro"**
6. Escolha **"Devolver valor total"** (R$ 34,90)
7. Confirme o estorno
8. **GUARDE o ID do pagamento** (ex: 13741425299)

**Prazo:**
- PIX: Cai na hora
- Cartão: 5-10 dias úteis

---

### **PASSO 3: Cancelar no banco de dados** 🗄️

Abra o Supabase SQL Editor e cole:

```sql
-- 1. Cancelar assinatura
UPDATE assinaturas
SET 
    status = 'cancelled',
    data_cancelamento = NOW(),
    motivo_cancelamento = 'Cliente não gostou - reembolso realizado em 13/12/2025'
WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'maria@example.com')
AND status = 'active';

-- 2. Bloquear usuário
UPDATE usuarios
SET plano = 'cancelled'
WHERE email = 'maria@example.com';
```

Execute o script (clique em **RUN**).

---

### **PASSO 4: Verificar se bloqueou** ✅

```sql
SELECT 
    u.email,
    u.plano as plano_usuario,
    a.status as status_assinatura,
    a.data_cancelamento,
    a.motivo_cancelamento,
    CASE 
        WHEN a.status = 'cancelled' AND u.plano = 'cancelled' THEN '✅ BLOQUEADO!'
        ELSE '❌ ERRO - ainda ativo'
    END as resultado
FROM usuarios u
JOIN assinaturas a ON a.usuario_id = u.id
WHERE u.email = 'maria@example.com'
ORDER BY a.data_inicio DESC
LIMIT 1;
```

**Resultado esperado:**
```
email: maria@example.com
plano_usuario: cancelled
status_assinatura: cancelled
data_cancelamento: 2025-12-13 10:25:00
motivo_cancelamento: Cliente não gostou - reembolso realizado em 13/12/2025
resultado: ✅ BLOQUEADO!
```

---

## 📊 COMO FICA O BANCO DEPOIS DO CANCELAMENTO:

### **Tabela: usuarios**
```
email: maria@example.com
plano: cancelled  ← MUDOU de 'pro' para 'cancelled'
```

### **Tabela: assinaturas**
```
status: cancelled  ← MUDOU de 'active' para 'cancelled'
data_cancelamento: 2025-12-13 10:25:00  ← FOI PREENCHIDO
motivo_cancelamento: Cliente não gostou - reembolso realizado  ← FOI PREENCHIDO
```

**RESULTADO:** Cliente NÃO consegue mais fazer login ❌

---

## 🚫 O QUE ACONTECE QUANDO CLIENTE TENTA ENTRAR:

1. Cliente vai em: https://poderosa.netlify.app/login
2. Digita: `maria@example.com` + senha
3. Sistema verifica no banco: `plano = 'cancelled'`
4. **ERRO APARECE:** 
   ```
   ❌ Sua assinatura foi cancelada.
   Entre em contato com o suporte.
   ```
5. Cliente **NÃO ENTRA** no sistema

---

## 📧 MENSAGEM PARA ENVIAR À CLIENTE:

```
Olá Maria! 😊

Seu reembolso de R$ 34,90 foi processado com sucesso!

📅 Data do estorno: 13/12/2025
💳 O valor deve aparecer na sua conta em:
   - PIX: Imediatamente
   - Cartão: 5 a 10 dias úteis

Seu acesso ao sistema foi cancelado conforme solicitado.

Agradecemos por ter testado o Poderosa! 💕
Se mudar de ideia, estamos aqui: [link da página de preços]

Qualquer dúvida, estou à disposição!

Atenciosamente,
Equipe Poderosa
```

---

## 📊 VER RELATÓRIO DE CANCELAMENTOS:

```sql
-- Todos os cancelamentos do mês
SELECT 
    u.email,
    a.valor,
    a.data_inicio,
    a.data_cancelamento,
    EXTRACT(DAY FROM (a.data_cancelamento - a.data_inicio)) as dias_usados,
    a.motivo_cancelamento
FROM assinaturas a
JOIN usuarios u ON u.id = a.usuario_id
WHERE a.status = 'cancelled'
AND EXTRACT(MONTH FROM a.data_cancelamento) = EXTRACT(MONTH FROM NOW())
ORDER BY a.data_cancelamento DESC;
```

**Resultado (exemplo):**
```
email                    | valor | dias_usados | motivo
maria@example.com        | 34.90 | 3          | Não gostou
joana@example.com        | 34.90 | 2          | Difícil de usar
ana@example.com          | 34.90 | 7          | Não entendeu
```

**Análise:**
- 3 cancelamentos este mês
- Total devolvido: R$ 104,70
- Média de uso antes de cancelar: 4 dias
- **Ação:** Melhorar tutorial inicial

---

## ⚠️ IMPORTANTE:

### ✅ **O que o cancelamento FAZ:**
- Bloqueia acesso imediato ao sistema
- Mantém histórico no banco (não deleta nada)
- Permite gerar relatórios de cancelamentos
- Cliente recebe erro ao tentar login

### ❌ **O que o cancelamento NÃO FAZ:**
- NÃO faz estorno automático (você faz manual no Mercado Pago)
- NÃO envia email automático (você manda manual)
- NÃO deleta os dados do cliente (ficam salvos)

---

## 🔄 E SE CLIENTE QUISER VOLTAR DEPOIS?

```sql
-- Reativar assinatura (cliente pagou de novo)
UPDATE assinaturas
SET 
    status = 'active',
    data_inicio = NOW(),
    data_expiracao = NOW() + INTERVAL '30 days',
    data_cancelamento = NULL,
    motivo_cancelamento = NULL
WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'maria@example.com')
AND id = (SELECT id FROM assinaturas WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'maria@example.com') ORDER BY data_inicio DESC LIMIT 1);

UPDATE usuarios
SET plano = 'pro'
WHERE email = 'maria@example.com';
```

---

## 📞 DÚVIDAS FREQUENTES:

**P: E se a cliente já usou mais de 7 dias?**  
R: NÃO deve reembolsar (fora da garantia). Você pode bloquear o acesso, mas não devolve o dinheiro.

**P: O histórico de vendas dela some?**  
R: NÃO! Tudo fica salvo no banco. Só o acesso é bloqueado.

**P: Ela pode criar outra conta?**  
R: Sim, com outro email e novo pagamento.

**P: Posso deletar o registro dela?**  
R: NÃO recomendado! Mantenha para histórico e análise de cancelamentos.

---

## 🎯 CHECKLIST RÁPIDO:

- [ ] 1. Verificar se está dentro de 7 dias (SQL)
- [ ] 2. Fazer estorno no Mercado Pago
- [ ] 3. Executar SQL de cancelamento no Supabase
- [ ] 4. Verificar se status = 'cancelled'
- [ ] 5. Enviar mensagem confirmando reembolso para cliente
- [ ] 6. Anotar motivo do cancelamento para análise

**Tempo total:** 5-10 minutos ⏱️
