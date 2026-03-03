import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import { t, getLang } from '../i18n.js';

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
export function renderSettings(ctx, cursor, sfxMuted, musicEnabled, proceduralRooms, showDamageNumbers = true, mouseAimEnabled = true, fromPause = false) {
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
    ctx.fillText(t('settings.title'), CANVAS_WIDTH / 2, 110);
    ctx.restore();

    // Subtitle
    ctx.fillStyle = '#666';
    ctx.font = '13px monospace';
    ctx.fillText(t('settings.subtitle'), CANVAS_WIDTH / 2, 140);

    const _on = t('on');
    const _off = t('off');
    const langLabel = getLang() === 'de' ? 'DEUTSCH' : 'ENGLISH';

    // ── Settings items ──
    const items = [
        {
            label: t('settings.sfx'),
            value: sfxMuted ? _off : _on,
            valueColor: sfxMuted ? '#e74c3c' : '#4caf50',
            color: '#4fc3f7',
            desc: t('settings.sfx.desc'),
        },
        {
            label: t('settings.music'),
            value: musicEnabled ? _on : _off,
            valueColor: musicEnabled ? '#4caf50' : '#e74c3c',
            color: '#bb86fc',
            desc: t('settings.music.desc'),
        },
        {
            label: t('settings.rooms'),
            value: proceduralRooms ? t('settings.rooms.procedural') : t('settings.rooms.predefined'),
            valueColor: proceduralRooms ? '#ff9800' : '#4caf50',
            color: '#ff9800',
            desc: proceduralRooms
                ? t('settings.rooms.desc.proc')
                : t('settings.rooms.desc.pre'),
        },
        {
            label: t('settings.dmgNumbers'),
            value: showDamageNumbers ? _on : _off,
            valueColor: showDamageNumbers ? '#4caf50' : '#e74c3c',
            color: '#f06292',
            desc: t('settings.dmgNumbers.desc'),
        },
        {
            label: t('settings.mouseAim'),
            value: mouseAimEnabled ? _on : _off,
            valueColor: mouseAimEnabled ? '#4caf50' : '#e74c3c',
            color: '#64ffda',
            desc: t('settings.mouseAim.desc'),
        },
        {
            label: t('settings.language'),
            value: langLabel,
            valueColor: '#4fc3f7',
            color: '#ce93d8',
            desc: t('settings.language.desc'),
        },
        {
            label: t('back'),
            value: '',
            valueColor: '',
            color: '#888',
            desc: fromPause ? t('settings.back.desc.pause') : t('settings.back.desc.menu'),
        },
    ];

    const startY = 185;
    const spacing = 48;

    items.forEach((item, i) => {
        const y = startY + i * spacing;
        const selected = i === cursor;

        // Selection box
        if (selected) {
            const boxW = 400;
            const boxH = 48;
            ctx.fillStyle = 'rgba(79,195,247,0.08)';
            ctx.fillRect(CANVAS_WIDTH / 2 - boxW / 2, y - 24, boxW, boxH);
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_WIDTH / 2 - boxW / 2, y - 24, boxW, boxH);

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

    // ── Key bindings reference (two-column layout) ──
    const keysY = startY + items.length * spacing + 8;

    ctx.fillStyle = '#555';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(t('settings.keys.title'), CANVAS_WIDTH / 2, keysY);

    const bindingsLeft = [
        ['WASD / Arrows', t('settings.keys.move')],
        ['SPACE / LMB', t('settings.keys.attack')],
        ['M / RMB', t('settings.keys.dash')],
        ['N / MMB', t('settings.keys.dagger')],
        ['Q / E', t('settings.keys.abilities')],
        ['B', t('settings.keys.bomb')],
    ];

    const bindingsRight = [
        ['T', t('settings.keys.talents')],
        ['P / ESC', t('settings.keys.pause')],
        ['R', t('settings.keys.reroll')],
        ['G', t('settings.keys.metaMenu')],
        ['1-3', t('settings.keys.quickPick')],
        ['X', t('settings.keys.delete')],
    ];

    ctx.font = '10px monospace';
    const bindStartY = keysY + 14;
    const bindSpacing = 14;

    // Left column
    const leftColCenter = CANVAS_WIDTH / 2 - 190;
    bindingsLeft.forEach(([key, action], i) => {
        const by = bindStartY + i * bindSpacing;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#4fc3f7';
        ctx.fillText(key, leftColCenter + 70, by);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#444';
        ctx.fillText('—', leftColCenter + 82, by);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#aaa';
        ctx.fillText(action, leftColCenter + 94, by);
    });

    // Right column
    const rightColCenter = CANVAS_WIDTH / 2 + 100;
    bindingsRight.forEach(([key, action], i) => {
        const by = bindStartY + i * bindSpacing;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#4fc3f7';
        ctx.fillText(key, rightColCenter + 10, by);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#444';
        ctx.fillText('—', rightColCenter + 22, by);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#aaa';
        ctx.fillText(action, rightColCenter + 34, by);
    });

    // Bottom hint
    ctx.textAlign = 'center';
    ctx.fillStyle = '#444';
    ctx.font = '11px monospace';
    ctx.fillText(t('settings.hint'), CANVAS_WIDTH / 2, CANVAS_HEIGHT - 12);

    ctx.textAlign = 'left';
}
