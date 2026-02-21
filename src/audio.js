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

/** Player dagger throw — sharp 'whoosh' with metallic edge */
export function playDaggerThrow() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Sharp metallic whoosh — ascending then dropping
    _noiseBurst(4000, 2.5, 0.08, 0.15, t);

    // Tonal knife-throw whistle
    const g = _gain(0.06);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(1600, t + 0.03);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.08);
    o.connect(g);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t);
    o.stop(t + 0.12);

    // Sub-click for weight
    const g2 = _gain(0.04);
    if (!g2) return;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(300, t);
    o2.frequency.exponentialRampToValueAtTime(100, t + 0.05);
    o2.connect(g2);
    g2.gain.setValueAtTime(0.04, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o2.start(t);
    o2.stop(t + 0.08);
}

/** Dagger hits an enemy — sharp metallic impact */
export function playDaggerHit() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Metallic ping
    const g = _gain(0.12);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(300, t + 0.06);
    o.connect(g);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.start(t);
    o.stop(t + 0.1);

    // Impact crack
    _noiseBurst(2000, 2, 0.04, 0.1, t);
}

/** Player dash/dodge roll — airy whoosh sweep */
export function playPlayerDash() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Wide-band filtered noise whoosh (rising then falling)
    const buf = _noiseBuffer(0.25);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(4000, t + 0.06);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.2);
    filter.Q.value = 0.8;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.22, t + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    src.connect(filter);
    filter.connect(env);
    env.connect(_master);
    src.start(t);
    src.stop(t + 0.25);

    // Subtle tonal shimmer for "magic" feel
    const g = _gain(0.04);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    o.connect(g);
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.start(t);
    o.stop(t + 0.18);
}

// ── Hazard Sounds ────────────────────────────────────────────

/** Arrow trap fires — short mechanical twang */
export function playArrowTrap() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Twang: high freq descending
    const g = _gain(0.08);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    o.connect(g);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t);
    o.stop(t + 0.12);

    // Mechanical click
    _noiseBurst(2000, 3, 0.04, 0.06, t);
}

// ── Mute / Volume ────────────────────────────────────────────

/** Combo tier reached — escalating celebratory sound.
 *  tier 1: quick 2-note chime, tier 2: bright 3-note, tier 3: powerful 4-note, tier 4: epic 5-note
 */
export function playComboTier(tier = 1) {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Base note sets ascending in energy (C major pentatonic + octave climb)
    const notesByTier = {
        1: [523, 659],                       // C5 → E5
        2: [587, 740, 880],                  // D5 → F#5 → A5
        3: [659, 784, 988, 1175],            // E5 → G5 → B5 → D6
        4: [523, 659, 784, 1047, 1319],      // C5 → E5 → G5 → C6 → E6
    };
    const notes = notesByTier[Math.min(tier, 4)] || notesByTier[1];
    const vol = 0.12 + Math.min(tier, 4) * 0.03;  // louder at higher tiers
    const spacing = 0.06;  // fast arpeggio

    notes.forEach((freq, i) => {
        const start = t + i * spacing;
        const dur = 0.18 + tier * 0.03;

        // Main tone
        const g = _gain(vol);
        if (!g) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.gain.setValueAtTime(vol, start);
        g.gain.setValueAtTime(vol, start + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        o.start(start);
        o.stop(start + dur + 0.02);

        // Shimmering harmonic (adds richness at higher tiers)
        if (tier >= 2) {
            const g2 = _gain(vol * 0.3);
            if (!g2) return;
            const o2 = ctx.createOscillator();
            o2.type = 'triangle';
            o2.frequency.value = freq * 2;
            o2.connect(g2);
            g2.gain.setValueAtTime(vol * 0.3, start);
            g2.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.8);
            o2.start(start);
            o2.stop(start + dur);
        }
    });

    // Low sub for power feel at tier 3+
    if (tier >= 3) {
        const gSub = _gain(0.08);
        if (!gSub) return;
        const oSub = ctx.createOscillator();
        oSub.type = 'sine';
        oSub.frequency.value = 130;
        oSub.connect(gSub);
        gSub.gain.setValueAtTime(0.08, t);
        gSub.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        oSub.start(t);
        oSub.stop(t + 0.27);
    }

    // Impact noise burst for all tiers (satisfying crack)
    _noiseBurst(3000 + tier * 500, 1.5, 0.04 + tier * 0.01, 0.06 + tier * 0.02, t);
}

