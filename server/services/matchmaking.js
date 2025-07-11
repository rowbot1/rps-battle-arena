// Matchmaking Service
const EventEmitter = require('events');

class MatchmakingService extends EventEmitter {
    constructor() {
        super();
        this.queues = {
            quick: new Map(),
            ranked: new Map(),
            tournament: new Map(),
            battleRoyale: []
        };
        this.activeSearches = new Map();
        this.matchCounter = 0;
    }
    
    async addToQueue(socket, mode, tier) {
        const player = {
            id: socket.playerId,
            socketId: socket.id,
            data: socket.playerData,
            elo: socket.playerData.elo_rating,
            joinedAt: Date.now(),
            mode: mode,
            tier: tier || this.getTierFromElo(socket.playerData.elo_rating)
        };
        
        // Remove from any existing queues
        this.removeFromAllQueues(player.id);
        
        // Add to appropriate queue
        if (mode === 'quick') {
            this.addToQuickQueue(player);
        } else if (mode === 'ranked') {
            this.addToRankedQueue(player);
        } else if (mode === 'battleRoyale') {
            this.addToBattleRoyaleQueue(player);
        }
        
        // Store active search
        this.activeSearches.set(player.id, {
            mode,
            startTime: Date.now()
        });
        
        // Try to find match immediately
        this.findMatch(player);
    }
    
    addToQuickQueue(player) {
        // Quick match - wider ELO range
        const range = 500;
        const key = Math.floor(player.elo / range) * range;
        
        if (!this.queues.quick.has(key)) {
            this.queues.quick.set(key, []);
        }
        
        this.queues.quick.get(key).push(player);
    }
    
    addToRankedQueue(player) {
        // Ranked - stricter ELO matching
        const range = 200;
        const key = Math.floor(player.elo / range) * range;
        
        if (!this.queues.ranked.has(key)) {
            this.queues.ranked.set(key, []);
        }
        
        this.queues.ranked.get(key).push(player);
    }
    
    addToBattleRoyaleQueue(player) {
        this.queues.battleRoyale.push(player);
        
        // Start battle royale when we have enough players
        if (this.queues.battleRoyale.length >= 100) {
            this.startBattleRoyale();
        }
    }
    
    findMatch(player) {
        const queue = this.queues[player.mode];
        
        if (player.mode === 'quick' || player.mode === 'ranked') {
            // Look for opponents in similar ELO ranges
            const searchRanges = this.getSearchRanges(player);
            
            for (const range of searchRanges) {
                const candidates = queue.get(range) || [];
                
                for (const opponent of candidates) {
                    if (opponent.id !== player.id && this.isGoodMatch(player, opponent)) {
                        this.createMatch(player, opponent);
                        return;
                    }
                }
            }
        }
    }
    
    getSearchRanges(player) {
        const baseRange = player.mode === 'quick' ? 500 : 200;
        const playerKey = Math.floor(player.elo / baseRange) * baseRange;
        const waitTime = Date.now() - player.joinedAt;
        
        // Expand search range over time
        const expansion = Math.floor(waitTime / 10000); // Expand every 10 seconds
        const ranges = [playerKey];
        
        for (let i = 1; i <= expansion; i++) {
            ranges.push(playerKey + (baseRange * i));
            ranges.push(playerKey - (baseRange * i));
        }
        
        return ranges;
    }
    
    isGoodMatch(player1, player2) {
        // Check if players recently played against each other
        // In production, check database for recent matches
        
        const eloDiff = Math.abs(player1.elo - player2.elo);
        const waitTime = Math.min(
            Date.now() - player1.joinedAt,
            Date.now() - player2.joinedAt
        );
        
        // More lenient matching as wait time increases
        const maxEloDiff = player1.mode === 'quick' ? 500 : 200;
        const allowedDiff = maxEloDiff + (waitTime / 1000) * 10;
        
        return eloDiff <= allowedDiff;
    }
    
    createMatch(player1, player2) {
        const matchId = `match_${++this.matchCounter}`;
        
        // Remove from queues
        this.removeFromQueue(player1.id);
        this.removeFromQueue(player2.id);
        
        // Create match data
        const matchData = {
            id: matchId,
            mode: player1.mode,
            players: [player1, player2],
            rounds: player1.mode === 'quick' ? 3 : 5,
            createdAt: Date.now()
        };
        
        // Emit match found event
        this.emit('matchFound', matchData);
    }
    
    removeFromQueue(playerId) {
        // Remove from all queues
        this.removeFromAllQueues(playerId);
        this.activeSearches.delete(playerId);
    }
    
