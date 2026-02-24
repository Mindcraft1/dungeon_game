import {
    BOSS_TYPE_BRUTE, BOSS_TYPE_WARLOCK, BOSS_TYPE_PHANTOM, BOSS_TYPE_JUGGERNAUT, BOSS_TYPE_OVERLORD,
    BOSS_BASE_HP, BOSS_BASE_SPEED, BOSS_BASE_DAMAGE,
    BOSS_HP_SCALE, BOSS_DMG_SCALE, BOSS_SPD_SCALE,
    BOSS_STAGE_HP_SCALE, BOSS_STAGE_DMG_SCALE, BOSS_STAGE_SPD_SCALE,
    BOSS_BRUTE_HP_MULT, BOSS_BRUTE_SPD_MULT, BOSS_BRUTE_DMG_MULT, BOSS_BRUTE_RADIUS,
    BOSS_WARLOCK_HP_MULT, BOSS_WARLOCK_SPD_MULT, BOSS_WARLOCK_DMG_MULT, BOSS_WARLOCK_RADIUS,
    BOSS_PHANTOM_HP_MULT, BOSS_PHANTOM_SPD_MULT, BOSS_PHANTOM_DMG_MULT, BOSS_PHANTOM_RADIUS,
    BOSS_JUGGERNAUT_HP_MULT, BOSS_JUGGERNAUT_SPD_MULT, BOSS_JUGGERNAUT_DMG_MULT, BOSS_JUGGERNAUT_RADIUS,
    BOSS_OVERLORD_HP_MULT, BOSS_OVERLORD_SPD_MULT, BOSS_OVERLORD_DMG_MULT, BOSS_OVERLORD_RADIUS,
    BOSS_ATTACK_COOLDOWN,
    BOSS_SLAM_WINDUP, BOSS_SLAM_RADIUS,
    BOSS_CHARGE_WINDUP, BOSS_CHARGE_DURATION, BOSS_CHARGE_SPEED_MULT,
    BOSS_SUMMON_WINDUP,
    BOSS_FAN_WINDUP, BOSS_VOLLEY_WINDUP, BOSS_VOLLEY_INTERVAL,
    BOSS_DASH_WINDUP, BOSS_DASH_DURATION, BOSS_DASH_SPEED_MULT,
    BOSS_RING_WINDUP, BOSS_CLONE_WINDUP,
    BOSS_ROCKET_WINDUP, BOSS_ROCKET_SPEED, BOSS_ROCKET_RADIUS,
    BOSS_BARRAGE_WINDUP, BOSS_BARRAGE_INTERVAL,
    BOSS_BOMBARDMENT_WINDUP, BOSS_BOMBARDMENT_RADIUS, BOSS_BOMBARDMENT_COUNT, BOSS_BOMBARDMENT_LINGER,
    BOSS_STOMP_WINDUP, BOSS_STOMP_RADIUS,
    BOSS_LEAP_WINDUP, BOSS_LEAP_RADIUS,
    BOSS_SHOCKWAVE_WINDUP, BOSS_SHOCKWAVE_COUNT, BOSS_SHOCKWAVE_SPEED,
    BOSS_LASER_SWEEP_WINDUP, BOSS_LASER_SWEEP_DURATION, BOSS_LASER_SWEEP_WIDTH,
    BOSS_DRONE_WINDUP, BOSS_EMP_WINDUP, BOSS_EMP_RADIUS, BOSS_PLASMA_FAN_WINDUP,
    BOSS_HIT_COOLDOWN,
    BOSS_BRUTE_COLOR, BOSS_WARLOCK_COLOR, BOSS_PHANTOM_COLOR, BOSS_JUGGERNAUT_COLOR, BOSS_OVERLORD_COLOR,
    BOSS_BRUTE_NAME, BOSS_WARLOCK_NAME, BOSS_PHANTOM_NAME, BOSS_JUGGERNAUT_NAME, BOSS_OVERLORD_NAME,
    BOSS_XP_REWARD,
    ENEMY_TYPE_BASIC, ENEMY_TYPE_SHOOTER, ENEMY_TYPE_DASHER, ENEMY_TYPE_TANK,
    PROJECTILE_SPEED, PROJECTILE_RADIUS,
    TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT,
} from '../constants.js';
import { resolveWalls, isWall } from '../collision.js';
import { Projectile, RocketProjectile } from './projectile.js';

export class Boss {
    /**
     * @param {number} x
     * @param {number} y
     * @param {string} bossType   – BOSS_TYPE_BRUTE | BOSS_TYPE_WARLOCK | BOSS_TYPE_PHANTOM
     * @param {number} encounter  – 0-based encounter index for stat scaling
     * @param {number} stage      – current game stage
     * @param {object} [biome]    – optional biome object for themed visuals
     */
    constructor(x, y, bossType, encounter, stage, biome = null) {
        this.x = x;
        this.y = y;
        this.type = bossType;
        this.encounter = encounter;
        this.stage = stage;
        this.dead = false;
        this.xpGiven = false;
        this.isBoss = true;

        // ── Stat scaling ──
        // Encounter scaling (grows per boss beaten) + stage scaling (keeps pace with regular enemy difficulty)
        const hpScale  = (1 + encounter * BOSS_HP_SCALE)  * (1 + stage * BOSS_STAGE_HP_SCALE);
        const dmgScale = (1 + encounter * BOSS_DMG_SCALE) * (1 + stage * BOSS_STAGE_DMG_SCALE);
        const spdScale = (1 + encounter * BOSS_SPD_SCALE) * (1 + stage * BOSS_STAGE_SPD_SCALE);

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
            case BOSS_TYPE_JUGGERNAUT:
                this.radius = BOSS_JUGGERNAUT_RADIUS;
                this.maxHp  = Math.floor(BOSS_BASE_HP * BOSS_JUGGERNAUT_HP_MULT * hpScale);
                this.speed  = BOSS_BASE_SPEED * BOSS_JUGGERNAUT_SPD_MULT * spdScale;
                this.damage = Math.floor(BOSS_BASE_DAMAGE * BOSS_JUGGERNAUT_DMG_MULT * dmgScale);
                this.color  = BOSS_JUGGERNAUT_COLOR;
                this.name   = BOSS_JUGGERNAUT_NAME;
                break;
            case BOSS_TYPE_OVERLORD:
                this.radius = BOSS_OVERLORD_RADIUS;
                this.maxHp  = Math.floor(BOSS_BASE_HP * BOSS_OVERLORD_HP_MULT * hpScale);
                this.speed  = BOSS_BASE_SPEED * BOSS_OVERLORD_SPD_MULT * spdScale;
                this.damage = Math.floor(BOSS_BASE_DAMAGE * BOSS_OVERLORD_DMG_MULT * dmgScale);
                this.color  = BOSS_OVERLORD_COLOR;
                this.name   = BOSS_OVERLORD_NAME;
                break;
        }

