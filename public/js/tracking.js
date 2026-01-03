/**
 * LUCRO CERTO - SISTEMA DE TRACKING
 * Meta Pixel + Google Analytics 4
 * Rastreia TUDO: páginas, cliques, produtos, vendas, formulários
 */

(function() {
    'use strict';

    // ==================================
    // CONFIGURAÇÃO
    // ==================================
    const PIXEL_ID = '1973607160089954';
    const GA_ID = 'G-5G79YPBBGC'; // Google Analytics 4 - Sistema Lucro Certo (ATUALIZADO)

    // ==================================
    // META PIXEL (FACEBOOK)
    // ==================================
    !function(f,b,e,v,n,t,s) {
        if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)
    }(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');

    // ==================================
    // GOOGLE ANALYTICS 4 - TAG OFICIAL
    // ==================================
    
    // Carregar script do Google Analytics
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(gaScript);
    
    // Inicializar dataLayer e gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    
    // ==================================
    // NORMALIZAÇÃO DE URLS
    // ==================================
    // Remove .html das URLs para evitar duplicatas no Analytics
    function getCleanPath() {
        let path = window.location.pathname;
        
        // Remover .html do final
        path = path.replace(/\.html$/, '');
        
        // Se for página raiz, retornar /
        if (path === '' || path === '/index') {
            return '/';
        }
        
        return path;
    }
    
    // Configurar Analytics com URL limpa
    const cleanPath = getCleanPath();
    gtag('config', GA_ID, {
        page_path: cleanPath
    });

    // ==================================
    // SISTEMA DE TRACKING INTELIGENTE
    // ==================================
    const Tracker = {
        
        // Rastrear visualização de página
        trackPageView(pageName) {
            console.log('📊 PageView:', pageName);
            
            // Meta Pixel
            fbq('track', 'PageView', {
                page_name: pageName,
                timestamp: new Date().toISOString()
            });
            
            // Google Analytics - sempre usar URL limpa
            const cleanPath = getCleanPath();
            gtag('event', 'page_view', {
                page_title: pageName,
                page_location: window.location.href,
                page_path: cleanPath
            });
        },

        // Rastrear produto visualizado
        trackProductView(product) {
            console.log('👁️ Produto visualizado:', product.name);
            
            // Meta Pixel
            fbq('track', 'ViewContent', {
                content_name: product.name,
                content_ids: [product.id],
                content_type: 'product',
                value: product.finalPrice || product.price,
                currency: 'BRL'
            });
            
            // Google Analytics
            gtag('event', 'view_item', {
                currency: 'BRL',
                value: product.finalPrice || product.price,
                items: [{
                    item_id: product.id,
                    item_name: product.name,
                    price: product.finalPrice || product.price
                }]
            });
        },

        // Rastrear produto adicionado ao carrinho
        trackAddToCart(product, quantity = 1) {
            console.log('🛒 Adicionado ao carrinho:', product.name);
            
            // Meta Pixel
            fbq('track', 'AddToCart', {
                content_name: product.name,
                content_ids: [product.id],
                content_type: 'product',
                value: product.finalPrice * quantity,
                currency: 'BRL'
            });
            
            // Google Analytics
            gtag('event', 'add_to_cart', {
                currency: 'BRL',
                value: product.finalPrice * quantity,
                items: [{
                    item_id: product.id,
                    item_name: product.name,
                    quantity: quantity,
                    price: product.finalPrice
                }]
            });
        },

        // Rastrear início de checkout
        trackInitiateCheckout(cartTotal, items) {
            console.log('💳 Iniciou checkout:', cartTotal);
            
            // Meta Pixel
            fbq('track', 'InitiateCheckout', {
                value: cartTotal,
                currency: 'BRL',
                num_items: items.length
            });
            
            // Google Analytics
            gtag('event', 'begin_checkout', {
                currency: 'BRL',
                value: cartTotal,
                items: items.map(item => ({
                    item_id: item.productId,
                    item_name: item.productName,
                    quantity: item.quantity,
                    price: item.price
                }))
            });
        },

        // Rastrear compra/venda concluída
        trackPurchase(sale) {
            console.log('💰 Venda concluída:', sale.total);
            
            // Meta Pixel
            fbq('track', 'Purchase', {
                value: sale.total,
                currency: 'BRL',
                content_type: 'product',
                content_ids: sale.items.map(i => i.productId)
            });
            
            // Google Analytics
            gtag('event', 'purchase', {
                transaction_id: sale.id,
                value: sale.total,
                currency: 'BRL',
                items: sale.items.map(item => ({
                    item_id: item.productId,
                    item_name: item.productName,
                    quantity: item.quantity,
                    price: item.price
                }))
            });
        },

        // Rastrear cadastro/registro
        trackSignUp(method = 'email') {
            console.log('✍️ Novo cadastro:', method);
            
            // Meta Pixel
            fbq('track', 'CompleteRegistration', {
                status: 'completed',
                method: method
            });
            
            // Google Analytics
            gtag('event', 'sign_up', {
                method: method
            });
        },

        // Rastrear login
        trackLogin(method = 'email') {
            console.log('🔐 Login realizado:', method);
            
            // Meta Pixel
            fbq('track', 'Login', {
                method: method
            });
            
            // Google Analytics
            gtag('event', 'login', {
                method: method
            });
        },

        // Rastrear busca
        trackSearch(searchTerm) {
            console.log('🔍 Busca:', searchTerm);
            
            // Meta Pixel
            fbq('track', 'Search', {
                search_string: searchTerm
            });
            
            // Google Analytics
            gtag('event', 'search', {
                search_term: searchTerm
            });
        },

        // Rastrear clique em botão
        trackButtonClick(buttonName, location) {
            console.log('🖱️ Clique:', buttonName);
            
            // Google Analytics
            gtag('event', 'button_click', {
                button_name: buttonName,
                location: location
            });
        },

        // Rastrear formulário enviado
        trackFormSubmit(formName) {
            console.log('📝 Formulário enviado:', formName);
            
            // Google Analytics
            gtag('event', 'form_submit', {
                form_name: formName
            });
        },

        // Rastrear scroll (25%, 50%, 75%, 100%)
        trackScroll(percentage) {
            console.log('📜 Scroll:', percentage + '%');
            
            // Google Analytics
            gtag('event', 'scroll', {
                percent_scrolled: percentage
            });
        },

        // Rastrear tempo na página
        trackTimeOnPage(pageName, seconds) {
            console.log('⏱️ Tempo na página:', seconds + 's');
            
            // Google Analytics
            gtag('event', 'time_on_page', {
                page_name: pageName,
                time_seconds: seconds
            });
        },

        // Rastrear início de trial
        trackStartTrial() {
            console.log('🎁 Trial iniciado');
            
            // Meta Pixel
            fbq('track', 'StartTrial', {
                value: 0,
                currency: 'BRL',
                predicted_ltv: 49.90
            });
            
            // Google Analytics
            gtag('event', 'start_trial', {
                trial_days: 7
            });
        },

        // Rastrear assinatura
        trackSubscribe(plan, value) {
            console.log('💎 Assinatura:', plan);
            
            // Meta Pixel
            fbq('track', 'Subscribe', {
                value: value,
                currency: 'BRL',
                predicted_ltv: value * 12
            });
            
            // Google Analytics
            gtag('event', 'subscribe', {
                plan_name: plan,
                value: value,
                currency: 'BRL'
            });
        },

        // Rastrear compartilhamento
        trackShare(contentType, method) {
            console.log('📤 Compartilhamento:', contentType, method);
            
            // Meta Pixel
            fbq('track', 'Share', {
                content_type: contentType,
                method: method
            });
            
            // Google Analytics
            gtag('event', 'share', {
                content_type: contentType,
                method: method
            });
        }
    };

    // ==================================
    // AUTO-TRACKING DE CLIQUES
    // ==================================
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, a, [data-action]');
        if (!target) return;

        const text = target.textContent.trim();
        const action = target.dataset.action || target.id || 'unknown';
        
        Tracker.trackButtonClick(text || action, window.location.pathname);
    });

    // ==================================
    // AUTO-TRACKING DE SCROLL
    // ==================================
    let scrollTracked = { 25: false, 50: false, 75: false, 100: false };
    
    window.addEventListener('scroll', () => {
        const scrollPercent = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );

        if (scrollPercent >= 25 && !scrollTracked[25]) {
            scrollTracked[25] = true;
            Tracker.trackScroll(25);
        }
        if (scrollPercent >= 50 && !scrollTracked[50]) {
            scrollTracked[50] = true;
            Tracker.trackScroll(50);
        }
        if (scrollPercent >= 75 && !scrollTracked[75]) {
            scrollTracked[75] = true;
            Tracker.trackScroll(75);
        }
        if (scrollPercent >= 100 && !scrollTracked[100]) {
            scrollTracked[100] = true;
            Tracker.trackScroll(100);
        }
    });

    // ==================================
    // AUTO-TRACKING DE TEMPO NA PÁGINA
    // ==================================
    let pageStartTime = Date.now();
    
    window.addEventListener('beforeunload', () => {
        const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);
        Tracker.trackTimeOnPage(document.title, timeOnPage);
    });

    // ==================================
    // RASTREAMENTO DE PARÂMETROS UTM/SOURCE
    // ==================================
    function trackPageSource() {
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('source');
        
        if (source) {
            console.log('📍 Source detectado:', source);
            
            // Enviar evento customizado para Analytics
            gtag('event', 'page_source', {
                source: source,
                page_path: getCleanPath(),
                page_title: document.title
            });
            
            // Salvar no localStorage para tracking de conversão
            try {
                localStorage.setItem('lucrocerto_last_source', source);
                localStorage.setItem('lucrocerto_last_source_time', Date.now());
            } catch (e) {
                console.warn('Não foi possível salvar source:', e);
            }
        }
    }
    
    // Executar tracking de source ao carregar
    trackPageSource();

    // ==================================
    // EXPORTAR PARA USO GLOBAL
    // ==================================
    window.Tracker = Tracker;

    console.log('✅ Sistema de Tracking Ativado!');
    console.log('📊 Meta Pixel ID:', PIXEL_ID);
    console.log('📈 Google Analytics ID:', GA_ID);

})();
