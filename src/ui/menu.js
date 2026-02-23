import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

/**
 * Draw the main menu screen.
 * @param {number} selectedIndex – 0 = Play, 1 = Meta Progress, 2 = Shop, 3 = Achievements, 4 = Characters, 5 = Training, 6 = Settings
 * @param {string|null} profileName – name of active character
 * @param {number} coreShards – available core shards
 * @param {string|null} selectedBooster – selected meta booster name for display
 */
export function renderMenu(ctx, selectedIndex, highscore = 0, profileName = null, coreShards = 0, selectedBooster = null) {
    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Decorative grid
    ctx.strokeStyle = 'rgba(79,195,247,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    ctx.textAlign = 'center';

    // Title
    const now = Date.now();
    const glow = 0.7 + Math.sin(now * 0.002) * 0.3;

    ctx.save();
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 20 * glow;
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('DUNGEON ROOMS', CANVAS_WIDTH / 2, 180);
    ctx.restore();

    // Subtitle
    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('Clear every room. Level up. Survive.', CANVAS_WIDTH / 2, 220);

    // Active character + Highscore line
    if (profileName) {
        ctx.fillStyle = '#81c784';
        ctx.font = 'bold 13px monospace';
        const hsText = highscore > 0 ? `  ·  ★ Best: Stage ${highscore}` : '';
        ctx.fillText(`♦ ${profileName}${hsText}`, CANVAS_WIDTH / 2, 250);
    } else if (highscore > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`★ Highscore: Stage ${highscore}`, CANVAS_WIDTH / 2, 250);
    }

    // Menu options
    const boosterHint = selectedBooster ? `  ·  ✓ ${selectedBooster}` : '';
    const options = [
        { label: 'START GAME', desc: 'Fight through dungeon rooms', color: '#4fc3f7' },
        { label: 'META PROGRESS', desc: `Perks, Relics & Stats  ·  ◆ ${coreShards}`, color: '#bb86fc' },
        { label: 'SHOP', desc: `Boosters for your next run${boosterHint}`, color: '#ffd700' },
        { label: 'ACHIEVEMENTS', desc: 'View your trophies & milestones', color: '#ffab40' },
        { label: 'CHARACTERS', desc: 'Create & switch player profiles', color: '#81c784' },
        { label: 'TRAINING', desc: 'Practice without taking damage', color: '#ffd700' },
        { label: 'SETTINGS', desc: 'Audio, controls & preferences', color: '#e0e0e0' },
    ];

    const startY = 270;
    const spacing = 43;

    options.forEach((opt, i) => {
        const y = startY + i * spacing;
        const selected = i === selectedIndex;

        // Selection box
        if (selected) {
            const boxW = 340;
            const boxH = 52;
            ctx.fillStyle = 'rgba(79,195,247,0.08)';
            ctx.fillRect(CANVAS_WIDTH / 2 - boxW / 2, y - 22, boxW, boxH);
            ctx.strokeStyle = opt.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_WIDTH / 2 - boxW / 2, y - 22, boxW, boxH);

            // Arrow indicator
            ctx.fillStyle = opt.color;
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('▸', CANVAS_WIDTH / 2 - 130, y + 2);
            ctx.textAlign = 'center';
        }

        // Label
        ctx.fillStyle = selected ? opt.color : '#555';
        ctx.font = `bold 18px monospace`;
        ctx.fillText(opt.label, CANVAS_WIDTH / 2, y);

        // Description
        ctx.fillStyle = selected ? '#888' : '#444';
        ctx.font = '11px monospace';
        ctx.fillText(opt.desc, CANVAS_WIDTH / 2, y + 18);
    });

    // Controls hint
    ctx.fillStyle = '#444';
    ctx.font = '12px monospace';
    ctx.fillText('W/S or ↑/↓ to select  ·  ENTER or Click to confirm', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 25);

    ctx.textAlign = 'left';
}
