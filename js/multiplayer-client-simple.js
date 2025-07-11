// Simplified Multiplayer Client for RPS Arena

class MultiplayerClient {
    constructor() {
        console.log('Initializing RPS Arena...');
        
        this.currentScreen = 'mainMenu';
        this.playerData = {
            name: 'Guest Player',
            level: 1,
            coins: 1000,
            gems: 100,
            wins: 0,
            losses: 0
        };
        
        this.battleState = {
            active: false,
            playerChoice: null,
            opponentChoice: null,
            round: 1,
            playerScore: 0,
            opponentScore: 0
        };
        
        this.initializeUI();
    }
    
    initializeUI() {
        console.log('Setting up UI...');
        
        // Update currency display
        this.updateCurrency();
        
        // Game mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                console.log('Selected mode:', mode);
                this.startMatchmaking(mode);
            });
        });
        
        // Menu buttons
        document.querySelector('.shop-btn')?.addEventListener('click', () => {
            alert('Shop Coming Soon!\n\n💎 Gem Packages:\n• 500 gems - $4.99\n• 1200 gems - $9.99\n• 2500 gems - $19.99');
        });
        
        document.querySelector('.battlepass-btn')?.addEventListener('click', () => {
            alert('Battle Pass - Season 1\n\n🎁 100 Tiers of Rewards!\n⚡ XP Boosts\n🎨 Exclusive Skins\n💎 2,500 Gems Value\n\nOnly $9.99!');
        });
        
        document.querySelector('.leaderboard-btn')?.addEventListener('click', () => {
            alert('Leaderboard\n\n🥇 ProGamer123 - 45,320\n🥈 RPSMaster - 38,900\n🥉 LuckyStreak - 32,100\n\n📍 Your Rank: #8,745');
        });
        
        console.log('UI initialized!');
    }
    
    startMatchmaking(mode) {
        console.log('Starting matchmaking for:', mode);
        
        // Show matchmaking screen
        this.showScreen('matchmaking');
        
        // Update search time
        let searchTime = 0;
        const searchInterval = setInterval(() => {
            searchTime++;
            const display = `${Math.floor(searchTime / 60)}:${(searchTime % 60).toString().padStart(2, '0')}`;
            const searchTimeEl = document.getElementById('searchTime');
            if (searchTimeEl) {
                searchTimeEl.textContent = display;
            }
        }, 1000);
        
        // Simulate finding a match
        const matchTime = 2000 + Math.random() * 3000; // 2-5 seconds
        setTimeout(() => {
            clearInterval(searchInterval);
            this.onMatchFound(mode);
        }, matchTime);
        
        // Cancel button
        const cancelBtn = document.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                clearInterval(searchInterval);
                this.showScreen('mainMenu');
            };
        }
    }
    
    onMatchFound(mode) {
        console.log('Match found!');
        
        // Generate opponent
        const opponents = ['RockLord', 'PaperMaster', 'ScissorNinja', 'NoobSlayer', 'ProGamer'];
        const opponentName = opponents[Math.floor(Math.random() * opponents.length)] + Math.floor(Math.random() * 999);
        
        // Update battle UI
        document.querySelector('.opponent-name').textContent = opponentName;
        document.querySelector('.player-name').textContent = this.playerData.name;
        
        // Reset battle state
        this.battleState = {
            active: true,
            mode: mode,
            rounds: mode === 'quick' ? 3 : 5,
            round: 1,
            playerScore: 0,
            opponentScore: 0,
            playerChoice: null,
            opponentChoice: null
        };
        
        // Update round display
        document.getElementById('currentRound').textContent = '1';
        document.getElementById('totalRounds').textContent = this.battleState.rounds;
        
        // Show battle screen
        this.showScreen('battle');
        
        // Set up choice buttons
        this.setupBattle();
        
        // Start round
        this.startRound();
    }
    
    setupBattle() {
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.onclick = (e) => {
                if (!this.battleState.active || this.battleState.playerChoice) return;
                
                const choice = e.currentTarget.dataset.choice;
                this.makeChoice(choice);
            };
        });
        
        // Emote buttons
        document.querySelectorAll('.emote-btn').forEach(btn => {
            btn.onclick = () => {
                console.log('Emote sent!');
            };
        });
    }
    
    startRound() {
        console.log('Starting round', this.battleState.round);
        
        // Reset choices
        this.battleState.playerChoice = null;
        this.battleState.opponentChoice = null;
        
        // Reset UI
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected', 'disabled');
        });
        
        document.querySelector('.player-choice .choice-icon').textContent = '?';
        document.querySelector('.opponent-choice .choice-icon').textContent = '?';
        document.querySelector('.player-choice').classList.remove('revealed');
        document.querySelector('.opponent-choice').classList.remove('revealed');
        
        // Start countdown
        let timeLeft = 10;
        const timerEl = document.querySelector('.timer-text');
        
        const countdown = setInterval(() => {
            if (timerEl) timerEl.textContent = timeLeft;
            timeLeft--;
            
            if (timeLeft < 0 || !this.battleState.active) {
                clearInterval(countdown);
                if (!this.battleState.playerChoice && this.battleState.active) {
                    // Auto-select random choice
                    const choices = ['rock', 'paper', 'scissors'];
                    this.makeChoice(choices[Math.floor(Math.random() * 3)]);
                }
            }
        }, 1000);
    }
    
    makeChoice(choice) {
        if (this.battleState.playerChoice) return;
        
        console.log('Player chose:', choice);
        this.battleState.playerChoice = choice;
        
        // Update UI
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.choice === choice) {
                btn.classList.add('selected');
            }
        });
        
        // Simulate opponent choice after delay
        setTimeout(() => {
            const choices = ['rock', 'paper', 'scissors'];
            this.battleState.opponentChoice = choices[Math.floor(Math.random() * 3)];
            this.revealChoices();
        }, 1000 + Math.random() * 1000);
    }
    
    revealChoices() {
        const emojis = {
            rock: '🪨',
            paper: '📄',
            scissors: '✂️'
        };
        
        // Show player choice
        const playerEl = document.querySelector('.player-choice');
        playerEl.classList.add('revealed');
        playerEl.querySelector('.choice-icon').textContent = emojis[this.battleState.playerChoice];
        
        // Show opponent choice after delay
        setTimeout(() => {
            const opponentEl = document.querySelector('.opponent-choice');
            opponentEl.classList.add('revealed');
            opponentEl.querySelector('.choice-icon').textContent = emojis[this.battleState.opponentChoice];
            
            // Calculate result
            setTimeout(() => {
                this.calculateResult();
            }, 500);
        }, 500);
    }
    
    calculateResult() {
        const { playerChoice, opponentChoice } = this.battleState;
        let result = 'draw';
        
        if (playerChoice === opponentChoice) {
            result = 'draw';
        } else if (
            (playerChoice === 'rock' && opponentChoice === 'scissors') ||
            (playerChoice === 'paper' && opponentChoice === 'rock') ||
            (playerChoice === 'scissors' && opponentChoice === 'paper')
        ) {
            result = 'win';
            this.battleState.playerScore++;
        } else {
            result = 'lose';
            this.battleState.opponentScore++;
        }
        
        // Update scores
        document.querySelector('.player-score').textContent = this.battleState.playerScore;
        document.querySelector('.opponent-score').textContent = this.battleState.opponentScore;
        
        // Show result text
        const resultEl = document.querySelector('.result-text');
        resultEl.className = 'result-text ' + result;
        resultEl.textContent = result === 'win' ? 'WIN!' : result === 'lose' ? 'LOSE' : 'DRAW';
        resultEl.classList.remove('hidden');
        
        // Hide result after delay
        setTimeout(() => {
            resultEl.classList.add('hidden');
            
            // Check if match is over
            const maxScore = Math.ceil(this.battleState.rounds / 2);
            if (this.battleState.playerScore >= maxScore || 
                this.battleState.opponentScore >= maxScore ||
                this.battleState.round >= this.battleState.rounds) {
                this.endMatch();
            } else {
                // Next round
                this.battleState.round++;
                document.getElementById('currentRound').textContent = this.battleState.round;
                this.startRound();
            }
        }, 2000);
    }
    
    endMatch() {
        this.battleState.active = false;
        const won = this.battleState.playerScore > this.battleState.opponentScore;
        
        // Update stats
        if (won) {
            this.playerData.wins++;
            this.playerData.coins += 50;
            this.playerData.gems += 10;
        } else {
            this.playerData.losses++;
            this.playerData.coins += 10;
        }
        
        // Save data
        this.updateCurrency();
        
        // Show result screen
        document.querySelector('.result-title').textContent = won ? 'VICTORY!' : 'DEFEAT';
        document.querySelector('.result-title').className = won ? 'result-title' : 'result-title defeat';
        
        // Update result stats
        document.querySelector('.result-screen .stat-value').textContent = 
            `${this.battleState.playerScore} - ${this.battleState.opponentScore}`;
        
        this.showScreen('result');
        
        // Result buttons
        document.querySelector('.play-again-btn').onclick = () => {
            this.showScreen('mainMenu');
            this.startMatchmaking(this.battleState.mode);
        };
        
        document.querySelector('.main-menu-btn').onclick = () => {
            this.showScreen('mainMenu');
        };
    }
    
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.main-menu, .battle-screen, .matchmaking-screen, .result-screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Show requested screen
        switch(screenName) {
            case 'mainMenu':
                document.querySelector('.main-menu').classList.remove('hidden');
                break;
            case 'battle':
                document.querySelector('.battle-screen').classList.remove('hidden');
                break;
            case 'matchmaking':
                document.querySelector('.matchmaking-screen').classList.remove('hidden');
                break;
            case 'result':
                document.querySelector('.result-screen').classList.remove('hidden');
                break;
        }
    }
    
    updateCurrency() {
        document.getElementById('coinsAmount').textContent = this.playerData.coins.toLocaleString();
        document.getElementById('gemsAmount').textContent = this.playerData.gems.toLocaleString();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, starting game...');
    window.gameClient = new MultiplayerClient();
    console.log('Game ready!');
});