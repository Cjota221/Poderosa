// =============================================
// TESTE RÁPIDO DE VENDA VIA CONSOLE - SIMPLES
// =============================================
// COLE NO CONSOLE (F12) DEPOIS DE FAZER LOGIN

console.log('🧪 === TESTE SIMPLES DE VENDA ===');

// Dados básicos da venda
const vendaTeste = {
    id: 'b1c2d3e4-f5a6-4123-8901-234567890abc',
    date: new Date().toISOString(),
    clientName: 'Cliente Console',
    products: [{
        product_id: null,
        product_name: 'Produto Console',
        price: 25.00,
        quantity: 1,
        total: 25.00
    }],
    total: 25.00,
    status: 'concluida'
};

// Teste direto
console.log('💾 Testando salvamento...');

SupabaseClient.saveSaleToSupabase(vendaTeste)
    .then(result => {
        if (result.success) {
            console.log('🎉 SUCESSO! Venda salva:', result);
            console.log('🔍 Execute no Supabase: SELECT * FROM vendas WHERE id = \'b1c2d3e4-f5a6-4123-8901-234567890abc\';');
        } else {
            console.log('❌ ERRO:', result.error);
            console.log('💡 Motivo:', result.local ? 'Usuário offline' : 'Falha conexão');
        }
    })
    .catch(error => {
        console.error('💥 ERRO GRAVE:', error);
    });

console.log('⏳ Aguarde o resultado acima...');