/*
 * DOSTIK AI CHARACTER SYSTEM
 * Revolutionary floating dragon mascot with personality
 * Optimized for performance and code quality
 */

class DostikAI {
    constructor() {
        // Performance optimization: Initialize state first
        this.personality = {
            playful: true,
            wise: true,
            encouraging: true,
            mystical: true
        };

        this.currentBubble = null;
        this.typewriterTimeout = null;
        this.marketingTimer = null;
        this.isShowingMarketingMessage = false;
        this.marketingIntervals = [5000, 10000, 17000, 25000, 35000, 50000];
        this.currentIntervalIndex = 0;
        this.dostikActive = false;
        // Feature flag for heavy 3D globe (disabled for now)
        this.globeFeatureEnabled = false;

        // Message catalog
        this.messages = {
            handmade: [
                "This piece carries the soul of its maker! 🎨",
                "Hand-crafted with love and Nordic tradition ❄️",
                "Every fingerprint tells a story in this creation",
                "Made by hands that know ancient secrets ✨",
                "Feel the warmth of human touch in every curve 🤲",
                "No machine could create such authentic beauty 🌿",
                "Generations of wisdom flow through these hands 👴"
            ],
            limited: [
                "Only a few souls will own this treasure! 👑",
                "Rarity makes the heart grow fonder 💎",
                "This won't last long in our mystical realm",
                "A collector's dream whispers your name 🏺",
                "Exclusive as the Northern Lights themselves! 🌌",
                "When it's gone, it's gone forever... 🔮",
                "Join the select few who possess this magic ⭐"
            ],
            premium: [
                "Luxury flows through every fiber of this piece ✨",
                "For those who appreciate the extraordinary 👑",
                "This is where craftsmanship meets perfection",
                "Premium quality that speaks volumes 🌟",
                "Investment-worthy art that ages like fine wine 🍷",
                "Heirloom quality for generations to come 🏰",
                "The pinnacle of Nordic craftsmanship! 🏔️"
            ],
            popular: [
                "Everyone's talking about this treasure! 🔥",
                "Your friends will be so envious! 😍",
                "Trending in the Nordic artisan community",
                "A crowd favorite for good reason! 🎯",
                "This piece has captured many hearts already 💕",
                "Join the growing fan club of this beauty! 🌟",
                "Viral for all the right reasons! 📈"
            ],
            new: [
                "Fresh from the artisan's workshop! 🆕",
                "Be the first to discover this gem ⭐",
                "Hot off the creative forge!",
                "New magic has arrived in our realm ✨",
                "Still warm from the creator's studio! 🔥",
                "You're witnessing a debut masterpiece! 🎭",
                "Brand new and already legendary! ⚡"
            ],
            wood: [
                "Carved from ancient Nordic forests 🌲",
                "Each ring tells a century's story 📜",
                "The tree's spirit lives on in this form 🍃",
                "Scandinavian pine at its finest! 🌨️",
                "Birch whispers secrets of the north wind 💨",
                "Oak strong as Viking shields! ⚔️"
            ],
            glass: [
                "Crystal clear as Nordic fjord waters! 💧",
                "Fire and ice shaped this beauty ❄️🔥",
                "Transparent as Aurora Borealis magic 🌈",
                "Blown glass that captures light like dreams ✨",
                "Fragile yet eternal, like winter mornings 🌅",
                "Swedish glass-blowing mastery! 🇸🇪"
            ],
            seasonal: [
                "Perfect for cozy winter evenings! ❄️",
                "Brings spring warmth to any space 🌸",
                "Summer solstice vibes in object form ☀️",
                "Autumn harvest magic captured forever 🍂",
                "Hygge embodied in physical form! 🕯️",
                "Christmas-worthy treasure! 🎄"
            ],
            mystical: [
                "Ancient runes seem to dance around this piece ᚱᚢᚾᛖ",
                "I sense old magic in these materials... 🔮",
                "The gods of Asgard would approve! ⚡",
                "Yggdrasil's blessing flows through this art 🌳",
                "Viking spirits whisper approval 👻",
                "Mystical energy resonates from within! 🌟"
            ],
            default: [
                "This catches my dragon eye! 👁️",
                "I sense great potential in this piece",
                "A fine addition to any collection 🏰",
                "The Nordic spirits approve! ❄️",
                "Quality that makes my scales shimmer ✨",
                "Worthy of a dragon's treasure hoard! 💎",
                "Even I would guard this with my life! 🐉",
                "Scandinavia's finest export! 🚢"
            ],
            marketing: [
                "🔥 Sıcak Fırsat: Seçili ürünlerde %20 indirim!",
                "⏰ Son 2 saat! Ücretsiz kargo kampanyası kaçırma!",
                "💎 Yeni koleksiyon geldi! İlk 10 alıcıya özel hediye!",
                "🛒 Sepetinde ürün var, unutma! Tamamla ve kazanç et!",
                "⭐ Bu hafta en çok satanlar kategorisini gördün mü?",
                "🎁 Dostlarına hediye gönder, sen de %15 indirim kazan!",
                "💰 Flash Sale: Nordic seramikler yarı fiyatına!",
                "🌟 İlk siparişinde %25 indirim kodu: DOSTIK25",
                "📦 100TL üzeri alışverişlerde ücretsiz kargo!",
                "🔔 Favori zanaatkârından yeni ürün geldi!",
                "💝 Sınırlı sayıda: El yapımı özel seri sadece bugün!",
                "⚡ Lightning Deal: Cam sanatları %30 indirim!",
                "🎯 Wishlist'indeki ürün indirime girdi! Kaçırma!",
                "🏆 VIP müşteri ol, özel fırsatları keşfet!",
                "💎 Premium üyelik 1 ay ücretsiz dene!"
            ],
            navigation: [
                "🧭 Bu linkler seni harika yerlere götürür!",
                "⚡ Hızlı navigasyon için buraya tıkla!",
                "🌟 Bu bölüm çok popüler!",
                "🎯 Doğru yoldasın, devam et!",
                "🚀 Bu sayfa seni şaşırtacak!"
            ],
            cart: [
                "🛒 Sepetine bakalım mı?",
                "💎 Burada hazinelerin birikiyor!",
                "🎁 Sepetindeki şeyler muhteşem!",
                "⭐ Satın alma zamanı geldi!",
                "🔥 Bu ürünler çok hızlı tükeniyor!"
            ],
            search: [
                "🔍 Ne arıyorsun, yardım edeyim!",
                "✨ Burada istediğin her şeyi bulabilirsin!",
                "🎯 Arama yaparak gizli hazineleri keşfet!",
                "💡 İpucu: Kategori adı da yazabilirsin!",
                "🌟 En popüler aramaları görmek ister misin?"
            ],
            buttons: [
                "👆 Bu butona tıklaman güzel şeyler getirecek!",
                "⚡ Hadi, cesur ol ve tıkla!",
                "🎯 Bu buton tam aradığın şey!",
                "✨ Büyülü bir deneyim seni bekliyor!",
                "🚀 Bir sonraki adım için hazır mısın?"
            ],
            categories: [
                "🎨 Bu kategori muhteşem ürünlerle dolu!",
                "💎 Bu bölümde eşsiz parçalar var!",
                "🌟 En sevilen kategorilerden biri!",
                "🔥 Sıcak fırsatlar burada!",
                "⭐ Bu kategoriyi kesinlikle görmelisin!"
            ],
            hero: [
                "🏰 Nordic krallığına hoş geldin!",
                "✨ Bu büyülü yolculuk burada başlıyor!",
                "🌟 Seni harika maceralar bekliyor!",
                "🐉 Benimle birlikte keşfetmeye hazır mısın?",
                "💫 Burası hikayelerin başladığı yer!"
            ],
            footer: [
                "📧 Bizi takip etmeyi unutma!",
                "🌐 Sosyal medyada da varız!",
                "💌 Bültenimize abone olmak ister misin?",
                "🔗 Faydalı linkler burada!",
                "📱 Mobil uygulamamızı da deneyebilirsin!"
            ],
            forms: [
                "📝 Buraya güzel şeyler yazabilirsin!",
                "✨ Fikirlerini paylaş!",
                "💭 Ne düşünüyorsun merak ediyorum!",
                "🎯 Doğru bilgileri girdiğinden emin ol!",
                "🌟 Bu form çok önemli!"
            ],
            cards: [
                "💎 Bu kart çok şık durmuş!",
                "✨ İçindeki bilgiler değerli!",
                "🌟 Bu alan özel olarak tasarlanmış!",
                "🎨 Nordic tasarımın güzelliği!",
                "💫 Glassmorphism efekti harika değil mi?"
            ],
            general: [
                "🐉 Seninle olmak çok güzel!",
                "✨ Bu siteyi keşfetmeye devam edelim!",
                "🌟 Her şey çok güzel organize edilmiş!",
                "💫 Nordic tema sana nasıl görünüyor?",
                "🎯 Hangi bölümü daha çok sevdin?"
            ],
            greeting: [
                "Greetings, fellow treasure seeker! 🐉",
                "Welcome to our magical marketplace! ✨",
                "I'm Dostik, your Nordic guide 🧭",
                "Let me help you find hidden gems! 💎",
                "Ah, a soul seeking authentic Nordic art! 🎭",
                "The winds of Valhalla brought you here! 💨",
                "Dragons and artisans welcome you! 🔥"
            ],
            purchase: [
                "Excellent choice, wise shopper! 🛒",
                "Your taste is as refined as my flames 🔥",
                "This treasure shall serve you well! ⚔️",
                "The artisan will be thrilled! 🎨",
                "A purchase worthy of legend! 📜",
                "Your collection grows in power! ⚡",
                "The Norse gods smile upon this transaction! 😊",
                "Another treasure finds its rightful home! 🏰"
            ]
        };

        this.init();
    }

