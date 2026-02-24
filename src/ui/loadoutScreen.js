// ── UI: Loadout Selection Screen ────────────────────────────
// Pre-run screen where the player chooses which abilities
// and passives to bring into the dungeon.
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import { ABILITY_DEFINITIONS } from '../combat/abilities.js';
import { PROC_DEFINITIONS } from '../combat/procs.js';
import {
    ABILITY_ORDER, PROC_ORDER,
    isAbilityUnlocked, isProcUnlocked,
} from '../combat/combatUnlocks.js';
import { getUnlockSummary } from '../unlocks/unlockMap.js';
import { WEAPON_ORDER, WEAPON_DEFINITIONS, isWeaponUnlocked } from '../weapons.js';

/**
 * Render the loadout selection screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number}   cursor             – 0..(ABILITY_ORDER.length + PROC_ORDER.length) inclusive
 * @param {string[]} selectedAbilities  – selected ability IDs (max 2, ordered Q/E)
 * @param {string[]} selectedProcs      – selected proc IDs (max 2, ordered 1/2)
 * @param {object}   meta               – full metaState (has .unlockedAbilities, .unlockedProcs, .stats)
 * @param {number}   rejectFlash        – ms remaining for "slot full" flash (0 = off)
 * @param {string}   selectedWeaponId   – currently selected weapon ID
 * @param {number}   profileHighscore   – active profile highscore (for unlock checks)
 */
