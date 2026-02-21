import {
    BOSS_TYPE_BRUTE, BOSS_TYPE_WARLOCK, BOSS_TYPE_PHANTOM,
    BOSS_BASE_HP, BOSS_BASE_SPEED, BOSS_BASE_DAMAGE,
    BOSS_HP_SCALE, BOSS_DMG_SCALE, BOSS_SPD_SCALE,
    BOSS_BRUTE_HP_MULT, BOSS_BRUTE_SPD_MULT, BOSS_BRUTE_DMG_MULT, BOSS_BRUTE_RADIUS,
    BOSS_WARLOCK_HP_MULT, BOSS_WARLOCK_SPD_MULT, BOSS_WARLOCK_DMG_MULT, BOSS_WARLOCK_RADIUS,
    BOSS_PHANTOM_HP_MULT, BOSS_PHANTOM_SPD_MULT, BOSS_PHANTOM_DMG_MULT, BOSS_PHANTOM_RADIUS,
    BOSS_ATTACK_COOLDOWN,
    BOSS_SLAM_WINDUP, BOSS_SLAM_RADIUS,
    BOSS_CHARGE_WINDUP, BOSS_CHARGE_DURATION, BOSS_CHARGE_SPEED_MULT,
    BOSS_SUMMON_WINDUP,
    BOSS_FAN_WINDUP, BOSS_VOLLEY_WINDUP, BOSS_VOLLEY_INTERVAL,
    BOSS_DASH_WINDUP, BOSS_DASH_DURATION, BOSS_DASH_SPEED_MULT,
    BOSS_RING_WINDUP, BOSS_CLONE_WINDUP,
    BOSS_HIT_COOLDOWN,
    BOSS_BRUTE_COLOR, BOSS_WARLOCK_COLOR, BOSS_PHANTOM_COLOR,
    BOSS_BRUTE_NAME, BOSS_WARLOCK_NAME, BOSS_PHANTOM_NAME,
    BOSS_XP_REWARD,
    ENEMY_TYPE_BASIC, ENEMY_TYPE_SHOOTER, ENEMY_TYPE_DASHER,
    PROJECTILE_SPEED, PROJECTILE_RADIUS,
} from '../constants.js';
import { resolveWalls } from '../collision.js';
import { Projectile } from './projectile.js';

