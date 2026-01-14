# 🔍 DIAGNÓSTICO TÉCNICO: Dados de Trial Não Persistidos

## 📋 RESUMO EXECUTIVO

**Problema Crítico:** Dados de usuários trial (nome, telefone, email) não aparecem no banco de dados nem no painel administrativo.

**Causa Raiz Identificada:** Falha na sincronização entre localStorage (front-end) e Supabase (back-end) devido a chamada assíncrona não-bloqueante.

**Impacto:** Perda de dados de leads, impossibilidade de rastreamento, conversão e follow-up.

**Prioridade:** 🔴 CRÍTICA

---

## 🗺️ MAPEAMENTO COMPLETO DO FLUXO DE CADASTRO TRIAL

### 1️⃣ PONTO DE ENTRADA: Landing Page (`index.html`)

**Localização:** Linha 2108-2141
```html
<form id="trialForm" class="trial-modal-form">
    <input type="text" id="trialNome" placeholder="Como podemos te chamar?" required>
    <input type="email" id="trialEmail" placeholder="seu@email.com" required>
    <select id="trialNegocio">
        <option value="cosmeticos">Cosméticos</option>
        <option value="semijoias">Semijoias / Bijuterias</option>
        <!-- ... -->
    </select>
</form>
```

**Campos Capturados:**
- ✅ `nome` (obrigatório)
- ✅ `email` (obrigatório)
- ✅ `negocio` (dropdown: cosméticos, semijoias, roupas, outros)

---

### 2️⃣ PROCESSAMENTO DO FORMULÁRIO

**Localização:** `index.html` linha 2361-2420

#### 🔴 PROBLEMA IDENTIFICADO: Salvamento Assíncrono Não-Bloqueante

```javascript
// Trial form submission - INTEGRADO COM BANCO DE DADOS
document.getElementById('trialForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('trialNome').value.trim();
    const email = document.getElementById('trialEmail').value.trim();
    const negocio = document.getElementById('trialNegocio').value;

    try {
        // 1️⃣ SALVAR NO LOCALSTORAGE (IMEDIATO)
        const authData = {
            userId: 'trial_' + Date.now(),
            email: email,
            nome: nome,
            negocio: negocio,
            plano: 'trial',
            trialStartDate: trialStart.toISOString(),
            trialEndDate: trialEnd.toISOString()
        };

        localStorage.setItem('lucrocerto_auth', JSON.stringify(authData));
        localStorage.setItem('lucrocerto_user_id', authData.userId);
        localStorage.setItem('lucrocerto_trial', 'true');
        
        // 2️⃣ SALVAR NO BANCO - BACKGROUND (NÃO BLOQUEANTE) 🚨
        fetch('/.netlify/functions/start-trial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, nome, negocio })
        }).then(res => {
            console.log('✅ Trial salvo no banco:', res.ok);
        }).catch(err => {
            console.warn('⚠️ Erro ao salvar no banco (não crítico):', err);
        });

        // 3️⃣ REDIRECIONAR IMEDIATAMENTE (NÃO ESPERA API) 🚨
        window.location.href = '/trial';

    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao criar conta: ' + error.message);
    }
});
```

#### ⚠️ ANÁLISE DO PROBLEMA:

| Etapa | O que acontece | Problema |
|-------|----------------|----------|
| 1. Submit do formulário | Dados salvos no localStorage | ✅ Funciona |
| 2. Fetch para API | Chamada assíncrona **não bloqueante** | 🚨 Pode falhar silenciosamente |
| 3. Redirecionamento | `window.location.href = '/trial'` | 🚨 Executa ANTES da API responder |
| 4. Resultado | Usuário redireciona antes de salvar no banco | ❌ Dados perdidos se API falhar |

**Conclusão:** O código **não espera** (`await`) pela resposta da API antes de redirecionar. Se a API falhar ou demorar, os dados nunca chegam ao Supabase.

