// ── Adaptive Music Engine ────────────────────────────────────
// Procedural background music using Web Audio API.
// Four intensity layers crossfade based on game danger level (0–1):
//   Layer 0 — Drone pad    (always audible, filter opens with danger)
//   Layer 1 — Bass line    (fades in at danger > 0.08)
//   Layer 2 — Percussion   (fades in at danger > 0.25)
//   Layer 3 — Tension arp  (fades in at danger > 0.55)
// BPM also scales: 80 (calm) → 112 (intense).
// Zero external files — fully synthesized at runtime.
// ─────────────────────────────────────────────────────────────

const MUSIC_STORAGE_KEY = 'dungeon_music_enabled';
const AUDIO_MUTE_KEY    = 'dungeon_audio_muted';   // shared with audio.js

let _ctx    = null;      // AudioContext (separate from SFX)
let _master = null;      // master GainNode
let _muted  = false;
let _volume = 0.22;      // music master volume (intentionally quieter than SFX)
let _enabled     = true;
let _initialized = false;

// ── Danger tracking (smoothly interpolated) ──
let _danger       = 0;   // current
let _targetDanger = 0;   // set by game each frame

// ── Step-sequencer state ──
let _isPlaying      = false;
let _schedulerTimer = null;
let _nextNoteTime   = 0;
let _currentStep    = 0;
const STEPS     = 64;    // 4 bars × 16 sixteenth-notes
const LOOKAHEAD = 0.12;  // seconds to schedule ahead
const TICK_MS   = 30;    // scheduler polling interval

// ── Layer gain nodes (created per startMusic()) ──
let _droneGain = null;
let _bassGain  = null;
let _percGain  = null;
let _arpGain   = null;

// ── Drone oscillator refs (persistent while playing) ──
let _droneOscs   = [];   // [lfo, osc1, osc2, osc3]
let _droneFilter = null;

// ── Pre-computed noise buffer (reused for every kick/hihat) ──
let _noiseBuffer = null;

// ═════════════════════════════════════════════════════════════
//  D-minor scale frequencies
// ═════════════════════════════════════════════════════════════
const D2 = 73.42,  F2 = 87.31,  G2 = 98.00,  A2 = 110.00, Bb2 = 116.54;
const D3 = 146.83, F3 = 174.61, A3 = 220.00;
const D4 = 293.66, F4 = 349.23, A4 = 440.00, C5 = 523.25, D5 = 587.33;

// ═════════════════════════════════════════════════════════════
//  Patterns — 64 steps each (4 bars of 16th-notes)
//  0 = rest, frequency = play that note
// ═════════════════════════════════════════════════════════════

// Bass ── sparse whole-notes when calm
const BASS_CALM = [
    D2,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    A2,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    D2,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    F2,0,0,0, 0,0,0,0, A2,0,0,0, 0,0,0,0,
];

// Bass ── quarter-note movement during combat
const BASS_MID = [
    D2,0,0,0, D3,0,0,0, A2,0,0,0, F2,0,0,0,
    D2,0,0,0, D3,0,0,0, Bb2,0,0,0, A2,0,0,0,
    D2,0,0,0, D3,0,0,0, A2,0,0,0, G2,0,0,0,
    F2,0,0,0, A2,0,0,0, D3,0,0,0, D2,0,0,0,
];

// Bass ── driving eighth-notes at high danger
const BASS_INTENSE = [
    D2,0,D3,0, D2,0,F2,0, A2,0,D2,0, F2,0,A2,0,
    D2,0,D3,0, Bb2,0,A2,0, D2,0,D3,0, D2,0,F2,0,
    A2,0,D2,0, F2,0,D2,0, A2,0,D3,0, A2,0,F2,0,
    D2,0,D3,0, F2,0,A2,0, D3,0,D2,0, D2,0,D3,0,
];

// Kick drum (1 = hit)
const KICK = [
    1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
    1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
    1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
    1,0,0,0, 0,0,0,0, 1,0,0,0, 1,0,0,0,
];

