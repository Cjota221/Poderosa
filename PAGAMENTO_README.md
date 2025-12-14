# 💰 Integração de Pagamento - Lucro Certo

## 📋 Visão Geral

O sistema de pagamento do Lucro Certo utiliza o **Mercado Pago** como gateway de pagamento, oferecendo:

- 💳 Cartão de Crédito (até 12x sem juros)
- 📱 PIX (aprovação instantânea)
- 📄 Boleto Bancário (até 3 dias úteis)

---

## 🚀 Como Configurar

### 1. Criar Conta no Mercado Pago

1. Acesse [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Crie uma conta ou faça login
3. Crie uma aplicação no painel de desenvolvedor
4. Obtenha suas credenciais:
   - **Access Token** (para o backend)
   - **Public Key** (para o frontend, opcional)

### 2. Configurar o Servidor Backend

```powershell
# Navegar para a pasta do servidor
cd server

# Instalar dependências
npm install

# Criar arquivo .env (copiar do exemplo)
copy .env.example .env
```

### 3. Editar o arquivo `.env`

```env
# Credenciais do Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui

# Configurações do servidor
PORT=3001
BASE_URL=http://localhost:3001

# URL do frontend (para redirecionamento após pagamento)
FRONTEND_URL=http://localhost:5500
```

### 4. Iniciar o Servidor

```powershell
# Modo desenvolvimento (com hot reload)
npm run dev

# Ou modo produção
npm start
```

O servidor estará rodando em `http://localhost:3001`

---

## 🧪 Modo de Teste (Sandbox)

Para testar sem processar pagamentos reais:

1. Use o **Access Token de TESTE** do Mercado Pago
2. Os pagamentos serão redirecionados para o sandbox
3. Use cartões de teste fornecidos pelo MP:

### Cartões de Teste

| Bandeira   | Número              | CVV | Vencimento |
|------------|---------------------|-----|------------|
| Mastercard | 5031 4332 1540 6351 | 123 | 11/25      |
| Visa       | 4235 6477 2802 5682 | 123 | 11/25      |

### Emails de Teste
- `APRO` - Pagamento aprovado
- `OTHE` - Recusado por outro motivo
- `CONT` - Pagamento pendente
- `CALL` - Recusado (ligar para autorizar)

---

## 📁 Estrutura de Arquivos

```
Poderosa/
├── checkout.html           # Página de checkout
├── pagamento-sucesso.html  # Página de sucesso
├── pagamento-erro.html     # Página de erro
├── pagamento-pendente.html # Página de pendente
└── server/
    ├── package.json        # Dependências do Node
    ├── .env.example        # Exemplo de configuração
    ├── .env                # Configuração real (NÃO commitar!)
    └── server.js           # Servidor Express
```

---

## 🔄 Fluxo de Pagamento

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Checkout   │ --> │   Backend    │ --> │ Mercado Pago │
│  (Frontend) │     │  (Node.js)   │     │   (Gateway)  │
└─────────────┘     └──────────────┘     └──────────────┘
       │                   │                     │
       │ 1. Dados do       │ 2. Cria             │
       │    cliente        │    preferência      │
       │                   │                     │
       │                   │    3. Retorna URL   │
       │ <───────────────────────────────────────│
       │                                         │
       │ 4. Redireciona para pagamento           │
       │ ──────────────────────────────────────> │
       │                                         │
       │ 5. Após pagamento, redireciona          │
       │ <────────────────────────────────────── │
       │                                         │
       │ pagamento-sucesso.html                  │
       │ pagamento-erro.html                     │
       │ pagamento-pendente.html                 │
```

---

## 🔐 Endpoints da API

### POST `/api/create-preference`

Cria uma preferência de pagamento no Mercado Pago.

**Request:**
```json
{
  "plan": "pro",
  "planName": "Profissional",
  "billing": "monthly",
  "unitPrice": 34.90,
  "payer": {
    "name": "Maria",
    "surname": "Silva",
    "email": "maria@email.com",
    "phone": "11999999999",
    "identification": {
      "type": "CPF",
      "number": "12345678900"
    }
  },
  "paymentMethod": "card",
  "coupon": null
}
```

**Response:**
```json
{
  "id": "1234567890",
  "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.br/checkout/v1/redirect?..."
}
```

### POST `/api/webhook`

Recebe notificações de pagamento do Mercado Pago.

### GET `/api/check-subscription/:email`

Verifica status da assinatura de um usuário.

---

## ⚠️ Importante para Produção

1. **NUNCA commitar o arquivo `.env`** com credenciais reais
2. Use **HTTPS** em produção
3. Configure um domínio real para as URLs de callback
4. Implemente validação de webhook com assinatura
5. Configure banco de dados para persistir assinaturas
6. Implemente sistema de logs para auditoria

---

## 🛠️ Comandos Úteis

```powershell
# Ver logs do servidor
npm run dev

# Testar endpoint manualmente
curl -X POST http://localhost:3001/api/create-preference `
  -H "Content-Type: application/json" `
  -d '{"plan":"pro","unitPrice":34.90}'

# Verificar se servidor está rodando
curl http://localhost:3001/api/health
```

---

## 📞 Suporte

- **Documentação Mercado Pago:** [developers.mercadopago.com](https://www.mercadopago.com.br/developers)
- **SDK JavaScript:** [github.com/mercadopago/sdk-js](https://github.com/mercadopago/sdk-js)
- **SDK Node.js:** [github.com/mercadopago/sdk-nodejs](https://github.com/mercadopago/sdk-nodejs)

---

## ✅ Checklist de Deploy

- [ ] Criar conta de produção no Mercado Pago
- [ ] Obter Access Token de produção
- [ ] Configurar URLs de callback com domínio real
- [ ] Testar todos os métodos de pagamento
- [ ] Configurar webhook para receber notificações
- [ ] Implementar banco de dados
- [ ] Configurar SSL/HTTPS
- [ ] Testar fluxo completo em produção