---

### 3️⃣ API DE CRIAÇÃO: `start-trial.js`

**Localização:** `netlify/functions/start-trial.js` linha 95-134

```javascript
// Criar novo usuário com trial
const { data: newUser, error: createError } = await supabase
    .from('usuarios')
    .insert({
        email: email.toLowerCase(),
        nome: nome || email.split('@')[0],
        telefone: '',  // ⚠️ Campo vazio - não capturado no formulário
        plano: 'trial'
    })
    .select()
    .single();

// Criar registro de assinatura trial
const { error: assinaturaError } = await supabase
    .from('assinaturas')
    .insert({
        usuario_id: newUser.id,
        plano: 'trial',
        status: 'active',
        periodo: 'trial',
        valor: 0,
        data_inicio: new Date().toISOString(),
        data_expiracao: trialEndDate.toISOString()
    });
```

#### ✅ O que a API FAZ:
1. Valida email (regex)
2. Verifica se email já existe
3. Cria registro na tabela `usuarios`
4. Cria registro na tabela `assinaturas`
5. Retorna `userId`, `email`, `nome`, `plano`

#### ⚠️ OBSERVAÇÕES CRÍTICAS:

1. **Campo `telefone` nunca é preenchido:**
   - Formulário não captura telefone
   - API salva `telefone: ''` (vazio)

2. **Campo `negocio` é perdido:**
   - Formulário captura `negocio`
   - API **não salva** (tabela `usuarios` não tem coluna `negocio`)
   - Campo é descartado silenciosamente

3. **Campo `senha_hash` obrigatório:**
   - Schema exige: `senha_hash TEXT NOT NULL`
   - API não envia senha
   - 🚨 **ERRO POTENCIAL:** Insert pode falhar por NOT NULL constraint

---

### 4️⃣ SCHEMA DO BANCO DE DADOS

**Localização:** `supabase-schema.sql` linha 49-76

```sql
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,  -- 🚨 OBRIGATÓRIO mas API não envia
    telefone TEXT,
    foto_perfil TEXT,
    logo_catalogo TEXT,
    
    -- Plano e Assinatura
    plano TEXT DEFAULT 'trial',
    status_assinatura TEXT DEFAULT 'trial',
    
    -- Controle
    primeiro_login BOOLEAN DEFAULT true,
    viu_boas_vindas BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 🚨 INCONSISTÊNCIA CRÍTICA:

| Campo | Schema | API start-trial.js | Status |
|-------|--------|-------------------|--------|
| `email` | NOT NULL | ✅ Enviado | ✅ OK |
| `nome` | NOT NULL | ✅ Enviado | ✅ OK |
| `senha_hash` | **NOT NULL** | ❌ **NÃO enviado** | 🚨 **ERRO** |
| `telefone` | nullable | ✅ Enviado (vazio) | ⚠️ Perda de dado |
| `negocio` | ❌ Não existe | ✅ Capturado mas perdido | ⚠️ Perda de dado |

**Conclusão:** A API **não pode** inserir usuários porque o campo `senha_hash` é obrigatório mas não é enviado.

---

### 5️⃣ PAINEL ADMINISTRATIVO

**Localização:** `admin.html` linha 1245-1282

```javascript
async function loadDashboardFromAPI() {
    // Buscar estatísticas do dashboard
    const response = await fetch(`${API_BASE}?action=dashboard`, {
        headers: {
            'Authorization': `Bearer ${ADMIN_PASSWORD}`
        }
    });
    
    const data = await response.json();
    
    // Atualizar estatísticas
    document.getElementById('totalLeads').textContent = data.totalUsuarios || 0;
    document.getElementById('totalTrials').textContent = data.totalTrials || 0;
}
```

**API Admin:** `netlify/functions/admin-api.js` linha 146-162

```javascript
// Listar trials
if (action === 'trials') {
    const { data: trials, error } = await supabase
        .from('usuarios')
        .select('id, email, nome, created_at')
        .eq('plano', 'trial')
        .order('created_at', { ascending: false });

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ trials: trials || [] })
    };
}
```

#### ✅ O painel FUNCIONA se:
- Dados estiverem na tabela `usuarios`
- Campo `plano` = `'trial'`

#### ❌ O painel NÃO MOSTRA se:
- Insert falhou por constraint de `senha_hash`
- Dados salvos só no localStorage
- RLS (Row Level Security) bloqueando SELECT

---

## 🐛 HIPÓTESES DE FALHA (ORDENADAS POR PROBABILIDADE)

### 🔴 HIPÓTESE 1: Insert Falhando por `senha_hash NOT NULL` (95% de certeza)

**Evidências:**
1. Schema exige `senha_hash TEXT NOT NULL`
2. API `start-trial.js` não envia `senha_hash`
3. PostgreSQL bloqueia insert por constraint violation

**Teste de Validação:**
```sql
-- Executar no Supabase SQL Editor
SELECT * FROM usuarios WHERE plano = 'trial' ORDER BY created_at DESC LIMIT 10;

