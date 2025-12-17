const { test, expect } = require('@playwright/test');

/**
 * 📝 TESTES DE CADASTRO - Lucro Certo
 * Gerado com Playwright Codegen e otimizado
 */

test.describe('Fluxo de Cadastro', () => {
  
  test('deve criar nova conta com sucesso', async ({ page }) => {
    // 1. Navegar para página de cadastro
    await page.goto('http://127.0.0.1:8080/cadastro.html');
    
    // 2. Aguardar página carregar
    await page.waitForLoadState('networkidle');
    
    // 3. Preencher formulário
    await page.getByRole('textbox', { name: 'Nome *' }).fill('Caroline');
    await page.getByRole('textbox', { name: 'Sobrenome' }).fill('Azevedo');
    
    // Email único para cada teste (evita erro de duplicação)
    const uniqueEmail = `teste.playwright.${Date.now()}@example.com`;
    await page.getByRole('textbox', { name: 'Email *' }).fill(uniqueEmail);
    
    await page.getByRole('textbox', { name: 'WhatsApp' }).fill('(62) 98223-7075');
    await page.getByRole('textbox', { name: 'Crie sua senha *' }).fill('Cjota@015');
    await page.getByRole('textbox', { name: 'Confirme sua senha *' }).fill('Cjota@015');
    
    // 4. Aceitar termos de uso
    await page.getByRole('checkbox', { name: 'Li e aceito os Termos de Uso' }).check();
    
    // 5. Clicar no botão criar conta
    await page.getByRole('button', { name: 'Criar minha conta' }).click();
    
    // 6. VERIFICAÇÕES (Assertions)
    // Aguardar redirecionamento (pode ir para checkout, pagamento ou confirmação)
    await page.waitForURL(/checkout|pagamento|sucesso|app/, { timeout: 15000 });
    
    // Verificar se saiu da página de cadastro
    await expect(page).not.toHaveURL(/cadastro.html/);
  });

  test('deve validar campos obrigatórios', async ({ page }) => {
    // 1. Navegar para página de cadastro
    await page.goto('http://127.0.0.1:8080/cadastro.html');
    
    // 2. Tentar submeter sem preencher
    await page.getByRole('button', { name: 'Criar minha conta' }).click();
    
    // 3. Verificar que campos obrigatórios têm atributo required
    await expect(page.getByRole('textbox', { name: 'Nome *' })).toHaveAttribute('required');
    await expect(page.getByRole('textbox', { name: 'Email *' })).toHaveAttribute('required');
    await expect(page.getByRole('textbox', { name: 'Crie sua senha *' })).toHaveAttribute('required');
  });

  test('deve validar formato de email', async ({ page }) => {
    // 1. Navegar para página de cadastro
    await page.goto('http://127.0.0.1:8080/cadastro.html');
    
    // 2. Preencher com email inválido
    await page.getByRole('textbox', { name: 'Nome *' }).fill('Teste');
    await page.getByRole('textbox', { name: 'Email *' }).fill('emailinvalido');
    await page.getByRole('textbox', { name: 'Crie sua senha *' }).fill('Senha@123');
    await page.getByRole('textbox', { name: 'Confirme sua senha *' }).fill('Senha@123');
    await page.getByRole('checkbox', { name: 'Li e aceito os Termos de Uso' }).check();
    
    // 3. Tentar submeter
    await page.getByRole('button', { name: 'Criar minha conta' }).click();
    
    // 4. Verificar que permanece na página (validação HTML5 impede submit)
    await expect(page).toHaveURL(/cadastro.html/);
  });

  test('deve validar confirmação de senha', async ({ page }) => {
    // 1. Navegar para página de cadastro
    await page.goto('http://127.0.0.1:8080/cadastro.html');
    
    // 2. Preencher com senhas diferentes
    await page.getByRole('textbox', { name: 'Nome *' }).fill('Teste');
    await page.getByRole('textbox', { name: 'Email *' }).fill('teste@example.com');
    await page.getByRole('textbox', { name: 'Crie sua senha *' }).fill('Senha@123');
    await page.getByRole('textbox', { name: 'Confirme sua senha *' }).fill('SenhaDiferente@456');
    await page.getByRole('checkbox', { name: 'Li e aceito os Termos de Uso' }).check();
    
    // 3. Tentar submeter
    await page.getByRole('button', { name: 'Criar minha conta' }).click();
    
    // 4. Verificar se mostra erro ou permanece na página
    // (Depende da implementação - pode ser validação JS ou HTML5)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const hasError = currentUrl.includes('cadastro') || 
                     await page.locator('body').textContent().then(text => 
                       text.match(/senha.*não.*confere|senha.*diferente/i)
                     );
    expect(hasError).toBeTruthy();
  });

  test('deve exigir aceitação dos termos de uso', async ({ page }) => {
    // 1. Navegar para página de cadastro
    await page.goto('http://127.0.0.1:8080/cadastro.html');
    
    // 2. Preencher formulário completo MAS não marcar checkbox
    await page.getByRole('textbox', { name: 'Nome *' }).fill('Teste');
    await page.getByRole('textbox', { name: 'Email *' }).fill('teste@example.com');
    await page.getByRole('textbox', { name: 'Crie sua senha *' }).fill('Senha@123');
    await page.getByRole('textbox', { name: 'Confirme sua senha *' }).fill('Senha@123');
    
    // NÃO marcar checkbox dos termos
    
    // 3. Verificar se botão está desabilitado ou validação impede submit
    const submitButton = page.getByRole('button', { name: 'Criar minha conta' });
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    
    if (!isDisabled) {
      await submitButton.click();
      // Se não está desabilitado, deve ter validação no submit
      await expect(page).toHaveURL(/cadastro.html/);
    }
  });

  test('deve permitir visualizar senha durante digitação', async ({ page }) => {
    // 1. Navegar para página de cadastro
    await page.goto('http://127.0.0.1:8080/cadastro.html');
    
    // 2. Preencher senha
    await page.getByRole('textbox', { name: 'Crie sua senha *' }).fill('SenhaSecreta@123');
    
    // 3. Clicar no botão de toggle
    await page.locator('#toggle-password').click();
    
    // 4. Verificar se o tipo do input mudou
    const passwordInput = page.getByRole('textbox', { name: 'Crie sua senha *' });
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // 5. Clicar novamente para ocultar
    await page.locator('#toggle-password').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

});

/**
 * 📊 RESUMO DOS TESTES:
 * 
 * ✅ Cadastro com sucesso
 * ✅ Validação de campos obrigatórios
 * ✅ Validação de formato de email
 * ✅ Validação de confirmação de senha
 * ✅ Exigência de aceitar termos de uso
 * ✅ Toggle de visualização de senha
 * 
 * 🚀 Para executar:
 * npx playwright test cadastro.spec.js
 * npx playwright test cadastro.spec.js --headed
 * npx playwright test cadastro.spec.js --debug
 */
