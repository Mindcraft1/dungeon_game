// ── Procedural Audio Engine ──────────────────────────────────
// Uses Web Audio API to synthesize all sound effects at runtime.
// Zero external files — works 100% offline.
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dungeon_audio_muted';

let _ctx = null;       // AudioContext (lazy-init)
let _master = null;    // GainNode master volume
let _muted = false;
let _volume = 0.35;    // master volume 0–1

// Lazy-init: browsers require a user gesture before AudioContext works
function _ensureCtx() {
    if (_ctx) return _ctx;
    try {
        _ctx = new (window.AudioContext || window.webkitAudioContext)();
        _master = _ctx.createGain();
        _master.gain.value = _muted ? 0 : _volume;
        _master.connect(_ctx.destination);

        // Load saved mute preference
        try {
            _muted = localStorage.getItem(STORAGE_KEY) === '1';
            _master.gain.value = _muted ? 0 : _volume;
        } catch (e) {}
    } catch (e) {
        // Web Audio not supported — all play functions become no-ops
        return null;
    }
    return _ctx;
}

// Resume suspended context (required after first user gesture in some browsers)
function _resume() {
    if (_ctx && _ctx.state === 'suspended') {
        _ctx.resume();
    }
}

// ── Helpers ──────────────────────────────────────────────────

/** Create a gain node connected to master */
function _gain(vol = 1) {
    const ctx = _ensureCtx();
    if (!ctx) return null;
    const g = ctx.createGain();
    g.gain.value = vol;
    g.connect(_master);
    return g;
}

/** Create an oscillator, connect to target, start/stop */
function _osc(type, freq, target, startTime, stopTime) {
    const ctx = _ensureCtx();
    if (!ctx) return null;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(target);
    o.start(startTime);
    o.stop(stopTime);
    return o;
}

/** Generate a short buffer of white noise */
function _noiseBuffer(duration = 0.1) {
    const ctx = _ensureCtx();
    if (!ctx) return null;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

/** Play a noise burst through a filter with envelope */
function _noiseBurst(filterFreq, filterQ, duration, vol, startTime) {
    const ctx = _ensureCtx();
    if (!ctx) return;
    const t = startTime || ctx.currentTime;
    const buf = _noiseBuffer(duration + 0.05);
    if (!buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;

    const env = ctx.createGain();
    env.gain.setValueAtTime(vol, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);

    src.connect(filter);
    filter.connect(env);
    env.connect(_master);
    src.start(t);
    src.stop(t + duration + 0.05);
}

// ── Sound Effects ────────────────────────────────────────────

/** Player melee attack — short swoosh */
export function playAttack() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Filtered noise swoosh
    _noiseBurst(3000, 1.5, 0.12, 0.25, t);

    // Quick pitch sweep
    const g = _gain(0.08);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(500, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    o.connect(g);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t);
    o.stop(t + 0.12);
}

/** Enemy hit by melee — impact thud */
export function playHit() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g = _gain(0.2);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    o.connect(g);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t);
    o.stop(t + 0.12);

    // Noise crack
    _noiseBurst(1500, 2, 0.05, 0.15, t);
}

/** Enemy killed — pop + descending tone */
export function playEnemyDeath() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Pop
    const g1 = _gain(0.2);
    if (!g1) return;
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(600, t);
    o1.frequency.exponentialRampToValueAtTime(100, t + 0.2);
    o1.connect(g1);
    g1.gain.setValueAtTime(0.2, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o1.start(t);
    o1.stop(t + 0.27);

    // Noise burst
    _noiseBurst(2000, 1, 0.08, 0.18, t);

    // Second tone
    const g2 = _gain(0.1);
    if (!g2) return;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(400, t + 0.05);
    o2.frequency.exponentialRampToValueAtTime(80, t + 0.2);
    o2.connect(g2);
    g2.gain.setValueAtTime(0.1, t + 0.05);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o2.start(t + 0.05);
    o2.stop(t + 0.22);
}

/** Player takes damage — dissonant thud */
export function playPlayerHurt() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Low thud
    const g1 = _gain(0.25);
    if (!g1) return;
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(150, t);
    o1.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    o1.connect(g1);
    g1.gain.setValueAtTime(0.25, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o1.start(t);
    o1.stop(t + 0.22);

    // Dissonant buzz
    const g2 = _gain(0.08);
    if (!g2) return;
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(180, t);
    o2.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    o2.connect(g2);
    g2.gain.setValueAtTime(0.08, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o2.start(t);
    o2.stop(t + 0.17);

    _noiseBurst(800, 1, 0.06, 0.12, t);
}

/** Phase Shield blocks a hit — metallic ping */
export function playShieldBlock() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g = _gain(0.2);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1200, t);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.15);
    o.connect(g);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.start(t);
    o.stop(t + 0.32);

    // High harmonic
    const g2 = _gain(0.1);
    if (!g2) return;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 2400;
    o2.connect(g2);
    g2.gain.setValueAtTime(0.1, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o2.start(t);
    o2.stop(t + 0.22);
}

