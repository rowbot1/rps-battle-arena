// Advanced Visual Effects for RPS Battle Arena

class VisualEffects {
    constructor() {
        this.initParticles();
        this.initGlowEffects();
        this.initCounterAnimation();
    }
    
    initParticles() {
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'particle-container';
        particleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            overflow: hidden;
        `;
        document.body.appendChild(particleContainer);
        
        // Create floating particles
        for (let i = 0; i < 20; i++) {
            this.createFloatingParticle(particleContainer);
        }
    }
    
    createFloatingParticle(container) {
        const particle = document.createElement('div');
        const symbols = ['🪨', '📄', '✂️'];
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        
        particle.innerHTML = symbol;
        particle.style.cssText = `
            position: absolute;
            font-size: ${15 + Math.random() * 20}px;
            opacity: ${0.1 + Math.random() * 0.2};
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float-particle ${20 + Math.random() * 20}s linear infinite;
            filter: blur(${Math.random() * 2}px);
        `;
        
        container.appendChild(particle);
    }
    
    initGlowEffects() {
        // Add glow to winning predictions
        window.addEventListener('roundEnd', (e) => {
            const winnerType = e.detail.winner;
            const winnerButton = document.querySelector(`[data-choice="${winnerType}"]`);
            
            if (winnerButton) {
                winnerButton.classList.add('winner-glow');
                setTimeout(() => {
                    winnerButton.classList.remove('winner-glow');
                }, 3000);
            }
        });
    }
    
    initCounterAnimation() {
        // Animate number changes
        const animateValue = (element, start, end, duration) => {
            const startTime = performance.now();
            
            const update = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const current = Math.floor(start + (end - start) * easeOutQuart);
                
                element.textContent = current.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            };
            
            requestAnimationFrame(update);
        };
        
        // Observe coin changes
        const coinObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const newValue = parseInt(mutation.target.textContent.replace(/,/g, ''));
                    const oldValue = parseInt(mutation.oldValue?.replace(/,/g, '') || '0');
                    
                    if (newValue !== oldValue && !isNaN(newValue) && !isNaN(oldValue)) {
                        animateValue(mutation.target, oldValue, newValue, 1000);
                    }
                }
            });
        });
        
        // Start observing
        const coinAmount = document.querySelector('.coin-amount');
        if (coinAmount) {
            coinObserver.observe(coinAmount, { 
                childList: true, 
                characterData: true,
                characterDataOldValue: true
            });
        }
    }
    
    createWinEffect(x, y) {
        // Create victory burst effect
        const burst = document.createElement('div');
        burst.className = 'victory-burst';
        burst.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 0;
            height: 0;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 9999;
        `;
        
        document.body.appendChild(burst);
        
        // Create burst particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            const angle = (Math.PI * 2 * i) / 20;
            const velocity = 100 + Math.random() * 100;
            
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: ${['#6366f1', '#f59e0b', '#10b981'][Math.floor(Math.random() * 3)]};
                border-radius: 50%;
                animation: burst-particle 1s ease-out forwards;
                --dx: ${Math.cos(angle) * velocity}px;
                --dy: ${Math.sin(angle) * velocity}px;
            `;
            
            burst.appendChild(particle);
        }
        
        setTimeout(() => burst.remove(), 1000);
    }
}

// CSS for effects
const effectStyles = document.createElement('style');
effectStyles.textContent = `
    @keyframes float-particle {
        from {
            transform: translateY(100vh) rotate(0deg);
        }
        to {
            transform: translateY(-100vh) rotate(360deg);
        }
    }
    
    @keyframes burst-particle {
        to {
            transform: translate(var(--dx), var(--dy));
            opacity: 0;
        }
    }
    
    .winner-glow {
        animation: winner-pulse 1s ease-out 3;
        box-shadow: 
            0 0 50px rgba(16, 185, 129, 0.6),
            0 0 100px rgba(16, 185, 129, 0.4),
            inset 0 0 50px rgba(16, 185, 129, 0.2) !important;
    }
    
    @keyframes winner-pulse {
        0%, 100% { 
            transform: scale(1);
            filter: brightness(1);
        }
        50% { 
            transform: scale(1.1);
            filter: brightness(1.3);
        }
    }
    
    /* Neon text effect */
    .neon-text {
        text-shadow: 
            0 0 10px currentColor,
            0 0 20px currentColor,
            0 0 40px currentColor,
            0 0 80px currentColor;
    }
    
    /* Holographic effect */
    .holographic {
        background: linear-gradient(
            45deg,
            #ff0080,
            #ff8c00,
            #40e0d0,
            #ff0080
        );
        background-size: 200% 200%;
        animation: holographic 3s ease-in-out infinite;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    
    @keyframes holographic {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    /* Ripple effect on click */
    .ripple {
        position: relative;
        overflow: hidden;
    }
    
    .ripple::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: translate(-50%, -50%);
        animation: ripple-effect 0.6s ease-out;
    }
    
    @keyframes ripple-effect {
        to {
            width: 200px;
            height: 200px;
            opacity: 0;
        }
    }
`;

document.head.appendChild(effectStyles);

// Export
window.VisualEffects = VisualEffects;