/* ===============================================
   DOSTANWEBCSS - Special Effects & Animations
   Revolutionary visual effects for the Nordic marketplace
   =============================================== */

class SpecialEffectsManager {
    constructor() {
        this.isInitialized = false;
        this.particleSystems = new Map();
        this.morphingShapes = [];
        this.auroras = [];
        this.customCursor = null;
        this.soundEnabled = false;

        this.init();
    }

    init() {
        if (this.isInitialized) return;

        this.setupParticleSystems();
        this.setupMorphingShapes();
        this.setupAuroraEffects();
        this.setupCustomCursor();
        this.setupScrollAnimations();
        this.setupLoadingAnimations();
        this.setupEasterEggs();
        this.setupSoundSystem();
        this.setupPhysicsEngine();

        this.isInitialized = true;
    }

    // ===============================================
    // PARTICLE SYSTEMS
    // ===============================================

    setupParticleSystems() {
        this.createFloatingParticles();
        this.createPremiumParticles();
        this.createMagicalTrails();
        this.createAuroraParticles();
    }

    createFloatingParticles() {
        const container = document.body;
        const particleCount = window.innerWidth < 768 ? 15 : 30;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'floating-particle';
            particle.style.cssText = `
                position: fixed;
                width: ${2 + Math.random() * 4}px;
                height: ${2 + Math.random() * 4}px;
                background: var(--aurora-green);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1;
                opacity: ${0.1 + Math.random() * 0.3};
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: floatParticle ${8 + Math.random() * 12}s linear infinite;
                animation-delay: ${Math.random() * 10}s;
            `;
            container.appendChild(particle);
        }

