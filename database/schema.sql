-- RPS Arena Database Schema

-- Players table
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    avatar_id INTEGER DEFAULT 1,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    rank_tier VARCHAR(20) DEFAULT 'Bronze',
    rank_division INTEGER DEFAULT 3,
    elo_rating INTEGER DEFAULT 1000,
    coins INTEGER DEFAULT 1000,
    gems INTEGER DEFAULT 100,
    total_matches INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'offline',
    is_vip BOOLEAN DEFAULT FALSE,
    vip_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT
);

-- Player statistics
CREATE TABLE player_stats (
    player_id INTEGER REFERENCES players(id),
    total_rounds_played INTEGER DEFAULT 0,
    rock_chosen INTEGER DEFAULT 0,
    paper_chosen INTEGER DEFAULT 0,
    scissors_chosen INTEGER DEFAULT 0,
    rock_wins INTEGER DEFAULT 0,
    paper_wins INTEGER DEFAULT 0,
    scissors_wins INTEGER DEFAULT 0,
    perfect_games INTEGER DEFAULT 0,
    comebacks INTEGER DEFAULT 0,
    tournament_wins INTEGER DEFAULT 0,
    battle_royale_wins INTEGER DEFAULT 0,
    PRIMARY KEY (player_id)
);

-- Matches history
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER REFERENCES players(id),
    player2_id INTEGER REFERENCES players(id),
    winner_id INTEGER REFERENCES players(id),
    match_type VARCHAR(20) NOT NULL, -- quick, ranked, tournament
    rounds_played INTEGER,
    player1_score INTEGER,
    player2_score INTEGER,
    duration_seconds INTEGER,
    elo_change INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Round details
CREATE TABLE rounds (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES matches(id),
    round_number INTEGER,
    player1_choice VARCHAR(10),
    player2_choice VARCHAR(10),
    winner_id INTEGER REFERENCES players(id),
    duration_ms INTEGER
);

-- Inventory (cosmetics ownership)
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    item_id INTEGER REFERENCES shop_items(id),
    equipped BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, item_id)
);

-- Shop items
CREATE TABLE shop_items (
    id SERIAL PRIMARY KEY,
    item_type VARCHAR(20) NOT NULL, -- avatar, emote, effect, skin
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
    price_coins INTEGER,
    price_gems INTEGER,
    image_url VARCHAR(255),
    animation_data JSON,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Battle Pass
CREATE TABLE battle_pass_seasons (
    id SERIAL PRIMARY KEY,
    season_number INTEGER UNIQUE NOT NULL,
    name VARCHAR(100),
    start_date DATE,
    end_date DATE,
    price_usd DECIMAL(5,2) DEFAULT 9.99
);

-- Battle Pass Progress
CREATE TABLE battle_pass_progress (
    player_id INTEGER REFERENCES players(id),
    season_id INTEGER REFERENCES battle_pass_seasons(id),
    tier INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT FALSE,
    claimed_rewards JSON DEFAULT '[]',
    PRIMARY KEY (player_id, season_id)
);

-- Tournaments
CREATE TABLE tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- daily, weekly, special
    entry_fee_coins INTEGER DEFAULT 0,
    entry_fee_gems INTEGER DEFAULT 0,
    prize_pool_coins INTEGER DEFAULT 0,
    prize_pool_gems INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 16,
    current_players INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'upcoming',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournament participants
CREATE TABLE tournament_participants (
    tournament_id INTEGER REFERENCES tournaments(id),
    player_id INTEGER REFERENCES players(id),
    placement INTEGER,
    rounds_won INTEGER DEFAULT 0,
    eliminated BOOLEAN DEFAULT FALSE,
    prize_coins INTEGER DEFAULT 0,
    prize_gems INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id, player_id)
);

-- Friends system
CREATE TABLE friendships (
    player_id INTEGER REFERENCES players(id),
    friend_id INTEGER REFERENCES players(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, friend_id),
    CHECK (player_id < friend_id)
);

