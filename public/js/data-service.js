/**
 * LUCRO CERTO - Serviço de Dados
 * Gerencia sincronização entre localStorage e Supabase
 */

class DataService {
    constructor() {
        this.useSupabase = false; // Começa com localStorage, migra para Supabase quando logado
        this.syncQueue = [];
        this.isSyncing = false;
    }

    // Obter chave de localStorage específica do usuário
    getUserStorageKey(baseKey = 'appState') {
        const authData = localStorage.getItem('lucrocerto_auth');
        if (authData) {
            try {
                const auth = JSON.parse(authData);
                const userId = auth.userId || 'default';
                return `${baseKey}_${userId}`;
            } catch (e) {
                console.error('Erro ao ler userId:', e);
            }
        }
        return baseKey; // Fallback para chave genérica
    }

    // Inicializar serviço
    async init() {
        // Verificar se tem usuário logado no Supabase
        if (supabase.isAuthenticated()) {
            this.useSupabase = true;
            await this.syncFromCloud();
        }
    }

    // Verificar se deve usar Supabase
    shouldUseCloud() {
        // ✅ Todos usam Supabase (incluindo trials) se tiverem userId válido
        const user = supabase.getUser();
        const hasValidUserId = user && user.id && !user.id.startsWith('trial_temp');
        
        return hasValidUserId && supabase.isAuthenticated();
    }

    // ==========================================
    // PRODUTOS
    // ==========================================

    async getProducts() {
        if (this.shouldUseCloud()) {
            const user = supabase.getUser();
            console.log('📦 Buscando produtos do Supabase para userId:', user?.id);
            
            const result = await supabase.select('produtos', {
                filters: { usuario_id: user.id },
                orderBy: 'created_at',
                ascending: false
            });
            
            console.log('📦 Produtos encontrados:', result.data?.length || 0);
            return result.data || [];
        }
        
        // Fallback localStorage (isolado por usuário)
        console.log('📦 Buscando produtos do localStorage');
        const storageKey = this.getUserStorageKey();
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return state.products || [];
    }

    async saveProduct(product) {
        if (this.shouldUseCloud()) {
            const user = supabase.getUser();
            console.log('💾 Salvando produto no Supabase para userId:', user?.id);
            
            const productData = {
                usuario_id: user.id,
                nome: product.name,
                descricao: product.description || '',
                preco_custo: product.cost || 0,
                preco_venda: product.price,
                estoque: product.stock || 0,
                categoria: product.category || '',
                foto_url: product.image || '',
                ativo: true
            };

            if (product.id && !product.id.startsWith('local_')) {
                // Update
                return await supabase.update('produtos', product.id, productData);
            } else {
                // Insert
                const result = await supabase.insert('produtos', productData);
                console.log('✅ Produto criado no Supabase:', result.data);
                return result;
            }
        }
        
        // Fallback localStorage (isolado por usuário)
        const storageKey = this.getUserStorageKey();
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const products = state.products || [];
        
        if (product.id) {
            const index = products.findIndex(p => p.id === product.id);
            if (index >= 0) {
                products[index] = product;
            }
        } else {
            product.id = 'local_' + Date.now();
            products.push(product);
        }
        
        state.products = products;
        localStorage.setItem(storageKey, JSON.stringify(state));
        return { success: true, data: product };
    }

    async deleteProduct(productId) {
        if (this.shouldUseCloud()) {
            return await supabase.delete('produtos', productId);
        }
        
        // Fallback localStorage (isolado por usuário)
        const storageKey = this.getUserStorageKey();
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        state.products = (state.products || []).filter(p => p.id !== productId);
        localStorage.setItem(storageKey, JSON.stringify(state));
        return { success: true };
    }

    // ==========================================
    // CLIENTES
    // ==========================================

    async getClients() {
        if (this.shouldUseCloud()) {
            const result = await supabase.select('clientes', {
                filters: { usuario_id: supabase.getUser().id },
                orderBy: 'nome',
                ascending: true
            });
            return result.data || [];
        }
        
        const storageKey = this.getUserStorageKey();
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return state.clients || [];
    }

    async saveClient(client) {
        if (this.shouldUseCloud()) {
            const clientData = {
                usuario_id: supabase.getUser().id,
                nome: client.name,
                telefone: client.phone || '',
                email: client.email || '',
                endereco: client.address || '',
                notas: client.notes || ''
            };

            if (client.id && !client.id.startsWith('local_')) {
                return await supabase.update('clientes', client.id, clientData);
            } else {
                return await supabase.insert('clientes', clientData);
            }
        }
        
        const storageKey = this.getUserStorageKey();
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const clients = state.clients || [];
        
        if (client.id) {
            const index = clients.findIndex(c => c.id === client.id);
            if (index >= 0) {
                clients[index] = client;
            }
        } else {
            client.id = 'local_' + Date.now();
            clients.push(client);
        }
        
        state.clients = clients;
        localStorage.setItem(storageKey, JSON.stringify(state));
        return { success: true, data: client };
    }

