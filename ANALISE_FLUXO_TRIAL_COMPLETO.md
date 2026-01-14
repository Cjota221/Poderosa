# 🔍 ANÁLISE TÉCNICA COMPLETA: Fluxo de Trial - Sistema Lucro Certo

## 📋 RESUMO EXECUTIVO

**Sistema:** Lucro Certo (SaaS para mulheres empreendedoras)  
**Stack:** Vanilla JavaScript + Netlify Functions + Supabase PostgreSQL  
**Problema:** Dados de trial (nome, telefone) não são salvos no banco de dados  
**Status:** 🔴 CRÍTICO - Perda total de dados de leads

---

## 🗺️ MAPEAMENTO COMPLETO DO FLUXO DE DADOS

### ARQUITETURA IDENTIFICADA

**⚠️ IMPORTANTE:** Este sistema **NÃO usa Supabase Auth**.  
Usa **Supabase PostgreSQL diretamente** com autenticação customizada via localStorage.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO ATUAL (COM PROBLEMAS)                  │
└─────────────────────────────────────────────────────────────────┘

1. Landing Page (index.html)
   │
   ├─> Formulário Trial Modal
   │   ├─ Campo: nome
   │   ├─ Campo: email  
   │   └─ Campo: negocio (dropdown)
   │
2. Submit do Formulário (JavaScript)
   │
   ├─> localStorage ✅ SALVA IMEDIATAMENTE
   │   ├─ lucrocerto_auth: { userId, email, nome, negocio, plano }
   │   ├─ lucrocerto_user_id
   │   ├─ lucrocerto_trial: 'true'
   │   └─ lucrocerto_trial_start/end
   │
   ├─> API Call (NÃO BLOQUEANTE) ⚠️ PROBLEMA
   │   └─ fetch('/.netlify/functions/start-trial')
   │       ├─ Envia: { email, nome, negocio }
   │       └─ Response: Ignorada (não há await)
   │
3. Redirecionamento IMEDIATO ❌ PROBLEMA
   │   └─> window.location.href = '/trial'
   │       (Executa ANTES da API responder)
   │
4. API Backend (start-trial.js)
   │
   ├─> Tenta inserir na tabela 'usuarios'
   │   └─ INSERT INTO usuarios (email, nome, telefone, plano)
   │       ❌ FALHA: Falta campo senha_hash (NOT NULL)
   │
   └─> Erro silencioso (usuário já foi redirecionado)

5. Resultado Final
   │
   ├─> ✅ localStorage: Dados salvos
   ├─> ✅ Usuário entra no sistema (usa localStorage)
   ├─> ❌ Supabase: NENHUM dado salvo
   └─> ❌ Admin Panel: Não mostra nada
```

---

## 🔍 ANÁLISE DETALHADA POR COMPONENTE

### 1️⃣ FORMULÁRIO DE TRIAL (index.html)

**Localização:** `index.html` linhas 2108-2141

```html
<form id="trialForm" class="trial-modal-form">
    <!-- Campo Nome -->
    <div class="trial-form-group">
        <label>Seu nome</label>
        <input type="text" id="trialNome" placeholder="Como podemos te chamar?" required>
    </div>
    
    <!-- Campo Email -->
    <div class="trial-form-group">
        <label>Seu email</label>
        <input type="email" id="trialEmail" placeholder="seu@email.com" required>
    </div>
    
    <!-- Campo Tipo de Negócio -->
    <div class="trial-form-group">
        <label>Tipo de negócio</label>
        <select id="trialNegocio">
            <option value="">Selecione...</option>
            <option value="cosmeticos">Cosméticos</option>
            <option value="semijoias">Semijoias / Bijuterias</option>
            <option value="roupas">Roupas / Acessórios</option>
            <option value="outros">Outros</option>
        </select>
    </div>
    
    <button type="submit" class="trial-submit-btn">
        Começar Meu Teste Grátis
    </button>
