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
        profilePhoto: '',
        catalogLogo: '',
        catalogColor: 'pink'
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
                    storeData.catalogLogo = data.user.catalogLogo || '';
                    storeData.catalogColor = data.user.catalogColor || 'pink';
                }
                
                // Produtos
                if (data.products && Array.isArray(data.products)) {
                    products = data.products.filter(p => p && p.name);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados da loja:', error);
        }
        
        // Aplicar cor personalizada
        applyCustomColor();
    }
    
    // ==================================
    // APLICAR COR PERSONALIZADA
    // ==================================
    function applyCustomColor() {
        const colorThemes = {
            pink: { primary: '#E91E63', primaryDark: '#AD1457', gradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fff1f2 100%)' },
            purple: { primary: '#9C27B0', primaryDark: '#6A1B9A', gradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)' },
            blue: { primary: '#2196F3', primaryDark: '#1565C0', gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)' },
            teal: { primary: '#009688', primaryDark: '#00695C', gradient: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)' },
            green: { primary: '#4CAF50', primaryDark: '#2E7D32', gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)' },
            orange: { primary: '#FF9800', primaryDark: '#E65100', gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)' },
            red: { primary: '#F44336', primaryDark: '#C62828', gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)' },
            brown: { primary: '#795548', primaryDark: '#4E342E', gradient: 'linear-gradient(135deg, #faf5f3 0%, #f5ebe6 50%, #e8ddd6 100%)' }
        };
        
        const theme = colorThemes[storeData.catalogColor] || colorThemes.pink;
        
        document.documentElement.style.setProperty('--primary', theme.primary);
        document.documentElement.style.setProperty('--primary-dark', theme.primaryDark);
        document.body.style.background = theme.gradient;
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
        
        // Prioridade: logo do catálogo > foto de perfil > ícone padrão
        if (storeData.catalogLogo) {
            logoEl.innerHTML = `<img src="${storeData.catalogLogo}" alt="Logo">`;
        } else if (storeData.profilePhoto) {
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
    let currentGalleryIndex = 0;
    let productGalleryImages = [];
    
    function openProductModal(productId) {
        currentProduct = products.find(p => p.id === productId);
        if (!currentProduct) return;
        
        selectedVariation = null;
        quantity = 1;
        currentGalleryIndex = 0;
        
        const modal = document.getElementById('product-modal');
        const nameEl = document.getElementById('modal-product-name');
        const priceEl = document.getElementById('modal-product-price');
        const variationSection = document.getElementById('variation-selector');
        const variationOptions = document.getElementById('variation-options');
        const qtyValue = document.getElementById('qty-value');
        
        // Preparar galeria de fotos
        productGalleryImages = currentProduct.images && currentProduct.images.length > 0 
            ? currentProduct.images 
            : (currentProduct.imageUrl ? [currentProduct.imageUrl] : [getPlaceholder(currentProduct.name)]);
        
        renderGallery();
        
        // Preencher dados
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
    
    // ==================================
    // GALERIA DE FOTOS
    // ==================================
    function renderGallery() {
        const slider = document.getElementById('product-gallery-slider');
        const dotsContainer = document.getElementById('gallery-dots');
        const prevBtn = document.getElementById('gallery-prev');
        const nextBtn = document.getElementById('gallery-next');
        
        if (!slider) return;
        
        // Renderizar imagens
        slider.innerHTML = productGalleryImages.map(img => `<img src="${img}" alt="Produto">`).join('');
        
        // Renderizar dots
        if (productGalleryImages.length > 1) {
            dotsContainer.innerHTML = productGalleryImages.map((_, idx) => 
                `<button class="gallery-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></button>`
            ).join('');
            dotsContainer.style.display = 'flex';
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
            
            // Bind eventos dos dots
            dotsContainer.querySelectorAll('.gallery-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    goToSlide(parseInt(dot.dataset.index));
                });
            });
        } else {
            dotsContainer.style.display = 'none';
            dotsContainer.innerHTML = '';
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }
        
        // Resetar posição
        slider.style.transform = 'translateX(0)';
        currentGalleryIndex = 0;
        
        // Adicionar suporte a swipe
        let startX = 0;
        let isDragging = false;
        
        slider.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });
        
        slider.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
        });
        
        slider.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }
            isDragging = false;
        });
    }
    
    function goToSlide(index) {
        if (index < 0 || index >= productGalleryImages.length) return;
        
        currentGalleryIndex = index;
        const slider = document.getElementById('product-gallery-slider');
        slider.style.transform = `translateX(-${index * 100}%)`;
        
        // Atualizar dots
        document.querySelectorAll('.gallery-dot').forEach((dot, idx) => {
            dot.classList.toggle('active', idx === index);
        });
    }
    
    function nextSlide() {
        if (currentGalleryIndex < productGalleryImages.length - 1) {
            goToSlide(currentGalleryIndex + 1);
        }
    }
    
    function prevSlide() {
        if (currentGalleryIndex > 0) {
            goToSlide(currentGalleryIndex - 1);
        }
    }

    function renderSimpleVariations(container) {
        const variation = currentProduct.variations[0];
        const variationImages = currentProduct.variationImages || {};
        const productImages = currentProduct.images || (currentProduct.imageUrl ? [currentProduct.imageUrl] : []);
        
        container.innerHTML = `
            <div class="variation-group">
                <p class="variation-group-label">${variation.name}</p>
                <div class="variation-options-inner">
                    ${variation.options.map(opt => {
                        const stock = currentProduct.stock[opt] || 0;
                        const outOfStock = stock === 0;
                        const hasLinkedPhoto = variationImages[opt] !== undefined && productImages[variationImages[opt]];
                        
                        return `
                            <button class="variation-btn ${outOfStock ? 'out-of-stock' : ''}" 
                                    data-variation="${opt}"
                                    data-photo-idx="${hasLinkedPhoto ? variationImages[opt] : ''}"
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
            
            // Trocar foto se houver foto vinculada
            updateProductPhoto(firstAvailable);
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
                
                // Trocar foto baseado na variação selecionada
                updateProductPhoto(selectedVariation);
                
                updateStockInfo();
            });
        });
    }
    
    // Função para atualizar a foto do produto baseado na variação
    function updateProductPhoto(variation) {
        if (!currentProduct) return;
        
        const variationImages = currentProduct.variationImages || {};
        
        // Se há foto vinculada a essa variação, ir para esse slide
        if (variationImages[variation] !== undefined) {
            goToSlide(variationImages[variation]);
        } else {
            // Caso contrário, voltar para a primeira foto
            goToSlide(0);
        }
    }

    function renderCombinedVariations(container) {
        const var1 = currentProduct.variations[0];
        const var2 = currentProduct.variations[1];
        const variationImages = currentProduct.variationImages || {};
        const productImages = currentProduct.images || (currentProduct.imageUrl ? [currentProduct.imageUrl] : []);
        
        let selectedVar1 = null;
        let selectedVar2 = null;
        
        // Função para verificar se uma cor tem pelo menos um tamanho disponível
        const hasAnyStockForVar1 = (opt1) => {
            return var2.options.some(opt2 => {
                const key = `${opt1}-${opt2}`;
                return (currentProduct.stock[key] || 0) > 0;
            });
        };
        
        // Função para atualizar os tamanhos disponíveis baseado na cor selecionada
        const updateVar2Options = () => {
            const var2Container = document.getElementById('var2-options');
            if (!var2Container || !selectedVar1) return;
            
            var2Container.innerHTML = var2.options.map(opt2 => {
                const key = `${selectedVar1}-${opt2}`;
                const stock = currentProduct.stock[key] || 0;
                const outOfStock = stock === 0;
                
                return `
                    <button class="variation-btn ${outOfStock ? 'out-of-stock' : ''} ${selectedVar2 === opt2 ? 'active' : ''}" 
                            data-var2="${opt2}"
                            ${outOfStock ? 'disabled' : ''}>
                        ${opt2}${stock > 0 && stock <= 3 ? ` (${stock})` : ''}
                    </button>
                `;
            }).join('');
            
            // Re-bind eventos
            var2Container.querySelectorAll('[data-var2]:not(.out-of-stock)').forEach(btn => {
                btn.addEventListener('click', () => {
                    var2Container.querySelectorAll('[data-var2]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedVar2 = btn.dataset.var2;
                    quantity = 1;
                    document.getElementById('qty-value').textContent = '1';
                    updateCombinedSelection();
                });
            });
            
            // Auto-selecionar primeiro tamanho disponível
            if (!selectedVar2 || (currentProduct.stock[`${selectedVar1}-${selectedVar2}`] || 0) === 0) {
                const firstAvailable = var2.options.find(opt2 => (currentProduct.stock[`${selectedVar1}-${opt2}`] || 0) > 0);
                if (firstAvailable) {
                    selectedVar2 = firstAvailable;
                    var2Container.querySelector(`[data-var2="${firstAvailable}"]`)?.classList.add('active');
                } else {
                    selectedVar2 = null;
                }
            }
            
            updateCombinedSelection();
        };
        
        const updateCombinedSelection = () => {
            if (selectedVar1 && selectedVar2) {
                selectedVariation = `${selectedVar1}-${selectedVar2}`;
                updateStockInfo();
            } else if (selectedVar1) {
                selectedVariation = null;
                updateStockInfo();
            } else {
                selectedVariation = null;
                updateStockInfo();
            }
        };
        
        // Renderizar HTML inicial
        container.innerHTML = `
            <div class="variation-group">
                <p class="variation-group-label">${var1.name}</p>
                <div class="variation-options-inner" id="var1-options">
                    ${var1.options.map(opt => {
                        const hasLinkedPhoto = variationImages[opt] !== undefined && productImages[variationImages[opt]];
                        const hasStock = hasAnyStockForVar1(opt);
                        return `
                            <button class="variation-btn ${!hasStock ? 'out-of-stock' : ''}" 
                                    data-var1="${opt}" 
                                    data-photo-idx="${hasLinkedPhoto ? variationImages[opt] : ''}"
                                    ${!hasStock ? 'disabled' : ''}>
                                ${opt}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
            <div class="variation-group" id="var2-group" style="display: none;">
                <p class="variation-group-label">${var2.name}</p>
                <div class="variation-options-inner" id="var2-options"></div>
            </div>
        `;
        
        // Selecionar primeira cor disponível
        const firstAvailableColor = var1.options.find(opt => hasAnyStockForVar1(opt));
        if (firstAvailableColor) {
            selectedVar1 = firstAvailableColor;
            container.querySelector(`[data-var1="${firstAvailableColor}"]`)?.classList.add('active');
            
            // Mostrar grupo de tamanhos
            document.getElementById('var2-group').style.display = 'block';
            
            // Trocar foto
            updateProductPhoto(selectedVar1);
            
            // Atualizar tamanhos disponíveis
            updateVar2Options();
        }
        
        // Bind eventos - Variação 1 (cor)
        container.querySelectorAll('[data-var1]:not(.out-of-stock)').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('[data-var1]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedVar1 = btn.dataset.var1;
                selectedVar2 = null; // Resetar tamanho
                quantity = 1;
                document.getElementById('qty-value').textContent = '1';
                
                // Mostrar grupo de tamanhos
                document.getElementById('var2-group').style.display = 'block';
                
                // Trocar foto quando selecionar a cor
                updateProductPhoto(selectedVar1);
                
                // Atualizar tamanhos disponíveis para essa cor
                updateVar2Options();
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
            // Para variações combinadas, a chave usa "-" como separador
            stock = currentProduct.stock[selectedVariation] || 0;
        }
        
        stockInfo.className = 'stock-info';
        
        if (!selectedVariation && currentProduct.variationType !== 'none') {
            stockInfo.classList.add('waiting');
            stockText.textContent = 'Selecione as opções acima';
            addBtn.disabled = true;
            addBtn.textContent = 'Selecione uma opção';
        } else if (stock === 0) {
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
            let variationKey = selectedVariation; // Para buscar a foto
            
            if (currentProduct.variationType === 'simple') {
                variationName = selectedVariation;
            } else if (currentProduct.variationType === 'combined') {
                variationName = selectedVariation.replace('-', ' / ');
                // Para variação combinada, a chave da foto é a primeira parte (cor)
                variationKey = selectedVariation.split('-')[0];
            }
            
            // Busca a imagem correta baseada na variação
            const variationImages = currentProduct.variationImages || {};
            const productImages = currentProduct.images || [];
            let imageUrl = currentProduct.imageUrl || getPlaceholder(currentProduct.name);
            
            // Se tem foto vinculada a essa variação, usa ela
            if (variationImages[variationKey] !== undefined && productImages[variationImages[variationKey]]) {
                imageUrl = productImages[variationImages[variationKey]];
            }
            
            cart.push({
                productId: currentProduct.id,
                productName: currentProduct.name,
                variation: selectedVariation,
                variationName: variationName,
                price: currentProduct.finalPrice,
                quantity: quantity,
                imageUrl: imageUrl
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
        
        container.innerHTML = cart.map((item, index) => {
            // Busca a foto correta baseada na variação
            const product = products.find(p => p.id === item.productId);
            let imageUrl = item.imageUrl || getPlaceholder(item.productName);
            
            if (product) {
                const variationImages = product.variationImages || {};
                const productImages = product.images || [];
                
                // Determina a chave da variação para buscar a foto
                let variationKey = item.variation;
                if (product.variationType === 'combined' && item.variation) {
                    // Para variação combinada, a primeira parte é a cor
                    variationKey = item.variation.split('-')[0];
                }
                
                // Se tem foto vinculada a essa variação, usa ela
                if (variationKey && variationImages[variationKey] !== undefined && productImages[variationImages[variationKey]]) {
                    imageUrl = productImages[variationImages[variationKey]];
                } else if (productImages.length > 0) {
                    imageUrl = productImages[0];
                } else if (product.imageUrl) {
                    imageUrl = product.imageUrl;
                }
            }
            
            return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${imageUrl}" alt="${item.productName}">
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
        `}).join('');
        
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
        
        // Navegação da galeria
        document.getElementById('gallery-prev')?.addEventListener('click', prevSlide);
        document.getElementById('gallery-next')?.addEventListener('click', nextSlide);
        
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
