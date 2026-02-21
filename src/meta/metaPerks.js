// ── Meta Perks ──────────────────────────────────────────────
// Small, permanent stat buffs purchased with Core Shards.
// Max total impact: ~+25-30% power after heavy grinding.
// ─────────────────────────────────────────────────────────────

import { getAvailableShards } from './metaState.js';
import * as MetaStore from './metaStore.js';

// ── Perk Definitions ──

export const PERK_DEFINITIONS = {
    vitality: {
        id:       'vitality',
        name:     'Vitality',
        icon:     '♥',
        color:    '#4caf50',
        desc:     '+1% Max HP per level',
        maxLevel: 10,
        costs:    [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],   // progressive
        effectPerLevel: 0.01,   // +1% per level
        effectLabel: (lvl) => `+${lvl}% Max HP`,
    },
    might: {
        id:       'might',
        name:     'Might',
        icon:     '⚔',
        color:    '#f44336',
        desc:     '+1% Damage per level',
        maxLevel: 10,
        costs:    [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
        effectPerLevel: 0.01,
        effectLabel: (lvl) => `+${lvl}% Damage`,
    },
    haste: {
        id:       'haste',
        name:     'Haste',
        icon:     '⚡',
        color:    '#2196f3',
        desc:     '+0.5% Move Speed per level',
        maxLevel: 10,
        costs:    [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
        effectPerLevel: 0.005,
        effectLabel: (lvl) => `+${(lvl * 0.5).toFixed(1)}% Speed`,
    },
    wisdom: {
        id:       'wisdom',
        name:     'Wisdom',
        icon:     '✦',
        color:    '#9b59b6',
        desc:     '+1% XP Gain per level',
        maxLevel: 10,
        costs:    [2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
        effectPerLevel: 0.01,
        effectLabel: (lvl) => `+${lvl}% XP`,
    },
};

/** Ordered array of perk IDs for iteration */
export const PERK_IDS = ['vitality', 'might', 'haste', 'wisdom'];

// ── Queries ──

/** Get current level of a perk */
export function getPerkLevel(perkId) {
    return MetaStore.getState().metaPerks[perkId] || 0;
}

/** Get cost of the next upgrade (or -1 if maxed) */
export function getNextCost(perkId) {
    const def = PERK_DEFINITIONS[perkId];
    if (!def) return -1;
    const lvl = getPerkLevel(perkId);
    if (lvl >= def.maxLevel) return -1;
    return def.costs[lvl];
}

/** Can the player afford the next upgrade? */
export function canUpgrade(perkId) {
    const cost = getNextCost(perkId);
    if (cost < 0) return false;
    return getAvailableShards(MetaStore.getState()) >= cost;
}

/** Is the perk at max level? */
export function isMaxed(perkId) {
    const def = PERK_DEFINITIONS[perkId];
    return def ? getPerkLevel(perkId) >= def.maxLevel : true;
}

// ── Mutations ──

/**
 * Purchase one level of a perk. Returns true on success.
 */
export function upgradePerk(perkId) {
    if (!canUpgrade(perkId)) return false;
    const cost = getNextCost(perkId);
    const state = MetaStore.getState();
    state.spentCoreShards += cost;
    state.metaPerks[perkId]++;
    MetaStore.save();
    return true;
}

// ── Modifier Computation ──

/**
 * Compute all meta perk modifiers as a flat object.
 * Called once at run start to build the modifier set.
 */
export function computePerkModifiers() {
    const state = MetaStore.getState();
    const p = state.metaPerks;
    return {
        hpMultiplier:     1 + p.vitality * 0.01,
        damageMultiplier: 1 + p.might    * 0.01,
        speedMultiplier:  1 + p.haste    * 0.005,
        xpMultiplier:     1 + p.wisdom   * 0.01,
    };
}
