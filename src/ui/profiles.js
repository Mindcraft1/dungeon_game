import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import { PLAYER_COLORS, getColorById } from '../cosmetics.js';

const MAX_PROFILES = 6;
const MAX_NAME_LEN = 12;

/**
 * Render the character/profiles screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{name:string, highscore:number, colorId?:string}>} profiles
 * @param {number} activeIndex – currently active profile
 * @param {number} cursorIndex – current UI cursor position (0..profiles.length = last is \"+New\")
 * @param {boolean} isCreating – typing a new name?
 * @param {string} newName – name being typed
 * @param {boolean} isDeleting – showing delete confirmation?
 * @param {boolean} isColorPicking – showing color picker overlay?
 * @param {number} colorCursor – current cursor in color picker grid
 */
export function renderProfiles(ctx, profiles, activeIndex, cursorIndex, isCreating, newName, isDeleting, isColorPicking, colorCursor) {
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
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('CHARACTERS', CANVAS_WIDTH / 2, 70);

    ctx.fillStyle = '#555';
    ctx.font = '12px monospace';
    ctx.fillText('Select who is playing', CANVAS_WIDTH / 2, 95);

    // ── Profile list ──
    const startY = 140;
    const rowH = 52;
    const boxW = 380;

    profiles.forEach((p, i) => {
        const y = startY + i * rowH;
        const selected = i === cursorIndex && !isCreating;
        const isActive = i === activeIndex;

        const bx = CANVAS_WIDTH / 2 - boxW / 2;

        // Row background
        if (selected) {
            ctx.fillStyle = 'rgba(79,195,247,0.1)';
            ctx.fillRect(bx, y, boxW, rowH - 6);
            ctx.strokeStyle = '#4fc3f7';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, y, boxW, rowH - 6);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fillRect(bx, y, boxW, rowH - 6);
        }

        // Active badge
        if (isActive) {
            ctx.fillStyle = '#27ae60';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('● ACTIVE', bx + 12, y + 16);
            ctx.textAlign = 'center';
        }

        // Color swatch (player circle preview)
        const pColor = getColorById(p.colorId);
        const swatchX = bx + 28;
        const swatchY = y + (isActive ? 30 : 24);
        ctx.fillStyle = pColor.body;
        ctx.beginPath();
        ctx.arc(swatchX, swatchY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = pColor.outline;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Name (shifted right to make room for swatch)
        ctx.fillStyle = selected ? '#fff' : '#aaa';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(p.name, CANVAS_WIDTH / 2 + 10, y + (isActive ? 32 : 24));

        // Highscore
        const hs = p.highscore > 0 ? `★ Stage ${p.highscore}` : 'No runs yet';
        ctx.fillStyle = p.highscore > 0 ? '#ffd700' : '#555';
        ctx.font = '11px monospace';
        ctx.fillText(hs, CANVAS_WIDTH / 2, y + (isActive ? 44 : 38));
    });

    // ── "+ NEW CHARACTER" row ──
    if (profiles.length < MAX_PROFILES) {
        const newIdx = profiles.length;
        const y = startY + newIdx * rowH;
        const selected = cursorIndex === newIdx && !isCreating;
        const bx = CANVAS_WIDTH / 2 - boxW / 2;

        if (selected) {
            ctx.fillStyle = 'rgba(255,215,0,0.08)';
            ctx.fillRect(bx, y, boxW, rowH - 6);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, y, boxW, rowH - 6);
        }

        ctx.fillStyle = selected ? '#ffd700' : '#555';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('+ NEW CHARACTER', CANVAS_WIDTH / 2, y + 28);
    }

    // ── Name creation overlay ──
    if (isCreating) {
        _renderCreateOverlay(ctx, newName);
        return; // Don't render hints behind overlay
    }

    // ── Delete confirmation overlay ──
    if (isDeleting && profiles[cursorIndex]) {
        _renderDeleteOverlay(ctx, profiles[cursorIndex].name);
        return;
    }

    // ── Color picker overlay ──
    if (isColorPicking && profiles[cursorIndex]) {
        _renderColorPickerOverlay(ctx, profiles[cursorIndex], colorCursor);
        return;
    }

    // ── Arrow indicator ──
    if (!isCreating) {
        const cy = startY + cursorIndex * rowH + 22;
        const bx = CANVAS_WIDTH / 2 - boxW / 2;
        ctx.fillStyle = '#4fc3f7';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('▸', bx - 6, cy);
        ctx.textAlign = 'center';
    }

    // ── Controls hint ──
    ctx.fillStyle = '#444';
    ctx.font = '11px monospace';
    ctx.fillText('W/S = Navigate  ·  ENTER/Click = Select  ·  C = Color  ·  X = Delete  ·  ESC/RMB = Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

    ctx.textAlign = 'left';
}

