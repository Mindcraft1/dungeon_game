import { TILE_SIZE, PROJECTILE_MAX_LIFETIME, BOSS_ROCKET_EXPLOSION_RADIUS, BOSS_ROCKET_EXPLOSION_LINGER } from '../constants.js';
import { isWall } from '../collision.js';

export class Projectile {
    constructor(x, y, dirX, dirY, speed, damage, radius, color) {
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = speed;
        this.damage = damage;
        this.radius = radius;
        this.color = color;
        this.dead = false;
        this.lifetime = 0;
    }

    update(dt, player, grid, trainingMode) {
        if (this.dead) return;

        this.lifetime += dt * 1000;
        if (this.lifetime > PROJECTILE_MAX_LIFETIME) {
            this.dead = true;
            return;
        }

        this.x += this.dirX * this.speed * dt;
        this.y += this.dirY * this.speed * dt;

        // Wall collision
        const col = Math.floor(this.x / TILE_SIZE);
        const row = Math.floor(this.y / TILE_SIZE);
        if (isWall(grid, col, row)) {
            this.dead = true;
            return;
        }

        // Player collision (skipped in training)
        if (!trainingMode) {
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            if (dx * dx + dy * dy < (this.radius + player.radius) ** 2) {
                player.takeDamage(this.damage);
                this.dead = true;
            }
        }
    }

    render(ctx) {
        if (this.dead) return;

        // Glow
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bright center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Player-fired dagger projectile — collides with enemies/boss, not with the player.
 * Has a max travel distance, knockback, and dagger-shaped rendering.
 */
export class PlayerProjectile {
    constructor(x, y, dirX, dirY, speed, damage, radius, color, maxDist, knockback) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = speed;
        this.damage = damage;
        this.radius = radius;
        this.color = color;
        this.maxDist = maxDist;
        this.knockback = knockback;
        this.dead = false;
        this.hitTarget = null; // set when hitting an enemy (for particles)
        this.bossDamageMultiplier = 1; // meta relic: Boss Hunter
    }

    update(dt, enemies, boss, grid) {
        if (this.dead) return;

        this.x += this.dirX * this.speed * dt;
        this.y += this.dirY * this.speed * dt;

        // Max distance check
        const dx = this.x - this.startX;
        const dy = this.y - this.startY;
        if (dx * dx + dy * dy > this.maxDist * this.maxDist) {
            this.dead = true;
            return;
        }

        // Wall collision
        const col = Math.floor(this.x / TILE_SIZE);
        const row = Math.floor(this.y / TILE_SIZE);
        if (isWall(grid, col, row)) {
            this.dead = true;
            return;
        }

        // Enemy collision
        for (const e of enemies) {
            if (e.dead) continue;
            const ex = this.x - e.x;
            const ey = this.y - e.y;
            if (ex * ex + ey * ey < (this.radius + e.radius) ** 2) {
                const dist = Math.sqrt(ex * ex + ey * ey) || 1;
                const kbX = (ex / dist) * this.knockback;
                const kbY = (ey / dist) * this.knockback;
                e.takeDamage(this.damage, kbX, kbY);
                this.hitTarget = { x: e.x, y: e.y, dirX: this.dirX, dirY: this.dirY, entity: e };
                this.dead = true;
                return;
            }
        }

        // Boss collision
        if (boss && !boss.dead) {
            const bx = this.x - boss.x;
            const by = this.y - boss.y;
            if (bx * bx + by * by < (this.radius + boss.radius) ** 2) {
                const dist = Math.sqrt(bx * bx + by * by) || 1;
                const kbX = (bx / dist) * this.knockback;
                const kbY = (by / dist) * this.knockback;
                const bossDmg = this.bossDamageMultiplier > 1
                    ? Math.floor(this.damage * this.bossDamageMultiplier)
                    : this.damage;
                boss.takeDamage(bossDmg, kbX, kbY);
                this.hitTarget = { x: boss.x, y: boss.y, dirX: this.dirX, dirY: this.dirY, entity: boss };
                this.dead = true;
                return;
            }
        }
    }

    render(ctx) {
        if (this.dead) return;

        const angle = Math.atan2(this.dirY, this.dirX);

        // Trailing glow
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(
            this.x - this.dirX * 6,
            this.y - this.dirY * 6,
            this.radius * 2, 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();

        // Dagger shape: elongated triangle pointing in travel direction
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Outer glow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.radius * 2.2, 0);
        ctx.lineTo(-this.radius * 1.2, -this.radius * 1.0);
        ctx.lineTo(-this.radius * 1.2, this.radius * 1.0);
        ctx.closePath();
        ctx.fill();

        // Core dagger
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(this.radius * 1.8, 0);
        ctx.lineTo(-this.radius * 0.8, -this.radius * 0.5);
        ctx.lineTo(-this.radius * 0.8, this.radius * 0.5);
        ctx.closePath();
        ctx.fill();

        // Cyan tint overlay
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.restore();
    }
}

/**
 * Rocket projectile — heavy, slower projectile that explodes on impact.
 * On hit (wall or lifetime), spawns an Explosion zone that lingers and deals area damage.
 */
export class RocketProjectile {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} dirX
     * @param {number} dirY
     * @param {number} speed
     * @param {number} damage       – direct hit damage
     * @param {number} splashDamage – explosion zone damage per tick
     * @param {number} radius       – projectile collision radius
     * @param {string} color
     */
    constructor(x, y, dirX, dirY, speed, damage, splashDamage, radius, color) {
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = speed;
        this.damage = damage;
        this.splashDamage = splashDamage;
        this.radius = radius;
        this.color = color;
        this.dead = false;
        this.lifetime = 0;
        this.isRocket = true;

        // Smoke trail timer
        this._trailTimer = 0;

        // Explosion result (consumed by game.js)
        this.pendingExplosion = null;
    }

