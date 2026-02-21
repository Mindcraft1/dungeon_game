import { ENEMY_RADIUS, ENEMY_COLOR, ENEMY_HIT_COOLDOWN } from '../constants.js';
import { resolveWalls } from '../collision.js';

export class Enemy {
    constructor(x, y, hp, speed, damage) {
        this.x = x;
        this.y = y;
        this.radius = ENEMY_RADIUS;
        this.maxHp = hp;
        this.hp = hp;
        this.speed = speed;
        this.damage = damage;
        this.dead = false;
        this.xpGiven = false;

        this.hitCooldown = 0;
        this.damageFlashTimer = 0;
    }

    update(dt, player, grid, enemies, trainingMode = false) {
        if (this.dead) return;

        const ms = dt * 1000;

        // ── Move towards player ──
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.radius + player.radius) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }

        // ── Separation from other enemies (avoids stacking) ──
        for (const other of enemies) {
            if (other === this || other.dead) continue;
            const sx = this.x - other.x;
            const sy = this.y - other.y;
            const sd = Math.sqrt(sx * sx + sy * sy);
            const minDist = this.radius + other.radius + 2;
            if (sd < minDist && sd > 0) {
                const push = (minDist - sd) * 0.5;
                this.x += (sx / sd) * push;
                this.y += (sy / sd) * push;
            }
        }

        // ── Walls (final authority on position) ──
        resolveWalls(this, this.radius, grid);

        // ── Contact damage (skipped in training) ──
        if (this.hitCooldown > 0) this.hitCooldown -= ms;
        if (!trainingMode) {
            const pDist = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
            if (pDist < this.radius + player.radius && this.hitCooldown <= 0) {
                player.takeDamage(this.damage);
                this.hitCooldown = ENEMY_HIT_COOLDOWN;
            }
        }

        if (this.damageFlashTimer > 0) this.damageFlashTimer -= ms;
    }

    takeDamage(amount, kbX = 0, kbY = 0) {
        if (this.dead) return;
        this.hp -= amount;
        this.damageFlashTimer = 120;
        this.x += kbX;
        this.y += kbY;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
        }
    }

    // ── Rendering ──────────────────────────────────────────

    render(ctx) {
        if (this.dead) return;

        const flash = this.damageFlashTimer > 0;

        // Body
        ctx.fillStyle = flash ? '#ffffff' : ENEMY_COLOR;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // HP bar (only when damaged)
        if (this.hp < this.maxHp) {
            const bw = this.radius * 2.5;
            const bh = 4;
            const bx = this.x - bw / 2;
            const by = this.y - this.radius - 10;

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);

            const ratio = this.hp / this.maxHp;
            ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillRect(bx, by, bw * ratio, bh);
        }
    }
}
