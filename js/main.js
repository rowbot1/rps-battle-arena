// Main initialization for RPS Battle Arena

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting initialization');
    
    // Initialize game components
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    console.log('Canvas found:', canvas);
    
    try {
        window.battleArena = new BattleArena(canvas);
        console.log('BattleArena created');
        
        window.uiController = new UIController();
        console.log('UIController created');
        
        window.monetizationManager = new MonetizationManager();
        window.achievementSystem = new AchievementSystem();
        window.dailyRewardSystem = new DailyRewardSystem();
        window.visualEffects = new VisualEffects();
        console.log('All systems initialized');
        
        // Start the game
        window.battleArena.start();
        console.log('Game started!');
        
        // Trigger round start event
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('roundStart', { 
                detail: { round: 1 } 
            }));
        }, 100);
    } catch (error) {
        console.error('Error during initialization:', error);
        console.error('Stack trace:', error.stack);
    }
    
    // Add loading animation
    showLoadingScreen();
    
    // Initialize analytics (for production)
    initializeAnalytics();
    
    // Set up share functionality
    setupSharing();
    
    // Check for mobile
    checkMobile();
    
    // Start background music (if enabled)
    initializeAudio();
});

function showLoadingScreen() {
    const loader = document.createElement('div');
    loader.className = 'loading-screen';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="loader-logo">
                <div class="logo-text">RPS</div>
                <div class="logo-subtext">BATTLE ARENA</div>
            </div>
            <div class="loader-animation">
                <div class="battle-preview">
                    <span class="loader-emoji rock-emoji">🪨</span>
                    <span class="vs-text">VS</span>
                    <span class="loader-emoji scissors-emoji">✂️</span>
                </div>
            </div>
            <div class="loader-bar">
                <div class="loader-progress"></div>
            </div>
            <p class="loader-text">Initializing epic battles...</p>
            <div class="loader-tips">
                <p class="tip">💡 Tip: Bet early for better odds!</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(loader);
    
    // Animate loading progress
    setTimeout(() => {
        loader.querySelector('.loader-progress').style.width = '100%';
    }, 100);
    
    // Remove loader after animation
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
    }, 2500);
}

function initializeAnalytics() {
    // Google Analytics placeholder
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    
    // Track page view
    gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: 'RPS Battle Arena',
        page_location: window.location.href
    });
    
    // Track game events
    window.addEventListener('roundEnd', (e) => {
        gtag('event', 'round_complete', {
            round_number: e.detail.round,
            winner: e.detail.winner
        });
    });
    
    // Track monetization events
    window.addEventListener('purchase', (e) => {
        gtag('event', 'purchase', {
            value: e.detail.value,
            currency: 'USD',
            items: [e.detail.item]
        });
    });
}

function setupSharing() {
    // Add share button
    const shareBtn = document.createElement('button');
    shareBtn.className = 'share-btn';
    shareBtn.innerHTML = '🔗 Share & Earn 100 Coins';
    shareBtn.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #6366f1;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        font-weight: 500;
        cursor: pointer;
        z-index: 100;
    `;
    
    document.body.appendChild(shareBtn);
    
    shareBtn.addEventListener('click', () => {
        const shareData = {
            title: 'RPS Battle Arena',
            text: 'Watch 300 warriors battle in the ultimate Rock Paper Scissors arena!',
            url: window.monetizationManager.getReferralLink()
        };
        
        if (navigator.share) {
            navigator.share(shareData)
                .then(() => {
                    // Reward for sharing
                    window.uiController.userCoins += 100;
                    window.uiController.updateCoins();
                    window.uiController.showNotification('Thanks for sharing! +100 coins', 'success');
                })
                .catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback for desktop
            showShareModal(shareData.url);
        }
    });
}

function showShareModal(url) {
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    modal.innerHTML = `
        <div style="background: #1a1a2e; padding: 2rem; border-radius: 20px; max-width: 400px;">
            <h2 style="margin-bottom: 1rem;">Share & Earn!</h2>
            <p style="margin-bottom: 1rem;">Share your referral link to earn 100 coins:</p>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                <input type="text" value="${url}" readonly style="flex: 1; padding: 0.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 5px; color: white;">
                <button class="copy-btn" style="background: #6366f1; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">Copy</button>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <a href="https://twitter.com/intent/tweet?text=Check out RPS Battle Arena!&url=${encodeURIComponent(url)}" target="_blank" style="background: #1da1f2; color: white; padding: 0.5rem 1rem; border-radius: 5px; text-decoration: none;">Twitter</a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" style="background: #1877f2; color: white; padding: 0.5rem 1rem; border-radius: 5px; text-decoration: none;">Facebook</a>
            </div>
            <button class="close-modal" style="margin-top: 1rem; background: none; border: 1px solid rgba(255,255,255,0.2); color: white; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; width: 100%;">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Copy functionality
    modal.querySelector('.copy-btn').addEventListener('click', (e) => {
        const input = modal.querySelector('input');
        input.select();
        document.execCommand('copy');
        e.target.textContent = 'Copied!';
        
        // Reward
        window.uiController.userCoins += 100;
        window.uiController.updateCoins();
        window.uiController.showNotification('Link copied! +100 coins', 'success');
    });
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function checkMobile() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile');
        
        // Add mobile-specific features
        addMobileControls();
    }
}

