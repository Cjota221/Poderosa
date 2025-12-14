# 📋 DOSSIÊ COMPLETO - LUCRO CERTO
## Sistema de Gestão para Revendedoras

---

## 🎯 VISÃO GERAL DO SISTEMA

### O que é o Lucro Certo?
O **Lucro Certo** é um sistema SaaS (Software as a Service) de gestão financeira e de vendas desenvolvido especialmente para **mulheres empreendedoras** que trabalham com revenda de produtos (cosméticos, semijoias, roupas, etc.).

### Propósito
Ajudar revendedoras a:
- Calcular preços de venda corretamente
- Controlar estoque e custos
- Acompanhar lucros reais
- Gerar catálogos digitais para compartilhar
- Gerenciar clientes e vendas

### Público-Alvo
- **Mulheres empreendedoras** de 25-55 anos
- Revendedoras de cosméticos (Natura, Avon, O Boticário, etc.)
- Vendedoras de semijoias, bijuterias
- Revendedoras de roupas e acessórios
- MEIs e autônomas

### Slogan/Tagline
> "Seu negócio no controle, seu lucro garantido" ✨

---

## 🎨 IDENTIDADE VISUAL

### Paleta de Cores Principal

| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| **Primary (Rosa)** | `#E91E63` | rgb(233, 30, 99) | Botões principais, destaques, CTAs |
| **Primary Light** | `#F06292` | rgb(240, 98, 146) | Hover states, backgrounds suaves |
| **Primary Dark** | `#C2185B` | rgb(194, 24, 91) | Textos importantes, contraste |

### Paleta de Cores Secundária

| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| **Secondary (Roxo)** | `#9C27B0` | rgb(156, 39, 176) | Elementos premium, badges |
| **Secondary Light** | `#BA68C8` | rgb(186, 104, 200) | Detalhes secundários |

### Cores de Feedback/Status

| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| **Success (Dourado)** | `#FFD700` | rgb(255, 215, 0) | Lucros, conquistas, sucesso |
| **Growth (Verde)** | `#4CAF50` | rgb(76, 175, 80) | Crescimento, positivo |
| **Alert (Laranja)** | `#FF5722` | rgb(255, 87, 34) | Alertas, atenção |
| **Error (Vermelho)** | `#F44336` | rgb(244, 67, 54) | Erros, prejuízos |
| **Info (Azul)** | `#2196F3` | rgb(33, 150, 243) | Informações |
| **Warning (Amarelo)** | `#FF9800` | rgb(255, 152, 0) | Avisos |

### Cores Neutras

| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| **Dark Gray** | `#37474F` | rgb(55, 71, 79) | Textos principais |
| **Elegant Gray** | `#607D8B` | rgb(96, 125, 139) | Textos secundários |
| **Light Gray** | `#F4F6F8` | rgb(244, 246, 248) | Backgrounds de cards |
| **Background** | `#F8F8FC` | rgb(248, 248, 252) | Fundo geral |
| **White** | `#FFFFFF` | rgb(255, 255, 255) | Cards, modais |

### Gradientes

```css
/* Gradiente Principal - Usado em headers, botões importantes */
--primary-gradient: linear-gradient(135deg, #E91E63 0%, #F06292 100%);

/* Gradiente Secundário - Elementos premium */
--secondary-gradient: linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%);

/* Gradiente de Sucesso - Lucros, conquistas */
--success-gradient: linear-gradient(135deg, #FFD700 0%, #FFF176 100%);
```

---

## 🔤 TIPOGRAFIA

