import {
    TILE_SIZE,
    ENEMY_RADIUS, ENEMY_COLOR, ENEMY_HIT_COOLDOWN, ENEMY_XP,
    ENEMY_TYPE_BASIC, ENEMY_TYPE_SHOOTER, ENEMY_TYPE_TANK, ENEMY_TYPE_DASHER,
    SHOOTER_COLOR, SHOOTER_HP_MULT, SHOOTER_SPEED_MULT,
    SHOOTER_RANGE, SHOOTER_FIRE_COOLDOWN, SHOOTER_XP_MULT,
    TANK_COLOR, TANK_HP_MULT, TANK_SPEED_MULT, TANK_DAMAGE_MULT,
    TANK_CHARGE_SPEED_MULT, TANK_CHARGE_COOLDOWN, TANK_CHARGE_DURATION,
    TANK_CHARGE_RANGE, TANK_XP_MULT,
    DASHER_COLOR, DASHER_HP_MULT, DASHER_SPEED_MULT, DASHER_DAMAGE_MULT,
    DASHER_DASH_SPEED_MULT, DASHER_DASH_COOLDOWN, DASHER_DASH_DURATION,
    DASHER_DASH_RANGE, DASHER_XP_MULT,
    PROJECTILE_SPEED, PROJECTILE_DAMAGE, PROJECTILE_RADIUS, PROJECTILE_COLOR,
} from '../constants.js';
import { resolveWalls } from '../collision.js';
import { hasLineOfSight, findPath } from '../pathfinding.js';
import { Projectile } from './projectile.js';

