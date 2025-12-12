/**
 * CATÁLOGO DIGITAL - LUCRO CERTO
 * ================================
 * Catálogo público para clientes visualizarem produtos,
 * adicionarem ao carrinho e finalizarem pedidos via WhatsApp.
 */

(function() {
    'use strict';

    // ==================================
    // CONFIGURAÇÃO E ESTADO
    // ==================================
    const STORAGE_KEY = 'lucrocerto_appState';
    const CART_KEY = 'lucrocerto_cart';
    
    let storeData = {
        businessName: 'Minha Loja',
        phone: '',
        profilePhoto: ''
    };
    
    let products = [];
    let cart = [];
    let currentProduct = null;
    let selectedVariation = null;
    let quantity = 1;

    // ==================================
    // INICIALIZAÇÃO
    // ==================================
    function init() {
        loadStoreData();
        loadCart();
        renderHeader();
        renderProducts();
        bindEvents();
        updateCartFab();
        lucide.createIcons();
    }

    // ==================================
    // CARREGAMENTO DE DADOS
    // ==================================
    function loadStoreData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                const data = parsed.data || parsed;
                
                // Dados da loja
                if (data.user) {
                    storeData.businessName = data.user.businessName || 'Minha Loja';
                    storeData.phone = data.user.phone || '';
                    storeData.profilePhoto = data.user.profilePhoto || '';
                }
                
                // Produtos
                if (data.products && Array.isArray(data.products)) {
                    products = data.products.filter(p => p && p.name);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados da loja:', error);
        }
    }

    function loadCart() {
        try {
            const stored = localStorage.getItem(CART_KEY);
            if (stored) {
                cart = JSON.parse(stored);
            }
        } catch (error) {
            cart = [];
        }
    }

    function saveCart() {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
        } catch (error) {
            console.error('Erro ao salvar carrinho:', error);
        }
    }

    // ==================================
    // RENDERIZAÇÃO DO HEADER
    // ==================================
    function renderHeader() {
        const logoEl = document.getElementById('store-logo');
        const nameEl = document.getElementById('store-name');
        
        if (storeData.profilePhoto) {
            logoEl.innerHTML = `<img src="${storeData.profilePhoto}" alt="Logo">`;
        }
        
        nameEl.textContent = storeData.businessName;
    }

    // ==================================
    // RENDERIZAÇÃO DE PRODUTOS
    // ==================================
    function renderProducts(filter = '') {
        const grid = document.getElementById('products-grid');
        const emptyState = document.getElementById('empty-catalog');
        
        let filteredProducts = products;
        
        if (filter) {
            filteredProducts = products.filter(p => 
                p.name.toLowerCase().includes(filter.toLowerCase())
            );
        }
        
        if (filteredProducts.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        grid.innerHTML = filteredProducts.map(product => {
            const totalStock = getTotalStock(product);
            const stockBadge = getStockBadge(totalStock);
            const variations = getVariationsText(product);
            
            return `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="product-card-image">
                        <img src="${product.imageUrl || getPlaceholder(product.name)}" alt="${product.name}">
                        ${stockBadge}
                    </div>
                    <div class="product-card-info">
                        <h3 class="product-card-name">${product.name}</h3>
                        ${variations ? `<p class="product-card-variations">${variations}</p>` : ''}
                        <p class="product-card-price">R$ ${product.finalPrice.toFixed(2)}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
    }

    function getPlaceholder(name) {
        return `https://placehold.co/200x200/f06292/ffffff?text=${encodeURIComponent(name.charAt(0).toUpperCase())}`;
    }

    function getTotalStock(product) {
        if (!product.stock) return 0;
        if (product.variationType === 'none') {
            return product.stock.total || 0;
        }
        return Object.values(product.stock).reduce((acc, val) => acc + (parseInt(val, 10) || 0), 0);
    }

    function getStockBadge(stock) {
        if (stock === 0) {
            return '<span class="product-badge">Esgotado</span>';
        } else if (stock <= 3) {
            return '<span class="product-badge low-stock">Últimas unidades</span>';
        }
        return '';
    }

    function getVariationsText(product) {
        if (product.variationType === 'simple' && product.variations[0]) {
            return `${product.variations[0].name}: ${product.variations[0].options.slice(0, 4).join(', ')}${product.variations[0].options.length > 4 ? '...' : ''}`;
        } else if (product.variationType === 'combined' && product.variations.length >= 2) {
            return `${product.variations[0].name} × ${product.variations[1].name}`;
        }
        return '';
    }

    // ==================================
    // MODAL DE PRODUTO
    // ==================================
    function openProductModal(productId) {
        currentProduct = products.find(p => p.id === productId);
        if (!currentProduct) return;
        
        selectedVariation = null;
        quantity = 1;
        
        const modal = document.getElementById('product-modal');
        const imgEl = document.getElementById('modal-product-img');
        const nameEl = document.getElementById('modal-product-name');
        const priceEl = document.getElementById('modal-product-price');
        const variationSection = document.getElementById('variation-selector');
        const variationOptions = document.getElementById('variation-options');
        const stockInfo = document.getElementById('stock-info');
        const qtyValue = document.getElementById('qty-value');
        const addBtn = document.getElementById('btn-add-cart');
        
        // Preencher dados
        imgEl.src = currentProduct.imageUrl || getPlaceholder(currentProduct.name);
        nameEl.textContent = currentProduct.name;
        priceEl.textContent = `R$ ${currentProduct.finalPrice.toFixed(2)}`;
        qtyValue.textContent = '1';
        
        // Variações
        if (currentProduct.variationType === 'none') {
            variationSection.style.display = 'none';
            selectedVariation = 'total';
            updateStockInfo();
        } else if (currentProduct.variationType === 'simple') {
            variationSection.style.display = 'block';
            renderSimpleVariations(variationOptions);
        } else if (currentProduct.variationType === 'combined') {
            variationSection.style.display = 'block';
            renderCombinedVariations(variationOptions);
        }
        
        // Abrir modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
        
        lucide.createIcons();
    }

    function renderSimpleVariations(container) {
        const variation = currentProduct.variations[0];
        
        container.innerHTML = `
            <div class="variation-group">
                <p class="variation-group-label">${variation.name}</p>
                <div class="variation-options-inner">
                    ${variation.options.map(opt => {
                        const stock = currentProduct.stock[opt] || 0;
                        const outOfStock = stock === 0;
                        return `
                            <button class="variation-btn ${outOfStock ? 'out-of-stock' : ''}" 
                                    data-variation="${opt}"
                                    ${outOfStock ? 'disabled' : ''}>
                                ${opt}${stock > 0 && stock <= 3 ? ` (${stock})` : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        // Selecionar primeira opção disponível
        const firstAvailable = variation.options.find(opt => (currentProduct.stock[opt] || 0) > 0);
        if (firstAvailable) {
            selectedVariation = firstAvailable;
            container.querySelector(`[data-variation="${firstAvailable}"]`)?.classList.add('active');
        }
        
        updateStockInfo();
        
        // Bind eventos
        container.querySelectorAll('.variation-btn:not(.out-of-stock)').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.variation-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedVariation = btn.dataset.variation;
                quantity = 1;
                document.getElementById('qty-value').textContent = '1';
                updateStockInfo();
            });
        });
    }

    function renderCombinedVariations(container) {
        const var1 = currentProduct.variations[0];
        const var2 = currentProduct.variations[1];
        
        container.innerHTML = `
            <div class="variation-group">
                <p class="variation-group-label">${var1.name}</p>
                <div class="variation-options-inner" id="var1-options">
                    ${var1.options.map(opt => `
                        <button class="variation-btn" data-var1="${opt}">${opt}</button>
                    `).join('')}
                </div>
            </div>
            <div class="variation-group">
                <p class="variation-group-label">${var2.name}</p>
                <div class="variation-options-inner" id="var2-options">
                    ${var2.options.map(opt => `
                        <button class="variation-btn" data-var2="${opt}">${opt}</button>
                    `).join('')}
                </div>
            </div>
        `;
        
        let selectedVar1 = null;
        let selectedVar2 = null;
        
        const updateCombinedSelection = () => {
            if (selectedVar1 && selectedVar2) {
                selectedVariation = `${selectedVar1}_${selectedVar2}`;
                updateStockInfo();
            } else {
                selectedVariation = null;
                updateStockInfo();
            }
        };
        
        // Selecionar primeira combinação disponível
        for (const opt1 of var1.options) {
            for (const opt2 of var2.options) {
                const key = `${opt1}_${opt2}`;
                if ((currentProduct.stock[key] || 0) > 0) {
                    selectedVar1 = opt1;
                    selectedVar2 = opt2;
                    container.querySelector(`[data-var1="${opt1}"]`)?.classList.add('active');
                    container.querySelector(`[data-var2="${opt2}"]`)?.classList.add('active');
                    selectedVariation = key;
                    updateStockInfo();
                    break;
                }
            }
            if (selectedVar1) break;
        }
        
        // Bind eventos
        container.querySelectorAll('[data-var1]').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('[data-var1]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedVar1 = btn.dataset.var1;
                quantity = 1;
                document.getElementById('qty-value').textContent = '1';
                updateCombinedSelection();
            });
        });
        
        container.querySelectorAll('[data-var2]').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('[data-var2]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedVar2 = btn.dataset.var2;
                quantity = 1;
                document.getElementById('qty-value').textContent = '1';
                updateCombinedSelection();
            });
        });
    }

    function updateStockInfo() {
        const stockInfo = document.getElementById('stock-info');
        const stockText = document.getElementById('stock-text');
        const addBtn = document.getElementById('btn-add-cart');
        
        if (!currentProduct) return;
        
        let stock = 0;
        
        if (currentProduct.variationType === 'none') {
            stock = currentProduct.stock.total || 0;
        } else if (selectedVariation) {
            stock = currentProduct.stock[selectedVariation] || 0;
        }
        
        stockInfo.className = 'stock-info';
        
        if (stock === 0) {
            stockInfo.classList.add('out-of-stock');
            stockText.textContent = 'Produto esgotado';
            addBtn.disabled = true;
            addBtn.textContent = 'Esgotado';
        } else if (stock <= 3) {
            stockInfo.classList.add('low-stock');
            stockText.textContent = `Últimas ${stock} unidades!`;
            addBtn.disabled = false;
            addBtn.innerHTML = '<i data-lucide="shopping-cart"></i> Adicionar ao Carrinho';
        } else {
            stockInfo.classList.add('in-stock');
            stockText.textContent = `${stock} disponíveis`;
            addBtn.disabled = false;
            addBtn.innerHTML = '<i data-lucide="shopping-cart"></i> Adicionar ao Carrinho';
        }
        
        lucide.createIcons();
    }

    function getAvailableStock() {
        if (!currentProduct) return 0;
        
        if (currentProduct.variationType === 'none') {
            return currentProduct.stock.total || 0;
        } else if (selectedVariation) {
            return currentProduct.stock[selectedVariation] || 0;
        }
        return 0;
    }

    function closeProductModal() {
        const modal = document.getElementById('product-modal');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            currentProduct = null;
            selectedVariation = null;
            quantity = 1;
        }, 300);
    }

    // ==================================
    // CARRINHO
    // ==================================
    function addToCart() {
        if (!currentProduct || !selectedVariation) return;
        
        const stock = getAvailableStock();
        if (stock === 0) return;
        
        // Verificar se já existe no carrinho
        const existingIndex = cart.findIndex(item => 
            item.productId === currentProduct.id && 
            item.variation === selectedVariation
        );
        
        if (existingIndex > -1) {
            const newQty = cart[existingIndex].quantity + quantity;
            if (newQty <= stock) {
                cart[existingIndex].quantity = newQty;
            } else {
                alert('Quantidade máxima em estoque atingida!');
                return;
            }
        } else {
            let variationName = '';
            if (currentProduct.variationType === 'simple') {
                variationName = selectedVariation;
            } else if (currentProduct.variationType === 'combined') {
                variationName = selectedVariation.replace('_', ' / ');
            }
            
            cart.push({
                productId: currentProduct.id,
                productName: currentProduct.name,
                variation: selectedVariation,
                variationName: variationName,
                price: currentProduct.finalPrice,
                quantity: quantity,
                imageUrl: currentProduct.imageUrl || getPlaceholder(currentProduct.name)
            });
        }
        
        saveCart();
        updateCartFab();
        closeProductModal();
        
        // Animação do FAB
        const fab = document.getElementById('cart-fab');
        fab.classList.add('pulse');
        setTimeout(() => fab.classList.remove('pulse'), 300);
    }

    function updateCartFab() {
        const fab = document.getElementById('cart-fab');
        const countEl = document.getElementById('cart-count');
        
        const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
        
        if (totalItems > 0) {
            fab.style.display = 'flex';
            countEl.textContent = totalItems;
        } else {
            fab.style.display = 'none';
        }
    }

    function openCartModal() {
        const modal = document.getElementById('cart-modal');
        renderCartItems();
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
        lucide.createIcons();
    }

    function closeCartModal() {
        const modal = document.getElementById('cart-modal');
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }

    function renderCartItems() {
        const container = document.getElementById('cart-items');
        const emptyState = document.getElementById('cart-empty');
        const footer = document.getElementById('cart-footer');
        const totalEl = document.getElementById('cart-total-value');
        
        if (cart.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            footer.style.display = 'none';
            return;
        }
        
        emptyState.style.display = 'none';
        footer.style.display = 'block';
        
        container.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.imageUrl}" alt="${item.productName}">
                </div>
                <div class="cart-item-info">
                    <p class="cart-item-name">${item.productName}</p>
                    ${item.variationName ? `<p class="cart-item-variation">${item.variationName}</p>` : ''}
                    <p class="cart-item-price">R$ ${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div class="cart-item-qty">
                    <button data-action="cart-decrease" data-index="${index}">-</button>
                    <span>${item.quantity}</span>
                    <button data-action="cart-increase" data-index="${index}">+</button>
                </div>
                <button class="cart-item-remove" data-action="cart-remove" data-index="${index}">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `).join('');
        
        // Total
        const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        totalEl.textContent = `R$ ${total.toFixed(2)}`;
        
        lucide.createIcons();
        
        // Bind eventos do carrinho
        container.querySelectorAll('[data-action="cart-decrease"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                if (cart[idx].quantity > 1) {
                    cart[idx].quantity--;
                    saveCart();
                    updateCartFab();
                    renderCartItems();
                }
            });
        });
        
        container.querySelectorAll('[data-action="cart-increase"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                // Verificar estoque
                const product = products.find(p => p.id === cart[idx].productId);
                if (product) {
                    const stock = product.variationType === 'none' 
                        ? (product.stock.total || 0)
                        : (product.stock[cart[idx].variation] || 0);
                    
                    if (cart[idx].quantity < stock) {
                        cart[idx].quantity++;
                        saveCart();
                        updateCartFab();
                        renderCartItems();
                    } else {
                        alert('Quantidade máxima em estoque!');
                    }
                }
            });
        });
        
        container.querySelectorAll('[data-action="cart-remove"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                cart.splice(idx, 1);
                saveCart();
                updateCartFab();
                renderCartItems();
            });
        });
    }

    // ==================================
    // WHATSAPP
    // ==================================
    function sendWhatsApp() {
        if (cart.length === 0) {
            alert('Adicione produtos ao carrinho!');
            return;
        }
        
        const customerName = document.getElementById('customer-name').value.trim();
        const customerNotes = document.getElementById('customer-notes').value.trim();
        
        if (!customerName) {
            alert('Por favor, informe seu nome!');
            document.getElementById('customer-name').focus();
            return;
        }
        
        // Formatar mensagem
        let message = `🛒 *NOVO PEDIDO*\n`;
        message += `━━━━━━━━━━━━━━━━━━\n\n`;
        message += `👤 *Cliente:* ${customerName}\n\n`;
        message += `📦 *Itens do pedido:*\n`;
        
        let total = 0;
        cart.forEach((item, i) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            message += `\n${i + 1}. *${item.productName}*`;
            if (item.variationName) {
                message += ` (${item.variationName})`;
            }
            message += `\n   Qtd: ${item.quantity} × R$ ${item.price.toFixed(2)} = *R$ ${itemTotal.toFixed(2)}*\n`;
        });
        
        message += `\n━━━━━━━━━━━━━━━━━━\n`;
        message += `💰 *TOTAL: R$ ${total.toFixed(2)}*\n`;
        
        if (customerNotes) {
            message += `\n📝 *Observações:*\n${customerNotes}\n`;
        }
        
        message += `\n✨ Pedido feito pelo catálogo Lucro Certo`;
        
        // Limpar número de telefone
        let phone = storeData.phone.replace(/\D/g, '');
        if (phone.length === 11 && !phone.startsWith('55')) {
            phone = '55' + phone;
        }
        
        if (!phone) {
            alert('Número de WhatsApp da loja não configurado!');
            return;
        }
        
        // Abrir WhatsApp
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        
        // Limpar carrinho após enviar
        cart = [];
        saveCart();
        updateCartFab();
        closeCartModal();
    }

    // ==================================
    // EVENTOS
    // ==================================
    function bindEvents() {
        // Busca
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderProducts(e.target.value);
            }, 300);
        });
        
        // Clique nos produtos
        document.getElementById('products-grid').addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            if (card) {
                openProductModal(card.dataset.productId);
            }
        });
        
        // Modal do produto
        document.getElementById('close-product-modal').addEventListener('click', closeProductModal);
        document.getElementById('product-modal').addEventListener('click', (e) => {
            if (e.target.id === 'product-modal') closeProductModal();
        });
        
        // Quantidade no modal
        document.getElementById('qty-decrease').addEventListener('click', () => {
            if (quantity > 1) {
                quantity--;
                document.getElementById('qty-value').textContent = quantity;
            }
        });
        
        document.getElementById('qty-increase').addEventListener('click', () => {
            const stock = getAvailableStock();
            if (quantity < stock) {
                quantity++;
                document.getElementById('qty-value').textContent = quantity;
            }
        });
        
        // Adicionar ao carrinho
        document.getElementById('btn-add-cart').addEventListener('click', addToCart);
        
        // Carrinho FAB
        document.getElementById('cart-fab').addEventListener('click', openCartModal);
        
        // Modal do carrinho
        document.getElementById('close-cart-modal').addEventListener('click', closeCartModal);
        document.getElementById('cart-modal').addEventListener('click', (e) => {
            if (e.target.id === 'cart-modal') closeCartModal();
        });
        
        // WhatsApp
        document.getElementById('btn-whatsapp').addEventListener('click', sendWhatsApp);
    }

    // ==================================
    // INICIAR
    // ==================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
