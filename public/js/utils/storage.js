/**
 * 🛡️ STORAGE SEGURO - Wrapper para localStorage com tratamento de erros
 * 
 * Protege contra:
 * - QuotaExceededError (storage cheio)
 * - Modo incognito (Safari bloqueia localStorage)
 * - JSON.parse malformado
 * - Qualquer outro erro de acesso
 * 
 * Usa fallback em memória se localStorage falhar.
 */

class SecureStorage {
    constructor() {
        this.prefix = 'lucrocerto_';
        this.fallbackStorage = {};
        this.usesFallback = false;
        
        // Testar se localStorage está disponível
        this._testLocalStorage();
    }

    /**
     * Testa se localStorage está disponível
     * @private
     */
    _testLocalStorage() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            this.usesFallback = false;
        } catch (error) {
            console.warn('⚠️ localStorage não disponível, usando fallback em memória');
            this.usesFallback = true;
        }
    }

    /**
     * Salvar item no storage
     * @param {string} key - Chave (sem prefixo)
     * @param {*} value - Valor (será convertido para JSON)
     * @returns {boolean} true se salvou, false se erro
     */
    set(key, value) {
        const fullKey = this.prefix + key;
        
        try {
            const jsonValue = JSON.stringify(value);
            
            if (this.usesFallback) {
                // Usar memória
                this.fallbackStorage[fullKey] = jsonValue;
                return true;
            }
            
            // Usar localStorage
            localStorage.setItem(fullKey, jsonValue);
            return true;
            
        } catch (error) {
            console.error(`❌ Erro ao salvar "${key}":`, error.message);
            
            // Se falhou no localStorage, tentar fallback
            if (!this.usesFallback) {
                try {
                    this.fallbackStorage[fullKey] = JSON.stringify(value);
                    this.usesFallback = true;
                    console.warn(`⚠️ Mudando para fallback em memória`);
                    return true;
                } catch (fallbackError) {
                    console.error(`❌ Fallback também falhou:`, fallbackError.message);
                    return false;
                }
            }
            
            return false;
        }
    }

    /**
     * Ler item do storage
     * @param {string} key - Chave (sem prefixo)
     * @param {*} defaultValue - Valor padrão se não encontrado
     * @returns {*} Valor parseado ou defaultValue
     */
    get(key, defaultValue = null) {
        const fullKey = this.prefix + key;
        
        try {
            let jsonValue;
            
            if (this.usesFallback) {
                // Usar memória
                jsonValue = this.fallbackStorage[fullKey];
            } else {
                // Usar localStorage
                jsonValue = localStorage.getItem(fullKey);
            }
            
            if (jsonValue === null || jsonValue === undefined) {
                return defaultValue;
            }
            
            return JSON.parse(jsonValue);
            
        } catch (error) {
            console.error(`❌ Erro ao ler "${key}":`, error.message);
            
            // Tentar fallback se ainda não está usando
            if (!this.usesFallback) {
                try {
                    const fallbackValue = this.fallbackStorage[fullKey];
                    if (fallbackValue) {
                        return JSON.parse(fallbackValue);
                    }
                } catch (fallbackError) {
                    // Ignorar erro do fallback
                }
            }
            
            return defaultValue;
        }
    }

    /**
     * Remover item do storage
     * @param {string} key - Chave (sem prefixo)
     */
    remove(key) {
        const fullKey = this.prefix + key;
        
        try {
            if (this.usesFallback) {
                delete this.fallbackStorage[fullKey];
            } else {
                localStorage.removeItem(fullKey);
            }
            
            // Garantir que removeu do fallback também
            if (this.fallbackStorage[fullKey]) {
                delete this.fallbackStorage[fullKey];
            }
            
        } catch (error) {
            console.error(`❌ Erro ao remover "${key}":`, error.message);
        }
    }

    /**
     * Limpar todos os itens do app (com prefixo lucrocerto_)
     */
    clear() {
        try {
            if (this.usesFallback) {
                // Limpar apenas itens com prefixo
                Object.keys(this.fallbackStorage).forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        delete this.fallbackStorage[key];
                    }
                });
            } else {
                // Limpar localStorage (apenas itens com prefixo)
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        localStorage.removeItem(key);
                    }
                });
            }
            
            // Limpar fallback também
            this.fallbackStorage = {};
            
        } catch (error) {
            console.error('❌ Erro ao limpar storage:', error.message);
        }
    }

    /**
     * Verificar se uma chave existe
     * @param {string} key - Chave (sem prefixo)
     * @returns {boolean} true se existe
     */
    has(key) {
        const fullKey = this.prefix + key;
        
        try {
            if (this.usesFallback) {
                return fullKey in this.fallbackStorage;
            }
            
            return localStorage.getItem(fullKey) !== null;
            
        } catch (error) {
            return fullKey in this.fallbackStorage;
        }
    }

    /**
     * Obter todas as chaves do app
     * @returns {string[]} Array de chaves (sem prefixo)
     */
    keys() {
        const keys = [];
        
        try {
            if (this.usesFallback) {
                Object.keys(this.fallbackStorage).forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        keys.push(key.replace(this.prefix, ''));
                    }
                });
            } else {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        keys.push(key.replace(this.prefix, ''));
                    }
                });
            }
        } catch (error) {
            console.error('❌ Erro ao listar chaves:', error.message);
        }
        
        return keys;
    }
}

// Criar instância global
const Storage = new SecureStorage();

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
