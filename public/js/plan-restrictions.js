/**
 * LUCRO CERTO - Aplicação de Restrições por Plano na Interface
 * Este arquivo aplica as restrições do PlanManager na UI
 */

const PlanRestrictions = {
    // Mapear menu items para features
    menuFeatureMap: {
        'despesas': 'despesas',
        'relatorios': 'relatorios',
        'catalogo': 'catalogo'
    },

    // Inicializar restrições na página
    init() {
        // Esperar PlanManager estar disponível
        if (typeof PlanManager === 'undefined') {
            console.warn('PlanManager não carregado');
            return;
        }

        // Verificar trial expirado primeiro
        if (!PlanManager.init()) {
            return; // Trial expirado, modal já foi mostrado
        }

        // Aplicar restrições
        this.applyMenuRestrictions();
        this.applyButtonRestrictions();
        this.updatePlanBadges();
        this.interceptActions();
    },

    // Aplicar restrições no menu lateral
    applyMenuRestrictions() {
        const menuItems = document.querySelectorAll('.menu-item, .nav-link, [data-page]');
        
        menuItems.forEach(item => {
            const page = item.getAttribute('data-page') || item.getAttribute('href');
            const feature = this.getFeatureFromPage(page);
            
            if (feature && !PlanManager.canAccess(feature)) {
                // Adicionar indicador de bloqueado
                this.markAsLocked(item);
                
                // Interceptar clique
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    PlanManager.showUpgradeModal(feature);
                });
            }
        });
    },

    // Obter feature a partir do nome da página
    getFeatureFromPage(page) {
        if (!page) return null;
        
        const pageFeatureMap = {
            'despesas': 'despesas',
            'relatorios': 'relatorios',
            'catalogo': 'catalogo',
            'catalogo.html': 'catalogo'
        };
        
        return pageFeatureMap[page] || null;
    },

    // Marcar item como bloqueado
    markAsLocked(element) {
        element.classList.add('feature-locked');
        element.style.opacity = '0.6';
        element.style.position = 'relative';
        
        // Adicionar cadeado se não existir
        if (!element.querySelector('.lock-icon')) {
            const lockIcon = document.createElement('span');
            lockIcon.className = 'lock-icon';
            lockIcon.innerHTML = '🔒';
            lockIcon.style.cssText = 'margin-left: 8px; font-size: 12px;';
            element.appendChild(lockIcon);
        }
    },

    // Aplicar restrições em botões de adicionar
    applyButtonRestrictions() {
        // Botões de adicionar produto
        this.restrictAddButton('produto', 'produtos');
        this.restrictAddButton('product', 'produtos');
        
        // Botões de adicionar cliente
        this.restrictAddButton('cliente', 'clientes');
        this.restrictAddButton('client', 'clientes');
        
        // Botões de adicionar venda
        this.restrictAddButton('venda', 'vendas');
        this.restrictAddButton('sale', 'vendas');
    },

    // Restringir botão de adicionar baseado no limite
    restrictAddButton(keyword, limitType) {
        const buttons = document.querySelectorAll(`
            [onclick*="${keyword}"],
            [data-action*="${keyword}"],
            button[id*="${keyword}"],
            .btn-add-${keyword}
        `);

        buttons.forEach(btn => {
            const check = PlanManager.canAdd(limitType);
            
            if (!check.allowed) {
                btn.classList.add('limit-reached');
                btn.title = `Limite de ${check.limit} atingido`;
            }
        });
    },

    // Atualizar badges de plano na interface
    updatePlanBadges() {
        const summary = PlanManager.getPlanSummary();
        
        // Atualizar badge do plano no header
        const planBadge = document.querySelector('.plan-badge, #plan-badge');
        if (planBadge) {
            planBadge.textContent = summary.name;
            planBadge.className = `plan-badge plan-${summary.id}`;
        }

        // Atualizar contador de trial
        if (summary.isTrial) {
            this.updateTrialBanner(summary.daysLeft);
        }

        // Atualizar limites na UI
        this.updateLimitCounters();
    },

    // Atualizar banner de trial
    updateTrialBanner(daysLeft) {
        const banner = document.querySelector('.trial-banner, #trial-banner');
        if (banner) {
            const daysText = daysLeft === 1 ? 'dia' : 'dias';
            banner.innerHTML = `
                ⏱️ <strong>${daysLeft} ${daysText}</strong> restantes no teste grátis
                <a href="/" style="color: inherit; margin-left: 12px; text-decoration: underline;">
                    Ver planos
                </a>
            `;
        }
    },

    // Atualizar contadores de limite
    updateLimitCounters() {
        const state = typeof StateManager !== 'undefined' ? StateManager.getState() : {};
        
        // Produtos
        const prodCheck = PlanManager.canAdd('produtos');
        const prodCounter = document.querySelector('#product-count, .product-count');
        if (prodCounter && prodCheck.limit !== -1) {
            const current = (state.products || []).length;
            prodCounter.textContent = `${current}/${prodCheck.limit}`;
            if (!prodCheck.allowed) prodCounter.classList.add('limit-reached');
        }

        // Clientes
        const clientCheck = PlanManager.canAdd('clientes');
        const clientCounter = document.querySelector('#client-count, .client-count');
        if (clientCounter && clientCheck.limit !== -1) {
            const current = (state.clients || []).length;
            clientCounter.textContent = `${current}/${clientCheck.limit}`;
            if (!clientCheck.allowed) clientCounter.classList.add('limit-reached');
        }
    },

    // Interceptar ações que precisam de verificação
    interceptActions() {
        // Interceptar criação de produtos
        this.interceptFunction('addProduct', 'produtos');
        this.interceptFunction('saveProduct', 'produtos');
        this.interceptFunction('novoProduto', 'produtos');
        
        // Interceptar criação de clientes
        this.interceptFunction('addClient', 'clientes');
        this.interceptFunction('saveClient', 'clientes');
        this.interceptFunction('novoCliente', 'clientes');
        
        // Interceptar criação de vendas
        this.interceptFunction('addSale', 'vendas');
        this.interceptFunction('saveSale', 'vendas');
        this.interceptFunction('novaVenda', 'vendas');

        // Interceptar funções de features bloqueadas
        this.interceptFeatureFunction('gerarRelatorio', 'relatorios');
        this.interceptFeatureFunction('exportarPdf', 'exportarPdf');
        this.interceptFeatureFunction('abrirCatalogo', 'catalogo');
    },

    // Interceptar função para verificar limite
    interceptFunction(funcName, limitType) {
        if (typeof window[funcName] === 'function') {
            const original = window[funcName];
            window[funcName] = function(...args) {
                if (!PlanManager.requireLimit(limitType)) {
                    return;
                }
                return original.apply(this, args);
            };
        }
    },

    // Interceptar função para verificar feature
    interceptFeatureFunction(funcName, feature) {
        if (typeof window[funcName] === 'function') {
            const original = window[funcName];
            window[funcName] = function(...args) {
                if (!PlanManager.requireAccess(feature)) {
                    return;
                }
                return original.apply(this, args);
            };
        }
    },

    // Verificar antes de abrir modal de adicionar
    checkBeforeAdd(type) {
        return PlanManager.requireLimit(type);
    },

    // Verificar antes de acessar feature
    checkFeature(feature) {
        return PlanManager.requireAccess(feature);
    }
};

