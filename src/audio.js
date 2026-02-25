// ── Procedural Audio Engine (Enhanced) ───────────────────────
// Uses Web Audio API to synthesize all sound effects at runtime.
// Zero external files — works 100% offline.
//
// Effects chain: sources → _master → _compressor → destination
// Parallel sends: _reverbSend (convolver), _delaySend (echo)
// Features: reverb, compression, waveshaping, stereo panning,
//           layered detuned oscillators, proper ADSR envelopes.
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dungeon_audio_muted';

let _ctx = null;          // AudioContext (lazy-init)
let _master = null;       // GainNode master volume
let _compressor = null;   // DynamicsCompressorNode — punch & glue
let _reverbSend = null;   // GainNode → ConvolverNode → master
let _reverbConv = null;   // ConvolverNode
let _delaySend = null;    // GainNode → DelayNode → feedback → master
let _muted = false;
let _volume = 0.35;       // master volume 0–1

// ── Impulse Response Generator (procedural reverb) ──────────
function _generateImpulse(ctx, duration = 1.5, decay = 2.5, numChannels = 2) {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(numChannels, length, rate);
    for (let ch = 0; ch < numChannels; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            // Exponential decay with slight random diffusion per channel
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    return impulse;
}

// ── Waveshaper curve for soft-clip distortion ───────────────
function _makeDistortionCurve(amount = 20) {
    const n = 44100;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = ((3 + amount) * x * Math.PI / 180) /
                   (Math.PI / 180 + amount * Math.abs(x));
    }
    return curve;
}

