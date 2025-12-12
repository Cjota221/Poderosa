// COST MANAGER - Gerenciamento de custos fixos e variáveis
export const CostManager = {
    addFixedCost(name, value) { 
        if (!name || !(value > 0)) return; 
        
        const state = window.StateManager.getState(); 
        state.costs.fixed.push({ name, value }); 
        window.StateManager.setState({ costs: state.costs }); 
    },

    removeFixedCost(index) { 
        const state = window.StateManager.getState(); 
        state.costs.fixed.splice(index, 1); 
        window.StateManager.setState({ costs: state.costs }); 
    },

    addVariableCost(name, value, type) { 
        if (!name || !(value > 0)) return; 
        
        const state = window.StateManager.getState(); 
        state.costs.variable.push({ name, value, type }); 
        window.StateManager.setState({ costs: state.costs }); 
    },

    removeVariableCost(index) { 
        const state = window.StateManager.getState(); 
        state.costs.variable.splice(index, 1); 
        window.StateManager.setState({ costs: state.costs }); 
    },

    getTotalFixedCosts() {
        const { costs } = window.StateManager.getState();
        return (costs.fixed || []).reduce((acc, cost) => acc + cost.value, 0);
    },

    getTotalVariableCosts() {
        const { costs } = window.StateManager.getState();
        const fixed = (costs.variable || [])
            .filter(c => c.type === 'fixed')
            .reduce((acc, cost) => acc + cost.value, 0);
        return fixed;
    }
};
