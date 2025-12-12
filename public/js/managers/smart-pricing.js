// SMART PRICING - Sistema inteligente de precificação
export const SmartPricing = {
    getTotalMonthlyFixedCosts() {
        const { costs } = window.StateManager.getState();
        if (!costs || !costs.fixed) return 0;
        return costs.fixed.reduce((acc, cost) => acc + cost.value, 0);
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
    }
};
