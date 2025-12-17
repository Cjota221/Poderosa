# 🗄️ CONFIGURAÇÃO DO SUPABASE (BANCO DE DADOS SQL)

## 📋 **PASSO A PASSO COMPLETO**

---

### **1️⃣ CRIAR CONTA NO SUPABASE**

1. Acesse: **https://supabase.com**
2. Clique em **"Start your project"**
3. Faça login com GitHub ou email
4. Crie uma **Organization** (pode ser seu nome)

---

### **2️⃣ CRIAR PROJETO**

1. Clique em **"New Project"**
2. Preencha:
   - **Name:** `lucro-certo` (ou qualquer nome)
   - **Database Password:** Crie uma senha FORTE (anote!)
   - **Region:** `South America (São Paulo)` (mais rápido pro Brasil)
   - **Pricing Plan:** `Free` (gratuito, 500MB de banco)
3. Clique em **"Create new project"**
4. Aguarde 2-3 minutos (criando banco de dados)

---

### **3️⃣ EXECUTAR O SCHEMA SQL**

1. No painel do Supabase, vá em **"SQL Editor"** (lado esquerdo)
2. Clique em **"New query"**
3. **COPIE TODO O CONTEÚDO** do arquivo `supabase-schema.sql`
4. **COLE** no editor SQL
5. Clique em **"Run"** (ou Ctrl+Enter)
6. **AGUARDE** 10-20 segundos
7. ✅ Você verá: **"Success. No rows returned"**

---

### **4️⃣ VERIFICAR TABELAS CRIADAS**

1. Vá em **"Table Editor"** (lado esquerdo)
2. Você deve ver **9 tabelas**:
   - ✅ `usuarios`
   - ✅ `produtos`
   - ✅ `clientes`
   - ✅ `vendas`
   - ✅ `despesas`
   - ✅ `transacoes`
   - ✅ `metas`
   - ✅ `conquistas`
   - ✅ `app_state`

---

### **5️⃣ PEGAR AS CREDENCIAIS**

1. Vá em **"Settings"** → **"API"**
2. **COPIE E ANOTE** (vamos usar no Netlify):

#### **📍 Project URL:**
```
https://seuprojetoid.supabase.co
```

#### **📍 Anon Key (Public):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **📍 Service Role Key (Secret - NUNCA COMPARTILHE!):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### **6️⃣ CONFIGURAR NO NETLIFY**

1. Vá em: **https://app.netlify.com**
2. Clique no seu site **"sistemalucrocerto"**
3. Vá em **"Site configuration"** → **"Environment variables"**
4. Clique em **"Add a variable"**
5. Adicione as **3 variáveis**:

