# 🔐 PAINEL ADMINISTRATIVO - LUCRO CERTO

## 📍 **LINKS DE ACESSO**

### 1️⃣ **Painel Admin Atual (LocalStorage apenas)**
```
https://sistemalucrocerto.com/admin
```
**Status:** ⚠️ **Desconectado do banco de dados**
- Mostra apenas dados salvos localmente no navegador
- Não exibe usuários reais do Supabase
- Funciona apenas para leads capturados na landing page

---

### 2️⃣ **Painel de Usuário (App Principal)**
```
https://sistemalucrocerto.com/app
ou
https://sistemalucrocerto.com/dashboard
```
**Status:** ✅ **Conectado ao Supabase**
- Sistema completo para usuários finais
- Produtos, vendas, estoque, clientes
- Todos os dados sincronizados com o banco

---

### 3️⃣ **Catálogo Público**
```
https://sistemalucrocerto.com/catalogo/seu-slug
ou
https://sistemalucrocerto.com/catalogo?loja=BASE64
```
**Status:** ✅ **Funcionando perfeitamente**
- Carrega dados do Supabase
- Mostra produtos de cada loja
- URLs amigáveis com slug

---

## ⚠️ **PROBLEMA ATUAL**

O arquivo `admin.html` está usando **localStorage** ao invés de buscar dados do Supabase:

```javascript
// ❌ ATUAL - Não funciona em produção
function loadData() {
    const leads = JSON.parse(localStorage.getItem('lucrocerto_leads') || '[]');
    const cupons = JSON.parse(localStorage.getItem('lucrocerto_cupons') || '[]');
    // ...
}
```

**Por isso você não vê:**
- ❌ Usuários cadastrados no sistema
- ❌ Assinantes ativos
- ❌ Receita total
- ❌ Produtos cadastrados
- ❌ Vendas realizadas

---

## ✅ **SOLUÇÃO**

Já existe uma função Netlify pronta: `admin-api.js` que busca dados do Supabase!

Ela retorna:
- ✅ Total de usuários
- ✅ Total de assinantes
- ✅ Total em trial
- ✅ Receita total
- ✅ Usuários recentes
- ✅ Lista completa de assinantes

### **Como usar a API:**

```javascript
// Buscar dashboard
GET /.netlify/functions/admin-api?action=dashboard
Authorization: Bearer lucrocerto2024

// Buscar usuários
GET /.netlify/functions/admin-api?action=usuarios
Authorization: Bearer lucrocerto2024

// Buscar assinantes
GET /.netlify/functions/admin-api?action=assinantes
Authorization: Bearer lucrocerto2024
```

---

## 🔧 **O QUE PRECISA SER FEITO**

### Opção 1: Conectar o admin.html existente ao Supabase

**Vantagens:**
- ✅ Mantém o design atual
- ✅ Só adiciona as chamadas à API

**Desvantagens:**
- ⚠️ Requer autenticação admin
- ⚠️ Mais código para manter

---

### Opção 2: Acessar dados direto pelo Supabase Dashboard

**Mais Rápido e Simples:**
1. Acesse: https://supabase.com
2. Login no projeto
3. Veja todas as tabelas:
   - `usuarios` - Todos os cadastrados
   - `assinaturas` - Pagamentos ativos
   - `produtos` - Produtos cadastrados
   - `vendas` - Vendas realizadas

**Vantagens:**
- ✅ Interface visual completa
- ✅ Filtros, buscas, exportação
- ✅ Já está pronto
- ✅ Sem necessidade de código

---

### Opção 3: Usar Metabase/Retool (Recomendado para análises)

Ferramentas profissionais para dashboards:
- **Metabase:** https://metabase.com (Free)
- **Retool:** https://retool.com (Pago)

---

## 📊 **DADOS DISPONÍVEIS NO SUPABASE**

### Tabela: `usuarios`
```sql
- id
- email
- nome
- telefone
- plano (trial, starter, growth, pro)
- slug (para catálogo)
- foto_perfil
- logo_catalogo
- created_at
- ultimo_login
```

### Tabela: `assinaturas`
```sql
- id
- usuario_id
- plano
- status (active, expired, cancelled)
- valor
- periodo (monthly, yearly)
- data_inicio
- data_expiracao
- payment_id (Mercado Pago)
```

### Tabela: `produtos`
```sql
- id
- usuario_id
- nome
- preco_venda
- custo_base
- estoque
- variacoes
- imagens
- categoria
```

### Tabela: `vendas`
```sql
- id
- usuario_id
- cliente_id
- itens (JSON)
- valor_total
- status
- data_venda
```

---

## 🎯 **RECOMENDAÇÃO IMEDIATA**

### Para ver dados agora mesmo:

1. **Acesse o Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/SEU_PROJECT_ID
   - Vá em "Table Editor"
   - Selecione a tabela desejada
   - Veja todos os dados em tempo real

2. **Queries SQL personalizadas:**
```sql
-- Ver todos os usuários ativos
SELECT email, nome, plano, created_at 
FROM usuarios 
ORDER BY created_at DESC;

-- Ver receita mensal
SELECT SUM(valor) as receita_total 
FROM assinaturas 
WHERE status = 'active';

-- Ver usuários por plano
SELECT plano, COUNT(*) as total 
FROM usuarios 
GROUP BY plano;
```

---

## 🚀 **PRÓXIMOS PASSOS**

### Se quiser conectar o admin.html ao banco:

**Posso fazer isso agora mesmo!** Basta você me confirmar:

1. ✅ Quer que eu conecte o admin.html ao Supabase?
2. ✅ Qual senha admin você quer usar?
3. ✅ Quais dados são mais importantes para você ver?
   - [ ] Total de usuários
   - [ ] Receita total
   - [ ] Novos cadastros (últimos 7 dias)
   - [ ] Assinantes ativos
   - [ ] Trials que expiraram
   - [ ] Produtos mais vendidos

---

## 📞 **RESUMO**

| Item | Status | URL |
|------|--------|-----|
| **Admin Panel** | ⚠️ Desconectado | https://sistemalucrocerto.com/admin |
| **App Usuários** | ✅ Funcionando | https://sistemalucrocerto.com/app |
| **Catálogo** | ✅ Funcionando | https://sistemalucrocerto.com/catalogo/slug |
| **Supabase Dashboard** | ✅ Melhor opção | https://supabase.com |
| **API Admin** | ✅ Pronta (não usada) | `/.netlify/functions/admin-api` |

---

**Quer que eu conecte o painel admin ao banco agora?** 🚀
