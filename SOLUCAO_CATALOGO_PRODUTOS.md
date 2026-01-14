# 🔧 SOLUÇÃO: Produtos Não Aparecem no Catálogo

## 📋 PROBLEMA IDENTIFICADO

A cliente cadastrou produtos no sistema, mas eles não aparecem no catálogo público dela.

**Causa:** O RLS (Row Level Security) do Supabase está bloqueando a leitura pública dos produtos. Faltava uma política (policy) permitindo que o catálogo público visualize os produtos marcados como visíveis.

---

## ✅ SOLUÇÃO RÁPIDA

### Passo 1: Executar SQL no Supabase

1. Acesse: https://supabase.com
2. Faça login no seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **"New Query"**
5. Copie e cole o conteúdo do arquivo: [sql/fix-catalogo-produtos-policy.sql](sql/fix-catalogo-produtos-policy.sql)
6. Clique em **Run** (▶️)

### Passo 2: Verificar se Funcionou

Execute esta query no SQL Editor:

```sql
-- Ver produtos da cliente
SELECT 
    p.id,
    p.nome,
    p.preco_venda,
    p.ativo,
    p.visivel_catalogo,
    p.imagem_url
FROM usuarios u
JOIN produtos p ON p.usuario_id = u.id
WHERE u.email = 'carolineazevedo075@gmail.com'
ORDER BY p.criado_em DESC;
```

**Resultado esperado:**
- ✅ Lista de produtos cadastrados
- ✅ Coluna `ativo` = `true`
- ✅ Coluna `visivel_catalogo` = `true`

### Passo 3: Testar o Catálogo

Acesse o catálogo da cliente e veja se os produtos aparecem:

```
https://sistemalucrocerto.com/catalogo/SEU-SLUG
ou
https://sistemalucrocerto.com/catalogo?loja=SEU-EMAIL-BASE64
```

---

## 🔍 VERIFICAÇÕES ADICIONAIS

Se os produtos ainda não aparecerem, verifique:

### ✅ 1. Produtos Estão Ativos?

No painel app.html da cliente, verificar se os produtos estão:
- ✅ Ativo = SIM
- ✅ Visível no Catálogo = SIM

### ✅ 2. Variáveis de Ambiente do Netlify

No painel do Netlify, verificar se estão configuradas:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (não é a anon key!)

### ✅ 3. Testar API Diretamente

Abrir no navegador:
```
https://sistemalucrocerto.com/.netlify/functions/get-catalog?loja=carolineazevedo075@gmail.com
```

**Deve retornar um JSON com:**
```json
{
  "success": true,
  "store": { ... },
  "products": [ ... ]
}
```

Se retornar `products: []`, então o problema está no banco de dados.

---

## 🎯 O QUE FOI CORRIGIDO

### 1. Policy de Leitura Pública

**Antes:**
```sql
-- Não existia policy pública
-- Resultado: catálogo não conseguia ler produtos
```

**Depois:**
```sql
CREATE POLICY "Produtos visiveis no catalogo sao publicos" 
ON produtos 
FOR SELECT 
USING (
    ativo = true 
    AND visivel_catalogo = true
);
```

### 2. Service Role Access

Garantimos que a função Netlify (que usa SERVICE_KEY) tem acesso total:

```sql
CREATE POLICY "Service role tem acesso total a produtos" 
ON produtos 
FOR ALL 
USING (true);
```

---

## 📱 COMO A CLIENTE TESTA

### No App (painel dela):

1. Login: https://sistemalucrocerto.com/app
2. Email: `carolineazevedo075@gmail.com`
3. Ir em "Produtos"
4. Verificar se os produtos estão:
   - ✅ Com a bolinha verde (ativo)
   - ✅ Com ícone de olho aberto (visível no catálogo)

### No Catálogo (público):

1. Clicar em "Compartilhar Catálogo"
2. Copiar o link
3. Abrir em uma aba anônima (Ctrl+Shift+N)
4. Os produtos devem aparecer

---

## 🛠️ DEBUG AVANÇADO

### Verificar Logs da API

1. Abrir DevTools (F12)
2. Ir na aba "Console"
3. Recarregar o catálogo
4. Procurar por:
   ```
   📦 Produtos encontrados: X
   ```

Se aparecer `📦 Produtos encontrados: 0`, então:
- Ou não tem produtos cadastrados
- Ou os produtos não estão ativos/visíveis
- Ou a policy não foi aplicada corretamente

### Verificar RLS Policies no Supabase

```sql
-- Ver todas as policies
SELECT 
    schemaname,
    tablename, 
    policyname, 
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'produtos';
```

**Deve aparecer:**
- ✅ `Produtos visiveis no catalogo sao publicos` (FOR SELECT)
- ✅ `Service role tem acesso total a produtos` (FOR ALL)

---

## 📞 SUPORTE

Se após seguir todos os passos o problema persistir:

1. Enviar print da query de verificação de produtos
2. Enviar print do console do navegador (F12)
3. Informar o URL do catálogo que está testando
