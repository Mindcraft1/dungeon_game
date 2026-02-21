import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import { PICKUP_INFO } from '../entities/pickup.js';

/**
 * Draw the in-game HUD (HP bar, XP bar, level, stage, enemies remaining, active buffs).
 */
export function renderHUD(ctx, player, stage, enemiesAlive, trainingMode = false, muted = false) {
    const pad = 12;
    const barW = 180;
    const barH = 16;
    const y = pad;

    // ── Background panel ──
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(pad - 4, y - 4, barW + 60, 84);

    // ── HP bar ──
    ctx.fillStyle = '#333';
    ctx.fillRect(pad, y, barW, barH);
    const hpR = player.hp / player.maxHp;
    ctx.fillStyle = hpR > 0.5 ? '#4caf50' : hpR > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(pad, y, barW * hpR, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, y, barW, barH);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`HP ${player.hp}/${player.maxHp}`, pad + barW / 2, y + 12);

    // ── XP bar ──
    const xpY = y + barH + 6;
    ctx.fillStyle = '#333';
    ctx.fillRect(pad, xpY, barW, barH);
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(pad, xpY, barW * (player.xp / player.xpToNext), barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(pad, xpY, barW, barH);

    ctx.fillStyle = '#fff';
    ctx.fillText(`XP ${player.xp}/${player.xpToNext}`, pad + barW / 2, xpY + 12);

    // ── Level / Stage / Enemies ──
    const infoY = xpY + barH + 16;
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`LVL ${player.level}`, pad, infoY);
    ctx.fillStyle = '#aaa';
    ctx.fillText(trainingMode ? 'TRAINING' : `Stage ${stage}`, pad + 76, infoY);

    if (enemiesAlive > 0) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = '11px monospace';
        ctx.fillText(`Enemies: ${enemiesAlive}`, pad, infoY + 16);
    } else {
        ctx.fillStyle = '#27ae60';
        ctx.font = '11px monospace';
        ctx.fillText('Door open!', pad, infoY + 16);
    }

    // ── Stats (top-right) ──
    ctx.textAlign = 'right';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(`DMG ${player.damage}`, CANVAS_WIDTH - pad, y + 14);
    ctx.fillStyle = '#66bb6a';
    ctx.fillText(`SPD ${player.speed}`, CANVAS_WIDTH - pad, y + 28);

    // ── Active buffs (below stats, top-right) ──
    _renderActiveBuffs(ctx, player, pad);

    // ── Mute indicator (bottom-right corner) ──
    _renderMuteIcon(ctx, muted);

    ctx.textAlign = 'left'; // reset
}

/**
 * Render active buff icons with countdown bars under the top-right stats.
 */
function _renderActiveBuffs(ctx, player, pad) {
    const buffs = player.activeBuffs;
    if (buffs.length === 0) return;

    const iconSize = 18;
    const rowH = 32;
    const panelW = 190;
    const startX = CANVAS_WIDTH - pad;
    const startY = 44;

    buffs.forEach((buff, i) => {
        const info = PICKUP_INFO[buff.type];
        if (!info) return;

        const y = startY + i * (rowH + 4);
        const panelX = startX - panelW;

        // Background panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(panelX, y, panelW, rowH);

        // Colored left accent bar
        ctx.fillStyle = info.color;
        ctx.fillRect(panelX, y, 3, rowH);

        // Icon color circle
        const iconX = panelX + 14;
        const iconY = y + rowH / 2;
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize / 2 - 1, 0, Math.PI * 2);
        ctx.fill();

        // Category symbol on icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(info.category === 'offensive' ? '⚔' : '🛡', iconX, iconY + 3);

        // Buff name
        const textX = iconX + iconSize / 2 + 6;
        ctx.textAlign = 'left';
        ctx.fillStyle = info.color;
        ctx.font = 'bold 9px monospace';
        ctx.fillText(info.name, textX, y + 12);

        // Effect description
        ctx.fillStyle = '#ccc';
        ctx.font = '8px monospace';
        ctx.fillText(info.effect, textX, y + 22);

        // Timer bar at bottom of panel
        const ratio = Math.max(0, buff.remaining / buff.duration);
        const barX = panelX + 3;
        const barY = y + rowH - 3;
        const barW = panelW - 3;
        const barH = 2;

        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = ratio > 0.5 ? info.color : ratio > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(barX, barY, barW * ratio, barH);
    });
}

/**
 * Render a small speaker/mute icon in the bottom-right corner.
 */
function _renderMuteIcon(ctx, muted) {
    const x = CANVAS_WIDTH - 30;
    const y = CANVAS_HEIGHT - 22;

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = muted ? '#e74c3c' : '#888';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(muted ? '🔇' : '🔊', x, y);
    ctx.fillStyle = '#555';
    ctx.font = '8px monospace';
    ctx.fillText('[M]', x, y + 10);
    ctx.restore();
}
