// ── MP3 Music Engine ─────────────────────────────────────────────────
// Plays actionadventure.mp3 as looping background music.
// Shares the AudioContext with the SFX engine (audio.js).
// Keeps the same public API as the old procedural music engine.
// ─────────────────────────────────────────────────────────────────────

import { getContext as _getSharedCtx } from './audio.js';

const MUSIC_STORAGE_KEY = 'dungeon_music_enabled';

// ── Track library ──
const TRACKS = {
    jungle:         'assets/sfx/jungle.mp3',
    desert:         'assets/sfx/desert.mp3',
    wasteland:      'assets/sfx/wasteland.mp3',
    depth:          'assets/sfx/depth.mp3',
    space:          'assets/sfx/space.mp3',
    actionadventure:'assets/sfx/actionadventure.mp3',
};
// Per-track volume multiplier (default 1.0)
const TRACK_VOLUME = {
    wasteland: 1.5,
};
const DEFAULT_TRACK = 'jungle';

// ── State ──
let _ctx         = null;
let _master      = null;   // GainNode — music master volume
let _muted       = false;
let _enabled     = true;
let _initialized = false;
let _isPlaying   = false;
let _currentTrack = DEFAULT_TRACK;   // key into TRACKS

// ── Danger-based volume ──
let _danger       = 0;     // current interpolated danger 0–1
let _targetDanger = 0;     // target from game
const _VOL_LOW    = 0.06;  // quiet ambient during exploration
const _VOL_HIGH   = 0.30;  // full volume during intense combat

// ── Boss teaser overlay ──
let _overlaySource  = null;   // second AudioBufferSourceNode (looping)
let _overlayGain    = null;   // GainNode for overlay track
let _overlayLevel   = 0;      // current interpolated overlay 0–1
let _targetOverlay  = 0;      // target from game
let _overlayLoading = false;  // true while _startOverlay is awaiting
const _OVERLAY_MAX  = 0.08;   // max overlay volume (subtle teaser, never as loud as boss room)

// ── Audio nodes ──
let _source      = null;   // AudioBufferSourceNode (looping)
const _buffers   = {};     // path → AudioBuffer cache

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

/** Fetch + decode an MP3 into AudioBuffer (cached by path) */
async function _loadBuffer(path) {
    if (_buffers[path]) return _buffers[path];
    const ctx = _ensureCtx();
    if (!ctx) return null;
    try {
        const resp = await fetch(path);
        const arr  = await resp.arrayBuffer();
        _buffers[path] = await ctx.decodeAudioData(arr);
        return _buffers[path];
    } catch (e) {
        console.warn('[Music] Failed to load:', path, e);
        return null;
    }
}

/** Create a looping AudioBufferSourceNode and start playback */
async function _playLoop() {
    const path = TRACKS[_currentTrack];
    if (!path) return;
    const buf = await _loadBuffer(path);
    if (!buf || !_isPlaying) return;          // stopped while loading

    _source        = _ctx.createBufferSource();
    _source.buffer = buf;
    _source.loop   = true;
    _source.connect(_master);
    _source.start(0);
}

/** Start looping the overlay track (actionadventure) at zero volume */
async function _startOverlay() {
    if (_overlaySource || _overlayLoading || !_ctx) return;
    _overlayLoading = true;
    const path = TRACKS.actionadventure;
    const buf = await _loadBuffer(path);
    _overlayLoading = false;

    // Abort if stopped/muted/no-longer-needed while loading
    if (!buf || !_isPlaying || !_ctx) return;
    // Still wanted? (target may have gone to 0 during async load)
    if (_targetOverlay <= 0) return;

    _overlayGain = _ctx.createGain();
    _overlayGain.gain.value = 0;
    _overlayGain.connect(_ctx.destination);

    _overlaySource = _ctx.createBufferSource();
    _overlaySource.buffer = buf;
    _overlaySource.loop = true;
    _overlaySource.connect(_overlayGain);
    _overlaySource.start(0);
}

