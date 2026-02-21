// ── Reward System ───────────────────────────────────────────
// Handles boss kill rewards, relic drops, run upgrade unlocks,
// and per-run reward tracking for the game-over summary.
// ─────────────────────────────────────────────────────────────

import * as MetaStore from './metaStore.js';
import { getLockedRelicIds, RELIC_DROP_CHANCE, unlockRelic } from './relics.js';
import { computePerkModifiers } from './metaPerks.js';
import { computeRelicModifiers } from './relics.js';

// ── Core Shard Economy ──

const BOSS_SHARD_REWARD      = 2;
const FIRST_BOSS_BONUS       = 1;   // extra shards for first boss of a run
const RARE_ROOM_SHARD_CHANCE = 0.01; // 1% chance per normal room clear

// ── Run Upgrades (unlockable level-up options) ──

export const RUN_UPGRADE_DEFINITIONS = {
    upgrade_lifesteal: {
        id:    'upgrade_lifesteal',
        name:  'Lifesteal',
        desc:  '1% lifesteal on melee hit',
        color: '#e91e63',
        icon:  '🩸',
        // effect applied in game.js on hit
    },
    upgrade_thorns: {
        id:    'upgrade_thorns',
        name:  'Thorns',
        desc:  '10% chance reflect 5 dmg',
        color: '#795548',
        icon:  '🌵',
    },
    upgrade_aoe_swing: {
        id:    'upgrade_aoe_swing',
        name:  'Wide Swing',
        desc:  'Attack range +10%',
        color: '#ff9800',
        icon:  '🌀',
    },
    upgrade_xp_magnet: {
        id:    'upgrade_xp_magnet',
        name:  'XP Magnet',
        desc:  '+15% XP gain this run',
        color: '#9c27b0',
        icon:  '🧲',
    },
    upgrade_shield: {
        id:    'upgrade_shield',
        name:  'Barrier',
        desc:  '+1 shield charge per room',
        color: '#00bcd4',
        icon:  '🔷',
    },
    upgrade_regen: {
        id:    'upgrade_regen',
        name:  'Regeneration',
        desc:  'Heal 1 HP every 3s',
        color: '#4caf50',
        icon:  '💗',
    },
};

export const RUN_UPGRADE_IDS = Object.keys(RUN_UPGRADE_DEFINITIONS);

// Cumulative boss kills needed to unlock each run upgrade (6 thresholds for 6 upgrades)
export const RUN_UPGRADE_UNLOCK_THRESHOLDS = [3, 7, 12, 18, 25, 35];

// ── Per-Run Reward Tracking ──

let _runRewards = _createRunRewards();

function _createRunRewards() {
    return {
        coreShardsGainedThisRun: 0,
        bossesDefeatedThisRun:   0,
        relicUnlockedThisRun:    null,    // relicId | null
        runUpgradeUnlockedThisRun: null,  // upgradeId | null
        firstBossClaimedThisRun: false,
    };
}

export function resetRunRewards() {
    _runRewards = _createRunRewards();
}

export function getRunRewards() {
    return _runRewards;
}

// ── Boss Kill Processing ──

/**
 * Call this when a boss dies. Returns an object describing what was awarded.
 * @param {number} stage  – current game stage
 * @param {number} bossNumberInRun  – how many bosses killed this run (1-based after increment)
 * @returns {{ shardsGained: number, relicId: string|null, runUpgradeId: string|null }}
 */
