// ── Rarity Badge Renderer ───────────────────────────────────
// Shared utility to draw rarity pill-badges on canvas UI.
// ─────────────────────────────────────────────────────────────

import { RARITY_COLORS, RARITY_LABELS } from '../constants.js';

/**
 * Draw a small rarity pill badge.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} rarity - 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
 * @param {number} x - center X of the badge
 * @param {number} y - center Y of the badge
 * @param {boolean} [dimmed=false] - if true, lower opacity for non-selected items
 */
export function drawRarityBadge(ctx, rarity, x, y, dimmed = false) {
    if (!rarity || !RARITY_COLORS[rarity]) return;

    const label = RARITY_LABELS[rarity] || rarity;
    const color = RARITY_COLORS[rarity];
    const isEpic = rarity === 'epic';
    const isLegendary = rarity === 'legendary';

    ctx.save();

    ctx.font = 'bold 8px monospace';
    const textW = ctx.measureText(label.toUpperCase()).width;
    const padX = 6;
    const padY = 4;
    const pillW = textW + padX * 2;
    const pillH = 12;
    const rx = x - pillW / 2;
    const ry = y - pillH / 2;
    const radius = 3;

    if (dimmed) ctx.globalAlpha = 0.5;

    // ── Glow aura for Epic / Legendary ──
    if ((isEpic || isLegendary) && !dimmed) {
        const pulse = 0.45 + 0.25 * Math.sin(performance.now() / (isLegendary ? 350 : 600));
        ctx.shadowColor = color;
        ctx.shadowBlur = isLegendary ? 14 : 8;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(rx - 1, ry - 1, pillW + 2, pillH + 2, radius + 1);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = dimmed ? 0.5 : 1;
    }

    // Pill background
    ctx.fillStyle = color;
    ctx.globalAlpha *= (isLegendary ? 0.3 : isEpic ? 0.24 : 0.18);
    ctx.beginPath();
    ctx.roundRect(rx, ry, pillW, pillH, radius);
    ctx.fill();

    // Pill border
    ctx.globalAlpha = dimmed ? 0.4 : (isLegendary ? 1.0 : isEpic ? 0.85 : 0.7);
    ctx.strokeStyle = color;
    ctx.lineWidth = isLegendary ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(rx, ry, pillW, pillH, radius);
    ctx.stroke();

    // Text
    ctx.globalAlpha = dimmed ? 0.5 : (isLegendary ? 1.0 : 0.9);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLegendary && !dimmed) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
    }
    ctx.fillText(label.toUpperCase(), x, y);

    ctx.restore();
}

/**
 * Draw an inline rarity tag after text (right-aligned in a row).
 * Returns the width of the badge for layout calculations.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} rarity
 * @param {number} x - right edge X where badge should end
 * @param {number} y - center Y
 * @param {boolean} [dimmed=false]
 * @returns {number} width of the drawn badge
 */
export function drawRarityBadgeRight(ctx, rarity, x, y, dimmed = false) {
    if (!rarity || !RARITY_COLORS[rarity]) return 0;

    const label = RARITY_LABELS[rarity] || rarity;
    const color = RARITY_COLORS[rarity];
    const isEpic = rarity === 'epic';
    const isLegendary = rarity === 'legendary';

    ctx.save();

    ctx.font = 'bold 8px monospace';
    const textW = ctx.measureText(label.toUpperCase()).width;
    const padX = 6;
    const pillW = textW + padX * 2;
    const pillH = 12;
    const rx = x - pillW;
    const ry = y - pillH / 2;
    const radius = 3;

    if (dimmed) ctx.globalAlpha = 0.5;

    // ── Glow aura for Epic / Legendary ──
    if ((isEpic || isLegendary) && !dimmed) {
        const pulse = 0.45 + 0.25 * Math.sin(performance.now() / (isLegendary ? 350 : 600));
        ctx.shadowColor = color;
        ctx.shadowBlur = isLegendary ? 14 : 8;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(rx - 1, ry - 1, pillW + 2, pillH + 2, radius + 1);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = dimmed ? 0.5 : 1;
    }

    // Pill background
    ctx.fillStyle = color;
    ctx.globalAlpha *= (isLegendary ? 0.3 : isEpic ? 0.24 : 0.18);
    ctx.beginPath();
    ctx.roundRect(rx, ry, pillW, pillH, radius);
    ctx.fill();

    // Pill border
    ctx.globalAlpha = dimmed ? 0.4 : (isLegendary ? 1.0 : isEpic ? 0.85 : 0.7);
    ctx.strokeStyle = color;
    ctx.lineWidth = isLegendary ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(rx, ry, pillW, pillH, radius);
    ctx.stroke();

    // Text
    ctx.globalAlpha = dimmed ? 0.5 : (isLegendary ? 1.0 : 0.9);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLegendary && !dimmed) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
    }
    ctx.fillText(label.toUpperCase(), rx + pillW / 2, y);

    ctx.restore();

    return pillW;
}
