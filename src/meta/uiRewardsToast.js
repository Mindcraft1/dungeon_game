// ── Rewards Toast (floating notifications) ─────────────────
// Lightweight toast system for shard gain, relic unlock, etc.
// Rendered on top of game world by game.js render pipeline.
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const TOAST_DURATION = 2500;    // ms
const TOAST_FADE_START = 1800;  // ms remaining when fade begins

let _toasts = [];   // [{ text, color, icon, timer, maxTimer, big }]

/**
 * Show a small toast notification.
 */
export function showToast(text, color = '#ffd700', icon = '') {
    _toasts.push({
        text,
        color,
        icon,
        timer: TOAST_DURATION,
        maxTimer: TOAST_DURATION,
        big: false,
    });
}

/**
 * Show a big, prominent notification (for relic unlocks).
 */
export function showBigToast(text, color = '#ffd700', icon = '') {
    _toasts.push({
        text,
        color,
        icon,
        timer: 3500,
        maxTimer: 3500,
        big: true,
    });
}

/**
 * Update all toasts. Call once per frame.
 */
export function updateToasts(dt) {
    const ms = dt * 1000;
    for (const t of _toasts) {
        t.timer -= ms;
    }
    _toasts = _toasts.filter(t => t.timer > 0);
}

/**
 * Render all active toasts.
 */
export function renderToasts(ctx) {
    if (_toasts.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';

    // Stack toasts from top-center
    let y = 50;

    for (const t of _toasts) {
        const fadeMs = t.maxTimer - TOAST_FADE_START;
        const alpha = t.timer < fadeMs
            ? t.timer / fadeMs
            : Math.min(1, (t.maxTimer - t.timer) / 300);  // fade in

        ctx.globalAlpha = alpha;

        if (t.big) {
            _renderBigToast(ctx, t, y);
            y += 60;
        } else {
            _renderSmallToast(ctx, t, y);
            y += 32;
        }
    }

    ctx.restore();
}

function _renderSmallToast(ctx, t, y) {
    const display = t.icon ? `${t.icon} ${t.text}` : t.text;
    const w = display.length * 8 + 24;
    const h = 24;
    const x = CANVAS_WIDTH / 2 - w / 2;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Text
    ctx.fillStyle = t.color;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(display, CANVAS_WIDTH / 2, y + 16);
}

function _renderBigToast(ctx, t, y) {
    const display = t.icon ? `${t.icon} ${t.text}` : t.text;
    const w = Math.max(300, display.length * 10 + 40);
    const h = 46;
    const x = CANVAS_WIDTH / 2 - w / 2;

    // Glowing background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, w, h);

    // Border with glow
    const shimmer = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * shimmer;
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    ctx.restore();

    ctx.strokeStyle = t.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Title text
    ctx.fillStyle = t.color;
    ctx.font = 'bold 16px monospace';
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 10;
    ctx.fillText(display, CANVAS_WIDTH / 2, y + 28);
    ctx.shadowBlur = 0;
}

/**
 * Clear all toasts (e.g., on state change).
 */
export function clearToasts() {
    _toasts = [];
}
