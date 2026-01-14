# 🔍 AUDITORIA COMPLETA DO SISTEMA - Pontos Cegos Identificados

**Data:** 14 de Janeiro de 2026  
**Status:** ⚠️ CRÍTICO - 8 pontos cegos encontrados

---

## 🚨 PONTOS CEGOS CRÍTICOS

### 1. ⚠️ **WEBHOOK SEM VALIDAÇÃO DE ASSINATURA**
**Arquivo:** `netlify/functions/webhook.js`  
**Problema:**
```javascript
// ❌ PROBLEMA: Webhook aceita qualquer requisição POST
if (event.httpMethod !== 'POST') {
    return { statusCode: 405, ... };
}
// ⚠️ NÃO valida se a requisição veio do Mercado Pago!
```

**Risco:** 🔴 **ALTO**  
- Qualquer pessoa pode enviar requisições falsas ao webhook
- Pode ativar planos pagos sem pagamento real
- Vulnerável a ataques de replay

**Solução:**
```javascript
// ✅ ADICIONAR validação de x-signature do Mercado Pago
const signature = event.headers['x-signature'];
const xRequestId = event.headers['x-request-id'];

// Validar assinatura
const isValid = validateMercadoPagoSignature(signature, event.body, xRequestId);
if (!isValid) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
}
```

---

### 2. 🔐 **RLS POLICIES MUITO PERMISSIVAS**
**Arquivo:** `supabase-schema.sql`  
**Problema:**
```sql
-- ❌ PROBLEMA: Service role tem acesso TOTAL sem restrições
CREATE POLICY "Service role tem acesso total a usuarios" ON usuarios
FOR ALL USING (true) WITH CHECK (true);
```

**Risco:** 🔴 **ALTO**  
- Se alguém obtiver a service key, tem acesso total ao banco
- Não há auditoria de quem acessou o quê
- Impossível rastrear acessos indevidos

**Solução:**
```sql
-- ✅ ADICIONAR policies específicas por role
CREATE POLICY "Usuarios veem apenas seus dados" ON usuarios
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Service role acesso auditado" ON usuarios
FOR ALL USING (
    current_setting('request.jwt.claims')::json->>'role' = 'service_role'
    AND current_setting('app.source', true) IN ('webhook', 'admin', 'sync')
);
```

---

### 3. 💾 **SINCRONIZAÇÃO EM LOOP (N+1)**
**Arquivo:** `public/js/app.js` - linha 305  
**Problema:**
```javascript
// ❌ PROBLEMA: Para cada produto faz 2 queries ao banco
async syncProducts(userId, products) {
    for (const product of products) {  // Loop
        // Query 1: SELECT
        const existing = await supabase.select('produtos', { 
            filters: { usuario_id: userId, id: product.id }
        });
        
        // Query 2: UPDATE ou INSERT
        if (existing.data && existing.data.length > 0) {
            await supabase.update('produtos', ...);
        } else {
            await supabase.insert('produtos', ...);
        }
    }
}
```

**Risco:** 🟡 **MÉDIO**  
- Com 50 produtos = 100 queries ao banco
- Pode causar timeout e lentidão
- Desperdiça recursos do Supabase

**Solução:**
```javascript
// ✅ USAR upsert em batch
async syncProducts(userId, products) {
    const productData = products.map(p => ({
        id: p.id,
        usuario_id: userId,
        nome: p.name,
        // ... outros campos
    }));
    
    // 1 única query para todos os produtos
    const result = await supabase.upsert('produtos', productData);
}
```

---

### 4. 🔄 **DOUBLE SYNC (localStorage ↔ Supabase)**
**Arquivo:** `public/js/app.js` - linha 196  
**Problema:**
```javascript
// ❌ PROBLEMA: Salva no localStorage, triggera sync, que salva no banco,
// que retorna dados, que salva no localStorage novamente
setState(newState) {
    DataManager.save('appState', newState);  // Salva local
    this.syncToSupabase(newState);           // Envia pro banco
}

// Depois, ao carregar:
loadDataFromSupabase() {
    const data = await supabase.select(...);
    DataManager.save('appState', data);      // Salva local DE NOVO
}
```