-- Se retornar 0 linhas → Confirma hipótese
-- Se retornar dados → Descartar hipótese
```

**Consultar Logs:**
```bash
# Netlify Functions Logs
netlify functions:log start-trial

# Procurar por:
# "❌ Erro ao criar usuário"
# "error: null value in column 'senha_hash'"
```

---

### 🟡 HIPÓTESE 2: Fetch Assíncrono Falhando Silenciosamente (80% de certeza)

**Evidências:**
1. Código usa `.then()` não-bloqueante
2. Catch apenas loga `console.warn()` (não interrompe)
3. Usuário redireciona antes de API responder

**Teste de Validação:**
```javascript
// Abrir DevTools Console (F12) no navegador
// Preencher formulário de trial
// Verificar logs:
// ✅ "✅ Trial salvo no banco: true" → API funcionou
// ❌ "⚠️ Erro ao salvar no banco (não crítico)" → API falhou
// ❌ Nenhum log → Fetch nunca completou
```

**Teste de Network:**
```
1. Abrir DevTools → Aba Network (F12)
2. Filtrar por "start-trial"
3. Preencher formulário
4. Verificar:
   - Status Code 200 → API respondeu OK
   - Status Code 500 → Erro no servidor
   - Status Code 400 → Dados inválidos
   - (cancelled) → Redirecionamento interrompeu request
```

---

### 🟢 HIPÓTESE 3: RLS Bloqueando Insert de Usuários Trial (30% de certeza)

**Evidências:**
1. Supabase RLS habilitado (linha 412 do schema)
2. start-trial.js usa `SUPABASE_SERVICE_KEY` (deveria bypassar RLS)

**Teste de Validação:**
```sql
-- Ver policies da tabela usuarios
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'usuarios';

-- Ver se permite INSERT público ou service role
-- Esperado: Policy com cmd='INSERT' para service_role
```

---

### 🟢 HIPÓTESE 4: Dados Salvos em Tabela Temporária ou Cache (10% de certeza)

**Evidências:**
- Formulário menciona "diversas pessoas já iniciaram trial"
- Possível tabela intermediária não mapeada

**Teste de Validação:**
```sql
-- Buscar todas as tabelas do schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Procurar por: leads, trials_temp, cadastros, etc.
```

---

## 🔧 PLANO DE CORREÇÃO PRÁTICO

### ✅ FASE 1: DIAGNÓSTICO IMEDIATO (10 minutos)

#### 1.1 - Verificar Dados Atuais no Banco

```sql
-- Executar no Supabase SQL Editor

-- 1. Contar usuários trial
SELECT COUNT(*) as total_trials 
FROM usuarios 
WHERE plano = 'trial';