    init() {
        this.createDostikHome();

        // Use idle callback for non-critical initialization
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => {
                this.createChatWidget();
                this.createMarketplaceTrigger();
                this.setupEventListeners();
                this.startMarketingTimer();
            });
        } else {
            // Fallback for browsers without requestIdleCallback
            requestAnimationFrame(() => {
                this.createChatWidget();
                this.createMarketplaceTrigger();
                this.setupEventListeners();
                this.startMarketingTimer();
            });
        }
    }

    // Chat and marketplace widget setup
    createChatWidget() {
        if (document.getElementById('dostik-styles')) {
            return; // Styles already injected
        }

        const style = document.createElement('style');
        style.id = 'dostik-styles';
        style.textContent = `
            .dostik-floating {
                position: fixed;
                width: 80px;
                height: 80px;
                pointer-events: none;
                z-index: 1000;
                opacity: 0;
                transform: scale(0.5);
                transition: all 0.3s ease-out;
            }

            .dostik-floating.visible {
                opacity: 1;
                transform: scale(1);
            }

            .dostik-body {
                font-size: 2.5rem;
                text-align: center;
                position: relative;
                z-index: 2;
                filter: drop-shadow(0 4px 8px rgba(26, 74, 58, 0.2));
                animation: dostikFloat 3s ease-in-out infinite;
            }

            .dostik-wings {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
            }

            .wing {
                position: absolute;
                font-size: 1.5rem;
                top: 15px;
                animation: wingFlap 2s ease-in-out infinite;
            }

            .wing-left {
                left: -10px;
                animation-delay: 0s;
            }

            .wing-right {
                right: -10px;
                animation-delay: 0.1s;
                transform: scaleX(-1);
            }

            @keyframes dostikFloat {
                0%, 100% { transform: translateY(0px) rotate(-2deg); }
                50% { transform: translateY(-10px) rotate(2deg); }
            }

            @keyframes wingFlap {
                0%, 100% { transform: rotateZ(0deg) scaleY(1); }
                25% { transform: rotateZ(-15deg) scaleY(0.8); }
                75% { transform: rotateZ(15deg) scaleY(1.2); }
            }

            .dostik-chat-widget {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 320px;
                height: 400px;
                background: var(--glass-bg);
                backdrop-filter: var(--glass-backdrop);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-strong);
                transform: translateY(100%) scale(0.8);
                opacity: 0;
                transition: all 0.4s ease-out;
                z-index: 2100;
            }

            .dostik-chat-widget.open {
                transform: translateY(0) scale(1);
                opacity: 1;
            }

            .dostik-chat-header {
                padding: var(--space-md);
                border-bottom: 1px solid var(--glass-border);
                display: flex;
                align-items: center;
                gap: var(--space-sm);
            }

            .dostik-chat-avatar {
                width: 40px;
                height: 40px;
                background: var(--aurora-green);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
            }

            .dostik-chat-info h4 {
                margin: 0;
                font-size: 1rem;
                color: var(--forest-deep);
            }

            .dostik-chat-info p {
                margin: 0;
                font-size: 0.8rem;
                color: var(--warm-brown);
            }

            .dostik-chat-messages {
                padding: var(--space-md);
                height: 280px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: var(--space-md);
            }


            .dostik-chat-close {
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: var(--warm-brown);
                transition: color var(--transition-fast);
            }

            .dostik-chat-close:hover {
                color: var(--forest-deep);
            }

            .marketplace-browse-trigger {
                position: fixed;
                bottom: 100px;
                right: 30px;
                width: 60px;
                height: 60px;
                background: var(--aurora-purple);
                border: none;
                border-radius: 50%;
                font-size: 1.6rem;
                color: white;
                cursor: pointer;
                box-shadow: var(--shadow-medium);
                transition: all var(--transition-medium);
                z-index: 2050;
                animation: bounce 3s infinite;
            }

            /* Global selector removed - replaced with floating cart */

            .marketplace-browse-trigger:hover {
                transform: scale(1.1);
                box-shadow: var(--shadow-strong);
                animation: none;
            }

            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }

            .dostik-chat-trigger {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 60px;
                height: 60px;
                background: var(--aurora-green);
                border: none;
                border-radius: 50%;
                font-size: 1.8rem;
                color: white;
                box-shadow: var(--shadow-medium);
                cursor: pointer;
                transition: all var(--transition-medium);
                z-index: 2050;
                animation: pulse 2s infinite;
            }

            .dostik-chat-trigger:hover {
                transform: scale(1.1);
                box-shadow: var(--shadow-strong);
            }

            @keyframes pulse {
                0% { box-shadow: var(--shadow-medium); }
                50% { box-shadow: var(--shadow-strong), 0 0 30px rgba(74, 139, 108, 0.3); }
                100% { box-shadow: var(--shadow-medium); }
            }

            .marketplace-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease-out;
            }

            .marketplace-modal.open {
                opacity: 1;
                visibility: visible;
            }

            .marketplace-modal-content {
                background: var(--glass-bg);
                backdrop-filter: var(--glass-backdrop);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-strong);
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow: hidden;
                transform: scale(0.8) translateY(50px);
                transition: all 0.3s ease-out;
            }

            .marketplace-modal.open .marketplace-modal-content {
                transform: scale(1) translateY(0);
            }

            .marketplace-modal-header {
                padding: var(--space-lg);
                border-bottom: 1px solid var(--glass-border);
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                position: relative;
            }

            .marketplace-modal-header h3 {
                margin: 0;
                color: var(--forest-deep);
                font-size: 1.5rem;
            }

            .marketplace-modal-header p {
                margin: 0;
                color: var(--forest-medium);
                font-size: 0.9rem;
                opacity: 0.8;
            }

            .marketplace-modal-close {
                background: none;
                border: none;
                font-size: 1.8rem;
                cursor: pointer;
                color: var(--forest-medium);
                transition: color 0.2s ease;
                position: absolute;
                right: var(--space-lg);
                top: var(--space-lg);
            }

            .marketplace-modal-close:hover {
                color: var(--forest-deep);
            }

            .marketplace-modal-body {
                padding: var(--space-lg);
                max-height: 60vh;
                overflow-y: auto;
            }

            .marketplace-loading {
                text-align: center;
                padding: var(--space-xxl);
                color: var(--forest-medium);
            }

            .marketplace-products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: var(--space-lg);
            }

            .marketplace-product-card {
                background: var(--cream-soft);
                border-radius: var(--radius-md);
                padding: var(--space-md);
                box-shadow: var(--shadow-soft);
                transition: all 0.2s ease;
                position: relative;
            }

            .marketplace-product-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-medium);
            }

            .marketplace-product-actions {
                display: flex;
                gap: var(--space-xs);
                margin-top: var(--space-sm);
                justify-content: space-between;
            }

            .marketplace-quick-btn {
                background: var(--aurora-green);
                border: none;
                border-radius: var(--radius-sm);
                padding: var(--space-xs) var(--space-sm);
                color: white;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: var(--space-xs);
                flex: 1;
                justify-content: center;
                font-weight: 600;
            }

            .marketplace-quick-btn:hover {
                transform: scale(1.05);
                box-shadow: var(--shadow-soft);
            }

            .marketplace-quick-btn.wishlist {
                background: var(--aurora-purple);
            }

            .marketplace-quick-btn.added {
                background: var(--forest-deep);
                transform: scale(0.95);
            }

            .marketplace-product-info {
                cursor: pointer;
            }

            .marketplace-product-image {
                width: 100%;
                height: 120px;
                background: var(--forest-light);
                border-radius: var(--radius-sm);
                margin-bottom: var(--space-sm);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                overflow: hidden;
            }

            .marketplace-product-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .marketplace-product-title {
                font-size: 0.9rem;
                font-weight: 600;
                color: var(--forest-deep);
                margin-bottom: var(--space-xs);
                line-height: 1.3;
            }

            .marketplace-product-price {
                font-size: 1rem;
                font-weight: 700;
                color: var(--forest-deep);
            }

            .marketplace-modal-footer {
                padding: var(--space-lg);
                border-top: 1px solid var(--glass-border);
                text-align: center;
            }

            @media (max-width: 480px) {
                .dostik-chat-widget {
                    width: calc(100vw - 20px);
                    right: 10px;
                    bottom: 90px;
                }

                .marketplace-modal-content {
                    width: 95%;
                    margin: var(--space-md);
                }

                .marketplace-products-grid {
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: var(--space-md);
                }
            }

            /* Dostik Home Bubble Message */
            .dostik-bubble-message {
                position: absolute;
                background: linear-gradient(135deg, rgba(45, 104, 83, 0.95), rgba(74, 139, 108, 0.9));
                backdrop-filter: var(--glass-backdrop);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: var(--radius-md);
                padding: var(--space-sm) var(--space-md);
                min-width: 180px;
                max-width: 250px;
                box-shadow: 0 6px 25px rgba(45, 104, 83, 0.4);
                font-size: 0.85rem;
                color: white;
                font-weight: 500;
                text-align: center;
                top: -60px;
                left: 50%;
                transform: translateX(-50%) scale(0.9);
                transition: all 0.3s ease;
                z-index: 1000;
                line-height: 1.3;
            }

            .dostik-bubble-message::before {
                content: '';
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid rgba(45, 104, 83, 0.95);
            }

            .dostik-bubble-message.marketing-message {
                background: linear-gradient(135deg, rgba(231, 76, 60, 0.95), rgba(243, 156, 18, 0.9));
                animation: pulseGlow 2s ease-in-out infinite;
            }

            .dostik-bubble-message.marketing-message::before {
                border-top-color: rgba(231, 76, 60, 0.95);
            }

            @keyframes pulseGlow {
                0%, 100% {
                    transform: translateX(-50%) scale(0.9);
                    box-shadow: 0 6px 25px rgba(231, 76, 60, 0.4);
                }
                50% {
                    transform: translateX(-50%) scale(1);
                    box-shadow: 0 8px 30px rgba(231, 76, 60, 0.6);
                }
            }
        `;
        document.head.appendChild(style);
    }

    createDostikHome() {
        if (this.dostikHome) {
            return; // Already created
        }

        this.dostikHome = document.createElement('div');
        this.dostikHome.className = 'dostik-home-compact';
        this.dostikHome.innerHTML = `
            <div class="dostik-compact-dragon">🐉</div>
            <div class="dostik-bubble-message" style="display: none;"></div>
        `;
        this.dostikHome.title = 'Dostik ile site gezisi yap!';

        this.dostikHome.addEventListener('click', () => {
            this.toggleDostikMode();
        });

        document.body.appendChild(this.dostikHome);
    }

    toggleDostikMode() {
        this.dostikActive = !this.dostikActive;

        if (this.dostikActive) {
            // Pick up Dostik - animate out of home
            this.pickUpDostik();
        } else {
            // Drop off Dostik - animate back to home
            this.dropOffDostik();
        }
    }

    pickUpDostik() {
        const dragon = this.dostikHome.querySelector('.dostik-compact-dragon');

        // Start pickup animation
        dragon.classList.add('picking-up');
        this.dostikHome.classList.add('active');
        this.dostikHome.title = 'Dostik dışarıda dolaşıyor... (geri çağırmak için tıkla)';

        // After animation, enable mouse following and cleanup
        setTimeout(() => {
            dragon.classList.remove('picking-up');
            this.enableMouseFollowing();
        }, 600);
    }

    dropOffDostik() {
        // Disable mouse follower first
        this.disableMouseFollowing();

        const dragon = this.dostikHome.querySelector('.dostik-compact-dragon');
        this.dostikHome.title = 'Dostik eve dönüyor...';

        // Start drop-off animation
        dragon.classList.add('dropping-off');

        // Complete the landing sequence
        setTimeout(() => {
            this.dostikHome.classList.remove('active');
            dragon.classList.remove('dropping-off');
            this.dostikHome.title = 'Dostik ile site gezisi yap!';

            // Show info bubble again (if exists)
            setTimeout(() => {
                const infoBubble = this.dostikHome.querySelector('.dostik-info-bubble, .dostik-info-message');
                if (infoBubble) {
                    infoBubble.style.opacity = '1';
                    infoBubble.style.transform = 'scale(1)';
                }
            }, 300);
        }, 600);
    }

    startInfoMessages() {
        // Change info message every 8 seconds when Dostik is inactive
        setInterval(() => {
            if (!this.dostikActive) {
                const messageElement = this.dostikHome.querySelector('.dostik-info-message');
                const randomMessage = this.homeMessages[Math.floor(Math.random() * this.homeMessages.length)];

                // Animate message change
                messageElement.style.opacity = '0';
                setTimeout(() => {
                    messageElement.textContent = randomMessage;
                    messageElement.style.opacity = '1';
                }, 300);
            }
        }, 8000);
    }

    enableMouseFollowing() {
        if (!this.mouseFollower) {
            this.createMouseFollower();
            // setupProductCardHovers is now handled in global mouse tracking
        }

        // Mouse follower will become visible when user moves mouse
    }

    disableMouseFollowing() {
        if (this.mouseFollower) {
            this.mouseFollower.setVisible(false);
        }
    }


    setupEventListeners() {
        // Event listeners will be set up by individual components
    }

    // Create chat trigger (marketplace handled by separate module)
    createMarketplaceTrigger() {
        if (document.querySelector('.dostik-chat-widget')) {
            return;
        }

        // Global selector removed - replaced with floating cart

        const chatTrigger = document.createElement('button');
        chatTrigger.className = 'dostik-chat-trigger';
        chatTrigger.innerHTML = '🐉';
        chatTrigger.title = 'Chat with Dostik';

        const chatWidget = document.createElement('div');
        chatWidget.className = 'dostik-chat-widget';
        chatWidget.innerHTML = `
            <div class="dostik-chat-header">
                <div class="dostik-chat-avatar">🐉</div>
                <div class="dostik-chat-info">
                    <h4>Dostik</h4>
                    <p>Your Nordic shopping guide</p>
                </div>
                <button class="dostik-chat-close">×</button>
            </div>
            <div class="dostik-chat-messages" id="dostik-messages">
                <div class="dostik-message">
                    ${this.getRandomMessage('greeting')}
                </div>
            </div>
        `;

        document.body.appendChild(chatTrigger);
        document.body.appendChild(chatWidget);

        // Global selector event listener removed

        chatTrigger.addEventListener('click', () => {
            chatWidget.classList.toggle('open');
            if (chatWidget.classList.contains('open')) {
                this.addChatMessage(this.getRandomMessage('greeting'));
            }
        });

        chatWidget.querySelector('.dostik-chat-close').addEventListener('click', () => {
            chatWidget.classList.remove('open');
        });

        this.chatWidget = chatWidget;
        this.chatMessages = chatWidget.querySelector('#dostik-messages');
    }

    showFloatingDostik(productCard, event) {
        const rect = productCard.getBoundingClientRect();
        const dostikBubble = productCard.querySelector('.dostik-bubble');

        // Position floating Dostik
        this.floatingDostik.style.left = (rect.right - 40) + 'px';
        this.floatingDostik.style.top = (rect.top - 40) + 'px';
        this.floatingDostik.classList.add('visible');

        // Show bubble with typewriter effect if it exists
        if (dostikBubble) {
            const message = dostikBubble.querySelector('.dostik-message');
            if (message && !message.classList.contains('typewriter-complete')) {
                this.typewriterEffect(message);
            }
        }
    }

    hideFloatingDostik() {
        this.floatingDostik.classList.remove('visible');
        if (this.typewriterTimeout) {
            clearTimeout(this.typewriterTimeout);
        }
    }

    updateFloatingPosition(event) {
        const offset = 40;
        this.floatingDostik.style.left = (event.clientX + offset) + 'px';
        this.floatingDostik.style.top = (event.clientY - offset) + 'px';
    }

    typewriterEffect(element) {
        const text = element.textContent;
        element.textContent = '';
        element.classList.add('typewriter-active');

        let i = 0;
        const type = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                this.typewriterTimeout = setTimeout(type, 50 + Math.random() * 50);
            } else {
                element.classList.remove('typewriter-active');
                element.classList.add('typewriter-complete');
            }
        };

        setTimeout(type, 300); // Delay before starting
    }

    getRandomMessage(category) {
        const messages = this.messages[category] || this.messages.default;
        return messages[Math.floor(Math.random() * messages.length)];
    }

    getContextualMessage(productCard) {
        const badges = productCard.querySelectorAll('.badge');
        const title = productCard.querySelector('.product-title')?.textContent.toLowerCase() || '';
        const description = productCard.querySelector('.product-description')?.textContent.toLowerCase() || '';
        const categories = [];

        // Check badges
        badges.forEach(badge => {
            if (badge.classList.contains('handmade')) categories.push('handmade');
            if (badge.classList.contains('limited')) categories.push('limited');
            if (badge.classList.contains('new')) categories.push('new');
            if (badge.classList.contains('popular')) categories.push('popular');
        });

        // Check product card classes
        if (productCard.classList.contains('premium')) categories.push('premium');

        // Check material/category based on title and description
        if (title.includes('wood') || title.includes('carved') || title.includes('oak') || title.includes('pine') || title.includes('birch')) {
            categories.push('wood');
        }
        if (title.includes('glass') || title.includes('crystal') || title.includes('blown')) {
            categories.push('glass');
        }

        // Check for seasonal keywords
        if (title.includes('winter') || title.includes('christmas') || title.includes('snow') || title.includes('yule')) {
            categories.push('seasonal');
        }

        // Random chance for mystical messages (20% chance)
        if (Math.random() < 0.2) {
            categories.push('mystical');
        }

        const selectedCategory = categories.length > 0
            ? categories[Math.floor(Math.random() * categories.length)]
            : 'default';

        return this.getRandomMessage(selectedCategory);
    }

    addChatMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `dostik-message ${isUser ? 'user-message' : ''}`;
        messageDiv.textContent = message;

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        if (!isUser) {
            this.typewriterEffect(messageDiv);
        }
    }

    // Public API for integration
    showProductRecommendation(productId) {
        const message = this.getRandomMessage('default');
        this.addChatMessage(`For that item: ${message}`);

        if (!this.chatWidget.classList.contains('open')) {
            this.chatWidget.classList.add('open');
        }
    }

    celebratePurchase() {
        const message = this.getRandomMessage('purchase');
        this.addChatMessage(message);

        // Add celebration effects (check if element exists)
        if (this.floatingDostik && this.floatingDostik.style) {
            this.floatingDostik.style.animation = 'celebration 1s ease-out';
            setTimeout(() => {
                if (this.floatingDostik && this.floatingDostik.style) {
                    this.floatingDostik.style.animation = '';
                }
            }, 1000);
        }
    }


    createMouseFollower() {
        if (this.mouseFollower) {
            return; // Already exists
        }

        this.mouseFollower = document.createElement('div');
        this.mouseFollower.className = 'dostik-mouse-follower';
        this.mouseFollower.innerHTML = `
            <div class="dostik-dragon-icon">🐉</div>
            <div class="dostik-speech-bubble"></div>
        `;
        document.body.appendChild(this.mouseFollower);

        this.setupMouseTracking();
    }

    setupMouseTracking() {
        // Performance optimization: Use throttled mouse tracking
        let mouseX = 0;
        let mouseY = 0;
        let isVisible = false;
        let animationId = null;
        let currentElement = null;
        let messageTimeout = null;
        let hideTimeout = null;
        let hoverTimeout = null;
        let lastMoveTime = 0;

        const THROTTLE_DELAY = 16; // ~60fps

        const updatePosition = () => {
            if (isVisible) {
                this.mouseFollower.style.transform = `translate(${mouseX + 15}px, ${mouseY - 25}px)`;
                animationId = requestAnimationFrame(updatePosition);
            }
        };

        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastMoveTime < THROTTLE_DELAY) {
                return; // Throttle mouse events
            }
            lastMoveTime = now;

            mouseX = e.clientX;
            mouseY = e.clientY;

            // Update position when Dostik is active
            if (this.dostikActive) {
                // Always keep Dostik visible when active
                if (!isVisible) {
                    this.mouseFollower.setVisible(true);
                }

                const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);

                // Clear previous timeouts when moving to different element
                if (elementUnderMouse !== currentElement) {
                    // Clear all pending timeouts efficiently
                    [messageTimeout, hideTimeout, hoverTimeout].forEach(timeout => {
                        if (timeout) clearTimeout(timeout);
                    });

                    currentElement = elementUnderMouse;

                    // If it's a product card, show message immediately (keep existing behavior)
                    if (elementUnderMouse && elementUnderMouse.closest('.product-card')) {
                        const productCard = elementUnderMouse.closest('.product-card');
                        const message = this.getContextualMessage(productCard);
                        const speechBubble = this.mouseFollower.querySelector('.dostik-speech-bubble');
                        if (speechBubble && message) {
                            speechBubble.textContent = message;
                            speechBubble.classList.add('has-message');
                        }
                    }
                    // For other elements, wait for hover delay
                    else if (this.shouldShowMessageForElement(elementUnderMouse)) {
                        // Hide current message first with smooth transition
                        const speechBubble = this.mouseFollower.querySelector('.dostik-speech-bubble');
                        if (speechBubble) {
                            speechBubble.classList.remove('has-message');
                            // Clear text after fade animation
                            setTimeout(() => {
                                speechBubble.textContent = '';
                            }, 300);
                        }

                        // Show message after hover delay
                        hoverTimeout = setTimeout(() => {
                            this.showContextualMessageForElement(elementUnderMouse);

                            // Auto-hide message after 1.5 seconds (except for product cards)
                            hideTimeout = setTimeout(() => {
                                if (speechBubble && !elementUnderMouse.closest('.product-card')) {
                                    // Start fade out animation
                                    speechBubble.classList.remove('has-message');
                                    // Clear text after animation completes
                                    setTimeout(() => {
                                        speechBubble.textContent = '';
                                    }, 300);
                                }
                            }, 1500);
                        }, 600); // 600ms hover delay
                    }
                    // For non-special elements, clear message but keep Dostik visible
                    else {
                        const speechBubble = this.mouseFollower.querySelector('.dostik-speech-bubble');
                        if (speechBubble) {
                            speechBubble.classList.remove('has-message');
                            // Clear text after fade animation
                            setTimeout(() => {
                                speechBubble.textContent = '';
                            }, 300);
                        }
                    }
                }
            }
        });

        // Store visibility state
        this.mouseFollower.isVisible = () => isVisible;
        this.mouseFollower.setVisible = (visible) => {
            isVisible = visible;
            if (visible) {
                this.mouseFollower.classList.add('visible');
                this.mouseFollower.style.left = '0px';
                this.mouseFollower.style.top = '0px';
                if (!animationId) {
                    updatePosition();
                }
            } else {
                this.mouseFollower.classList.remove('visible');
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            }
        };
    }

    setupProductCardHovers() {
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                // Only show if Dostik is active
                if (this.dostikActive && this.mouseFollower) {
                    const message = this.getContextualMessage(card);
                    const messageElement = this.mouseFollower.querySelector('.dostik-speech-bubble');
                    messageElement.textContent = message;
                    this.mouseFollower.setVisible(true);
                }
            });

            card.addEventListener('mouseleave', () => {
                if (this.mouseFollower) {
                    this.mouseFollower.setVisible(false);
                }
            });
        });
    }

    // Global element detection for contextual messages
    shouldShowMessageForElement(element) {
        if (!element) return false;

        // Check if element or its parents have classes we care about
        const elementToCheck = element.closest('.nav-link, .btn, .product-card, .cart-icon, .search-input, .footer, .hero-section, .category-slide, input, textarea, .glass-card');
        return elementToCheck !== null;
    }

    showContextualMessageForElement(element) {
        if (!element || !this.mouseFollower) return;

        let message = '';
        const speechBubble = this.mouseFollower.querySelector('.dostik-speech-bubble');

        // Determine message based on element type or class
        if (element.closest('.nav-link')) {
            message = this.getRandomMessage('navigation');
        } else if (element.closest('.cart-icon')) {
            message = this.getRandomMessage('cart');
        } else if (element.closest('.search-input')) {
            message = this.getRandomMessage('search');
        } else if (element.closest('.btn')) {
            message = this.getRandomMessage('buttons');
        } else if (element.closest('.product-card')) {
            // Use existing product card logic
            message = this.getContextualMessage(element.closest('.product-card'));
        } else if (element.closest('.category-slide')) {
            message = this.getRandomMessage('categories');
        } else if (element.closest('.hero-section')) {
            message = this.getRandomMessage('hero');
        } else if (element.closest('.footer')) {
            message = this.getRandomMessage('footer');
        } else if (element.closest('input, textarea')) {
            message = this.getRandomMessage('forms');
        } else if (element.closest('.glass-card')) {
            message = this.getRandomMessage('cards');
        } else {
            message = this.getRandomMessage('general');
        }

        if (message && speechBubble) {
            speechBubble.textContent = message;
            speechBubble.classList.add('has-message');
        }
    }

    // Easter egg interactions
    setupEasterEggs() {
        let clickCount = 0;
        const triggerButton = document.querySelector('.dostik-chat-trigger');

        if (triggerButton) {
            triggerButton.addEventListener('dblclick', () => {
                clickCount++;
                if (clickCount >= 5) {
                    this.addChatMessage("🎉 You found a secret! Here's a special Nordic blessing: May your treasures multiply like snowflakes in a storm! ❄️✨");
                    clickCount = 0;
                }
            });
        }
    }

    // Marketing Timer Functions
    startMarketingTimer() {
        // Start with first interval (5 seconds)
        this.scheduleNextMarketingMessage();
    }

    scheduleNextMarketingMessage() {
        // Clear existing timer
        if (this.marketingTimer) {
            clearTimeout(this.marketingTimer);
        }

        // Get current interval (or loop back to start if we've gone through all)
        const currentInterval = this.marketingIntervals[this.currentIntervalIndex];

        this.marketingTimer = setTimeout(() => {
            this.showMarketingMessageIfAppropriate();

            // Move to next interval (cycle back to start if at end)
            this.currentIntervalIndex = (this.currentIntervalIndex + 1) % this.marketingIntervals.length;

            // Schedule next message
            this.scheduleNextMarketingMessage();
        }, currentInterval);
    }


    showMarketingMessageIfAppropriate() {
        // Only show marketing messages if:
        // 1. Not currently showing a marketing message
        // 2. Dostik is at home (inactive) and home exists
        if (!this.isShowingMarketingMessage &&
            !this.dostikActive &&
            this.dostikHome) {

            this.showMarketingMessage();
        }
    }

    showMarketingMessage() {
        const marketingMessage = this.getRandomMessage('marketing');

        // Show message in Dostik's home bubble
        const messageBubble = this.dostikHome.querySelector('.dostik-bubble-message');
        if (messageBubble) {
            messageBubble.textContent = marketingMessage;
            messageBubble.style.display = 'block';

            // Keep default green styling - no special marketing class needed

            this.isShowingMarketingMessage = true;

            // Auto-hide after 4 seconds
            setTimeout(() => {
                this.hideDostikMessage();
            }, 4000);
        }
    }

    hideDostikMessage() {
        const messageBubble = this.dostikHome?.querySelector('.dostik-bubble-message');
        if (messageBubble) {
            messageBubble.style.display = 'none';
            // No special marketing class to remove
        }
        this.isShowingMarketingMessage = false;
    }

    // Clean up timer when needed
    stopMarketingTimer() {
        if (this.marketingTimer) {
            clearTimeout(this.marketingTimer);
            this.marketingTimer = null;
        }
    }

    // Global Country Selector with 3D Globe
    showCountrySelector() {
        // Create 3D globe modal
        const globeModal = document.createElement('div');
        globeModal.className = 'globe-selector-modal';
        globeModal.innerHTML = `
            <div class="globe-modal-overlay">
                <div class="globe-modal-content">
                    <div class="globe-modal-header">
                        <h3>🌍 Choose Your Nordic Adventure</h3>
                        <p>Click on a country flag to visit that DostanWebCSS marketplace</p>
                        <div class="globe-stats">
                            <span class="stat">🌍 6 Countries</span>
                            <span class="stat">🎨 Nordic Artisans</span>
                            <span class="stat">✨ Global Network</span>
                        </div>
                        <button class="globe-modal-close">×</button>
                    </div>
                    <div class="globe-container" id="dostanwebcss-globe-container">
                        <div class="globe-loading">
                            <div class="loading-spinner"></div>
                            <p>Loading magical globe...</p>
                        </div>
                    </div>
                    <div class="globe-info">
                        <p>🐉 Dostik says: "Every country holds its own Nordic treasures! Choose your adventure!"</p>
                    </div>
                </div>
            </div>
        `;

        // Add 3D globe modal styles
        const modalStyle = document.createElement('style');
        modalStyle.textContent = `
            .globe-selector-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 3000;
                animation: fadeIn 0.3s ease;
            }

            .globe-modal-overlay {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--space-lg);
            }

            .globe-modal-content {
                background: var(--glass-bg);
                backdrop-filter: var(--glass-backdrop);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-strong);
                width: 90%;
                max-width: 800px;
                height: 80vh;
                max-height: 600px;
                overflow: hidden;
                position: relative;
                animation: slideUp 0.3s ease;
                display: flex;
                flex-direction: column;
            }

            .globe-modal-header {
                padding: var(--space-lg);
                border-bottom: 1px solid var(--glass-border);
                text-align: center;
                position: relative;
                flex-shrink: 0;
            }

            .globe-modal-header h3 {
                margin: 0 0 var(--space-sm) 0;
                color: var(--forest-deep);
                font-size: 1.5rem;
            }

            .globe-modal-header p {
                margin: 0;
                color: var(--forest-medium);
                font-size: 0.9rem;
                opacity: 0.8;
            }

            .globe-modal-close {
                position: absolute;
                top: var(--space-md);
                right: var(--space-md);
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--forest-medium);
                transition: color 0.2s ease;
                z-index: 10;
            }

            .globe-modal-close:hover {
                color: var(--forest-deep);
            }

            .globe-container {
                flex: 1;
                position: relative;
                min-height: 400px;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
                border-radius: var(--radius-md);
                overflow: visible;
                margin: var(--space-md);
            }

            .globe-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: var(--forest-medium);
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid var(--forest-light);
                border-top: 3px solid var(--aurora-green);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto var(--space-md) auto;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .globe-stats {
                display: flex;
                justify-content: center;
                gap: var(--space-lg);
                margin-top: var(--space-md);
                flex-wrap: wrap;
            }

            .stat {
                font-size: 0.8rem;
                color: var(--forest-medium);
                background: rgba(74, 139, 108, 0.1);
                padding: var(--space-xs) var(--space-sm);
                border-radius: var(--radius-sm);
                border: 1px solid rgba(74, 139, 108, 0.2);
            }

            .globe-info {
                padding: var(--space-md) var(--space-lg);
                text-align: center;
                border-top: 1px solid var(--glass-border);
                background: linear-gradient(135deg, rgba(74, 139, 108, 0.05), rgba(107, 141, 181, 0.03));
                flex-shrink: 0;
            }

            .globe-info p {
                margin: 0;
                color: var(--forest-deep);
                font-size: 0.9rem;
                font-style: italic;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .globe-container canvas {
                display: block !important;
                margin: 0 auto !important;
            }

            @media (max-width: 768px) {
                .globe-modal-content {
                    width: 95%;
                    height: 85vh;
                }

                .globe-container {
                    min-height: 300px;
                }
            }
        `;

        document.head.appendChild(modalStyle);
        document.body.appendChild(globeModal);

        // Event listeners
        const closeModal = () => {
            globeModal.remove();
            modalStyle.remove();
        };

        globeModal.querySelector('.globe-modal-close').addEventListener('click', closeModal);
        globeModal.querySelector('.globe-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });

        // Initialize 3D Globe after modal is added to DOM
        setTimeout(() => {
            this.initialize3DGlobe(globeModal, closeModal);
        }, 100);
    }

    // Initialize 3D Globe
    initialize3DGlobe(modal, closeModalCallback) {
        const container = modal.querySelector('#dostanwebcss-globe-container');
        if (!container) {
            console.error('Globe container not found');
            return;
        }

        if (!window.Globe) {
            console.error('Globe.gl library not loaded');
            // Show fallback message
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--forest-medium);">
                    <h3>🌍 Globe Loading...</h3>
                    <p>Please wait while we load the 3D globe...</p>
                    <div class="country-fallback-grid">
                        <div onclick="window.open('https://dostanwebcss.com.tr', '_blank')" style="cursor: pointer; padding: 10px; margin: 5px; border: 1px solid #ccc; display: inline-block;">🇹🇷 Turkey</div>
                        <div onclick="window.open('https://dostanwebcss.de', '_blank')" style="cursor: pointer; padding: 10px; margin: 5px; border: 1px solid #ccc; display: inline-block;">🇩🇪 Germany</div>
                        <div onclick="window.open('https://dostanwebcss.jp', '_blank')" style="cursor: pointer; padding: 10px; margin: 5px; border: 1px solid #ccc; display: inline-block;">🇯🇵 Japan</div>
                        <div onclick="window.open('https://dostanwebcss.com', '_blank')" style="cursor: pointer; padding: 10px; margin: 5px; border: 1px solid #ccc; display: inline-block;">🇺🇸 USA</div>
                        <div onclick="window.open('https://dostanwebcss.co.uk', '_blank')" style="cursor: pointer; padding: 10px; margin: 5px; border: 1px solid #ccc; display: inline-block;">🇬🇧 UK</div>
                        <div onclick="window.open('https://dostanwebcss.fr', '_blank')" style="cursor: pointer; padding: 10px; margin: 5px; border: 1px solid #ccc; display: inline-block;">🇫🇷 France</div>
                    </div>
                </div>
            `;
            return;
        }

        // Hide loading
        const loading = container.querySelector('.globe-loading');
        if (loading) loading.style.display = 'none';

        console.log('Initializing countries...');

        // Countries data for DostanWebCSS with debug
        const countries = [
            { name: 'Turkey', domain: 'dostanwebcss.com.tr', coordinates: [39, 35], abbreviation: 'TR', flagUrl: 'https://flagcdn.com/32x24/tr.png' },
            { name: 'Germany', domain: 'dostanwebcss.de', coordinates: [51, 10], abbreviation: 'DE', flagUrl: 'https://flagcdn.com/32x24/de.png' },
            { name: 'Japan', domain: 'dostanwebcss.jp', coordinates: [36, 138], abbreviation: 'JP', flagUrl: 'https://flagcdn.com/32x24/jp.png' },
            { name: 'United States', domain: 'dostanwebcss.com', coordinates: [38, -97], abbreviation: 'US', flagUrl: 'https://flagcdn.com/32x24/us.png' },
            { name: 'United Kingdom', domain: 'dostanwebcss.co.uk', coordinates: [54, -2], abbreviation: 'UK', flagUrl: 'https://flagcdn.com/32x24/gb.png' },
            { name: 'France', domain: 'dostanwebcss.fr', coordinates: [46, 2], abbreviation: 'FR', flagUrl: 'https://flagcdn.com/32x24/fr.png' }
        ];

        console.log('Countries loaded:', countries.length);

        // Simplified but effective globe initialization
        const globeWidth = Math.min(container.clientWidth, 600);
        const globeHeight = Math.min(container.clientHeight, 400);

        console.log('Creating globe with dimensions:', globeWidth, 'x', globeHeight);

        const globe = Globe()(container)
            .backgroundColor('rgba(0,0,0,0)')
            .width(globeWidth)
            .height(globeHeight)
            .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .showAtmosphere(true)
            .atmosphereColor('#74a57f')
            .atmosphereAltitude(0.15)
            .htmlElementsData(countries)
            .htmlLat(d => {
                console.log('Setting lat for', d.name, ':', d.coordinates[0]);
                return d.coordinates[0];
            })
            .htmlLng(d => {
                console.log('Setting lng for', d.name, ':', d.coordinates[1]);
                return d.coordinates[1];
            })
            .htmlAltitude(0.005)
            .htmlElement(d => {
                console.log('Creating element for:', d.name);

                // Create stable Nordic country marker
                const wrapper = document.createElement('div');
                wrapper.className = 'nordic-country-marker';
                wrapper.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    pointer-events: auto;
                    transform: scale(1);
                    transform-origin: center center;
                    transition: transform 0.3s ease, filter 0.3s ease;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                    position: relative;
                    width: 60px;
                    height: 80px;
                `;

                // Create stable Nordic rune container
                const runeContainer = document.createElement('div');
                runeContainer.style.cssText = `
                    position: relative;
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, rgba(74, 139, 108, 0.9), rgba(107, 141, 181, 0.8));
                    border: 2px solid rgba(255, 255, 255, 0.8);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(2px);
                    box-shadow: 0 2px 10px rgba(74, 139, 108, 0.4);
                    transition: all 0.2s ease;
                    transform-origin: center center;
                `;

                // Create stable flag element
                const flagEl = document.createElement('img');
                flagEl.src = d.flagUrl;
                flagEl.style.cssText = `
                    width: 24px;
                    height: 18px;
                    border-radius: 3px;
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    transition: transform 0.2s ease;
                    transform-origin: center center;
                `;

                runeContainer.appendChild(flagEl);

                // Create compact text label
                const textEl = document.createElement('div');
                textEl.innerHTML = `
                    <div style="
                        color: white;
                        font-size: 9px;
                        margin-top: 4px;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                        background: rgba(26, 74, 58, 0.9);
                        padding: 3px 6px;
                        border-radius: 8px;
                        font-weight: 600;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        text-align: center;
                        min-width: 40px;
                        transition: all 0.2s ease;
                        transform-origin: center center;
                    ">
                        ${d.abbreviation}
                    </div>
                `;

                // Stable hover effects
                wrapper.addEventListener('mouseenter', () => {
                    wrapper.style.transform = 'scale(1.15)';
                    wrapper.style.filter = 'drop-shadow(0 4px 15px rgba(74, 139, 108, 0.6))';
                    runeContainer.style.background = 'linear-gradient(135deg, rgba(74, 139, 108, 1), rgba(107, 141, 181, 1))';
                    runeContainer.style.boxShadow = '0 4px 15px rgba(74, 139, 108, 0.6)';
                    flagEl.style.transform = 'scale(1.05)';
                });

                wrapper.addEventListener('mouseleave', () => {
                    wrapper.style.transform = 'scale(1)';
                    wrapper.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
                    runeContainer.style.background = 'linear-gradient(135deg, rgba(74, 139, 108, 0.9), rgba(107, 141, 181, 0.8))';
                    runeContainer.style.boxShadow = '0 2px 10px rgba(74, 139, 108, 0.4)';
                    flagEl.style.transform = 'scale(1)';
                });

                // Enhanced click event with country-specific messages
                wrapper.addEventListener('click', () => {
                    const countryMessages = {
                        'Turkey': '🇹🇷 Türkiye Nordic macerası başlıyor! Dostik orada da seninle olacak! ✨',
                        'Germany': '🇩🇪 Deutschland Nordic adventure begins! Dostik wird mit dir dort sein! ✨',
                        'Japan': '🇯🇵 Japan Nordic adventure starts! Dostik あなたと一緒にいるでしょう! ✨',
                        'United States': '🇺🇸 USA Nordic adventure begins! Dostik will be with you there! ✨',
                        'United Kingdom': '🇬🇧 UK Nordic adventure begins! Dostik will be with you there, mate! ✨',
                        'France': '🇫🇷 France Nordic adventure begins! Dostik sera avec toi là-bas! ✨'
                    };

                    // Dostik country-specific farewell message
                    const message = countryMessages[d.name] || `🌍 ${d.name} Nordic adventure begins! Dostik will be with you there too! ✨`;
                    this.addChatMessage(message);

                    // Open chat to show message
                    if (this.chatWidget && !this.chatWidget.classList.contains('open')) {
                        this.chatWidget.classList.add('open');
                    }

                    // Visual feedback
                    wrapper.style.animation = 'pulse 0.6s ease-out';

                    // Redirect after delay
                    setTimeout(() => {
                        window.open(`https://${d.domain}`, '_blank');
                        closeModalCallback();
                    }, 1800);
                });

                wrapper.appendChild(runeContainer);
                wrapper.appendChild(textEl);

                console.log('Created marker for:', d.name, 'at coordinates:', d.coordinates);
                return wrapper;
            })
            .htmlAltitude(0.15)
            .htmlLat(d => d.coordinates[0])
            .htmlLng(d => d.coordinates[1]);

        console.log('Globe created, adding lighting...');

        // Nordic atmospheric lighting
        const scene = globe.scene();
        scene.add(new window.THREE.AmbientLight(0xffffff, 0.6));
        const directionalLight = new window.THREE.DirectionalLight(0x74a57f, 0.7);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Set stable globe position
        globe
            .pointOfView({ lat: 15, lng: 0, altitude: 2.2 })
            .enablePointerInteraction(true);

        // Slower, smoother auto-rotation
        let autoRotate = true;
        const rotateGlobe = () => {
            if (autoRotate) {
                const currentPov = globe.pointOfView();
                globe.pointOfView({
                    lat: currentPov.lat,
                    lng: currentPov.lng + 0.1,
                    altitude: currentPov.altitude
                });
            }
        };

        const rotationInterval = setInterval(rotateGlobe, 150);

        // Better rotation control
        container.addEventListener('mouseenter', () => { autoRotate = false; });
        container.addEventListener('mouseleave', () => {
            setTimeout(() => { autoRotate = true; }, 2000);
        });

        // Force center the canvas
        setTimeout(() => {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.style.position = 'absolute';
                canvas.style.top = '50%';
                canvas.style.left = '50%';
                canvas.style.transform = 'translate(-50%, -50%)';
                canvas.style.maxWidth = '100%';
                canvas.style.maxHeight = '100%';
            }
        }, 200);

        // Remove old force sizing (handled above)
        // setTimeout removed to avoid conflicts

        // Handle window resize
        const handleResize = () => {
            if (globe && container) {
                globe.width(container.clientWidth);
                globe.height(container.clientHeight);
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    canvas.style.display = 'block';
                    canvas.style.margin = '0 auto';
                }
            }
        };

        window.addEventListener('resize', handleResize);

        // Clean up on modal close
        const originalClose = closeModalCallback;
        closeModalCallback = () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(rotationInterval);
            originalClose();
        };

        return globe;
    }
}