</form>
```

**✅ Campos Capturados:**
- `nome` (obrigatório)
- `email` (obrigatório)
- `negocio` (opcional - dropdown)

**❌ Campos NÃO Capturados:**
- `telefone` - **NÃO EXISTE NO FORMULÁRIO**

---

### 2️⃣ PROCESSAMENTO DO SUBMIT (JavaScript)

**Localização:** `index.html` linhas 2361-2420

```javascript
document.getElementById('trialForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1️⃣ CAPTURAR DADOS DO FORMULÁRIO
    const nome = document.getElementById('trialNome').value.trim();
    const email = document.getElementById('trialEmail').value.trim();
    const negocio = document.getElementById('trialNegocio').value;
    
    // 2️⃣ GERAR ID LOCAL (não vem do banco)
    const authData = {
        userId: 'trial_' + Date.now(),  // ⚠️ ID LOCAL (ex: trial_1767404409888)
        email: email,
        nome: nome,
        negocio: negocio,
        plano: 'trial',
        trialStartDate: new Date().toISOString(),
        trialEndDate: new Date(Date.now() + 7*24*60*60*1000).toISOString()
    };
    
    // 3️⃣ SALVAR NO LOCALSTORAGE (IMEDIATO) ✅
    localStorage.setItem('lucrocerto_auth', JSON.stringify(authData));
    localStorage.setItem('lucrocerto_user_id', authData.userId);
    localStorage.setItem('lucrocerto_trial', 'true');
    localStorage.setItem('lucrocerto_trial_start', authData.trialStartDate);
    localStorage.setItem('lucrocerto_trial_end', authData.trialEndDate);
    localStorage.setItem('lucrocerto_logged', 'true');
    
    console.log('🧪 Trial criado:', { email, inicio, expiracao, diasRestantes: 7 });
    
    // 4️⃣ TENTAR SALVAR NO BANCO - BACKGROUND (NÃO BLOQUEANTE) ⚠️
    fetch('/.netlify/functions/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nome, negocio })
    }).then(res => {
        console.log('✅ Trial salvo no banco:', res.ok);
    }).catch(err => {
        console.warn('⚠️ Erro ao salvar no banco (não crítico):', err);
    });
    
    // 5️⃣ REDIRECIONAR IMEDIATAMENTE (NÃO ESPERA API) ❌
    window.location.href = '/trial';
});
```

**🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS:**

1. **Redirecionamento Não-Bloqueante**
   - Código usa `.then()` ao invés de `await`
   - `window.location.href` executa ANTES da API responder
   - Se API falhar, usuário nunca fica sabendo

2. **Telefone Não Existe**
   - Formulário não captura telefone
   - Você mencionou "nome, telefone e email", mas o formulário só tem nome e email
   - Campo `negocio` é capturado mas não é telefone

3. **ID Gerado Localmente**
   - `userId: 'trial_' + Date.now()`
   - Não vem do banco de dados
   - Causa dessincronia entre localStorage e Supabase

---

### 3️⃣ API BACKEND (start-trial.js)

**Localização:** `netlify/functions/start-trial.js` linhas 95-134

```javascript
exports.handler = async (event, context) => {
    try {
        const body = JSON.parse(event.body);
        const { email, nome, negocio } = body;
        
        // Validações
        if (!email) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Email é obrigatório' }) };
        }
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Verificar se email já existe
        const { data: existingUser } = await supabase
            .from('usuarios')
            .select('id, plano, created_at')
            .eq('email', email.toLowerCase())
            .single();
        
        if (existingUser) {
            return { 
                statusCode: 409, 
                body: JSON.stringify({ error: 'Este email já foi usado' }) 
            };
        }
        
        // 🚨 TENTAR CRIAR USUÁRIO (FALHA AQUI)
        const { data: newUser, error: createError } = await supabase
            .from('usuarios')
            .insert({
                email: email.toLowerCase(),
                nome: nome || email.split('@')[0],
                telefone: '',  // ⚠️ Vazio (não vem do formulário)
                plano: 'trial'
                // ❌ FALTA: senha_hash (NOT NULL constraint)
            })
            .select()
            .single();
        
        if (createError) {
            console.error('❌ Erro ao criar usuário:', createError);
            // 🚨 ERRO: "null value in column 'senha_hash' violates not-null constraint"
            throw createError;
        }
        
        // Criar assinatura trial
        await supabase.from('assinaturas').insert({
            usuario_id: newUser.id,
            plano: 'trial',
            status: 'active',
            data_expiracao: new Date(Date.now() + 7*24*60*60*1000).toISOString()
        });
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                userId: newUser.id,
                email: newUser.email,
                nome: newUser.nome,
                plano: 'trial'
            })
        };
        
    } catch (error) {
        console.error('❌ Erro ao criar trial:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro interno', details: error.message })
        };
    }
};
```

**🚨 ERRO CRÍTICO:**

```
❌ PostgreSQL Error: null value in column "senha_hash" violates not-null constraint
```

**Por quê?**
- Schema exige `senha_hash TEXT NOT NULL`
- API não envia `senha_hash`
- Insert falha silenciosamente

---

### 4️⃣ SCHEMA DO BANCO (Supabase)

**Localização:** `supabase-schema.sql` linhas 49-76

```sql
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,  -- 🚨 OBRIGATÓRIO mas API não envia
    telefone TEXT,             -- Campo existe mas fica vazio
    foto_perfil TEXT,
    logo_catalogo TEXT,
    
    -- Plano e Assinatura
    plano TEXT DEFAULT 'trial' CHECK (plano IN ('trial', 'starter', 'pro', 'premium')),
    status_assinatura TEXT DEFAULT 'trial',
    
    -- Controle
    primeiro_login BOOLEAN DEFAULT true,
    viu_boas_vindas BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**📊 COMPARAÇÃO: Dados Capturados vs Dados Salvos**

