# 🎭 Guia Playwright - Testes E2E Automatizados

## ✅ **STATUS: Playwright instalado e configurado!**

---

## 🚀 **PASSO 2: Abrir o Codegen (Test Generator)**

O Codegen é a ferramenta mágica do Playwright que **grava suas ações** e gera código automaticamente!

### **Como abrir o Codegen:**

```powershell
npx playwright codegen http://127.0.0.1:8080
```

Isso vai abrir **2 janelas**:
1. **Navegador Chrome** - onde você interage com o site
2. **Playwright Inspector** - onde o código é gerado automaticamente

---

## 📹 **PASSO 3: Gravar o Teste "Fluxo Completo do Cliente"**

### **O que o Codegen faz:**
- ✅ Grava cada click que você faz
- ✅ Grava cada texto que você digita
- ✅ Grava navegações entre páginas
- ✅ Gera código TypeScript/JavaScript pronto para usar

### **Exemplo de fluxo para gravar:**

1. **Inicie o Codegen:**
   ```powershell
   npx playwright codegen http://127.0.0.1:8080
   ```

2. **No navegador que abriu, faça essas ações:**
   - Click em "Login"
   - Digite email: `teste@example.com`
   - Digite senha: `senha123`
   - Click em "Entrar"
   - Navegue até "Produtos"
   - Click em "Adicionar Produto"
   - Preencha nome do produto
   - Click em "Salvar"

3. **No Playwright Inspector (janela 2):**
   - O código está sendo gerado automaticamente!
   - Click no botão **"Copy"** para copiar o código
   - Click no botão **"Record"** (vermelho) para parar a gravação

---

## 📝 **PASSO 4: Salvar o Teste Gerado**

Depois de copiar o código do Codegen, você pode:

1. **Criar arquivo de teste:**
   ```powershell
   # O arquivo será criado em: tests/e2e/fluxo-completo.spec.js
   ```

2. **Colar o código copiado** do Codegen no arquivo

3. **Adicionar assertions (verificações):**
   ```javascript
   // Verificar se login funcionou
   await expect(page).toHaveURL(/app.html/);
   
   // Verificar se produto foi salvo
   await expect(page.getByText('Produto salvo!')).toBeVisible();
   ```

---

## 🎯 **COMANDOS ÚTEIS**

| Comando | Descrição |
|---------|-----------|
| `npx playwright codegen http://127.0.0.1:8080` | Abrir Codegen para gravar testes |
| `npx playwright test` | Executar todos os testes |
| `npx playwright test --ui` | Executar em modo UI (visual) |
| `npx playwright test --headed` | Executar com navegador visível |
| `npx playwright test --debug` | Executar em modo debug |
| `npx playwright show-report` | Abrir relatório HTML dos testes |
| `npx playwright test nome-do-arquivo.spec.js` | Executar teste específico |

---

## 🎬 **EXEMPLO: Teste Pronto (Template)**

Criei um arquivo de exemplo em `tests/e2e/exemplo-login.spec.js` para você ver como fica um teste completo.

**Você pode usar esse arquivo como base e modificar com o código que o Codegen gerar!**

---

## 📊 **PRÓXIMOS PASSOS RECOMENDADOS:**

### **1. Gravar Teste de Login (5 min)**
```powershell
npx playwright codegen http://127.0.0.1:8080/login.html
```
- Grave: digitar email, senha, clicar em "Entrar"
- Copie o código gerado
- Cole em `tests/e2e/login.spec.js`

### **2. Gravar Teste de Cadastro (5 min)**
```powershell
npx playwright codegen http://127.0.0.1:8080/cadastro.html
```
- Grave: preencher formulário, clicar em "Criar Conta"
- Copie o código
- Cole em `tests/e2e/cadastro.spec.js`

### **3. Gravar Teste de Fluxo de Pagamento (10 min)**
```powershell
npx playwright codegen http://127.0.0.1:8080/checkout.html
```
- Grave: escolher plano, preencher cartão, finalizar
- Copie o código
- Cole em `tests/e2e/fluxo-pagamento.spec.js`

### **4. Executar Todos os Testes**
```powershell
npx playwright test
```

### **5. Ver Relatório com Screenshots**
```powershell
npx playwright show-report
```

---

## 🛠️ **DICAS DE OURO:**

1. **Use o Codegen sempre!** Não escreva testes na mão, deixe o Codegen fazer o trabalho pesado.

2. **Adicione verificações** depois de gravar:
   ```javascript
   // Verificar se elemento existe
   await expect(page.getByText('Bem-vindo')).toBeVisible();
   
   // Verificar URL
   await expect(page).toHaveURL(/app.html/);
   
   // Verificar valor de input
   await expect(page.getByLabel('Email')).toHaveValue('teste@example.com');
   ```

3. **Organize os testes** em arquivos separados:
   - `login.spec.js` - Testes de login
   - `cadastro.spec.js` - Testes de registro
   - `produtos.spec.js` - Testes de CRUD de produtos
   - `pagamento.spec.js` - Testes de checkout

4. **Use o modo UI** para ver os testes rodando:
   ```powershell
   npx playwright test --ui
   ```

---

## 🔥 **COMANDOS RÁPIDOS PARA COMEÇAR AGORA:**

```powershell
# 1. Gravar teste de login
npx playwright codegen http://127.0.0.1:8080/login.html

# 2. Gravar teste do app principal
npx playwright codegen http://127.0.0.1:8080/app.html

# 3. Executar testes
npx playwright test

# 4. Ver relatório
npx playwright show-report
```

---

## 📞 **PRECISA DE AJUDA?**

Se tiver dúvidas durante a gravação, me chame que eu te ajudo a:
- Adicionar verificações (assertions)
- Organizar os testes
- Debugar falhas
- Otimizar o código gerado

**Boa sorte com os testes! 🚀**
