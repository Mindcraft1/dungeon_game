// ── In-Run Shop UI ──────────────────────────────────────────
// Overlay shop that appears between bosses during a run.
// Sells temporary items for run-only Coins.
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT, RUN_SHOP_ITEMS, RUN_SHOP_ITEM_IDS } from '../constants.js';

/**
 * Render the in-run shop overlay.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cursor         – 0..5 = items, 6 = continue
 * @param {number} coins          – player's current run coins
 * @param {number} stage          – current stage
 * @param {number} shieldCharges  – current shield charges (for repair armor feedback)
 * @param {number} bombCharges    – current bomb charges
 */
export function renderRunShop(ctx, cursor, coins, stage, shieldCharges = 0, bombCharges = 0) {
    // Dim background (game world is behind)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.80)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Shop panel
    const panelW = 640;
    const panelH = 480;
    const px = (CANVAS_WIDTH - panelW) / 2;
    const py = (CANVAS_HEIGHT - panelH) / 2;

    ctx.fillStyle = 'rgba(15, 15, 25, 0.97)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panelW, panelH);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('SHOP', CANVAS_WIDTH / 2, py + 34);

    // Coins display
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`🪙 Coins: ${coins}`, CANVAS_WIDTH / 2, py + 56);

    // Stage info
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText(`Stage ${stage}`, CANVAS_WIDTH / 2, py + 72);

    // Item list
    const itemStartY = py + 92;
    const rowH = 54;

    RUN_SHOP_ITEM_IDS.forEach((id, i) => {
        const item = RUN_SHOP_ITEMS[id];
        const selected = i === cursor;
        const canAfford = coins >= item.cost;
        const iy = itemStartY + i * rowH;
        const rowW = panelW - 40;
        const rowX = px + 20;

        // Row background
        ctx.fillStyle = selected
            ? 'rgba(255, 215, 0, 0.08)'
            : 'rgba(255,255,255,0.02)';
        ctx.fillRect(rowX, iy, rowW, rowH - 6);

        // Row border
        if (selected) {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(rowX, iy, rowW, rowH - 6);
        }

        // Selection arrow
        if (selected) {
            ctx.fillStyle = item.color;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('▸', rowX + 6, iy + 24);
        }

        // Icon + Name
        ctx.textAlign = 'left';
        ctx.fillStyle = selected ? item.color : '#aaa';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${item.icon} ${item.name}`, rowX + 24, iy + 20);

        // Description
        ctx.fillStyle = selected ? '#ccc' : '#777';
        ctx.font = '11px monospace';
        let desc = item.desc;
        // Add extra info for contextual items
        if (id === 'run_item_repair_armor') {
            desc += ` (current: ${shieldCharges})`;
        } else if (id === 'run_item_bomb') {
            desc += ` (charges: ${bombCharges})`;
        }
        ctx.fillText(desc, rowX + 24, iy + 36);

        // Cost
        ctx.textAlign = 'right';
        ctx.fillStyle = canAfford ? '#ffd700' : '#666';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`🪙 ${item.cost}`, rowX + rowW - 10, iy + 20);

        // Buy hint / number key
        if (selected && canAfford) {
            ctx.fillStyle = '#4caf50';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('[ENTER] Buy', rowX + rowW - 10, iy + 36);
        } else if (selected && !canAfford) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '10px monospace';
            ctx.fillText('Not enough coins', rowX + rowW - 10, iy + 36);
        }

        // Number key hint
        ctx.textAlign = 'left';
        ctx.fillStyle = '#555';
        ctx.font = '10px monospace';
        ctx.fillText(`[${i + 1}]`, rowX + rowW - 54, iy + 36);
    });

    // Continue button
    const contY = itemStartY + RUN_SHOP_ITEM_IDS.length * rowH + 8;
    const contSelected = cursor === RUN_SHOP_ITEM_IDS.length;

    if (contSelected) {
        ctx.fillStyle = 'rgba(79, 195, 247, 0.1)';
        ctx.fillRect(CANVAS_WIDTH / 2 - 100, contY, 200, 34);
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(CANVAS_WIDTH / 2 - 100, contY, 200, 34);
    }

    ctx.fillStyle = contSelected ? '#4fc3f7' : '#666';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONTINUE', CANVAS_WIDTH / 2, contY + 22);

    // Controls hint
    ctx.fillStyle = '#444';
    ctx.font = '11px monospace';
    ctx.fillText('W/S = Select  ·  ENTER/1-6 = Buy  ·  ESC = Continue', CANVAS_WIDTH / 2, py + panelH - 12);

    ctx.textAlign = 'left';
}
