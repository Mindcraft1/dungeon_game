import { CANVAS_WIDTH, CANVAS_HEIGHT, UPGRADE_HP, UPGRADE_SPEED, UPGRADE_DAMAGE } from '../constants.js';

/**
 * Draw the Level-Up overlay (game is paused while visible).
 * @param {Array} [choices] – dynamic choices array from game.js, or null for default
 */
export function renderLevelUpOverlay(ctx, player, selectedIndex = 0, choices = null) {
    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const optCount = choices ? choices.length : 3;
    const bw = 380;
    const bh = 220 + (optCount > 3 ? 40 : 0);
    const bx = (CANVAS_WIDTH - bw) / 2;
    const by = (CANVAS_HEIGHT - bh) / 2;

    // Box
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('LEVEL UP!', CANVAS_WIDTH / 2, by + 40);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText(`Level ${player.level} → ${player.level + 1}`, CANVAS_WIDTH / 2, by + 65);

    // Options — use dynamic choices if provided, else base options
    const opts = choices
        ? choices.map((c, i) => ({ key: `${i + 1}`, text: c.label, color: c.color }))
        : [
            { key: '1', text: `+${UPGRADE_HP} Max HP  (heal +${Math.floor(UPGRADE_HP * 0.6)})`, color: '#4caf50' },
            { key: '2', text: `+${UPGRADE_SPEED} Speed`, color: '#2196f3' },
            { key: '3', text: `+${UPGRADE_DAMAGE} Damage`, color: '#f44336' },
        ];

    const startY = by + 100;
    const rowH = 38;
    opts.forEach((o, i) => {
        const oy = startY + i * rowH;
        const selected = i === selectedIndex;

        // Selection highlight
        if (selected) {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(bx + 10, oy - 16, bw - 20, rowH - 4);
            ctx.strokeStyle = o.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 10, oy - 16, bw - 20, rowH - 4);

            ctx.fillStyle = o.color;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('▸', CANVAS_WIDTH / 2 - 130, oy + 4);
            ctx.textAlign = 'center';
        }

        ctx.fillStyle = selected ? o.color : '#666';
        ctx.font = selected ? 'bold 16px monospace' : '15px monospace';
        ctx.fillText(`[${o.key}]  ${o.text}`, CANVAS_WIDTH / 2, oy + 2);
    });

    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('W/S to select  ·  SPACE / ENTER / 1-3 to confirm', CANVAS_WIDTH / 2, by + bh - 16);
    ctx.textAlign = 'left';
}

/**
 * Draw the Game-Over overlay.
 * @param {object|null} runRewards - meta progression run rewards summary
 */
export function renderGameOverOverlay(ctx, stage, level, runRewards = null) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText(`Stage ${stage}  ·  Level ${level}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 25);

    // Run summary (meta rewards)
    if (runRewards) {
        let summaryY = CANVAS_HEIGHT / 2 + 5;
        ctx.font = '12px monospace';

        if (runRewards.bossesDefeatedThisRun > 0) {
            ctx.fillStyle = '#ff5722';
            ctx.fillText(`Bosses Defeated: ${runRewards.bossesDefeatedThisRun}`, CANVAS_WIDTH / 2, summaryY);
            summaryY += 18;
        }

        if (runRewards.coreShardsGainedThisRun > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`◆ Core Shards Gained: +${runRewards.coreShardsGainedThisRun}`, CANVAS_WIDTH / 2, summaryY);
            summaryY += 18;
        }

        if (runRewards.relicUnlockedThisRun) {
            ctx.fillStyle = '#bb86fc';
            ctx.fillText(`Relic Unlocked!`, CANVAS_WIDTH / 2, summaryY);
            summaryY += 18;
        }
    }

    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('Press ENTER or SPACE for menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);

    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('G = Meta Progress', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 92);

    ctx.textAlign = 'left';
}

/**
 * Draw the Boss Victory overlay with permanent reward selection.
 */
export function renderBossVictoryOverlay(ctx, bossName, bossColor, selectedIndex, rewardHP, rewardDamage, rewardSpeed) {
    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const bw = 380;
    const bh = 320;
    const bx = (CANVAS_WIDTH - bw) / 2;
    const by = (CANVAS_HEIGHT - bh) / 2;

    // Box
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);

    // Gold shimmer on border
    const shimmer = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = shimmer * 0.3;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 6;
    ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.restore();

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('BOSS DEFEATED!', CANVAS_WIDTH / 2, by + 42);

    // Boss name
    ctx.fillStyle = bossColor;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(bossName, CANVAS_WIDTH / 2, by + 68);

    // Subtitle
    ctx.fillStyle = '#4caf50';
    ctx.font = '12px monospace';
    ctx.fillText('✦ Full Heal + Choose Permanent Reward ✦', CANVAS_WIDTH / 2, by + 94);

    // Reward options
    const opts = [
        { key: '1', text: `+${rewardHP} Max HP  (permanent)`, color: '#4caf50' },
        { key: '2', text: `+${rewardDamage} Damage  (permanent)`, color: '#f44336' },
        { key: '3', text: `+${rewardSpeed} Speed  (permanent)`, color: '#2196f3' },
    ];
    const startY = by + 132;
    const rowH = 46;
    opts.forEach((o, i) => {
        const oy = startY + i * rowH;
        const selected = i === selectedIndex;

        if (selected) {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(bx + 14, oy - 18, bw - 28, rowH - 6);
            ctx.strokeStyle = o.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx + 14, oy - 18, bw - 28, rowH - 6);

            ctx.fillStyle = o.color;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('▸', CANVAS_WIDTH / 2 - 155, oy + 4);
            ctx.textAlign = 'center';
        }

        ctx.fillStyle = selected ? o.color : '#666';
        ctx.font = selected ? 'bold 16px monospace' : '15px monospace';
        ctx.fillText(`[${o.key}]  ${o.text}`, CANVAS_WIDTH / 2, oy + 2);
    });

    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('W/S to select  ·  SPACE / ENTER / 1-3 to confirm', CANVAS_WIDTH / 2, by + bh - 18);
    ctx.textAlign = 'left';
}
