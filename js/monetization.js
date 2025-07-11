// Monetization System for RPS Battle Arena

class MonetizationManager {
    constructor() {
        this.isPremium = false;
        this.premiumExpiry = null;
        this.adRevenue = 0;
        this.purchaseHistory = [];
        
        // Revenue tracking
        this.revenueStreams = {
            ads: 0,
            premium: 0,
            coinPurchases: 0,
            total: 0
        };
        
        // Premium features
        this.premiumFeatures = {
            noAds: true,
            doubleCoins: true,
            exclusiveSkins: true,
            fastMode: true,
            detailedStats: true,
            customEmojis: true
        };
        
        // Coin packages
        this.coinPackages = [
            { coins: 1000, price: 0.99, bonus: 0 },
            { coins: 5000, price: 3.99, bonus: 500 },
            { coins: 10000, price: 6.99, bonus: 2000 },
            { coins: 50000, price: 24.99, bonus: 15000 },
            { coins: 100000, price: 39.99, bonus: 40000 }
        ];
        
        this.initialize();
    }
    
    initialize() {
        this.loadPremiumStatus();
        this.setupEventListeners();
        this.initializeAds();
        this.checkReferral();
        
        // Daily bonus check
        this.checkDailyBonus();
    }
    
    setupEventListeners() {
        // Premium button
        document.querySelector('.premium-btn').addEventListener('click', () => {
            this.showPremiumModal();
        });
        
        // Premium modal close
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closePremiumModal();
        });
        
        // Premium purchase buttons
        document.querySelectorAll('.price-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const duration = e.currentTarget.querySelector('.duration').textContent;
                const price = e.currentTarget.querySelector('.price').textContent;
                this.purchasePremium(duration, price);
            });
        });
        
        // Track user engagement for ad optimization
        this.trackEngagement();
    }
    
    initializeAds() {
        if (this.isPremium) {
            // Hide all ads for premium users
            document.querySelectorAll('.ad-container').forEach(ad => {
                ad.style.display = 'none';
            });
            return;
        }
        
        // Initialize ad placements
        this.setupAdPlacements();
        
        // Rewarded video ads
        this.setupRewardedAds();
        
        // Interstitial ads between rounds
        this.setupInterstitialAds();
    }
    
    setupAdPlacements() {
        // Simulate ad loading (replace with actual ad network code)
        document.querySelectorAll('.ad-placeholder').forEach(placeholder => {
            // In production, this would be replaced with actual ad code
            placeholder.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 10px;">
                    <div style="text-align: center;">
                        <p style="margin-bottom: 10px;">Advertisement</p>
                        <button class="watch-ad-btn" style="background: #10b981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">
                            Watch Ad for 50 Coins
                        </button>
                    </div>
                </div>
            `;
            
            // Add click handler for rewarded ads
            const watchAdBtn = placeholder.querySelector('.watch-ad-btn');
            if (watchAdBtn) {
                watchAdBtn.addEventListener('click', () => this.watchRewardedAd());
            }
        });
        
        // Track ad impressions
        this.trackAdImpression();
    }
    
    setupRewardedAds() {
        // Add rewarded ad button to UI
        const rewardedAdBtn = document.createElement('button');
        rewardedAdBtn.className = 'rewarded-ad-btn';
        rewardedAdBtn.innerHTML = '🎬 Watch Ad (+50 Coins)';
        rewardedAdBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #10b981;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 25px;
            font-weight: 500;
            cursor: pointer;
            z-index: 100;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        
        if (!this.isPremium) {
            document.body.appendChild(rewardedAdBtn);
            rewardedAdBtn.addEventListener('click', () => this.watchRewardedAd());
        }
    }
    
    setupInterstitialAds() {
        // Show interstitial ads between rounds (every 3 rounds for non-premium)
        window.addEventListener('roundEnd', (e) => {
            if (!this.isPremium && e.detail.round % 3 === 0) {
                setTimeout(() => this.showInterstitialAd(), 2000);
            }
        });
    }
    
    watchRewardedAd() {
        // Simulate watching an ad
        const modal = document.createElement('div');
        modal.className = 'ad-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a2e; padding: 2rem; border-radius: 20px; text-align: center;">
                <h2 style="margin-bottom: 1rem;">Watching Ad...</h2>
                <div class="ad-progress" style="width: 300px; height: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
                    <div class="ad-progress-bar" style="width: 0%; height: 100%; background: #10b981; transition: width 5s linear;"></div>
                </div>
                <p style="margin-top: 1rem;">Complete the ad to earn 50 coins!</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animate progress bar
        setTimeout(() => {
            modal.querySelector('.ad-progress-bar').style.width = '100%';
        }, 100);
        
        // Complete ad after 5 seconds
        setTimeout(() => {
            modal.remove();
            this.rewardAdCompletion();
        }, 5000);
        
        // Track ad view
        this.trackAdView('rewarded');
    }
    
    rewardAdCompletion() {
        const reward = this.isPremium ? 100 : 50; // Premium users get double
        window.uiController.userCoins += reward;
        window.uiController.updateCoins();
        window.uiController.showNotification(`You earned ${reward} coins!`, 'success');
        
        // Track revenue
        this.adRevenue += 0.02; // Simulated CPM
        this.revenueStreams.ads += 0.02;
        this.updateRevenueTracking();
    }
    
    showInterstitialAd() {
        const modal = document.createElement('div');
        modal.className = 'interstitial-ad';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        modal.innerHTML = `
            <div style="position: relative; background: #1a1a2e; padding: 3rem; border-radius: 20px; text-align: center; max-width: 500px;">
                <button class="skip-ad" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #666; font-size: 1.5rem; cursor: not-allowed;">✕</button>
                <h2 style="margin-bottom: 1rem;">Special Offer!</h2>
                <p style="margin-bottom: 2rem;">Go Premium to remove all ads and get exclusive benefits!</p>
                <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 10px; margin-bottom: 2rem;">
                    <h3>Premium Features:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li>✅ No Ads</li>
                        <li>✅ 2x Coin Earnings</li>
                        <li>✅ Exclusive Skins</li>
                        <li>✅ Priority Support</li>
                    </ul>
                </div>
                <button class="premium-cta" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: black; border: none; padding: 1rem 2rem; border-radius: 25px; font-weight: 700; cursor: pointer;">
                    Get Premium Now
                </button>
                <p class="skip-timer" style="margin-top: 1rem; color: #666;">Skip in 5 seconds</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Skip timer
        let skipTime = 5;
        const skipBtn = modal.querySelector('.skip-ad');
        const skipTimer = modal.querySelector('.skip-timer');
        
        const countdown = setInterval(() => {
            skipTime--;
            skipTimer.textContent = `Skip in ${skipTime} seconds`;
            
            if (skipTime <= 0) {
                clearInterval(countdown);
                skipBtn.style.cursor = 'pointer';
                skipBtn.style.color = '#fff';
                skipTimer.textContent = 'Click X to close';
                skipBtn.addEventListener('click', () => modal.remove());
            }
        }, 1000);
        
        // Premium CTA
        modal.querySelector('.premium-cta').addEventListener('click', () => {
            modal.remove();
            this.showPremiumModal();
        });
        
        // Track ad impression
        this.trackAdView('interstitial');
    }
    
    showPremiumModal() {
        document.querySelector('.premium-modal').style.display = 'flex';
    }
    
    closePremiumModal() {
        document.querySelector('.premium-modal').style.display = 'none';
    }
    
    purchasePremium(duration, price) {
        // In production, this would integrate with payment processor
        console.log(`Processing premium purchase: ${duration} for ${price}`);
        
        // Simulate successful purchase
        this.isPremium = true;
        
        // Set expiry date
        const durationMap = {
            '1 Month': 30,
            '6 Months': 180,
            '1 Year': 365
        };
        
        const days = durationMap[duration];
        this.premiumExpiry = new Date();
        this.premiumExpiry.setDate(this.premiumExpiry.getDate() + days);
        
        // Update UI
        document.querySelector('.premium-btn').textContent = 'Premium ⭐';
        document.querySelector('.premium-btn').style.background = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)';
        
        // Hide ads
        document.querySelectorAll('.ad-container').forEach(ad => {
            ad.style.display = 'none';
        });
        
        // Remove rewarded ad button
        const rewardedBtn = document.querySelector('.rewarded-ad-btn');
        if (rewardedBtn) rewardedBtn.remove();
        
        // Track purchase
        const priceNum = parseFloat(price.replace('$', ''));
        this.revenueStreams.premium += priceNum;
        this.purchaseHistory.push({
            type: 'premium',
            duration: duration,
            price: priceNum,
            date: new Date()
        });
        
        // Save status
        this.savePremiumStatus();
        this.updateRevenueTracking();
        
        // Show success
        window.uiController.showNotification('Welcome to Premium! Enjoy ad-free gaming!', 'success');
        this.closePremiumModal();
        
        // Apply premium benefits
        this.applyPremiumBenefits();
    }
    
    applyPremiumBenefits() {
        // Double coin multiplier for predictions
        if (window.uiController) {
            window.uiController.coinMultiplier = 2;
        }
        
        // Unlock exclusive features
        this.unlockPremiumFeatures();
    }
    
    unlockPremiumFeatures() {
        // Add premium badge
        const userInfo = document.querySelector('.user-info');
        if (!document.querySelector('.premium-badge')) {
            const badge = document.createElement('span');
            badge.className = 'premium-badge';
            badge.textContent = '⭐ Premium';
            badge.style.cssText = `
                background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-weight: 700;
                margin-right: 1rem;
            `;
            userInfo.insertBefore(badge, userInfo.firstChild);
        }
        
        // Add speed control
        this.addSpeedControl();
    }
    
    addSpeedControl() {
        const speedControl = document.createElement('div');
        speedControl.className = 'speed-control';
        speedControl.innerHTML = `
            <label>Game Speed:</label>
            <input type="range" min="0.5" max="3" step="0.5" value="1" class="speed-slider">
            <span class="speed-value">1x</span>
        `;
        speedControl.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            background: rgba(26, 26, 46, 0.9);
            padding: 1rem;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 1rem;
        `;
        
        document.body.appendChild(speedControl);
        
        const slider = speedControl.querySelector('.speed-slider');
        const valueDisplay = speedControl.querySelector('.speed-value');
        
        slider.addEventListener('input', (e) => {
            const speed = e.target.value;
            valueDisplay.textContent = `${speed}x`;
            
            // Apply speed to game
            if (window.battleArena) {
                window.battleArena.entities.forEach(entity => {
                    entity.speed = (1 + Math.random() * 0.5) * parseFloat(speed);
                });
            }
        });
    }
    
    checkDailyBonus() {
        const lastBonus = localStorage.getItem('lastDailyBonus');
        const today = new Date().toDateString();
        
        if (lastBonus !== today) {
            // Award daily bonus
            const bonus = this.isPremium ? 500 : 250;
            
            setTimeout(() => {
                window.uiController.userCoins += bonus;
                window.uiController.updateCoins();
                window.uiController.showNotification(`Daily bonus: ${bonus} coins!`, 'success');
                
                localStorage.setItem('lastDailyBonus', today);
            }, 2000);
        }
    }
    
    checkReferral() {
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref');
        
        if (ref && !localStorage.getItem('referralUsed')) {
            // Award referral bonus
            window.uiController.userCoins += 500;
            window.uiController.updateCoins();
            window.uiController.showNotification('Referral bonus: 500 coins!', 'success');
            
            localStorage.setItem('referralUsed', 'true');
            
            // Track referral
            this.trackReferral(ref);
        }
    }
    
    getReferralLink() {
        const userId = this.generateUserId();
        return `${window.location.origin}?ref=${userId}`;
    }
    
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }
    
    trackEngagement() {
        let engagementTime = 0;
        let isActive = true;
        
        // Track active time
        setInterval(() => {
            if (isActive) {
                engagementTime++;
                
                // Reward long sessions
                if (engagementTime % 300 === 0) { // Every 5 minutes
                    const reward = this.isPremium ? 100 : 50;
                    window.uiController.userCoins += reward;
                    window.uiController.updateCoins();
                    window.uiController.showNotification(`Loyalty bonus: ${reward} coins!`, 'success');
                }
            }
        }, 1000);
        
        // Detect inactivity
        let inactivityTimer;
        const resetInactivity = () => {
            isActive = true;
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                isActive = false;
            }, 30000); // 30 seconds
        };
        
        document.addEventListener('mousemove', resetInactivity);
        document.addEventListener('click', resetInactivity);
        document.addEventListener('keypress', resetInactivity);
        
        resetInactivity();
    }
    
    trackAdImpression() {
        // Simulate ad impression tracking
        this.adRevenue += 0.001; // CPM simulation
        this.revenueStreams.ads += 0.001;
    }
    
    trackAdView(type) {
        // Track different ad types
        const revenue = {
            rewarded: 0.02,
            interstitial: 0.01,
            banner: 0.001
        };
        
        this.adRevenue += revenue[type] || 0.001;
        this.revenueStreams.ads += revenue[type] || 0.001;
        this.updateRevenueTracking();
    }
    
    trackReferral(refCode) {
        // In production, this would send to analytics
        console.log('Referral tracked:', refCode);
    }
    
    updateRevenueTracking() {
        this.revenueStreams.total = 
            this.revenueStreams.ads + 
            this.revenueStreams.premium + 
            this.revenueStreams.coinPurchases;
        
        // In production, send to analytics
        console.log('Revenue update:', this.revenueStreams);
    }
    
    loadPremiumStatus() {
        const saved = localStorage.getItem('premiumStatus');
        if (saved) {
            const data = JSON.parse(saved);
            this.isPremium = data.isPremium;
            this.premiumExpiry = new Date(data.expiry);
            
            // Check if expired
            if (this.premiumExpiry < new Date()) {
                this.isPremium = false;
                this.premiumExpiry = null;
            }
        }
    }
    
    savePremiumStatus() {
        const data = {
            isPremium: this.isPremium,
            expiry: this.premiumExpiry
        };
        localStorage.setItem('premiumStatus', JSON.stringify(data));
    }
}

// Export
window.MonetizationManager = MonetizationManager;