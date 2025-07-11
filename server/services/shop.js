// Shop Service
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database/connection');

class ShopService {
    constructor() {
        this.shopItems = new Map();
        this.gemPackages = [
            { id: 'gems_starter', gems: 500, price: 4.99, bonus: 0 },
            { id: 'gems_popular', gems: 1200, price: 9.99, bonus: 20 },
            { id: 'gems_value', gems: 2500, price: 19.99, bonus: 25 },
            { id: 'gems_mega', gems: 7500, price: 49.99, bonus: 50 },
            { id: 'gems_ultra', gems: 20000, price: 99.99, bonus: 100 }
        ];
        
        this.loadShopItems();
    }
    
    async loadShopItems() {
        try {
            const items = await db.query('SELECT * FROM shop_items WHERE available = true');
            items.rows.forEach(item => {
                this.shopItems.set(item.id, item);
            });
        } catch (error) {
            console.error('Error loading shop items:', error);
        }
    }
    
    async purchaseItem(playerId, itemId, currency) {
        const item = this.shopItems.get(itemId);
        if (!item) {
            throw new Error('Item not found');
        }
        
        // Check if player already owns the item
        const ownership = await db.query(
            'SELECT * FROM inventory WHERE player_id = $1 AND item_id = $2',
            [playerId, itemId]
        );
        
        if (ownership.rows.length > 0) {
            throw new Error('Item already owned');
        }
        
        // Get player's current balance
        const player = await db.query(
            'SELECT coins, gems FROM players WHERE id = $1',
            [playerId]
        );
        
        if (!player.rows[0]) {
            throw new Error('Player not found');
        }
        
        const balance = player.rows[0];
        const price = currency === 'coins' ? item.price_coins : item.price_gems;
        
        if (!price) {
            throw new Error(`Item cannot be purchased with ${currency}`);
        }
        
        if (balance[currency] < price) {
            throw new Error(`Insufficient ${currency}`);
        }
        
        // Process purchase
        try {
            await db.query('BEGIN');
            
            // Deduct currency
            await db.query(
                `UPDATE players SET ${currency} = ${currency} - $1 WHERE id = $2`,
                [price, playerId]
            );
            
            // Add item to inventory
            await db.query(
                'INSERT INTO inventory (player_id, item_id) VALUES ($1, $2)',
                [playerId, itemId]
            );
            
            // Log transaction
            await db.query(
                'INSERT INTO transactions (player_id, type, currency, amount, item_id, description) VALUES ($1, $2, $3, $4, $5, $6)',
                [playerId, 'purchase', currency, -price, itemId, `Purchased ${item.name}`]
            );
            
            await db.query('COMMIT');
            
            // Return updated balance
            const newBalance = await db.query(
                'SELECT coins, gems FROM players WHERE id = $1',
                [playerId]
            );
            
            return {
                success: true,
                item: item,
                newBalance: newBalance.rows[0]
            };
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }
    
    async purchaseGems(playerId, packageId, paymentMethodId) {
        const gemPackage = this.gemPackages.find(p => p.id === packageId);
        if (!gemPackage) {
            throw new Error('Invalid gem package');
        }
        
        try {
            // Create Stripe payment intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(gemPackage.price * 100), // Convert to cents
                currency: 'usd',
                customer: await this.getOrCreateStripeCustomer(playerId),
                payment_method: paymentMethodId,
                confirm: true,
                metadata: {
                    playerId: playerId.toString(),
                    packageId: packageId,
                    gems: gemPackage.gems.toString()
                }
            });
            
            if (paymentIntent.status === 'succeeded') {
                // Add gems to player account
                const totalGems = gemPackage.gems + Math.floor(gemPackage.gems * (gemPackage.bonus / 100));
                
                await db.query('BEGIN');
                
                await db.query(
                    'UPDATE players SET gems = gems + $1 WHERE id = $2',
                    [totalGems, playerId]
                );
                
                await db.query(
                    'INSERT INTO transactions (player_id, type, currency, amount, description, stripe_payment_id) VALUES ($1, $2, $3, $4, $5, $6)',
                    [playerId, 'purchase', 'usd', gemPackage.price, `Purchased ${totalGems} gems`, paymentIntent.id]
                );
                
                await db.query('COMMIT');
                
                return {
                    success: true,
                    gems: totalGems,
                    transactionId: paymentIntent.id
                };
            } else {
                throw new Error('Payment failed');
            }
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }
    
    async getOrCreateStripeCustomer(playerId) {
        const player = await db.query(
            'SELECT email, stripe_customer_id FROM players WHERE id = $1',
            [playerId]
        );
        
        if (player.rows[0].stripe_customer_id) {
            return player.rows[0].stripe_customer_id;
        }
        
        // Create new Stripe customer
        const customer = await stripe.customers.create({
            email: player.rows[0].email,
            metadata: {
                playerId: playerId.toString()
            }
        });
        
        // Save customer ID
        await db.query(
            'UPDATE players SET stripe_customer_id = $1 WHERE id = $2',
            [customer.id, playerId]
        );
        
        return customer.id;
    }
    
