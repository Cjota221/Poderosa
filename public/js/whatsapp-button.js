/**
 * LUCRO CERTO - Botão Flutuante WhatsApp
 * Adiciona botão de WhatsApp em todas as páginas
 */

(function() {
    'use strict';

    // Criar botão WhatsApp
    const whatsappButton = document.createElement('a');
    whatsappButton.href = 'https://wa.me/5562982237075?text=Olá%2C%20tenho%20dúvidas%20sobre%20o%20app%20Lucro%20Certo';
    whatsappButton.target = '_blank';
    whatsappButton.className = 'whatsapp-float';
    whatsappButton.title = 'Fale conosco no WhatsApp';
    
    whatsappButton.innerHTML = `
        <svg viewBox="0 0 32 32" width="32" height="32" fill="white">
            <path d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 7.933-2.127c2.42 1.37 5.173 2.127 8.067 2.127 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.467c-2.482 0-4.908-0.646-7.07-1.87l-0.507-0.292-5.247 1.407 1.417-5.267-0.325-0.527c-1.325-2.155-2.025-4.639-2.025-7.185 0-7.444 6.056-13.5 13.5-13.5s13.5 6.056 13.5 13.5-6.056 13.5-13.5 13.5zM21.95 18.488c-0.282-0.141-1.671-0.825-1.929-0.919-0.259-0.094-0.447-0.141-0.635 0.141s-0.729 0.919-0.894 1.107c-0.165 0.188-0.329 0.212-0.612 0.071s-1.191-0.438-2.267-1.397c-0.835-0.744-1.4-1.663-1.565-1.945s-0.018-0.434 0.124-0.574c0.127-0.125 0.282-0.329 0.423-0.494s0.188-0.282 0.282-0.471c0.094-0.188 0.047-0.353-0.024-0.494s-0.635-1.529-0.871-2.094c-0.23-0.55-0.464-0.476-0.635-0.484-0.165-0.008-0.353-0.010-0.541-0.010s-0.494 0.071-0.753 0.353c-0.259 0.282-0.988 0.966-0.988 2.354s1.012 2.73 1.153 2.918c0.141 0.188 1.987 3.036 4.815 4.256 0.671 0.291 1.195 0.464 1.603 0.594 0.674 0.214 1.287 0.184 1.771 0.112 0.541-0.081 1.671-0.683 1.906-1.341s0.235-1.224 0.165-1.341c-0.071-0.118-0.259-0.188-0.541-0.329z"/>
        </svg>
    `;

    // Criar e adicionar estilos
    const style = document.createElement('style');
    style.textContent = `
        .whatsapp-float {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
            z-index: 999;
            transition: all 0.3s ease;
            text-decoration: none;
        }

        .whatsapp-float:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 30px rgba(37, 211, 102, 0.6);
        }

        .whatsapp-float:active {
            transform: scale(0.95);
        }

        @keyframes whatsapp-pulse {
            0%, 100% {
                box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
            }
            50% {
                box-shadow: 0 4px 30px rgba(37, 211, 102, 0.7);
            }
        }

        .whatsapp-float {
            animation: whatsapp-pulse 2s infinite;
        }

        /* Desktop */
        @media (min-width: 769px) {
            .whatsapp-float {
                bottom: 30px;
                right: 30px;
                width: 60px;
                height: 60px;
            }
        }

        /* Ajuste quando tem banner trial */
        body.has-trial-banner .whatsapp-float {
            bottom: 110px;
        }

        @media (min-width: 769px) {
            body.has-trial-banner .whatsapp-float {
                bottom: 50px;
            }
        }
    `;

    // Adicionar ao DOM quando carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(style);
            document.body.appendChild(whatsappButton);
        });
    } else {
        document.head.appendChild(style);
        document.body.appendChild(whatsappButton);
    }

    console.log('✅ Botão WhatsApp carregado');
})();