// Lazy-init: browsers require a user gesture before AudioContext works
function _ensureCtx() {
    if (_ctx) return _ctx;
    try {
        _ctx = new (window.AudioContext || window.webkitAudioContext)();

        // ── Compressor (bus glue — makes everything punchier) ──
        _compressor = _ctx.createDynamicsCompressor();
        _compressor.threshold.value = -18;   // start compressing at -18dB
        _compressor.knee.value = 8;
        _compressor.ratio.value = 4;
        _compressor.attack.value = 0.003;    // fast attack for transients
        _compressor.release.value = 0.15;
        _compressor.connect(_ctx.destination);

        // ── Master gain → compressor ──
        _master = _ctx.createGain();
        _master.gain.value = _muted ? 0 : _volume;
        _master.connect(_compressor);

        // ── Reverb send (parallel bus) ──
        try {
            _reverbConv = _ctx.createConvolver();
            _reverbConv.buffer = _generateImpulse(_ctx, 1.4, 2.8, 2);
            const reverbWet = _ctx.createGain();
            reverbWet.gain.value = 0.6;
            _reverbConv.connect(reverbWet);
            reverbWet.connect(_compressor);

            _reverbSend = _ctx.createGain();
            _reverbSend.gain.value = 0.25; // default send level
            _reverbSend.connect(_reverbConv);
        } catch (e) {
            // Convolver not supported — reverb becomes a no-op
            _reverbSend = null;
        }

        // ── Delay send (parallel bus — slapback echo) ──
        try {
            const delay = _ctx.createDelay(1.0);
            delay.delayTime.value = 0.18;     // 180ms slapback
            const feedback = _ctx.createGain();
            feedback.gain.value = 0.25;        // 25% feedback
            const delayWet = _ctx.createGain();
            delayWet.gain.value = 0.3;

            // Feedback loop: delay → feedback → delay
            delay.connect(feedback);
            feedback.connect(delay);
            // Wet output → compressor
            delay.connect(delayWet);
            delayWet.connect(_compressor);

            // Highpass on feedback to prevent mud buildup
            const feedbackFilter = _ctx.createBiquadFilter();
            feedbackFilter.type = 'highpass';
            feedbackFilter.frequency.value = 400;

            _delaySend = _ctx.createGain();
            _delaySend.gain.value = 0.15; // default send level
            _delaySend.connect(feedbackFilter);
            feedbackFilter.connect(delay);
        } catch (e) {
            _delaySend = null;
        }

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

/**
 * ADSR envelope on a GainNode.
 * @param {GainNode} gainNode — the gain to shape
 * @param {number} t — start time
 * @param {number} peak — peak gain value
 * @param {number} a — attack time (s)
 * @param {number} d — decay time (s)
 * @param {number} s — sustain level (fraction of peak)
 * @param {number} sDur — sustain duration (s)
 * @param {number} r — release time (s)
 */
function _adsr(gainNode, t, peak, a, d, s, sDur, r) {
    const g = gainNode.gain;
    g.setValueAtTime(0.001, t);
    g.linearRampToValueAtTime(peak, t + a);                    // Attack
    g.exponentialRampToValueAtTime(Math.max(peak * s, 0.001), t + a + d); // Decay
    g.setValueAtTime(Math.max(peak * s, 0.001), t + a + d + sDur);       // Sustain
    g.exponentialRampToValueAtTime(0.001, t + a + d + sDur + r);          // Release
}

/**
 * Layered detuned oscillators for a fuller sound.
 * Creates `count` oscillators slightly detuned from each other.
 * @returns {GainNode} — the mixed output node (connect this to master/effects)
 */
function _layeredOsc(type, freq, count, detuneSpread, startTime, stopTime, vol = 0.1) {
    const ctx = _ensureCtx();
    if (!ctx) return null;
    const mix = ctx.createGain();
    mix.gain.value = vol;
    const perOscVol = 1 / count;
    for (let i = 0; i < count; i++) {
        const detune = (i - (count - 1) / 2) * (detuneSpread / count);
        const g = ctx.createGain();
        g.gain.value = perOscVol;
        g.connect(mix);
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.detune.value = detune;  // cents
        o.connect(g);
        o.start(startTime);
        o.stop(stopTime);
    }
    return mix;
}

/**
 * Send a source node to the reverb bus.
 * @param {AudioNode} source — node to send
 * @param {number} amount — send level 0–1
 */
function _sendReverb(source, amount = 0.3) {
    if (!_reverbSend) return;
    const ctx = _ensureCtx();
    if (!ctx) return;
    const send = ctx.createGain();
    send.gain.value = amount;
    source.connect(send);
    send.connect(_reverbConv);
}

/**
 * Send a source node to the delay bus.
 * @param {AudioNode} source — node to send
 * @param {number} amount — send level 0–1
 */
function _sendDelay(source, amount = 0.2) {
    if (!_delaySend) return;
    const ctx = _ensureCtx();
    if (!ctx) return;
    const send = ctx.createGain();
    send.gain.value = amount;
    source.connect(send);
    send.connect(_delaySend);
}

/**
 * Create a waveshaper distortion node.
 * @param {number} amount — distortion intensity (5–50)
 * @returns {WaveShaperNode}
 */
function _distort(amount = 20) {
    const ctx = _ensureCtx();
    if (!ctx) return null;
    const ws = ctx.createWaveShaper();
    ws.curve = _makeDistortionCurve(amount);
    ws.oversample = '2x';
    return ws;
}

/**
 * Create a stereo panner node.
 * @param {number} pan — -1 (left) to 1 (right)
 * @returns {StereoPannerNode}
 */
function _pan(pan = 0) {
    const ctx = _ensureCtx();
    if (!ctx) return null;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    return p;
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

/** Player melee attack — layered swoosh with grit and stereo spread */
export function playAttack() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Layer 1: Wide filtered noise swoosh (stereo) ──
    const buf = _noiseBuffer(0.18);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const swooshFilter = ctx.createBiquadFilter();
    swooshFilter.type = 'bandpass';
    swooshFilter.frequency.setValueAtTime(1500, t);
    swooshFilter.frequency.exponentialRampToValueAtTime(5000, t + 0.04);
    swooshFilter.frequency.exponentialRampToValueAtTime(1000, t + 0.14);
    swooshFilter.Q.value = 1.2;
    const swooshEnv = ctx.createGain();
    _adsr(swooshEnv, t, 0.28, 0.01, 0.04, 0.4, 0.02, 0.08);
    const swooshPan = _pan((Math.random() - 0.5) * 0.6);
    src.connect(swooshFilter);
    swooshFilter.connect(swooshEnv);
    swooshEnv.connect(swooshPan);
    swooshPan.connect(_master);
    _sendReverb(swooshEnv, 0.12);
    src.start(t);
    src.stop(t + 0.18);

    // ── Layer 2: Layered detuned sawtooth sweep (body) ──
    const body = _layeredOsc('sawtooth', 400, 3, 30, t, t + 0.14, 0.1);
    if (!body) return;
    const bodyEnv = ctx.createGain();
    _adsr(bodyEnv, t, 1.0, 0.005, 0.03, 0.3, 0.01, 0.06);
    // Waveshape for grit
    const dist = _distort(15);
    body.connect(dist);
    dist.connect(bodyEnv);
    bodyEnv.connect(_master);

    // ── Layer 3: Sub-thump for weight (heavier) ──
    const subG = _gain(0.18);
    if (!subG) return;
    const subO = ctx.createOscillator();
    subO.type = 'sine';
    subO.frequency.setValueAtTime(200, t);
    subO.frequency.exponentialRampToValueAtTime(50, t + 0.07);
    subO.connect(subG);
    subG.gain.setValueAtTime(0.18, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    subO.start(t);
    subO.stop(t + 0.12);
}

/** Enemy hit by melee — punchy layered impact with reverb tail and chest-thump bass */
export function playHit() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Layer 1: Heavy sine thump with fast pitch drop (THE PUNCH) ──
    const thumpG = _gain(0.28);
    if (!thumpG) return;
    const thumpO = ctx.createOscillator();
    thumpO.type = 'sine';
    thumpO.frequency.setValueAtTime(300, t);
    thumpO.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    thumpO.connect(thumpG);
    _adsr(thumpG, t, 0.28, 0.002, 0.03, 0.35, 0.0, 0.06);
    thumpO.start(t);
    thumpO.stop(t + 0.14);

    // ── Layer 2: Distorted transient crack (sharper) ──
    const crackG = ctx.createGain();
    crackG.gain.setValueAtTime(0.22, t);
    crackG.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    const dist = _distort(40);
    const crackO = ctx.createOscillator();
    crackO.type = 'square';
    crackO.frequency.setValueAtTime(500, t);
    crackO.frequency.exponentialRampToValueAtTime(60, t + 0.025);
    crackO.connect(dist);
    dist.connect(crackG);
    crackG.connect(_master);
    crackO.start(t);
    crackO.stop(t + 0.04);

    // ── Layer 3: Noise crack with reverb (meatier) ──
    const buf = _noiseBuffer(0.07);
    if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 2200;
        filt.Q.value = 1.8;
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.24, t);
        nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(filt);
        filt.connect(nEnv);
        nEnv.connect(_master);
        _sendReverb(nEnv, 0.25);
        src.start(t);
        src.stop(t + 0.08);
    }

    // ── Layer 4: Stereo-panned mid click ──
    const clickG = _gain(0.08);
    if (clickG) {
        const clickPan = _pan((Math.random() - 0.5) * 0.8);
        const clickO = ctx.createOscillator();
        clickO.type = 'triangle';
        clickO.frequency.setValueAtTime(1200, t);
        clickO.frequency.exponentialRampToValueAtTime(300, t + 0.02);
        clickO.connect(clickG);
        clickG.disconnect();
        clickG.connect(clickPan);
        clickPan.connect(_master);
        clickG.gain.setValueAtTime(0.08, t);
        clickG.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        clickO.start(t);
        clickO.stop(t + 0.04);
    }

    // ── Layer 5: Sub-bass chest thump (weight) ──
    const subG = _gain(0.14);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.setValueAtTime(80, t);
        subO.frequency.exponentialRampToValueAtTime(30, t + 0.1);
        subO.connect(subG);
        subG.gain.setValueAtTime(0.14, t);
        subG.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        subO.start(t);
        subO.stop(t + 0.14);
    }
}