        this.hp = this.maxHp;
        this.xpValue = Math.floor(BOSS_XP_REWARD * (1 + encounter * 0.3));

        // ── Biome-themed visual overrides ──
        this._applyBiomeTheme(biome);

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

        // Rocket barrage state (juggernaut)
        this.barrageCount = 0;
        this.barrageTimer = 0;
        this.barrageMax = 0;

        // Stomp indicator (juggernaut)
        this.stompIndicatorRadius = 0;

        // Bombardment state (juggernaut)
        this.bombardTargets = [];   // [{x,y},...] floor positions to strike

        // AoE slam indicator
        this.slamIndicatorRadius = 0;

        // Leap state (brute)
        this.leapTargetX = 0;
        this.leapTargetY = 0;
        this.leapIndicatorRadius = 0;
        this.leapAirborne = false;

        // Shockwave state (brute)
        this.shockwaveIndicatorRadius = 0;

        // Laser sweep state (overlord)
        this.laserSweepAngle = 0;
        this.laserSweepStartAngle = 0;
        this.laserSweepDir = 1;        // +1 or -1 sweep direction
        this.laserSweepActive = false;

        // EMP blast state (overlord)
        this.empIndicatorRadius = 0;

        // ── Events (consumed by game.js each frame) ──
        this._events = [];

        // ── Stun state (from bomb) ──
        this.stunTimer = 0;

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

        this._lastGrid = grid;   // cache for bombardment target picking
        const ms = dt * 1000;

