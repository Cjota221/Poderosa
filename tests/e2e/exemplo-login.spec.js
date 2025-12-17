const { test, expect } = require('@playwright/test');

/**
 * 🎯 TESTE EXEMPLO: Fluxo de Login
 * 
 * Este é um TEMPLATE para você entender como funciona.
 * Use o Codegen para gerar testes reais!
 * 
 * Comando: npx playwright codegen http://127.0.0.1:8080/login.html
 */

test.describe('Fluxo de Autenticação', () => {
  
  test('deve fazer login com sucesso', async ({ page }) => {
    // 1. Navegar para página de login
    await page.goto('/login.html');
    
    // 2. Verificar se está na página correta
    await expect(page).toHaveTitle(/Login/i);
    
    // 3. Preencher formulário (substitua com dados reais)
    await page.getByLabel('Email').fill('teste@example.com');
    await page.getByLabel('Senha').fill('senha123');
    
    // 4. Clicar no botão de login
    await page.getByRole('button', { name: 'Entrar' }).click();
    
    // 5. Verificar se redirecionou para o app
    await expect(page).toHaveURL(/app.html/);
    
    // 6. Verificar se usuário está logado (procurar elemento do dashboard)
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login.html');
    
    // Tentar login com dados inválidos
    await page.getByLabel('Email').fill('invalido@example.com');
    await page.getByLabel('Senha').fill('senhaerrada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    
    // Verificar se mostra mensagem de erro
    await expect(page.getByText(/credenciais inválidas/i)).toBeVisible();
  });

  test('deve validar campos obrigatórios', async ({ page }) => {
    await page.goto('/login.html');
    
    // Tentar submeter formulário vazio
    await page.getByRole('button', { name: 'Entrar' }).click();
    
    // HTML5 validation deve impedir submit
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveAttribute('required');
  });
});

/**
 * 🎯 DICAS PARA CRIAR SEUS PRÓPRIOS TESTES:
 * 
 * 1. USE O CODEGEN:
 *    npx playwright codegen http://127.0.0.1:8080
 * 
 * 2. COPIE O CÓDIGO GERADO e cole aqui
 * 
 * 3. ADICIONE VERIFICAÇÕES (assertions):
 *    - await expect(page).toHaveURL(...) // Verificar URL
 *    - await expect(element).toBeVisible() // Verificar se elemento aparece
 *    - await expect(element).toHaveText(...) // Verificar texto
 *    - await expect(element).toHaveValue(...) // Verificar valor de input
 * 
 * 4. ORGANIZE EM BLOCOS test.describe() para agrupar testes relacionados
 * 
 * 5. USE test.beforeEach() para configuração que se repete:
 *    test.beforeEach(async ({ page }) => {
 *      await page.goto('/login.html');
 *    });
 */
