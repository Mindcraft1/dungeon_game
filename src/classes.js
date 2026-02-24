// ── Character Classes ────────────────────────────────────
// Four classes with unique stat biases and passive abilities.
// Class is chosen at profile creation and cannot be changed.
// ─────────────────────────────────────────────────────────

export const CLASS_ADVENTURER = 'adventurer';
export const CLASS_GUARDIAN   = 'guardian';
export const CLASS_ROGUE      = 'rogue';
export const CLASS_BERSERKER  = 'berserker';

export const DEFAULT_CLASS_ID = CLASS_ADVENTURER;

/**
 * @typedef {object} ClassPassive
 * @property {string} type    - passive identifier
 * @property {string} desc    - short human-readable description
 * @property {number} [healPercent]   - Adventurer room-clear heal (0-1)
 * @property {number} [cooldown]      - Guardian shield recharge (ms)
 * @property {number} [critBonus]     - Rogue extra crit chance (0-1)
 * @property {number} [critMult]      - Rogue crit damage multiplier
 * @property {number} [hpThreshold]   - Berserker HP% threshold (0-1)
 * @property {number} [damageBuff]    - Berserker bonus damage mult
 */

/**
 * @typedef {object} ClassDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} color    - accent color for the class
 * @property {number} hpMult   - multiplier to base max HP
 * @property {number} damageMult - multiplier to base damage
 * @property {number} speedMult  - multiplier to base speed
 * @property {ClassPassive} passive
 * @property {string} desc     - one-line description
 * @property {string[]} statLabels - display-friendly stat changes
 */

export const CLASS_DEFINITIONS = [
    {
        id: CLASS_ADVENTURER,
        name: 'Adventurer',
        color: '#ffd54f',
        hpMult: 1.0,
        damageMult: 1.0,
        speedMult: 1.0,
        passive: {
            type: 'roomHeal',
            desc: 'Heal 10% max HP after clearing each room',
            healPercent: 0.10,
        },
        desc: 'Balanced all-rounder with survival instinct',
        statLabels: ['— HP', '— DMG', '— Speed'],
    },
    {
        id: CLASS_GUARDIAN,
        name: 'Guardian',
        color: '#4fc3f7',
        hpMult: 1.20,
        damageMult: 1.0,
        speedMult: 0.90,
        passive: {
            type: 'shield',
            desc: 'Auto-shield blocks 1 hit every 20s',
            cooldown: 20000,
        },
        desc: 'Tanky protector with an auto-shield',
        statLabels: ['+20% HP', '—', '-10% Speed'],
    },
    {
        id: CLASS_ROGUE,
        name: 'Rogue',
        color: '#66bb6a',
        hpMult: 0.85,
        damageMult: 1.0,
        speedMult: 1.15,
        passive: {
            type: 'crit',
            desc: '+15% Crit Chance, crits deal 1.8×',
            critBonus: 0.15,
            critMult: 1.8,
        },
        desc: 'Fast assassin with deadly crits',
        statLabels: ['-15% HP', '—', '+15% Speed'],
    },
    {
        id: CLASS_BERSERKER,
        name: 'Berserker',
        color: '#ef5350',
        hpMult: 0.90,
        damageMult: 1.15,
        speedMult: 1.0,
        passive: {
            type: 'berserk',
            desc: 'Below 30% HP → +40% Damage',
            hpThreshold: 0.30,
            damageBuff: 0.40,
        },
        desc: 'Raw power that thrives on low HP',
        statLabels: ['-10% HP', '+15% DMG', '—'],
    },
];

/**
 * Look up a class definition by its id.
 * Falls back to Guardian if not found.
 * @param {string} id
 * @returns {ClassDefinition}
 */
export function getClassById(id) {
    return CLASS_DEFINITIONS.find(c => c.id === id) || CLASS_DEFINITIONS[0];
}

// ── Emblem renderers (drawn inside the player circle) ────

