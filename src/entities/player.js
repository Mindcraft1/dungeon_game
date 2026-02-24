import {
    PLAYER_RADIUS, PLAYER_SPEED, PLAYER_MAX_HP, PLAYER_DAMAGE,
    PLAYER_COLOR, PLAYER_INVULN_TIME,
    ATTACK_RANGE, ATTACK_ARC, ATTACK_COOLDOWN, ATTACK_DURATION, ATTACK_KNOCKBACK,
    DAGGER_COOLDOWN, DAGGER_DAMAGE_MULT, DAGGER_SPEED, DAGGER_RANGE,
    DAGGER_RADIUS, DAGGER_COLOR, DAGGER_KNOCKBACK,
    DASH_SPEED_MULT, DASH_DURATION, DASH_COOLDOWN, DASH_INVULN_TIME,
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
    HAZARD_TAR_SLOW,
    PLAYER_BASE_CRIT_CHANCE,
    TILE_SIZE, TILE_CANYON, MAX_DASH_CROSS_TILES,
} from '../constants.js';
import { resolveWalls, resolveWallsOnly, isCanyon } from '../collision.js';
import { devOverrides, getVal } from '../ui/devTools.js';
import { applyFreeze, applyBurn } from '../combat/statusEffects.js';
import { renderClassEmblem } from '../classes.js';

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
        this.daggerCooldown = 0;   // ranged attack cooldown

        // ── Dash / Dodge Roll ──
        this.dashing = false;
        this.dashTimer = 0;       // remaining ms of current dash
        this.dashCooldown = 0;    // remaining ms before next dash allowed
        this.dashDirX = 0;
        this.dashDirY = 0;

        // ── Buff system ──
        // Each buff: { type, remaining (ms), duration (ms) }
        this.activeBuffs = [];
        this.phaseShieldActive = false;   // blocks next hit
        this.crushingBlowReady = false;   // next attack = 3× damage
        this.onLava = false;              // set per frame by hazard system
        this.onTar = false;               // set per frame by tar hazard
        this.tarLingerTimer = 0;          // ms of lingering tar slow
        this.biomeSpeedMult = 1.0;        // set per room by biome system
        this.attackRangeMultiplier = 1.0;  // set by run upgrades (aoe_swing)

        // ── Meta Progression modifiers (set by game.js at run start) ──
        this.metaBossDamageMultiplier = 1;
        this.metaDamageTakenMultiplier = 1;
        this.metaSpikeDamageMultiplier = 1;
        this.metaLavaDotMultiplier = 1;

        // ── Canyon / Pit tracking ──
        this.lastSafeX = x;
        this.lastSafeY = y;
        this.fellInCanyon = false;  // set per-frame; game.js reads and clears it
        this.canyonFallCooldown = 0; // ms — while >0 canyons block like walls

        // ── Crit Chance (base, can be upgraded) ──
        this.critChance = PLAYER_BASE_CRIT_CHANCE;

        // ── Overheal (stacked HP beyond maxHp) ──
        this.overHeal = 0;

        // ── Shop modifiers (set by game.js) ──
        this.shopTrapResistMult = 1;   // from run_item_trap_resist

        // ── Mouse aim state (set by game.js per frame) ──
        this._mouseAiming = false;

        // ── Cosmetic colors (set by game.js from profile) ──
        this.bodyColor = PLAYER_COLOR;
        this.outlineColor = '#2980b9';
        this.dashColor = '#b3e5fc';
        this.ghostColor = '#4fc3f7';

        // ── Cosmetic hat (set by game.js from profile) ──
        this.hatRender = null;  // function(ctx, x, y, radius, facingAngle) or null

        // ── Class system (set by game.js at run start) ──
        this.classId = null;                  // 'adventurer' | 'guardian' | 'rogue' | 'berserker'
        this.classPassive = null;             // passive definition from classes.js

        // Adventurer passive — room clear heal
        this.adventurerHealPercent = 0;       // 0 = no adventurer heal

        // Guardian passive — auto-shield
        this.guardianShieldReady = false;
        this.guardianShieldCooldown = 0;      // ms until shield recharges
        this.guardianShieldMaxCooldown = 0;   // max cooldown (from passive def)

        // Rogue passive — crit multiplier
        this.rogueCritMult = 0;               // 0 means no rogue bonus (use default 1.5×)

        // Berserker passive — rage below HP threshold
        this.berserkThreshold = 0;            // HP% threshold (0-1)
        this.berserkDamageBuff = 0;           // bonus damage multiplier (0-1)
        this.berserkActive = false;           // currently in berserk state?

        // ── Weapon system (set by game.js from loadout) ──
        this.weaponId = 'sword';              // equipped weapon ID
        this.weaponArcMult = 1;               // multiplier on ATTACK_ARC
        this.weaponRangeMult = 1;             // multiplier on ATTACK_RANGE
        this.weaponCooldownMult = 1;          // multiplier on ATTACK_COOLDOWN
        this.weaponDamageMult = 1;            // multiplier on melee damage
        this.weaponKnockbackMult = 1;         // multiplier on ATTACK_KNOCKBACK
        this.weaponColor = '#90caf9';         // theme color for attack arc
    }

    /**
     * Point the player's facing direction toward the given canvas coordinate.
     * Call this from game.js when mouse aim is enabled and mouse is active.
     */
    setFacingFromMouse(mx, my) {
        const dx = mx - this.x;
        const dy = my - this.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1) {
            this.facingX = dx / len;
            this.facingY = dy / len;
            this._mouseAiming = true;
        }
    }

    update(dt, movement, grid) {
        if (movement.x !== 0 || movement.y !== 0) {
            // Only update facing from movement if mouse aim is not active
            if (!this._mouseAiming) {
                this.facingX = movement.x;
                this.facingY = movement.y;
            }
        }

        const ms = dt * 1000;
        this.fellInCanyon = false;  // reset per frame

        // ── Dash logic ──
        if (this.dashCooldown > 0) this.dashCooldown -= ms;

        if (this.dashing) {
            this.dashTimer -= ms;
            if (this.dashTimer <= 0) {
                this.dashing = false;
                this.dashTimer = 0;
                // Dash ended — check if we landed on a canyon tile
                this._checkCanyonFall(grid);
            } else {
                // Dash movement: use resolveWallsOnly so we can cross canyon gaps
                const dashSpeed = this.getEffectiveSpeed() * getVal('dashSpeedMult', DASH_SPEED_MULT);
                this.x += this.dashDirX * dashSpeed * dt;
                this.y += this.dashDirY * dashSpeed * dt;
                resolveWallsOnly(this, this.radius, grid);

                // During dash: count consecutive canyon tiles along dash path
                // If we've crossed too wide a gap, clamp to last safe position
                const col = Math.floor(this.x / TILE_SIZE);
                const row = Math.floor(this.y / TILE_SIZE);
                if (isCanyon(grid, col, row)) {
                    // Count consecutive canyon tiles from last safe pos in dash direction
                    const gapWidth = this._measureCanyonGap(grid, this.dashDirX, this.dashDirY);
                    if (gapWidth > MAX_DASH_CROSS_TILES) {
                        // Too wide — end dash and trigger fall (game.js teleports to spawn)
                        this.dashing = false;
                        this.dashTimer = 0;
                        this.fellInCanyon = true;
                    }
                    // Narrow enough: let dash continue through
                }

                // Tick other timers and return (skip normal movement)
                if (this.attackTimer > 0) this.attackTimer -= ms;
                if (this.attackVisualTimer > 0) this.attackVisualTimer -= ms;
                if (this.invulnTimer > 0) this.invulnTimer -= ms;
                if (this.damageFlashTimer > 0) this.damageFlashTimer -= ms;
                if (this.daggerCooldown > 0) this.daggerCooldown -= ms;
                this._updateBuffs(ms);
                return;
            }
        }

        // Tick canyon fall cooldown
        if (this.canyonFallCooldown > 0) this.canyonFallCooldown -= ms;

        const moveSpeed = this.getEffectiveSpeed();
        this.x += movement.x * moveSpeed * dt;
        this.y += movement.y * moveSpeed * dt;

        // During cooldown: canyons block like walls so player can't re-enter.
        // Otherwise: canyons are passable and walking on one triggers a fall.
        if (this.canyonFallCooldown > 0) {
            resolveWalls(this, this.radius, grid);
        } else {
            resolveWallsOnly(this, this.radius, grid);
        }

        // Check if player stepped onto a canyon tile
        const col = Math.floor(this.x / TILE_SIZE);
        const row = Math.floor(this.y / TILE_SIZE);
        if (this.canyonFallCooldown <= 0 && isCanyon(grid, col, row)) {
            this.fellInCanyon = true;
        }

        if (this.attackTimer > 0) this.attackTimer -= ms;
        if (this.attackVisualTimer > 0) this.attackVisualTimer -= ms;
        if (this.invulnTimer > 0) this.invulnTimer -= ms;
        if (this.damageFlashTimer > 0) this.damageFlashTimer -= ms;
        if (this.daggerCooldown > 0) this.daggerCooldown -= ms;
        this._updateBuffs(ms);

        // ── Guardian shield recharge ──
        if (this.guardianShieldMaxCooldown > 0 && !this.guardianShieldReady && this.guardianShieldCooldown > 0) {
            this.guardianShieldCooldown -= ms;
            if (this.guardianShieldCooldown <= 0) {
                this.guardianShieldReady = true;
                this.guardianShieldCooldown = 0;
            }
        }

        // ── Berserker rage state ──
        if (this.berserkThreshold > 0) {
            this.berserkActive = (this.hp / this.maxHp) <= this.berserkThreshold;
        }
    }

    // ── Canyon helpers ───────────────────────────────────────

    /** Check if dash ended on a canyon tile; if so, flag as fell. */
    _checkCanyonFall(grid) {
        const col = Math.floor(this.x / TILE_SIZE);
        const row = Math.floor(this.y / TILE_SIZE);
        if (isCanyon(grid, col, row)) {
            // Dash ended inside canyon — teleport back to safe pos
            this.fellInCanyon = true;
        }
    }

    /**
     * Measure the width of the canyon gap from lastSafePos along the dash direction.
     * Returns number of consecutive canyon tiles in that direction.
     */
    _measureCanyonGap(grid, dirX, dirY) {
        const safeCol = Math.floor(this.lastSafeX / TILE_SIZE);
        const safeRow = Math.floor(this.lastSafeY / TILE_SIZE);

        // Determine step direction (dominant axis or diagonal)
        const stepC = dirX > 0.3 ? 1 : dirX < -0.3 ? -1 : 0;
        const stepR = dirY > 0.3 ? 1 : dirY < -0.3 ? -1 : 0;
        if (stepC === 0 && stepR === 0) return 999; // can't determine direction

        let canyonCount = 0;
        let c = safeCol + stepC;
        let r = safeRow + stepR;

        while (c >= 0 && c < grid[0].length && r >= 0 && r < grid.length) {
            if (isCanyon(grid, c, r)) {
                canyonCount++;
            } else {
                break; // hit non-canyon — end of gap
            }
            c += stepC;
            r += stepR;
        }
        return canyonCount;
    }

    /**
     * Attempt to start a dash in the given direction.
     * Returns true if the dash was started, false if on cooldown or no direction.
     * @param {object} movement - { x, y }
     * @param {object} [mods] - combatMods.dash from UpgradeEngine (optional)
     * @param {object} [globalMods] - combatMods.global from UpgradeEngine (optional)
     */
    tryDash(movement, mods = {}, globalMods = {}) {
        if (this.dashing) return false;
        if (this.dashCooldown > 0) return false;

        // Need a movement direction to dash
        let dirX = movement.x;
        let dirY = movement.y;
        if (dirX === 0 && dirY === 0) {
            // Use facing direction if not moving
            dirX = this.facingX;
            dirY = this.facingY;
        }
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len === 0) return false;
        dirX /= len;
        dirY /= len;

        // Duration + cooldown with node multipliers
        const durationMult = (mods.durationMult || 1);
        const cdMult = (mods.cooldownMult || 1) * (globalMods.cooldownMult || 1);

        this.dashing = true;
        this.dashTimer = getVal('dashDuration', DASH_DURATION) * durationMult;
        this.dashCooldown = getVal('dashCooldown', DASH_COOLDOWN) * cdMult;
        this.dashDirX = dirX;
        this.dashDirY = dirY;
        this.invulnTimer = Math.max(this.invulnTimer, DASH_INVULN_TIME);
        return true;
    }

    /**
     * Directional melee attack (120° arc in facing direction).
     * Returns an object { hitCount, hitEnemies, killed } or -1 if on cooldown.
     * @param {Array} enemies - enemies + bosses to check
     * @param {object} [mods] - combatMods.melee from UpgradeEngine (optional)
     * @param {object} [globalMods] - combatMods.global from UpgradeEngine (optional)
     */
    attack(enemies, mods = {}, globalMods = {}) {
        if (this.attackTimer > 0) return -1;

        // Cooldown (may be reduced by Speed Surge buff, melee nodes, global nodes, weapon)
        const cdMult = this.hasBuff(PICKUP_SPEED_SURGE) ? BUFF_SPEED_SURGE_CD_MULT : 1;
        const nodeCdMult = (mods.cooldownMult || 1) * (globalMods.cooldownMult || 1);
        this.attackTimer = getVal('attackCooldown', ATTACK_COOLDOWN) * cdMult * nodeCdMult * this.weaponCooldownMult;
        this.attackVisualTimer = getVal('attackDuration', ATTACK_DURATION);

        // Range (may be extended by Piercing Shot buff + weapon)
        const rangeMult = this.hasBuff(PICKUP_PIERCING_SHOT) ? BUFF_PIERCING_RANGE_MULT : 1;
        const effectiveRange = getVal('attackRange', ATTACK_RANGE) * rangeMult * (this.attackRangeMultiplier || 1) * this.weaponRangeMult;

        // Attack arc (base + node widening + weapon)
        this._currentArcMult = (mods.arcMult || 1) * this.weaponArcMult;
        const effectiveArc = ATTACK_ARC * this._currentArcMult;

        // Damage calculation (includes Berserker rage bonus + weapon)
        let dmg = Math.floor(this.getEffectiveDamage() * this.weaponDamageMult);
        if (this.hasBuff(PICKUP_RAGE_SHARD))    dmg = Math.floor(dmg * BUFF_RAGE_DAMAGE_MULT);
        if (this.hasBuff(PICKUP_PIERCING_SHOT))  dmg = Math.floor(dmg * BUFF_PIERCING_DAMAGE_MULT);
        // Global damage multiplier from nodes
        if (globalMods.damageMult) dmg = Math.floor(dmg * globalMods.damageMult);

        // Crushing Blow: one-time 3× nuke
        let kbMult = 1;
        if (this.crushingBlowReady) {
            dmg = Math.floor(dmg * BUFF_CRUSHING_DAMAGE_MULT);
            kbMult = BUFF_CRUSHING_KB_MULT;
            this.crushingBlowReady = false;
            this._removeBuff(PICKUP_CRUSHING_BLOW);
        }

        // Knockback multiplier from nodes
        kbMult *= (mods.knockbackMult || 1);

        // Lunge: move player forward before attack resolves
        if (mods.lunge && mods.lungeDistance) {
            const lungeX = this.facingX * mods.lungeDistance;
            const lungeY = this.facingY * mods.lungeDistance;
            this.x += lungeX;
            this.y += lungeY;
        }

        const facingAngle = Math.atan2(this.facingY, this.facingX);

        // Extra targets from node: how many extra enemies beyond the normal set
        const maxTargets = enemies.length; // hit all in arc by default
        // (extraTargets is used for Kill Nova gating, not limiting arc hits)

        const hitEnemies = [];
        let hitCount = 0;
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > effectiveRange + enemy.radius) continue;

            // Angle check with node-widened arc
            let diff = Math.atan2(dy, dx) - facingAngle;
            while (diff > Math.PI)  diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) > effectiveArc / 2) continue;

            const kbVal = getVal('attackKnockback', ATTACK_KNOCKBACK) * this.weaponKnockbackMult;
            const kbX = dist > 0 ? (dx / dist) * kbVal * kbMult : 0;
            const kbY = dist > 0 ? (dy / dist) * kbVal * kbMult : 0;

            // Meta relic: Boss Hunter — extra damage vs bosses
            let finalDmg = dmg;
            if (enemy.isBoss && this.metaBossDamageMultiplier > 1) {
                finalDmg = Math.floor(finalDmg * this.metaBossDamageMultiplier);
            }

            enemy.takeDamage(finalDmg, kbX, kbY);
            hitEnemies.push(enemy);
            hitCount++;

            // Stun chance from node (Staggering Blows)
            if (mods.stunChance && Math.random() < mods.stunChance) {
                applyFreeze(enemy, mods.stunDuration || 500);
            }
            // Bleed chance from node (Serrated Edge) → burn DoT
            if (mods.bleedChance && Math.random() < mods.bleedChance) {
                applyBurn(enemy, mods.bleedDuration || 2000, mods.bleedDps || 5);
            }
        }

        return { hitCount, hitEnemies, killed: hitEnemies.filter(e => e.dead) };
    }

    /**
     * Try to throw a dagger projectile in the facing direction.
     * Returns an array of projectile config objects (may include spread/extra daggers)
     * or null if on cooldown.
     * @param {object} [mods] - combatMods.dagger from UpgradeEngine (optional)
     * @param {object} [globalMods] - combatMods.global from UpgradeEngine (optional)
     */
    tryThrow(mods = {}, globalMods = {}) {
        if (this.daggerCooldown > 0) return null;

        // Cooldown (may be reduced by Speed Surge buff + global node)
        const cdMult = this.hasBuff(PICKUP_SPEED_SURGE) ? BUFF_SPEED_SURGE_CD_MULT : 1;
        const globalCdMult = (globalMods.cooldownMult || 1);
        this.daggerCooldown = getVal('daggerCooldown', DAGGER_COOLDOWN) * cdMult * globalCdMult;

        // Direction (facing)
        const len = Math.sqrt(this.facingX * this.facingX + this.facingY * this.facingY);
        const dirX = len > 0 ? this.facingX / len : 1;
        const dirY = len > 0 ? this.facingY / len : 0;

        // Damage: base = player damage × DAGGER_DAMAGE_MULT, with buff multipliers
        let dmg = Math.floor(this.getEffectiveDamage() * getVal('daggerDamageMult', DAGGER_DAMAGE_MULT));
        if (this.hasBuff(PICKUP_RAGE_SHARD))    dmg = Math.floor(dmg * BUFF_RAGE_DAMAGE_MULT);
        if (this.hasBuff(PICKUP_PIERCING_SHOT))  dmg = Math.floor(dmg * BUFF_PIERCING_DAMAGE_MULT);
        // Global damage multiplier from nodes
        if (globalMods.damageMult) dmg = Math.floor(dmg * globalMods.damageMult);

        // Crushing Blow: one-time 3× nuke on ranged too
        let kbMult = 1;
        if (this.crushingBlowReady) {
            dmg = Math.floor(dmg * BUFF_CRUSHING_DAMAGE_MULT);
            kbMult = BUFF_CRUSHING_KB_MULT;
            this.crushingBlowReady = false;
            this._removeBuff(PICKUP_CRUSHING_BLOW);
        }

        // Range (may be extended by Piercing Shot buff)
        const rangeMult = this.hasBuff(PICKUP_PIERCING_SHOT) ? BUFF_PIERCING_RANGE_MULT : 1;
        const maxDist = getVal('daggerRange', DAGGER_RANGE) * rangeMult;

        // Speed multiplier from nodes
        const speedMult = (mods.speedMult || 1);

        // Crit bonus from nodes (added to player base crit)
        const critBonus = (mods.critBonus || 0);

        // Spawn slightly in front of player
        const spawnOffset = this.radius + DAGGER_RADIUS + 2;

        // Build list of daggers to throw
        const daggers = [];
        const baseAngle = Math.atan2(dirY, dirX);

        // Determine total dagger count (1 base + extraProjectiles from nodes)
        const extraDaggers = mods.extraProjectiles || 0;
        const totalDaggers = 1 + extraDaggers;

        // Spread pattern from node (Fan of Knives)
        const useSpread = mods.spreadPattern && (mods.spreadCount || 0) >= 2;

        if (useSpread) {
            // Fan pattern: spreadCount daggers in a spreadArc arc
            const spreadCount = mods.spreadCount || 3;
            const spreadArc = mods.spreadArc || 0.4; // radians
            for (let i = 0; i < spreadCount; i++) {
                const frac = spreadCount === 1 ? 0 : (i / (spreadCount - 1)) - 0.5;
                const angle = baseAngle + frac * spreadArc * 2;
                const dX = Math.cos(angle);
                const dY = Math.sin(angle);
                daggers.push({
                    x: this.x + dX * spawnOffset,
                    y: this.y + dY * spawnOffset,
                    dirX: dX, dirY: dY,
                    speed: getVal('daggerSpeed', DAGGER_SPEED) * speedMult,
                    damage: dmg,
                    radius: DAGGER_RADIUS,
                    color: DAGGER_COLOR,
                    maxDist,
                    knockback: DAGGER_KNOCKBACK * kbMult,
                    pierce: mods.pierce || 0,
                    ricochet: mods.ricochet || 0,
                    fireTrail: mods.fireTrail || false,
                    fireTrailDuration: mods.fireTrailDuration || 0,
                    fireTrailDps: mods.fireTrailDps || 0,
                    returning: mods.returning || false,
                    critBonus,
                });
            }
        } else {
            // Standard throw: 1 center dagger + extras offset slightly
            for (let i = 0; i < totalDaggers; i++) {
                // Spread extra daggers slightly (±0.1 rad per extra)
                const offset = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2) * 0.1;
                const angle = baseAngle + offset;
                const dX = Math.cos(angle);
                const dY = Math.sin(angle);
                daggers.push({
                    x: this.x + dX * spawnOffset,
                    y: this.y + dY * spawnOffset,
                    dirX: dX, dirY: dY,
                    speed: getVal('daggerSpeed', DAGGER_SPEED) * speedMult,
                    damage: dmg,
                    radius: DAGGER_RADIUS,
                    color: DAGGER_COLOR,
                    maxDist,
                    knockback: DAGGER_KNOCKBACK * kbMult,
                    pierce: mods.pierce || 0,
                    ricochet: mods.ricochet || 0,
                    fireTrail: mods.fireTrail || false,
                    fireTrailDuration: mods.fireTrailDuration || 0,
                    fireTrailDps: mods.fireTrailDps || 0,
                    returning: mods.returning || false,
                    critBonus,
                });
            }
        }

        return daggers;
    }

    takeDamage(amount) {
        if (this.invulnTimer > 0) return;

        // Guardian passive: auto-shield blocks one hit completely
        if (this.guardianShieldReady) {
            this.guardianShieldReady = false;
            this.guardianShieldCooldown = this.guardianShieldMaxCooldown;
            this.invulnTimer = getVal('playerInvulnTime', PLAYER_INVULN_TIME);
            this.damageFlashTimer = 80;
            return;
        }

        // Phase Shield: block one hit completely
        if (this.phaseShieldActive) {
            this.phaseShieldActive = false;
            this._removeBuff(PICKUP_PHASE_SHIELD);
            this.invulnTimer = getVal('playerInvulnTime', PLAYER_INVULN_TIME);
            this.damageFlashTimer = 80;
            return;
        }

        // Iron Skin: reduce damage by 50%
        let finalAmount = amount;
        if (this.hasBuff(PICKUP_IRON_SKIN)) {
            finalAmount = Math.max(1, Math.floor(finalAmount * BUFF_IRON_SKIN_REDUCE));
        }

        // Meta: global damage taken reduction (relic: Tough Skin)
        if (this.metaDamageTakenMultiplier < 1) {
            finalAmount = Math.max(1, Math.floor(finalAmount * this.metaDamageTakenMultiplier));
        }

        // Consume overheal first, then real HP
        if (this.overHeal > 0) {
            if (finalAmount <= this.overHeal) {
                this.overHeal -= finalAmount;
                finalAmount = 0;
            } else {
                finalAmount -= this.overHeal;
                this.overHeal = 0;
            }
        }
        this.hp = Math.max(0, this.hp - finalAmount);
        this.invulnTimer = getVal('playerInvulnTime', PLAYER_INVULN_TIME);
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
            const healAmount = BUFF_HEAL_AMOUNT;
            const missing = this.maxHp - this.hp;
            if (missing >= healAmount) {
                // Normal heal — not at full HP
                this.hp += healAmount;
            } else {
                // Fill HP to max, overflow becomes overheal
                this.hp = this.maxHp;
                const overflow = healAmount - missing;
                const overhealCap = Math.floor(this.maxHp * 0.5);
                this.overHeal = Math.min(this.overHeal + overflow, overhealCap);
            }
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

    /** Effective move speed accounting for biome, Swift Boots buff, lava slow, and tar slow. */
    getEffectiveSpeed() {
        let spd = this.hasBuff(PICKUP_SWIFT_BOOTS) ? this.speed * BUFF_SWIFT_SPEED_MULT : this.speed;
        if (this.biomeSpeedMult !== 1.0) spd *= this.biomeSpeedMult;
        if (this.onLava) spd *= HAZARD_LAVA_SLOW;
        if (this.onTar || this.tarLingerTimer > 0) spd *= HAZARD_TAR_SLOW;
        return spd;
    }

    /** Effective damage accounting for Berserker rage passive. */
    getEffectiveDamage() {
        let dmg = this.damage;
        if (this.berserkActive && this.berserkDamageBuff > 0) {
            dmg = Math.floor(dmg * (1 + this.berserkDamageBuff));
        }
        return dmg;
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
        this._renderClassPassiveEffects(ctx);
        this._renderAttackArc(ctx);
        this._renderBody(ctx);
    }

    _renderAttackArc(ctx) {
        if (this.attackVisualTimer <= 0) return;
        const alpha = this.attackVisualTimer / getVal('attackDuration', ATTACK_DURATION);
        const angle = Math.atan2(this.facingY, this.facingX);

        ctx.save();
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = this.weaponColor || '#ffffff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        const arcMult = this._currentArcMult || 1;
        const effectiveArc = ATTACK_ARC * arcMult;
        const effectiveRange = getVal('attackRange', ATTACK_RANGE) * this.weaponRangeMult;
        ctx.arc(this.x, this.y, effectiveRange, angle - effectiveArc / 2, angle + effectiveArc / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    _renderBody(ctx) {
        const flashing = this.damageFlashTimer > 0 && Math.floor(this.damageFlashTimer / 50) % 2 === 0;

        // Dash ghost afterimage
        if (this.dashing) {
            const progress = 1 - this.dashTimer / DASH_DURATION;
            ctx.save();
            ctx.globalAlpha = 0.25 * (1 - progress);
            ctx.fillStyle = this.ghostColor;
            ctx.beginPath();
            ctx.arc(
                this.x - this.dashDirX * 18,
                this.y - this.dashDirY * 18,
                this.radius * 0.85, 0, Math.PI * 2,
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
                this.x - this.dashDirX * 32,
                this.y - this.dashDirY * 32,
                this.radius * 0.6, 0, Math.PI * 2,
            );
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        if (this.invulnTimer > 0) {
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.02) * 0.2;
        }

        // Body
        ctx.fillStyle = flashing ? '#ffffff' : (this.dashing ? this.dashColor : this.bodyColor);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = this.outlineColor;
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

        // Class emblem (drawn semi-transparent inside the circle)
        if (this.classId) {
            renderClassEmblem(ctx, this.classId, this.x, this.y, this.radius);
        }

        // Cosmetic hat/accessory (drawn on top of circle)
        if (this.hatRender) {
            ctx.save();
            const hatFacing = Math.atan2(this.facingY, this.facingX);
            this.hatRender(ctx, this.x, this.y, this.radius, hatFacing);
            ctx.restore();
        }

        ctx.restore();
    }

    /** Render class-specific passive visual effects (drawn behind/around player). */
    _renderClassPassiveEffects(ctx) {
        ctx.save();

        // ── Adventurer: gentle golden compass sparkle ──
        if (this.adventurerHealPercent > 0) {
            const pulse = Math.sin(Date.now() * 0.003) * 0.08;
            ctx.globalAlpha = 0.18 + pulse;
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = 1.5;
            // 4-pointed star rotating slowly
            const t = Date.now() * 0.001;
            const sr = this.radius + 7;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = t + (Math.PI / 2) * i;
                const ox = Math.cos(angle) * sr;
                const oy = Math.sin(angle) * sr;
                ctx.moveTo(this.x + ox * 0.3, this.y + oy * 0.3);
                ctx.lineTo(this.x + ox, this.y + oy);
            }
            ctx.stroke();
        }

        // ── Guardian: shield ring (when ready) / recharge indicator ──
        if (this.guardianShieldMaxCooldown > 0) {
            if (this.guardianShieldReady) {
                // Pulsing shield ring
                ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.004) * 0.1;
                ctx.strokeStyle = '#4fc3f7';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
                ctx.stroke();

                // Small shield icon above player
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#4fc3f7';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('🛡', this.x, this.y - this.radius - 8);
                ctx.textAlign = 'left';
            } else if (this.guardianShieldCooldown > 0) {
                // Recharging arc indicator
                const progress = 1 - (this.guardianShieldCooldown / this.guardianShieldMaxCooldown);
                ctx.globalAlpha = 0.15;
                ctx.strokeStyle = '#4fc3f7';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 10, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
                ctx.stroke();
            }
        }

        // ── Berserker: red pulsing aura when active ──
        if (this.berserkActive) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.15;
            ctx.globalAlpha = 0.3 + pulse;
            ctx.shadowColor = '#ef5350';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#ef5350';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Red particles orbiting
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#ff5252';
            const t = Date.now() * 0.005;
            for (let i = 0; i < 4; i++) {
                const angle = t + (Math.PI / 2) * i;
                const px = this.x + Math.cos(angle) * (this.radius + 7);
                const py = this.y + Math.sin(angle) * (this.radius + 7);
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

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
            const piercingArcMult = this._currentArcMult || 1;
            const piercingArc = ATTACK_ARC * piercingArcMult;
            ctx.arc(this.x, this.y, ATTACK_RANGE * 1.4 * this.weaponRangeMult, angle - piercingArc / 2, angle + piercingArc / 2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}
