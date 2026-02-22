// ── Boss Scroll UI ──────────────────────────────────────────
// Overlay for choosing 1-of-3 permanent unlocks from a boss scroll drop.
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

/**
 * Render the boss scroll choice overlay.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{type,id,name,icon,color}>} choices - 3 unlock options
 * @param {number} cursor - 0..2
 */
export function renderBossScrollOverlay(ctx, choices, cursor) {
    // Backdrop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const panelW = 420;
    const panelH = 300;
    const px = (CANVAS_WIDTH - panelW) / 2;
    const py = (CANVAS_HEIGHT - panelH) / 2;

    // Panel
    ctx.fillStyle = 'rgba(15, 12, 30, 0.97)';
    ctx.fillRect(px, py, panelW, panelH);

    // Golden shimmer border
    const shimmer = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = shimmer;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, panelW, panelH);
    ctx.restore();

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('📜 ANCIENT SCROLL', CANVAS_WIDTH / 2, py + 38);

    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText('Choose one permanent unlock:', CANVAS_WIDTH / 2, py + 60);

    // Choices
    const startY = py + 90;
    const rowH = 50;

    choices.forEach((choice, i) => {
        const y = startY + i * rowH;
        const selected = i === cursor;

        // Row background
        if (selected) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.08)';
            ctx.fillRect(px + 14, y - 18, panelW - 28, rowH - 6);
            ctx.strokeStyle = choice.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 14, y - 18, panelW - 28, rowH - 6);
        }

        // Type label
        const typeLabel = choice.type === 'ability' ? 'ABILITY' : choice.type === 'proc' ? 'PASSIVE' : 'NODE';

        ctx.fillStyle = selected ? choice.color : '#888';
        ctx.font = selected ? 'bold 15px monospace' : '14px monospace';
        ctx.fillText(`${choice.icon}  ${choice.name}`, CANVAS_WIDTH / 2, y + 2);

        ctx.fillStyle = selected ? '#bbb' : '#555';
        ctx.font = '10px monospace';
        ctx.fillText(`[${typeLabel}]`, CANVAS_WIDTH / 2, y + 18);
    });

    // Controls
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('W/S Navigate · ENTER/SPACE Confirm', CANVAS_WIDTH / 2, py + panelH - 16);

    ctx.textAlign = 'left';
}
