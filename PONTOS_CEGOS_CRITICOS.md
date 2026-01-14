# 🚨 NOVOS PONTOS CEGOS CRÍTICOS - AUDITORIA #2

**Data:** 14/01/2026  
**Status:** 🔴 **CRÍTICO** - Sistema com falhas graves

---

## ⚠️ PROBLEMAS REPORTADOS PELA USUÁRIA

1. ❌ **Todos os usuários veem os mesmos produtos**
2. ❌ **Todos veem o nome "Caroline Azevedo"**
3. ❌ **Catálogo não funciona** (caminho errado)
4. ❌ **Produtos não aparecem no catálogo**
5. ❌ **Sistema completamente bagunçado**

---

## 🔴 PONTO CEGO #9: BYPASS DE LOGIN HARDCODED

**Arquivo:** `netlify/functions/login.js` - Linhas 84-114  
**Severidade:** 🔴 **CRÍTICA**

### Problema:

```javascript
// 🚨🚨🚨 BYPASS TOTAL PARA DEBUG 🚨🚨🚨
if (emailLower === 'carolineazevedo075@gmail.com') {
    const senhasPermitidas = ['123456', 'lucrocerto2025', 'senha123', '123'];
    if (senhasPermitidas.includes(password)) {
        console.log('🚨 BYPASS ATIVADO PARA CAROL!');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user: {
                    id: 'user_carol_gmail',  // ❌ TODOS USAM ESTE ID!
                    email: emailLower,
                    nome: 'Caroline Azevedo', // ❌ TODOS COM ESTE NOME!
                    // ...
                }
            })
        };
    }
}
```

### Impacto:
- 🚨 **TODOS os usuários compartilham o mesmo ID**: `user_carol_gmail`
- 🚨 **Todos veem os mesmos produtos**
- 🚨 **Todos veem o mesmo nome**
- 🚨 **Zero isolamento de dados**
- 🚨 **Falha de segurança massiva**

### Solução:
**REMOVER completamente este bypass ou ajustar para usar ID real do banco:**

```javascript
// ✅ CORREÇÃO: Buscar usuário real do banco
const { data: user, error: userError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', emailLower)
    .single();

if (!user) {
    return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Usuário não encontrado' })
    };
}

// Verificar senha hash (implementar bcrypt)
// Retornar ID REAL do banco, não hardcoded
```

---

## 🔴 PONTO CEGO #10: LOG DE SENHAS EM TEXTO PLANO

**Arquivo:** `netlify/functions/login.js` - Linha 79  
**Severidade:** 🔴 **CRÍTICA**

### Problema:

```javascript
console.log('🔐 Senha recebida:', password); // ❌ LOGA SENHA EM TEXTO PLANO!
```

### Impacto:
- 🚨 Senhas aparecem nos logs da Netlify
- 🚨 Qualquer admin pode ver as senhas
- 🚨 Violação de LGPD/GDPR
- 🚨 Risco de vazamento

### Solução:

```javascript
// ✅ NÃO logar senhas NUNCA
console.log('🔐 Tentativa de login:', emailLower);
// ❌ REMOVER: console.log('🔐 Senha recebida:', password);
```

---

## 🟡 PONTO CEGO #11: SENHA NÃO TEM HASH

**Arquivos:** Múltiplos  
**Severidade:** 🔴 **ALTA**

### Problema:
Sistema compara senhas em **texto plano** - não usa bcrypt/hash

### Impacto:
- 🚨 Se banco vazar, todas as senhas expostas
- 🚨 Admin pode ver senhas de todos
- 🚨 Não segue padrão de segurança

### Solução:

**1. Instalar bcrypt:**
```bash
cd netlify/functions
npm install bcrypt
```

**2. No cadastro (register.js):**
```javascript
const bcrypt = require('bcrypt');

// Hash da senha
const senhaHash = await bcrypt.hash(password, 10);

// Salvar hash no banco
await supabase.insert('usuarios', {
    email,
    nome,
    senha_hash: senhaHash  // ✅ Salva hash, não texto plano
});
```

**3. No login (login.js):**
```javascript
const bcrypt = require('bcrypt');

// Comparar hash
const senhaCorreta = await bcrypt.compare(password, user.senha_hash);

if (!senhaCorreta) {
    return { statusCode: 401, error: 'Senha incorreta' };
}
```

---

## 🟠 PONTO CEGO #12: CATÁLOGO - CAMINHO INCORRETO

**Arquivo:** Múltiplos  
**Severidade:** 🟠 **MÉDIA-ALTA**

### Problema:
URL do catálogo está inconsistente/errada

### URLs esperadas:
```
✅ https://sistemalucrocerto.com/catalogo/<slug-do-usuario>
✅ https://sistemalucrocerto.com/catalogo?loja=<id-usuario>
❌ https://sistemalucrocerto.com/sistema/g0  (???)
```

### Solução:

