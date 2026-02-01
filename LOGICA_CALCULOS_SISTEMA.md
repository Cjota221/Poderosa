# 📊 Lógica de Cálculos do Sistema Lucro Certo

Este documento detalha todas as fórmulas e lógicas de cálculo utilizadas no sistema.

---

## 🎯 IMPORTANTE: Custeio Variável (Margem de Contribuição)

O sistema utiliza **Custeio Variável**, também conhecido como **Margem de Contribuição**. 

### Por que NÃO usamos Custeio por Absorção (Rateio)?

O método tradicional de rateio tenta dividir o aluguel e outros custos fixos pelos produtos:

```
❌ ERRADO (Custeio por Absorção):
Custo Unitário = Custo Produto + (Aluguel ÷ Meta de Vendas)
```

**Problemas desse método:**

1. **Dependência Circular (Ovo e Galinha)**
   - Para saber o Preço → precisa da Meta de Vendas
   - Para saber se a Meta é realista → precisa saber o Preço
   - 😵 Loop infinito!

2. **Gera "Lucro Falso"**
   - Se a usuária chutar que vai vender 100 peças, o aluguel é diluído por 100
   - O preço fica artificialmente baixo
   - Se ela vender só 50, o "lucro" que o sistema mostrou virou prejuízo na vida real

3. **Causa Ansiedade**
   - Obriga iniciante a prever o futuro antes de começar
   - "Quantas vou vender?" — Se não souber, trava

4. **Matematicamente Instável**
   - Se meta = 0 ou muito baixa, preço → infinito

### O que usamos: Custeio Variável

```
✅ CORRETO (Custeio Variável):
1. O Preço cobre: Custo do Produto + Taxas
2. O que sobra (Margem de Contribuição) vai enchendo o "balde" dos custos fixos
3. O Break-Even é um OUTPUT: "Venda X peças para pagar o aluguel"
```

**Vantagens:**

| Aspecto | Absorção (errado) | Variável (correto) |
|---------|-------------------|---------------------|
| Dependência | Preço depende de meta | Preço é independente |
| Segurança | Pode dar prejuízo sem saber | Garante que cobre custos diretos |
| Meta | INPUT (chute) | OUTPUT (guia de ação) |
| Complexidade | Confunde iniciante | Simples e intuitivo |

---

## 📋 Índice

