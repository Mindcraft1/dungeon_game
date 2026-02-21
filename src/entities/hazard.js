import {
    TILE_SIZE,
    HAZARD_TYPE_SPIKES, HAZARD_TYPE_LAVA, HAZARD_TYPE_ARROW,
    HAZARD_SPIKE_DAMAGE, HAZARD_SPIKE_CYCLE, HAZARD_SPIKE_ACTIVE, HAZARD_SPIKE_WARN,
    HAZARD_LAVA_DAMAGE, HAZARD_LAVA_TICK, HAZARD_LAVA_SLOW,
    HAZARD_ARROW_DAMAGE, HAZARD_ARROW_COOLDOWN, HAZARD_ARROW_SPEED, HAZARD_ARROW_RADIUS,
    HAZARD_SPIKE_INTRO_STAGE, HAZARD_LAVA_INTRO_STAGE, HAZARD_ARROW_INTRO_STAGE,
    HAZARD_SPIKE_COLOR, HAZARD_LAVA_COLOR, HAZARD_LAVA_COLOR2, HAZARD_ARROW_COLOR,
    PROJECTILE_COLOR,
} from '../constants.js';
import { Projectile } from './projectile.js';

// ── Hazard class ─────────────────────────────────────────────
// Represents a single tile-based hazard (spikes, lava, or arrow trap).
// Hazards are dynamically placed per room based on the current stage.
// ─────────────────────────────────────────────────────────────

export class Hazard {
    /**
     * @param {string} type - HAZARD_TYPE_SPIKES | HAZARD_TYPE_LAVA | HAZARD_TYPE_ARROW
     * @param {number} col - Grid column
     * @param {number} row - Grid row
     * @param {number} stage - Current game stage (for damage scaling)
     * @param {object} [options] - Type-specific options
     */
    constructor(type, col, row, stage, options = {}) {
        this.type = type;
        this.col = col;
        this.row = row;
        this.x = col * TILE_SIZE;
        this.y = row * TILE_SIZE;
        this.centerX = this.x + TILE_SIZE / 2;
        this.centerY = this.y + TILE_SIZE / 2;
        this.stage = stage;

        // Damage scaling: +10% per stage past intro, capped at 2×
        const introStage = type === HAZARD_TYPE_SPIKES ? HAZARD_SPIKE_INTRO_STAGE
            : type === HAZARD_TYPE_LAVA ? HAZARD_LAVA_INTRO_STAGE
            : HAZARD_ARROW_INTRO_STAGE;
        this.damageScale = Math.min(1 + (Math.max(0, stage - introStage)) * 0.1, 2.0);

        // ── Spike state ──
        if (type === HAZARD_TYPE_SPIKES) {
            // Stagger timers so not all spikes fire at once
            this.timer = options.timerOffset ?? (Math.random() * HAZARD_SPIKE_CYCLE);
            this.active = false;    // dealing damage right now?
            this.warning = false;   // about to become active?
            this.spikeHeight = 0;   // 0–1 for animation
        }

        // ── Lava state ──
        if (type === HAZARD_TYPE_LAVA) {
            this.tickTimer = 0;
            this.animTime = Math.random() * 10000;
            this.bubblePhase = Math.random() * Math.PI * 2;
        }

        // ── Arrow trap state ──
        if (type === HAZARD_TYPE_ARROW) {
            this.dirX = options.dirX || 0;
            this.dirY = options.dirY || 0;
            // Stagger fire timers
            this.fireTimer = options.fireOffset ?? (Math.random() * HAZARD_ARROW_COOLDOWN);
            this.chargeProgress = 0; // 0–1 visual charge indicator
            this.justFired = false;  // flag for audio in game.js
        }
    }

    // ── Update ──────────────────────────────────────────────

    update(dt, player, projectiles, grid, noDamage) {
        const ms = dt * 1000;
        this.justFired = false;

        switch (this.type) {
            case HAZARD_TYPE_SPIKES: this._updateSpikes(ms, player, noDamage); break;
            case HAZARD_TYPE_LAVA:   this._updateLava(ms, player, noDamage); break;
            case HAZARD_TYPE_ARROW:  this._updateArrow(ms, projectiles, noDamage); break;
        }
    }

