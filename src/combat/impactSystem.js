// ── Impact System ──────────────────────────────────────────
// Manages hit-stop (time freeze), screen shake, entity flash,
// and trail spawning for game-feel / "juice".
// ────────────────────────────────────────────────────────────

import { triggerShake, triggerDirectionalShake } from '../shake.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

// ── Hit-Stop (global time-scale freeze) ──
let _hitStopRemaining = 0;   // ms remaining

// ── Screen Flash Overlay ──
let _flashColor = '#ffffff';
let _flashAlpha = 0;
let _flashDecay = 0.06;   // alpha removed per ms

// ── Trail queue (consumed by game.js to spawn particles) ──
let _trailQueue = [];

// ── Impact ring queue (consumed by game.js to spawn impact ring particles) ──
let _impactRingQueue = [];

/**
 * Trigger a short global freeze (hit-stop).
 * During hit-stop, `getTimeScale()` returns ~0.
 * @param {number} durationMs – freeze time in milliseconds (30–100ms typical)
 */
export function hitStop(durationMs) {
    _hitStopRemaining = Math.max(_hitStopRemaining, durationMs);
}

/**
 * Trigger screen shake through the existing shake module.
 * @param {number} intensity – pixel offset magnitude
 * @param {number} [decay]   – per-frame multiplier (default 0.88)
 */
export function shake(intensity, decay = 0.88) {
    triggerShake(intensity, decay);
}

/**
 * Trigger directional screen shake — punches the screen in the hit direction.
 * @param {number} intensity – pixel offset magnitude
 * @param {number} dirX – direction x
 * @param {number} dirY – direction y
 * @param {number} [decay] – per-frame multiplier
 */
export function directionalShake(intensity, dirX, dirY, decay = 0.86) {
    triggerDirectionalShake(intensity, dirX, dirY, decay);
}

/**
 * Flash an entity white for the given duration.
 * Sets `entity.damageFlashTimer` so existing render code handles the visual.
 * @param {object} entity – any entity with a `damageFlashTimer` property
 * @param {number} durationMs
 */
export function flashEntity(entity, durationMs = 60) {
    if (entity && typeof entity.damageFlashTimer !== 'undefined') {
        entity.damageFlashTimer = Math.max(entity.damageFlashTimer, durationMs);
    }
}

/**
 * Queue a trail spawn (afterimage).
 * Consumed by game.js particle system each frame.
 * @param {number} x
 * @param {number} y
 * @param {number} vx – velocity x
 * @param {number} vy – velocity y
 * @param {number} lifetime – ms
 * @param {string} [color]
 */
export function spawnTrail(x, y, vx, vy, lifetime, color = '#4fc3f7') {
    _trailQueue.push({ x, y, vx, vy, lifetime, color });
}

/**
 * Trigger a full-screen color flash overlay that fades out fast.
 * @param {string} color – CSS color
 * @param {number} alpha – starting opacity (0–1)
 * @param {number} [decay] – alpha removed per ms (default 0.004)
 */
export function screenFlash(color = '#ffffff', alpha = 0.35, decay = 0.004) {
    _flashColor = color;
    _flashAlpha = Math.max(_flashAlpha, alpha);
    _flashDecay = decay;
}

/**
 * Render the screen flash overlay. Call AFTER game.render() in main.js.
 * @param {CanvasRenderingContext2D} ctx
 */
