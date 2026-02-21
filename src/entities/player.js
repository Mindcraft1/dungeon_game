import {
    PLAYER_RADIUS, PLAYER_SPEED, PLAYER_MAX_HP, PLAYER_DAMAGE,
    PLAYER_COLOR, PLAYER_INVULN_TIME,
    ATTACK_RANGE, ATTACK_ARC, ATTACK_COOLDOWN, ATTACK_DURATION, ATTACK_KNOCKBACK,
    XP_BASE, XP_MULTIPLIER, UPGRADE_HP, UPGRADE_SPEED, UPGRADE_DAMAGE,
    MAX_ACTIVE_BUFFS, BUFF_DURATION_SHORT, BUFF_DURATION_LONG,
    BUFF_RAGE_DAMAGE_MULT, BUFF_HEAL_AMOUNT,
    BUFF_PIERCING_RANGE_MULT, BUFF_PIERCING_DAMAGE_MULT,
    BUFF_SPEED_SURGE_CD_MULT, BUFF_SWIFT_SPEED_MULT,
    BUFF_CRUSHING_DAMAGE_MULT, BUFF_CRUSHING_KB_MULT, BUFF_IRON_SKIN_REDUCE,
    PICKUP_RAGE_SHARD, PICKUP_HEART_FRAGMENT,
    PICKUP_PIERCING_SHOT, PICKUP_PHASE_SHIELD,
    PICKUP_SPEED_SURGE, PICKUP_SWIFT_BOOTS,
    PICKUP_CRUSHING_BLOW, PICKUP_IRON_SKIN,
    HAZARD_LAVA_SLOW,
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

        // ── Buff system ──
        // Each buff: { type, remaining (ms), duration (ms) }
        this.activeBuffs = [];
        this.phaseShieldActive = false;   // blocks next hit
        this.crushingBlowReady = false;   // next attack = 3× damage
        this.onLava = false;              // set per frame by hazard system
    }

    update(dt, movement, grid) {
        if (movement.x !== 0 || movement.y !== 0) {
            this.facingX = movement.x;
            this.facingY = movement.y;
        }

        const moveSpeed = this.getEffectiveSpeed();
        this.x += movement.x * moveSpeed * dt;
        this.y += movement.y * moveSpeed * dt;
        resolveWalls(this, this.radius, grid);

        const ms = dt * 1000;
        if (this.attackTimer > 0) this.attackTimer -= ms;
        if (this.attackVisualTimer > 0) this.attackVisualTimer -= ms;
        if (this.invulnTimer > 0) this.invulnTimer -= ms;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= ms;
        this._updateBuffs(ms);
    }

    /**
     * Directional melee attack (120° arc in facing direction).
     * Returns the number of enemies hit, or -1 if on cooldown.
     */
    attack(enemies) {
        if (this.attackTimer > 0) return -1;

        // Cooldown (may be reduced by Speed Surge buff)
        const cdMult = this.hasBuff(PICKUP_SPEED_SURGE) ? BUFF_SPEED_SURGE_CD_MULT : 1;
        this.attackTimer = ATTACK_COOLDOWN * cdMult;
        this.attackVisualTimer = ATTACK_DURATION;

        // Range (may be extended by Piercing Shot buff)
        const rangeMult = this.hasBuff(PICKUP_PIERCING_SHOT) ? BUFF_PIERCING_RANGE_MULT : 1;
        const effectiveRange = ATTACK_RANGE * rangeMult;

        // Damage calculation
        let dmg = this.damage;
        if (this.hasBuff(PICKUP_RAGE_SHARD))    dmg = Math.floor(dmg * BUFF_RAGE_DAMAGE_MULT);
        if (this.hasBuff(PICKUP_PIERCING_SHOT))  dmg = Math.floor(dmg * BUFF_PIERCING_DAMAGE_MULT);

        // Crushing Blow: one-time 3× nuke
        let kbMult = 1;
        if (this.crushingBlowReady) {
            dmg = Math.floor(dmg * BUFF_CRUSHING_DAMAGE_MULT);
            kbMult = BUFF_CRUSHING_KB_MULT;
            this.crushingBlowReady = false;
            this._removeBuff(PICKUP_CRUSHING_BLOW);
        }

        const facingAngle = Math.atan2(this.facingY, this.facingX);

        let hitCount = 0;
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > effectiveRange + enemy.radius) continue;

            // Angle check
            let diff = Math.atan2(dy, dx) - facingAngle;
            while (diff > Math.PI)  diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) > ATTACK_ARC / 2) continue;

            const kbX = dist > 0 ? (dx / dist) * ATTACK_KNOCKBACK * kbMult : 0;
            const kbY = dist > 0 ? (dy / dist) * ATTACK_KNOCKBACK * kbMult : 0;
            enemy.takeDamage(dmg, kbX, kbY);
            hitCount++;
        }
        return hitCount;
    }

    takeDamage(amount) {
        if (this.invulnTimer > 0) return;

        // Phase Shield: block one hit completely
        if (this.phaseShieldActive) {
            this.phaseShieldActive = false;
            this._removeBuff(PICKUP_PHASE_SHIELD);
            this.invulnTimer = PLAYER_INVULN_TIME;
            this.damageFlashTimer = 80;
            return;
        }

        // Iron Skin: reduce damage by 50%
        let finalAmount = amount;
        if (this.hasBuff(PICKUP_IRON_SKIN)) {
            finalAmount = Math.max(1, Math.floor(amount * BUFF_IRON_SKIN_REDUCE));
        }

        this.hp = Math.max(0, this.hp - finalAmount);
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

    // ── Buff system ─────────────────────────────────────────

    /** Apply a pickup buff to the player. */
    applyBuff(pickupType) {
        // Instant effects
        if (pickupType === PICKUP_HEART_FRAGMENT) {
            this.hp = Math.min(this.hp + BUFF_HEAL_AMOUNT, this.maxHp);
            return; // no timed buff
        }

        // Determine duration
        let duration = BUFF_DURATION_SHORT;
        if (pickupType === PICKUP_PHASE_SHIELD)  duration = BUFF_DURATION_LONG;
        if (pickupType === PICKUP_CRUSHING_BLOW) duration = BUFF_DURATION_LONG;

        // If same buff exists, refresh it (no stacking)
        const existing = this.activeBuffs.find(b => b.type === pickupType);
        if (existing) {
            existing.remaining = duration;
            existing.duration = duration;
            this._applyBuffEffect(pickupType);
            return;
        }

        // Cap at MAX_ACTIVE_BUFFS — remove oldest if needed
        if (this.activeBuffs.length >= MAX_ACTIVE_BUFFS) {
            const removed = this.activeBuffs.shift();
            this._removeBuffEffect(removed.type);
        }

        this.activeBuffs.push({ type: pickupType, remaining: duration, duration });
        this._applyBuffEffect(pickupType);
    }

    _applyBuffEffect(type) {
        if (type === PICKUP_PHASE_SHIELD)  this.phaseShieldActive = true;
        if (type === PICKUP_CRUSHING_BLOW) this.crushingBlowReady = true;
    }

    _removeBuffEffect(type) {
        if (type === PICKUP_PHASE_SHIELD)  this.phaseShieldActive = false;
        if (type === PICKUP_CRUSHING_BLOW) this.crushingBlowReady = false;
    }

    _removeBuff(type) {
        const idx = this.activeBuffs.findIndex(b => b.type === type);
        if (idx !== -1) this.activeBuffs.splice(idx, 1);
    }

    _updateBuffs(ms) {
        for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
            this.activeBuffs[i].remaining -= ms;
            if (this.activeBuffs[i].remaining <= 0) {
                this._removeBuffEffect(this.activeBuffs[i].type);
                this.activeBuffs.splice(i, 1);
            }
        }
    }

    hasBuff(type) {
        return this.activeBuffs.some(b => b.type === type);
    }

    /** Effective move speed accounting for Swift Boots buff and lava slow. */
    getEffectiveSpeed() {
        let spd = this.hasBuff(PICKUP_SWIFT_BOOTS) ? this.speed * BUFF_SWIFT_SPEED_MULT : this.speed;
        if (this.onLava) spd *= HAZARD_LAVA_SLOW;
        return spd;
    }

    /** Clear all buffs (e.g. on death/restart). */
    clearBuffs() {
        this.activeBuffs = [];
        this.phaseShieldActive = false;
        this.crushingBlowReady = false;
    }

    // ── Rendering ──────────────────────────────────────────

    render(ctx) {
        this._renderBuffEffects(ctx);
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

    _renderBuffEffects(ctx) {
        if (this.activeBuffs.length === 0) return;

        ctx.save();

        // Phase Shield: orbiting shield bubble
        if (this.phaseShieldActive) {
            ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.006) * 0.1;
            ctx.strokeStyle = '#b388ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Iron Skin: orange ring
        if (this.hasBuff(PICKUP_IRON_SKIN)) {
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.004) * 0.1;
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Crushing Blow ready: pulsing orange glow
        if (this.crushingBlowReady) {
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.008) * 0.2;
            ctx.shadowColor = '#ffab40';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#ffab40';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Rage Shard: red particles
        if (this.hasBuff(PICKUP_RAGE_SHARD)) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ff6b6b';
            const t = Date.now() * 0.003;
            for (let i = 0; i < 3; i++) {
                const angle = t + (Math.PI * 2 / 3) * i;
                const px = this.x + Math.cos(angle) * (this.radius + 6);
                const py = this.y + Math.sin(angle) * (this.radius + 6);
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Speed Surge: green sparks
        if (this.hasBuff(PICKUP_SPEED_SURGE)) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#69f0ae';
            const t = Date.now() * 0.005;
            for (let i = 0; i < 4; i++) {
                const angle = t + (Math.PI / 2) * i;
                const px = this.x + Math.cos(angle) * (this.radius + 5);
                const py = this.y + Math.sin(angle) * (this.radius + 5);
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Swift Boots: trailing green afterimage
        if (this.hasBuff(PICKUP_SWIFT_BOOTS)) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#76ff03';
            ctx.beginPath();
            ctx.arc(this.x - this.facingX * 8, this.y - this.facingY * 8, this.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Piercing Shot: extended arc indicator
        if (this.hasBuff(PICKUP_PIERCING_SHOT)) {
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#bb86fc';
            const angle = Math.atan2(this.facingY, this.facingX);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.arc(this.x, this.y, ATTACK_RANGE * 1.4, angle - ATTACK_ARC / 2, angle + ATTACK_ARC / 2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}
