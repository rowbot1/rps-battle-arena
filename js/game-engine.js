// Game Engine for RPS Battle Arena

class Entity {
    constructor(type, x, y, arena) {
        this.type = type; // 'rock', 'paper', 'scissors'
        this.x = x;
        this.y = y;
        this.arena = arena;
        this.radius = 8;
        this.speed = 1 + Math.random() * 0.5;
        this.direction = Math.random() * Math.PI * 2;
        this.alive = true;
        this.wins = 0;
        this.battles = 0;
        
        // Visual properties
        this.scale = 1;
        this.rotation = 0;
        this.alpha = 1;
        this.targetScale = 1;
        
        // Movement properties
        this.vx = Math.cos(this.direction) * this.speed;
        this.vy = Math.sin(this.direction) * this.speed;
        this.wanderAngle = 0;
        
        // Battle properties
        this.battling = false;
        this.battleCooldown = 0;
        this.victoryAnimation = 0;
    }
    
    update(deltaTime) {
        if (!this.alive) return;
        
        // Update battle cooldown
        if (this.battleCooldown > 0) {
            this.battleCooldown -= deltaTime;
        }
        
        // Wander movement
        this.wanderAngle += (Math.random() - 0.5) * 0.3;
        this.direction += Math.sin(this.wanderAngle) * 0.05;
        
        // Update velocity
        this.vx = Math.cos(this.direction) * this.speed;
        this.vy = Math.sin(this.direction) * this.speed;
        
        // Move
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        
        // Bounce off walls
        if (this.x - this.radius < 0 || this.x + this.radius > this.arena.width) {
            this.vx = -this.vx;
            this.direction = Math.atan2(this.vy, this.vx);
            this.x = Math.max(this.radius, Math.min(this.arena.width - this.radius, this.x));
        }
        
        if (this.y - this.radius < 0 || this.y + this.radius > this.arena.height) {
            this.vy = -this.vy;
            this.direction = Math.atan2(this.vy, this.vx);
            this.y = Math.max(this.radius, Math.min(this.arena.height - this.radius, this.y));
        }
        
        // Update visual effects
        this.rotation += 0.02;
        this.scale += (this.targetScale - this.scale) * 0.1;
        
        if (this.victoryAnimation > 0) {
            this.victoryAnimation -= deltaTime;
            this.targetScale = 1 + Math.sin(this.victoryAnimation * 10) * 0.2;
        } else {
            this.targetScale = 1;
        }
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        // Check if performance mode is enabled
        const isPerformanceMode = this.arena.performanceMode;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (!isPerformanceMode) {
            ctx.rotate(this.rotation);
            ctx.scale(this.scale, this.scale);
            ctx.globalAlpha = this.alpha;
            
            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(2, 2, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Simple colored circles in performance mode
        const colors = {
            rock: '#8b4513',
            paper: '#f5f5dc',
            scissors: '#7c4dff'  // Purple for better contrast
        };
        
        ctx.fillStyle = colors[this.type];
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add contrasting outline for scissors
        if (this.type === 'scissors') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw icon (simplified in performance mode)
        if (!isPerformanceMode || this.victoryAnimation > 0) {
            if (this.type === 'scissors') {
                // Enhanced custom scissors drawing
                ctx.save();
                
                // White background circle for contrast
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                // Main scissors color
                const scissorColor = '#4a148c';  // Deep purple
                
                // Draw more detailed scissors
                ctx.strokeStyle = scissorColor;
                ctx.fillStyle = scissorColor;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                // Left blade
                ctx.beginPath();
                ctx.moveTo(-1, 0);
                ctx.lineTo(-6, -5);
                ctx.lineTo(-5, -6);
                ctx.lineTo(0, -1);
                ctx.closePath();
                ctx.fill();
                
                // Right blade  
                ctx.beginPath();
                ctx.moveTo(1, 0);
                ctx.lineTo(6, -5);
                ctx.lineTo(5, -6);
                ctx.lineTo(0, -1);
                ctx.closePath();
                ctx.fill();
                
                // Handles
                ctx.strokeStyle = scissorColor;
                ctx.lineWidth = 1.5;
                
                // Left handle
                ctx.beginPath();
                ctx.arc(-2, 3, 2.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fill();
                
                // Right handle
                ctx.strokeStyle = scissorColor;
                ctx.beginPath();
                ctx.arc(2, 3, 2.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fill();
                
                // Center screw
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Highlight
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(-5, -5);
                ctx.lineTo(-4, -6);
                ctx.stroke();
                
                ctx.restore();
            } else {
                // Use emojis for rock and paper
                ctx.font = `${this.radius * 1.5}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const emojis = {
                    rock: '🪨',
                    paper: '📄'
                };
                ctx.fillText(emojis[this.type], 0, 0);
            }
        }
        
        ctx.restore();
    }
    
    checkCollision(other) {
        if (!this.alive || !other.alive) return false;
        if (this.battleCooldown > 0 || other.battleCooldown > 0) return false;
        
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (this.radius + other.radius);
    }
    
    battle(other) {
        if (this.type === other.type) return; // Same type, no battle
        
        const rules = {
            rock: 'scissors',
            paper: 'rock',
            scissors: 'paper'
        };
        
        let winner, loser;
        
        if (rules[this.type] === other.type) {
            winner = this;
            loser = other;
        } else {
            winner = other;
            loser = this;
        }
        
        // Update stats
        winner.wins++;
        winner.battles++;
        loser.battles++;
        
        // Visual effects
        winner.victoryAnimation = 1;
        winner.battleCooldown = 1;
        
        // Convert loser
        loser.type = winner.type;
        loser.battleCooldown = 2;
        
        // Particle effect at battle location
        this.arena.createBattleEffect(
            (this.x + other.x) / 2,
            (this.y + other.y) / 2,
            winner.type
        );
        
        return winner;
    }
}

class BattleArena {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.entities = [];
        this.particles = [];
        this.roundTime = 120; // 2 minutes
        this.currentRound = 1;
        this.isPaused = false;
        this.performanceMode = false; // Low performance mode
        this.stats = {
            rock: 0,
            paper: 0,
            scissors: 0
        };
        
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;
        
        this.resizeCanvas();
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Auto-detect performance issues
        this.checkPerformance();
    }
    
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        console.log('Resizing canvas, parent rect:', rect);
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = rect.width;
        this.height = rect.height;
        console.log('Canvas resized to:', this.width, 'x', this.height);
    }
    
    initialize() {
        this.entities = [];
        this.particles = [];
        
        // Create 100 of each type
        const types = ['rock', 'paper', 'scissors'];
        const spacing = 50;
        
        types.forEach((type, typeIndex) => {
            for (let i = 0; i < 100; i++) {
                const angle = (i / 100) * Math.PI * 2;
                const radius = 100 + Math.random() * 50;
                const centerX = this.width / 2 + (typeIndex - 1) * spacing;
                const centerY = this.height / 2;
                
                const x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 100;
                const y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 100;
                
                // Ensure entities start within bounds
                const entity = new Entity(
                    type,
                    Math.max(20, Math.min(this.width - 20, x)),
                    Math.max(20, Math.min(this.height - 20, y)),
                    this
                );
                
                this.entities.push(entity);
            }
        });
        
        this.updateStats();
    }
    
    update(deltaTime) {
        if (this.isPaused) return;
        
        // Update round timer
        this.roundTime -= deltaTime;
        if (this.roundTime <= 0) {
            this.endRound();
            return;
        }
        
        // Update entities
        this.entities.forEach(entity => entity.update(deltaTime));
        
        // Spatial partitioning for collision detection optimization
        const gridSize = 100;
        const grid = {};
        
        // Place entities in grid cells
        this.entities.forEach(entity => {
            const gridX = Math.floor(entity.x / gridSize);
            const gridY = Math.floor(entity.y / gridSize);
            const key = `${gridX},${gridY}`;
            
            if (!grid[key]) grid[key] = [];
            grid[key].push(entity);
        });
        
        // Only check collisions within same and adjacent cells
        Object.values(grid).forEach(cellEntities => {
            for (let i = 0; i < cellEntities.length; i++) {
                for (let j = i + 1; j < cellEntities.length; j++) {
                    const entity1 = cellEntities[i];
                    const entity2 = cellEntities[j];
                    
                    if (entity1.checkCollision(entity2)) {
                        entity1.battle(entity2);
                    }
                }
            }
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.life -= deltaTime;
            particle.y -= particle.speed;
            particle.x += particle.vx;
            particle.alpha = particle.life;
            return particle.life > 0;
        });
        
        this.updateStats();
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Debug: Draw test text
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Entities: ${this.entities.length}`, 10, 30);
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 60);
        this.ctx.fillText(`Round: ${this.currentRound}`, 10, 90);
        
        // Skip grid in performance mode
        if (!this.performanceMode) {
            // Draw grid
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            this.ctx.lineWidth = 1;
            const gridSize = 50;
            
            for (let x = 0; x < this.width; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.height);
                this.ctx.stroke();
            }
            
            for (let y = 0; y < this.height; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.width, y);
                this.ctx.stroke();
            }
        }
        
        // Draw entities
        this.entities.forEach(entity => entity.draw(this.ctx));
        
        // Draw particles (skip in performance mode)
        if (!this.performanceMode) {
            this.particles.forEach(particle => {
                this.ctx.save();
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
                this.ctx.restore();
            });
        }
    }
    
    createBattleEffect(x, y, winnerType) {
        const colors = {
            rock: '#8b4513',
            paper: '#f5f5dc',
            scissors: '#7c4dff'  // Purple particles for scissors
        };
        
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 2 + Math.random() * 2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                speed: Math.sin(angle) * speed + 1,
                life: 1,
                alpha: 1,
                color: colors[winnerType]
            });
        }
    }
    
    updateStats() {
        this.stats = {
            rock: 0,
            paper: 0,
            scissors: 0
        };
        
        this.entities.forEach(entity => {
            if (entity.alive) {
                this.stats[entity.type]++;
            }
        });
        
        // Emit stats update event
        window.dispatchEvent(new CustomEvent('statsUpdate', { detail: this.stats }));
    }
    
    endRound() {
        this.isPaused = true;
        
        // Determine winner
        const winner = Object.keys(this.stats).reduce((a, b) => 
            this.stats[a] > this.stats[b] ? a : b
        );
        
        // Emit round end event
        window.dispatchEvent(new CustomEvent('roundEnd', { 
            detail: { 
                winner: winner, 
                stats: this.stats,
                round: this.currentRound
            } 
        }));
        
        // Start new round after delay
        setTimeout(() => {
            this.currentRound++;
            this.roundTime = 120;
            this.isPaused = false;
            this.initialize();
            
            window.dispatchEvent(new CustomEvent('roundStart', { 
                detail: { round: this.currentRound } 
            }));
        }, 5000);
    }
    
    checkPerformance() {
        let frameCount = 0;
        let lastCheck = performance.now();
        
        const measureFPS = () => {
            frameCount++;
            const now = performance.now();
            
            if (now - lastCheck >= 1000) {
                this.fps = frameCount;
                frameCount = 0;
                lastCheck = now;
                
                // Auto-enable performance mode if FPS drops below 25
                if (this.fps < 25 && !this.performanceMode) {
                    this.enablePerformanceMode();
                }
            }
        };
        
        // Add to update loop
        this._measureFPS = measureFPS;
    }
    
    enablePerformanceMode() {
        this.performanceMode = true;
        console.log('Performance mode enabled - reducing visual effects');
        
        // Reduce entity count to 150 (50 each)
        const types = ['rock', 'paper', 'scissors'];
        const reducedEntities = [];
        
        types.forEach(type => {
            const typeEntities = this.entities.filter(e => e.type === type);
            reducedEntities.push(...typeEntities.slice(0, 50));
        });
        
        this.entities = reducedEntities;
        this.updateStats();
        
        // Notify user
        if (window.uiController) {
            window.uiController.showNotification('Performance mode enabled for smoother gameplay', 'info');
        }
    }
    
    start() {
        console.log('BattleArena starting...');
        console.log('Canvas dimensions:', this.width, 'x', this.height);
        this.initialize();
        console.log('Entities created:', this.entities.length);
        this.animate();
    }
    
    animate() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        
        // FPS measurement
        if (this._measureFPS) this._measureFPS();
        
        // Dynamic FPS limit based on performance mode
        const targetFPS = this.performanceMode ? 24 : 30;
        const minDelta = 1 / targetFPS;
        
        if (deltaTime < minDelta) {
            requestAnimationFrame(() => this.animate());
            return;
        }
        
        this.lastTime = currentTime;
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame(() => this.animate());
    }
}

// Export for use in other modules
window.BattleArena = BattleArena;
window.Entity = Entity;