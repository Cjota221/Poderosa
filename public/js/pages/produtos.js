// PRODUTOS PAGE - Lista e cadastro de produtos
// Este arquivo contém toda a lógica da página de produtos

/**
 * Renderiza a lista de produtos
 */
export function renderProducts() {
    const { products } = window.StateManager.getState();
    const { ProductManager, DataManager } = window;
    
    const productCards = products.map(product => {
        const totalStock = ProductManager.getTotalStock(product);
        const stockStatus = ProductManager.getStockStatus(product);
        
        return `
            <div class="card product-card" data-action="edit-product" data-id="${product.id}">
                <img 
                    src="${product.imageUrl || `https://placehold.co/60x60/f06292/ffffff?text=${product.name.charAt(0)}`}" 
                    class="product-card-image" 
                    alt="Imagem do produto ${product.name}"
                >
                <div class="product-card-info">
                    <div class="product-card-name">${product.name}</div>
                    <div class="product-card-details">
                        <span>Preço: ${DataManager.formatCurrency(product.finalPrice)}</span>
                        <span class="product-stock-badge" style="color: ${stockStatus.color};">
                            ${stockStatus.label}: ${totalStock}
                        </span>
                    </div>
                </div>
                <i data-lucide="chevron-right"></i>
            </div>
        `;
    }).join('');
    
    return `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Meus Produtos</h2>
            <button class="btn btn-primary" data-action="add-new-product">
                <i data-lucide="plus" style="margin-right:8px;"></i> Novo
            </button>
        </div>
        <p class="sub-header">Gerencie seu estoque e veja a performance de cada item.</p>
        
        ${products.length > 0 ? `
            <div class="product-list">${productCards}</div>
        ` : `
            <div class="card" style="text-align: center; padding: 40px;">
                <i data-lucide="package-search" style="width: 64px; height: 64px; color: var(--elegant-gray); margin-bottom: 16px;"></i>
                <h3>Nenhum produto cadastrado</h3>
                <p style="color: var(--elegant-gray); margin-bottom: 20px;">
                    Comece adicionando seu primeiro produto e acompanhe seu estoque!
                </p>
                <button class="btn btn-primary" data-action="add-new-product">
                    <i data-lucide="plus" style="margin-right:8px;"></i> Cadastrar Primeiro Produto
                </button>
            </div>
        `}
    `;
}

/**
 * Renderiza o formulário de cadastro/edição de produto
 */
export function renderProductForm() {
    const { editingProductId, products } = window.StateManager.getState();
    const { ProductManager } = window;
    
    const product = editingProductId 
        ? products.find(p => p.id === editingProductId) 
        : ProductManager.getNewProductTemplate();
    
    const pageTitle = editingProductId ? 'Editar Produto' : 'Adicionar Novo Produto';
    const variationChecked = {
        none: product.variationType === 'none' ? 'checked' : '',
        simple: product.variationType === 'simple' ? 'checked' : '',
        combined: product.variationType === 'combined' ? 'checked' : ''
    };

    return `
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <button class="btn-icon" data-action="cancel-product-edit" style="margin-right: 12px;">
                <i data-lucide="arrow-left"></i>
            </button>
            <h2 style="margin: 0;">${pageTitle}</h2>
        </div>

        <form id="product-form" class="card">
            <div class="form-group">
                <label>Nome do Produto <span class="required">*</span></label>
                <input 
                    type="text" 
                    class="form-input" 
                    id="product-name" 
                    placeholder="Ex: Colar de Pérolas" 
                    value="${product.name}"
                    required
                >
            </div>

            <div class="form-group">
                <label>Custo Base (R$) <span class="required">*</span></label>
                <input 
                    type="number" 
                    class="form-input" 
                    id="product-base-cost" 
                    placeholder="Ex: 25.00" 
                    step="0.01" 
                    min="0"
                    value="${product.baseCost}"
                    required
                >
                <small>Quanto você gasta para produzir ou comprar este produto</small>
            </div>

            <div class="form-group">
                <label>Tipo de Variação</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="variation-type" value="none" ${variationChecked.none || 'checked'}>
                        <span>Sem Variação</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="variation-type" value="simple" ${variationChecked.simple}>
                        <span>Variação Simples (ex: Tamanho)</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="variation-type" value="combined" ${variationChecked.combined}>
                        <span>Variação Combinada (ex: Cor + Tamanho)</span>
                    </label>
                </div>
            </div>

            <div id="stock-management-area"></div>

            <div class="form-group">
                <label>Calculadora de Preço</label>
                <div id="pricing-calculator-live"></div>
            </div>

            <button type="submit" class="btn btn-primary btn-block">
                <i data-lucide="save" style="margin-right: 8px;"></i>
                Salvar Produto
            </button>
        </form>
    `;
}

/**
 * Vincula eventos ao formulário de produto
 */
export function bindProductFormEvents() {
    const form = document.getElementById('product-form');
    if (!form) return;
    
    const { editingProductId, products } = window.StateManager.getState();
    const { StateManager, ProductManager, SmartPricing, AchievementSystem } = window;
    
    const currentProduct = editingProductId ? products.find(p => p.id === editingProductId) : null;
    const baseCostInput = document.getElementById('product-base-cost');
    const variationRadios = form.querySelectorAll('input[name="variation-type"]');
    
    let variationOptions = [];

    // Atualiza cálculo de preço ao vivo com o novo Semáforo Emocional
    const updatePricingUI = () => {
        const productCost = parseFloat(baseCostInput.value) || 0;
        const container = document.getElementById('pricing-calculator-live');
        if (!container) return;

        if (productCost === 0) {
            container.innerHTML = `<p style="color: var(--elegant-gray); font-size: 14px;">Digite o custo do produto para ver o Semáforo de Preços 🚦</p>`;
            return;
        }

        // Usa o novo PricingUI com Semáforo Emocional
        if (window.PricingUI) {
            const produto = {
                nome: document.getElementById('product-name')?.value || 'Produto',
                custo: productCost
            };
            
            // Pega custos fixos do sistema para calcular meta
            const custosFixos = window.SmartPricing?.getTotalMonthlyFixedCosts() || 0;
            
            PricingUI.renderizar('pricing-calculator-live', produto, {
                custosFixosMensais: custosFixos,
                mostrarCenarios: true
            });
        } else {
            // Fallback para o cálculo antigo se PricingUI não existir
            const margin = 100;
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
                </div>
            `;
        }
    };

    // Atualiza interface de variações
    const updateVariationUI = () => {
        const selectedType = form.querySelector('input[name="variation-type"]:checked').value;
        const container = document.getElementById('stock-management-area');
        variationOptions = [];

        if (selectedType === 'none') {
            const currentStock = currentProduct && currentProduct.variationType === 'none' 
                ? (currentProduct.stock.total || 0) 
                : 0;
            container.innerHTML = `
                <div class="form-group">
                    <label>Estoque Total</label>
                    <input 
                        type="number" 
                        class="form-input" 
                        id="stock-total" 
                        placeholder="Ex: 50" 
                        value="${currentStock}" 
                        min="0"
                    >
                </div>
            `;
        } else if (selectedType === 'simple') {
            const currentVariation = currentProduct && currentProduct.variationType === 'simple' 
                ? currentProduct.variations[0] 
                : null;
            const variationName = currentVariation ? currentVariation.name : '';
            
            container.innerHTML = `
                <div class="form-group">
                    <label>Nome da Variação (Ex: Tamanho, Cor)</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        id="variation-name-1" 
                        placeholder="Ex: Tamanho" 
                        value="${variationName}"
                    >
                </div>
                <div class="form-group">
                    <label>Opções (Digite e pressione Enter)</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        id="variation-options-input-1" 
                        placeholder="Ex: P, M, G..."
                    >
                    <div class="variation-options-container" id="variation-options-tags-1"></div>
                </div>
                <div id="simple-stock-table"></div>
            `;

            if (currentVariation && currentVariation.options) {
                variationOptions = [...currentVariation.options];
                renderVariationTags();
                renderStockTable();
            }

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
                </div>
            `;
            setTimeout(() => lucide.createIcons({ nodes: [container] }), 0);
        }
    };

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

    const renderStockTable = () => {
        const tableContainer = document.getElementById('simple-stock-table');
        if (!tableContainer || variationOptions.length === 0) {
            if (tableContainer) tableContainer.innerHTML = '';
            return;
        }

        const currentStock = currentProduct && currentProduct.variationType === 'simple' 
            ? currentProduct.stock 
            : {};

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
                            <td>
                                <input 
                                    type="number" 
                                    class="form-input" 
                                    data-stock-option="${option}" 
                                    value="${currentStock[option] || 0}" 
                                    min="0" 
                                    placeholder="0"
                                >
                            </td>
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

        if (!productName) {
            alert('Por favor, digite o nome do produto.');
            return;
        }

        if (productCost <= 0) {
            alert('Por favor, digite o custo do produto.');
            return;
        }

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
            
            variationOptions.forEach(option => {
                const stockInput = document.querySelector(`[data-stock-option="${option}"]`);
                productData.stock[option] = parseInt(stockInput?.value) || 0;
            });
        }

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
    variationRadios.forEach(radio => radio.addEventListener('change', updateVariationUI));
    
    // Inicializa
    updateVariationUI();
    updatePricingUI();
}
