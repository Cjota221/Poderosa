# 🏗️ Arquitetura do Código - Lucro Certo

## 📋 Visão Geral

O projeto segue uma arquitetura modular baseada no padrão **Module Pattern** com separação clara de responsabilidades.

## 🗂️ Estrutura dos Módulos JavaScript

### **1. State Manager** 📊
**Responsabilidade:** Gerenciamento centralizado do estado da aplicação

```javascript
StateManager
├── state              // Estado global da aplicação
│   ├── user          // Dados do usuário
│   ├── products      // Lista de produtos
│   ├── costs         // Custos fixos e variáveis
│   ├── achievements  // Conquistas desbloqueadas
│   ├── currentPage   // Página atual
│   └── editingProductId // ID do produto em edição
├── getState()        // Retorna estado atual
├── setState()        // Atualiza estado e notifica
├── subscribe()       // Registra observadores
└── notifySubscribers() // Notifica mudanças
```

**Funcionalidades:**
- ✅ Estado reativo (Observer Pattern)
- ✅ Persistência automática no localStorage
- ✅ Imutabilidade (spread operator)

---

### **2. Data Manager** 💾
**Responsabilidade:** Persistência de dados no navegador

```javascript
DataManager
├── save(key, data)   // Salva no localStorage
└── load(key)         // Carrega do localStorage
```

**Funcionalidades:**
- ✅ Versionamento de dados (v1.4)
- ✅ Tratamento de erros
- ✅ Prefixo de namespace (`lucrocerto_`)

---

### **3. UI Manager** 🎨
**Responsabilidade:** Renderização e navegação de páginas

```javascript
UIManager
├── pages[]           // Lista de páginas disponíveis
├── navButtons[]      // Configuração da navegação
├── init()            // Inicializa UI
├── renderNav()       // Renderiza navegação
├── updateNav()       // Atualiza estado ativo
├── updateActiveContent() // Troca de página
├── renderPage()      // Renderiza página específica
├── getDashboardHTML()     // HTML do Dashboard
├── getProdutosHTML()      // HTML de Produtos
├── getAddEditProductHTML() // HTML de Adicionar/Editar
├── getDespesasHTML()      // HTML de Despesas
├── getPrecificarHTML()    // HTML de Precificação
├── getMetasHTML()         // HTML de Metas
├── getRelatoriosHTML()    // HTML de Relatórios
├── bindAddEditProductEvents() // Eventos de produto
├── bindDespesasEvents()   // Eventos de despesas
├── bindPrecificarEvents() // Eventos de precificação
├── renderDashboardCharts() // Gráficos do dashboard
├── showAchievement()      // Mostra modal de conquista
└── hideAchievement()      // Esconde modal de conquista
```

**Padrões Utilizados:**
- ✅ Template Literals para HTML dinâmico
- ✅ Event Delegation
- ✅ Single Page Application (SPA)
- ✅ Lazy Icon Loading (Lucide)

---

### **4. Product Manager** 📦
**Responsabilidade:** Lógica de negócio de produtos

```javascript
ProductManager
├── getNewProductTemplate() // Template de novo produto
└── getTotalStock(product)  // Calcula estoque total
```

**Funcionalidades:**
- ✅ Suporte a produtos sem variação
- ✅ Suporte a variações simples
- ✅ Preparado para variações combinadas

---

### **5. Cost Manager** 💰
**Responsabilidade:** Gestão de custos

```javascript
CostManager
├── addFixedCost(name, value)      // Adiciona custo fixo
├── removeFixedCost(index)         // Remove custo fixo
├── addVariableCost(name, value, type) // Adiciona custo variável
└── removeVariableCost(index)      // Remove custo variável
```

**Tipos de Custos:**
- **Fixos:** Valores mensais constantes
- **Variáveis:** Percentual (%) ou valor fixo (R$) por venda

---

### **6. Smart Pricing** 🧮
**Responsabilidade:** Cálculos de precificação inteligente

```javascript
SmartPricing
├── getTotalMonthlyFixedCosts()    // Soma custos fixos
├── getTotalUnitCost(productCost)  // Calcula custo unitário
└── calculate(productCost, margin) // Calcula preço final
```

**Fórmula de Precificação:**
```
Preço de Venda = (Custo Total Unitário × (1 + Margem%)) ÷ (1 - Custos Variáveis%)
```

**Componentes do Custo Unitário:**
1. Custo do produto
2. Custos fixos / Meta de vendas mensal
3. Custos variáveis fixos (R$)
4. Frete / Meta de vendas mensal

---

### **7. Achievement System** 🏆
**Responsabilidade:** Sistema de gamificação

