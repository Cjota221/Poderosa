// STATE MANAGER - Gerenciamento centralizado de estado da aplicação
export const StateManager = {
    state: {
        user: {},
        products: [],
        costs: {},
        achievements: [],
        currentPage: 'dashboard',
        editingProductId: null
    },
    subscribers: [],

    getState() { 
        return this.state; 
    },

    setState(newState) {
        this.state = { ...this.state, ...newState };
        console.log('State Updated:', this.state);
        this.notifySubscribers();
        
        // Salva no localStorage via DataManager
        if (window.DataManager) {
            window.DataManager.save('appState', this.state);
        }
    },

    subscribe(callback) { 
        this.subscribers.push(callback); 
    },

    notifySubscribers() { 
        this.subscribers.forEach(callback => callback()); 
    }
};
