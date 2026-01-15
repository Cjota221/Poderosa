// ===============================================
// TESTE MANUAL DE VENDA - CONSOLE DO NAVEGADOR
// ===============================================

// 1. COPIE E COLE NO CONSOLE DO NAVEGADOR (F12)
// Este código simula uma venda para testar se está salvando

console.log('🧪 Iniciando teste de venda...');

// Criar dados de venda de teste
const testeSale = {
    id: generateUUID ? generateUUID() : 'venda-teste-' + Date.now(),
    date: new Date().toISOString(),
    clientId: null,
    clientName: 'Cliente Teste',
    clientPhone: '11999999999',
    products: [
        {
            product_id: null, // Produto sem ID específico
            product_name: 'Produto Teste',
            variation: 'Cor: Azul, Tamanho: M',
            variation_key: 'cor_azul_tamanho_m',
            price: 50.00,
            quantity: 2,
            total: 100.00
        },
        {
            product_id: null,
            product_name: 'Produto Teste 2',
            variation: 'Cor: Vermelho',
            variation_key: 'cor_vermelho',
            price: 25.00,
            quantity: 1,
            total: 25.00
        }
    ],
    paymentMethod: 'dinheiro',
    shipping: 0,
    discount: 5.00,
    subtotal: 125.00,
    total: 120.00,
    notes: 'Venda de teste do sistema',
    status: 'concluida'
};

// Função para testar salvamento
async function testarVenda() {
    try {
        console.log('📋 Dados da venda:', testeSale);
        
        // Verificar se SupabaseClient existe
        if (typeof SupabaseClient === 'undefined') {
            console.error('❌ SupabaseClient não encontrado!');
            return;
        }
        
        // Testar salvamento
        console.log('💾 Tentando salvar venda...');
        const resultado = await SupabaseClient.saveSaleToSupabase(testeSale);
        
        if (resultado.success) {
            console.log('✅ SUCESSO! Venda salva no Supabase');
            console.log('📊 Dados salvos:', resultado.data);
        } else {
            console.log('❌ ERRO ao salvar:', resultado.error);
            console.log('📱 Salva apenas local:', resultado.local);
        }
        
    } catch (error) {
        console.error('💥 Erro durante teste:', error);
    }
}

// Executar teste
testarVenda();

// ===============================================
// DEPOIS DO TESTE, EXECUTE NO SUPABASE:
// ===============================================
/*
-- Ver se a venda foi salva
SELECT * FROM vendas ORDER BY created_at DESC LIMIT 1;

-- Ver itens da venda
SELECT iv.* FROM itens_venda iv 
JOIN vendas v ON iv.venda_id = v.id 
ORDER BY v.created_at DESC, iv.created_at DESC 
LIMIT 5;
*/