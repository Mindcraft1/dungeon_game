// ── Adaptive Dungeon Music Engine ────────────────────────────────────
// Dark, atmospheric procedural music for a dungeon crawler.
// Shares the AudioContext with the SFX engine (audio.js).
//
// 5 sequenced layers crossfade based on game danger level (0–1):
//   Layer 0 — Dark Pad        (danger > 0)     Filtered sawtooth chords
//   Layer 1 — Dungeon Bass    (danger > 0.10)  Gritty sub-bass
//   Layer 2 — Tribal Drums    (danger > 0.25)  Kicks, toms, metals, hats
//   Layer 3 — Haunting Lead   (danger > 0.45)  Phrygian melody + echo
//   Layer 4 — Combat Stabs    (danger > 0.70)  Dissonant chord hits
//
// Scale: D Phrygian (D Eb F G A Bb C) — dark medieval sound.
// BPM: 80 (exploring) → 130 (intense combat).
// Patterns alternate A/B every 4-bar loop for variety.
// All notes are step-sequenced — no continuous oscillators.
// Zero external files — fully synthesized at runtime.
// ─────────────────────────────────────────────────────────────────────

import { getContext as _getSharedCtx } from './audio.js';

const MUSIC_STORAGE_KEY = 'dungeon_music_enabled';

// ── State ──
let _ctx          = null;   // AudioContext (shared with audio.js)
let _master       = null;   // GainNode — music master volume
let _muted        = false;
let _volume       = 0.35;
let _enabled      = true;
let _initialized  = false;

// ── Danger tracking (smoothly interpolated) ──
let _danger       = 0;
let _targetDanger = 0;

// ── Step-sequencer state ──
let _isPlaying      = false;
let _schedulerTimer = null;
let _nextNoteTime   = 0;
let _currentStep    = 0;
let _loopCount      = 0;    // increments every 64 steps for pattern variation
const STEPS     = 64;       // 4 bars × 16 sixteenth-notes
const LOOKAHEAD = 0.12;     // seconds to schedule ahead
const TICK_MS   = 25;       // scheduler polling interval

// ── Layer gain nodes ──
let _padGain  = null;
let _bassGain = null;
let _drumGain = null;
let _leadGain = null;
let _stabGain = null;

// ── Reusable noise buffer (shared by percussion) ──
let _noiseBuffer = null;

// ═════════════════════════════════════════════════════════════════════
//  D Phrygian Scale Frequencies
//  (D Eb F G A Bb C — the flat 2nd gives a dark, medieval character)
// ═════════════════════════════════════════════════════════════════════
const D2 = 73.42, Eb2 = 77.78, F2 = 87.31, G2 = 98.00, A2 = 110.00, Bb2 = 116.54, C3 = 130.81;
const D3 = 146.83, Eb3 = 155.56, F3 = 174.61, G3 = 196.00, A3 = 220.00, Bb3 = 233.08, C4 = 261.63;
const D4 = 293.66, Eb4 = 311.13, F4 = 349.23, G4 = 392.00, A4 = 440.00, Bb4 = 466.16, C5 = 523.25, D5 = 587.33;

// ═════════════════════════════════════════════════════════════════════
//  PATTERNS — 64 steps each (4 bars of 16th-notes)
//  0 = rest, frequency = play that note, 1 = trigger hit
// ═════════════════════════════════════════════════════════════════════

// ── Dark Pad (sparse whole-note chords, slow atmospheric) ──
const PAD_A = [
    D3, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    Bb3,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    F3, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    A3, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
];
const PAD_B = [
    A3, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    D3, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    C4, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    F3, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
];

// ── Dungeon Bass ──
// Calm: dark whole notes
const BASS_CALM = [
    D2, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    Bb2,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    A2, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    D2, 0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
];
// Mid: syncopated quarter-notes with movement
const BASS_MID_A = [
    D2, 0,0,0, 0,0,D3,0, Bb2,0,0,0, 0,0,A2,0,
    D2, 0,0,0, F2, 0,0,0, A2, 0,0,0, D3, 0,0,0,
    D2, 0,Bb2,0, 0,0,A2,0, D2, 0,0,0, F2, 0,D3,0,
    D2, 0,0,0, Bb2,0,0,0, A2, 0,D2,0, 0,0,D3,0,
];
const BASS_MID_B = [
    D2, 0,0,0, A2, 0,0,0, Bb2,0,0,0, F2, 0,0,0,
    D2, 0,0,0, 0,0,D3,0, A2, 0,0,0, 0,0,Bb2,0,
    D2, 0,0,0, F2, 0,0,0, Bb2,0,A2,0, 0,0,0,0,
    D2, 0,0,0, D3, 0,0,0, Bb2,0,0,0, A2, 0,0,0,
];
// Intense: driving eighth-notes
const BASS_INTENSE = [
    D2,0,D3,0, Bb2,0,A2,0, D2,0,F2,0, D3,0,D2,0,
    Eb2,0,F2,0, D2,0,A2,0, Bb2,0,D3,0, A2,0,D2,0,
    D2,0,D3,0, A2,0,Bb2,0, D2,0,F2,0, D3,0,A2,0,
    D2,0,Bb2,0, D3,0,A2,0, F2,0,D2,0, D3,0,Bb2,0,
];