/**
 * Draw the class emblem at the given position.
 * Called from player._renderBody() after the main circle is drawn.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} classId
 * @param {number} x - center x
 * @param {number} y - center y
 * @param {number} r - player radius
 */
export function renderClassEmblem(ctx, classId, x, y, r) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;

    switch (classId) {
        case CLASS_ADVENTURER:
            _drawCompassEmblem(ctx, x, y, r);
            break;
        case CLASS_GUARDIAN:
            _drawShieldEmblem(ctx, x, y, r);
            break;
        case CLASS_ROGUE:
            _drawSlashEmblem(ctx, x, y, r);
            break;
        case CLASS_BERSERKER:
            _drawFistEmblem(ctx, x, y, r);
            break;
    }

    ctx.restore();
}

/** Small shield shape (pentagon-ish) */
function _drawShieldEmblem(ctx, x, y, r) {
    const s = r * 0.5;
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(x, y - s);              // top center
    ctx.lineTo(x + s * 0.8, y - s * 0.4); // top right
    ctx.lineTo(x + s * 0.7, y + s * 0.4); // bottom right
    ctx.lineTo(x, y + s * 0.75);       // bottom center (point)
    ctx.lineTo(x - s * 0.7, y + s * 0.4); // bottom left
    ctx.lineTo(x - s * 0.8, y - s * 0.4); // top left
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

/** Two crossed slash marks (X) */
function _drawSlashEmblem(ctx, x, y, r) {
    const s = r * 0.4;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s, y - s);
    ctx.lineTo(x - s, y + s);
    ctx.stroke();
}

/** Small fist / flame shape */
function _drawFistEmblem(ctx, x, y, r) {
    const s = r * 0.4;
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    // Simple upward flame shape
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.1);              // top point
    ctx.quadraticCurveTo(x + s * 0.8, y - s * 0.3, x + s * 0.6, y + s * 0.5);
    ctx.lineTo(x + s * 0.2, y + s * 0.2);
    ctx.lineTo(x + s * 0.3, y + s * 0.7);    // inner right
    ctx.lineTo(x - s * 0.3, y + s * 0.7);    // inner left
    ctx.lineTo(x - s * 0.2, y + s * 0.2);
    ctx.quadraticCurveTo(x - s * 0.8, y - s * 0.3, x, y - s * 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

/** Compass / star emblem for Adventurer */
function _drawCompassEmblem(ctx, x, y, r) {
    const s = r * 0.5;
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    // 4-pointed star (compass rose)
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.1);           // top
    ctx.lineTo(x + s * 0.25, y - s * 0.25);
    ctx.lineTo(x + s * 1.1, y);           // right
    ctx.lineTo(x + s * 0.25, y + s * 0.25);
    ctx.lineTo(x, y + s * 1.1);           // bottom
    ctx.lineTo(x - s * 0.25, y + s * 0.25);
    ctx.lineTo(x - s * 1.1, y);           // left
    ctx.lineTo(x - s * 0.25, y - s * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

/**
 * Draw a small class icon for use in profile lists, pickers, etc.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} classId
 * @param {number} x - center x
 * @param {number} y - center y
 * @param {number} size - icon size (radius-like)
 */
export function renderClassIcon(ctx, classId, x, y, size) {
    const cls = getClassById(classId);
    ctx.save();
    ctx.fillStyle = cls.color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw mini emblem inside
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    switch (classId) {
        case CLASS_ADVENTURER:
            _drawCompassEmblem(ctx, x, y, size * 1.2);
            break;
        case CLASS_GUARDIAN:
            _drawShieldEmblem(ctx, x, y, size * 1.2);
            break;
        case CLASS_ROGUE:
            _drawSlashEmblem(ctx, x, y, size * 1.2);
            break;
        case CLASS_BERSERKER:
            _drawFistEmblem(ctx, x, y, size * 1.2);
            break;
    }

    ctx.restore();
}
