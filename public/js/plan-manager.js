/**
 * LUCRO CERTO - Controle de Planos e Funcionalidades
 * Define o que cada plano pode acessar
 */

const PlanManager = {
    // Definição dos planos e limites
    plans: {
        trial: {
            name: 'Teste Grátis',
            duration: 7, // dias
            limits: {
                produtos: 3,
                clientes: 5,
                vendas: 10,
                catalogos: 0
            },
            features: {
                dashboard: true,
                produtos: true,
                clientes: true,
                vendas: true,
                precificacao: true,
                despesas: false,
                relatorios: false,
                catalogo: false,
                exportarPdf: false,
                suportePrioritario: false
            }
        },
        starter: {
            name: 'Starter',
            limits: {
                produtos: 20,
                clientes: 20,
                vendas: -1, // ilimitado
                catalogos: 0
            },
            features: {
                dashboard: true,
                produtos: true,
                clientes: true,
                vendas: true,
                precificacao: true,
                despesas: true,
                relatorios: false,
                catalogo: false,
                exportarPdf: false,
                suportePrioritario: false
            }
        },
        pro: {
            name: 'Profissional',
            limits: {
                produtos: -1, // ilimitado
                clientes: -1,
                vendas: -1,
                catalogos: 1
            },
            features: {
                dashboard: true,
                produtos: true,
                clientes: true,
                vendas: true,
                precificacao: true,
                despesas: true,
                relatorios: true,
                catalogo: true,
                exportarPdf: false,
                suportePrioritario: false
            }
        },
        premium: {
            name: 'Premium',
            limits: {
                produtos: -1,
                clientes: -1,
                vendas: -1,
                catalogos: -1 // ilimitado
            },
            features: {
                dashboard: true,
                produtos: true,
                clientes: true,
                vendas: true,
                precificacao: true,
                despesas: true,
                relatorios: true,
                catalogo: true,
                exportarPdf: true,
                suportePrioritario: true
            }
        }
    },

    // Obter plano atual do usuário
    getCurrentPlan() {
        // Verificar se é trial
        if (localStorage.getItem('lucrocerto_trial') === 'true') {
            return 'trial';
        }
        
        // Verificar plano salvo
        const auth = JSON.parse(localStorage.getItem('lucrocerto_auth') || '{}');
        return auth.plano || 'trial';
    },

    // Obter dados do plano
    getPlanData(planId = null) {
        const plan = planId || this.getCurrentPlan();
        return this.plans[plan] || this.plans.trial;
    },

    // Verificar se funcionalidade está disponível
    canAccess(feature) {
        const plan = this.getPlanData();
        return plan.features[feature] === true;
    },

    // Verificar limite de itens
    checkLimit(type, currentCount) {
        const plan = this.getPlanData();
        const limit = plan.limits[type];
        
        // -1 = ilimitado
        if (limit === -1) {
            return { allowed: true, remaining: -1 };
        }
        
        return {
            allowed: currentCount < limit,
            remaining: Math.max(0, limit - currentCount),
            limit: limit
        };
    },

    // Verificar se pode adicionar mais itens
    canAdd(type) {
        // Usar window.appState se disponível, senão usar localStorage
        const state = window.appState || {};
        let currentCount = 0;
        
        switch (type) {
            case 'produtos':
                currentCount = (state.products || []).length;
                break;
            case 'clientes':
                currentCount = (state.clients || []).length;
                break;
            case 'vendas':
                currentCount = (state.sales || []).length;
                break;
        }
        
        return this.checkLimit(type, currentCount);
    },

    // Verificar se trial expirou
    isTrialExpired() {
        if (localStorage.getItem('lucrocerto_trial') !== 'true') {
            return false;
        }
        
        const trialStart = localStorage.getItem('lucrocerto_trial_start');
        if (!trialStart) {
            return false;
        }
        
        const startDate = new Date(trialStart);
        const now = new Date();
        const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        
        return diffDays >= 7;
    },

    // Obter dias restantes do trial
    getTrialDaysLeft() {
        const trialStart = localStorage.getItem('lucrocerto_trial_start');
        if (!trialStart) {
            return 7;
        }
        
        const startDate = new Date(trialStart);
        const now = new Date();
        const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        
        return Math.max(0, 7 - diffDays);
    },

    // Mostrar modal de upgrade
    showUpgradeModal(feature, message) {
        const featureNames = {
            despesas: 'Controle de Despesas',
            relatorios: 'Relatórios Avançados',
            catalogo: 'Catálogo Digital',
            exportarPdf: 'Exportar PDF',
            suportePrioritario: 'Suporte Prioritário'
        };

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'upgrade-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div style="font-size: 60px; margin-bottom: 20px;">🔒</div>
                <h3 style="margin-bottom: 12px;">Funcionalidade Bloqueada</h3>
                <p style="color: var(--elegant-gray); margin-bottom: 20px;">
                    ${message || `<strong>${featureNames[feature] || feature}</strong> não está disponível no seu plano atual.`}
                </p>
                <p style="font-size: 14px; color: var(--elegant-gray); margin-bottom: 24px;">
                    Faça upgrade para desbloquear todas as funcionalidades!
                </p>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('upgrade-modal').remove()" style="flex: 1;">
                        Depois
                    </button>
                    <a href="/" class="btn btn-primary" style="flex: 1; text-decoration: none;">
                        Ver Planos
                    </a>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    // Mostrar modal de limite atingido
    showLimitModal(type) {
        const plan = this.getPlanData();
        const limit = plan.limits[type];
        
        const typeNames = {
            produtos: 'produtos',
            clientes: 'clientes',
            vendas: 'vendas'
        };

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'limit-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div style="font-size: 60px; margin-bottom: 20px;">📊</div>
                <h3 style="margin-bottom: 12px;">Limite Atingido</h3>
                <p style="color: var(--elegant-gray); margin-bottom: 20px;">
                    Você atingiu o limite de <strong>${limit} ${typeNames[type]}</strong> do plano ${plan.name}.
                </p>
                <p style="font-size: 14px; color: var(--elegant-gray); margin-bottom: 24px;">
                    Faça upgrade para adicionar mais ${typeNames[type]}!
                </p>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-secondary" onclick="document.getElementById('limit-modal').remove()" style="flex: 1;">
                        Entendi
                    </button>
                    <a href="/" class="btn btn-primary" style="flex: 1; text-decoration: none;">
                        Fazer Upgrade
                    </a>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    // Mostrar modal de trial expirado
    showTrialExpiredModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'trial-expired-modal';
        modal.style.zIndex = '99999';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 420px; text-align: center;">
                <div style="font-size: 60px; margin-bottom: 20px;">⏰</div>
                <h3 style="margin-bottom: 12px; color: var(--alert);">Seu Teste Gratuito Expirou</h3>
                <p style="color: var(--elegant-gray); margin-bottom: 20px;">
                    Os 7 dias de teste acabaram, mas seus dados estão salvos!
                </p>
                <p style="font-size: 14px; color: var(--elegant-gray); margin-bottom: 24px;">
                    Escolha um plano para continuar usando o Lucro Certo e desbloquear todas as funcionalidades.
                </p>
                <a href="/" class="btn btn-primary btn-lg" style="width: 100%; text-decoration: none; margin-bottom: 12px;">
                    🚀 Escolher meu Plano
                </a>
                <p style="font-size: 12px; color: var(--elegant-gray);">
                    A partir de R$ 19,90/mês
                </p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // NÃO permite fechar - precisa escolher plano
    },

    // Verificar acesso e mostrar modal se necessário
    requireAccess(feature) {
        if (this.canAccess(feature)) {
            return true;
        }
        
        this.showUpgradeModal(feature);
        return false;
    },

    // Verificar limite e mostrar modal se necessário
    requireLimit(type) {
        const check = this.canAdd(type);
        
        if (check.allowed) {
            return true;
        }
        
        this.showLimitModal(type);
        return false;
    },

    // Inicializar verificações
    init() {
        // Verificar se trial expirou
        if (this.isTrialExpired()) {
            this.showTrialExpiredModal();
            return false;
        }
        
        return true;
    },

    // Obter resumo do plano para exibição
    getPlanSummary() {
        const plan = this.getPlanData();
        const currentPlan = this.getCurrentPlan();
        
        return {
            id: currentPlan,
            name: plan.name,
            limits: plan.limits,
            features: plan.features,
            isTrial: currentPlan === 'trial',
            daysLeft: currentPlan === 'trial' ? this.getTrialDaysLeft() : null
        };
    }
};

// Exportar globalmente
window.PlanManager = PlanManager;
