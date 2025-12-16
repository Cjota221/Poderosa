const { createClient } = require('@supabase/supabase-js');

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
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método não permitido' })
        };
    }

    try {
        const { email } = JSON.parse(event.body || '{}');

        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email é obrigatório' })
            };
        }

        const supabaseUrl = process.env.SUPABASE_URL || 'https://ldfahdueqzgemplxrffm.supabase.co';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseServiceKey) {
            throw new Error('SUPABASE_SERVICE_KEY não configurada');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('✅ Marcando tour como completado para:', email);

        // Atualizar flag tour_completed
        const { error } = await supabase
            .from('usuarios')
            .update({ tour_completed: true })
            .eq('email', email.toLowerCase());

        if (error) {
            console.error('❌ Erro ao atualizar tour_completed:', error);
            throw error;
        }

        console.log('✅ Tour marcado como completado com sucesso');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Tour marcado como completado'
            })
        };

    } catch (error) {
        console.error('❌ Erro ao marcar tour:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Erro ao marcar tour como completado',
                details: error.message
            })
        };
    }
};