/** Enemy killed — satisfying layered pop with delay echo */
export function playEnemyDeath() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Layer 1: Pitched-down sine pop ──
    const popG = _gain(0.22);
    if (!popG) return;
    const popO = ctx.createOscillator();
    popO.type = 'sine';
    popO.frequency.setValueAtTime(700, t);
    popO.frequency.exponentialRampToValueAtTime(80, t + 0.18);
    popO.connect(popG);
    _adsr(popG, t, 0.22, 0.005, 0.06, 0.4, 0.02, 0.1);
    _sendDelay(popG, 0.15);
    popO.start(t);
    popO.stop(t + 0.25);

    // ── Layer 2: Layered detuned triangle (body) ──
    const body = _layeredOsc('triangle', 350, 3, 25, t + 0.02, t + 0.22, 0.1);
    if (body) {
        const bodyEnv = ctx.createGain();
        _adsr(bodyEnv, t + 0.02, 1.0, 0.01, 0.05, 0.3, 0.02, 0.08);
        body.connect(bodyEnv);
        bodyEnv.connect(_master);
        _sendReverb(bodyEnv, 0.25);
    }

    // ── Layer 3: Noise pop with stereo placement ──
    const buf = _noiseBuffer(0.1);
    if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.setValueAtTime(3000, t);
        filt.frequency.exponentialRampToValueAtTime(800, t + 0.08);
        filt.Q.value = 1.2;
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.2, t);
        nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        const nPan = _pan((Math.random() - 0.5) * 0.5);
        src.connect(filt);
        filt.connect(nEnv);
        nEnv.connect(nPan);
        nPan.connect(_master);
        src.start(t);
        src.stop(t + 0.12);
    }

    // ── Layer 4: Sub-bass thud ──
    const subG = _gain(0.1);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.setValueAtTime(120, t);
        subO.frequency.exponentialRampToValueAtTime(35, t + 0.12);
        subO.connect(subG);
        subG.gain.setValueAtTime(0.1, t);
        subG.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        subO.start(t);
        subO.stop(t + 0.17);
    }
}