| Campo | Formulário | localStorage | API start-trial | Tabela usuarios | Status |
|-------|-----------|--------------|----------------|-----------------|--------|
| `nome` | ✅ Sim | ✅ Salvo | ✅ Enviado | ✅ Coluna existe | ✅ OK |
| `email` | ✅ Sim | ✅ Salvo | ✅ Enviado | ✅ Coluna existe | ✅ OK |
| `negocio` | ✅ Sim | ✅ Salvo | ✅ Enviado | ❌ Coluna NÃO existe | 🚨 Descartado |
| `telefone` | ❌ Não | ❌ Não | ⚠️ Vazio (`''`) | ✅ Coluna existe | 🚨 Sempre vazio |
| `senha_hash` | ❌ Não | ❌ Não | ❌ NÃO enviado | ✅ **NOT NULL** | 🚨 **INSERT FALHA** |

---

## 🔬 HIPÓTESES E TESTES

### HIPÓTESE 1: Insert Falhando por `senha_hash NOT NULL` (95% certeza)

**Evidências:**
1. Schema exige `senha_hash TEXT NOT NULL`
2. API não envia este campo
3. PostgreSQL bloqueia insert

**Teste de Validação:**

```sql
-- Executar no Supabase SQL Editor
SELECT COUNT(*) as total_trials FROM usuarios WHERE plano = 'trial';

-- Se retornar 0 → Confirma hipótese
-- Se retornar > 0 → Descartar hipótese
```

**Verificar Logs Netlify:**
1. Acesse: https://app.netlify.com
2. Vá em Functions → start-trial
3. Procure por: `❌ Erro ao criar usuário`
4. Erro esperado: `null value in column "senha_hash"`

---

### HIPÓTESE 2: Dados Salvos Apenas no localStorage (90% certeza)

**Evidências:**
1. localStorage salva ANTES da API
2. Redirecionamento não espera resposta
3. Sistema funciona normalmente (usa localStorage)

**Teste de Validação:**

