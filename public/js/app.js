// JAVASCRIPT ARCHITECTURE AVANÇADA
const LucroCertoApp = (function() {
    'use strict';

    //==================================
    // 1. STATE MANAGER
    //==================================
    const StateManager = {
        state: {
            user: {},
            products: [],
            costs: {},
            achievements: [],
            currentPage: 'dashboard',
            editingProductId: null
        },
        subscribers: [],

        getState() { return this.state; },
        setState(newState) {
            this.state = { ...this.state, ...newState };
            console.log('State Updated:', this.state);
            this.notifySubscribers();
            DataManager.save('appState', this.state);
        },
        subscribe(callback) { this.subscribers.push(callback); },
        notifySubscribers() { this.subscribers.forEach(callback => callback()); }
    };

    //==================================
    // 2. DATA MANAGER
    //==================================
    const DataManager = {
        save(key, data) {
            try {
                localStorage.setItem(`lucrocerto_${key}`, JSON.stringify({ data: data, version: '1.4' }));
            } catch (error) { console.error('Erro ao salvar dados:', error); }
        },
        load(key) {
            try {
                const item = localStorage.getItem(`lucrocerto_${key}`);
                if (item) {
                    const parsed = JSON.parse(item);
                    if (parsed.version && parsed.version.startsWith('1.')) return parsed.data;
                }
            } catch (error) { console.error('Erro ao carregar dados:', error); }
            return null;
        }
    };

    //==================================
    // 3. UI RENDERER & ROUTER
    //==================================
    const UIManager = {
        pages: ['dashboard', 'produtos', 'add-edit-product', 'despesas', 'precificar', 'metas', 'relatorios'],
        navButtons: [
            { id: 'dashboard', icon: 'layout-dashboard', label: 'Início' },
            { id: 'produtos', icon: 'package-search', label: 'Produtos' },
            { id: 'despesas', icon: 'wallet', label: 'Despesas' },
            { id: 'precificar', icon: 'calculator', label: 'Precificar' },
            { id: 'metas', icon: 'target', label: 'Metas' }
        ],

        init() {
            this.renderNav();
            StateManager.subscribe(this.updateActiveContent.bind(this));
            StateManager.subscribe(this.updateNav.bind(this));
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
                    if (isActive) this.renderPage(currentPage);
                }
            });
        },

        renderPage(pageId) {
            const container = document.getElementById(pageId);
            if (!container) return;
            
            const pageRenderers = {
                dashboard: () => { container.innerHTML = this.getDashboardHTML(); this.renderDashboardCharts(); },
                produtos: () => { container.innerHTML = this.getProdutosHTML(); },
                'add-edit-product': () => { container.innerHTML = this.getAddEditProductHTML(); this.bindAddEditProductEvents(); },
                despesas: () => { container.innerHTML = this.getDespesasHTML(); this.bindDespesasEvents(); },
                precificar: () => { container.innerHTML = this.getPrecificarHTML(); this.bindPrecificarEvents(); },
                metas: () => { container.innerHTML = this.getMetasHTML(); },
                relatorios: () => { container.innerHTML = this.getRelatoriosHTML(); },
            };

            if (pageRenderers[pageId]) {
                pageRenderers[pageId]();
            }
            
            setTimeout(() => {
                lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] });
            }, 0);
        },
        
        getDashboardHTML() {
             const { user } = StateManager.getState();
            const now = new Date();
            const hour = now.getHours();
            let saudacao;
            if (hour < 12) saudacao = 'Bom dia';
            else if (hour < 18) saudacao = 'Boa tarde';
            else saudacao = 'Boa noite';

            const percentage = Math.round((user.currentRevenue / user.monthlyGoal) * 100);

            return `
                <h1>${saudacao}, ${user.name.split(' ')[0]}!</h1>
                <p class="sub-header">Pronta para conquistar o mundo hoje?</p>
                <div class="emotional-panel"><i data-lucide="sparkles"></i><span id="emotional-insight">${EmotionalIA.generateInsight()}</span></div>
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
                       <p class="text-center"><b>R$ ${user.currentRevenue.toFixed(2)}</b> de R$ ${user.monthlyGoal.toFixed(2)}</p>
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
                     <a href="#" class="action-button" data-action="navigate" data-route="precificar"> <i data-lucide="calculator"></i> <span>Precificar</span> </a>
                    <a href="#" class="action-button" data-action="add-new-product"> <i data-lucide="package-plus"></i> <span>Novo Produto</span> </a>
                    <a href="#" class="action-button" data-action="navigate" data-route="despesas"> <i data-lucide="wallet"></i> <span>Despesas</span> </a>
                    <a href="#" class="action-button" data-action="navigate" data-route="metas"> <i data-lucide="target"></i> <span>Ver Metas</span> </a>
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
                return `
                <div class="card product-card" data-action="edit-product" data-id="${p.id}">
                    <img src="${p.imageUrl || `https://placehold.co/60x60/f06292/ffffff?text=${p.name.charAt(0)}`}" class="product-card-image" alt="Imagem do produto ${p.name}">
                    <div class="product-card-info">
                        <div class="product-card-name">${p.name}</div>
                        <div class="product-card-details">
                            <span>Preço: R$ ${p.finalPrice.toFixed(2)}</span>
                            <span class="product-stock-badge">Estoque: ${totalStock}</span>
                        </div>
                    </div>
                     <i data-lucide="chevron-right"></i>
                </div>
                `;
            }).join('');
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>Meus Produtos</h2>
                    <button class="btn btn-primary" data-action="add-new-product"><i data-lucide="plus" style="margin-right:8px;"></i> Novo</button>
                </div>
                <p class="sub-header">Gerencie seu estoque e veja a performance de cada item.</p>
                <div class="product-list">
                    ${products.length > 0 ? productCards : '<p>Você ainda não cadastrou nenhum produto. Comece agora!</p>'}
                </div>
            `;
        },
        
        getAddEditProductHTML() {
            const { editingProductId, products } = StateManager.getState();
            const product = editingProductId ? products.find(p => p.id === editingProductId) : ProductManager.getNewProductTemplate();
            const pageTitle = editingProductId ? '✏️ Editar Produto' : '✨ Novo Produto';

            return `
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <button class="btn-icon" data-action="cancel-product-edit" style="margin-right: 12px;">
                        <i data-lucide="arrow-left"></i>
                    </button>
                    <h2 style="margin: 0;">${pageTitle}</h2>
                </div>

                <form id="product-form">
                    <!-- FOTO E NOME -->
                    <div class="card">
                        <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;">
                            <div style="flex-shrink: 0;">
                                <label class="image-upload-container">
                                    <input type="file" id="product-image-input" accept="image/*" style="display: none;">
                                    <div class="image-upload-preview" id="image-preview">
                                        ${product.imageUrl ? 
                                            `<img src="${product.imageUrl}" alt="Produto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">` :
                                            `<i data-lucide="camera" style="width: 32px; height: 32px; color: var(--elegant-gray);"></i>
                                            <span style="font-size: 12px; color: var(--elegant-gray); margin-top: 8px;">Adicionar Foto</span>`
                                        }
                                    </div>
                                </label>
                                <p style="font-size: 11px; color: var(--elegant-gray); text-align: center; margin-top: 8px;">Toque para adicionar</p>
                            </div>
                            <div style="flex: 1; min-width: 200px;">
                                <div class="form-group">
                                    <label for="product-name">Nome do Produto <span class="required">*</span></label>
                                    <input type="text" id="product-name" class="form-input" placeholder="Ex: Colar de Pérolas" required value="${product.name}">
                                    <small>Digite o nome que aparecerá para suas clientes</small>
                                </div>
                            </div>
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
                            <label for="profit-margin">📈 Qual lucro você quer ter? (Margem %)</label>
                            <input type="range" id="profit-margin" min="0" max="300" value="100" step="10" class="slider">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                                <span style="font-size: 14px; color: var(--dark-gray);">Margem:</span>
                                <span id="margin-display" style="font-size: 18px; font-weight: 600; color: var(--primary);">100%</span>
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
            let currentImageBase64 = currentProduct?.imageUrl || '';

            // ===== UPLOAD DE IMAGEM =====
            const imageInput = document.getElementById('product-image-input');
            const imagePreview = document.getElementById('image-preview');
            
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Validação de tamanho (máx 2MB)
                    if (file.size > 2 * 1024 * 1024) {
                        alert('❌ Imagem muito grande! Escolha uma imagem menor que 2MB.');
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        currentImageBase64 = event.target.result;
                        imagePreview.innerHTML = `<img src="${currentImageBase64}" alt="Produto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`;
                    };
                    reader.readAsDataURL(file);
                }
            });

            // ===== PRECIFICAÇÃO COM SLIDER =====
            const updatePricingUI = () => {
                const productCost = parseFloat(baseCostInput.value) || 0;
                const margin = parseInt(profitMarginInput.value) || 100;
                const container = document.getElementById('pricing-calculator-live');
                const marginDisplay = document.getElementById('margin-display');
                
                if (marginDisplay) {
                    marginDisplay.textContent = margin + '%';
                }

                if (!container) return;

                if (productCost === 0) {
                    container.innerHTML = `
                        <div style="background: var(--light-gray); padding: 16px; border-radius: 12px; text-align: center; margin-top: 16px;">
                            <i data-lucide="info" style="width: 24px; height: 24px; color: var(--elegant-gray);"></i>
                            <p style="color: var(--elegant-gray); margin-top: 8px;">Digite o custo do produto acima para ver o cálculo</p>
                        </div>
                    `;
                    setTimeout(() => lucide.createIcons({ nodes: [container] }), 0);
                    return;
                }

                const unitCosts = SmartPricing.getTotalUnitCost(productCost);
                const { price, profit } = SmartPricing.calculate(productCost, margin);
                const profitPercentageOfPrice = ((profit / price) * 100).toFixed(1);

                container.innerHTML = `
                    <div class="pricing-result-card">
                        <div class="pricing-header">
                            <i data-lucide="trending-up" style="width: 20px; height: 20px;"></i>
                            <h4>Resultado da Precificação</h4>
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
                                    Custos Fixos/Unidade
                                </span>
                                <span class="pricing-value">R$ ${unitCosts.fixed.toFixed(2)}</span>
                            </div>
                            <div class="pricing-row">
                                <span class="pricing-label">
                                    <i data-lucide="package" style="width: 16px; height: 16px;"></i>
                                    Custos Variáveis
                                </span>
                                <span class="pricing-value">R$ ${unitCosts.variable.toFixed(2)}</span>
                            </div>
                            <div class="pricing-row total">
                                <span class="pricing-label">
                                    <strong>Custo Total/Unidade</strong>
                                </span>
                                <span class="pricing-value"><strong style="color: var(--alert);">R$ ${unitCosts.total.toFixed(2)}</strong></span>
                            </div>
                        </div>

                        <div class="pricing-result">
                            <div class="result-item" style="background: linear-gradient(135deg, var(--primary-light), var(--primary));">
                                <i data-lucide="tag" style="width: 24px; height: 24px; color: white;"></i>
                                <div>
                                    <small style="color: rgba(255,255,255,0.9); font-size: 12px;">Preço de Venda</small>
                                    <strong style="color: white; font-size: 24px;">R$ ${price.toFixed(2)}</strong>
                                </div>
                            </div>
                            <div class="result-item" style="background: linear-gradient(135deg, var(--success-light), var(--success));">
                                <i data-lucide="dollar-sign" style="width: 24px; height: 24px; color: white;"></i>
                                <div>
                                    <small style="color: rgba(255,255,255,0.9); font-size: 12px;">Lucro por Venda</small>
                                    <strong style="color: white; font-size: 24px;">R$ ${profit.toFixed(2)}</strong>
                                    <small style="color: rgba(255,255,255,0.9); font-size: 11px;">${profitPercentageOfPrice}% do preço</small>
                                </div>
                            </div>
                        </div>

                        <div style="background: var(--light-gray); padding: 12px; border-radius: 8px; margin-top: 12px;">
                            <p style="font-size: 13px; color: var(--dark-gray); margin: 0;">
                                <i data-lucide="lightbulb" style="width: 14px; height: 14px; color: var(--warning);"></i>
                                <strong>Dica:</strong> Este é o preço sugerido. Você pode ajustar a margem acima conforme seu objetivo!
                            </p>
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
                                    <span style="color: var(--primary); font-weight: 600;">(Digite e pressione Enter)</span>
                                </label>
                                <input type="text" class="form-input" id="variation-options-input-1" placeholder="Digite uma opção e pressione Enter. Ex: P, M, G">
                                <small>💡 Dica: Digite uma opção por vez e pressione Enter, ou separe por vírgula (P, M, G)</small>
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
                    if (optionsInput) {
                        optionsInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = optionsInput.value.trim();
                                
                                // Aceita valores separados por vírgula
                                if (value.includes(',')) {
                                    const options = value.split(',').map(opt => opt.trim()).filter(opt => opt);
                                    options.forEach(opt => {
                                        if (!variationOptions1.includes(opt)) {
                                            variationOptions1.push(opt);
                                        }
                                    });
                                } else if (value && !variationOptions1.includes(value)) {
                                    variationOptions1.push(value);
                                }
                                
                                renderVariationTags();
                                renderStockTable();
                                optionsInput.value = '';
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
                                    <span style="color: var(--primary); font-weight: 600;">(Digite e pressione Enter)</span>
                                </label>
                                <input type="text" class="form-input" id="variation-options-input-1" placeholder="Ex: Preto, Branco, Nude">
                                <small>💡 Digite uma por vez ou separe por vírgula</small>
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
                                    <span style="color: var(--primary); font-weight: 600;">(Digite e pressione Enter)</span>
                                </label>
                                <input type="text" class="form-input" id="variation-options-input-2" placeholder="Ex: P, M, G">
                                <small>💡 Digite uma por vez ou separe por vírgula</small>
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
                    if (optionsInput1) {
                        optionsInput1.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = optionsInput1.value.trim();
                                
                                if (value.includes(',')) {
                                    const options = value.split(',').map(opt => opt.trim()).filter(opt => opt);
                                    options.forEach(opt => {
                                        if (!variationOptions1.includes(opt)) {
                                            variationOptions1.push(opt);
                                        }
                                    });
                                } else if (value && !variationOptions1.includes(value)) {
                                    variationOptions1.push(value);
                                }
                                
                                renderVariationTags(1);
                                if (variationOptions1.length > 0 && variationOptions2.length > 0) {
                                    renderCombinedStockTable();
                                }
                                optionsInput1.value = '';
                            }
                        });
                    }

                    // Event listeners para variação 2
                    const optionsInput2 = document.getElementById('variation-options-input-2');
                    if (optionsInput2) {
                        optionsInput2.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = optionsInput2.value.trim();
                                
                                if (value.includes(',')) {
                                    const options = value.split(',').map(opt => opt.trim()).filter(opt => opt);
                                    options.forEach(opt => {
                                        if (!variationOptions2.includes(opt)) {
                                            variationOptions2.push(opt);
                                        }
                                    });
                                } else if (value && !variationOptions2.includes(value)) {
                                    variationOptions2.push(value);
                                }
                                
                                renderVariationTags(2);
                                if (variationOptions1.length > 0 && variationOptions2.length > 0) {
                                    renderCombinedStockTable();
                                }
                                optionsInput2.value = '';
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

                tagsContainer.innerHTML = options.map((option, index) => `
                    <div class="variation-tag">
                        ${option}
                        <button type="button" data-remove-option="${variationNumber}-${index}">
                            <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                `).join('');

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

                tableContainer.innerHTML = `
                    <div style="margin-top: 20px;">
                        <h4 style="font-size: 14px; margin-bottom: 12px; color: var(--dark-gray);">
                            <i data-lucide="package" style="width: 16px; height: 16px; vertical-align: middle;"></i>
                            Estoque de Cada Opção
                        </h4>
                        <table class="stock-table">
                            <thead>
                                <tr>
                                    <th>Opção</th>
                                    <th style="width: 120px;">Estoque</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${variationOptions1.map(option => `
                                    <tr>
                                        <td><strong>${option}</strong></td>
                                        <td>
                                            <input type="number" class="form-input" data-stock-option="${option}" value="${currentStock[option] || 0}" min="0" placeholder="0">
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
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

                tableContainer.innerHTML = `
                    <div style="margin-top: 20px;">
                        <h4 style="font-size: 14px; margin-bottom: 12px; color: var(--dark-gray);">
                            <i data-lucide="grid" style="width: 16px; height: 16px; vertical-align: middle;"></i>
                            Estoque de Cada Combinação
                        </h4>
                        <div class="combined-stock-grid">
                            ${variationOptions1.map(opt1 => `
                                <div class="combined-stock-section">
                                    <h5 class="combined-stock-title">${opt1}</h5>
                                    ${variationOptions2.map(opt2 => {
                                        const key = `${opt1}-${opt2}`;
                                        return `
                                            <div class="combined-stock-item">
                                                <label>${opt2}</label>
                                                <input type="number" class="form-input" data-combined-stock="${key}" value="${currentStock[key] || 0}" min="0" placeholder="0">
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                setTimeout(() => lucide.createIcons({ nodes: [tableContainer] }), 0);
            };

            // ===== SUBMIT DO FORMULÁRIO =====
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                const productName = document.getElementById('product-name').value.trim();
                const productCost = parseFloat(baseCostInput.value) || 0;
                const profitMargin = parseInt(profitMarginInput.value) || 100;
                const variationType = form.querySelector('input[name="variation-type"]:checked').value;

                // Validações
                if (!productName) {
                    alert('❌ Por favor, digite o nome do produto.');
                    return;
                }

                if (productCost <= 0) {
                    alert('❌ Por favor, digite o custo do produto.');
                    return;
                }

                // Monta objeto do produto
                const finalPrice = SmartPricing.calculate(productCost, profitMargin).price;
                
                const productData = {
                    id: editingProductId || `prod_${Date.now()}`,
                    name: productName,
                    baseCost: productCost,
                    profitMargin: profitMargin,
                    finalPrice: finalPrice,
                    variationType: variationType,
                    variations: [],
                    stock: {},
                    imageUrl: currentImageBase64
                };

                // Processa estoque baseado no tipo de variação
                if (variationType === 'none') {
                    const stockTotal = parseInt(document.getElementById('stock-total')?.value) || 0;
                    productData.stock = { total: stockTotal };
                } else if (variationType === 'simple') {
                    const variationName = document.getElementById('variation-name-1')?.value.trim();
                    
                    if (!variationName) {
                        alert('❌ Por favor, digite o nome da variação (ex: Tamanho, Cor).');
                        return;
                    }

                    if (variationOptions1.length === 0) {
                        alert('❌ Por favor, adicione pelo menos uma opção de variação.');
                        return;
                    }

                    productData.variations = [{ name: variationName, options: variationOptions1 }];
                    
                    variationOptions1.forEach(option => {
                        const stockInput = document.querySelector(`[data-stock-option="${option}"]`);
                        productData.stock[option] = parseInt(stockInput?.value) || 0;
                    });
                } else if (variationType === 'combined') {
                    const variationName1 = document.getElementById('variation-name-1')?.value.trim();
                    const variationName2 = document.getElementById('variation-name-2')?.value.trim();
                    
                    if (!variationName1 || !variationName2) {
                        alert('❌ Por favor, preencha os nomes das duas variações.');
                        return;
                    }

                    if (variationOptions1.length === 0 || variationOptions2.length === 0) {
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
                }

                // Salva ou atualiza produto
                const state = StateManager.getState();
                let updatedProducts;

                if (editingProductId) {
                    updatedProducts = state.products.map(p => p.id === editingProductId ? productData : p);
                } else {
                    updatedProducts = [...state.products, productData];
                    AchievementSystem.checkAndAward('primeiro_produto');
                }

                StateManager.setState({ 
                    products: updatedProducts,
                    currentPage: 'produtos',
                    editingProductId: null
                });
            });

            // Event listeners
            baseCostInput.addEventListener('input', updatePricingUI);
            profitMarginInput.addEventListener('input', updatePricingUI);
            variationRadios.forEach(radio => radio.addEventListener('change', updateVariationUI));
            
            // Inicializa
            updateVariationUI();
            updatePricingUI();
        },
            const currentProduct = editingProductId ? products.find(p => p.id === editingProductId) : null;
            const baseCostInput = document.getElementById('product-base-cost');
            const variationRadios = form.querySelectorAll('input[name="variation-type"]');
            
            let variationOptions = [];

            // Atualiza cálculo de preço ao vivo
            const updatePricingUI = () => {
                const productCost = parseFloat(baseCostInput.value) || 0;
                const container = document.getElementById('pricing-calculator-live');
                if (!container) return;

                if (productCost === 0) {
                    container.innerHTML = `<p style="color: var(--elegant-gray); font-size: 14px;">Digite o custo do produto para ver o preço sugerido.</p>`;
                    return;
                }

                const margin = 100; // Margem padrão de 100%
                const unitCosts = SmartPricing.getTotalUnitCost(productCost);
                const { price, profit } = SmartPricing.calculate(productCost, margin);

                container.innerHTML = `
                    <div style="background: var(--light-gray); padding: 16px; border-radius: 12px; margin-top: 12px;">
                        <h4 style="font-size: 14px; margin-bottom: 8px; color: var(--dark-gray);">💡 Sugestão de Preço</h4>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 14px;">Custo Total/Unidade:</span>
                            <strong style="color: var(--alert);">R$ ${unitCosts.total.toFixed(2)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 14px;">Preço Sugerido (100%):</span>
                            <strong style="color: var(--primary);">R$ ${price.toFixed(2)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-size: 14px;">Lucro por Venda:</span>
                            <strong style="color: var(--growth);">R$ ${profit.toFixed(2)}</strong>
                        </div>
                        <p style="font-size: 12px; color: var(--elegant-gray); margin-top: 8px;">Use a página "Precificar" para ajustar a margem de lucro.</p>
                    </div>
                `;
            };

            // Atualiza interface de variações
            const updateVariationUI = () => {
                const selectedType = form.querySelector('input[name="variation-type"]:checked').value;
                const container = document.getElementById('stock-management-area');
                variationOptions = [];

                if (selectedType === 'none') {
                    const currentStock = currentProduct && currentProduct.variationType === 'none' ? (currentProduct.stock.total || 0) : 0;
                    container.innerHTML = `<div class="form-group"><label>Estoque Total</label><input type="number" class="form-input" id="stock-total" placeholder="Ex: 50" value="${currentStock}" min="0"></div>`;
                } else if (selectedType === 'simple') {
                    const currentVariation = currentProduct && currentProduct.variationType === 'simple' ? currentProduct.variations[0] : null;
                    const variationName = currentVariation ? currentVariation.name : '';
                    
                    container.innerHTML = `
                        <div class="form-group">
                            <label>Nome da Variação (Ex: Tamanho, Cor)</label>
                            <input type="text" class="form-input" id="variation-name-1" placeholder="Ex: Tamanho" value="${variationName}">
                        </div>
                        <div class="form-group">
                            <label>Opções (Digite e pressione Enter)</label>
                            <input type="text" class="form-input" id="variation-options-input-1" placeholder="Ex: P, M, G...">
                            <div class="variation-options-container" id="variation-options-tags-1"></div>
                        </div>
                        <div id="simple-stock-table"></div>
                    `;

                    // Carrega opções existentes
                    if (currentVariation && currentVariation.options) {
                        variationOptions = [...currentVariation.options];
                        renderVariationTags();
                        renderStockTable();
                    }

                    // Event listener para adicionar opção
                    const optionsInput = document.getElementById('variation-options-input-1');
                    if (optionsInput) {
                        optionsInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = optionsInput.value.trim();
                                if (value && !variationOptions.includes(value)) {
                                    variationOptions.push(value);
                                    renderVariationTags();
                                    renderStockTable();
                                    optionsInput.value = '';
                                }
                            }
                        });
                    }
                } else if (selectedType === 'combined') {
                    container.innerHTML = `
                        <div style="background: var(--light-gray); padding: 20px; border-radius: 12px; text-align: center;">
                            <i data-lucide="construction" style="color: var(--elegant-gray); margin-bottom: 10px;"></i>
                            <p style="color: var(--elegant-gray);">Variação Combinada em desenvolvimento.</p>
                            <p style="color: var(--elegant-gray); font-size: 14px; margin-top: 8px;">Em breve você poderá combinar múltiplas variações (Ex: Cor + Tamanho).</p>
                        </div>
                    `;
                    setTimeout(() => lucide.createIcons({ nodes: [container] }), 0);
                }
            };

            // Renderiza tags de variações
            const renderVariationTags = () => {
                const tagsContainer = document.getElementById('variation-options-tags-1');
                if (!tagsContainer) return;

                tagsContainer.innerHTML = variationOptions.map((option, index) => `
                    <div class="variation-tag">
                        ${option}
                        <button type="button" data-remove-option="${index}">
                            <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                `).join('');

                // Event listeners para remover
                tagsContainer.querySelectorAll('[data-remove-option]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const index = parseInt(btn.dataset.removeOption);
                        variationOptions.splice(index, 1);
                        renderVariationTags();
                        renderStockTable();
                    });
                });

                setTimeout(() => lucide.createIcons({ nodes: [tagsContainer] }), 0);
            };

            // Renderiza tabela de estoque
            const renderStockTable = () => {
                const tableContainer = document.getElementById('simple-stock-table');
                if (!tableContainer || variationOptions.length === 0) {
                    if (tableContainer) tableContainer.innerHTML = '';
                    return;
                }

                const currentStock = currentProduct && currentProduct.variationType === 'simple' ? currentProduct.stock : {};

                tableContainer.innerHTML = `
                    <table class="stock-table">
                        <thead>
                            <tr>
                                <th>Opção</th>
                                <th>Estoque</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${variationOptions.map(option => `
                                <tr>
                                    <td>${option}</td>
                                    <td><input type="number" class="form-input" data-stock-option="${option}" value="${currentStock[option] || 0}" min="0" placeholder="0"></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            };

            // Submit do formulário
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                const productName = document.getElementById('product-name').value.trim();
                const productCost = parseFloat(baseCostInput.value) || 0;
                const variationType = form.querySelector('input[name="variation-type"]:checked').value;

                // Validações
                if (!productName) {
                    alert('Por favor, digite o nome do produto.');
                    return;
                }

                if (productCost <= 0) {
                    alert('Por favor, digite o custo do produto.');
                    return;
                }

                // Monta objeto do produto
                const productData = {
                    id: editingProductId || `prod_${Date.now()}`,
                    name: productName,
                    baseCost: productCost,
                    finalPrice: SmartPricing.calculate(productCost, 100).price,
                    variationType: variationType,
                    variations: [],
                    stock: {},
                    imageUrl: currentProduct?.imageUrl || ''
                };

                // Processa estoque baseado no tipo de variação
                if (variationType === 'none') {
                    const stockTotal = parseInt(document.getElementById('stock-total')?.value) || 0;
                    productData.stock = { total: stockTotal };
                } else if (variationType === 'simple') {
                    const variationName = document.getElementById('variation-name-1')?.value.trim();
                    
                    if (!variationName) {
                        alert('Por favor, digite o nome da variação.');
                        return;
                    }

                    if (variationOptions.length === 0) {
                        alert('Por favor, adicione pelo menos uma opção de variação.');
                        return;
                    }

                    productData.variations = [{ name: variationName, options: variationOptions }];
                    
                    // Coleta estoque de cada opção
                    variationOptions.forEach(option => {
                        const stockInput = document.querySelector(`[data-stock-option="${option}"]`);
                        productData.stock[option] = parseInt(stockInput?.value) || 0;
                    });
                }

                // Salva ou atualiza produto
                const state = StateManager.getState();
                let updatedProducts;

                if (editingProductId) {
                    // Atualiza produto existente
                    updatedProducts = state.products.map(p => p.id === editingProductId ? productData : p);
                } else {
                    // Adiciona novo produto
                    updatedProducts = [...state.products, productData];
                    AchievementSystem.checkAndAward('primeiro_produto');
                }

                StateManager.setState({ 
                    products: updatedProducts,
                    currentPage: 'produtos',
                    editingProductId: null
                });
            });

            // Event listeners
            baseCostInput.addEventListener('input', updatePricingUI);
            variationRadios.forEach(radio => radio.addEventListener('change', updateVariationUI));
            
            // Inicializa
            updateVariationUI();
            updatePricingUI();
        },

        getDespesasHTML() {
            const { costs, user } = StateManager.getState();
            const fixedCostsHTML = costs.fixed.map((c, index) => `<div class="cost-list-item"><div class="cost-item-info"><span>${c.name}</span><strong>R$ ${c.value.toFixed(2)}</strong></div><button class="remove-btn" data-action="remove-fixed-cost" data-index="${index}"><i data-lucide="x-circle"></i></button></div>`).join('');
            const variableCostsHTML = costs.variable.map((c, index) => `<div class="cost-list-item"><div class="cost-item-info"><span>${c.name}</span><div><strong>${c.value}${c.type === 'percentage' ? '%' : ' R$'}</strong><span class="cost-type-badge">${c.type === 'percentage' ? '%' : 'Fixo'}</span></div></div><button class="remove-btn" data-action="remove-variable-cost" data-index="${index}"><i data-lucide="x-circle"></i></button></div>`).join('');
            return `
                <h2>Gestão de Despesas</h2>
                <p class="sub-header">A base para uma precificação lucrativa começa aqui.</p>
                <div class="card"><div class="card-header"><div class="card-icon" style="background: var(--success-gradient);"><i data-lucide="shopping-cart"></i></div><h3 class="card-title">Qual a sua meta de vendas mensal?</h3></div><p>Este número é essencial para calcularmos seus custos por cada produto vendido.</p><div class="form-group" style="margin-top: 1rem;"><label for="monthly-sales-goal">Itens a vender por mês</label><input type="number" id="monthly-sales-goal" class="form-input" placeholder="Ex: 100" value="${user.monthlySalesGoal}"></div></div>
                <div class="card"><div class="card-header"><div class="card-icon"><i data-lucide="building"></i></div><h3 class="card-title">Custos Fixos Mensais</h3></div><div id="fixed-costs-list">${fixedCostsHTML}</div><p style="font-size:14px; text-align:right; margin-top:8px;">Total: <strong>R$ ${SmartPricing.getTotalMonthlyFixedCosts().toFixed(2)}</strong></p><form class="add-cost-form" id="add-fixed-cost-form"><div class="input-group"><input type="text" id="fixed-cost-name" class="form-input" placeholder="Nome da Despesa" required><input type="number" step="0.01" id="fixed-cost-value" class="form-input" placeholder="Valor (R$)" required></div><button type="submit" class="btn btn-secondary btn-full" style="margin-top:10px;">Adicionar Custo Fixo</button></form></div>
                <div class="card"><div class="card-header"><div class="card-icon" style="background: var(--secondary-gradient);"><i data-lucide="trending-up"></i></div><h3 class="card-title">Custos Variáveis por Venda</h3></div><div id="variable-costs-list" style="margin-top: 1rem;">${variableCostsHTML}</div><form class="add-cost-form" id="add-variable-cost-form"><div class="input-group"><input type="text" id="variable-cost-name" class="form-input" placeholder="Nome da Despesa" required><input type="number" step="0.01" id="variable-cost-value" class="form-input" placeholder="Valor" required><select id="variable-cost-type" class="form-select" style="width: 80px;"><option value="percentage">%</option><option value="fixed">R$</option></select></div><button type="submit" class="btn btn-secondary btn-full" style="margin-top:10px;">Adicionar Custo Variável</button></form></div>
                <div class="card"><div class="card-header"><div class="card-icon" style="background: var(--info);"><i data-lucide="truck"></i></div><h3 class="card-title">Custo com Frete da Compra</h3></div><p>Se você compra de fornecedores, insira o valor total do frete pago no mês.</p><div class="form-group" style="margin-top: 1rem;"><label for="monthly-shipping-cost">Custo total do frete mensal</label><input type="number" id="monthly-shipping-cost" class="form-input" placeholder="Ex: 150.00" value="${costs.shipping || ''}"></div></div>
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
        
        getRelatoriosHTML() { return `<h2>Relatórios Visuais</h2> <p>Em breve, gráficos incríveis sobre seu negócio!</p>`; },

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
            return { id: `prod_${Date.now()}`, name: '', baseCost: 0, finalPrice: 0, variationType: 'none', variations: [], stock: {}, imageUrl: '' };
        },
        getTotalStock(product) {
            if (product.variationType === 'none') {
                return product.stock.total || 0;
            }
            return Object.values(product.stock).reduce((acc, val) => acc + (parseInt(val, 10) || 0), 0);
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
            const { costs } = StateManager.getState();
            if (!costs || !costs.fixed) return 0;
            return costs.fixed.reduce((acc, cost) => acc + cost.value, 0);
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
                'navigate': () => StateManager.setState({ currentPage: route }),
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
        let savedState = DataManager.load('appState');
        if (!savedState || !savedState.costs || !savedState.user || !savedState.products) {
            const DemoData = {
                user: { name: 'Maria Empreendedora', monthlyGoal: 8000, currentRevenue: 5200, monthlySalesGoal: 100 },
                products: [
                    { id: `prod_1`, name: 'Rasteirinha Comfort', baseCost: 15.00, finalPrice: 39.90, variationType: 'simple', variations: [{ name: 'Tamanho', options: ['35', '36', '37'] }], stock: { '35': 10, '36': 15, '37': 5 }, imageUrl: 'https://placehold.co/100x100/f06292/ffffff?text=RC' },
                    { id: `prod_2`, name: 'Bolsa Essencial', baseCost: 45.00, finalPrice: 99.00, variationType: 'none', variations: [], stock: { 'total': 20 }, imageUrl: 'https://placehold.co/100x100/BA68C8/ffffff?text=BE' }
                ],
                costs: {
                    fixed: [ { name: 'Aluguel do espaço', value: 500 }, { name: 'Plano de Internet', value: 100 }, { name: 'Ferramentas online', value: 50 }],
                    variable: [ { name: 'Taxa da Maquininha', value: 4.5, type: 'percentage' }, { name: 'Embalagem por venda', value: 2.0, type: 'fixed' }],
                    shipping: 150
                },
                achievements: [],
                currentPage: 'dashboard'
            };
            StateManager.setState(DemoData);
        } else {
             StateManager.setState(savedState);
        }
        
        UIManager.init();
        UIManager.updateActiveContent();
        UIManager.updateNav();
        bindEvents();
        AchievementSystem.checkAndAward('primeiro_acesso');
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', LucroCertoApp.init);
