// ── Achievement Engine ──────────────────────────────────────
// Listens to game events, maintains volatile run/room state,
// evaluates unlock conditions, and triggers unlocks + toasts.
// ─────────────────────────────────────────────────────────────

import { on } from './achievementEvents.js';
import * as Store from './achievementStore.js';
import { ACHIEVEMENTS, ALL_PICKUP_TYPES } from './achievementsList.js';
import { getBiomeCount } from '../biomes.js';
import { RELIC_COUNT } from '../meta/relics.js';

// ── Minimum enemy count for no-hit room achievements ──
const NO_HIT_MIN_ENEMIES = 10;

// ── Volatile runtime state ──

let _currentRun = null;
let _currentRoom = null;

// Toast callback (set by init)
let _onUnlock = null;  // (achievementDef) => void

function _resetRun() {
    _currentRun = {
        killsThisRun:           0,
        bossKillsThisRun:       0,
        coinsThisRun:           0,
        stagesReachedThisRun:   0,
        tookDamageThisRun:      false,
        damageEventsThisRun:    0,
        metaBoosterUsedThisRun: false,
        reviveUsedThisRun:      false,
        biomesVisitedThisRun:   new Set(),
        bossesNoHitThisRun:     0,
        bossesNoHitStreak:      0,
        noHitQualifyingRoomsStreak: 0,
        noHitQualifyingRoomsTotal:  0,
        trapRoomsClearedNoHitRun:   0,
        shopPurchasesThisRun:   0,
        runStartTime:           Date.now(),
        bossFightActive:        false,
        tookDamageDuringBoss:   false,
        playerLevel:            1,
    };
}

function _resetRoom() {
    _currentRoom = {
        enemyCountAtStart:  0,
        qualifiesForNoHit:  false,
        tookDamageInRoom:   false,
        hasTraps:           false,
    };
}

// ── Initialization ──

let _initialized = false;

/**
 * Initialize the achievement engine. Call once after Store.load().
 * @param {Function} onUnlock – callback when achievement unlocks: (achievementDef) => void
 */
export function init(onUnlock) {
    if (_initialized) {
        _onUnlock = onUnlock;
        return;
    }
    _initialized = true;
    _onUnlock = onUnlock;

    _resetRun();
    _resetRoom();

    // ── Event subscriptions ──

    on('run_start', _onRunStart);
    on('run_end', _onRunEnd);
    on('stage_entered', _onStageEntered);
    on('room_started', _onRoomStarted);
    on('room_cleared', _onRoomCleared);
    on('player_took_damage', _onPlayerTookDamage);
    on('enemy_killed', _onEnemyKilled);
    on('boss_fight_started', _onBossFightStarted);
    on('boss_killed', _onBossKilled);
    on('coins_gained', _onCoinsGained);
    on('shop_purchase_meta_booster', _onMetaBoosterPurchase);
    on('shop_purchase_run_item', _onRunShopPurchase);
    on('relic_unlocked', _onRelicUnlocked);
    on('meta_upgrade_bought', _onMetaUpgradeBought);
    on('biome_changed', _onBiomeChanged);
    on('pickup_collected', _onPickupCollected);
    on('player_level_changed', _onPlayerLevelChanged);
    on('revive_used', _onReviveUsed);
    on('meta_perk_maxed', _onMetaPerkMaxed);
}

// ── Unlock helper ──

function _tryUnlock(id) {
    if (Store.isUnlocked(id)) return;
    if (Store.unlock(id)) {
        const def = ACHIEVEMENTS.find(a => a.id === id);
        if (def && _onUnlock) _onUnlock(def);
    }
}

function _updateProgress(id, value) {
    Store.setProgress(id, value);
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (def && def.target && value >= def.target) {
        _tryUnlock(id);
    }
}

// ── Event handlers ──

function _onRunStart(payload) {
    _resetRun();
    _resetRoom();
    _currentRun.metaBoosterUsedThisRun = !!payload.metaBoosterActive;
    Store.incrementStat('totalRuns');
    Store.save();
}

function _onRunEnd(payload) {
    const stage = payload.stage || 0;
    if (stage > Store.getStat('highestStageEver')) {
        Store.setStat('highestStageEver', stage);
    }
    Store.save();
}

