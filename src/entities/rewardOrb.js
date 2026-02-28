// ── Reward Orb Entity ───────────────────────────────────────
// Spawns at room center after all enemies are cleared.
// Player walks to it to trigger the reward choice (STATE_LEVEL_UP).
// Tier (bronze/silver/gold/diamond) is based on room XP performance.
// ─────────────────────────────────────────────────────────────

import {
    REWARD_ORB_RADIUS,
    REWARD_ORB_COLLECT_RADIUS,
    PERF_TIER_COLORS,
    PERF_TIER_ICONS,
    PERF_TIER_BRONZE,
} from '../constants.js';

export class RewardOrb {
    /**
     * @param {number} x - center X position (px)
     * @param {number} y - center Y position (px)
     * @param {string} tier - performance tier: 'bronze'|'silver'|'gold'|'diamond'
     */
    constructor(x, y, tier = PERF_TIER_BRONZE) {
        this.x = x;
        this.y = y;
        this.tier = tier;
        this.radius = REWARD_ORB_RADIUS;
        this.collectRadius = REWARD_ORB_COLLECT_RADIUS;
        this.collected = false;
        this.timer = 0;         // animation timer (ms)
        this.spawnTimer = 0;    // grow-in animation (ms)
        this.spawnDuration = 400; // ms to fully appear
    }

    get color() {
        return PERF_TIER_COLORS[this.tier] || PERF_TIER_COLORS[PERF_TIER_BRONZE];
    }

    get icon() {
        return PERF_TIER_ICONS[this.tier] || PERF_TIER_ICONS[PERF_TIER_BRONZE];
    }

    update(dt) {
        if (this.collected) return;
        this.timer += dt * 1000;
        this.spawnTimer = Math.min(this.spawnTimer + dt * 1000, this.spawnDuration);
    }

    /**
     * Check if player circle overlaps the collection radius.
     * @param {object} player - { x, y, radius }
     * @returns {boolean}
     */
    checkCollision(player) {
        if (this.collected) return false;
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.collectRadius + player.radius;
    }

    /**
     * Render the reward orb with pulsing glow.
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (this.collected) return;

        // Spawn grow-in scale
        const spawnProgress = Math.min(1, this.spawnTimer / this.spawnDuration);
        const spawnScale = spawnProgress < 1
            ? 0.3 + 0.7 * easeOutBack(spawnProgress)
            : 1;

        const pulse = 0.85 + Math.sin(this.timer * 0.004) * 0.15;
        const bobY = Math.sin(this.timer * 0.003) * 3;
        const r = this.radius * pulse * spawnScale;

        ctx.save();

        // Outer glow
        const glowRadius = r * 2.5;
        const gradient = ctx.createRadialGradient(
            this.x, this.y + bobY, r * 0.3,
            this.x, this.y + bobY, glowRadius,
        );
        gradient.addColorStop(0, this.color + 'aa');
        gradient.addColorStop(0.5, this.color + '33');
        gradient.addColorStop(1, this.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Core orb
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 16 * spawnScale;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner highlight
        const innerGrad = ctx.createRadialGradient(
            this.x - r * 0.25, this.y + bobY - r * 0.25, r * 0.1,
            this.x, this.y + bobY, r,
        );
        innerGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
        innerGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, r, 0, Math.PI * 2);
        ctx.fill();

        // Tier icon above orb
        ctx.textAlign = 'center';
        ctx.font = `${Math.round(14 * spawnScale)}px monospace`;
        ctx.fillStyle = '#fff';
        const iconPulse = 0.7 + Math.sin(this.timer * 0.005) * 0.3;
        ctx.globalAlpha = iconPulse * spawnProgress;
        ctx.fillText(this.icon, this.x, this.y + bobY - r - 8);
        ctx.globalAlpha = 1;

        // "REWARD" label below
        ctx.font = `bold ${Math.round(10 * spawnScale)}px monospace`;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.7 * spawnProgress;
        ctx.fillText('REWARD', this.x, this.y + bobY + r + 14);

        ctx.restore();
    }
}

/**
 * Ease-out-back for a satisfying pop-in effect.
 */
function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