/** Player takes damage — heavy distorted crunch with dissonant buzz */
export function playPlayerHurt() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Layer 1: Heavy sine thud ──
    const thudG = _gain(0.25);
    if (!thudG) return;
    const thudO = ctx.createOscillator();
    thudO.type = 'sine';
    thudO.frequency.setValueAtTime(160, t);
    thudO.frequency.exponentialRampToValueAtTime(35, t + 0.15);
    thudO.connect(thudG);
    _adsr(thudG, t, 0.25, 0.003, 0.06, 0.35, 0.02, 0.1);
    thudO.start(t);
    thudO.stop(t + 0.24);

    // ── Layer 2: Distorted dissonant buzz (layered) ──
    const buzz = _layeredOsc('sawtooth', 170, 3, 40, t, t + 0.18, 0.1);
    if (buzz) {
        const dist = _distort(25);
        const buzzEnv = ctx.createGain();
        _adsr(buzzEnv, t, 1.0, 0.005, 0.04, 0.3, 0.02, 0.08);
        buzz.connect(dist);
        dist.connect(buzzEnv);
        buzzEnv.connect(_master);
    }

    // ── Layer 3: Noise crunch with reverb tail ──
    const buf = _noiseBuffer(0.1);
    if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(2000, t);
        filt.frequency.exponentialRampToValueAtTime(400, t + 0.08);
        filt.Q.value = 2;
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.18, t);
        nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        src.connect(filt);
        filt.connect(nEnv);
        nEnv.connect(_master);
        _sendReverb(nEnv, 0.25);
        src.start(t);
        src.stop(t + 0.12);
    }

    // ── Layer 4: Dissonant tritone sting ──
    const stingG = _gain(0.05);
    if (stingG) {
        const stingO = ctx.createOscillator();
        stingO.type = 'square';
        stingO.frequency.setValueAtTime(233, t); // Bb3 — tritone with E
        stingO.connect(stingG);
        stingG.gain.setValueAtTime(0.05, t);
        stingG.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        stingO.start(t);
        stingO.stop(t + 0.12);
    }
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

/** Pickup collected — shimmering ascending chime with sparkle */
export function playPickup() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Two ascending notes (C5 → E5) with layered harmonics
    const notes = [523, 659];
    notes.forEach((freq, i) => {
        const start = t + i * 0.07;

        // Main tone (layered for shimmer)
        const layer = _layeredOsc('sine', freq, 2, 12, start, start + 0.22, 0.14);
        if (!layer) return;
        const env = ctx.createGain();
        _adsr(env, start, 1.0, 0.005, 0.05, 0.5, 0.04, 0.1);
        const pan = _pan(i === 0 ? -0.3 : 0.3); // stereo spread
        layer.connect(env);
        env.connect(pan);
        pan.connect(_master);
        _sendReverb(env, 0.3);

        // Octave harmonic sparkle
        const sparkG = ctx.createGain();
        sparkG.gain.setValueAtTime(0.06, start);
        sparkG.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        const sparkO = ctx.createOscillator();
        sparkO.type = 'sine';
        sparkO.frequency.value = freq * 2;
        sparkO.connect(sparkG);
        sparkG.connect(pan);
        sparkO.start(start);
        sparkO.stop(start + 0.2);
    });

    // Tiny noise shimmer on top
    _noiseBurst(8000, 3, 0.04, 0.04, t);
}

/** Heal — warm layered rising tone with reverb glow */
export function playHeal() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Warm layered rising tone ──
    const body = _layeredOsc('sine', 400, 3, 15, t, t + 0.42, 0.14);
    if (!body) return;
    // Sweep frequency up across all oscs via a connected gain
    const bodyEnv = ctx.createGain();
    _adsr(bodyEnv, t, 1.0, 0.02, 0.05, 0.7, 0.15, 0.15);
    body.connect(bodyEnv);
    bodyEnv.connect(_master);
    _sendReverb(bodyEnv, 0.4); // generous reverb for warm feel

    // Manual freq sweep on a separate osc for the rising feel
    const riseG = _gain(0.1);
    if (!riseG) return;
    const riseO = ctx.createOscillator();
    riseO.type = 'sine';
    riseO.frequency.setValueAtTime(400, t);
    riseO.frequency.linearRampToValueAtTime(800, t + 0.25);
    riseO.connect(riseG);
    _adsr(riseG, t, 0.1, 0.02, 0.05, 0.6, 0.12, 0.12);
    riseO.start(t);
    riseO.stop(t + 0.42);

    // ── Gentle high shimmer ──
    const shimG = ctx.createGain();
    shimG.gain.setValueAtTime(0.04, t + 0.08);
    shimG.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    const shimO = ctx.createOscillator();
    shimO.type = 'sine';
    shimO.frequency.setValueAtTime(1200, t + 0.08);
    shimO.frequency.linearRampToValueAtTime(1600, t + 0.3);
    shimO.connect(shimG);
    shimG.connect(_master);
    shimO.start(t + 0.08);
    shimO.stop(t + 0.37);
}

