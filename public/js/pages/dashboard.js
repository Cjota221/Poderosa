// DASHBOARD PAGE - Página principal com visão geral
export function renderDashboard() {
    const { user, products } = window.StateManager.getState();
    const { DataManager, ProductManager } = window;
    
    const now = new Date();
    const hour = now.getHours();
    let saudacao;
    if (hour < 12) saudacao = 'Bom dia';
    else if (hour < 18) saudacao = 'Boa tarde';
    else saudacao = 'Boa noite';

    const percentage = Math.round((user.currentRevenue / user.monthlyGoal) * 100) || 0;
    const totalStock = DataManager.calculateTotalStock(products);
    const totalValue = DataManager.calculateTotalValue(products);

    return `
        <h1>${saudacao}, ${user.name ? user.name.split(' ')[0] : 'Empreendedora'}!</h1>
        <p class="sub-header">Pronta para conquistar o mundo hoje?</p>
        
        <div class="emotional-panel">
            <i data-lucide="sparkles"></i>
            <span>Você está no controle. Continue brilhando! ✨</span>
        </div>
        
        <div class="grid-desktop-2">
            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: var(--success-gradient);">
                        <i data-lucide="gem"></i>
                    </div>
                    <h3 class="card-title">Meta Mensal</h3>
                </div>
                <div class="progress-ring-container">
                    <svg class="progress-ring-svg" width="150" height="150">
                        <circle stroke="#e6e6e6" stroke-width="12" fill="transparent" r="69" cx="75" cy="75"/>
                        <circle class="progress-ring-circle" stroke="url(#goalGradient)" stroke-linecap="round" stroke-width="12" fill="transparent" r="69" cx="75" cy="75"/>
                        <defs>
                            <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#4ade80" />
                                <stop offset="100%" stop-color="#22c55e" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div class="progress-ring-text">
                        <div class="progress-ring-percentage">${percentage}%</div>
                        <div class="progress-ring-label">Concluído</div>
                    </div>
                </div>
                <div class="metric-row">
                    <div class="metric-item">
                        <span class="metric-label">Realizado</span>
                        <span class="metric-value">${DataManager.formatCurrency(user.currentRevenue || 0)}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Meta</span>
                        <span class="metric-value">${DataManager.formatCurrency(user.monthlyGoal || 0)}</span>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: var(--primary-gradient);">
                        <i data-lucide="package"></i>
                    </div>
                    <h3 class="card-title">Estoque Total</h3>
                </div>
                <div class="big-number">${totalStock}</div>
                <p class="metric-description">unidades em estoque</p>
                <div class="metric-row">
                    <div class="metric-item">
                        <span class="metric-label">Produtos</span>
                        <span class="metric-value">${products.length}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Valor Total</span>
                        <span class="metric-value">${DataManager.formatCurrency(totalValue)}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="quick-actions">
            <button class="action-btn" data-action="add-new-product">
                <i data-lucide="package-plus"></i>
                <span>Novo Produto</span>
            </button>
            <button class="action-btn" data-action="navigate" data-route="precificar">
                <i data-lucide="calculator"></i>
                <span>Precificar</span>
            </button>
            <button class="action-btn" data-action="navigate" data-route="despesas">
                <i data-lucide="wallet"></i>
                <span>Despesas</span>
            </button>
            <button class="action-btn" data-action="navigate" data-route="metas">
                <i data-lucide="target"></i>
                <span>Metas</span>
            </button>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Evolução Mensal</h3>
            </div>
            <canvas id="revenue-chart" style="max-height: 300px;"></canvas>
        </div>
    `;
}

export function initDashboardCharts() {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { user } = window.StateManager.getState();
    
    // Dados de exemplo - em produção viriam do histórico
    const data = [0, 500, 1200, 2100, 3500, 4200, user.currentRevenue || 0];
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Atual'],
            datasets: [{
                label: 'Faturamento',
                data: data,
                borderColor: '#E91E63',
                backgroundColor: 'rgba(233, 30, 99, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => 'R$ ' + value
                    }
                }
            }
        }
    });
}
