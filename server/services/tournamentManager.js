// Tournament Manager Service
const EventEmitter = require('events');
const db = require('../database/connection');

class TournamentManager extends EventEmitter {
    constructor() {
        super();
        this.activeTournaments = new Map();
        this.scheduledTournaments = [];
    }
    
    async createTournament(config) {
        const tournament = {
            name: config.name,
            type: config.type,
            entry_fee_coins: config.entryFeeCoins || 0,
            entry_fee_gems: config.entryFeeGems || 0,
            prize_pool_coins: config.prizePoolCoins || 0,
            prize_pool_gems: config.prizePoolGems || 0,
            max_players: config.maxPlayers || 16,
            start_time: config.startTime,
            format: config.format || 'single-elimination'
        };
        
        const result = await db.query(
            `INSERT INTO tournaments 
             (name, type, entry_fee_coins, entry_fee_gems, prize_pool_coins, prize_pool_gems, max_players, start_time) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [tournament.name, tournament.type, tournament.entry_fee_coins, tournament.entry_fee_gems,
             tournament.prize_pool_coins, tournament.prize_pool_gems, tournament.max_players, tournament.start_time]
        );
        
        return result.rows[0];
    }
    
    async joinTournament(playerId, tournamentId) {
        // Get tournament details
        const tournament = await db.query(
            'SELECT * FROM tournaments WHERE id = $1 AND status = $2',
            [tournamentId, 'upcoming']
        );
        
        if (!tournament.rows[0]) {
            throw new Error('Tournament not found or already started');
        }
        
        const t = tournament.rows[0];
        
        // Check if already joined
        const existing = await db.query(
            'SELECT * FROM tournament_participants WHERE tournament_id = $1 AND player_id = $2',
            [tournamentId, playerId]
        );
        
        if (existing.rows.length > 0) {
            throw new Error('Already joined this tournament');
        }
        
        // Check if tournament is full
        if (t.current_players >= t.max_players) {
            throw new Error('Tournament is full');
        }
        
        // Check player balance
        const player = await db.query(
            'SELECT coins, gems FROM players WHERE id = $1',
            [playerId]
        );
        
        const balance = player.rows[0];
        
        if (t.entry_fee_coins > 0 && balance.coins < t.entry_fee_coins) {
            throw new Error('Insufficient coins for entry fee');
        }
        
        if (t.entry_fee_gems > 0 && balance.gems < t.entry_fee_gems) {
            throw new Error('Insufficient gems for entry fee');
        }
        
        try {
            await db.query('BEGIN');
            
            // Deduct entry fees
            if (t.entry_fee_coins > 0) {
                await db.query(
                    'UPDATE players SET coins = coins - $1 WHERE id = $2',
                    [t.entry_fee_coins, playerId]
                );
            }
            
            if (t.entry_fee_gems > 0) {
                await db.query(
                    'UPDATE players SET gems = gems - $1 WHERE id = $2',
                    [t.entry_fee_gems, playerId]
                );
            }
            
            // Add participant
            await db.query(
                'INSERT INTO tournament_participants (tournament_id, player_id) VALUES ($1, $2)',
                [tournamentId, playerId]
            );
            
            // Update tournament player count
            await db.query(
                'UPDATE tournaments SET current_players = current_players + 1 WHERE id = $1',
                [tournamentId]
            );
            
            // Log transaction
            if (t.entry_fee_coins > 0 || t.entry_fee_gems > 0) {
                await db.query(
                    'INSERT INTO transactions (player_id, type, currency, amount, description) VALUES ($1, $2, $3, $4, $5)',
                    [playerId, 'tournament_entry', 
                     t.entry_fee_coins > 0 ? 'coins' : 'gems',
                     -(t.entry_fee_coins || t.entry_fee_gems),
                     `Tournament entry: ${t.name}`]
                );
            }
            
            await db.query('COMMIT');
            
            // Check if tournament should start
            const updatedTournament = await db.query(
                'SELECT * FROM tournaments WHERE id = $1',
                [tournamentId]
            );
            
            if (updatedTournament.rows[0].current_players >= updatedTournament.rows[0].max_players) {
                this.startTournament(tournamentId);
            }
            
            return {
                success: true,
                tournament: updatedTournament.rows[0],
                players: await this.getTournamentPlayers(tournamentId)
            };
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }
    
    async startTournament(tournamentId) {
        const tournament = await db.query(
            'SELECT * FROM tournaments WHERE id = $1',
            [tournamentId]
        );
        
        if (!tournament.rows[0]) return;
        
        const t = tournament.rows[0];
        
        // Update status
        await db.query(
            'UPDATE tournaments SET status = $1 WHERE id = $2',
            ['active', tournamentId]
        );
        
        // Get all participants
        const participants = await db.query(
            `SELECT p.*, pl.display_name, pl.elo_rating 
             FROM tournament_participants p 
             JOIN players pl ON p.player_id = pl.id 
             WHERE p.tournament_id = $1`,
            [tournamentId]
        );
        
        // Create tournament bracket
        const bracket = this.createBracket(participants.rows);
        
        // Store active tournament
        this.activeTournaments.set(tournamentId, {
            id: tournamentId,
            data: t,
            bracket: bracket,
            currentRound: 1,
            matches: []
        });
        
        // Start first round
        this.startTournamentRound(tournamentId);
        
        // Emit tournament start event
        this.emit('tournamentStarted', {
            tournamentId,
            players: participants.rows,
            bracket
        });
    }
    
    createBracket(players) {
        // Shuffle players
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        
        // Create bracket structure
        const bracket = {
            rounds: [],
            totalRounds: Math.ceil(Math.log2(players.length))
        };
        
        // First round matchups
        const firstRound = [];
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                firstRound.push({
                    player1: shuffled[i],
                    player2: shuffled[i + 1],
                    winner: null
                });
            } else {
                // Bye - player advances automatically
                firstRound.push({
                    player1: shuffled[i],
                    player2: null,
                    winner: shuffled[i].player_id
                });
            }
        }
        
        bracket.rounds.push(firstRound);
        
        // Generate empty rounds for visualization
        let matchesInRound = firstRound.length;
        for (let round = 2; round <= bracket.totalRounds; round++) {
            matchesInRound = Math.ceil(matchesInRound / 2);
            const emptyRound = Array(matchesInRound).fill(null).map(() => ({
                player1: null,
                player2: null,
                winner: null
            }));
            bracket.rounds.push(emptyRound);
        }
        
        return bracket;
    }
    
    startTournamentRound(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return;
        
        const currentRoundMatches = tournament.bracket.rounds[tournament.currentRound - 1];
        
        // Create matches for this round
        currentRoundMatches.forEach((match, index) => {
            if (match.player1 && match.player2 && !match.winner) {
                // Schedule match
                setTimeout(() => {
                    this.createTournamentMatch(tournamentId, tournament.currentRound, index, match);
                }, index * 5000); // Stagger match starts
            }
        });
    }
    
    createTournamentMatch(tournamentId, round, matchIndex, matchData) {
        const matchId = `tournament_${tournamentId}_r${round}_m${matchIndex}`;
        
        // Emit match ready event
        this.emit('tournamentMatchReady', {
            tournamentId,
            matchId,
            round,
            matchIndex,
            player1: matchData.player1,
            player2: matchData.player2
        });
    }
    
    async completeTournamentMatch(tournamentId, round, matchIndex, winnerId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return;
        
        // Update bracket
        tournament.bracket.rounds[round - 1][matchIndex].winner = winnerId;
        
        // Update database
        await db.query(
            'UPDATE tournament_participants SET rounds_won = rounds_won + 1 WHERE tournament_id = $1 AND player_id = $2',
            [tournamentId, winnerId]
        );
        
        // Check if round is complete
        const roundComplete = tournament.bracket.rounds[round - 1].every(match => 
            match.winner !== null || match.player2 === null
        );
        
        if (roundComplete) {
            if (round < tournament.bracket.totalRounds) {
                // Advance to next round
                this.advanceToNextRound(tournamentId);
            } else {
                // Tournament complete
                this.completeTournament(tournamentId);
            }
        }
    }
    
    advanceToNextRound(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return;
        
        const currentRound = tournament.currentRound;
        const nextRound = currentRound + 1;
        
        // Get winners from current round
        const winners = tournament.bracket.rounds[currentRound - 1]
            .map(match => match.winner)
            .filter(winner => winner !== null);
        
        // Create next round matchups
        const nextRoundMatches = tournament.bracket.rounds[nextRound - 1];
        for (let i = 0; i < winners.length; i += 2) {
            const matchIndex = Math.floor(i / 2);
            if (nextRoundMatches[matchIndex]) {
                nextRoundMatches[matchIndex].player1 = { player_id: winners[i] };
                if (i + 1 < winners.length) {
                    nextRoundMatches[matchIndex].player2 = { player_id: winners[i + 1] };
                }
            }
        }
        
        tournament.currentRound = nextRound;
        
        // Start next round
        setTimeout(() => {
            this.startTournamentRound(tournamentId);
        }, 10000); // 10 second break between rounds
        
        // Emit round complete event
        this.emit('tournamentRoundComplete', {
            tournamentId,
            completedRound: currentRound,
            nextRound: nextRound
        });
    }
    
    async completeTournament(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return;
        
        // Find final winner
        const finalMatch = tournament.bracket.rounds[tournament.bracket.totalRounds - 1][0];
        const winnerId = finalMatch.winner;
        
        // Calculate prize distribution
        const prizes = this.calculatePrizes(tournament.data, tournament.bracket);
        
        try {
            await db.query('BEGIN');
            
            // Update tournament status
            await db.query(
                'UPDATE tournaments SET status = $1, end_time = NOW() WHERE id = $2',
                ['completed', tournamentId]
            );
            
            // Distribute prizes
            for (const [playerId, prize] of Object.entries(prizes)) {
                if (prize.coins > 0) {
                    await db.query(
                        'UPDATE players SET coins = coins + $1 WHERE id = $2',
                        [prize.coins, playerId]
                    );
                }
                
                if (prize.gems > 0) {
                    await db.query(
                        'UPDATE players SET gems = gems + $1 WHERE id = $2',
                        [prize.gems, playerId]
                    );
                }
                
                // Update participant record
                await db.query(
                    'UPDATE tournament_participants SET placement = $1, prize_coins = $2, prize_gems = $3 WHERE tournament_id = $4 AND player_id = $5',
                    [prize.placement, prize.coins, prize.gems, tournamentId, playerId]
                );
                
                // Log transaction
                if (prize.coins > 0 || prize.gems > 0) {
                    await db.query(
                        'INSERT INTO transactions (player_id, type, currency, amount, description) VALUES ($1, $2, $3, $4, $5)',
                        [playerId, 'tournament_prize',
                         prize.coins > 0 ? 'coins' : 'gems',
                         prize.coins || prize.gems,
                         `Tournament prize: ${tournament.data.name} (${prize.placement} place)`]
                    );
                }
            }
            
            // Update winner stats
            await db.query(
                'UPDATE player_stats SET tournament_wins = tournament_wins + 1 WHERE player_id = $1',
                [winnerId]
            );
            
            await db.query('COMMIT');
            
        } catch (error) {
            await db.query('ROLLBACK');
            console.error('Error completing tournament:', error);
        }
        
        // Remove from active tournaments
        this.activeTournaments.delete(tournamentId);
        
        // Emit tournament complete event
        this.emit('tournamentComplete', {
            tournamentId,
            winner: winnerId,
            prizes
        });
    }
    
    calculatePrizes(tournamentData, bracket) {
        const prizes = {};
        const totalCoins = tournamentData.prize_pool_coins;
        const totalGems = tournamentData.prize_pool_gems;
        
        // Get final standings
        const standings = this.getFinalStandings(bracket);
        
        // Prize distribution based on placement
        const distribution = {
            1: 0.5,   // 50% for winner
            2: 0.25,  // 25% for runner-up
            3: 0.15,  // 15% for 3rd place
            4: 0.1    // 10% for 4th place
        };
        
        standings.slice(0, 4).forEach((playerId, index) => {
            const placement = index + 1;
            const percentage = distribution[placement] || 0;
            
            prizes[playerId] = {
                placement,
                coins: Math.floor(totalCoins * percentage),
                gems: Math.floor(totalGems * percentage)
            };
        });
        
        return prizes;
    }
    
    getFinalStandings(bracket) {
        const standings = [];
        
        // Winner (1st place)
        const finalMatch = bracket.rounds[bracket.totalRounds - 1][0];
        if (finalMatch && finalMatch.winner) {
            standings.push(finalMatch.winner);
        }
        
        // Runner-up (2nd place) - loser of final
        if (finalMatch) {
            const runnerUp = finalMatch.player1.player_id === finalMatch.winner 
                ? finalMatch.player2.player_id 
                : finalMatch.player1.player_id;
            standings.push(runnerUp);
        }
        
        // 3rd and 4th place - losers of semifinals
        if (bracket.totalRounds >= 2) {
            const semiFinals = bracket.rounds[bracket.totalRounds - 2];
            semiFinals.forEach(match => {
                if (match && match.winner) {
                    const loser = match.player1.player_id === match.winner 
                        ? match.player2.player_id 
                        : match.player1.player_id;
                    standings.push(loser);
                }
            });
        }
        
        return standings;
    }
    
    async getTournamentPlayers(tournamentId) {
        const players = await db.query(
            `SELECT p.*, pl.display_name, pl.level, pl.elo_rating 
             FROM tournament_participants p 
             JOIN players pl ON p.player_id = pl.id 
             WHERE p.tournament_id = $1 
             ORDER BY p.joined_at`,
            [tournamentId]
        );
        
        return players.rows;
    }
    
    async getUpcomingTournaments() {
        const tournaments = await db.query(
            `SELECT * FROM tournaments 
             WHERE status = 'upcoming' 
             AND start_time > NOW() 
             ORDER BY start_time 
             LIMIT 10`
        );
        
        return tournaments.rows;
    }
    
    async getActiveTournaments() {
        const tournaments = await db.query(
            `SELECT * FROM tournaments 
             WHERE status = 'active' 
             ORDER BY start_time`
        );
        
        return tournaments.rows;
    }
    
    startScheduler(io) {
        // Create daily tournaments
        setInterval(async () => {
            const hour = new Date().getHours();
            
            // Create tournaments at specific times
            if (hour === 12 || hour === 18 || hour === 21) {
                await this.createDailyTournament();
            }
            
            // Check for tournaments that should start
            const ready = await db.query(
                `SELECT * FROM tournaments 
                 WHERE status = 'upcoming' 
                 AND start_time <= NOW()`
            );
            
            for (const tournament of ready.rows) {
                this.startTournament(tournament.id);
            }
            
        }, 3600000); // Check every hour
        
        // Handle tournament events
        this.on('tournamentStarted', (data) => {
            io.to(`tournament:${data.tournamentId}`).emit('tournamentStarted', data);
        });
        
        this.on('tournamentMatchReady', (data) => {
            // Notify players of their match
            io.to(`player:${data.player1.player_id}`).emit('tournamentMatchReady', data);
            io.to(`player:${data.player2.player_id}`).emit('tournamentMatchReady', data);
        });
        
        this.on('tournamentComplete', (data) => {
            io.emit('tournamentComplete', data);
        });
    }
    
    async createDailyTournament() {
        const tournaments = [
            {
                name: 'Daily Quick Tournament',
                type: 'daily',
                entryFeeCoins: 100,
                prizePoolCoins: 2000,
                maxPlayers: 16,
                startTime: new Date(Date.now() + 3600000) // 1 hour from now
            },
            {
                name: 'Daily Gem Tournament',
                type: 'daily',
                entryFeeGems: 10,
                prizePoolGems: 200,
                maxPlayers: 8,
                startTime: new Date(Date.now() + 3600000)
            }
        ];
        
        for (const config of tournaments) {
            await this.createTournament(config);
        }
    }
}

module.exports = new TournamentManager();