**1. Gerar slug no cadastro:**
```javascript
// register.js
const slug = nome.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

await supabase.insert('usuarios', {
    nome,
    slug: slug,  // Ex: "caroline-azevedo"
    // ...
});
```

**2. No app, mostrar URL correta:**
```javascript
// app.js
const catalogUrl = `https://sistemalucrocerto.com/catalogo/${userSlug}`;
// Copiar e compartilhar este URL
```

---

## 🟡 PONTO CEGO #13: PRODUTOS NÃO VÃO PARA CATÁLOGO

**Problema:** Campo `visivel_catalogo` pode não estar sendo setado

### Solução:

**Ao criar produto:**
```javascript
// app.js - ao salvar produto
const produto = {
    nome: nome,
    usuario_id: userId,
    visivel_catalogo: true,  // ✅ Adicionar explicitamente
    ativo: true,
    // ...
};
```

**Na query do catálogo:**
```javascript
// get-catalog.js
const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .eq('usuario_id', userId)
    .eq('visivel_catalogo', true)  // ✅ Filtrar apenas visíveis
    .eq('ativo', true);
```

---

## 🟡 PONTO CEGO #14: MEMORY LEAKS (setTimeout sem cleanup)

**Arquivo:** `public/js/app.js`  
**Severidade:** 🟡 **MÉDIA**

### Problema:
20+ `setTimeout` sem armazenar referências = não podem ser cancelados

### Exemplo:
```javascript
// ❌ Problema
setTimeout(() => {
    // código
}, 500);
```

### Solução:
```javascript
// ✅ Correto
const timers = [];

const timerId = setTimeout(() => {
    // código
}, 500);
timers.push(timerId);

// Cleanup ao sair
function cleanup() {
    timers.forEach(id => clearTimeout(id));
}
```

---

## 🟡 PONTO CEGO #15: XSS via innerHTML

**Arquivo:** Múltiplos arquivos HTML  
**Severidade:** 🟡 **MÉDIA**

### Problema:
40+ usos de `.innerHTML =` com dados potencialmente não sanitizados

### Exemplo vulnerável:
```javascript
// ❌ Vulnerável a XSS
messageContainer.innerHTML = `<div>${data.error}</div>`;
```

### Solução:
```javascript
// ✅ Sanitizar dados
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

messageContainer.innerHTML = `<div>${sanitizeHTML(data.error)}</div>`;
```

---

## 🟢 PONTO CEGO #16: RATE LIMITING AUSENTE

**Arquivo:** Todas as Netlify Functions  
**Severidade:** 🟡 **MÉDIA**

### Problema:
Nenhuma function tem rate limiting - permite ataques de força bruta

### Solução:

**Criar middleware:**
```javascript
// netlify/functions/utils/rateLimit.js
const attempts = new Map();

function rateLimit(ip, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const userAttempts = attempts.get(ip) || [];
    
    // Remover tentativas antigas
    const recentAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
        return false; // Bloqueado
    }
    
    recentAttempts.push(now);
    attempts.set(ip, recentAttempts);
    return true; // Permitido
}
```

**Usar em login.js:**
```javascript
const clientIp = event.headers['x-forwarded-for'] || 'unknown';

if (!rateLimit(clientIp, 5, 15 * 60 * 1000)) {
    return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Muitas tentativas. Aguarde 15 minutos.' })
    };
}
```

---

## 📊 RESUMO - PRIORIDADES

### 🔴 URGENTE (Corrigir AGORA):
1. **Remover bypass do login** - Causa todos os problemas reportados
2. **Remover log de senhas** - Violação de segurança
3. **Implementar hash de senhas** - bcrypt obrigatório

### 🟠 IMPORTANTE (Esta semana):
4. **Corrigir caminho do catálogo** - Slug correto
5. **Produtos visíveis no catálogo** - Campo visivel_catalogo
6. **Rate limiting** - Proteção contra brute force

### 🟡 MELHORIAS (Próximas semanas):
7. **Cleanup de timers** - Evitar memory leaks
8. **Sanitizar innerHTML** - Proteção XSS
9. **Adicionar testes** - Garantir qualidade

---

## 🚨 AÇÃO IMEDIATA NECESSÁRIA

**PASSO 1: DESABILITAR O BYPASS**

Execute AGORA para corrigir o problema principal:

```bash
# Editar login.js e COMENTAR ou REMOVER linhas 84-114
```

**PASSO 2: LIMPAR DADOS DE TESTE**

No Supabase SQL Editor:
```sql
-- Ver quantos usuários estão usando o ID fake
SELECT COUNT(*) FROM produtos WHERE usuario_id = 'user_carol_gmail';

-- Se necessário, limpar dados de teste
-- DELETE FROM produtos WHERE usuario_id = 'user_carol_gmail';
```

**PASSO 3: TESTAR COM USUÁRIOS REAIS**

Criar novo usuário de teste e verificar se dados ficam isolados.

---

**🔥 SISTEMA ESTÁ EM ESTADO CRÍTICO - CORREÇÃO URGENTE NECESSÁRIA!**
