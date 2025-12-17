# 🔧 Como Configurar Variáveis de Ambiente no Netlify

## ❗ POR QUE ISSO É NECESSÁRIO?

Os erros **500 Internal Server Error** acontecem porque as **Netlify Functions** precisam se conectar ao Supabase, mas **não sabem as credenciais** do seu banco de dados.

---

## 📋 PASSO A PASSO COMPLETO

### **1️⃣ Pegar as Credenciais do Supabase**

1. Acesse: https://supabase.com/dashboard/projects
2. Clique no seu projeto
3. Vá em **Settings** (⚙️ no menu lateral)
4. Clique em **API**
5. Copie as seguintes informações:

   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (a chave grande que começa com `eyJ...`)
   - **service_role** key (⚠️ **SECRETA** - nunca compartilhe!)

---

### **2️⃣ Configurar no Netlify**

1. Acesse: https://app.netlify.com/sites/sistemalucrocerto/configuration/env

2. Clique em **"Add a variable"** ou **"New variable"**

3. Adicione **3 variáveis** (uma de cada vez):

#### **Variável 1:**
```
Key: SUPABASE_URL
Value: https://seu-projeto.supabase.co
```
*(Cole a Project URL que você copiou)*

#### **Variável 2:**
```
Key: SUPABASE_ANON_KEY
Value: eyJhbGc...sua-chave-aqui
```
*(Cole a chave **anon public**)*

#### **Variável 3:**
```
Key: SUPABASE_SERVICE_KEY
Value: eyJhbGc...sua-chave-aqui
```
*(Cole a chave **service_role** - ⚠️ SECRETA!)*

---

### **3️⃣ Configurar Escopo (Importante!)**

Para cada variável, configure o **escopo**:

- **SUPABASE_URL** → ✅ Marcar: `Functions` e `Builds`
- **SUPABASE_ANON_KEY** → ✅ Marcar: `Functions` e `Builds`
- **SUPABASE_SERVICE_KEY** → ⚠️ Marcar **APENAS**: `Functions` (NÃO marcar Builds!)

> **Por quê?** A `service_role` key é super poderosa e não deve ser exposta no código do site.

---

### **4️⃣ Salvar e Aguardar**

1. Clique em **"Save"** ou **"Create variable"**
2. O Netlify vai **redeployer automaticamente** (2-3 minutos)
3. Você verá a mensagem: **"Site deploy in progress"**

---

## ✅ COMO TESTAR SE FUNCIONOU

### **Teste 1 - Login:**
1. Abra: https://sistemalucrocerto.com/login
2. Faça login com seu e-mail e senha
3. **Se funcionar** → Variáveis configuradas corretamente! ✅

### **Teste 2 - Catálogo:**
1. Abra: https://sistemalucrocerto.com/catalogo?loja=Y2Fyb2xpbmVh
2. **Deveria aparecer** seu nome de negócio e produtos
3. **Se aparecer "Loja não encontrada"** → Verifique se as variáveis estão corretas

---

## 🐛 SE AINDA DER ERRO

### **Erro 500:**
- Verifique se copiou as chaves corretas (anon ≠ service_role)
- Verifique se não tem espaços antes/depois das chaves
- Aguarde 3-5 minutos após salvar (deploy demora)

### **Erro "Loja não encontrada":**
- Seu e-mail precisa estar cadastrado na tabela `usuarios` do Supabase
- Execute este SQL no Supabase (aba SQL Editor):

```sql
-- Verificar se seu usuário existe
SELECT * FROM usuarios WHERE email = 'carolineazevedo075@hotmail.com';

-- Se não existir, inserir:
INSERT INTO usuarios (email, nome, telefone, plano_atual)
VALUES (
  'carolineazevedo075@hotmail.com',
  'Carolina Azevedo', 
  '(85) 9 9999-9999',
  'pro'
);
```

---

## 📸 SCREENSHOTS (Referência Visual)

### Como deve ficar no Netlify:
```
╔═══════════════════════════════════════════════════════╗
║  Environment variables                                ║
╠═══════════════════════════════════════════════════════╣
║  SUPABASE_URL                                         ║
║  https://ldfahd...supabase.co                         ║
║  Scopes: Functions, Builds                            ║
╠═══════════════════════════════════════════════════════╣
║  SUPABASE_ANON_KEY                                    ║
║  eyJhbGciOiJ...                                       ║
║  Scopes: Functions, Builds                            ║
╠═══════════════════════════════════════════════════════╣
║  SUPABASE_SERVICE_KEY                                 ║
║  eyJhbGciOiJ...                                       ║
║  Scopes: Functions only                               ║
╚═══════════════════════════════════════════════════════╝
```

---

## 🎯 CHECKLIST FINAL

Antes de testar, confirme:

- [ ] Copiei a **Project URL** do Supabase
- [ ] Copiei a chave **anon public**
- [ ] Copiei a chave **service_role** (secreta)
- [ ] Adicionei as 3 variáveis no Netlify
- [ ] Marquei os escopos corretos
- [ ] Aguardei o redeploy terminar (2-3 min)
- [ ] Testei o login: https://sistemalucrocerto.com/login
- [ ] Testei o catálogo: https://sistemalucrocerto.com/catalogo?loja=Y2Fyb2xpbmVh

---

## 📞 AJUDA ADICIONAL

Se ainda tiver problemas:

1. Abra o **Console do navegador** (F12)
2. Vá na aba **Network**
3. Faça login novamente
4. Clique na requisição **"login"** que aparece em vermelho
5. Copie a mensagem de erro e me envie

---

**Criado em:** 16/12/2025  
**Versão:** 1.0  
**Status:** ⏳ Aguardando configuração das variáveis