// ── Tribal Drums ──
// Kick: basic (half-time) → intense (driving)
const KICK_BASIC = [
    1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
    1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
    1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
    1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0,
];
const KICK_INTENSE = [
    1,0,0,0, 1,0,0,0, 1,0,0,0, 0,0,1,0,
    1,0,0,0, 1,0,0,0, 1,0,1,0, 0,0,0,0,
    1,0,0,0, 1,0,0,0, 1,0,0,0, 0,0,1,0,
    1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,0,0,
];

// Tom: deep tribal accents
const TOM = [
    0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0,
    0,0,0,0, 1,0,0,0, 0,0,0,0, 0,0,0,0,
    0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0,
];

// Hi-hat: off-beat groove (only at higher danger)
const HIHAT = [
    0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
    0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
    0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
    0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,
];

// Metallic clang: sparse eerie accents
const METAL = [
    0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
];

// ── Haunting Lead Melody (D Phrygian phrases) ──
// A: ascending dark motif + answer phrase
const MELODY_A = [
    D4, 0,0,0, Eb4,0,0,0, F4, 0,0,0, D4, 0,0,0,
    0,  0,0,0, 0,  0,0,0, 0,  0,0,0, 0,  0,0,0,
    A3, 0,0,0, Bb3,0,0,0, A3, 0,0,0, G3, 0,0,0,
    0,  0,0,0, 0,  0,0,0, 0,  0,0,0, 0,  0,0,0,
];
// B: descending minor phrase
const MELODY_B = [
    D4, 0,0,0, C4, 0,0,0, Bb3,0,0,0, A3, 0,0,0,
    0,  0,0,0, 0,  0,0,0, D4, 0,0,0, 0,  0,0,0,
    F4, 0,0,0, Eb4,0,0,0, D4, 0,0,0, C4, 0,0,0,
    0,  0,0,0, 0,  0,0,0, Bb3,0,A3,0, 0,  0,0,0,
];
// Intense: fast aggressive runs
const MELODY_INTENSE = [
    D4,0,F4,0, Eb4,0,D4,0, A3,0,Bb3,0, D4,0,0,0,
    D5,0,C5,0, Bb4,0,A4,0, G4,0,F4,0, D4,0,0,0,
    D4,0,Eb4,0, F4,0,G4,0, A4,0,Bb4,0, A4,0,0,0,
    F4,0,D4,0, Eb4,0,F4,0, D4,0,0,0, 0,0,0,0,
];

// ── Combat Stabs (dissonant hits for maximum tension) ──
const STAB = [
    1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0,
    0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,
    0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,0,0,
    1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0,
];

// ═════════════════════════════════════════════════════════════════════
//  Internal Helpers
// ═════════════════════════════════════════════════════════════════════

function _ensureCtx() {
    if (_ctx) return _ctx;
    const shared = _getSharedCtx();
    if (!shared) return null;
    try {
        _ctx = shared;
        _master = _ctx.createGain();
        _master.gain.value = _muted ? 0 : _volume;
        _master.connect(_ctx.destination);

        // Pre-create reusable noise buffer (0.15 s white noise)
        const sr  = _ctx.sampleRate;
        const len = Math.floor(sr * 0.15);
        _noiseBuffer = _ctx.createBuffer(1, len, sr);
        const data = _noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) {
        return null;
    }
    return _ctx;
}

/** BPM scales with danger: 80 (exploring) → 130 (intense) */
function _getBPM() { return 80 + _danger * 50; }

/** Seconds per sixteenth-note at current BPM */
function _stepDur() { return 60 / _getBPM() / 4; }

// ═════════════════════════════════════════════════════════════════════
//  Sound Synthesis — each function creates short-lived nodes
// ═════════════════════════════════════════════════════════════════════

