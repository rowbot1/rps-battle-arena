// Daily Rewards System for RPS Battle Arena

class DailyRewardSystem {
    constructor() {
        this.rewards = [
            { day: 1, coins: 100, bonus: null },
            { day: 2, coins: 200, bonus: null },
            { day: 3, coins: 300, bonus: '2x multiplier for 1 hour' },
            { day: 4, coins: 500, bonus: null },
            { day: 5, coins: 750, bonus: '3 power-ups' },
            { day: 6, coins: 1000, bonus: null },
            { day: 7, coins: 2000, bonus: '1 day premium trial' }
        ];
        
        this.spinWheelPrizes = [
            { value: 50, weight: 30, color: '#6366f1' },
            { value: 100, weight: 25, color: '#8b5cf6' },
            { value: 200, weight: 20, color: '#a855f7' },
            { value: 500, weight: 15, color: '#c026d3' },
            { value: 1000, weight: 8, color: '#e11d48' },
            { value: 5000, weight: 2, color: '#f59e0b' }
        ];
        
        this.loadProgress();
        this.initializeUI();
        this.checkDailyReward();
    }
    
    initializeUI() {
        // Add daily reward button
        const dailyBtn = document.createElement('button');
        dailyBtn.className = 'daily-reward-btn';
        dailyBtn.innerHTML = '🎁 Daily Reward';
        dailyBtn.style.cssText = `
            position: fixed;
            top: 20px;
            left: 200px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 25px;
            font-weight: 700;
            cursor: pointer;
            z-index: 100;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
            animation: ${this.canClaimDaily() ? 'pulse 2s infinite' : 'none'};
        `;
        
        document.body.appendChild(dailyBtn);
        
        dailyBtn.addEventListener('click', () => this.showDailyRewardModal());
        
        // Add spin wheel button
        const spinBtn = document.createElement('button');
        spinBtn.className = 'spin-wheel-btn';
        spinBtn.innerHTML = '🎯 Lucky Spin';
        spinBtn.style.cssText = `
            position: fixed;
            top: 70px;
            left: 200px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 25px;
            font-weight: 700;
            cursor: pointer;
            z-index: 100;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
            ${!this.canSpin() ? 'opacity: 0.5; cursor: not-allowed;' : ''}
        `;
        
        document.body.appendChild(spinBtn);
        
        spinBtn.addEventListener('click', () => {
            if (this.canSpin()) this.showSpinWheel();
        });
        
        // Update button states
        this.updateButtonStates();
    }
    
