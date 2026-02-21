// ── Impact System ──────────────────────────────────────────
// Manages hit-stop (time freeze), screen shake, entity flash,
// and trail spawning for game-feel / "juice".
// ────────────────────────────────────────────────────────────

import { triggerShake } from '../shake.js';

// ── Hit-Stop (global time-scale freeze) ──
let _hitStopRemaining = 0;   // ms remaining

// ── Trail queue (consumed by game.js to spawn particles) ──
let _trailQueue = [];

/**
 * Trigger a short global freeze (hit-stop).
 * During hit-stop, `getTimeScale()` returns ~0.
 * @param {number} durationMs – freeze time in milliseconds (60–90ms typical)
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
 * Update hit-stop timer. Call once per frame from main loop.
 * @param {number} dtMs – raw frame delta in milliseconds
 */
export function update(dtMs) {
    if (_hitStopRemaining > 0) {
        _hitStopRemaining -= dtMs;
        if (_hitStopRemaining < 0) _hitStopRemaining = 0;
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
export function bigImpact(hitStopMs = 70, shakeIntensity = 5, shakeDuration = 0.86) {
    hitStop(hitStopMs);
    shake(shakeIntensity, shakeDuration);
}

/**
 * Convenience: trigger a "small impact" package.
 * Used for normal melee hits.
 */
export function smallImpact(entity) {
    flashEntity(entity, 60);
    shake(1.5, 0.85);
}