    async deleteClient(clientId) {
        if (this.shouldUseCloud()) {
            return await supabase.delete('clientes', clientId);
        }
        
        const storageKey = this.getUserStorageKey();
        const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
        state.clients = (state.clients || []).filter(c => c.id !== clientId);
        localStorage.setItem(storageKey, JSON.stringify(state));
        return { success: true };
    }

    // ==========================================
    // VENDAS
    // ==========================================

    async getSales() {
        if (this.shouldUseCloud()) {
            const result = await supabase.select('vendas', {
                filters: { usuario_id: supabase.getUser().id },
                orderBy: 'data_venda',
                ascending: false
            });
            
            // Buscar itens de cada venda
            const sales = result.data || [];
            for (const sale of sales) {
                const itemsResult = await supabase.select('itens_venda', {
                    filters: { venda_id: sale.id }
                });
                sale.items = itemsResult.data || [];
            }
            
            return sales;
        }
        
        const state = JSON.parse(localStorage.getItem(this.getUserStorageKey()) || '{}');
        return state.sales || [];
    }

    async saveSale(sale) {
        if (this.shouldUseCloud()) {
            const saleData = {
                usuario_id: supabase.getUser().id,
                cliente_id: sale.clientId || null,
                cliente_nome: sale.clientName || '',
                total: sale.total,
                forma_pagamento: sale.paymentMethod || '',
                status: 'completed',
                data_venda: sale.date || new Date().toISOString()
            };

            // Inserir venda
            const saleResult = await supabase.insert('vendas', saleData);
            
            if (saleResult.success && sale.items) {
                // Inserir itens da venda
                for (const item of sale.items) {
                    await supabase.insert('itens_venda', {
                        venda_id: saleResult.data.id,
                        produto_id: item.productId || null,
                        produto_nome: item.productName,
                        quantidade: item.quantity,
                        preco_unitario: item.price,
                        subtotal: item.quantity * item.price
                    });
                }
            }
            
            return saleResult;
        }
        
        const state = JSON.parse(localStorage.getItem(this.getUserStorageKey()) || '{}');
        const sales = state.sales || [];
        
        sale.id = sale.id || 'local_' + Date.now();
        sale.date = sale.date || new Date().toISOString();
        sales.unshift(sale);
        
        state.sales = sales;
        localStorage.setItem(this.getUserStorageKey(), JSON.stringify(state));
        return { success: true, data: sale };
    }

    async deleteSale(saleId) {
        if (this.shouldUseCloud()) {
            return await supabase.delete('vendas', saleId);
        }
        
        const state = JSON.parse(localStorage.getItem(this.getUserStorageKey()) || '{}');
        state.sales = (state.sales || []).filter(s => s.id !== saleId);
        localStorage.setItem(this.getUserStorageKey(), JSON.stringify(state));
        return { success: true };
    }

    // ==========================================
    // DESPESAS
    // ==========================================

    async getExpenses() {
        if (this.shouldUseCloud()) {
            const result = await supabase.select('despesas', {
                filters: { usuario_id: supabase.getUser().id },
                orderBy: 'data_vencimento',
                ascending: true
            });
            return result.data || [];
        }
        
        const state = JSON.parse(localStorage.getItem(this.getUserStorageKey()) || '{}');
        return state.expenses || [];
    }

    async saveExpense(expense) {
        if (this.shouldUseCloud()) {
            const expenseData = {
                usuario_id: supabase.getUser().id,
                descricao: expense.description,
                valor: expense.amount,
                data_vencimento: expense.dueDate || null,
                pago: expense.paid || false,
                categoria: expense.category || ''
            };

            if (expense.id && !expense.id.startsWith('local_')) {
                return await supabase.update('despesas', expense.id, expenseData);
            } else {
                return await supabase.insert('despesas', expenseData);
            }
        }
        
        const state = JSON.parse(localStorage.getItem(this.getUserStorageKey()) || '{}');
        const expenses = state.expenses || [];
        
        if (expense.id) {
            const index = expenses.findIndex(e => e.id === expense.id);
            if (index >= 0) {
                expenses[index] = expense;
            }
        } else {
            expense.id = 'local_' + Date.now();
            expenses.push(expense);
        }
        
        state.expenses = expenses;
        localStorage.setItem(this.getUserStorageKey(), JSON.stringify(state));
        return { success: true, data: expense };
    }

    // ==========================================
    // PERFIL DO USUÁRIO
    // ==========================================