function addMobileControls() {
    // Add fullscreen button for mobile
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'fullscreen-btn';
    fullscreenBtn.innerHTML = '⛶';
    fullscreenBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.1);
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 1.5rem;
        cursor: pointer;
        z-index: 100;
    `;
    
    document.body.appendChild(fullscreenBtn);
    
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });
}

function initializeAudio() {
    // Background music toggle
    const audioBtn = document.createElement('button');
    audioBtn.className = 'audio-toggle';
    audioBtn.innerHTML = '🔊';
    audioBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(255,255,255,0.1);
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 100;
    `;
    
    document.body.appendChild(audioBtn);
    
    // Add performance toggle
    const perfBtn = document.createElement('button');
    perfBtn.className = 'performance-toggle';
    perfBtn.innerHTML = '⚡';
    perfBtn.title = 'Toggle Performance Mode';
    perfBtn.style.cssText = `
        position: fixed;
        bottom: 70px;
        right: 20px;
        background: rgba(255,255,255,0.1);
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 100;
    `;
    
    document.body.appendChild(perfBtn);
    
    perfBtn.addEventListener('click', () => {
        if (window.battleArena) {
            window.battleArena.performanceMode = !window.battleArena.performanceMode;
            perfBtn.style.background = window.battleArena.performanceMode ? '#10b981' : 'rgba(255,255,255,0.1)';
            
            const mode = window.battleArena.performanceMode ? 'enabled' : 'disabled';
            window.uiController.showNotification(`Performance mode ${mode}`, 'info');
            
            // If enabling performance mode, reduce entities
            if (window.battleArena.performanceMode && window.battleArena.entities.length > 150) {
                window.battleArena.enablePerformanceMode();
            }
        }
    });
    
    let audioEnabled = localStorage.getItem('audioEnabled') !== 'false';
    
    // Create audio context (would load actual audio files in production)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    audioBtn.addEventListener('click', () => {
        audioEnabled = !audioEnabled;
        audioBtn.innerHTML = audioEnabled ? '🔊' : '🔇';
        localStorage.setItem('audioEnabled', audioEnabled);
        
        if (audioEnabled) {
            audioContext.resume();
        } else {
            audioContext.suspend();
        }
    });
    
    // Initialize with saved preference
    if (!audioEnabled) {
        audioBtn.innerHTML = '🔇';
        audioContext.suspend();
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case '1':
            document.querySelector('[data-choice="rock"]')?.click();
            break;
        case '2':
            document.querySelector('[data-choice="paper"]')?.click();
            break;
        case '3':
            document.querySelector('[data-choice="scissors"]')?.click();
            break;
        case 'Enter':
            document.querySelector('.bet-confirm')?.click();
            break;
        case 'm':
            document.querySelector('.audio-toggle')?.click();
            break;
    }
});

// Performance optimization
const performanceMonitor = {
    fps: 0,
    lastTime: performance.now(),
    frames: 0,
    
    update() {
        this.frames++;
        const currentTime = performance.now();
        
        if (currentTime > this.lastTime + 1000) {
            this.fps = Math.round((this.frames * 1000) / (currentTime - this.lastTime));
            this.frames = 0;
            this.lastTime = currentTime;
            
            // Adjust quality if FPS is low
            if (this.fps < 30 && window.battleArena) {
                console.log('Low FPS detected, reducing quality...');
                // Reduce particle effects or entity count
            }
        }
        
        requestAnimationFrame(() => this.update());
    }
};

// Start performance monitoring
performanceMonitor.update();

