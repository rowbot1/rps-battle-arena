// Social Features Service
const db = require('../database/connection');

class SocialService {
    constructor() {
        this.onlinePlayers = new Map();
    }
    
    async addFriend(playerId, friendId) {
        if (playerId === friendId) {
            throw new Error('Cannot add yourself as a friend');
        }
        
        // Ensure consistent ordering for the friendship pair
        const [player1, player2] = playerId < friendId 
            ? [playerId, friendId] 
            : [friendId, playerId];
        
        // Check if friendship already exists
        const existing = await db.query(
            'SELECT * FROM friendships WHERE player_id = $1 AND friend_id = $2',
            [player1, player2]
        );
        
        if (existing.rows.length > 0) {
            const status = existing.rows[0].status;
            if (status === 'accepted') {
                throw new Error('Already friends');
            } else if (status === 'pending') {
                throw new Error('Friend request already sent');
            } else if (status === 'blocked') {
                throw new Error('Cannot send friend request');
            }
        }
        
        // Create friend request
        await db.query(
            'INSERT INTO friendships (player_id, friend_id, status) VALUES ($1, $2, $3)',
            [player1, player2, 'pending']
        );
        
        // Notify the friend
        this.notifyPlayer(friendId, {
            type: 'friend_request',
            from: playerId,
            message: 'You have a new friend request!'
        });
        
        return { success: true, status: 'pending' };
    }
    
    async acceptFriendRequest(playerId, friendId) {
        const [player1, player2] = playerId < friendId 
            ? [playerId, friendId] 
            : [friendId, playerId];
        
        const result = await db.query(
            'UPDATE friendships SET status = $1 WHERE player_id = $2 AND friend_id = $3 AND status = $4 RETURNING *',
            ['accepted', player1, player2, 'pending']
        );
        
        if (result.rows.length === 0) {
            throw new Error('Friend request not found');
        }
        
        // Notify both players
        this.notifyPlayer(friendId, {
            type: 'friend_accepted',
            from: playerId,
            message: 'Friend request accepted!'
        });
        
        // Grant XP for making friends
        const battlePass = require('./battlePass');
        await battlePass.grantExperience(playerId, 50, 'friend_added');
        await battlePass.grantExperience(friendId, 50, 'friend_added');
        
        return { success: true };
    }
    
    async removeFriend(playerId, friendId) {
        const [player1, player2] = playerId < friendId 
            ? [playerId, friendId] 
            : [friendId, playerId];
        
        await db.query(
            'DELETE FROM friendships WHERE player_id = $1 AND friend_id = $2',
            [player1, player2]
        );
        
        return { success: true };
    }
    
    async blockPlayer(playerId, targetId) {
        const [player1, player2] = playerId < targetId 
            ? [playerId, targetId] 
            : [targetId, playerId];
        
        await db.query(
            `INSERT INTO friendships (player_id, friend_id, status) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (player_id, friend_id) 
             DO UPDATE SET status = $3`,
            [player1, player2, 'blocked']
        );
        
        return { success: true };
    }
    
    async getFriendsList(playerId) {
        const friends = await db.query(
            `SELECT 
                CASE 
                    WHEN f.player_id = $1 THEN p2.id
                    ELSE p1.id
                END as friend_id,
                CASE 
                    WHEN f.player_id = $1 THEN p2.display_name
                    ELSE p1.display_name
                END as display_name,
                CASE 
                    WHEN f.player_id = $1 THEN p2.level
                    ELSE p1.level
                END as level,
                CASE 
                    WHEN f.player_id = $1 THEN p2.status
                    ELSE p1.status
                END as status,
                f.created_at as friends_since
             FROM friendships f
             JOIN players p1 ON f.player_id = p1.id
             JOIN players p2 ON f.friend_id = p2.id
             WHERE (f.player_id = $1 OR f.friend_id = $1) 
             AND f.status = 'accepted'
             ORDER BY f.created_at DESC`,
            [playerId]
        );
        
        return friends.rows;
    }
    