// ── Boss Sounds ──────────────────────────────────────────

/** Boss roar — deep rumble when boss appears or phase transitions */
export function playBossRoar() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g1 = _gain(0.2);
    if (!g1) return;
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(80, t);
    o1.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    o1.connect(g1);
    g1.gain.setValueAtTime(0.2, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o1.start(t);
    o1.stop(t + 0.52);

    _noiseBurst(300, 1, 0.3, 0.15, t);

    const g2 = _gain(0.08);
    if (!g2) return;
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(120, t + 0.1);
    o2.frequency.exponentialRampToValueAtTime(60, t + 0.5);
    o2.connect(g2);
    g2.gain.setValueAtTime(0.08, t + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o2.start(t + 0.1);
    o2.stop(t + 0.42);
}

/** Boss ground slam — heavy impact */
export function playBossSlam() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g1 = _gain(0.3);
    if (!g1) return;
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(100, t);
    o1.frequency.exponentialRampToValueAtTime(25, t + 0.2);
    o1.connect(g1);
    g1.gain.setValueAtTime(0.3, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o1.start(t);
    o1.stop(t + 0.32);

    _noiseBurst(600, 1.5, 0.12, 0.2, t);
}

/** Boss dies — dramatic death sound */
export function playBossDeath() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g1 = _gain(0.25);
    if (!g1) return;
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(200, t);
    o1.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    o1.connect(g1);
    g1.gain.setValueAtTime(0.25, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    o1.start(t);
    o1.stop(t + 1.02);

    _noiseBurst(1500, 1, 0.15, 0.25, t);

    const g2 = _gain(0.15);
    if (!g2) return;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(400, t);
    o2.frequency.exponentialRampToValueAtTime(60, t + 0.6);
    o2.connect(g2);
    g2.gain.setValueAtTime(0.15, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o2.start(t);
    o2.stop(t + 0.72);
}

/** Boss victory fanfare — triumphant ascending arpeggio */
export function playBossVictory() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
        const start = t + i * 0.15;
        const g = _gain(0.2);
        if (!g) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.gain.setValueAtTime(0.2, start);
        g.gain.setValueAtTime(0.2, start + 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        o.start(start);
        o.stop(start + 0.42);

        const g2 = _gain(0.08);
        if (!g2) return;
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = freq * 2;
        o2.connect(g2);
        g2.gain.setValueAtTime(0.08, start);
        g2.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        o2.start(start);
        o2.stop(start + 0.37);
    });

    const gSub = _gain(0.1);
    if (!gSub) return;
    const oSub = ctx.createOscillator();
    oSub.type = 'sine';
    oSub.frequency.value = 130;
    oSub.connect(gSub);
    gSub.gain.setValueAtTime(0.1, t);
    gSub.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    oSub.start(t);
    oSub.stop(t + 0.62);
}

// ── Meta Progression Sounds ──────────────────────────────

/** Core Shard gain — crystalline chime */
export function playShardGain() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Bright ascending sparkle
    const notes = [880, 1175, 1760];
    notes.forEach((freq, i) => {
        const start = t + i * 0.06;
        const g = _gain(0.12);
        if (!g) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.gain.setValueAtTime(0.12, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        o.start(start);
        o.stop(start + 0.22);
    });

    _noiseBurst(6000, 2, 0.02, 0.08, t);
}

/** Relic unlock — magical discovery sound */
export function playRelicUnlock() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Mystical ascending arpeggio
    const notes = [440, 554, 659, 880, 1108];
    notes.forEach((freq, i) => {
        const start = t + i * 0.1;
        const g = _gain(0.15);
        if (!g) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.gain.setValueAtTime(0.15, start);
        g.gain.setValueAtTime(0.15, start + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        o.start(start);
        o.stop(start + 0.37);

        // Shimmer overtone
        const g2 = _gain(0.06);
        if (!g2) return;
        const o2 = ctx.createOscillator();
        o2.type = 'triangle';
        o2.frequency.value = freq * 2;
        o2.connect(g2);
        g2.gain.setValueAtTime(0.06, start);
        g2.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        o2.start(start);
        o2.stop(start + 0.32);
    });

    // Sub bass for gravitas
    const gSub = _gain(0.08);
    if (!gSub) return;
    const oSub = ctx.createOscillator();
    oSub.type = 'sine';
    oSub.frequency.value = 110;
    oSub.connect(gSub);
    gSub.gain.setValueAtTime(0.08, t);
    gSub.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    oSub.start(t);
    oSub.stop(t + 0.52);
}

