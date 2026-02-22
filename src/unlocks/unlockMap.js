// ── Unlock Map & Engine ────────────────────────────────────
// Manages persistent unlocks of abilities, procs, and nodes
// from multiple sources: achievements, biome mastery, boss scrolls.
// ─────────────────────────────────────────────────────────────

import * as MetaStore from '../meta/metaStore.js';
import { ABILITY_DEFINITIONS } from '../combat/abilities.js';
import { PROC_DEFINITIONS } from '../combat/procs.js';
import { NODE_DEFINITIONS, NODE_IDS } from '../upgrades/nodes.js';
import { ABILITY_ORDER, PROC_ORDER } from '../combat/combatUnlocks.js';
import { BOSS_SCROLL_DROP_CHANCE } from '../constants.js';

// ═══════════════════════════════════════════════════════════
// A) ACHIEVEMENT → UNLOCK MAPPING (deterministic)
// ═══════════════════════════════════════════════════════════

/**
 * Map: achievementId → array of unlock descriptors.
 * Types: { type: 'ability'|'proc'|'node', id: string }
 */
export const ACHIEVEMENT_UNLOCK_MAP = {
    // Easy/Medium: small rewards
    untouchable_3:       [{ type: 'ability', id: 'freeze_pulse' }],
    kills_500_total:     [{ type: 'ability', id: 'blade_storm' }],
    boss_no_hit_3:       [{ type: 'ability', id: 'gravity_pull' }],
    visit_all_biomes:    [{ type: 'proc',    id: 'chain_lightning' }],
    boss_kills_3_run:    [{ type: 'proc',    id: 'heavy_crit' }],

    // Node unlocks from harder achievements
    reach_stage_15:      [{ type: 'node', id: 'melee_kill_nova' }],
    reach_stage_20:      [{ type: 'node', id: 'dagger_spread' }],
    untouchable_5:       [{ type: 'node', id: 'dash_end_shockwave' }],
    no_damage_to_stage_10: [{ type: 'node', id: 'dagger_returning' }],
};

// ═══════════════════════════════════════════════════════════
// B) BIOME MASTERY → UNLOCK MAPPING (deterministic)
// ═══════════════════════════════════════════════════════════

/**
 * Map: biomeId → { milestone: number, unlocks: [...] }
 * When bossesDefeated in that biome reaches milestone, unlock.
 */
export const BIOME_MASTERY_UNLOCKS = {
    jungle: [
        { milestone: 1, unlocks: [{ type: 'node', id: 'melee_lunge' }] },
        { milestone: 3, unlocks: [{ type: 'node', id: 'dagger_fire_trail' }] },
    ],
    desert: [
        { milestone: 1, unlocks: [{ type: 'node', id: 'dash_fire_trail' }] },
        { milestone: 3, unlocks: [{ type: 'node', id: 'melee_bleed' }] },
    ],
    wasteland: [
        { milestone: 1, unlocks: [{ type: 'node', id: 'melee_stun_chance' }] },
        { milestone: 3, unlocks: [{ type: 'node', id: 'dagger_ricochet' }] },
    ],
    depths: [
        { milestone: 1, unlocks: [{ type: 'node', id: 'dash_stun' }] },
        { milestone: 3, unlocks: [{ type: 'node', id: 'melee_heavy_hit' }] },
    ],
};

// ═══════════════════════════════════════════════════════════
// UNLOCK ENGINE
// ═══════════════════════════════════════════════════════════

/**
 * Unlock an item persistently. Returns the unlock descriptor or null if already unlocked.
 * @param {{ type: 'ability'|'proc'|'node', id: string }} descriptor
 * @returns {{ type, id, name, icon, color }|null} info for toast display
 */
export function unlockItem(descriptor) {
    const meta = MetaStore.getState();
    const { type, id } = descriptor;

    if (type === 'ability') {
        if (meta.unlockedAbilities[id]) return null;
        meta.unlockedAbilities[id] = true;
        MetaStore.save();
        const def = ABILITY_DEFINITIONS[id];
        return def ? { type, id, name: def.name, icon: def.icon, color: def.color } : null;
    }

    if (type === 'proc') {
        if (meta.unlockedProcs[id]) return null;
        meta.unlockedProcs[id] = true;
        MetaStore.save();
        const def = PROC_DEFINITIONS[id];
        return def ? { type, id, name: def.name, icon: def.icon, color: def.color } : null;
    }

    if (type === 'node') {
        if (meta.unlockedNodes[id]) return null;
        meta.unlockedNodes[id] = true;
        MetaStore.save();
        const def = NODE_DEFINITIONS[id];
        return def ? { type, id, name: def.name, icon: def.icon, color: def.color } : null;
    }

    return null;
}

/**
 * Process achievement unlock — check if it triggers any item unlocks.
 * @param {string} achievementId
 * @returns {Array<{ type, id, name, icon, color }>} list of newly unlocked items
 */