    async getPendingFriendRequests(playerId) {
        const requests = await db.query(
            `SELECT 
                CASE 
                    WHEN f.player_id = $1 THEN p2.id
                    ELSE p1.id
                END as from_player_id,
                CASE 
                    WHEN f.player_id = $1 THEN p2.display_name
                    ELSE p1.display_name
                END as display_name,
                CASE 
                    WHEN f.player_id = $1 THEN p2.level
                    ELSE p1.level
                END as level,
                f.created_at as requested_at
             FROM friendships f
             JOIN players p1 ON f.player_id = p1.id
             JOIN players p2 ON f.friend_id = p2.id
             WHERE (f.player_id = $1 OR f.friend_id = $1) 
             AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [playerId]
        );
        
        return requests.rows;
    }
    
    // Clan Management
    async createClan(playerId, clanData) {
        const { name, tag, description } = clanData;
        
        // Validate clan name and tag
        if (name.length < 3 || name.length > 50) {
            throw new Error('Clan name must be between 3 and 50 characters');
        }
        
        if (tag.length < 2 || tag.length > 5) {
            throw new Error('Clan tag must be between 2 and 5 characters');
        }
        
        // Check if player is already in a clan
        const existingMembership = await db.query(
            'SELECT * FROM clan_members WHERE player_id = $1',
            [playerId]
        );
        
        if (existingMembership.rows.length > 0) {
            throw new Error('You must leave your current clan first');
        }
        
        try {
            await db.query('BEGIN');
            
            // Create clan
            const clan = await db.query(
                'INSERT INTO clans (name, tag, description, leader_id) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, tag.toUpperCase(), description, playerId]
            );
            
            // Add leader as first member
            await db.query(
                'INSERT INTO clan_members (clan_id, player_id, role) VALUES ($1, $2, $3)',
                [clan.rows[0].id, playerId, 'leader']
            );
            
            await db.query('COMMIT');
            
            return clan.rows[0];
            
        } catch (error) {
            await db.query('ROLLBACK');
            if (error.code === '23505') {
                throw new Error('Clan name or tag already exists');
            }
            throw error;
        }
    }
    
    async joinClan(playerId, clanId) {
        // Check if already in a clan
        const existingMembership = await db.query(
            'SELECT * FROM clan_members WHERE player_id = $1',
            [playerId]
        );
        
        if (existingMembership.rows.length > 0) {
            throw new Error('You must leave your current clan first');
        }
        
        // Check clan capacity
        const clan = await db.query(
            'SELECT * FROM clans WHERE id = $1',
            [clanId]
        );
        
        if (!clan.rows[0]) {
            throw new Error('Clan not found');
        }
        
        if (clan.rows[0].members_count >= clan.rows[0].max_members) {
            throw new Error('Clan is full');
        }
        
        try {
            await db.query('BEGIN');
            
            // Add member
            await db.query(
                'INSERT INTO clan_members (clan_id, player_id) VALUES ($1, $2)',
                [clanId, playerId]
            );
            
            // Update member count
            await db.query(
                'UPDATE clans SET members_count = members_count + 1 WHERE id = $1',
                [clanId]
            );
            
            await db.query('COMMIT');
            
            // Notify clan members
            this.notifyClan(clanId, {
                type: 'member_joined',
                playerId: playerId,
                message: 'A new member has joined the clan!'
            });
            
            return { success: true };
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }
    
    async leaveClan(playerId) {
        const membership = await db.query(
            'SELECT * FROM clan_members WHERE player_id = $1',
            [playerId]
        );
        
        if (membership.rows.length === 0) {
            throw new Error('You are not in a clan');
        }
        
        const member = membership.rows[0];
        
        if (member.role === 'leader') {
            // Check if there are other members
            const otherMembers = await db.query(
                'SELECT * FROM clan_members WHERE clan_id = $1 AND player_id != $2',
                [member.clan_id, playerId]
            );
            
            if (otherMembers.rows.length > 0) {
                throw new Error('You must transfer leadership before leaving');
            }
        }
        
        try {
            await db.query('BEGIN');
            
            // Remove member
            await db.query(
                'DELETE FROM clan_members WHERE player_id = $1',
                [playerId]
            );
            
            // Update member count
            await db.query(
                'UPDATE clans SET members_count = members_count - 1 WHERE id = $1',
                [member.clan_id]
            );
            
            // Delete clan if no members left
            const remainingMembers = await db.query(
                'SELECT COUNT(*) FROM clan_members WHERE clan_id = $1',
                [member.clan_id]
            );
            
            if (remainingMembers.rows[0].count === '0') {
                await db.query('DELETE FROM clans WHERE id = $1', [member.clan_id]);
            }
            
            await db.query('COMMIT');
            
            return { success: true };
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }
    
    async getClanInfo(clanId) {
        const clan = await db.query(
            'SELECT * FROM clans WHERE id = $1',
            [clanId]
        );
        
        if (!clan.rows[0]) {
            throw new Error('Clan not found');
        }
        
        const members = await db.query(
            `SELECT 
                cm.*, 
                p.display_name, 
                p.level, 
                p.elo_rating,
                p.status
             FROM clan_members cm
             JOIN players p ON cm.player_id = p.id
             WHERE cm.clan_id = $1
             ORDER BY 
                CASE cm.role 
                    WHEN 'leader' THEN 1 
                    WHEN 'officer' THEN 2 
                    ELSE 3 
                END,
                cm.contribution_points DESC`,
            [clanId]
        );
        
        return {
            ...clan.rows[0],
            members: members.rows
        };
    }
    
    async searchClans(query) {
        const clans = await db.query(
            `SELECT * FROM clans 
             WHERE LOWER(name) LIKE LOWER($1) 
             OR LOWER(tag) LIKE LOWER($1)
             ORDER BY members_count DESC
             LIMIT 20`,
            [`%${query}%`]
        );
        
        return clans.rows;
    }
    
    async promoteMember(clanId, playerId, targetId, newRole) {
        // Verify player has permission
        const permission = await db.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND player_id = $2',
            [clanId, playerId]
        );
        
        if (!permission.rows[0] || permission.rows[0].role !== 'leader') {
            throw new Error('Only clan leaders can promote members');
        }
        
        if (!['officer', 'member'].includes(newRole)) {
            throw new Error('Invalid role');
        }
        
        await db.query(
            'UPDATE clan_members SET role = $1 WHERE clan_id = $2 AND player_id = $3',
            [newRole, clanId, targetId]
        );
        
        return { success: true };
    }
    
    // Chat features
    async sendClanMessage(playerId, message) {
        const membership = await db.query(
            'SELECT clan_id FROM clan_members WHERE player_id = $1',
            [playerId]
        );
        
        if (membership.rows.length === 0) {
            throw new Error('You are not in a clan');
        }
        
        const clanId = membership.rows[0].clan_id;
        
        // Store message in database (optional)
        await db.query(
            'INSERT INTO clan_messages (clan_id, player_id, message) VALUES ($1, $2, $3)',
            [clanId, playerId, message]
        );
        
        return {
            channel: `clan:${clanId}`,
            message: message
        };
    }
    
    // Notification system
    setPlayerSocket(playerId, socketId) {
        this.onlinePlayers.set(playerId, socketId);
    }
    
    removePlayerSocket(playerId) {
        this.onlinePlayers.delete(playerId);
    }
    
    notifyPlayer(playerId, notification) {
        const socketId = this.onlinePlayers.get(playerId);
        if (socketId && global.io) {
            global.io.to(socketId).emit('notification', notification);
        } else {
            // Store notification for later delivery
            this.storeNotification(playerId, notification);
        }
    }
    
    notifyClan(clanId, notification) {
        // Get all online clan members
        db.query(
            'SELECT player_id FROM clan_members WHERE clan_id = $1',
            [clanId]
        ).then(result => {
            result.rows.forEach(member => {
                this.notifyPlayer(member.player_id, notification);
            });
        });
    }
    
    async storeNotification(playerId, notification) {
        await db.query(
            'INSERT INTO player_notifications (player_id, type, data, read) VALUES ($1, $2, $3, false)',
            [playerId, notification.type, JSON.stringify(notification)]
        );
    }
    
    async getUnreadNotifications(playerId) {
        const notifications = await db.query(
            'SELECT * FROM player_notifications WHERE player_id = $1 AND read = false ORDER BY created_at DESC',
            [playerId]
        );
        
        return notifications.rows;
    }
    
    async markNotificationsRead(playerId, notificationIds) {
        await db.query(
            'UPDATE player_notifications SET read = true WHERE player_id = $1 AND id = ANY($2)',
            [playerId, notificationIds]
        );
        
        return { success: true };
    }
}

// Create notification table if needed
const createNotificationTable = `
CREATE TABLE IF NOT EXISTS player_notifications (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    type VARCHAR(50),
    data JSON,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_notifications ON player_notifications(player_id, read);

CREATE TABLE IF NOT EXISTS clan_messages (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER REFERENCES clans(id),
    player_id INTEGER REFERENCES players(id),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

module.exports = new SocialService();