export class Boss {
    /**
     * @param {number} x
     * @param {number} y
     * @param {string} bossType   – BOSS_TYPE_BRUTE | BOSS_TYPE_WARLOCK | BOSS_TYPE_PHANTOM
     * @param {number} encounter  – 0-based encounter index for stat scaling
     * @param {number} stage      – current game stage
     */
    constructor(x, y, bossType, encounter, stage) {
        this.x = x;
        this.y = y;
        this.type = bossType;
        this.encounter = encounter;
        this.stage = stage;
        this.dead = false;
        this.xpGiven = false;

        // ── Stat scaling ──
        const hpScale  = 1 + encounter * BOSS_HP_SCALE;
        const dmgScale = 1 + encounter * BOSS_DMG_SCALE;
        const spdScale = 1 + encounter * BOSS_SPD_SCALE;

        switch (bossType) {
            case BOSS_TYPE_BRUTE:
                this.radius = BOSS_BRUTE_RADIUS;
                this.maxHp  = Math.floor(BOSS_BASE_HP * BOSS_BRUTE_HP_MULT * hpScale);
                this.speed  = BOSS_BASE_SPEED * BOSS_BRUTE_SPD_MULT * spdScale;
                this.damage = Math.floor(BOSS_BASE_DAMAGE * BOSS_BRUTE_DMG_MULT * dmgScale);
                this.color  = BOSS_BRUTE_COLOR;
                this.name   = BOSS_BRUTE_NAME;
                break;
            case BOSS_TYPE_WARLOCK:
                this.radius = BOSS_WARLOCK_RADIUS;
                this.maxHp  = Math.floor(BOSS_BASE_HP * BOSS_WARLOCK_HP_MULT * hpScale);
                this.speed  = BOSS_BASE_SPEED * BOSS_WARLOCK_SPD_MULT * spdScale;
                this.damage = Math.floor(BOSS_BASE_DAMAGE * BOSS_WARLOCK_DMG_MULT * dmgScale);
                this.color  = BOSS_WARLOCK_COLOR;
                this.name   = BOSS_WARLOCK_NAME;
                break;
            case BOSS_TYPE_PHANTOM:
                this.radius = BOSS_PHANTOM_RADIUS;
                this.maxHp  = Math.floor(BOSS_BASE_HP * BOSS_PHANTOM_HP_MULT * hpScale);
                this.speed  = BOSS_BASE_SPEED * BOSS_PHANTOM_SPD_MULT * spdScale;
                this.damage = Math.floor(BOSS_BASE_DAMAGE * BOSS_PHANTOM_DMG_MULT * dmgScale);
                this.color  = BOSS_PHANTOM_COLOR;
                this.name   = BOSS_PHANTOM_NAME;
                break;
        }

        this.hp = this.maxHp;
        this.xpValue = Math.floor(BOSS_XP_REWARD * (1 + encounter * 0.3));

        // ── Common state ──
        this.facingAngle = 0;
        this.damageFlashTimer = 0;
        this.hitCooldown = 0;

        // ── Phase system ──
        this.phase = 1;                  // 1 or 2
        this.phaseTransition = false;
        this.phaseTransitionTimer = 0;

        // ── Attack system ──
        this.attackCooldown = BOSS_ATTACK_COOLDOWN * 0.4;   // shorter initial delay
        this.currentAttack = null;       // 'slam','charge','summon','fan','volley','dash_strike','ring','clone'
        this.attackPhase = 0;            // 0=idle, 1=windup, 2=active
        this.attackTimer = 0;

        // Charge state (brute)
        this.chargeDirX = 0;
        this.chargeDirY = 0;

        // Volley state (warlock)
        this.volleyCount = 0;
        this.volleyTimer = 0;
        this.volleyMax = 0;

        // Dash strike state (phantom)
        this.dashDirX = 0;
        this.dashDirY = 0;

        // AoE slam indicator
        this.slamIndicatorRadius = 0;

        // ── Events (consumed by game.js each frame) ──
        this._events = [];

        // ── Pending spawns (consumed by game.js each frame) ──
        this.pendingSpawns = [];
    }

    /** Phase 2 = 30% faster cooldowns */
    get phaseMultiplier() {
        return this.phase === 2 ? 0.7 : 1;
    }

    // ── Update ─────────────────────────────────────────────

    update(dt, player, grid, enemies, projectiles) {
        if (this.dead) return;

        const ms = dt * 1000;

        // ── Phase transition ──
        if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
            this.phase = 2;
            this.phaseTransition = true;
            this.phaseTransitionTimer = 800;
            this.attackCooldown = BOSS_ATTACK_COOLDOWN * 0.3;
            this.currentAttack = null;
            this.attackPhase = 0;
            this._events.push({ type: 'phase_transition' });
        }

        if (this.phaseTransitionTimer > 0) {
            this.phaseTransitionTimer -= ms;
            if (this.phaseTransitionTimer <= 0) this.phaseTransition = false;
        }