// Hi-hat (off-beat)
const HIHAT = [
    0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
    0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
    0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
    0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0,
];

// Tension arpeggio — D-minor 7th (D F A C)
const ARP = [
    D4,0,0,0, F4,0,0,0, A4,0,0,0, C5,0,0,0,
    D5,0,0,0, C5,0,0,0, A4,0,0,0, F4,0,0,0,
    D4,0,0,0, A4,0,0,0, F4,0,0,0, D4,0,0,0,
    A3,0,0,0, D4,0,0,0, F4,0,0,0, A4,0,0,0,
];

// ═════════════════════════════════════════════════════════════
//  Internal helpers
// ═════════════════════════════════════════════════════════════

function _ensureCtx() {
    if (_ctx) return _ctx;
    try {
        _ctx = new (window.AudioContext || window.webkitAudioContext)();
        _master = _ctx.createGain();

        // Sync mute state with SFX (reads same localStorage key)
        try { _muted = localStorage.getItem(AUDIO_MUTE_KEY) === '1'; } catch (e) {}
        _master.gain.value = _muted ? 0 : _volume;
        _master.connect(_ctx.destination);

        // Pre-create reusable noise buffer (0.1 s white noise)
        const sr  = _ctx.sampleRate;
        const len = Math.floor(sr * 0.1);
        _noiseBuffer = _ctx.createBuffer(1, len, sr);
        const data = _noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) {
        return null;
    }
    return _ctx;
}

function _resume() {
    if (_ctx && _ctx.state === 'suspended') _ctx.resume();
}

/** BPM scales with danger: 80 → 112 */
function _getBPM() { return 80 + _danger * 32; }

/** Seconds per sixteenth-note */
function _stepDur() { return 60 / _getBPM() / 4; }

// ── Drone (continuous oscillators through a filtered pad) ────

function _createDrone() {
    if (!_ctx || _droneOscs.length > 0) return;
    const t = _ctx.currentTime;

    // Gain + filter chain
    _droneGain = _ctx.createGain();
    _droneGain.gain.setValueAtTime(0, t);
    _droneGain.connect(_master);

    _droneFilter = _ctx.createBiquadFilter();
    _droneFilter.type = 'lowpass';
    _droneFilter.frequency.setValueAtTime(150, t);
    _droneFilter.Q.value = 0.7;
    _droneFilter.connect(_droneGain);

    // Slow LFO modulates filter cutoff
    const lfo = _ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;
    const lfoAmp = _ctx.createGain();
    lfoAmp.gain.value = 60;
    lfo.connect(lfoAmp);
    lfoAmp.connect(_droneFilter.frequency);
    lfo.start(t);
    _droneOscs.push(lfo);

    // D2 triangle (root)
    const o1 = _ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = D2;
    o1.connect(_droneFilter);
    o1.start(t);
    _droneOscs.push(o1);

    // A2 sine, slightly detuned for chorus
    const o2 = _ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = A2;
    o2.detune.value = -6;
    o2.connect(_droneFilter);
    o2.start(t);
    _droneOscs.push(o2);

    // D3 sine (quiet harmonic depth)
    const o3 = _ctx.createOscillator();
    o3.type = 'sine';
    o3.frequency.value = D3;
    o3.detune.value = 4;
    const o3g = _ctx.createGain();
    o3g.gain.value = 0.25;
    o3.connect(o3g);
    o3g.connect(_droneFilter);
    o3.start(t);
    _droneOscs.push(o3);
}

function _destroyDrone() {
    for (const o of _droneOscs) {
        try { o.stop(); } catch (e) {}
        try { o.disconnect(); } catch (e) {}
    }
    _droneOscs = [];
    if (_droneFilter) { try { _droneFilter.disconnect(); } catch (e) {} _droneFilter = null; }
    if (_droneGain)   { try { _droneGain.disconnect(); }  catch (e) {} _droneGain = null; }
}

// ── Short-lived note generators ──────────────────────────────

