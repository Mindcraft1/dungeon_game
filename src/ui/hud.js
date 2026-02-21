import { CANVAS_WIDTH } from '../constants.js';
import { PICKUP_INFO } from '../entities/pickup.js';

/**
 * Draw the in-game HUD (HP bar, XP bar, level, stage, enemies remaining, active buffs).
 */
export function renderHUD(ctx, player, stage, enemiesAlive, trainingMode = false) {
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

    ctx.textAlign = 'left'; // reset
}

/**
 * Render active buff icons with countdown bars under the top-right stats.
 */
function _renderActiveBuffs(ctx, player, pad) {
    const buffs = player.activeBuffs;
    if (buffs.length === 0) return;

    const iconSize = 20;
    const spacing = 6;
    const startX = CANVAS_WIDTH - pad - iconSize;
    const startY = 44;

    buffs.forEach((buff, i) => {
        const info = PICKUP_INFO[buff.type];
        if (!info) return;

        const x = startX;
        const y = startY + i * (iconSize + spacing + 4);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - 2, y - 2, iconSize + 4, iconSize + 8);

        // Icon color circle
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.arc(x + iconSize / 2, y + iconSize / 2, iconSize / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Category indicator: sword (offensive) or shield (defensive)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        const symbol = info.category === 'offensive' ? '⚔' : '🛡';
        ctx.fillText(symbol, x + iconSize / 2, y + iconSize / 2 + 3);

        // Timer bar below icon
        const barW = iconSize;
        const barH = 3;
        const barY = y + iconSize + 1;
        const ratio = Math.max(0, buff.remaining / buff.duration);

        ctx.fillStyle = '#222';
        ctx.fillRect(x, barY, barW, barH);

        // Color based on remaining time
        ctx.fillStyle = ratio > 0.5 ? info.color : ratio > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(x, barY, barW * ratio, barH);

        // Abbreviated name to the left of icon
        ctx.textAlign = 'right';
        ctx.fillStyle = info.color;
        ctx.font = '9px monospace';
        const shortName = info.name.length > 8 ? info.name.slice(0, 8) : info.name;
        ctx.fillText(shortName, x - 6, y + iconSize / 2 + 3);
    });
}
