// ── Achievement Persistence ─────────────────────────────────
// Stores unlocked achievements, cumulative stats, and progress
// counters in localStorage, keyed per profile.
// ─────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'dungeon_achievements_v1';

let _data = _createDefault();
let _profileIndex = 0;

function _createDefault() {
    return {
        unlocked: {},       // Record<achievementId, timestamp>
        stats: {
            totalKills:             0,
            totalBossKills:         0,
            totalRuns:              0,
            highestStageEver:       0,
            roomsClearedNoHit:      0,
            bossesNoHitTotal:       0,
            coinsCollectedTotal:    0,
            relicsUnlockedCount:    0,
            metaUpgradesBoughtTotal:0,
            runShopPurchasesTotal:  0,
            trapRoomsClearedNoHit:  0,
            pickupTypesCollected:   {},  // Record<pickupType, true>
        },
        progress: {},       // Record<achievementId, number> (for "X/1000" etc.)
    };
}

function _key(profileIndex) {
    return `${STORAGE_PREFIX}_${profileIndex}`;
}

function _validate(raw) {
    const def = _createDefault();
    if (!raw || typeof raw !== 'object') return def;
    return {
        unlocked: (raw.unlocked && typeof raw.unlocked === 'object') ? { ...raw.unlocked } : {},
        stats: {
            totalKills:              _int(raw.stats?.totalKills, 0),
            totalBossKills:          _int(raw.stats?.totalBossKills, 0),
            totalRuns:               _int(raw.stats?.totalRuns, 0),
            highestStageEver:        _int(raw.stats?.highestStageEver, 0),
            roomsClearedNoHit:       _int(raw.stats?.roomsClearedNoHit, 0),
            bossesNoHitTotal:        _int(raw.stats?.bossesNoHitTotal, 0),
            coinsCollectedTotal:     _int(raw.stats?.coinsCollectedTotal, 0),
            relicsUnlockedCount:     _int(raw.stats?.relicsUnlockedCount, 0),
            metaUpgradesBoughtTotal: _int(raw.stats?.metaUpgradesBoughtTotal, 0),
            runShopPurchasesTotal:   _int(raw.stats?.runShopPurchasesTotal, 0),
            trapRoomsClearedNoHit:   _int(raw.stats?.trapRoomsClearedNoHit, 0),
            pickupTypesCollected:    (raw.stats?.pickupTypesCollected && typeof raw.stats.pickupTypesCollected === 'object')
                                      ? { ...raw.stats.pickupTypesCollected } : {},
        },
        progress: (raw.progress && typeof raw.progress === 'object') ? { ...raw.progress } : {},
    };
}

function _int(v, fallback) {
    const n = parseInt(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// ── Public API ──

export function load(profileIndex = 0) {
    _profileIndex = profileIndex;
    try {
        const raw = localStorage.getItem(_key(profileIndex));
        _data = raw ? _validate(JSON.parse(raw)) : _createDefault();
    } catch (e) {
        console.warn('[achievements] Failed to load, resetting.', e);
        _data = _createDefault();
    }
}

export function save() {
    try {
        localStorage.setItem(_key(_profileIndex), JSON.stringify(_data));
    } catch (e) {
        console.warn('[achievements] Failed to save.', e);
    }
}

export function getData() {
    return _data;
}

export function isUnlocked(id) {
    return !!_data.unlocked[id];
}

export function unlock(id) {
    if (_data.unlocked[id]) return false;
    _data.unlocked[id] = Date.now();
    save();
    return true;
}

export function getProgress(id) {
    return _data.progress[id] || 0;
}

export function setProgress(id, value) {
    _data.progress[id] = value;
    // Don't save on every progress update — engine batches saves
}

export function getStat(key) {
    return _data.stats[key] || 0;
}

export function incrementStat(key, amount = 1) {
    if (_data.stats[key] === undefined) _data.stats[key] = 0;
    _data.stats[key] += amount;
}

export function setStat(key, value) {
    _data.stats[key] = value;
}

export function setPickupCollected(pickupType) {
    _data.stats.pickupTypesCollected[pickupType] = true;
}

export function getPickupTypesCollected() {
    return _data.stats.pickupTypesCollected;
}

export function getUnlockedCount() {
    return Object.keys(_data.unlocked).length;
}

/**
 * Delete achievement data for a profile and shift higher indices.
 */
export function deleteProfileAchievements(deletedIndex, totalProfiles) {
    localStorage.removeItem(_key(deletedIndex));
    for (let i = deletedIndex + 1; i < totalProfiles; i++) {
        const data = localStorage.getItem(_key(i));
        if (data) {
            localStorage.setItem(_key(i - 1), data);
        } else {
            localStorage.removeItem(_key(i - 1));
        }
        localStorage.removeItem(_key(i));
    }
}