        // ── Facing ──
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && this.attackPhase !== 2) {
            this.facingAngle = Math.atan2(dy, dx);
        }

        // ── Contact damage ──
        if (this.hitCooldown > 0) this.hitCooldown -= ms;
        if (dist < this.radius + player.radius && this.hitCooldown <= 0) {
            player.takeDamage(this.damage);
            this.hitCooldown = BOSS_HIT_COOLDOWN;
        }

        if (this.damageFlashTimer > 0) this.damageFlashTimer -= ms;

        // ── Attack logic ──
        if (this.currentAttack === null) {
            // Idle: approach player + tick cooldown
            this.attackCooldown -= ms;

            if (dist > this.radius + 40) {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
            }

            if (this.attackCooldown <= 0) {
                this._chooseAttack(player);
            }
        } else {
            this._executeAttack(dt, ms, player, grid, enemies, projectiles);
        }

        resolveWalls(this, this.radius, grid);
    }

    // ── Attack selection ───────────────────────────────────

    _chooseAttack(player) {
        const attacks = this._getAttackPool();
        const totalWeight = attacks.reduce((sum, a) => sum + a.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const atk of attacks) {
            roll -= atk.weight;
            if (roll <= 0) {
                this.currentAttack = atk.name;
                this.attackPhase = 1;
                this.attackTimer = atk.windup * this.phaseMultiplier;

                if (atk.name === 'slam') this.slamIndicatorRadius = 0;
                return;
            }
        }
    }

    _getAttackPool() {
        switch (this.type) {
            case BOSS_TYPE_BRUTE:
                return [
                    { name: 'slam',   weight: 3,   windup: BOSS_SLAM_WINDUP },
                    { name: 'charge', weight: 2,   windup: BOSS_CHARGE_WINDUP },
                    { name: 'summon', weight: 1.5, windup: BOSS_SUMMON_WINDUP },
                ];
            case BOSS_TYPE_WARLOCK:
                return [
                    { name: 'fan',    weight: 3,   windup: BOSS_FAN_WINDUP },
                    { name: 'volley', weight: 2.5, windup: BOSS_VOLLEY_WINDUP },
                    { name: 'summon', weight: 1.5, windup: BOSS_SUMMON_WINDUP },
                ];
            case BOSS_TYPE_PHANTOM:
                return [
                    { name: 'dash_strike', weight: 3,   windup: BOSS_DASH_WINDUP },
                    { name: 'ring',        weight: 2.5, windup: BOSS_RING_WINDUP },
                    { name: 'clone',       weight: 1.5, windup: BOSS_CLONE_WINDUP },
                ];
            default:
                return [{ name: 'slam', weight: 1, windup: BOSS_SLAM_WINDUP }];
        }
    }

    // ── Attack execution ───────────────────────────────────

    _executeAttack(dt, ms, player, grid, enemies, projectiles) {
        this.attackTimer -= ms;

        if (this.attackPhase === 1) {
            this._updateWindup(dt, ms, player);
            if (this.attackTimer <= 0) {
                this.attackPhase = 2;
                this._activateAttack(player, grid, enemies, projectiles);
            }
        } else if (this.attackPhase === 2) {
            this._updateActive(dt, ms, player, grid, enemies, projectiles);
            if (this.attackTimer <= 0) {
                this._finishAttack();
            }
        }
    }

    _updateWindup(dt, ms, player) {
        switch (this.currentAttack) {
            case 'slam': {
                // Growing AoE indicator
                const windupTotal = BOSS_SLAM_WINDUP * this.phaseMultiplier;
                const progress = 1 - this.attackTimer / windupTotal;
                const targetR = this.phase === 2 ? BOSS_SLAM_RADIUS * 1.3 : BOSS_SLAM_RADIUS;
                this.slamIndicatorRadius = targetR * progress;
                break;
            }
            case 'charge': {
                // Track player during windup (direction locked at activation)
                const cdx = player.x - this.x;
                const cdy = player.y - this.y;
                const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cd > 0) { this.chargeDirX = cdx / cd; this.chargeDirY = cdy / cd; }
                break;
            }
            case 'dash_strike': {
                const ddx = player.x - this.x;
                const ddy = player.y - this.y;
                const dd = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dd > 0) { this.dashDirX = ddx / dd; this.dashDirY = ddy / dd; }
                break;
            }
        }
    }

    _activateAttack(player, grid, enemies, projectiles) {
        switch (this.currentAttack) {
            case 'slam': {
                const slamR = this.phase === 2 ? BOSS_SLAM_RADIUS * 1.3 : BOSS_SLAM_RADIUS;
                const sdx = player.x - this.x;
                const sdy = player.y - this.y;
                const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
                if (sdist < slamR + player.radius) {
                    player.takeDamage(Math.floor(this.damage * 1.5));
                    if (sdist > 0) {
                        player.x += (sdx / sdist) * 30;
                        player.y += (sdy / sdist) * 30;
                    }
                }
                this.slamIndicatorRadius = slamR;
                this._events.push({ type: 'slam', x: this.x, y: this.y, radius: slamR });
                this.attackTimer = 500; // recovery
                break;
            }
            case 'charge': {
                // Lock direction at activation moment
                const cdx = player.x - this.x;
                const cdy = player.y - this.y;
                const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cd > 0) { this.chargeDirX = cdx / cd; this.chargeDirY = cdy / cd; }
                this.attackTimer = BOSS_CHARGE_DURATION * this.phaseMultiplier;
                this._events.push({ type: 'charge' });
                break;
            }
            case 'summon':
                this._spawnAdds();
                this._events.push({ type: 'summon' });
                this.attackTimer = 600; // recovery
                break;
            case 'fan':
                this._fireProjectileFan(player, projectiles);
                this._events.push({ type: 'projectile' });
                this.attackTimer = 500; // recovery
                break;
            case 'volley': {
                this.volleyCount = 0;
                this.volleyTimer = 0;
                this.volleyMax = this.phase === 2 ? 5 : 3;
                this.attackTimer = this.volleyMax * BOSS_VOLLEY_INTERVAL + 400;
                break;
            }
            case 'dash_strike': {
                const ddx = player.x - this.x;
                const ddy = player.y - this.y;
                const dd = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dd > 0) { this.dashDirX = ddx / dd; this.dashDirY = ddy / dd; }
                this.attackTimer = BOSS_DASH_DURATION * this.phaseMultiplier;
                break;
            }
            case 'ring':
                this._fireRingShot(projectiles);
                this._events.push({ type: 'projectile' });
                this.attackTimer = 500; // recovery
                break;
            case 'clone':
                this._spawnClones();
                this._events.push({ type: 'summon' });
                this.attackTimer = 600; // recovery
                break;
        }
    }

    _updateActive(dt, ms, player, grid, enemies, projectiles) {
        switch (this.currentAttack) {
            case 'slam':
                // Indicator fading during recovery
                this.slamIndicatorRadius *= 0.93;
                break;

            case 'charge': {
                const speed = this.speed * BOSS_CHARGE_SPEED_MULT;
                this.x += this.chargeDirX * speed * dt;
                this.y += this.chargeDirY * speed * dt;
                this.facingAngle = Math.atan2(this.chargeDirY, this.chargeDirX);

                const cdx = player.x - this.x;
                const cdy = player.y - this.y;
                const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cdist < this.radius + player.radius && this.hitCooldown <= 0) {
                    player.takeDamage(Math.floor(this.damage * 1.8));
                    this.hitCooldown = BOSS_HIT_COOLDOWN;
                    if (cdist > 0) {
                        player.x += (cdx / cdist) * 40;
                        player.y += (cdy / cdist) * 40;
                    }
                }
                break;
            }

            case 'volley': {
                this.volleyTimer -= ms;
                if (this.volleyTimer <= 0 && this.volleyCount < this.volleyMax) {
                    this._fireAtPlayer(player, projectiles);
                    this._events.push({ type: 'projectile' });
                    this.volleyCount++;
                    this.volleyTimer = BOSS_VOLLEY_INTERVAL;
                }
                break;
            }

            case 'dash_strike': {
                const dashSpeed = this.speed * BOSS_DASH_SPEED_MULT;
                this.x += this.dashDirX * dashSpeed * dt;
                this.y += this.dashDirY * dashSpeed * dt;
                this.facingAngle = Math.atan2(this.dashDirY, this.dashDirX);

                const ddx = player.x - this.x;
                const ddy = player.y - this.y;
                const ddist = Math.sqrt(ddx * ddx + ddy * ddy);
                if (ddist < this.radius + player.radius && this.hitCooldown <= 0) {
                    player.takeDamage(Math.floor(this.damage * 1.3));
                    this.hitCooldown = BOSS_HIT_COOLDOWN;
                    if (ddist > 0) {
                        player.x += (ddx / ddist) * 25;
                        player.y += (ddy / ddist) * 25;
                    }
                }
                break;
            }
        }
    }

    _finishAttack() {
        this.currentAttack = null;
        this.attackPhase = 0;
        this.attackCooldown = BOSS_ATTACK_COOLDOWN * this.phaseMultiplier;
        this.slamIndicatorRadius = 0;
    }

    // ── Projectile attacks ─────────────────────────────────

    _fireProjectileFan(player, projectiles) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const baseAngle = Math.atan2(dy, dx);
        const count = this.phase === 2 ? 7 : 5;
        const spread = this.phase === 2 ? Math.PI / 3 : Math.PI / 4;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle - spread / 2 + (spread / (count - 1)) * i;
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            projectiles.push(new Projectile(
                this.x + dirX * (this.radius + PROJECTILE_RADIUS + 4),
                this.y + dirY * (this.radius + PROJECTILE_RADIUS + 4),
                dirX, dirY,
                PROJECTILE_SPEED * 0.85,
                Math.floor(this.damage * 0.6),
                PROJECTILE_RADIUS + 1,
                this.color,
            ));
        }
    }

    _fireAtPlayer(player, projectiles) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        // Slight random spread
        const spread = (Math.random() - 0.5) * 0.25;
        const dirX = dx / dist;
        const dirY = dy / dist;
        const fx = dirX + spread * (-dirY);
        const fy = dirY + spread * dirX;
        const len = Math.sqrt(fx * fx + fy * fy);

        projectiles.push(new Projectile(
            this.x + (fx / len) * (this.radius + PROJECTILE_RADIUS + 4),
            this.y + (fy / len) * (this.radius + PROJECTILE_RADIUS + 4),
            fx / len, fy / len,
            PROJECTILE_SPEED,
            Math.floor(this.damage * 0.5),
            PROJECTILE_RADIUS,
            this.color,
        ));
    }

    _fireRingShot(projectiles) {
        const count = this.phase === 2 ? 12 : 8;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            projectiles.push(new Projectile(
                this.x + dirX * (this.radius + PROJECTILE_RADIUS + 4),
                this.y + dirY * (this.radius + PROJECTILE_RADIUS + 4),
                dirX, dirY,
                PROJECTILE_SPEED * 0.7,
                Math.floor(this.damage * 0.5),
                PROJECTILE_RADIUS + 1,
                this.color,
            ));
        }
    }

    // ── Summon attacks ─────────────────────────────────────

    _spawnAdds() {
        const count = this.phase === 2 ? 3 : 2;
        let addType = ENEMY_TYPE_BASIC;
        if (this.type === BOSS_TYPE_WARLOCK) addType = ENEMY_TYPE_SHOOTER;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const dist = this.radius + 40 + Math.random() * 20;
            this.pendingSpawns.push({
                x: this.x + Math.cos(angle) * dist,
                y: this.y + Math.sin(angle) * dist,
                type: addType,
            });
        }
    }

    _spawnClones() {
        const count = this.phase === 2 ? 3 : 2;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const dist = this.radius + 40 + Math.random() * 20;
            this.pendingSpawns.push({
                x: this.x + Math.cos(angle) * dist,
                y: this.y + Math.sin(angle) * dist,
                type: ENEMY_TYPE_DASHER,
            });
        }
    }

    // ── Damage ─────────────────────────────────────────────

    takeDamage(amount, kbX = 0, kbY = 0) {
        if (this.dead) return;
        this.hp -= amount;
        this.damageFlashTimer = 120;
        // Boss resists knockback heavily
        this.x += kbX * 0.15;
        this.y += kbY * 0.15;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
        }
    }

    // ── Rendering ──────────────────────────────────────────

    render(ctx) {
        if (this.dead) return;

        const flash = this.damageFlashTimer > 0;

        // Attack indicators (drawn behind boss)
        this._renderAttackIndicators(ctx);

        // Phase transition effect
        if (this.phaseTransition) {
            ctx.save();
            const pulse = Math.sin(Date.now() * 0.02) * 0.3 + 0.5;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Boss body
        switch (this.type) {
            case BOSS_TYPE_BRUTE:   this._renderBrute(ctx, flash);   break;
            case BOSS_TYPE_WARLOCK: this._renderWarlock(ctx, flash); break;
            case BOSS_TYPE_PHANTOM: this._renderPhantom(ctx, flash); break;
        }

        // Phase 2 red aura
        if (this.phase === 2 && !this.phaseTransition) {
            ctx.save();
            ctx.globalAlpha = 0.15 + Math.sin(Date.now() * 0.005) * 0.1;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    _renderAttackIndicators(ctx) {
        // Slam AoE indicator (red circle growing during windup)
        if (this.currentAttack === 'slam' && this.slamIndicatorRadius > 5) {
            ctx.save();
            const alpha = this.attackPhase === 1 ? 0.2 : 0.12;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.slamIndicatorRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = alpha * 2;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Charge direction indicator (dashed line)
        if (this.currentAttack === 'charge' && this.attackPhase === 1) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + this.chargeDirX * 120,
                this.y + this.chargeDirY * 120,
            );
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Dash strike direction indicator
        if (this.currentAttack === 'dash_strike' && this.attackPhase === 1) {
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + this.dashDirX * 150,
                this.y + this.dashDirY * 150,
            );
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Projectile windup glow (fan/volley/ring)
        if ((this.currentAttack === 'fan' || this.currentAttack === 'volley' || this.currentAttack === 'ring')
            && this.attackPhase === 1) {
            const windupTotal = this.currentAttack === 'fan' ? BOSS_FAN_WINDUP
                : this.currentAttack === 'volley' ? BOSS_VOLLEY_WINDUP
                : BOSS_RING_WINDUP;
            const progress = 1 - this.attackTimer / (windupTotal * this.phaseMultiplier);
            ctx.save();
            ctx.globalAlpha = progress * 0.6;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5 * progress, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Summon/Clone windup (pulsing ring)
        if ((this.currentAttack === 'summon' || this.currentAttack === 'clone') && this.attackPhase === 1) {
            ctx.save();
            ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.015) * 0.15;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ── Boss type rendering ────────────────────────────────

    _renderBrute(ctx, flash) {
        // Octagon
        ctx.fillStyle = flash ? '#ffffff' : this.color;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i - Math.PI / 8;
            const px = this.x + this.radius * Math.cos(angle);
            const py = this.y + this.radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#a84300';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Eyes
        const eyeOffX = Math.cos(this.facingAngle) * this.radius * 0.35;
        const eyeOffY = Math.sin(this.facingAngle) * this.radius * 0.35;
        const perpX = -Math.sin(this.facingAngle);
        const perpY = Math.cos(this.facingAngle);

        ctx.fillStyle = flash ? '#ff4444' : '#ff6600';
        ctx.beginPath();
        ctx.arc(this.x + eyeOffX + perpX * 7, this.y + eyeOffY + perpY * 7, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + eyeOffX - perpX * 7, this.y + eyeOffY - perpY * 7, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Charge visual
        if (this.currentAttack === 'charge' && this.attackPhase === 2) {
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    _renderWarlock(ctx, flash) {
        // Pentagon
        ctx.fillStyle = flash ? '#ffffff' : this.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const px = this.x + this.radius * Math.cos(angle);
            const py = this.y + this.radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#6c3483';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner eye
        ctx.fillStyle = flash ? '#bb86fc' : '#e0b0ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Pupil (tracks player)
        const pupilDist = this.radius * 0.15;
        ctx.fillStyle = '#2a0134';
        ctx.beginPath();
        ctx.arc(
            this.x + Math.cos(this.facingAngle) * pupilDist,
            this.y + Math.sin(this.facingAngle) * pupilDist,
            this.radius * 0.12, 0, Math.PI * 2,
        );
        ctx.fill();

        // Orbiting runes
        const t = Date.now() * 0.002;
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 3; i++) {
            const angle = t + (Math.PI * 2 / 3) * i;
            const ox = this.x + Math.cos(angle) * (this.radius + 10);
            const oy = this.y + Math.sin(angle) * (this.radius + 10);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(ox, oy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _renderPhantom(ctx, flash) {
        // Star shape (5-pointed)
        const outerR = this.radius;
        const innerR = this.radius * 0.45;

        ctx.fillStyle = flash ? '#ffffff' : this.color;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            const px = this.x + r * Math.cos(angle);
            const py = this.y + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#00838f';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Central glow
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
        ctx.fillStyle = '#e0f7fa';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Dash afterimage
        if (this.currentAttack === 'dash_strike' && this.attackPhase === 2) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(
                this.x - this.dashDirX * this.radius * 2,
                this.y - this.dashDirY * this.radius * 2,
                this.radius * 0.7, 0, Math.PI * 2,
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
                this.x - this.dashDirX * this.radius * 3.5,
                this.y - this.dashDirY * this.radius * 3.5,
                this.radius * 0.4, 0, Math.PI * 2,
            );
            ctx.fill();
            ctx.restore();
        }
    }
}
