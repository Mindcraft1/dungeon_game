// ── Meta-Shop UI ────────────────────────────────────────────
// Core Shards shop in the main menu. Max 1 booster per run.
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT, META_BOOSTERS, META_BOOSTER_IDS } from '../constants.js';

/**
 * Render the Meta-Shop screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cursor           – 0..3 = booster cards, 4 = clear selection
 * @param {number} availableShards  – current spendable Core Shards
 * @param {string|null} selectedBoosterId – already purchased/selected booster id
 */
export function renderMetaShop(ctx, cursor, availableShards, selectedBoosterId) {
    // Full-screen background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle grid
    ctx.strokeStyle = 'rgba(79,195,247,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('BOOSTER SHOP', CANVAS_WIDTH / 2, 40);

    // Shards display
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`◆ Core Shards: ${availableShards}`, CANVAS_WIDTH / 2, 62);

    // Subtitle
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Choose 1 booster for your next run (purchased immediately)', CANVAS_WIDTH / 2, 80);

    // Active selection banner
    if (selectedBoosterId) {
        const booster = META_BOOSTERS[selectedBoosterId];
        ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        ctx.fillRect(CANVAS_WIDTH / 2 - 250, 90, 500, 24);
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 1;
        ctx.strokeRect(CANVAS_WIDTH / 2 - 250, 90, 500, 24);
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`✓ Selected: ${booster ? booster.name : selectedBoosterId}`, CANVAS_WIDTH / 2, 106);
    }

    // Booster cards (2×2 grid)
    const cardW = 230;
    const cardH = 130;
    const gapX = 20;
    const gapY = 16;
    const gridStartX = CANVAS_WIDTH / 2 - (cardW * 2 + gapX) / 2;
    const gridStartY = selectedBoosterId ? 124 : 100;

    META_BOOSTER_IDS.forEach((id, i) => {
        const booster = META_BOOSTERS[id];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = gridStartX + col * (cardW + gapX);
        const cy = gridStartY + row * (cardH + gapY);
        const selected = i === cursor;
        const isOwned = selectedBoosterId === id;
        const canAfford = availableShards >= booster.cost && !selectedBoosterId;

        // Card background
        ctx.fillStyle = isOwned
            ? 'rgba(76, 175, 80, 0.12)'
            : selected
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.02)';
        ctx.fillRect(cx, cy, cardW, cardH);

        // Card border
        ctx.strokeStyle = isOwned ? '#4caf50' : selected ? booster.color : '#333';
        ctx.lineWidth = selected || isOwned ? 2 : 1;
        ctx.strokeRect(cx, cy, cardW, cardH);

        // Selection arrow
        if (selected && !isOwned) {
            ctx.fillStyle = booster.color;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('▸', cx + 6, cy + 24);
        }

        // Icon + Name
        ctx.textAlign = 'left';
        ctx.fillStyle = selected ? booster.color : '#aaa';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${booster.icon} ${booster.name}`, cx + 22, cy + 26);

        // Description
        ctx.fillStyle = selected ? '#ccc' : '#777';
        ctx.font = '11px monospace';
        // Word-wrap the description
        const words = booster.desc.split(' ');
        let line = '';
        let lineY = cy + 46;
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > cardW - 30) {
                ctx.fillText(line, cx + 12, lineY);
                line = word;
                lineY += 14;
            } else {
                line = test;
            }
        }
        if (line) ctx.fillText(line, cx + 12, lineY);

        // Cost
        ctx.textAlign = 'right';
        if (isOwned) {
            ctx.fillStyle = '#4caf50';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('✓ OWNED', cx + cardW - 10, cy + cardH - 12);
        } else {
            ctx.fillStyle = canAfford ? '#ffd700' : '#666';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`◆ ${booster.cost}`, cx + cardW - 10, cy + cardH - 12);
        }

        // Buy hint
        if (selected && canAfford && !isOwned) {
            ctx.fillStyle = '#4caf50';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('[ENTER] Buy', cx + cardW - 10, cy + cardH - 28);
        } else if (selected && !canAfford && !isOwned && !selectedBoosterId) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('Not enough shards', cx + cardW - 10, cy + cardH - 28);
        } else if (selected && selectedBoosterId && !isOwned) {
            ctx.fillStyle = '#ff9800';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('Already have a booster', cx + cardW - 10, cy + cardH - 28);
        }
    });

    // Clear selection button
    const clearY = gridStartY + 2 * (cardH + gapY) + 8;
    const clearSelected = cursor === META_BOOSTER_IDS.length;
    if (selectedBoosterId) {
        if (clearSelected) {
            ctx.fillStyle = 'rgba(255, 152, 0, 0.1)';
            ctx.fillRect(CANVAS_WIDTH / 2 - 120, clearY, 240, 30);
            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(CANVAS_WIDTH / 2 - 120, clearY, 240, 30);
        }
        ctx.fillStyle = clearSelected ? '#ff9800' : '#666';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CLEAR SELECTION (refund)', CANVAS_WIDTH / 2, clearY + 20);
    }

    // Controls hint
    ctx.fillStyle = '#444';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('W/S = Select  ·  ENTER = Buy  ·  ESC = Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 16);

    ctx.textAlign = 'left';
}