    update(dt, player, grid, trainingMode) {
        if (this.dead) return;

        const ms = dt * 1000;
        this.lifetime += ms;
        if (this.lifetime > PROJECTILE_MAX_LIFETIME) {
            this._explode();
            return;
        }

        this.x += this.dirX * this.speed * dt;
        this.y += this.dirY * this.speed * dt;

        // Trail timer
        this._trailTimer += ms;

        // Wall collision → explode
        const col = Math.floor(this.x / TILE_SIZE);
        const row = Math.floor(this.y / TILE_SIZE);
        if (isWall(grid, col, row)) {
            // Push back slightly so explosion center is on the floor tile
            this.x -= this.dirX * this.radius;
            this.y -= this.dirY * this.radius;
            this._explode();
            return;
        }

        // Direct hit on player (skipped in training)
        if (!trainingMode) {
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            if (dx * dx + dy * dy < (this.radius + player.radius) ** 2) {
                player.takeDamage(this.damage);
                this._explode();
                return;
            }
        }
    }

    _explode() {
        this.dead = true;
        this.pendingExplosion = {
            x: this.x,
            y: this.y,
            radius: BOSS_ROCKET_EXPLOSION_RADIUS,
            damage: this.splashDamage,
            linger: BOSS_ROCKET_EXPLOSION_LINGER,
            color: this.color,
        };
    }

    render(ctx) {
        if (this.dead) return;

        const angle = Math.atan2(this.dirY, this.dirX);

        // Smoke trail
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(
            this.x - this.dirX * 14,
            this.y - this.dirY * 14,
            this.radius * 1.8, 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        ctx.arc(
            this.x - this.dirX * 26,
            this.y - this.dirY * 26,
            this.radius * 1.2, 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();

        // Glow (bigger than normal projectiles)
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Rocket body (elongated shape)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);

        // Tail flame
        ctx.fillStyle = '#ff4400';
        ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.03) * 0.2;
        ctx.beginPath();
        ctx.moveTo(-this.radius * 1.5, -this.radius * 0.6);
        ctx.lineTo(-this.radius * 3, 0);
        ctx.lineTo(-this.radius * 1.5, this.radius * 0.6);
        ctx.closePath();
        ctx.fill();

        // Body
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.radius * 2, 0);
        ctx.lineTo(-this.radius * 1.2, -this.radius * 0.8);
        ctx.lineTo(-this.radius * 1.2, this.radius * 0.8);
        ctx.closePath();
        ctx.fill();

        // Warhead highlight
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(this.radius * 2, 0);
        ctx.lineTo(this.radius * 0.5, -this.radius * 0.3);
        ctx.lineTo(this.radius * 0.5, this.radius * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

/**
 * Explosion zone — lingering AoE damage area left by rocket impacts.
 * Pulses visually, damages player each tick while standing in it.
 */
export class Explosion {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {number} damage     – damage per tick
     * @param {number} linger     – total duration ms
     * @param {string} color
     */
    constructor(x, y, radius, damage, linger, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.damage = damage;
        this.maxLinger = linger;
        this.lingerTimer = linger;
        this.color = color;
        this.dead = false;
        this.tickTimer = 0;
        this.tickInterval = 300;  // damage every 300ms while standing in it
        this.hitPlayer = false;   // visual feedback
    }

    update(dt, player, trainingMode) {
        if (this.dead) return;

        const ms = dt * 1000;
        this.lingerTimer -= ms;
        if (this.lingerTimer <= 0) {
            this.dead = true;
            return;
        }

        this.tickTimer -= ms;

        // Damage player if inside zone
        if (!trainingMode) {
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.radius + player.radius) {
                if (this.tickTimer <= 0) {
                    player.takeDamage(this.damage);
                    this.tickTimer = this.tickInterval;
                    this.hitPlayer = true;
                }
            }
        }
    }

    render(ctx) {
        if (this.dead) return;

        const progress = 1 - this.lingerTimer / this.maxLinger; // 0→1
        const fadeAlpha = Math.max(0, 1 - progress * 1.2);
        const pulse = Math.sin(Date.now() * 0.012) * 0.12;

        // Outer warning ring (pulsing)
        ctx.save();
        ctx.globalAlpha = (0.15 + pulse) * fadeAlpha;
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Fill zone
        ctx.save();
        ctx.globalAlpha = (0.12 + pulse * 0.5) * fadeAlpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Inner fire glow
        ctx.save();
        ctx.globalAlpha = (0.2 + pulse) * fadeAlpha;
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Core hot spot
        ctx.save();
        ctx.globalAlpha = (0.3 + pulse) * fadeAlpha;
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Hit flash
        if (this.hitPlayer) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            this.hitPlayer = false;
        }
    }
}