function _playBass(freq, time) {
    if (!_ctx || !_bassGain) return;
    const dur = _stepDur() * 3.5;

    const o = _ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.001, time);
    env.gain.linearRampToValueAtTime(0.9, time + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);

    o.connect(env);
    env.connect(_bassGain);
    o.start(time);
    o.stop(time + dur + 0.02);
}

function _playKick(time) {
    if (!_ctx || !_percGain) return;

    // Sine with rapid pitch drop
    const o = _ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, time);
    o.frequency.exponentialRampToValueAtTime(35, time + 0.12);

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.7, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    o.connect(env);
    env.connect(_percGain);
    o.start(time);
    o.stop(time + 0.20);

    // Noise transient (click)
    if (_noiseBuffer) {
        const n = _ctx.createBufferSource();
        n.buffer = _noiseBuffer;
        const ng = _ctx.createGain();
        ng.gain.setValueAtTime(0.25, time);
        ng.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
        n.connect(ng);
        ng.connect(_percGain);
        n.start(time);
        n.stop(time + 0.04);
    }
}

function _playHihat(time) {
    if (!_ctx || !_percGain || !_noiseBuffer) return;

    const n = _ctx.createBufferSource();
    n.buffer = _noiseBuffer;

    const hp = _ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.35, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    n.connect(hp);
    hp.connect(env);
    env.connect(_percGain);
    n.start(time);
    n.stop(time + 0.06);
}

function _playArp(freq, time) {
    if (!_ctx || !_arpGain) return;
    const dur = _stepDur() * 2.5;

    const o = _ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;

    const flt = _ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 1200 + _danger * 800;
    flt.Q.value = 2;

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.001, time);
    env.gain.linearRampToValueAtTime(0.5, time + 0.01);
    env.gain.setValueAtTime(0.5, time + dur * 0.4);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);

    o.connect(flt);
    flt.connect(env);
    env.connect(_arpGain);
    o.start(time);
    o.stop(time + dur + 0.02);
}

// ── Step scheduler ───────────────────────────────────────────

function _scheduleStep(step, time) {
    // — Bass —
    if (_danger >= 0.08) {
        const pat  = _danger < 0.35 ? BASS_CALM
                   : _danger < 0.65 ? BASS_MID
                   :                   BASS_INTENSE;
        const note = pat[step];
        if (note > 0) _playBass(note, time);
    }

    // — Percussion (danger > 0.25) —
    if (_danger > 0.25) {
        if (KICK[step])  _playKick(time);
        if (HIHAT[step]) _playHihat(time);
    }

    // — Arp (danger > 0.55) —
    if (_danger > 0.55) {
        const note = ARP[step];
        if (note > 0) _playArp(note, time);
    }
}

function _tick() {
    if (!_ctx || !_isPlaying) return;
    while (_nextNoteTime < _ctx.currentTime + LOOKAHEAD) {
        _scheduleStep(_currentStep, _nextNoteTime);
        _nextNoteTime += _stepDur();
        _currentStep = (_currentStep + 1) % STEPS;
    }
}

// ── Layer volume control (called every frame) ────────────────

function _updateLayers() {
    if (!_ctx || !_isPlaying) return;
    const t = _ctx.currentTime;
    const r = 0.4;  // gain ramp time (seconds)

    // Drone: always audible, filter opens with danger
    if (_droneGain) {
        const v = 0.035 + _danger * 0.065;        // 0.035 – 0.10
        _droneGain.gain.linearRampToValueAtTime(v, t + r);
    }
    if (_droneFilter) {
        const cutoff = 120 + _danger * 600;        // 120 – 720 Hz
        _droneFilter.frequency.linearRampToValueAtTime(cutoff, t + r);
    }

    // Bass
    if (_bassGain) {
        const v = _danger < 0.08 ? 0 : Math.min(0.14, (_danger - 0.08) * 0.18);
        _bassGain.gain.linearRampToValueAtTime(v, t + r);
    }

    // Percussion
    if (_percGain) {
        const v = _danger < 0.25 ? 0 : Math.min(0.09, (_danger - 0.25) * 0.14);
        _percGain.gain.linearRampToValueAtTime(v, t + r);
    }

    // Arp
    if (_arpGain) {
        const v = _danger < 0.55 ? 0 : Math.min(0.06, (_danger - 0.55) * 0.14);
        _arpGain.gain.linearRampToValueAtTime(v, t + r);
    }
}

