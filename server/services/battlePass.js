// Battle Pass Service
const db = require('../database/connection');

class BattlePassService {
    constructor() {
        this.tiers = 100;
        this.xpPerTier = 1000;
        this.rewards = this.generateRewards();
    }
    
    generateRewards() {
        const rewards = [];
        
        for (let tier = 1; tier <= this.tiers; tier++) {
            const rewardSet = {
                tier: tier,
                free: this.getFreeReward(tier),
                premium: this.getPremiumReward(tier)
            };
            
            rewards.push(rewardSet);
        }
        
        return rewards;
    }
    
    getFreeReward(tier) {
        // Every 5 tiers give coins
        if (tier % 5 === 0) {
            return {
                type: 'coins',
                amount: 50 + (tier * 10),
                icon: '🪙'
            };
        }
        
        // Every 10 tiers give a basic cosmetic
        if (tier % 10 === 0) {
            return {
                type: 'cosmetic',
                itemId: `free_emote_${tier}`,
                rarity: 'common',
                icon: '😊'
            };
        }
        
        // Default: XP boost
        return {
            type: 'xp_boost',
            duration: 3600, // 1 hour
            multiplier: 1.5,
            icon: '⚡'
        };
    }
    
    getPremiumReward(tier) {
        // Tier 1: Instant premium cosmetic
        if (tier === 1) {
            return {
                type: 'cosmetic',
                itemId: 'premium_avatar_golden',
                rarity: 'epic',
                icon: '👑'
            };
        }
        
        // Every 5 tiers: Gems
        if (tier % 5 === 0) {
            const gems = 50 + Math.floor(tier / 10) * 50;
            return {
                type: 'gems',
                amount: gems,
                icon: '💎'
            };
        }
        
        // Every 10 tiers: Exclusive cosmetics
        if (tier % 10 === 0) {
            return {
                type: 'cosmetic',
                itemId: `premium_skin_tier${tier}`,
                rarity: tier >= 50 ? 'legendary' : 'epic',
                icon: '✨'
            };
        }
        
        // Every 25 tiers: Big rewards
        if (tier % 25 === 0) {
            return {
                type: 'bundle',
                items: [
                    { type: 'gems', amount: 500 },
                    { type: 'cosmetic', itemId: `exclusive_effect_${tier}`, rarity: 'legendary' },
                    { type: 'xp_boost', duration: 86400, multiplier: 2.0 }
                ],
                icon: '🎁'
            };
        }
        
        // Default premium rewards
        const rewardTypes = [
            { type: 'coins', amount: 100 + (tier * 20), icon: '🪙' },
            { type: 'emote', itemId: `emote_tier${tier}`, icon: '😎' },
            { type: 'victory_pose', itemId: `pose_tier${tier}`, icon: '🏆' }
        ];
        
        return rewardTypes[tier % rewardTypes.length];
    }
    
    async getCurrentSeason() {
        const season = await db.query(
            'SELECT * FROM battle_pass_seasons WHERE start_date <= NOW() AND end_date >= NOW() LIMIT 1'
        );
        
        return season.rows[0];
    }
    
    async getPlayerProgress(playerId, seasonId) {
        const progress = await db.query(
            'SELECT * FROM battle_pass_progress WHERE player_id = $1 AND season_id = $2',
            [playerId, seasonId]
        );
        
        if (progress.rows.length === 0) {
            // Create new progress entry
            await db.query(
                'INSERT INTO battle_pass_progress (player_id, season_id) VALUES ($1, $2)',
                [playerId, seasonId]
            );
            
            return {
                tier: 1,
                experience: 0,
                is_premium: false,
                claimed_rewards: []
            };
        }
        
        return progress.rows[0];
    }
    
    async grantExperience(playerId, amount, reason) {
        const season = await this.getCurrentSeason();
        if (!season) return;
        
        const progress = await this.getPlayerProgress(playerId, season.id);
        
        // Apply any active XP boosts
        const boostMultiplier = await this.getActiveBoostMultiplier(playerId);
        const boostedAmount = Math.floor(amount * boostMultiplier);
        
        // Calculate new tier and XP
        let newExperience = progress.experience + boostedAmount;
        let newTier = progress.tier;
        
        while (newExperience >= this.xpPerTier && newTier < this.tiers) {
            newExperience -= this.xpPerTier;
            newTier++;
        }
        
        // Update progress
        await db.query(
            'UPDATE battle_pass_progress SET tier = $1, experience = $2 WHERE player_id = $3 AND season_id = $4',
            [newTier, newExperience, playerId, season.id]
        );
        
        // Check for newly unlocked rewards
        const unlockedRewards = [];
        for (let tier = progress.tier + 1; tier <= newTier; tier++) {
            const tierRewards = this.rewards[tier - 1];
            
            unlockedRewards.push({
                tier: tier,
                free: tierRewards.free,
                premium: progress.is_premium ? tierRewards.premium : null
            });
        }
        
        return {
            previousTier: progress.tier,
            newTier: newTier,
            experience: newExperience,
            xpGained: boostedAmount,
            unlockedRewards: unlockedRewards,
            reason: reason
        };
    }
    