-- 2. Ver últimos trials criados
SELECT id, email, nome, telefone, created_at 
FROM usuarios 
WHERE plano = 'trial' 
ORDER BY created_at DESC 
LIMIT 20;

-- 3. Ver assinaturas trial
SELECT a.id, a.plano, a.status, u.email, u.nome, a.created_at
FROM assinaturas a
JOIN usuarios u ON a.usuario_id = u.id
WHERE a.plano = 'trial'
ORDER BY a.created_at DESC
LIMIT 20;

-- 4. Verificar se há usuários sem senha_hash
SELECT COUNT(*) as sem_senha 
FROM usuarios 
WHERE senha_hash IS NULL OR senha_hash = '';
```

**Resultado esperado:**
- ✅ Se `total_trials > 0` → Dados estão salvando (investigar por que não aparecem no painel)
- ❌ Se `total_trials = 0` → Confirma que insert está falhando

---

#### 1.2 - Verificar Logs da API

```bash
# No terminal, acessar Netlify CLI
netlify functions:log start-trial --live

# OU acessar: https://app.netlify.com/sites/[SEU_SITE]/functions/start-trial
```

**Procurar por erros:**
- `❌ Erro ao criar usuário`
- `null value in column 'senha_hash'`
- `PGRST` (erros do Supabase)
- `400`, `500` (status de erro)

---

#### 1.3 - Testar Insert Manual

```sql
-- Executar no Supabase SQL Editor
-- Tentar criar usuário trial MANUALMENTE

INSERT INTO usuarios (email, nome, senha_hash, telefone, plano)
VALUES (
    'teste@trial.com',
    'Usuário Teste',
    'dummy_hash_for_trial',  -- Hash temporário
    '',
    'trial'
)
RETURNING id, email, nome, plano;

-- Se retornar erro → Confirma problema de schema
-- Se funcionar → Problema está na API start-trial.js
```

---

### ✅ FASE 2: CORREÇÃO ESTRUTURAL (30 minutos)

#### 2.1 - Corrigir Schema: Tornar `senha_hash` Opcional para Trials

```sql
-- OPÇÃO A: Permitir NULL em senha_hash
ALTER TABLE usuarios 
ALTER COLUMN senha_hash DROP NOT NULL;

-- OPÇÃO B: Adicionar valor default
ALTER TABLE usuarios 
ALTER COLUMN senha_hash SET DEFAULT 'TRIAL_NO_PASSWORD';

-- RECOMENDAÇÃO: OPÇÃO B (mais segura)
```

#### 2.2 - Atualizar API `start-trial.js`

**Localização:** `netlify/functions/start-trial.js` linha 100-108

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

// ✅ DEPOIS (com senha_hash para trials)
const { data: newUser, error: createError } = await supabase
    .from('usuarios')
    .insert({
        email: email.toLowerCase(),
        nome: nome || email.split('@')[0],
        senha_hash: 'TRIAL_NO_PASSWORD',  // 🎯 ADICIONADO
        telefone: negocio || '',  // 🎯 Salvar negócio no campo telefone (temporário)
        plano: 'trial'
    })
    .select()
    .single();
```

**Justificativa:**
- Trial não precisa de senha real (acesso via link ou localStorage)
- Valor fixo `'TRIAL_NO_PASSWORD'` identifica contas trial
- Campo `negocio` salvo temporariamente em `telefone` (até adicionar coluna própria)

---

#### 2.3 - Corrigir Fluxo de Salvamento Assíncrono

**Localização:** `index.html` linha 2361-2420

