// SMART PRICING - Sistema inteligente de precificação
export const SmartPricing = {
    getTotalMonthlyFixedCosts() {
        const { costs, bills } = window.StateManager.getState();
        if (!costs) return 0;
        
        // Custos fixos manuais
        const manualFixed = (costs.fixed || []).reduce((acc, cost) => acc + cost.value, 0);
        
        // Custos vindos do Financeiro (contas recorrentes marcadas como custo do negócio)
        const billsFixed = (bills || [])
            .filter(b => b.recurring && b.isBusinessCost)
            .reduce((acc, b) => acc + b.amount, 0);
        
        return manualFixed + billsFixed;
    },

    getTotalUnitCost(productCost) {
        const { user, costs } = window.StateManager.getState();
        const salesGoal = user.monthlySalesGoal || 1;
        
        const fixedCostPerUnit = this.getTotalMonthlyFixedCosts() / salesGoal;
        const variableCostPerUnit = (costs.variable || [])
            .filter(c => c.type === 'fixed')
            .reduce((acc, cost) => acc + cost.value, 0);
        const shippingCostPerUnit = (costs.shipping || 0) / salesGoal;
        
        const total = productCost + fixedCostPerUnit + variableCostPerUnit + shippingCostPerUnit;
        
        return { 
            fixed: fixedCostPerUnit, 
            variable: variableCostPerUnit, 
            shipping: shippingCostPerUnit, 
            total: total 
        };
    },

    calculate(productCost, profitMarginPercentage) {
        const { costs } = window.StateManager.getState();
        const totalUnitCost = this.getTotalUnitCost(productCost).total;
        
        const variablePercentageSum = (costs.variable || [])
            .filter(c => c.type === 'percentage')
            .reduce((acc, cost) => acc + cost.value, 0);
        
        const numerator = totalUnitCost * (1 + profitMarginPercentage / 100);
        const denominator = 1 - (variablePercentageSum / 100);
        const price = numerator / (denominator || 1);
        const profit = price - totalUnitCost - (price * variablePercentageSum / 100);
        
        return { 
            price: isNaN(price) ? 0 : price, 
            profit: isNaN(profit) ? 0 : profit 
        };
    },

    /**
     * PONTO DE EQUILÍBRIO
     * Calcula quantas peças precisa vender para cobrir todos os custos
     * 
     * Fórmula: PE = Custos Fixos / (Preço de Venda - Custo Variável por Unidade)
     * 
     * @param {number} averageSellingPrice - Preço médio de venda (ou preço do produto)
     * @param {number} averageProductCost - Custo médio do produto
     * @returns {object} - Dados completos do ponto de equilíbrio
     */
    calculateBreakEven(averageSellingPrice, averageProductCost) {
        const { costs } = window.StateManager.getState();
        
        // 1. Total de Custos Fixos Mensais
        const totalFixedCosts = this.getTotalMonthlyFixedCosts();
        const shippingCost = costs.shipping || 0;
        const totalFixedWithShipping = totalFixedCosts + shippingCost;
        
        // 2. Custos Variáveis por Unidade (em R$)
        const variableFixedCosts = (costs.variable || [])
            .filter(c => c.type === 'fixed')
            .reduce((acc, cost) => acc + cost.value, 0);
        
        // 3. Custos Variáveis em % (sobre o preço de venda)
        const variablePercentageCosts = (costs.variable || [])
            .filter(c => c.type === 'percentage')
            .reduce((acc, cost) => acc + cost.value, 0);
        
        // 4. Custo variável total por unidade
        const variableCostPerUnit = averageProductCost + variableFixedCosts + (averageSellingPrice * variablePercentageCosts / 100);
        
        // 5. Margem de Contribuição = Preço de Venda - Custo Variável por Unidade
        const contributionMargin = averageSellingPrice - variableCostPerUnit;
        
        // 6. Ponto de Equilíbrio em Unidades
        const breakEvenUnits = contributionMargin > 0 ? Math.ceil(totalFixedWithShipping / contributionMargin) : 0;
        
        // 7. Ponto de Equilíbrio em Reais
        const breakEvenRevenue = breakEvenUnits * averageSellingPrice;
        
        // 8. Lucro por unidade após ponto de equilíbrio
        const profitPerUnit = contributionMargin;
        
        return {
            // Dados principais
            breakEvenUnits,           // Quantas unidades precisa vender
            breakEvenRevenue,         // Quanto precisa faturar
            contributionMargin,       // Margem de contribuição por unidade
            profitPerUnit,            // Lucro por unidade (após PE)
            
            // Detalhamento dos custos
            totalFixedCosts: totalFixedWithShipping,
            variableCostPerUnit,
            averageSellingPrice,
            averageProductCost,
            
            // Percentuais úteis
            contributionMarginPercent: averageSellingPrice > 0 ? (contributionMargin / averageSellingPrice * 100) : 0,
            
            // Status
            isViable: contributionMargin > 0,
            message: contributionMargin <= 0 
                ? '⚠️ Preço de venda não cobre os custos variáveis!' 
                : `✅ Venda ${breakEvenUnits} unidades para cobrir seus custos`
        };
    },

    /**
     * Calcula cenários de ponto de equilíbrio para diferentes metas
     */
    getBreakEvenScenarios(averageSellingPrice, averageProductCost) {
        const baseCalc = this.calculateBreakEven(averageSellingPrice, averageProductCost);
        
        if (!baseCalc.isViable) {
            return { base: baseCalc, scenarios: [] };
        }
        
        const scenarios = [
            {
                label: 'Ponto de Equilíbrio',
                units: baseCalc.breakEvenUnits,
                revenue: baseCalc.breakEvenRevenue,
                profit: 0,
                icon: '⚖️'
            },
            {
                label: 'Meta Mínima (+20%)',
                units: Math.ceil(baseCalc.breakEvenUnits * 1.2),
                revenue: Math.ceil(baseCalc.breakEvenUnits * 1.2) * averageSellingPrice,
                profit: Math.ceil(baseCalc.breakEvenUnits * 0.2) * baseCalc.contributionMargin,
                icon: '🎯'
            },
            {
                label: 'Meta Ideal (+50%)',
                units: Math.ceil(baseCalc.breakEvenUnits * 1.5),
                revenue: Math.ceil(baseCalc.breakEvenUnits * 1.5) * averageSellingPrice,
                profit: Math.ceil(baseCalc.breakEvenUnits * 0.5) * baseCalc.contributionMargin,
                icon: '🚀'
            },
            {
                label: 'Meta Ambiciosa (2x)',
                units: baseCalc.breakEvenUnits * 2,
                revenue: baseCalc.breakEvenUnits * 2 * averageSellingPrice,
                profit: baseCalc.breakEvenUnits * baseCalc.contributionMargin,
                icon: '💎'
            }
        ];
        
        return { base: baseCalc, scenarios };
    },

    /**
     * Calcula ponto de equilíbrio baseado nos produtos cadastrados
     */
    calculateBreakEvenFromProducts() {
        const { products } = window.StateManager.getState();
        
        if (!products || products.length === 0) {
            return {
                hasProducts: false,
                message: 'Cadastre produtos para calcular o ponto de equilíbrio'
            };
        }
        
        // Calcula médias dos produtos
        const totalProducts = products.length;
        const avgSellingPrice = products.reduce((acc, p) => acc + (p.finalPrice || p.price || 0), 0) / totalProducts;
        const avgCost = products.reduce((acc, p) => acc + (p.baseCost || p.cost || 0), 0) / totalProducts;
        
        return {
            hasProducts: true,
            avgSellingPrice,
            avgCost,
            totalProducts,
            ...this.calculateBreakEven(avgSellingPrice, avgCost)
        };
    }
};
