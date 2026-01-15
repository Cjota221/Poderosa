// JAVASCRIPT ARCHITECTURE AVANÇADA
const LucroCertoApp = (function() {
    'use strict';

    //==================================
    // 0. UUID GENERATOR (para compatibilidade com Supabase)
    //==================================
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    //==================================
    // 1. STORAGE WRAPPER SEGURO
    //==================================
    const Storage = {
        set(key, value) {
            try {
                const fullKey = `lucrocerto_${key}`;
                localStorage.setItem(fullKey, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('❌ Erro ao salvar no localStorage:', error);
                return false;
            }
        },
        
        get(key, defaultValue = null) {
            try {
                const fullKey = `lucrocerto_${key}`;
                const item = localStorage.getItem(fullKey);
                
                if (item === null || item === undefined) return defaultValue;
                
                // 🎯 CORREÇÃO: Tenta parsear, se falhar retorna string
                try {
                    return JSON.parse(item);
                } catch (parseError) {
                    // Se for uma string que parece JSON corrompido, tenta limpar
                    if (item.includes('{') || item.includes('[')) {
                        console.warn('⚠️ Item parece JSON corrompido:', key, item.substring(0, 50));
                        return defaultValue;
                    }
                    // Retorna string pura (ex: "user_carol_gmail")
                    return item;
                }
            } catch (error) {
                console.error('❌ Erro ao ler do localStorage:', error);
                return defaultValue;
            }
        },
        
        remove(key) {
            try {
                const fullKey = `lucrocerto_${key}`;
                localStorage.removeItem(fullKey);
                return true;
            } catch (error) {
                console.error('❌ Erro ao remover do localStorage:', error);
                return false;
            }
        },
        
        clear() {
            try {
                // Remove apenas chaves do lucrocerto
                Object.keys(localStorage)
                    .filter(key => key.startsWith('lucrocerto_'))
                    .forEach(key => localStorage.removeItem(key));
                return true;
            } catch (error) {
                console.error('❌ Erro ao limpar localStorage:', error);
                return false;
            }
        }
    };

    //==================================
    // 0.1 DATA RECOVERY - RECUPERAÇÃO DE DADOS CORROMPIDOS
    //==================================
    const DataRecovery = {
        fixCorruptedStorage() {
            // 🧹 LIMPEZA: Remover chaves duplicadas primeiro
            try {
                console.log('🧹 Limpando chaves duplicadas...');
                const keysToRemove = [];
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    // Detectar chaves com prefixo duplicado
                    if (key && key.startsWith('lucrocerto_lucrocerto_')) {
                        keysToRemove.push(key);
                    }
                }
                
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    console.log('🗑️ Removida chave duplicada:', key);
                });
                
                if (keysToRemove.length > 0) {
                    console.log(`✅ ${keysToRemove.length} chaves duplicadas removidas!`);
                }
            } catch (e) {
                console.error('Erro ao limpar duplicatas:', e);
            }
            
            console.log('🔧 Verificando integridade do localStorage...');
            const backup = {};
            let corruptedCount = 0;
            
            // Backup de tudo
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('lucrocerto_')) {
                    backup[key] = localStorage.getItem(key);
                }
            }
            
            // Verifica e corrige cada item
            Object.keys(backup).forEach(key => {
                const value = backup[key];
                
                // Pula valores obviamente corrompidos
                if (value === null || value === 'null' || value === 'undefined') {
                    console.log('🗑️ Removendo valor corrompido:', key);
                    localStorage.removeItem(key);
                    corruptedCount++;
                    return;
                }
                
                // Verifica se é JSON válido quando deveria ser
                if (value.startsWith('{') || value.startsWith('[')) {
                    try {
                        JSON.parse(value);
                        // JSON válido, mantém como está
                    } catch {
                        // JSON inválido - tenta corrigir ou remove
                        console.warn('⚠️ JSON corrompido encontrado:', key);
                        localStorage.removeItem(key);
                        corruptedCount++;
                    }
                }
            });
            
            if (corruptedCount > 0) {
                console.log(`✅ Storage limpo! ${corruptedCount} itens corrompidos removidos.`);
            } else {
                console.log('✅ Storage íntegro!');
            }
        },
        
        verifyUserId() {
            // VERIFICAÇÃO DE INTEGRIDADE DO USER_ID
            const userId = Storage.get('user_id');
            
            if (userId && typeof userId !== 'string') {
                console.warn('⚠️ user_id corrompido. Corrigindo...');
                Storage.remove('user_id');
                
                // Recupera do auth data
                const authData = Storage.get('auth', {});
                if (authData.email) {
                    const fixedId = btoa(authData.email).substring(0, 12);
                    Storage.set('user_id', fixedId);
                    console.log('✅ user_id corrigido:', fixedId);
                    return fixedId;
                }
            }
            
            return userId;
        }
    };

    // 🚀 Executa verificação de integridade ao carregar
    DataRecovery.fixCorruptedStorage();

    //==================================
    // 1. STATE MANAGER
    //==================================
    const StateManager = {
        state: {
            user: {},
            products: [],
            costs: {},
            achievements: [],
            clients: [],
            sales: [],
            bills: [],        // Contas a pagar (recorrentes e únicas)
            debts: [],        // Dívidas (empréstimos, parcelamentos)
            transactions: [], // Fluxo de caixa (entradas e saídas)
            currentPage: 'dashboard',
            editingProductId: null,
            editingClientId: null
        },
        subscribers: [],
        syncQueue: [],
        isSyncing: false,
        isLoadingFromSupabase: false, // 🚨 FLAG para evitar sobrescrever dados durante carregamento

        getState() { return this.state; },
        
        setState(newState) {
            // 🆕 Adicionar timestamp e source para versionamento
            const stateWithMeta = {
                ...this.state,
                ...newState,
                _version: Date.now(),
                _source: this.isLoadingFromSupabase ? 'supabase' : 'local'
            };
            
            this.state = stateWithMeta;
            console.log('State Updated:', this.state);
            this.notifySubscribers();
            DataManager.save('appState', this.state);
            
            // 🔥 CRÍTICO: NÃO sincronizar durante carregamento inicial!
            // E não sincronizar dados que vieram do Supabase
            if (!this.isLoadingFromSupabase && newState._source !== 'supabase') {
                this.syncToSupabase(newState);
            } else {
                console.log('⏸️ Sincronização pausada (carregando do Supabase ou dados já sincronizados)');
            }
        },
        
        subscribe(callback) { this.subscribers.push(callback); },
        notifySubscribers() { this.subscribers.forEach(callback => callback()); },
        
        // 🔥 NOVO: Sincronização com Supabase
        async syncToSupabase(changedData) {
            // Não sincronizar mudanças de navegação
            if (changedData.currentPage || changedData.editingProductId || changedData.editingClientId) {
                return;
            }
            
            // 🚨 CRÍTICO: Não sincronizar se estiver carregando do Supabase
            if (this.isLoadingFromSupabase) {
                console.log('⏸️ Sincronização bloqueada durante carregamento');
                return;
            }
            
            const userId = Storage.get('user_id');
            if (!userId || !window.supabase) {
                console.log('⚠️ Sem userId ou Supabase disponível');
                return;
            }
            
            // Adicionar à fila de sincronização
            this.syncQueue.push({ timestamp: Date.now(), data: changedData });
            
            // Processar fila
            if (!this.isSyncing) {
                this.processSyncQueue(userId);
            }
        },
        
        async processSyncQueue(userId) {
            if (this.syncQueue.length === 0) {
                this.isSyncing = false;
                return;
            }
            
            this.isSyncing = true;
            const item = this.syncQueue.shift();
            const data = item.data;
            
            // 🔑 CRÍTICO: Garantir que usamos o ID correto do banco
            const authData = Storage.get('auth', {});
            let dbUserId = userId;
            
            if (authData.email && window.supabase) {
                try {
                    const userByEmail = await supabase.select('usuarios', { 
                        filters: { email: authData.email.toLowerCase() },
                        limit: 1
                    });
                    if (userByEmail.data?.[0]?.id) {
                        dbUserId = userByEmail.data[0].id;
                        // Atualiza o user_id local se diferente
                        if (dbUserId !== userId) {
                            Storage.set('user_id', dbUserId);
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Não foi possível verificar ID do usuário:', e);
                }
            }
            
            console.log('☁️ Sincronizando com Supabase...', Object.keys(data), 'userId:', dbUserId);
            
            try {
                // Sincronizar produtos
                if (data.products) {
                    await this.syncProducts(dbUserId, data.products);
                }
                
                // Sincronizar clientes
                if (data.clients) {
                    await this.syncClients(dbUserId, data.clients);
                }
                
                // Sincronizar vendas
                if (data.sales) {
                    await this.syncSales(dbUserId, data.sales);
                }
                
                // Sincronizar user (foto, nome, etc)
                if (data.user) {
                    await this.syncUser(dbUserId, data.user);
                }
                
                console.log('✅ Sincronização completa!');
            } catch (error) {
                console.error('❌ Erro na sincronização:', error);
            }
            
            // Processar próximo item da fila
            setTimeout(() => this.processSyncQueue(dbUserId), 500);
        },
        
        async syncProducts(userId, products) {
            if (!products || products.length === 0) return;
            
            try {
                console.log(`☁️ Sincronizando ${products.length} produtos em batch...`);
                
                // Preparar dados para upsert - MAPEAMENTO CORRETO DO SCHEMA
                const productsData = products.map(product => {
                    // Calcular estoque total de todas as variações
                    let estoqueTotal = 0;
                    if (product.stock && typeof product.stock === 'object') {
                        estoqueTotal = Object.values(product.stock).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
                    }
                    
                    return {
                        id: product.id,
                        usuario_id: userId,
                        nome: product.name,
                        descricao: product.description || '',
                        categoria: product.category || 'Geral',
                        preco_custo: product.baseCost,
                        preco_venda: product.finalPrice,
                        margem_lucro: product.profitMargin,
                        estoque_atual: estoqueTotal,
                        estoque_minimo: 5,
                        tipo_variacao: product.variationType || 'none',
                        variacoes: product.variations || [],
                        estoque: product.stock || {},
                        imagem_url: product.imageUrl || product.images?.[0] || '',
                        imagens_adicionais: product.images || [],
                        imagens_variacoes: product.variationImages || {},
                        ativo: true,
                        visivel_catalogo: true
                    };
                });
                
                // ✅ UPSERT EM BATCH - 1 query para todos os produtos
                const { success, data, error } = await supabase.upsert('produtos', productsData);
                
                if (!success || error) {
                    console.error('❌ Erro ao fazer upsert de produtos:', error);
                    // Fallback: tentar um por um
                    console.log('⚠️ Tentando sync individual como fallback...');
                    await this.syncProductsIndividual(userId, products);
                } else {
                    console.log(`✅ ${products.length} produtos sincronizados com sucesso!`);
                }
            } catch (error) {
                console.error('❌ ERRO ao sincronizar produtos em batch:', error);
                // Fallback
                await this.syncProductsIndividual(userId, products);
            }
        },
        
        // Fallback: sync individual (caso upsert falhe)
        async syncProductsIndividual(userId, products) {
            let success = 0;
            let errors = 0;
            
            for (const product of products) {
                try {
                    // Calcular estoque total
                    let estoqueTotal = 0;
                    if (product.stock && typeof product.stock === 'object') {
                        estoqueTotal = Object.values(product.stock).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
                    }
                    
                    const productData = {
                        id: product.id,
                        usuario_id: userId,
                        nome: product.name,
                        descricao: product.description || '',
                        categoria: product.category || 'Geral',
                        preco_custo: product.baseCost,
                        preco_venda: product.finalPrice,
                        margem_lucro: product.profitMargin,
                        estoque_atual: estoqueTotal,
                        estoque_minimo: 5,
                        tipo_variacao: product.variationType || 'none',
                        variacoes: product.variations || [],
                        estoque: product.stock || {},
                        imagem_url: product.imageUrl || product.images?.[0] || '',
                        imagens_adicionais: product.images || [],
                        imagens_variacoes: product.variationImages || {},
                        ativo: true,
                        visivel_catalogo: true
                    };
                    
                    const { success, data, error } = await supabase.upsert('produtos', [productData]);
                    if (!success || error) {
                        errors++;
                        console.error('❌ Erro:', product.name, error.message);
                    } else {
                        success++;
                    }
                } catch (error) {
                    errors++;
                    console.error('❌ Erro:', product.name, error.message);
                }
            }
            
            console.log(`✅ Sync individual: ${success} ok, ${errors} erros`);
        },
        
        async syncClients(userId, clients) {
            for (const client of clients) {
                try {
                    // ⚠️ VALIDAR UUID: Pular clientes com IDs antigos  
                    if (!client.id || !client.id.includes('-') || client.id.startsWith('cli_')) {
                        console.log('⚠️ Pulando cliente com ID inválido:', client.id);
                        continue;
                    }
                    const existing = await supabase.select('clientes', { 
                        filters: { usuario_id: userId, id: client.id },
                        limit: 1
                    });
                    
                    const clientData = {
                        usuario_id: userId,
                        nome: client.name,
                        telefone: client.phone || '',
                        email: client.email || '',
                        endereco: client.address || '',
                        cidade: client.city || '',
                        estado: client.state || '',
                        notas: client.notes || '',
                        tags: client.tags || []
                    };
                    
                    if (existing.data && existing.data.length > 0) {
                        await supabase.update('clientes', existing.data[0].id, clientData);
                        console.log('✅ Cliente atualizado:', client.name);
                    } else {
                        clientData.id = client.id;
                        await supabase.insert('clientes', clientData);
                        console.log('✅ Cliente criado:', client.name);
                    }
                } catch (error) {
                    console.error('❌ Erro ao sincronizar cliente:', client.name, error);
                }
            }
        },
        
        async syncSales(userId, sales) {
            for (const sale of sales) {
                try {
                    // ⚠️ VALIDAR UUID: Pular vendas com IDs antigos
                    if (!sale.id || !sale.id.includes('-') || sale.id.startsWith('sale_')) {
                        console.log('⚠️ Pulando venda com ID inválido:', sale.id);
                        continue;
                    }
                    
                    const existing = await supabase.select('vendas', { 
                        filters: { usuario_id: userId, id: sale.id },
                        limit: 1
                    });
                    
                    const saleData = {
                        usuario_id: userId,
                        cliente_id: sale.clientId || null,
                        data_venda: sale.date,
                        valor_total: sale.total,
                        valor_desconto: sale.discount || 0,
                        valor_final: sale.total,
                        custo_total: 0, // Será calculado baseado nos produtos
                        lucro_total: sale.total, // Será calculado após custo
                        numero_venda: sale.numero || Date.now(),
                        forma_pagamento: sale.paymentMethod || 'dinheiro',
                        status_pagamento: sale.status || 'concluida',
                        observacoes: sale.notes || ''
                    };
                    
                    let saleId;
                    if (existing.data && existing.data.length > 0) {
                        await supabase.update('vendas', existing.data[0].id, saleData);
                        saleId = existing.data[0].id;
                        console.log('✅ Venda atualizada');
                    } else {
                        saleData.id = sale.id;
                        const result = await supabase.insert('vendas', saleData);
                        saleId = sale.id;
                        console.log('✅ Venda criada');
                    }
                    
                    // Salvar itens da venda na tabela itens_venda
                    if (sale.products && sale.products.length > 0) {
                        for (const product of sale.products) {
                            const itemData = {
                                venda_id: saleId,
                                produto_id: product.product_id || null,
                                produto_nome: product.product_name,
                                quantidade: product.quantity,
                                preco_unitario: product.price,
                                subtotal: product.total
                            };
                            
                            // Verificar se item já existe
                            const existingItem = await supabase.select('itens_venda', {
                                filters: { venda_id: saleId, produto_id: product.product_id }
                            });
                            
                            if (existingItem.data && existingItem.data.length > 0) {
                                await supabase.update('itens_venda', existingItem.data[0].id, itemData);
                            } else {
                                await supabase.insert('itens_venda', itemData);
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Erro ao sincronizar venda:', error);
                }
            }
        },
        
        // Nova função para salvar venda individual corretamente
        async saveSaleToSupabase(sale) {
            try {
                const authData = Storage.get('auth', {});
                if (!authData?.email) {
                    console.log('⚠️ Usuário não autenticado, salvando apenas local');
                    return { success: false, local: true };
                }
                
                // Buscar userId pelo email
                const userResult = await supabase.select('usuarios', {
                    filters: { email: authData.email },
                    limit: 1
                });
                
                if (!userResult.data || userResult.data.length === 0) {
                    console.log('⚠️ Usuário não encontrado no banco, salvando apenas local');
                    return { success: false, local: true };
                }
                
                const userId = userResult.data[0].id;
                
                // Salvar dados da venda principal
                const saleData = {
                    id: sale.id,
                    usuario_id: userId,
                    cliente_id: sale.clientId || null,
                    data_venda: sale.date,
                    valor_total: sale.subtotal || sale.total,
                    valor_desconto: sale.discount || 0,
                    valor_final: sale.total,
                    custo_total: 0,
                    lucro_total: sale.total,
                    numero_venda: Date.now(),
                    forma_pagamento: sale.paymentMethod || 'dinheiro',
                    status_pagamento: sale.status || 'concluida',
                    observacoes: sale.notes || ''
                };
                
                const saleResult = await supabase.insert('vendas', saleData);
                
                if (saleResult.success && sale.products) {
                    // Salvar itens da venda
                    for (const product of sale.products) {
                        const itemData = {
                            venda_id: sale.id,
                            produto_id: product.product_id || null,
                            produto_nome: product.product_name || 'Produto',
                            quantidade: product.quantity || 1,
                            preco_unitario: product.price || 0,
                            subtotal: product.total || (product.price * product.quantity)
                        };
                        
                        await supabase.insert('itens_venda', itemData);
                    }
                }
                
                console.log('✅ Venda salva no Supabase:', sale.id);
                return { success: true, data: saleResult.data };
                
            } catch (error) {
                console.error('❌ Erro ao salvar venda no Supabase:', error);
                return { success: false, error: error.message };
            }
        },
        
        async syncUser(userId, user) {
            try {
                // 🔑 Buscar ID correto pelo email se necessário
                const authData = Storage.get('auth', {});
                let dbUserId = userId;
                
                if (authData.email && window.supabase) {
                    const userByEmail = await supabase.select('usuarios', { 
                        filters: { email: authData.email.toLowerCase() },
                        limit: 1
                    });
                    if (userByEmail.data?.[0]?.id) {
                        dbUserId = userByEmail.data[0].id;
                    }
                }
                
                const userData = {
                    nome: user.businessName || user.name || '',
                    telefone: user.phone || '',
                    foto_perfil: user.profilePhoto || '',
                    logo_catalogo: user.catalogLogo || '',
                    plano_atual: user.plan || 'starter'
                };
                
                console.log('💾 Salvando dados do usuário:', dbUserId, userData);
                await supabase.update('usuarios', dbUserId, userData);
                console.log('✅ Dados do usuário atualizados no Supabase');
            } catch (error) {
                console.error('❌ Erro ao sincronizar usuário:', error);
            }
        }
    };

    //==================================
    // 2. DATA MANAGER (usando Storage seguro)
    //==================================
    const DataManager = {
        save(key, data) {
            // Salva no localStorage padrão
            Storage.set(key, { data: data, version: '1.4' });
            
            // TAMBÉM salva com ID da loja (para o catálogo encontrar)
            // ⚠️ NÃO adicionar prefixo lucrocerto_ aqui - Storage.set já adiciona
            const userId = Storage.get('user_id');
            if (userId) {
                const storeKey = `loja_${userId}`;
                Storage.set(storeKey, { data: data, version: '1.4' });
            }
        },
        load(key) {
            const parsed = Storage.get(key, null);
            if (parsed && parsed.version && parsed.version.startsWith('1.')) {
                return parsed.data;
            }
            return null;
        }
    };

    //==================================
    // 3. LOADING STATE HELPER
    //==================================
    const LoadingHelper = {
        setButtonLoading(button, isLoading, successText = '✅ Salvo!') {
            if (!button) return;
            
            if (isLoading) {
                // Salvar estado original
                button.dataset.originalHtml = button.innerHTML;
                button.dataset.originalDisabled = button.disabled;
                
                // Mostrar loading
                button.disabled = true;
                button.innerHTML = '<i data-lucide="loader" class="spinning"></i> Salvando...';
                lucide.createIcons({ nodes: [button] });
            } else {
                // Restaurar estado original
                const originalHtml = button.dataset.originalHtml;
                const originalDisabled = button.dataset.originalDisabled === 'true';
                
                // Mostrar sucesso temporariamente
                button.innerHTML = `<i data-lucide="check"></i> ${successText}`;
                lucide.createIcons({ nodes: [button] });
                
                setTimeout(() => {
                    button.innerHTML = originalHtml;
                    button.disabled = originalDisabled;
                    lucide.createIcons({ nodes: [button] });
                }, 2000);
            }
        },
        
        setButtonError(button, errorText = 'Erro') {
            if (!button) return;
            
            const originalHtml = button.dataset.originalHtml;
            const originalDisabled = button.dataset.originalDisabled === 'true';
            
            // Mostrar erro temporariamente
            button.innerHTML = `<i data-lucide="x"></i> ${errorText}`;
            button.classList.add('btn-error');
            lucide.createIcons({ nodes: [button] });
            
            setTimeout(() => {
                button.innerHTML = originalHtml;
                button.disabled = originalDisabled;
                button.classList.remove('btn-error');
                lucide.createIcons({ nodes: [button] });
            }, 2000);
        }
    };

    //==================================
    // 4. UI RENDERER & ROUTER
    //==================================
    const UIManager = {
        pages: ['dashboard', 'despesas', 'produtos', 'add-edit-product', 'precificar', 'clientes', 'vendas', 'nova-venda', 'financeiro', 'metas', 'relatorios', 'configuracoes', 'meu-catalogo'],
        
        // Menu completo com todas as páginas na ordem do fluxo de trabalho
        menuItems: [
            { section: 'Gestão do Negócio' },
            { id: 'dashboard', icon: 'layout-dashboard', label: 'Início' },
            { id: 'despesas', icon: 'receipt', label: 'Despesas/Custos' },
            { id: 'produtos', icon: 'package-search', label: 'Produtos' },
            { id: 'precificar', icon: 'calculator', label: 'Precificação' },
            { divider: true },
            { section: 'Vendas & Clientes' },
            { id: 'clientes', icon: 'users', label: 'Clientes' },
            { id: 'vendas', icon: 'shopping-cart', label: 'Vendas' },
            { id: 'meu-catalogo', icon: 'store', label: 'Meu Catálogo Digital' },
            { divider: true },
            { section: 'Financeiro' },
            { id: 'financeiro', icon: 'wallet', label: 'Contas a Pagar' },
            { id: 'relatorios', icon: 'bar-chart-3', label: 'Relatórios' },
            { id: 'metas', icon: 'target', label: 'Metas' },
            { divider: true },
            { section: 'Sistema' },
            { id: 'configuracoes', icon: 'settings', label: 'Configurações' },
            { id: 'logout', icon: 'log-out', label: 'Sair da Conta', isLogout: true },
        ],
        
        // Botões do menu inferior (acesso rápido)
        navButtons: [
            { id: 'dashboard', icon: 'layout-dashboard', label: 'Início' },
            { id: 'vendas', icon: 'shopping-cart', label: 'Vendas' },
            { id: 'produtos', icon: 'package-search', label: 'Produtos' },
            { id: 'clientes', icon: 'users', label: 'Clientes' },
            { id: 'financeiro', icon: 'wallet', label: 'Finanças' }
        ],

        init() {
            this.renderNav();
            this.renderSideMenu();
            this.checkPlanStatus(); // Verificar status do plano
            this.showWelcomeMessage(); // Mostrar mensagem de boas-vindas
            StateManager.subscribe(this.updateActiveContent.bind(this));
            StateManager.subscribe(this.updateNav.bind(this));
            StateManager.subscribe(this.updateSideMenu.bind(this));
        },
        
        renderSideMenu() {
            const menuList = document.getElementById('menu-list');
            const menuUserInfo = document.getElementById('menu-user-info');
            const { user } = StateManager.getState();
            
            // User info no header do menu - prioriza catalogLogo
            const photoSrc = user.catalogLogo || user.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiLz48L3N2Zz4=';
            
            menuUserInfo.innerHTML = `
                <img src="${photoSrc}" alt="Foto" class="menu-user-photo">
                <span class="menu-user-name">${user.businessName || user.name || 'Meu Negócio'}</span>
                <span class="menu-user-business">${user.name || 'Empreendedora'}</span>
            `;
            
            // Lista de itens do menu
            menuList.innerHTML = this.menuItems.map(item => {
                if (item.section) {
                    return `<li class="menu-section-title">${item.section}</li>`;
                }
                if (item.divider) {
                    return `<li class="menu-divider"></li>`;
                }
                if (item.isLogout) {
                    return `
                        <li class="menu-item menu-item-logout" data-action="logout">
                            <span class="menu-item-icon"><i data-lucide="${item.icon}"></i></span>
                            <span class="menu-item-label">${item.label}</span>
                        </li>
                    `;
                }
                return `
                    <li class="menu-item" data-action="navigate" data-route="${item.id}">
                        <span class="menu-item-icon"><i data-lucide="${item.icon}"></i></span>
                        <span class="menu-item-label">${item.label}</span>
                    </li>
                `;
            }).join('');
            
            setTimeout(() => {
                lucide.createIcons({ nodes: [...menuList.querySelectorAll('[data-lucide]')] });
                const header = document.getElementById('app-header');
                if (header) {
                    lucide.createIcons({ nodes: [...header.querySelectorAll('[data-lucide]')] });
                }
            }, 0);
        },
        
        // Verificar status do plano e mostrar banner se necessário
        checkPlanStatus() {
            const banner = document.getElementById('plan-alert-banner');
            if (!banner) return;
            
            // Pegar dados do plano do localStorage
            let authData = Storage.get('auth', {});
            
            // ============================================
            // 🧪 MODO DEMONSTRAÇÃO - Desativado
            // ============================================
            const DEMO_MODE = false; // Modo demo desativado
            
            if (DEMO_MODE) {
                const DEMO_DAYS_UNTIL_EXPIRY = 2;
                const fakeCreatedAt = new Date();
                fakeCreatedAt.setDate(fakeCreatedAt.getDate() - (30 - DEMO_DAYS_UNTIL_EXPIRY));
                authData = {
                    plano: 'pro',
                    planoNome: 'Profissional',
                    billing: 'monthly',
                    createdAt: fakeCreatedAt.toISOString()
                };
            }
            // ============================================
            
            // Verificar se é teste grátis
            const isTrial = Storage.get('trial', 'false') === 'true';
            
            // Se for teste grátis ou não tem plano pago, não mostrar banner
            if (!authData.createdAt || isTrial || authData.plano === 'trial') {
                banner.style.display = 'none';
                document.body.classList.remove('has-plan-banner');
                return;
            }
            
            // Calcular dias até o vencimento (apenas para planos pagos)
            const createdAt = new Date(authData.createdAt);
            const expiryDate = new Date(createdAt);
            expiryDate.setDate(expiryDate.getDate() + 30);
            
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            // Verificar se o banner foi fechado hoje
            const bannerClosedDate = Storage.get('banner_closed');
            const todayStr = today.toDateString();
            
            if (bannerClosedDate === todayStr && daysUntilExpiry > 0) {
                banner.style.display = 'none';
                document.body.classList.remove('has-plan-banner');
                return;
            }
            
            // Mostrar banner se vencendo em 3 dias ou menos
            if (daysUntilExpiry <= 0) {
                // Plano vencido
                const daysOverdue = Math.abs(daysUntilExpiry);
                const daysUntilDeactivation = 3 - daysOverdue;
                
                banner.className = 'plan-alert-banner danger';
                banner.innerHTML = `
                    <span>⚠️ <strong>Seu plano venceu!</strong> Sua conta será desativada em ${daysUntilDeactivation > 0 ? daysUntilDeactivation : 0} dia(s). 
                    <a href="./checkout?plan=${authData.plano || 'pro'}&billing=${authData.billing || 'monthly'}&source=app_renewal">Renove agora</a></span>
                `;
                banner.style.display = 'flex';
                document.body.classList.add('has-plan-banner');
                
            } else if (daysUntilExpiry <= 3) {
                // Plano vencendo em breve
                banner.className = 'plan-alert-banner warning';
                banner.innerHTML = `
                    <span>📅 Seu plano vence em <strong>${daysUntilExpiry} dia(s)</strong>. 
                    <a href="./checkout?plan=${authData.plano || 'pro'}&billing=${authData.billing || 'monthly'}&source=app_expiration">Clique aqui para renovar</a></span>
                    <button class="close-banner" onclick="LucroCertoApp.closePlanBanner()">✕</button>
                `;
                banner.style.display = 'flex';
                document.body.classList.add('has-plan-banner');
                
            } else {
                banner.style.display = 'none';
                document.body.classList.remove('has-plan-banner');
            }
        },
        
        // Mostrar mensagem de boas-vindas
        showWelcomeMessage() {
            // Verificar se já mostrou alguma vez (flag permanente)
            const hasSeenWelcome = Storage.get('has_seen_welcome');
            
            // 🔒 BLOQUEIO DEFINITIVO: Se já viu, NUNCA mais mostrar
            if (hasSeenWelcome === true || hasSeenWelcome === 'true') {
                console.log('✅ Bem-vinda já mostrada anteriormente - Pulando');
                return;
            }
            
            // Verificar se tem dados salvos (não é primeira vez)
            const savedState = DataManager.load('appState');
            if (savedState && savedState.products && savedState.products.length > 0) {
                console.log('✅ Usuário já tem dados - Pulando bem-vinda');
                Storage.set('has_seen_welcome', true);
                return;
            }
            
            // Pegar nome do usuário
            const { user } = StateManager.getState();
            const userName = user.name ? user.name.split(' ')[0] : 'Empreendedora';
            
            // 🎯 TRACKING: Usuário completou o cadastro
            if (window.Tracker) {
                window.Tracker.trackSignUp(user.email, 'Email');
            }
            
            // Frases motivacionais aleatórias
            const messages = [
                `Olá, ${userName}! Bem-vinda ao Lucro Certo! ✨`,
                `Que bom te ter aqui, ${userName}! Vamos lucrar juntas? 💰`,
                `Bem-vinda, ${userName}! Seu sucesso começa agora! 🚀`,
                `Oi, ${userName}! Pronta para transformar seu negócio? 💪`,
                `Olá, ${userName}! Seja bem-vinda ao seu app de gestão! 📈`,
                `Bem-vinda, ${userName}! Hora de organizar e lucrar! 💖`,
                `Oi, ${userName}! Vamos juntas nessa jornada! 🎯`
            ];
            
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            // Criar toast de boas-vindas
            const toast = document.createElement('div');
            toast.className = 'welcome-toast';
            toast.innerHTML = `
                <div class="welcome-toast-icon">
                    <i data-lucide="sparkles"></i>
                </div>
                <span>${randomMessage}</span>
            `;
            document.body.appendChild(toast);
            
            // Inicializar ícone
            setTimeout(() => {
                lucide.createIcons({ nodes: [...toast.querySelectorAll('[data-lucide]')] });
                toast.classList.add('show');
            }, 300);
            
            // Remover após 4 segundos
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
            
            // Marcar que já viu a mensagem (NUNCA mais aparece)
            Storage.set('has_seen_welcome', true);
        },
        
        // Fechar banner de aviso do plano
        closePlanBanner() {
            const banner = document.getElementById('plan-alert-banner');
            if (banner) {
                banner.style.display = 'none';
                document.body.classList.remove('has-plan-banner');
                // Salvar que o banner foi fechado hoje
                Storage.set('banner_closed', new Date().toDateString());
            }
        },
        
        updateSideMenu() {
            const { currentPage, user } = StateManager.getState();
            
            // Atualiza info do usuário - prioriza catalogLogo
            const menuUserInfo = document.getElementById('menu-user-info');
            if (menuUserInfo && user) {
                const photoSrc = user.catalogLogo || user.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0Ii8+PHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiLz48L3N2Zz4=';
                menuUserInfo.innerHTML = `
                    <img src="${photoSrc}" alt="Foto" class="menu-user-photo">
                    <span class="menu-user-name">${user.businessName || user.name || 'Meu Negócio'}</span>
                    <span class="menu-user-business">${user.name || 'Empreendedora'}</span>
                `;
            }
            
            // Atualiza item ativo
            document.querySelectorAll('.menu-item').forEach(item => {
                item.classList.toggle('active', item.dataset.route === currentPage);
            });
        },
        
        toggleMenu(show) {
            const sideMenu = document.getElementById('side-menu');
            const overlay = document.getElementById('menu-overlay');
            
            // No desktop (>=1024px), não faz nada
            if (window.innerWidth >= 1024) return;
            
            if (show === undefined) {
                show = !sideMenu.classList.contains('active');
            }
            
            sideMenu.classList.toggle('active', show);
            overlay.classList.toggle('active', show);
            document.body.style.overflow = show ? 'hidden' : '';
        },
        
        renderNav() {
            const navContainer = document.getElementById('bottom-nav');
            navContainer.innerHTML = this.navButtons.map(btn => `
                <button class="nav-button" data-action="navigate" data-route="${btn.id}">
                    <i data-lucide="${btn.icon}"></i>
                    <span>${btn.label}</span>
                </button>
            `).join('');
            setTimeout(() => {
                lucide.createIcons({ nodes: [...navContainer.querySelectorAll('[data-lucide]')] });
            }, 0);
        },

        updateNav() {
            const { currentPage } = StateManager.getState();
            document.querySelectorAll('.nav-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.route === currentPage);
            });
        },
        
        updateActiveContent() {
            const { currentPage } = StateManager.getState();
            this.pages.forEach(pageId => {
                const pageElement = document.getElementById(pageId);
                if (pageElement) {
                    const isActive = pageId === currentPage;
                    pageElement.classList.toggle('active', isActive);
                    if (isActive) {
                        this.renderPage(currentPage);
                        
                        // 🎯 TRACKING: Navegação entre páginas
                        if (window.Tracker) {
                            const pageNames = {
                                'dashboard': 'Dashboard',
                                'produtos': 'Produtos',
                                'add-edit-product': 'Adicionar/Editar Produto',
                                'despesas': 'Despesas',
                                'precificar': 'Precificar',
                                'metas': 'Metas',
                                'relatorios': 'Relatórios',
                                'configuracoes': 'Configurações',
                                'vendas': 'Vendas',
                                'clientes': 'Clientes',
                                'financeiro': 'Financeiro',
                                'plano': 'Meu Plano'
                            };
                            const pageName = pageNames[currentPage] || currentPage;
                            window.Tracker.trackPageView(`App - ${pageName}`);
                        }
                    }
                }
            });
        },

        renderPage(pageId) {
            const container = document.getElementById(pageId);
            if (!container) return;
            
            const pageRenderers = {
                dashboard: () => { container.innerHTML = this.getDashboardHTML(); this.renderDashboardCharts(); },
                produtos: () => { container.innerHTML = this.getProdutosHTML(); this.bindProdutosEvents(); },
                'add-edit-product': () => { container.innerHTML = this.getAddEditProductHTML(); this.bindAddEditProductEvents(); },
                despesas: () => { container.innerHTML = this.getDespesasHTML(); this.bindDespesasEvents(); },
                precificar: () => { container.innerHTML = this.getPrecificarHTML(); this.bindPrecificarEvents(); },
                metas: () => { container.innerHTML = this.getMetasHTML(); },
                relatorios: () => { container.innerHTML = this.getRelatoriosHTML(); this.bindRelatoriosEvents(); },
                configuracoes: () => { container.innerHTML = this.getConfiguracoesHTML(); this.bindConfiguracoesEvents(); },
                clientes: () => { container.innerHTML = this.getClientesHTML(); this.bindClientesEvents(); },
                vendas: () => { container.innerHTML = this.getVendasHTML(); this.bindVendasEvents(); },
                'nova-venda': () => { container.innerHTML = this.getNovaVendaHTML(); this.bindNovaVendaEvents(); },
                financeiro: () => { container.innerHTML = this.getFinanceiroHTML(); this.bindFinanceiroEvents(); },
                'meu-catalogo': () => { container.innerHTML = this.getMeuCatalogoHTML(); this.bindMeuCatalogoEvents(); },
            };

            if (pageRenderers[pageId]) {
                pageRenderers[pageId]();
            }
            
            setTimeout(() => {
                lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] });
            }, 0);
        },
        
        getDashboardHTML() {
            const { user, sales } = StateManager.getState();
            const now = new Date();
            const hour = now.getHours();
            let saudacao;
            if (hour < 12) saudacao = 'Bom dia';
            else if (hour < 18) saudacao = 'Boa tarde';
            else saudacao = 'Boa noite';

            const percentage = Math.round((user.currentRevenue / user.monthlyGoal) * 100);
            
            // Vendas do dia
            const today = new Date().toDateString();
            const todaySales = (sales || []).filter(s => new Date(s.date).toDateString() === today);
            const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
            const todayCount = todaySales.length;

            // Foto do perfil
            const profilePhoto = user.profilePhoto || '';
            const profilePhotoHTML = profilePhoto 
                ? `<img src="${profilePhoto}" alt="${user.name}" class="dashboard-profile-photo">`
                : `<div class="dashboard-profile-placeholder"><i data-lucide="user" style="width: 32px; height: 32px;"></i></div>`;

            // VERIFICAR STATUS DA ASSINATURA
            const authData = Storage.get('auth', {});
            const subscriptionStatus = authData.subscriptionStatus || 'none';
            const subscription = authData.subscription || null;
            const isTrial = Storage.get('trial') === 'true' || Storage.get('trial') === true || authData.plano === 'trial';
            
            let subscriptionAlert = '';
            
            // 🧪 CARD DE TRIAL - Mostrar dias restantes
            if (isTrial && authData.plano === 'trial') {
                const daysLeft = authData.daysLeft || 7;
                
                let trialColor, trialIcon, trialMessage, trialUrgency;
                
                if (daysLeft >= 5) {
                    // 7-5 dias: Verde/Roxo - tudo tranquilo
                    trialColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    trialIcon = 'sparkles';
                    trialMessage = '🎉 Você está testando gratuitamente!';
                    trialUrgency = 'Aproveite para explorar todas as funcionalidades.';
                } else if (daysLeft >= 3) {
                    // 4-3 dias: Azul - aviso leve
                    trialColor = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                    trialIcon = 'clock';
                    trialMessage = '⏰ Seu teste está na metade!';
                    trialUrgency = 'Não esqueça de escolher seu plano.';
                } else if (daysLeft === 2) {
                    // 2 dias: Amarelo - atenção
                    trialColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                    trialIcon = 'alert-circle';
                    trialMessage = '⚠️ Seu teste expira em breve!';
                    trialUrgency = 'Garanta seu acesso escolhendo um plano agora.';
                } else if (daysLeft === 1) {
                    // 1 dia: Laranja - urgente
                    trialColor = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
                    trialIcon = 'alert-triangle';
                    trialMessage = '🔥 ÚLTIMO DIA de teste grátis!';
                    trialUrgency = 'Assine hoje para não perder o acesso!';
                } else {
                    // 0 dias: Vermelho - expirado
                    trialColor = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    trialIcon = 'x-circle';
                    trialMessage = '🚫 Seu teste expirou!';
                    trialUrgency = 'Assine agora para continuar usando.';
                }
                
                subscriptionAlert = `
                    <div class="trial-dashboard-card" style="
                        background: ${trialColor};
                        color: white;
                        padding: 24px;
                        border-radius: 16px;
                        margin-bottom: 24px;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                        position: relative;
                        overflow: hidden;
                    ">
                        <!-- Decoração de fundo -->
                        <div style="
                            position: absolute;
                            top: -50px;
                            right: -50px;
                            width: 200px;
                            height: 200px;
                            background: rgba(255,255,255,0.1);
                            border-radius: 50%;
                        "></div>
                        
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; position: relative;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <i data-lucide="${trialIcon}" style="width: 28px; height: 28px;"></i>
                                    <h3 style="margin: 0; font-size: 20px; font-weight: 700;">${trialMessage}</h3>
                                </div>
                                <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.95;">
                                    ${trialUrgency}
                                </p>
                                <p style="margin: 0; font-size: 12px; opacity: 0.85;">
                                    💾 Seus dados estão salvos e seguros
                                </p>
                            </div>
                            
                            <div style="text-align: center; min-width: 120px;">
                                <div style="
                                    background: rgba(255,255,255,0.25);
                                    backdrop-filter: blur(10px);
                                    border-radius: 16px;
                                    padding: 20px;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                                ">
                                    <div style="font-size: 48px; font-weight: 900; line-height: 1; margin-bottom: 8px;">
                                        ${daysLeft}
                                    </div>
                                    <div style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                        ${daysLeft === 1 ? 'DIA' : 'DIAS'}
                                    </div>
                                    <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">
                                        restante${daysLeft !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                
                                ${daysLeft > 0 ? `
                                    <a href="/planos.html" style="
                                        display: block;
                                        margin-top: 16px;
                                        background: white;
                                        color: #667eea;
                                        padding: 12px 20px;
                                        border-radius: 12px;
                                        text-decoration: none;
                                        font-weight: 700;
                                        font-size: 13px;
                                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                        transition: transform 0.2s;
                                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                        🚀 Assinar Agora
                                    </a>
                                ` : `
                                    <a href="/planos.html" style="
                                        display: block;
                                        margin-top: 16px;
                                        background: white;
                                        color: #ef4444;
                                        padding: 12px 20px;
                                        border-radius: 12px;
                                        text-decoration: none;
                                        font-weight: 700;
                                        font-size: 13px;
                                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                        animation: pulse 2s infinite;
                                    ">
                                        💳 Escolher Plano
                                    </a>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }
            // AVISO: Assinatura expirando em breve (3 dias ou menos)
            else if (subscriptionStatus === 'expiring_soon' && subscription) {
                const diasRestantes = subscription.dias_restantes || 0;
                subscriptionAlert = `
                    <div class="subscription-alert warning" style="background: linear-gradient(135deg, #FFF3CD, #FFE082); border-left: 4px solid #FFC107; padding: 16px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <i data-lucide="alert-triangle" style="width: 24px; height: 24px; color: #F57C00;"></i>
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #E65100;">⏰ Seu plano expira em ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}!</h3>
                                <p style="margin: 0; font-size: 14px; color: #E65100;">Renove agora para não perder o acesso ao sistema.</p>
                            </div>
                            <a href="./precos" class="btn btn-primary" style="text-decoration: none; white-space: nowrap;">
                                <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i> Renovar Agora
                            </a>
                        </div>
                    </div>
                `;
            }
            
            // AVISO URGENTE: Período de carência (já expirou mas ainda tem acesso)
            if (subscriptionStatus === 'grace_period' && subscription) {
                const diasCarenciaRestantes = subscription.dias_carencia_restantes || 0;
                subscriptionAlert = `
                    <div class="subscription-alert danger" style="background: linear-gradient(135deg, #FFEBEE, #FFCDD2); border-left: 4px solid #F44336; padding: 16px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3); animation: pulse 2s infinite;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <i data-lucide="alert-octagon" style="width: 28px; height: 28px; color: #C62828;"></i>
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 4px 0; font-size: 18px; color: #B71C1C; font-weight: 700;">🚨 SEU PLANO EXPIROU!</h3>
                                <p style="margin: 0; font-size: 14px; color: #C62828; font-weight: 600;">
                                    Você tem apenas <strong>${diasCarenciaRestantes} dia${diasCarenciaRestantes > 1 ? 's' : ''}</strong> para renovar antes de perder o acesso!
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 12px; color: #D32F2F;">
                                    Todos os seus dados serão mantidos. Renove agora para continuar usando.
                                </p>
                            </div>
                            <a href="./precos" class="btn" style="background: #F44336; color: white; text-decoration: none; white-space: nowrap; font-weight: 600; box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);">
                                <i data-lucide="zap" style="width: 16px; height: 16px;"></i> RENOVAR URGENTE
                            </a>
                        </div>
                    </div>
                `;
            }

            return `
                ${subscriptionAlert}
                <div class="dashboard-header">
                    <div class="dashboard-greeting">
                        ${profilePhotoHTML}
                        <div>
                            <h1>${saudacao}, ${user.name ? user.name.split(' ')[0] : 'Empreendedora'}!</h1>
                            <p class="sub-header">Pronta para conquistar o mundo hoje?</p>
                        </div>
                    </div>
                    <button class="btn-icon" data-action="navigate" data-route="configuracoes" title="Configurações">
                        <i data-lucide="settings"></i>
                    </button>
                </div>
                
                ${user.routine ? `
                    <div class="routine-card">
                        <div class="routine-header">
                            <i data-lucide="clipboard-list"></i>
                            <span>Minha Rotina de Hoje</span>
                        </div>
                        <p class="routine-text">${user.routine}</p>
                    </div>
                ` : ''}
                
                <div class="emotional-panel"><i data-lucide="sparkles"></i><span id="emotional-insight">${EmotionalIA.generateInsight()}</span></div>
                
                <!-- Resumo do Dia -->
                <div class="day-summary">
                    <div class="day-summary-item">
                        <i data-lucide="shopping-bag" style="color: var(--primary);"></i>
                        <div>
                            <span class="day-summary-value">${todayCount}</span>
                            <span class="day-summary-label">Vendas Hoje</span>
                        </div>
                    </div>
                    <div class="day-summary-item">
                        <i data-lucide="trending-up" style="color: var(--success);"></i>
                        <div>
                            <span class="day-summary-value">R$ ${todayRevenue.toFixed(2)}</span>
                            <span class="day-summary-label">Faturado Hoje</span>
                        </div>
                    </div>
                </div>
                
                <div class="grid-desktop-2">
                    <div class="card">
                       <div class="card-header"><div class="card-icon" style="background: var(--success-gradient);"><i data-lucide="gem"></i></div><h3 class="card-title">Meta Mensal</h3></div>
                       <div class="progress-ring-container">
                           <svg class="progress-ring-svg" width="150" height="150">
                               <circle stroke="#e6e6e6" stroke-width="12" fill="transparent" r="69" cx="75" cy="75"/>
                               <circle class="progress-ring-circle" stroke="url(#goalGradient)" stroke-linecap="round" stroke-width="12" fill="transparent" r="69" cx="75" cy="75"/>
                               <defs><linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${getComputedStyle(document.documentElement).getPropertyValue('--success-light').trim()}" /><stop offset="100%" stop-color="${getComputedStyle(document.documentElement).getPropertyValue('--success').trim()}" /></linearGradient></defs>
                           </svg>
                           <div class="progress-ring-text"><div class="progress-ring-percentage">${isNaN(percentage) ? 0 : percentage}%</div><div class="progress-ring-label">Concluído</div></div>
                       </div>
                       <p class="text-center"><b>R$ ${(user.currentRevenue || 0).toFixed(2)}</b> de R$ ${(user.monthlyGoal || 0).toFixed(2)}</p>
                    </div>
                    <div class="card">
                       <div class="card-header"><div class="card-icon"><i data-lucide="landmark"></i></div><h3 class="card-title">Resumo de Custos</h3></div>
                       <p class="financial-value" style="color: var(--alert);">R$ ${SmartPricing.getTotalMonthlyFixedCosts().toFixed(2)}</p>
                       <p>em Custos Fixos Mensais</p>
                       <hr style="margin: 15px 0; border: 1px solid #eee;">
                       <h4 style="font-weight:600; font-size: 16px; margin-bottom: 8px;">Clima do Negócio</h4>
                       <div class="weather-business" style="color: #f59e0b;"><i data-lucide="sun"></i><span>Ensolarado - Boas vendas!</span></div>
                    </div>
                </div>
                <h3 style="margin-top: 30px;">Ações Rápidas</h3>
                <div class="quick-actions">
                    <a href="#" class="action-button" data-action="navigate" data-route="nova-venda"> <i data-lucide="plus-circle"></i> <span>Nova Venda</span> </a>
                    <a href="#" class="action-button" data-action="add-new-product"> <i data-lucide="package-plus"></i> <span>Novo Produto</span> </a>
                    <a href="#" class="action-button" data-action="navigate" data-route="clientes"> <i data-lucide="user-plus"></i> <span>Clientes</span> </a>
                    <a href="#" class="action-button" data-action="navigate" data-route="precificar"> <i data-lucide="calculator"></i> <span>Precificar</span> </a>
                </div>
            `;
        },
        
        renderDashboardCharts() {
            const ring = document.querySelector('.progress-ring-circle');
            if (!ring) return;
            
            const { user } = StateManager.getState();
            const radius = ring.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;
            const percentage = user.currentRevenue / user.monthlyGoal;
            const offset = circumference - (isNaN(percentage) ? 0 : percentage) * circumference;

            ring.style.strokeDasharray = `${circumference} ${circumference}`;
            setTimeout(() => { ring.style.strokeDashoffset = isNaN(offset) ? circumference : offset; }, 100);
        },
        
        getProdutosHTML() {
            const { products } = StateManager.getState();
            
            const productCards = products.map(p => {
                const totalStock = ProductManager.getTotalStock(p);
                const stockStatus = totalStock === 0 ? 'out' : totalStock <= 5 ? 'low' : 'ok';
                const stockStatusColor = stockStatus === 'out' ? 'var(--alert)' : stockStatus === 'low' ? 'var(--warning)' : 'var(--growth)';
                const stockStatusText = stockStatus === 'out' ? '❌ Sem estoque' : stockStatus === 'low' ? '⚠️ Estoque baixo' : '✅ Em estoque';
                const profit = p.finalPrice - (SmartPricing.getTotalUnitCost(p.baseCost).total);
                
                // Variações display
                let variationsText = '';
                if (p.variationType === 'simple' && p.variations[0]) {
                    const opts = p.variations[0].options.map(o => ProductManager.getOptionLabel(o));
                    variationsText = `${p.variations[0].name}: ${opts.join(', ')}`;
                } else if (p.variationType === 'combined' && p.variations.length >= 2) {
                    variationsText = `${p.variations[0].name} × ${p.variations[1].name}`;
                }

                return `
                <div class="product-card-new" data-product-id="${p.id}">
                    <div class="product-card-main">
                        <img 
                            src="${p.imageUrl || `https://placehold.co/80x80/f06292/ffffff?text=${p.name.charAt(0).toUpperCase()}`}" 
                            class="product-img" 
                            alt="${p.name}"
                        >
                        <div class="product-info">
                            <h3 class="product-name">${p.name}</h3>
                            ${variationsText ? `<span class="product-variations">${variationsText}</span>` : ''}
                            <div class="product-metrics">
                                <div class="metric">
                                    <span class="metric-label">Preço</span>
                                    <span class="metric-value price">R$ ${p.finalPrice.toFixed(2)}</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Lucro</span>
                                    <span class="metric-value profit">R$ ${profit.toFixed(2)}</span>
                                </div>
                                <div class="metric">
                                    <span class="metric-label">Estoque</span>
                                    <span class="metric-value stock" style="color: ${stockStatusColor};">${totalStock}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="product-status-bar" style="background: ${stockStatusColor}15;">
                        <span style="color: ${stockStatusColor}; font-size: 13px;">${stockStatusText}</span>
                        <span style="color: var(--elegant-gray); font-size: 12px;">Margem: ${p.profitMargin || 100}%</span>
                    </div>
                    
                    <div class="product-actions">
                        <button class="action-btn-small" data-action="quick-edit-stock" data-id="${p.id}" title="Editar estoque">
                            <i data-lucide="package"></i>
                            <span>Estoque</span>
                        </button>
                        <button class="action-btn-small" data-action="quick-edit-price" data-id="${p.id}" title="Editar preço">
                            <i data-lucide="tag"></i>
                            <span>Preço</span>
                        </button>
                        <button class="action-btn-small primary" data-action="edit-product" data-id="${p.id}" title="Editar tudo">
                            <i data-lucide="pencil"></i>
                            <span>Editar</span>
                        </button>
                        <button class="action-btn-small danger" data-action="delete-product" data-id="${p.id}" title="Excluir">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('');
            
            // Resumo de estoque
            const totalProducts = products.length;
            const totalStock = products.reduce((acc, p) => acc + ProductManager.getTotalStock(p), 0);
            const totalValue = products.reduce((acc, p) => acc + (ProductManager.getTotalStock(p) * p.finalPrice), 0);
            const lowStockCount = products.filter(p => {
                const stock = ProductManager.getTotalStock(p);
                return stock > 0 && stock <= 5;
            }).length;
            const outOfStockCount = products.filter(p => ProductManager.getTotalStock(p) === 0).length;

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="margin: 0;">📦 Meus Produtos</h2>
                        <p class="sub-header" style="margin: 4px 0 0 0;">Gerencie seu catálogo e estoque</p>
                    </div>
                    <button class="btn btn-primary" data-action="add-new-product">
                        <i data-lucide="plus" style="width: 18px; height: 18px;"></i> Novo Produto
                    </button>
                </div>
                
                ${products.length > 0 ? `
                    <!-- RESUMO -->
                    <div class="products-summary">
                        <div class="summary-item">
                            <i data-lucide="package" style="color: var(--primary);"></i>
                            <div>
                                <span class="summary-value">${totalProducts}</span>
                                <span class="summary-label">Produtos</span>
                            </div>
                        </div>
                        <div class="summary-item">
                            <i data-lucide="layers" style="color: var(--info);"></i>
                            <div>
                                <span class="summary-value">${totalStock}</span>
                                <span class="summary-label">Em estoque</span>
                            </div>
                        </div>
                        <div class="summary-item">
                            <i data-lucide="dollar-sign" style="color: var(--success);"></i>
                            <div>
                                <span class="summary-value">R$ ${totalValue.toFixed(0)}</span>
                                <span class="summary-label">Valor total</span>
                            </div>
                        </div>
                        ${lowStockCount > 0 ? `
                            <div class="summary-item warning">
                                <i data-lucide="alert-triangle" style="color: var(--warning);"></i>
                                <div>
                                    <span class="summary-value">${lowStockCount}</span>
                                    <span class="summary-label">Estoque baixo</span>
                                </div>
                            </div>
                        ` : ''}
                        ${outOfStockCount > 0 ? `
                            <div class="summary-item danger">
                                <i data-lucide="alert-circle" style="color: var(--alert);"></i>
                                <div>
                                    <span class="summary-value">${outOfStockCount}</span>
                                    <span class="summary-label">Sem estoque</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- LISTA DE PRODUTOS -->
                    <div class="product-list-new">
                        ${productCards}
                    </div>
                ` : `
                    <!-- EMPTY STATE -->
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="package-open" style="width: 64px; height: 64px; color: var(--elegant-gray);"></i>
                        </div>
                        <h3>Nenhum produto cadastrado</h3>
                        <p>Comece adicionando seu primeiro produto e tenha controle total do seu negócio!</p>
                        <button class="btn btn-primary btn-lg" data-action="add-new-product">
                            <i data-lucide="plus"></i> Cadastrar Primeiro Produto
                        </button>
                    </div>
                `}
                
                <!-- MODAL DE EDIÇÃO RÁPIDA DE ESTOQUE -->
                <div id="quick-stock-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i data-lucide="package"></i> Atualizar Estoque</h3>
                            <button class="modal-close" data-action="close-quick-modal">&times;</button>
                        </div>
                        <div class="modal-body" id="quick-stock-body">
                            <!-- Preenchido dinamicamente -->
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-action="close-quick-modal">Cancelar</button>
                            <button class="btn btn-primary" data-action="save-quick-stock">
                                <i data-lucide="check"></i> Salvar
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- MODAL DE EDIÇÃO RÁPIDA DE PREÇO -->
                <div id="quick-price-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i data-lucide="tag"></i> Atualizar Preço</h3>
                            <button class="modal-close" data-action="close-quick-modal">&times;</button>
                        </div>
                        <div class="modal-body" id="quick-price-body">
                            <!-- Preenchido dinamicamente -->
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-action="close-quick-modal">Cancelar</button>
                            <button class="btn btn-primary" data-action="save-quick-price">
                                <i data-lucide="check"></i> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },
        
        bindProdutosEvents() {
            let currentEditingProductId = null;
            
            // Quick Edit Stock
            document.querySelectorAll('[data-action="quick-edit-stock"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const productId = btn.dataset.id;
                    currentEditingProductId = productId;
                    const { products } = StateManager.getState();
                    const product = products.find(p => p.id === productId);
                    if (!product) return;
                    
                    const modal = document.getElementById('quick-stock-modal');
                    const body = document.getElementById('quick-stock-body');
                    
                    let stockHTML = '';
                    if (product.variationType === 'none') {
                        stockHTML = `
                            <div class="form-group">
                                <label>Estoque de "${product.name}"</label>
                                <input type="number" class="form-input" id="quick-stock-input" value="${product.stock.total || 0}" min="0">
                            </div>
                        `;
                    } else if (product.variationType === 'simple') {
                        stockHTML = `
                            <p style="margin-bottom: 16px; color: var(--dark-gray);">Estoque de <strong>${product.name}</strong> por ${product.variations[0]?.name || 'opção'}:</p>
                            ${product.variations[0]?.options.map(opt => {
                                const key = ProductManager.getOptionKey(opt);
                                const label = ProductManager.getOptionLabel(opt);
                                return `
                                    <div class="quick-stock-row">
                                        <label>${label}</label>
                                        <input type="number" class="form-input" data-option="${key}" value="${product.stock[key] || 0}" min="0">
                                    </div>
                                `;
                            }).join('')}
                        `;
                    } else if (product.variationType === 'combined') {
                        stockHTML = `
                            <p style="margin-bottom: 16px; color: var(--dark-gray);">Estoque de <strong>${product.name}</strong>:</p>
                            <div class="quick-stock-grid">
                            ${product.variations[0]?.options.map(opt1 => {
                                const key1 = ProductManager.getOptionKey(opt1);
                                const label1 = ProductManager.getOptionLabel(opt1);
                                return `
                                    <div class="quick-stock-section">
                                        <h5>${label1}</h5>
                                        ${product.variations[1]?.options.map(opt2 => {
                                            const key2 = ProductManager.getOptionKey(opt2);
                                            const label2 = ProductManager.getOptionLabel(opt2);
                                            const combinedKey = `${key1}-${key2}`;
                                            return `
                                                <div class="quick-stock-row">
                                                    <label>${label2}</label>
                                                    <input type="number" class="form-input" data-combined="${combinedKey}" value="${product.stock[combinedKey] || 0}" min="0">
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                `;
                            }).join('')}
                            </div>
                        `;
                    }
                    
                    body.innerHTML = stockHTML;
                    modal.style.display = 'flex';
                    lucide.createIcons({ nodes: [modal] });
                });
            });
            
            // Quick Edit Price
            document.querySelectorAll('[data-action="quick-edit-price"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const productId = btn.dataset.id;
                    currentEditingProductId = productId;
                    const { products } = StateManager.getState();
                    const product = products.find(p => p.id === productId);
                    if (!product) return;
                    
                    const modal = document.getElementById('quick-price-modal');
                    const body = document.getElementById('quick-price-body');
                    
                    const currentProfit = product.finalPrice - SmartPricing.getTotalUnitCost(product.baseCost).total;
                    
                    body.innerHTML = `
                        <p style="margin-bottom: 16px; color: var(--dark-gray);">Ajustar preço de <strong>${product.name}</strong></p>
                        
                        <div class="form-group">
                            <label>Custo do Produto</label>
                            <input type="number" class="form-input" id="quick-cost-input" value="${product.baseCost}" step="0.01" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label>Margem de Lucro: <span id="quick-margin-display">${product.profitMargin || 100}%</span></label>
                            <input type="range" id="quick-margin-input" class="slider" min="0" max="300" value="${product.profitMargin || 100}">
                        </div>
                        
                        <div class="quick-price-preview">
                            <div class="preview-row">
                                <span>Preço de Venda:</span>
                                <strong id="quick-price-result">R$ ${product.finalPrice.toFixed(2)}</strong>
                            </div>
                            <div class="preview-row">
                                <span>Lucro por Unidade:</span>
                                <strong id="quick-profit-result" style="color: var(--success);">R$ ${currentProfit.toFixed(2)}</strong>
                            </div>
                        </div>
                    `;
                    
                    // Bind price calc events
                    const costInput = document.getElementById('quick-cost-input');
                    const marginInput = document.getElementById('quick-margin-input');
                    const marginDisplay = document.getElementById('quick-margin-display');
                    const priceResult = document.getElementById('quick-price-result');
                    const profitResult = document.getElementById('quick-profit-result');
                    
                    const updateQuickPrice = () => {
                        const cost = parseFloat(costInput.value) || 0;
                        const margin = parseInt(marginInput.value) || 100;
                        marginDisplay.textContent = margin + '%';
                        
                        const { price, profit } = SmartPricing.calculate(cost, margin);
                        priceResult.textContent = `R$ ${price.toFixed(2)}`;
                        profitResult.textContent = `R$ ${profit.toFixed(2)}`;
                    };
                    
                    costInput.addEventListener('input', updateQuickPrice);
                    marginInput.addEventListener('input', updateQuickPrice);
                    
                    modal.style.display = 'flex';
                    lucide.createIcons({ nodes: [modal] });
                });
            });
            
            // Save Quick Stock
            document.querySelector('[data-action="save-quick-stock"]')?.addEventListener('click', () => {
                if (!currentEditingProductId) return;
                
                const { products } = StateManager.getState();
                const product = products.find(p => p.id === currentEditingProductId);
                if (!product) return;
                
                const updatedProduct = { ...product };
                
                if (product.variationType === 'none') {
                    const input = document.getElementById('quick-stock-input');
                    updatedProduct.stock = { total: parseInt(input.value) || 0 };
                } else if (product.variationType === 'simple') {
                    document.querySelectorAll('[data-option]').forEach(input => {
                        updatedProduct.stock[input.dataset.option] = parseInt(input.value) || 0;
                    });
                } else if (product.variationType === 'combined') {
                    document.querySelectorAll('[data-combined]').forEach(input => {
                        updatedProduct.stock[input.dataset.combined] = parseInt(input.value) || 0;
                    });
                }
                
                const updatedProducts = products.map(p => p.id === currentEditingProductId ? updatedProduct : p);
                StateManager.setState({ products: updatedProducts });
                
                document.getElementById('quick-stock-modal').style.display = 'none';
                currentEditingProductId = null;
            });
            
            // Save Quick Price
            document.querySelector('[data-action="save-quick-price"]')?.addEventListener('click', () => {
                if (!currentEditingProductId) return;
                
                const { products } = StateManager.getState();
                const product = products.find(p => p.id === currentEditingProductId);
                if (!product) return;
                
                const costInput = document.getElementById('quick-cost-input');
                const marginInput = document.getElementById('quick-margin-input');
                
                const newCost = parseFloat(costInput.value) || 0;
                const newMargin = parseInt(marginInput.value) || 100;
                const { price } = SmartPricing.calculate(newCost, newMargin);
                
                const updatedProduct = {
                    ...product,
                    baseCost: newCost,
                    profitMargin: newMargin,
                    finalPrice: price
                };
                
                const updatedProducts = products.map(p => p.id === currentEditingProductId ? updatedProduct : p);
                StateManager.setState({ products: updatedProducts });
                
                document.getElementById('quick-price-modal').style.display = 'none';
                currentEditingProductId = null;
            });
            
            // Close Modal
            document.querySelectorAll('[data-action="close-quick-modal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('quick-stock-modal').style.display = 'none';
                    document.getElementById('quick-price-modal').style.display = 'none';
                    currentEditingProductId = null;
                });
            });
            
            // Delete Product
            document.querySelectorAll('[data-action="delete-product"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const productId = btn.dataset.id;
                    const { products } = StateManager.getState();
                    const product = products.find(p => p.id === productId);
                    
                    if (confirm(`❌ Tem certeza que deseja excluir "${product?.name}"?\n\nEsta ação não pode ser desfeita.`)) {
                        const updatedProducts = products.filter(p => p.id !== productId);
                        StateManager.setState({ products: updatedProducts });
                    }
                });
            });
            
            // Click outside modal to close
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                        currentEditingProductId = null;
                    }
                });
            });
        },
        
        getAddEditProductHTML() {
            const { editingProductId, products } = StateManager.getState();
            const product = editingProductId ? products.find(p => p.id === editingProductId) : ProductManager.getNewProductTemplate();
            const pageTitle = editingProductId ? '✏️ Editar Produto' : '✨ Novo Produto';
            
            // Garantir que images seja sempre um array
            const productImages = product.images || (product.imageUrl ? [product.imageUrl] : []);
            const hasDescription = product.description && product.description.trim() !== '';

            return `
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <button class="btn-icon" data-action="cancel-product-edit" style="margin-right: 12px;">
                        <i data-lucide="arrow-left"></i>
                    </button>
                    <h2 style="margin: 0;">${pageTitle}</h2>
                </div>

                <form id="product-form">
                    <!-- NOME DO PRODUTO -->
                    <div class="card">
                        <div class="form-group">
                            <label for="product-name">Nome do Produto <span class="required">*</span></label>
                            <input type="text" id="product-name" class="form-input" placeholder="Ex: Colar de Pérolas" required value="${product.name}">
                            <small>Digite o nome que aparecerá para suas clientes</small>
                        </div>
                    </div>
                    
                    <!-- FOTOS DO PRODUTO -->
                    <div class="card">
                        <h3><i data-lucide="camera" style="width: 20px; height: 20px; vertical-align: middle;"></i> Fotos do Produto</h3>
                        <p style="font-size: 13px; color: var(--elegant-gray); margin-bottom: 16px;">
                            Adicione fotos para mostrar seu produto de diferentes ângulos
                        </p>
                        
                        <div class="product-gallery" id="product-gallery">
                            ${productImages.map((img, idx) => `
                                <div class="gallery-item" data-index="${idx}">
                                    <img src="${img}" alt="Foto ${idx + 1}">
                                    <button type="button" class="gallery-remove-btn" data-remove-image="${idx}">
                                        <i data-lucide="x"></i>
                                    </button>
                                    ${idx === 0 ? '<span class="gallery-main-badge">Principal</span>' : ''}
                                </div>
                            `).join('')}
                            
                            <label class="gallery-add-btn">
                                <input type="file" id="product-image-input" accept="image/*" multiple style="display: none;">
                                <i data-lucide="plus"></i>
                                <span>Adicionar</span>
                            </label>
                        </div>
                        <small style="display: block; margin-top: 12px; color: var(--elegant-gray);">
                            💡 A primeira foto será a principal. Arraste para reordenar.
                        </small>
                    </div>
                    
                    <!-- DESCRIÇÃO OPCIONAL -->
                    <div class="card">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <h3 style="margin: 0;"><i data-lucide="file-text" style="width: 20px; height: 20px; vertical-align: middle;"></i> Descrição</h3>
                            <label class="toggle-switch">
                                <input type="checkbox" id="has-description" ${hasDescription ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <p style="font-size: 13px; color: var(--elegant-gray); margin-bottom: 12px;">
                            Quer adicionar uma descrição para este produto?
                        </p>
                        <div id="description-area" style="display: ${hasDescription ? 'block' : 'none'};">
                            <textarea id="product-description" class="form-input" rows="3" placeholder="Descreva seu produto... Ex: Colar artesanal feito com pérolas naturais, acabamento em ouro 18k...">${product.description || ''}</textarea>
                        </div>
                    </div>

                    <!-- PRECIFICAÇÃO INTELIGENTE -->
                    <div class="card">
                        <h3><i data-lucide="calculator" style="width: 20px; height: 20px; vertical-align: middle;"></i> Precificação Inteligente</h3>
                        <div class="form-group">
                            <label for="product-base-cost">💰 Quanto você pagou no produto? <span class="required">*</span></label>
                            <input type="number" step="0.01" min="0" id="product-base-cost" class="form-input" placeholder="Ex: 25.50" value="${product.baseCost || ''}" required>
                            <small>O custo que você teve para produzir ou comprar</small>
                        </div>
                        
                        <div class="form-group">
                            <label>💵 Por quanto você quer vender?</label>
                            <div id="price-suggestion" style="background: linear-gradient(135deg, #E8F5E9, #C8E6C9); padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 4px solid #4CAF50;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <span style="font-size: 28px;">✨</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 13px; color: #2E7D32; font-weight: 600; margin-bottom: 4px;">SUGESTÃO INTELIGENTE</div>
                                        <div style="font-size: 24px; font-weight: 700; color: #1B5E20;" id="suggested-price">R$ --</div>
                                    </div>
                                </div>
                                <div style="font-size: 12px; color: #2E7D32;" id="suggestion-reason">
                                    Digite o custo acima para ver a sugestão
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <span style="font-size: 13px; color: var(--dark-gray); font-weight: 600;">Ajustar preço (opcional):</span>
                                    <span id="current-price-display" style="font-size: 18px; font-weight: 700; color: var(--primary);">R$ --</span>
                                </div>
                                <input type="range" id="profit-margin" min="20" max="150" value="67" step="5" class="slider" style="width: 100%;">
                                <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                    <div style="text-align: center;">
                                        <div style="font-size: 24px;">💀</div>
                                        <div style="font-size: 10px; color: #999;">Prejuízo</div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 24px;">😐</div>
                                        <div style="font-size: 10px; color: #999;">Baixo</div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 24px;">😊</div>
                                        <div style="font-size: 10px; color: #999;">Ideal</div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 24px;">😍</div>
                                        <div style="font-size: 10px; color: #999;">Alto</div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 24px;">🤑</div>
                                        <div style="font-size: 10px; color: #999;">Absurdo</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="price-feedback" style="padding: 12px; border-radius: 8px; margin-top: 12px; display: none;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span id="feedback-emoji" style="font-size: 32px;"></span>
                                    <div style="flex: 1;">
                                        <div id="feedback-title" style="font-weight: 600; margin-bottom: 4px;"></div>
                                        <div id="feedback-message" style="font-size: 13px;"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="pricing-calculator-live"></div>
                    </div>

                    <!-- VARIAÇÕES E ESTOQUE -->
                    <div class="card">
                        <h3><i data-lucide="package" style="width: 20px; height: 20px; vertical-align: middle;"></i> Variações e Estoque</h3>
                        <div class="form-group">
                            <label>Seu produto tem variações? (Ex: tamanhos, cores)</label>
                            <div class="radio-group-cards">
                                <label class="radio-card">
                                    <input type="radio" name="variation-type" value="none" ${product.variationType === 'none' || !product.variationType ? 'checked' : ''}>
                                    <div class="radio-card-content">
                                        <i data-lucide="circle" style="width: 24px; height: 24px;"></i>
                                        <strong>Sem Variação</strong>
                                        <small>Produto único</small>
                                    </div>
                                </label>
                                <label class="radio-card">
                                    <input type="radio" name="variation-type" value="simple" ${product.variationType === 'simple' ? 'checked' : ''}>
                                    <div class="radio-card-content">
                                        <i data-lucide="tag" style="width: 24px; height: 24px;"></i>
                                        <strong>Variação Simples</strong>
                                        <small>Ex: P, M, G</small>
                                    </div>
                                </label>
                                <label class="radio-card">
                                    <input type="radio" name="variation-type" value="combined" ${product.variationType === 'combined' ? 'checked' : ''}>
                                    <div class="radio-card-content">
                                        <i data-lucide="git-branch" style="width: 24px; height: 24px;"></i>
                                        <strong>Variação Combinada</strong>
                                        <small>Ex: Cor + Tamanho</small>
                                    </div>
                                </label>
                            </div>
                        </div>
                        <div id="stock-management-area"></div>
                    </div>

                    <!-- BOTÕES -->
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                       <button type="button" class="btn btn-secondary" data-action="cancel-product-edit">
                           <i data-lucide="x" style="width: 18px; height: 18px;"></i> Cancelar
                       </button>
                       <button type="submit" class="btn btn-primary" style="flex: 1;">
                           <i data-lucide="check" style="width: 18px; height: 18px;"></i> Salvar Produto
                       </button>
                    </div>
                </form>
            `;
        },

        bindAddEditProductEvents() {
            const form = document.getElementById('product-form');
            if (!form) return;
            
            const { editingProductId, products } = StateManager.getState();
            const currentProduct = editingProductId ? products.find(p => p.id === editingProductId) : null;
            const baseCostInput = document.getElementById('product-base-cost');
            const profitMarginInput = document.getElementById('profit-margin');
            const variationRadios = form.querySelectorAll('input[name="variation-type"]');
            
            let variationOptions1 = [];
            let variationOptions2 = [];
            
            // Array de imagens do produto
            let productImages = currentProduct?.images || (currentProduct?.imageUrl ? [currentProduct.imageUrl] : []);
            
            // Objeto para armazenar as fotos vinculadas às variações (persiste durante a edição)
            let variationImagesMap = currentProduct?.variationImages ? { ...currentProduct.variationImages } : {};

            // ===== GALERIA DE FOTOS =====
            const imageInput = document.getElementById('product-image-input');
            const galleryContainer = document.getElementById('product-gallery');
            
            // Função para renderizar a galeria
            const renderGallery = () => {
                const galleryItems = productImages.map((img, idx) => `
                    <div class="gallery-item" data-index="${idx}">
                        <img src="${img}" alt="Foto ${idx + 1}">
                        <button type="button" class="gallery-remove-btn" data-remove-image="${idx}">
                            <i data-lucide="x"></i>
                        </button>
                        ${idx === 0 ? '<span class="gallery-main-badge">Principal</span>' : ''}
                    </div>
                `).join('');
                
                galleryContainer.innerHTML = galleryItems + `
                    <label class="gallery-add-btn">
                        <input type="file" id="product-image-input-new" accept="image/*" multiple style="display: none;">
                        <i data-lucide="plus"></i>
                        <span>Adicionar</span>
                    </label>
                `;
                
                // Re-bind eventos
                setTimeout(() => {
                    lucide.createIcons({ nodes: [...galleryContainer.querySelectorAll('[data-lucide]')] });
                }, 0);
                
                // Evento de remover imagem
                galleryContainer.querySelectorAll('.gallery-remove-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const idx = parseInt(btn.dataset.removeImage);
                        productImages.splice(idx, 1);
                        renderGallery();
                    });
                });
                
                // Evento de adicionar nova imagem
                const newInput = document.getElementById('product-image-input-new');
                if (newInput) {
                    newInput.addEventListener('change', handleImageUpload);
                }
            };
            
            // Função para processar upload de imagens
            const handleImageUpload = (e) => {
                const files = Array.from(e.target.files);
                
                files.forEach(file => {
                    if (file.size > 2 * 1024 * 1024) {
                        alert('❌ Imagem muito grande! Máximo 2MB por foto.');
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        productImages.push(event.target.result);
                        renderGallery();
                    };
                    reader.readAsDataURL(file);
                });
            };
            
            // Bind inicial do input
            if (imageInput) {
                imageInput.addEventListener('change', handleImageUpload);
            }
            
            // Renderizar galeria inicial
            renderGallery();
            
            // ===== TOGGLE DE DESCRIÇÃO =====
            const hasDescriptionToggle = document.getElementById('has-description');
            const descriptionArea = document.getElementById('description-area');
            
            if (hasDescriptionToggle) {
                hasDescriptionToggle.addEventListener('change', () => {
                    descriptionArea.style.display = hasDescriptionToggle.checked ? 'block' : 'none';
                    if (hasDescriptionToggle.checked) {
                        document.getElementById('product-description')?.focus();
                    }
                });
            }

            // ===== PRECIFICAÇÃO COM SLIDER =====
            const updatePricingUI = () => {
                const productCost = parseFloat(baseCostInput.value) || 0;
                const margin = parseInt(profitMarginInput.value) || 67;
                const container = document.getElementById('pricing-calculator-live');
                const suggestedPriceEl = document.getElementById('suggested-price');
                const suggestionReasonEl = document.getElementById('suggestion-reason');
                const currentPriceDisplay = document.getElementById('current-price-display');
                const feedbackBox = document.getElementById('price-feedback');
                const feedbackEmoji = document.getElementById('feedback-emoji');
                const feedbackTitle = document.getElementById('feedback-title');
                const feedbackMessage = document.getElementById('feedback-message');

                if (!container) return;

                if (productCost === 0) {
                    // Resetar sugestão
                    if (suggestedPriceEl) suggestedPriceEl.textContent = 'R$ --';
                    if (suggestionReasonEl) suggestionReasonEl.textContent = 'Digite o custo acima para ver a sugestão';
                    if (currentPriceDisplay) currentPriceDisplay.textContent = 'R$ --';
                    if (feedbackBox) feedbackBox.style.display = 'none';
                    
                    container.innerHTML = `
                        <div style="background: var(--light-gray); padding: 16px; border-radius: 12px; text-align: center; margin-top: 16px;">
                            <i data-lucide="info" style="width: 24px; height: 24px; color: var(--elegant-gray);"></i>
                            <p style="color: var(--elegant-gray); margin-top: 8px;">Digite o custo do produto acima para ver o cálculo completo</p>
                        </div>
                    `;
                    setTimeout(() => lucide.createIcons({ nodes: [container] }), 0);
                    return;
                }

                const unitCosts = SmartPricing.getTotalUnitCost(productCost);
                
                // SUGESTÃO AUTOMÁTICA: 67% de margem (1.67x o custo total)
                const suggestedMargin = 67;
                const suggestedCalc = SmartPricing.calculate(productCost, suggestedMargin);
                
                // PREÇO ATUAL (do slider)
                const currentCalc = SmartPricing.calculate(productCost, margin);
                const profitPercentageOfPrice = ((currentCalc.profit / currentCalc.price) * 100).toFixed(1);

                // Atualizar sugestão
                if (suggestedPriceEl) {
                    suggestedPriceEl.textContent = `R$ ${suggestedCalc.price.toFixed(2)}`;
                }
                if (suggestionReasonEl) {
                    suggestionReasonEl.innerHTML = `
                        Baseado no seu custo de <strong>R$ ${unitCosts.total.toFixed(2)}</strong> (produto + despesas), 
                        este preço te dá um lucro de <strong>R$ ${suggestedCalc.profit.toFixed(2)}</strong> por venda.
                    `;
                }

                // Atualizar preço atual do slider
                if (currentPriceDisplay) {
                    currentPriceDisplay.textContent = `R$ ${currentCalc.price.toFixed(2)}`;
                }

                // FEEDBACK VISUAL COM EMOJIS
                let emoji, title, message, bgColor, textColor;
                
                if (currentCalc.profit < 0) {
                    emoji = '💀';
                    title = 'PREJUÍZO!';
                    message = `Você vai <strong>perder R$ ${Math.abs(currentCalc.profit).toFixed(2)}</strong> a cada venda. Aumente o preço!`;
                    bgColor = '#FFEBEE';
                    textColor = '#C62828';
                } else if (margin < 30) {
                    emoji = '😐';
                    title = 'Lucro Muito Baixo';
                    message = `Você só vai ganhar R$ ${currentCalc.profit.toFixed(2)} por venda. Vale a pena?`;
                    bgColor = '#FFF3E0';
                    textColor = '#E65100';
                } else if (margin >= 30 && margin < 50) {
                    emoji = '😊';
                    title = 'Lucro Razoável';
                    message = `Lucro de R$ ${currentCalc.profit.toFixed(2)} por venda. Pode melhorar!`;
                    bgColor = '#FFF9C4';
                    textColor = '#F57F17';
                } else if (margin >= 50 && margin <= 80) {
                    emoji = '😍';
                    title = 'Preço Ideal!';
                    message = `Excelente! Lucro de R$ ${currentCalc.profit.toFixed(2)} por venda. Equilibra ganho e competitividade.`;
                    bgColor = '#E8F5E9';
                    textColor = '#2E7D32';
                } else if (margin > 80 && margin <= 120) {
                    emoji = '🤑';
                    title = 'Lucro Alto';
                    message = `Lucro de R$ ${currentCalc.profit.toFixed(2)}! Mas cuidado: pode ser difícil vender com preço alto.`;
                    bgColor = '#E1F5FE';
                    textColor = '#01579B';
                } else {
                    emoji = '🤯';
                    title = 'Preço Muito Alto!';
                    message = `R$ ${currentCalc.price.toFixed(2)} pode afugentar clientes. Considere baixar um pouco.`;
                    bgColor = '#F3E5F5';
                    textColor = '#6A1B9A';
                }

                if (feedbackBox) {
                    feedbackBox.style.display = 'block';
                    feedbackBox.style.background = bgColor;
                    feedbackBox.style.color = textColor;
                    feedbackEmoji.textContent = emoji;
                    feedbackTitle.textContent = title;
                    feedbackTitle.style.color = textColor;
                    feedbackMessage.innerHTML = message;
                    feedbackMessage.style.color = textColor;
                }

                // Detalhamento completo abaixo
                container.innerHTML = `
                    <div class="pricing-result-card">
                        <div class="pricing-header">
                            <i data-lucide="calculator" style="width: 20px; height: 20px;"></i>
                            <h4>Detalhamento Completo</h4>
                        </div>
                        
                        <div class="pricing-breakdown">
                            <div class="pricing-row">
                                <span class="pricing-label">
                                    <i data-lucide="shopping-bag" style="width: 16px; height: 16px;"></i>
                                    Custo do Produto
                                </span>
                                <span class="pricing-value">R$ ${productCost.toFixed(2)}</span>
                            </div>
                            <div class="pricing-row">
                                <span class="pricing-label">
                                    <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
                                    Despesas Fixas (por unidade)
                                </span>
                                <span class="pricing-value">R$ ${unitCosts.fixed.toFixed(2)}</span>
                            </div>
                            <div class="pricing-row">
                                <span class="pricing-label">
                                    <i data-lucide="package" style="width: 16px; height: 16px;"></i>
                                    Despesas Variáveis
                                </span>
                                <span class="pricing-value">R$ ${unitCosts.variable.toFixed(2)}</span>
                            </div>
                            <div class="pricing-row total">
                                <span class="pricing-label">
                                    <strong>Custo Total por Unidade</strong>
                                </span>
                                <span class="pricing-value"><strong style="color: var(--alert);">R$ ${unitCosts.total.toFixed(2)}</strong></span>
                            </div>
                        </div>

                        <div class="pricing-result">
                            <div class="result-item" style="background: linear-gradient(135deg, var(--primary-light), var(--primary));">
                                <i data-lucide="tag" style="width: 24px; height: 24px; color: white;"></i>
                                <div>
                                    <small style="color: rgba(255,255,255,0.9); font-size: 12px;">Preço de Venda</small>
                                    <strong style="color: white; font-size: 24px;">R$ ${currentCalc.price.toFixed(2)}</strong>
                                </div>
                            </div>
                            <div class="result-item" style="background: linear-gradient(135deg, ${currentCalc.profit < 0 ? '#EF5350' : 'var(--success-light)'}, ${currentCalc.profit < 0 ? '#C62828' : 'var(--success)'});">
                                <i data-lucide="dollar-sign" style="width: 24px; height: 24px; color: white;"></i>
                                <div>
                                    <small style="color: rgba(255,255,255,0.9); font-size: 12px;">Seu Lucro</small>
                                    <strong style="color: white; font-size: 24px;">R$ ${currentCalc.profit.toFixed(2)}</strong>
                                    <small style="color: rgba(255,255,255,0.9); font-size: 11px;">${currentCalc.profit >= 0 ? profitPercentageOfPrice + '% do preço' : 'PREJUÍZO'}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                setTimeout(() => lucide.createIcons({ nodes: [container] }), 0);
            };

            // ===== GERENCIAMENTO DE VARIAÇÕES =====
            const updateVariationUI = () => {
                const selectedType = form.querySelector('input[name="variation-type"]:checked').value;
                const container = document.getElementById('stock-management-area');
                variationOptions1 = [];
                variationOptions2 = [];

                if (selectedType === 'none') {
                    const currentStock = currentProduct && currentProduct.variationType === 'none' ? (currentProduct.stock.total || 0) : 0;
                    container.innerHTML = `
                        <div class="form-group" style="margin-top: 20px;">
                            <label for="stock-total">
                                <i data-lucide="package" style="width: 16px; height: 16px; vertical-align: middle;"></i>
                                Quantidade em Estoque
                            </label>
                            <input type="number" class="form-input" id="stock-total" placeholder="Ex: 50" value="${currentStock}" min="0">
                            <small>Quantas unidades você tem disponíveis?</small>
                        </div>
                    `;
                } else if (selectedType === 'simple') {
                    const currentVariation = currentProduct && currentProduct.variationType === 'simple' ? currentProduct.variations[0] : null;
                    const variationName = currentVariation ? currentVariation.name : '';
                    
                    container.innerHTML = `
                        <div style="background: var(--light-gray); padding: 20px; border-radius: 12px; margin-top: 20px;">
                            <h4 style="margin: 0 0 16px 0; font-size: 16px; color: var(--dark-gray);">
                                <i data-lucide="tag" style="width: 18px; height: 18px; vertical-align: middle;"></i>
                                Configure sua Variação Simples
                            </h4>
                            
                            <div class="form-group">
                                <label for="variation-name-1">O que varia no seu produto?</label>
                                <input type="text" class="form-input" id="variation-name-1" placeholder="Ex: Tamanho, Cor, Modelo..." value="${variationName}">
                                <small>Exemplo: Tamanho, Cor, Sabor, Modelo</small>
                            </div>
                            
                            <div class="form-group">
                                <label for="variation-options-input-1">
                                    Quais são as opções?
                                </label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" class="form-input" id="variation-options-input-1" placeholder="Ex: P, M, G ou Vermelho" style="flex: 1;">
                                    <input type="color" class="form-input" id="variation-color-input-1" value="#E91E63" title="Cor (opcional)" style="width: 60px; padding: 4px;">
                                    <button type="button" class="btn btn-primary" id="add-variation-btn-1" style="white-space: nowrap;">
                                        <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Adicionar
                                    </button>
                                </div>
                                <small>💡 Digite uma opção e escolha uma cor (opcional), ou separe por vírgula (P, M, G)</small>
                                <div class="variation-options-container" id="variation-options-tags-1"></div>
                            </div>
                            
                            <div id="simple-stock-table"></div>
                        </div>
                    `;

                    if (currentVariation && currentVariation.options) {
                        variationOptions1 = [...currentVariation.options];
                        renderVariationTags();
                        renderStockTable();
                    }

                    const optionsInput = document.getElementById('variation-options-input-1');
                    const colorInput = document.getElementById('variation-color-input-1');
                    const addBtn = document.getElementById('add-variation-btn-1');
                    
                    // Função para adicionar variação
                    const addVariation = () => {
                        const value = optionsInput.value.trim();
                        if (!value) return;
                        
                        const color = colorInput ? colorInput.value : null;
                        
                        // Aceita valores separados por vírgula
                        if (value.includes(',')) {
                            const options = value.split(',').map(opt => opt.trim()).filter(opt => opt);
                            options.forEach(opt => {
                                if (!variationOptions1.find(v => typeof v === 'string' ? v === opt : v.value === opt)) {
                                    variationOptions1.push({ value: opt, color: null });
                                }
                            });
                        } else {
                            if (!variationOptions1.find(v => typeof v === 'string' ? v === value : v.value === value)) {
                                variationOptions1.push({ value: value, color: color });
                            }
                        }
                        
                        renderVariationTags();
                        renderStockTable();
                        optionsInput.value = '';
                        if (colorInput) colorInput.value = '#E91E63';
                        optionsInput.focus();
                    };
                    
                    // Evento de clique no botão
                    if (addBtn) {
                        addBtn.addEventListener('click', addVariation);
                        setTimeout(() => lucide.createIcons({ nodes: [addBtn] }), 0);
                    }
                    
                    // Evento de Enter no input (mantém para quem preferir)
                    if (optionsInput) {
                        optionsInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addVariation();
                            }
                        });
                    }
                } else if (selectedType === 'combined') {
                    const currentVar1 = currentProduct && currentProduct.variationType === 'combined' && currentProduct.variations[0] ? currentProduct.variations[0] : null;
                    const currentVar2 = currentProduct && currentProduct.variationType === 'combined' && currentProduct.variations[1] ? currentProduct.variations[1] : null;
                    
                    container.innerHTML = `
                        <div style="background: var(--light-gray); padding: 20px; border-radius: 12px; margin-top: 20px;">
                            <h4 style="margin: 0 0 16px 0; font-size: 16px; color: var(--dark-gray);">
                                <i data-lucide="git-branch" style="width: 18px; height: 18px; vertical-align: middle;"></i>
                                Configure suas Variações Combinadas
                            </h4>
                            <p style="font-size: 13px; color: var(--elegant-gray); margin-bottom: 20px;">
                                Exemplo: T-shirt que tem <strong>Cores</strong> (Preto, Branco, Nude) E <strong>Tamanhos</strong> (P, M, G)
                            </p>
                            
                            <!-- VARIAÇÃO 1 -->
                            <div class="form-group">
                                <label for="variation-name-1"><strong>1ª Variação</strong> - O que varia?</label>
                                <input type="text" class="form-input" id="variation-name-1" placeholder="Ex: Cor" value="${currentVar1 ? currentVar1.name : ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="variation-options-input-1">
                                    Opções da 1ª Variação
                                </label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" class="form-input" id="variation-options-input-1" placeholder="Ex: Preto, Branco, Nude" style="flex: 1;">
                                    <button type="button" class="btn btn-primary" id="add-variation-btn-1" style="white-space: nowrap;">
                                        <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Adicionar
                                    </button>
                                </div>
                                <small>💡 Digite uma opção e clique em Adicionar</small>
                                <div class="variation-options-container" id="variation-options-tags-1"></div>
                            </div>
                            
                            <!-- VARIAÇÃO 2 -->
                            <div class="form-group" style="margin-top: 24px; padding-top: 24px; border-top: 2px dashed #ddd;">
                                <label for="variation-name-2"><strong>2ª Variação</strong> - O que mais varia?</label>
                                <input type="text" class="form-input" id="variation-name-2" placeholder="Ex: Tamanho" value="${currentVar2 ? currentVar2.name : ''}">
                            </div>
                            
                            <div class="form-group">
                                <label for="variation-options-input-2">
                                    Opções da 2ª Variação
                                </label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" class="form-input" id="variation-options-input-2" placeholder="Ex: P, M, G" style="flex: 1;">
                                    <button type="button" class="btn btn-primary" id="add-variation-btn-2" style="white-space: nowrap;">
                                        <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Adicionar
                                    </button>
                                </div>
                                <small>💡 Digite uma opção e clique em Adicionar</small>
                                <div class="variation-options-container" id="variation-options-tags-2"></div>
                            </div>
                            
                            <div id="combined-stock-table"></div>
                        </div>
                    `;

                    // Carrega opções existentes
                    if (currentVar1 && currentVar1.options) {
                        variationOptions1 = [...currentVar1.options];
                        renderVariationTags(1);
                    }
                    if (currentVar2 && currentVar2.options) {
                        variationOptions2 = [...currentVar2.options];
                        renderVariationTags(2);
                    }
                    if (variationOptions1.length > 0 && variationOptions2.length > 0) {
                        renderCombinedStockTable();
                    }

                    // Event listeners para variação 1
                    const optionsInput1 = document.getElementById('variation-options-input-1');
                    const addBtn1 = document.getElementById('add-variation-btn-1');
                    
                    // Função para adicionar variação 1
                    const addVariation1 = () => {
                        const value = optionsInput1.value.trim();
                        if (!value) return;
                        
                        if (value.includes(',')) {
                            const options = value.split(',').map(opt => opt.trim()).filter(opt => opt);
                            options.forEach(opt => {
                                if (!variationOptions1.includes(opt)) {
                                    variationOptions1.push(opt);
                                }
                            });
                        } else if (!variationOptions1.includes(value)) {
                            variationOptions1.push(value);
                        }
                        
                        renderVariationTags(1);
                        if (variationOptions1.length > 0 && variationOptions2.length > 0) {
                            renderCombinedStockTable();
                        }
                        optionsInput1.value = '';
                        optionsInput1.focus();
                    };
                    
                    if (addBtn1) {
                        addBtn1.addEventListener('click', addVariation1);
                        setTimeout(() => lucide.createIcons({ nodes: [addBtn1] }), 0);
                    }
                    
                    if (optionsInput1) {
                        optionsInput1.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addVariation1();
                            }
                        });
                    }

                    // Event listeners para variação 2
                    const optionsInput2 = document.getElementById('variation-options-input-2');
                    const addBtn2 = document.getElementById('add-variation-btn-2');
                    
                    // Função para adicionar variação 2
                    const addVariation2 = () => {
                        const value = optionsInput2.value.trim();
                        if (!value) return;
                        
                        if (value.includes(',')) {
                            const options = value.split(',').map(opt => opt.trim()).filter(opt => opt);
                            options.forEach(opt => {
                                if (!variationOptions2.includes(opt)) {
                                    variationOptions2.push(opt);
                                }
                            });
                        } else if (!variationOptions2.includes(value)) {
                            variationOptions2.push(value);
                        }
                        
                        renderVariationTags(2);
                        if (variationOptions1.length > 0 && variationOptions2.length > 0) {
                            renderCombinedStockTable();
                        }
                        optionsInput2.value = '';
                        optionsInput2.focus();
                    };
                    
                    if (addBtn2) {
                        addBtn2.addEventListener('click', addVariation2);
                        setTimeout(() => lucide.createIcons({ nodes: [addBtn2] }), 0);
                    }
                    
                    if (optionsInput2) {
                        optionsInput2.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addVariation2();
                            }
                        });
                    }
                }
            };

            // Renderiza tags de variações
            const renderVariationTags = (variationNumber = 1) => {
                const tagsContainer = document.getElementById(`variation-options-tags-${variationNumber}`);
                if (!tagsContainer) return;

                const options = variationNumber === 1 ? variationOptions1 : variationOptions2;

                tagsContainer.innerHTML = options.map((option, index) => {
                    const optValue = typeof option === 'string' ? option : option.value;
                    const optColor = typeof option === 'object' && option.color ? option.color : null;
                    
                    return `
                    <div class="variation-tag" style="${optColor ? `border-left: 4px solid ${optColor};` : ''}">
                        ${optColor ? `<span class="color-preview" style="background: ${optColor}; width: 20px; height: 20px; border-radius: 50%; display: inline-block; margin-right: 8px; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.1);"></span>` : ''}
                        ${optValue}
                        ${optColor ? `<small style="color: #999; font-size: 11px; margin-left: 6px;">${optColor}</small>` : ''}
                        <button type="button" data-remove-option="${variationNumber}-${index}">
                            <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                `}).join('');

                tagsContainer.querySelectorAll('[data-remove-option]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const [varNum, idx] = btn.dataset.removeOption.split('-');
                        const varNumber = parseInt(varNum);
                        const index = parseInt(idx);
                        
                        if (varNumber === 1) {
                            variationOptions1.splice(index, 1);
                            renderVariationTags(1);
                            if (variationOptions2.length > 0) renderCombinedStockTable();
                        } else {
                            variationOptions2.splice(index, 1);
                            renderVariationTags(2);
                            if (variationOptions1.length > 0) renderCombinedStockTable();
                        }
                        renderStockTable();
                    });
                });

                setTimeout(() => lucide.createIcons({ nodes: [tagsContainer] }), 0);
            };

            // Renderiza tabela de estoque simples
            const renderStockTable = () => {
                const tableContainer = document.getElementById('simple-stock-table');
                if (!tableContainer || variationOptions1.length === 0) {
                    if (tableContainer) tableContainer.innerHTML = '';
                    return;
                }

                const currentStock = currentProduct && currentProduct.variationType === 'simple' ? currentProduct.stock : {};
                
                // Verifica se a variação é de cor (para mostrar opção de foto)
                const variationNameInput = document.getElementById('variation-name-1');
                const variationName = variationNameInput ? variationNameInput.value.toLowerCase() : '';
                const isColorVariation = ['cor', 'cores', 'color', 'colours', 'modelo', 'estampa'].some(term => variationName.includes(term));

                tableContainer.innerHTML = `
                    <div style="margin-top: 20px;">
                        <h4 style="font-size: 14px; margin-bottom: 12px; color: var(--dark-gray);">
                            <i data-lucide="package" style="width: 16px; height: 16px; vertical-align: middle;"></i>
                            Estoque de Cada Opção
                        </h4>
                        ${isColorVariation && productImages.length > 0 ? `
                            <p style="font-size: 12px; color: var(--elegant-gray); margin-bottom: 12px; background: #E8F5E9; padding: 10px; border-radius: 8px;">
                                <i data-lucide="image" style="width: 14px; height: 14px; vertical-align: middle;"></i>
                                <strong>Dica:</strong> Clique nas fotos para vincular a cada ${variationName || 'opção'}. No catálogo, a foto muda quando o cliente escolher!
                            </p>
                        ` : ''}
                        <div class="stock-options-list">
                            ${variationOptions1.map(option => {
                                const optValue = typeof option === 'string' ? option : option.value;
                                const optColor = typeof option === 'object' && option.color ? option.color : null;
                                const selectedPhotoIdx = variationImagesMap[optValue];
                                const hasPhoto = selectedPhotoIdx !== undefined && productImages[selectedPhotoIdx];
                                
                                return `
                                <div class="stock-option-row" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--white); border-radius: 8px; margin-bottom: 8px; border: 1px solid ${optColor ? optColor : 'var(--light-gray)'};">
                                    <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                                        ${optColor ? `
                                            <div style="width: 32px; height: 32px; background: ${optColor}; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.1);"></div>
                                        ` : isColorVariation && hasPhoto ? `
                                            <img src="${productImages[selectedPhotoIdx]}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 2px solid var(--primary);">
                                        ` : isColorVariation ? `
                                            <div style="width: 40px; height: 40px; background: var(--light-gray); border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--medium-gray);">
                                                <i data-lucide="image" style="width: 18px; height: 18px; color: var(--elegant-gray);"></i>
                                            </div>
                                        ` : ''}
                                        <strong style="font-size: 14px; color: var(--dark-gray);">${optValue}</strong>
                                        ${optColor ? `<small style="color: #999; font-size: 11px;">${optColor}</small>` : ''}
                                    </div>
                                    
                                    ${isColorVariation && productImages.length > 0 ? `
                                        <div class="photo-selector" style="display: flex; gap: 6px; align-items: center;">
                                            <span style="font-size: 11px; color: var(--elegant-gray); margin-right: 4px;">Foto:</span>
                                            ${productImages.map((img, idx) => `
                                                <button type="button" 
                                                    class="photo-select-btn ${selectedPhotoIdx === idx ? 'selected' : ''}" 
                                                    data-variation-option="${optValue}" 
                                                    data-photo-idx="${idx}"
                                                    style="width: 36px; height: 36px; padding: 0; border: 2px solid ${selectedPhotoIdx === idx ? 'var(--primary)' : 'var(--light-gray)'}; border-radius: 6px; cursor: pointer; overflow: hidden; background: none; transition: all 0.2s;">
                                                    <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
                                                </button>
                                            `).join('')}
                                            ${hasPhoto ? `
                                                <button type="button" class="photo-clear-btn" data-variation-option="${optValue}" 
                                                    style="width: 28px; height: 28px; padding: 0; border: none; background: #fee2e2; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Remover foto">
                                                    <i data-lucide="x" style="width: 14px; height: 14px; color: #ef4444;"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    ` : ''}
                                    
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span style="font-size: 11px; color: var(--elegant-gray);">Qtd:</span>
                                        <input type="number" class="form-input" data-stock-option="${optValue}" value="${currentStock[optValue] || 0}" min="0" placeholder="0" style="width: 70px; text-align: center; padding: 8px;">
                                    </div>
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                `;
                
                // Bind eventos de seleção de foto (clique nas miniaturas)
                tableContainer.querySelectorAll('.photo-select-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const option = btn.dataset.variationOption;
                        const photoIdx = parseInt(btn.dataset.photoIdx);
                        
                        // Atualiza o estado
                        variationImagesMap[option] = photoIdx;
                        
                        // Re-renderiza
                        renderStockTable();
                    });
                });
                
                // Bind eventos para limpar foto
                tableContainer.querySelectorAll('.photo-clear-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const option = btn.dataset.variationOption;
                        delete variationImagesMap[option];
                        renderStockTable();
                    });
                });
                
                setTimeout(() => lucide.createIcons({ nodes: [tableContainer] }), 0);
            };

            // Renderiza tabela de estoque combinado
            const renderCombinedStockTable = () => {
                const tableContainer = document.getElementById('combined-stock-table');
                if (!tableContainer || variationOptions1.length === 0 || variationOptions2.length === 0) {
                    if (tableContainer) tableContainer.innerHTML = '';
                    return;
                }

                const currentStock = currentProduct && currentProduct.variationType === 'combined' ? currentProduct.stock : {};
                
                // Verifica se a primeira variação é de cor
                const variationName1Input = document.getElementById('variation-name-1');
                const variationName1 = variationName1Input ? variationName1Input.value.toLowerCase() : '';
                const isColorVariation = ['cor', 'cores', 'color', 'colours', 'modelo', 'estampa'].some(term => variationName1.includes(term));

                tableContainer.innerHTML = `
                    <div style="margin-top: 20px;">
                        <h4 style="font-size: 14px; margin-bottom: 12px; color: var(--dark-gray);">
                            <i data-lucide="grid" style="width: 16px; height: 16px; vertical-align: middle;"></i>
                            Estoque de Cada Combinação
                        </h4>
                        ${isColorVariation && productImages.length > 0 ? `
                            <p style="font-size: 12px; color: var(--elegant-gray); margin-bottom: 12px; background: #E8F5E9; padding: 10px; border-radius: 8px;">
                                <i data-lucide="image" style="width: 14px; height: 14px; vertical-align: middle;"></i>
                                <strong>Dica:</strong> Clique nas fotos para vincular a cada ${variationName1 || 'cor'}. No catálogo, a foto muda automaticamente!
                            </p>
                        ` : ''}
                        <div class="combined-stock-grid">
                            ${variationOptions1.map(opt1 => {
                                const selectedPhotoIdx = variationImagesMap[opt1];
                                const hasPhoto = selectedPhotoIdx !== undefined && productImages[selectedPhotoIdx];
                                
                                return `
                                <div class="combined-stock-section" style="background: var(--white); padding: 16px; border-radius: 12px; border: 1px solid var(--light-gray);">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--light-gray);">
                                        ${isColorVariation && hasPhoto ? `
                                            <img src="${productImages[selectedPhotoIdx]}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 8px; border: 2px solid var(--primary);">
                                        ` : isColorVariation ? `
                                            <div style="width: 44px; height: 44px; background: var(--light-gray); border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--medium-gray);">
                                                <i data-lucide="image" style="width: 20px; height: 20px; color: var(--elegant-gray);"></i>
                                            </div>
                                        ` : ''}
                                        <h5 class="combined-stock-title" style="margin: 0; flex: 1; font-size: 15px;">${opt1}</h5>
                                    </div>
                                    
                                    ${isColorVariation && productImages.length > 0 ? `
                                        <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
                                            <span style="font-size: 11px; color: var(--elegant-gray); width: 100%; margin-bottom: 4px;">Vincular foto:</span>
                                            ${productImages.map((img, idx) => `
                                                <button type="button" 
                                                    class="photo-select-btn-combined ${selectedPhotoIdx === idx ? 'selected' : ''}" 
                                                    data-variation-option="${opt1}" 
                                                    data-photo-idx="${idx}"
                                                    style="width: 36px; height: 36px; padding: 0; border: 2px solid ${selectedPhotoIdx === idx ? 'var(--primary)' : 'var(--light-gray)'}; border-radius: 6px; cursor: pointer; overflow: hidden; background: none; transition: all 0.2s;">
                                                    <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
                                                </button>
                                            `).join('')}
                                            ${hasPhoto ? `
                                                <button type="button" class="photo-clear-btn-combined" data-variation-option="${opt1}" 
                                                    style="width: 28px; height: 28px; padding: 0; border: none; background: #fee2e2; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Remover foto">
                                                    <i data-lucide="x" style="width: 14px; height: 14px; color: #ef4444;"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    ` : ''}
                                    
                                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px;">
                                        ${variationOptions2.map(opt2 => {
                                            const key = `${opt1}-${opt2}`;
                                            return `
                                                <div class="combined-stock-item" style="text-align: center;">
                                                    <label style="font-size: 12px; color: var(--elegant-gray); display: block; margin-bottom: 4px;">${opt2}</label>
                                                    <input type="number" class="form-input" data-combined-stock="${key}" value="${currentStock[key] || 0}" min="0" placeholder="0" style="text-align: center; padding: 8px;">
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                `;
                
                // Bind eventos de seleção de foto (clique nas miniaturas)
                tableContainer.querySelectorAll('.photo-select-btn-combined').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const option = btn.dataset.variationOption;
                        const photoIdx = parseInt(btn.dataset.photoIdx);
                        variationImagesMap[option] = photoIdx;
                        renderCombinedStockTable();
                    });
                });
                
                // Bind eventos para limpar foto
                tableContainer.querySelectorAll('.photo-clear-btn-combined').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const option = btn.dataset.variationOption;
                        delete variationImagesMap[option];
                        renderCombinedStockTable();
                    });
                });
                
                setTimeout(() => lucide.createIcons({ nodes: [tableContainer] }), 0);
            };

            // ===== SUBMIT DO FORMULÁRIO =====
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('🔄 Iniciando salvamento do produto...');
                
                // Pegar botão de submit
                const submitBtn = form.querySelector('button[type="submit"]');
                
                // Mostrar loading
                LoadingHelper.setButtonLoading(submitBtn, true);

                const productName = document.getElementById('product-name').value.trim();
                const productCost = parseFloat(baseCostInput.value) || 0;
                const profitMargin = parseInt(profitMarginInput.value) || 100;
                const variationType = form.querySelector('input[name="variation-type"]:checked').value;

                console.log('📦 Dados básicos:', { productName, productCost, profitMargin, variationType });

                // Validações
                if (!productName) {
                    LoadingHelper.setButtonError(submitBtn, 'Nome obrigatório');
                    alert('❌ Por favor, digite o nome do produto.');
                    return;
                }

                if (productCost <= 0) {
                    LoadingHelper.setButtonError(submitBtn, 'Custo obrigatório');
                    alert('❌ Por favor, digite o custo do produto.');
                    return;
                }

                // Monta objeto do produto
                const finalPrice = SmartPricing.calculate(productCost, profitMargin).price;
                
                // Pegar descrição se habilitada
                const hasDescription = document.getElementById('has-description')?.checked;
                const description = hasDescription ? (document.getElementById('product-description')?.value.trim() || '') : '';
                
                const productData = {
                    id: editingProductId || generateUUID(),
                    name: productName,
                    baseCost: productCost,
                    profitMargin: profitMargin,
                    finalPrice: finalPrice,
                    variationType: variationType,
                    variations: [],
                    stock: {},
                    images: productImages, // Array de imagens
                    imageUrl: productImages[0] || '', // Primeira imagem como principal (compatibilidade)
                    description: description
                };

                // Processa estoque baseado no tipo de variação
                console.log('📊 Processando estoque para tipo:', variationType);
                
                if (variationType === 'none') {
                    const stockTotal = parseInt(document.getElementById('stock-total')?.value) || 0;
                    productData.stock = { total: stockTotal };
                    console.log('✅ Estoque sem variação:', stockTotal);
                } else if (variationType === 'simple') {
                    const variationName = document.getElementById('variation-name-1')?.value.trim();
                    console.log('🔤 Nome da variação simples:', variationName);
                    
                    if (!variationName) {
                        LoadingHelper.setButtonError(submitBtn, 'Variação obrigatória');
                        alert('❌ Por favor, digite o nome da variação (ex: Tamanho, Cor).');
                        return;
                    }

                    if (variationOptions1.length === 0) {
                        LoadingHelper.setButtonError(submitBtn, 'Opções obrigatórias');
                        alert('❌ Por favor, adicione pelo menos uma opção de variação.');
                        return;
                    }

                    productData.variations = [{ name: variationName, options: variationOptions1 }];
                    
                    // Coleta estoque para cada opção
                    variationOptions1.forEach(option => {
                        // Extrair valor correto da opção (pode ser string ou objeto {value, color})
                        const optValue = typeof option === 'string' ? option : (option.value || option.label || String(option));
                        const stockInput = document.querySelector(`[data-stock-option="${optValue}"]`);
                        const stockQty = parseInt(stockInput?.value) || 0;
                        productData.stock[optValue] = stockQty;
                        console.log(`📦 Estoque variação simples [${optValue}]:`, stockQty);
                    });
                    
                    // Usa o mapa de fotos vinculadas que foi construído durante a edição
                    productData.variationImages = { ...variationImagesMap };
                } else if (variationType === 'combined') {
                    // Obter nomes das variações combinadas
                    const variationName1 = document.getElementById('variation-name-1')?.value.trim();
                    const variationName2 = document.getElementById('variation-name-2')?.value.trim();
                    
                    if (!variationName1 || !variationName2) {
                        LoadingHelper.setButtonError(submitBtn, 'Nomes obrigatórios');
                        alert('❌ Por favor, preencha os nomes das duas variações.');
                        return;
                    }

                    if (variationOptions1.length === 0 || variationOptions2.length === 0) {
                        LoadingHelper.setButtonError(submitBtn, 'Opções obrigatórias');
                        alert('❌ Por favor, adicione opções para ambas as variações.');
                        return;
                    }

                    productData.variations = [
                        { name: variationName1, options: variationOptions1 },
                        { name: variationName2, options: variationOptions2 }
                    ];
                    
                    // Coleta estoque de cada combinação
                    variationOptions1.forEach(opt1 => {
                        variationOptions2.forEach(opt2 => {
                            const key = `${opt1}-${opt2}`;
                            const stockInput = document.querySelector(`[data-combined-stock="${key}"]`);
                            productData.stock[key] = parseInt(stockInput?.value) || 0;
                        });
                    });
                    
                    // Usa o mapa de fotos vinculadas que foi construído durante a edição
                    productData.variationImages = { ...variationImagesMap };
                }

                // Salva ou atualiza produto
                console.log('💾 Preparando para salvar produto...');
                const state = StateManager.getState();
                const isTrial = Storage.get('trial') === 'true';
                const TRIAL_PRODUCT_LIMIT = 3;
                let updatedProducts;

                if (editingProductId) {
                    // Atualiza produto existente
                    console.log('✏️ Atualizando produto existente:', editingProductId);
                    updatedProducts = state.products.map(p => p.id === editingProductId ? productData : p);
                } else {
                    // Novo produto - verifica limite trial
                    console.log('🆕 Criando novo produto');
                    if (isTrial && state.products.length >= TRIAL_PRODUCT_LIMIT) {
                        console.log('⚠️ Limite trial atingido');
                        LoadingHelper.setButtonError(submitBtn, 'Limite atingido');
                        showTrialLimitModal();
                        return;
                    }
                    
                    updatedProducts = [...state.products, productData];
                    AchievementSystem.checkAndAward('primeiro_produto');
                }

                console.log('✅ Produto pronto para salvar:', productData);

                // Salvar produto NO BANCO DE DADOS primeiro
                console.log('💾 Salvando no StateManager (vai pro Supabase)...');
                
                // PRIMEIRO: Salvar apenas os produtos (sincroniza com Supabase)
                StateManager.setState({ 
                    products: updatedProducts
                });
                
                // DEPOIS: Navegar de volta (não sincroniza, é só navegação)
                setTimeout(() => {
                    StateManager.setState({ 
                        currentPage: 'produtos',
                        editingProductId: null
                    });
                    
                    console.log('✅ Produto salvo com sucesso!');
                    // Sucesso!
                    LoadingHelper.setButtonLoading(submitBtn, false, '✅ Produto salvo!');
                }, 500);
            });

            // Event listeners
            baseCostInput.addEventListener('input', updatePricingUI);
            profitMarginInput.addEventListener('input', updatePricingUI);
            variationRadios.forEach(radio => radio.addEventListener('change', updateVariationUI));
            
            // Inicializa
            updateVariationUI();
            updatePricingUI();
        },

        getDespesasHTML() {
            const { costs, user, bills } = StateManager.getState();
            
            // Custos fixos manuais (cadastrados aqui)
            const manualFixedCosts = costs.fixed || [];
            
            // Custos vindos do Financeiro (contas recorrentes marcadas como custo do negócio)
            const billsAsFixedCosts = (bills || []).filter(b => b.recurring && b.isBusinessCost);
            
            // HTML dos custos manuais
            const manualCostsHTML = manualFixedCosts.map((c, index) => `
                <div class="cost-list-item">
                    <div class="cost-item-info">
                        <span>${c.name}</span>
                        <strong>R$ ${c.value.toFixed(2)}</strong>
                    </div>
                    <button class="remove-btn" data-action="remove-fixed-cost" data-index="${index}">
                        <i data-lucide="x-circle"></i>
                    </button>
                </div>
            `).join('');
            
            // HTML dos custos vindos do Financeiro
            const billsCostsHTML = billsAsFixedCosts.map(b => `
                <div class="cost-list-item from-bills">
                    <div class="cost-item-info">
                        <span>${b.name} <span class="cost-badge auto">📊 Do Financeiro</span></span>
                        <strong>R$ ${b.amount.toFixed(2)}</strong>
                    </div>
                    <button class="btn-link" data-action="navigate" data-route="financeiro" title="Gerenciar no Financeiro">
                        <i data-lucide="external-link"></i>
                    </button>
                </div>
            `).join('');
            
            // Total combinado
            const manualTotal = manualFixedCosts.reduce((acc, c) => acc + c.value, 0);
            const billsTotal = billsAsFixedCosts.reduce((acc, b) => acc + b.amount, 0);
            const totalFixedCosts = manualTotal + billsTotal;
            
            const variableCostsHTML = (costs.variable || []).map((c, index) => `
                <div class="cost-list-item">
                    <div class="cost-item-info">
                        <span>${c.name}</span>
                        <div>
                            <strong>${c.value}${c.type === 'percentage' ? '%' : ' R$'}</strong>
                            <span class="cost-type-badge">${c.type === 'percentage' ? '%' : 'Fixo'}</span>
                        </div>
                    </div>
                    <button class="remove-btn" data-action="remove-variable-cost" data-index="${index}">
                        <i data-lucide="x-circle"></i>
                    </button>
                </div>
            `).join('');
            
            return `
                <h2>Gestão de Despesas</h2>
                <p class="sub-header">A base para uma precificação lucrativa começa aqui.</p>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon" style="background: var(--success-gradient);">
                            <i data-lucide="shopping-cart"></i>
                        </div>
                        <h3 class="card-title">Qual a sua meta de vendas mensal?</h3>
                    </div>
                    <p>Este número é essencial para calcularmos seus custos por cada produto vendido.</p>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label for="monthly-sales-goal">Itens a vender por mês</label>
                        <input type="number" id="monthly-sales-goal" class="form-input" placeholder="Ex: 100" value="${user.monthlySalesGoal || ''}">
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon"><i data-lucide="building"></i></div>
                        <h3 class="card-title">Custos Fixos Mensais</h3>
                    </div>
                    
                    ${billsAsFixedCosts.length > 0 ? `
                        <div class="costs-section">
                            <h4 style="font-size: 14px; color: var(--elegant-gray); margin-bottom: 8px;">
                                📊 Vindos do Financeiro (automático)
                            </h4>
                            <div id="bills-costs-list">${billsCostsHTML}</div>
                        </div>
                    ` : ''}
                    
                    ${manualFixedCosts.length > 0 ? `
                        <div class="costs-section" style="margin-top: ${billsAsFixedCosts.length > 0 ? '16px' : '0'};">
                            ${billsAsFixedCosts.length > 0 ? `<h4 style="font-size: 14px; color: var(--elegant-gray); margin-bottom: 8px;">✏️ Adicionados manualmente</h4>` : ''}
                            <div id="fixed-costs-list">${manualCostsHTML}</div>
                        </div>
                    ` : ''}
                    
                    ${billsAsFixedCosts.length === 0 && manualFixedCosts.length === 0 ? `
                        <p style="color: var(--elegant-gray); padding: 12px; text-align: center;">
                            Nenhum custo fixo cadastrado. Adicione abaixo ou cadastre no <a href="#" data-action="navigate" data-route="financeiro" style="color: var(--primary);">Financeiro</a>.
                        </p>
                    ` : ''}
                    
                    <p style="font-size:14px; text-align:right; margin-top:12px; padding-top: 12px; border-top: 1px solid #eee;">
                        Total: <strong style="color: var(--primary);">R$ ${totalFixedCosts.toFixed(2)}</strong>
                    </p>
                    
                    <form class="add-cost-form" id="add-fixed-cost-form" style="margin-top: 16px;">
                        <p style="font-size: 13px; color: var(--elegant-gray); margin-bottom: 8px;">
                            💡 Dica: Cadastre contas no <strong>Financeiro</strong> como "recorrente" para aparecer automaticamente aqui.
                        </p>
                        <div class="input-group">
                            <input type="text" id="fixed-cost-name" class="form-input" placeholder="Nome da Despesa" required>
                            <input type="number" step="0.01" id="fixed-cost-value" class="form-input" placeholder="Valor (R$)" required>
                        </div>
                        <button type="submit" class="btn btn-secondary btn-full" style="margin-top:10px;">
                            Adicionar Custo Fixo Manual
                        </button>
                    </form>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon" style="background: var(--secondary-gradient);">
                            <i data-lucide="trending-up"></i>
                        </div>
                        <h3 class="card-title">Custos Variáveis por Venda</h3>
                    </div>
                    <div id="variable-costs-list" style="margin-top: 1rem;">${variableCostsHTML}</div>
                    <form class="add-cost-form" id="add-variable-cost-form">
                        <div class="input-group">
                            <input type="text" id="variable-cost-name" class="form-input" placeholder="Nome da Despesa" required>
                            <input type="number" step="0.01" id="variable-cost-value" class="form-input" placeholder="Valor" required>
                            <select id="variable-cost-type" class="form-select" style="width: 80px;">
                                <option value="percentage">%</option>
                                <option value="fixed">R$</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-secondary btn-full" style="margin-top:10px;">
                            Adicionar Custo Variável
                        </button>
                    </form>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon" style="background: var(--info);">
                            <i data-lucide="truck"></i>
                        </div>
                        <h3 class="card-title">Custo com Frete da Compra</h3>
                    </div>
                    <p>Se você compra de fornecedores, insira o valor total do frete pago no mês.</p>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label for="monthly-shipping-cost">Custo total do frete mensal</label>
                        <input type="number" id="monthly-shipping-cost" class="form-input" placeholder="Ex: 150.00" value="${costs.shipping || ''}">
                    </div>
                </div>
            `;
        },
        
        bindDespesasEvents() {
            const salesGoalInput = document.getElementById('monthly-sales-goal');
            if (salesGoalInput) salesGoalInput.addEventListener('change', () => StateManager.setState({ user: { ...StateManager.getState().user, monthlySalesGoal: parseFloat(salesGoalInput.value) || 0 } }));
            const shippingCostInput = document.getElementById('monthly-shipping-cost');
            if (shippingCostInput) shippingCostInput.addEventListener('change', () => StateManager.setState({ costs: { ...StateManager.getState().costs, shipping: parseFloat(shippingCostInput.value) || 0 } }));
            const addFixedCostForm = document.getElementById('add-fixed-cost-form');
            if (addFixedCostForm) addFixedCostForm.addEventListener('submit', (e) => { e.preventDefault(); CostManager.addFixedCost(document.getElementById('fixed-cost-name').value, parseFloat(document.getElementById('fixed-cost-value').value)); e.target.reset(); });
            const addVariableCostForm = document.getElementById('add-variable-cost-form');
            if (addVariableCostForm) addVariableCostForm.addEventListener('submit', (e) => { e.preventDefault(); CostManager.addVariableCost(document.getElementById('variable-cost-name').value, parseFloat(document.getElementById('variable-cost-value').value), document.getElementById('variable-cost-type').value); e.target.reset(); });
        },

        getPrecificarHTML() {
            const totalUnitCost = SmartPricing.getTotalUnitCost(0);
            return `
                <h2>Precificação Inteligente ✨</h2>
                <p class="sub-header">Calcule o preço de venda ideal e maximize seu lucro.</p>
                <div class="card"><div class="form-group"><label for="product-cost">Custo do Produto (R$)</label><input type="number" id="product-cost" class="form-input" placeholder="Ex: 25.50"></div><div class="form-group"><label for="profit-margin">Margem de Lucro Desejada (%)</label><input type="range" id="profit-margin" min="10" max="300" value="100" class="slider"><div style="display:flex; justify-content: space-between; margin-top: 8px; font-weight:600;"><span>10%</span><span id="profit-margin-value">100%</span><span>300%</span></div></div></div>
                <div class="card"><h3>Composição do Custo Unitário</h3><div id="pricing-breakdown"><div class="cost-list-item"><span>Custo do Produto</span> <strong id="breakdown-product">R$ 0,00</strong></div><div class="cost-list-item"><span>Custos Fixos/Unidade</span> <strong id="breakdown-fixed">R$ ${totalUnitCost.fixed.toFixed(2)}</strong></div><div class="cost-list-item"><span>Custos Variáveis (R$)/Unidade</span> <strong id="breakdown-variable">R$ ${totalUnitCost.variable.toFixed(2)}</strong></div><div class="cost-list-item"><span>Frete/Unidade</span> <strong id="breakdown-shipping">R$ ${totalUnitCost.shipping.toFixed(2)}</strong></div><hr style="margin: 10px 0; border-color: #eee;"><div class="cost-list-item"><span>Custo Total por Unidade</span> <strong id="breakdown-total-cost" style="color: var(--alert)">R$ ${totalUnitCost.total.toFixed(2)}</strong></div></div></div>
                <div class="card" style="background: var(--primary-gradient); color: white;"><h3 style="color: white;">Resultado da Precificação</h3><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;"><span>Preço de Venda Sugerido:</span><span id="selling-price" class="financial-value" style="font-size: 24px;">R$ 0,00</span></div><div style="display: flex; justify-content: space-between; align-items: center;"><span>Lucro Bruto por Unidade:</span><span id="gross-profit" class="financial-value">R$ 0,00</span></div></div>
            `;
        },
        
        bindPrecificarEvents() {
            const costInput = document.getElementById('product-cost');
            const marginSlider = document.getElementById('profit-margin');
            if(!costInput) return;
            const updateCalculation = () => {
                const productCost = parseFloat(costInput.value) || 0;
                const margin = parseInt(marginSlider.value);
                document.getElementById('profit-margin-value').textContent = `${margin}%`;
                const unitCosts = SmartPricing.getTotalUnitCost(productCost);
                document.getElementById('breakdown-product').textContent = `R$ ${productCost.toFixed(2)}`;
                document.getElementById('breakdown-fixed').textContent = `R$ ${unitCosts.fixed.toFixed(2)}`;
                document.getElementById('breakdown-variable').textContent = `R$ ${unitCosts.variable.toFixed(2)}`;
                document.getElementById('breakdown-shipping').textContent = `R$ ${unitCosts.shipping.toFixed(2)}`;
                document.getElementById('breakdown-total-cost').textContent = `R$ ${unitCosts.total.toFixed(2)}`;
                const { price, profit } = SmartPricing.calculate(productCost, margin);
                document.getElementById('selling-price').textContent = `R$ ${price.toFixed(2)}`;
                document.getElementById('gross-profit').textContent = `R$ ${profit.toFixed(2)}`;
            };
            costInput.addEventListener('input', updateCalculation);
            marginSlider.addEventListener('input', updateCalculation);
            updateCalculation();
        },
        
        getMetasHTML() { 
             return `
                <h2>Metas e Coaching 👑</h2>
                <p class="sub-header">Defina seus objetivos e receba motivação para alcançá-los.</p>
                 <div class="card">
                    <div class="card-header"><div class="card-icon" style="background: var(--success-gradient);"><i data-lucide="gem"></i></div><h3 class="card-title">Sua Grande Meta</h3></div>
                    <p>Defina uma meta de faturamento mensal que te inspire a crescer!</p>
                    <div class="form-group" style="margin-top:1rem;">
                        <label for="monthly-goal">Meta de Faturamento Mensal (R$)</label>
                        <input type="number" id="monthly-goal" class="form-input" placeholder="Ex: 8000" value="${StateManager.getState().user.monthlyGoal}">
                    </div>
                    <button class="btn btn-primary btn-full" data-action="save-goal">Salvar Meta</button>
                </div>
            `;
        },
        
        getRelatoriosHTML() { 
            const { sales, products, costs, bills } = StateManager.getState();
            
            // Cálculos para relatórios
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Vendas do mês
            const monthSales = (sales || []).filter(s => {
                const d = new Date(s.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            const totalRevenue = monthSales.reduce((acc, s) => acc + s.total, 0);
            const totalSalesCount = monthSales.length;
            
            // Vendas por semana (últimas 4 semanas)
            const weeklyData = [0, 0, 0, 0];
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            monthSales.forEach(s => {
                const daysAgo = Math.floor((now - new Date(s.date)) / (24 * 60 * 60 * 1000));
                const weekIndex = Math.min(3, Math.floor(daysAgo / 7));
                weeklyData[3 - weekIndex] += s.total;
            });
            
            // Produtos mais vendidos
            const productSales = {};
            monthSales.forEach(s => {
                (s.items || []).forEach(item => {
                    if (!productSales[item.productId]) {
                        productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
                    }
                    productSales[item.productId].qty += item.quantity;
                    productSales[item.productId].revenue += item.subtotal;
                });
            });
            const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
            
            // Custos
            const fixedCosts = (costs?.fixed || []).reduce((acc, c) => acc + c.value, 0);
            const billsTotal = (bills || []).filter(b => !b.paid).reduce((acc, b) => acc + b.value, 0);
            
            // Lucro estimado
            const estimatedProfit = totalRevenue - fixedCosts;
            
            return `
                <h2>📊 Relatórios</h2>
                <p class="sub-header">Acompanhe o desempenho do seu negócio</p>
                
                <!-- Filtro de Período -->
                <div class="report-filters card">
                    <div class="filter-row">
                        <button class="filter-btn active" data-period="month">Este Mês</button>
                        <button class="filter-btn" data-period="week">Esta Semana</button>
                        <button class="filter-btn" data-period="year">Este Ano</button>
                    </div>
                </div>
                
                <!-- Cards Resumo -->
                <div class="report-summary">
                    <div class="report-card revenue">
                        <div class="report-icon"><i data-lucide="trending-up"></i></div>
                        <div class="report-info">
                            <span class="report-label">Faturamento</span>
                            <span class="report-value">R$ ${totalRevenue.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="report-card sales">
                        <div class="report-icon"><i data-lucide="shopping-bag"></i></div>
                        <div class="report-info">
                            <span class="report-label">Vendas</span>
                            <span class="report-value">${totalSalesCount}</span>
                        </div>
                    </div>
                    <div class="report-card expenses">
                        <div class="report-icon"><i data-lucide="receipt"></i></div>
                        <div class="report-info">
                            <span class="report-label">Despesas Fixas</span>
                            <span class="report-value">R$ ${fixedCosts.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="report-card profit">
                        <div class="report-icon"><i data-lucide="piggy-bank"></i></div>
                        <div class="report-info">
                            <span class="report-label">Lucro Estimado</span>
                            <span class="report-value">R$ ${estimatedProfit.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Gráfico de Vendas -->
                <div class="card">
                    <h3><i data-lucide="bar-chart-3"></i> Vendas por Semana</h3>
                    <div class="chart-container">
                        <canvas id="sales-chart"></canvas>
                    </div>
                </div>
                
                <!-- Produtos Mais Vendidos -->
                <div class="card">
                    <h3><i data-lucide="trophy"></i> Produtos Mais Vendidos</h3>
                    ${topProducts.length > 0 ? `
                        <div class="top-products-list">
                            ${topProducts.map((p, i) => `
                                <div class="top-product-item">
                                    <span class="top-rank">${i + 1}º</span>
                                    <div class="top-product-info">
                                        <span class="top-product-name">${p.name}</span>
                                        <span class="top-product-stats">${p.qty} vendidos • R$ ${p.revenue.toFixed(2)}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="empty-state">Nenhuma venda registrada ainda. Comece a vender para ver seus produtos campeões! 🏆</p>
                    `}
                </div>
                
                <!-- Resumo Financeiro -->
                <div class="card">
                    <h3><i data-lucide="wallet"></i> Resumo Financeiro do Mês</h3>
                    <div class="financial-summary">
                        <div class="summary-row">
                            <span>💰 Entradas (Vendas)</span>
                            <span class="positive">+ R$ ${totalRevenue.toFixed(2)}</span>
                        </div>
                        <div class="summary-row">
                            <span>📋 Custos Fixos</span>
                            <span class="negative">- R$ ${fixedCosts.toFixed(2)}</span>
                        </div>
                        <div class="summary-row">
                            <span>📝 Contas a Pagar</span>
                            <span class="negative">- R$ ${billsTotal.toFixed(2)}</span>
                        </div>
                        <div class="summary-row total">
                            <span>📈 Resultado</span>
                            <span class="${estimatedProfit >= 0 ? 'positive' : 'negative'}">${estimatedProfit >= 0 ? '+' : ''} R$ ${estimatedProfit.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Ticket Médio -->
                <div class="card">
                    <h3><i data-lucide="calculator"></i> Indicadores</h3>
                    <div class="indicators-grid">
                        <div class="indicator">
                            <span class="indicator-label">Ticket Médio</span>
                            <span class="indicator-value">R$ ${totalSalesCount > 0 ? (totalRevenue / totalSalesCount).toFixed(2) : '0.00'}</span>
                        </div>
                        <div class="indicator">
                            <span class="indicator-label">Média Diária</span>
                            <span class="indicator-value">R$ ${(totalRevenue / 30).toFixed(2)}</span>
                        </div>
                        <div class="indicator">
                            <span class="indicator-label">Produtos Cadastrados</span>
                            <span class="indicator-value">${(products || []).length}</span>
                        </div>
                        <div class="indicator">
                            <span class="indicator-label">Meta do Mês</span>
                            <span class="indicator-value">${Math.round((totalRevenue / (StateManager.getState().user.monthlyGoal || 1)) * 100)}%</span>
                        </div>
                    </div>
                </div>
            `;
        },
        
        bindRelatoriosEvents() {
            // Gráfico de vendas
            const ctx = document.getElementById('sales-chart');
            if (ctx) {
                const { sales } = StateManager.getState();
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                const monthSales = (sales || []).filter(s => {
                    const d = new Date(s.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                });
                
                const weeklyData = [0, 0, 0, 0];
                monthSales.forEach(s => {
                    const daysAgo = Math.floor((now - new Date(s.date)) / (24 * 60 * 60 * 1000));
                    const weekIndex = Math.min(3, Math.floor(daysAgo / 7));
                    weeklyData[3 - weekIndex] += s.total;
                });
                
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
                        datasets: [{
                            label: 'Faturamento',
                            data: weeklyData,
                            backgroundColor: ['#F06292', '#E91E63', '#F06292', '#E91E63'],
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + v } }
                        }
                    }
                });
            }
            
            // Filtros de período
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    // TODO: Filtrar por período selecionado
                });
            });
        },
        
        // ========== PÁGINA MEU CATÁLOGO ==========
        getMeuCatalogoHTML() {
            const { user } = StateManager.getState();
            const authData = Storage.get('auth', {});
            
            // Usar slug salvo ou gerar um a partir do nome da loja
            let slug = user.slug || authData.slug || '';
            
            if (!slug) {
                // Gerar slug localmente como fallback
                const userEmail = user.email || authData.email || '';
                const rawName = (user.businessName || user.nome || (userEmail.split && userEmail.split('@')[0]) || 'minha-loja');
                slug = String(rawName).toLowerCase()
                    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '') || 'minha-loja';
                
                // 💾 AUTO-SALVAR slug no banco se não existir
                this.saveCatalogSettings({ slug }).catch(err => {
                    console.warn('⚠️ Erro ao auto-salvar slug:', err);
                });
                
                // Atualizar estado local
                const updatedUser = { ...user, slug };
                StateManager.setState({ user: updatedUser });
            }

            // Link do catálogo em formato amigável: /catalogo/<slug>
            const catalogUrl = `https://sistemalucrocerto.com/catalogo/${encodeURIComponent(slug)}`;
            const catalogLogo = user.catalogLogo || '';
            const catalogColor = user.catalogColor || 'pink';
            
            const colors = [
                { id: 'pink', name: 'Rosa', color: '#E91E63' },
                { id: 'blue', name: 'Azul', color: '#2196F3' },
                { id: 'green', name: 'Verde', color: '#4CAF50' },
                { id: 'purple', name: 'Roxo', color: '#9C27B0' },
                { id: 'orange', name: 'Laranja', color: '#FF9800' },
            ];
            
            return `
                <h2>🏪 Meu Catálogo Digital</h2>
                <p class="sub-header">Personalize e compartilhe seu catálogo com clientes</p>
                
                <!-- Preview do Catálogo -->
                <div class="card catalog-preview-card">
                    <div class="catalog-preview-header" style="background: ${colors.find(c => c.id === catalogColor)?.color || '#E91E63'}">
                        <div class="preview-logo">
                            ${catalogLogo 
                                ? `<img src="${catalogLogo}" alt="Logo">`
                                : `<i data-lucide="store" style="width: 40px; height: 40px; color: white;"></i>`
                            }
                        </div>
                        <span class="preview-name">${user.businessName || 'Minha Loja'}</span>
                    </div>
                    <div class="catalog-preview-actions">
                        <a href="${catalogUrl}" target="_blank" class="btn btn-primary">
                            <i data-lucide="external-link"></i> Ver Catálogo
                        </a>
                    </div>
                </div>
                
                <!-- Compartilhar -->
                <div class="card">
                    <h3><i data-lucide="share-2"></i> Compartilhar Catálogo</h3>
                    <p style="margin-bottom: 16px; color: var(--elegant-gray);">Envie para suas clientes verem seus produtos e fazerem pedidos pelo WhatsApp!</p>
                    
                    <div class="catalog-link-box">
                        <input type="text" value="${catalogUrl}" readonly id="catalog-link-input" class="form-input">
                        <button class="btn btn-secondary" data-action="copy-catalog-link-page">
                            <i data-lucide="copy"></i>
                        </button>
                    </div>
                    
                    <div class="share-buttons">
                        <button class="btn btn-whatsapp" data-action="share-catalog-whatsapp-page">
                            <i data-lucide="message-circle"></i> Compartilhar no WhatsApp
                        </button>
                    </div>
                </div>
                
                <!-- Personalização -->
                <div class="card">
                    <h3><i data-lucide="palette"></i> Personalização</h3>
                    
                    <div class="form-group">
                        <label>Logomarca da Loja</label>
                        <p style="font-size: 12px; color: var(--elegant-gray); margin-bottom: 8px;">
                            Aparece no topo do seu catálogo digital
                        </p>
                        <div class="catalog-logo-upload">
                            <input type="file" id="catalog-logo-input" accept="image/*" style="display: none;">
                            <label for="catalog-logo-input" class="logo-upload-area" id="catalog-logo-preview">
                                ${catalogLogo 
                                    ? `<img src="${catalogLogo}" alt="Logo do catálogo" style="max-width: 100%; max-height: 100%; object-fit: contain;">`
                                    : `<i data-lucide="image-plus" style="width: 32px; height: 32px; color: var(--elegant-gray);"></i>
                                       <span>Clique para adicionar logo</span>`
                                }
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 20px;">
                        <label>Cor Principal do Catálogo</label>
                        <p style="font-size: 12px; color: var(--elegant-gray); margin-bottom: 12px;">
                            Escolha a cor que combina com sua marca
                        </p>
                        <div class="color-palette" id="catalog-color-palette">
                            ${colors.map(c => `
                                <button class="color-option ${c.id} ${catalogColor === c.id ? 'active' : ''}" 
                                        data-color="${c.id}" 
                                        title="${c.name}"
                                        style="background: ${c.color};">
                                    ${catalogColor === c.id ? '<i data-lucide="check"></i>' : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Botão Salvar Alterações -->
                <button class="btn btn-primary btn-full" id="save-catalog-btn" style="margin: 20px 0;">
                    <i data-lucide="save" style="width: 18px; height: 18px;"></i> 
                    Salvar Alterações
                </button>
                
                <!-- Dicas -->
                <div class="card tip-card">
                    <h3><i data-lucide="lightbulb"></i> Dicas para vender mais</h3>
                    <ul class="tips-list">
                        <li>📸 Coloque fotos de qualidade nos produtos</li>
                        <li>💬 Descreva bem cada produto</li>
                        <li>🏷️ Mantenha os preços atualizados</li>
                        <li>📱 Compartilhe o link nos seus status</li>
                        <li>👥 Envie para grupos de clientes</li>
                    </ul>
                </div>
            `;
        },
        
        bindMeuCatalogoEvents() {
            // Upload de logo
            const logoInput = document.getElementById('catalog-logo-input');
            const logoPreview = document.getElementById('catalog-logo-preview');
            
            if (logoInput) {
                logoInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const logoData = event.target.result;
                            const user = { ...StateManager.getState().user, catalogLogo: logoData };
                            StateManager.setState({ user });
                            logoPreview.innerHTML = `<img src="${logoData}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
            
            // Seleção de cor
            const colorPalette = document.getElementById('catalog-color-palette');
            if (colorPalette) {
                colorPalette.addEventListener('click', async (e) => {
                    const colorBtn = e.target.closest('.color-option');
                    if (colorBtn) {
                        const color = colorBtn.dataset.color;
                        
                        // Remover seleção anterior
                        document.querySelectorAll('.color-option').forEach(btn => btn.classList.remove('selected'));
                        colorBtn.classList.add('selected');
                        
                        // Salvar no estado E no banco
                        const user = { ...StateManager.getState().user, catalogColor: color };
                        StateManager.setState({ user });
                        
                        // 💾 SALVAR NO SUPABASE
                        await this.saveCatalogSettings({ cor_catalogo: color });
                    }
                });
            }
            
            // Botão "Salvar Catálogo"
            const saveCatalogBtn = document.getElementById('save-catalog-btn');
            if (saveCatalogBtn) {
                saveCatalogBtn.addEventListener('click', async () => {
                    const btn = saveCatalogBtn;
                    const originalText = btn.innerHTML;
                    
                    try {
                        btn.disabled = true;
                        btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Salvando...';
                        lucide.createIcons();
                        
                        const { user } = StateManager.getState();
                        const authData = Storage.get('auth', {});
                        
                        // Gerar slug se não existir
                        let slug = user.slug || authData.slug || '';
                        if (!slug) {
                            const rawName = user.businessName || user.nome || 'minha-loja';
                            slug = String(rawName).toLowerCase()
                                .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/(^-|-$)/g, '');
                        }
                        
                        // Dados para salvar
                        const catalogData = {
                            slug: slug,
                            logo_catalogo: user.catalogLogo || null,
                            cor_catalogo: user.catalogColor || 'pink'
                        };
                        
                        // 💾 SALVAR NO SUPABASE
                        await this.saveCatalogSettings(catalogData);
                        
                        // Atualizar estado com slug
                        const updatedUser = { ...user, slug };
                        StateManager.setState({ user: updatedUser });
                        
                        // Feedback sucesso
                        btn.innerHTML = '<i data-lucide="check"></i> Salvo!';
                        btn.classList.add('success');
                        lucide.createIcons();
                        
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.classList.remove('success');
                            btn.disabled = false;
                            lucide.createIcons();
                        }, 2000);
                        
                    } catch (error) {
                        console.error('Erro ao salvar:', error);
                        btn.innerHTML = '<i data-lucide="x"></i> Erro!';
                        btn.classList.add('error');
                        lucide.createIcons();
                        
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.classList.remove('error');
                            btn.disabled = false;
                            lucide.createIcons();
                        }, 2000);
                    }
                });
            }
        },
        
        async saveCatalogSettings(data) {
            const authData = Storage.get('auth', {});
            const userId = authData.userId || Storage.get('user_id');
            
            if (!userId) {
                throw new Error('Usuário não encontrado');
            }
            
            console.log('💾 Salvando configurações do catálogo:', data);
            
            // Salvar no Supabase
            if (window.supabase) {
                const result = await supabase.update('usuarios', userId, data);
                
                if (result.error) {
                    console.error('Erro ao salvar no Supabase:', result.error);
                    throw result.error;
                }
                
                console.log('✅ Configurações salvas no banco!');
            } else {
                console.warn('⚠️ Supabase não disponível - salvando apenas localmente');
            }
        },

        // ========== PÁGINA DE CONFIGURAÇÕES ==========
        getConfiguracoesHTML() {
            const { user } = StateManager.getState();
            const authData = Storage.get('auth', {});
            const profilePhoto = user.profilePhoto || '';
            
            return `
                <h2>⚙️ Configurações</h2>
                <p class="sub-header">Personalize seu app e gerencie seu perfil</p>
                
                <div class="card">
                    <h3><i data-lucide="user" style="width: 20px; height: 20px; vertical-align: middle;"></i> Meu Perfil</h3>
                    
                    <div class="profile-photo-section">
                        <label class="profile-photo-upload">
                            <input type="file" id="profile-photo-input" accept="image/*" style="display: none;">
                            <div class="profile-photo-preview" id="profile-photo-preview">
                                ${profilePhoto 
                                    ? `<img src="${profilePhoto}" alt="Foto de perfil">`
                                    : `<i data-lucide="camera" style="width: 40px; height: 40px; color: var(--elegant-gray);"></i>
                                       <span>Adicionar Foto</span>`
                                }
                            </div>
                        </label>
                        <p style="font-size: 12px; color: var(--elegant-gray); margin-top: 8px;">Toque para ${profilePhoto ? 'alterar' : 'adicionar'} sua foto</p>
                    </div>
                    
                    <form id="profile-form">
                        <div class="form-group">
                            <label for="profile-name">
                                <i data-lucide="user" style="width: 16px; height: 16px;"></i> Nome Completo
                            </label>
                            <input type="text" id="profile-name" class="form-input" placeholder="Seu nome" value="${user.name || ''}">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="profile-phone">
                                    <i data-lucide="phone" style="width: 16px; height: 16px;"></i> Telefone/WhatsApp
                                </label>
                                <input type="tel" id="profile-phone" class="form-input" placeholder="(00) 00000-0000" value="${user.phone || ''}">
                            </div>
                            <div class="form-group">
                                <label for="profile-email">
                                    <i data-lucide="mail" style="width: 16px; height: 16px;"></i> E-mail
                                </label>
                                <input type="email" id="profile-email" class="form-input" placeholder="seu@email.com" value="${user.email || ''}">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="profile-cpf">
                                <i data-lucide="credit-card" style="width: 16px; height: 16px;"></i> CPF/CNPJ
                            </label>
                            <input type="text" id="profile-cpf" class="form-input" placeholder="000.000.000-00" value="${user.cpf || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="profile-business">
                                <i data-lucide="store" style="width: 16px; height: 16px;"></i> Nome do Negócio
                            </label>
                            <input type="text" id="profile-business" class="form-input" placeholder="Ex: Maria Bijuterias" value="${user.businessName || ''}">
                        </div>
                    </form>
                </div>
                
                <div class="card">
                    <h3><i data-lucide="clipboard-list" style="width: 20px; height: 20px; vertical-align: middle;"></i> Minha Rotina</h3>
                    <p style="font-size: 14px; color: var(--elegant-gray); margin-bottom: 16px;">
                        Escreva sua rotina diária ou metas do dia. Isso aparecerá na tela inicial!
                    </p>
                    <div class="form-group">
                        <textarea id="profile-routine" class="form-input" rows="4" placeholder="Ex: Segunda a Sexta: Manhã - Preparar pedidos. Tarde - Postar no Instagram. Noite - Responder clientes...">${user.routine || ''}</textarea>
                    </div>
                </div>
                
                <div class="card">
                    <h3><i data-lucide="target" style="width: 20px; height: 20px; vertical-align: middle;"></i> Metas</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="profile-monthly-goal">Meta de Faturamento (R$/mês)</label>
                            <input type="number" id="profile-monthly-goal" class="form-input" placeholder="8000" value="${user.monthlyGoal || ''}">
                        </div>
                        <div class="form-group">
                            <label for="profile-sales-goal">Meta de Vendas (un./mês)</label>
                            <input type="number" id="profile-sales-goal" class="form-input" placeholder="100" value="${user.monthlySalesGoal || ''}">
                        </div>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-full" data-action="save-profile" style="margin-top: 20px;">
                    <i data-lucide="check" style="width: 18px; height: 18px;"></i> Salvar Configurações
                </button>
                
                ${authData.plano !== 'trial' ? `
                    <div class="card" style="margin-top: 30px; background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border: 2px solid var(--primary-light);">
                        <h3><i data-lucide="crown" style="width: 20px; height: 20px; vertical-align: middle; color: var(--primary);"></i> Meu Plano</h3>
                        <div id="plan-info-section">
                            <!-- Será preenchido dinamicamente -->
                        </div>
                    </div>
                ` : ''}
                
                <div class="card" style="margin-top: 20px; background: var(--light-gray);">
                    <h3><i data-lucide="link" style="width: 20px; height: 20px; vertical-align: middle;"></i> Acesso Rápido</h3>
                    <div class="settings-links">
                        <a href="#" class="settings-link" data-action="navigate" data-route="financeiro">
                            <i data-lucide="wallet"></i> Controle Financeiro
                        </a>
                        <a href="#" class="settings-link" data-action="navigate" data-route="precificar">
                            <i data-lucide="calculator"></i> Precificação
                        </a>
                        <a href="#" class="settings-link" data-action="navigate" data-route="metas">
                            <i data-lucide="trophy"></i> Metas e Conquistas
                        </a>
                    </div>
                </div>
            `;
        },
        
        bindConfiguracoesEvents() {
            const { user } = StateManager.getState();
            let currentProfilePhoto = user.profilePhoto || '';
            
            // Upload de foto de perfil
            const photoInput = document.getElementById('profile-photo-input');
            const photoPreview = document.getElementById('profile-photo-preview');
            
            if (photoInput) {
                photoInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                            alert('❌ Imagem muito grande! Máximo 2MB.');
                            return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            currentProfilePhoto = event.target.result;
                            photoPreview.innerHTML = `<img src="${currentProfilePhoto}" alt="Foto de perfil">`;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
            
            // Renderizar informações do plano
            this.renderPlanInfo();
            
            // Salvar perfil
            document.querySelector('[data-action="save-profile"]')?.addEventListener('click', () => {
                const saveBtn = document.querySelector('[data-action="save-profile"]');
                
                // Mostrar loading
                LoadingHelper.setButtonLoading(saveBtn, true);
                
                const updatedUser = {
                    ...user,
                    name: document.getElementById('profile-name').value.trim(),
                    phone: document.getElementById('profile-phone').value.trim(),
                    email: document.getElementById('profile-email').value.trim(),
                    cpf: document.getElementById('profile-cpf').value.trim(),
                    businessName: document.getElementById('profile-business').value.trim(),
                    routine: document.getElementById('profile-routine').value.trim(),
                    monthlyGoal: parseFloat(document.getElementById('profile-monthly-goal').value) || 0,
                    monthlySalesGoal: parseFloat(document.getElementById('profile-sales-goal').value) || 0,
                    profilePhoto: currentProfilePhoto
                };
                
                // Salvar RÁPIDO (só localStorage)
                setTimeout(() => {
                    StateManager.setState({ user: updatedUser });
                    LoadingHelper.setButtonLoading(saveBtn, false, '✅ Salvo!');
                }, 300);
            });
        },
        
        // Renderizar informações do plano nas configurações
        renderPlanInfo() {
            const planSection = document.getElementById('plan-info-section');
            if (!planSection) return;
            
            // Pegar dados do plano do localStorage
            const authData = Storage.get('auth', {});
            const currentPlan = authData.plano || 'trial';
            
            // SE FOR TRIAL, NÃO MOSTRAR NADA - USUÁRIO NÃO TEM PLANO
            if (currentPlan === 'trial') {
                planSection.style.display = 'none';
                return;
            }
            
            // SÓ MOSTRA "MEU PLANO" SE TIVER PLANO PAGO (starter, pro, premium)
            planSection.style.display = 'block';
            
            const planNames = {
                starter: 'Starter',
                pro: 'Profissional',
                premium: 'Premium'
            };
            const planPrices = {
                starter: { monthly: 19.90, annual: 14.92 },
                pro: { monthly: 34.90, annual: 26.17 },
                premium: { monthly: 49.90, annual: 37.42 }
            };
            
            const billing = authData.billing || 'monthly';
            const planName = planNames[currentPlan] || 'Profissional';
            const price = planPrices[currentPlan]?.[billing] || 34.90;
            
            // Simular data de vencimento (30 dias a partir do cadastro ou hoje para demo)
            const createdAt = authData.createdAt ? new Date(authData.createdAt) : new Date();
            const expiryDate = new Date(createdAt);
            expiryDate.setDate(expiryDate.getDate() + 30);
            
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            // INTERFACE PARA PLANO PAGO
            planSection.innerHTML = `
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <div style="width: 50px; height: 50px; background: var(--primary-gradient); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="crown" style="width: 24px; height: 24px; color: white;"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin: 0; color: var(--dark-gray);">Plano ${planName}</h4>
                        <p style="margin: 4px 0 0; color: var(--elegant-gray); font-size: 14px;">
                            R$ ${price.toFixed(2).replace('.', ',')}/mês ${billing === 'annual' ? '(anual)' : ''}
                        </p>
                    </div>
                    <span class="plan-badge" style="background: ${daysUntilExpiry <= 3 ? '#FFF3CD' : '#D4EDDA'}; color: ${daysUntilExpiry <= 3 ? '#856404' : '#155724'}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        ${daysUntilExpiry <= 0 ? 'Vencido' : 'Ativo'}
                    </span>
                </div>
                
                <div style="background: var(--light-gray); padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: var(--elegant-gray);">
                        <i data-lucide="calendar" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 6px;"></i>
                        Próxima cobrança: <strong>${expiryDate.toLocaleDateString('pt-BR')}</strong>
                        ${daysUntilExpiry <= 3 && daysUntilExpiry > 0 ? '<span style="color: #E91E63; margin-left: 8px;">(' + daysUntilExpiry + ' dias restantes)</span>' : ''}
                    </p>
                </div>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <a href="./planos" class="btn btn-secondary" style="flex: 1; text-decoration: none; text-align: center;">
                        <i data-lucide="arrow-up-circle" style="width: 16px; height: 16px;"></i> Mudar Plano
                    </a>
                    <a href="./planos" class="btn btn-primary" style="flex: 1; text-decoration: none; text-align: center;">
                        <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i> Renovar
                    </a>
                </div>
            `;
            
            setTimeout(() => {
                lucide.createIcons({ nodes: [...planSection.querySelectorAll('[data-lucide]')] });
            }, 0);
        },

        // ========== PÁGINA DE CLIENTES (MINI CRM) ==========
        getClientesHTML() {
            const { clients } = StateManager.getState();
            
            const clientCards = (clients || []).map(c => {
                const totalPurchases = c.purchases || 0;
                const totalSpent = c.totalSpent || 0;
                
                return `
                    <div class="client-card" data-client-id="${c.id}">
                        <div class="client-avatar">
                            ${c.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="client-info">
                            <h4 class="client-name">${c.name}</h4>
                            <p class="client-phone">
                                <i data-lucide="phone" style="width: 14px; height: 14px;"></i>
                                ${c.phone || 'Sem telefone'}
                            </p>
                            <div class="client-stats">
                                <span><i data-lucide="shopping-bag"></i> ${totalPurchases} compras</span>
                                <span><i data-lucide="dollar-sign"></i> R$ ${totalSpent.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="client-actions">
                            <button class="btn-icon-small" data-action="whatsapp-client" data-phone="${c.phone}" title="WhatsApp">
                                <i data-lucide="message-circle"></i>
                            </button>
                            <button class="btn-icon-small" data-action="edit-client" data-id="${c.id}" title="Editar">
                                <i data-lucide="pencil"></i>
                            </button>
                            <button class="btn-icon-small danger" data-action="delete-client" data-id="${c.id}" title="Excluir">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2>👥 Meus Clientes</h2>
                        <p class="sub-header">Gerencie sua carteira de clientes</p>
                    </div>
                    <button class="btn btn-primary" data-action="add-new-client">
                        <i data-lucide="user-plus" style="width: 18px; height: 18px;"></i> Novo Cliente
                    </button>
                </div>
                
                ${(clients || []).length > 0 ? `
                    <div class="clients-summary">
                        <div class="summary-item">
                            <i data-lucide="users" style="color: var(--primary);"></i>
                            <div>
                                <span class="summary-value">${clients.length}</span>
                                <span class="summary-label">Clientes</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="search-box">
                        <i data-lucide="search"></i>
                        <input type="text" id="search-clients" class="form-input" placeholder="Buscar cliente...">
                    </div>
                    
                    <div class="clients-list">
                        ${clientCards}
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="users" style="width: 64px; height: 64px; color: var(--elegant-gray);"></i>
                        </div>
                        <h3>Nenhum cliente cadastrado</h3>
                        <p>Cadastre seus clientes para acompanhar o histórico de compras!</p>
                        <button class="btn btn-primary btn-lg" data-action="add-new-client">
                            <i data-lucide="user-plus"></i> Cadastrar Primeiro Cliente
                        </button>
                    </div>
                `}
                
                <!-- Modal Adicionar/Editar Cliente -->
                <div id="client-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="client-modal-title"><i data-lucide="user-plus"></i> Novo Cliente</h3>
                            <button class="modal-close" data-action="close-client-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="client-form">
                                <div class="form-group">
                                    <label for="client-name">Nome Completo *</label>
                                    <input type="text" id="client-name" class="form-input" placeholder="Nome do cliente" required>
                                </div>
                                <div class="form-group">
                                    <label for="client-phone">Telefone/WhatsApp</label>
                                    <input type="tel" id="client-phone" class="form-input" placeholder="(00) 00000-0000">
                                </div>
                                <div class="form-group">
                                    <label for="client-email">E-mail</label>
                                    <input type="email" id="client-email" class="form-input" placeholder="email@exemplo.com">
                                </div>
                                <div class="form-group">
                                    <label for="client-notes">Observações</label>
                                    <textarea id="client-notes" class="form-input" rows="3" placeholder="Preferências, tamanhos, datas importantes..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-action="close-client-modal">Cancelar</button>
                            <button class="btn btn-primary" data-action="save-client">
                                <i data-lucide="check"></i> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },
        
        bindClientesEvents() {
            let editingClientId = null;
            
            // Abrir modal novo cliente
            document.querySelectorAll('[data-action="add-new-client"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    editingClientId = null;
                    document.getElementById('client-modal-title').innerHTML = '<i data-lucide="user-plus"></i> Novo Cliente';
                    document.getElementById('client-form').reset();
                    document.getElementById('client-modal').style.display = 'flex';
                    lucide.createIcons({ nodes: [document.getElementById('client-modal')] });
                });
            });
            
            // Editar cliente
            document.querySelectorAll('[data-action="edit-client"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const clientId = btn.dataset.id;
                    editingClientId = clientId;
                    const { clients } = StateManager.getState();
                    const client = clients.find(c => c.id === clientId);
                    if (!client) return;
                    
                    document.getElementById('client-modal-title').innerHTML = '<i data-lucide="pencil"></i> Editar Cliente';
                    document.getElementById('client-name').value = client.name || '';
                    document.getElementById('client-phone').value = client.phone || '';
                    document.getElementById('client-email').value = client.email || '';
                    document.getElementById('client-notes').value = client.notes || '';
                    document.getElementById('client-modal').style.display = 'flex';
                    lucide.createIcons({ nodes: [document.getElementById('client-modal')] });
                });
            });
            
            // Salvar cliente
            document.querySelector('[data-action="save-client"]')?.addEventListener('click', () => {
                const saveBtn = document.querySelector('[data-action="save-client"]');
                
                const name = document.getElementById('client-name').value.trim();
                if (!name) {
                    LoadingHelper.setButtonError(saveBtn, 'Nome obrigatório');
                    alert('❌ Digite o nome do cliente');
                    return;
                }
                
                // Mostrar loading
                LoadingHelper.setButtonLoading(saveBtn, true);
                
                const clientData = {
                    id: editingClientId || `cli_${Date.now()}`,
                    name: name,
                    phone: document.getElementById('client-phone').value.trim(),
                    email: document.getElementById('client-email').value.trim(),
                    notes: document.getElementById('client-notes').value.trim(),
                    purchases: 0,
                    totalSpent: 0,
                    createdAt: new Date().toISOString()
                };
                
                const { clients } = StateManager.getState();
                let updatedClients;
                
                if (editingClientId) {
                    const existing = clients.find(c => c.id === editingClientId);
                    clientData.purchases = existing?.purchases || 0;
                    clientData.totalSpent = existing?.totalSpent || 0;
                    clientData.createdAt = existing?.createdAt || clientData.createdAt;
                    updatedClients = clients.map(c => c.id === editingClientId ? clientData : c);
                } else {
                    updatedClients = [...(clients || []), clientData];
                }
                
                // Salvar RÁPIDO (só localStorage)
                setTimeout(() => {
                    StateManager.setState({ clients: updatedClients });
                    LoadingHelper.setButtonLoading(saveBtn, false, '✅ Cliente salvo!');
                    
                    setTimeout(() => {
                        document.getElementById('client-modal').style.display = 'none';
                        editingClientId = null;
                    }, 1500);
                }, 300);
            });
            
            // Excluir cliente
            document.querySelectorAll('[data-action="delete-client"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const clientId = btn.dataset.id;
                    const { clients } = StateManager.getState();
                    const client = clients.find(c => c.id === clientId);
                    
                    if (confirm(`❌ Excluir cliente "${client?.name}"?`)) {
                        const updatedClients = clients.filter(c => c.id !== clientId);
                        StateManager.setState({ clients: updatedClients });
                    }
                });
            });
            
            // WhatsApp
            document.querySelectorAll('[data-action="whatsapp-client"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const phone = btn.dataset.phone?.replace(/\D/g, '');
                    if (phone) {
                        window.open(`https://wa.me/55${phone}`, '_blank');
                    } else {
                        alert('❌ Cliente sem telefone cadastrado');
                    }
                });
            });
            
            // Fechar modal
            document.querySelectorAll('[data-action="close-client-modal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('client-modal').style.display = 'none';
                    editingClientId = null;
                });
            });
            
            // Busca
            const searchInput = document.getElementById('search-clients');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.toLowerCase();
                    document.querySelectorAll('.client-card').forEach(card => {
                        const name = card.querySelector('.client-name').textContent.toLowerCase();
                        card.style.display = name.includes(query) ? 'flex' : 'none';
                    });
                });
            }
            
            // Click fora do modal
            document.getElementById('client-modal')?.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    e.target.style.display = 'none';
                    editingClientId = null;
                }
            });
        },

        // ========== PÁGINA DE VENDAS ==========
        getVendasHTML() {
            try {
                const { sales } = StateManager.getState();
                const sortedSales = [...(sales || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // Estatísticas
                const today = new Date().toDateString();
                const todaySales = sortedSales.filter(s => new Date(s.date).toDateString() === today);
                const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
                
                const thisMonth = new Date().getMonth();
                const thisYear = new Date().getFullYear();
                const monthSales = sortedSales.filter(s => {
                    const d = new Date(s.date);
                    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                });
                const monthRevenue = monthSales.reduce((acc, s) => acc + s.total, 0);
                
                const salesHTML = sortedSales.slice(0, 20).map(s => {
                    try {
                        const date = new Date(s.date);
                        const formattedDate = date.toLocaleDateString('pt-BR');
                        const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        
                        return `
                            <div class="sale-card">
                                <div class="sale-header">
                                    <div class="sale-date">
                                        <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                                        ${formattedDate} às ${formattedTime}
                                    </div>
                                    <div class="sale-header-right">
                                        <span class="sale-total">R$ ${s.total.toFixed(2)}</span>
                                        <button class="btn-icon" data-action="edit-sale" data-sale-id="${s.id}" title="Editar venda">
                                            <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="sale-details">
                                    ${s.clientName ? `<span class="sale-client"><i data-lucide="user"></i> ${s.clientName}</span>` : ''}
                                    <span class="sale-items">${s.items.length} ${s.items.length === 1 ? 'item' : 'itens'}</span>
                                    <span class="sale-payment"><i data-lucide="credit-card"></i> ${s.paymentMethod || 'Não informado'}</span>
                                </div>
                                <div class="sale-products">
                                    ${s.items.map(item => `<span class="sale-product-tag">${item.quantity}x ${item.productName}</span>`).join('')}
                                </div>
                            </div>
                        `;
                    } catch (err) {
                        console.error('Erro ao renderizar venda:', s, err);
                        return '';
                    }
                }).join('');
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2>🛒 Minhas Vendas</h2>
                        <p class="sub-header">Histórico e controle de vendas</p>
                    </div>
                    <button class="btn btn-primary" data-action="navigate" data-route="nova-venda">
                        <i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i> Nova Venda
                    </button>
                </div>
                
                <div class="sales-summary">
                    <div class="summary-card today">
                        <div class="summary-icon"><i data-lucide="sun"></i></div>
                        <div class="summary-info">
                            <span class="summary-label">Hoje</span>
                            <span class="summary-value">R$ ${todayRevenue.toFixed(2)}</span>
                            <span class="summary-count">${todaySales.length} vendas</span>
                        </div>
                    </div>
                    <div class="summary-card month">
                        <div class="summary-icon"><i data-lucide="calendar"></i></div>
                        <div class="summary-info">
                            <span class="summary-label">Este Mês</span>
                            <span class="summary-value">R$ ${monthRevenue.toFixed(2)}</span>
                            <span class="summary-count">${monthSales.length} vendas</span>
                        </div>
                    </div>
                </div>
                
                ${sortedSales.length > 0 ? `
                    <h3 style="margin-top: 24px;">Últimas Vendas</h3>
                    <div class="sales-list">
                        ${salesHTML}
                    </div>
                ` : `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="shopping-cart" style="width: 64px; height: 64px; color: var(--elegant-gray);"></i>
                        </div>
                        <h3>Nenhuma venda registrada</h3>
                        <p>Registre sua primeira venda e acompanhe seu faturamento!</p>
                        <button class="btn btn-primary btn-lg" data-action="navigate" data-route="nova-venda">
                            <i data-lucide="plus-circle"></i> Registrar Primeira Venda
                        </button>
                    </div>
                `}
            `;
            } catch (error) {
                console.error('❌ Erro ao renderizar página de vendas:', error);
                return `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i data-lucide="alert-circle" style="width: 64px; height: 64px; color: var(--error);"></i>
                        </div>
                        <h3>Erro ao carregar vendas</h3>
                        <p>Tente recarregar a página. Se o problema persistir, entre em contato.</p>
                        <button class="btn btn-primary" onclick="location.reload()">
                            <i data-lucide="refresh-cw"></i> Recarregar
                        </button>
                    </div>
                `;
            }
        },
        
        bindVendasEvents() {
            // Botão editar venda
            document.querySelectorAll('[data-action="edit-sale"]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const saleId = btn.getAttribute('data-sale-id');
                    this.editSale(saleId);
                });
            });
        },
        
        editSale(saleId) {
            const { sales } = StateManager.getState();
            const sale = sales.find(s => s.id === saleId);
            
            if (!sale) {
                alert('Venda não encontrada!');
                return;
            }
            
            // Modal de edição
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i data-lucide="edit"></i> Editar Venda</h3>
                        <button class="modal-close" data-action="close-edit-modal">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Cliente</label>
                            <input type="text" id="edit-client-name" class="form-input" value="${sale.clientName || ''}" placeholder="Nome do cliente">
                        </div>
                        <div class="form-group">
                            <label>Método de Pagamento</label>
                            <select id="edit-payment-method" class="form-input">
                                <option value="Dinheiro" ${sale.paymentMethod === 'Dinheiro' ? 'selected' : ''}>💵 Dinheiro</option>
                                <option value="PIX" ${sale.paymentMethod === 'PIX' ? 'selected' : ''}>📱 PIX</option>
                                <option value="Cartão de Débito" ${sale.paymentMethod === 'Cartão de Débito' ? 'selected' : ''}>💳 Débito</option>
                                <option value="Cartão de Crédito" ${sale.paymentMethod === 'Cartão de Crédito' ? 'selected' : ''}>💳 Crédito</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Data e Hora</label>
                            <input type="datetime-local" id="edit-sale-date" class="form-input" value="${new Date(sale.date).toISOString().slice(0, 16)}">
                        </div>
                        <div style="background: var(--light-gray); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                            <strong>Itens da venda:</strong>
                            ${sale.items.map(item => `<div style="margin-top: 8px;">• ${item.quantity}x ${item.productName} - R$ ${(item.price * item.quantity).toFixed(2)}</div>`).join('')}
                            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd; font-weight: 600;">
                                Total: R$ ${sale.total.toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="close-edit-modal">Cancelar</button>
                        <button class="btn btn-primary" data-action="save-sale-edit">Salvar</button>
                    </div>
                    <div style="padding: 0 20px 20px;">
                        <button class="btn btn-danger" data-action="delete-sale" style="width: 100%;">
                            <i data-lucide="trash-2"></i> Excluir Venda
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            lucide.createIcons({ nodes: [...modal.querySelectorAll('[data-lucide]')] });
            
            // Fechar modal
            modal.querySelectorAll('[data-action="close-edit-modal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.remove();
                });
            });
            
            // Fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // Salvar alterações
            modal.querySelector('[data-action="save-sale-edit"]').addEventListener('click', () => {
                const updatedSale = {
                    ...sale,
                    clientName: document.getElementById('edit-client-name').value,
                    paymentMethod: document.getElementById('edit-payment-method').value,
                    date: new Date(document.getElementById('edit-sale-date').value).toISOString()
                };
                
                // Salvar RÁPIDO (só localStorage)
                const updatedSales = sales.map(s => s.id === saleId ? updatedSale : s);
                StateManager.setState({ sales: updatedSales });
                
                modal.remove();
                this.updateActiveContent();
            });
            
            // Excluir venda
            modal.querySelector('[data-action="delete-sale"]').addEventListener('click', () => {
                if (confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) {
                    const updatedSales = sales.filter(s => s.id !== saleId);
                    StateManager.setState({ sales: updatedSales });
                    DataManager.save('appState', StateManager.getState());
                    
                    modal.remove();
                    this.updateActiveContent();
                }
            });
        },

        // ========== PÁGINA NOVA VENDA ==========
        getNovaVendaHTML() {
            const { products, clients } = StateManager.getState();
            
            const clientOptions = (clients || []).map(c => 
                `<option value="${c.id}" data-phone="${c.phone || ''}">${c.name}</option>`
            ).join('');
            
            return `
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <button class="btn-icon" data-action="navigate" data-route="vendas" style="margin-right: 12px;">
                        <i data-lucide="arrow-left"></i>
                    </button>
                    <h2 style="margin: 0;">🛒 Nova Venda</h2>
                </div>
                
                <div class="card">
                    <h3><i data-lucide="user" style="width: 20px; height: 20px; vertical-align: middle;"></i> Dados do Cliente</h3>
                    
                    <div class="form-group">
                        <label>Cliente cadastrado (opcional)</label>
                        <div class="client-select-row">
                            <select id="sale-client" class="form-input" style="flex: 1;">
                                <option value="">-- Selecionar cliente --</option>
                                ${clientOptions}
                            </select>
                            <button class="btn btn-secondary" data-action="quick-add-client" title="Novo cliente">
                                <i data-lucide="user-plus"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label for="sale-client-name">Nome do cliente *</label>
                            <input type="text" id="sale-client-name" class="form-input" placeholder="Ex: Maria Silva">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="sale-client-phone">WhatsApp *</label>
                            <input type="tel" id="sale-client-phone" class="form-input" placeholder="(00) 00000-0000">
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h3><i data-lucide="package" style="width: 20px; height: 20px; vertical-align: middle;"></i> Produtos</h3>
                    
                    <div id="sale-items-list"></div>
                    
                    <button class="btn btn-secondary btn-full" data-action="add-sale-item" style="margin-top: 16px;">
                        <i data-lucide="plus"></i> Adicionar Produto
                    </button>
                </div>
                
                <div class="card">
                    <h3><i data-lucide="truck" style="width: 20px; height: 20px; vertical-align: middle;"></i> Custos Adicionais</h3>
                    
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label for="sale-shipping">Frete / Entrega (R$)</label>
                            <input type="number" id="sale-shipping" class="form-input" placeholder="0,00" step="0.01" min="0" value="0">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="sale-discount">Desconto (R$)</label>
                            <input type="number" id="sale-discount" class="form-input" placeholder="0,00" step="0.01" min="0" value="0">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="sale-notes">Observações</label>
                        <textarea id="sale-notes" class="form-input" rows="2" placeholder="Ex: Entregar sábado às 14h"></textarea>
                    </div>
                </div>
                
                <div class="card" style="margin-bottom: 100px;">
                    <h3><i data-lucide="credit-card" style="width: 20px; height: 20px; vertical-align: middle;"></i> Pagamento</h3>
                    <div class="payment-methods">
                        <label class="payment-option">
                            <input type="radio" name="payment-method" value="Dinheiro" checked>
                            <span><i data-lucide="banknote"></i> Dinheiro</span>
                        </label>
                        <label class="payment-option">
                            <input type="radio" name="payment-method" value="PIX">
                            <span><i data-lucide="qr-code"></i> PIX</span>
                        </label>
                        <label class="payment-option">
                            <input type="radio" name="payment-method" value="Cartão Débito">
                            <span><i data-lucide="credit-card"></i> Débito</span>
                        </label>
                        <label class="payment-option">
                            <input type="radio" name="payment-method" value="Cartão Crédito">
                            <span><i data-lucide="credit-card"></i> Crédito</span>
                        </label>
                    </div>
                    
                    <label class="checkbox-label" style="margin-top: 16px;">
                        <input type="checkbox" id="send-whatsapp" checked>
                        <span>Enviar resumo do pedido para WhatsApp do cliente</span>
                    </label>
                </div>
                
                <div class="sale-total-bar">
                    <div class="sale-total-info">
                        <div class="sale-subtotals">
                            <span id="sale-subtotal">Subtotal: R$ 0,00</span>
                            <span id="sale-shipping-total">Frete: R$ 0,00</span>
                            <span id="sale-discount-total">Desconto: -R$ 0,00</span>
                        </div>
                        <span class="sale-total-label">Total</span>
                        <span class="sale-total-value" id="sale-total">R$ 0,00</span>
                    </div>
                    <button class="btn btn-primary" data-action="finish-sale">
                        <i data-lucide="check-circle"></i> Finalizar
                    </button>
                </div>
                
                <!-- Modal Cadastro Rápido de Cliente -->
                <div id="quick-client-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i data-lucide="user-plus"></i> Novo Cliente</h3>
                            <button class="modal-close" data-action="close-quick-client-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="quick-client-name">Nome *</label>
                                <input type="text" id="quick-client-name" class="form-input" placeholder="Nome do cliente">
                            </div>
                            <div class="form-group">
                                <label for="quick-client-phone">WhatsApp</label>
                                <input type="tel" id="quick-client-phone" class="form-input" placeholder="(00) 00000-0000">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-action="close-quick-client-modal">Cancelar</button>
                            <button class="btn btn-primary" data-action="save-quick-client">
                                <i data-lucide="check"></i> Salvar
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Modal Selecionar Produto -->
                <div id="product-select-modal" class="modal" style="display: none;">
                    <div class="modal-content modal-lg">
                        <div class="modal-header">
                            <h3><i data-lucide="package"></i> Selecionar Produto</h3>
                            <button class="modal-close" data-action="close-product-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="search-box" style="margin-bottom: 16px;">
                                <i data-lucide="search"></i>
                                <input type="text" id="search-sale-products" class="form-input" placeholder="Buscar produto...">
                            </div>
                            <div id="sale-products-list" class="sale-products-grid">
                                ${products.map(p => `
                                    <div class="sale-product-item" data-product-id="${p.id}">
                                        <img src="${p.imageUrl || (p.images && p.images[0]) || `https://placehold.co/60x60/f06292/ffffff?text=${p.name.charAt(0)}`}" alt="${p.name}">
                                        <div class="sale-product-info">
                                            <span class="sale-product-name">${p.name}</span>
                                            <span class="sale-product-price">R$ ${(p.finalPrice || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Modal Selecionar Variação -->
                <div id="variation-select-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i data-lucide="palette"></i> Selecionar Variação</h3>
                            <button class="modal-close" data-action="close-variation-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="variation-product-preview" style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #eee;">
                                <img id="variation-product-img" src="" alt="" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
                                <div>
                                    <strong id="variation-product-name"></strong>
                                    <div id="variation-product-price" style="color: var(--primary); font-weight: 600;"></div>
                                </div>
                            </div>
                            
                            <div id="variation-options-container"></div>
                            
                            <div id="variation-stock-alert" style="display: none; background: #FFF3CD; color: #856404; padding: 12px; border-radius: 8px; margin-top: 16px;">
                                <i data-lucide="alert-triangle" style="width: 16px; height: 16px; vertical-align: middle;"></i>
                                <span id="variation-stock-message"></span>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-action="close-variation-modal">Cancelar</button>
                            <button class="btn btn-primary" id="confirm-variation-btn" data-action="confirm-variation">
                                <i data-lucide="check"></i> Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },
        
        bindNovaVendaEvents() {
            const { products, clients } = StateManager.getState();
            let saleItems = [];
            let selectedProduct = null;
            let selectedVariations = {};
            
            // Atualizar totais
            const updateSaleTotal = () => {
                const subtotal = saleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                const shipping = parseFloat(document.getElementById('sale-shipping')?.value) || 0;
                const discount = parseFloat(document.getElementById('sale-discount')?.value) || 0;
                const total = subtotal + shipping - discount;
                
                document.getElementById('sale-subtotal').textContent = `Subtotal: R$ ${subtotal.toFixed(2)}`;
                document.getElementById('sale-shipping-total').textContent = `Frete: R$ ${shipping.toFixed(2)}`;
                document.getElementById('sale-discount-total').textContent = `Desconto: -R$ ${discount.toFixed(2)}`;
                document.getElementById('sale-total').textContent = `R$ ${Math.max(0, total).toFixed(2)}`;
            };
            
            // Preencher dados quando selecionar cliente
            document.getElementById('sale-client')?.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const client = clients?.find(c => c.id === e.target.value);
                
                if (client) {
                    document.getElementById('sale-client-name').value = client.name || '';
                    document.getElementById('sale-client-phone').value = client.phone || '';
                }
            });
            
            // Atualizar total quando mudar frete/desconto
            document.getElementById('sale-shipping')?.addEventListener('input', updateSaleTotal);
            document.getElementById('sale-discount')?.addEventListener('input', updateSaleTotal);
            
            // Verificar estoque disponível
            const getAvailableStock = (product, variation1, variation2) => {
                if (!product.stock) return 999; // Sem controle de estoque
                
                if (product.variationType === 'none') {
                    return product.stock.total || 0;
                } else if (product.variationType === 'simple') {
                    return product.stock[variation1] || 0;
                } else if (product.variationType === 'combined') {
                    const key = `${variation1}-${variation2}`;
                    return product.stock[key] || 0;
                }
                return 0;
            };
            
            // Obter foto da variação
            const getVariationImage = (product, variation) => {
                if (product.variationImages && product.variationImages[variation]) {
                    const imgIndex = product.variationImages[variation];
                    if (product.images && product.images[imgIndex]) {
                        return product.images[imgIndex];
                    }
                }
                return product.imageUrl || (product.images && product.images[0]) || `https://placehold.co/60x60/f06292/ffffff?text=${product.name.charAt(0)}`;
            };
            
            const renderSaleItems = () => {
                const container = document.getElementById('sale-items-list');
                if (saleItems.length === 0) {
                    container.innerHTML = `
                        <div class="empty-sale-items">
                            <i data-lucide="package-open" style="width: 32px; height: 32px; color: var(--elegant-gray);"></i>
                            <p>Nenhum produto adicionado</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = saleItems.map((item, index) => `
                        <div class="sale-item-row">
                            <img src="${item.imageUrl}" alt="${item.productName}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
                            <div class="sale-item-info">
                                <span class="sale-item-name">${item.productName}</span>
                                ${item.variation ? `<span class="sale-item-variation">${item.variation}</span>` : ''}
                                <span class="sale-item-price">R$ ${item.price.toFixed(2)} un.</span>
                            </div>
                            <div class="sale-item-quantity">
                                <button class="qty-btn" data-action="decrease-qty" data-index="${index}">-</button>
                                <span>${item.quantity}</span>
                                <button class="qty-btn" data-action="increase-qty" data-index="${index}" ${item.quantity >= item.maxStock ? 'disabled style="opacity: 0.5;"' : ''}>+</button>
                            </div>
                            <button class="btn-icon-small danger" data-action="remove-sale-item" data-index="${index}">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    `).join('');
                }
                lucide.createIcons({ nodes: [container] });
                updateSaleTotal();
                
                // Bind quantity buttons
                container.querySelectorAll('[data-action="decrease-qty"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.dataset.index);
                        if (saleItems[idx].quantity > 1) {
                            saleItems[idx].quantity--;
                            renderSaleItems();
                        }
                    });
                });
                
                container.querySelectorAll('[data-action="increase-qty"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.dataset.index);
                        if (saleItems[idx].quantity < saleItems[idx].maxStock) {
                            saleItems[idx].quantity++;
                            renderSaleItems();
                        } else {
                            alert(`⚠️ Estoque máximo disponível: ${saleItems[idx].maxStock} unidades`);
                        }
                    });
                });
                
                container.querySelectorAll('[data-action="remove-sale-item"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.dataset.index);
                        saleItems.splice(idx, 1);
                        renderSaleItems();
                    });
                });
            };
            
            // Inicializa lista vazia
            renderSaleItems();
            
            // Adicionar produto
            document.querySelector('[data-action="add-sale-item"]')?.addEventListener('click', () => {
                document.getElementById('product-select-modal').style.display = 'flex';
                lucide.createIcons({ nodes: [document.getElementById('product-select-modal')] });
            });
            
            // Selecionar produto do modal
            document.querySelectorAll('.sale-product-item').forEach(item => {
                item.addEventListener('click', () => {
                    const productId = item.dataset.productId;
                    const product = products.find(p => p.id === productId);
                    if (!product) return;
                    
                    selectedProduct = product;
                    selectedVariations = {};
                    
                    // Se não tem variação, adiciona direto
                    if (product.variationType === 'none' || !product.variations || product.variations.length === 0) {
                        const stock = getAvailableStock(product, null, null);
                        if (stock <= 0) {
                            alert('❌ Produto esgotado!');
                            return;
                        }
                        
                        saleItems.push({
                            productId: product.id,
                            productName: product.name,
                            variation: null,
                            variationKey: null,
                            price: product.finalPrice || 0,
                            quantity: 1,
                            maxStock: stock,
                            imageUrl: product.imageUrl || (product.images && product.images[0]) || ''
                        });
                        
                        document.getElementById('product-select-modal').style.display = 'none';
                        renderSaleItems();
                        return;
                    }
                    
                    // Fechar modal de produtos
                    document.getElementById('product-select-modal').style.display = 'none';
                    
                    // Abrir modal de variação
                    showVariationModal(product);
                });
            });
            
            // Mostrar modal de variação
            function showVariationModal(product) {
                const modal = document.getElementById('variation-select-modal');
                const container = document.getElementById('variation-options-container');
                
                // Preview do produto
                document.getElementById('variation-product-img').src = product.imageUrl || (product.images && product.images[0]) || '';
                document.getElementById('variation-product-name').textContent = product.name;
                document.getElementById('variation-product-price').textContent = `R$ ${(product.finalPrice || 0).toFixed(2)}`;
                
                // Esconder alerta de estoque
                document.getElementById('variation-stock-alert').style.display = 'none';
                
                // Renderizar opções de variação
                if (product.variationType === 'simple') {
                    const variation = product.variations[0];
                    container.innerHTML = `
                        <div class="form-group">
                            <label><strong>${variation.name}</strong></label>
                            <div class="variation-options-grid">
                                ${variation.options.map(opt => {
                                    const key = ProductManager.getOptionKey(opt);
                                    const label = ProductManager.getOptionLabel(opt);
                                    const stock = product.stock?.[key] || 0;
                                    const isOutOfStock = stock <= 0;
                                    return `
                                        <button class="variation-option-btn ${isOutOfStock ? 'out-of-stock' : ''}" 
                                                data-variation-type="${variation.name}" 
                                                data-variation-value="${key}"
                                                data-stock="${stock}"
                                                ${isOutOfStock ? 'disabled' : ''}>
                                            ${label}
                                            ${isOutOfStock ? '<span class="stock-badge esgotado">Esgotado</span>' : `<span class="stock-badge">${stock} un.</span>`}
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                } else if (product.variationType === 'combined') {
                    const var1 = product.variations[0];
                    const var2 = product.variations[1];
                    
                    container.innerHTML = `
                        <div class="form-group">
                            <label><strong>${var1.name}</strong></label>
                            <div class="variation-options-grid" id="variation-1-options">
                                ${var1.options.map(opt => {
                                    const key = ProductManager.getOptionKey(opt);
                                    const label = ProductManager.getOptionLabel(opt);
                                    return `
                                        <button class="variation-option-btn" 
                                                data-variation-type="${var1.name}" 
                                                data-variation-value="${key}"
                                                data-variation-index="1">
                                            ${label}
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        <div class="form-group" id="variation-2-container" style="display: none; margin-top: 16px;">
                            <label><strong>${var2.name}</strong></label>
                            <div class="variation-options-grid" id="variation-2-options"></div>
                        </div>
                    `;
                    
                    // Bind eventos para variação 1
                    setTimeout(() => {
                        document.querySelectorAll('#variation-1-options .variation-option-btn').forEach(btn => {
                            btn.addEventListener('click', () => {
                                // Desmarcar outros
                                document.querySelectorAll('#variation-1-options .variation-option-btn').forEach(b => b.classList.remove('selected'));
                                btn.classList.add('selected');
                                
                                selectedVariations.var1 = btn.dataset.variationValue;
                                selectedVariations.var1Name = btn.dataset.variationType;
                                
                                // Mostrar opções do segundo nível
                                const container2 = document.getElementById('variation-2-container');
                                const options2 = document.getElementById('variation-2-options');
                                
                                options2.innerHTML = var2.options.map(opt => {
                                    const key2 = ProductManager.getOptionKey(opt);
                                    const label2 = ProductManager.getOptionLabel(opt);
                                    const combinedKey = `${selectedVariations.var1}-${key2}`;
                                    const stock = product.stock?.[combinedKey] || 0;
                                    const isOutOfStock = stock <= 0;
                                    return `
                                        <button class="variation-option-btn ${isOutOfStock ? 'out-of-stock' : ''}" 
                                                data-variation-type="${var2.name}" 
                                                data-variation-value="${key2}"
                                                data-stock="${stock}"
                                                data-variation-index="2"
                                                ${isOutOfStock ? 'disabled' : ''}>
                                            ${label2}
                                            ${isOutOfStock ? '<span class="stock-badge esgotado">Esgotado</span>' : `<span class="stock-badge">${stock} un.</span>`}
                                        </button>
                                    `;
                                }).join('');
                                
                                container2.style.display = 'block';
                                
                                // Bind eventos variação 2
                                document.querySelectorAll('#variation-2-options .variation-option-btn:not([disabled])').forEach(btn2 => {
                                    btn2.addEventListener('click', () => {
                                        document.querySelectorAll('#variation-2-options .variation-option-btn').forEach(b => b.classList.remove('selected'));
                                        btn2.classList.add('selected');
                                        
                                        selectedVariations.var2 = btn2.dataset.variationValue;
                                        selectedVariations.var2Name = btn2.dataset.variationType;
                                        selectedVariations.stock = parseInt(btn2.dataset.stock);
                                        
                                        // Atualizar imagem se tiver foto da variação
                                        const newImg = getVariationImage(product, selectedVariations.var1);
                                        document.getElementById('variation-product-img').src = newImg;
                                    });
                                });
                            });
                        });
                    }, 100);
                }
                
                // Bind eventos para variação simples
                setTimeout(() => {
                    if (product.variationType === 'simple') {
                        document.querySelectorAll('.variation-option-btn:not([disabled])').forEach(btn => {
                            btn.addEventListener('click', () => {
                                document.querySelectorAll('.variation-option-btn').forEach(b => b.classList.remove('selected'));
                                btn.classList.add('selected');
                                
                                selectedVariations.var1 = btn.dataset.variationValue;
                                selectedVariations.var1Name = btn.dataset.variationType;
                                selectedVariations.stock = parseInt(btn.dataset.stock);
                                
                                // Atualizar imagem se tiver foto da variação
                                const newImg = getVariationImage(product, selectedVariations.var1);
                                document.getElementById('variation-product-img').src = newImg;
                            });
                        });
                    }
                }, 100);
                
                modal.style.display = 'flex';
                lucide.createIcons({ nodes: [modal] });
            }
            
            // Confirmar variação
            document.querySelector('[data-action="confirm-variation"]')?.addEventListener('click', () => {
                if (!selectedProduct) return;
                
                let variationText = '';
                let variationKey = '';
                let stock = 0;
                let imageUrl = selectedProduct.imageUrl || (selectedProduct.images && selectedProduct.images[0]) || '';
                
                if (selectedProduct.variationType === 'simple') {
                    if (!selectedVariations.var1) {
                        alert('❌ Selecione uma opção');
                        return;
                    }
                    variationText = selectedVariations.var1;
                    variationKey = selectedVariations.var1;
                    stock = selectedVariations.stock || 0;
                    imageUrl = getVariationImage(selectedProduct, selectedVariations.var1);
                } else if (selectedProduct.variationType === 'combined') {
                    if (!selectedVariations.var1 || !selectedVariations.var2) {
                        alert('❌ Selecione todas as opções');
                        return;
                    }
                    variationText = `${selectedVariations.var1} / ${selectedVariations.var2}`;
                    variationKey = `${selectedVariations.var1}-${selectedVariations.var2}`;
                    stock = selectedVariations.stock || 0;
                    imageUrl = getVariationImage(selectedProduct, selectedVariations.var1);
                }
                
                if (stock <= 0) {
                    alert('❌ Variação esgotada!');
                    return;
                }
                
                // Verificar se já tem esse item na lista
                const existingIndex = saleItems.findIndex(item => 
                    item.productId === selectedProduct.id && item.variationKey === variationKey
                );
                
                if (existingIndex >= 0) {
                    if (saleItems[existingIndex].quantity < stock) {
                        saleItems[existingIndex].quantity++;
                    } else {
                        alert(`⚠️ Estoque máximo: ${stock} unidades`);
                    }
                } else {
                    saleItems.push({
                        productId: selectedProduct.id,
                        productName: selectedProduct.name,
                        variation: variationText,
                        variationKey: variationKey,
                        price: selectedProduct.finalPrice || 0,
                        quantity: 1,
                        maxStock: stock,
                        imageUrl: imageUrl
                    });
                }
                
                document.getElementById('variation-select-modal').style.display = 'none';
                renderSaleItems();
            });
            
            // Fechar modais
            document.querySelectorAll('[data-action="close-product-modal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('product-select-modal').style.display = 'none';
                });
            });
            
            document.querySelectorAll('[data-action="close-variation-modal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('variation-select-modal').style.display = 'none';
                });
            });
            
            // Busca de produtos
            const searchInput = document.getElementById('search-sale-products');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.toLowerCase();
                    document.querySelectorAll('.sale-product-item').forEach(item => {
                        const name = item.querySelector('.sale-product-name').textContent.toLowerCase();
                        item.style.display = name.includes(query) ? 'flex' : 'none';
                    });
                });
            }
            
            // Finalizar venda
            document.querySelector('[data-action="finish-sale"]')?.addEventListener('click', async () => {
                if (saleItems.length === 0) {
                    alert('❌ Adicione pelo menos um produto à venda');
                    return;
                }
                
                const clientName = document.getElementById('sale-client-name').value.trim();
                const clientPhone = document.getElementById('sale-client-phone').value.trim();
                
                if (!clientName) {
                    alert('❌ Digite o nome do cliente');
                    document.getElementById('sale-client-name').focus();
                    return;
                }
                
                const clientId = document.getElementById('sale-client').value;
                const client = clients?.find(c => c.id === clientId);
                const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
                const shipping = parseFloat(document.getElementById('sale-shipping')?.value) || 0;
                const discount = parseFloat(document.getElementById('sale-discount')?.value) || 0;
                const notes = document.getElementById('sale-notes')?.value.trim() || '';
                const sendWhatsApp = document.getElementById('send-whatsapp')?.checked;
                
                const subtotal = saleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                const total = subtotal + shipping - discount;
                
                const sale = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    clientId: clientId || null,
                    clientName: clientName,
                    clientPhone: clientPhone,
                    products: saleItems.map(item => ({
                        product_id: item.productId,
                        product_name: item.productName,
                        variation: item.variation,
                        variation_key: item.variationKey,
                        price: item.price,
                        quantity: item.quantity,
                        total: item.price * item.quantity
                    })),
                    paymentMethod: paymentMethod,
                    shipping: shipping,
                    discount: discount,
                    subtotal: subtotal,
                    total: Math.max(0, total),
                    notes: notes,
                    status: 'concluida'
                };
                
                // Atualiza estoque dos produtos
                const { products: currentProducts, sales: currentSales, user } = StateManager.getState();
                const updatedProducts = currentProducts.map(p => {
                    const soldItems = saleItems.filter(item => item.productId === p.id);
                    if (soldItems.length === 0) return p;
                    
                    const updatedProduct = { ...p, stock: { ...p.stock } };
                    soldItems.forEach(item => {
                        if (p.variationType === 'none') {
                            updatedProduct.stock.total = Math.max(0, (updatedProduct.stock.total || 0) - item.quantity);
                        } else if (item.variationKey) {
                            updatedProduct.stock[item.variationKey] = Math.max(0, (updatedProduct.stock[item.variationKey] || 0) - item.quantity);
                        }
                    });
                    return updatedProduct;
                });
                
                // Atualiza cliente se selecionado
                let updatedClients = StateManager.getState().clients || [];
                if (clientId) {
                    updatedClients = updatedClients.map(c => {
                        if (c.id === clientId) {
                            return {
                                ...c,
                                purchases: (c.purchases || 0) + 1,
                                totalSpent: (c.totalSpent || 0) + total,
                                phone: clientPhone || c.phone
                            };
                        }
                        return c;
                    });
                }
                
                // Se é cliente novo (não selecionou do dropdown), cadastra
                if (!clientId && clientName) {
                    const newClient = {
                        id: generateUUID(), // 🎯 USAR UUID em vez de timestamp
                        name: clientName,
                        phone: clientPhone,
                        email: '',
                        notes: '',
                        purchases: 1,
                        totalSpent: total,
                        createdAt: new Date().toISOString()
                    };
                    updatedClients = [...updatedClients, newClient];
                    sale.clientId = newClient.id;
                }
                
                // Atualiza faturamento
                const updatedUser = {
                    ...user,
                    currentRevenue: (user.currentRevenue || 0) + total
                };
                
                // PRIMEIRO: Salvar venda no Supabase imediatamente
                const saveResult = await SupabaseClient.saveSaleToSupabase(sale);
                
                if (saveResult.success) {
                    console.log('✅ Venda salva no Supabase com sucesso!');
                } else {
                    console.log('⚠️ Venda salva apenas localmente:', saveResult.error || 'Usuário offline');
                }
                
                // SEGUNDO: Salvar dados localmente (sincroniza com Supabase)
                StateManager.setState({
                    sales: [...(currentSales || []), sale],
                    products: updatedProducts,
                    clients: updatedClients,
                    user: updatedUser
                });
                
                // DEPOIS: Navegar (não sincroniza)
                setTimeout(() => {
                    StateManager.setState({ currentPage: 'vendas' });
                }, 300);
                
                // Enviar para WhatsApp se marcado
                if (sendWhatsApp && clientPhone) {
                    const message = generateWhatsAppMessage(sale, saleItems, user);
                    const phoneClean = clientPhone.replace(/\D/g, '');
                    const whatsappUrl = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                }
                
                alert(`✅ Venda de R$ ${total.toFixed(2)} registrada com sucesso!`);
            });
            
            // Gerar mensagem para WhatsApp
            function generateWhatsAppMessage(sale, items, user) {
                const businessName = user?.businessName || user?.name || 'Lucro Certo';
                const date = new Date().toLocaleDateString('pt-BR');
                
                let message = `🛍️ *PEDIDO CONFIRMADO!*\n`;
                message += `━━━━━━━━━━━━━━━\n`;
                message += `Olá, *${sale.clientName}*! 💖\n\n`;
                message += `Seu pedido foi registrado com sucesso!\n\n`;
                message += `📦 *ITENS DO PEDIDO:*\n`;
                
                items.forEach((item, index) => {
                    message += `\n${index + 1}. *${item.productName}*\n`;
                    if (item.variation) {
                        message += `   📐 ${item.variation}\n`;
                    }
                    message += `   💰 R$ ${item.price.toFixed(2)} x ${item.quantity} = R$ ${(item.price * item.quantity).toFixed(2)}\n`;
                });
                
                message += `\n━━━━━━━━━━━━━━━\n`;
                message += `📋 *RESUMO:*\n`;
                message += `   Subtotal: R$ ${sale.subtotal.toFixed(2)}\n`;
                
                if (sale.shipping > 0) {
                    message += `   Frete: R$ ${sale.shipping.toFixed(2)}\n`;
                }
                if (sale.discount > 0) {
                    message += `   Desconto: -R$ ${sale.discount.toFixed(2)}\n`;
                }
                
                message += `\n💳 *TOTAL: R$ ${sale.total.toFixed(2)}*\n`;
                message += `💰 Pagamento: ${sale.paymentMethod}\n`;
                
                if (sale.notes) {
                    message += `\n📝 Obs: ${sale.notes}\n`;
                }
                
                message += `\n━━━━━━━━━━━━━━━\n`;
                message += `📅 Data: ${date}\n`;
                message += `🏪 *${businessName}*\n`;
                message += `\nObrigada pela preferência! 🙏✨`;
                
                return message;
            }
            
            // Click fora do modal
            document.getElementById('product-select-modal')?.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    e.target.style.display = 'none';
                }
            });
            
            document.getElementById('variation-select-modal')?.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    e.target.style.display = 'none';
                }
            });
            
            // ===== CADASTRO RÁPIDO DE CLIENTE =====
            document.querySelector('[data-action="quick-add-client"]')?.addEventListener('click', () => {
                document.getElementById('quick-client-modal').style.display = 'flex';
                document.getElementById('quick-client-name').value = '';
                document.getElementById('quick-client-phone').value = '';
                lucide.createIcons({ nodes: [document.getElementById('quick-client-modal')] });
            });
            
            document.querySelectorAll('[data-action="close-quick-client-modal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('quick-client-modal').style.display = 'none';
                });
            });
            
            document.querySelector('[data-action="save-quick-client"]')?.addEventListener('click', () => {
                const name = document.getElementById('quick-client-name').value.trim();
                if (!name) {
                    alert('❌ Digite o nome do cliente');
                    return;
                }
                
                const phone = document.getElementById('quick-client-phone').value.trim();
                
                const newClient = {
                    id: `cli_${Date.now()}`,
                    name: name,
                    phone: phone,
                    email: '',
                    notes: '',
                    purchases: 0,
                    totalSpent: 0,
                    createdAt: new Date().toISOString()
                };
                
                const { clients: currentClients } = StateManager.getState();
                const updatedClients = [...(currentClients || []), newClient];
                StateManager.setState({ clients: updatedClients });
                
                // Atualiza o select e campos
                const selectClient = document.getElementById('sale-client');
                const newOption = document.createElement('option');
                newOption.value = newClient.id;
                newOption.textContent = newClient.name;
                newOption.dataset.phone = phone;
                selectClient.appendChild(newOption);
                selectClient.value = newClient.id;
                
                // Preenche os campos
                document.getElementById('sale-client-name').value = name;
                document.getElementById('sale-client-phone').value = phone;
                
                document.getElementById('quick-client-modal').style.display = 'none';
            });
            
            document.getElementById('quick-client-modal')?.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    e.target.style.display = 'none';
                }
            });
        },

        // ========== PÁGINA CONTROLE FINANCEIRO ==========
        getFinanceiroHTML() {
            const { bills, debts, sales, user } = StateManager.getState();
            
            // Cálculos financeiros
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Vendas do mês (entradas)
            const monthSales = (sales || []).filter(s => {
                const d = new Date(s.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            const totalEntradas = monthSales.reduce((acc, s) => acc + s.total, 0);
            
            // Contas do mês (saídas)
            const monthBills = (bills || []).filter(b => {
                const d = new Date(b.dueDate);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            const totalSaidas = monthBills.filter(b => b.paid).reduce((acc, b) => acc + b.amount, 0);
            const pendingBills = monthBills.filter(b => !b.paid);
            const totalPendente = pendingBills.reduce((acc, b) => acc + b.amount, 0);
            
            // Saldo
            const saldo = totalEntradas - totalSaidas;
            
            // Dívidas totais
            const totalDebts = (debts || []).reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0);
            
            // Meta de poupança
            const savingsGoal = user.savingsGoal || 0;
            const savedThisMonth = user.savedThisMonth || 0;
            const dailySavingsNeeded = savingsGoal > 0 ? (savingsGoal - savedThisMonth) / (30 - now.getDate()) : 0;
            
            // Contas próximas do vencimento (7 dias)
            const upcomingBills = (bills || []).filter(b => {
                if (b.paid) return false;
                const due = new Date(b.dueDate);
                const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
            }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            
            return `
                <h2>💰 Controle Financeiro</h2>
                <p class="sub-header">Gerencie suas finanças de forma inteligente</p>
                
                <!-- Resumo Financeiro -->
                <div class="finance-summary">
                    <div class="finance-card income">
                        <div class="finance-icon"><i data-lucide="trending-up"></i></div>
                        <div class="finance-info">
                            <span class="finance-label">Entradas (mês)</span>
                            <span class="finance-value">R$ ${totalEntradas.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="finance-card expense">
                        <div class="finance-icon"><i data-lucide="trending-down"></i></div>
                        <div class="finance-info">
                            <span class="finance-label">Saídas (mês)</span>
                            <span class="finance-value">R$ ${totalSaidas.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="finance-card ${saldo >= 0 ? 'positive' : 'negative'}">
                        <div class="finance-icon"><i data-lucide="wallet"></i></div>
                        <div class="finance-info">
                            <span class="finance-label">Saldo</span>
                            <span class="finance-value">R$ ${saldo.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Alertas de Vencimento -->
                ${upcomingBills.length > 0 ? `
                    <div class="card alert-card">
                        <h3><i data-lucide="alert-circle" style="width: 20px; height: 20px; color: var(--warning);"></i> Contas Próximas</h3>
                        <div class="upcoming-bills">
                            ${upcomingBills.map(b => {
                                const due = new Date(b.dueDate);
                                const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                                const urgency = diffDays <= 2 ? 'urgent' : diffDays <= 5 ? 'warning' : '';
                                return `
                                    <div class="upcoming-bill ${urgency}">
                                        <div class="bill-info">
                                            <span class="bill-name">${b.name}</span>
                                            <span class="bill-due">${diffDays === 0 ? 'Hoje!' : diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`}</span>
                                        </div>
                                        <span class="bill-amount">R$ ${b.amount.toFixed(2)}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Meta de Poupança -->
                <div class="card">
                    <h3><i data-lucide="piggy-bank" style="width: 20px; height: 20px; vertical-align: middle;"></i> Meta de Poupança</h3>
                    ${savingsGoal > 0 ? `
                        <div class="savings-progress">
                            <div class="savings-bar">
                                <div class="savings-fill" style="width: ${Math.min(100, (savedThisMonth / savingsGoal) * 100)}%;"></div>
                            </div>
                            <div class="savings-info">
                                <span>R$ ${savedThisMonth.toFixed(2)} de R$ ${savingsGoal.toFixed(2)}</span>
                                <span class="savings-percentage">${Math.round((savedThisMonth / savingsGoal) * 100)}%</span>
                            </div>
                            ${dailySavingsNeeded > 0 ? `
                                <p class="savings-tip">💡 Guarde <strong>R$ ${dailySavingsNeeded.toFixed(2)}</strong> por dia para atingir sua meta!</p>
                            ` : `
                                <p class="savings-tip success">🎉 Parabéns! Meta atingida!</p>
                            `}
                        </div>
                    ` : `
                        <p style="color: var(--elegant-gray); margin-bottom: 16px;">Defina uma meta de quanto você quer guardar por mês.</p>
                    `}
                    <div class="form-row">
                        <div class="form-group">
                            <label>Meta mensal (R$)</label>
                            <input type="number" id="savings-goal" class="form-input" placeholder="500" value="${savingsGoal || ''}">
                        </div>
                        <div class="form-group">
                            <label>Já guardei este mês (R$)</label>
                            <input type="number" id="saved-month" class="form-input" placeholder="0" value="${savedThisMonth || ''}">
                        </div>
                    </div>
                    <button class="btn btn-primary" data-action="save-savings-goal">
                        <i data-lucide="check"></i> Salvar Meta
                    </button>
                </div>
                
                <!-- Contas a Pagar -->
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3><i data-lucide="file-text" style="width: 20px; height: 20px; vertical-align: middle;"></i> Contas a Pagar</h3>
                        <button class="btn btn-secondary btn-sm" data-action="add-bill">
                            <i data-lucide="plus"></i> Nova Conta
                        </button>
                    </div>
                    
                    ${pendingBills.length > 0 || monthBills.filter(b => b.paid).length > 0 ? `
                        <div class="bills-list">
                            ${monthBills.map(b => `
                                <div class="bill-item ${b.paid ? 'paid' : ''}">
                                    <div class="bill-check">
                                        <button class="check-btn ${b.paid ? 'checked' : ''}" data-action="toggle-bill" data-id="${b.id}">
                                            <i data-lucide="${b.paid ? 'check-circle' : 'circle'}"></i>
                                        </button>
                                    </div>
                                    <div class="bill-details">
                                        <span class="bill-name">${b.name}</span>
                                        <span class="bill-due-date">Venc: ${new Date(b.dueDate).toLocaleDateString('pt-BR')}</span>
                                        ${b.recurring ? '<span class="bill-badge">Recorrente</span>' : ''}
                                    </div>
                                    <span class="bill-amount">R$ ${b.amount.toFixed(2)}</span>
                                    <button class="btn-icon-small danger" data-action="delete-bill" data-id="${b.id}">
                                        <i data-lucide="trash-2"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <div class="bills-total">
                            <span>Pendente: <strong style="color: var(--warning);">R$ ${totalPendente.toFixed(2)}</strong></span>
                            <span>Pago: <strong style="color: var(--success);">R$ ${totalSaidas.toFixed(2)}</strong></span>
                        </div>
                    ` : `
                        <p style="color: var(--elegant-gray); text-align: center; padding: 20px;">
                            Nenhuma conta cadastrada para este mês.
                        </p>
                    `}
                </div>
                
                <!-- Dívidas/Empréstimos -->
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3><i data-lucide="credit-card" style="width: 20px; height: 20px; vertical-align: middle;"></i> Minhas Dívidas</h3>
                        <button class="btn btn-secondary btn-sm" data-action="add-debt">
                            <i data-lucide="plus"></i> Nova Dívida
                        </button>
                    </div>
                    
                    ${(debts || []).length > 0 ? `
                        <div class="debts-list">
                            ${debts.map(d => {
                                const progress = (d.paidAmount / d.totalAmount) * 100;
                                const remaining = d.totalAmount - d.paidAmount;
                                const paidInstallments = d.paidInstallments || 0;
                                return `
                                    <div class="debt-item">
                                        <div class="debt-header">
                                            <span class="debt-name">${d.name}</span>
                                            <span class="debt-remaining">Falta: R$ ${remaining.toFixed(2)}</span>
                                        </div>
                                        <div class="debt-progress">
                                            <div class="debt-bar">
                                                <div class="debt-fill" style="width: ${progress}%;"></div>
                                            </div>
                                            <span class="debt-percentage">${Math.round(progress)}%</span>
                                        </div>
                                        ${d.totalInstallments ? `
                                            <div class="debt-installments">
                                                <span>${paidInstallments} de ${d.totalInstallments} parcelas pagas</span>
                                                <button class="btn btn-sm btn-success" data-action="pay-installment" data-id="${d.id}" ${paidInstallments >= d.totalInstallments ? 'disabled' : ''}>
                                                    <i data-lucide="check"></i> Pagar Parcela
                                                </button>
                                            </div>
                                        ` : ''}
                                        <button class="btn-icon-small danger" data-action="delete-debt" data-id="${d.id}" style="position: absolute; top: 12px; right: 12px;">
                                            <i data-lucide="trash-2"></i>
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="debts-total">
                            Total em dívidas: <strong style="color: var(--alert);">R$ ${totalDebts.toFixed(2)}</strong>
                        </div>
                    ` : `
                        <p style="color: var(--elegant-gray); text-align: center; padding: 20px;">
                            🎉 Você não tem dívidas cadastradas!
                        </p>
                    `}
                </div>
                
                <!-- Modal Nova Conta -->
                <div id="bill-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i data-lucide="file-text"></i> Nova Conta</h3>
                            <button class="modal-close" data-action="close-bill-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Nome da conta *</label>
                                <input type="text" id="bill-name" class="form-input" placeholder="Ex: Aluguel, Internet...">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Valor (R$) *</label>
                                    <input type="number" id="bill-amount" class="form-input" placeholder="0.00" step="0.01">
                                </div>
                                <div class="form-group">
                                    <label>Vencimento *</label>
                                    <input type="date" id="bill-due" class="form-input">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="bill-recurring">
                                    <span>Conta recorrente (todo mês)</span>
                                </label>
                            </div>
                            <div class="form-group" id="bill-business-cost-group" style="display: none;">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="bill-business-cost" checked>
                                    <span>📊 Incluir nos custos do negócio (precificação)</span>
                                </label>
                                <p style="font-size: 12px; color: var(--elegant-gray); margin-left: 30px; margin-top: 4px;">
                                    Essa conta será considerada nas despesas para calcular o preço dos produtos
                                </p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-action="close-bill-modal">Cancelar</button>
                            <button class="btn btn-primary" data-action="save-bill">
                                <i data-lucide="check"></i> Salvar
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Modal Nova Dívida -->
                <div id="debt-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i data-lucide="credit-card"></i> Nova Dívida</h3>
                            <button class="modal-close" data-action="close-debt-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Descrição *</label>
                                <input type="text" id="debt-name" class="form-input" placeholder="Ex: Empréstimo banco, Cartão...">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Valor Total (R$) *</label>
                                    <input type="number" id="debt-total" class="form-input" placeholder="0.00" step="0.01">
                                </div>
                                <div class="form-group">
                                    <label>Já pago (R$)</label>
                                    <input type="number" id="debt-paid" class="form-input" placeholder="0.00" step="0.01" value="0">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Número de parcelas (opcional)</label>
                                <input type="number" id="debt-installments" class="form-input" placeholder="Ex: 12">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-action="close-debt-modal">Cancelar</button>
                            <button class="btn btn-primary" data-action="save-debt">
                                <i data-lucide="check"></i> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },
        
        bindFinanceiroEvents() {
            const { user } = StateManager.getState();
            
            // Salvar meta de poupança
            document.querySelector('[data-action="save-savings-goal"]')?.addEventListener('click', () => {
                const savingsGoal = parseFloat(document.getElementById('savings-goal').value) || 0;
                const savedThisMonth = parseFloat(document.getElementById('saved-month').value) || 0;
                
                const updatedUser = { ...user, savingsGoal, savedThisMonth };
                StateManager.setState({ user: updatedUser });
                alert('✅ Meta de poupança salva!');
            });
            
            // Modal de conta
            document.querySelector('[data-action="add-bill"]')?.addEventListener('click', () => {
                document.getElementById('bill-modal').style.display = 'flex';
                document.getElementById('bill-name').value = '';
                document.getElementById('bill-amount').value = '';
                document.getElementById('bill-due').value = '';
                document.getElementById('bill-recurring').checked = false;
                document.getElementById('bill-business-cost').checked = true;
                document.getElementById('bill-business-cost-group').style.display = 'none';
                lucide.createIcons({ nodes: [document.getElementById('bill-modal')] });
            });
            
            // Mostrar opção de custo do negócio quando marcar recorrente
            document.getElementById('bill-recurring')?.addEventListener('change', (e) => {
                const businessCostGroup = document.getElementById('bill-business-cost-group');
                if (businessCostGroup) {
                    businessCostGroup.style.display = e.target.checked ? 'block' : 'none';
                }
            });
            
            document.querySelectorAll('[data-action="close-bill-modal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('bill-modal').style.display = 'none';
                });
            });
            
            // Salvar conta
            document.querySelector('[data-action="save-bill"]')?.addEventListener('click', () => {
                const name = document.getElementById('bill-name').value.trim();
                const amount = parseFloat(document.getElementById('bill-amount').value);
                const dueDate = document.getElementById('bill-due').value;
                const recurring = document.getElementById('bill-recurring').checked;
                const isBusinessCost = recurring && document.getElementById('bill-business-cost').checked;
                
                if (!name || !amount || !dueDate) {
                    alert('❌ Preencha todos os campos obrigatórios');
                    return;
                }
                
                const newBill = {
                    id: `bill_${Date.now()}`,
                    name,
                    amount,
                    dueDate,
                    recurring,
                    isBusinessCost, // Nova propriedade para integração com despesas
                    paid: false,
                    createdAt: new Date().toISOString()
                };
                
                const { bills: currentBills } = StateManager.getState();
                StateManager.setState({ bills: [...(currentBills || []), newBill] });
                document.getElementById('bill-modal').style.display = 'none';
                StateManager.setState({ currentPage: 'financeiro' }); // Refresh
            });
            
            // Toggle pago/não pago
            document.querySelectorAll('[data-action="toggle-bill"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const billId = btn.dataset.id;
                    const { bills } = StateManager.getState();
                    const updatedBills = bills.map(b => 
                        b.id === billId ? { ...b, paid: !b.paid } : b
                    );
                    StateManager.setState({ bills: updatedBills });
                });
            });
            
            // Deletar conta
            document.querySelectorAll('[data-action="delete-bill"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm('Excluir esta conta?')) {
                        const billId = btn.dataset.id;
                        const { bills } = StateManager.getState();
                        StateManager.setState({ bills: bills.filter(b => b.id !== billId) });
                    }
                });
            });
            
            // Modal de dívida
            document.querySelector('[data-action="add-debt"]')?.addEventListener('click', () => {
                document.getElementById('debt-modal').style.display = 'flex';
                document.getElementById('debt-name').value = '';
                document.getElementById('debt-total').value = '';
                document.getElementById('debt-paid').value = '0';
                document.getElementById('debt-installments').value = '';
                lucide.createIcons({ nodes: [document.getElementById('debt-modal')] });
            });
            
            document.querySelectorAll('[data-action="close-debt-modal"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('debt-modal').style.display = 'none';
                });
            });
            
            // Salvar dívida
            document.querySelector('[data-action="save-debt"]')?.addEventListener('click', () => {
                const name = document.getElementById('debt-name').value.trim();
                const totalAmount = parseFloat(document.getElementById('debt-total').value);
                const paidAmount = parseFloat(document.getElementById('debt-paid').value) || 0;
                const totalInstallments = parseInt(document.getElementById('debt-installments').value) || 0;
                
                if (!name || !totalAmount) {
                    alert('❌ Preencha descrição e valor total');
                    return;
                }
                
                const paidInstallments = totalInstallments > 0 ? Math.round((paidAmount / totalAmount) * totalInstallments) : 0;
                
                const newDebt = {
                    id: `debt_${Date.now()}`,
                    name,
                    totalAmount,
                    paidAmount,
                    totalInstallments,
                    paidInstallments,
                    createdAt: new Date().toISOString()
                };
                
                const { debts: currentDebts } = StateManager.getState();
                StateManager.setState({ debts: [...(currentDebts || []), newDebt] });
                document.getElementById('debt-modal').style.display = 'none';
                StateManager.setState({ currentPage: 'financeiro' }); // Refresh
            });
            
            // Pagar parcela
            document.querySelectorAll('[data-action="pay-installment"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const debtId = btn.dataset.id;
                    const { debts } = StateManager.getState();
                    const updatedDebts = debts.map(d => {
                        if (d.id === debtId && d.paidInstallments < d.totalInstallments) {
                            const installmentValue = d.totalAmount / d.totalInstallments;
                            return {
                                ...d,
                                paidInstallments: d.paidInstallments + 1,
                                paidAmount: Math.min(d.totalAmount, d.paidAmount + installmentValue)
                            };
                        }
                        return d;
                    });
                    StateManager.setState({ debts: updatedDebts });
                });
            });
            
            // Deletar dívida
            document.querySelectorAll('[data-action="delete-debt"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm('Excluir esta dívida?')) {
                        const debtId = btn.dataset.id;
                        const { debts } = StateManager.getState();
                        StateManager.setState({ debts: debts.filter(d => d.id !== debtId) });
                    }
                });
            });
            
            // Click fora dos modais
            ['bill-modal', 'debt-modal'].forEach(modalId => {
                document.getElementById(modalId)?.addEventListener('click', (e) => {
                    if (e.target.classList.contains('modal')) {
                        e.target.style.display = 'none';
                    }
                });
            });
        },

        showAchievement(badgeId) {
            const badge = AchievementSystem.badges[badgeId];
            if (!badge) return;
            const iconContainer = document.getElementById('achievement-icon');
            iconContainer.innerHTML = `<i data-lucide="${badge.icon}"></i>`;
            iconContainer.style.color = badge.color;
            document.getElementById('achievement-title').textContent = badge.title;
            document.getElementById('achievement-description').textContent = badge.description;
            document.getElementById('achievement-modal').classList.add('visible');
            setTimeout(() => {
                lucide.createIcons({ nodes: [...iconContainer.querySelectorAll('[data-lucide]')] });
            }, 0);
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        },

        hideAchievement() { document.getElementById('achievement-modal').classList.remove('visible'); }
    };

    //==================================
    // 4. FUNCTIONAL MODULES
    //==================================
    const ProductManager = {
         getNewProductTemplate() {
            return { 
                id: generateUUID(), 
                name: '', 
                baseCost: 0, 
                finalPrice: 0, 
                variationType: 'none', 
                variations: [], 
                stock: {}, 
                images: [], // Array de múltiplas fotos
                imageUrl: '', // Foto principal (compatibilidade)
                description: '' // Descrição opcional
            };
        },
        getTotalStock(product) {
            if (product.variationType === 'none') {
                return product.stock.total || 0;
            }
            return Object.values(product.stock).reduce((acc, val) => acc + (parseInt(val, 10) || 0), 0);
        },
        // 🆕 Funções auxiliares para lidar com variações (objetos ou strings)
        getOptionLabel(opt) {
            if (opt === null || opt === undefined) return '';
            if (typeof opt === 'string') return opt;
            if (typeof opt === 'object' && !Array.isArray(opt)) {
                const label = opt.label || opt.value || opt.name;
                return label ? String(label) : '';
            }
            return String(opt);
        },
        getOptionKey(opt) {
            if (opt === null || opt === undefined) return '';
            if (typeof opt === 'string') return opt;
            if (typeof opt === 'object' && !Array.isArray(opt)) {
                const key = opt.value || opt.label || opt.name;
                return key ? String(key) : '';
            }
            return String(opt);
        }
    };
    const CostManager = {
        addFixedCost(name, value) { if (!name || !(value > 0)) return; const s = StateManager.getState(); s.costs.fixed.push({name, value}); StateManager.setState({costs: s.costs}); },
        removeFixedCost(index) { const s = StateManager.getState(); s.costs.fixed.splice(index, 1); StateManager.setState({costs: s.costs}); },
        addVariableCost(name, value, type) { if (!name || !(value > 0)) return; const s = StateManager.getState(); s.costs.variable.push({name, value, type}); StateManager.setState({costs: s.costs}); },
        removeVariableCost(index) { const s = StateManager.getState(); s.costs.variable.splice(index, 1); StateManager.setState({costs: s.costs}); }
    };
    const EmotionalIA = { generateInsight: () => "Você está no controle. Continue brilhando! ✨" };
    const SmartPricing = {
        getTotalMonthlyFixedCosts() {
            const { costs, bills } = StateManager.getState();
            
            // Custos manuais
            const manualCosts = (costs?.fixed || []).reduce((acc, cost) => acc + cost.value, 0);
            
            // Custos vindos do Financeiro (contas recorrentes marcadas como custo do negócio)
            const billsCosts = (bills || [])
                .filter(b => b.recurring && b.isBusinessCost)
                .reduce((acc, b) => acc + b.amount, 0);
            
            return manualCosts + billsCosts;
        },
        getTotalUnitCost(productCost) {
            const { user, costs } = StateManager.getState();
            const salesGoal = user.monthlySalesGoal || 1;
            const fixedCostPerUnit = this.getTotalMonthlyFixedCosts() / salesGoal;
            const variableCostPerUnit = (costs.variable || []).filter(c => c.type === 'fixed').reduce((acc, cost) => acc + cost.value, 0);
            const shippingCostPerUnit = (costs.shipping || 0) / salesGoal;
            const total = productCost + fixedCostPerUnit + variableCostPerUnit + shippingCostPerUnit;
            return { fixed: fixedCostPerUnit, variable: variableCostPerUnit, shipping: shippingCostPerUnit, total: total };
        },
        calculate(productCost, profitMarginPercentage) {
            const { costs } = StateManager.getState();
            const totalUnitCost = this.getTotalUnitCost(productCost).total;
            const variablePercentageSum = (costs.variable || []).filter(c => c.type === 'percentage').reduce((acc, cost) => acc + cost.value, 0);
            const numerator = totalUnitCost * (1 + profitMarginPercentage / 100);
            const denominator = 1 - (variablePercentageSum / 100);
            const price = numerator / (denominator || 1);
            const profit = price - totalUnitCost - (price * variablePercentageSum / 100);
            return { price: isNaN(price) ? 0 : price, profit: isNaN(profit) ? 0 : profit };
        },
    };

    const AchievementSystem = {
        badges: {
            'primeiro_acesso': { title: 'Bem-vinda, Poderosa!', description: 'Você deu o primeiro passo para o controle total!', icon: 'party-popper', color: '#FFD700' },
            'primeiro_produto': { title: 'Primeiro Produto Cadastrado!', description: 'Isso aí! Seu império está começando a tomar forma.', icon: 'package-plus', color: '#E91E63' },
             'meta_definida': { title: 'Sonho Grande!', description: 'Meta definida! Agora é foco na conquista.', icon: 'target', color: '#E91E63' }
        },
        checkAndAward(action) {
            const { achievements } = StateManager.getState();
            if (!achievements.includes(action)) {
                StateManager.setState({ achievements: [...achievements, action] });
                UIManager.showAchievement(action);
            }
        }
    };
    
    //==================================
    // 5. EVENT BINDING
    //==================================
    function bindEvents() {
        const appContainer = document.getElementById('app-container');
        
        appContainer.addEventListener('click', e => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            const route = target.dataset.route;
            const productId = target.dataset.id;
            
            const actions = {
                'navigate': () => {
                    StateManager.setState({ currentPage: route });
                    UIManager.toggleMenu(false); // Fecha o menu ao navegar
                },
                'toggle-menu': () => UIManager.toggleMenu(),
                'close-menu': () => UIManager.toggleMenu(false),
                'logout': () => {
                    if (confirm('Deseja realmente sair da sua conta?')) {
                        // 🚨 CRÍTICO: Apenas remove auth, NÃO apaga dados do app
                        Storage.remove('auth');
                        Storage.remove('logged');
                        Storage.remove('user_id');
                        console.log('👋 Logout via menu');
                        window.location.href = 'login';
                    }
                },
                'add-new-product': () => { StateManager.setState({ currentPage: 'add-edit-product', editingProductId: null }); },
                'edit-product': () => { StateManager.setState({ currentPage: 'add-edit-product', editingProductId: productId }); },
                'cancel-product-edit': () => { StateManager.setState({ currentPage: 'produtos', editingProductId: null }); },
                'save-goal': () => {
                    const newGoal = document.getElementById('monthly-goal').value;
                    const user = { ...StateManager.getState().user, monthlyGoal: parseFloat(newGoal) };
                    StateManager.setState({ user });
                    AchievementSystem.checkAndAward('meta_definida');
                },
                'remove-fixed-cost': () => CostManager.removeFixedCost(parseInt(target.dataset.index)),
                'remove-variable-cost': () => CostManager.removeVariableCost(parseInt(target.dataset.index)),
            };
            
            if (actions[action]) actions[action]();
        });

        document.getElementById('achievement-close-btn').addEventListener('click', UIManager.hideAchievement);
    }

    //==================================
    // 6. INITIALIZATION
    //==================================
    function init() {
        // ✅ VERIFICAR SE É ACESSO VIA TRIAL (?trial=true)
        const urlParams = new URLSearchParams(window.location.search);
        const isTrialAccess = urlParams.get('trial') === 'true';
        
        if (isTrialAccess) {
            console.log('🧪 Acesso via trial detectado - ativando modo trial');
            Storage.set('trial', 'true');
            Storage.set('trial_start', new Date().toISOString());
            // Limpar parâmetro da URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // 🔍 VERIFICAÇÃO DE INTEGRIDADE - Corrige dados corrompidos
        DataRecovery.verifyUserId();
        
        // �🔑 CRÍTICO: Garantir que user_id sempre existe ANTES de tudo
        let userId = Storage.get('user_id');
        const authData = Storage.get('auth', {});
        
        if (!userId && authData.email) {
            // Gerar ID único baseado no email
            userId = btoa(authData.email).substring(0, 12);
            Storage.set('user_id', userId);
            console.log('🔑 user_id gerado:', userId);
        }
        
        // Se ainda não tem userId mas tem authData.userId, usa ele
        if (!userId && authData.userId) {
            userId = authData.userId;
            Storage.set('user_id', userId);
            console.log('🔑 user_id recuperado do auth:', userId);
        }
        
        // 🔥 NOVO: Carregar dados do Supabase primeiro
        // 🚨 ATIVA FLAG para não sobrescrever dados durante carregamento
        StateManager.isLoadingFromSupabase = true;
        
        loadDataFromSupabase(userId).then(() => {
            // 🚨 DESATIVA FLAG após carregamento completo
            StateManager.isLoadingFromSupabase = false;
            console.log('✅ Flag de carregamento desativada - sincronização liberada');
            
            continueInit(userId, authData);
        }).catch(error => {
            StateManager.isLoadingFromSupabase = false;
            console.error('❌ Erro no carregamento:', error);
            continueInit(userId, authData);
        });
    }
    
    // 🔥 NOVO: Carregar dados do banco
    async function loadDataFromSupabase(userId) {
        const authData = Storage.get('auth', {});
        const userEmail = authData.email;
        
        if (!userId && !userEmail) {
            console.log('⚠️ Sem userId e sem email - pulando carregamento do Supabase');
            return;
        }
        
        if (!window.supabase) {
            console.log('⚠️ Supabase client não disponível - usando dados locais');
            return;
        }
        
        try {
            console.log('☁️ Carregando dados do Supabase...');
            console.log('   userId:', userId);
            console.log('   email:', userEmail);
            
            // 🔑 PRIMEIRO: Buscar o usuário pelo EMAIL para obter o ID correto do banco
            let dbUserId = userId;
            if (userEmail) {
                const userByEmail = await supabase.select('usuarios', { 
                    filters: { email: userEmail.toLowerCase() },
                    limit: 1
                });
                
                if (userByEmail.data && userByEmail.data.length > 0) {
                    dbUserId = userByEmail.data[0].id;
                    console.log('🔑 ID do usuário no banco:', dbUserId);
                    
                    // Atualiza o userId local para usar o do banco
                    if (dbUserId !== userId) {
                        Storage.set('user_id', dbUserId);
                        console.log('🔄 user_id local atualizado para:', dbUserId);
                    }
                }
            }
            
            // Buscar produtos usando o ID correto do banco
            const productsResult = await supabase.select('produtos', { 
                filters: { usuario_id: dbUserId, ativo: true }
            });
            console.log('📦 Produtos do banco:', productsResult.data?.length || 0);
            
            // Buscar clientes
            const clientsResult = await supabase.select('clientes', { 
                filters: { usuario_id: dbUserId }
            });
            console.log('👥 Clientes do banco:', clientsResult.data?.length || 0);
            
            // Buscar vendas
            const salesResult = await supabase.select('vendas', { 
                filters: { usuario_id: dbUserId }
            });
            console.log('💰 Vendas do banco:', salesResult.data?.length || 0);
            
            // Buscar dados do usuário
            const userResult = await supabase.select('usuarios', { 
                filters: { id: dbUserId },
                limit: 1
            });
            console.log('👤 Dados do usuário:', userResult.data?.[0]?.nome || 'Não encontrado');
            
            // Converter dados do Supabase para formato do app
            const supabaseData = {
                products: (productsResult.data || []).map(p => ({
                    id: p.id,
                    name: p.nome,
                    description: p.descricao,
                    category: p.categoria,
                    baseCost: parseFloat(p.custo_base),
                    finalPrice: parseFloat(p.preco_venda),
                    profitMargin: p.margem_lucro,
                    variationType: p.tipo_variacao,
                    variations: p.variacoes || [],
                    stock: p.estoque || {},
                    images: p.imagens || [],
                    imageUrl: p.imagem_url,
                    variationImages: p.imagens_variacoes || {}
                })),
                clients: (clientsResult.data || []).map(c => ({
                    id: c.id,
                    name: c.nome,
                    phone: c.telefone,
                    email: c.email,
                    address: c.endereco,
                    city: c.cidade,
                    state: c.estado,
                    notes: c.notas,
                    tags: c.tags || []
                })),
                sales: (salesResult.data || []).map(s => ({
                    id: s.id,
                    clientId: s.cliente_id,
                    products: s.produtos || [],
                    total: parseFloat(s.valor_total),
                    status: s.status,
                    paymentMethod: s.metodo_pagamento,
                    date: s.data_venda,
                    notes: s.notas
                })),
                _version: Date.now(),
                _source: 'supabase'
            };
            
            // 🆕 MELHORADO: Mesclar baseado em timestamp
            const currentState = DataManager.load('appState') || {};
            
            // Se dados locais são mais recentes, avisar no console mas não sobrescrever
            if (currentState._version && currentState._version > supabaseData._version) {
                console.log('⚠️ Dados locais são mais recentes - mantendo local');
                return; // Não sobrescrever
            }
            
            // Dados do Supabase são mais recentes ou não temos versão local
            const mergedState = {
                ...currentState,
                products: supabaseData.products.length > 0 ? supabaseData.products : currentState.products || [],
                clients: supabaseData.clients.length > 0 ? supabaseData.clients : currentState.clients || [],
                sales: supabaseData.sales.length > 0 ? supabaseData.sales : currentState.sales || [],
                _version: supabaseData._version,
                _source: 'supabase',
                user: userResult.data?.[0] ? {
                    name: currentState.user?.name || userResult.data[0].nome || 'Empreendedora',
                    businessName: userResult.data[0].nome,
                    email: userResult.data[0].email,
                    phone: userResult.data[0].telefone,
                    profilePhoto: userResult.data[0].foto_perfil,
                    catalogLogo: userResult.data[0].logo_catalogo,
                    plan: userResult.data[0].plano_atual
                } : { ...currentState.user }
            };
            DataManager.save('appState', mergedState);
            console.log('✅ Dados carregados do Supabase e salvos localmente!');
        } catch (error) {
            console.error('❌ Erro ao carregar do Supabase:', error);
            console.log('ℹ️ Continuando com dados locais...');
        }
    }
    
    function continueInit(userId, authData) {
        let savedState = DataManager.load('appState');
        
        // 🚨 CRÍTICO: Verificar se tem dados REAIS (não vazios)
        const temDadosReais = savedState && 
                             savedState.products && 
                             savedState.products.length > 0;
        
        console.log('📊 Estado ao iniciar:', {
            temSavedState: !!savedState,
            produtos: savedState?.products?.length || 0,
            clientes: savedState?.clients?.length || 0,
            vendas: savedState?.sales?.length || 0,
            temDadosReais
        });
        
        if (!savedState || !savedState.costs) {
            // Primeiro acesso - criar estrutura básica SEM produtos de demo
            console.log('🆕 Primeiro acesso - criando estrutura vazia');
            const InitialData = {
                user: { 
                    name: authData.nome || authData.name || 'Empreendedora', 
                    email: authData.email || '',
                    monthlyGoal: 8000, 
                    currentRevenue: 0, 
                    monthlySalesGoal: 100 
                },
                products: [], // 🚨 SEM produtos de demo - usuário vai criar os seus
                clients: [],
                sales: [],
                costs: {
                    fixed: [],
                    variable: [],
                    shipping: 0
                },
                achievements: [],
                currentPage: 'dashboard'
            };
            StateManager.setState(InitialData);
        } else {
            // Tem dados salvos - usar eles
            console.log('📂 Usando dados salvos:', savedState.products?.length || 0, 'produtos');
            
            // Garantir que sempre inicie no dashboard
            savedState.currentPage = 'dashboard';
            
            // 🔑 SINCRONIZAR nome e email do authData com o state
            if (!savedState.user) savedState.user = {};
            if (authData.nome && !savedState.user.name) savedState.user.name = authData.nome;
            if (authData.email && !savedState.user.email) savedState.user.email = authData.email;
            
            StateManager.setState(savedState);
        }
        
        UIManager.init();
        UIManager.updateActiveContent();
        UIManager.updateNav();
        bindEvents();
        AchievementSystem.checkAndAward('primeiro_acesso');
        
        // Sincronizar plano com banco de dados ANTES de inicializar trial
        syncUserPlanFromDatabase().then(() => {
            // Só inicializar Trial Banner DEPOIS do sync terminar
            initTrialMode();
        });
    }

    //==================================
    // 7. SYNC USER PLAN FROM DATABASE
    //==================================
    async function syncUserPlanFromDatabase() {
        const userId = Storage.get('user_id');
        const authData = Storage.get('auth', {});
        const email = authData.email;

        // Se é usuário trial offline (trial_timestamp), não precisa sincronizar
        if (userId && userId.startsWith('trial_')) {
            console.log('🧪 Usuário trial offline - Skip sync');
            return;
        }

        if (!userId && !email) return; // Sem dados para sincronizar

        try {
            const response = await fetch('/.netlify/functions/get-user-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email })
            });

            if (!response.ok) return;

            const data = await response.json();
            
            if (data.success) {
                console.log('📊 SYNC - Dados recebidos do servidor:', data.subscription);
                
                // Atualizar localStorage com dados do banco
                const updatedAuth = {
                    ...authData,
                    userId: data.user.id,
                    plano: data.subscription.plano,
                    planoNome: data.subscription.planoNome,
                    status: data.subscription.status,
                    isExpired: data.subscription.isExpired,
                    daysLeft: data.subscription.daysLeft,
                    limits: data.limits,
                    features: data.features
                };
                
                Storage.set('auth', updatedAuth);
                Storage.set('user_id', data.user.id);
                
                console.log('📊 SYNC - Plano do usuário:', data.subscription.plano);
                console.log('📊 SYNC - É trial?', data.subscription.isTrial);
                
                // ✅ CORREÇÃO: Atualizar flags de trial CORRETAMENTE
                if (data.subscription.isTrial || data.subscription.plano === 'trial') {
                    Storage.set('trial', 'true');
                    console.log('🧪 SYNC - Trial ATIVADO');
                } else {
                    // ✅ PLANO PAGO - REMOVER TRIAL FORÇADAMENTE
                    Storage.remove('trial');
                    Storage.remove('trial_start');
                    console.log('✅ SYNC - Trial REMOVIDO (plano pago:', data.subscription.plano + ')');
                }

                // Se trial expirou, mostrar modal
                if (data.subscription.isExpired && data.subscription.isTrial) {
                    if (typeof PlanManager !== 'undefined') {
                        PlanManager.showTrialExpiredModal();
                    }
                }

                console.log('✅ Plano sincronizado:', data.subscription.plano);
            }
        } catch (error) {
            console.log('Offline: usando dados locais');
        }
    }

    //==================================
    // 8. TRIAL MODE FUNCTIONS
    //==================================
    function initTrialMode() {
        // ✅ VERIFICAÇÃO RIGOROSA: Só inicializar trial se flag existir E não tiver plano pago
        const authData = Storage.get('auth', {});
        const isTrial = Storage.get('trial') === true || Storage.get('trial') === 'true';
        
        // 🛑 SE USUÁRIO TEM PLANO PAGO, NÃO MOSTRAR NADA DE TRIAL
        if (authData.plano && authData.plano !== 'trial') {
            console.log('🚫 initTrialMode: Usuário tem plano PAGO (' + authData.plano + ') - Banner trial NÃO será criado');
            // Limpar qualquer flag trial que esteja sobrando
            Storage.remove('trial');
            Storage.remove('trial_start');
            // Remover banner se existir
            const existingBanner = document.getElementById('trial-banner');
            if (existingBanner) {
                existingBanner.remove();
                document.body.classList.remove('has-trial-banner');
                document.body.classList.remove('has-trial-banner-compact');
            }
            return; // ⛔ PARAR AQUI
        }
        
        // 🧪 Só continuar se for realmente trial
        if (!isTrial) {
            console.log('🚫 initTrialMode: Flag trial não está ativa - Banner NÃO será criado');
            return;
        }
        
        console.log('🧪 initTrialMode: Modo TRIAL ativo - Criando banner...');
        
        // 🎯 Calcular dias restantes usando data de expiração do banco
        const trialEndDate = Storage.get('trial_end'); // Data de expiração do banco
        const trialStartDate = Storage.get('trial_start'); // Data de início
        let daysLeft = 7;
        
        if (trialEndDate) {
            // USAR DATA DE EXPIRAÇÃO DO BANCO (mais confiável)
            const endDate = new Date(trialEndDate);
            const today = new Date();
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysLeft = Math.max(0, diffDays);
            
            console.log('📅 Data expiração trial:', endDate.toLocaleDateString('pt-BR'));
            console.log('📊 Dias restantes calculados:', daysLeft);
        } else if (trialStartDate) {
            // FALLBACK: Calcular baseado na data de início (se não tiver expiração)
            const startDate = new Date(trialStartDate);
            const today = new Date();
            const diffTime = today - startDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            daysLeft = Math.max(0, 7 - diffDays);
            
            console.log('📅 Data início trial:', startDate.toLocaleDateString('pt-BR'));
            console.log('📊 Dias restantes (calculado por início):', daysLeft);
        } else {
            // PRIMEIRA VEZ - Salvar data de início
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 7);
            
            Storage.set('trial_start', startDate.toISOString());
            Storage.set('trial_end', endDate.toISOString());
            
            console.log('✨ Primeira vez no trial - Salvando datas...');
            console.log('📅 Início:', startDate.toLocaleDateString('pt-BR'));
            console.log('📅 Expiração:', endDate.toLocaleDateString('pt-BR'));
        }

        // ⚠️ SE TRIAL EXPIROU - BLOQUEAR COMPLETAMENTE O APP
        if (daysLeft === 0) {
            blockAppAndShowExpiredModal();
            return; // Não criar banner, só modal
        }
        
        // Definir cor do banner baseado nos dias restantes
        let bannerColor, bannerIcon, bannerMessage;
        if (daysLeft >= 3) {
            // 7-3 dias: Verde/Roxo - tudo bem
            bannerColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            bannerIcon = 'sparkles';
            bannerMessage = `<strong>Teste Grátis</strong> - ${daysLeft} dias restantes`;
        } else if (daysLeft === 2) {
            // 2 dias: Amarelo - aviso leve
            bannerColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            bannerIcon = 'clock';
            bannerMessage = `<strong>⚠️ Seu teste expira em 2 dias!</strong> Faça upgrade para não perder acesso`;
        } else if (daysLeft === 1) {
            // 1 dia: Laranja - aviso urgente
            bannerColor = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
            bannerIcon = 'alert-triangle';
            bannerMessage = `<strong>🔥 ÚLTIMO DIA de teste!</strong> Assine agora para continuar usando`;
        }
        
        const isDashboard = window.location.pathname.includes('app.html') || 
                           window.location.pathname === '/app' ||
                           window.location.pathname === '/app/';
        
        const trialBanner = document.createElement('div');
        trialBanner.id = 'trial-banner';
        
        if (isDashboard) {
            // Banner completo na dashboard
            trialBanner.innerHTML = `
                <div class="trial-banner-content">
                    <span><i data-lucide="${bannerIcon}"></i> ${bannerMessage}</span>
                    <a href="/planos.html" class="trial-upgrade-btn">Assinar Agora</a>
                </div>
            `;
            trialBanner.style.cssText = `
                position: fixed;
                top: 60px;
                left: 0;
                right: 0;
                background: ${bannerColor};
                color: white;
                padding: 12px 20px;
                z-index: 999;
                font-size: 13px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            `;
            
            const bannerContent = trialBanner.querySelector('.trial-banner-content');
            bannerContent.style.cssText = `
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 16px;
                flex-wrap: wrap;
            `;
            
            const upgradeBtn = trialBanner.querySelector('.trial-upgrade-btn');
            upgradeBtn.style.cssText = `
                background: white;
                color: #667eea;
                padding: 6px 16px;
                border-radius: 20px;
                text-decoration: none;
                font-weight: 600;
                font-size: 12px;
                white-space: nowrap;
            `;
        } else {
            // Banner compacto nas outras páginas
            trialBanner.innerHTML = `
                <div class="trial-banner-compact">
                    <i data-lucide="clock"></i> Teste Grátis: ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} restantes
                    <a href="/planos?source=trial_compact" style="color: white; text-decoration: underline; margin-left: 8px;">Fazer upgrade</a>
                </div>
            `;
            trialBanner.style.cssText = `
                position: fixed;
                top: 60px;
                left: 0;
                right: 0;
                background: rgba(102, 126, 234, 0.95);
                color: white;
                padding: 6px 20px;
                z-index: 999;
                font-size: 12px;
                text-align: center;
                box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            `;
            
            const compactContent = trialBanner.querySelector('.trial-banner-compact');
            compactContent.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            `;
        }
        
        document.body.prepend(trialBanner);
        
        // Adicionar padding ao main-content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.paddingTop = isDashboard ? '50px' : '30px';
        }
        
        document.body.classList.add('has-trial-banner');
        if (!isDashboard) {
            document.body.classList.add('has-trial-banner-compact');
        }
        
        setTimeout(() => lucide.createIcons({ nodes: [trialBanner] }), 100);
        
        // Mostrar contador de produtos no banner
        updateTrialProductCounter();
    }
    
    function updateTrialProductCounter() {
        const isTrial = Storage.get('trial') === 'true';
        if (!isTrial) return;
        
        const state = StateManager.getState();
        const productCount = state.products ? state.products.length : 0;
        const banner = document.getElementById('trial-banner');
        
        if (banner) {
            const span = banner.querySelector('span');
            if (span) {
                span.innerHTML = `<i data-lucide="sparkles"></i> <strong>Modo Teste Grátis</strong> - ${productCount}/3 produtos cadastrados`;
                lucide.createIcons({ nodes: [banner] });
            }
        }
    }
    
    // Sobrescrever o subscribe para atualizar contador
    const originalSubscribe = StateManager.notifySubscribers.bind(StateManager);
    StateManager.notifySubscribers = function() {
        originalSubscribe();
        updateTrialProductCounter();
    };
    
    function showTrialLimitModal() {
        // Remover modal existente se houver
        const existingModal = document.getElementById('trial-limit-modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'trial-limit-modal';
        modal.innerHTML = `
            <div class="trial-modal-backdrop" onclick="closeTrialLimitModal()"></div>
            <div class="trial-modal-content">
                <div class="trial-modal-icon">🚀</div>
                <h2>Você está arrasando!</h2>
                <p>Você atingiu o limite de <strong>3 produtos</strong> do teste grátis.</p>
                <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
                    Para cadastrar produtos ilimitados e ter acesso a todas as funcionalidades premium, assine um de nossos planos!
                </p>
                <div class="trial-modal-benefits">
                    <div class="benefit"><i data-lucide="check-circle"></i> Produtos ilimitados</div>
                    <div class="benefit"><i data-lucide="check-circle"></i> Catálogo online profissional</div>
                    <div class="benefit"><i data-lucide="check-circle"></i> Relatórios avançados</div>
                    <div class="benefit"><i data-lucide="check-circle"></i> Suporte prioritário</div>
                </div>
                <div class="trial-modal-buttons">
                    <a href="planos?source=limit_modal" class="btn-upgrade">Ver Planos</a>
                    <button onclick="closeTrialLimitModal()" class="btn-later">Depois</button>
                </div>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            #trial-limit-modal .trial-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(5px);
            }
            #trial-limit-modal .trial-modal-content {
                position: relative;
                background: white;
                border-radius: 24px;
                padding: 40px;
                max-width: 420px;
                width: 100%;
                text-align: center;
                animation: modalPop 0.3s ease;
            }
            @keyframes modalPop {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            #trial-limit-modal .trial-modal-icon {
                font-size: 60px;
                margin-bottom: 16px;
            }
            #trial-limit-modal h2 {
                font-size: 24px;
                font-weight: 700;
                color: #1a1a2e;
                margin-bottom: 12px;
            }
            #trial-limit-modal p {
                color: #37474F;
                margin-bottom: 8px;
            }
            #trial-limit-modal .trial-modal-benefits {
                background: #f8f8fc;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 24px;
                text-align: left;
            }
            #trial-limit-modal .benefit {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                color: #37474F;
                padding: 8px 0;
            }
            #trial-limit-modal .benefit svg {
                width: 18px;
                height: 18px;
                color: #4CAF50;
            }
            #trial-limit-modal .trial-modal-buttons {
                display: flex;
                gap: 12px;
            }
            #trial-limit-modal .btn-upgrade {
                flex: 1;
                padding: 14px 24px;
                background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 15px;
                text-decoration: none;
                cursor: pointer;
                transition: all 0.2s;
            }
            #trial-limit-modal .btn-upgrade:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(233, 30, 99, 0.3);
            }
            #trial-limit-modal .btn-later {
                padding: 14px 24px;
                background: #f4f6f8;
                color: #607D8B;
                border: none;
                border-radius: 12px;
                font-weight: 500;
                cursor: pointer;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        setTimeout(() => lucide.createIcons({ nodes: [modal] }), 100);
    }
    
    function closeTrialLimitModal() {
        const modal = document.getElementById('trial-limit-modal');
        if (modal) modal.remove();
    }
    
    // Tornar função global
    window.closeTrialLimitModal = closeTrialLimitModal;
    
    function showTrialLimitReachedBanner() {
        const existingBanner = document.getElementById('trial-limit-reached');
        if (existingBanner) return;
        
        const banner = document.createElement('div');
        banner.id = 'trial-limit-reached';
        banner.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                <span>🎉 <strong>Parabéns!</strong> Você cadastrou 3 produtos! Para continuar, faça upgrade do seu plano.</span>
                <a href="planos?source=achievement_modal" style="background: white; color: #FF9800; padding: 8px 20px; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 13px;">Ver Planos</a>
            </div>
        `;
        banner.style.cssText = `
            background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
            color: white;
            padding: 12px 20px;
            font-size: 14px;
            position: fixed;
            bottom: 80px;
            left: 20px;
            right: 20px;
            border-radius: 12px;
            z-index: 9998;
            box-shadow: 0 4px 20px rgba(255, 152, 0, 0.3);
            animation: slideUp 0.3s ease;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(banner);
        
        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (banner.parentNode) banner.remove();
        }, 10000);
    }

    // ============================================
    // 🚀 EVENT DELEGATION GLOBAL (Memory Leak Prevention)
    // ============================================
    // Um único event listener para todo o app (em vez de 30+)
    document.addEventListener('click', (e) => {
        // Navegação (menu lateral e bottom nav)
        const navItem = e.target.closest('[data-action="navigate"]');
        if (navItem) {
            const route = navItem.dataset.route;
            if (route) {
                StateManager.setState({ currentPage: route });
                // Fechar menu lateral no mobile
                document.body.classList.remove('menu-open');
            }
            return;
        }
        
        // Logout
        if (e.target.closest('[data-action="logout"]')) {
            if (confirm('❓ Tem certeza que deseja sair?')) {
                // 🚨 CRÍTICO: NÃO apagar dados do app!
                // Apenas remove dados de autenticação
                Storage.remove('auth');
                Storage.remove('logged');
                Storage.remove('user_id');
                // Mantém: appState, produtos, clientes, vendas, etc.
                
                console.log('👋 Logout - dados de auth removidos, dados do app mantidos');
                window.location.href = './login';
            }
            return;
        }
        
        // Toggle menu (hamburger)
        if (e.target.closest('[data-action="toggle-menu"]')) {
            document.body.classList.toggle('menu-open');
            return;
        }
        
        // Fechar menu ao clicar fora (mobile)
        if (e.target.closest('.menu-overlay')) {
            document.body.classList.remove('menu-open');
            return;
        }
        
        // Fechar modal ao clicar no X ou fora
        const modalClose = e.target.closest('[data-action="close-modal"]');
        if (modalClose) {
            const modal = modalClose.closest('.modal');
            if (modal) {
                modal.remove();
            }
            return;
        }
    });

    //==================================
    // 8. TRIAL EXPIRED - BLOQUEIO COMPLETO
    //==================================
    function blockAppAndShowExpiredModal() {
        console.log('🚫 BLOQUEANDO APP - Trial expirado');
        
        // Remover modal anterior se existir
        const existingModal = document.getElementById('trial-expired-modal');
        if (existingModal) existingModal.remove();

        // 🔒 BLOQUEAR TODA A NAVEGAÇÃO
        // Interceptar cliques antes de qualquer outro handler
        document.addEventListener('click', (e) => {
            // Permitir apenas links para checkout
            if (!e.target.closest('a[href*="checkout"]') && 
                !e.target.closest('[onclick*="checkout"]')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // Vibrar se disponível
                if (navigator.vibrate) navigator.vibrate(200);
                
                // Mostrar alerta
                const alert = document.createElement('div');
                alert.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #ef4444;
                    color: white;
                    padding: 20px 30px;
                    border-radius: 12px;
                    font-weight: 600;
                    z-index: 10001;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    animation: shake 0.5s;
                `;
                alert.textContent = '⚠️ Seu trial expirou! Assine para continuar.';
                document.body.appendChild(alert);
                
                setTimeout(() => alert.remove(), 2000);
            }
        }, true); // true = fase de captura (antes de outros handlers)

        // 🔒 BLOQUEAR TECLAS
        document.addEventListener('keydown', (e) => {
            // Permitir apenas Ctrl+C, Ctrl+V básicos
            if (!e.ctrlKey && !e.metaKey) {
                if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== 'Escape') {
                    e.preventDefault();
                }
            }
        }, true);

        // 🔒 DESABILITAR FORMULÁRIOS
        document.querySelectorAll('input, textarea, select, button').forEach(el => {
            if (!el.closest('a[href*="checkout"]')) {
                el.disabled = true;
                el.style.opacity = '0.5';
                el.style.cursor = 'not-allowed';
            }
        });

        const modal = document.createElement('div');
        modal.id = 'trial-expired-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(10px);
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                width: 100%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                ">
                    <i data-lucide="lock" style="width: 40px; height: 40px; color: white;"></i>
                </div>
                
                <h2 style="
                    font-size: 28px;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0 0 16px;
                ">Seu Teste Grátis Expirou</h2>
                
                <p style="
                    font-size: 16px;
                    color: #6b7280;
                    margin: 0 0 24px;
                    line-height: 1.6;
                ">
                    Seus <strong>7 dias de teste</strong> chegaram ao fim! 
                    <br>Seus dados estão salvos e seguros.
                    <br><br>
                    Assine agora para continuar usando <strong>TODAS as funcionalidades</strong>:
                </p>

                <div style="
                    background: #f9fafb;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 24px;
                    text-align: left;
                ">
                    <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                        <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #10b981;"></i>
                        <span>Dashboard completo com métricas</span>
                    </div>
                    <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                        <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #10b981;"></i>
                        <span>Produtos, clientes e vendas ilimitados</span>
                    </div>
                    <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                        <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #10b981;"></i>
                        <span>Precificação inteligente</span>
                    </div>
                    <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                        <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #10b981;"></i>
                        <span>Catálogo digital profissional</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #10b981;"></i>
                        <span>Relatórios e controle financeiro</span>
                    </div>
                </div>

                <a href="/checkout?source=trial_expired" style="
                    display: block;
                    background: linear-gradient(135deg, #E91E63 0%, #C2185B 100%);
                    color: white;
                    padding: 16px 32px;
                    border-radius: 12px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 16px;
                    margin-bottom: 12px;
                    transition: transform 0.2s;
                    box-shadow: 0 8px 20px rgba(233, 30, 99, 0.4);
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🚀 Assinar Agora - A partir de R$ 34,90/mês
                </a>

                <p style="
                    color: #9ca3af;
                    font-size: 12px;
                    margin-top: 16px;
                ">🔒 Esta é a única ação disponível até você assinar</p>
            </div>
        `;

        document.body.appendChild(modal);
        
        // 🔒 PREVENIR FECHAMENTO DO MODAL
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.preventDefault();
                e.stopPropagation();
                
                // Shake animation
                const content = modal.querySelector('div');
                content.style.animation = 'shake 0.5s';
                setTimeout(() => content.style.animation = '', 500);
            }
        });
        
        // Inicializar ícones Lucide
        if (window.lucide) {
            lucide.createIcons();
        }

        // Banner vermelho no topo
        const banner = document.createElement('div');
        banner.id = 'trial-expired-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 12px 20px;
            text-align: center;
            z-index: 10000;
            font-weight: 600;
            font-size: 14px;
        `;
        banner.innerHTML = `
            <i data-lucide="alert-circle" style="width: 16px; height: 16px; vertical-align: middle;"></i>
            Trial Expirado - Assine para continuar
        `;
        document.body.appendChild(banner);
        
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    return { 
        init,
        closePlanBanner: UIManager.closePlanBanner.bind(UIManager)
    };
})();

document.addEventListener('DOMContentLoaded', LucroCertoApp.init);
