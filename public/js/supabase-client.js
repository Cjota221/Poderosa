/**
 * LUCRO CERTO - Cliente Supabase
 * Integração com banco de dados
 */

// ⚠️ IMPORTANTE: Chave atualizada em 17/12/2025
const SUPABASE_URL = 'https://ldfahdueqzgemplxrffm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZmFoZHVlcXpnZW1wbHhyZmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NzU3ODgsImV4cCI6MjA4MTE1MTc4OH0.m3AN6YuOJtKX1HMJM_npN6ol52ahdkONANDCtKzhwDM';

// Classe principal do Supabase Client
class SupabaseClient {
    constructor() {
        this.url = SUPABASE_URL;
        this.key = SUPABASE_ANON_KEY;
        this.authToken = null;
        this.user = null;
        
        // Tentar recuperar sessão do localStorage
        this.loadSession();
    }

    // Headers padrão para requisições
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'apikey': this.key,
            'Authorization': `Bearer ${this.authToken || this.key}`
        };
        return headers;
    }

    // Carregar sessão salva
    loadSession() {
        const session = localStorage.getItem('supabase_session');
        if (session) {
            try {
                const data = JSON.parse(session);
                this.authToken = data.access_token;
                this.user = data.user;
            } catch (e) {
                console.error('Erro ao carregar sessão:', e);
            }
        }
    }

    // Salvar sessão
    saveSession(data) {
        localStorage.setItem('supabase_session', JSON.stringify(data));
        this.authToken = data.access_token;
        this.user = data.user;
    }

    // Limpar sessão
    clearSession() {
        localStorage.removeItem('supabase_session');
        this.authToken = null;
        this.user = null;
    }

    // ==========================================
    // AUTENTICAÇÃO
    // ==========================================

    // Cadastrar novo usuário
    async signUp(email, password, userData = {}) {
        try {
            const response = await fetch(`${this.url}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.key
                },
                body: JSON.stringify({
                    email,
                    password,
                    data: userData
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'Erro ao cadastrar');
            }

            if (data.access_token) {
                this.saveSession(data);
            }

            return { success: true, data };
        } catch (error) {
            console.error('Erro no signup:', error);
            return { success: false, error: error.message };
        }
    }

    // Login
    async signIn(email, password) {
        try {
            const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.key
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error_description || data.error.message || 'Email ou senha incorretos');
            }

            this.saveSession(data);
            return { success: true, data };
        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, error: error.message };
        }
    }

    // Logout
    async signOut() {
        try {
            await fetch(`${this.url}/auth/v1/logout`, {
                method: 'POST',
                headers: this.getHeaders()
            });
        } catch (e) {
            // Ignorar erros de logout
        }
        this.clearSession();
        return { success: true };
    }

    // Recuperar senha
    async resetPassword(email) {
        try {
            const response = await fetch(`${this.url}/auth/v1/recover`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.key
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Verificar se está logado
    isAuthenticated() {
        // Verificar sessão Supabase OU localStorage
        if (this.authToken && this.user) {
            return true;
        }
        
        // Fallback: verificar localStorage
        const isLogged = localStorage.getItem('lucrocerto_logged') === 'true';
        const authData = localStorage.getItem('lucrocerto_auth');
        return isLogged && !!authData;
    }

    // Obter usuário atual
    getUser() {
        // Se não tem sessão Supabase, usar localStorage
        if (!this.user) {
            const authData = localStorage.getItem('lucrocerto_auth');
            if (authData) {
                try {
                    const auth = JSON.parse(authData);
                    return { id: auth.userId, email: auth.email, nome: auth.nome };
                } catch (e) {
                    console.error('Erro ao ler auth do localStorage:', e);
                }
            }
        }
        return this.user;
    }

    // ==========================================
    // CRUD GENÉRICO
    // ==========================================

    // SELECT
    async select(table, options = {}) {
        try {
            // 🚨 LOG CRÍTICO: Detectar queries sem usuario_id
            if (['produtos', 'clientes', 'vendas', 'despesas'].includes(table)) {
                if (!options.filters || !options.filters.usuario_id) {
                    console.error(`🚨 QUERY SEM usuario_id na tabela ${table}!`, options);
                    console.trace('Stack trace:');
                    
                    // 🔒 FORÇAR usuario_id do localStorage
                    const user = this.getUser();
                    if (user && user.id) {
                        console.warn(`🔒 Forçando usuario_id = ${user.id}`);
                        options.filters = options.filters || {};
                        options.filters.usuario_id = user.id;
                    } else {
                        console.error('❌ Não há usuário logado! Bloqueando query.');
                        return { data: [], error: 'Usuário não logado' };
                    }
                }
            }
            
            let url = `${this.url}/rest/v1/${table}?`;
            
            // Select columns
            if (options.columns) {
                url += `select=${options.columns}&`;
            } else {
                url += 'select=*&';
            }

            // Filtros
            if (options.filters) {
                for (const [key, value] of Object.entries(options.filters)) {
                    url += `${key}=eq.${value}&`;
                }
            }

            // Ordenação
            if (options.orderBy) {
                const order = options.ascending ? 'asc' : 'desc';
                url += `order=${options.orderBy}.${order}&`;
            }

            // Limite
            if (options.limit) {
                url += `limit=${options.limit}&`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message || 'Erro ao buscar dados');
            }

            return { success: true, data };
        } catch (error) {
            console.error(`Erro ao buscar ${table}:`, error);
            return { success: false, error: error.message, data: [] };
        }
    }

    // INSERT
    async insert(table, data) {
        try {
            const response = await fetch(`${this.url}/rest/v1/${table}`, {
                method: 'POST',
                headers: {
                    ...this.getHeaders(),
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.message || 'Erro ao inserir');
            }

            return { success: true, data: result[0] || result };
        } catch (error) {
            console.error(`Erro ao inserir em ${table}:`, error);
            return { success: false, error: error.message };
        }
    }

    // UPDATE
    async update(table, id, data) {
        try {
            const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    ...this.getHeaders(),
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.message || 'Erro ao atualizar');
            }

            return { success: true, data: result[0] || result };
        } catch (error) {
            console.error(`Erro ao atualizar ${table}:`, error);
            return { success: false, error: error.message };
        }
    }

    // DELETE
    async delete(table, id) {
        try {
            const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error('Erro ao deletar');
            }

            return { success: true };
        } catch (error) {
            console.error(`Erro ao deletar de ${table}:`, error);
            return { success: false, error: error.message };
        }
    }
}

// Instância global
const supabase = new SupabaseClient();

// Exportar para uso global
window.supabase = supabase;
