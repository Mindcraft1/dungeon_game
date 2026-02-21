// ── Status Effects System ──────────────────────────────────
// Per-enemy status effect tracking: freeze, slow, burn.
// Applied/cleared by abilities and procs.
// ────────────────────────────────────────────────────────────

/**
 * Initialize status effect state on an enemy.
 * Call once when an enemy is created (or lazily on first status application).
 * @param {object} enemy
 */
export function initStatus(enemy) {
    if (enemy._status) return;
    enemy._status = {
        frozenUntil: 0,     // timestamp (ms remaining)
        slowUntil: 0,       // timestamp (ms remaining)
        slowFactor: 1,      // speed multiplier when slowed (< 1)
        burnUntil: 0,       // timestamp (ms remaining)
        burnDps: 0,         // damage per second while burning
    };
}

/**
 * Apply freeze to an enemy.
 * @param {object} enemy
 * @param {number} durationMs
 */
export function applyFreeze(enemy, durationMs) {
    initStatus(enemy);
    enemy._status.frozenUntil = Math.max(enemy._status.frozenUntil, durationMs);
}

/**
 * Apply slow to an enemy.
 * @param {object} enemy
 * @param {number} durationMs
 * @param {number} factor – speed multiplier (0.5 = 50% speed)
 */
export function applySlow(enemy, durationMs, factor = 0.5) {
    initStatus(enemy);
    enemy._status.slowUntil = Math.max(enemy._status.slowUntil, durationMs);
    enemy._status.slowFactor = Math.min(enemy._status.slowFactor, factor);
}

/**
 * Apply burn to an enemy (damage over time).
 * @param {object} enemy
 * @param {number} durationMs
 * @param {number} dps – damage per second
 */
export function applyBurn(enemy, durationMs, dps) {
    initStatus(enemy);
    enemy._status.burnUntil = Math.max(enemy._status.burnUntil, durationMs);
    enemy._status.burnDps = Math.max(enemy._status.burnDps, dps);
}

/**
 * Update status effects for one enemy. Call once per frame per enemy.
 * Returns an object describing what happened this frame:
 *   { frozen: bool, speedMult: number, burnDamage: number }
 * @param {object} enemy
 * @param {number} dtMs – frame delta in milliseconds
 */
export function updateStatus(enemy, dtMs) {
    if (!enemy._status) return { frozen: false, speedMult: 1, burnDamage: 0 };

    const s = enemy._status;
    const result = { frozen: false, speedMult: 1, burnDamage: 0 };

    // Freeze
    if (s.frozenUntil > 0) {
        s.frozenUntil -= dtMs;
        if (s.frozenUntil > 0) {
            result.frozen = true;
        } else {
            s.frozenUntil = 0;
        }
    }

    // Slow (only if not frozen — frozen overrides)
    if (!result.frozen && s.slowUntil > 0) {
        s.slowUntil -= dtMs;
        if (s.slowUntil > 0) {
            result.speedMult = s.slowFactor;
        } else {
            s.slowUntil = 0;
            s.slowFactor = 1;
        }
    }

    // Burn
    if (s.burnUntil > 0) {
        s.burnUntil -= dtMs;
        if (s.burnUntil > 0) {
            result.burnDamage = s.burnDps * (dtMs / 1000);
        } else {
            s.burnUntil = 0;
            s.burnDps = 0;
        }
    }

    return result;
}

/**
 * Check if an enemy is currently frozen.
 */
export function isFrozen(enemy) {
    return enemy._status && enemy._status.frozenUntil > 0;
}

/**
 * Check if an enemy is currently slowed.
 */
export function isSlowed(enemy) {
    return enemy._status && enemy._status.slowUntil > 0;
}

/**
 * Check if an enemy is currently burning.
 */
export function isBurning(enemy) {
    return enemy._status && enemy._status.burnUntil > 0;
}

/**
 * Clear all status effects (e.g. on death).
 */
export function clearStatus(enemy) {
    enemy._status = null;
}

/**
 * Render status effect visuals on an enemy.
 * Call after the enemy's normal render.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} enemy
 */
export function renderStatusEffects(ctx, enemy) {
    if (!enemy._status || enemy.dead) return;
    const s = enemy._status;

    // Frozen: blue-white overlay + ice crystals
    if (s.frozenUntil > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(Date.now() * 0.006) * 0.1;
        ctx.fillStyle = '#80d8ff';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#40c4ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    // Slowed: cyan ring
    if (!s.frozenUntil && s.slowUntil > 0) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // Burning: orange flickering glow
    if (s.burnUntil > 0) {
        ctx.save();
        const flicker = Math.sin(Date.now() * 0.015) * 0.1;
        ctx.globalAlpha = 0.3 + flicker;
        ctx.shadowColor = '#ff6d00';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