    _updateSpikes(ms, player, noDamage) {
        this.timer = (this.timer + ms) % HAZARD_SPIKE_CYCLE;

        // Timeline: [inactive] → [warning] → [active] → loop
        const inactiveTime = HAZARD_SPIKE_CYCLE - HAZARD_SPIKE_ACTIVE - HAZARD_SPIKE_WARN;

        if (this.timer < inactiveTime) {
            this.active = false;
            this.warning = false;
            this.spikeHeight = 0;
        } else if (this.timer < inactiveTime + HAZARD_SPIKE_WARN) {
            this.active = false;
            this.warning = true;
            // Rise animation during warning
            const warnProgress = (this.timer - inactiveTime) / HAZARD_SPIKE_WARN;
            this.spikeHeight = warnProgress * 0.4;
        } else {
            this.active = true;
            this.warning = false;
            // Fully extended
            const activeProgress = (this.timer - inactiveTime - HAZARD_SPIKE_WARN) / HAZARD_SPIKE_ACTIVE;
            this.spikeHeight = activeProgress < 0.1 ? 0.4 + activeProgress * 6 : 1.0;
            // Retract near end
            if (activeProgress > 0.85) {
                this.spikeHeight = 1.0 - (activeProgress - 0.85) / 0.15;
            }
        }

        // Damage check (only when fully active)
        if (this.active && !noDamage && this._isPlayerOnTile(player)) {
            let dmg = Math.floor(HAZARD_SPIKE_DAMAGE * this.damageScale);
            // Meta relic: spike damage reduction
            if (player.metaSpikeDamageMultiplier && player.metaSpikeDamageMultiplier < 1) {
                dmg = Math.max(1, Math.floor(dmg * player.metaSpikeDamageMultiplier));
            }
            player.takeDamage(dmg);
        }
    }

    _updateLava(ms, player, noDamage) {
        this.animTime += ms;

        if (this._isPlayerOnTile(player)) {
            // Flag player as on lava (checked by getEffectiveSpeed)
            player.onLava = true;

            if (!noDamage) {
                this.tickTimer += ms;
                if (this.tickTimer >= HAZARD_LAVA_TICK) {
                    this.tickTimer -= HAZARD_LAVA_TICK;
                    let dmg = Math.floor(HAZARD_LAVA_DAMAGE * this.damageScale);
                    // Meta relic: lava damage reduction
                    if (player.metaLavaDotMultiplier && player.metaLavaDotMultiplier < 1) {
                        dmg = Math.max(1, Math.floor(dmg * player.metaLavaDotMultiplier));
                    }
                    player.takeDamage(dmg);
                }
            }
        }
    }

    _updateArrow(ms, projectiles, noDamage) {
        this.fireTimer += ms;
        this.chargeProgress = Math.min(this.fireTimer / HAZARD_ARROW_COOLDOWN, 1);

        if (this.fireTimer >= HAZARD_ARROW_COOLDOWN) {
            this.fireTimer = 0;
            this.chargeProgress = 0;
            this.justFired = true;

            // Spawn projectile from the edge of the wall tile, traveling into the room
            const spawnX = this.centerX + this.dirX * (TILE_SIZE / 2 + 4);
            const spawnY = this.centerY + this.dirY * (TILE_SIZE / 2 + 4);

            const dmg = noDamage ? 0 : Math.floor(HAZARD_ARROW_DAMAGE * this.damageScale);
            const proj = new Projectile(
                spawnX, spawnY,
                this.dirX, this.dirY,
                HAZARD_ARROW_SPEED, dmg, HAZARD_ARROW_RADIUS,
                HAZARD_ARROW_COLOR,
            );
            proj.isHazardProjectile = true; // mark for special handling
            projectiles.push(proj);
        }
    }

    // ── Collision helper ────────────────────────────────────

    _isPlayerOnTile(player) {
        // Circle vs AABB overlap test
        const closestX = Math.max(this.x, Math.min(player.x, this.x + TILE_SIZE));
        const closestY = Math.max(this.y, Math.min(player.y, this.y + TILE_SIZE));
        const dx = player.x - closestX;
        const dy = player.y - closestY;
        return (dx * dx + dy * dy) < (player.radius * player.radius);
    }

    // ── Render ──────────────────────────────────────────────

    render(ctx) {
        switch (this.type) {
            case HAZARD_TYPE_SPIKES: this._renderSpikes(ctx); break;
            case HAZARD_TYPE_LAVA:   this._renderLava(ctx); break;
            case HAZARD_TYPE_ARROW:  this._renderArrow(ctx); break;
        }
    }

    _renderSpikes(ctx) {
        const x = this.x;
        const y = this.y;
        const S = TILE_SIZE;

        // Base plate (always visible)
        ctx.fillStyle = '#2a2233';
        ctx.fillRect(x + 2, y + 2, S - 4, S - 4);

        // Tile border
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);

        // Spike holes (4 positions in a 2×2 pattern)
        const positions = [
            [x + S * 0.25, y + S * 0.25],
            [x + S * 0.75, y + S * 0.25],
            [x + S * 0.25, y + S * 0.75],
            [x + S * 0.75, y + S * 0.75],
        ];

        const h = this.spikeHeight;

