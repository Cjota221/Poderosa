// ================================================
// LIMPEZA DE DADOS ANTIGOS - CONSOLE DO NAVEGADOR
// ================================================

console.log('🧹 Limpando dados antigos do localStorage...');

// 1. Ver dados atuais
const currentState = JSON.parse(localStorage.getItem('lucrocerto_state') || '{}');
console.log('📊 Estado atual:', {
    vendas: currentState.sales?.length || 0,
    clientes: currentState.clients?.length || 0,
    produtos: currentState.products?.length || 0
});

// 2. Identificar dados com IDs antigos
const vendasAntigas = currentState.sales?.filter(s => s.id && !s.id.includes('-')) || [];
const clientesAntigos = currentState.clients?.filter(c => c.id && !c.id.includes('-')) || [];

console.log('🚨 Dados antigos encontrados:', {
    vendas: vendasAntigas.length,
    clientes: clientesAntigos.length
});

if (vendasAntigas.length > 0) {
    console.log('📋 IDs de vendas antigas:', vendasAntigas.map(v => v.id));
}

if (clientesAntigos.length > 0) {
    console.log('👥 IDs de clientes antigos:', clientesAntigos.map(c => c.id));
}

// 3. Limpar dados antigos (manter apenas com UUID válido)
const estadoLimpo = {
    ...currentState,
    sales: currentState.sales?.filter(s => s.id && s.id.includes('-')) || [],
    clients: currentState.clients?.filter(c => c.id && c.id.includes('-')) || []
};

// 4. Salvar estado limpo
localStorage.setItem('lucrocerto_state', JSON.stringify(estadoLimpo));

console.log('✅ Limpeza concluída! Novo estado:', {
    vendas: estadoLimpo.sales?.length || 0,
    clientes: estadoLimpo.clients?.length || 0,
    produtos: estadoLimpo.products?.length || 0
});

console.log('🔄 Agora recarregue a página para testar novamente!');

// ================================================
// EXECUTAR ESTE CÓDIGO NO CONSOLE (F12)
// ================================================