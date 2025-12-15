# 💳 Status da Integração de Pagamento

## ✅ O que já está pronto

### URLs Atualizadas
- ✅ Banner trial agora redireciona para `/` (página de planos)
- ✅ Página de sucesso redireciona para `/cadastro`
- ✅ Página pendente usa `/pagamento-pendente`
- ✅ Todas as URLs limpas configuradas no `_redirects`

### Backend (server.js)
- ✅ Integração com Mercado Pago configurada
- ✅ `back_urls` ativadas e atualizadas
- ✅ Suporte a 3 planos (Starter, Pro, Premium)
- ✅ Sistema de cupons funcionando
- ✅ Checkout transparente implementado

### Frontend
- ✅ checkout.html com SDK do Mercado Pago
- ✅ Páginas de retorno (sucesso, erro, pendente)
- ✅ Simulação de pagamento PIX funcionando
- ✅ Dados salvos no localStorage após aprovação

---

## 🔧 O que precisa ser configurado

### 1. Variáveis de Ambiente (.env)

Você precisa criar o arquivo `server/.env` com:

```bash
# Obtenha suas credenciais em: https://www.mercadopago.com.br/developers
MERCADO_PAGO_ACCESS_TOKEN_TEST=TEST-seu-token-aqui
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token-producao-aqui
MERCADO_PAGO_MODE=test

# URLs do seu site
FRONTEND_URL=https://sistemalucrocerto.com
SITE_URL=https://sistemalucrocerto.com

# URL do backend (quando fizer deploy)
BASE_URL=https://seu-backend.render.com
BACKEND_URL=https://seu-backend.render.com

PORT=3001
```

### 2. Deploy do Backend

O backend (servidor Node.js) precisa estar rodando em produção. Opções:

**Render.com (Recomendado - Grátis)**
1. Criar conta em https://render.com
2. Conectar repositório GitHub
3. Criar novo "Web Service"
4. Configurar:
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && node server.js`
   - Environment: Node
5. Adicionar variáveis de ambiente no painel
6. Deploy automático!

**Alternativas:**
- Heroku (pago)
- Railway (grátis com limites)
- Vercel (pode usar para Node.js)

### 3. Atualizar Checkout.html

Depois do backend no ar, atualizar a URL da API no `checkout.html`:

```javascript
// Linha ~1400 (aproximadamente)
const BACKEND_URL = 'https://seu-backend.render.com'; // Trocar localhost
```

---

## 🧪 Como Testar

### Teste Local (Desenvolvimento)

1. **Iniciar backend:**
```bash
cd server
npm install
node server.js
```

2. **Iniciar frontend:**
```bash
cd ..
npx serve -p 3000
```

3. **Acessar:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Teste em Produção (Netlify)

1. **Certificar que backend está no ar**
2. **Acessar:** https://sistemalucrocerto.com
3. **Fluxo completo:**
   - Entrar no modo trial → /app
   - Clicar em "Fazer Upgrade" → vai para `/`
   - Escolher plano → vai para `/checkout`
   - Preencher dados e pagar
   - Redireciona para `/pagamento-sucesso`

---

## 💳 Cartões de Teste (Mercado Pago)

Use estes cartões para testar:

| Cartão | Número | CVV | Validade | Resultado |
|--------|--------|-----|----------|-----------|
| **Visa** | 4509 9535 6623 3704 | 123 | 11/25 | ✅ Aprovado |
| **Mastercard** | 5031 4332 1540 6351 | 123 | 11/25 | ✅ Aprovado |
| **Amex** | 3711 803032 57522 | 1234 | 11/25 | ✅ Aprovado |
| **Recusado** | 5031 4332 1540 6351 | 123 | 11/25 | ❌ Recusado |

**Nome:** APRO (aprovado) ou OTHE (recusado)  
**CPF:** 12345678909  
**Email:** test@test.com

---

## 🚀 Próximos Passos

### Prioridade 1 - Fazer Funcionar
- [ ] Obter credenciais do Mercado Pago (test e production)
- [ ] Fazer deploy do backend no Render
- [ ] Atualizar BACKEND_URL no checkout.html
- [ ] Testar fluxo completo com cartão de teste
- [ ] Validar redirect sucesso → cadastro → app

### Prioridade 2 - Melhorias
- [ ] Implementar webhook para notificações assíncronas
- [ ] Adicionar loading states melhores
- [ ] Validação de CPF real
- [ ] Sistema de recuperação de pagamento

### Prioridade 3 - Produção
- [ ] Mudar MERCADO_PAGO_MODE para 'production'
- [ ] Testar com cartão real (R$ 0,01)
- [ ] Configurar domínio customizado para backend
- [ ] Monitoramento de erros (Sentry)

---

## 📝 Notas Importantes

1. **Modo Test vs Production**
   - Sempre teste TUDO em modo test primeiro
   - Só mude para production quando tiver certeza
   - Use access tokens diferentes para cada modo

2. **Segurança**
   - NUNCA commitar .env no Git (já está no .gitignore)
   - Não expor access tokens no frontend
   - Sempre usar HTTPS em produção

3. **URLs Limpas**
   - ✅ `/checkout` (ao invés de checkout.html)
   - ✅ `/pagamento-sucesso` (ao invés de pagamento-sucesso.html)
   - ✅ Netlify _redirects configurado corretamente

4. **LocalStorage**
   - Dados do pagamento salvos em `lucrocerto_auth`
   - Trial mode removido após pagamento
   - Email e plano disponíveis para uso

---

## 🆘 Troubleshooting

**Erro: "Failed to fetch"**
- Backend não está rodando
- URL do backend incorreta
- CORS não configurado

**Pagamento não aprova**
- Verificar credenciais do MP
- Checar se está em modo test
- Usar cartões de teste corretos

**Redirect não funciona**
- Verificar back_urls no server.js
- Checar _redirects do Netlify
- Validar FRONTEND_URL no .env

---

**Última atualização:** 15/12/2025  
**Status:** ⚙️ Backend pronto, aguardando deploy e configuração
