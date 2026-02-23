import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

/**
 * Draw the settings screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cursor – currently selected option index
 * @param {boolean} sfxMuted – whether SFX are muted
 * @param {boolean} musicEnabled – whether music is enabled
 * @param {boolean} proceduralRooms – whether procedural room generation is enabled
 * @param {boolean} showDamageNumbers – whether floating damage numbers are shown
 * @param {boolean} mouseAimEnabled – whether mouse controls aim direction
 */
export function renderSettings(ctx, cursor, sfxMuted, musicEnabled, proceduralRooms, showDamageNumbers = true, mouseAimEnabled = true) {
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
    const glow = 0.7 + Math.sin(now * 0.003) * 0.3;
    ctx.save();
    ctx.shadowColor = '#e0e0e0';
    ctx.shadowBlur = 15 * glow;
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('SETTINGS', CANVAS_WIDTH / 2, 110);
    ctx.restore();

    // Subtitle
    ctx.fillStyle = '#666';
    ctx.font = '13px monospace';
    ctx.fillText('Configure audio, controls & gameplay', CANVAS_WIDTH / 2, 140);

    // ── Settings items ──
    const items = [
        {
            label: 'SOUND EFFECTS',
            value: sfxMuted ? 'OFF' : 'ON',
            valueColor: sfxMuted ? '#e74c3c' : '#4caf50',
            color: '#4fc3f7',
            desc: 'Toggle game sound effects',
        },
        {
            label: 'MUSIC',
            value: musicEnabled ? 'ON' : 'OFF',
            valueColor: musicEnabled ? '#4caf50' : '#e74c3c',
            color: '#bb86fc',
            desc: 'Toggle background music',
        },
        {
            label: 'ROOMS',
            value: proceduralRooms ? 'PROCEDURAL' : 'PREDEFINED',
            valueColor: proceduralRooms ? '#ff9800' : '#4caf50',
            color: '#ff9800',
            desc: proceduralRooms
                ? 'Rooms are randomly generated each run'
                : 'Rooms use handcrafted layouts',
        },
        {
            label: 'DAMAGE NUMBERS',
            value: showDamageNumbers ? 'ON' : 'OFF',
            valueColor: showDamageNumbers ? '#4caf50' : '#e74c3c',
            color: '#f06292',
            desc: 'Show floating damage numbers on hit',
        },
        {
            label: 'MOUSE AIM',
            value: mouseAimEnabled ? 'ON' : 'OFF',
            valueColor: mouseAimEnabled ? '#4caf50' : '#e74c3c',
            color: '#64ffda',
            desc: 'Aim toward mouse cursor (LMB=Attack, RMB=Dash, MMB=Dagger)',
        },
        {
            label: 'BACK',
            value: '',
            valueColor: '',
            color: '#888',
            desc: 'Return to main menu',
        },
    ];

    const startY = 190;
    const spacing = 52;

    items.forEach((item, i) => {
        const y = startY + i * spacing;
        const selected = i === cursor;

        // Selection box
        if (selected) {
            const boxW = 400;
            const boxH = 54;
            ctx.fillStyle = 'rgba(79,195,247,0.08)';
            ctx.fillRect(CANVAS_WIDTH / 2 - boxW / 2, y - 28, boxW, boxH);
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_WIDTH / 2 - boxW / 2, y - 28, boxW, boxH);

            // Arrow indicator
            ctx.fillStyle = item.color;
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('▸', CANVAS_WIDTH / 2 - 175, y + 2);
            ctx.textAlign = 'center';
        }

        // Label
        ctx.fillStyle = selected ? item.color : '#555';
        ctx.font = 'bold 20px monospace';
        if (item.value) {
            // Label on left, value on right
            ctx.textAlign = 'left';
            ctx.fillText(item.label, CANVAS_WIDTH / 2 - 150, y);
            ctx.textAlign = 'right';
            ctx.fillStyle = selected ? item.valueColor : '#555';
            ctx.font = 'bold 18px monospace';
            ctx.fillText(item.value, CANVAS_WIDTH / 2 + 170, y);
            ctx.textAlign = 'center';
        } else {
            ctx.fillText(item.label, CANVAS_WIDTH / 2, y);
        }

        // Description
        ctx.fillStyle = selected ? '#888' : '#444';
        ctx.font = '11px monospace';
        ctx.fillText(item.desc, CANVAS_WIDTH / 2, y + 18);
    });

    // ── Key bindings reference ──
    const keysY = startY + items.length * spacing + 12;

    ctx.fillStyle = '#555';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('─── KEY BINDINGS ───', CANVAS_WIDTH / 2, keysY);

    const bindings = [
        ['WASD / Arrows', 'Move'],
        ['SPACE / LMB', 'Melee Attack'],
        ['M / RMB', 'Dash / Dodge Roll'],
        ['N / MMB', 'Ranged Attack (Dagger)'],
        ['Q', 'Ability Slot 1'],
        ['E', 'Ability Slot 2'],
        ['B', 'Use Bomb'],
        ['P / ESC', 'Pause'],
    ];

    ctx.font = '11px monospace';
    const bindStartY = keysY + 16;
    const bindSpacing = 15;

    bindings.forEach(([key, action], i) => {
        const by = bindStartY + i * bindSpacing;

        // Key
        ctx.textAlign = 'right';
        ctx.fillStyle = '#4fc3f7';
        ctx.fillText(key, CANVAS_WIDTH / 2 - 20, by);

        // Separator
        ctx.textAlign = 'center';
        ctx.fillStyle = '#444';
        ctx.fillText('—', CANVAS_WIDTH / 2, by);

        // Action
        ctx.textAlign = 'left';
        ctx.fillStyle = '#aaa';
        ctx.fillText(action, CANVAS_WIDTH / 2 + 20, by);
    });

    // Bottom hint
    ctx.textAlign = 'center';
    ctx.fillStyle = '#444';
    ctx.font = '12px monospace';
    ctx.fillText('W/S to navigate  ·  ENTER or Click to toggle  ·  ESC to go back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 14);

    ctx.textAlign = 'left';
}
