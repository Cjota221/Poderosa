# 🧪 TESTE DE VENDAS - GUIA COMPLETO

## ✅ **ESTRUTURA CRIADA COM SUCESSO**
As tabelas `vendas` e `itens_venda` foram criadas corretamente no Supabase com todos os campos necessários.

## 🚀 **COMO TESTAR**

### **1. Teste no Sistema Normal**
1. Acesse o aplicativo: https://sistemalucrocerto.com
2. Faça login com: `comercial@cjotarasteirinhas.com`
3. Vá em "Nova Venda"
4. Adicione pelo menos um produto
5. Preencha dados do cliente
6. Clique em "Finalizar Venda"
7. **Abra F12 e veja o console** - deve aparecer:
   - ✅ "Venda salva no Supabase com sucesso!"
   - OU ⚠️ "Venda salva apenas localmente" (se houver erro)

### **2. Teste Manual via Console**
1. Abra F12 → Console
2. Copie e cole o código de: `teste-venda-console.js`
3. Pressione Enter
4. Veja os logs do resultado

### **3. Verificação no Banco**
Execute no **Supabase SQL Editor**:
```sql
-- Executar arquivo completo:
sql/testar-vendas-funcionamento.sql
```

## 🔍 **O QUE VERIFICAR**

### **Console do Navegador (F12)**
- ✅ "Venda salva no Supabase com sucesso!" = **FUNCIONANDO**
- ⚠️ "Venda salva apenas localmente" = **PROBLEMA DE CONEXÃO**
- ❌ Erro específico = **PROBLEMA NO CÓDIGO**

### **Supabase (Tabela vendas)**
```sql
SELECT * FROM vendas ORDER BY created_at DESC LIMIT 3;
```
**Deve mostrar:** vendas recém-criadas com dados corretos

### **Supabase (Tabela itens_venda)**  
```sql
SELECT iv.*, v.numero_venda 
FROM itens_venda iv 
JOIN vendas v ON iv.venda_id = v.id 
ORDER BY iv.created_at DESC LIMIT 5;
```
**Deve mostrar:** itens das vendas com produtos corretos

## 🐛 **PROBLEMAS POSSÍVEIS**

### **"Usuário não autenticado"**
- Verifique se está logado corretamente
- Verifique se o email existe na tabela `usuarios`

### **"Usuário não encontrado no banco"**
- Execute: `SELECT * FROM usuarios WHERE email = 'comercial@cjotarasteirinhas.com';`
- Se não existir, execute: `sql/criar_usuario_carol.sql`

### **Erro de conexão**
- Verifique internet
- Verifique se Supabase está online
- RLS pode estar bloqueando (já desabilitamos para teste)

## 📊 **RESULTADO ESPERADO**

✅ **FUNCIONANDO PERFEITAMENTE:**
- Venda aparece na tabela `vendas`
- Itens aparecem na tabela `itens_venda`  
- Console mostra "✅ Venda salva no Supabase com sucesso!"
- Dados estão corretos e completos

⚠️ **SALVANDO APENAS LOCAL:**
- Venda fica no localStorage
- Sincroniza depois quando voltar conexão
- Sistema funciona offline

❌ **COM ERRO:**
- Console mostra erro específico
- Investigar e corrigir conforme o erro