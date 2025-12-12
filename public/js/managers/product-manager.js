// PRODUCT MANAGER - Gerenciamento de produtos
export const ProductManager = {
    getNewProductTemplate() {
        return { 
            id: `prod_${Date.now()}`, 
            name: '', 
            baseCost: 0, 
            finalPrice: 0, 
            variationType: 'none', 
            variations: [], 
            stock: {}, 
            imageUrl: '' 
        };
    },

    getTotalStock(product) {
        if (product.variationType === 'none') {
            return product.stock.total || 0;
        }
        return Object.values(product.stock).reduce((acc, val) => acc + (parseInt(val, 10) || 0), 0);
    },

    getStockStatus(product) {
        const totalStock = this.getTotalStock(product);
        if (totalStock === 0) return { status: 'out', label: 'Sem estoque', color: 'var(--alert)' };
        if (totalStock <= 5) return { status: 'low', label: 'Estoque baixo', color: 'var(--warning)' };
        return { status: 'ok', label: 'Em estoque', color: 'var(--growth)' };
    }
};
