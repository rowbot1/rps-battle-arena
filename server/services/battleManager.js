// Battle Manager Service
class BattleManager {
    constructor() {
        this.activeBattles = new Map();
        this.playerBattles = new Map(); // Track which battle each player is in
    }
    
    createBattle(matchData) {
        const battleId = matchData.id;
        
        const battle = {
            id: battleId,
            mode: matchData.mode,
            players: {},
            rounds: [],
            currentRound: 1,
            totalRounds: matchData.rounds,
            scores: {},
            state: 'waiting',
            createdAt: Date.now(),
            lastActionAt: Date.now()
        };
        
        // Initialize players
        matchData.players.forEach(player => {
            battle.players[player.id] = {
                id: player.id,
                socketId: player.socketId,
                data: player.data,
                connected: true,
                currentChoice: null,
                timeouts: 0
            };
            
            battle.scores[player.id] = 0;
            
            // Track player's current battle
            this.playerBattles.set(player.id, battleId);
        });
        
        this.activeBattles.set(battleId, battle);
        
        // Start first round
        this.startRound(battleId);
        
        return battle;
    }
    
    startRound(battleId) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) return;
        
        battle.state = 'active';
        battle.lastActionAt = Date.now();
        
        // Reset choices
        Object.values(battle.players).forEach(player => {
            player.currentChoice = null;
        });
        
        // Create round data
        const round = {
            number: battle.currentRound,
            choices: {},
            startTime: Date.now(),
            endTime: null,
            winner: null
        };
        
        battle.rounds.push(round);
        
        // Set timeout for round
        setTimeout(() => {
            this.checkRoundTimeout(battleId, battle.currentRound);
        }, 11000); // 10 seconds + 1 second buffer
    }
    
    async processChoice(battleId, playerId, choice) {
        const battle = this.activeBattles.get(battleId);
        if (!battle || battle.state !== 'active') {
            throw new Error('Battle not found or not active');
        }
        
        const player = battle.players[playerId];
        if (!player) {
            throw new Error('Player not in this battle');
        }
        
        if (player.currentChoice) {
            throw new Error('Choice already made this round');
        }
        
        // Validate choice
        if (!['rock', 'paper', 'scissors'].includes(choice)) {
            throw new Error('Invalid choice');
        }
        
        // Record choice
        player.currentChoice = choice;
        battle.lastActionAt = Date.now();
        
        const currentRound = battle.rounds[battle.currentRound - 1];
        currentRound.choices[playerId] = {
            choice: choice,
            timestamp: Date.now()
        };
        
        // Check if all players have chosen
        const allChosen = Object.values(battle.players).every(p => p.currentChoice !== null);
        
        if (allChosen) {
            return this.resolveRound(battleId);
        }
        
        return {
            roundComplete: false,
            waitingFor: Object.values(battle.players)
                .filter(p => !p.currentChoice)
                .map(p => p.id)
        };
    }
    
    resolveRound(battleId) {
        const battle = this.activeBattles.get(battleId);
        const currentRound = battle.rounds[battle.currentRound - 1];
        
        // Get player choices
        const playerIds = Object.keys(battle.players);
        const player1 = battle.players[playerIds[0]];
        const player2 = battle.players[playerIds[1]];
        
        const choice1 = player1.currentChoice;
        const choice2 = player2.currentChoice;
        
        // Determine winner
        let roundWinner = null;
        let result = 'draw';
        
        if (choice1 === choice2) {
            result = 'draw';
        } else if (
            (choice1 === 'rock' && choice2 === 'scissors') ||
            (choice1 === 'paper' && choice2 === 'rock') ||
            (choice1 === 'scissors' && choice2 === 'paper')
        ) {
            roundWinner = playerIds[0];
            battle.scores[playerIds[0]]++;
            result = 'player1';
        } else {
            roundWinner = playerIds[1];
            battle.scores[playerIds[1]]++;
            result = 'player2';
        }
        
        // Update round data
        currentRound.endTime = Date.now();
        currentRound.winner = roundWinner;
        currentRound.result = result;
        
        // Check if match is complete
        const matchComplete = this.checkMatchComplete(battle);
        
        const roundResult = {
            roundComplete: true,
            roundNumber: battle.currentRound,
            choices: {
                [playerIds[0]]: choice1,
                [playerIds[1]]: choice2
            },
            winner: roundWinner,
            scores: battle.scores,
            matchComplete: matchComplete,
            nextRoundIn: matchComplete ? 0 : 3000
        };
        
        if (matchComplete) {
            roundResult.matchWinner = this.getMatchWinner(battle);
            roundResult.finalScores = battle.scores;
        } else {
            // Prepare next round
            battle.currentRound++;
            setTimeout(() => {
                this.startRound(battleId);
            }, 3000);
        }
        
        return roundResult;
    }
    
    checkMatchComplete(battle) {
        const maxScore = Math.ceil(battle.totalRounds / 2);
        const scores = Object.values(battle.scores);
        
        return scores.some(score => score >= maxScore) || 
               battle.currentRound >= battle.totalRounds;
    }
    
    getMatchWinner(battle) {
        const scores = battle.scores;
        const playerIds = Object.keys(scores);
        
        if (scores[playerIds[0]] > scores[playerIds[1]]) {
            return playerIds[0];
        } else if (scores[playerIds[1]] > scores[playerIds[0]]) {
            return playerIds[1];
        }
        
        return null; // Draw
    }
    
    checkRoundTimeout(battleId, roundNumber) {
        const battle = this.activeBattles.get(battleId);
        if (!battle || battle.currentRound !== roundNumber) return;
        
        // Find players who haven't chosen
        const timedOutPlayers = [];
        
        Object.entries(battle.players).forEach(([playerId, player]) => {
            if (!player.currentChoice) {
                // Make random choice for timed out player
                const choices = ['rock', 'paper', 'scissors'];
                player.currentChoice = choices[Math.floor(Math.random() * 3)];
                player.timeouts++;
                timedOutPlayers.push(playerId);
                
                // Record in round data
                const currentRound = battle.rounds[battle.currentRound - 1];
                currentRound.choices[playerId] = {
                    choice: player.currentChoice,
                    timestamp: Date.now(),
                    timedOut: true
                };
            }
        });
        
        // Resolve round if needed
        if (timedOutPlayers.length > 0) {
            this.resolveRound(battleId);
        }
    }
    
    async completeMatch(battleId, result) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) return;
        
        battle.state = 'completed';
        battle.completedAt = Date.now();
        
        // Calculate match statistics
        const stats = this.calculateMatchStats(battle);
        
        // Remove from active battles
        this.activeBattles.delete(battleId);
        
        // Remove player associations
        Object.keys(battle.players).forEach(playerId => {
            this.playerBattles.delete(playerId);
        });
        
        // Return complete match data for database storage
        return {
            battleId,
            mode: battle.mode,
            players: Object.keys(battle.players),
            winner: result.matchWinner,
            scores: battle.scores,
            rounds: battle.rounds,
            duration: battle.completedAt - battle.createdAt,
            stats
        };
    }
    
    calculateMatchStats(battle) {
        const stats = {};
        
        Object.entries(battle.players).forEach(([playerId, player]) => {
            const choices = { rock: 0, paper: 0, scissors: 0 };
            const results = { wins: 0, losses: 0, draws: 0 };
            
            battle.rounds.forEach(round => {
                if (round.choices[playerId]) {
                    choices[round.choices[playerId].choice]++;
                    
                    if (round.winner === playerId) {
                        results.wins++;
                    } else if (round.winner === null) {
                        results.draws++;
                    } else {
                        results.losses++;
                    }
                }
            });
            
            stats[playerId] = {
                choices,
                results,
                timeouts: player.timeouts,
                averageResponseTime: this.calculateAvgResponseTime(battle, playerId)
            };
        });
        
        return stats;
    }
    
    calculateAvgResponseTime(battle, playerId) {
        const times = [];
        
        battle.rounds.forEach(round => {
            if (round.choices[playerId] && !round.choices[playerId].timedOut) {
                const responseTime = round.choices[playerId].timestamp - round.startTime;
                times.push(responseTime);
            }
        });
        
        if (times.length === 0) return 0;
        
        return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    }
    
    async handleDisconnect(playerId) {
        const battleId = this.playerBattles.get(playerId);
        if (!battleId) return;
        
        const battle = this.activeBattles.get(battleId);
        if (!battle) return;
        
        const player = battle.players[playerId];
        if (player) {
            player.connected = false;
            
            // Give player 30 seconds to reconnect
            setTimeout(() => {
                if (!player.connected && battle.state === 'active') {
                    this.forfeitMatch(battleId, playerId);
                }
            }, 30000);
        }
    }
    
    async handleReconnect(playerId, newSocketId) {
        const battleId = this.playerBattles.get(playerId);
        if (!battleId) return null;
        
        const battle = this.activeBattles.get(battleId);
        if (!battle) return null;
        
        const player = battle.players[playerId];
        if (player) {
            player.connected = true;
            player.socketId = newSocketId;
            
            // Return current battle state
            return {
                battleId,
                state: battle.state,
                currentRound: battle.currentRound,
                scores: battle.scores,
                timeLeft: this.getRoundTimeLeft(battle)
            };
        }
        
        return null;
    }
    
    getRoundTimeLeft(battle) {
        if (battle.state !== 'active') return 0;
        
        const currentRound = battle.rounds[battle.currentRound - 1];
        if (!currentRound) return 0;
        
        const elapsed = Date.now() - currentRound.startTime;
        const remaining = Math.max(0, 10000 - elapsed);
        
        return Math.ceil(remaining / 1000);
    }
    
    forfeitMatch(battleId, forfeitingPlayerId) {
        const battle = this.activeBattles.get(battleId);
        if (!battle) return;
        
        battle.state = 'forfeited';
        
        // Find opponent
        const opponentId = Object.keys(battle.players).find(id => id !== forfeitingPlayerId);
        
        // Set winner as opponent
        const result = {
            matchComplete: true,
            matchWinner: opponentId,
            forfeitedBy: forfeitingPlayerId,
            reason: 'disconnect',
            scores: battle.scores
        };
        
        this.completeMatch(battleId, result);
        
        return result;
    }
    
    getActiveBattleCount() {
        return this.activeBattles.size;
    }
    
    getPlayerBattle(playerId) {
        const battleId = this.playerBattles.get(playerId);
        return battleId ? this.activeBattles.get(battleId) : null;
    }
}

module.exports = new BattleManager();