    async purchaseBattlePass(playerId, seasonId) {
        const season = await db.query(
            'SELECT * FROM battle_pass_seasons WHERE id = $1 AND start_date <= NOW() AND end_date >= NOW()',
            [seasonId]
        );
        
        if (!season.rows[0]) {
            throw new Error('Battle pass season not available');
        }
        
        // Check if already purchased
        const existing = await db.query(
            'SELECT * FROM battle_pass_progress WHERE player_id = $1 AND season_id = $2 AND is_premium = true',
            [playerId, seasonId]
        );
        
        if (existing.rows.length > 0) {
            throw new Error('Battle pass already purchased');
        }
        
        const price = season.rows[0].price_usd;
        
        // Process payment (simplified for demo)
        try {
            await db.query('BEGIN');
            
            // Create or update battle pass progress
            await db.query(
                `INSERT INTO battle_pass_progress (player_id, season_id, is_premium) 
                 VALUES ($1, $2, true) 
                 ON CONFLICT (player_id, season_id) 
                 DO UPDATE SET is_premium = true`,
                [playerId, seasonId]
            );
            
            await db.query(
                'INSERT INTO transactions (player_id, type, currency, amount, description) VALUES ($1, $2, $3, $4, $5)',
                [playerId, 'purchase', 'usd', price, `Battle Pass Season ${season.rows[0].season_number}`]
            );
            
            await db.query('COMMIT');
            
            return {
                success: true,
                seasonId: seasonId,
                message: 'Battle pass activated!'
            };
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }
    
    async getShopData() {
        return {
            featured: await this.getFeaturedItems(),
            categories: {
                avatars: await this.getItemsByType('avatar'),
                emotes: await this.getItemsByType('emote'),
                effects: await this.getItemsByType('effect'),
                skins: await this.getItemsByType('skin')
            },
            gemPackages: this.gemPackages,
            dailyDeals: await this.getDailyDeals()
        };
    }
    
    async getFeaturedItems() {
        const items = await db.query(
            'SELECT * FROM shop_items WHERE available = true AND rarity IN ($1, $2) ORDER BY created_at DESC LIMIT 6',
            ['epic', 'legendary']
        );
        return items.rows;
    }
    
    async getItemsByType(type) {
        const items = await db.query(
            'SELECT * FROM shop_items WHERE available = true AND item_type = $1 ORDER BY price_coins ASC',
            [type]
        );
        return items.rows;
    }
    
    async getDailyDeals() {
        // In production, implement rotating daily deals
        const deals = await db.query(
            `SELECT * FROM shop_items 
             WHERE available = true 
             ORDER BY RANDOM() 
             LIMIT 3`
        );
        
        // Apply discount
        return deals.rows.map(item => ({
            ...item,
            discount: 20 + Math.floor(Math.random() * 30), // 20-50% off
            originalPriceCoins: item.price_coins,
            price_coins: Math.floor(item.price_coins * 0.7)
        }));
    }
    
    async equipItem(playerId, itemId) {
        // Check ownership
        const ownership = await db.query(
            'SELECT * FROM inventory WHERE player_id = $1 AND item_id = $2',
            [playerId, itemId]
        );
        
        if (ownership.rows.length === 0) {
            throw new Error('Item not owned');
        }
        
        const item = this.shopItems.get(itemId);
        if (!item) {
            throw new Error('Item not found');
        }
        
        try {
            await db.query('BEGIN');
            
            // Unequip other items of same type
            await db.query(
                `UPDATE inventory i 
                 SET equipped = false 
                 WHERE i.player_id = $1 
                 AND i.item_id IN (
                     SELECT id FROM shop_items WHERE item_type = $2
                 )`,
                [playerId, item.item_type]
            );
            
            // Equip selected item
            await db.query(
                'UPDATE inventory SET equipped = true WHERE player_id = $1 AND item_id = $2',
                [playerId, itemId]
            );
            
            // Update player avatar if it's an avatar item
            if (item.item_type === 'avatar') {
                await db.query(
                    'UPDATE players SET avatar_id = $1 WHERE id = $2',
                    [itemId, playerId]
                );
            }
            
            await db.query('COMMIT');
            
            return { success: true, equipped: itemId };
            
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    }
    
    async getPlayerInventory(playerId) {
        const inventory = await db.query(
            `SELECT i.*, s.* 
             FROM inventory i 
             JOIN shop_items s ON i.item_id = s.id 
             WHERE i.player_id = $1 
             ORDER BY i.purchased_at DESC`,
            [playerId]
        );
        
        return inventory.rows;
    }
}

module.exports = new ShopService();