// ── Dark Pad: filtered dual-sawtooth for rich, warm atmosphere ──
function _playPad(freq, time) {
    if (!_ctx || !_padGain) return;
    const dur    = _stepDur() * 14;  // long sustain, overlaps next note
    const cutoff = 300 + _danger * 500;

    // Two detuned sawtooth oscillators → filtered → envelope
    const o1 = _ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = freq;

    const o2 = _ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = freq * 1.005;  // ~8 cent detune for shimmer

    const flt = _ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(cutoff, time);
    // Subtle filter sweep for movement
    flt.frequency.linearRampToValueAtTime(cutoff * 1.3, time + dur * 0.3);
    flt.frequency.linearRampToValueAtTime(cutoff * 0.7, time + dur);
    flt.Q.value = 0.7;

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.001, time);
    env.gain.linearRampToValueAtTime(0.35, time + 0.5);   // slow attack
    env.gain.setValueAtTime(0.35, time + dur * 0.4);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);

    o1.connect(flt);
    o2.connect(flt);
    flt.connect(env);
    env.connect(_padGain);

    o1.start(time);
    o1.stop(time + dur + 0.05);
    o2.start(time);
    o2.stop(time + dur + 0.05);
}

// ── Dungeon Bass: gritty filtered sawtooth + sine sub ──
function _playBass(freq, time) {
    if (!_ctx || !_bassGain) return;
    const dur    = _stepDur() * 3;
    const cutoff = 150 + _danger * 250;

    // Main: sawtooth through lowpass for grit
    const o = _ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;

    // Sub: clean sine at same frequency for body
    const sub = _ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq;

    const flt = _ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = cutoff;
    flt.Q.value = 1.5;

    const subMix = _ctx.createGain();
    subMix.gain.value = 0.4;

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.001, time);
    env.gain.linearRampToValueAtTime(0.7, time + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);

    o.connect(flt);
    sub.connect(subMix);
    subMix.connect(flt);
    flt.connect(env);
    env.connect(_bassGain);

    o.start(time);
    o.stop(time + dur + 0.02);
    sub.start(time);
    sub.stop(time + dur + 0.02);
}

// ── Deep Kick: sine pitch-drop + noise transient ──
function _playKick(time) {
    if (!_ctx || !_drumGain) return;

    const o = _ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, time);
    o.frequency.exponentialRampToValueAtTime(25, time + 0.15);

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.7, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    o.connect(env);
    env.connect(_drumGain);
    o.start(time);
    o.stop(time + 0.27);

    // Noise click for attack
    if (_noiseBuffer) {
        const n = _ctx.createBufferSource();
        n.buffer = _noiseBuffer;
        const ng = _ctx.createGain();
        ng.gain.setValueAtTime(0.15, time);
        ng.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
        n.connect(ng);
        ng.connect(_drumGain);
        n.start(time);
        n.stop(time + 0.04);
    }
}

// ── Tribal Tom: deep pitched drum ──
function _playTom(time) {
    if (!_ctx || !_drumGain) return;

    const o = _ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(55, time + 0.12);

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.5, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    o.connect(env);
    env.connect(_drumGain);
    o.start(time);
    o.stop(time + 0.22);
}

// ── Hi-Hat: high-pass filtered noise burst ──
function _playHihat(time) {
    if (!_ctx || !_drumGain || !_noiseBuffer) return;

    const n = _ctx.createBufferSource();
    n.buffer = _noiseBuffer;

    const hp = _ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.15, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    n.connect(hp);
    hp.connect(env);
    env.connect(_drumGain);
    n.start(time);
    n.stop(time + 0.06);
}

// ── Metallic Clang: two inharmonic sine waves for eerie ring ──
function _playMetal(time) {
    if (!_ctx || !_drumGain) return;

    const o1 = _ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 840;

    const o2 = _ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 1420;  // non-harmonic ratio → metallic timbre

    const bp = _ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 2;

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.25, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    o1.connect(bp);
    o2.connect(bp);
    bp.connect(env);
    env.connect(_drumGain);

    o1.start(time);
    o1.stop(time + 0.14);
    o2.start(time);
    o2.stop(time + 0.14);
}