/** Level up — triumphant layered arpeggio with delay echo and stereo */
export function playLevelUp() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // C5 → E5 → G5 (major chord arpeggio) with rich layering
    const notes = [523, 659, 784];
    const pans = [-0.4, 0, 0.4]; // stereo spread across notes
    notes.forEach((freq, i) => {
        const start = t + i * 0.11;

        // Layered main tone (fuller sound)
        const layer = _layeredOsc('sine', freq, 3, 18, start, start + 0.38, 0.16);
        if (!layer) return;
        const env = ctx.createGain();
        _adsr(env, start, 1.0, 0.008, 0.06, 0.6, 0.1, 0.15);
        const pan = _pan(pans[i]);
        layer.connect(env);
        env.connect(pan);
        pan.connect(_master);
        _sendReverb(env, 0.35);
        if (i === 2) _sendDelay(env, 0.2); // echo on the final note

        // Octave harmonic sparkle
        const sparkG = ctx.createGain();
        sparkG.gain.setValueAtTime(0.07, start);
        sparkG.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        const sparkO = ctx.createOscillator();
        sparkO.type = 'sine';
        sparkO.frequency.value = freq * 2;
        sparkO.connect(sparkG);
        sparkG.connect(pan);
        sparkO.start(start);
        sparkO.stop(start + 0.32);

        // Fifth harmonic (very subtle — adds richness)
        const fifthG = ctx.createGain();
        fifthG.gain.setValueAtTime(0.03, start);
        fifthG.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        const fifthO = ctx.createOscillator();
        fifthO.type = 'sine';
        fifthO.frequency.value = freq * 1.5;
        fifthO.connect(fifthG);
        fifthG.connect(pan);
        fifthO.start(start);
        fifthO.stop(start + 0.27);
    });

    // Sub bass for gravitas
    const subG = _gain(0.08);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.value = 131; // C3
        subO.connect(subG);
        subG.gain.setValueAtTime(0.08, t);
        subG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        subO.start(t);
        subO.stop(t + 0.42);
    }
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

/** Enter a door — immersive transition whoosh with reverb tail */
export function playDoorEnter() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Layer 1: Wide stereo noise whoosh ──
    const buf = _noiseBuffer(0.4);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(3500, t + 0.12);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.35);
    filter.Q.value = 0.8;
    const env = ctx.createGain();
    _adsr(env, t, 0.24, 0.04, 0.06, 0.5, 0.08, 0.15);
    src.connect(filter);
    filter.connect(env);
    env.connect(_master);
    _sendReverb(env, 0.45); // heavy reverb for spatial feel
    src.start(t);
    src.stop(t + 0.4);

    // ── Layer 2: Tonal sub-drop for weight ──
    const subG = _gain(0.1);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.setValueAtTime(200, t);
        subO.frequency.exponentialRampToValueAtTime(50, t + 0.25);
        subO.connect(subG);
        subG.gain.setValueAtTime(0.1, t);
        subG.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        subO.start(t);
        subO.stop(t + 0.32);
    }

    // ── Layer 3: Stereo shimmer trail ──
    const shimBuf = _noiseBuffer(0.3);
    if (shimBuf) {
        const shimSrc = ctx.createBufferSource();
        shimSrc.buffer = shimBuf;
        const shimFilt = ctx.createBiquadFilter();
        shimFilt.type = 'highpass';
        shimFilt.frequency.value = 4000;
        shimFilt.Q.value = 1;
        const shimEnv = ctx.createGain();
        shimEnv.gain.setValueAtTime(0.001, t + 0.05);
        shimEnv.gain.linearRampToValueAtTime(0.06, t + 0.12);
        shimEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        const shimPan = _pan(0);
        shimSrc.connect(shimFilt);
        shimFilt.connect(shimEnv);
        shimEnv.connect(shimPan);
        shimPan.connect(_master);
        _sendDelay(shimEnv, 0.2);
        shimSrc.start(t + 0.05);
        shimSrc.stop(t + 0.38);
    }
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

/** Game over — haunting descending tones with delay and reverb */
export function playGameOver() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // Three descending notes (G4 → E4 → C4) with layered richness
    const notes = [392, 330, 262];
    const pans = [-0.3, 0, 0.3];
    notes.forEach((freq, i) => {
        const start = t + i * 0.28;

        // Layered main tone
        const layer = _layeredOsc('sine', freq, 3, 12, start, start + 0.5, 0.18);
        if (!layer) return;
        const env = ctx.createGain();
        _adsr(env, start, 1.0, 0.01, 0.08, 0.5, 0.12, 0.2);
        const pan = _pan(pans[i]);
        layer.connect(env);
        env.connect(pan);
        pan.connect(_master);
        _sendReverb(env, 0.5);
        _sendDelay(env, 0.25);

        // Dark sub-octave
        const subG = ctx.createGain();
        subG.gain.setValueAtTime(0.1, start);
        subG.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.value = freq / 2;
        subO.connect(subG);
        subG.connect(pan);
        subO.start(start);
        subO.stop(start + 0.42);
    });

    // Final low rumble for weight
    const rumbleG = _gain(0.06);
    if (rumbleG) {
        const rumbleO = ctx.createOscillator();
        rumbleO.type = 'sawtooth';
        rumbleO.frequency.value = 50;
        rumbleO.connect(rumbleG);
        rumbleG.gain.setValueAtTime(0.001, t + 0.6);
        rumbleG.gain.linearRampToValueAtTime(0.06, t + 0.75);
        rumbleG.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        _sendReverb(rumbleG, 0.5);
        rumbleO.start(t + 0.6);
        rumbleO.stop(t + 1.22);
    }
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