// ── Cleanup ──────────────────────────────────────────────────

function _cleanup() {
    _destroyDrone();
    for (const g of [_bassGain, _percGain, _arpGain]) {
        if (g) { try { g.disconnect(); } catch (e) {} }
    }
    _bassGain = _percGain = _arpGain = null;
}

// ═════════════════════════════════════════════════════════════
//  Public API
// ═════════════════════════════════════════════════════════════

/** Call once per frame — creates AudioContext on first user gesture */
export function initMusic() {
    if (_initialized) return;
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();

    // Load enabled preference
    try {
        const s = localStorage.getItem(MUSIC_STORAGE_KEY);
        if (s !== null) _enabled = s !== '0';
    } catch (e) {}

    _initialized = true;
}

/** Start the adaptive music loop */
export function startMusic() {
    if (!_enabled || _isPlaying) return;
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();

    _cleanup();                       // safety: clean any leftover nodes
    _isPlaying    = true;
    _currentStep  = 0;
    _danger       = 0;
    _targetDanger = 0;
    _nextNoteTime = ctx.currentTime + 0.15;

    // Create per-layer gain nodes
    _bassGain = ctx.createGain();
    _bassGain.gain.value = 0;
    _bassGain.connect(_master);

    _percGain = ctx.createGain();
    _percGain.gain.value = 0;
    _percGain.connect(_master);

    _arpGain = ctx.createGain();
    _arpGain.gain.value = 0;
    _arpGain.connect(_master);

    // Create drone pad (continuous oscillators)
    _createDrone();

    // Gentle 2-second fade-in for the drone
    if (_droneGain) {
        _droneGain.gain.setValueAtTime(0, ctx.currentTime);
        _droneGain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 2);
    }

    _schedulerTimer = setInterval(_tick, TICK_MS);
}

/** Stop all music immediately */
export function stopMusic() {
    if (!_isPlaying) return;
    _isPlaying = false;

    if (_schedulerTimer) {
        clearInterval(_schedulerTimer);
        _schedulerTimer = null;
    }

    _cleanup();
    _danger       = 0;
    _targetDanger = 0;
}

/** Set target danger level 0–1 (will be smoothly interpolated) */
export function setDanger(level) {
    _targetDanger = Math.max(0, Math.min(1, level));
}

/** Call every frame — smooths danger transitions + updates layer volumes */
export function updateMusic(dt) {
    if (!_isPlaying) return;

    // Smooth interpolation (rises fast, falls slower for suspense)
    const riseSpeed = 2.0;
    const fallSpeed = 1.0;
    if (_danger < _targetDanger) {
        _danger = Math.min(_targetDanger, _danger + riseSpeed * dt);
    } else if (_danger > _targetDanger) {
        _danger = Math.max(_targetDanger, _danger - fallSpeed * dt);
    }

    _updateLayers();
}

/** Sync with global SFX mute toggle (M key) */
export function setMusicMuted(muted) {
    _muted = muted;
    if (_master && _ctx) {
        _master.gain.linearRampToValueAtTime(
            _muted ? 0 : _volume,
            _ctx.currentTime + 0.05,
        );
    }
}

/** Toggle music enabled/disabled (persisted to localStorage) */
export function toggleMusicEnabled() {
    _enabled = !_enabled;
    try { localStorage.setItem(MUSIC_STORAGE_KEY, _enabled ? '1' : '0'); } catch (e) {}
    if (!_enabled && _isPlaying) stopMusic();
    return _enabled;
}

export function isMusicEnabled() { return _enabled; }
export function isMusicPlaying() { return _isPlaying; }
