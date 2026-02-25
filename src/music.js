// ── MP3 Music Engine ─────────────────────────────────────────────────
// Plays actionadventure.mp3 as looping background music.
// Shares the AudioContext with the SFX engine (audio.js).
// Keeps the same public API as the old procedural music engine.
// ─────────────────────────────────────────────────────────────────────

import { getContext as _getSharedCtx } from './audio.js';

const MUSIC_STORAGE_KEY = 'dungeon_music_enabled';
const MUSIC_PATH = 'assets/sfx/actionadventure.mp3';

// ── State ──
let _ctx         = null;
let _master      = null;   // GainNode — music master volume
let _muted       = false;
let _enabled     = true;
let _initialized = false;
let _isPlaying   = false;

// ── Danger-based volume ──
let _danger       = 0;     // current interpolated danger 0–1
let _targetDanger = 0;     // target from game
const _VOL_LOW    = 0.06;  // quiet ambient during exploration
const _VOL_HIGH   = 0.30;  // full volume during intense combat

// ── Audio nodes ──
let _source      = null;   // AudioBufferSourceNode (looping)
let _buffer      = null;   // Decoded AudioBuffer

// ═════════════════════════════════════════════════════════════════════
//  Internal Helpers
// ═════════════════════════════════════════════════════════════════════

/** Ensure AudioContext + master gain exist */
function _ensureCtx() {
    if (_ctx) return _ctx;
    _ctx = _getSharedCtx();
    if (!_ctx) return null;

    _master = _ctx.createGain();
    _master.gain.value = _muted ? 0 : _VOL_LOW;
    _master.connect(_ctx.destination);

    return _ctx;
}

/** Fetch + decode MP3 into AudioBuffer (cached) */
async function _loadBuffer() {
    if (_buffer) return _buffer;
    const ctx = _ensureCtx();
    if (!ctx) return null;
    try {
        const resp = await fetch(MUSIC_PATH);
        const arr  = await resp.arrayBuffer();
        _buffer    = await ctx.decodeAudioData(arr);
        return _buffer;
    } catch (e) {
        console.warn('[Music] Failed to load:', MUSIC_PATH, e);
        return null;
    }
}

/** Create a looping AudioBufferSourceNode and start playback */
async function _playLoop() {
    const buf = await _loadBuffer();
    if (!buf || !_isPlaying) return;          // stopped while loading

    _source        = _ctx.createBufferSource();
    _source.buffer = buf;
    _source.loop   = true;
    _source.connect(_master);
    _source.start(0);
}

// ═════════════════════════════════════════════════════════════════════
//  Public API
// ═════════════════════════════════════════════════════════════════════

/** Call once — creates AudioContext on first user gesture */
export function initMusic() {
    if (_initialized) return;
    const ctx = _ensureCtx();
    if (!ctx) return;

    // Load enabled preference from localStorage
    try {
        const s = localStorage.getItem(MUSIC_STORAGE_KEY);
        if (s !== null) _enabled = s !== '0';
    } catch (e) { /* noop */ }

    // Pre-load the MP3 in the background
    _loadBuffer();

    _initialized = true;
}

/** Start playing the looped music track */
export function startMusic() {
    if (!_enabled || _isPlaying) return;
    const ctx = _ensureCtx();
    if (!ctx) return;

    _isPlaying = true;
    _playLoop();
}

/** Stop music with a short fade-out */
export function stopMusic() {
    if (!_isPlaying) return;
    _isPlaying = false;

    if (_source) {
        try {
            const t = _ctx.currentTime;
            _master.gain.cancelScheduledValues(t);
            _master.gain.setValueAtTime(_master.gain.value, t);
            _master.gain.linearRampToValueAtTime(0, t + 0.3);
            _source.stop(t + 0.35);
        } catch (e) { /* already stopped */ }
        _source = null;
    }

    _danger       = 0;
    _targetDanger = 0;

    // Restore master gain for next play
    setTimeout(() => {
        if (_master && !_isPlaying) {
            _master.gain.value = _muted ? 0 : _VOL_LOW;
        }
    }, 400);
}

/** Set target danger level 0–1 (scales music volume) */
export function setDanger(level) {
    _targetDanger = Math.max(0, Math.min(1, level));
}

/** Call every frame — smoothly adjusts volume based on danger */
export function updateMusic(dt) {
    if (!_isPlaying || !_master || !_ctx) return;

    // Smooth interpolation (rises fast, falls slower)
    const riseSpeed = 2.5;
    const fallSpeed = 0.5;
    if (_danger < _targetDanger) {
        _danger = Math.min(_targetDanger, _danger + riseSpeed * dt);
    } else if (_danger > _targetDanger) {
        _danger = Math.max(_targetDanger, _danger - fallSpeed * dt);
    }

    // Map danger to volume
    const targetVol = _muted ? 0 : _VOL_LOW + (_VOL_HIGH - _VOL_LOW) * _danger;
    const t = _ctx.currentTime;
    _master.gain.cancelScheduledValues(t);
    _master.gain.setValueAtTime(_master.gain.value, t);
    _master.gain.linearRampToValueAtTime(targetVol, t + 0.15);
}

/** Sync with global SFX mute toggle (M key) */
export function setMusicMuted(muted) {
    _muted = muted;
    if (_master && _ctx) {
        const t = _ctx.currentTime;
        _master.gain.cancelScheduledValues(t);
        _master.gain.setValueAtTime(_master.gain.value, t);
        const vol = _VOL_LOW + (_VOL_HIGH - _VOL_LOW) * _danger;
        _master.gain.linearRampToValueAtTime(
            _muted ? 0 : vol,
            t + 0.05,
        );
    }
}

/** Toggle music enabled/disabled (persisted to localStorage) */
export function toggleMusicEnabled() {
    _enabled = !_enabled;
    try { localStorage.setItem(MUSIC_STORAGE_KEY, _enabled ? '1' : '0'); } catch (e) { /* noop */ }

    if (_enabled && !_isPlaying) {
        startMusic();
    } else if (!_enabled && _isPlaying) {
        stopMusic();
    }

    return _enabled;
}

export function isMusicEnabled() { return _enabled; }
export function isMusicPlaying() { return _isPlaying; }