        for (const [px, py] of positions) {
            if (h <= 0) {
                // Hole indicator (dark circle)
                ctx.fillStyle = '#1a1520';
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Spike triangle pointing up
                const spikeLen = 6 + h * 6; // 6–12px
                const spikeW = 3 + h * 2;

                if (this.warning) {
                    // Warning: yellow/orange, slight horizontal shake
                    const shake = Math.sin(Date.now() * 0.03) * 1.5;
                    ctx.fillStyle = '#ffa726';
                    ctx.beginPath();
                    ctx.moveTo(px + shake, py - spikeLen);
                    ctx.lineTo(px - spikeW + shake, py + 2);
                    ctx.lineTo(px + spikeW + shake, py + 2);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Active: bright silver/white
                    ctx.fillStyle = this.active ? '#ddd' : HAZARD_SPIKE_COLOR;
                    ctx.beginPath();
                    ctx.moveTo(px, py - spikeLen);
                    ctx.lineTo(px - spikeW, py + 2);
                    ctx.lineTo(px + spikeW, py + 2);
                    ctx.closePath();
                    ctx.fill();

                    // Bright tip when active
                    if (this.active) {
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(px, py - spikeLen + 1, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // Danger border when active
        if (this.active) {
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1, y + 1, S - 2, S - 2);
        }
    }

    _renderLava(ctx) {
        const x = this.x;
        const y = this.y;
        const S = TILE_SIZE;
        const t = this.animTime;

        // Base lava color with animated brightness
        const pulse = 0.9 + Math.sin(t * 0.003 + this.bubblePhase) * 0.1;
        ctx.fillStyle = HAZARD_LAVA_COLOR;
        ctx.globalAlpha = pulse;
        ctx.fillRect(x, y, S, S);
        ctx.globalAlpha = 1;

        // Lighter lava swirl pattern
        ctx.fillStyle = HAZARD_LAVA_COLOR2;
        ctx.globalAlpha = 0.3 + Math.sin(t * 0.002 + this.bubblePhase) * 0.15;
        const sw = S * 0.6;
        const sx = x + S / 2 + Math.sin(t * 0.0015) * 4 - sw / 2;
        const sy = y + S / 2 + Math.cos(t * 0.0012 + 1) * 4 - sw / 2;
        ctx.beginPath();
        ctx.arc(sx + sw / 2, sy + sw / 2, sw / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Animated bubbles
        for (let i = 0; i < 3; i++) {
            const phase = this.bubblePhase + i * 2.1;
            const bubbleT = ((t * 0.001 + phase) % 3) / 3; // 0–1 over 3s
            if (bubbleT < 0.7) {
                const bx = x + 8 + ((i * 13 + Math.sin(phase) * 5) % (S - 16));
                const by = y + 8 + ((i * 11 + Math.cos(phase) * 5) % (S - 16));
                const br = (1 + bubbleT * 3) * (1 - bubbleT / 0.7);
                ctx.fillStyle = '#ffab40';
                ctx.globalAlpha = (1 - bubbleT / 0.7) * 0.6;
                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Edge darkening
        ctx.strokeStyle = 'rgba(120, 30, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, S - 2, S - 2);

        // Subtle glow
        ctx.fillStyle = 'rgba(255, 100, 30, 0.08)';
        ctx.fillRect(x - 2, y - 2, S + 4, S + 4);
    }

    _renderArrow(ctx) {
        const x = this.x;
        const y = this.y;
        const S = TILE_SIZE;
        const cx = this.centerX;
        const cy = this.centerY;

        // The trap is on a wall tile — draw wall base first (matching render.js style)
        ctx.fillStyle = '#4a3f35';
        ctx.fillRect(x, y, S, S);
        ctx.fillStyle = '#5d4e37';
        ctx.fillRect(x, y, S, 2);
        ctx.fillRect(x, y, 2, S);
        ctx.fillStyle = '#3a3028';
        ctx.fillRect(x, y + S - 2, S, 2);
        ctx.fillRect(x + S - 2, y, 2, S);

        // Arrow slit (dark line in the firing direction)
        const slitLen = S * 0.35;
        const slitW = 3;
        ctx.fillStyle = '#1a1520';
        if (this.dirX !== 0) {
            // Horizontal firing — vertical slit
            const slitX = this.dirX > 0 ? x + S - 6 : x + 3;
            ctx.fillRect(slitX, cy - slitLen / 2, slitW, slitLen);
        } else {
            // Vertical firing — horizontal slit
            const slitY = this.dirY > 0 ? y + S - 6 : y + 3;
            ctx.fillRect(cx - slitLen / 2, slitY, slitLen, slitW);
        }

        // Charge glow (intensifies as chargeProgress → 1)
        if (this.chargeProgress > 0.3) {
            const intensity = (this.chargeProgress - 0.3) / 0.7;
            const glowR = 4 + intensity * 6;
            const glowX = cx + this.dirX * (S * 0.35);
            const glowY = cy + this.dirY * (S * 0.35);

            ctx.save();
            ctx.globalAlpha = intensity * 0.6;
            ctx.fillStyle = HAZARD_ARROW_COLOR;
            ctx.beginPath();
            ctx.arc(glowX, glowY, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Bright center when almost ready
            if (this.chargeProgress > 0.8) {
                ctx.globalAlpha = (this.chargeProgress - 0.8) / 0.2;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(glowX, glowY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Small direction arrow indicator
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(this.dirY, this.dirX));
        ctx.fillStyle = this.chargeProgress > 0.7
            ? HAZARD_ARROW_COLOR
            : 'rgba(255, 107, 53, 0.4)';
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}