1. [Estrutura de Custos](#1-estrutura-de-custos)
2. [Ponto de Equilíbrio](#2-ponto-de-equilíbrio)
3. [Precificação de Produtos](#3-precificação-de-produtos)
4. [Cálculo de Lucro por Venda](#4-cálculo-de-lucro-por-venda)
5. [Relatórios e Métricas](#5-relatórios-e-métricas)

---

## 1. Estrutura de Custos

O sistema separa CLARAMENTE dois tipos de custos:

### 1.1 Custos Fixos Mensais (NÃO entram no preço unitário!)

São custos que existem independente de você vender ou não. Eles são pagos pelo **conjunto das vendas**, não por cada produto individual.

**Exemplos:**
- Aluguel
- Internet
- Luz
- Telefone
- Frete mensal com fornecedor

**Fontes no sistema:**
```javascript
Custos Fixos = Custos Manuais + Contas Recorrentes do Financeiro + Frete Mensal
```

**Código:**
```javascript
getTotalMonthlyFixedCosts() {
    const { costs, bills } = StateManager.getState();
    
    // Custos manuais (aluguel, etc.)
    const manualCosts = (costs?.fixed || []).reduce((acc, cost) => acc + cost.value, 0);
    
    // Contas recorrentes do financeiro marcadas como custo do negócio
    const billsCosts = (bills || [])
        .filter(b => b.recurring && b.isBusinessCost)
        .reduce((acc, b) => acc + b.amount, 0);
    
    // Frete mensal
    const shippingCost = costs?.shipping || 0;
    
    return manualCosts + billsCosts + shippingCost;
}
```

### 1.2 Custos Diretos (ENTRAM no preço unitário!)

São custos que **saem junto com cada produto vendido**. Cada venda gera esse custo.

#### Tipo 1: Custo do Produto
Quanto você pagou pelo produto ou gastou para produzi-lo.

#### Tipo 2: Custos Variáveis FIXOS por unidade (R$)
Valor fixo por cada venda:
- Embalagem: R$ 2,00 por peça
- Etiqueta: R$ 0,50 por peça

#### Tipo 3: Custos Variáveis PERCENTUAIS (%)
Porcentagem sobre o preço de venda (calculados após definir o preço):
- Taxa do cartão: 3%
- Comissão marketplace: 15%

**Fórmula do Custo Direto:**
```
Custo Direto = Custo do Produto + Embalagens/Etiquetas
```

**Código:**
```javascript
getDirectUnitCost(productCost) {
    const { costs } = StateManager.getState();
    
    // Embalagem, etiqueta, etc (R$ por unidade)
    const packagingCosts = (costs?.variable || [])
        .filter(c => c.type === 'fixed')
        .reduce((acc, cost) => acc + cost.value, 0);
    
    return { 
        productCost,
        packagingCosts,
        total: productCost + packagingCosts 
    };
}
```

---

## 2. Ponto de Equilíbrio

### 2.1 Conceito (Nova Lógica!)

O Ponto de Equilíbrio é agora um **OUTPUT**, não um INPUT!

**Antes (errado):** "Digite quantas vai vender para eu calcular o preço"
**Agora (correto):** "Dado o preço, você precisa vender X peças para pagar os custos fixos"

### 2.2 Fórmula Principal

```
                         Custos Fixos Totais
Ponto de Equilíbrio = ─────────────────────────
                       Margem de Contribuição
```

Onde:
```
Margem de Contribuição = Preço - Custo Direto - Taxas
```

### 2.3 Exemplo

**Dados:**
- Preço de venda: R$ 80,00
- Custo do produto: R$ 30,00
- Embalagem: R$ 2,00
- Taxa cartão: 3%
- Custos fixos mensais: R$ 600,00

**Cálculo:**
```
1. Custo Direto = R$ 30 + R$ 2 = R$ 32,00
2. Taxa = R$ 80 × 3% = R$ 2,40
3. Margem de Contribuição = R$ 80 - R$ 32 - R$ 2,40 = R$ 45,60
4. Ponto de Equilíbrio = R$ 600 ÷ R$ 45,60 = 14 peças/mês
```

**Resultado:** Precisa vender 14 peças para pagar os R$ 600 de custos fixos.

### 2.4 Metas Derivadas

| Meta | Fórmula | Descrição |
|------|---------|-----------|
| Ponto de Equilíbrio | PE | Paga os custos, lucro zero |
| Meta Segura | PE × 1.2 (+20%) | Margem de segurança |
| Meta Ideal | PE × 1.5 (+50%) | Lucro confortável |

---

## 3. Precificação de Produtos

### 3.1 Conceito (Custeio Variável)

O preço é calculado para cobrir:
1. ✅ Custo direto do produto
2. ✅ Embalagens/etiquetas
3. ✅ Margem de lucro desejada
4. ✅ Taxas percentuais (protegidas)

**O preço NÃO tenta cobrir custos fixos por unidade!** Os custos fixos são pagos pelo volume de vendas (Margem de Contribuição × Quantidade).

### 3.2 Fórmula do Preço de Venda

```
                    Custo Direto × (1 + Margem%)
Preço de Venda = ─────────────────────────────────
                    1 - (Soma das Taxas%)
```

**Por que dividir por (1 - Taxas%)?**
Porque as taxas são cobradas SOBRE o preço final. Se você só multiplicar, a taxa "come" parte da margem.

### 3.3 Código

```javascript
calculate(productCost, profitMarginPercentage) {
    const directCost = this.getDirectUnitCost(productCost).total;
    const taxPercentage = this.getPercentageCosts();
    
    // Fórmula que protege a margem das taxas
    const numerator = directCost * (1 + profitMarginPercentage / 100);
    const denominator = 1 - (taxPercentage / 100);
    const price = numerator / (denominator || 1);
    
    // Margem de Contribuição = O que sobra para pagar os fixos
    const taxValue = price * taxPercentage / 100;
    const contributionMargin = price - directCost - taxValue;
    
    return { 
        price, 
        profit: contributionMargin,  // Para compatibilidade
        contributionMargin,
        directCost,
        taxValue
    };
}
```

### 3.4 Exemplo Prático

**Dados:**
- Custo do produto: R$ 30,00
- Embalagem: R$ 2,00
- Margem desejada: 50%
- Taxa do cartão: 3%

**Cálculo:**

```
1. Custo Direto = R$ 30 + R$ 2 = R$ 32,00

2. Preço de Venda = (R$ 32 × 1,50) ÷ (1 - 0,03)
                  = R$ 48 ÷ 0,97
                  = R$ 49,48

3. Conferindo:
   Receita:           R$ 49,48
   - Custo Direto:    R$ 32,00
   - Taxa (3%):       R$ 1,48
   ─────────────────────────────
   Margem Contribuição: R$ 16,00 ✅
```

A margem de contribuição de R$ 16 por peça vai "enchendo o balde" dos custos fixos.

---

## 4. Cálculo de Lucro por Venda

### 4.1 Ao Registrar uma Venda

```javascript
// Margem de Contribuição por item
const profit = (item.salePrice - item.baseCost) * item.quantity;
```

### 4.2 Margem de Contribuição vs Lucro Líquido

| Tipo | Fórmula | Descrição |
|------|---------|-----------|
| **Margem de Contribuição** | Preço - Custo Direto - Taxas | O que sobra de cada venda |
| **Lucro Líquido Mensal** | (MC × Qtd Vendida) - Custos Fixos | Lucro real do mês |

**Exemplo:**
- Margem de Contribuição: R$ 40/peça
- Vendeu: 20 peças
- Custos Fixos: R$ 600/mês

```
Lucro Líquido = (R$ 40 × 20) - R$ 600 = R$ 800 - R$ 600 = R$ 200
```

---

## 5. Relatórios e Métricas

### 5.1 Métricas do Dashboard

#### Faturamento
```javascript
const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);
```

#### Margem de Contribuição Total
```javascript
const totalProfit = sales.reduce((acc, sale) => acc + (sale.profit || 0), 0);
```

#### Ticket Médio
```javascript
const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
```

#### Margem Média (%)
```javascript
const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
```

### 5.2 Filtros por Período

O sistema permite filtrar por:
- Hoje
- Esta semana
- Este mês
- Período personalizado

---

## 📐 Resumo das Fórmulas Principais (Custeio Variável)

| Cálculo | Fórmula |
|---------|---------|
| **Custo Direto** | `Custo Produto + Embalagens` |
| **Preço de Venda** | `(Custo Direto × (1 + Margem%)) ÷ (1 - Taxas%)` |
| **Margem de Contribuição** | `Preço - Custo Direto - Taxas` |
| **Ponto de Equilíbrio** | `Custos Fixos ÷ Margem de Contribuição` |
| **Lucro Líquido Mensal** | `(MC × Qtd Vendida) - Custos Fixos` |

---

## ⚠️ Diferença: Margem vs Markup

| Conceito | Base de Cálculo | Fórmula |
|----------|-----------------|---------|
| **Margem** | Preço de Venda | `Lucro ÷ Preço × 100` |
| **Markup** | Custo | `Lucro ÷ Custo × 100` |

**Exemplo:**
- Custo: R$ 50
- Preço: R$ 100
- Lucro: R$ 50

```
Markup = R$ 50 ÷ R$ 50 × 100 = 100%
Margem = R$ 50 ÷ R$ 100 × 100 = 50%
```

---

## 🔗 Integração Entre Módulos (Nova Arquitetura)

```
┌─────────────────────────────────────────────────────────────┐
│                    PÁGINA DE CUSTOS                         │
│                                                             │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │ CUSTOS FIXOS     │      │ CUSTOS VARIÁVEIS │            │
│  │ (Aluguel, Luz)   │      │ (Embalagem, Taxas)│           │
│  │                  │      │                  │            │
│  │ NÃO entram no    │      │ ENTRAM no preço  │            │
│  │ preço unitário!  │      │ de cada produto! │            │
│  └────────┬─────────┘      └────────┬─────────┘            │
│           │                         │                       │
│           ▼                         ▼                       │
│  ┌────────────────┐       ┌─────────────────────┐          │
│  │ BREAK-EVEN     │       │ PRECIFICAÇÃO        │          │
│  │ "Venda X peças │       │ Preço = Custo Direto│          │
│  │ para pagar"    │       │ + Margem + Taxas    │          │
│  └────────────────┘       └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Preço salvo no produto
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CADASTRO DE PRODUTO                      │
│                                                             │
│  • Digita CUSTO do produto                                  │
│  • Sistema sugere PREÇO com 67% de margem                   │
│  • Mostra Break-Even automaticamente como OUTPUT            │
│  • "Com esse preço, venda X peças para pagar os fixos"      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Produto com preço definido
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PÁGINA DE VENDAS                         │
│                                                             │
│  • Registra venda                                           │
│  • Calcula Margem de Contribuição automaticamente           │
│  • Cada venda "enche o balde" dos custos fixos              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     RELATÓRIOS                              │
│                                                             │
│  • Faturamento total                                        │
│  • Margem de Contribuição total                             │
│  • Lucro Líquido = MC Total - Custos Fixos                 │
│  • Ticket médio                                             │
│  • Break-Even: "Faltam X peças para pagar os fixos"        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Notas Importantes

1. **Custos Fixos NÃO são rateados por produto!** Eles são pagos pelo conjunto das vendas através da Margem de Contribuição.

2. **Break-Even é OUTPUT, não INPUT!** O sistema diz "venda X peças", não pergunta "quantas vai vender?".

3. **Preço é independente de meta!** Você pode precificar sem saber quantas vai vender. O sistema usa o mercado e a margem desejada.

4. **Margem de Contribuição** é o que sobra de cada venda para pagar os custos fixos e gerar lucro.

5. **Lucro Líquido Mensal** = (Margem de Contribuição × Quantidade Vendida) - Custos Fixos

---

## 6. Cadastro de Produtos

### 6.1 Visão Geral

A página de cadastro de produtos é uma das mais completas do sistema. Ela permite cadastrar um produto com:
- Nome e descrição
- Múltiplas fotos
- Precificação inteligente automática
- Variações (tamanhos, cores, etc.)
- Controle de estoque

### 6.2 Estrutura da Página

```
┌─────────────────────────────────────────────────────────────┐
│                    CADASTRO DE PRODUTO                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📝 NOME DO PRODUTO                                         │
│  ├─ Campo obrigatório                                       │
│  └─ Ex: "Colar de Pérolas"                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📷 FOTOS DO PRODUTO                                        │
│  ├─ Múltiplas fotos (até 2MB cada)                         │
│  ├─ Primeira foto = foto principal                         │
│  └─ Arrastar para reordenar                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📄 DESCRIÇÃO (opcional)                                    │
│  ├─ Toggle para ativar/desativar                           │
│  └─ Campo de texto livre                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 PRECIFICAÇÃO INTELIGENTE                                │
│  ├─ Custo do produto (obrigatório)                         │
│  ├─ Sugestão automática de preço                           │
│  ├─ Slider para ajustar margem                             │
│  ├─ Feedback visual (emojis)                               │
│  └─ Detalhamento completo dos custos                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 VARIAÇÕES E ESTOQUE                                     │
│  ├─ Sem variação (produto único)                           │
│  ├─ Variação simples (ex: P, M, G)                         │
│  └─ Variação combinada (ex: Cor + Tamanho)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Campos do Formulário

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | texto | ✅ Sim | Nome do produto |
| `description` | textarea | ❌ Não | Descrição detalhada |
| `images` | array | ❌ Não | Lista de imagens em base64 |
| `baseCost` | número | ✅ Sim | Custo de aquisição/produção |
| `finalPrice` | número | ✅ Sim | Preço de venda final |
| `variationType` | enum | ✅ Sim | `none`, `simple` ou `combined` |
| `variations` | array | Depende | Opções de variação |
| `stock` | objeto | ✅ Sim | Quantidade em estoque |

### 6.4 Lógica da Precificação Inteligente

A grande diferença do sistema é que ele **não pede o preço diretamente**. Ele:

1. **Pede o custo do produto**
2. **Calcula automaticamente uma sugestão** (67% de margem)
3. **Permite ajustar via slider**
4. **Mostra feedback visual em tempo real**

#### Fluxo da Precificação:

```
┌──────────────────────────────────────────────────────────────┐
│ Usuária digita: Custo = R$ 30,00                            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Sistema calcula custo TOTAL por unidade:                     │
│                                                              │
│ Custo Total = Custo Produto + Custos Fixos Rateados +       │
│               Custos Variáveis                               │
│                                                              │
│ Exemplo: R$ 30 + R$ 15 (fixo) + R$ 2 (variável) = R$ 47     │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Sistema sugere preço com 67% de margem:                      │
│                                                              │
│ Preço Sugerido = R$ 47 × 1.67 ÷ (1 - taxas%)                │
│               = R$ 78,49 ÷ 0,97 = R$ 80,92                   │
│                                                              │
│ "Baseado no seu custo de R$ 47, este preço te dá            │
│  um lucro de R$ 31,04 por venda"                            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Usuária pode AJUSTAR usando o slider (20% a 150%)           │
│                                                              │
│ 💀 ─────────────😐─────────😊─────────😍─────────🤑          │
│ 20%            40%        60%        80%        150%         │
│ Prejuízo      Baixo      Ideal      Alto       Absurdo      │
└──────────────────────────────────────────────────────────────┘
```

#### Código da Sugestão:

```javascript
// Calcula custo total por unidade (inclui rateio)
const unitCosts = SmartPricing.getTotalUnitCost(productCost);

// Sugestão automática: 67% de margem
const suggestedMargin = 67;
const suggestedCalc = SmartPricing.calculate(productCost, suggestedMargin);

// Mostra sugestão
suggestedPriceEl.textContent = `R$ ${suggestedCalc.price.toFixed(2)}`;
suggestionReasonEl.innerHTML = `
    Baseado no seu custo de R$ ${unitCosts.total.toFixed(2)}, 
    este preço te dá um lucro de R$ ${suggestedCalc.profit.toFixed(2)} por venda.
`;
```

#### Feedback Visual por Faixa de Margem:

| Margem | Emoji | Título | Cor |
|--------|-------|--------|-----|
| < 0% | 💀 | PREJUÍZO! | Vermelho |
| 0-30% | 😐 | Lucro Muito Baixo | Laranja |
| 30-50% | 😊 | Lucro Razoável | Amarelo |
| 50-80% | 😍 | Preço Ideal! | Verde |
| 80-120% | 🤑 | Lucro Alto | Azul |
| > 120% | 🤯 | Preço Muito Alto! | Roxo |

```javascript
// Exemplo do feedback
if (margin >= 50 && margin <= 80) {
    emoji = '😍';
    title = 'Preço Ideal!';
    message = `Excelente! Lucro de R$ ${profit.toFixed(2)} por venda.`;
    bgColor = '#E8F5E9';
    textColor = '#2E7D32';
}
```

### 6.5 Sistema de Variações

O sistema suporta 3 tipos de produtos:

#### Tipo 1: Sem Variação
Produto único, apenas controle de quantidade total.

```javascript
// Estrutura de dados
{
    variationType: 'none',
    stock: {
        total: 50  // 50 unidades
    }
}
```

#### Tipo 2: Variação Simples
Uma dimensão de variação (ex: só tamanho OU só cor).

```javascript
// Estrutura de dados
{
    variationType: 'simple',
    variations: [
        {
            name: 'Tamanho',
            options: [
                { value: 'P', color: null },
                { value: 'M', color: null },
                { value: 'G', color: null }
            ]
        }
    ],
    stock: {
        'P': 10,
        'M': 15,
        'G': 8
    }
}
```

**Com cores:**
```javascript
{
    variations: [
        {
            name: 'Cor',
            options: [
                { value: 'Preto', color: '#000000' },
                { value: 'Branco', color: '#FFFFFF' },
                { value: 'Rosa', color: '#E91E63' }
            ]
        }
    ],
    stock: {
        'Preto': 20,
        'Branco': 15,
        'Rosa': 12
    }
}
```

#### Tipo 3: Variação Combinada
Duas dimensões combinadas (ex: cor E tamanho).

```javascript
// Estrutura de dados
{
    variationType: 'combined',
    variations: [
        {
            name: 'Cor',
            options: ['Preto', 'Branco', 'Nude']
        },
        {
            name: 'Tamanho',
            options: ['P', 'M', 'G']
        }
    ],
    stock: {
        'Preto-P': 5,
        'Preto-M': 8,
        'Preto-G': 3,
        'Branco-P': 10,
        'Branco-M': 12,
        'Branco-G': 7,
        'Nude-P': 6,
        'Nude-M': 9,
        'Nude-G': 4
    }
}
```

**Tabela de estoque combinada:**

| | P | M | G |
|---|---|---|---|
| **Preto** | 5 | 8 | 3 |
| **Branco** | 10 | 12 | 7 |
| **Nude** | 6 | 9 | 4 |

### 6.6 Galeria de Fotos

O sistema permite múltiplas fotos por produto:

```javascript
// Estrutura de imagens
{
    images: [
        'data:image/jpeg;base64,...',  // Foto principal (índice 0)
        'data:image/jpeg;base64,...',  // Foto 2
        'data:image/jpeg;base64,...'   // Foto 3
    ],
    variationImages: {
        'Preto': 'data:image/jpeg;base64,...',  // Foto específica para cor
        'Branco': 'data:image/jpeg;base64,...'
    }
}
```

**Regras:**
- Máximo 2MB por imagem
- Primeira imagem = foto principal
- Pode vincular fotos a variações de cor

### 6.7 Fluxo de Salvamento

Quando o formulário é submetido:

```javascript
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Coleta dados básicos
    const name = document.getElementById('product-name').value.trim();
    const baseCost = parseFloat(baseCostInput.value) || 0;
    const margin = parseInt(profitMarginInput.value) || 67;
    
    // 2. Calcula preço final usando SmartPricing
    const calculatedPrice = SmartPricing.calculate(baseCost, margin);
    
    // 3. Monta objeto do produto
    const productData = {
        id: editingProductId || generateUniqueId(),
        name,
        description,
        baseCost,
        finalPrice: calculatedPrice.price,  // Preço calculado!
        profitMargin: margin,
        images: productImages,
        variationType,
        variations,
        stock,
        variationImages,
        createdAt: existingProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // 4. Salva no estado
    if (editingProductId) {
        ProductManager.updateProduct(productData);
    } else {
        ProductManager.addProduct(productData);
    }
    
    // 5. Navega de volta para lista de produtos
    StateManager.setState({ 
        currentPage: 'produtos',
        editingProductId: null 
    });
});
```

### 6.8 Estrutura Completa do Produto Salvo

```javascript
{
    id: 'prod_abc123',
    name: 'Camiseta Básica',
    description: 'Camiseta 100% algodão, confortável e durável',
    
    // Custos e Preços
    baseCost: 25.00,           // Quanto pagou
    finalPrice: 59.90,         // Preço de venda
    profitMargin: 67,          // Margem usada no cálculo
    
    // Imagens
    images: [
        'data:image/jpeg;base64,...',
        'data:image/jpeg;base64,...'
    ],
    
    // Variações
    variationType: 'combined',
    variations: [
        { name: 'Cor', options: ['Preto', 'Branco'] },
        { name: 'Tamanho', options: ['P', 'M', 'G'] }
    ],
    variationImages: {
        'Preto': 'data:image/jpeg;base64,...',
        'Branco': 'data:image/jpeg;base64,...'
    },
    
    // Estoque
    stock: {
        'Preto-P': 10, 'Preto-M': 15, 'Preto-G': 8,
        'Branco-P': 12, 'Branco-M': 18, 'Branco-G': 6
    },
    
    // Metadados
    createdAt: '2026-01-15T10:30:00.000Z',
    updatedAt: '2026-01-31T14:45:00.000Z'
}
```

### 6.9 Integração com Outros Módulos

O produto cadastrado é usado em:

| Módulo | Como Usa |
|--------|----------|
| **Catálogo Digital** | Exibe para clientes com fotos e preços |
| **Vendas** | Seleciona produto, variação e quantidade |
| **Relatórios** | Calcula produtos mais vendidos |
| **Estoque** | Baixa automática ao vender |

---

*Documento gerado em: Janeiro/2026*
*Sistema: Lucro Certo - Poderosa*
