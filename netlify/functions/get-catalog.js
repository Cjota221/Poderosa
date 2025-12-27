// Netlify Function - Buscar dados do catálogo público
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const storeId = event.queryStringParameters?.loja;

        if (!storeId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'ID da loja é obrigatório' })
            };
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Configuração do banco não encontrada' })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Decodificar o storeId (pode ser base64)
        let decodedEmail;
        try {
            decodedEmail = Buffer.from(storeId, 'base64').toString('utf-8');
            console.log('📧 Email decodificado:', decodedEmail);
        } catch (e) {
            // Se não for base64, usar como está
            decodedEmail = storeId;
        }

        // Buscar usuário pelo email
        const { data: usuario, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', decodedEmail)
            .single();

        if (userError || !usuario) {
            console.error('❌ Usuário não encontrado:', decodedEmail);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Loja não encontrada' 
                })
            };
        }

        // Buscar produtos do usuário
        const { data: produtos, error: prodError } = await supabase
            .from('produtos')
            .select('*')
            .eq('usuario_id', usuario.id);

        if (prodError) {
            console.error('❌ Erro ao buscar produtos:', prodError);
        }
        
        console.log('📦 Produtos encontrados:', produtos?.length || 0);

        // Formatar dados para o frontend
        const store = {
            businessName: usuario.nome,
            nome: usuario.nome,
            phone: usuario.telefone,
            telefone: usuario.telefone,
            profilePhoto: usuario.foto_perfil,
            foto_perfil: usuario.foto_perfil,
            catalogLogo: usuario.logo_catalogo,
            logo_catalogo: usuario.logo_catalogo,
            catalogColor: 'pink' // Default, você pode adicionar no banco depois
        };

        const products = (produtos || []).map(p => ({
            id: p.id,
            name: p.nome,
            description: p.descricao,
            category: p.categoria,
            baseCost: parseFloat(p.custo_base || 0),
            finalPrice: parseFloat(p.preco_venda || 0),
            variationType: p.tipo_variacao || 'none',
            variations: p.variacoes || [],
            stock: p.estoque || {},
            imageUrl: p.imagem_url,
            images: p.imagens || []
        }));

        console.log('✅ Catálogo carregado:', {
            loja: store.businessName,
            produtos: products.length
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                store,
                products
            })
        };

    } catch (error) {
        console.error('❌ Erro ao buscar catálogo:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Erro ao carregar catálogo' 
            })
        };
    }
};
