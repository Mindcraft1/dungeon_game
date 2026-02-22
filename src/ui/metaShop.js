// ── Meta-Shop UI ────────────────────────────────────────────
// Core Shards shop in the main menu. Max 1 booster per run.
// Supports progressive unlocking based on player stats.
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT, META_BOOSTERS, META_BOOSTER_IDS } from '../constants.js';

/**
 * Render the Meta-Shop screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cursor           – 0..N-1 = booster cards, N = clear selection
 * @param {number} availableShards  – current spendable Core Shards
 * @param {string|null} selectedBoosterId – already purchased/selected booster id
 * @param {Record<string,boolean>} unlockedBoosters – which boosters are unlocked
 * @param {{runsPlayed:number, bossesKilledTotal:number, highestStage:number}} stats – player stats for progress display
 */
export function renderMetaShop(ctx, cursor, availableShards, selectedBoosterId, unlockedBoosters = {}, stats = {}) {
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
    ctx.fillText('BOOSTER SHOP', CANVAS_WIDTH / 2, 36);

    // Shards display
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`◆ Core Shards: ${availableShards}`, CANVAS_WIDTH / 2, 56);

    // Subtitle
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('Choose 1 booster for your next run (purchased immediately)', CANVAS_WIDTH / 2, 72);

    // Active selection banner
    let bannerH = 0;
    if (selectedBoosterId) {
        const booster = META_BOOSTERS[selectedBoosterId];
        ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        ctx.fillRect(CANVAS_WIDTH / 2 - 250, 80, 500, 22);
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 1;
        ctx.strokeRect(CANVAS_WIDTH / 2 - 250, 80, 500, 22);
        ctx.fillStyle = '#4caf50';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`✓ Selected: ${booster ? booster.name : selectedBoosterId}`, CANVAS_WIDTH / 2, 95);
        bannerH = 28;
    }

    // Booster cards — dynamic grid: 2 columns, N/2 rows
    const count = META_BOOSTER_IDS.length;
    const cols = 2;
    const rows = Math.ceil(count / cols);
    const cardW = 230;
    const cardH = rows > 2 ? 104 : 130;
    const gapX = 20;
    const gapY = rows > 2 ? 10 : 16;
    const gridStartX = CANVAS_WIDTH / 2 - (cardW * cols + gapX) / 2;
    const gridStartY = 82 + bannerH;

    META_BOOSTER_IDS.forEach((id, i) => {
        const booster = META_BOOSTERS[id];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = gridStartX + col * (cardW + gapX);
        const cy = gridStartY + row * (cardH + gapY);
        const selected = i === cursor;
        const isOwned = selectedBoosterId === id;
        const isLocked = !unlockedBoosters[id];
        const canAfford = !isLocked && availableShards >= booster.cost && !selectedBoosterId;

        // Card background
        ctx.fillStyle = isLocked
            ? 'rgba(255,255,255,0.01)'
            : isOwned
                ? 'rgba(76, 175, 80, 0.12)'
                : selected
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,255,255,0.02)';
        ctx.fillRect(cx, cy, cardW, cardH);

        // Card border
        ctx.strokeStyle = isLocked
            ? '#222'
            : isOwned ? '#4caf50' : selected ? booster.color : '#333';
        ctx.lineWidth = (!isLocked && (selected || isOwned)) ? 2 : 1;
        ctx.strokeRect(cx, cy, cardW, cardH);

        if (isLocked) {
            // ── Locked card ──
            // Lock icon
            ctx.fillStyle = '#444';
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🔒', cx + cardW / 2, cy + cardH / 2 - 10);

            // Unlock requirement
            ctx.fillStyle = selected ? '#888' : '#555';
            ctx.font = '10px monospace';
            const unlockReq = booster.unlock;
            if (unlockReq) {
                const current = stats[unlockReq.stat] || 0;
                ctx.fillText(unlockReq.label, cx + cardW / 2, cy + cardH / 2 + 8);
                // Progress bar
                const pct = Math.min(1, current / unlockReq.value);
                const barW = cardW - 60;
                const barH = 6;
                const barX = cx + 30;
                const barY = cy + cardH / 2 + 16;
                ctx.fillStyle = '#222';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = pct >= 1 ? '#4caf50' : '#666';
                ctx.fillRect(barX, barY, barW * pct, barH);
                ctx.fillStyle = selected ? '#aaa' : '#555';
                ctx.font = '9px monospace';
                ctx.fillText(`${current} / ${unlockReq.value}`, cx + cardW / 2, barY + barH + 11);
            }

            // Dim name at top
            ctx.textAlign = 'left';
            ctx.fillStyle = '#444';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`? ${booster.name}`, cx + 12, cy + 18);
        } else {
            // ── Unlocked card ──
            // Selection arrow
            if (selected && !isOwned) {
                ctx.fillStyle = booster.color;
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('▸', cx + 6, cy + 22);
            }

            // Icon + Name
            ctx.textAlign = 'left';
            ctx.fillStyle = selected ? booster.color : '#aaa';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(`${booster.icon} ${booster.name}`, cx + 22, cy + 22);

            // Description
            ctx.fillStyle = selected ? '#ccc' : '#777';
            ctx.font = '11px monospace';
            const words = booster.desc.split(' ');
            let line = '';
            let lineY = cy + 40;
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
                ctx.fillText('✓ OWNED', cx + cardW - 10, cy + cardH - 10);
            } else {
                ctx.fillStyle = canAfford ? '#ffd700' : '#666';
                ctx.font = 'bold 12px monospace';
                ctx.fillText(`◆ ${booster.cost}`, cx + cardW - 10, cy + cardH - 10);
            }

            // Buy hint
            if (selected && canAfford && !isOwned) {
                ctx.fillStyle = '#4caf50';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('[ENTER] Buy', cx + cardW - 10, cy + cardH - 24);
            } else if (selected && !canAfford && !isOwned && !selectedBoosterId && !isLocked) {
                ctx.fillStyle = '#e74c3c';
                ctx.font = '10px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('Not enough shards', cx + cardW - 10, cy + cardH - 24);
            } else if (selected && selectedBoosterId && !isOwned) {
                ctx.fillStyle = '#ff9800';
                ctx.font = '10px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('Already have a booster', cx + cardW - 10, cy + cardH - 24);
            }
        }
    });

    // Clear selection button
    const clearY = gridStartY + rows * (cardH + gapY) + 4;
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
    ctx.fillText('W/A/S/D = Select  ·  ENTER = Buy  ·  ESC = Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 16);

    ctx.textAlign = 'left';
}