function _onStageEntered(payload) {
    const stage = payload.stage;
    _currentRun.stagesReachedThisRun = Math.max(_currentRun.stagesReachedThisRun, stage);

    // Stage milestones
    if (stage >= 5)  _tryUnlock('reach_stage_5');
    if (stage >= 8)  _tryUnlock('reach_stage_8');
    if (stage >= 15) _tryUnlock('reach_stage_15');
    if (stage >= 20) _tryUnlock('reach_stage_20');
    if (stage >= 30) _tryUnlock('reach_stage_30');
    if (stage >= 40) _tryUnlock('reach_stage_40');
    if (stage >= 50) _tryUnlock('reach_stage_50');

    // Speed runner: stage 10 within 10 minutes
    if (stage >= 10) {
        const elapsed = Date.now() - _currentRun.runStartTime;
        if (elapsed <= 10 * 60 * 1000) {
            _tryUnlock('reach_stage_10_fast');
        }
    }

    // No revive to stage 20
    if (stage >= 20 && !_currentRun.reviveUsedThisRun) {
        _tryUnlock('no_revive_to_stage_20');
    }

    // Minimalist: stage 20 without meta booster
    if (stage >= 20 && !_currentRun.metaBoosterUsedThisRun) {
        _tryUnlock('minimalist_stage_20');
    }

    // Perfect Run I: stage 10 without any damage
    if (stage >= 10 && !_currentRun.tookDamageThisRun) {
        _tryUnlock('no_damage_to_stage_10');
    }

    // Update highest stage stat
    if (stage > Store.getStat('highestStageEver')) {
        Store.setStat('highestStageEver', stage);
    }
}

function _onRoomStarted(payload) {
    _resetRoom();
    _currentRoom.enemyCountAtStart = payload.enemyCount || 0;
    _currentRoom.qualifiesForNoHit = (_currentRoom.enemyCountAtStart >= NO_HIT_MIN_ENEMIES);
    _currentRoom.hasTraps = !!payload.hasTraps;
}

function _onRoomCleared(payload) {
    // Only evaluate no-hit logic for qualifying rooms (≥10 enemies at start)
    if (!_currentRoom.qualifiesForNoHit) return;

    if (!_currentRoom.tookDamageInRoom) {
        // Successful no-hit clear of a qualifying room
        _currentRun.noHitQualifyingRoomsStreak++;
        _currentRun.noHitQualifyingRoomsTotal++;
        Store.incrementStat('roomsClearedNoHit');

        // Untouchable I
        _tryUnlock('untouchable_1');
        // Untouchable II
        if (_currentRun.noHitQualifyingRoomsStreak >= 2) _tryUnlock('untouchable_2');
        // Untouchable III
        if (_currentRun.noHitQualifyingRoomsStreak >= 3) _tryUnlock('untouchable_3');
        // Untouchable IV
        if (_currentRun.noHitQualifyingRoomsStreak >= 5) _tryUnlock('untouchable_5');

        // Trap Dancer: qualifying trap room cleared no-hit
        if (_currentRoom.hasTraps) {
            _currentRun.trapRoomsClearedNoHitRun++;
            Store.incrementStat('trapRoomsClearedNoHit');
            _updateProgress('trap_dancer_5', Store.getStat('trapRoomsClearedNoHit'));
        }
    } else {
        // Took damage in a qualifying room — reset streak
        _currentRun.noHitQualifyingRoomsStreak = 0;
    }

    Store.save();
}

function _onPlayerTookDamage(payload) {
    _currentRun.tookDamageThisRun = true;
    _currentRun.damageEventsThisRun++;

    // Boss fight damage tracking
    if (_currentRun.bossFightActive) {
        _currentRun.tookDamageDuringBoss = true;
    }

    // Only affect no-hit room tracking for qualifying rooms
    if (_currentRoom.qualifiesForNoHit) {
        _currentRoom.tookDamageInRoom = true;
    }
}

function _onEnemyKilled(payload) {
    _currentRun.killsThisRun++;
    Store.incrementStat('totalKills');

    const totalKills = Store.getStat('totalKills');
    _updateProgress('kills_100_total', totalKills);
    _updateProgress('kills_500_total', totalKills);
    _updateProgress('kills_1000_total', totalKills);

    // First Blood
    _tryUnlock('first_blood');
}

function _onBossFightStarted(payload) {
    _currentRun.bossFightActive = true;
    _currentRun.tookDamageDuringBoss = false;
}

function _onBossKilled(payload) {
    _currentRun.bossKillsThisRun++;
    _currentRun.bossFightActive = false;
    Store.incrementStat('totalBossKills');

    const totalBossKills = Store.getStat('totalBossKills');
    _updateProgress('boss_kills_10_total', totalBossKills);
    _updateProgress('boss_kills_20_total', totalBossKills);

    // First Boss Down
    _tryUnlock('first_boss_down');

    // Double Boss Slayer
    if (_currentRun.bossKillsThisRun >= 2) _tryUnlock('boss_kills_2_run');

    // Boss Hunter (3 in a run)
    if (_currentRun.bossKillsThisRun >= 3) _tryUnlock('boss_kills_3_run');

    // Pentakill (5 in a run)
    if (_currentRun.bossKillsThisRun >= 5) _tryUnlock('boss_kills_5_run');

    // Boss no-hit tracking
    if (!_currentRun.tookDamageDuringBoss) {
        _currentRun.bossesNoHitThisRun++;
        _currentRun.bossesNoHitStreak++;
        Store.incrementStat('bossesNoHitTotal');

        _tryUnlock('boss_no_hit_1');

        // Boss Rush: 3 bosses in a row no-hit
        if (_currentRun.bossesNoHitStreak >= 3) {
            _tryUnlock('boss_no_hit_3_streak');
        }
    } else {
        _currentRun.bossesNoHitStreak = 0;
    }

    // True Dungeon God check (re-check on every boss kill)
    _checkTrueDungeonGod();

    Store.save();
}

