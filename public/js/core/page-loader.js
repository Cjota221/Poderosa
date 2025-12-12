// PAGE LOADER - Carregador dinâmico de páginas
// Este arquivo gerencia a renderização de todas as páginas da aplicação

export const PageLoader = {
    // Importa e renderiza a página solicitada
    async loadPage(pageId) {
        const container = document.getElementById('main-content');
        if (!container) return;

        try {
            switch(pageId) {
                case 'dashboard':
                    const { renderDashboard, initDashboardCharts } = await import('./pages/dashboard.js');
                    container.innerHTML = renderDashboard();
                    setTimeout(() => {
                        lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] });
                        initDashboardCharts();
                    }, 0);
                    break;

                case 'produtos':
                    const { renderProducts } = await import('./pages/produtos.js');
                    container.innerHTML = renderProducts();
                    setTimeout(() => lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] }), 0);
                    break;

                case 'add-edit-product':
                    const { renderProductForm, bindProductFormEvents } = await import('./pages/produtos.js');
                    container.innerHTML = renderProductForm();
                    bindProductFormEvents();
                    setTimeout(() => lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] }), 0);
                    break;

                case 'despesas':
                    const { renderDespesas, bindDespesasEvents } = await import('./pages/despesas.js');
                    container.innerHTML = renderDespesas();
                    bindDespesasEvents();
                    setTimeout(() => lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] }), 0);
                    break;

                case 'precificar':
                    const { renderPrecificar, bindPrecificarEvents } = await import('./pages/precificar.js');
                    container.innerHTML = renderPrecificar();
                    bindPrecificarEvents();
                    setTimeout(() => lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] }), 0);
                    break;

                case 'metas':
                    const { renderMetas, bindMetasEvents } = await import('./pages/metas.js');
                    container.innerHTML = renderMetas();
                    bindMetasEvents();
                    setTimeout(() => lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] }), 0);
                    break;

                case 'relatorios':
                    const { renderRelatorios } = await import('./pages/relatorios.js');
                    container.innerHTML = renderRelatorios();
                    setTimeout(() => lucide.createIcons({ nodes: [...container.querySelectorAll('[data-lucide]')] }), 0);
                    break;

                default:
                    container.innerHTML = '<h2>Página não encontrada</h2>';
            }
        } catch (error) {
            console.error('Erro ao carregar página:', error);
            container.innerHTML = '<h2>Erro ao carregar página</h2><p>Por favor, recarregue a aplicação.</p>';
        }
    }
};
