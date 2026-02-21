import { CANVAS_WIDTH, CANVAS_HEIGHT, DASH_COOLDOWN, COMBO_TIMEOUT } from '../constants.js';
import { PICKUP_INFO } from '../entities/pickup.js';

/**
 * Draw the in-game HUD (HP bar, XP bar, level, stage, enemies remaining, active buffs, combo).
 */
export function renderHUD(ctx, player, stage, enemiesAlive, trainingMode = false, muted = false,
                          comboCount = 0, comboTier = 0, comboMultiplier = 1, comboTimer = 0,
                          isBossRoom = false) {
    const pad = 12;
    const barW = 180;
    const barH = 16;
    const y = pad;

    // ── Background panel ──
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(pad - 4, y - 4, barW + 60, 104);

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
        ctx.fillStyle = isBossRoom ? '#ff6600' : '#e74c3c';
        ctx.font = '11px monospace';
        ctx.fillText(isBossRoom ? 'BOSS FIGHT!' : `Enemies: ${enemiesAlive}`, pad, infoY + 16);
    } else {
        ctx.fillStyle = '#27ae60';
        ctx.font = '11px monospace';
        ctx.fillText('Door open!', pad, infoY + 16);
    }

    // ── Dash cooldown bar ──
    const dashBarY = infoY + 30;
    const dashBarW = 60;
    const dashBarH = 5;
    const dashReady = player.dashCooldown <= 0;
    const dashRatio = dashReady ? 1 : 1 - (player.dashCooldown / DASH_COOLDOWN);

    ctx.fillStyle = '#333';
    ctx.fillRect(pad, dashBarY, dashBarW, dashBarH);
    ctx.fillStyle = dashReady ? '#4fc3f7' : '#1a6a8a';
    ctx.fillRect(pad, dashBarY, dashBarW * dashRatio, dashBarH);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, dashBarY, dashBarW, dashBarH);

    ctx.fillStyle = dashReady ? '#4fc3f7' : '#666';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(dashReady ? 'DASH ✓' : 'DASH', pad + dashBarW + 4, dashBarY + 5);

    // ── Stats (top-right) ──
    ctx.textAlign = 'right';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(`DMG ${player.damage}`, CANVAS_WIDTH - pad, y + 14);
    ctx.fillStyle = '#66bb6a';
    ctx.fillText(`SPD ${player.speed}`, CANVAS_WIDTH - pad, y + 28);

    // ── Active buffs (below stats, top-right) ──
    _renderActiveBuffs(ctx, player, pad);

    // ── Combo / Kill-Chain display (bottom-left) ──
    if (comboCount >= 2) {
        _renderCombo(ctx, comboCount, comboTier, comboMultiplier, comboTimer);
    }

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
 * Render the combo / kill-chain display in the bottom-left area.
 */
function _renderCombo(ctx, comboCount, comboTier, comboMultiplier, comboTimer) {
    const TIER_COLORS = ['#aaa', '#ffd700', '#ff9800', '#e040fb', '#00e5ff'];
    const TIER_NAMES  = ['', 'Nice!', 'Combo!', 'Rampage!', 'UNSTOPPABLE!'];
    const tier = Math.min(comboTier, 4);
    const color = TIER_COLORS[tier];

    const x = 12;
    const y = CANVAS_HEIGHT - 60;
    const panelW = 140;
    const panelH = 48;

    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, panelW, panelH);

    // Colored accent bar on left
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 3, panelH);

    // Kill count
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${comboCount}× Kill`, x + 10, y + 18);

    // Tier name + multiplier
    if (tier >= 1) {
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${TIER_NAMES[tier]}  ×${comboMultiplier.toFixed(2)} XP`, x + 10, y + 32);
    } else {
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.fillText('×1.00 XP', x + 10, y + 32);
    }

    // Timer bar at bottom
    const timerRatio = Math.max(0, comboTimer / COMBO_TIMEOUT);
    const barX = x + 3;
    const barY = y + panelH - 4;
    const barW = panelW - 3;
    const barH = 3;

    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barW, barH);

    // Timer bar color — urgency feedback
    const barColor = timerRatio > 0.5 ? color : timerRatio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * timerRatio, barH);

    // Pulsing glow at high tiers
    if (tier >= 3) {
        const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.15;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, panelW, panelH);
        ctx.restore();
    }
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

/**
 * Render a large Boss HP bar at the top-center of the screen.
 */
export function renderBossHPBar(ctx, boss) {
    if (!boss || boss.dead) return;

    const barW = 400;
    const barH = 18;
    const bx = (CANVAS_WIDTH - barW) / 2;
    const by = 14;

    // Background panel
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 8, by - 22, barW + 16, barH + 34);

    // Boss name
    ctx.textAlign = 'center';
    ctx.fillStyle = boss.color;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(boss.name.toUpperCase(), CANVAS_WIDTH / 2, by - 6);

    // HP bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);

    // HP bar fill
    const ratio = boss.hp / boss.maxHp;
    let barColor;
    if (ratio > 0.5) barColor = boss.color;
    else if (ratio > 0.25) barColor = '#ff9800';
    else barColor = '#f44336';
    ctx.fillStyle = barColor;
    ctx.fillRect(bx, by, barW * ratio, barH);

    // HP bar border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);

    // HP text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${boss.hp} / ${boss.maxHp}`, CANVAS_WIDTH / 2, by + 13);

    // Phase indicator
    if (boss.phase === 2) {
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('⚡ PHASE 2 ⚡', CANVAS_WIDTH / 2, by + barH + 10);
    }

    ctx.textAlign = 'left';
}