        // Add CSS animation
        this.injectCSS(`
            @keyframes floatParticle {
                0% {
                    transform: translateY(100vh) rotate(0deg) scale(0);
                    opacity: 0;
                }
                10% {
                    opacity: 0.8;
                    transform: scale(1);
                }
                90% {
                    opacity: 0.8;
                }
                100% {
                    transform: translateY(-100px) rotate(360deg) scale(0);
                    opacity: 0;
                }
            }
        `);
    }

    createPremiumParticles() {
        const premiumProducts = document.querySelectorAll('.product-card.premium, .featured-artisan');

        premiumProducts.forEach(product => {
            const particleContainer = document.createElement('div');
            particleContainer.className = 'premium-particles';
            particleContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                overflow: hidden;
                z-index: -1;
            `;

            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    background: var(--aurora-purple);
                    border-radius: 50%;
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    animation: premiumSparkle ${2 + Math.random() * 3}s ease-in-out infinite;
                    animation-delay: ${Math.random() * 3}s;
                `;
                particleContainer.appendChild(particle);
            }

            product.style.position = 'relative';
            product.appendChild(particleContainer);
        });

        this.injectCSS(`
            @keyframes premiumSparkle {
                0%, 100% {
                    opacity: 0;
                    transform: scale(0) rotate(0deg);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.5) rotate(180deg);
                }
            }
        `);
    }

    createMagicalTrails() {
        let trailParticles = [];

        document.addEventListener('mousemove', (e) => {
            if (Math.random() < 0.1) { // Reduce frequency on mobile
                const trail = document.createElement('div');
                trail.style.cssText = `
                    position: fixed;
                    left: ${e.clientX}px;
                    top: ${e.clientY}px;
                    width: 4px;
                    height: 4px;
                    background: radial-gradient(circle, var(--aurora-green) 0%, transparent 70%);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 9999;
                    animation: trailFade 1s ease-out forwards;
                `;

                document.body.appendChild(trail);
                trailParticles.push(trail);

                // Remove after animation
                setTimeout(() => {
                    if (trail.parentNode) {
                        trail.parentNode.removeChild(trail);
                    }
                    trailParticles = trailParticles.filter(p => p !== trail);
                }, 1000);
            }
        });

        this.injectCSS(`
            @keyframes trailFade {
                0% {
                    opacity: 0.8;
                    transform: scale(1);
                }
                100% {
                    opacity: 0;
                    transform: scale(0.2);
                }
            }
        `);
    }

    createAuroraParticles() {
        const auroraContainer = document.createElement('div');
        auroraContainer.className = 'aurora-particles';
        auroraContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
        `;

        for (let i = 0; i < 5; i++) {
            const aurora = document.createElement('div');
            aurora.style.cssText = `
                position: absolute;
                width: 200%;
                height: 100px;
                background: linear-gradient(90deg,
                    transparent,
                    rgba(74, 139, 108, 0.1),
                    rgba(107, 141, 181, 0.1),
                    rgba(155, 123, 184, 0.1),
                    transparent
                );
                left: -100%;
                top: ${Math.random() * 100}%;
                animation: auroraMove ${20 + Math.random() * 20}s linear infinite;
                animation-delay: ${Math.random() * 10}s;
                transform: skewY(${-10 + Math.random() * 20}deg);
            `;
            auroraContainer.appendChild(aurora);
        }

        document.body.appendChild(auroraContainer);

        this.injectCSS(`
            @keyframes auroraMove {
                0% {
                    left: -100%;
                    opacity: 0;
                }
                10%, 90% {
                    opacity: 0.6;
                }
                100% {
                    left: 100%;
                    opacity: 0;
                }
            }
        `);
    }

    // ===============================================
    // MORPHING SHAPES
    // ===============================================

    setupMorphingShapes() {
        const containers = document.querySelectorAll('.section, .glass-card');

        containers.forEach((container, index) => {
            if (Math.random() < 0.3) { // 30% chance for each container
                const shape = this.createMorphingShape(index);
                container.style.position = 'relative';
                container.appendChild(shape);
            }
        });
    }

    createMorphingShape(index) {
        const shapes = [
            'polygon(50% 0%, 0% 100%, 100% 100%)', // Triangle
            'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', // Diamond
            'circle(50% at 50% 50%)', // Circle
            'ellipse(25% 40% at 50% 50%)', // Ellipse
            'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' // Trapezoid
        ];

        const shape = document.createElement('div');
        shape.className = 'morphing-shape';
        shape.style.cssText = `
            position: absolute;
            width: ${50 + Math.random() * 100}px;
            height: ${50 + Math.random() * 100}px;
            background: linear-gradient(45deg,
                rgba(74, 139, 108, 0.05) 0%,
                rgba(155, 123, 184, 0.05) 100%
            );
            top: ${Math.random() * 80}%;
            right: ${Math.random() * 20}%;
            clip-path: ${shapes[0]};
            z-index: -1;
            animation: morphShape ${5 + Math.random() * 10}s ease-in-out infinite;
            animation-delay: ${index * 0.5}s;
        `;

        // Create morphing animation
        const morphKeyframes = shapes.map((shape, i) => `
            ${(i * 100) / (shapes.length - 1)}% {
                clip-path: ${shape};
                transform: rotate(${i * 72}deg) scale(${0.8 + Math.random() * 0.4});
            }
        `).join('\n');

        this.injectCSS(`
            @keyframes morphShape {
                ${morphKeyframes}
            }
        `);

        this.morphingShapes.push(shape);
        return shape;
    }

    // ===============================================
    // AURORA EFFECTS
    // ===============================================

    setupAuroraEffects() {
        this.createBackgroundAurora();
        this.createInteractiveAurora();
    }

    createBackgroundAurora() {
        const aurora = document.createElement('div');
        aurora.className = 'background-aurora';
        aurora.style.cssText = `
            position: fixed;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: conic-gradient(
                from 0deg,
                transparent 0deg,
                rgba(74, 139, 108, 0.03) 60deg,
                rgba(107, 141, 181, 0.03) 120deg,
                rgba(155, 123, 184, 0.03) 180deg,
                transparent 240deg,
                transparent 360deg
            );
            z-index: -10;
            animation: rotateAurora 60s linear infinite;
            pointer-events: none;
        `;

        document.body.appendChild(aurora);

        this.injectCSS(`
            @keyframes rotateAurora {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `);
    }

    createInteractiveAurora() {
        document.addEventListener('mousemove', (e) => {
            if (Math.random() < 0.02) { // Low frequency
                const aurora = document.createElement('div');
                aurora.style.cssText = `
                    position: fixed;
                    left: ${e.clientX - 100}px;
                    top: ${e.clientY - 50}px;
                    width: 200px;
                    height: 100px;
                    background: radial-gradient(
                        ellipse at center,
                        rgba(74, 139, 108, 0.2) 0%,
                        rgba(107, 141, 181, 0.1) 50%,
                        transparent 100%
                    );
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 1;
                    animation: auroraFlash 2s ease-out forwards;
                `;

                document.body.appendChild(aurora);

                setTimeout(() => {
                    if (aurora.parentNode) {
                        aurora.parentNode.removeChild(aurora);
                    }
                }, 2000);
            }
        });

        this.injectCSS(`
            @keyframes auroraFlash {
                0% {
                    opacity: 0;
                    transform: scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: scale(0.8);
                }
            }
        `);
    }

    // ===============================================
    // CUSTOM CURSOR EFFECTS
    // ===============================================

    setupCustomCursor() {
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        cursor.style.cssText = `
            position: fixed;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, var(--aurora-green) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            mix-blend-mode: difference;
            transition: all 0.1s ease;
            transform: translate(-50%, -50%);
        `;

        document.body.appendChild(cursor);
        this.customCursor = cursor;

        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        // Cursor interactions
        document.addEventListener('mouseenter', (e) => {
            if (e.target.matches('button, a, .product-card, input, textarea')) {
                cursor.style.transform = 'translate(-50%, -50%) scale(2)';
                cursor.style.background = 'radial-gradient(circle, var(--aurora-purple) 0%, transparent 70%)';
            }
        }, true);

        document.addEventListener('mouseleave', (e) => {
            if (e.target.matches('button, a, .product-card, input, textarea')) {
                cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                cursor.style.background = 'radial-gradient(circle, var(--aurora-green) 0%, transparent 70%)';
            }
        }, true);

        // Hide on mobile
        if (window.innerWidth < 768) {
            cursor.style.display = 'none';
        }
    }

    // ===============================================
    // SCROLL ANIMATIONS
    // ===============================================

    setupScrollAnimations() {
        this.setupParallaxLayers();
        this.setupRevealAnimations();
        this.setupScrollTriggers();
    }

    setupParallaxLayers() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;

            parallaxElements.forEach(element => {
                const speed = parseFloat(element.dataset.parallax) || 0.5;
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
        });
    }

    setupRevealAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    this.createRevealEffect(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.product-card, .glass-card, .artisan-card').forEach(el => {
            el.classList.add('reveal-element');
            observer.observe(el);
        });

        this.injectCSS(`
            .reveal-element {
                opacity: 0;
                transform: translateY(50px);
                transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            .reveal-element.revealed {
                opacity: 1;
                transform: translateY(0);
            }
        `);
    }

    createRevealEffect(element) {
        const sparkles = document.createElement('div');
        sparkles.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 5;
        `;

        for (let i = 0; i < 5; i++) {
            const sparkle = document.createElement('div');
            sparkle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: var(--aurora-green);
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: sparkleReveal 1s ease-out forwards;
                animation-delay: ${Math.random() * 0.5}s;
            `;
            sparkles.appendChild(sparkle);
        }

        element.style.position = 'relative';
        element.appendChild(sparkles);

        setTimeout(() => {
            if (sparkles.parentNode) {
                sparkles.parentNode.removeChild(sparkles);
            }
        }, 1500);

        this.injectCSS(`
            @keyframes sparkleReveal {
                0% {
                    opacity: 0;
                    transform: scale(0) rotate(0deg);
                }
                50% {
                    opacity: 1;
                    transform: scale(1.5) rotate(180deg);
                }
                100% {
                    opacity: 0;
                    transform: scale(0) rotate(360deg);
                }
            }
        `);
    }

    setupScrollTriggers() {
        let scrollTimeout;

        window.addEventListener('scroll', () => {
            // Throttle scroll events
            if (scrollTimeout) return;

            scrollTimeout = setTimeout(() => {
                scrollTimeout = null;
                this.updateScrollEffects();
            }, 16); // ~60fps
        });
    }

    updateScrollEffects() {
        const scrollPercent = window.pageYOffset / (document.body.scrollHeight - window.innerHeight);

        // Update aurora intensity based on scroll
        const auroraElements = document.querySelectorAll('.background-aurora, .aurora-particles');
        auroraElements.forEach(aurora => {
            aurora.style.opacity = 0.3 + (scrollPercent * 0.4);
        });

        // Update particle density
        const particles = document.querySelectorAll('.floating-particle');
        particles.forEach(particle => {
            const newOpacity = 0.1 + (scrollPercent * 0.3);
            particle.style.opacity = newOpacity;
        });
    }

    // ===============================================
    // LOADING ANIMATIONS
    // ===============================================

    setupLoadingAnimations() {
        this.createLoadingStories();
        this.createTransitionEffects();
    }

    createLoadingStories() {
        const loadingScreen = document.querySelector('#loadingScreen, .loading-screen');
        if (!loadingScreen) return;

        const stories = [
            "🐉 Dostik is awakening from his slumber...",
            "❄️ Gathering frost from Nordic mountains...",
            "🌲 Collecting whispers from ancient forests...",
            "⚡ Charging the aurora with magic...",
            "🎨 Preparing artisan workshops...",
            "✨ Nordic realm is ready for exploration!"
        ];

        const storyElement = document.createElement('div');
        storyElement.style.cssText = `
            margin-top: var(--space-lg);
            font-size: 1.1rem;
            color: var(--forest-medium);
            text-align: center;
            min-height: 2em;
            animation: typewriter 1s steps(40) infinite;
        `;

        loadingScreen.appendChild(storyElement);

        let currentStory = 0;
        const updateStory = () => {
            if (currentStory < stories.length) {
                storyElement.textContent = stories[currentStory];
                currentStory++;
                setTimeout(updateStory, 800);
            }
        };

        updateStory();
    }

    createTransitionEffects() {
        // Page transition effects
        const style = document.createElement('style');
        style.textContent = `
            .page-transition {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, var(--forest-deep) 0%, var(--forest-medium) 100%);
                z-index: 10000;
                transform: translateX(-100%);
                transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }

            .page-transition.active {
                transform: translateX(0);
            }

            .page-transition.exit {
                transform: translateX(100%);
            }
        `;
        document.head.appendChild(style);
    }

    // ===============================================
    // EASTER EGGS
    // ===============================================

    setupEasterEggs() {
        this.setupKonamiCode();
        this.setupSecretGestures();
        this.setupHiddenMessages();
    }

    setupKonamiCode() {
        const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                         'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
        let current = 0;

        document.addEventListener('keydown', (e) => {
            if (e.code === sequence[current]) {
                current++;
                if (current === sequence.length) {
                    this.activateSecretMode();
                    current = 0;
                }
            } else {
                current = 0;
            }
        });
    }

    activateSecretMode() {
        // Dragon mode - everything becomes more magical
        document.body.classList.add('dragon-mode');

        const style = document.createElement('style');
        style.textContent = `
            .dragon-mode {
                animation: dragonPulse 2s ease-in-out infinite;
            }

            .dragon-mode .product-card {
                border: 2px solid var(--aurora-green);
                box-shadow: 0 0 30px rgba(74, 139, 108, 0.5);
            }

            .dragon-mode .floating-particle {
                animation-duration: 2s !important;
                background: var(--aurora-purple) !important;
                width: 8px !important;
                height: 8px !important;
            }

            @keyframes dragonPulse {
                0%, 100% { filter: hue-rotate(0deg); }
                50% { filter: hue-rotate(20deg); }
            }
        `;
        document.head.appendChild(style);

        // Show secret message
        if (window.dostikAI) {
            window.dostikAI.addChatMessage("🐉🔥 KONAMI CODE ACTIVATED! You've discovered the Dragon's Secret Power! The realm is now enhanced with ancient magic! Press ESC to return to normal. ✨");
        }

        // Escape to exit
        const exitHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.classList.remove('dragon-mode');
                document.removeEventListener('keydown', exitHandler);
                style.remove();
            }
        };
        document.addEventListener('keydown', exitHandler);
    }

    setupSecretGestures() {
        let clickCount = 0;
        let clickTimer = null;

        document.addEventListener('click', (e) => {
            if (e.target.closest('.dostik-floating, .dostik-avatar, .dostik-chat-avatar')) {
                clickCount++;

                if (clickTimer) clearTimeout(clickTimer);

                clickTimer = setTimeout(() => {
                    if (clickCount >= 7) {
                        this.showSecretMessage();
                    }
                    clickCount = 0;
                }, 2000);
            }
        });
    }

    showSecretMessage() {
        const secretModal = document.createElement('div');
        secretModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.5s ease-out;
        `;

        const secretContent = document.createElement('div');
        secretContent.style.cssText = `
            background: linear-gradient(135deg, var(--aurora-green), var(--aurora-purple));
            color: white;
            padding: var(--space-xxl);
            border-radius: var(--radius-xl);
            text-align: center;
            max-width: 500px;
            margin: var(--space-lg);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        `;

        secretContent.innerHTML = `
            <div style="font-size: 4rem; margin-bottom: var(--space-lg);">🐉✨</div>
            <h2 style="margin-bottom: var(--space-lg);">Secret of the Dragon Realm!</h2>
            <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: var(--space-xl);">
                You have discovered the ancient bond ritual! Dostik recognizes your dedication
                and grants you the title of "Dragon Whisperer". Your next purchase will receive
                a mystical 15% discount with code: <strong>DRAGONBOND</strong>
            </p>
            <button onclick="this.parentElement.parentElement.remove()"
                    style="background: rgba(255,255,255,0.2); border: 2px solid white; color: white;
                           padding: var(--space-md) var(--space-xl); border-radius: var(--radius-md);
                           cursor: pointer; font-size: 1rem; font-weight: 600;">
                🙏 Thank you, Dostik!
            </button>
        `;

        secretModal.appendChild(secretContent);
        document.body.appendChild(secretModal);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (secretModal.parentNode) {
                secretModal.remove();
            }
        }, 10000);
    }

    setupHiddenMessages() {
        // Developer easter eggs available in production
        // Use dostik.speak(), dostik.magic(), dostik.story(), dostik.treasure() in console

        // Global dostik object for console interaction
        window.dostik = {
            speak: (message) => {
                if (window.dostikAI) {
                    window.dostikAI.addChatMessage(`🐉 ${message}`);
                }
            },
            magic: () => {
                this.createMagicalBurst();
            },
            story: () => {
                const stories = [
                    "Long ago, in the depths of Nordic forests, dragons and artisans formed an ancient bond...",
                    "The aurora borealis was created when dragons danced with the spirits of ice and fire...",
                    "Each handcrafted treasure carries a fragment of dragon magic within its core...",
                    "Only those pure of heart can see the true magic woven into Nordic craftsmanship..."
                ];
                if (window.dostikAI) {
                    const story = stories[Math.floor(Math.random() * stories.length)];
                    window.dostikAI.addChatMessage(`📖 ${story}`);
                }
            },
            treasure: () => {
                const codes = ["CONSOLE15", "DEVELOPER20", "NORDIC10"];
                const code = codes[Math.floor(Math.random() * codes.length)];
                if (window.dostikAI) {
                    window.dostikAI.addChatMessage(`🎁 You've found a treasure! Use code ${code} for a discount!`);
                }
            }
        };
    }

    createMagicalBurst() {
        for (let i = 0; i < 20; i++) {
            const burst = document.createElement('div');
            burst.style.cssText = `
                position: fixed;
                left: 50%;
                top: 50%;
                width: 6px;
                height: 6px;
                background: var(--aurora-green);
                border-radius: 50%;
                pointer-events: none;
                z-index: 10000;
                animation: magicalBurst 2s ease-out forwards;
                animation-delay: ${i * 0.05}s;
            `;

            const angle = (i / 20) * Math.PI * 2;
            const distance = 100 + Math.random() * 200;

            burst.style.setProperty('--end-x', `${Math.cos(angle) * distance}px`);
            burst.style.setProperty('--end-y', `${Math.sin(angle) * distance}px`);

            document.body.appendChild(burst);

            setTimeout(() => {
                if (burst.parentNode) {
                    burst.remove();
                }
            }, 2000);
        }

        this.injectCSS(`
            @keyframes magicalBurst {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0);
                }
                50% {
                    opacity: 1;
                    transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(0);
                }
            }
        `);
    }

    // ===============================================
    // SOUND SYSTEM
    // ===============================================

    setupSoundSystem() {
        // Audio context for web audio API
        this.audioContext = null;
        this.sounds = new Map();

        // Initialize on user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.initAudioContext();
            }
        }, { once: true });
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSoundEffects();
        } catch (e) {
            // Web Audio API not supported - continuing without sound
        }
    }

    createSoundEffects() {
        if (!this.audioContext) return;

        // Create simple sound effects using oscillators
        this.sounds.set('hover', this.createTone(800, 0.1, 'sine'));
        this.sounds.set('click', this.createTone(1200, 0.15, 'square'));
        this.sounds.set('success', this.createChord([523, 659, 784], 0.3));
        this.sounds.set('magic', this.createSweep(400, 800, 0.5));
    }

    createTone(frequency, duration, type = 'sine') {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    createChord(frequencies, duration) {
        return () => {
            frequencies.forEach(freq => {
                this.createTone(freq, duration)();
            });
        };
    }

    createSweep(startFreq, endFreq, duration) {
        return () => {
            if (!this.audioContext || !this.soundEnabled) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);

            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    playSound(name) {
        const sound = this.sounds.get(name);
        if (sound) sound();
    }

    // ===============================================
    // PHYSICS ENGINE
    // ===============================================

    setupPhysicsEngine() {
        this.setupGravityEffects();
        this.setupBounceEffects();
        this.setupMagneticEffects();
    }

    setupGravityEffects() {
        // Add gravity to floating elements
        document.querySelectorAll('.dostik-floating').forEach(element => {
            let velocity = { x: 0, y: 0 };
            let position = { x: 0, y: 0 };

            const animate = () => {
                velocity.y += 0.1; // Gravity
                position.x += velocity.x;
                position.y += velocity.y;

                // Bounce off boundaries
                if (position.y > window.innerHeight - 100) {
                    position.y = window.innerHeight - 100;
                    velocity.y *= -0.6; // Bounce with energy loss
                }

                if (position.x < 0 || position.x > window.innerWidth) {
                    velocity.x *= -1;
                }

                element.style.transform = `translate(${position.x}px, ${position.y}px)`;

                if (element.parentNode) {
                    requestAnimationFrame(animate);
                }
            };

            // Start animation on hover
            element.addEventListener('mouseenter', () => {
                animate();
            });
        });
    }

    setupBounceEffects() {
        // Add bounce effect to buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('button, .btn')) {
                const button = e.target;
                button.style.transform = 'scale(0.95)';

                setTimeout(() => {
                    button.style.transform = 'scale(1.05)';
                    setTimeout(() => {
                        button.style.transform = '';
                    }, 100);
                }, 100);

                this.playSound('click');
            }
        });
    }

    setupMagneticEffects() {
        // Magnetic attraction between related elements
        const productCards = document.querySelectorAll('.product-card');

        productCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                // Find nearby cards and slightly attract them
                const rect = card.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                productCards.forEach(otherCard => {
                    if (otherCard === card) return;

                    const otherRect = otherCard.getBoundingClientRect();
                    const otherCenterX = otherRect.left + otherRect.width / 2;
                    const otherCenterY = otherRect.top + otherRect.height / 2;

                    const distance = Math.sqrt(
                        Math.pow(centerX - otherCenterX, 2) +
                        Math.pow(centerY - otherCenterY, 2)
                    );

                    if (distance < 400) { // Within magnetic range
                        const attraction = Math.max(0, (400 - distance) / 400) * 5;
                        const angle = Math.atan2(centerY - otherCenterY, centerX - otherCenterX);

                        otherCard.style.transform = `
                            translate(${Math.cos(angle) * attraction}px, ${Math.sin(angle) * attraction}px)
                            scale(${1 + attraction / 50})
                        `;
                    }
                });
            });

            card.addEventListener('mouseleave', () => {
                // Reset all card positions
                productCards.forEach(otherCard => {
                    otherCard.style.transform = '';
                });
            });
        });
    }

    // ===============================================
    // UTILITY FUNCTIONS
    // ===============================================

    injectCSS(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Public API for external control
    enableSounds() {
        this.soundEnabled = true;
    }

    disableSounds() {
        this.soundEnabled = false;
    }

    createCustomEffect(name, effect) {
        this.customEffects = this.customEffects || new Map();
        this.customEffects.set(name, effect);
    }

    triggerCustomEffect(name) {
        if (this.customEffects && this.customEffects.has(name)) {
            this.customEffects.get(name)();
        }
    }

    // Cleanup for performance
    cleanup() {
        // Remove all created elements
        document.querySelectorAll('.floating-particle, .premium-particles, .aurora-particles, .morphing-shape, .custom-cursor').forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });

        // Clear particle systems
        this.particleSystems.clear();
        this.morphingShapes = [];
        this.auroras = [];

        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
        }

        this.isInitialized = false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.specialEffects = new SpecialEffectsManager();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpecialEffectsManager;
}