    showDailyRewardModal() {
        const modal = document.createElement('div');
        modal.className = 'daily-reward-modal';
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
        
        const canClaim = this.canClaimDaily();
        const nextReward = this.rewards[this.currentStreak % 7];
        const timeUntilNext = this.getTimeUntilNextReward();
        
        modal.innerHTML = `
            <div style="background: #1a1a2e; padding: 2rem; border-radius: 20px; max-width: 500px; text-align: center;">
                <h2 style="margin-bottom: 1rem;">Daily Rewards</h2>
                <p style="color: #9ca3af; margin-bottom: 2rem;">Login every day to earn bigger rewards!</p>
                
                <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem; justify-content: center;">
                    ${this.rewards.map((reward, index) => `
                        <div style="
                            background: ${index < this.currentStreak % 7 ? '#10b981' : index === this.currentStreak % 7 && canClaim ? '#f59e0b' : 'rgba(255,255,255,0.05)'};
                            padding: 1rem;
                            border-radius: 10px;
                            min-width: 60px;
                        ">
                            <div style="font-weight: bold;">Day ${reward.day}</div>
                            <div style="font-size: 0.8rem;">${reward.coins}</div>
                            ${index < this.currentStreak % 7 ? '✓' : ''}
                        </div>
                    `).join('')}
                </div>
                
                ${canClaim ? `
                    <div style="background: rgba(16, 185, 129, 0.2); padding: 2rem; border-radius: 15px; margin-bottom: 2rem;">
                        <h3>Day ${(this.currentStreak % 7) + 1} Reward</h3>
                        <div style="font-size: 2rem; margin: 1rem 0;">🪙 ${nextReward.coins} Coins</div>
                        ${nextReward.bonus ? `<div style="color: #f59e0b;">+ ${nextReward.bonus}</div>` : ''}
                    </div>
                    <button class="claim-reward" style="
                        background: #10b981;
                        color: white;
                        border: none;
                        padding: 1rem 2rem;
                        border-radius: 10px;
                        font-size: 1.2rem;
                        cursor: pointer;
                        width: 100%;
                    ">Claim Reward</button>
                ` : `
                    <div style="background: rgba(239, 68, 68, 0.2); padding: 2rem; border-radius: 15px;">
                        <h3>Already Claimed!</h3>
                        <p>Come back in ${timeUntilNext} for your next reward</p>
                        <div style="margin-top: 1rem;">Current Streak: ${this.currentStreak} days</div>
                    </div>
                `}
                
                <button class="close-modal" style="
                    margin-top: 1rem;
                    background: none;
                    color: #9ca3af;
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 0.5rem 1rem;
                    border-radius: 5px;
                    cursor: pointer;
                ">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        if (canClaim) {
            modal.querySelector('.claim-reward').addEventListener('click', () => {
                this.claimDailyReward();
                modal.remove();
            });
        }
        
        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    showSpinWheel() {
        const modal = document.createElement('div');
        modal.className = 'spin-wheel-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
        `;
        
        modal.innerHTML = `
            <div style="text-align: center;">
                <h2 style="color: white; margin-bottom: 2rem;">Lucky Spin Wheel</h2>
                <div class="wheel-container" style="position: relative; width: 300px; height: 300px; margin: 0 auto;">
                    <canvas id="wheelCanvas" width="300" height="300"></canvas>
                    <div class="wheel-pointer" style="
                        position: absolute;
                        top: -20px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 20px solid transparent;
                        border-right: 20px solid transparent;
                        border-top: 40px solid #f59e0b;
                        z-index: 10;
                    "></div>
                </div>
                <button class="spin-button" style="
                    margin-top: 2rem;
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    border: none;
                    padding: 1rem 3rem;
                    border-radius: 25px;
                    font-size: 1.2rem;
                    font-weight: bold;
                    cursor: pointer;
                ">SPIN!</button>
                <p style="color: #9ca3af; margin-top: 1rem;">Free spin resets at midnight</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Draw wheel
        const canvas = modal.querySelector('#wheelCanvas');
        const ctx = canvas.getContext('2d');
        const centerX = 150;
        const centerY = 150;
        const radius = 140;
        
        this.drawWheel(ctx, centerX, centerY, radius);
        
        // Spin button handler
        modal.querySelector('.spin-button').addEventListener('click', () => {
            this.spinWheel(canvas, ctx, centerX, centerY, radius, (prize) => {
                this.awardSpinPrize(prize);
                setTimeout(() => modal.remove(), 2000);
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    drawWheel(ctx, centerX, centerY, radius, rotation = 0) {
        ctx.clearRect(0, 0, 300, 300);
        
        let currentAngle = rotation;
        const totalWeight = this.spinWheelPrizes.reduce((sum, prize) => sum + prize.weight, 0);
        
        this.spinWheelPrizes.forEach((prize, index) => {
            const sliceAngle = (prize.weight / totalWeight) * Math.PI * 2;
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = prize.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(currentAngle + sliceAngle / 2);
            ctx.textAlign = 'center';
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(prize.value, radius / 2, 0);
            ctx.restore();
            
            currentAngle += sliceAngle;
        });
    }
    
    spinWheel(canvas, ctx, centerX, centerY, radius, callback) {
        const spinBtn = canvas.parentElement.querySelector('.spin-button');
        spinBtn.disabled = true;
        
        let rotation = 0;
        const targetRotation = Math.random() * Math.PI * 2 + Math.PI * 8; // At least 4 full rotations
        let speed = 0.3;
        const deceleration = 0.995;
        
        const animate = () => {
            rotation += speed;
            speed *= deceleration;
            
            this.drawWheel(ctx, centerX, centerY, radius, rotation);
            
            if (speed > 0.001) {
                requestAnimationFrame(animate);
            } else {
                // Determine winning prize
                const normalizedRotation = rotation % (Math.PI * 2);
                const prize = this.getPrizeFromRotation(normalizedRotation);
                callback(prize);
            }
        };
        
        animate();
    }
    
    getPrizeFromRotation(rotation) {
        const totalWeight = this.spinWheelPrizes.reduce((sum, prize) => sum + prize.weight, 0);
        let currentAngle = 0;
        
        // Adjust for pointer at top
        const adjustedRotation = (Math.PI * 2 - rotation + Math.PI / 2) % (Math.PI * 2);
        
        for (const prize of this.spinWheelPrizes) {
            const sliceAngle = (prize.weight / totalWeight) * Math.PI * 2;
            if (adjustedRotation >= currentAngle && adjustedRotation < currentAngle + sliceAngle) {
                return prize;
            }
            currentAngle += sliceAngle;
        }
        
        return this.spinWheelPrizes[0];
    }
    
    awardSpinPrize(prize) {
        // Award coins
        window.uiController.userCoins += prize.value;
        window.uiController.updateCoins();
        
        // Show notification
        window.uiController.showNotification(`You won ${prize.value} coins!`, 'success');
        
        // Mark spin as used
        this.lastSpin = new Date().toDateString();
        this.saveProgress();
        this.updateButtonStates();
        
        // Confetti effect
        this.createConfetti();
    }
    
    createConfetti() {
        const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%;
                top: -10px;
                transform: rotate(${Math.random() * 360}deg);
                animation: confettiFall 3s ease-out forwards;
                z-index: 4000;
            `;
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }
    }
    
    canClaimDaily() {
        const today = new Date().toDateString();
        return this.lastClaim !== today;
    }
    
    canSpin() {
        const today = new Date().toDateString();
        return this.lastSpin !== today;
    }
    
    claimDailyReward() {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        // Check if streak continues
        if (this.lastClaim !== yesterday && this.lastClaim !== today) {
            this.currentStreak = 0;
        }
        
        const reward = this.rewards[this.currentStreak % 7];
        
        // Award coins
        window.uiController.userCoins += reward.coins;
        window.uiController.updateCoins();
        
        // Show notification
        window.uiController.showNotification(`Daily reward: ${reward.coins} coins!`, 'success');
        
        // Apply bonus if any
        if (reward.bonus) {
            this.applyBonus(reward.bonus);
        }
        
        // Update streak
        this.currentStreak++;
        this.lastClaim = today;
        
        // Check achievement
        if (window.achievementSystem) {
            window.achievementSystem.checkAchievements('daily_login', { streak: this.currentStreak });
        }
        
        this.saveProgress();
        this.updateButtonStates();
    }
    
    applyBonus(bonus) {
        // Handle different bonus types
        if (bonus.includes('multiplier')) {
            window.uiController.showNotification(`Bonus activated: ${bonus}`, 'success');
            // Implement multiplier logic
        } else if (bonus.includes('power-ups')) {
            window.uiController.showNotification(`Received: ${bonus}`, 'success');
            // Implement power-up logic
        } else if (bonus.includes('premium')) {
            window.uiController.showNotification(`Premium trial activated!`, 'success');
            // Implement premium trial
        }
    }
    
    getTimeUntilNextReward() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const diff = tomorrow - now;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        
        return `${hours}h ${minutes}m`;
    }
    
    updateButtonStates() {
        const dailyBtn = document.querySelector('.daily-reward-btn');
        const spinBtn = document.querySelector('.spin-wheel-btn');
        
        if (dailyBtn) {
            if (this.canClaimDaily()) {
                dailyBtn.style.animation = 'pulse 2s infinite';
            } else {
                dailyBtn.style.animation = 'none';
            }
        }
        
        if (spinBtn) {
            if (this.canSpin()) {
                spinBtn.style.opacity = '1';
                spinBtn.style.cursor = 'pointer';
            } else {
                spinBtn.style.opacity = '0.5';
                spinBtn.style.cursor = 'not-allowed';
            }
        }
    }
    
    checkDailyReward() {
        if (this.canClaimDaily()) {
            // Auto-show modal for returning players
            setTimeout(() => {
                if (this.currentStreak > 0) {
                    this.showDailyRewardModal();
                }
            }, 2000);
        }
    }
    
    loadProgress() {
        const saved = localStorage.getItem('rpsDailyProgress');
        if (saved) {
            const data = JSON.parse(saved);
            this.currentStreak = data.streak || 0;
            this.lastClaim = data.lastClaim || null;
            this.lastSpin = data.lastSpin || null;
        } else {
            this.currentStreak = 0;
            this.lastClaim = null;
            this.lastSpin = null;
        }
    }
    
    saveProgress() {
        const data = {
            streak: this.currentStreak,
            lastClaim: this.lastClaim,
            lastSpin: this.lastSpin
        };
        localStorage.setItem('rpsDailyProgress', JSON.stringify(data));
    }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent += `
    @keyframes pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
        50% { transform: scale(1.05); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5); }
    }
    
    @keyframes confettiFall {
        to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
    
    @keyframes slideInTop {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes slideOutTop {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Export
window.DailyRewardSystem = DailyRewardSystem;