/** Player dash/dodge roll — rich layered whoosh with reverb trail */
export function playPlayerDash() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Layer 1: Wide-band stereo noise whoosh ──
    const buf = _noiseBuffer(0.3);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(5000, t + 0.05);
    filter.frequency.exponentialRampToValueAtTime(600, t + 0.22);
    filter.Q.value = 0.7;
    const env = ctx.createGain();
    _adsr(env, t, 0.25, 0.02, 0.04, 0.4, 0.04, 0.12);
    const whooshPan = _pan((Math.random() - 0.5) * 0.6);
    src.connect(filter);
    filter.connect(env);
    env.connect(whooshPan);
    whooshPan.connect(_master);
    _sendReverb(env, 0.3);
    src.start(t);
    src.stop(t + 0.3);

    // ── Layer 2: Tonal shimmer sweep (magic feel) ──
    const shimmer = _layeredOsc('sine', 1000, 2, 20, t, t + 0.2, 0.04);
    if (shimmer) {
        const shimEnv = ctx.createGain();
        shimEnv.gain.setValueAtTime(0.001, t);
        shimEnv.gain.linearRampToValueAtTime(0.04, t + 0.03);
        shimEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        shimmer.connect(shimEnv);
        shimEnv.connect(_master);
        _sendDelay(shimEnv, 0.15);
    }

    // ── Layer 3: Sub-bass push for physicality ──
    const subG = _gain(0.08);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.setValueAtTime(120, t);
        subO.frequency.exponentialRampToValueAtTime(60, t + 0.1);
        subO.connect(subG);
        subG.gain.setValueAtTime(0.08, t);
        subG.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        subO.start(t);
        subO.stop(t + 0.14);
    }
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

/** Boss roar — massive layered rumble with distortion and reverb */
export function playBossRoar() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Layer 1: Distorted layered sawtooth growl ──
    const growl = _layeredOsc('sawtooth', 70, 4, 50, t, t + 0.6, 0.18);
    if (!growl) return;
    const dist = _distort(35);
    const growlEnv = ctx.createGain();
    _adsr(growlEnv, t, 1.0, 0.02, 0.1, 0.5, 0.15, 0.25);
    growl.connect(dist);
    dist.connect(growlEnv);
    growlEnv.connect(_master);
    _sendReverb(growlEnv, 0.5); // big reverb for epic feel

    // ── Layer 2: Sub-bass rumble ──
    const subG = _gain(0.15);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.setValueAtTime(50, t);
        subO.frequency.exponentialRampToValueAtTime(25, t + 0.5);
        subO.connect(subG);
        _adsr(subG, t, 0.15, 0.02, 0.1, 0.6, 0.15, 0.2);
        subO.start(t);
        subO.stop(t + 0.55);
    }

    // ── Layer 3: Filtered noise rumble (stereo) ──
    const buf = _noiseBuffer(0.45);
    if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(600, t);
        filt.frequency.exponentialRampToValueAtTime(150, t + 0.4);
        filt.Q.value = 2;
        const nEnv = ctx.createGain();
        _adsr(nEnv, t, 0.2, 0.03, 0.08, 0.4, 0.1, 0.2);
        src.connect(filt);
        filt.connect(nEnv);
        nEnv.connect(_master);
        _sendReverb(nEnv, 0.4);
        src.start(t);
        src.stop(t + 0.5);
    }

    // ── Layer 4: Dissonant upper harmonic for menace ──
    const menaceG = _gain(0.04);
    if (menaceG) {
        const menaceO = ctx.createOscillator();
        menaceO.type = 'sawtooth';
        menaceO.frequency.setValueAtTime(140, t + 0.05);
        menaceO.frequency.exponentialRampToValueAtTime(70, t + 0.45);
        menaceO.connect(menaceG);
        menaceG.gain.setValueAtTime(0.04, t + 0.05);
        menaceG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        menaceO.start(t + 0.05);
        menaceO.stop(t + 0.42);
    }
}

