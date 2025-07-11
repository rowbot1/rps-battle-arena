// Achievement System for RPS Battle Arena

class AchievementSystem {
    constructor() {
        this.achievements = {
            firstWin: {
                id: 'first_win',
                name: 'First Victory',
                description: 'Win your first prediction',
                reward: 100,
                icon: '🎯',
                unlocked: false
            },
            perfectStreak5: {
                id: 'perfect_5',
                name: 'Oracle',
                description: 'Predict 5 rounds correctly in a row',
                reward: 500,
                icon: '🔮',
                unlocked: false
            },
            highRoller: {
                id: 'high_roller',
                name: 'High Roller',
                description: 'Bet 1000 or more coins on a single round',
                reward: 200,
                icon: '💎',
                unlocked: false
            },
            survivor: {
                id: 'survivor',
                name: 'Last Stand',
                description: 'Win when your choice has less than 10 entities',
                reward: 1000,
                icon: '🏆',
                unlocked: false
            },
            earlyBird: {
                id: 'early_bird',
                name: 'Early Bird',
                description: 'Place a bet in the first 10 seconds',
                reward: 50,
                icon: '⏰',
                unlocked: false
            },
            comeback: {
                id: 'comeback',
                name: 'Comeback King',
                description: 'Win after losing 3 times in a row',
                reward: 300,
                icon: '👑',
                unlocked: false
            },
            allThree: {
                id: 'all_three',
                name: 'Diversified',
                description: 'Win with Rock, Paper, and Scissors',
                reward: 250,
                icon: '🎲',
                unlocked: false
            },
            richPlayer: {
                id: 'rich',
                name: 'Wealthy',
                description: 'Accumulate 10,000 coins',
                reward: 1000,
                icon: '💰',
                unlocked: false
            },
            dedicated: {
                id: 'dedicated',
                name: 'Dedicated Player',
                description: 'Play for 7 days in a row',
                reward: 2000,
                icon: '📅',
                unlocked: false
            },
            social: {
                id: 'social',
                name: 'Social Butterfly',
                description: 'Refer 3 friends who play',
                reward: 1500,
                icon: '🦋',
                unlocked: false
            }
        };
        
        this.unlockedAchievements = this.loadAchievements();
        this.streak = 0;
        this.losses = 0;
        this.winsBy = { rock: 0, paper: 0, scissors: 0 };
        
        this.initializeUI();
    }
    
    initializeUI() {
        // Add achievement notification container
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'achievement-notifications';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2000;
            pointer-events: none;
        `;
        document.body.appendChild(notificationContainer);
        
        // Add achievement button
        const achievementBtn = document.createElement('button');
        achievementBtn.className = 'achievement-btn';
        achievementBtn.innerHTML = '🏆 <span class="achievement-count">0</span>';
        achievementBtn.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 25px;
            font-weight: 700;
            cursor: pointer;
            z-index: 100;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        `;
        
        document.body.appendChild(achievementBtn);
        
        achievementBtn.addEventListener('click', () => this.showAchievementModal());
        
        this.updateAchievementCount();
    }
    
    checkAchievements(event, data) {
        switch(event) {
            case 'bet_won':
                this.checkFirstWin();
                this.checkStreak(true);
                this.checkComeback();
                this.checkWinType(data.prediction);
                this.checkSurvivor(data);
                break;
                
            case 'bet_lost':
                this.checkStreak(false);
                this.losses++;
                break;
                
            case 'bet_placed':
                this.checkHighRoller(data.amount);
                this.checkEarlyBird(data.timeRemaining);
                break;
                
            case 'coins_updated':
                this.checkWealth(data.coins);
                break;
                
            case 'daily_login':
                this.checkDedicated(data.streak);
                break;
                
            case 'referral':
                this.checkSocial(data.referrals);
                break;
        }
    }
    
    checkFirstWin() {
        if (!this.achievements.firstWin.unlocked) {
            this.unlockAchievement('firstWin');
        }
    }
    
    checkStreak(won) {
        if (won) {
            this.streak++;
            this.losses = 0;
            
            if (this.streak >= 5 && !this.achievements.perfectStreak5.unlocked) {
                this.unlockAchievement('perfectStreak5');
            }
        } else {
            this.streak = 0;
        }
    }
    
    checkHighRoller(amount) {
        if (amount >= 1000 && !this.achievements.highRoller.unlocked) {
            this.unlockAchievement('highRoller');
        }
    }
    
    checkSurvivor(data) {
        if (data.winnerCount < 10 && !this.achievements.survivor.unlocked) {
            this.unlockAchievement('survivor');
        }
    }
    