/** Pickup collected — bright ascending chime */
export function playPickup() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Two ascending notes (C5 → E5)
    const notes = [523, 659];
    notes.forEach((freq, i) => {
        const start = t + i * 0.08;
        const g = _gain(0.15);
        if (!g) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.gain.setValueAtTime(0.15, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
        o.start(start);
        o.stop(start + 0.17);
    });
}

/** Heal — warm rising tone */
export function playHeal() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g = _gain(0.15);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, t);
    o.frequency.linearRampToValueAtTime(800, t + 0.2);
    o.connect(g);
    g.gain.setValueAtTime(0.15, t);
    g.gain.setValueAtTime(0.15, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.start(t);
    o.stop(t + 0.37);
}

/** Level up — triumphant 3-note ascending arpeggio */
export function playLevelUp() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // C5 → E5 → G5 (major chord arpeggio)
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
        const start = t + i * 0.12;
        const g = _gain(0.18);
        if (!g) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.gain.setValueAtTime(0.18, start);
        g.gain.setValueAtTime(0.18, start + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        o.start(start);
        o.stop(start + 0.32);

        // Subtle octave harmonic
        const g2 = _gain(0.06);
        if (!g2) return;
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = freq * 2;
        o2.connect(g2);
        g2.gain.setValueAtTime(0.06, start);
        g2.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        o2.start(start);
        o2.stop(start + 0.27);
    });
}

/** Door unlocks — click + rising chime */
export function playDoorUnlock() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Click
    _noiseBurst(4000, 3, 0.03, 0.15, t);

    // Rising two-note
    const g = _gain(0.12);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(440, t + 0.04);
    o.frequency.linearRampToValueAtTime(660, t + 0.15);
    o.connect(g);
    g.gain.setValueAtTime(0.12, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.start(t + 0.04);
    o.stop(t + 0.32);
}

/** Enter a door — transition whoosh */
export function playDoorEnter() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Whoosh (filtered noise sweep)
    const buf = _noiseBuffer(0.35);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(2500, t + 0.15);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    filter.Q.value = 1;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.2, t + 0.08);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    src.connect(filter);
    filter.connect(env);
    env.connect(_master);
    src.start(t);
    src.stop(t + 0.35);
}

/** Shooter enemy fires a projectile — quick zap */
export function playProjectile() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g = _gain(0.1);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    o.connect(g);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t);
    o.stop(t + 0.12);
}

/** Menu navigation blip */
export function playMenuNav() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g = _gain(0.1);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = 660;
    o.connect(g);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.start(t);
    o.stop(t + 0.08);
}

/** Menu selection confirm */
export function playMenuSelect() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Two quick notes
    [880, 1100].forEach((freq, i) => {
        const start = t + i * 0.06;
        const g = _gain(0.12);
        if (!g) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.gain.setValueAtTime(0.12, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
        o.start(start);
        o.stop(start + 0.12);
    });
}

/** Game over — low descending tones */
export function playGameOver() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Three descending notes (G4 → E4 → C4)
    const notes = [392, 330, 262];
    notes.forEach((freq, i) => {
        const start = t + i * 0.25;
        const g = _gain(0.2);
        if (!g) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.gain.setValueAtTime(0.2, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        o.start(start);
        o.stop(start + 0.42);

        // Dark sub-octave
        const g2 = _gain(0.1);
        if (!g2) return;
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = freq / 2;
        o2.connect(g2);
        g2.gain.setValueAtTime(0.1, start);
        g2.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        o2.start(start);
        o2.stop(start + 0.37);
    });
}

/** Tank charge warning — rumble */
export function playTankCharge() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g = _gain(0.12);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(60, t);
    o.frequency.linearRampToValueAtTime(100, t + 0.15);
    o.connect(g);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.start(t);
    o.stop(t + 0.22);

    _noiseBurst(400, 1, 0.1, 0.08, t);
}

/** Dasher dashes — quick zip */
export function playDash() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    _noiseBurst(5000, 2, 0.08, 0.1, t);

    const g = _gain(0.06);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(1200, t);
    o.frequency.exponentialRampToValueAtTime(400, t + 0.06);
    o.connect(g);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.start(t);
    o.stop(t + 0.09);
}

// ── Mute / Volume ────────────────────────────────────────────

export function toggleMute() {
    _ensureCtx();
    _muted = !_muted;
    if (_master) {
        _master.gain.setValueAtTime(_muted ? 0 : _volume, _ctx.currentTime);
    }
    try { localStorage.setItem(STORAGE_KEY, _muted ? '1' : '0'); } catch (e) {}
    return _muted;
}

export function isMuted() {
    return _muted;
}

export function setVolume(v) {
    _volume = Math.max(0, Math.min(1, v));
    if (_master && !_muted) {
        _master.gain.setValueAtTime(_volume, _ctx.currentTime);
    }
}

/** Call once on first user interaction to unlock audio context */
export function init() {
    _ensureCtx();
    _resume();
}
