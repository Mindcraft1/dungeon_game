import { CANVAS_WIDTH, CANVAS_HEIGHT, UPGRADE_HP, UPGRADE_SPEED, UPGRADE_DAMAGE } from '../constants.js';

/**
 * Draw the Level-Up overlay (game is paused while visible).
 */
export function renderLevelUpOverlay(ctx, player, selectedIndex = 0) {
    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const bw = 340;
    const bh = 260;
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

    // Options
    const opts = [
        { key: '1', text: `+${UPGRADE_HP} Max HP  (heal +${Math.floor(UPGRADE_HP * 0.6)})`, color: '#4caf50' },
        { key: '2', text: `+${UPGRADE_SPEED} Speed`, color: '#2196f3' },
        { key: '3', text: `+${UPGRADE_DAMAGE} Damage`, color: '#f44336' },
    ];
    const startY = by + 100;
    const rowH = 40;
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
 */
export function renderGameOverOverlay(ctx, stage, level) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText(`Stage ${stage}  ·  Level ${level}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 5);

    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('Press ENTER or SPACE for menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);

    ctx.textAlign = 'left';
}