    checkEarlyBird(timeRemaining) {
        if (timeRemaining > 110 && !this.achievements.earlyBird.unlocked) {
            this.unlockAchievement('earlyBird');
        }
    }
    
    checkComeback() {
        if (this.losses >= 3 && !this.achievements.comeback.unlocked) {
            this.unlockAchievement('comeback');
        }
    }
    
    checkWinType(type) {
        this.winsBy[type] = (this.winsBy[type] || 0) + 1;
        
        if (this.winsBy.rock > 0 && this.winsBy.paper > 0 && this.winsBy.scissors > 0 && !this.achievements.allThree.unlocked) {
            this.unlockAchievement('allThree');
        }
    }
    
    checkWealth(coins) {
        if (coins >= 10000 && !this.achievements.richPlayer.unlocked) {
            this.unlockAchievement('richPlayer');
        }
    }
    
    checkDedicated(streak) {
        if (streak >= 7 && !this.achievements.dedicated.unlocked) {
            this.unlockAchievement('dedicated');
        }
    }
    
    checkSocial(referrals) {
        if (referrals >= 3 && !this.achievements.social.unlocked) {
            this.unlockAchievement('social');
        }
    }
    
    unlockAchievement(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || achievement.unlocked) return;
        
        achievement.unlocked = true;
        this.unlockedAchievements.push(achievementId);
        
        // Award coins
        if (window.uiController) {
            window.uiController.userCoins += achievement.reward;
            window.uiController.updateCoins();
        }
        
        // Show notification
        this.showAchievementNotification(achievement);
        
        // Save progress
        this.saveAchievements();
        this.updateAchievementCount();
        
        // Play sound effect
        this.playAchievementSound();
    }
    
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-unlocked';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-text">
                    <div class="achievement-title">Achievement Unlocked!</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-reward">+${achievement.reward} coins</div>
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 1.5rem 2rem;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            margin-bottom: 1rem;
            animation: slideInTop 0.5s ease-out, slideOutTop 0.5s ease-out 3s forwards;
            pointer-events: all;
            cursor: pointer;
        `;
        
        const container = document.querySelector('.achievement-notifications');
        container.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => notification.remove(), 4000);
        
        // Click to dismiss
        notification.addEventListener('click', () => notification.remove());
    }
    
    showAchievementModal() {
        const modal = document.createElement('div');
        modal.className = 'achievement-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
        `;
        
        const unlockedCount = this.unlockedAchievements.length;
        const totalCount = Object.keys(this.achievements).length;
        
        modal.innerHTML = `
            <div class="achievement-modal-content" style="background: #1a1a2e; padding: 2rem; border-radius: 20px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h2 style="text-align: center; margin-bottom: 1rem;">Achievements (${unlockedCount}/${totalCount})</h2>
                <div class="achievement-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                    ${Object.values(this.achievements).map(a => `
                        <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}" style="
                            background: ${a.unlocked ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
                            border: 2px solid ${a.unlocked ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'};
                            padding: 1rem;
                            border-radius: 10px;
                            opacity: ${a.unlocked ? '1' : '0.5'};
                        ">
                            <div style="font-size: 2rem; text-align: center;">${a.icon}</div>
                            <h3 style="font-size: 1rem; margin: 0.5rem 0;">${a.name}</h3>
                            <p style="font-size: 0.8rem; color: #9ca3af; margin: 0.5rem 0;">${a.description}</p>
                            <div style="font-weight: bold; color: #f59e0b;">+${a.reward} coins</div>
                        </div>
                    `).join('')}
                </div>
                <button class="close-modal" style="margin-top: 2rem; width: 100%; padding: 1rem; background: #6366f1; color: white; border: none; border-radius: 10px; cursor: pointer;">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    updateAchievementCount() {
        const count = this.unlockedAchievements.length;
        const countEl = document.querySelector('.achievement-count');
        if (countEl) {
            countEl.textContent = count;
        }
    }
    
    playAchievementSound() {
        // Create a simple achievement sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator for achievement sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }
    
    loadAchievements() {
        const saved = localStorage.getItem('rpsAchievements');
        if (saved) {
            const data = JSON.parse(saved);
            // Restore unlocked state
            data.forEach(id => {
                if (this.achievements[id]) {
                    this.achievements[id].unlocked = true;
                }
            });
            return data;
        }
        return [];
    }
    
    saveAchievements() {
        localStorage.setItem('rpsAchievements', JSON.stringify(this.unlockedAchievements));
    }
}

// Export
window.AchievementSystem = AchievementSystem;