/** Boss ground slam — massive layered impact with reverb shockwave */
export function playBossSlam() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Layer 1: Deep sine sub-drop ──
    const subG = _gain(0.3);
    if (!subG) return;
    const subO = ctx.createOscillator();
    subO.type = 'sine';
    subO.frequency.setValueAtTime(120, t);
    subO.frequency.exponentialRampToValueAtTime(20, t + 0.25);
    subO.connect(subG);
    _adsr(subG, t, 0.3, 0.003, 0.08, 0.4, 0.02, 0.15);
    subO.start(t);
    subO.stop(t + 0.35);

    // ── Layer 2: Distorted impact crack ──
    const crackG = ctx.createGain();
    crackG.gain.setValueAtTime(0.25, t);
    crackG.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    const dist = _distort(40);
    const crackO = ctx.createOscillator();
    crackO.type = 'square';
    crackO.frequency.setValueAtTime(300, t);
    crackO.frequency.exponentialRampToValueAtTime(40, t + 0.05);
    crackO.connect(dist);
    dist.connect(crackG);
    crackG.connect(_master);
    crackO.start(t);
    crackO.stop(t + 0.08);

    // ── Layer 3: Heavy noise crunch with big reverb ──
    const buf = _noiseBuffer(0.2);
    if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(1200, t);
        filt.frequency.exponentialRampToValueAtTime(200, t + 0.15);
        filt.Q.value = 1.5;
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.25, t);
        nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        src.connect(filt);
        filt.connect(nEnv);
        nEnv.connect(_master);
        _sendReverb(nEnv, 0.5); // big reverb for shockwave
        src.start(t);
        src.stop(t + 0.22);
    }

    // ── Layer 4: Rumbling aftershock ──
    const rumbleG = _gain(0.08);
    if (rumbleG) {
        const rumbleO = ctx.createOscillator();
        rumbleO.type = 'sawtooth';
        rumbleO.frequency.setValueAtTime(40, t + 0.05);
        rumbleO.frequency.exponentialRampToValueAtTime(20, t + 0.3);
        rumbleO.connect(rumbleG);
        rumbleG.gain.setValueAtTime(0.08, t + 0.05);
        rumbleG.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        rumbleO.start(t + 0.05);
        rumbleO.stop(t + 0.32);
    }
}

/** Boss dies — dramatic layered death with distortion and reverb */
export function playBossDeath() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    // ── Layer 1: Distorted descending growl ──
    const growl = _layeredOsc('sawtooth', 180, 4, 60, t, t + 1.1, 0.2);
    if (!growl) return;
    const dist = _distort(30);
    const growlEnv = ctx.createGain();
    _adsr(growlEnv, t, 1.0, 0.02, 0.15, 0.45, 0.3, 0.45);
    growl.connect(dist);
    dist.connect(growlEnv);
    growlEnv.connect(_master);
    _sendReverb(growlEnv, 0.55);

    // ── Layer 2: Deep sub decay ──
    const subG = _gain(0.2);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.setValueAtTime(100, t);
        subO.frequency.exponentialRampToValueAtTime(20, t + 0.9);
        subO.connect(subG);
        _adsr(subG, t, 0.2, 0.01, 0.15, 0.5, 0.3, 0.35);
        subO.start(t);
        subO.stop(t + 1.0);
    }

    // ── Layer 3: Noise explosion with reverb ──
    const buf = _noiseBuffer(0.25);
    if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(2000, t);
        filt.frequency.exponentialRampToValueAtTime(300, t + 0.2);
        filt.Q.value = 1;
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.3, t);
        nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        src.connect(filt);
        filt.connect(nEnv);
        nEnv.connect(_master);
        _sendReverb(nEnv, 0.5);
        src.start(t);
        src.stop(t + 0.27);
    }

    // ── Layer 4: Eerie sine trail ──
    const trailG = _gain(0.08);
    if (trailG) {
        const trailO = ctx.createOscillator();
        trailO.type = 'sine';
        trailO.frequency.setValueAtTime(400, t);
        trailO.frequency.exponentialRampToValueAtTime(60, t + 0.8);
        trailO.connect(trailG);
        trailG.gain.setValueAtTime(0.08, t);
        trailG.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        _sendDelay(trailG, 0.3);
        trailO.start(t);
        trailO.stop(t + 0.82);
    }
}

/** Boss victory fanfare — lush triumphant arpeggio with stereo and reverb */
export function playBossVictory() {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;

    const notes = [523, 659, 784, 1047, 1319];
    const pans = [-0.5, -0.25, 0, 0.25, 0.5];
    notes.forEach((freq, i) => {
        const start = t + i * 0.14;

        // Layered main tone
        const layer = _layeredOsc('sine', freq, 3, 15, start, start + 0.5, 0.18);
        if (!layer) return;
        const env = ctx.createGain();
        _adsr(env, start, 1.0, 0.008, 0.06, 0.55, 0.14, 0.2);
        const pan = _pan(pans[i]);
        layer.connect(env);
        env.connect(pan);
        pan.connect(_master);
        _sendReverb(env, 0.45);
        if (i >= 3) _sendDelay(env, 0.2);

        // Octave harmonic sparkle
        const sparkG = ctx.createGain();
        sparkG.gain.setValueAtTime(0.08, start);
        sparkG.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        const sparkO = ctx.createOscillator();
        sparkO.type = 'sine';
        sparkO.frequency.value = freq * 2;
        sparkO.connect(sparkG);
        sparkG.connect(pan);
        sparkO.start(start);
        sparkO.stop(start + 0.42);
    });

    // Sub bass for gravitas
    const subG = _gain(0.1);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.value = 130;
        subO.connect(subG);
        subG.gain.setValueAtTime(0.1, t);
        subG.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        subO.start(t);
        subO.stop(t + 0.67);
    }
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