```javascript
// ❌ ANTES (não espera API, redireciona imediatamente)
fetch('/.netlify/functions/start-trial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, nome, negocio })
}).then(res => {
    console.log('✅ Trial salvo no banco:', res.ok);
}).catch(err => {
    console.warn('⚠️ Erro ao salvar no banco (não crítico):', err);
});

// Redirecionar IMEDIATAMENTE (não espera API)
window.location.href = '/trial';

// ✅ DEPOIS (aguarda API antes de redirecionar)
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
    
    // Atualizar authData com userId real do banco
    authData.userId = result.userId;
    localStorage.setItem('lucrocerto_auth', JSON.stringify(authData));
    localStorage.setItem('lucrocerto_user_id', result.userId);

    // Redirecionar apenas APÓS sucesso
    window.location.href = '/trial';

} catch (error) {
    console.error('❌ Erro ao salvar trial:', error);
    
    // Mostrar erro ao usuário (não silenciar)
    alert('⚠️ Não conseguimos salvar seus dados no momento.\n\nVocê ainda pode usar o sistema, mas recomendamos tentar novamente mais tarde.');
    
    // Permitir continuar com dados locais (fallback)
    window.location.href = '/trial';
}
```

---

### ✅ FASE 3: RECUPERAÇÃO DE DADOS PERDIDOS (20 minutos)

#### 3.1 - Buscar Dados no localStorage (via Admin Panel)

