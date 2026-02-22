import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

/**
 * Render the training configuration screen.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cursor        – which row is selected (0=room, 1=enemies, 2=count, 3=damage, 4=drops, 5=START)
 * @param {number} roomIndex     – -1 = training room, 0..N = game rooms
 * @param {string} roomName      – display name
 * @param {string} enemyLabel    – e.g. "All", "Basic", "Shooter"
 * @param {number} enemyCount    – 1..10
 * @param {boolean} damageOn     – whether damage is enabled
 * @param {boolean} dropsOn      – whether item drops are enabled
 */
export function renderTrainingConfig(ctx, cursor, roomIndex, roomName, enemyLabel, enemyCount, damageOn, dropsOn) {
    // ── Background ──
    ctx.fillStyle = 'rgba(10, 10, 18, 0.97)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    const cx = CANVAS_WIDTH / 2;

    // ── Title ──
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('TRAINING CONFIG', cx, 90);

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('Choose your training setup', cx, 112);

    // ── Options ──
    const options = [
        { label: 'ROOM',    value: roomName,                       color: '#4fc3f7' },
        { label: 'ENEMIES', value: enemyLabel,                     color: '#e74c3c' },
        { label: 'COUNT',   value: `${enemyCount}`,                color: '#2ecc71' },
        { label: 'DAMAGE',  value: damageOn ? 'ON' : 'OFF',        color: damageOn ? '#f44336' : '#4caf50' },
        { label: 'DROPS',   value: dropsOn ? 'ON' : 'OFF',         color: dropsOn ? '#ffd700' : '#888' },
    ];

    const startY = 140;
    const boxW = 460;
    const boxH = 48;

    // Custom y positions to make room for enemy previews between rows 1 and 2
    const rowYs = [startY, startY + 62, startY + 158, startY + 220, startY + 282];

    options.forEach((opt, i) => {
        const y = rowYs[i];
        const selected = cursor === i;

        // Row background
        if (selected) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.06)';
            ctx.fillRect(cx - boxW / 2, y - 4, boxW, boxH);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cx - boxW / 2, y - 4, boxW, boxH);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fillRect(cx - boxW / 2, y - 4, boxW, boxH);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - boxW / 2, y - 4, boxW, boxH);
        }

        // Label (left side)
        ctx.textAlign = 'left';
        ctx.fillStyle = selected ? '#ffd700' : '#666';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(opt.label, cx - boxW / 2 + 16, y + 18);

        // Value (center)
        ctx.textAlign = 'center';
        ctx.fillStyle = selected ? opt.color : '#999';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(opt.value, cx + 30, y + 22);

        // Arrows if selected
        if (selected) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('◂', cx - boxW / 2 + boxW - 36, y + 24);
            ctx.textAlign = 'left';
            ctx.fillText('▸', cx + boxW / 2 - 52, y + 24);
        }
    });

    // ── START button ──
    const btnY = rowYs[4] + boxH + 16;
    const btnSelected = cursor === 5;
    const btnW = 200;
    const btnH = 44;

    if (btnSelected) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.fillRect(cx - btnW / 2, btnY, btnW, btnH);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - btnW / 2, btnY, btnW, btnH);
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(cx - btnW / 2, btnY, btnW, btnH);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - btnW / 2, btnY, btnW, btnH);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = btnSelected ? '#ffd700' : '#666';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('START', cx, btnY + 30);

    // ── Enemy type preview icons (between ENEMIES and COUNT rows) ──
    _renderEnemyPreview(ctx, cx, rowYs[1] + boxH + 6, enemyLabel);

    // ── Hints ──
    ctx.textAlign = 'center';
    ctx.fillStyle = '#444';
    ctx.font = '11px monospace';
    ctx.fillText('W/S = Navigate   A/D = Change   ENTER = Start   ESC = Back', cx, CANVAS_HEIGHT - 30);
    ctx.textAlign = 'left';
}

function _renderEnemyPreview(ctx, cx, _y, enemyLabel) {
    // Small preview shapes showing what enemy types will spawn
    const previews = [];
    const label = enemyLabel.toLowerCase();
    if (label === 'all' || label === 'basic') {
        previews.push({ shape: 'circle', color: '#e74c3c', name: 'Basic' });
    }
    if (label === 'all' || label === 'shooter') {
        previews.push({ shape: 'diamond', color: '#9b59b6', name: 'Shooter' });
    }
    if (label === 'all' || label === 'dasher') {
        previews.push({ shape: 'triangle', color: '#2ecc71', name: 'Dasher' });
    }
    if (label === 'all' || label === 'tank') {
        previews.push({ shape: 'hexagon', color: '#e67e22', name: 'Tank' });
    }

    const spacing = 80;
    const totalW = (previews.length - 1) * spacing;
    const startX = cx - totalW / 2;
    const y = _y + 8;

    previews.forEach((p, i) => {
        const x = startX + i * spacing;
        const r = 8;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        switch (p.shape) {
            case 'circle':
                ctx.arc(x, y, r, 0, Math.PI * 2);
                break;
            case 'diamond':
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r, y);
                ctx.lineTo(x, y + r);
                ctx.lineTo(x - r, y);
                break;
            case 'triangle':
                ctx.moveTo(x + r, y);
                ctx.lineTo(x - r * 0.7, y - r * 0.8);
                ctx.lineTo(x - r * 0.7, y + r * 0.8);
                break;
            case 'hexagon':
                for (let j = 0; j < 6; j++) {
                    const a = (Math.PI / 3) * j - Math.PI / 6;
                    const px = x + r * Math.cos(a);
                    const py = y + r * Math.sin(a);
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                break;
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#666';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, x, y + 18);
    });
}