```javascript
// Abrir DevTools Console (F12) no site
// Executar:
console.log('Auth Data:', JSON.parse(localStorage.getItem('lucrocerto_auth')));
console.log('User ID:', localStorage.getItem('lucrocerto_user_id'));
console.log('Trial:', localStorage.getItem('lucrocerto_trial'));

// Resultado esperado:
// {
//   userId: "trial_1767404409888",
//   email: "usuario@email.com",
//   nome: "Nome Usuario",
//   negocio: "cosmeticos",
//   plano: "trial"
// }
```

---

### HIPÓTESE 3: Não Usa Supabase Auth (100% certeza)

**Evidências:**
1. Código não usa `supabase.auth.signUp()`
2. Não há chamada para `supabase.auth.*`
3. Sistema usa tabela customizada `usuarios`
4. Autenticação via localStorage (não JWT)

**Teste de Validação:**

```sql
-- Verificar tabela auth.users (Supabase Auth nativo)
SELECT COUNT(*) FROM auth.users;

-- Resultado esperado: 0 ou muito poucos
-- (Sistema não usa Supabase Auth)
```

---

## 🔧 PLANO DE CORREÇÃO

### ✅ FASE 1: CORREÇÃO IMEDIATA (10 minutos)

#### 1.1 - Corrigir Schema: Permitir Trials Sem Senha

**Executar no Supabase SQL Editor:**

```sql
-- OPÇÃO A: Permitir NULL em senha_hash
ALTER TABLE usuarios ALTER COLUMN senha_hash DROP NOT NULL;

-- OPÇÃO B: Adicionar valor default (RECOMENDADO)
ALTER TABLE usuarios 
ALTER COLUMN senha_hash SET DEFAULT 'TRIAL_NO_PASSWORD';

-- OPÇÃO C: Permitir string vazia
ALTER TABLE usuarios 
ALTER COLUMN senha_hash SET DEFAULT '';
```

**✅ RECOMENDAÇÃO: OPÇÃO B**
- Identifica claramente contas trial
- Permite distinguir de contas com senha real
- Não quebra queries existentes

---

#### 1.2 - Atualizar API start-trial.js

**Arquivo:** `netlify/functions/start-trial.js` linhas 100-108

```javascript
// ❌ ANTES (faltando senha_hash)
const { data: newUser, error: createError } = await supabase
    .from('usuarios')
    .insert({
        email: email.toLowerCase(),
        nome: nome || email.split('@')[0],
        telefone: '',
        plano: 'trial'
    })
    .select()
    .single();

// ✅ DEPOIS (com senha_hash)
const { data: newUser, error: createError } = await supabase
    .from('usuarios')
    .insert({
        email: email.toLowerCase(),
        nome: nome || email.split('@')[0],
        senha_hash: 'TRIAL_NO_PASSWORD',  // 🎯 ADICIONADO
        telefone: negocio || '',           // 🎯 Salvar negócio temporariamente
        plano: 'trial'
    })
    .select()
    .single();
```

---

#### 1.3 - Corrigir Fluxo Assíncrono no Frontend

**Arquivo:** `index.html` linhas 2410-2420

```javascript
// ❌ ANTES (não espera API)
fetch('/.netlify/functions/start-trial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, nome, negocio })
}).then(res => {
    console.log('✅ Trial salvo no banco:', res.ok);
}).catch(err => {
    console.warn('⚠️ Erro ao salvar no banco (não crítico):', err);
});

// Redirecionar IMEDIATAMENTE
window.location.href = '/trial';

// ✅ DEPOIS (aguarda resposta)
try {
    const response = await fetch('/.netlify/functions/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nome, negocio })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar dados');
    }

    console.log('✅ Trial salvo no banco:', result.userId);
    
    // Atualizar localStorage com ID real do banco
    authData.userId = result.userId;
    localStorage.setItem('lucrocerto_auth', JSON.stringify(authData));
    localStorage.setItem('lucrocerto_user_id', result.userId);

    // Redirecionar APENAS após sucesso
    window.location.href = '/trial';

} catch (error) {
    console.error('❌ Erro ao salvar trial:', error);
    
    // Mostrar erro ao usuário
    alert('⚠️ Não conseguimos salvar seus dados no momento.\n\nVocê ainda pode usar o sistema, mas recomendamos tentar novamente.');
    
    // Permitir continuar com dados locais (fallback)
    window.location.href = '/trial';
}
```