/** Shockwave — massive distorted bass explosion with reverb. */
export function playShockwave() {
    const ctx = _ensureCtx(); if (!ctx) return; _resume();
    const t = ctx.currentTime;

    // Deep sine sub-drop
    const subG = _gain(0.28);
    if (!subG) return;
    const subO = ctx.createOscillator();
    subO.type = 'sine';
    subO.frequency.setValueAtTime(110, t);
    subO.frequency.exponentialRampToValueAtTime(25, t + 0.35);
    subO.connect(subG);
    _adsr(subG, t, 0.28, 0.003, 0.1, 0.4, 0.05, 0.2);
    subO.start(t);
    subO.stop(t + 0.45);

    // Distorted mid crack
    const dist = _distort(35);
    const crackG = ctx.createGain();
    crackG.gain.setValueAtTime(0.2, t);
    crackG.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    const crackO = ctx.createOscillator();
    crackO.type = 'sawtooth';
    crackO.frequency.setValueAtTime(200, t);
    crackO.frequency.exponentialRampToValueAtTime(50, t + 0.06);
    crackO.connect(dist);
    dist.connect(crackG);
    crackG.connect(_master);
    crackO.start(t);
    crackO.stop(t + 0.1);

    // Noise burst with reverb
    const buf = _noiseBuffer(0.18);
    if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 3000;
        filt.Q.value = 3;
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.3, t);
        nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        src.connect(filt);
        filt.connect(nEnv);
        nEnv.connect(_master);
        _sendReverb(nEnv, 0.5);
        src.start(t);
        src.stop(t + 0.2);
    }
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

/** Freeze Pulse — icy crystalline burst with shimmer and reverb. */
export function playFreezePulse() {
    const ctx = _ensureCtx(); if (!ctx) return; _resume();
    const t = ctx.currentTime;

    // Layered icy sweep
    const ice = _layeredOsc('triangle', 1200, 3, 35, t, t + 0.38, 0.18);
    if (!ice) return;
    const iceEnv = ctx.createGain();
    _adsr(iceEnv, t, 1.0, 0.005, 0.06, 0.35, 0.06, 0.18);
    ice.connect(iceEnv);
    iceEnv.connect(_master);
    _sendReverb(iceEnv, 0.4);
    _sendDelay(iceEnv, 0.2);

    // High crystalline noise
    _noiseBurst(10000, 3, 0.06, 0.12, t);

    // Sub crunch
    const subG = _gain(0.08);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.setValueAtTime(200, t);
        subO.frequency.exponentialRampToValueAtTime(80, t + 0.1);
        subO.connect(subG);
        subG.gain.setValueAtTime(0.08, t);
        subG.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        subO.start(t);
        subO.stop(t + 0.14);
    }
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

/** Low-HP heartbeat pulse — deep "lub-dub" thump */
export function playHeartbeat(intensity = 1) {
    const ctx = _ensureCtx();
    if (!ctx) return;
    _resume();
    const t = ctx.currentTime;
    const vol = 0.18 * Math.min(1, intensity);

    // ── "Lub" (first beat — deeper, louder) ──
    const lubG = _gain(vol);
    if (!lubG) return;
    const lubO = ctx.createOscillator();
    lubO.type = 'sine';
    lubO.frequency.setValueAtTime(55, t);
    lubO.frequency.exponentialRampToValueAtTime(30, t + 0.12);
    lubO.connect(lubG);
    _adsr(lubG, t, vol, 0.01, 0.04, 0.3, 0.01, 0.08);
    lubO.start(t);
    lubO.stop(t + 0.16);

    // Sub-harmonic layer for chest-feel
    const subG = _gain(vol * 0.6);
    if (subG) {
        const subO = ctx.createOscillator();
        subO.type = 'sine';
        subO.frequency.setValueAtTime(35, t);
        subO.frequency.exponentialRampToValueAtTime(20, t + 0.14);
        subO.connect(subG);
        _adsr(subG, t, vol * 0.6, 0.01, 0.05, 0.2, 0.01, 0.08);
        subO.start(t);
        subO.stop(t + 0.18);
    }

    // ── "Dub" (second beat — slightly higher, softer, 120ms later) ──
    const dubDelay = 0.12;
    const dubG = _gain(vol * 0.7);
    if (dubG) {
        const dubO = ctx.createOscillator();
        dubO.type = 'sine';
        dubO.frequency.setValueAtTime(65, t + dubDelay);
        dubO.frequency.exponentialRampToValueAtTime(35, t + dubDelay + 0.1);
        dubO.connect(dubG);
        _adsr(dubG, t + dubDelay, vol * 0.7, 0.008, 0.03, 0.25, 0.01, 0.06);
        dubO.start(t + dubDelay);
        dubO.stop(t + dubDelay + 0.14);
    }

    // Soft noise thump for body
    const buf = _noiseBuffer(0.06);
    if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 200;
        filt.Q.value = 1;
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(vol * 0.3, t);
        nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        src.connect(filt);
        filt.connect(nEnv);
        nEnv.connect(_master);
        src.start(t);
        src.stop(t + 0.1);
    }
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
