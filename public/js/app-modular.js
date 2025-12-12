// APP MODULAR - Nova arquitetura com módulos ES6
// Para usar esta versão, troque no index.html: app.js por app-modular.js

import { StateManager } from './core/state-manager.js';
import { DataManager } from './core/data-manager.js';
import { SmartPricing } from './managers/smart-pricing.js';
import { ProductManager } from './managers/product-manager.js';
import { CostManager } from './managers/cost-manager.js';
import { AchievementSystem } from './utils/achievements.js';
import { renderDashboard, initDashboardCharts } from './pages/dashboard.js';

// Expõe módulos globalmente para compatibilidade
window.StateManager = StateManager;
window.DataManager = DataManager;
window.SmartPricing = SmartPricing;
window.ProductManager = ProductManager;
window.CostManager = CostManager;
window.AchievementSystem = AchievementSystem;

//==================================
// UI MANAGER
//==================================
const UIManager = {
    pages: [
        { id: 'dashboard', icon: 'layout-dashboard', label: 'Início' },
        { id: 'produtos', icon: 'package-search', label: 'Produtos' },
        { id: 'despesas', icon: 'wallet', label: 'Despesas' },
        { id: 'precificar', icon: 'calculator', label: 'Precificar' },
        { id: 'metas', icon: 'target', label: 'Metas' },
        { id: 'relatorios', icon: 'bar-chart-3', label: 'Relatórios' }
    ],

    init() {
        this.renderNav();
        StateManager.subscribe(() => this.onStateChange());
        this.onStateChange();
    },

    renderNav() {
        const nav = document.querySelector('.bottom-nav');
        if (!nav) return;

        nav.innerHTML = this.pages.map(page => `
            <button class="nav-button" data-action="navigate" data-route="${page.id}">
                <i data-lucide="${page.icon}"></i>
                <span>${page.label}</span>
            </button>
        `).join('');

        setTimeout(() => lucide.createIcons({ nodes: [...nav.querySelectorAll('[data-lucide]')] }), 0);
    },

    onStateChange() {
        const { currentPage } = StateManager.getState();
        
        // Atualiza nav ativa
        document.querySelectorAll('.nav-button').forEach(btn => {
            const isActive = btn.dataset.route === currentPage;
            btn.classList.toggle('active', isActive);
            if (isActive) this.renderPage(currentPage);
        });
    },

    async renderPage(pageId) {
        const container = document.getElementById('main-content');
        if (!container) return;

        const pageRenderers = {
            dashboard: () => { 
                container.innerHTML = renderDashboard(); 
                initDashboardCharts(); 
            },
            produtos: async () => { 
                const { renderProducts } = await import('./pages/produtos.js');
                container.innerHTML = renderProducts(); 
            },
            'add-edit-product': async () => { 
                const { renderProductForm, bindProductFormEvents } = await import('./pages/produtos.js');
                container.innerHTML = renderProductForm();
                bindProductFormEvents();
            },
            despesas: async () => { 
                const { renderDespesas, bindDespesasEvents } = await import('./pages/despesas.js');
                container.innerHTML = renderDespesas(); 
                bindDespesasEvents(); 
            },
            precificar: async () => { 
                const { renderPrecificar, bindPrecificarEvents } = await import('./pages/precificar.js');
                container.innerHTML = renderPrecificar(); 
                bindPrecificarEvents(); 
            },
            metas: async () => { 
                const { renderMetas, bindMetasEvents } = await import('./pages/metas.js');
                container.innerHTML = renderMetas(); 
                bindMetasEvents(); 
            },
            relatorios: async () => { 
                const { renderRelatorios } = await import('./pages/relatorios.js');
                container.innerHTML = renderRelatorios(); 
            }
        };

        if (pageRenderers[pageId]) {
            await pageRenderers[pageId]();
            setTimeout(() => {
                lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] });
            }, 0);
        }
    },

    showAchievement(action) {
        const badge = AchievementSystem.getAchievementBadge(action);
        if (!badge) return;

        const modal = document.getElementById('achievement-modal');
        if (!modal) return;

        modal.querySelector('.achievement-icon i').dataset.lucide = badge.icon;
        modal.querySelector('.achievement-title').textContent = badge.title;
        modal.querySelector('.achievement-description').textContent = badge.description;
        modal.querySelector('.achievement-icon').style.background = badge.color;
        modal.style.display = 'flex';

        lucide.createIcons({ nodes: [modal.querySelector('.achievement-icon i')] });

        if (window.confetti) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
    }
};

//==================================
// EVENT BINDING
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
            'add-new-product': () => StateManager.setState({ currentPage: 'add-edit-product', editingProductId: null }),
            'edit-product': () => StateManager.setState({ currentPage: 'add-edit-product', editingProductId: productId }),
            'cancel-product-edit': () => StateManager.setState({ currentPage: 'produtos', editingProductId: null }),
            'close-achievement': () => document.getElementById('achievement-modal').style.display = 'none'
        };
        
        if (actions[action]) actions[action]();
    });
}

//==================================
// INIT
//==================================
function init() {
    console.log('🚀 Lucro Certo App - Versão Modular 2.0');
    
    // Carrega dados salvos
    const savedState = DataManager.load('appState');
    if (savedState) {
        StateManager.setState(savedState);
    } else {
        // Estado inicial
        StateManager.setState({
            user: { name: 'Empreendedora', monthlyGoal: 5000, currentRevenue: 0, monthlySalesGoal: 30 },
            products: [],
            costs: { fixed: [], variable: [], shipping: 0 },
            achievements: []
        });
        AchievementSystem.checkAndAward('primeiro_acesso');
    }
    
    UIManager.init();
    bindEvents();
}

// Inicializa quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