/** Stop and disconnect the overlay track */
function _stopOverlay() {
    if (_overlaySource) {
        try { _overlaySource.stop(); } catch (e) { /* noop */ }
        _overlaySource = null;
    }
    if (_overlayGain) {
        try { _overlayGain.disconnect(); } catch (e) { /* noop */ }
        _overlayGain = null;
    }
    _overlayLevel   = 0;
    _targetOverlay  = 0;
    _overlayLoading = false;
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

    // Pre-load all tracks in the background
    for (const path of Object.values(TRACKS)) _loadBuffer(path);

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
    _stopOverlay();

    // Restore master gain for next play
    setTimeout(() => {
        if (_master && !_isPlaying) {
            _master.gain.value = _muted ? 0 : _VOL_LOW;
        }
    }, 400);
}

/** Switch to a different music track (crossfades). Key must exist in TRACKS. */
export function setTrack(key) {
    if (!TRACKS[key] || key === _currentTrack) return;
    _currentTrack = key;
    _stopOverlay();   // kill any teaser overlay on track switch
    if (_isPlaying) {
        // Quick crossfade: stop current source, start new one
        if (_source && _ctx) {
            try {
                const t = _ctx.currentTime;
                const fadeGain = _ctx.createGain();
                fadeGain.gain.setValueAtTime(1, t);
                fadeGain.gain.linearRampToValueAtTime(0, t + 0.4);
                _source.disconnect();
                _source.connect(fadeGain);
                fadeGain.connect(_master);
                _source.stop(t + 0.45);
            } catch (e) { /* already stopped */ }
            _source = null;
        }
        _playLoop();
    }
}

/** Set target danger level 0–1 (scales music volume) */
export function setDanger(level) {
    _targetDanger = Math.max(0, Math.min(1, level));
}

/**
 * Set boss teaser overlay level 0–1.
 * 0 = no overlay, 1 = max teaser volume (still subtle).
 * Used on the stage before a boss to blend in actionadventure.mp3.
 */
export function setBossTeaser(level) {
    _targetOverlay = Math.max(0, Math.min(1, level));
    // Lazily start the overlay source when first needed
    if (_targetOverlay > 0 && !_overlaySource && _isPlaying) {
        _startOverlay();
    }
}

/** Call every frame — smoothly adjusts volume based on danger + overlay */
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

    // Map danger to volume (with per-track multiplier)
    const trackMult = TRACK_VOLUME[_currentTrack] || 1.0;
    const targetVol = _muted ? 0 : (_VOL_LOW + (_VOL_HIGH - _VOL_LOW) * _danger) * trackMult;
    const t = _ctx.currentTime;
    _master.gain.cancelScheduledValues(t);
    _master.gain.setValueAtTime(_master.gain.value, t);
    _master.gain.linearRampToValueAtTime(targetVol, t + 0.15);

    // ── Boss teaser overlay ──
    // Retry starting if target > 0 but source isn't running yet
    if (_targetOverlay > 0 && !_overlaySource && !_overlayLoading) {
        _startOverlay();
    }

    if (_overlayGain) {
        const overlaySpeed = 1.5;
        if (_overlayLevel < _targetOverlay) {
            _overlayLevel = Math.min(_targetOverlay, _overlayLevel + overlaySpeed * dt);
        } else if (_overlayLevel > _targetOverlay) {
            _overlayLevel = Math.max(_targetOverlay, _overlayLevel - overlaySpeed * dt);
        }
        const ov = (_muted || !_enabled) ? 0 : _overlayLevel * _OVERLAY_MAX;
        _overlayGain.gain.cancelScheduledValues(t);
        _overlayGain.gain.setValueAtTime(_overlayGain.gain.value, t);
        _overlayGain.gain.linearRampToValueAtTime(ov, t + 0.15);

        // Auto-cleanup when fully faded out
        if (_targetOverlay === 0 && _overlayLevel < 0.001) {
            _stopOverlay();
        }
    }
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
