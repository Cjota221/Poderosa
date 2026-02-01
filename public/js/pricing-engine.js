/**
 * =====================================================
 * PRICING ENGINE - Motor de Precificação Inteligente
 * =====================================================
 * 
 * Filosofia: "Fluxo Livre" + "Semáforo Emocional"
 * 
 * - O usuário digita o PREÇO que quer cobrar
 * - O sistema REAGE mostrando as consequências
 * - Sem perguntas complexas, sem rateio visível
 * - Feedback humanizado, não técnico
 * 
 * =====================================================
 */

const PricingEngine = {
    
    // ═══════════════════════════════════════════════════════════
    // REGRAS DO SEMÁFORO EMOCIONAL
    // ═══════════════════════════════════════════════════════════
    // 
    // Define as faixas de margem de lucro e seus significados
    // Baseado em práticas de mercado para pequenos negócios
    // ═══════════════════════════════════════════════════════════
    
    SEMAFORO: {
        VERMELHO: {
            id: 'vermelho',
            minMargemPercent: -Infinity,
            maxMargemPercent: 20,
            emoji: '🔴',
            titulo: 'Preço Perigoso',
            cor: '#EF4444',        // Vermelho
            corFundo: '#FEE2E2',   // Vermelho claro
            descricao: 'Você mal cobre os custos'
        },
        AMARELO: {
            id: 'amarelo',
            minMargemPercent: 20,
            maxMargemPercent: 35,
            emoji: '�',
            titulo: 'Preço Apertado',
            cor: '#EA580C',        // Laranja (mais visível)
            corFundo: '#FED7AA',   // Laranja claro
            descricao: 'Funciona, mas está no limite'
        },
        VERDE: {
            id: 'verde',
            minMargemPercent: 35,
            maxMargemPercent: 50,
            emoji: '🟢',
            titulo: 'Preço Saudável',
            cor: '#10B981',        // Verde
            corFundo: '#D1FAE5',   // Verde claro
            descricao: 'Boa margem de segurança'
        },
        ROXO: {
            id: 'roxo',
            minMargemPercent: 50,
            maxMargemPercent: Infinity,
            emoji: '💜',
            titulo: 'Preço Premium',
            cor: '#8B5CF6',        // Roxo
            corFundo: '#EDE9FE',   // Roxo claro
            descricao: 'Excelente valorização!'
        }
    },

    // ═══════════════════════════════════════════════════════════
    // FUNÇÃO PRINCIPAL: Calcular Cenário de Preço
    // ═══════════════════════════════════════════════════════════
    // 
    // Recebe o custo, o preço desejado e as configurações globais
    // Retorna um objeto rico com todas as informações para a UI
    // ═══════════════════════════════════════════════════════════
    
    /**
     * Calcula o cenário completo de um preço de venda
     * 
     * @param {number} custoProduto - Quanto custa FAZER/COMPRAR o produto (R$)
     * @param {number} precoVenda - Quanto a usuária QUER cobrar (R$)
     * @param {Object} config - Configurações globais do negócio
     * @param {number} config.custoFixoMensal - Aluguel, luz, internet... (R$)
     * @param {number} config.custoEmbalagem - Embalagem por unidade (R$)
     * @param {number} config.taxaPercentual - Cartão, marketplace... (%)
     * @param {number} config.impostoPercentual - Impostos sobre venda (%)
     * 
     * @returns {Object} Cenário completo com feedback visual
     */
    calcularCenarioDePreco(custoProduto, precoVenda, config = {}) {
        
        // ─────────────────────────────────────────────────────
        // 1. VALORES PADRÃO (caso não sejam informados)
        // ─────────────────────────────────────────────────────
        const configuracao = {
            custoFixoMensal: config.custoFixoMensal || 0,
            custoEmbalagem: config.custoEmbalagem || 0,
            taxaPercentual: config.taxaPercentual || 0,    // Ex: 3% do cartão
            impostoPercentual: config.impostoPercentual || 0  // Ex: 6% MEI
        };

        // ─────────────────────────────────────────────────────
        // 2. CÁLCULO DO CUSTO DIRETO TOTAL
        // ─────────────────────────────────────────────────────
        // Tudo que "sai junto" com o produto quando vende
        
        const custoDirecto = custoProduto + configuracao.custoEmbalagem;

        // ─────────────────────────────────────────────────────
        // 3. CÁLCULO DOS CUSTOS PERCENTUAIS
        // ─────────────────────────────────────────────────────
        // Taxas e impostos são calculados SOBRE o preço de venda
        
        const percentualTotal = configuracao.taxaPercentual + configuracao.impostoPercentual;
        const valorTaxasImpostos = precoVenda * (percentualTotal / 100);

        // ─────────────────────────────────────────────────────
        // 4. CÁLCULO DA MARGEM DE CONTRIBUIÇÃO
        // ─────────────────────────────────────────────────────
        // O que SOBRA de cada venda para pagar custos fixos e gerar lucro
        // 
        // Fórmula: Preço - Custo Direto - Taxas/Impostos
        
        const margemContribuicao = precoVenda - custoDirecto - valorTaxasImpostos;

        // ─────────────────────────────────────────────────────
        // 5. CÁLCULO DO LUCRO PERCENTUAL
        // ─────────────────────────────────────────────────────
        // Quanto % do preço de venda é lucro
        // (Usado para determinar o semáforo)
        
        const lucroPercentual = precoVenda > 0 
            ? (margemContribuicao / precoVenda) * 100 
            : 0;

        // ─────────────────────────────────────────────────────
        // 6. DETERMINAR COR DO SEMÁFORO
        // ─────────────────────────────────────────────────────
        
        const statusSemaforo = this.determinarSemaforo(lucroPercentual);

        // ─────────────────────────────────────────────────────
        // 7. CALCULAR META DE VENDAS NECESSÁRIA
        // ─────────────────────────────────────────────────────
        // Quantas unidades precisa vender para pagar os custos fixos
        // 
        // Fórmula: Custo Fixo Mensal ÷ Margem de Contribuição
        
        let metaVendasNecessaria = 0;
        let conseguePagarCustoFixo = false;
        
        if (margemContribuicao > 0 && configuracao.custoFixoMensal > 0) {
            metaVendasNecessaria = Math.ceil(configuracao.custoFixoMensal / margemContribuicao);
            conseguePagarCustoFixo = true;
        } else if (margemContribuicao <= 0) {
            // Margem negativa = impossível pagar custos fixos
            metaVendasNecessaria = Infinity;
            conseguePagarCustoFixo = false;
        }

        // ─────────────────────────────────────────────────────
        // 8. GERAR FEEDBACK TEXTUAL HUMANIZADO
        // ─────────────────────────────────────────────────────
        
        const feedbackTexto = this.gerarFeedbackTexto({
            margemContribuicao,
            lucroPercentual,
            statusSemaforo,
            metaVendasNecessaria,
            custoFixoMensal: configuracao.custoFixoMensal,
            precoVenda
        });

        // ─────────────────────────────────────────────────────
        // 9. GERAR CENÁRIOS DE VENDA (5, 10, 20 unidades)
        // ─────────────────────────────────────────────────────
        
        const cenarios = this.gerarCenariosVenda(
            margemContribuicao, 
            configuracao.custoFixoMensal
        );

        // ─────────────────────────────────────────────────────
        // 10. RETORNAR OBJETO RICO
        // ─────────────────────────────────────────────────────
        
        return {
            // Valores calculados
            custoDireto: custoDirecto,
            valorTaxasImpostos,
            margemContribuicao,
            lucroPercentual: Math.round(lucroPercentual * 10) / 10, // 1 casa decimal
            
            // Status visual
            statusSemaforo,
            
            // Meta e viabilidade
            metaVendasNecessaria: metaVendasNecessaria === Infinity ? null : metaVendasNecessaria,
            conseguePagarCustoFixo,
            
            // Feedback humanizado
            feedbackTexto,
            
            // Cenários de venda
            cenarios,
            
            // Dados de entrada (para referência)
            entrada: {
                custoProduto,
                precoVenda,
                configuracao
            }
        };
    },

    // ═══════════════════════════════════════════════════════════
    // FUNÇÃO: Determinar cor do semáforo
    // ═══════════════════════════════════════════════════════════
    
    determinarSemaforo(lucroPercentual) {
        const { VERMELHO, AMARELO, VERDE, ROXO } = this.SEMAFORO;
        
        if (lucroPercentual < VERMELHO.maxMargemPercent) {
            return VERMELHO;
        } else if (lucroPercentual < AMARELO.maxMargemPercent) {
            return AMARELO;
        } else if (lucroPercentual < VERDE.maxMargemPercent) {
            return VERDE;
        } else {
            return ROXO;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // FUNÇÃO: Gerar feedback textual humanizado
    // ═══════════════════════════════════════════════════════════
    // 
    // Transforma números frios em conversa amigável
    // ═══════════════════════════════════════════════════════════
    
    gerarFeedbackTexto(dados) {
        const { 
            margemContribuicao, 
            lucroPercentual, 
            statusSemaforo,
            metaVendasNecessaria,
            custoFixoMensal,
            precoVenda
        } = dados;

        const formatarMoeda = (valor) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

        // ─────────────────────────────────────────────────────
        // Feedback principal baseado no semáforo
        // ─────────────────────────────────────────────────────
        
        let frasePrincipal = '';
        let fraseSecundaria = '';
        let dicaSugestao = '';

        switch (statusSemaforo.id) {
            case 'vermelho':
                if (margemContribuicao <= 0) {
                    frasePrincipal = `😰 Ops! Nesse preço você PERDE ${formatarMoeda(Math.abs(margemContribuicao))} por venda.`;
                    fraseSecundaria = 'O preço não cobre nem os custos diretos.';
                    dicaSugestao = 'Aumente o preço ou reduza seus custos.';
                } else {
                    frasePrincipal = `😟 Cuidado! Você só lucra ${formatarMoeda(margemContribuicao)} por venda.`;
                    fraseSecundaria = `Isso é apenas ${lucroPercentual.toFixed(0)}% do preço.`;
                    dicaSugestao = 'Considere aumentar um pouco o preço.';
                }
                break;

            case 'amarelo':
                frasePrincipal = `😐 Funciona, mas está apertado.`;
                fraseSecundaria = `Você lucra ${formatarMoeda(margemContribuicao)} por venda (${lucroPercentual.toFixed(0)}%).`;
                
                // Sugerir aumento de 10-15%
                const sugestaoPreco = precoVenda * 1.12;
                dicaSugestao = `Que tal ${formatarMoeda(sugestaoPreco)}? Daria mais folga.`;
                break;

            case 'verde':
                frasePrincipal = `😊 Ótimo preço!`;
                fraseSecundaria = `Cada venda te dá ${formatarMoeda(margemContribuicao)} de lucro.`;
                dicaSugestao = 'Preço equilibrado entre lucro e competitividade.';
                break;

            case 'roxo':
                frasePrincipal = `🤩 Preço premium! Seus clientes valorizam seu trabalho.`;
                fraseSecundaria = `Lucro de ${formatarMoeda(margemContribuicao)} por venda (${lucroPercentual.toFixed(0)}%!).`;
                dicaSugestao = 'Se está vendendo bem assim, mantenha!';
                break;
        }

        // ─────────────────────────────────────────────────────
        // Frase sobre meta de vendas (se tiver custo fixo)
        // ─────────────────────────────────────────────────────
        
        let fraseMeta = '';
        
        if (custoFixoMensal > 0) {
            if (metaVendasNecessaria === Infinity || metaVendasNecessaria === null) {
                fraseMeta = `⚠️ Com essa margem, é impossível pagar os custos fixos de ${formatarMoeda(custoFixoMensal)}.`;
            } else if (metaVendasNecessaria <= 10) {
                fraseMeta = `🎯 Venda apenas ${metaVendasNecessaria} unidades para pagar os ${formatarMoeda(custoFixoMensal)} de custos fixos!`;
            } else if (metaVendasNecessaria <= 30) {
                fraseMeta = `🎯 Venda ${metaVendasNecessaria} unidades para cobrir seus custos fixos de ${formatarMoeda(custoFixoMensal)}.`;
            } else {
                fraseMeta = `🎯 Você precisaria vender ${metaVendasNecessaria} unidades para pagar os custos fixos. Muitas, né?`;
            }
        }

        return {
            principal: frasePrincipal,
            secundaria: fraseSecundaria,
            sugestao: dicaSugestao,
            meta: fraseMeta
        };
    },

    // ═══════════════════════════════════════════════════════════
    // FUNÇÃO: Gerar cenários de venda
    // ═══════════════════════════════════════════════════════════
    // 
    // Mostra o que acontece se vender 5, 10, 20 unidades
    // ═══════════════════════════════════════════════════════════
    
    gerarCenariosVenda(margemContribuicao, custoFixoMensal) {
        const quantidades = [5, 10, 20, 50];
        
        return quantidades.map(qtd => {
            const lucroTotal = margemContribuicao * qtd;
            const percentualCustoFixo = custoFixoMensal > 0 
                ? Math.min((lucroTotal / custoFixoMensal) * 100, 100)
                : 100;
            
            // Determinar emoji do cenário
            let emoji, descricao;
            if (lucroTotal <= 0) {
                emoji = '😰';
                descricao = 'Prejuízo';
            } else if (percentualCustoFixo < 30) {
                emoji = '😐';
                descricao = 'Ajuda nas contas';
            } else if (percentualCustoFixo < 70) {
                emoji = '😊';
                descricao = `Cobre ${percentualCustoFixo.toFixed(0)}% do fixo`;
            } else if (percentualCustoFixo < 100) {
                emoji = '😃';
                descricao = 'Quase lá!';
            } else {
                emoji = '🎉';
                descricao = 'Paga o mês!';
            }
            
            return {
                quantidade: qtd,
                lucroTotal,
                percentualCustoFixo: Math.round(percentualCustoFixo),
                emoji,
                descricao
            };
        });
    },

    // ═══════════════════════════════════════════════════════════
    // FUNÇÃO AUXILIAR: Calcular preço sugerido
    // ═══════════════════════════════════════════════════════════
    // 
    // Dado um custo e uma margem desejada, calcula o preço ideal
    // ═══════════════════════════════════════════════════════════
    
    calcularPrecoSugerido(custoProduto, margemDesejadaPercent, config = {}) {
        const custoEmbalagem = config.custoEmbalagem || 0;
        const taxaPercentual = config.taxaPercentual || 0;
        const impostoPercentual = config.impostoPercentual || 0;
        
        const custoDireto = custoProduto + custoEmbalagem;
        const percentualTotal = taxaPercentual + impostoPercentual;
        
        // Fórmula: Preço = (CustoDireto × (1 + Margem%)) ÷ (1 - Taxas%)
        // Isso garante que a margem desejada seja preservada após descontar taxas
        
        const numerador = custoDireto * (1 + margemDesejadaPercent / 100);
        const denominador = 1 - (percentualTotal / 100);
        
        const precoSugerido = denominador > 0 ? numerador / denominador : numerador;
        
        return Math.ceil(precoSugerido * 100) / 100; // Arredonda para cima (2 casas)
    }
};

// ═══════════════════════════════════════════════════════════
// EXEMPLO DE USO (para testes)
// ═══════════════════════════════════════════════════════════
/*

// Configuração do negócio (feita uma vez)
const configNegocio = {
    custoFixoMensal: 450,    // Aluguel + luz + internet
    custoEmbalagem: 3,       // Caixinha + laço
    taxaPercentual: 3,       // Taxa do cartão
    impostoPercentual: 6     // MEI
};

// Usuária cadastra um bolo
const custoBolo = 35;

// Usuária digita o preço que quer cobrar
const precoDesejado = 80;

// Sistema calcula e retorna o cenário completo
const resultado = PricingEngine.calcularCenarioDePreco(
    custoBolo, 
    precoDesejado, 
    configNegocio
);

console.log(resultado);

// Resultado:
// {
//   custoDireto: 38,
//   valorTaxasImpostos: 7.2,
//   margemContribuicao: 34.8,
//   lucroPercentual: 43.5,
//   statusSemaforo: { id: 'verde', emoji: '🟢', titulo: 'Preço Saudável', ... },
//   metaVendasNecessaria: 13,
//   conseguePagarCustoFixo: true,
//   feedbackTexto: {
//     principal: '😊 Ótimo preço!',
//     secundaria: 'Cada venda te dá R$ 34,80 de lucro.',
//     sugestao: 'Preço equilibrado entre lucro e competitividade.',
//     meta: '🎯 Venda 13 unidades para cobrir seus custos fixos de R$ 450,00.'
//   },
//   cenarios: [...]
// }

*/

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PricingEngine = PricingEngine;
}

// Exportar para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PricingEngine;
}