// ── Haunting Lead: resonant filtered square + echo for dungeon reverb ──
function _playLead(freq, time) {
    if (!_ctx || !_leadGain) return;
    const dur    = _stepDur() * 2;
    const cutoff = 700 + _danger * 1500;

    const o = _ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;

    const flt = _ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = cutoff;
    flt.Q.value = 4;  // resonant peak for character

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.001, time);
    env.gain.linearRampToValueAtTime(0.35, time + 0.015);
    env.gain.setValueAtTime(0.35, time + dur * 0.3);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);

    o.connect(flt);
    flt.connect(env);
    env.connect(_leadGain);

    o.start(time);
    o.stop(time + dur + 0.02);

    // Echo: quieter, darker copy delayed by ~120ms (dungeon reverb feel)
    const echoDelay = 0.12;
    const echoDur   = dur * 0.7;
    const echoTime  = time + echoDelay;

    const d = _ctx.createOscillator();
    d.type = 'square';
    d.frequency.value = freq;

    const dFlt = _ctx.createBiquadFilter();
    dFlt.type = 'lowpass';
    dFlt.frequency.value = cutoff * 0.5;  // darker echo
    dFlt.Q.value = 2;

    const dEnv = _ctx.createGain();
    dEnv.gain.setValueAtTime(0.001, echoTime);
    dEnv.gain.linearRampToValueAtTime(0.12, echoTime + 0.01);
    dEnv.gain.exponentialRampToValueAtTime(0.001, echoTime + echoDur);

    d.connect(dFlt);
    dFlt.connect(dEnv);
    dEnv.connect(_leadGain);

    d.start(echoTime);
    d.stop(echoTime + echoDur + 0.02);
}

// ── Dissonant Stab: D4 + Eb4 + A4 chord cluster ──
function _playStab(time) {
    if (!_ctx || !_stabGain) return;
    const dur = 0.12;

    const flt = _ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 2000;
    flt.Q.value = 1;

    const env = _ctx.createGain();
    env.gain.setValueAtTime(0.001, time);
    env.gain.linearRampToValueAtTime(0.5, time + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);

    flt.connect(env);
    env.connect(_stabGain);

    for (const f of [D4, Eb4, A4]) {
        const o = _ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(flt);
        o.start(time);
        o.stop(time + dur + 0.02);
    }
}

// ═════════════════════════════════════════════════════════════════════
//  Step Scheduler
// ═════════════════════════════════════════════════════════════════════

function _scheduleStep(step, time) {
    const alt = _loopCount % 2 === 0;  // alternate A/B patterns

    // ── Layer 0: Dark Pad (danger > 0) ──
    if (_danger > 0) {
        const pat  = alt ? PAD_A : PAD_B;
        const note = pat[step];
        if (note > 0) _playPad(note, time);
    }

    // ── Layer 1: Bass (danger > 0.10) ──
    if (_danger > 0.10) {
        let pat;
        if (_danger < 0.35)      pat = BASS_CALM;
        else if (_danger < 0.60) pat = alt ? BASS_MID_A : BASS_MID_B;
        else                     pat = BASS_INTENSE;
        const note = pat[step];
        if (note > 0) _playBass(note, time);
    }

    // ── Layer 2: Tribal Drums (danger > 0.25) ──
    if (_danger > 0.25) {
        const kickPat = _danger < 0.60 ? KICK_BASIC : KICK_INTENSE;
        if (kickPat[step]) _playKick(time);
        if (TOM[step])     _playTom(time);

        // Hats + metals at higher danger for fuller groove
        if (_danger > 0.50) {
            if (HIHAT[step]) _playHihat(time);
            if (METAL[step]) _playMetal(time);
        }
    }

    // ── Layer 3: Haunting Lead (danger > 0.45) ──
    if (_danger > 0.45) {
        let pat;
        if (_danger < 0.70) pat = alt ? MELODY_A : MELODY_B;
        else                pat = MELODY_INTENSE;
        const note = pat[step];
        if (note > 0) _playLead(note, time);
    }

    // ── Layer 4: Combat Stabs (danger > 0.70) ──
    if (_danger > 0.70) {
        if (STAB[step]) _playStab(time);
    }
}

function _tick() {
    if (!_ctx || !_isPlaying) return;
    while (_nextNoteTime < _ctx.currentTime + LOOKAHEAD) {
        _scheduleStep(_currentStep, _nextNoteTime);
        _nextNoteTime += _stepDur();
        _currentStep++;
        if (_currentStep >= STEPS) {
            _currentStep = 0;
            _loopCount++;
        }
    }
}

// ═════════════════════════════════════════════════════════════════════
//  Layer Volume Control (called every frame)
// ═════════════════════════════════════════════════════════════════════