    async getUserProfile() {
        if (this.shouldUseCloud()) {
            const result = await supabase.select('usuarios', {
                filters: { id: supabase.getUser().id }
            });
            return result.data?.[0] || null;
        }
        
        const auth = JSON.parse(localStorage.getItem('lucrocerto_auth') || '{}');
        return auth;
    }

    async updateUserProfile(profile) {
        if (this.shouldUseCloud()) {
            return await supabase.update('usuarios', supabase.getUser().id, {
                nome: profile.nome,
                telefone: profile.telefone,
                nome_negocio: profile.nomeNegocio,
                foto_url: profile.fotoUrl,
                rotina: profile.rotina,
                meta_mensal: profile.meta_mensal,
                meta_vendas: profile.meta_vendas
            });
        }
        
        const auth = JSON.parse(localStorage.getItem('lucrocerto_auth') || '{}');
        Object.assign(auth, profile);
        localStorage.setItem('lucrocerto_auth', JSON.stringify(auth));
        return { success: true };
    }

    // ==========================================
    // ASSINATURA
    // ==========================================

    async getSubscription() {
        if (this.shouldUseCloud()) {
            const result = await supabase.select('assinaturas', {
                filters: { usuario_id: supabase.getUser().id },
                orderBy: 'created_at',
                ascending: false,
                limit: 1
            });
            return result.data?.[0] || null;
        }
        
        const auth = JSON.parse(localStorage.getItem('lucrocerto_auth') || '{}');
        return {
            plano: auth.plano || 'trial',
            status: localStorage.getItem('lucrocerto_trial') === 'true' ? 'trial' : 'active'
        };
    }

    // ==========================================
    // SINCRONIZAÇÃO
    // ==========================================

    async syncFromCloud() {
        if (!this.shouldUseCloud()) return;
        
        console.log('📥 Sincronizando dados do Supabase...');
        
        try {
            // Buscar todos os dados do cloud e atualizar o state local
            const [products, clients, sales, expenses] = await Promise.all([
                this.getProducts(),
                this.getClients(),
                this.getSales(),
                this.getExpenses()
            ]);
            
            // Atualizar StateManager se existir
            if (window.StateManager) {
                StateManager.setState({
                    products: products.map(p => ({
                        id: p.id,
                        name: p.nome,
                        price: p.preco_venda,
                        cost: p.preco_custo,
                        stock: p.estoque,
                        category: p.categoria,
                        image: p.foto_url,
                        description: p.descricao
                    })),
                    clients: clients.map(c => ({
                        id: c.id,
                        name: c.nome,
                        phone: c.telefone,
                        email: c.email,
                        address: c.endereco,
                        notes: c.notas
                    })),
                    sales: sales.map(s => ({
                        id: s.id,
                        clientName: s.cliente_nome,
                        total: s.total,
                        paymentMethod: s.forma_pagamento,
                        date: s.data_venda,
                        items: (s.items || []).map(i => ({
                            productId: i.produto_id,
                            productName: i.produto_nome,
                            quantity: i.quantidade,
                            price: i.preco_unitario
                        }))
                    })),
                    expenses: expenses.map(e => ({
                        id: e.id,
                        description: e.descricao,
                        amount: e.valor,
                        dueDate: e.data_vencimento,
                        paid: e.pago,
                        category: e.categoria
                    }))
                });
            }
            
            console.log('✅ Sincronização concluída!');
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
        }
    }

    async syncToCloud() {
        if (!this.shouldUseCloud()) return;
        
        console.log('📤 Enviando dados para o Supabase...');
        
        // Pegar dados do localStorage e enviar para o cloud
        const state = JSON.parse(localStorage.getItem(this.getUserStorageKey()) || '{}');
        
        // Sincronizar produtos locais
        for (const product of (state.products || [])) {
            if (product.id?.startsWith('local_')) {
                await this.saveProduct(product);
            }
        }
        
        // Sincronizar clientes locais
        for (const client of (state.clients || [])) {
            if (client.id?.startsWith('local_')) {
                await this.saveClient(client);
            }
        }
        
        console.log('✅ Dados enviados para o cloud!');
    }

    // Migrar dados do localStorage para Supabase (primeira vez)
    async migrateToCloud() {
        if (!this.shouldUseCloud()) {
            console.warn('Usuário não está logado no Supabase');
            return false;
        }

        console.log('🔄 Migrando dados para o Supabase...');
        
        try {
            await this.syncToCloud();
            this.useSupabase = true;
            console.log('✅ Migração concluída!');
            return true;
        } catch (error) {
            console.error('❌ Erro na migração:', error);
            return false;
        }
    }
}

// Instância global
const dataService = new DataService();
window.dataService = dataService;
