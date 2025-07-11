// UI Controller for RPS Battle Arena

class UIController {
    constructor() {
        this.selectedPrediction = null;
        this.betAmount = 10;
        this.userCoins = 1000; // Starting coins
        this.currentBet = null;
        this.roundActive = true; // Start with active round
        this.predictionHistory = [];
        
        // Leaderboard data
        this.leaderboardData = {
            daily: [],
            weekly: [],
            'all-time': []
        };
        
        // Initialize UI elements
        this.initializeElements();
        this.bindEvents();
        this.updateUI();
        
        // Load saved data
        this.loadUserData();
    }
    
    initializeElements() {
        // Prediction elements
        this.predictionButtons = document.querySelectorAll('.predict-btn');
        this.betInput = document.querySelector('.bet-input');
        this.betConfirmBtn = document.querySelector('.bet-confirm');
        this.timerCountdown = document.querySelector('.timer-countdown');
        
        // Stats elements
        this.rockCount = document.querySelector('.rock-count');
        this.paperCount = document.querySelector('.paper-count');
        this.scissorsCount = document.querySelector('.scissors-count');
        
        // User info elements
        this.coinAmount = document.querySelector('.coin-amount');
        
        // Round info
        this.roundNumber = document.querySelector('.round-number');
        this.roundTimer = document.querySelector('.round-timer');
        
        // Leaderboard
        this.leaderboardTabs = document.querySelectorAll('.tab');
        this.leaderboardList = document.querySelector('.leaderboard-list');
        
        // Chat
        this.chatMessages = document.querySelector('.chat-messages');
        this.chatInput = document.querySelector('.chat-input');
        this.chatSend = document.querySelector('.chat-send');
    }
    