**Risco:** 🟡 **MÉDIO**  
- Pode criar conflitos de versão
- Dados podem ser sobrescritos incorretamente
- Usuário pode perder alterações

**Solução:**
```javascript
// ✅ ADICIONAR timestamp e versionamento
setState(newState) {
    newState._version = Date.now();
    newState._source = 'local';
    
    DataManager.save('appState', newState);
    
    // Só sincroniza se for alteração local
    if (newState._source === 'local') {
        this.syncToSupabase(newState);
    }
}

// Ao carregar do banco
loadDataFromSupabase() {
    const data = await supabase.select(...);
    const local = DataManager.load('appState');
    
    // Mesclar baseado em timestamp
    const merged = data._version > local._version ? data : local;
    merged._source = 'sync';
    DataManager.save('appState', merged);
}
```

---

### 5. ⏰ **TRIAL EXPIRA MAS USUÁRIO PODE CONTINUAR USANDO**
**Arquivo:** `public/js/app.js` - linha 6155  
**Problema:**
```javascript
// ❌ PROBLEMA: Modal é mostrado, mas não bloqueia navegação
if (daysLeft === 0) {
    showTrialExpiredModal();
    return; // ⚠️ Só retorna da função, não bloqueia o app!
}

// Usuário pode fechar o modal e continuar usando
```

**Risco:** 🟡 **MÉDIO**  
- Usuários podem usar o app após trial expirado
- Basta fechar o modal ou usar DevTools
- Perda de receita

**Solução:**
```javascript
// ✅ BLOQUEAR toda a navegação quando expirado
if (daysLeft === 0) {
    showTrialExpiredModal();
    
    // Bloquear TODAS as ações
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#trial-modal') && 
            !e.target.closest('a[href*="checkout"]')) {
            e.preventDefault();
            e.stopPropagation();
            alert('⚠️ Seu trial expirou. Assine para continuar.');
        }
    }, true);
    
    // Remover botão de fechar o modal
    return;
}

// OU redirecionar forçadamente
if (daysLeft === 0 && !window.location.href.includes('checkout')) {
    window.location.href = '/checkout?source=trial_expired&force=true';
}
```

---

### 6. 🔑 **TOKENS E SECRETS NO CÓDIGO**
**Arquivo:** Vários  
**Problema:**
```javascript
// ❌ Em alguns lugares, keys podem vazar
const supabaseUrl = 'https://ldfahdueqzgemplxrffm.supabase.co'; // Público
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;      // OK

// ⚠️ Mas se o .env não estiver configurado corretamente...
```

**Risco:** 🟠 **MÉDIO-ALTO**  
- Se .env vazar, todo o sistema é comprometido
- Anon key do Supabase é pública (OK), mas service key não pode vazar

**Solução:**
```javascript
// ✅ SEMPRE validar variáveis de ambiente
if (!process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY não configurada!');
}

// ✅ Adicionar .env ao .gitignore
// ✅ Usar secrets do Netlify para produção
// ✅ Rotar keys periodicamente
```

---

### 7. 📧 **EMAIL NÃO VERIFICADO**
**Arquivo:** `netlify/functions/start-trial.js`  
**Problema:**
```javascript
// ❌ PROBLEMA: Qualquer email é aceito, mesmo falsos
if (!emailRegex.test(email)) {
    return { statusCode: 400, error: 'Email inválido' };
}

// ⚠️ Mas não verifica se o email EXISTE de verdade
// Usuários podem criar trials com emails fake
```

**Risco:** 🟡 **MÉDIO**  
- Usuários podem criar múltiplos trials com emails fake
- Impossível recuperar contas
- Banco de dados cheio de lixo

