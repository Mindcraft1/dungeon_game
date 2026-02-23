// ── Darkness Room Type Definition ────────────────────────────
// A combat room where visibility is limited to a circle around
// the player. Enemies outside the light are invisible.
//
// Lifecycle:
//   onEnter   → enable overlay, show intro message
//   onUpdate  → update overlay position & flicker
//   onRender  → draw darkness overlay after entities
//   isComplete → null (use default kill-all)
//   getReward → bonus heal on clear
//   onExit    → remove overlay, restore state
// ─────────────────────────────────────────────────────────────

import {
    ROOM_TYPE_DARKNESS,
    DARKNESS_CONFIG,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
} from '../../constants.js';
import { registerRoomType } from '../roomRegistry.js';

// ── Per-room darkness state (module-scoped, reset in onEnter) ──
let _active = false;
let _lightRadius = DARKNESS_CONFIG.lightRadius;
let _introTimer = 0;
let _flickerPhase = 0;
let _playerX = 0;
let _playerY = 0;

// ── Offscreen canvas for the darkness overlay ──
// Using an offscreen canvas with globalCompositeOperation is
// *much* cheaper than per-pixel masking on the main canvas.
let _overlayCanvas = null;
let _overlayCtx = null;

function _ensureOverlay() {
    if (_overlayCanvas) return;
    _overlayCanvas = document.createElement('canvas');
    _overlayCanvas.width = CANVAS_WIDTH;
    _overlayCanvas.height = CANVAS_HEIGHT;
    _overlayCtx = _overlayCanvas.getContext('2d');
}

/**
 * Check whether the darkness room is currently active.
 * Used by enemy.js / game.js to gate visibility.
 */
export function isDarknessActive() {
    return _active;
}

/**
 * Get the current effective light radius.
 */
export function getLightRadius() {
    return _lightRadius;
}

/**
 * Get the current player-centred light position.
 */
export function getLightPos() {
    return { x: _playerX, y: _playerY };
}

/**
 * Check if a world-space point is inside the light bubble.
 * Used to cull enemy rendering & projectile visibility.
 */
export function isInsideLight(x, y) {
    if (!_active) return true;
    const dx = x - _playerX;
    const dy = y - _playerY;
    return (dx * dx + dy * dy) <= (_lightRadius * _lightRadius);
}

// ── Registration ────────────────────────────────────────────

registerRoomType(ROOM_TYPE_DARKNESS, {
    id:    ROOM_TYPE_DARKNESS,
    name:  'Darkness',
    color: '#1a0a2e',
    icon:  '🌑',

    /**
     * Called once when the player enters a darkness room.
     * @param {object} roomCtx - { player, stage }
     */
    onEnter(roomCtx) {
        _active = true;
        _lightRadius = DARKNESS_CONFIG.lightRadius;
        _introTimer = DARKNESS_CONFIG.introMessageDuration;
        _flickerPhase = Math.random() * Math.PI * 2;
        if (roomCtx.player) {
            _playerX = roomCtx.player.x;
            _playerY = roomCtx.player.y;
        }
        _ensureOverlay();
    },

    /**
     * Per-frame update.
     * @param {object} roomCtx - { player, enemies, dt }
     * @param {number} dt - seconds
     */
    onUpdate(roomCtx, dt) {
        if (!_active) return;

        // Track player position for the light source
        if (roomCtx.player) {
            _playerX = roomCtx.player.x;
            _playerY = roomCtx.player.y;
        }

        // Flicker
        _flickerPhase += dt * 4.5;
        const flicker = Math.sin(_flickerPhase) * DARKNESS_CONFIG.flickerStrength * _lightRadius;
        // effective radius includes small flicker
        _lightRadius = DARKNESS_CONFIG.lightRadius + flicker;

        // Intro message countdown
        if (_introTimer > 0) {
            _introTimer -= dt * 1000;
            if (_introTimer < 0) _introTimer = 0;
        }
    },

    /**
     * Render the darkness overlay on top of the game world.
     * Called after entities + particles, before HUD.
     * @param {CanvasRenderingContext2D} ctx - main canvas context
     */
    onRender(ctx) {
        if (!_active) return;

        _ensureOverlay();
        const oc = _overlayCtx;

        // Fill overlay with black
        oc.globalCompositeOperation = 'source-over';
        oc.fillStyle = '#000';
        oc.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Cut out the light circle using 'destination-out'
        oc.globalCompositeOperation = 'destination-out';

        // Radial gradient for soft edge
        const r = Math.max(1, _lightRadius);
        const innerR = Math.max(0, r - DARKNESS_CONFIG.lightEdgeSoftness);
        const grad = oc.createRadialGradient(
            _playerX, _playerY, innerR,
            _playerX, _playerY, r,
        );
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        oc.fillStyle = grad;
        oc.beginPath();
        oc.arc(_playerX, _playerY, r, 0, Math.PI * 2);
        oc.fill();

        // Also punch a fully transparent inner disc
        oc.fillStyle = 'rgba(0,0,0,1)';
        oc.beginPath();
        oc.arc(_playerX, _playerY, innerR, 0, Math.PI * 2);
        oc.fill();

        // Reset composite mode
        oc.globalCompositeOperation = 'source-over';

        // Draw the overlay onto the main canvas
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.drawImage(_overlayCanvas, 0, 0);
        ctx.restore();

        // ── Intro message ──
        if (_introTimer > 0) {
            const fadeMs = 400;
            const alpha = _introTimer < fadeMs
                ? _introTimer / fadeMs
                : Math.min(1, (DARKNESS_CONFIG.introMessageDuration - _introTimer) / 300);
            ctx.save();
            ctx.globalAlpha = alpha * 0.95;
            ctx.textAlign = 'center';

            // Background bar
            const cy = CANVAS_HEIGHT / 2 - 20;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, cy - 24, CANVAS_WIDTH, 52);

            // Text
            ctx.fillStyle = '#8866cc';
            ctx.font = 'bold 20px monospace';
            ctx.shadowColor = '#8866cc';
            ctx.shadowBlur = 14;
            ctx.fillText('🌑  The darkness surrounds you…', CANVAS_WIDTH / 2, cy + 4);
            ctx.shadowBlur = 0;

            ctx.restore();
        }
    },

    /**
     * Completion: use default kill-all logic.
     */
    isComplete() {
        return null; // null = defer to default
    },

    /**
     * Reward granted on room clear.
     * Returns a descriptor that game.js applies.
     */
    getReward(roomCtx) {
        return {
            type: 'darkness_clear',
            healPercent: DARKNESS_CONFIG.rewardHealPercent,
            xpMultiplier: DARKNESS_CONFIG.rewardXPMultiplier,
        };
    },

    /**
     * Cleanup when leaving the room. CRITICAL — no leaks.
     */
    onExit() {
        _active = false;
        _introTimer = 0;
        _lightRadius = DARKNESS_CONFIG.lightRadius;
    },
});