function _onCoinsGained(payload) {
    const amount = payload.amount || 0;
    _currentRun.coinsThisRun += amount;
    Store.incrementStat('coinsCollectedTotal', amount);

    if (_currentRun.coinsThisRun >= 50)  _tryUnlock('coins_50_run');
    if (_currentRun.coinsThisRun >= 100) _tryUnlock('coins_100_run');
    if (_currentRun.coinsThisRun >= 200) _tryUnlock('coins_200_run');
}

function _onMetaBoosterPurchase(payload) {
    _tryUnlock('buy_meta_booster');
}

function _onRunShopPurchase(payload) {
    _currentRun.shopPurchasesThisRun++;
    Store.incrementStat('runShopPurchasesTotal');

    if (_currentRun.shopPurchasesThisRun >= 10) {
        _tryUnlock('shopaholic_10_run');
    }
}

function _onRelicUnlocked(payload) {
    Store.incrementStat('relicsUnlockedCount');
    const count = Store.getStat('relicsUnlockedCount');

    _tryUnlock('unlock_1_relic');
    _updateProgress('unlock_3_relics', count);
    _updateProgress('unlock_all_relics', count);

    Store.save();
}

function _onMetaUpgradeBought(payload) {
    Store.incrementStat('metaUpgradesBoughtTotal');
    const count = Store.getStat('metaUpgradesBoughtTotal');

    _tryUnlock('buy_1_meta_upgrade');
    _updateProgress('meta_upgrades_10_total', count);

    Store.save();
}

function _onBiomeChanged(payload) {
    if (payload.biomeId && _currentRun) {
        _currentRun.biomesVisitedThisRun.add(payload.biomeId);
        if (_currentRun.biomesVisitedThisRun.size >= getBiomeCount()) {
            _tryUnlock('visit_all_biomes_run');
        }
    }
}

function _onPickupCollected(payload) {
    if (payload.pickupType) {
        Store.setPickupCollected(payload.pickupType);
        const collected = Store.getPickupTypesCollected();
        const collectedCount = ALL_PICKUP_TYPES.filter(t => collected[t]).length;
        _updateProgress('collector_pickups', collectedCount);
        Store.save();
    }
}

function _onPlayerLevelChanged(payload) {
    const level = payload.level || 1;
    _currentRun.playerLevel = level;

    if (level >= 5)  _tryUnlock('level_5_run');
    if (level >= 15) _tryUnlock('level_15_run');
}

function _onReviveUsed() {
    _currentRun.reviveUsedThisRun = true;
}

function _onMetaPerkMaxed(payload) {
    _tryUnlock('max_one_meta_perk');
}

// ── True Dungeon God check ──

function _checkTrueDungeonGod() {
    if (!_currentRun) return;
    if (_currentRun.stagesReachedThisRun < 50) return;
    if (_currentRun.metaBoosterUsedThisRun) return;
    if (_currentRun.reviveUsedThisRun) return;
    if (_currentRun.bossesNoHitThisRun < 5) return;
    if (_currentRun.damageEventsThisRun > 3) return;
    _tryUnlock('true_dungeon_god');
}

// ── Public helpers for UI ──

/**
 * Get progress value for display. Returns { current, target } or null.
 */
export function getDisplayProgress(achievementId) {
    const def = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!def) return null;

    // For progress-type achievements, return stored progress
    switch (achievementId) {
        case 'kills_100_total':
        case 'kills_500_total':
        case 'kills_1000_total':
            return { current: Store.getStat('totalKills'), target: def.target };
        case 'collector_pickups': {
            const collected = Store.getPickupTypesCollected();
            return { current: ALL_PICKUP_TYPES.filter(t => collected[t]).length, target: def.target };
        }
        case 'unlock_3_relics':
        case 'unlock_all_relics':
            return { current: Store.getStat('relicsUnlockedCount'), target: def.target };
        case 'meta_upgrades_10_total':
            return { current: Store.getStat('metaUpgradesBoughtTotal'), target: def.target };
        case 'boss_kills_10_total':
        case 'boss_kills_20_total':
            return { current: Store.getStat('totalBossKills'), target: def.target };
        case 'trap_dancer_5':
            return { current: Store.getStat('trapRoomsClearedNoHit'), target: def.target };
        default:
            return null;
    }
}

/**
 * Get runtime run state for display (e.g. HUD badge).
 */
export function getRunState() {
    return _currentRun;
}