    async claimReward(playerId, seasonId, tier, rewardType) {
        const progress = await this.getPlayerProgress(playerId, seasonId);
        
        // Check if tier is unlocked
        if (progress.tier < tier) {
            throw new Error('Tier not yet unlocked');
        }
        
        // Check if premium reward and player has premium
        if (rewardType === 'premium' && !progress.is_premium) {
            throw new Error('Premium battle pass required');
        }
        
        // Check if already claimed
        const claimedKey = `${tier}_${rewardType}`;
        if (progress.claimed_rewards.includes(claimedKey)) {
            throw new Error('Reward already claimed');
        }
        
        // Get reward data
        const reward = this.rewards[tier - 1][rewardType];
        
        try {
            await db.query('BEGIN');
            
            // Grant reward based on type
            await this.grantReward(playerId, reward);
            
            // Update claimed rewards
            await db.query(
                `UPDATE battle_pass_progress 
                 SET claimed_rewards = array_append(claimed_rewards, $1) 
                 WHERE player_id = $2 AND season_id = $3`,
                [claimedKey, playerId, seasonId]
            );
            
            await db.query('COMMIT');
            
            return {
                success: true,
                reward: reward
            };
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }
    
    async grantReward(playerId, reward) {
        switch (reward.type) {
            case 'coins':
                await db.query(
                    'UPDATE players SET coins = coins + $1 WHERE id = $2',
                    [reward.amount, playerId]
                );
                break;
                
            case 'gems':
                await db.query(
                    'UPDATE players SET gems = gems + $1 WHERE id = $2',
                    [reward.amount, playerId]
                );
                break;
                
            case 'cosmetic':
            case 'emote':
            case 'victory_pose':
                await db.query(
                    'INSERT INTO inventory (player_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [playerId, reward.itemId]
                );
                break;
                
            case 'xp_boost':
                await this.grantXPBoost(playerId, reward.duration, reward.multiplier);
                break;
                
            case 'bundle':
                for (const item of reward.items) {
                    await this.grantReward(playerId, item);
                }
                break;
        }
    }
    
    async grantXPBoost(playerId, duration, multiplier) {
        const expiresAt = new Date(Date.now() + duration * 1000);
        
        await db.query(
            `INSERT INTO player_boosts (player_id, boost_type, multiplier, expires_at) 
             VALUES ($1, $2, $3, $4)`,
            [playerId, 'xp', multiplier, expiresAt]
        );
    }
    
    async getActiveBoostMultiplier(playerId) {
        const boosts = await db.query(
            `SELECT multiplier FROM player_boosts 
             WHERE player_id = $1 
             AND boost_type = 'xp' 
             AND expires_at > NOW()`,
            [playerId]
        );
        
        if (boosts.rows.length === 0) return 1.0;
        
        // Multiply all active boosts
        return boosts.rows.reduce((total, boost) => total * boost.multiplier, 1.0);
    }
    
    async getSeasonInfo(seasonId) {
        const season = await db.query(
            'SELECT * FROM battle_pass_seasons WHERE id = $1',
            [seasonId]
        );
        
        if (!season.rows[0]) return null;
        
        const daysRemaining = Math.ceil(
            (new Date(season.rows[0].end_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        return {
            ...season.rows[0],
            daysRemaining: Math.max(0, daysRemaining),
            rewards: this.rewards,
            totalTiers: this.tiers
        };
    }
    
    // XP Grant amounts for different activities
    getXPForActivity(activity, data = {}) {
        const xpValues = {
            match_win: 100,
            match_loss: 40,
            perfect_victory: 50,  // Bonus for 3-0
            first_win_daily: 200,
            tournament_participation: 150,
            tournament_win: 500,
            achievement_unlock: 100,
            daily_login: 50,
            friend_referral: 300,
            purchase_made: 200
        };
        
        let baseXP = xpValues[activity] || 0;
        
        // Apply modifiers
        if (activity === 'match_win' && data.winStreak) {
            baseXP += Math.min(data.winStreak * 10, 100); // Up to 100 bonus for streaks
        }
        
        if (activity === 'tournament_win' && data.tournamentSize) {
            baseXP = baseXP * Math.log2(data.tournamentSize); // More XP for bigger tournaments
        }
        
        return Math.floor(baseXP);
    }
    
    async createNewSeason(seasonNumber, name, startDate, endDate) {
        const season = await db.query(
            `INSERT INTO battle_pass_seasons (season_number, name, start_date, end_date) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [seasonNumber, name, startDate, endDate]
        );
        
        return season.rows[0];
    }
}

// Create table for XP boosts if not exists
const createBoostTable = `
CREATE TABLE IF NOT EXISTS player_boosts (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    boost_type VARCHAR(20),
    multiplier DECIMAL(3,1),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_boosts ON player_boosts(player_id, expires_at);
`;

module.exports = new BattlePassService();