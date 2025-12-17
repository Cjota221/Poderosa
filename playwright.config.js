// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Configuração do Playwright para testes E2E - Lucro Certo
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  
  /* Tempo máximo por teste */
  timeout: 60 * 1000,
  
  /* Configuração de expectativa */
  expect: {
    timeout: 10000
  },
  
  /* Executar testes em paralelo */
  fullyParallel: true,
  
  /* Falhar se um teste falhar em CI */
  forbidOnly: !!process.env.CI,
  
  /* Retry em caso de falha */
  retries: process.env.CI ? 2 : 0,
  
  /* Quantos workers executar simultaneamente */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter: relatório em HTML e no console */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  /* Configuração compartilhada para todos os projetos */
  use: {
    /* URL base do seu app */
    baseURL: 'http://127.0.0.1:8080',
    
    /* Capturar screenshot em caso de falha */
    screenshot: 'only-on-failure',
    
    /* Gravar vídeo em caso de falha */
    video: 'retain-on-failure',
    
    /* Trace (debug detalhado) em caso de falha */
    trace: 'on-first-retry',
    
    /* Timeout de navegação */
    navigationTimeout: 30000,
  },

  /* Configurar projetos para diferentes navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /* Descomente para testar em Firefox e Safari
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */

    /* Testes mobile (descomente se necessário)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    */
  ],

  /* Iniciar servidor local automaticamente antes dos testes */
  webServer: {
    command: 'npx http-server -p 8080 .',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