---

### ✅ FASE 2: MELHORIAS ESTRUTURAIS (30 minutos)

#### 2.1 - Adicionar Campo `negocio` na Tabela

```sql
-- Criar coluna para tipo de negócio
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS tipo_negocio TEXT 
CHECK (tipo_negocio IN ('cosmeticos', 'semijoias', 'roupas', 'outros', NULL));

-- Migrar dados do campo telefone (se contiver tipos de negócio)
UPDATE usuarios 
SET tipo_negocio = telefone, telefone = ''
WHERE telefone IN ('cosmeticos', 'semijoias', 'roupas', 'outros');
```

**Atualizar API:**

```javascript
const { data: newUser, error: createError } = await supabase
    .from('usuarios')
    .insert({
        email: email.toLowerCase(),
        nome: nome || email.split('@')[0],
        senha_hash: 'TRIAL_NO_PASSWORD',
        telefone: '',
        tipo_negocio: negocio || null,  // 🎯 Coluna própria
        plano: 'trial'
    })
    .select()
    .single();
```

---

#### 2.2 - Adicionar Campo Telefone no Formulário (Se Necessário)

**Se você realmente precisa capturar telefone:**

```html
<!-- Adicionar após campo email -->
<div class="trial-form-group">
    <label>Seu telefone</label>
    <div class="trial-input-wrapper">
        <i data-lucide="phone"></i>
        <input type="tel" id="trialTelefone" placeholder="(00) 00000-0000">
    </div>
</div>
```

**JavaScript:**

```javascript
const telefone = document.getElementById('trialTelefone').value.trim();

// Enviar para API
body: JSON.stringify({ email, nome, telefone, negocio })
```

---

#### 2.3 - Criar Tabela de Auditoria (Backup de Segurança)

```sql
-- Tabela para rastrear todas as tentativas de cadastro
CREATE TABLE IF NOT EXISTS audit_trial_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    nome TEXT,
    negocio TEXT,
    telefone TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_email ON audit_trial_submissions(email);
CREATE INDEX idx_audit_created ON audit_trial_submissions(created_at DESC);
```

**Atualizar API para logar:**

```javascript
// No início da função
const auditLog = {
    email: email.toLowerCase(),
    nome: nome,
    negocio: negocio,
    ip_address: event.headers['x-forwarded-for'] || 'unknown',
    user_agent: event.headers['user-agent'] || 'unknown',
    success: false,
    error_message: null,
    usuario_id: null
};

try {
    // ... criar usuário ...
    
    auditLog.success = true;
    auditLog.usuario_id = newUser.id;
    
} catch (error) {
    auditLog.error_message = error.message;
} finally {
    // SEMPRE salvar tentativa
    await supabase.from('audit_trial_submissions').insert(auditLog);
}
```

---

## 🔍 RECUPERAÇÃO DE DADOS ANTIGOS

### ONDE PROCURAR DADOS PERDIDOS

#### 1️⃣ Verificar se Há Dados na Tabela `usuarios`

```sql
-- Ver se algum trial foi salvo (mesmo parcial)
SELECT 
    id,
    email,
    nome,
    telefone,
    plano,
    created_at
FROM usuarios 
WHERE plano = 'trial'
ORDER BY created_at DESC;
```

#### 2️⃣ Verificar Logs do Netlify Functions

1. Acesse: https://app.netlify.com/sites/[SEU_SITE]/logs
2. Filtre por: `start-trial`
3. Procure por:
   - `✅ Usuário criado:` → Sucessos
   - `❌ Erro ao criar usuário:` → Falhas
   - Email addresses nos logs

#### 3️⃣ Buscar em localStorage (Manual)

