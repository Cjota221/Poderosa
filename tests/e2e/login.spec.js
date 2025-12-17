const { test, expect } = require('@playwright/test');

/**
 * 🔐 TESTES DE LOGIN - Lucro Certo
 * Gerado com Playwright Codegen e otimizado
 */

test.describe('Fluxo de Login', () => {
  
  test('deve fazer login com sucesso com credenciais válidas', async ({ page }) => {
    // 1. Navegar para página de login
    await page.goto('http://127.0.0.1:8080/login.html');
    
    // 2. Aguardar página carregar
    await page.waitForLoadState('networkidle');
    
    // 3. Preencher email
    await page.getByRole('textbox', { name: 'Email' }).fill('carolineazevedo075@hotmail.com');
    
    // 4. Preencher senha
    await page.getByRole('textbox', { name: 'Senha' }).fill('Cjota@015');
    
    // 5. Clicar no botão Entrar
    await page.getByRole('button', { name: 'Entrar' }).click();
    
    // 6. VERIFICAÇÕES (Assertions)
    // Aguardar redirecionamento
    await page.waitForURL('**/app.html', { timeout: 10000 });
    
    // Verificar se está na página do app
    await expect(page).toHaveURL(/app.html/);
    
    // Verificar se o dashboard carregou
    await expect(page.locator('body')).toContainText(/Dashboard|Produtos|Clientes/i);
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    // 1. Navegar para página de login
    await page.goto('http://127.0.0.1:8080/login.html');
    
    // 2. Preencher com credenciais inválidas
    await page.getByRole('textbox', { name: 'Email' }).fill('email_invalido@teste.com');
    await page.getByRole('textbox', { name: 'Senha' }).fill('senhaerrada123');
    
    // 3. Clicar em Entrar
    await page.getByRole('button', { name: 'Entrar' }).click();
    
    // 4. Verificar mensagem de erro
    await expect(page.locator('body')).toContainText(/erro|inválid|incorret/i, { timeout: 5000 });
  });

  test('deve validar campos obrigatórios', async ({ page }) => {
    // 1. Navegar para página de login
    await page.goto('http://127.0.0.1:8080/login.html');
    
    // 2. Tentar submeter sem preencher
    await page.getByRole('button', { name: 'Entrar' }).click();
    
    // 3. Verificar validação HTML5 (campos required)
    const emailInput = page.getByRole('textbox', { name: 'Email' });
    await expect(emailInput).toHaveAttribute('required');
  });

  test('deve permitir visualizar senha', async ({ page }) => {
    // 1. Navegar para página de login
    await page.goto('http://127.0.0.1:8080/login.html');
    
    // 2. Preencher senha
    await page.getByRole('textbox', { name: 'Senha' }).fill('senhateste123');
    
    // 3. Clicar no botão de toggle (mostrar/ocultar senha)
    await page.locator('#toggle-password').click();
    
    // 4. Verificar se o tipo do input mudou para "text"
    const passwordInput = page.getByRole('textbox', { name: 'Senha' });
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

});

/**
 * 📊 RESUMO DOS TESTES:
 * 
 * ✅ Login com sucesso
 * ✅ Login com credenciais inválidas
 * ✅ Validação de campos obrigatórios
 * ✅ Toggle de visualização de senha
 * 
 * 🚀 Para executar:
 * npx playwright test login.spec.js
 * npx playwright test login.spec.js --headed (com navegador visível)
 * npx playwright test login.spec.js --debug (modo debug)
 */
