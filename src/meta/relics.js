// ── Relics (rare permanent unlocks) ─────────────────────────
// Each relic is small but flavorful. ~3-5% individual impact.
// Relics are permanently unlocked and active every run.
// ─────────────────────────────────────────────────────────────

import * as MetaStore from './metaStore.js';

// ── Relic Definitions ──

export const RELIC_DEFINITIONS = {
    relic_xp_spark: {
        id:    'relic_xp_spark',
        name:  'XP Spark',
        icon:  '✧',
        color: '#bb86fc',
        desc:  '+3% XP Gain',
    },
    relic_boss_hunter: {
        id:    'relic_boss_hunter',
        name:  'Boss Hunter',
        icon:  '☠',
        color: '#ff5722',
        desc:  '+5% Damage vs Bosses',
    },
    relic_tough_skin: {
        id:    'relic_tough_skin',
        name:  'Tough Skin',
        icon:  '🛡',
        color: '#78909c',
        desc:  '-3% Damage Taken',
    },
    relic_quick_step: {
        id:    'relic_quick_step',
        name:  'Quick Step',
        icon:  '💨',
        color: '#4fc3f7',
        desc:  '+2% Move Speed',
    },
    relic_heal_on_level: {
        id:    'relic_heal_on_level',
        name:  'Vitality Surge',
        icon:  '💚',
        color: '#66bb6a',
        desc:  'Heal 10% max HP on Level-Up',
    },
    relic_starting_orb: {
        id:    'relic_starting_orb',
        name:  'Starting Orb',
        icon:  '🔮',
        color: '#ce93d8',
        desc:  'Start each run with +10 XP',
    },
    relic_spike_sense: {
        id:    'relic_spike_sense',
        name:  'Spike Sense',
        icon:  '▲',
        color: '#8e8e8e',
        desc:  'Spikes deal -10% damage',
    },
    relic_lava_boots: {
        id:    'relic_lava_boots',
        name:  'Lava Boots',
        icon:  '🔥',
        color: '#ff6b35',
        desc:  'Lava deals -10% damage',
    },
};

/** Ordered list of all relic IDs */
export const RELIC_IDS = Object.keys(RELIC_DEFINITIONS);

/** Total number of relics */
export const RELIC_COUNT = RELIC_IDS.length;

/** Drop chance per boss kill (if relics remain locked) */
export const RELIC_DROP_CHANCE = 0.10;

// ── Queries ──

export function isRelicUnlocked(relicId) {
    return !!MetaStore.getState().relicsUnlocked[relicId];
}

export function getUnlockedRelicCount() {
    return Object.keys(MetaStore.getState().relicsUnlocked).length;
}

export function allRelicsUnlocked() {
    return getUnlockedRelicCount() >= RELIC_COUNT;
}

/** Get a list of still-locked relic IDs */
export function getLockedRelicIds() {
    const unlocked = MetaStore.getState().relicsUnlocked;
    return RELIC_IDS.filter(id => !unlocked[id]);
}

// ── Mutations ──

/**
 * Unlock a specific relic. Returns true if newly unlocked.
 */
export function unlockRelic(relicId) {
    const state = MetaStore.getState();
    if (state.relicsUnlocked[relicId]) return false;
    state.relicsUnlocked[relicId] = true;
    MetaStore.save();
    return true;
}

// ── Modifier Computation ──

/**
 * Compute all relic-based modifiers as a flat object.
 * Called once at run start.
 */
export function computeRelicModifiers() {
    const mods = {
        xpMultiplier:           1,
        bossDamageMultiplier:   1,
        damageTakenMultiplier:  1,
        speedMultiplier:        1,
        healOnLevelUpPct:       0,     // fraction (0.10 = 10%)
        startingXpBonus:        0,
        spikeDamageMultiplier:  1,
        lavaDotMultiplier:      1,
    };

    if (isRelicUnlocked('relic_xp_spark'))       mods.xpMultiplier          *= 1.03;
    if (isRelicUnlocked('relic_boss_hunter'))     mods.bossDamageMultiplier  *= 1.05;
    if (isRelicUnlocked('relic_tough_skin'))      mods.damageTakenMultiplier *= 0.97;
    if (isRelicUnlocked('relic_quick_step'))      mods.speedMultiplier       *= 1.02;
    if (isRelicUnlocked('relic_heal_on_level'))   mods.healOnLevelUpPct       = 0.10;
    if (isRelicUnlocked('relic_starting_orb'))    mods.startingXpBonus        = 10;
    if (isRelicUnlocked('relic_spike_sense'))     mods.spikeDamageMultiplier *= 0.90;
    if (isRelicUnlocked('relic_lava_boots'))      mods.lavaDotMultiplier     *= 0.90;

    return mods;
}
