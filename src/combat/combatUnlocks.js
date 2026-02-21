// ── Combat Unlocks ──────────────────────────────────────────
// Defines unlock conditions for abilities and procs.
// Unlock checks are based on meta progression stats.
// ─────────────────────────────────────────────────────────────

import { ABILITY_DEFINITIONS } from './abilities.js';
import { PROC_DEFINITIONS } from './procs.js';

// ── Unlock Conditions ──

/** @type {Record<string, {type: string, value?: number, desc: string}>} */
export const ABILITY_UNLOCK_CONDITIONS = {
    shockwave:     { type: 'free',   desc: 'Starter ability' },
    freeze_pulse:  { type: 'stage',  value: 3,  desc: 'Reach Stage 3' },
    blade_storm:   { type: 'stage',  value: 6,  desc: 'Reach Stage 6' },
    gravity_pull:  { type: 'stage',  value: 10, desc: 'Reach Stage 10' },
};

/** @type {Record<string, {type: string, value?: number, desc: string}>} */
export const PROC_UNLOCK_CONDITIONS = {
    explosive_strikes: { type: 'free',   desc: 'Starter passive' },
    chain_lightning:   { type: 'bosses', value: 3, desc: 'Kill 3 bosses total' },
    heavy_crit:        { type: 'bosses', value: 6, desc: 'Kill 6 bosses total' },
};

// ── Ordered display lists ──

export const ABILITY_ORDER = ['shockwave', 'freeze_pulse', 'blade_storm', 'gravity_pull'];
export const PROC_ORDER    = ['explosive_strikes', 'chain_lightning', 'heavy_crit'];

export const TOTAL_LOADOUT_ITEMS = ABILITY_ORDER.length + PROC_ORDER.length + 1; // +1 for START button

// ── Check functions ──

/**
 * Check if an ability is unlocked based on meta stats.
 * @param {string} id
 * @param {{highestStage: number, bossesKilledTotal: number}} stats
 */
export function isAbilityUnlocked(id, stats) {
    const cond = ABILITY_UNLOCK_CONDITIONS[id];
    if (!cond) return false;
    if (cond.type === 'free') return true;
    if (cond.type === 'stage') return (stats.highestStage || 0) >= cond.value;
    if (cond.type === 'bosses') return (stats.bossesKilledTotal || 0) >= cond.value;
    return false;
}

/**
 * Check if a proc is unlocked based on meta stats.
 * @param {string} id
 * @param {{highestStage: number, bossesKilledTotal: number}} stats
 */
export function isProcUnlocked(id, stats) {
    const cond = PROC_UNLOCK_CONDITIONS[id];
    if (!cond) return false;
    if (cond.type === 'free') return true;
    if (cond.type === 'stage') return (stats.highestStage || 0) >= cond.value;
    if (cond.type === 'bosses') return (stats.bossesKilledTotal || 0) >= cond.value;
    return false;
}

/**
 * Get list of unlocked ability IDs.
 */
export function getUnlockedAbilities(stats) {
    return ABILITY_ORDER.filter(id => isAbilityUnlocked(id, stats));
}

/**
 * Get list of unlocked proc IDs.
 */
export function getUnlockedProcs(stats) {
    return PROC_ORDER.filter(id => isProcUnlocked(id, stats));
}

/**
 * Get the unlock progress description for a locked item.
 * Shows how far the player is toward unlocking.
 * @param {{type: string, value?: number}} cond
 * @param {{highestStage: number, bossesKilledTotal: number}} stats
 * @returns {string}
 */
export function getUnlockProgress(cond, stats) {
    if (!cond || cond.type === 'free') return '';
    if (cond.type === 'stage') {
        const current = stats.highestStage || 0;
        return `Stage ${current}/${cond.value}`;
    }
    if (cond.type === 'bosses') {
        const current = stats.bossesKilledTotal || 0;
        return `Bosses ${current}/${cond.value}`;
    }
    return '';
}

/**
 * Filter a saved loadout, removing any IDs that aren't actually unlocked.
 * Returns a cleaned copy.
 * @param {{abilities: string[], procs: string[]}} loadout
 * @param {{highestStage: number, bossesKilledTotal: number}} stats
 */
export function sanitizeLoadout(loadout, stats) {
    return {
        abilities: (loadout.abilities || []).filter(id => isAbilityUnlocked(id, stats)),
        procs:     (loadout.procs || []).filter(id => isProcUnlocked(id, stats)),
    };
}
