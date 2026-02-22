// ── Impact System ──────────────────────────────────────────
// Manages hit-stop (time freeze), screen shake, entity flash,
// and trail spawning for game-feel / "juice".
// ────────────────────────────────────────────────────────────

import { triggerShake } from '../shake.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

// ── Hit-Stop (global time-scale freeze) ──
let _hitStopRemaining = 0;   // ms remaining

// ── Screen Flash Overlay ──
let _flashColor = '#ffffff';
let _flashAlpha = 0;
let _flashDecay = 0.06;   // alpha removed per ms

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
 * Convenience: trigger a "small impact" package.
 * Used for normal melee hits.
 */
export function smallImpact(entity) {
    flashEntity(entity, 60);
    shake(2, 0.85);
}
