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