```javascript
AchievementSystem
├── badges{}           // Definição de badges
│   ├── primeiro_acesso
│   ├── primeiro_produto
│   └── meta_definida
└── checkAndAward(action) // Verifica e concede conquista
```

**Funcionalidades:**
- ✅ Verificação única (não duplica)
- ✅ Animação com confetti
- ✅ Modal de celebração

---

### **8. Emotional IA** 💖
**Responsabilidade:** Mensagens motivacionais

```javascript
EmotionalIA
└── generateInsight() // Gera mensagem inspiradora
```

**Próximas Features:**
- [ ] Mensagens contextuais baseadas em desempenho
- [ ] Múltiplas mensagens aleatórias
- [ ] Dicas personalizadas

---

### **9. Event Binding** 🎯
**Responsabilidade:** Gerenciamento centralizado de eventos

```javascript
bindEvents()
└── appContainer.addEventListener('click', ...)
    ├── navigate
    ├── add-new-product
    ├── edit-product
    ├── cancel-product-edit
    ├── save-goal
    ├── remove-fixed-cost
    └── remove-variable-cost
```

**Padrão:**
- ✅ Event Delegation com `data-action`
- ✅ Single listener no container pai
- ✅ Mapeamento de ações com objeto

---

## 🎨 Estrutura CSS

### **Variáveis CSS (Design Tokens)**
```css
:root {
  /* Cores */
  --primary, --primary-light, --primary-gradient
  --secondary, --secondary-light, --secondary-gradient
  --success, --success-light, --success-gradient
  --growth, --alert, --info
  --elegant-gray, --light-gray, --dark-gray
  --white, --background
  
  /* Efeitos */
  --shadow-soft, --shadow-medium, --shadow-strong
  --transition-smooth, --transition-bounce
  
  /* Tipografia */
  --font-main
}
```

### **Organização dos Estilos**
1. **Reset & Base** - Normalização
2. **Layout** - Estrutura principal
3. **Typography** - Estilos de texto
4. **Components** - Cards, Buttons, Forms
5. **Pages** - Estilos específicos de página
6. **Animations** - Keyframes
7. **Responsive** - Media queries

---

## 🔄 Fluxo de Dados

```
User Action
    ↓
Event Handler (bindEvents)
    ↓
Manager Function (CostManager, ProductManager, etc)
    ↓
State Update (StateManager.setState)
    ↓
Data Persistence (DataManager.save)
    ↓
Notify Subscribers (Observer Pattern)
    ↓
UI Update (UIManager re-render)
    ↓
Icon Initialization (Lucide)
```

---

## 🚀 Inicialização da Aplicação

```javascript
1. DOMContentLoaded event
2. LucroCertoApp.init()
3. DataManager.load('appState')
4. StateManager.setState(initialData)
5. UIManager.init()
   ├── renderNav()
   ├── updateActiveContent()
   └── updateNav()
6. bindEvents()
7. AchievementSystem.checkAndAward('primeiro_acesso')
```

---

## 🎯 Boas Práticas Implementadas

✅ **SOLID Principles**
- Single Responsibility: Cada módulo tem uma responsabilidade
- Open/Closed: Fácil adicionar novos recursos
- Dependency Inversion: Módulos não dependem de implementações

✅ **Design Patterns**
- Module Pattern (IIFE)
- Observer Pattern (State subscribers)
- Template Method (Page renderers)
- Strategy Pattern (Event handlers)

✅ **Clean Code**
- Nomes descritivos
- Funções pequenas e focadas
- Comentários explicativos
- Código autoexplicativo

✅ **Performance**
- Event delegation
- Lazy loading de ícones
- CSS transitions em vez de JS
- LocalStorage otimizado

---

## 📝 Como Adicionar uma Nova Página

1. **Adicionar ao HTML:**
```html
<div id="nova-pagina" class="page"></div>
```

2. **Adicionar ao UIManager:**
```javascript
pages: [..., 'nova-pagina'],
navButtons: [..., { id: 'nova-pagina', icon: 'icon-name', label: 'Nome' }]
```

3. **Criar método HTML:**
```javascript
getNovaPaginaHTML() {
  return `<h2>Conteúdo</h2>`;
}
```

4. **Adicionar ao renderPage:**
```javascript
'nova-pagina': () => { container.innerHTML = this.getNovaPaginaHTML(); }
```

---

## 🔒 Segurança

- ✅ Dados armazenados localmente (não enviados para servidor)
- ✅ Versionamento de dados (migração futura)
- ✅ Validação de inputs
- ⚠️ Sem autenticação (projeto single-user)

---

**Última atualização:** 11 de dezembro de 2025