function _updateLayers() {
    if (!_ctx || !_isPlaying) return;
    const t = _ctx.currentTime;
    const r = 0.5;  // gain ramp time — slow for smooth transitions

    // Pad: subtle backdrop, scales with danger
    if (_padGain) {
        const v = _danger <= 0 ? 0 : 0.03 + _danger * 0.07;  // 0.03 – 0.10
        _padGain.gain.cancelScheduledValues(t);
        _padGain.gain.setValueAtTime(_padGain.gain.value, t);
        _padGain.gain.linearRampToValueAtTime(v, t + r);
    }

    // Bass: fades in from danger 0.10
    if (_bassGain) {
        const v = _danger < 0.10 ? 0 : Math.min(0.18, (_danger - 0.10) * 0.22);
        _bassGain.gain.cancelScheduledValues(t);
        _bassGain.gain.setValueAtTime(_bassGain.gain.value, t);
        _bassGain.gain.linearRampToValueAtTime(v, t + r);
    }

    // Drums: fades in from danger 0.25
    if (_drumGain) {
        const v = _danger < 0.25 ? 0 : Math.min(0.14, (_danger - 0.25) * 0.20);
        _drumGain.gain.cancelScheduledValues(t);
        _drumGain.gain.setValueAtTime(_drumGain.gain.value, t);
        _drumGain.gain.linearRampToValueAtTime(v, t + r);
    }

    // Lead: fades in from danger 0.45
    if (_leadGain) {
        const v = _danger < 0.45 ? 0 : Math.min(0.09, (_danger - 0.45) * 0.18);
        _leadGain.gain.cancelScheduledValues(t);
        _leadGain.gain.setValueAtTime(_leadGain.gain.value, t);
        _leadGain.gain.linearRampToValueAtTime(v, t + r);
    }

    // Stabs: fades in from danger 0.70
    if (_stabGain) {
        const v = _danger < 0.70 ? 0 : Math.min(0.06, (_danger - 0.70) * 0.20);
        _stabGain.gain.cancelScheduledValues(t);
        _stabGain.gain.setValueAtTime(_stabGain.gain.value, t);
        _stabGain.gain.linearRampToValueAtTime(v, t + r);
    }
}

// ── Node cleanup ──
function _cleanup() {
    for (const g of [_padGain, _bassGain, _drumGain, _leadGain, _stabGain]) {
        if (g) { try { g.disconnect(); } catch (e) { /* noop */ } }
    }
    _padGain = _bassGain = _drumGain = _leadGain = _stabGain = null;
}

// ═════════════════════════════════════════════════════════════════════
//  Public API
// ═════════════════════════════════════════════════════════════════════

/** Call once per frame — creates AudioContext on first user gesture */
export function initMusic() {
    if (_initialized) return;
    const ctx = _ensureCtx();
    if (!ctx) return;

    // Load enabled preference
    try {
        const s = localStorage.getItem(MUSIC_STORAGE_KEY);
        if (s !== null) _enabled = s !== '0';
    } catch (e) { /* noop */ }

    _initialized = true;
}

/** Start the adaptive music loop */
export function startMusic() {
    if (!_enabled || _isPlaying) return;
    const ctx = _ensureCtx();
    if (!ctx) return;

    _cleanup();
    _isPlaying    = true;
    _currentStep  = 0;
    _loopCount    = 0;
    _danger       = 0;
    _targetDanger = 0;
    _nextNoteTime = ctx.currentTime + 0.15;

    // Create per-layer gain nodes
    _padGain = ctx.createGain();
    _padGain.gain.value = 0;
    _padGain.connect(_master);

    _bassGain = ctx.createGain();
    _bassGain.gain.value = 0;
    _bassGain.connect(_master);

    _drumGain = ctx.createGain();
    _drumGain.gain.value = 0;
    _drumGain.connect(_master);

    _leadGain = ctx.createGain();
    _leadGain.gain.value = 0;
    _leadGain.connect(_master);

    _stabGain = ctx.createGain();
    _stabGain.gain.value = 0;
    _stabGain.connect(_master);

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

    // Smooth interpolation (rises fast, falls slower for musical tension)
    const riseSpeed = 2.5;
    const fallSpeed = 0.5;
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
        const t = _ctx.currentTime;
        _master.gain.cancelScheduledValues(t);
        _master.gain.setValueAtTime(_master.gain.value, t);
        _master.gain.linearRampToValueAtTime(
            _muted ? 0 : _volume,
            t + 0.05,
        );
    }
}

/** Toggle music enabled/disabled (persisted to localStorage) */
export function toggleMusicEnabled() {
    _enabled = !_enabled;
    try { localStorage.setItem(MUSIC_STORAGE_KEY, _enabled ? '1' : '0'); } catch (e) { /* noop */ }
    if (!_enabled && _isPlaying) stopMusic();
    return _enabled;
}

export function isMusicEnabled() { return _enabled; }
export function isMusicPlaying() { return _isPlaying; }
