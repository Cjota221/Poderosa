/**
 * =====================================================
 * PRICING UI - Interface Visual do Semáforo Emocional
 * =====================================================
 * 
 * Componente que renderiza o feedback visual da precificação
 * Usa o PricingEngine como "cérebro" dos cálculos
 * 
 * =====================================================
 */

const PricingUI = {

    // ═══════════════════════════════════════════════════════════
    // RENDERIZAR COMPONENTE COMPLETO DE PRECIFICAÇÃO
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Gera o HTML do componente de precificação
     * @param {string} containerId - ID do elemento onde será inserido
     * @param {Object} produto - Dados do produto (nome, custo)
     * @param {Object} config - Configurações globais do negócio
     */
    renderizar(containerId, produto = {}, config = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const custoAtual = produto.custo || 0;
        const precoAtual = produto.preco || 0;
        const nomeProduto = produto.nome || 'Produto';

        // Buscar margem salva do primeiro produto (se existir)
        const margemSalva = localStorage.getItem('lucrocerto_margem_padrao');
        const precoSugerido = margemSalva && custoAtual > 0 
            ? custoAtual / (1 - parseFloat(margemSalva) / 100)
            : 0;

        container.innerHTML = `
            <div class="pricing-container">
                <!-- CABEÇALHO -->
                <div class="pricing-header">
                    <h3>💰 Precificação</h3>
                    <p class="pricing-subtitle">Digite o preço e veja se está bom!</p>
                </div>

                <!-- CUSTO DO PRODUTO -->
                <div class="pricing-cost-display">
                    <div class="cost-label">
                        <span class="cost-icon">📦</span>
                        <span>Custo para fazer/comprar:</span>
                    </div>
                    <div class="cost-value" id="pricing-custo-display">
                        R$ ${custoAtual.toFixed(2).replace('.', ',')}
                    </div>
                </div>

                <!-- CAMPO DE PREÇO -->
                <div class="pricing-input-section">
                    <label for="pricing-preco-input" class="pricing-label">
                        🏷️ Quanto você quer cobrar?
                    </label>
                    <div class="pricing-input-wrapper">
                        <span class="pricing-currency">R$</span>
                        <input 
                            type="number" 
                            id="pricing-preco-input" 
                            class="pricing-input"
                            placeholder="${precoSugerido > 0 ? precoSugerido.toFixed(2) : '0,00'}"
                            step="0.01"
                            min="0"
                            value="${precoAtual || ''}"
                            data-custo="${custoAtual}"
                        >
                    </div>
                    ${precoSugerido > 0 ? `
                        <small style="color: #059669; margin-top: 8px; display: block;">
                            💡 Sugestão baseada na sua margem padrão: <strong>R$ ${precoSugerido.toFixed(2)}</strong>
                        </small>
                    ` : ''}
                </div>

                <!-- BARRA DO SEMÁFORO -->
                <div class="pricing-semaforo-container" id="pricing-semaforo" style="display: none;">
                    <div class="semaforo-header">
                        <span class="semaforo-emoji" id="semaforo-emoji">🟢</span>
                        <span class="semaforo-titulo" id="semaforo-titulo">Preço Saudável</span>
                    </div>
                    <div class="semaforo-barra-wrapper">
                        <div class="semaforo-barra" id="semaforo-barra">
                            <div class="semaforo-barra-fill" id="semaforo-barra-fill"></div>
                        </div>
                        <div class="semaforo-percentual" id="semaforo-percentual">0%</div>
                    </div>
                </div>

                <!-- FEEDBACK PRINCIPAL -->
                <div class="pricing-feedback" id="pricing-feedback" style="display: none;">
                    <div class="feedback-principal" id="feedback-principal"></div>
                    <div class="feedback-secundario" id="feedback-secundario"></div>
                    <div class="feedback-sugestao" id="feedback-sugestao"></div>
                </div>

                <!-- MARGEM E LUCRO - CARD VERDE -->
                <div class="pricing-resultado pricing-resultado-verde" id="pricing-resultado" style="display: none;">
                    <div class="resultado-item">
                        <span class="resultado-label">Lucro por venda</span>
                        <span class="resultado-valor" id="resultado-lucro">R$ 0,00</span>
                    </div>
                    <div class="resultado-item">
                        <span class="resultado-label">
                            Margem de Contribuição
                            <span class="tooltip-icon" title="É quanto sobra de cada venda para pagar seus custos fixos e gerar lucro. Quanto maior, melhor!">❓</span>
                        </span>
                        <span class="resultado-valor" id="resultado-margem">0%</span>
                    </div>
                </div>
            </div>
        `;

        // Adicionar evento de input
        this.bindEvents(config);
    },

    // ═══════════════════════════════════════════════════════════
    // BIND DE EVENTOS
    // ═══════════════════════════════════════════════════════════
    
    bindEvents(config) {
        const inputPreco = document.getElementById('pricing-preco-input');
        if (!inputPreco) return;

        // Atualizar em tempo real enquanto digita
        inputPreco.addEventListener('input', (e) => {
            const preco = parseFloat(e.target.value) || 0;
            const custo = parseFloat(e.target.dataset.custo) || 0;
            this.atualizarFeedback(custo, preco, config);
            
            // Salvar margem como padrão para próximos produtos
            if (preco > 0 && custo > 0) {
                const margem = ((preco - custo) / preco) * 100;
                if (margem > 0 && margem < 90) {
                    this.salvarMargemPadrao(margem);
                }
            }
        });

        // Também atualizar no blur (quando sai do campo)
        inputPreco.addEventListener('blur', (e) => {
            const preco = parseFloat(e.target.value) || 0;
            const custo = parseFloat(e.target.dataset.custo) || 0;
            this.atualizarFeedback(custo, preco, config);
        });
    },

    // ═══════════════════════════════════════════════════════════
    // SALVAR MARGEM PADRÃO
    // ═══════════════════════════════════════════════════════════
    
    salvarMargemPadrao(margem) {
        // Só salva se ainda não tiver uma margem salva (primeiro produto)
        // Ou se for uma margem melhor
        const margemAtual = localStorage.getItem('lucrocerto_margem_padrao');
        if (!margemAtual) {
            localStorage.setItem('lucrocerto_margem_padrao', margem.toFixed(1));
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ATUALIZAR FEEDBACK VISUAL
    // ═══════════════════════════════════════════════════════════
    
    atualizarFeedback(custo, preco, config) {
        // Elementos do DOM
        const semaforoContainer = document.getElementById('pricing-semaforo');
        const feedbackContainer = document.getElementById('pricing-feedback');
        const resultadoContainer = document.getElementById('pricing-resultado');

        // Se não tem preço, esconde tudo
        if (!preco || preco <= 0) {
            if (semaforoContainer) semaforoContainer.style.display = 'none';
            if (feedbackContainer) feedbackContainer.style.display = 'none';
            if (resultadoContainer) resultadoContainer.style.display = 'none';
            return;
        }

        // Calcular cenário usando o PricingEngine
        const resultado = PricingEngine.calcularCenarioDePreco(custo, preco, config);

        // Mostrar containers
        if (semaforoContainer) semaforoContainer.style.display = 'block';
        if (feedbackContainer) feedbackContainer.style.display = 'block';
        if (resultadoContainer) resultadoContainer.style.display = 'flex';

        // Atualizar semáforo
        this.atualizarSemaforo(resultado);

        // Atualizar feedback textual
        this.atualizarTextoFeedback(resultado);

        // Atualizar resultado numérico
        this.atualizarResultado(resultado);
    },

    // ═══════════════════════════════════════════════════════════
    // ATUALIZAR COMPONENTE DO SEMÁFORO
    // ═══════════════════════════════════════════════════════════
    
    atualizarSemaforo(resultado) {
        const emoji = document.getElementById('semaforo-emoji');
        const titulo = document.getElementById('semaforo-titulo');
        const barra = document.getElementById('semaforo-barra');
        const barraFill = document.getElementById('semaforo-barra-fill');
        const percentual = document.getElementById('semaforo-percentual');
        const container = document.getElementById('pricing-semaforo');

        if (!emoji || !titulo || !barra || !barraFill) return;

        const semaforo = resultado.statusSemaforo;
        const margem = Math.max(0, Math.min(100, resultado.lucroPercentual));

        // Atualizar textos
        emoji.textContent = semaforo.emoji;
        titulo.textContent = semaforo.titulo;
        titulo.style.color = semaforo.cor;
        percentual.textContent = `${resultado.lucroPercentual.toFixed(0)}%`;
        percentual.style.color = semaforo.cor;

        // Atualizar container
        container.style.background = semaforo.corFundo;
        container.style.borderColor = semaforo.cor;

        // Atualizar barra
        barraFill.style.width = `${margem}%`;
        barraFill.style.background = semaforo.cor;

        // Animação suave
        barraFill.style.transition = 'width 0.3s ease, background 0.3s ease';
    },

    // ═══════════════════════════════════════════════════════════
    // ATUALIZAR TEXTO DE FEEDBACK
    // ═══════════════════════════════════════════════════════════
    
    atualizarTextoFeedback(resultado) {
        const principal = document.getElementById('feedback-principal');
        const secundario = document.getElementById('feedback-secundario');
        const sugestao = document.getElementById('feedback-sugestao');
        const container = document.getElementById('pricing-feedback');

        if (!principal || !secundario || !sugestao) return;

        const semaforo = resultado.statusSemaforo;
        const feedback = resultado.feedbackTexto;

        // Atualizar textos
        principal.innerHTML = feedback.principal;
        secundario.textContent = feedback.secundaria;
        sugestao.textContent = feedback.sugestao;

        // Atualizar cores
        container.style.borderLeftColor = semaforo.cor;
        principal.style.color = semaforo.cor;
    },

    // ═══════════════════════════════════════════════════════════
    // ATUALIZAR RESULTADO NUMÉRICO
    // ═══════════════════════════════════════════════════════════
    
    atualizarResultado(resultado) {
        const lucroEl = document.getElementById('resultado-lucro');
        const margemEl = document.getElementById('resultado-margem');

        if (!lucroEl || !margemEl) return;

        const formatarMoeda = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;
        const semaforo = resultado.statusSemaforo;

        lucroEl.textContent = formatarMoeda(resultado.margemContribuicao);
        lucroEl.style.color = semaforo.cor;

        margemEl.textContent = `${resultado.lucroPercentual.toFixed(0)}%`;
        margemEl.style.color = semaforo.cor;
    },

    // ═══════════════════════════════════════════════════════════
    // ATUALIZAR META DE VENDAS
    // ═══════════════════════════════════════════════════════════
    
    atualizarMeta(resultado) {
        const metaTexto = document.getElementById('meta-texto');
        const metaContainer = document.getElementById('pricing-meta');

        if (!metaTexto || !metaContainer) return;

        if (resultado.feedbackTexto.meta) {
            metaTexto.innerHTML = resultado.feedbackTexto.meta;
            metaContainer.style.display = 'flex';
            
            // Cor baseada no semáforo
            const semaforo = resultado.statusSemaforo;
            metaContainer.style.background = semaforo.corFundo;
            metaContainer.style.borderColor = semaforo.cor;
        } else {
            metaContainer.style.display = 'none';
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ATUALIZAR CENÁRIOS DE VENDA
    // ═══════════════════════════════════════════════════════════
    
    atualizarCenarios(resultado) {
        const lista = document.getElementById('cenarios-lista');
        if (!lista) return;

        const formatarMoeda = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

        lista.innerHTML = resultado.cenarios.map(cenario => `
            <div class="cenario-item">
                <div class="cenario-qtd">
                    <span class="cenario-numero">${cenario.quantidade}</span>
                    <span class="cenario-label">unid.</span>
                </div>
                <div class="cenario-info">
                    <span class="cenario-lucro">${formatarMoeda(cenario.lucroTotal)}</span>
                    <span class="cenario-descricao">${cenario.emoji} ${cenario.descricao}</span>
                </div>
                <div class="cenario-barra">
                    <div class="cenario-barra-fill" style="width: ${cenario.percentualCustoFixo}%"></div>
                </div>
            </div>
        `).join('');
    },

    // ═══════════════════════════════════════════════════════════
    // OBTER PREÇO ATUAL DO INPUT
    // ═══════════════════════════════════════════════════════════
    
    getPrecoAtual() {
        const input = document.getElementById('pricing-preco-input');
        return input ? parseFloat(input.value) || 0 : 0;
    },

    // ═══════════════════════════════════════════════════════════
    // DEFINIR PREÇO NO INPUT
    // ═══════════════════════════════════════════════════════════
    
    setPreco(valor, config) {
        const input = document.getElementById('pricing-preco-input');
        if (input) {
            input.value = valor.toFixed(2);
            const custo = parseFloat(input.dataset.custo) || 0;
            this.atualizarFeedback(custo, valor, config);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // ATUALIZAR CUSTO (quando muda ingredientes, etc)
    // ═══════════════════════════════════════════════════════════
    
    setCusto(valor, config) {
        const input = document.getElementById('pricing-preco-input');
        const custoDisplay = document.getElementById('pricing-custo-display');
        
        if (input) {
            input.dataset.custo = valor;
            const preco = parseFloat(input.value) || 0;
            this.atualizarFeedback(valor, preco, config);
        }
        
        if (custoDisplay) {
            custoDisplay.textContent = `R$ ${valor.toFixed(2).replace('.', ',')}`;
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PricingUI = PricingUI;
}
