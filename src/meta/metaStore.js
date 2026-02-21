// ── Meta Store (localStorage persistence) ──────────────────
// Loads, saves, and provides the singleton meta state.
// Each character profile has its own meta state.
// ─────────────────────────────────────────────────────────────

import { createDefaultMetaState, validateMetaState } from './metaState.js';

const STORAGE_PREFIX = 'dungeon_meta_v1';

/** @type {ReturnType<typeof createDefaultMetaState>} */
let _state = createDefaultMetaState();
let _currentProfileIndex = 0;

function _keyFor(profileIndex) {
    return `${STORAGE_PREFIX}_${profileIndex}`;
}

/**
 * Load meta state for a specific profile index.
 * Also handles one-time migration from the old shared key.
 * @param {number} profileIndex
 */
export function load(profileIndex = 0) {
    _currentProfileIndex = profileIndex;
    try {
        const key = _keyFor(profileIndex);
        let raw = localStorage.getItem(key);

        // Migration: if per-profile key doesn't exist, check old shared key
        if (!raw && profileIndex === 0) {
            const oldRaw = localStorage.getItem(STORAGE_PREFIX);
            if (oldRaw) {
                // Migrate old shared data to profile 0
                raw = oldRaw;
                localStorage.setItem(key, raw);
                localStorage.removeItem(STORAGE_PREFIX);
            }
        }

        if (raw) {
            _state = validateMetaState(JSON.parse(raw));
        } else {
            _state = createDefaultMetaState();
        }
    } catch (e) {
        console.warn('[meta] Failed to load meta state, resetting.', e);
        _state = createDefaultMetaState();
    }
}

/**
 * Save current meta state to localStorage for the current profile.
 */
export function save() {
    try {
        localStorage.setItem(_keyFor(_currentProfileIndex), JSON.stringify(_state));
    } catch (e) {
        console.warn('[meta] Failed to save meta state.', e);
    }
}

/**
 * Get the current meta state (readonly reference — mutate via helpers only).
 */
export function getState() {
    return _state;
}

/**
 * Delete meta data for a specific profile and shift higher indices down.
 * Call this BEFORE removing the profile from the profiles array.
 * @param {number} deletedIndex – the profile index being deleted
 * @param {number} totalProfiles – total profiles BEFORE deletion
 */
export function deleteProfileMeta(deletedIndex, totalProfiles) {
    // Remove the deleted profile's key
    localStorage.removeItem(_keyFor(deletedIndex));

    // Shift all higher-indexed profiles down by one
    for (let i = deletedIndex + 1; i < totalProfiles; i++) {
        const data = localStorage.getItem(_keyFor(i));
        if (data) {
            localStorage.setItem(_keyFor(i - 1), data);
        } else {
            localStorage.removeItem(_keyFor(i - 1));
        }
        localStorage.removeItem(_keyFor(i));
    }
}

/**
 * Completely reset meta progression for current profile.
 */
export function resetAll() {
    _state = createDefaultMetaState();
    save();
}

// Note: load() is no longer called on module init.
// game.js must call MetaStore.load(profileIndex) after loading profiles.
