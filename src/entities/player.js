import {
    PLAYER_RADIUS, PLAYER_SPEED, PLAYER_MAX_HP, PLAYER_DAMAGE,
    PLAYER_COLOR, PLAYER_INVULN_TIME,
    ATTACK_RANGE, ATTACK_ARC, ATTACK_COOLDOWN, ATTACK_DURATION, ATTACK_KNOCKBACK,
    XP_BASE, XP_MULTIPLIER, UPGRADE_HP, UPGRADE_SPEED, UPGRADE_DAMAGE,
} from '../constants.js';
import { resolveWalls } from '../collision.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = PLAYER_RADIUS;
        this.speed = PLAYER_SPEED;
        this.maxHp = PLAYER_MAX_HP;
        this.hp = PLAYER_MAX_HP;
        this.damage = PLAYER_DAMAGE;

        this.xp = 0;
        this.level = 1;
        this.xpToNext = XP_BASE;

        // Facing direction (default right)
        this.facingX = 1;
        this.facingY = 0;

        // Timers in ms
        this.attackTimer = 0;
        this.attackVisualTimer = 0;
        this.invulnTimer = 0;
        this.damageFlashTimer = 0;
    }

    update(dt, movement, grid) {
        if (movement.x !== 0 || movement.y !== 0) {
            this.facingX = movement.x;
            this.facingY = movement.y;
        }

        this.x += movement.x * this.speed * dt;
        this.y += movement.y * this.speed * dt;
        resolveWalls(this, this.radius, grid);

        const ms = dt * 1000;
        if (this.attackTimer > 0) this.attackTimer -= ms;
        if (this.attackVisualTimer > 0) this.attackVisualTimer -= ms;
        if (this.invulnTimer > 0) this.invulnTimer -= ms;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= ms;
    }

    /**
     * Directional melee attack (120° arc in facing direction).
     * Returns true if the attack was executed (cooldown was ready).
     */
    attack(enemies) {
        if (this.attackTimer > 0) return false;

        this.attackTimer = ATTACK_COOLDOWN;
        this.attackVisualTimer = ATTACK_DURATION;

        const facingAngle = Math.atan2(this.facingY, this.facingX);

        for (const enemy of enemies) {
            if (enemy.dead) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > ATTACK_RANGE + enemy.radius) continue;

            // Angle check
            let diff = Math.atan2(dy, dx) - facingAngle;
            while (diff > Math.PI)  diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) > ATTACK_ARC / 2) continue;

            const kbX = dist > 0 ? (dx / dist) * ATTACK_KNOCKBACK : 0;
            const kbY = dist > 0 ? (dy / dist) * ATTACK_KNOCKBACK : 0;
            enemy.takeDamage(this.damage, kbX, kbY);
        }
        return true;
    }

    takeDamage(amount) {
        if (this.invulnTimer > 0) return;
        this.hp = Math.max(0, this.hp - amount);
        this.invulnTimer = PLAYER_INVULN_TIME;
        this.damageFlashTimer = 150;
    }

    /** Returns true when XP crosses the threshold (= level-up pending). */
    addXp(amount) {
        this.xp += amount;
        return this.xp >= this.xpToNext;
    }

    /** Apply level-up: choice is 'hp' | 'speed' | 'damage'. */
    levelUp(choice) {
        this.level++;
        this.xp -= this.xpToNext;
        this.xpToNext = Math.floor(this.xpToNext * XP_MULTIPLIER);

        switch (choice) {
            case 'hp':
                this.maxHp += UPGRADE_HP;
                this.hp = Math.min(this.hp + Math.floor(UPGRADE_HP * 0.6), this.maxHp);
                break;
            case 'speed':
                this.speed += UPGRADE_SPEED;
                break;
            case 'damage':
                this.damage += UPGRADE_DAMAGE;
                break;
        }
    }

    // ── Rendering ──────────────────────────────────────────

    render(ctx) {
        this._renderAttackArc(ctx);
        this._renderBody(ctx);
    }

    _renderAttackArc(ctx) {
        if (this.attackVisualTimer <= 0) return;
        const alpha = this.attackVisualTimer / ATTACK_DURATION;
        const angle = Math.atan2(this.facingY, this.facingX);

        ctx.save();
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, ATTACK_RANGE, angle - ATTACK_ARC / 2, angle + ATTACK_ARC / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    _renderBody(ctx) {
        const flashing = this.damageFlashTimer > 0 && Math.floor(this.damageFlashTimer / 50) % 2 === 0;

        ctx.save();
        if (this.invulnTimer > 0) {
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.02) * 0.2;
        }

        // Body
        ctx.fillStyle = flashing ? '#ffffff' : PLAYER_COLOR;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Facing indicator (eye)
        const fa = Math.atan2(this.facingY, this.facingX);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
            this.x + Math.cos(fa) * this.radius * 0.55,
            this.y + Math.sin(fa) * this.radius * 0.55,
            3, 0, Math.PI * 2,
        );
        ctx.fill();

        ctx.restore();
    }
}
