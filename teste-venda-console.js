// ===============================================
// TESTE MANUAL DE VENDA - CONSOLE DO NAVEGADOR
// ===============================================

// 1. COPIE E COLE NO CONSOLE DO NAVEGADOR (F12)
// Este código simula uma venda para testar se está salvando

console.log('🧪 Iniciando teste de venda...');
console.log('⏰ Timestamp:', new Date().toISOString());

// Verificar dependências primeiro
console.log('🔍 Verificando dependências...');
console.log('- generateUUID:', typeof generateUUID);
console.log('- SupabaseClient:', typeof SupabaseClient);
console.log('- Storage:', typeof Storage);

// Criar dados de venda de teste
const testeSale = {
    id: (typeof generateUUID !== 'undefined') ? generateUUID() : 'venda-teste-' + Date.now(),
    date: new Date().toISOString(),
    clientId: null,
    clientName: 'Cliente Teste Console',
    clientPhone: '11999999999',
    products: [
        {
            product_id: null,
            product_name: 'Produto Teste Console 1',
            variation: 'Cor: Azul, Tamanho: M',
            variation_key: 'cor_azul_tamanho_m',
            price: 50.00,
            quantity: 2,
            total: 100.00
        },
        {
            product_id: null,
            product_name: 'Produto Teste Console 2',
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
    notes: 'Venda de teste via console - ' + new Date().toLocaleString(),
    status: 'concluida'
};

// Função para testar salvamento
async function testarVenda() {
    try {
        console.log('📋 Dados da venda:', testeSale);
        
        // Verificar se SupabaseClient existe
        if (typeof SupabaseClient === 'undefined') {
            console.error('❌ SupabaseClient não encontrado!');
            console.log('💡 Verifique se você está na página correta do sistema');
            return;
        }
        
        // Verificar se o método existe
        if (typeof SupabaseClient.saveSaleToSupabase !== 'function') {
            console.error('❌ Método saveSaleToSupabase não encontrado!');
            console.log('💡 O código pode não ter sido atualizado ainda');
            return;
        }
        
        // Verificar autenticação
        const authData = (typeof Storage !== 'undefined') ? Storage.get('auth') : null;
        console.log('🔑 Usuário logado:', authData?.email || 'Não detectado');
        
        // Testar salvamento
        console.log('💾 Tentando salvar venda...');
        const resultado = await SupabaseClient.saveSaleToSupabase(testeSale);
        
        if (resultado.success) {
            console.log('✅ SUCESSO! Venda salva no Supabase');
            console.log('📊 ID da venda:', testeSale.id);
            console.log('📊 Dados salvos:', resultado.data);
            console.log('');
            console.log('🔍 AGORA EXECUTE NO SUPABASE:');
            console.log(`SELECT * FROM vendas WHERE id = '${testeSale.id}';`);
            console.log(`SELECT * FROM itens_venda WHERE venda_id = '${testeSale.id}';`);
        } else {
            console.log('⚠️ AVISO - Não salvou no Supabase:', resultado.error);
            console.log('📱 Motivo:', resultado.local ? 'Usuário offline/não encontrado' : 'Erro de conexão');
            
            if (resultado.error) {
                console.error('💥 Detalhes do erro:', resultado.error);
            }
        }
        
    } catch (error) {
        console.error('💥 Erro durante teste:', error);
        console.error('📝 Stack trace:', error.stack);
    }
}

// Verificar estado do sistema primeiro
console.log('');
console.log('🔧 === DIAGNÓSTICO DO SISTEMA ===');
console.log('- Página atual:', window.location.href);
console.log('- generateUUID:', typeof generateUUID);
console.log('- SupabaseClient:', typeof SupabaseClient);
console.log('- Storage:', typeof Storage);
console.log('- saveSaleToSupabase:', typeof SupabaseClient?.saveSaleToSupabase);

const authData = (typeof Storage !== 'undefined') ? Storage.get('auth') : null;
console.log('- Usuário logado:', authData?.email || 'Não detectado');
console.log('================================');
console.log('');

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