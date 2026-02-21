import { TILE_SIZE, PROJECTILE_MAX_LIFETIME } from '../constants.js';
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
                this.hitTarget = { x: e.x, y: e.y, dirX: this.dirX, dirY: this.dirY };
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
                this.hitTarget = { x: boss.x, y: boss.y, dirX: this.dirX, dirY: this.dirY };
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