// Scissors emoji variations
const scissorsVariations = ['✂️', '✄', '✁', '✃', '✂'];
let currentScissorsIndex = 0;

// Add scissors toggle button
const scissorsBtn = document.createElement('button');
scissorsBtn.innerHTML = '✂️';
scissorsBtn.title = 'Change Scissors Style';
scissorsBtn.style.cssText = `
    position: fixed;
    bottom: 120px;
    right: 20px;
    background: #7c4dff;
    color: white;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    z-index: 100;
    font-size: 1.5rem;
`;

document.body.appendChild(scissorsBtn);

scissorsBtn.addEventListener('click', () => {
    currentScissorsIndex = (currentScissorsIndex + 1) % scissorsVariations.length;
    const newEmoji = scissorsVariations[currentScissorsIndex];
    
    // Update all scissors emojis
    document.querySelectorAll('.scissors-icon').forEach(el => {
        el.textContent = newEmoji;
    });
    
    document.querySelectorAll('.stat-label').forEach(el => {
        if (el.textContent.includes('Scissors')) {
            el.innerHTML = `${newEmoji} Scissors:`;
        }
    });
    
    scissorsBtn.innerHTML = newEmoji;
    
    window.uiController.showNotification(`Scissors style changed to: ${newEmoji}`, 'info');
});

// Add CSS animations
const styleElement = document.createElement('style');
styleElement.textContent = `
    /* Loading Screen */
    .loading-screen {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: opacity 0.5s ease;
    }
    
    .loader-content {
        text-align: center;
        max-width: 500px;
    }
    
    .loader-logo {
        margin-bottom: 3rem;
    }
    
    .logo-text {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 4rem;
        font-weight: 900;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f59e0b 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: 0.1em;
        animation: glow 2s ease-in-out infinite;
    }
    
    .logo-subtext {
        font-size: 1.5rem;
        font-weight: 300;
        color: #94a3b8;
        letter-spacing: 0.3em;
        margin-top: -0.5rem;
    }
    
    @keyframes glow {
        0%, 100% { filter: brightness(1) drop-shadow(0 0 20px rgba(139, 92, 246, 0.5)); }
        50% { filter: brightness(1.2) drop-shadow(0 0 40px rgba(139, 92, 246, 0.8)); }
    }
    
    .battle-preview {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        margin-bottom: 3rem;
    }
    
    .loader-emoji {
        font-size: 3rem;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }
    
    .rock-emoji {
        animation: slide-right 1.5s ease-in-out infinite;
    }
    
    .scissors-emoji {
        animation: slide-left 1.5s ease-in-out infinite;
    }
    
    .vs-text {
        font-size: 2rem;
        font-weight: 900;
        color: #f59e0b;
        animation: pulse 1s ease-in-out infinite;
    }
    
    @keyframes slide-right {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(10px); }
    }
    
    @keyframes slide-left {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(-10px); }
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.2); opacity: 1; }
    }
    
    .loader-bar {
        width: 400px;
        height: 6px;
        background: rgba(255,255,255,0.05);
        border-radius: 3px;
        overflow: hidden;
        margin: 0 auto 1.5rem;
        position: relative;
    }
    
    .loader-bar::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        animation: shimmer 2s linear infinite;
    }
    
    @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }
    
    .loader-progress {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #8b5cf6, #f59e0b);
        width: 0;
        transition: width 2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
    }
    
    .loader-text {
        color: #94a3b8;
        font-size: 1.1rem;
        margin-bottom: 1rem;
    }
    
    .loader-tips {
        margin-top: 2rem;
    }
    
    .tip {
        color: #64748b;
        font-size: 0.9rem;
        animation: fade-in 1s ease-in-out;
    }
    
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .coin-update {
        animation: pulse 0.5s ease-out;
    }
    
    .current-player {
        background: rgba(99, 102, 241, 0.2) !important;
        border: 1px solid #6366f1;
    }
    
    /* Mobile styles */
    @media (max-width: 768px) {
        .game-wrapper {
            flex-direction: column;
            padding: 1rem;
        }
        
        .left-sidebar, .right-sidebar {
            width: 100%;
            order: 2;
        }
        
        .battle-arena {
            order: 1;
            height: 50vh;
        }
        
        .share-btn {
            top: auto;
            bottom: 70px;
        }
    }
`;

document.head.appendChild(styleElement);

console.log('RPS Battle Arena initialized! 🎮');