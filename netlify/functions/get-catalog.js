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

        // Decodificar o storeId (pode ser base64, slug ou email)
        let decodedEmail;
        try {
            decodedEmail = Buffer.from(storeId, 'base64').toString('utf-8');
            console.log('📧 Email decodificado:', decodedEmail);
        } catch (e) {
            // Se não for base64, usar como está
            decodedEmail = storeId;
        }

        // Buscar usuário: 1) por slug exato, 2) por email, 3) por nome aproximado
        let usuario = null;
        let userError = null;

        // 1. Tentar buscar por SLUG exato (URLs amigáveis)
        const slugNormalizado = storeId.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (slugNormalizado) {
            const resSlug = await supabase
                .from('usuarios')
                .select('*')
                .eq('slug', slugNormalizado)
                .limit(1)
                .single();
            
            if (resSlug.data) {
                usuario = resSlug.data;
                console.log('✅ Encontrado por slug:', slugNormalizado);
            }
        }

        // 2. Se não encontrou por slug e parece email, buscar por email
        if (!usuario && decodedEmail && decodedEmail.includes('@')) {
            const res = await supabase
                .from('usuarios')
                .select('*')
                .eq('email', decodedEmail.toLowerCase())
                .limit(1)
                .single();
            usuario = res.data;
            userError = res.error;
            if (usuario) console.log('✅ Encontrado por email:', decodedEmail);
        }

        // 3. Fallback: buscar por nome da loja (aproximado)
        if (!usuario) {
            try {
                const res2 = await supabase
                    .from('usuarios')
                    .select('*')
                    .ilike('nome', `%${storeId}%`)
                    .limit(1)
                    .single();
                usuario = res2.data;
                userError = res2.error;
                if (usuario) console.log('✅ Encontrado por nome aproximado:', storeId);
            } catch (e) {
                // ignorar
            }
        }

        if (userError || !usuario) {
            console.error('❌ Usuário não encontrado:', storeId, decodedEmail);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Loja não encontrada' 
                })
            };
        }

        // Buscar produtos do usuário (APENAS visíveis no catálogo)
        const { data: produtos, error: prodError } = await supabase
            .from('produtos')
            .select('*')
            .eq('usuario_id', usuario.id)
            .eq('visivel_catalogo', true)
            .eq('ativo', true);

        if (prodError) {
            console.error('❌ Erro ao buscar produtos:', prodError);
        }
        
        console.log('📦 Produtos visíveis no catálogo:', produtos?.length || 0);

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
            catalogColor: usuario.cor_catalogo || usuario.catalog_color || 'pink', // Cor do catálogo
            slug: usuario.slug || null,
            email: usuario.email
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