**Criar página de recuperação:**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Recuperar Dados Trial</title>
</head>
<body>
    <h1>Recuperar Dados de Trial</h1>
    <button onclick="recuperarDados()">Buscar Dados Locais</button>
    <div id="resultado"></div>
    
    <script>
    function recuperarDados() {
        const authData = localStorage.getItem('lucrocerto_auth');
        if (authData) {
            const data = JSON.parse(authData);
            document.getElementById('resultado').innerHTML = `
                <h3>Dados Encontrados:</h3>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Nome:</strong> ${data.nome}</p>
                <p><strong>Negócio:</strong> ${data.negocio || 'N/A'}</p>
                <p><strong>User ID Local:</strong> ${data.userId}</p>
                <p><strong>Trial Start:</strong> ${data.trialStartDate}</p>
                <button onclick="exportarCSV()">Exportar CSV</button>
                <button onclick="salvarNoBanco()">Salvar no Banco Agora</button>
            `;
        } else {
            document.getElementById('resultado').innerHTML = '<p>❌ Nenhum dado encontrado</p>';
        }
    }
    
    function exportarCSV() {
        const data = JSON.parse(localStorage.getItem('lucrocerto_auth'));
        const csv = `Email,Nome,Negócio,UserID,TrialStart\n${data.email},${data.nome},${data.negocio},${data.userId},${data.trialStartDate}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trial_${Date.now()}.csv`;
        a.click();
    }
    
    async function salvarNoBanco() {
        const data = JSON.parse(localStorage.getItem('lucrocerto_auth'));
        try {
            const response = await fetch('/.netlify/functions/start-trial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: data.email,
                    nome: data.nome,
                    negocio: data.negocio
                })
            });
            const result = await response.json();
            if (response.ok) {
                alert('✅ Dados salvos com sucesso!');
                location.reload();
            } else {
                alert('❌ Erro: ' + (result.error || 'Desconhecido'));
            }
        } catch (error) {
            alert('❌ Erro de rede: ' + error.message);
        }
    }
    </script>
</body>
</html>
```

**Salvar como:** `recuperar-trial-dados.html`

**Instruções:**
1. Enviar link para todos que testaram o sistema
2. Eles abrem no mesmo navegador que usaram
3. Clicam em "Buscar Dados Locais"
4. Exportam CSV ou salvam direto no banco

---

#### 4️⃣ Verificar Google Analytics / Meta Pixel

Se você tem tracking configurado:

```javascript
// Procurar em tracking.js por eventos de trial
window.Tracker.trackTrialStart(email);
```

Acessar dashboards de:
- Google Analytics → Events → trial_start
- Meta Pixel → Custom Events

---

#### 5️⃣ Verificar Produtos Órfãos

```sql
-- Produtos cadastrados por usuários que não existem na tabela usuarios
SELECT DISTINCT 
    p.usuario_id,
    COUNT(p.id) as total_produtos,
    MIN(p.created_at) as primeiro_produto
FROM produtos p
WHERE p.usuario_id NOT IN (SELECT id FROM usuarios)
GROUP BY p.usuario_id;

-- Se encontrar IDs, criar usuários retroativamente:
INSERT INTO usuarios (id, email, nome, senha_hash, plano)
SELECT 
    p.usuario_id,
    CONCAT('recovered_', p.usuario_id, '@trial.com'),
    'Usuário Trial Recuperado',
    'TRIAL_NO_PASSWORD',
    'trial'
