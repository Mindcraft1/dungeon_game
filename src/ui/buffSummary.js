// ── Buff Summary Panel ──────────────────────────────────────
// Compact HUD element showing net stat modifiers from ALL sources:
//   meta perks, relics, shop purchases, boosters, run upgrades,
//   temporary pickup buffs, biome effects.
//
// Each stat is aggregated into a single net % value.
// Only non-zero modifiers are displayed.
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

/**
 * @typedef {Object} StatModifiers
 * @property {number} damage         – net damage multiplier (1.0 = no change)
 * @property {number} speed          – net speed multiplier
 * @property {number} maxHp          – net max-HP multiplier
 * @property {number} xpGain         – net XP gain multiplier
 * @property {number} defense        – net damage-taken multiplier (< 1 = buff)
 * @property {number} trapResist     – net trap-damage multiplier (< 1 = buff)
 * @property {number} bossDamage     – net boss-damage multiplier
 * @property {number} attackRange    – net attack-range multiplier
 * @property {number} attackSpeed    – net attack-speed multiplier (inverse of CD mult)
 * @property {Array<{icon:string, name:string, color:string}>} specials – active special effects
 */

// ── Stat display definitions (order matters) ──

const STAT_DEFS = [
    { key: 'damage',      label: 'DMG',    icon: '⚔',  posColor: '#f44336', negColor: '#f44336' },
    { key: 'speed',       label: 'SPD',    icon: '👢', posColor: '#2196f3', negColor: '#2196f3' },
    { key: 'maxHp',       label: 'HP',     icon: '♥',  posColor: '#4caf50', negColor: '#4caf50' },
    { key: 'xpGain',      label: 'XP',     icon: '✦',  posColor: '#9b59b6', negColor: '#9b59b6' },
    { key: 'defense',     label: 'DEF',    icon: '🛡', posColor: '#78909c', negColor: '#78909c', invert: true },
    { key: 'trapResist',  label: 'TRAP',   icon: '🧱', posColor: '#795548', negColor: '#795548', invert: true },
    { key: 'bossDamage',  label: 'BOSS',   icon: '☠',  posColor: '#ff5722', negColor: '#ff5722' },
    { key: 'attackRange', label: 'RNG',    icon: '◎',  posColor: '#ff9800', negColor: '#ff9800' },
    { key: 'attackSpeed', label: 'ATK',    icon: '⚡', posColor: '#2ecc71', negColor: '#2ecc71' },
];

// Threshold to consider a modifier "active" (avoid floating point noise)
const EPSILON = 0.001;

/**
 * Render a compact stat-modifier summary panel.
 * Shows net % for each stat, plus special effect tags.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {StatModifiers} mods
 */
export function renderBuffSummary(ctx, mods) {
    if (!mods) return;

    // ── Collect visible stat lines ──
    const lines = [];
    for (const def of STAT_DEFS) {
        const raw = mods[def.key];
        if (raw == null) continue;

        // For "inverted" stats (defense, trap), < 1 means buff → show as positive %
        let pct;
        if (def.invert) {
            pct = (1 - raw) * 100;   // 0.97 → +3%, 1.15 → -15%
        } else {
            pct = (raw - 1) * 100;   // 1.24 → +24%, 0.85 → -15%
        }

        if (Math.abs(pct) < EPSILON) continue; // skip zero modifiers

        const isPositive = pct > 0;
        const sign = isPositive ? '+' : '';
        const text = `${sign}${Math.round(pct * 10) / 10}%`;

        lines.push({
            icon: def.icon,
            label: def.label,
            text,
            color: isPositive ? def.posColor : '#e74c3c',
            isPositive,
        });
    }

    const specials = mods.specials || [];
    if (lines.length === 0 && specials.length === 0) return;

    // ── Layout ──
    const pad = 10;
    const lineH = 14;
    const specialH = 13;
    const panelW = 110;
    const headerH = 14;
    const totalLines = lines.length + (specials.length > 0 ? specials.length : 0);
    const panelH = headerH + totalLines * lineH + (specials.length > 0 ? 6 : 0) + 6;

    // Position: bottom-right, above the mute icon
    const px = CANVAS_WIDTH - pad - panelW;
    const py = CANVAS_HEIGHT - 40 - panelH;

    ctx.save();

    // ── Panel background ──
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#000';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.globalAlpha = 1;

    // ── Left accent bar ──
    ctx.fillStyle = '#555';
    ctx.fillRect(px, py, 2, panelH);

    // ── Header ──
    ctx.fillStyle = '#888';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MODIFIERS', px + 6, py + 10);

    // ── Stat lines ──
    let y = py + headerH + 4;
    for (const line of lines) {
        // Icon
        ctx.fillStyle = '#888';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(line.icon, px + 5, y + 8);

        // Label
        ctx.fillStyle = '#999';
        ctx.font = '8px monospace';
        ctx.fillText(line.label, px + 18, y + 8);

        // Value (right-aligned)
        ctx.fillStyle = line.isPositive ? line.color : '#e74c3c';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(line.text, px + panelW - 5, y + 8);

        y += lineH;
    }

    // ── Special effects ──
    if (specials.length > 0) {
        // Thin separator
        y += 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 5, y);
        ctx.lineTo(px + panelW - 5, y);
        ctx.stroke();
        y += 4;

        for (const sp of specials) {
            ctx.fillStyle = sp.color;
            ctx.font = '8px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${sp.icon} ${sp.name}`, px + 5, y + 7);
            y += specialH;
        }
    }

    ctx.restore();
}
