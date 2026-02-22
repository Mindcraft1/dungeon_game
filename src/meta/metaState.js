// ── Meta Progression State ──────────────────────────────────
// Single source of truth for all meta progression data.
// Never mutated directly from outside — use metaStore and rewardSystem.
// ─────────────────────────────────────────────────────────────

/**
 * Create a fresh default meta state.
 */
export function createDefaultMetaState() {
    return {
        totalCoreShards: 0,
        spentCoreShards: 0,
        metaPerks: {
            vitality: 0,
            might:    0,
            haste:    0,
            wisdom:   0,
        },
        relicsUnlocked: {},          // Record<relicId, true>
        runUpgradesUnlocked: {},     // Record<upgradeId, true>
        unlockedAbilities: { shockwave: true },      // Record<abilityId, true>
        unlockedProcs:     { explosive_strikes: true }, // Record<procId, true>
        unlockedNodes:     {},                          // Record<nodeId, true>
        biomeMastery: {},                               // Record<biomeId, { bossesDefeated, bestStage }>
        stats: {
            bossesKilledTotal: 0,
            highestStage:      0,
            runsPlayed:        0,
        },
        selectedLoadout: {
            abilities: ['shockwave'],       // max 2 IDs
            procs:     ['explosive_strikes'], // max 2 IDs
        },
    };
}

/**
 * Validate and sanitize a loaded meta state, filling in any missing fields.
 * Returns a safe copy.
 */
export function validateMetaState(raw) {
    const defaults = createDefaultMetaState();
    if (!raw || typeof raw !== 'object') return defaults;

    return {
        totalCoreShards:  _int(raw.totalCoreShards, 0),
        spentCoreShards:  _int(raw.spentCoreShards, 0),
        metaPerks: {
            vitality: _clampInt(raw.metaPerks?.vitality, 0, 10),
            might:    _clampInt(raw.metaPerks?.might,    0, 10),
            haste:    _clampInt(raw.metaPerks?.haste,    0, 10),
            wisdom:   _clampInt(raw.metaPerks?.wisdom,   0, 10),
        },
        relicsUnlocked:      _objCopy(raw.relicsUnlocked),
        runUpgradesUnlocked: _objCopy(raw.runUpgradesUnlocked),
        unlockedAbilities:   _objCopyDefault(raw.unlockedAbilities, { shockwave: true }),
        unlockedProcs:       _objCopyDefault(raw.unlockedProcs, { explosive_strikes: true }),
        unlockedNodes:       _objCopy(raw.unlockedNodes),
        biomeMastery:        _validateBiomeMastery(raw.biomeMastery),
        stats: {
            bossesKilledTotal: _int(raw.stats?.bossesKilledTotal, 0),
            highestStage:      _int(raw.stats?.highestStage, 0),
            runsPlayed:        _int(raw.stats?.runsPlayed, 0),
        },
        selectedLoadout: _validateLoadout(raw.selectedLoadout),
    };
}

/** Available core shards (total − spent) */
export function getAvailableShards(state) {
    return state.totalCoreShards - state.spentCoreShards;
}

// ── Helpers ──

function _validateLoadout(raw) {
    const def = { abilities: ['shockwave'], procs: ['explosive_strikes'] };
    if (!raw || typeof raw !== 'object') return def;
    return {
        abilities: Array.isArray(raw.abilities)
            ? raw.abilities.filter(v => typeof v === 'string').slice(0, 2)
            : def.abilities,
        procs: Array.isArray(raw.procs)
            ? raw.procs.filter(v => typeof v === 'string').slice(0, 2)
            : def.procs,
    };
}

function _int(v, fallback) {
    const n = parseInt(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function _clampInt(v, min, max) {
    const n = parseInt(v);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}

function _objCopy(obj) {
    if (!obj || typeof obj !== 'object') return {};
    const out = {};
    for (const k of Object.keys(obj)) {
        if (obj[k] === true) out[k] = true;
    }
    return out;
}

/** Copy boolean record, merging with defaults to guarantee starters are present. */
function _objCopyDefault(obj, defaults) {
    const out = { ...defaults };
    if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
            if (obj[k] === true) out[k] = true;
        }
    }
    return out;
}

/** Validate biomeMastery: Record<biomeId, { bossesDefeated, bestStage }> */
function _validateBiomeMastery(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const out = {};
    for (const k of Object.keys(raw)) {
        const entry = raw[k];
        if (entry && typeof entry === 'object') {
            out[k] = {
                bossesDefeated: _int(entry.bossesDefeated, 0),
                bestStage:      _int(entry.bestStage, 0),
            };
        }
    }
    return out;
}
