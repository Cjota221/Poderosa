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
            let authData = JSON.parse(localStorage.getItem('lucrocerto_auth') || '{}');
            
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
            const isTrial = localStorage.getItem('lucrocerto_trial') === 'true';
            
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
            const bannerClosedDate = localStorage.getItem('lucrocerto_banner_closed');
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
                    <a href="./checkout?plan=${authData.plano || 'pro'}&billing=${authData.billing || 'monthly'}">Renove agora</a></span>
                `;
                banner.style.display = 'flex';
                document.body.classList.add('has-plan-banner');
                
            } else if (daysUntilExpiry <= 3) {
                // Plano vencendo em breve
                banner.className = 'plan-alert-banner warning';
                banner.innerHTML = `
                    <span>📅 Seu plano vence em <strong>${daysUntilExpiry} dia(s)</strong>. 
                    <a href="./checkout?plan=${authData.plano || 'pro'}&billing=${authData.billing || 'monthly'}">Clique aqui para renovar</a></span>
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
            // Verificar se já mostrou hoje
            const lastWelcome = localStorage.getItem('lucrocerto_last_welcome');
            const today = new Date().toDateString();
            
            if (lastWelcome === today) return; // Já mostrou hoje
            
            // Pegar nome do usuário
            const { user } = StateManager.getState();
            const userName = user.name ? user.name.split(' ')[0] : 'Empreendedora';
            
            // Frases motivacionais aleatórias
            const messages = [
                `Olá, ${userName}! Bem-vinda de volta! ✨`,
                `Que bom te ver, ${userName}! Pronta para lucrar hoje? 💰`,
                `Bem-vinda de volta, ${userName}! Vamos arrasar nas vendas? 🚀`,
                `Oi, ${userName}! Mais um dia de sucesso te espera! 💪`,
                `Olá, ${userName}! Seu negócio está crescendo! 📈`,
                `Bem-vinda, ${userName}! Hora de fazer o que você faz de melhor! 💖`,
                `Oi, ${userName}! Que tal bater aquela meta hoje? 🎯`
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
            
            // Salvar que já mostrou hoje
            localStorage.setItem('lucrocerto_last_welcome', today);
        },
        
        // Fechar banner de aviso do plano
        closePlanBanner() {
            const banner = document.getElementById('plan-alert-banner');
            if (banner) {
                banner.style.display = 'none';
                document.body.classList.remove('has-plan-banner');
                // Salvar que o banner foi fechado hoje
                localStorage.setItem('lucrocerto_banner_closed', new Date().toDateString());
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
                    if (isActive) this.renderPage(currentPage);
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

            return `
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
                    variationsText = `${p.variations[0].name}: ${p.variations[0].options.join(', ')}`;
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
                            ${product.variations[0]?.options.map(opt => `
                                <div class="quick-stock-row">
                                    <label>${opt}</label>
                                    <input type="number" class="form-input" data-option="${opt}" value="${product.stock[opt] || 0}" min="0">
                                </div>
                            `).join('')}
                        `;
                    } else if (product.variationType === 'combined') {
                        stockHTML = `
                            <p style="margin-bottom: 16px; color: var(--dark-gray);">Estoque de <strong>${product.name}</strong>:</p>
                            <div class="quick-stock-grid">
                            ${product.variations[0]?.options.map(opt1 => `
                                <div class="quick-stock-section">
                                    <h5>${opt1}</h5>
                                    ${product.variations[1]?.options.map(opt2 => `
                                        <div class="quick-stock-row">
                                            <label>${opt2}</label>
                                            <input type="number" class="form-input" data-combined="${opt1}-${opt2}" value="${product.stock[`${opt1}-${opt2}`] || 0}" min="0">
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
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
                                </label>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" class="form-input" id="variation-options-input-1" placeholder="Ex: P, M, G" style="flex: 1;">
                                    <button type="button" class="btn btn-primary" id="add-variation-btn-1" style="white-space: nowrap;">
                                        <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Adicionar
                                    </button>
                                </div>
                                <small>💡 Digite uma opção e clique em Adicionar, ou separe por vírgula (P, M, G)</small>
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
                    const addBtn = document.getElementById('add-variation-btn-1');
                    
                    // Função para adicionar variação
                    const addVariation = () => {
                        const value = optionsInput.value.trim();
                        if (!value) return;
                        
                        // Aceita valores separados por vírgula
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
                        
                        renderVariationTags();
                        renderStockTable();
                        optionsInput.value = '';
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
                                const selectedPhotoIdx = variationImagesMap[option];
                                const hasPhoto = selectedPhotoIdx !== undefined && productImages[selectedPhotoIdx];
                                
                                return `
                                <div class="stock-option-row" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--white); border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--light-gray);">
                                    <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                                        ${isColorVariation && hasPhoto ? `
                                            <img src="${productImages[selectedPhotoIdx]}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 2px solid var(--primary);">
                                        ` : isColorVariation ? `
                                            <div style="width: 40px; height: 40px; background: var(--light-gray); border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--medium-gray);">
                                                <i data-lucide="image" style="width: 18px; height: 18px; color: var(--elegant-gray);"></i>
                                            </div>
                                        ` : ''}
                                        <strong style="font-size: 14px; color: var(--dark-gray);">${option}</strong>
                                    </div>
                                    
                                    ${isColorVariation && productImages.length > 0 ? `
                                        <div class="photo-selector" style="display: flex; gap: 6px; align-items: center;">
                                            <span style="font-size: 11px; color: var(--elegant-gray); margin-right: 4px;">Foto:</span>
                                            ${productImages.map((img, idx) => `
                                                <button type="button" 
                                                    class="photo-select-btn ${selectedPhotoIdx === idx ? 'selected' : ''}" 
                                                    data-variation-option="${option}" 
                                                    data-photo-idx="${idx}"
                                                    style="width: 36px; height: 36px; padding: 0; border: 2px solid ${selectedPhotoIdx === idx ? 'var(--primary)' : 'var(--light-gray)'}; border-radius: 6px; cursor: pointer; overflow: hidden; background: none; transition: all 0.2s;">
                                                    <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
                                                </button>
                                            `).join('')}
                                            ${hasPhoto ? `
                                                <button type="button" class="photo-clear-btn" data-variation-option="${option}" 
                                                    style="width: 28px; height: 28px; padding: 0; border: none; background: #fee2e2; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Remover foto">
                                                    <i data-lucide="x" style="width: 14px; height: 14px; color: #ef4444;"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    ` : ''}
                                    
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span style="font-size: 11px; color: var(--elegant-gray);">Qtd:</span>
                                        <input type="number" class="form-input" data-stock-option="${option}" value="${currentStock[option] || 0}" min="0" placeholder="0" style="width: 70px; text-align: center; padding: 8px;">
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
                
                // Pegar descrição se habilitada
                const hasDescription = document.getElementById('has-description')?.checked;
                const description = hasDescription ? (document.getElementById('product-description')?.value.trim() || '') : '';
                
                const productData = {
                    id: editingProductId || `prod_${Date.now()}`,
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
                    
                    // Coleta estoque para cada opção
                    variationOptions1.forEach(option => {
                        const stockInput = document.querySelector(`[data-stock-option="${option}"]`);
                        productData.stock[option] = parseInt(stockInput?.value) || 0;
                    });
                    
                    // Usa o mapa de fotos vinculadas que foi construído durante a edição
                    productData.variationImages = { ...variationImagesMap };
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
                    
                    // Usa o mapa de fotos vinculadas que foi construído durante a edição
                    productData.variationImages = { ...variationImagesMap };
                }

                // Salva ou atualiza produto
                const state = StateManager.getState();
                let updatedProducts;

                if (editingProductId) {
                    updatedProducts = state.products.map(p => p.id === editingProductId ? productData : p);
                } else {
                    // Verificar limite de teste grátis
                    const isTrial = localStorage.getItem('lucrocerto_trial') === 'true';
                    const TRIAL_PRODUCT_LIMIT = 3;
                    
                    if (isTrial && state.products.length >= TRIAL_PRODUCT_LIMIT) {
                        showTrialLimitModal();
                        return;
                    }
                    
                    updatedProducts = [...state.products, productData];
                    AchievementSystem.checkAndAward('primeiro_produto');
                    
                    // Se for trial e chegou no limite, mostrar aviso
                    if (isTrial && updatedProducts.length >= TRIAL_PRODUCT_LIMIT) {
                        setTimeout(() => showTrialLimitReachedBanner(), 500);
                    }
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
            const catalogUrl = `${window.location.origin}/catalogo`;
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
                colorPalette.addEventListener('click', (e) => {
                    const colorBtn = e.target.closest('.color-option');
                    if (colorBtn) {
                        const color = colorBtn.dataset.color;
                        const user = { ...StateManager.getState().user, catalogColor: color };
                        StateManager.setState({ user });
                        
                        // Atualiza visual
                        colorPalette.querySelectorAll('.color-option').forEach(btn => {
                            btn.classList.remove('active');
                            btn.innerHTML = '';
                        });
                        colorBtn.classList.add('active');
                        colorBtn.innerHTML = '<i data-lucide="check"></i>';
                        lucide.createIcons({ nodes: [colorBtn.querySelector('[data-lucide]')] });
                        
                        // Atualiza preview
                        const previewHeader = document.querySelector('.catalog-preview-header');
                        const colors = { pink: '#E91E63', blue: '#2196F3', green: '#4CAF50', purple: '#9C27B0', orange: '#FF9800' };
                        if (previewHeader) {
                            previewHeader.style.background = colors[color];
                        }
                    }
                });
            }
            
            // Copiar link
            document.querySelector('[data-action="copy-catalog-link-page"]')?.addEventListener('click', () => {
                const input = document.getElementById('catalog-link-input');
                input.select();
                document.execCommand('copy');
                alert('Link copiado! 📋');
            });
            
            // Compartilhar WhatsApp
            document.querySelector('[data-action="share-catalog-whatsapp-page"]')?.addEventListener('click', () => {
                const { user } = StateManager.getState();
                const catalogUrl = `${window.location.origin}/catalogo`;
                const msg = `Olá! 💖 Confira o catálogo da ${user.businessName || 'minha loja'}: ${catalogUrl}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
            });
        },

        // ========== PÁGINA DE CONFIGURAÇÕES ==========
        getConfiguracoesHTML() {
            const { user } = StateManager.getState();
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
                
                <div class="card" style="margin-top: 30px; background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border: 2px solid var(--primary-light);">
                    <h3><i data-lucide="crown" style="width: 20px; height: 20px; vertical-align: middle; color: var(--primary);"></i> Meu Plano</h3>
                    <div id="plan-info-section">
                        <!-- Será preenchido dinamicamente -->
                    </div>
                </div>
                
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
                
                StateManager.setState({ user: updatedUser });
                alert('✅ Configurações salvas com sucesso!');
            });
        },
        
        // Renderizar informações do plano nas configurações
        renderPlanInfo() {
            const planSection = document.getElementById('plan-info-section');
            if (!planSection) return;
            
            // Pegar dados do plano do localStorage
            const authData = JSON.parse(localStorage.getItem('lucrocerto_auth') || '{}');
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
            
            const currentPlan = authData.plano || 'pro';
            const billing = authData.billing || 'monthly';
            const planName = planNames[currentPlan] || 'Profissional';
            const price = planPrices[currentPlan]?.[billing] || 34.90;
            
            // Simular data de vencimento (30 dias a partir do cadastro ou hoje para demo)
            const createdAt = authData.createdAt ? new Date(authData.createdAt) : new Date();
            const expiryDate = new Date(createdAt);
            expiryDate.setDate(expiryDate.getDate() + 30);
            
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
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
                    <a href="./precos" class="btn btn-secondary" style="flex: 1; text-decoration: none; text-align: center;">
                        <i data-lucide="arrow-up-circle" style="width: 16px; height: 16px;"></i> Mudar Plano
                    </a>
                    <a href="./checkout?plan=${currentPlan}&billing=${billing}" class="btn btn-primary" style="flex: 1; text-decoration: none; text-align: center;">
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
                const name = document.getElementById('client-name').value.trim();
                if (!name) {
                    alert('❌ Digite o nome do cliente');
                    return;
                }
                
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
                
                StateManager.setState({ clients: updatedClients });
                document.getElementById('client-modal').style.display = 'none';
                editingClientId = null;
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
                            <span class="sale-total">R$ ${s.total.toFixed(2)}</span>
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
        },
        
        bindVendasEvents() {
            // Eventos básicos - navegação já funciona pelo sistema global
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
                                    const stock = product.stock?.[opt] || 0;
                                    const isOutOfStock = stock <= 0;
                                    return `
                                        <button class="variation-option-btn ${isOutOfStock ? 'out-of-stock' : ''}" 
                                                data-variation-type="${variation.name}" 
                                                data-variation-value="${opt}"
                                                data-stock="${stock}"
                                                ${isOutOfStock ? 'disabled' : ''}>
                                            ${opt}
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
                                ${var1.options.map(opt => `
                                    <button class="variation-option-btn" 
                                            data-variation-type="${var1.name}" 
                                            data-variation-value="${opt}"
                                            data-variation-index="1">
                                        ${opt}
                                    </button>
                                `).join('')}
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
                                    const key = `${selectedVariations.var1}-${opt}`;
                                    const stock = product.stock?.[key] || 0;
                                    const isOutOfStock = stock <= 0;
                                    return `
                                        <button class="variation-option-btn ${isOutOfStock ? 'out-of-stock' : ''}" 
                                                data-variation-type="${var2.name}" 
                                                data-variation-value="${opt}"
                                                data-stock="${stock}"
                                                data-variation-index="2"
                                                ${isOutOfStock ? 'disabled' : ''}>
                                            ${opt}
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
            document.querySelector('[data-action="finish-sale"]')?.addEventListener('click', () => {
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
                    id: `sale_${Date.now()}`,
                    date: new Date().toISOString(),
                    clientId: clientId || null,
                    clientName: clientName,
                    clientPhone: clientPhone,
                    items: saleItems,
                    paymentMethod: paymentMethod,
                    shipping: shipping,
                    discount: discount,
                    subtotal: subtotal,
                    total: Math.max(0, total),
                    notes: notes
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
                        id: `cli_${Date.now()}`,
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
                
                StateManager.setState({
                    sales: [...(currentSales || []), sale],
                    products: updatedProducts,
                    clients: updatedClients,
                    user: updatedUser,
                    currentPage: 'vendas'
                });
                
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
                id: `prod_${Date.now()}`, 
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
                        localStorage.removeItem('lucrocerto_logged');
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
                currentPage: 'dashboard' // Sempre inicia no dashboard
            };
            StateManager.setState(DemoData);
        } else {
            // Garantir que sempre inicie no dashboard
            savedState.currentPage = 'dashboard';
            StateManager.setState(savedState);
        }
        
        UIManager.init();
        UIManager.updateActiveContent();
        UIManager.updateNav();
        bindEvents();
        AchievementSystem.checkAndAward('primeiro_acesso');
        
        // Inicializar Trial Banner se estiver em teste
        initTrialMode();
    }

    //==================================
    // 7. TRIAL MODE FUNCTIONS
    //==================================
    function initTrialMode() {
        const isTrial = localStorage.getItem('lucrocerto_trial') === 'true';
        if (!isTrial) return;
        
        // Adicionar banner de trial no topo
        const trialBanner = document.createElement('div');
        trialBanner.id = 'trial-banner';
        trialBanner.innerHTML = `
            <div class="trial-banner-content">
                <span><i data-lucide="sparkles"></i> <strong>Modo Teste Grátis</strong> - Você pode cadastrar até 3 produtos</span>
                <a href="planos" class="trial-upgrade-btn">Fazer Upgrade</a>
            </div>
        `;
        trialBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 10px 20px;
            z-index: 9999;
            font-size: 13px;
        `;
        
        const bannerContent = trialBanner.querySelector('.trial-banner-content');
        bannerContent.style.cssText = `
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
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
        `;
        
        document.body.prepend(trialBanner);
        document.body.style.paddingTop = '50px';
        document.body.classList.add('has-trial-banner');
        
        setTimeout(() => lucide.createIcons({ nodes: [trialBanner] }), 100);
        
        // Mostrar contador de produtos no banner
        updateTrialProductCounter();
    }
    
    function updateTrialProductCounter() {
        const isTrial = localStorage.getItem('lucrocerto_trial') === 'true';
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
                    <a href="planos" class="btn-upgrade">Ver Planos</a>
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
                <a href="planos" style="background: white; color: #FF9800; padding: 8px 20px; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 13px;">Ver Planos</a>
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

    return { 
        init,
        closePlanBanner: UIManager.closePlanBanner.bind(UIManager)
    };
})();

document.addEventListener('DOMContentLoaded', LucroCertoApp.init);
