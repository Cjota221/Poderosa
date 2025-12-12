// ACHIEVEMENT SYSTEM - Sistema de conquistas e badges
export const AchievementSystem = {
    badges: {
        'primeiro_acesso': { 
            title: 'Bem-vinda, Poderosa!', 
            description: 'Você deu o primeiro passo para o controle total!', 
            icon: 'party-popper', 
            color: '#FFD700' 
        },
        'primeiro_produto': { 
            title: 'Primeiro Produto Cadastrado!', 
            description: 'Isso aí! Seu império está começando a tomar forma.', 
            icon: 'package-plus', 
            color: '#E91E63' 
        },
        'meta_definida': { 
            title: 'Sonho Grande!', 
            description: 'Meta definida! Agora é foco na conquista.', 
            icon: 'target', 
            color: '#E91E63' 
        },
        'primeira_venda': {
            title: 'Primeira Venda!',
            description: 'Parabéns! O dinheiro está entrando.',
            icon: 'trending-up',
            color: '#4CAF50'
        },
        'dez_produtos': {
            title: 'Catálogo Completo!',
            description: 'Você já tem 10 produtos cadastrados!',
            icon: 'award',
            color: '#FF9800'
        }
    },

    checkAndAward(action) {
        const { achievements } = window.StateManager.getState();
        
        if (!achievements.includes(action)) {
            window.StateManager.setState({ 
                achievements: [...achievements, action] 
            });
            
            if (window.UIManager) {
                window.UIManager.showAchievement(action);
            }
        }
    },

    getAchievementBadge(action) {
        return this.badges[action] || null;
    },

    getAllAchievements() {
        return Object.keys(this.badges);
    }
};