export function processBossKill(stage, bossNumberInRun) {
    const state = MetaStore.getState();
    const result = { shardsGained: 0, relicId: null, runUpgradeId: null };

    // 1) Core Shards
    let shards = BOSS_SHARD_REWARD;
    if (!_runRewards.firstBossClaimedThisRun) {
        shards += FIRST_BOSS_BONUS;
        _runRewards.firstBossClaimedThisRun = true;
    }
    state.totalCoreShards += shards;
    _runRewards.coreShardsGainedThisRun += shards;
    result.shardsGained = shards;

    // 2) Track boss kill
    _runRewards.bossesDefeatedThisRun++;
    state.stats.bossesKilledTotal++;

    // 3) Maybe drop a relic (10% if any locked)
    const lockedRelics = getLockedRelicIds();
    if (lockedRelics.length > 0 && Math.random() < RELIC_DROP_CHANCE) {
        const idx = Math.floor(Math.random() * lockedRelics.length);
        const relicId = lockedRelics[idx];
        unlockRelic(relicId);
        _runRewards.relicUnlockedThisRun = relicId;
        result.relicId = relicId;
    }

    // 4) Maybe unlock a run upgrade (based on cumulative boss kills)
    const totalBossKills = state.stats.bossesKilledTotal;
    const unlockedUpgrades = state.runUpgradesUnlocked;
    const unlockedCount = RUN_UPGRADE_IDS.filter(id => unlockedUpgrades[id]).length;
    if (unlockedCount < RUN_UPGRADE_UNLOCK_THRESHOLDS.length) {
        const threshold = RUN_UPGRADE_UNLOCK_THRESHOLDS[unlockedCount];
        if (totalBossKills >= threshold) {
            const lockedUpgrades = RUN_UPGRADE_IDS.filter(id => !unlockedUpgrades[id]);
            const idx = Math.floor(Math.random() * lockedUpgrades.length);
            const upgradeId = lockedUpgrades[idx];
            state.runUpgradesUnlocked[upgradeId] = true;
            _runRewards.runUpgradeUnlockedThisRun = upgradeId;
            result.runUpgradeId = upgradeId;
        }
    }

    // 5) Update highest stage
    if (stage > state.stats.highestStage) {
        state.stats.highestStage = stage;
    }

    MetaStore.save();
    return result;
}

/**
 * Optional: rare shard from normal room clear (1% chance).
 * Returns shards gained (0 or 1).
 */
export function processRoomClear() {
    if (Math.random() < RARE_ROOM_SHARD_CHANCE) {
        const state = MetaStore.getState();
        state.totalCoreShards += 1;
        _runRewards.coreShardsGainedThisRun += 1;
        MetaStore.save();
        return 1;
    }
    return 0;
}

// ── Run Start / End ──

/**
 * Call at run start. Increments runsPlayed, returns combined modifiers.
 */
export function onRunStart() {
    const state = MetaStore.getState();
    state.stats.runsPlayed++;
    MetaStore.save();
    resetRunRewards();

    return computeAllModifiers();
}

/**
 * Call at game over to finalize stats.
 */
export function onRunEnd(stage) {
    const state = MetaStore.getState();
    if (stage > state.stats.highestStage) {
        state.stats.highestStage = stage;
    }
    MetaStore.save();
}

// ── Combined Modifiers ──

/**
 * Merge perk + relic modifiers into a single object.
 */
export function computeAllModifiers() {
    const perk = computePerkModifiers();
    const relic = computeRelicModifiers();

    return {
        hpMultiplier:           perk.hpMultiplier,
        damageMultiplier:       perk.damageMultiplier * 1,  // relics don't add general dmg
        speedMultiplier:        perk.speedMultiplier * relic.speedMultiplier,
        xpMultiplier:           perk.xpMultiplier * relic.xpMultiplier,
        bossDamageMultiplier:   relic.bossDamageMultiplier,
        damageTakenMultiplier:  relic.damageTakenMultiplier,
        healOnLevelUpPct:       relic.healOnLevelUpPct,
        startingXpBonus:        relic.startingXpBonus,
        spikeDamageMultiplier:  relic.spikeDamageMultiplier,
        lavaDotMultiplier:      relic.lavaDotMultiplier,
    };
}

/**
 * Get list of unlocked run upgrade IDs (for level-up pool).
 */
export function getUnlockedRunUpgradeIds() {
    return RUN_UPGRADE_IDS.filter(id => MetaStore.getState().runUpgradesUnlocked[id]);
}
