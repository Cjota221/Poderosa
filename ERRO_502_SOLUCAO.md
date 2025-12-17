# 🚨 ERRO 502 - SOLUÇÃO IMEDIATA

## ❌ **PROBLEMA:**
As Netlify Functions estão retornando **502 Bad Gateway** porque as variáveis de ambiente do Supabase **NÃO ESTÃO CONFIGURADAS**.

---

## ✅ **SOLUÇÃO - CONFIGURAR VARIÁVEIS NO NETLIFY:**

### **PASSO 1: Ir para o Netlify**
1. Acesse: **https://app.netlify.com**
2. Clique no seu site **"sistemalucrocerto"**
3. Vá em **"Site configuration"** (menu lateral esquerdo)
4. Clique em **"Environment variables"**

---

### **PASSO 2: Adicionar as 3 variáveis**

Clique em **"Add a variable"** e adicione **UMA POR VEZ**:

#### **Variável 1:**
```
Key: SUPABASE_URL
Value: [Cole a URL do seu projeto Supabase]
Scopes: All scopes
```

**Para pegar a URL:**
- No Supabase → Settings → API
- Procure "Project URL"
- Exemplo: `https://xyzabc123.supabase.co`

#### **Variável 2:**
```
Key: SUPABASE_ANON_KEY
Value: [Cole a anon key que você me mostrou]
Scopes: All scopes
```

**Anon Key:** É a key pública (começa com `eyJhbGci...`)

#### **Variável 3:**
```
Key: SUPABASE_SERVICE_KEY
Value: [Cole a service_role key que você me mostrou]
Scopes: Functions only (IMPORTANTE!)
```

**Service Role Key:** É a key secreta (também começa com `eyJhbGci...` mas é diferente)

---

### **PASSO 3: Salvar e Aguardar Deploy**

1. Depois de adicionar as **3 variáveis**, clique em **"Save"**
2. O Netlify vai fazer **deploy automático**
3. Aguarde **2-3 minutos**
4. Vá em **"Deploys"** e veja se o deploy está **"Published"**

---

## 🧪 **COMO TESTAR SE FUNCIONOU:**

1. Aguarde o deploy terminar
2. Abra o site: **https://sistemalucrocerto.com**
3. Tente fazer login novamente
4. ✅ Deve funcionar!

---

## 📊 **ONDE PEGAR AS INFORMAÇÕES:**

### **No Supabase (Settings → API):**
```
Project URL:           https://xyzabc123.supabase.co
anon / public key:     eyJhbGci... (key pública)
service_role key:      eyJhbGci... (key secreta)
```

### **No Netlify (Site configuration → Environment variables):**
```
SUPABASE_URL = https://xyzabc123.supabase.co
SUPABASE_ANON_KEY = eyJhbGci... (pública)
SUPABASE_SERVICE_KEY = eyJhbGci... (secreta)
```

---

## ⚠️ **IMPORTANTE:**

- As keys são **DIFERENTES** (anon ≠ service_role)
- A **service_role** só deve ter scope em **Functions**
- Depois de salvar, aguarde o **deploy terminar** antes de testar

---

## 🔍 **SE AINDA DER ERRO 502:**

1. Vá no Netlify → **"Functions"** → Clique em `login`
2. Veja os **Logs** da function
3. Me mande o erro que aparecer
4. Pode ser:
   - URL errada
   - Key errada
   - Scope errado

---

## 📞 **ME AVISE QUANDO CONFIGURAR:**

Depois de adicionar as 3 variáveis e o deploy terminar, me avisa! Vou testar com você para garantir que funcionou! 🚀