    removeFromAllQueues(playerId) {
        // Quick and ranked queues
        ['quick', 'ranked'].forEach(mode => {
            this.queues[mode].forEach((players, key) => {
                const index = players.findIndex(p => p.id === playerId);
                if (index !== -1) {
                    players.splice(index, 1);
                    if (players.length === 0) {
                        this.queues[mode].delete(key);
                    }
                }
            });
        });
        
        // Battle royale queue
        const brIndex = this.queues.battleRoyale.findIndex(p => p.id === playerId);
        if (brIndex !== -1) {
            this.queues.battleRoyale.splice(brIndex, 1);
        }
    }
    
    startBattleRoyale() {
        const players = this.queues.battleRoyale.splice(0, 100);
        const battleId = `battle_royale_${++this.matchCounter}`;
        
        const battleData = {
            id: battleId,
            mode: 'battleRoyale',
            players: players,
            rounds: 1,
            eliminationOrder: [],
            createdAt: Date.now()
        };
        
        this.emit('battleRoyaleStart', battleData);
    }
    
    getEstimatedTime(mode, tier) {
        // Calculate based on current queue sizes and historical data
        const queueSize = this.getQueueSize(mode, tier);
        const avgWaitTime = this.getAverageWaitTime(mode, tier);
        
        return {
            estimated: avgWaitTime,
            playersInQueue: queueSize,
            confidence: queueSize > 10 ? 'high' : 'medium'
        };
    }
    
    getQueueSize(mode, tier) {
        if (mode === 'battleRoyale') {
            return this.queues.battleRoyale.length;
        }
        
        let total = 0;
        this.queues[mode].forEach((players) => {
            total += players.length;
        });
        return total;
    }
    
    getAverageWaitTime(mode, tier) {
        // In production, calculate from historical data
        const baseTimes = {
            quick: 5,
            ranked: 15,
            battleRoyale: 30
        };
        
        return baseTimes[mode] || 10;
    }
    
    getTierFromElo(elo) {
        if (elo < 1200) return 'bronze';
        if (elo < 1500) return 'silver';
        if (elo < 1800) return 'gold';
        if (elo < 2100) return 'platinum';
        if (elo < 2400) return 'diamond';
        return 'master';
    }
    
    startMatchmakingLoop(io) {
        // Periodic matchmaking attempts
        setInterval(() => {
            // Try to match players who have been waiting
            this.activeSearches.forEach((search, playerId) => {
                const waitTime = Date.now() - search.startTime;
                
                // Re-attempt matching for waiting players
                if (waitTime > 5000) { // Every 5 seconds
                    const queue = this.queues[search.mode];
                    queue.forEach(players => {
                        const player = players.find(p => p.id === playerId);
                        if (player) {
                            this.findMatch(player);
                        }
                    });
                }
            });
            
            // Check battle royale queue
            if (this.queues.battleRoyale.length >= 20) {
                // Start with fewer players if waiting too long
                const oldestPlayer = this.queues.battleRoyale[0];
                if (oldestPlayer && Date.now() - oldestPlayer.joinedAt > 60000) {
                    this.startBattleRoyaleWithAvailable();
                }
            }
        }, 1000);
        
        // Handle match found events
        this.on('matchFound', (matchData) => {
            matchData.players.forEach(player => {
                io.to(player.socketId).emit('matchFound', {
                    matchId: matchData.id,
                    opponent: matchData.players.find(p => p.id !== player.id).data,
                    rounds: matchData.rounds,
                    mode: matchData.mode
                });
            });
        });
    }
    
    startBattleRoyaleWithAvailable() {
        if (this.queues.battleRoyale.length >= 20) {
            const players = this.queues.battleRoyale.splice(0, this.queues.battleRoyale.length);
            const battleId = `battle_royale_${++this.matchCounter}`;
            
            const battleData = {
                id: battleId,
                mode: 'battleRoyale',
                players: players,
                totalPlayers: players.length,
                createdAt: Date.now()
            };
            
            this.emit('battleRoyaleStart', battleData);
        }
    }
    
    getQueueStats() {
        const stats = {
            quick: { total: 0, byTier: {} },
            ranked: { total: 0, byTier: {} },
            battleRoyale: this.queues.battleRoyale.length,
            activeSearches: this.activeSearches.size
        };
        
        ['quick', 'ranked'].forEach(mode => {
            this.queues[mode].forEach((players, key) => {
                stats[mode].total += players.length;
                const tier = this.getTierFromElo(key);
                stats[mode].byTier[tier] = (stats[mode].byTier[tier] || 0) + players.length;
            });
        });
        
        return stats;
    }
}

module.exports = new MatchmakingService();