// Early initialization for faster loading
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDostik);
} else {
    // DOM already loaded
    initializeDostik();
}

function initializeDostik() {
    // Initialize Dostik immediately
    window.dostikAI = new DostikAI();

    // Add initializeProductBubbles as an alias for products-api.js compatibility
    window.dostikAI.initializeProductBubbles = function () {
        setupProductCardObserver();
    };

    // Use requestAnimationFrame for smooth initialization
    requestAnimationFrame(() => {
        // Setup product card hovers with intersection observer for better performance
        setupProductCardObserver();
        window.dostikAI.setupEasterEggs();
    });
}

function setupProductCardObserver() {
    // Use intersection observer for better performance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Setup hover only when card becomes visible
                setupCardHover(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: '50px' });

    // Observe existing cards
    document.querySelectorAll('.product-card').forEach(card => {
        observer.observe(card);
    });

    // Also setup immediate hovers for visible cards
    window.dostikAI.setupProductCardHovers();
}

function setupCardHover(card) {
    if (card.dataset.dostikSetup) return;
    card.dataset.dostikSetup = 'true';

    card.addEventListener('mouseenter', () => {
        if (window.dostikAI && window.dostikAI.dostikActive && window.dostikAI.mouseFollower) {
            const message = window.dostikAI.getContextualMessage(card);
            const messageElement = window.dostikAI.mouseFollower.querySelector('.dostik-speech-bubble');
            messageElement.textContent = message;
            window.dostikAI.mouseFollower.setVisible(true);
        }
    });

    card.addEventListener('mouseleave', () => {
        if (window.dostikAI && window.dostikAI.mouseFollower) {
            window.dostikAI.mouseFollower.setVisible(false);
        }
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DostikAI;
}
