# 🎬 GRAVANDO TESTE DE LOGIN - PASSO A PASSO

## ⚡ COMANDO RÁPIDO (copie e cole no terminal):

```powershell
npm run codegen:login
```

**OU:**

```powershell
npx playwright codegen http://127.0.0.1:8080/login.html
```

---

## 📹 O QUE VAI ACONTECER:

### **1. Duas janelas vão abrir:**

#### 🌐 **Janela 1: Navegador Chrome (lado esquerdo)**
- É aqui que você vai interagir com o site
- Tudo que você fizer será gravado

#### 🔧 **Janela 2: Playwright Inspector (lado direito)**
- Mostra o código sendo gerado em tempo real
- Tem botões: Record, Copy, Clear, Resume

---

## 🎯 AÇÕES PARA GRAVAR:

No navegador Chrome que abrir, faça estas ações **devagar e com calma**:

### **CENÁRIO 1: Login com Sucesso**

1. ✅ **Esperar a página carregar** (aguarde 2-3 segundos)

2. ✅ **Localizar o campo de Email**
   - Click no campo de email
   - Digite: `cjotarasteirinhas@hotmail.com` (seu email real)

3. ✅ **Localizar o campo de Senha**
   - Click no campo de senha
   - Digite sua senha real

4. ✅ **Clicar no botão "Entrar"**
   - Click no botão de submit

5. ✅ **Aguardar redirecionamento**
   - Espere aparecer o Dashboard/App

6. ✅ **PARAR A GRAVAÇÃO**
   - No Playwright Inspector, click no botão vermelho "Record" para parar

---

## 📋 DEPOIS DE GRAVAR:

### **No Playwright Inspector:**

1. Click no botão **"Copy"** (copia todo o código gerado)

2. Volte para o VS Code

3. Abra o arquivo: `tests/e2e/login.spec.js`

4. **COLE o código** que você copiou dentro da função `test('deve fazer login com sucesso'...)`

5. **Adicione verificações** no final do teste:
   ```javascript
   // Verificar se está logado
   await expect(page).toHaveURL(/app.html/);
   await expect(page.getByText('Dashboard')).toBeVisible();
   ```

---

## 🎨 EXEMPLO DO QUE VOCÊ VAI VER NO CODEGEN:

```javascript
// Código que o Codegen vai gerar (exemplo):
await page.goto('http://127.0.0.1:8080/login.html');
await page.getByLabel('Email').click();
await page.getByLabel('Email').fill('cjotarasteirinhas@hotmail.com');
await page.getByLabel('Senha').click();
await page.getByLabel('Senha').fill('sua_senha');
await page.getByRole('button', { name: 'Entrar' }).click();
```

---

## ✅ EXECUTAR O TESTE DEPOIS:

```powershell
# Executar apenas o teste de login
npx playwright test login.spec.js

# Executar com navegador visível
npx playwright test login.spec.js --headed

# Executar em modo debug
npx playwright test login.spec.js --debug
```

---

## 🔥 PRONTO PARA COMEÇAR?

**Execute agora:**
```powershell
npm run codegen:login
```

**E siga os passos acima!** 🚀

---

## 🆘 SE DER PROBLEMA:

1. **Servidor não está rodando?**
   ```powershell
   npx http-server -p 8080
   ```

2. **Codegen não abre?**
   ```powershell
   npx playwright install
   npx playwright codegen http://127.0.0.1:8080/login.html
   ```

3. **Dúvidas?** Me chame que eu te ajudo! 😊
