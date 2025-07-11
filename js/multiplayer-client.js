// Multiplayer Client for RPS Arena

class MultiplayerClient {
    constructor() {
        this.socket = null;
        this.currentRoom = null;
        this.playerData = {
            id: null,
            name: 'Guest Player',
            level: 1,
            rank: 'Bronze III',
            wins: 0,
            losses: 0,
            coins: 1000,
            gems: 100,
            currentStreak: 0
        };
        this.battleState = {
            round: 1,
            totalRounds: 3,
            playerScore: 0,
            opponentScore: 0,
            timeLeft: 10,
            playerChoice: null,
            opponentChoice: null,
            roundActive: false
        };
        
        this.initializeUI();
        this.loadPlayerData();
        this.setupEventListeners();
        
        // For demo purposes, we'll simulate server responses
        this.simulateServer = true;
    }
    
    initializeUI() {
        this.screens = {
            mainMenu: document.getElementById('mainMenu'),
            battleScreen: document.getElementById('battleScreen'),
            matchmakingScreen: document.getElementById('matchmakingScreen'),
            resultScreen: document.getElementById('resultScreen')
        };
        
        this.updatePlayerInfo();
        this.updateCurrency();
    }
    
    setupEventListeners() {
        // Game mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.startMatchmaking(mode);
            });
        });
        
        // Choice buttons
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const choice = e.currentTarget.dataset.choice;
                this.makeChoice(choice);
            });
        });
        
        // Emote buttons
        document.querySelectorAll('.emote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emote = e.currentTarget.dataset.emote;
                this.sendEmote(emote);
            });
        });
        
        // Cancel matchmaking
        document.querySelector('.cancel-btn').addEventListener('click', () => {
            this.cancelMatchmaking();
        });
        
        // Result screen buttons
        document.querySelector('.play-again-btn').addEventListener('click', () => {
            this.playAgain();
        });
        
        document.querySelector('.main-menu-btn').addEventListener('click', () => {
            this.returnToMenu();
        });
        
        // Shop button
        document.querySelector('.add-gems').addEventListener('click', () => {
            this.openShop();
        });
    }
    
    connectToServer() {
        if (this.simulateServer) {
            console.log('Running in demo mode - simulating server');
            return;
        }
        
        // Real WebSocket connection
        this.socket = io('http://localhost:3000');
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('playerJoin', this.playerData);
        });
        
        this.socket.on('matchFound', (data) => {
            this.onMatchFound(data);
        });
        
        this.socket.on('roundStart', (data) => {
            this.onRoundStart(data);
        });
        
        this.socket.on('opponentChoice', (data) => {
            this.onOpponentChoice(data);
        });
        
        this.socket.on('roundResult', (data) => {
            this.onRoundResult(data);
        });
        
        this.socket.on('matchEnd', (data) => {
            this.onMatchEnd(data);
        });
    }
    
    startMatchmaking(mode) {
        this.currentMode = mode;
        this.showScreen('matchmaking');
        
        // Start search timer
        let searchTime = 0;
        this.searchInterval = setInterval(() => {
            searchTime++;
            const minutes = Math.floor(searchTime / 60);
            const seconds = searchTime % 60;
            document.getElementById('searchTime').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        
        // Simulate finding a match after 2-5 seconds
        if (this.simulateServer) {
            setTimeout(() => {
                this.onMatchFound({
                    opponent: {
                        name: `Player${Math.floor(Math.random() * 9999)}`,
                        level: Math.floor(Math.random() * 20) + 1,
                        rank: 'Bronze III',
                        avatar: 'default'
                    },
                    rounds: mode === 'quick' ? 3 : 5
                });
            }, 2000 + Math.random() * 3000);
        }
    }
    
    onMatchFound(data) {
        clearInterval(this.searchInterval);
        
        // Update battle state
        this.battleState.totalRounds = data.rounds;
        this.battleState.round = 1;
        this.battleState.playerScore = 0;
        this.battleState.opponentScore = 0;
        
        // Update UI with opponent info
        document.querySelector('.opponent-name').textContent = data.opponent.name;
        document.querySelector('.opponent-rank').textContent = data.opponent.rank;
        
        // Show battle screen
        this.showScreen('battle');
        
        // Start first round
        setTimeout(() => {
            this.startRound();
        }, 1000);
    }
    
    startRound() {
        this.battleState.roundActive = true;
        this.battleState.playerChoice = null;
        this.battleState.opponentChoice = null;
        this.battleState.timeLeft = 10;
        
        // Reset UI
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected', 'disabled');
        });
        
        document.querySelector('.player-choice .choice-icon').textContent = '?';
        document.querySelector('.opponent-choice .choice-icon').textContent = '?';
        
        // Update round info
        document.getElementById('currentRound').textContent = this.battleState.round;
        document.getElementById('totalRounds').textContent = this.battleState.totalRounds;
        
        // Start countdown
        this.startCountdown();
    }
    
    startCountdown() {
        const updateTimer = () => {
            if (this.battleState.timeLeft <= 0) {
                // Time's up - make random choice if player hasn't chosen
                if (!this.battleState.playerChoice) {
                    const choices = ['rock', 'paper', 'scissors'];
                    this.makeChoice(choices[Math.floor(Math.random() * 3)]);
                }
                return;
            }
            
            document.querySelector('.timer-text').textContent = this.battleState.timeLeft;
            this.battleState.timeLeft--;
            
            if (this.battleState.roundActive) {
                setTimeout(updateTimer, 1000);
            }
        };
        
        updateTimer();
    }
    
    makeChoice(choice) {
        if (!this.battleState.roundActive || this.battleState.playerChoice) return;
        
        this.battleState.playerChoice = choice;
        
        // Update UI
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.choice === choice) {
                btn.classList.add('selected');
            }
        });
        
        // Send choice to server (or simulate)
        if (this.simulateServer) {
            // Simulate opponent choice after a delay
            setTimeout(() => {
                const choices = ['rock', 'paper', 'scissors'];
                const opponentChoice = choices[Math.floor(Math.random() * 3)];
                this.onOpponentChoice({ choice: opponentChoice });
            }, 1000 + Math.random() * 2000);
        } else {
            this.socket.emit('makeChoice', { choice });
        }
    }
    
    onOpponentChoice(data) {
        this.battleState.opponentChoice = data.choice;
        
        // Both players have chosen - reveal choices
        this.revealChoices();
    }
    
    revealChoices() {
        this.battleState.roundActive = false;
        
        const emojis = {
            rock: '🪨',
            paper: '📄',
            scissors: '✂️'
        };
        
        // Reveal player choice
        const playerChoiceEl = document.querySelector('.player-choice');
        playerChoiceEl.classList.add('revealed');
        playerChoiceEl.querySelector('.choice-icon').textContent = 
            emojis[this.battleState.playerChoice];
        
        // Reveal opponent choice
        setTimeout(() => {
            const opponentChoiceEl = document.querySelector('.opponent-choice');
            opponentChoiceEl.classList.add('revealed');
            opponentChoiceEl.querySelector('.choice-icon').textContent = 
                emojis[this.battleState.opponentChoice];
            
            // Calculate result
            setTimeout(() => {
                this.calculateRoundResult();
            }, 500);
        }, 500);
    }
    
    calculateRoundResult() {
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
        
        // Show result
        this.showRoundResult(result);
        
        // Update score
        document.querySelector('.player-score').textContent = this.battleState.playerScore;
        document.querySelector('.opponent-score').textContent = this.battleState.opponentScore;
        
        // Check if match is over
        const maxScore = Math.ceil(this.battleState.totalRounds / 2);
        if (this.battleState.playerScore >= maxScore || 
            this.battleState.opponentScore >= maxScore) {
            setTimeout(() => {
                this.endMatch();
            }, 2000);
        } else {
            // Start next round
            setTimeout(() => {
                this.battleState.round++;
                this.startRound();
            }, 3000);
        }
    }
    
    showRoundResult(result) {
        const resultEl = document.querySelector('.result-text');
        resultEl.className = 'result-text';
        
        if (result === 'win') {
            resultEl.textContent = 'WIN!';
            resultEl.classList.add('win');
            this.playerData.currentStreak++;
        } else if (result === 'lose') {
            resultEl.textContent = 'LOSE';
            resultEl.classList.add('lose');
            this.playerData.currentStreak = 0;
        } else {
            resultEl.textContent = 'DRAW';
            resultEl.classList.add('draw');
        }
        
        resultEl.classList.remove('hidden');
        
        // Hide after animation
        setTimeout(() => {
            resultEl.classList.add('hidden');
            document.querySelectorAll('.choice-display').forEach(el => {
                el.classList.remove('revealed');
            });
        }, 2500);
    }
    
    endMatch() {
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
        
        // Calculate XP
        const xpGained = won ? 150 : 50;
        
        // Show result screen
        const resultTitle = document.querySelector('.result-title');
        resultTitle.textContent = won ? 'VICTORY!' : 'DEFEAT';
        resultTitle.className = won ? 'result-title' : 'result-title defeat';
        
        // Update stats display
        document.querySelector('.result-stats .stat-value').textContent = 
            `${this.battleState.playerScore} - ${this.battleState.opponentScore}`;
        
        // Save data
        this.savePlayerData();
        this.updatePlayerInfo();
        this.updateCurrency();
        
        this.showScreen('result');
    }
    
    sendEmote(emote) {
        console.log('Sending emote:', emote);
        // Show emote animation above player
        // In real implementation, send to server
    }
    
    playAgain() {
        this.showScreen('mainMenu');
        this.startMatchmaking(this.currentMode);
    }
    
    returnToMenu() {
        this.showScreen('mainMenu');
    }
    
    cancelMatchmaking() {
        clearInterval(this.searchInterval);
        this.showScreen('mainMenu');
    }
    
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.add('hidden');
        });
        
        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
        }
    }
    
    updatePlayerInfo() {
        document.getElementById('playerName').textContent = this.playerData.name;
        document.querySelector('.player-level').textContent = `LV. ${this.playerData.level}`;
        document.querySelector('.wins').textContent = `W: ${this.playerData.wins}`;
        document.querySelector('.losses').textContent = `L: ${this.playerData.losses}`;
        
        const winrate = this.playerData.wins + this.playerData.losses > 0 
            ? Math.round((this.playerData.wins / (this.playerData.wins + this.playerData.losses)) * 100)
            : 0;
        document.querySelector('.winrate').textContent = `${winrate}%`;
    }
    
    updateCurrency() {
        document.getElementById('coinsAmount').textContent = 
            this.playerData.coins.toLocaleString();
        document.getElementById('gemsAmount').textContent = 
            this.playerData.gems.toLocaleString();
    }
    
    openShop() {
        alert('Shop coming soon! 💎\n\nGem Packages:\n• Starter Pack: $4.99 (500 gems)\n• Best Value: $19.99 (2,500 gems)\n• Mega Pack: $49.99 (7,500 gems)');
    }
    
    loadPlayerData() {
        const saved = localStorage.getItem('rpsMultiplayerData');
        if (saved) {
            this.playerData = { ...this.playerData, ...JSON.parse(saved) };
        }
    }
    
    savePlayerData() {
        localStorage.setItem('rpsMultiplayerData', JSON.stringify(this.playerData));
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.gameClient = new MultiplayerClient();
    console.log('RPS Arena Multiplayer initialized!');
});