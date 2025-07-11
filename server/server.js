// RPS Arena Multiplayer Server
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const matchmaking = require('./services/matchmaking');
const battleManager = require('./services/battleManager');
const tournamentManager = require('./services/tournamentManager');
const authService = require('./services/auth');
const database = require('./database/connection');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:8000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', players: io.engine.clientsCount });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/battlepass', require('./routes/battlepass'));
app.use('/api/social', require('./routes/social'));

// Socket.IO Game Logic
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Player joins with auth token
    socket.on('authenticate', async (token) => {
        try {
            const player = await authService.verifyToken(token);
            socket.playerId = player.id;
            socket.playerData = player;
            
            // Join player's personal room
            socket.join(`player:${player.id}`);
            
            // Send player data
            socket.emit('authenticated', {
                player: player,
                serverTime: Date.now()
            });
            
            // Update online status
            await database.updatePlayerStatus(player.id, 'online');
            
        } catch (error) {
            socket.emit('authError', { message: 'Invalid token' });
        }
    });
    
    // Matchmaking
    socket.on('findMatch', async (data) => {
        const { mode, tier } = data;
        
        try {
            // Add player to matchmaking queue
            await matchmaking.addToQueue(socket, mode, tier);
            
            socket.emit('searchingMatch', { 
                estimatedTime: matchmaking.getEstimatedTime(mode, tier) 
            });
            
        } catch (error) {
            socket.emit('matchmakingError', { message: error.message });
        }
    });
    
    // Cancel matchmaking
    socket.on('cancelSearch', async () => {
        await matchmaking.removeFromQueue(socket.playerId);
        socket.emit('searchCancelled');
    });
    
    // Battle actions
    socket.on('makeChoice', async (data) => {
        const { roomId, choice } = data;
        
        try {
            const result = await battleManager.processChoice(roomId, socket.playerId, choice);
            
            if (result.roundComplete) {
                // Send round results to both players
                io.to(roomId).emit('roundResult', result);
                
                if (result.matchComplete) {
                    // Handle match completion
                    await battleManager.completeMatch(roomId, result);
                    io.to(roomId).emit('matchEnd', result);
                    
                    // Update player stats
                    await database.updatePlayerStats(result.winner, result.loser, result);
                }
            }
        } catch (error) {
            socket.emit('battleError', { message: error.message });
        }
    });
    
    // Send emote
    socket.on('sendEmote', (data) => {
        const { roomId, emote } = data;
        socket.to(roomId).emit('opponentEmote', { emote });
    });
    
    // Tournament actions
    socket.on('joinTournament', async (tournamentId) => {
        try {
            const result = await tournamentManager.joinTournament(socket.playerId, tournamentId);
            socket.emit('tournamentJoined', result);
            
            // Notify all players in tournament
            io.to(`tournament:${tournamentId}`).emit('tournamentUpdate', {
                players: result.players,
                status: result.status
            });
        } catch (error) {
            socket.emit('tournamentError', { message: error.message });
        }
    });
    
    // Shop purchases
    socket.on('purchaseItem', async (data) => {
        try {
            const result = await require('./services/shop').purchaseItem(
                socket.playerId, 
                data.itemId, 
                data.currency
            );
            
            socket.emit('purchaseSuccess', result);
            socket.emit('currencyUpdate', result.newBalance);
        } catch (error) {
            socket.emit('purchaseError', { message: error.message });
        }
    });
    
    // Social features
    socket.on('addFriend', async (friendId) => {
        try {
            await require('./services/social').addFriend(socket.playerId, friendId);
            socket.emit('friendAdded', { friendId });
        } catch (error) {
            socket.emit('socialError', { message: error.message });
        }
    });
    
    // Chat
    socket.on('sendMessage', async (data) => {
        const { channel, message } = data;
        
        // Basic chat filter
        if (require('./utils/chatFilter').isClean(message)) {
            io.to(channel).emit('newMessage', {
                playerId: socket.playerId,
                playerName: socket.playerData.name,
                message: message,
                timestamp: Date.now()
            });
        }
    });
    
    // Disconnect
    socket.on('disconnect', async () => {
        console.log(`Player disconnected: ${socket.id}`);
        
        if (socket.playerId) {
            // Remove from matchmaking
            await matchmaking.removeFromQueue(socket.playerId);
            
            // Update status
            await database.updatePlayerStatus(socket.playerId, 'offline');
            
            // Handle ongoing battles
            await battleManager.handleDisconnect(socket.playerId);
        }
    });
});

// Start matchmaking service
matchmaking.startMatchmakingLoop(io);

// Start tournament scheduler
tournamentManager.startScheduler(io);

// Server startup
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`RPS Arena server running on port ${PORT}`);
    database.initialize();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        database.close();
        process.exit(0);
    });
});