/** Perk purchased — satisfying upgrade sound */
export function playPerkUpgrade() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const g = _gain(0.18);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.15);
    o.connect(g);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.start(t);
    o.stop(t + 0.32);

    _noiseBurst(4000, 2, 0.03, 0.1, t + 0.05);
}

/** Achievement unlocked — triumphant chime (ascending triad + shimmer) */
export function playAchievementUnlock() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Ascending major triad: C5 → E5 → G5
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
        const g = _gain(0.14);
        if (!g) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        const start = t + i * 0.1;
        g.gain.setValueAtTime(0.14, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        o.start(start);
        o.stop(start + 0.42);
    });

    // High shimmer
    const g2 = _gain(0.08);
    if (g2) {
        const o2 = ctx.createOscillator();
        o2.type = 'triangle';
        o2.frequency.value = 1568;  // G6
        o2.connect(g2);
        g2.gain.setValueAtTime(0.08, t + 0.25);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        o2.start(t + 0.25);
        o2.stop(t + 0.72);
    }

    _noiseBurst(6000, 3, 0.05, 0.06, t + 0.2);
}

// ── Combat Ability SFX ──────────────────────────────────────

/** Shockwave — deep bass explosion. */
export function playShockwave() {
    const ctx = _ensureCtx(); if (!ctx) return; _resume();
    const t = ctx.currentTime;
    const g = _gain(0.28);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(100, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.35);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.start(t);
    o.stop(t + 0.4);
    _noiseBurst(4000, 5, 0.12, 0.35, t);
}

/** Blade Storm — whirring spin. */
export function playBladeStorm() {
    const ctx = _ensureCtx(); if (!ctx) return; _resume();
    const t = ctx.currentTime;
    const g = _gain(0.18);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(250, t);
    o.frequency.linearRampToValueAtTime(400, t + 0.15);
    o.frequency.linearRampToValueAtTime(250, t + 0.3);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.start(t);
    o.stop(t + 0.35);
}

/** Gravity Pull — low rumble sucking. */
export function playGravityPull() {
    const ctx = _ensureCtx(); if (!ctx) return; _resume();
    const t = ctx.currentTime;
    const g = _gain(0.2);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(60, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.start(t);
    o.stop(t + 0.55);
}

/** Freeze Pulse — icy crystalline burst. */
export function playFreezePulse() {
    const ctx = _ensureCtx(); if (!ctx) return; _resume();
    const t = ctx.currentTime;
    const g = _gain(0.22);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(2000, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(400, t + 0.3);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.start(t);
    o.stop(t + 0.35);
    _noiseBurst(8000, 2, 0.06, 0.15, t);
}

/** Proc: Explosion — short bass thump. */
export function playProcExplosion() {
    const ctx = _ensureCtx(); if (!ctx) return; _resume();
    const t = ctx.currentTime;
    const g = _gain(0.2);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(25, t + 0.2);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.start(t);
    o.stop(t + 0.25);
}

/** Proc: Chain Lightning — zappy crackle. */
export function playChainLightning() {
    const ctx = _ensureCtx(); if (!ctx) return; _resume();
    const t = ctx.currentTime;
    _noiseBurst(6000, 2, 0.15, 0.12, t);
    _noiseBurst(8000, 1.5, 0.1, 0.08, t + 0.06);
}

/** Proc: Heavy Crit — meaty impact. */
export function playCritImpact() {
    const ctx = _ensureCtx(); if (!ctx) return; _resume();
    const t = ctx.currentTime;
    const g = _gain(0.25);
    if (!g) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.start(t);
    o.stop(t + 0.25);
    _noiseBurst(3000, 4, 0.12, 0.15, t);
}

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

/** Return the shared AudioContext (for music engine). Null if not yet created. */
export function getContext() {
    return _ctx;
}