        // Stun: skip AI while stunned
        if (this.stunTimer > 0) {
            this.stunTimer -= ms;
            if (this.damageFlashTimer > 0) this.damageFlashTimer -= ms;
            return;
        }

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
                if (atk.name === 'bombardment') this.bombardTargets = [];
                if (atk.name === 'leap') { this.leapIndicatorRadius = 0; this.leapAirborne = false; }
                if (atk.name === 'shockwave') this.shockwaveIndicatorRadius = 0;
                if (atk.name === 'laser_sweep') { this.laserSweepActive = false; this.laserSweepAngle = 0; }
                if (atk.name === 'emp_blast') this.empIndicatorRadius = 0;
                return;
            }
        }
    }

    _getAttackPool() {
        switch (this.type) {
            case BOSS_TYPE_BRUTE:
                return [
                    { name: 'slam',      weight: 2.5, windup: BOSS_SLAM_WINDUP },
                    { name: 'charge',    weight: 2,   windup: BOSS_CHARGE_WINDUP },
                    { name: 'leap',      weight: 2.5, windup: BOSS_LEAP_WINDUP },
                    { name: 'shockwave', weight: 2,   windup: BOSS_SHOCKWAVE_WINDUP },
                    { name: 'summon',    weight: 1,   windup: BOSS_SUMMON_WINDUP },
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
            case BOSS_TYPE_JUGGERNAUT:
                return [
                    { name: 'rocket',      weight: 2.5, windup: BOSS_ROCKET_WINDUP },
                    { name: 'barrage',     weight: 2,   windup: BOSS_BARRAGE_WINDUP },
                    { name: 'bombardment', weight: 3,   windup: BOSS_BOMBARDMENT_WINDUP },
                    { name: 'stomp',       weight: 2,   windup: BOSS_STOMP_WINDUP },
                    { name: 'summon',      weight: 1,   windup: BOSS_SUMMON_WINDUP },
                ];
            case BOSS_TYPE_OVERLORD:
                return [
                    { name: 'laser_sweep', weight: 3,   windup: BOSS_LASER_SWEEP_WINDUP },
                    { name: 'plasma_fan',  weight: 2.5, windup: BOSS_PLASMA_FAN_WINDUP },
                    { name: 'emp_blast',   weight: 2,   windup: BOSS_EMP_WINDUP },
                    { name: 'ring',        weight: 2,   windup: BOSS_RING_WINDUP },
                    { name: 'summon',      weight: 1.5, windup: BOSS_DRONE_WINDUP },
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
            case 'stomp': {
                // Growing AoE indicator (like slam but bigger)
                const windupTotal = BOSS_STOMP_WINDUP * this.phaseMultiplier;
                const progress = 1 - this.attackTimer / windupTotal;
                const targetR = this.phase === 2 ? BOSS_STOMP_RADIUS * 1.25 : BOSS_STOMP_RADIUS;
                this.stompIndicatorRadius = targetR * progress;
                break;
            }
            case 'bombardment': {
                // Pick targets once at the start of windup
                if (this.bombardTargets.length === 0) {
                    this._pickBombardTargets(player);
                }
                break;
            }
            case 'leap': {
                // Lock target position once at start of windup
                if (this.leapTargetX === 0 && this.leapTargetY === 0) {
                    this.leapTargetX = player.x;
                    this.leapTargetY = player.y;
                }
                // Growing target indicator
                const windupTotal = BOSS_LEAP_WINDUP * this.phaseMultiplier;
                const progress = 1 - this.attackTimer / windupTotal;
                const targetR = this.phase === 2 ? BOSS_LEAP_RADIUS * 1.2 : BOSS_LEAP_RADIUS;
                this.leapIndicatorRadius = targetR * progress;
                break;
            }
            case 'shockwave': {
                // Growing charge indicator
                const windupTotal = BOSS_SHOCKWAVE_WINDUP * this.phaseMultiplier;
                const progress = 1 - this.attackTimer / windupTotal;
                this.shockwaveIndicatorRadius = this.radius * 1.5 * progress;
                break;
            }
            case 'laser_sweep': {
                // Lock sweep start angle toward player
                const lsx = player.x - this.x;
                const lsy = player.y - this.y;
                this.laserSweepStartAngle = Math.atan2(lsy, lsx) - Math.PI / 3;
                this.laserSweepDir = Math.random() < 0.5 ? 1 : -1;
                break;
            }
            case 'emp_blast': {
                const windupTotal = BOSS_EMP_WINDUP * this.phaseMultiplier;
                const progress = 1 - this.attackTimer / windupTotal;
                const targetR = this.phase === 2 ? BOSS_EMP_RADIUS * 1.3 : BOSS_EMP_RADIUS;
                this.empIndicatorRadius = targetR * progress;
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
            case 'rocket':
                this._fireRocket(player, projectiles);
                this._events.push({ type: 'rocket_fire' });
                this.attackTimer = 600; // recovery
                break;
            case 'barrage': {
                this.barrageCount = 0;
                this.barrageTimer = 0;
                this.barrageMax = this.phase === 2 ? 5 : 3;
                this.attackTimer = this.barrageMax * BOSS_BARRAGE_INTERVAL + 500;
                break;
            }
            case 'stomp': {
                const stompR = this.phase === 2 ? BOSS_STOMP_RADIUS * 1.25 : BOSS_STOMP_RADIUS;
                const sdx = player.x - this.x;
                const sdy = player.y - this.y;
                const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
                if (sdist < stompR + player.radius) {
                    player.takeDamage(Math.floor(this.damage * 1.8));
                    // Heavy knockback
                    if (sdist > 0) {
                        player.x += (sdx / sdist) * 45;
                        player.y += (sdy / sdist) * 45;
                    }
                }
                this.stompIndicatorRadius = stompR;
                this._events.push({ type: 'stomp', x: this.x, y: this.y, radius: stompR });
                this.attackTimer = 600; // recovery
                break;
            }
            case 'bombardment': {
                // All targets explode simultaneously
                this._events.push({
                    type: 'bombardment',
                    targets: this.bombardTargets.map(t => ({ ...t })),
                    radius: BOSS_BOMBARDMENT_RADIUS,
                    damage: Math.floor(this.damage * 0.5),
                    linger: BOSS_BOMBARDMENT_LINGER,
                });
                this.attackTimer = 700; // recovery
                break;
            }
            case 'leap': {
                // Teleport to target position
                this.x = this.leapTargetX;
                this.y = this.leapTargetY;
                this.leapAirborne = false;

                // AoE damage on landing
                const leapR = this.phase === 2 ? BOSS_LEAP_RADIUS * 1.2 : BOSS_LEAP_RADIUS;
                const ldx = player.x - this.x;
                const ldy = player.y - this.y;
                const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
                if (ldist < leapR + player.radius) {
                    player.takeDamage(Math.floor(this.damage * 1.3));
                    if (ldist > 0) {
                        player.x += (ldx / ldist) * 35;
                        player.y += (ldy / ldist) * 35;
                    }
                }
                this.leapIndicatorRadius = leapR;
                this._events.push({ type: 'leap', x: this.x, y: this.y, radius: leapR });
                this.attackTimer = 500; // recovery
                break;
            }
            case 'shockwave': {
                // Fire ring of slow, fat projectiles outward
                this._fireShockwaveRing(projectiles);
                this.shockwaveIndicatorRadius = 0;
                this._events.push({ type: 'shockwave', x: this.x, y: this.y });
                this.attackTimer = 500; // recovery
                break;
            }
            case 'laser_sweep': {
                // Begin sweeping laser beam
                this.laserSweepActive = true;
                this.laserSweepAngle = this.laserSweepStartAngle;
                this.attackTimer = BOSS_LASER_SWEEP_DURATION * this.phaseMultiplier;
                this._events.push({ type: 'laser_sweep' });
                break;
            }
            case 'plasma_fan': {
                // Fire a wide fan of plasma projectiles
                this._firePlasmaFan(player, projectiles);
                this._events.push({ type: 'projectile' });
                this.attackTimer = 500; // recovery
                break;
            }
            case 'emp_blast': {
                const empR = this.phase === 2 ? BOSS_EMP_RADIUS * 1.3 : BOSS_EMP_RADIUS;
                const edx = player.x - this.x;
                const edy = player.y - this.y;
                const edist = Math.sqrt(edx * edx + edy * edy);
                if (edist < empR + player.radius) {
                    player.takeDamage(Math.floor(this.damage * 1.2));
                    // EMP knockback
                    if (edist > 0) {
                        player.x += (edx / edist) * 35;
                        player.y += (edy / edist) * 35;
                    }
                }
                this.empIndicatorRadius = empR;
                this._events.push({ type: 'emp_blast', x: this.x, y: this.y, radius: empR });
                this.attackTimer = 600; // recovery
                break;
            }
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

            case 'barrage': {
                this.barrageTimer -= ms;
                if (this.barrageTimer <= 0 && this.barrageCount < this.barrageMax) {
                    this._fireRocket(player, projectiles);
                    this._events.push({ type: 'rocket_fire' });
                    this.barrageCount++;
                    this.barrageTimer = BOSS_BARRAGE_INTERVAL;
                }
                break;
            }

            case 'stomp':
                // Indicator fading during recovery
                this.stompIndicatorRadius *= 0.91;
                break;

            case 'bombardment':
                // Targets fade out during recovery
                break;

            case 'leap':
                // Indicator fading during recovery
                this.leapIndicatorRadius *= 0.91;
                break;

            case 'shockwave':
                // Nothing to update during recovery
                break;

            case 'laser_sweep': {
                // Sweep the laser beam across an arc
                const sweepTotal = BOSS_LASER_SWEEP_DURATION * this.phaseMultiplier;
                const sweepProgress = 1 - this.attackTimer / sweepTotal;
                const sweepArc = this.phase === 2 ? Math.PI * 0.85 : Math.PI * 2 / 3;
                this.laserSweepAngle = this.laserSweepStartAngle + this.laserSweepDir * sweepArc * sweepProgress;

                // Check if player is in the beam path
                const beamLen = 350;  // px beam length
                const beamEndX = this.x + Math.cos(this.laserSweepAngle) * beamLen;
                const beamEndY = this.y + Math.sin(this.laserSweepAngle) * beamLen;
                // Line-circle test
                const lax = beamEndX - this.x, lay = beamEndY - this.y;
                const lenSq = lax * lax + lay * lay;
                if (lenSq > 0) {
                    let t = ((player.x - this.x) * lax + (player.y - this.y) * lay) / lenSq;
                    t = Math.max(0, Math.min(1, t));
                    const cx = this.x + t * lax;
                    const cy = this.y + t * lay;
                    const pdx = player.x - cx, pdy = player.y - cy;
                    const hitR = player.radius + BOSS_LASER_SWEEP_WIDTH;
                    if (pdx * pdx + pdy * pdy < hitR * hitR && this.hitCooldown <= 0) {
                        player.takeDamage(Math.floor(this.damage * 0.8));
                        this.hitCooldown = 400;  // shorter cooldown for laser ticks
                    }
                }
                // End sweep
                if (this.attackTimer <= 0) {
                    this.laserSweepActive = false;
                }
                break;
            }

            case 'emp_blast':
                // Indicator fading
                this.empIndicatorRadius *= 0.92;
                break;
        }
    }

    _finishAttack() {
        this.currentAttack = null;
        this.attackPhase = 0;
        this.attackCooldown = BOSS_ATTACK_COOLDOWN * this.phaseMultiplier;
        this.slamIndicatorRadius = 0;
        this.stompIndicatorRadius = 0;
        this.leapIndicatorRadius = 0;
        this.leapAirborne = false;
        this.leapTargetX = 0;
        this.leapTargetY = 0;
        this.shockwaveIndicatorRadius = 0;
        this.bombardTargets = [];
        this.laserSweepActive = false;
        this.empIndicatorRadius = 0;
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

    // ── Shockwave ring (brute) ─────────────────────────────

    _fireShockwaveRing(projectiles) {
        const count = this.phase === 2 ? BOSS_SHOCKWAVE_COUNT + 4 : BOSS_SHOCKWAVE_COUNT;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            projectiles.push(new Projectile(
                this.x + dirX * (this.radius + PROJECTILE_RADIUS + 6),
                this.y + dirY * (this.radius + PROJECTILE_RADIUS + 6),
                dirX, dirY,
                BOSS_SHOCKWAVE_SPEED,
                Math.floor(this.damage * 0.5),
                PROJECTILE_RADIUS + 3,     // fat, visible projectiles
                this.color,
            ));
        }
    }

    // ── Plasma fan (overlord) ──────────────────────────────

    _firePlasmaFan(player, projectiles) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const baseAngle = Math.atan2(dy, dx);
        const count = this.phase === 2 ? 9 : 6;
        const spread = this.phase === 2 ? Math.PI * 0.55 : Math.PI * 0.4;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle - spread / 2 + (spread / (count - 1)) * i;
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            // Alternate slow/fast for a staggered wave feel
            const speed = (i % 2 === 0) ? PROJECTILE_SPEED * 0.75 : PROJECTILE_SPEED * 0.55;
            projectiles.push(new Projectile(
                this.x + dirX * (this.radius + PROJECTILE_RADIUS + 4),
                this.y + dirY * (this.radius + PROJECTILE_RADIUS + 4),
                dirX, dirY,
                speed,
                Math.floor(this.damage * 0.55),
                PROJECTILE_RADIUS + 1,
                '#00e5ff',  // cyan plasma
            ));
        }
    }

    // ── Rocket attacks (juggernaut) ────────────────────────

    _fireRocket(player, projectiles) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        // Lead the target slightly (predict player position)
        const travelTime = dist / BOSS_ROCKET_SPEED;
        const leadX = player.x + (player.vx || 0) * travelTime * 0.3;
        const leadY = player.y + (player.vy || 0) * travelTime * 0.3;
        const ldx = leadX - this.x;
        const ldy = leadY - this.y;
        const ldist = Math.sqrt(ldx * ldx + ldy * ldy);

        // Add slight spread for barrage variety
        const spread = (Math.random() - 0.5) * 0.2;
        const baseAngle = Math.atan2(ldy, ldx) + spread;
        const dirX = Math.cos(baseAngle);
        const dirY = Math.sin(baseAngle);

        const splashDmg = Math.floor(this.damage * 0.4);

        projectiles.push(new RocketProjectile(
            this.x + dirX * (this.radius + BOSS_ROCKET_RADIUS + 6),
            this.y + dirY * (this.radius + BOSS_ROCKET_RADIUS + 6),
            dirX, dirY,
            BOSS_ROCKET_SPEED,
            Math.floor(this.damage * 0.8),   // direct hit damage
            splashDmg,                        // splash damage per tick
            BOSS_ROCKET_RADIUS,
            this.color,
        ));
    }

    // ── Bombardment (juggernaut) ───────────────────────────

    /**
     * Pick random floor-tile positions as bombardment targets.
     * Spread across the arena, some biased toward the player.
     */
    _pickBombardTargets(player) {
        const grid = this._lastGrid;
        const count = this.phase === 2
            ? BOSS_BOMBARDMENT_COUNT + 3
            : BOSS_BOMBARDMENT_COUNT;

        // Collect all walkable floor tile centers
        const floors = [];
        if (grid) {
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[0].length; c++) {
                    if (!grid[r][c]) {
                        floors.push({
                            x: c * TILE_SIZE + TILE_SIZE / 2,
                            y: r * TILE_SIZE + TILE_SIZE / 2,
                        });
                    }
                }
            }
        }

        // Fallback if grid unavailable: random canvas positions
        if (floors.length === 0) {
            for (let i = 0; i < count; i++) {
                this.bombardTargets.push({
                    x: 80 + Math.random() * (CANVAS_WIDTH - 160),
                    y: 80 + Math.random() * (CANVAS_HEIGHT - 160),
                });
            }
            return;
        }

        // Shuffle floors (Fisher-Yates)
        for (let i = floors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [floors[i], floors[j]] = [floors[j], floors[i]];
        }

        // Pick targets — bias ~40% toward player vicinity
        const nearPlayer = [];
        const farTiles = [];
        const nearDist = TILE_SIZE * 4;  // within 4 tiles of player = "near"

        for (const f of floors) {
            const dx = f.x - player.x;
            const dy = f.y - player.y;
            if (Math.sqrt(dx * dx + dy * dy) < nearDist) {
                nearPlayer.push(f);
            } else {
                farTiles.push(f);
            }
        }

        const nearCount = Math.min(Math.ceil(count * 0.4), nearPlayer.length);
        const farCount  = Math.min(count - nearCount, farTiles.length);

        for (let i = 0; i < nearCount; i++) {
            this.bombardTargets.push(nearPlayer[i]);
        }
        for (let i = 0; i < farCount; i++) {
            this.bombardTargets.push(farTiles[i]);
        }

        // Fill any remainder from whatever's left
        let remaining = count - this.bombardTargets.length;
        let idx = 0;
        while (remaining > 0 && idx < floors.length) {
            const f = floors[idx++];
            if (!this.bombardTargets.includes(f)) {
                this.bombardTargets.push(f);
                remaining--;
            }
        }
    }

    // ── Summon attacks ─────────────────────────────────────

    _spawnAdds() {
        const count = this.phase === 2 ? 3 : 2;
        let addType = ENEMY_TYPE_BASIC;
        if (this.type === BOSS_TYPE_WARLOCK) addType = ENEMY_TYPE_SHOOTER;
        if (this.type === BOSS_TYPE_JUGGERNAUT) addType = ENEMY_TYPE_TANK;
        if (this.type === BOSS_TYPE_OVERLORD) addType = ENEMY_TYPE_SHOOTER;  // drones

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

    takeDamage(amount, kbX = 0, kbY = 0, isCrit = false) {
        if (this.dead) return;
        this.hp -= amount;
        this.damageFlashTimer = 120;

        // Push damage event for floating damage numbers
        Boss.damageEvents.push({ x: this.x, y: this.y - this.radius - 4, amount, isCrit });

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
            case BOSS_TYPE_BRUTE:      this._renderBrute(ctx, flash);      break;
            case BOSS_TYPE_WARLOCK:    this._renderWarlock(ctx, flash);    break;
            case BOSS_TYPE_PHANTOM:    this._renderPhantom(ctx, flash);    break;
            case BOSS_TYPE_JUGGERNAUT: this._renderJuggernaut(ctx, flash); break;
            case BOSS_TYPE_OVERLORD:   this._renderOverlord(ctx, flash);   break;
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

        // Stun indicator — spinning stars
        if (this.stunTimer > 0) {
            ctx.save();
            const elapsed = Date.now();
            const alpha = Math.min(1, this.stunTimer / 300);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffd700';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            for (let i = 0; i < 5; i++) {
                const angle = (elapsed * 0.004) + (i * Math.PI * 2 / 5);
                const sx = this.x + Math.cos(angle) * (this.radius + 8);
                const sy = this.y - this.radius - 8 + Math.sin(angle * 2) * 3;
                ctx.fillText('✦', sx, sy);
            }
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

        // Stomp AoE indicator (juggernaut — orange circle growing during windup)
        if (this.currentAttack === 'stomp' && this.stompIndicatorRadius > 5) {
            ctx.save();
            const alpha = this.attackPhase === 1 ? 0.22 : 0.12;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.stompIndicatorRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = alpha * 2;
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
        }

        // Rocket / Barrage windup glow (juggernaut — orange pulsing)
        if ((this.currentAttack === 'rocket' || this.currentAttack === 'barrage') && this.attackPhase === 1) {
            const windupTotal = this.currentAttack === 'rocket' ? BOSS_ROCKET_WINDUP : BOSS_BARRAGE_WINDUP;
            const progress = 1 - this.attackTimer / (windupTotal * this.phaseMultiplier);
            ctx.save();
            ctx.globalAlpha = progress * 0.5;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.6 * progress, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Bombardment danger zones (juggernaut — pulsing red/orange warning circles on the floor)
        if (this.currentAttack === 'bombardment' && this.bombardTargets.length > 0) {
            const windupTotal = BOSS_BOMBARDMENT_WINDUP * this.phaseMultiplier;
            const progress = this.attackPhase === 1
                ? Math.min(1, 1 - this.attackTimer / windupTotal)
                : 1;
            const pulse = Math.sin(Date.now() * 0.015) * 0.1;
            const time = Date.now();

            for (const t of this.bombardTargets) {
                const r = BOSS_BOMBARDMENT_RADIUS;

                if (this.attackPhase === 1) {
                    // ── Windup: growing warning zone ──
                    const zoneR = r * progress;

                    // Outer ring (dashed, pulsing)
                    ctx.save();
                    ctx.globalAlpha = (0.25 + pulse) * progress;
                    ctx.strokeStyle = '#ff3300';
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, zoneR, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();

                    // Fill
                    ctx.save();
                    ctx.globalAlpha = (0.08 + pulse * 0.5) * progress;
                    ctx.fillStyle = '#ff4400';
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, zoneR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    // Crosshair lines
                    ctx.save();
                    ctx.globalAlpha = (0.2 + pulse) * progress;
                    ctx.strokeStyle = '#ff6600';
                    ctx.lineWidth = 1;
                    const cross = zoneR * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(t.x - cross, t.y);
                    ctx.lineTo(t.x + cross, t.y);
                    ctx.moveTo(t.x, t.y - cross);
                    ctx.lineTo(t.x, t.y + cross);
                    ctx.stroke();
                    ctx.restore();

                    // Center dot (blinks faster as impact approaches)
                    const blinkRate = 0.005 + progress * 0.025;
                    const blink = Math.sin(time * blinkRate) > 0 ? 1 : 0.3;
                    ctx.save();
                    ctx.globalAlpha = blink * progress;
                    ctx.fillStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else {
                    // ── Recovery phase: flash at impact then fade ──
                    const recoveryProgress = this.attackTimer / 700; // 700ms recovery
                    if (recoveryProgress > 0.5) {
                        ctx.save();
                        ctx.globalAlpha = (recoveryProgress - 0.5) * 0.3;
                        ctx.fillStyle = '#ff6600';
                        ctx.beginPath();
                        ctx.arc(t.x, t.y, r * 0.4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }
            }
        }

        // Leap target indicator (orange-red crosshair on ground during windup, fades during recovery)
        if (this.currentAttack === 'leap') {
            const leapR = this.phase === 2 ? BOSS_LEAP_RADIUS * 1.2 : BOSS_LEAP_RADIUS;
            if (this.attackPhase === 1 && this.leapIndicatorRadius > 5) {
                const windupTotal = BOSS_LEAP_WINDUP * this.phaseMultiplier;
                const progress = 1 - this.attackTimer / windupTotal;
                const pulse = Math.sin(Date.now() * 0.02) * 0.1;

                // Danger zone circle at target
                ctx.save();
                ctx.globalAlpha = (0.12 + pulse) * progress;
                ctx.fillStyle = '#ff3300';
                ctx.beginPath();
                ctx.arc(this.leapTargetX, this.leapTargetY, this.leapIndicatorRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Outer ring
                ctx.save();
                ctx.globalAlpha = (0.35 + pulse) * progress;
                ctx.strokeStyle = '#ff4400';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.arc(this.leapTargetX, this.leapTargetY, this.leapIndicatorRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();

                // Crosshair
                ctx.save();
                ctx.globalAlpha = (0.3 + pulse) * progress;
                ctx.strokeStyle = '#ff6600';
                ctx.lineWidth = 1.5;
                const cross = this.leapIndicatorRadius * 0.7;
                ctx.beginPath();
                ctx.moveTo(this.leapTargetX - cross, this.leapTargetY);
                ctx.lineTo(this.leapTargetX + cross, this.leapTargetY);
                ctx.moveTo(this.leapTargetX, this.leapTargetY - cross);
                ctx.lineTo(this.leapTargetX, this.leapTargetY + cross);
                ctx.stroke();
                ctx.restore();

                // Center dot (blinks faster as impact approaches)
                const blinkRate = 0.005 + progress * 0.03;
                const blink = Math.sin(Date.now() * blinkRate) > 0 ? 1 : 0.3;
                ctx.save();
                ctx.globalAlpha = blink * progress;
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(this.leapTargetX, this.leapTargetY, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (this.attackPhase === 2 && this.leapIndicatorRadius > 3) {
                // Impact flash & fade
                ctx.save();
                ctx.globalAlpha = this.leapIndicatorRadius / leapR * 0.25;
                ctx.fillStyle = '#ff4400';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.leapIndicatorRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Shockwave windup indicator (pulsing ring around boss)
        if (this.currentAttack === 'shockwave' && this.attackPhase === 1 && this.shockwaveIndicatorRadius > 3) {
            const pulse = Math.sin(Date.now() * 0.025) * 0.1;
            ctx.save();
            ctx.globalAlpha = 0.3 + pulse;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.shockwaveIndicatorRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Inner glow
            ctx.save();
            ctx.globalAlpha = 0.15 + pulse;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.shockwaveIndicatorRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ── Biome theme application ────────────────────────────

    _applyBiomeTheme(biome) {
        // Default colors (used when no biome or no theme defined)
        const defaults = {
            brute:      { body: BOSS_BRUTE_COLOR,      stroke: '#a84300', eyes: '#ff6600', eyesFlash: '#ff4444', chargeAura: '#ff4444' },
            warlock:    { body: BOSS_WARLOCK_COLOR,     stroke: '#6c3483', innerEye: '#e0b0ff', innerEyeFlash: '#bb86fc', pupil: '#2a0134', orbit: BOSS_WARLOCK_COLOR },
            phantom:    { body: BOSS_PHANTOM_COLOR,     stroke: '#00838f', glow: '#e0f7fa', afterimage: BOSS_PHANTOM_COLOR },
            juggernaut: { body: BOSS_JUGGERNAUT_COLOR,  stroke: '#bf6516', armor: '#c68a17', armorLight: '#e8a838', viewport: '#ff4400', viewportGlow: '#ff6600' },
            overlord:   { body: BOSS_OVERLORD_COLOR,    stroke: '#01579b', innerEye: '#00e5ff', innerEyeFlash: '#18ffff', pupil: '#000a12', orbit: '#82b1ff', viewport: '#00e5ff', viewportGlow: '#80d8ff', shieldColor: '#00e5ff', laserColor: '#ff1744' },
        };

        const theme = biome && biome.bossTheme ? biome.bossTheme[this.type] : null;
        const fallback = defaults[this.type] || defaults.brute;

        this.themeBody       = (theme && theme.body)          || fallback.body;
        this.themeStroke     = (theme && theme.stroke)        || fallback.stroke;
        this.themeEyes       = (theme && theme.eyes)          || fallback.eyes;
        this.themeEyesFlash  = (theme && theme.eyesFlash)     || fallback.eyesFlash;
        this.themeChargeAura = (theme && theme.chargeAura)    || fallback.chargeAura;
        this.themeInnerEye      = (theme && theme.innerEye)      || fallback.innerEye;
        this.themeInnerEyeFlash = (theme && theme.innerEyeFlash) || fallback.innerEyeFlash;
        this.themePupil      = (theme && theme.pupil)         || fallback.pupil;
        this.themeOrbit      = (theme && theme.orbit)         || fallback.orbit;
        this.themeGlow       = (theme && theme.glow)          || fallback.glow;
        this.themeAfterimage = (theme && theme.afterimage)    || fallback.afterimage;

        // Juggernaut-specific
        this.themeArmor        = (theme && theme.armor)        || fallback.armor;
        this.themeArmorLight   = (theme && theme.armorLight)   || fallback.armorLight;
        this.themeViewport     = (theme && theme.viewport)     || fallback.viewport;
        this.themeViewportGlow = (theme && theme.viewportGlow) || fallback.viewportGlow;

        // Overlord-specific
        this.themeShieldColor = (theme && theme.shieldColor) || fallback.shieldColor || '#00e5ff';
        this.themeLaserColor  = (theme && theme.laserColor)  || fallback.laserColor  || '#ff1744';

        // Override base color used by projectiles & attack indicators
        if (theme) this.color = theme.body;
    }

    // ── Boss type rendering ────────────────────────────────

    _renderBrute(ctx, flash) {
        // Octagon
        ctx.fillStyle = flash ? '#ffffff' : this.themeBody;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i - Math.PI / 8;
            const px = this.x + this.radius * Math.cos(angle);
            const py = this.y + this.radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this.themeStroke;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Eyes
        const eyeOffX = Math.cos(this.facingAngle) * this.radius * 0.35;
        const eyeOffY = Math.sin(this.facingAngle) * this.radius * 0.35;
        const perpX = -Math.sin(this.facingAngle);
        const perpY = Math.cos(this.facingAngle);

        ctx.fillStyle = flash ? this.themeEyesFlash : this.themeEyes;
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
            ctx.strokeStyle = this.themeChargeAura;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    _renderWarlock(ctx, flash) {
        // Pentagon
        ctx.fillStyle = flash ? '#ffffff' : this.themeBody;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const px = this.x + this.radius * Math.cos(angle);
            const py = this.y + this.radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this.themeStroke;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner eye
        ctx.fillStyle = flash ? this.themeInnerEyeFlash : this.themeInnerEye;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Pupil (tracks player)
        const pupilDist = this.radius * 0.15;
        ctx.fillStyle = this.themePupil;
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
            ctx.fillStyle = this.themeOrbit;
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

        ctx.fillStyle = flash ? '#ffffff' : this.themeBody;
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

        ctx.strokeStyle = this.themeStroke;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Central glow
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.006) * 0.2;
        ctx.fillStyle = this.themeGlow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Dash afterimage
        if (this.currentAttack === 'dash_strike' && this.attackPhase === 2) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = this.themeAfterimage;
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

    _renderJuggernaut(ctx, flash) {
        // Hexagon (armored tank shape)
        ctx.fillStyle = flash ? '#ffffff' : this.themeBody;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = this.x + this.radius * Math.cos(angle);
            const py = this.y + this.radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Heavy border (armor plating)
        ctx.strokeStyle = this.themeStroke;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Inner armor plates (two horizontal lines)
        ctx.save();
        ctx.strokeStyle = this.themeArmor || '#c68a17';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(this.x - this.radius * 0.6, this.y - this.radius * 0.2);
        ctx.lineTo(this.x + this.radius * 0.6, this.y - this.radius * 0.2);
        ctx.moveTo(this.x - this.radius * 0.6, this.y + this.radius * 0.2);
        ctx.lineTo(this.x + this.radius * 0.6, this.y + this.radius * 0.2);
        ctx.stroke();
        ctx.restore();

        // Viewport / visor (single red slit eye facing player)
        const eyeOffX = Math.cos(this.facingAngle) * this.radius * 0.4;
        const eyeOffY = Math.sin(this.facingAngle) * this.radius * 0.4;
        const perpX = -Math.sin(this.facingAngle);
        const perpY = Math.cos(this.facingAngle);

        // Viewport glow
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.008) * 0.2;
        ctx.fillStyle = this.themeViewportGlow || '#ff6600';
        ctx.beginPath();
        ctx.ellipse(
            this.x + eyeOffX, this.y + eyeOffY,
            8, 3, Math.atan2(perpY, perpX), 0, Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();

        // Viewport core
        ctx.fillStyle = flash ? '#ffffff' : (this.themeViewport || '#ff4400');
        ctx.beginPath();
        ctx.ellipse(
            this.x + eyeOffX, this.y + eyeOffY,
            6, 2, Math.atan2(perpY, perpX), 0, Math.PI * 2,
        );
        ctx.fill();

        // Shoulder cannons (two small circles offset from center)
        const cannonDist = this.radius * 0.7;
        for (const side of [-1, 1]) {
            const cx = this.x - Math.cos(this.facingAngle) * 2 + perpX * cannonDist * side * 0.6;
            const cy = this.y - Math.sin(this.facingAngle) * 2 + perpY * cannonDist * side * 0.6;
            ctx.fillStyle = flash ? '#ffffff' : '#555';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.themeStroke;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Barrage / rocket firing visual: cannon flash
        if ((this.currentAttack === 'rocket' || this.currentAttack === 'barrage') && this.attackPhase === 2) {
            ctx.save();
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.03) * 0.3;
            ctx.fillStyle = '#ff6600';
            const fwdX = Math.cos(this.facingAngle) * (this.radius + 8);
            const fwdY = Math.sin(this.facingAngle) * (this.radius + 8);
            ctx.beginPath();
            ctx.arc(this.x + fwdX, this.y + fwdY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Stomp visual: ground pound effect
        if (this.currentAttack === 'stomp' && this.attackPhase === 2) {
            ctx.save();
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.02) * 0.2;
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    _renderOverlord(ctx, flash) {
        const t = Date.now();

        // Diamond / rhombus body shape (rotated square, sci-fi feel)
        ctx.fillStyle = flash ? '#ffffff' : this.themeBody;
        ctx.beginPath();
        const r = this.radius;
        ctx.moveTo(this.x, this.y - r);              // top
        ctx.lineTo(this.x + r * 0.85, this.y);       // right
        ctx.lineTo(this.x, this.y + r);               // bottom
        ctx.lineTo(this.x - r * 0.85, this.y);        // left
        ctx.closePath();
        ctx.fill();

        // Heavy outer border
        ctx.strokeStyle = this.themeStroke;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner panel lines (tech look)
        ctx.save();
        ctx.strokeStyle = this.themeShieldColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - r * 0.5);
        ctx.lineTo(this.x + r * 0.42, this.y);
        ctx.lineTo(this.x, this.y + r * 0.5);
        ctx.lineTo(this.x - r * 0.42, this.y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Central eye / core (large, glowing, tracks player)
        const coreR = r * 0.25;
        const coreOffX = Math.cos(this.facingAngle) * r * 0.15;
        const coreOffY = Math.sin(this.facingAngle) * r * 0.15;

        // Eye glow ring
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(t * 0.008) * 0.2;
        ctx.fillStyle = this.themeShieldColor;
        ctx.beginPath();
        ctx.arc(this.x + coreOffX, this.y + coreOffY, coreR + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Eye inner
        ctx.fillStyle = flash ? this.themeInnerEyeFlash : this.themeInnerEye;
        ctx.beginPath();
        ctx.arc(this.x + coreOffX, this.y + coreOffY, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        const pupilDist = r * 0.08;
        ctx.fillStyle = this.themePupil;
        ctx.beginPath();
        ctx.arc(
            this.x + coreOffX + Math.cos(this.facingAngle) * pupilDist,
            this.y + coreOffY + Math.sin(this.facingAngle) * pupilDist,
            coreR * 0.45, 0, Math.PI * 2,
        );
        ctx.fill();

        // Orbiting data fragments (small rotating squares)
        ctx.save();
        ctx.globalAlpha = 0.55;
        const orbitR = r + 12;
        const orbitCount = this.phase === 2 ? 5 : 4;
        for (let i = 0; i < orbitCount; i++) {
            const angle = t * 0.003 + (Math.PI * 2 / orbitCount) * i;
            const ox = this.x + Math.cos(angle) * orbitR;
            const oy = this.y + Math.sin(angle) * orbitR;
            ctx.save();
            ctx.translate(ox, oy);
            ctx.rotate(angle * 2);
            ctx.fillStyle = this.themeOrbit;
            ctx.fillRect(-2.5, -2.5, 5, 5);
            ctx.restore();
        }
        ctx.restore();

        // Shield shimmer in phase 2
        if (this.phase === 2) {
            ctx.save();
            ctx.globalAlpha = 0.12 + Math.sin(t * 0.006) * 0.08;
            ctx.strokeStyle = this.themeShieldColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // EMP visual: expanding pulse ring after blast
        if (this.currentAttack === 'emp_blast' && this.attackPhase === 2) {
            ctx.save();
            ctx.globalAlpha = 0.4 + Math.sin(t * 0.025) * 0.2;
            ctx.strokeStyle = '#18ffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

/** Shared damage events buffer — read & cleared by game.js each frame */
Boss.damageEvents = [];