export class Enemy {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} baseHp     – stage-scaled base HP
     * @param {number} baseSpeed  – stage-scaled base speed
     * @param {number} baseDamage – stage-scaled base damage
     * @param {string} type       – ENEMY_TYPE_* constant
     * @param {number} stage      – current game stage (for projectile scaling)
     */
    constructor(x, y, baseHp, baseSpeed, baseDamage, type = ENEMY_TYPE_BASIC, stage = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.dead = false;
        this.xpGiven = false;
        this.hitCooldown = 0;
        this.damageFlashTimer = 0;
        this.facingAngle = 0;

        // ── Apply type-specific stat multipliers ──
        switch (type) {
            case ENEMY_TYPE_SHOOTER:
                this.radius = 11;
                this.maxHp = Math.floor(baseHp * SHOOTER_HP_MULT);
                this.speed = baseSpeed * SHOOTER_SPEED_MULT;
                this.damage = Math.floor(baseDamage * 0.5);
                this.xpValue = Math.floor(ENEMY_XP * SHOOTER_XP_MULT);
                this.projectileDamage = PROJECTILE_DAMAGE + Math.floor(Math.max(0, stage - 4) * 0.4);
                break;
            case ENEMY_TYPE_TANK:
                this.radius = 16;
                this.maxHp = Math.floor(baseHp * TANK_HP_MULT);
                this.speed = baseSpeed * TANK_SPEED_MULT;
                this.damage = Math.floor(baseDamage * TANK_DAMAGE_MULT);
                this.xpValue = Math.floor(ENEMY_XP * TANK_XP_MULT);
                break;
            case ENEMY_TYPE_DASHER:
                this.radius = 10;
                this.maxHp = Math.floor(baseHp * DASHER_HP_MULT);
                this.speed = baseSpeed * DASHER_SPEED_MULT;
                this.damage = Math.floor(baseDamage * DASHER_DAMAGE_MULT);
                this.xpValue = Math.floor(ENEMY_XP * DASHER_XP_MULT);
                break;
            default: // basic
                this.radius = ENEMY_RADIUS;
                this.maxHp = baseHp;
                this.speed = baseSpeed;
                this.damage = baseDamage;
                this.xpValue = ENEMY_XP;
                break;
        }

        this.hp = this.maxHp;

        // ── Stun state (from bomb) ──
        this.stunTimer = 0;

        // ── Shooter state ──
        this.shootTimer = SHOOTER_FIRE_COOLDOWN * (0.3 + Math.random() * 0.5);
        this.strafeDir = Math.random() < 0.5 ? 1 : -1;
        this.strafeTimer = 1000 + Math.random() * 2000;

        // ── Tank state ──
        this.chargeTimer = TANK_CHARGE_COOLDOWN * (0.5 + Math.random() * 0.3);
        this.charging = false;
        this.chargeTimeLeft = 0;
        this.chargeDirX = 0;
        this.chargeDirY = 0;

        // ── Dasher state ──
        this.dashTimer = DASHER_DASH_COOLDOWN * (0.3 + Math.random() * 0.5);
        this.dashing = false;
        this.dashTimeLeft = 0;
        this.dashDirX = 0;
        this.dashDirY = 0;

        // ── Pathfinding state ──
        this._cachedPath = null;
        this._pathIndex = 0;
        this._pathRecalcTimer = 0;
    }

    // ── Update ─────────────────────────────────────────────

    update(dt, player, grid, enemies, projectiles, trainingMode = false) {
        if (this.dead) return;

        const ms = dt * 1000;

        // Stun: skip all AI/movement while stunned
        if (this.stunTimer > 0) {
            this.stunTimer -= ms;
            if (this.damageFlashTimer > 0) this.damageFlashTimer -= ms;
            return;
        }

        // Type-specific movement & abilities
        switch (this.type) {
            case ENEMY_TYPE_SHOOTER:
                this._updateShooter(dt, ms, player, grid, enemies, projectiles);
                break;
            case ENEMY_TYPE_TANK:
                this._updateTank(dt, ms, player, grid, enemies);
                break;
            case ENEMY_TYPE_DASHER:
                this._updateDasher(dt, ms, player, grid, enemies);
                break;
            default:
                this._updateBasic(dt, ms, player, grid, enemies);
                break;
        }

        // Walls always have final say
        resolveWalls(this, this.radius, grid);

        // Contact damage (all types)
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

    // ── Basic AI: seek player (with pathfinding) ──

    _updateBasic(dt, ms, player, grid, enemies) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) this.facingAngle = Math.atan2(dy, dx);

        this._smartSeek(dt, ms, player, grid);
        this._applySeparation(enemies);
    }

    // ── Shooter AI: keep distance, strafe, fire projectiles ──

    _updateShooter(dt, ms, player, grid, enemies, projectiles) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this._lastPlayerDist = dist;   // cache for renderer proximity scaling

        // Approach if far (pathfind around walls), retreat if close, strafe at ideal range
        if (dist > SHOOTER_RANGE * 1.2) {
            this._smartSeek(dt, ms, player, grid);
        } else if (dist < SHOOTER_RANGE * 0.6) {
            this.x -= (dx / dist) * this.speed * dt;
            this.y -= (dy / dist) * this.speed * dt;
        } else {
            // Strafe perpendicular
            this.strafeTimer -= ms;
            if (this.strafeTimer <= 0) {
                this.strafeDir *= -1;
                this.strafeTimer = 1000 + Math.random() * 2000;
            }
            const perpX = (-dy / dist) * this.strafeDir;
            const perpY = (dx / dist) * this.strafeDir;
            this.x += perpX * this.speed * 0.5 * dt;
            this.y += perpY * this.speed * 0.5 * dt;
        }

        // Shooter always faces the player (for aiming)
        if (dist > 0) this.facingAngle = Math.atan2(dy, dx);

        this._applySeparation(enemies);

        // Fire projectile on cooldown
        this.shootTimer -= ms;
        if (this.shootTimer <= 0 && dist < SHOOTER_RANGE * 1.5 && projectiles) {
            this.shootTimer = SHOOTER_FIRE_COOLDOWN;
            const dirX = dx / dist;
            const dirY = dy / dist;
            projectiles.push(new Projectile(
                this.x + dirX * (this.radius + PROJECTILE_RADIUS + 2),
                this.y + dirY * (this.radius + PROJECTILE_RADIUS + 2),
                dirX, dirY,
                PROJECTILE_SPEED,
                this.projectileDamage || PROJECTILE_DAMAGE,
                PROJECTILE_RADIUS,
                PROJECTILE_COLOR,
            ));
        }
    }

    // ── Tank AI: slow approach + devastating charge ──

    _updateTank(dt, ms, player, grid, enemies) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) this.facingAngle = Math.atan2(dy, dx);

        if (this.charging) {
            // Rush in the locked charge direction
            this.chargeTimeLeft -= ms;
            const chargeSpeed = this.speed * (TANK_CHARGE_SPEED_MULT / TANK_SPEED_MULT);
            this.x += this.chargeDirX * chargeSpeed * dt;
            this.y += this.chargeDirY * chargeSpeed * dt;
            this.facingAngle = Math.atan2(this.chargeDirY, this.chargeDirX);
            if (this.chargeTimeLeft <= 0) {
                this.charging = false;
                this.chargeTimer = TANK_CHARGE_COOLDOWN;
            }
        } else {
            // Slow approach with pathfinding
            this._smartSeek(dt, ms, player, grid);
            this._applySeparation(enemies);

            // Charge cooldown — only charge if line-of-sight is clear
            this.chargeTimer -= ms;
            if (this.chargeTimer <= 0 && dist < TANK_CHARGE_RANGE) {
                if (hasLineOfSight(this.x, this.y, player.x, player.y, grid)) {
                    this.charging = true;
                    this.chargeTimeLeft = TANK_CHARGE_DURATION;
                    this.chargeDirX = dx / dist;
                    this.chargeDirY = dy / dist;
                }
            }
        }
    }

    // ── Dasher AI: slow drift + fast dash bursts ──

    _updateDasher(dt, ms, player, grid, enemies) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) this.facingAngle = Math.atan2(dy, dx);

        if (this.dashing) {
            this.dashTimeLeft -= ms;
            const dashSpeed = this.speed * (DASHER_DASH_SPEED_MULT / DASHER_SPEED_MULT);
            this.x += this.dashDirX * dashSpeed * dt;
            this.y += this.dashDirY * dashSpeed * dt;
            this.facingAngle = Math.atan2(this.dashDirY, this.dashDirX);
            if (this.dashTimeLeft <= 0) {
                this.dashing = false;
                this.dashTimer = DASHER_DASH_COOLDOWN;
            }
        } else {
            // Slow drift with pathfinding
            this._smartSeek(dt, ms, player, grid);
            this._applySeparation(enemies);

            // Dash cooldown — only dash if line-of-sight is clear
            this.dashTimer -= ms;
            if (this.dashTimer <= 0 && dist < DASHER_DASH_RANGE) {
                if (hasLineOfSight(this.x, this.y, player.x, player.y, grid)) {
                    this.dashing = true;
                    this.dashTimeLeft = DASHER_DASH_DURATION;
                    this.dashDirX = dx / dist;
                    this.dashDirY = dy / dist;
                }
            }
        }
    }

    // ── Pathfinding-aware seek ──────────────────────────────

    /**
     * Move toward the player. Uses direct movement when line-of-sight is
     * clear, falls back to BFS pathfinding when walls block the way.
     */
    _smartSeek(dt, ms, player, grid) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this.radius + player.radius) return;

        this._pathRecalcTimer -= ms;

        // Direct line of sight → move straight toward player
        if (hasLineOfSight(this.x, this.y, player.x, player.y, grid)) {
            this._cachedPath = null;
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
            return;
        }

        // Blocked → use pathfinding
        if (!this._cachedPath || this._pathRecalcTimer <= 0) {
            this._cachedPath = findPath(this.x, this.y, player.x, player.y, grid);
            this._pathIndex = 0;
            this._pathRecalcTimer = 300 + Math.random() * 200;
        }

        if (this._cachedPath && this._pathIndex < this._cachedPath.length) {
            let wp = this._cachedPath[this._pathIndex];
            let wpDx = wp.x - this.x;
            let wpDy = wp.y - this.y;
            let wpDist = Math.sqrt(wpDx * wpDx + wpDy * wpDy);

            // Advance waypoint when close enough
            if (wpDist < TILE_SIZE * 0.4 && this._pathIndex < this._cachedPath.length - 1) {
                this._pathIndex++;
                wp = this._cachedPath[this._pathIndex];
                wpDx = wp.x - this.x;
                wpDy = wp.y - this.y;
                wpDist = Math.sqrt(wpDx * wpDx + wpDy * wpDy);
            }

            if (wpDist > 0) {
                this.facingAngle = Math.atan2(wpDy, wpDx);
                this.x += (wpDx / wpDist) * this.speed * dt;
                this.y += (wpDy / wpDist) * this.speed * dt;
            }
        } else {
            // No path found → fallback to direct movement
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }
    }

    // ── Shared helpers ─────────────────────────────────────

    _applySeparation(enemies) {
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
    }

    takeDamage(amount, kbX = 0, kbY = 0) {
        if (this.dead) return;
        this.hp -= amount;
        this.damageFlashTimer = 120;

        // Tank resists knockback while charging
        const kbMult = (this.type === ENEMY_TYPE_TANK && this.charging) ? 0.2 : 1;
        this.x += kbX * kbMult;
        this.y += kbY * kbMult;

        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
        }
    }

    // ── Rendering ──────────────────────────────────────────

    render(ctx) {
        if (this.dead) return;

        const flash = this.damageFlashTimer > 0;

        switch (this.type) {
            case ENEMY_TYPE_SHOOTER: this._renderShooter(ctx, flash); break;
            case ENEMY_TYPE_TANK:    this._renderTank(ctx, flash);    break;
            case ENEMY_TYPE_DASHER:  this._renderDasher(ctx, flash);  break;
            default:                 this._renderBasic(ctx, flash);   break;
        }

        this._renderHpBar(ctx);

        // Stun indicator — spinning stars above enemy
        if (this.stunTimer > 0) {
            ctx.save();
            const elapsed = Date.now();
            const alpha = Math.min(1, this.stunTimer / 300);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffd700';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            for (let i = 0; i < 3; i++) {
                const angle = (elapsed * 0.004) + (i * Math.PI * 2 / 3);
                const sx = this.x + Math.cos(angle) * (this.radius + 4);
                const sy = this.y - this.radius - 6 + Math.sin(angle * 2) * 2;
                ctx.fillText('✦', sx, sy);
            }
            ctx.restore();
        }
    }

    _renderBasic(ctx, flash) {
        ctx.fillStyle = flash ? '#ffffff' : ENEMY_COLOR;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    _renderShooter(ctx, flash) {
        const windUp = 800; // ms before shot where telegraph begins
        const charging = this.shootTimer < windUp;
        const chargeProgress = charging ? 1 - (this.shootTimer / windUp) : 0; // 0→1

        // Proximity factor: hints are subtle far away, stronger up close
        // _lastPlayerDist is set during update; fallback to a safe middle value
        const dist = this._lastPlayerDist || 200;
        const proxClose = 120;  // full intensity at this distance
        const proxFar = 320;    // minimum intensity at this distance
        const proximity = Math.max(0.25, Math.min(1, 1 - (dist - proxClose) / (proxFar - proxClose)));

        // Targeting line — shows aim direction while winding up
        if (charging) {
            ctx.save();
            const lineLen = (15 + chargeProgress * 25) * proximity;
            const dirX = Math.cos(this.facingAngle);
            const dirY = Math.sin(this.facingAngle);
            const startX = this.x + dirX * (this.radius + 2);
            const startY = this.y + dirY * (this.radius + 2);

            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = `rgba(220, 120, 255, ${(0.2 + chargeProgress * 0.4) * proximity})`;
            ctx.lineWidth = 1 + chargeProgress * 0.5;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + dirX * lineLen, startY + dirY * lineLen);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Diamond shape — flashes brighter purple when charging
        const bodyColor = flash ? '#ffffff'
            : charging ? _lerpColor(SHOOTER_COLOR, '#d580ff', chargeProgress * 0.35 * proximity)
            : SHOOTER_COLOR;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.radius);
        ctx.lineTo(this.x + this.radius, this.y);
        ctx.lineTo(this.x, this.y + this.radius);
        ctx.lineTo(this.x - this.radius, this.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#7d3c98';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pulsing warning ring — subtle, scales with proximity
        if (charging) {
            ctx.save();
            const pulse = Math.sin(Date.now() * 0.012) * 0.1;
            ctx.globalAlpha = ((0.15 + chargeProgress * 0.4) * proximity) + pulse;
            ctx.strokeStyle = '#dc78ff';
            ctx.lineWidth = 1 + chargeProgress * proximity;
            const ringRadius = this.radius + 2 + chargeProgress * 3 * proximity;
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Inner energy glow — small dot, scales with proximity
        if (charging) {
            ctx.save();
            const glowRadius = this.radius * (0.12 + chargeProgress * 0.15 * proximity);
            ctx.globalAlpha = (0.2 + chargeProgress * 0.35) * proximity;
            ctx.fillStyle = '#dc78ff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    _renderTank(ctx, flash) {
        // Hexagon shape
        ctx.fillStyle = flash ? '#ffffff' : TANK_COLOR;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = this.x + this.radius * Math.cos(angle);
            const py = this.y + this.radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#a04000';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Charging indicator (red pulsing ring)
        if (this.charging) {
            ctx.save();
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.02) * 0.3;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (this.chargeTimer < 800) {
            // Wind-up warning glow
            ctx.save();
            ctx.globalAlpha = 1 - (this.chargeTimer / 800);
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    _renderDasher(ctx, flash) {
        // Pointed triangle facing movement direction
        const angle = this.dashing
            ? Math.atan2(this.dashDirY, this.dashDirX)
            : this.facingAngle;

        ctx.fillStyle = flash ? '#ffffff' : DASHER_COLOR;
        ctx.beginPath();
        ctx.moveTo(
            this.x + Math.cos(angle) * this.radius * 1.3,
            this.y + Math.sin(angle) * this.radius * 1.3,
        );
        ctx.lineTo(
            this.x + Math.cos(angle + 2.4) * this.radius,
            this.y + Math.sin(angle + 2.4) * this.radius,
        );
        ctx.lineTo(
            this.x + Math.cos(angle - 2.4) * this.radius,
            this.y + Math.sin(angle - 2.4) * this.radius,
        );
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#1a9c4a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dash trail effect
        if (this.dashing) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = DASHER_COLOR;
            ctx.beginPath();
            ctx.arc(
                this.x - this.dashDirX * this.radius * 1.5,
                this.y - this.dashDirY * this.radius * 1.5,
                this.radius * 0.7, 0, Math.PI * 2,
            );
            ctx.fill();
            ctx.restore();
        }
    }

    _renderHpBar(ctx) {
        if (this.hp >= this.maxHp) return;

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

// ── Helper: linear interpolate two hex colors ──
function _lerpColor(a, b, t) {
    const ah = parseInt(a.slice(1), 16);
    const bh = parseInt(b.slice(1), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}