function _renderCreateOverlay(ctx, name) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const bw = 360;
    const bh = 160;
    const bx = (CANVAS_WIDTH - bw) / 2;
    const by = (CANVAS_HEIGHT - bh) / 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('NEW CHARACTER', CANVAS_WIDTH / 2, by + 35);

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('Type a name:', CANVAS_WIDTH / 2, by + 60);

    // Name field
    const fieldW = 240;
    const fieldH = 32;
    const fx = CANVAS_WIDTH / 2 - fieldW / 2;
    const fy = by + 75;

    ctx.fillStyle = '#111';
    ctx.fillRect(fx, fy, fieldW, fieldH);
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx, fy, fieldW, fieldH);

    // Typed text + cursor blink
    const cursor = Math.floor(Date.now() / 500) % 2 === 0 ? '|' : '';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(name + cursor, CANVAS_WIDTH / 2, fy + 22);

    // Length indicator
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.fillText(`${name.length}/${MAX_NAME_LEN}`, CANVAS_WIDTH / 2 + fieldW / 2 - 20, fy + fieldH + 14);

    // Hints
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('ENTER = Confirm  ·  ESC/RMB = Cancel', CANVAS_WIDTH / 2, by + bh - 16);

    ctx.textAlign = 'left';
}

function _renderDeleteOverlay(ctx, name) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const bw = 380;
    const bh = 145;
    const bx = (CANVAS_WIDTH - bw) / 2;
    const by = (CANVAS_HEIGHT - bh) / 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('DELETE CHARACTER?', CANVAS_WIDTH / 2, by + 35);

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText(`"${name}"`, CANVAS_WIDTH / 2, by + 58);

    ctx.fillStyle = '#e74c3c';
    ctx.font = '11px monospace';
    ctx.fillText('All progress will be permanently lost!', CANVAS_WIDTH / 2, by + 80);

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('ENTER/Click = Delete  ·  ESC/RMB = Cancel', CANVAS_WIDTH / 2, by + bh - 18);

    ctx.textAlign = 'left';
}

function _renderColorPickerOverlay(ctx, profile, cursor) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const bw = 420;
    const bh = 340;
    const bx = (CANVAS_WIDTH - bw) / 2;
    const by = (CANVAS_HEIGHT - bh) / 2;

    // Panel background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('CHOOSE COLOR', CANVAS_WIDTH / 2, by + 32);

    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.fillText(`for "${profile.name}"`, CANVAS_WIDTH / 2, by + 50);

    // ── Color swatch grid ──
    const cols = 4;
    const swatchSize = 50;
    const gap = 12;
    const gridW = cols * swatchSize + (cols - 1) * gap;
    const gridX = CANVAS_WIDTH / 2 - gridW / 2;
    const gridY = by + 70;

    for (let i = 0; i < PLAYER_COLORS.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const sx = gridX + col * (swatchSize + gap);
        const sy = gridY + row * (swatchSize + gap);
        const c = PLAYER_COLORS[i];
        const isSelected = i === cursor;
        const isCurrent = c.id === (profile.colorId || 'cyan');

        // Swatch background
        ctx.fillStyle = isSelected ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(sx, sy, swatchSize, swatchSize);

        // Selection highlight border
        if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx - 1, sy - 1, swatchSize + 2, swatchSize + 2);
        }

        // Current color check mark
        if (isCurrent && !isSelected) {
            ctx.strokeStyle = '#4fc3f7';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, swatchSize, swatchSize);
        }

        // Draw player circle preview
        const cx = sx + swatchSize / 2;
        const cy = sy + swatchSize / 2 - 4;
        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c.outline;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eye dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx + 8, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Color name
        ctx.fillStyle = isSelected ? '#fff' : '#777';
        ctx.font = '9px monospace';
        ctx.fillText(c.name, cx, sy + swatchSize - 3);
    }

    // ── Large preview ──
    const previewColor = PLAYER_COLORS[cursor] || PLAYER_COLORS[0];
    const previewY = gridY + Math.ceil(PLAYER_COLORS.length / cols) * (swatchSize + gap) + 15;

    // Preview circle
    const pvx = CANVAS_WIDTH / 2;
    const pvy = previewY + 5;
    ctx.fillStyle = previewColor.body;
    ctx.beginPath();
    ctx.arc(pvx, pvy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = previewColor.outline;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(pvx + 12, pvy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Preview name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(previewColor.name, pvx, pvy + 38);

    // ── Hints ──
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('WASD/Arrows = Navigate  ·  ENTER/Click = Confirm  ·  ESC/RMB = Cancel', CANVAS_WIDTH / 2, by + bh - 16);

    ctx.textAlign = 'left';
}

export { MAX_NAME_LEN };