// CSS para itens bloqueados
const restrictionStyles = document.createElement('style');
restrictionStyles.textContent = `
    .feature-locked {
        cursor: not-allowed !important;
        position: relative;
    }
    
    .feature-locked:hover::after {
        content: 'Disponível em planos superiores';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--dark, #1a1a1a);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
    }
    
    .limit-reached {
        color: var(--alert, #ff6b6b) !important;
    }
    
    .plan-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .plan-trial {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
    }
    
    .plan-starter {
        background: linear-gradient(135deg, #11998e, #38ef7d);
        color: white;
    }
    
    .plan-pro {
        background: linear-gradient(135deg, #ee0979, #ff6a00);
        color: white;
    }
    
    .plan-premium {
        background: linear-gradient(135deg, #f7971e, #ffd200);
        color: #1a1a1a;
    }
    
    /* Modal de upgrade/limite */
    #upgrade-modal .modal-content,
    #limit-modal .modal-content,
    #trial-expired-modal .modal-content {
        animation: modalSlideIn 0.3s ease;
    }
    
    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(restrictionStyles);

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PlanRestrictions.init());
} else {
    // Pequeno delay para garantir que outros scripts carregaram
    setTimeout(() => PlanRestrictions.init(), 100);
}

// Exportar globalmente
window.PlanRestrictions = PlanRestrictions;