export function renderFlash(ctx) {
    if (_flashAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = _flashAlpha;
    ctx.fillStyle = _flashColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
}

/**
 * Update hit-stop timer and screen flash. Call once per frame from main loop.
 * @param {number} dtMs – raw frame delta in milliseconds
 */
export function update(dtMs) {
    if (_hitStopRemaining > 0) {
        _hitStopRemaining -= dtMs;
        if (_hitStopRemaining < 0) _hitStopRemaining = 0;
    }
    // Fade screen flash
    if (_flashAlpha > 0) {
        _flashAlpha -= _flashDecay * dtMs;
        if (_flashAlpha < 0) _flashAlpha = 0;
    }
}

/**
 * Returns the effective time scale (0–1).
 * During hit-stop: ~0.05 (not fully zero to avoid physics bugs).
 * Otherwise: 1.
 */
export function getTimeScale() {
    return _hitStopRemaining > 0 ? 0.05 : 1;
}

/**
 * Check if hit-stop is currently active.
 */
export function isHitStopped() {
    return _hitStopRemaining > 0;
}

/**
 * Consume and return all queued trail spawns.
 * @returns {Array<{x,y,vx,vy,lifetime,color}>}
 */
export function consumeTrails() {
    const trails = _trailQueue;
    _trailQueue = [];
    return trails;
}

/**
 * Convenience: trigger a "big impact" package.
 * Used for shockwave, bomb, crit procs, etc.
 */
export function bigImpact(hitStopMs = 100, shakeIntensity = 10, shakeDuration = 0.88) {
    hitStop(hitStopMs);
    shake(shakeIntensity, shakeDuration);
}

/**
 * Convenience: normal melee hit — brief freeze + directional shake + entity flash.
 * @param {object} entity — the hit entity
 * @param {number} [dirX] — hit direction x (from attacker to target)
 * @param {number} [dirY] — hit direction y
 */
export function smallImpact(entity, dirX, dirY) {
    flashEntity(entity, 80);
    hitStop(35);
    if (dirX !== undefined && dirY !== undefined) {
        directionalShake(3.5, dirX, dirY, 0.82);
    } else {
        shake(3, 0.83);
    }
}

/**
 * Convenience: multi-hit melee — slightly stronger freeze + shake for hitting multiple enemies.
 * @param {number} hitCount — number of enemies hit
 * @param {number} [dirX] — hit direction x
 * @param {number} [dirY] — hit direction y
 */
export function multiHitImpact(hitCount, dirX, dirY) {
    const intensity = Math.min(3 + hitCount * 1.5, 10);
    const freezeMs = Math.min(30 + hitCount * 15, 80);
    hitStop(freezeMs);
    if (dirX !== undefined && dirY !== undefined) {
        directionalShake(intensity, dirX, dirY, 0.84);
    } else {
        shake(intensity, 0.84);
    }
}

/**
 * Convenience: enemy kill impact — longer freeze + bigger shake + screen flash.
 * @param {number} [dirX] — hit direction x
 * @param {number} [dirY] — hit direction y
 */
export function killImpact(dirX, dirY) {
    hitStop(55);
    if (dirX !== undefined && dirY !== undefined) {
        directionalShake(5, dirX, dirY, 0.85);
    } else {
        shake(5, 0.85);
    }
    screenFlash('#ffffff', 0.12, 0.006);
}

/**
 * Convenience: critical hit impact — dramatic freeze + big directional shake + flash.
 * @param {number} [dirX] — hit direction x
 * @param {number} [dirY] — hit direction y
 */
export function critImpact(dirX, dirY) {
    hitStop(75);
    if (dirX !== undefined && dirY !== undefined) {
        directionalShake(7, dirX, dirY, 0.87);
    } else {
        shake(7, 0.87);
    }
    screenFlash('#ffffff', 0.18, 0.005);
}

/**
 * Convenience: player takes damage — screen punch toward player + red flash.
 * @param {number} dirX — direction from damage source to player
 * @param {number} dirY
 */
export function playerHitImpact(dirX, dirY) {
    hitStop(45);
    if (dirX !== undefined && dirY !== undefined) {
        directionalShake(6, dirX, dirY, 0.84);
    } else {
        shake(6, 0.84);
    }
    screenFlash('#ff0000', 0.15, 0.004);
}

/**
 * Queue an impact ring at the given position.
 * Consumed by game.js to spawn impact ring particles.
 */
export function queueImpactRing(x, y, color = '#ffd700', radius = 20) {
    _impactRingQueue.push({ x, y, color, radius });
}

/**
 * Consume and return all queued impact rings.
 */
export function consumeImpactRings() {
    const rings = _impactRingQueue;
    _impactRingQueue = [];
    return rings;
}