#### **Variável 1:**
- **Key:** `SUPABASE_URL`
- **Value:** Cole o **Project URL** (https://seuprojetoid.supabase.co)
- **Scopes:** `All scopes`

#### **Variável 2:**
- **Key:** `SUPABASE_ANON_KEY`
- **Value:** Cole a **Anon Key** (eyJhbGci...)
- **Scopes:** `All scopes`

#### **Variável 3:**
- **Key:** `SUPABASE_SERVICE_KEY`
- **Value:** Cole a **Service Role Key** (eyJhbGci...)
- **Scopes:** `Functions` (apenas functions, não builds)
- **⚠️ IMPORTANTE:** Esta key é SECRETA!

---

### **7️⃣ FAZER DEPLOY**

1. Volte para o VS Code
2. Execute:

```powershell
git add .
git commit -m "feat: Configuração do Supabase completa"
git push origin main
```

3. Aguarde o Netlify fazer deploy (2-3 minutos)
4. ✅ Pronto! Banco de dados conectado!

---

## 🧪 **TESTAR SE ESTÁ FUNCIONANDO**

### **Teste 1: Verificar conexão**

1. Abra o site: `https://sistemalucrocerto.com`
2. Abra o Console (F12)
3. Digite:
```javascript
console.log('Supabase URL:', process.env.SUPABASE_URL)
```
4. **ESPERADO:** Ver a URL do Supabase

### **Teste 2: Cadastrar usuário**

1. Faça um novo cadastro no site
2. Vá no Supabase → **"Table Editor"** → **"usuarios"**
3. **ESPERADO:** Ver seu usuário na lista ✅

### **Teste 3: Adicionar produto**

1. No sistema, adicione um produto
2. Vá no Supabase → **"Table Editor"** → **"produtos"**
3. **ESPERADO:** Ver o produto salvo ✅

---

## 📊 **O QUE O BANCO GUARDA**

### **✅ Usuários**
- Email, nome, senha (criptografada)
- Plano, status da assinatura
- Data de expiração
- Foto de perfil, logo do catálogo

### **✅ Produtos**
- Nome, descrição, categoria
- Preço de custo e venda
- Estoque (total ou por variação)
- Imagens, variações (tamanho, cor, etc)

### **✅ Clientes**
- Dados pessoais (nome, email, telefone)
- Endereço completo
- Histórico de compras (total, ticket médio)
- Segmentação (bronze, prata, ouro)

### **✅ Vendas**
- Itens vendidos (produtos, quantidades)
- Valores (subtotal, desconto, frete, total)
- Pagamento (forma, status, parcelas)
- Entrega (tipo, status, rastreio)

### **✅ Despesas**
- Descrição, categoria, valor
- Recorrência (mensal, anual)
- Status (paga, pendente, atrasada)

### **✅ Transações**
- Fluxo de caixa (entradas e saídas)
- Relatórios financeiros

### **✅ Metas**
- Objetivos (receita, vendas, clientes)
- Progresso em tempo real

### **✅ Conquistas**
- Badges desbloqueadas
- Gamificação

### **✅ App State**
- Backup automático do localStorage
- Sincronização entre dispositivos

---

## 🔒 **SEGURANÇA (RLS - ROW LEVEL SECURITY)**

✅ **Cada usuário só vê seus próprios dados**  
✅ **Impossível acessar dados de outros usuários**  
✅ **Políticas de segurança nativas do Supabase**  
✅ **Senhas criptografadas com bcrypt**  

---

## 📈 **LIMITES DO PLANO FREE**

| Recurso | Limite Free |
|---------|-------------|
| **Banco de dados** | 500 MB |
| **Requisições/mês** | 50,000 |
| **Armazenamento de arquivos** | 1 GB |
| **Bandwidth** | 2 GB |
| **Usuários simultâneos** | Ilimitado |

**💡 Dica:** Com 500MB você consegue armazenar **MILHARES** de produtos, vendas e clientes!

---

## 🆙 **QUANDO FAZER UPGRADE?**

Faça upgrade para o plano **Pro ($25/mês)** quando:
- Ultrapassar 500 MB de dados
- Precisar de backup automático diário
- Quiser suporte prioritário
- Precisar de mais de 2 GB de bandwidth

---

## 🐛 **PROBLEMAS COMUNS**

### **Erro: "relation 'usuarios' does not exist"**
**Solução:** Execute o SQL novamente no SQL Editor

### **Erro: "Invalid API key"**
**Solução:** Verifique se as variáveis no Netlify estão corretas

### **Erro: "Failed to fetch"**
**Solução:** Verifique se o CORS está configurado (já está no netlify.toml)

### **Dados não aparecem**
**Solução:** Verifique se o RLS está habilitado e se as policies estão corretas

---

## 📞 **PRÓXIMOS PASSOS**

1. ✅ Criar projeto no Supabase
2. ✅ Executar schema SQL
3. ✅ Pegar credenciais (URL + Keys)
4. ✅ Configurar variáveis no Netlify
5. ✅ Fazer deploy
6. ✅ Testar cadastro de usuário
7. ✅ Testar salvamento de produto
8. 🎉 **PRONTO! Sistema 100% funcional na nuvem!**

---

**IMPORTANTE:** Após configurar, me avise e eu vou integrar o Supabase no código JavaScript para sincronizar automático! 🚀
