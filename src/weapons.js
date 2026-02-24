// ── Weapon Type Definitions ──────────────────────────────────
// Three weapon types that change the primary melee attack's feel.
// Multipliers are applied to base constants, stacking with class/buff/node mods.
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} WeaponDef
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} color       – theme color for UI
 * @property {string} desc        – short description
 * @property {number} arcMult     – multiplier on ATTACK_ARC
 * @property {number} rangeMult   – multiplier on ATTACK_RANGE
 * @property {number} cooldownMult – multiplier on ATTACK_COOLDOWN
 * @property {number} damageMult  – multiplier on melee damage
 * @property {number} knockbackMult – multiplier on ATTACK_KNOCKBACK
 * @property {{ type: string, value: number }|null} unlock – null = always unlocked
 */

export const WEAPON_DEFINITIONS = {
    sword: {
        id: 'sword',
        name: 'Sword',
        icon: '⚔',
        color: '#90caf9',
        desc: 'Balanced blade. No strengths, no weaknesses.',
        arcMult: 1.0,
        rangeMult: 1.0,
        cooldownMult: 1.0,
        damageMult: 1.0,
        knockbackMult: 1.0,
        unlock: null, // always available
    },
    spear: {
        id: 'spear',
        name: 'Spear',
        icon: '🔱',
        color: '#80cbc4',
        desc: 'Long reach, narrow arc. Poke from safety.',
        arcMult: 0.33,      // 120° × 0.33 ≈ 40°
        rangeMult: 1.5,      // 50 × 1.5 = 75px
        cooldownMult: 1.14,  // 350 × 1.14 ≈ 400ms
        damageMult: 1.1,
        knockbackMult: 0.75,
        unlock: { type: 'stage', value: 10 },
    },
    hammer: {
        id: 'hammer',
        name: 'Hammer',
        icon: '🔨',
        color: '#ffab91',
        desc: 'Full 360° slam. Slow but devastating.',
        arcMult: 3.0,        // 120° × 3 = 360°
        rangeMult: 0.7,      // 50 × 0.7 = 35px
        cooldownMult: 1.43,  // 350 × 1.43 ≈ 500ms
        damageMult: 1.3,
        knockbackMult: 1.75,
        unlock: { type: 'stage', value: 15 },
    },
};

/** Ordered list of weapon IDs for UI iteration. */
export const WEAPON_ORDER = ['sword', 'spear', 'hammer'];

/** Default weapon for new runs / legacy profiles. */
export const DEFAULT_WEAPON_ID = 'sword';

/**
 * Get weapon definition by ID. Falls back to sword if not found.
 * @param {string} id
 * @returns {WeaponDef}
 */
export function getWeaponById(id) {
    return WEAPON_DEFINITIONS[id] || WEAPON_DEFINITIONS.sword;
}

/**
 * Check whether a weapon is unlocked based on profile highscore.
 * @param {string} id – weapon ID
 * @param {number} highscore – profile's highest stage reached
 * @returns {boolean}
 */
export function isWeaponUnlocked(id, highscore) {
    const def = WEAPON_DEFINITIONS[id];
    if (!def) return false;
    if (!def.unlock) return true; // no unlock requirement
    if (def.unlock.type === 'stage') return highscore >= def.unlock.value;
    return false;
}