-- Clans/Guilds
CREATE TABLE clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    tag VARCHAR(5) UNIQUE NOT NULL,
    description TEXT,
    leader_id INTEGER REFERENCES players(id),
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    members_count INTEGER DEFAULT 1,
    max_members INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clan members
CREATE TABLE clan_members (
    clan_id INTEGER REFERENCES clans(id),
    player_id INTEGER REFERENCES players(id),
    role VARCHAR(20) DEFAULT 'member', -- leader, officer, member
    contribution_points INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (clan_id, player_id)
);

-- Daily rewards tracking
CREATE TABLE daily_rewards (
    player_id INTEGER REFERENCES players(id),
    last_claim_date DATE,
    current_streak INTEGER DEFAULT 0,
    total_claims INTEGER DEFAULT 0,
    PRIMARY KEY (player_id)
);

-- Achievements
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    points INTEGER DEFAULT 10,
    gem_reward INTEGER DEFAULT 0,
    category VARCHAR(50)
);

-- Player achievements
CREATE TABLE player_achievements (
    player_id INTEGER REFERENCES players(id),
    achievement_id INTEGER REFERENCES achievements(id),
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    PRIMARY KEY (player_id, achievement_id)
);

-- Leaderboards (cached for performance)
CREATE TABLE leaderboard_cache (
    leaderboard_type VARCHAR(20), -- daily, weekly, monthly, alltime
    player_id INTEGER REFERENCES players(id),
    rank INTEGER,
    score INTEGER,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (leaderboard_type, player_id)
);

-- Transactions log
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    type VARCHAR(20), -- purchase, reward, refund
    currency VARCHAR(10), -- coins, gems, usd
    amount DECIMAL(10,2),
    item_id INTEGER,
    description TEXT,
    stripe_payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_elo ON players(elo_rating DESC);
CREATE INDEX idx_matches_players ON matches(player1_id, player2_id);
CREATE INDEX idx_matches_created ON matches(created_at DESC);
CREATE INDEX idx_inventory_player ON inventory(player_id);
CREATE INDEX idx_leaderboard_cache ON leaderboard_cache(leaderboard_type, score DESC);

-- Create views for common queries
CREATE VIEW player_rankings AS
SELECT 
    id,
    display_name,
    avatar_id,
    level,
    rank_tier,
    rank_division,
    elo_rating,
    wins,
    losses,
    CASE 
        WHEN (wins + losses) > 0 
        THEN ROUND((wins::DECIMAL / (wins + losses)) * 100, 2)
        ELSE 0 
    END as win_rate,
    ROW_NUMBER() OVER (ORDER BY elo_rating DESC) as global_rank
FROM players
WHERE banned = FALSE;

-- Stored procedures
CREATE OR REPLACE FUNCTION update_player_elo(
    p_winner_id INTEGER,
    p_loser_id INTEGER,
    p_match_type VARCHAR
) RETURNS TABLE(winner_elo_change INTEGER, loser_elo_change INTEGER) AS $$
DECLARE
    winner_elo INTEGER;
    loser_elo INTEGER;
    k_factor INTEGER;
    expected_score_winner DECIMAL;
    elo_change INTEGER;
BEGIN
    -- Get current ELO ratings
    SELECT elo_rating INTO winner_elo FROM players WHERE id = p_winner_id;
    SELECT elo_rating INTO loser_elo FROM players WHERE id = p_loser_id;
    
    -- K-factor based on match type
    k_factor := CASE p_match_type
        WHEN 'ranked' THEN 32
        WHEN 'tournament' THEN 40
        ELSE 16
    END;
    
    -- Calculate expected score
    expected_score_winner := 1 / (1 + POWER(10, (loser_elo - winner_elo) / 400.0));
    
    -- Calculate ELO change
    elo_change := ROUND(k_factor * (1 - expected_score_winner));
    
    -- Update ELO ratings
    UPDATE players SET elo_rating = elo_rating + elo_change WHERE id = p_winner_id;
    UPDATE players SET elo_rating = elo_rating - elo_change WHERE id = p_loser_id;
    
    RETURN QUERY SELECT elo_change, -elo_change;
END;
$$ LANGUAGE plpgsql;