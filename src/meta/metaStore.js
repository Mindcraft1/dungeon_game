// ── Meta Store (localStorage persistence) ──────────────────
// Loads, saves, and provides the singleton meta state.
// ─────────────────────────────────────────────────────────────

import { createDefaultMetaState, validateMetaState } from './metaState.js';

const STORAGE_KEY = 'dungeon_meta_v1';

/** @type {ReturnType<typeof createDefaultMetaState>} */
let _state = createDefaultMetaState();

/**
 * Load meta state from localStorage (or reset to defaults).
 */
export function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
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
 * Save current meta state to localStorage.
 */
export function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
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
 * Completely reset meta progression (for debug / testing).
 */
export function resetAll() {
    _state = createDefaultMetaState();
    save();
}

// Load on module init so state is available immediately
load();