export function renderLoadoutScreen(ctx, cursor, selectedAbilities, selectedProcs, meta, rejectFlash, selectedWeaponId, profileHighscore) {
    // ── Background ──
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Decorative grid
    ctx.strokeStyle = 'rgba(255,152,0,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    ctx.textAlign = 'center';

    // ── Title ──
    const now = Date.now();
    const glow = 0.7 + Math.sin(now * 0.003) * 0.3;
    ctx.save();
    ctx.shadowColor = '#ff9800';
    ctx.shadowBlur = 15 * glow;
    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('⚔  LOADOUT  ⚔', CANVAS_WIDTH / 2, 38);
    ctx.restore();

    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.fillText('Choose abilities & passives for your run', CANVAS_WIDTH / 2, 56);

    // ── Current loadout summary strip ──
    _renderSummaryStrip(ctx, selectedAbilities, selectedProcs, selectedWeaponId);

    // ── WEAPON section ──
    _renderWeaponSelector(ctx, selectedWeaponId, profileHighscore || 0);

    // ── ABILITIES section ──
    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('── ACTIVE ABILITIES ──  (max 2)', CANVAS_WIDTH / 2, 156);

    const abilityStartY = 174;
    const itemSpacing = 34;

    for (let i = 0; i < ABILITY_ORDER.length; i++) {
        const id = ABILITY_ORDER[i];
        const def = ABILITY_DEFINITIONS[id];
        const unlocked = isAbilityUnlocked(id, meta);
        const selected = selectedAbilities.includes(id);
        const isCursor = cursor === i;
        const y = abilityStartY + i * itemSpacing;

        _renderRow(ctx, def, unlocked, selected, isCursor, y, meta,
                   'ability', selectedAbilities.indexOf(id), rejectFlash);
    }

    // ── PASSIVES section ──
    const procHeaderY = abilityStartY + ABILITY_ORDER.length * itemSpacing + 10;
    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('── PASSIVE EFFECTS ──  (max 2)', CANVAS_WIDTH / 2, procHeaderY);

    const procStartY = procHeaderY + 22;

    for (let i = 0; i < PROC_ORDER.length; i++) {
        const id = PROC_ORDER[i];
        const def = PROC_DEFINITIONS[id];
        const unlocked = isProcUnlocked(id, meta);
        const selected = selectedProcs.includes(id);
        const isCursor = cursor === ABILITY_ORDER.length + i;
        const y = procStartY + i * itemSpacing;

        _renderRow(ctx, def, unlocked, selected, isCursor, y, meta,
                   'proc', selectedProcs.indexOf(id), rejectFlash);
    }

    // ── START RUN button ──
    const startIdx = ABILITY_ORDER.length + PROC_ORDER.length;
    const isStartCursor = cursor === startIdx;
    const startY = procStartY + PROC_ORDER.length * itemSpacing + 18;
    const canStart = selectedAbilities.length >= 1;

    // ── Unlock progress hint ──
    const summary = getUnlockSummary();
    const hint = `Unlocked: ${summary.abilities.unlocked}/${summary.abilities.total} abilities · ${summary.procs.unlocked}/${summary.procs.total} procs · ${summary.nodes.unlocked}/${summary.nodes.total} nodes`;
    if (hint) {
        ctx.fillStyle = '#555';
        ctx.font = '11px monospace';
        ctx.fillText(hint, CANVAS_WIDTH / 2, startY - 34);
    }

    if (isStartCursor) {
        const bw = 260, bh = 44;
        ctx.fillStyle = canStart ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.08)';
        ctx.fillRect(CANVAS_WIDTH / 2 - bw / 2, startY - 22, bw, bh);
        ctx.strokeStyle = canStart ? '#4caf50' : '#ef5350';
        ctx.lineWidth = 2;
        ctx.strokeRect(CANVAS_WIDTH / 2 - bw / 2, startY - 22, bw, bh);
    }

    ctx.fillStyle = isStartCursor ? (canStart ? '#4caf50' : '#ef5350') : '#555';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▶  START RUN', CANVAS_WIDTH / 2, startY + 6);

    if (!canStart) {
        ctx.fillStyle = '#ef5350';
        ctx.font = '11px monospace';
        ctx.fillText('Select at least 1 ability', CANVAS_WIDTH / 2, startY + 24);
    }

    // ── Reject flash overlay ──
    if (rejectFlash > 0) {
        const alpha = Math.min(0.15, rejectFlash / 300 * 0.15);
        ctx.fillStyle = `rgba(244,67,54,${alpha})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // ── Controls ──
    ctx.fillStyle = '#444';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('W/S Navigate  ·  A/D Weapon  ·  Click/SPACE Select  ·  ENTER Start  ·  ESC/RMB Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);

    ctx.textAlign = 'left';
}

// ── Internal helpers ──────────────────────────────────────

function _renderSummaryStrip(ctx, abilities, procs, weaponId) {
    const y = 72;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';

    // Build summary
    const parts = [];

    // Weapon
    const wep = WEAPON_DEFINITIONS[weaponId] || WEAPON_DEFINITIONS.sword;
    parts.push({ text: `${wep.icon} ${wep.name}`, color: wep.color });

    const slotLabels = ['Q', 'E'];
    for (let i = 0; i < 2; i++) {
        const id = abilities[i];
        if (id) {
            const def = ABILITY_DEFINITIONS[id];
            parts.push({ text: `[${slotLabels[i]}] ${def.icon} ${def.name}`, color: def.color });
        } else {
            parts.push({ text: `[${slotLabels[i]}] —`, color: '#444' });
        }
    }

    const procLabels = ['1', '2'];
    for (let i = 0; i < 2; i++) {
        const id = procs[i];
        if (id) {
            const def = PROC_DEFINITIONS[id];
            parts.push({ text: `[${procLabels[i]}] ${def.icon} ${def.name}`, color: def.color });
        } else {
            parts.push({ text: `[${procLabels[i]}] —`, color: '#444' });
        }
    }

    // Draw centered strip
    const totalW = parts.reduce((w, p) => w + ctx.measureText(p.text).width + 18, 0);
    let x = CANVAS_WIDTH / 2 - totalW / 2;
    ctx.textAlign = 'left';
    for (const p of parts) {
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, x, y);
        x += ctx.measureText(p.text).width + 18;
    }
    ctx.textAlign = 'center';
}

/** Render the weapon selector strip between summary and abilities. */
function _renderWeaponSelector(ctx, selectedWeaponId, highscore) {
    const y = 106;
    const centerX = CANVAS_WIDTH / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('── WEAPON ──  (A/D to change)', centerX, y - 14);

    // Draw weapon cards side by side
    const cardW = 160;
    const cardH = 34;
    const gap = 12;
    const totalW = WEAPON_ORDER.length * cardW + (WEAPON_ORDER.length - 1) * gap;
    let startX = centerX - totalW / 2;

    for (let i = 0; i < WEAPON_ORDER.length; i++) {
        const id = WEAPON_ORDER[i];
        const def = WEAPON_DEFINITIONS[id];
        const unlocked = isWeaponUnlocked(id, highscore);
        const selected = id === selectedWeaponId;
        const cx = startX + i * (cardW + gap);

        // Card background
        if (selected) {
            ctx.fillStyle = 'rgba(255,152,0,0.10)';
            ctx.fillRect(cx, y - 4, cardW, cardH);
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(cx, y - 4, cardW, cardH);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fillRect(cx, y - 4, cardW, cardH);
            ctx.strokeStyle = unlocked ? '#333' : '#222';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx, y - 4, cardW, cardH);
        }

        const midX = cx + cardW / 2;

        if (unlocked) {
            // Icon + Name
            ctx.fillStyle = selected ? def.color : '#888';
            ctx.font = `${selected ? 'bold ' : ''}13px monospace`;
            ctx.fillText(`${def.icon} ${def.name}`, midX, y + 12);

            // Stat hint — compact ▲/▼ format so it fits in card
            ctx.fillStyle = selected ? '#aaa' : '#555';
            ctx.font = '9px monospace';
            const hints = [];
            if (def.arcMult !== 1) hints.push(`${def.arcMult > 1 ? '▲' : '▼'}Arc`);
            if (def.rangeMult !== 1) hints.push(`${def.rangeMult > 1 ? '▲' : '▼'}Rng`);
            if (def.damageMult !== 1) hints.push(`${def.damageMult > 1 ? '▲' : '▼'}Dmg`);
            if (def.cooldownMult !== 1) hints.push(`${def.cooldownMult > 1 ? '▲' : '▼'}Spd`);
            if (def.knockbackMult !== 1) hints.push(`${def.knockbackMult > 1 ? '▲' : '▼'}KB`);
            if (hints.length === 0) hints.push('Balanced');
            ctx.fillText(hints.join(' '), midX, y + 26);

            if (selected) {
                // Small triangle indicator
                ctx.fillStyle = def.color;
                ctx.beginPath();
                ctx.moveTo(midX, y - 8);
                ctx.lineTo(midX - 4, y - 13);
                ctx.lineTo(midX + 4, y - 13);
                ctx.fill();
            }
        } else {
            // Locked
            ctx.fillStyle = '#444';
            ctx.font = '13px monospace';
            ctx.fillText(`🔒 ${def.name}`, midX, y + 12);
            ctx.fillStyle = '#383838';
            ctx.font = '9px monospace';
            ctx.fillText(`Reach Stage ${def.unlock.value}`, midX, y + 26);
        }
    }
}

function _renderRow(ctx, def, unlocked, selected, isCursor, y, meta, type, slotIndex, rejectFlash) {
    const leftX = CANVAS_WIDTH / 2 - 190;
    const rightX = CANVAS_WIDTH / 2 + 170;

    // Hover highlight
    if (isCursor) {
        ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
        ctx.fillRect(leftX - 10, y - 14, 400, 34);
        ctx.strokeStyle = unlocked ? (def.color || '#fff') : '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(leftX - 10, y - 14, 400, 34);
    }

    ctx.textAlign = 'left';

    // Cursor arrow
    if (isCursor) {
        ctx.fillStyle = unlocked ? '#fff' : '#555';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('▸', leftX - 6, y + 5);
    }

    if (unlocked) {
        // Icon + Name
        ctx.fillStyle = selected ? def.color : '#aaa';
        ctx.font = `${selected ? 'bold ' : ''}14px monospace`;
        ctx.fillText(`${def.icon}  ${def.name}`, leftX + 12, y + 5);

        // Short description (only if cursor is here)
        if (isCursor) {
            ctx.fillStyle = '#666';
            ctx.font = '10px monospace';
            ctx.fillText(def.desc, leftX + 12, y + 19);
        }

        // Selection status
        ctx.textAlign = 'right';
        if (selected) {
            const label = type === 'ability'
                ? `✓ [${slotIndex === 0 ? 'Q' : 'E'}]`
                : `✓ [${slotIndex + 1}]`;
            ctx.fillStyle = def.color;
            ctx.font = 'bold 13px monospace';
            ctx.fillText(label, rightX, y + 5);
        } else {
            ctx.fillStyle = '#333';
            ctx.font = '12px monospace';
            ctx.fillText('—', rightX, y + 5);
        }
    } else {
        // Locked item
        ctx.fillStyle = '#444';
        ctx.font = '14px monospace';
        const lockText = `🔒  ${def.name}`;
        ctx.fillText(lockText, leftX + 12, y + 5);

        // Unlock hint — positioned after the name with a gap
        const nameWidth = ctx.measureText(lockText).width;
        const hintX = leftX + 12 + nameWidth + 12;
        ctx.fillStyle = '#383838';
        ctx.font = '10px monospace';
        ctx.fillText('🏆 / Biome / Scrolls', hintX, y + 5);
    }

    ctx.textAlign = 'center';
}
