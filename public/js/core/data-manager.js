// DATA MANAGER - Gerenciamento de persistência e cálculos
export const DataManager = {
    save(key, data) {
        try {
            localStorage.setItem(`lucrocerto_${key}`, JSON.stringify({ 
                data: data, 
                version: '1.4' 
            }));
        } catch (error) { 
            console.error('Erro ao salvar dados:', error); 
        }
    },

    load(key) {
        try {
            const item = localStorage.getItem(`lucrocerto_${key}`);
            if (item) {
                const parsed = JSON.parse(item);
                if (parsed.version && parsed.version.startsWith('1.')) {
                    return parsed.data;
                }
            }
        } catch (error) { 
            console.error('Erro ao carregar dados:', error); 
        }
        return null;
    },

    // Cálculos auxiliares
    calculateTotalStock(products) {
        return products.reduce((total, product) => {
            if (product.variationType === 'none') {
                return total + (product.stock.total || 0);
            } else if (product.variationType === 'simple') {
                const stockValues = Object.values(product.stock);
                return total + stockValues.reduce((sum, val) => sum + val, 0);
            }
            return total;
        }, 0);
    },

    calculateTotalValue(products) {
        return products.reduce((total, product) => {
            let stockQty = 0;
            if (product.variationType === 'none') {
                stockQty = product.stock.total || 0;
            } else if (product.variationType === 'simple') {
                stockQty = Object.values(product.stock).reduce((sum, val) => sum + val, 0);
            }
            return total + (stockQty * product.finalPrice);
        }, 0);
    },

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
};