**Criar página:** `c:\Users\carol\Poderosa\recuperar-trials.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Recuperar Dados de Trials</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        .trial-item { 
            background: #f5f5f5; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 8px;
        }
        button { 
            background: #E91E63; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer;
        }
    </style>
</head>
<body>
    <h1>🔍 Recuperar Dados de Trials Perdidos</h1>
    <p>Esta ferramenta busca dados de trials que ficaram apenas no localStorage.</p>
    
    <button onclick="buscarDados()">Buscar Dados Locais</button>
    
    <div id="resultado"></div>

    <script>
        function buscarDados() {
            const authData = localStorage.getItem('lucrocerto_auth');
            const userId = localStorage.getItem('lucrocerto_user_id');
            const trialStart = localStorage.getItem('lucrocerto_trial_start');
            const trialEnd = localStorage.getItem('lucrocerto_trial_end');
            
            const resultado = document.getElementById('resultado');
            
            if (authData) {
                try {
                    const data = JSON.parse(authData);
                    resultado.innerHTML = `
                        <div class="trial-item">
                            <h3>Dados Encontrados:</h3>
                            <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
                            <p><strong>Nome:</strong> ${data.nome || 'N/A'}</p>
                            <p><strong>Negócio:</strong> ${data.negocio || 'N/A'}</p>
                            <p><strong>User ID:</strong> ${data.userId || userId || 'N/A'}</p>
                            <p><strong>Plano:</strong> ${data.plano || 'N/A'}</p>
                            <p><strong>Trial Start:</strong> ${trialStart || 'N/A'}</p>
                            <p><strong>Trial End:</strong> ${trialEnd || 'N/A'}</p>
                            <br>
                            <button onclick="exportarCSV()">Exportar CSV</button>
                            <button onclick="salvarNoBanco()">Salvar no Banco Agora</button>
                        </div>
                    `;
                } catch (e) {
                    resultado.innerHTML = '<p>❌ Erro ao ler dados</p>';
                }
            } else {
                resultado.innerHTML = '<p>⚠️ Nenhum dado encontrado no localStorage</p>';
            }
        }
        
        function exportarCSV() {
            const authData = JSON.parse(localStorage.getItem('lucrocerto_auth'));
            const csv = `Email,Nome,Negócio,UserID,Plano,TrialStart,TrialEnd\n${
                authData.email},${authData.nome},${authData.negocio || ''},${
                authData.userId},${authData.plano},${
                localStorage.getItem('lucrocerto_trial_start')},${
                localStorage.getItem('lucrocerto_trial_end')
            }`;
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trial_${Date.now()}.csv`;
            a.click();
        }
        
        async function salvarNoBanco() {
            const authData = JSON.parse(localStorage.getItem('lucrocerto_auth'));
            
            try {
                const response = await fetch('/.netlify/functions/start-trial', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: authData.email,
                        nome: authData.nome,
                        negocio: authData.negocio
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('✅ Dados salvos no banco com sucesso!');
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

**Usar:** Abrir `https://seu-site.com/recuperar-trials.html` em cada navegador que usou o sistema.

---

#### 3.2 - Query para Encontrar Usuários com Produtos mas Sem Registro

```sql
-- Buscar produtos órfãos (usuario_id não existe)
SELECT DISTINCT usuario_id 
FROM produtos 
WHERE usuario_id NOT IN (SELECT id FROM usuarios);

-- Se retornar IDs → Criar usuários retroativamente
-- Exemplo:
INSERT INTO usuarios (id, email, nome, senha_hash, plano)
VALUES 
    ('[UUID_ENCONTRADO]', 'email_desconhecido@trial.com', 'Usuário Trial', 'TRIAL_NO_PASSWORD', 'trial');
```

---

### ✅ FASE 4: AUDITORIA E LOGS (30 minutos)

#### 4.1 - Implementar Logger Centralizado

**Criar:** `netlify/functions/lib/logger.js`

```javascript
// Logger com timestamp e persistência
class Logger {
    constructor(context) {
        this.context = context;
    }

    info(message, data = {}) {
        const log = {
            level: 'INFO',
            context: this.context,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        console.log(JSON.stringify(log));
        return log;
    }

    error(message, error, data = {}) {
        const log = {
            level: 'ERROR',
            context: this.context,
            message,
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            data,
            timestamp: new Date().toISOString()
        };
        console.error(JSON.stringify(log));
        return log;
    }

    warn(message, data = {}) {
        const log = {
            level: 'WARN',
            context: this.context,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        console.warn(JSON.stringify(log));
        return log;
    }
}

module.exports = Logger;
```

**Atualizar:** `start-trial.js`

```javascript
const Logger = require('./lib/logger');
const logger = new Logger('start-trial');

// Usar no código:
logger.info('Verificando email', { email });
logger.error('Erro ao criar usuário', createError, { email, nome });
logger.warn('Assinatura não criada', { userId: newUser.id });
```

---

#### 4.2 - Criar Tabela de Auditoria

```sql
-- Tabela para rastrear todas as tentativas de cadastro
CREATE TABLE IF NOT EXISTS audit_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    nome TEXT,
    negocio TEXT,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_audit_trials_email ON audit_trials(email);
CREATE INDEX idx_audit_trials_created_at ON audit_trials(created_at DESC);
CREATE INDEX idx_audit_trials_success ON audit_trials(success);
```

**Atualizar API para logar tentativas:**

```javascript
// No início de start-trial.js
const auditLog = {
    email: email.toLowerCase(),
    nome: nome,
    negocio: negocio,
    ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'],
    user_agent: event.headers['user-agent'],
    success: false,
    error_message: null
};

try {
    // ... criar usuário ...
    
    auditLog.success = true;
    
} catch (error) {
    auditLog.error_message = error.message;
} finally {
    // Sempre salvar tentativa
    await supabase.from('audit_trials').insert(auditLog);
}
```

---

#### 4.3 - Monitoramento com Alertas

**Criar:** `netlify/functions/monitor-trials.js`

```javascript
// Função agendada (cron) para verificar trials não salvos
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    // Buscar tentativas falhadas nas últimas 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: failures, error } = await supabase
        .from('audit_trials')
        .select('*')
        .eq('success', false)
        .gte('created_at', oneDayAgo);
    
    if (failures && failures.length > 0) {
        // Enviar alerta (email, Slack, etc.)
        console.error(`🚨 ${failures.length} trials falharam nas últimas 24h`);
        
        // TODO: Integrar com serviço de alertas
        // await sendSlackAlert(`⚠️ ${failures.length} cadastros trial falharam`);
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({ failedTrials: failures?.length || 0 })
    };
};
```

**Configurar cron no `netlify.toml`:**

```toml
[functions."monitor-trials"]
  schedule = "0 */6 * * *"  # A cada 6 horas
```

---

## 📊 TESTES DE VALIDAÇÃO

### Teste 1: Verificar Insert Funcionando

```sql
-- Executar no Supabase SQL Editor
SELECT COUNT(*) as novos_trials
FROM usuarios
WHERE plano = 'trial' 
AND created_at > NOW() - INTERVAL '1 hour';

-- Resultado esperado: > 0 (se houver cadastros recentes)
```

---

### Teste 2: Simular Cadastro End-to-End

1. Abrir `https://seu-site.com` em aba anônima (Chrome Incognito)
2. Abrir DevTools (F12) → Aba Console
3. Abrir DevTools (F12) → Aba Network
4. Clicar em "Teste Grátis"
5. Preencher formulário:
   - Nome: "Teste Validação"
   - Email: "teste@validacao.com"
   - Negócio: "Cosméticos"
6. Clicar em "Começar Teste"
7. **Verificar Console:**
   - ✅ "✅ Trial criado: ..."
   - ✅ "✅ Trial salvo no banco: true"
8. **Verificar Network:**
   - Request `start-trial` → Status: 200
   - Response: `{"success": true, "userId": "..."}`
9. **Verificar Banco:**
   ```sql
   SELECT * FROM usuarios WHERE email = 'teste@validacao.com';
   ```

**Resultado esperado:** Registro aparece no banco.

---

### Teste 3: Verificar Painel Admin

1. Acessar `https://seu-site.com/admin`
2. Senha: `lucrocerto2024`
3. Menu → "Trials"
4. **Verificar:**
   - Lista de trials aparece
   - Email "teste@validacao.com" está listado
   - Contagem total está correta

---

## 🎯 CHECKLIST DE IMPLEMENTAÇÃO

### Imediato (Hoje)

- [ ] Executar queries de diagnóstico (Fase 1.1)
- [ ] Verificar logs do Netlify (Fase 1.2)
- [ ] Testar insert manual (Fase 1.3)
- [ ] Corrigir schema `senha_hash` (Fase 2.1)
- [ ] Atualizar API start-trial.js (Fase 2.2)
- [ ] Corrigir fluxo assíncrono em index.html (Fase 2.3)
- [ ] Testar cadastro end-to-end (Teste 2)

### Esta Semana

- [ ] Criar página recuperar-trials.html (Fase 3.1)
- [ ] Implementar logger centralizado (Fase 4.1)
- [ ] Criar tabela audit_trials (Fase 4.2)
- [ ] Configurar monitoramento (Fase 4.3)
- [ ] Adicionar coluna `negocio` na tabela usuarios
- [ ] Migrar dados de `telefone` → `negocio`
- [ ] Documentar processo de recuperação

### Próximas Semanas

- [ ] Implementar backup automático do localStorage
- [ ] Adicionar sincronização periódica (retry automático)
- [ ] Dashboard de saúde do sistema
- [ ] Alertas automáticos (Slack/Email)
- [ ] Testes automatizados (Playwright)

---

## 📞 PRÓXIMOS PASSOS

1. **EXECUTE os comandos SQL da Fase 1** para diagnosticar
2. **COMPARTILHE os resultados** aqui
3. **APLIQUE as correções da Fase 2** (30 min de dev)
4. **TESTE novamente** com um cadastro real
5. **MONITORE por 24h** para confirmar funcionamento

---

## 🔗 REFERÊNCIAS

- Schema: `supabase-schema.sql`
- API Trial: `netlify/functions/start-trial.js`
- Landing Page: `index.html` (linha 2361-2420)
- Admin Panel: `admin.html` (linha 1245+)
- Admin API: `netlify/functions/admin-api.js` (linha 146+)

---

**Última atualização:** 13/01/2026  
**Autor:** Copilot - Diagnóstico Técnico Completo  
**Versão:** 1.0