export function processAchievementUnlock(achievementId) {
    const mapping = ACHIEVEMENT_UNLOCK_MAP[achievementId];
    if (!mapping) return [];

    const results = [];
    for (const descriptor of mapping) {
        const result = unlockItem(descriptor);
        if (result) results.push(result);
    }
    return results;
}

/**
 * Process biome mastery — call when a boss is killed in a biome.
 * Updates biomeMastery and checks for unlocks.
 * @param {string} biomeId
 * @param {number} stage
 * @returns {Array<{ type, id, name, icon, color }>} newly unlocked items
 */
export function processBiomeMasteryBossKill(biomeId, stage) {
    const meta = MetaStore.getState();

    // Update mastery
    if (!meta.biomeMastery[biomeId]) {
        meta.biomeMastery[biomeId] = { bossesDefeated: 0, bestStage: 0 };
    }
    meta.biomeMastery[biomeId].bossesDefeated++;
    meta.biomeMastery[biomeId].bestStage = Math.max(meta.biomeMastery[biomeId].bestStage, stage);
    MetaStore.save();

    // Check milestone unlocks
    const results = [];
    const milestones = BIOME_MASTERY_UNLOCKS[biomeId];
    if (!milestones) return results;

    const bossCount = meta.biomeMastery[biomeId].bossesDefeated;
    for (const { milestone, unlocks } of milestones) {
        if (bossCount >= milestone) {
            for (const descriptor of unlocks) {
                const result = unlockItem(descriptor);
                if (result) results.push(result);
            }
        }
    }

    return results;
}

/**
 * Generate boss scroll choices — 3 random locked items (abilities/procs/nodes).
 * Returns null if no locked items remain or scroll didn't drop.
 * @param {boolean} forceScroll – if true, skip the chance roll
 * @returns {Array<{ type, id, name, icon, color }>|null} 3 choices or null
 */
export function generateBossScrollChoices(forceScroll = false) {
    if (!forceScroll && Math.random() > BOSS_SCROLL_DROP_CHANCE) return null;

    const meta = MetaStore.getState();
    const locked = [];

    // Locked abilities
    for (const id of ABILITY_ORDER) {
        if (!meta.unlockedAbilities[id]) {
            const def = ABILITY_DEFINITIONS[id];
            if (def) locked.push({ type: 'ability', id, name: def.name, icon: def.icon, color: def.color });
        }
    }

    // Locked procs
    for (const id of PROC_ORDER) {
        if (!meta.unlockedProcs[id]) {
            const def = PROC_DEFINITIONS[id];
            if (def) locked.push({ type: 'proc', id, name: def.name, icon: def.icon, color: def.color });
        }
    }

    // Locked nodes (only rare/uncommon — don't offer common base nodes as scroll rewards)
    for (const id of NODE_IDS) {
        if (!meta.unlockedNodes[id]) {
            const def = NODE_DEFINITIONS[id];
            if (def && def.rarity !== 'common') {
                locked.push({ type: 'node', id, name: def.name, icon: def.icon, color: def.color });
            }
        }
    }

    if (locked.length === 0) return null;

    // Fisher-Yates shuffle and take 3
    for (let i = locked.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [locked[i], locked[j]] = [locked[j], locked[i]];
    }

    return locked.slice(0, Math.min(3, locked.length));
}

/**
 * Apply a boss scroll choice (permanently unlock the selected item).
 * @param {{ type, id }} choice
 * @returns {{ type, id, name, icon, color }|null}
 */
export function applyBossScrollChoice(choice) {
    return unlockItem(choice);
}

/**
 * Pity system: if player reached stage 10+ and has <= 1 ability unlocked,
 * grant a guaranteed unlock from remaining locked abilities.
 * @param {number} stage
 * @returns {{ type, id, name, icon, color }|null}
 */
export function checkPityUnlock(stage) {
    if (stage < 10) return null;

    const meta = MetaStore.getState();
    const unlockedAbilityCount = ABILITY_ORDER.filter(id => meta.unlockedAbilities[id]).length;

    if (unlockedAbilityCount <= 1) {
        const locked = ABILITY_ORDER.filter(id => !meta.unlockedAbilities[id]);
        if (locked.length === 0) return null;
        const id = locked[Math.floor(Math.random() * locked.length)];
        return unlockItem({ type: 'ability', id });
    }

    return null;
}

/**
 * Get summary of all unlock progress for UI display.
 */
export function getUnlockSummary() {
    const meta = MetaStore.getState();
    return {
        abilities: {
            total: ABILITY_ORDER.length,
            unlocked: ABILITY_ORDER.filter(id => meta.unlockedAbilities[id]).length,
        },
        procs: {
            total: PROC_ORDER.length,
            unlocked: PROC_ORDER.filter(id => meta.unlockedProcs[id]).length,
        },
        nodes: {
            total: NODE_IDS.length,
            unlocked: NODE_IDS.filter(id => meta.unlockedNodes && meta.unlockedNodes[id]).length,
        },
    };
}