### Fonte Principal
**Poppins** (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

### Pesos Utilizados

| Peso | Uso |
|------|-----|
| **300 (Light)** | Textos complementares, descrições longas |
| **400 (Regular)** | Corpo de texto, parágrafos |
| **500 (Medium)** | Labels, botões secundários |
| **600 (Semi-Bold)** | Títulos de cards, destaques |
| **700 (Bold)** | Títulos principais, valores |
| **800 (Extra-Bold)** | Logotipo, headlines impactantes |

### Tamanhos Padrão

| Elemento | Tamanho |
|----------|---------|
| **H1** | 32px - 36px |
| **H2** | 24px - 28px |
| **H3** | 18px - 22px |
| **Body** | 14px - 16px |
| **Small** | 12px - 13px |
| **Caption** | 10px - 11px |

---

## 🏷️ LOGOTIPO

### Símbolo/Favicon
![Símbolo Lucro Certo](https://i.ibb.co/PGFqVkq4/simbolo.jpg)

**URL do Símbolo**: `https://i.ibb.co/PGFqVkq4/simbolo.jpg`

### Conceito
O logo é composto por:
1. **Ícone**: Gráfico de linha ascendente (📈) representando crescimento e lucro
2. **Texto**: "Lucro Certo" em Poppins Bold

### Ícone do Logo
```html
<!-- Usando Lucide Icons -->
<i data-lucide="trending-up"></i>
```

### Aplicação do Logo
- Fundo rosa gradiente com ícone branco
- Texto em gradiente rosa ou branco sobre fundos escuros
- Borda arredondada de 18px no container do ícone

### Código do Logo (Header)
```html
<div class="logo">
    <div class="logo-icon">
        <i data-lucide="trending-up"></i>
    </div>
    <span class="logo-text">Lucro Certo</span>
</div>
```

```css
.logo-icon {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-text {
    font-weight: 700;
    font-size: 18px;
    color: white;
}
```

---

## 🎭 ÍCONES

### Biblioteca
**Lucide Icons** (https://lucide.dev)

```html
<script src="https://unpkg.com/lucide@latest"></script>
```

### Ícones Principais do Sistema

| Função | Ícone | Código |
|--------|-------|--------|
| Dashboard | 📊 | `<i data-lucide="layout-dashboard"></i>` |
| Produtos | 📦 | `<i data-lucide="package"></i>` |
| Vendas | 🛒 | `<i data-lucide="shopping-cart"></i>` |
| Clientes | 👥 | `<i data-lucide="users"></i>` |
| Catálogo | 📖 | `<i data-lucide="book-open"></i>` |
| Configurações | ⚙️ | `<i data-lucide="settings"></i>` |
| Lucro/Crescimento | 📈 | `<i data-lucide="trending-up"></i>` |
| Adicionar | ➕ | `<i data-lucide="plus"></i>` |
| Editar | ✏️ | `<i data-lucide="edit-2"></i>` |
| Excluir | 🗑️ | `<i data-lucide="trash-2"></i>` |
| WhatsApp | 💬 | `<i data-lucide="message-circle"></i>` |
| Compartilhar | 📤 | `<i data-lucide="share-2"></i>` |
| Coroa (Premium) | 👑 | `<i data-lucide="crown"></i>` |
| Foguete | 🚀 | `<i data-lucide="rocket"></i>` |
| Estrela | ⭐ | `<i data-lucide="star"></i>` |
| Coração | ❤️ | `<i data-lucide="heart"></i>` |
| Check | ✅ | `<i data-lucide="check"></i>` |
| X/Fechar | ❌ | `<i data-lucide="x"></i>` |

---

## 📐 COMPONENTES VISUAIS

### Cards
```css
.card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(233, 30, 99, 0.1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(233, 30, 99, 0.15);
}
```

### Botões Principais
```css
.btn-primary {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 14px 28px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(233, 30, 99, 0.3);
}
```

### Botões Secundários
```css
.btn-secondary {
    background: white;
    color: #E91E63;
    border: 2px solid #E91E63;
    border-radius: 12px;
    padding: 12px 24px;
    font-weight: 600;
}

.btn-secondary:hover {
    background: #E91E63;
    color: white;
}
```

### Inputs
```css
.form-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #f4f6f8;
    border-radius: 12px;
    font-size: 14px;
    transition: all 0.3s ease;
}

.form-input:focus {
    outline: none;
    border-color: #E91E63;
    box-shadow: 0 0 0 4px rgba(233, 30, 99, 0.1);
}
```

### Sombras
```css
/* Sombra Suave - Cards normais */
--shadow-soft: 0 4px 20px rgba(233, 30, 99, 0.1);

/* Sombra Média - Cards em hover, modais */
--shadow-medium: 0 8px 30px rgba(233, 30, 99, 0.15);

/* Sombra Forte - Elementos destacados */
--shadow-strong: 0 12px 40px rgba(233, 30, 99, 0.2);
```

### Border Radius
```css
/* Botões e inputs */
border-radius: 12px;

/* Cards */
border-radius: 16px;

/* Cards grandes, modais */
border-radius: 20px;

/* Avatares, ícones */
border-radius: 50%;
```

### Animações
```css
/* Transição suave - padrão */
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Transição com bounce - elementos interativos */
--transition-bounce: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

---

## 📱 ESTRUTURA DO APP

### Páginas Públicas (Landing/Marketing)
1. **index.html** - App principal (após login)
2. **precos.html** - Página de planos e preços
3. **checkout.html** - Página de pagamento
4. **cadastro.html** - Criação de conta
5. **login.html** - Acesso à conta
6. **catalogo.html** - Catálogo público para clientes

### Páginas de Pagamento
1. **pagamento-sucesso.html** - Confirmação de pagamento
2. **pagamento-erro.html** - Erro no pagamento
3. **pagamento-pendente.html** - Aguardando confirmação (PIX/Boleto)

### Seções do App (SPA - Single Page Application)
1. **Dashboard** - Visão geral do negócio
2. **Produtos** - Cadastro e gestão de produtos
3. **Nova Venda** - Registrar vendas
4. **Clientes** - Gestão de clientes
5. **Catálogo** - Configurar catálogo digital
6. **Configurações** - Preferências do usuário

---

## 💰 PLANOS E PREÇOS

### Plano Starter
- **Mensal**: R$ 29,90/mês
- **Anual**: R$ 22,42/mês (economia de 25%)
- Até 50 produtos
- 1 catálogo digital
- Suporte por email

### Plano Profissional (Mais Popular)
- **Mensal**: R$ 49,90/mês
- **Anual**: R$ 37,42/mês (economia de 25%)
- Produtos ilimitados
- Catálogos ilimitados
- Integração WhatsApp
- Suporte prioritário

### Plano Premium
- **Mensal**: R$ 79,90/mês
- **Anual**: R$ 59,92/mês (economia de 25%)
- Tudo do Profissional
- Multi-lojas
- Relatórios avançados
- Suporte VIP 24h

---

## 🔗 INTEGRAÇÕES

### Pagamento
- **Mercado Pago** (PIX, Cartão, Boleto)
- Modo Sandbox para testes
- Webhooks para confirmação automática

### Comunicação
- **WhatsApp** - Compartilhamento de catálogo e vendas
- Links diretos para conversa

### Autenticação
- Login tradicional (email/senha)
- Login social (Google) - simulado

---

## 📊 MÉTRICAS DO DASHBOARD

### KPIs Principais
1. **Total de Vendas** - Valor total vendido
2. **Lucro Total** - Lucro líquido
3. **Margem Média** - Porcentagem de lucro
4. **Produtos Cadastrados** - Quantidade total

### Visualizações
- Gráficos de evolução de vendas
- Top produtos mais vendidos
- Metas e conquistas

---

## 🎯 TOM DE VOZ

### Características
- **Acolhedor**: "Você está no caminho certo! 💪"
- **Motivacional**: "Parabéns! Mais uma venda registrada! 🎉"
- **Feminino**: Uso de linguagem inclusiva e empoderadora
- **Direto**: Mensagens claras e objetivas
- **Amigável**: Uso de emojis estratégicos

### Exemplos de Mensagens
- ✅ "Produto cadastrado com sucesso!"
- 💰 "Você lucrou R$ 45,00 nessa venda!"
- 📈 "Seu negócio cresceu 15% este mês!"
- ⚠️ "Ops! Preencha todos os campos obrigatórios."
- 🎉 "Parabéns! Você bateu sua meta!"

### Emojis Frequentes
- 💰 Lucro, dinheiro
- 📈 Crescimento
- ✨ Destaque, sucesso
- 🎉 Celebração
- 💪 Motivação
- ❤️ Carinho, amor
- ⭐ Destaque, premium
- 🚀 Lançamento, novidade
- 👑 Premium, VIP

---

## 📁 ESTRUTURA DE ARQUIVOS

```
Poderosa/
├── index.html              # App principal (SPA)
├── precos.html             # Landing de planos
├── checkout.html           # Página de pagamento
├── cadastro.html           # Criação de conta
├── login.html              # Login
├── catalogo.html           # Catálogo público
├── pagamento-sucesso.html  # Confirmação pagamento
├── pagamento-erro.html     # Erro pagamento
├── pagamento-pendente.html # Pagamento pendente
├── admin.html              # Painel admin
├── _redirects              # Configuração Netlify
├── netlify.toml            # Config Netlify
│
├── public/
│   ├── css/
│   │   ├── styles.css      # CSS principal do app
│   │   └── catalogo.css    # CSS do catálogo
│   │
│   └── js/
│       ├── app.js          # JavaScript principal
│       ├── catalogo.js     # JS do catálogo
│       └── core/           # Módulos core
│           ├── state-manager.js
│           ├── data-manager.js
│           └── page-loader.js
│
└── server/
    ├── server.js           # Backend Node.js
    ├── package.json        # Dependências
    └── .env                # Variáveis de ambiente
```

---

## 🌐 HOSPEDAGEM

### Frontend
- **Netlify** (lucrocerto.netlify.app)
- Deploy automático via GitHub
- Clean URLs (sem .html)
- SSL gratuito

### Backend
- **Node.js** com Express
- Integração Mercado Pago
- Webhooks de pagamento

---

## 📱 RESPONSIVIDADE

### Breakpoints
```css
/* Mobile First */
@media (max-width: 480px) { }   /* Mobile pequeno */
@media (max-width: 768px) { }   /* Mobile/Tablet */
@media (max-width: 1024px) { }  /* Tablet/Desktop pequeno */
@media (min-width: 1025px) { }  /* Desktop */
```

### Layout
- **Mobile**: Menu hamburger, cards em coluna única
- **Desktop**: Sidebar fixa, grid de cards

---

## ✅ CHECKLIST DE IDENTIDADE VISUAL

### Cores
- [ ] Primary: #E91E63
- [ ] Secondary: #9C27B0
- [ ] Success: #FFD700
- [ ] Background: #F8F8FC

### Tipografia
- [ ] Fonte: Poppins
- [ ] Pesos: 400, 500, 600, 700

### Componentes
- [ ] Border radius: 12px-20px
- [ ] Sombras com tom rosa
- [ ] Gradientes 135°

### Ícones
- [ ] Biblioteca: Lucide Icons
- [ ] Estilo: Outline, stroke 2px

### Tom de Voz
- [ ] Acolhedor e motivacional
- [ ] Emojis estratégicos
- [ ] Linguagem feminina

---

## 📞 CONTATO DO PROJETO

- **Repositório**: github.com/Cjota221/Poderosa
- **Site**: lucrocerto.netlify.app
- **WhatsApp**: (configurar número real)

---

*Documento gerado em 14 de dezembro de 2025*
*Versão 1.0*
