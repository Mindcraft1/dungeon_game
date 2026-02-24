import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import { PLAYER_COLORS, getColorById, PLAYER_HATS, getHatById, DEFAULT_HAT_ID } from '../cosmetics.js';
import { CLASS_DEFINITIONS, getClassById, renderClassIcon } from '../classes.js';
import * as AchievementStore from '../achievements/achievementStore.js';

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
 * @param {boolean} isClassPicking – showing class picker overlay?
 * @param {number} classCursor – current cursor in class picker
 */
export function renderProfiles(ctx, profiles, activeIndex, cursorIndex, isCreating, newName, isDeleting, isColorPicking, colorCursor, isClassPicking, classCursor, isHatPicking, hatCursor) {
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

        // Hat preview on swatch circle
        const hatDef = getHatById(p.hatId);
        if (hatDef && hatDef.render) {
            ctx.save();
            hatDef.render(ctx, swatchX, swatchY, 8, 0);
            ctx.restore();
        }

        // Class icon (next to color swatch)
        const classIconX = bx + 52;
        const classIconY = swatchY;
        renderClassIcon(ctx, p.classId || 'guardian', classIconX, classIconY, 8);

        // Class name label
        const cls = getClassById(p.classId);
        ctx.fillStyle = cls.color;
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(cls.name, classIconX + 12, classIconY + 3);
        ctx.textAlign = 'center';

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
    if (isCreating && !isClassPicking) {
        _renderCreateOverlay(ctx, newName);
        return; // Don't render hints behind overlay
    }

    // ── Class picker overlay (during profile creation) ──
    if (isCreating && isClassPicking) {
        _renderClassPickerOverlay(ctx, newName, classCursor);
        return;
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

    // ── Hat picker overlay ──
    if (isHatPicking && profiles[cursorIndex]) {
        _renderHatPickerOverlay(ctx, profiles[cursorIndex], hatCursor);
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
    ctx.fillText('W/S = Navigate  ·  ENTER/Click = Select  ·  C = Color  ·  H = Hat  ·  X = Delete  ·  ESC/RMB = Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

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

function _renderClassPickerOverlay(ctx, name, cursor) {
    // Fully opaque backdrop to cover profiles screen
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('CHOOSE YOUR CLASS', CANVAS_WIDTH / 2, 80);

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(`for "${name}"`, CANVAS_WIDTH / 2, 105);

    // ── Class cards ──
    const cardW = 170;
    const cardH = 330;
    const gap = 12;
    const total = CLASS_DEFINITIONS.length;
    const totalW = total * cardW + (total - 1) * gap;
    const startX = (CANVAS_WIDTH - totalW) / 2;
    const cardY = 120;

    for (let i = 0; i < total; i++) {
        const cls = CLASS_DEFINITIONS[i];
        const cx = startX + i * (cardW + gap);
        const selected = i === cursor;

        // Card background
        if (selected) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(cx, cardY, cardW, cardH);
            ctx.strokeStyle = cls.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(cx, cardY, cardW, cardH);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fillRect(cx, cardY, cardW, cardH);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx, cardY, cardW, cardH);
        }

        // Clip card content to card bounds
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cardY, cardW, cardH);
        ctx.clip();

        const midX = cx + cardW / 2;

        // Class icon (player circle with emblem)
        const iconY = cardY + 45;
        const iconR = 24;
        ctx.fillStyle = cls.color;
        ctx.beginPath();
        ctx.arc(midX, iconY, iconR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = selected ? '#fff' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eye dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(midX + iconR * 0.55, iconY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Emblem inside circle
        renderClassIcon(ctx, cls.id, midX, iconY, iconR * 0.35);

        // Class name
        ctx.fillStyle = selected ? cls.color : '#aaa';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(cls.name, midX, iconY + iconR + 26);

        // Description (word-wrapped)
        ctx.fillStyle = selected ? '#ccc' : '#666';
        ctx.font = '11px monospace';
        const descWords = cls.desc.split(' ');
        let descLine = '';
        let descY = iconY + iconR + 46;
        for (const w of descWords) {
            const test = descLine + (descLine ? ' ' : '') + w;
            if (ctx.measureText(test).width > cardW - 16) {
                ctx.fillText(descLine, midX, descY);
                descLine = w;
                descY += 14;
            } else {
                descLine = test;
            }
        }
        if (descLine) ctx.fillText(descLine, midX, descY);

        // ── Stat modifiers ──
        const statsY = iconY + iconR + 84;
        ctx.font = '12px monospace';

        // HP
        const hpLabel = cls.hpMult > 1 ? `+${Math.round((cls.hpMult - 1) * 100)}% HP` : cls.hpMult < 1 ? `${Math.round((cls.hpMult - 1) * 100)}% HP` : '— HP';
        ctx.fillStyle = cls.hpMult > 1 ? '#4caf50' : cls.hpMult < 1 ? '#ef5350' : '#555';
        ctx.fillText(hpLabel, midX, statsY);

        // Damage
        const dmgLabel = cls.damageMult > 1 ? `+${Math.round((cls.damageMult - 1) * 100)}% DMG` : cls.damageMult < 1 ? `${Math.round((cls.damageMult - 1) * 100)}% DMG` : '— DMG';
        ctx.fillStyle = cls.damageMult > 1 ? '#ffa726' : cls.damageMult < 1 ? '#ef5350' : '#555';
        ctx.fillText(dmgLabel, midX, statsY + 18);

        // Speed
        const spdLabel = cls.speedMult > 1 ? `+${Math.round((cls.speedMult - 1) * 100)}% Speed` : cls.speedMult < 1 ? `${Math.round((cls.speedMult - 1) * 100)}% Speed` : '— Speed';
        ctx.fillStyle = cls.speedMult > 1 ? '#4fc3f7' : cls.speedMult < 1 ? '#ef5350' : '#555';
        ctx.fillText(spdLabel, midX, statsY + 36);

        // ── Passive ──
        const passiveY = statsY + 65;
        ctx.fillStyle = selected ? '#ffd700' : '#888';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('PASSIVE', midX, passiveY);

        ctx.fillStyle = selected ? '#ddd' : '#666';
        ctx.font = '10px monospace';

        // Word-wrap passive description
        const words = cls.passive.desc.split(' ');
        let line = '';
        let lineY = passiveY + 16;
        for (const word of words) {
            const test = line + (line ? ' ' : '') + word;
            if (ctx.measureText(test).width > cardW - 20) {
                ctx.fillText(line, midX, lineY);
                line = word;
                lineY += 13;
            } else {
                line = test;
            }
        }
        if (line) ctx.fillText(line, midX, lineY);

        ctx.restore(); // End card clipping
    }

    // ── Selection indicator ──
    const selectedX = startX + cursor * (cardW + gap) + cardW / 2;
    ctx.fillStyle = CLASS_DEFINITIONS[cursor].color;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('▼', selectedX, cardY - 8);

    // ── Hints ──
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('A/D or Arrows = Navigate  ·  ENTER/Click = Confirm  ·  ESC/RMB = Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

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

function _renderHatPickerOverlay(ctx, profile, cursor) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const bw = 460;
    const bh = 540;
    const bx = (CANVAS_WIDTH - bw) / 2;
    const by = (CANVAS_HEIGHT - bh) / 2;

    // Panel background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#ce93d8';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ce93d8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('CHOOSE HAT', CANVAS_WIDTH / 2, by + 32);

    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.fillText(`for "${profile.name}"`, CANVAS_WIDTH / 2, by + 50);

    // ── Hat swatch grid ──
    const cols = 4;
    const swatchSize = 70;
    const gap = 10;
    const rows = Math.ceil(PLAYER_HATS.length / cols);
    const gridW = cols * swatchSize + (cols - 1) * gap;
    const gridX = CANVAS_WIDTH / 2 - gridW / 2;
    const gridY = by + 65;

    const pColor = getColorById(profile.colorId);

    for (let i = 0; i < PLAYER_HATS.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const sx = gridX + col * (swatchSize + gap);
        const sy = gridY + row * (swatchSize + gap);
        const hat = PLAYER_HATS[i];
        const isSelected = i === cursor;
        const isCurrent = hat.id === (profile.hatId || DEFAULT_HAT_ID);
        const unlocked = hat.isUnlocked(profile, AchievementStore);

        // Swatch background
        ctx.fillStyle = isSelected ? 'rgba(206,147,216,0.15)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(sx, sy, swatchSize, swatchSize);

        // Selection highlight border
        if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx - 1, sy - 1, swatchSize + 2, swatchSize + 2);
        }

        // Current hat check
        if (isCurrent && !isSelected) {
            ctx.strokeStyle = '#ce93d8';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, swatchSize, swatchSize);
        }

        ctx.save();
        if (!unlocked) ctx.globalAlpha = 0.3;

        // Draw player circle preview
        const cx = sx + swatchSize / 2;
        const cy = sy + swatchSize / 2 - 8;
        ctx.fillStyle = pColor.body;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = pColor.outline;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eye dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx + 8, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw hat on preview
        if (hat.render) {
            ctx.save();
            hat.render(ctx, cx, cy, 14, 0);
            ctx.restore();
        }

        ctx.restore();

        // Hat name
        ctx.fillStyle = !unlocked ? '#555' : (isSelected ? '#fff' : '#999');
        ctx.font = '9px monospace';
        ctx.fillText(hat.name, cx, sy + swatchSize - 3);

        // Lock icon for locked hats
        if (!unlocked) {
            ctx.fillStyle = '#888';
            ctx.font = '14px monospace';
            ctx.fillText('🔒', cx, cy + 2);
        }
    }

    // ── Info area: selected hat details ──
    const infoY = gridY + rows * (swatchSize + gap) + 10;
    const selectedHat = PLAYER_HATS[cursor] || PLAYER_HATS[0];
    const selectedUnlocked = selectedHat.isUnlocked(profile, AchievementStore);

    // Large preview
    const pvx = CANVAS_WIDTH / 2;
    const pvy = infoY + 10;

    ctx.fillStyle = pColor.body;
    ctx.beginPath();
    ctx.arc(pvx, pvy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pColor.outline;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(pvx + 12, pvy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw hat on large preview
    if (selectedHat.render) {
        ctx.save();
        if (!selectedUnlocked) ctx.globalAlpha = 0.35;
        selectedHat.render(ctx, pvx, pvy, 22, 0);
        ctx.restore();
    }

    // Hat name + unlock info
    ctx.fillStyle = selectedUnlocked ? '#fff' : '#888';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(selectedHat.name, pvx, pvy + 40);

    if (!selectedUnlocked && selectedHat.unlockDesc) {
        ctx.fillStyle = '#ef5350';
        ctx.font = '11px monospace';
        ctx.fillText('🔒 ' + selectedHat.unlockDesc, pvx, pvy + 56);
    } else if (selectedUnlocked && selectedHat.id !== 'none') {
        ctx.fillStyle = '#4caf50';
        ctx.font = '11px monospace';
        ctx.fillText('✓ Unlocked', pvx, pvy + 56);
    }

    // ── Hints ──
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('WASD/Arrows = Navigate  ·  ENTER/Click = Confirm  ·  ESC/RMB = Cancel', CANVAS_WIDTH / 2, by + bh - 16);

    ctx.textAlign = 'left';
}

export { MAX_NAME_LEN };
