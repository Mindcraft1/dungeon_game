// ── Combat Unlocks ──────────────────────────────────────────
// Persistent unlock system for abilities and procs.
// Items are unlocked at boss-kill milestones and stored in metaState.
// ─────────────────────────────────────────────────────────────

import * as MetaStore from '../meta/metaStore.js';
import { ABILITY_DEFINITIONS } from './abilities.js';
import { PROC_DEFINITIONS } from './procs.js';

// ── Ordered display lists ──

export const ABILITY_ORDER = ['shockwave', 'freeze_pulse', 'blade_storm', 'gravity_pull'];
export const PROC_ORDER    = ['explosive_strikes', 'chain_lightning', 'heavy_crit'];

export const TOTAL_LOADOUT_ITEMS = ABILITY_ORDER.length + PROC_ORDER.length + 1; // +1 for START button

// ── Boss-kill unlock milestones ──
// Each entry: { kills: N, type: 'ability' | 'proc' }
// When totalBossKills reaches the threshold, unlock a random locked item of that type.

const BOSS_UNLOCK_MILESTONES = [
    { kills: 2,  type: 'ability' },
    { kills: 4,  type: 'proc'    },
    { kills: 6,  type: 'ability' },
    { kills: 8,  type: 'proc'    },
    { kills: 11, type: 'ability' },
    { kills: 14, type: 'proc'    },
];

// ── Check functions ──

/**
 * Check if an ability is persistently unlocked.
 * @param {string} id
 * @param {object} meta – metaState object (must have .unlockedAbilities)
 */
export function isAbilityUnlocked(id, meta) {
    return !!(meta.unlockedAbilities && meta.unlockedAbilities[id]);
}

/**
 * Check if a proc is persistently unlocked.
 * @param {string} id
 * @param {object} meta – metaState object (must have .unlockedProcs)
 */
export function isProcUnlocked(id, meta) {
    return !!(meta.unlockedProcs && meta.unlockedProcs[id]);
}

/**
 * Get list of unlocked ability IDs.
 */
export function getUnlockedAbilities(meta) {
    return ABILITY_ORDER.filter(id => isAbilityUnlocked(id, meta));
}

/**
 * Get list of unlocked proc IDs.
 */
export function getUnlockedProcs(meta) {
    return PROC_ORDER.filter(id => isProcUnlocked(id, meta));
}

// ── Unlock functions ──

/**
 * Unlock a random locked item of the given type.
 * @param {'ability'|'proc'} type
 * @returns {{ id: string, name: string, icon: string, color: string, type: string }|null}
 */
export function unlockRandom(type) {
    const meta = MetaStore.getState();

    if (type === 'ability') {
        const locked = ABILITY_ORDER.filter(id => !meta.unlockedAbilities[id]);
        if (locked.length === 0) return null;
        const id = locked[Math.floor(Math.random() * locked.length)];
        meta.unlockedAbilities[id] = true;
        MetaStore.save();
        const def = ABILITY_DEFINITIONS[id];
        return { id, name: def.name, icon: def.icon, color: def.color, type: 'ability' };
    }

    if (type === 'proc') {
        const locked = PROC_ORDER.filter(id => !meta.unlockedProcs[id]);
        if (locked.length === 0) return null;
        const id = locked[Math.floor(Math.random() * locked.length)];
        meta.unlockedProcs[id] = true;
        MetaStore.save();
        const def = PROC_DEFINITIONS[id];
        return { id, name: def.name, icon: def.icon, color: def.color, type: 'proc' };
    }

    return null;
}

/**
 * Check boss-kill milestones and unlock accordingly.
 * Call this after incrementing totalBossKills.
 * @param {number} totalBossKills – the new cumulative total
 * @returns {{ id: string, name: string, icon: string, color: string, type: string }|null}
 */
export function checkBossUnlocks(totalBossKills) {
    for (const milestone of BOSS_UNLOCK_MILESTONES) {
        if (totalBossKills === milestone.kills) {
            return unlockRandom(milestone.type);
        }
    }
    return null;
}

/**
 * Get a description of what's needed to unlock the next item.
 * Used by the loadout screen to show progress hints for locked items.
 * @param {number} totalBossKills
 * @returns {string}
 */
export function getNextUnlockHint(totalBossKills) {
    for (const m of BOSS_UNLOCK_MILESTONES) {
        if (totalBossKills < m.kills) {
            const label = m.type === 'ability' ? 'Ability' : 'Passive';
            return `Next ${label} unlock at ${m.kills} boss kills (${totalBossKills}/${m.kills})`;
        }
    }
    return '';
}

/**
 * Filter a saved loadout, removing any IDs that aren't actually unlocked.
 * @param {{abilities: string[], procs: string[]}} loadout
 * @param {object} meta – metaState
 */
export function sanitizeLoadout(loadout, meta) {
    return {
        abilities: (loadout.abilities || []).filter(id => isAbilityUnlocked(id, meta)),
        procs:     (loadout.procs || []).filter(id => isProcUnlocked(id, meta)),
    };
}