**Solução:**
```javascript
// ✅ ADICIONAR verificação de email
// 1. Enviar código de verificação
const verificationCode = generateCode();
await sendEmail(email, `Seu código: ${verificationCode}`);

// 2. Só ativar trial após verificação
const { data } = await supabase.insert('usuarios', {
    email,
    status: 'pending_verification',  // ⚠️ Não ativo ainda
    verification_code: verificationCode,
    plano: 'trial'
});

// 3. Endpoint para verificar
// POST /verify-email { email, code }
```

---

### 8. 🗄️ **FALTA ÍNDICES NO BANCO**
**Arquivo:** `supabase-schema.sql`  
**Problema:**
```sql
-- ✅ Tem alguns índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_plano ON usuarios(plano);

-- ❌ MAS FALTAM MUITOS outros importantes
-- Queries comuns que ficam lentas:
SELECT * FROM produtos WHERE usuario_id = ? AND ativo = true;
SELECT * FROM vendas WHERE usuario_id = ? ORDER BY data_venda DESC;
SELECT * FROM clientes WHERE usuario_id = ? AND nome ILIKE '%?%';
```

**Risco:** 🟡 **MÉDIO**  
- Queries lentas quando usuário tem muitos dados
- Pode causar timeout
- Experiência ruim para usuários

**Solução:**
```sql
-- ✅ ADICIONAR índices para queries comuns
CREATE INDEX idx_produtos_usuario_ativo ON produtos(usuario_id, ativo);
CREATE INDEX idx_produtos_categoria ON produtos(categoria);
CREATE INDEX idx_vendas_usuario_data ON vendas(usuario_id, data_venda DESC);
CREATE INDEX idx_clientes_usuario_nome ON clientes(usuario_id, nome);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_assinaturas_usuario_status ON assinaturas(usuario_id, status);

-- ✅ Índice para busca textual
CREATE INDEX idx_clientes_nome_gin ON clientes USING gin(to_tsvector('portuguese', nome));
CREATE INDEX idx_produtos_nome_gin ON produtos USING gin(to_tsvector('portuguese', nome));
```

---

## 📊 RESUMO DAS PRIORIDADES

### 🔴 URGENTE (Corrigir AGORA)
1. **Webhook sem validação** - Risco de fraude
2. **RLS muito permissivo** - Risco de vazamento de dados

### 🟠 IMPORTANTE (Corrigir esta semana)
3. **N+1 queries** - Performance ruim
4. **Trial não bloqueia** - Perda de receita
5. **Email não verificado** - Spam e fraudes

### 🟡 MELHORIAS (Corrigir no próximo ciclo)
6. **Double sync** - Bugs potenciais
7. **Falta de índices** - Lentidão futura
8. **Gestão de secrets** - Segurança preventiva

---

## ✅ AÇÕES RECOMENDADAS

### Curto Prazo (Esta Semana)
- [ ] Adicionar validação de signature no webhook
- [ ] Revisar e restringir RLS policies
- [ ] Implementar bloqueio real quando trial expira

### Médio Prazo (Próximas 2 Semanas)
- [ ] Otimizar sync com upsert em batch
- [ ] Adicionar verificação de email
- [ ] Criar índices faltantes no banco

### Longo Prazo (Próximo Mês)
- [ ] Implementar versionamento de dados
- [ ] Adicionar auditoria de acessos
- [ ] Monitoramento e alertas de performance

---

## 🛡️ BOAS PRÁTICAS ADICIONAIS

### Segurança
- Implementar rate limiting no webhook
- Adicionar logs de auditoria
- Rotar keys trimestralmente
- Adicionar 2FA para admin

### Performance
- Implementar cache (Redis) para dados frequentes
- Usar CDN para imagens de produtos
- Lazy loading de dados no frontend
- Pagination nas listagens grandes

### Monitoramento
- Adicionar Sentry para erros
- Dashboard com métricas (Grafana)
- Alertas quando webhook falhar
- Monitorar uso de queries do Supabase

---

**🎯 Próximo Passo:** Priorizar correções dos pontos 1, 2 e 4 que são os mais críticos.