    bindEvents() {
        // Prediction buttons
        this.predictionButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectPrediction(btn));
        });
        
        // Bet confirmation
        this.betConfirmBtn.addEventListener('click', () => this.placeBet());
        
        // Bet input validation
        this.betInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value > this.userCoins) {
                e.target.value = this.userCoins;
            }
            if (value < 1) {
                e.target.value = 1;
            }
            this.betAmount = parseInt(e.target.value) || 1;
        });
        
        // Leaderboard tabs
        this.leaderboardTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchLeaderboardTab(tab));
        });
        
        // Chat
        this.chatSend.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        
        // Game events
        window.addEventListener('statsUpdate', (e) => this.updateStats(e.detail));
        window.addEventListener('roundEnd', (e) => this.handleRoundEnd(e.detail));
        window.addEventListener('roundStart', (e) => this.handleRoundStart(e.detail));
    }
    
    selectPrediction(btn) {
        console.log('Selection clicked:', btn.dataset.choice, 'Round active:', this.roundActive, 'Current bet:', this.currentBet);
        
        if (!this.roundActive || this.currentBet) return;
        
        // Update UI
        this.predictionButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        this.selectedPrediction = btn.dataset.choice;
        console.log('Selected prediction:', this.selectedPrediction);
        
        // Update odds based on current distribution
        this.updateOdds();
        
        // Visual feedback
        this.showNotification(`Selected: ${this.selectedPrediction}`, 'info');
    }
    
    placeBet() {
        if (!this.selectedPrediction || !this.roundActive || this.currentBet) {
            this.showNotification('Please select a prediction first!', 'error');
            return;
        }
        
        if (this.betAmount > this.userCoins) {
            this.showNotification('Insufficient coins!', 'error');
            return;
        }
        
        // Place the bet
        this.currentBet = {
            prediction: this.selectedPrediction,
            amount: this.betAmount,
            odds: this.getOdds(this.selectedPrediction)
        };
        
        // Deduct coins
        this.userCoins -= this.betAmount;
        this.updateCoins();
        
        // Disable betting
        this.betConfirmBtn.disabled = true;
        this.betConfirmBtn.textContent = 'Bet Placed!';
        
        // Add to chat
        this.addSystemMessage(`You bet ${this.betAmount} coins on ${this.selectedPrediction}!`);
        
        // Check achievements
        if (window.achievementSystem) {
            window.achievementSystem.checkAchievements('bet_placed', {
                amount: this.betAmount,
                timeRemaining: window.battleArena ? window.battleArena.roundTime : 0
            });
        }
        
        // Save state
        this.saveUserData();
    }
    
    updateStats(stats) {
        this.rockCount.textContent = stats.rock;
        this.paperCount.textContent = stats.paper;
        this.scissorsCount.textContent = stats.scissors;
        
        // Update odds based on current distribution
        this.updateOdds();
    }
    
    updateOdds() {
        const total = 300;
        const counts = {
            rock: parseInt(this.rockCount.textContent) || 100,
            paper: parseInt(this.paperCount.textContent) || 100,
            scissors: parseInt(this.scissorsCount.textContent) || 100
        };
        
        // Calculate simple odds (inverse of probability)
        this.predictionButtons.forEach(btn => {
            const choice = btn.dataset.choice;
            const probability = counts[choice] / total;
            const odds = (1 / probability).toFixed(1);
            btn.querySelector('.odds').textContent = `${odds}x`;
        });
    }
    
    getOdds(choice) {
        const btn = Array.from(this.predictionButtons).find(b => b.dataset.choice === choice);
        return parseFloat(btn.querySelector('.odds').textContent);
    }
    
    handleRoundEnd(detail) {
        this.roundActive = false;
        
        // Check if user won
        if (this.currentBet && this.currentBet.prediction === detail.winner) {
            const winnings = Math.floor(this.currentBet.amount * this.currentBet.odds);
            this.userCoins += winnings;
            this.updateCoins();
            
            this.showNotification(`You won ${winnings} coins!`, 'success');
            this.addSystemMessage(`${detail.winner} won the round! You earned ${winnings} coins!`);
            
            // Update stats
            this.predictionHistory.push({
                round: detail.round,
                bet: this.currentBet,
                won: true,
                winnings: winnings
            });
            
            // Check achievements
            if (window.achievementSystem) {
                window.achievementSystem.checkAchievements('bet_won', {
                    prediction: this.currentBet.prediction,
                    winnerCount: detail.stats[detail.winner]
                });
                window.achievementSystem.checkAchievements('coins_updated', {
                    coins: this.userCoins
                });
            }
        } else if (this.currentBet) {
            this.showNotification(`${detail.winner} won. Better luck next time!`, 'info');
            this.addSystemMessage(`${detail.winner} won the round.`);
            
            this.predictionHistory.push({
                round: detail.round,
                bet: this.currentBet,
                won: false,
                winnings: 0
            });
            
            // Check achievements
            if (window.achievementSystem) {
                window.achievementSystem.checkAchievements('bet_lost', {});
            }
        }
        
        // Reset betting UI
        this.currentBet = null;
        this.selectedPrediction = null;
        this.predictionButtons.forEach(b => b.classList.remove('selected'));
        this.betConfirmBtn.disabled = false;
        this.betConfirmBtn.textContent = 'Place Bet';
        
        // Update leaderboard
        this.updateLeaderboard();
        
        // Save state
        this.saveUserData();
        
        // Start countdown for next round
        this.startCountdown();
    }
    
    handleRoundStart(detail) {
        this.roundActive = true;
        this.roundNumber.textContent = `Round ${detail.round}`;
        this.updateRoundTimer();
    }
    
    startCountdown() {
        let countdown = 5;
        this.timerCountdown.textContent = countdown;
        
        const interval = setInterval(() => {
            countdown--;
            this.timerCountdown.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(interval);
                this.timerCountdown.textContent = '30';
            }
        }, 1000);
    }
    
    updateRoundTimer() {
        const updateTimer = () => {
            if (!window.battleArena) return;
            
            const minutes = Math.floor(window.battleArena.roundTime / 60);
            const seconds = Math.floor(window.battleArena.roundTime % 60);
            this.roundTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (window.battleArena.roundTime > 0 && !window.battleArena.isPaused) {
                requestAnimationFrame(updateTimer);
            }
        };
        
        updateTimer();
    }
    
    updateCoins() {
        this.coinAmount.textContent = this.userCoins.toLocaleString();
        
        // Animate coin change
        this.coinAmount.classList.add('coin-update');
        setTimeout(() => this.coinAmount.classList.remove('coin-update'), 500);
    }
    
    updateLeaderboard() {
        // Simulate leaderboard data (would come from backend)
        const currentPeriod = document.querySelector('.tab.active').dataset.period;
        
        // Add current player to leaderboard
        const playerScore = this.predictionHistory
            .filter(h => h.won)
            .reduce((sum, h) => sum + h.winnings, 0);
        
        // Update display
        this.displayLeaderboard(currentPeriod);
    }
    
    switchLeaderboardTab(tab) {
        this.leaderboardTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.displayLeaderboard(tab.dataset.period);
    }
    
    displayLeaderboard(period) {
        // Simulate leaderboard data
        const mockData = [
            { name: 'ProGamer123', score: 45320 },
            { name: 'RPSMaster', score: 38900 },
            { name: 'LuckyStreak', score: 32100 },
            { name: 'BattleKing', score: 28500 },
            { name: 'You', score: this.userCoins }
        ].sort((a, b) => b.score - a.score);
        
        this.leaderboardList.innerHTML = mockData.map((player, index) => `
            <div class="leaderboard-item ${player.name === 'You' ? 'current-player' : ''}">
                <span class="rank">${index + 1}</span>
                <span class="player-name">${player.name}</span>
                <span class="score">${player.score.toLocaleString()}</span>
            </div>
        `).join('');
    }
    
    sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        this.addChatMessage('You', message);
        this.chatInput.value = '';
        
        // Simulate other players chatting
        if (Math.random() < 0.3) {
            setTimeout(() => {
                const responses = [
                    'Good luck everyone!',
                    'Rock is looking strong!',
                    'Paper FTW!',
                    'This is intense!',
                    'GG!'
                ];
                const randomUser = `Player${Math.floor(Math.random() * 999)}`;
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                this.addChatMessage(randomUser, randomResponse);
            }, 2000 + Math.random() * 3000);
        }
    }
    
    addChatMessage(user, text) {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        messageEl.innerHTML = `
            <span class="chat-user">${user}:</span>
            <span class="chat-text">${text}</span>
        `;
        
        this.chatMessages.appendChild(messageEl);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Limit messages
        while (this.chatMessages.children.length > 50) {
            this.chatMessages.removeChild(this.chatMessages.firstChild);
        }
    }
    
    addSystemMessage(text) {
        this.addChatMessage('System', text);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
            color: white;
            border-radius: 10px;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    loadUserData() {
        const savedData = localStorage.getItem('rpsUserData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.userCoins = data.coins || 1000;
            this.predictionHistory = data.history || [];
            this.updateCoins();
        }
    }
    
    saveUserData() {
        const data = {
            coins: this.userCoins,
            history: this.predictionHistory.slice(-100) // Keep last 100 predictions
        };
        localStorage.setItem('rpsUserData', JSON.stringify(data));
    }
    
    updateUI() {
        this.updateCoins();
        this.displayLeaderboard('daily');
        
        // Add welcome message
        this.addSystemMessage('Welcome to RPS Battle Arena! Place your bets and watch the chaos unfold!');
        
        // Start round timer
        this.updateRoundTimer();
        
        // Initialize countdown
        this.timerCountdown.textContent = '30';
    }
}

// Export
window.UIController = UIController;