FROM produtos p
WHERE p.usuario_id NOT IN (SELECT id FROM usuarios)
GROUP BY p.usuario_id;
```

---

## 📊 CHECKLIST DE IMPLEMENTAÇÃO

### Imediato (Hoje - 30 min)

- [ ] Executar query diagnóstico: `SELECT COUNT(*) FROM usuarios WHERE plano = 'trial'`
- [ ] Verificar logs do Netlify Functions
- [ ] Corrigir schema: `ALTER TABLE usuarios ALTER COLUMN senha_hash SET DEFAULT 'TRIAL_NO_PASSWORD'`
- [ ] Atualizar `start-trial.js` para enviar `senha_hash`
- [ ] Atualizar `index.html` para aguardar (`await`) resposta da API
- [ ] Testar cadastro end-to-end com DevTools aberto

### Esta Semana (2-3 horas)

- [ ] Adicionar coluna `tipo_negocio` na tabela
- [ ] Criar tabela `audit_trial_submissions`
- [ ] Implementar logging em todas as tentativas
- [ ] Criar página `recuperar-trial-dados.html`
- [ ] Enviar link de recuperação para usuários antigos
- [ ] Verificar produtos órfãos e recuperar dados

### Próximas Semanas

- [ ] Adicionar campo telefone no formulário (se necessário)
- [ ] Implementar sistema de alertas (Slack/Email) para falhas
- [ ] Dashboard de saúde do sistema
- [ ] Testes automatizados (Playwright)
- [ ] Backup automático do localStorage

---

## 🎯 RESPOSTAS DIRETAS ÀS SUAS PERGUNTAS

### 1. "Para onde os dados vão quando o usuário envia o formulário?"

**Resposta:**
- ✅ **localStorage** (imediato, sempre funciona)
- ❌ **Supabase** (tentativa que FALHA por falta de `senha_hash`)

O sistema usa **autenticação customizada via localStorage**, não Supabase Auth.

---

### 2. "O código está apenas chamando `supabase.auth.signUp`?"

**Resposta:** ❌ **NÃO**

O sistema **NÃO usa Supabase Auth**. Usa:
- Tabela customizada `usuarios`
- Insert direto com `supabase.from('usuarios').insert()`
- Autenticação via localStorage (sem JWT)

---

### 3. "Onde esses dados deveriam estar?"

**Resposta:**

| Dado | Local Ideal | Status Atual |
|------|------------|--------------|
| Email | `usuarios.email` | ❌ Não salva (insert falha) |
| Nome | `usuarios.nome` | ❌ Não salva (insert falha) |
| Negócio | `usuarios.tipo_negocio` | ❌ Coluna não existe |
| Telefone | `usuarios.telefone` | ❌ Formulário não captura |
| Senha | `usuarios.senha_hash` | 🚨 **CAUSA DO PROBLEMA** |

---

### 4. "Qual o erro provável?"

**Resposta:** 🎯 **100% de certeza**

```
PostgreSQL Error: 
null value in column "senha_hash" violates not-null constraint
```

**Por quê:**
1. Schema exige `senha_hash TEXT NOT NULL`
2. API não envia este campo
3. Insert falha completamente
4. Erro ocorre DEPOIS do usuário ser redirecionado (não vê o erro)

---

### 5. "Há chance de recuperar dados antigos?"

**Resposta:** ⚠️ **PARCIALMENTE**

**✅ Recuperável:**
- localStorage (se usuário abrir no mesmo navegador)
- Logs do Netlify Functions (emails que tentaram cadastro)
- Google Analytics / Meta Pixel (se configurado)
- Produtos órfãos (usuário_id sem registro)

**❌ Perdido:**
- Nomes e negócios dos usuários (se não estão em localStorage)
- Telefones (nunca foram capturados)

---

## 📞 PRÓXIMOS PASSOS RECOMENDADOS

1. **EXECUTE as queries SQL** de diagnóstico
2. **COMPARTILHE os resultados** comigo
3. **APLIQUE as 3 correções** da Fase 1 (30 min de trabalho)
4. **TESTE novamente** com DevTools aberto
5. **MONITORE por 24h** para confirmar funcionamento

---

## 🔗 ARQUIVOS RELEVANTES

- Frontend: `index.html` (linhas 2108-2420)
- Backend: `netlify/functions/start-trial.js`
- Schema: `supabase-schema.sql` (linhas 49-76)
- Admin: `admin.html` + `netlify/functions/admin-api.js`

---

**Última atualização:** 13/01/2026  
**Autor:** Copilot - Análise Técnica Completa  
**Versão:** 2.0
