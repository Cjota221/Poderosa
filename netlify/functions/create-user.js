// Netlify Function - Criar usuário no Supabase após pagamento
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ldfahdueqzgemplxrffm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Função para gerar slug único a partir do nome
async function gerarSlugUnico(supabase, nome) {
    // Normalizar: lowercase, remover acentos, substituir caracteres especiais por hífen
    let slugBase = (nome || 'loja')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-')     // Substitui não-alfanuméricos por hífen
        .replace(/(^-|-$)/g, '');        // Remove hífens do início/fim
    
    if (!slugBase) slugBase = 'loja';
    
    let slugFinal = slugBase;
    let contador = 0;
    
    // Verificar unicidade
    while (true) {
        const { data: existing } = await supabase
            .from('usuarios')
            .select('id')
            .eq('slug', slugFinal)
            .single();
        
        if (!existing) break; // Slug disponível
        
        contador++;
        slugFinal = `${slugBase}-${contador}`;
    }
    
    return slugFinal;
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { email, nome, plano, periodo, paymentId, valor } = body;

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email é obrigatório' })
            };
        }

        // Criar cliente Supabase com service key (para bypass RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verificar se usuário já existe
        const { data: existingUser } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .single();

        let userId;
        let userSlug;

        if (existingUser) {
            userId = existingUser.id;
            console.log('Usuário existente:', userId);
            
            // Buscar slug existente
            const { data: userData } = await supabase
                .from('usuarios')
                .select('slug')
                .eq('id', userId)
                .single();
            userSlug = userData?.slug;
            
            // Se não tem slug, gerar um
            if (!userSlug) {
                userSlug = await gerarSlugUnico(supabase, nome || email.split('@')[0]);
                await supabase
                    .from('usuarios')
                    .update({ slug: userSlug })
                    .eq('id', userId);
                console.log('Slug gerado para usuário existente:', userSlug);
            }
        } else {
            // Gerar slug único para novo usuário
            userSlug = await gerarSlugUnico(supabase, nome || email.split('@')[0]);
            
            // Criar novo usuário com slug
            const { data: newUser, error: userError } = await supabase
                .from('usuarios')
                .insert({
                    email: email,
                    nome: nome || email.split('@')[0],
                    slug: userSlug
                })
                .select()
                .single();

            if (userError) {
                throw new Error('Erro ao criar usuário: ' + userError.message);
            }

            userId = newUser.id;
            console.log('Novo usuário criado:', userId, 'slug:', userSlug);
        }

        // Calcular data de expiração
        const dataInicio = new Date();
        const dataFim = new Date();
        if (periodo === 'annual') {
            dataFim.setFullYear(dataFim.getFullYear() + 1);
        } else {
            dataFim.setMonth(dataFim.getMonth() + 1);
        }

        // Criar assinatura
        const { data: assinatura, error: assinaturaError } = await supabase
            .from('assinaturas')
            .insert({
                usuario_id: userId,
                plano: plano || 'pro',
                periodo: periodo || 'monthly',
                status: 'active',
                data_inicio: dataInicio.toISOString(),
                data_fim: dataFim.toISOString(),
                payment_id: paymentId,
                valor: valor || 0
            })
            .select()
            .single();

        if (assinaturaError) {
            console.error('Erro ao criar assinatura:', assinaturaError);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                userId: userId,
                slug: userSlug,
                assinaturaId: assinatura?.id,
                message: 'Usuário e assinatura criados com sucesso'
            })
        };

    } catch (error) {
        console.error('Erro:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
