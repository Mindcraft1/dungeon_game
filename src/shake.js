// ── Screen Shake Module ──
// Standalone module to avoid circular imports (main.js ↔ game.js).
// Supports both random shake and directional shake (biased toward a hit direction).

let shakeIntensity = 0;
let shakeDecay = 0.88;

// Directional shake: biases the shake offset toward a direction for punchy hits
let _dirX = 0;
let _dirY = 0;
let _dirBias = 0;        // 0 = fully random, 1 = fully directional
let _dirBiasDecay = 0.85; // how fast the directional bias fades

/**
 * Trigger screen shake (random direction).
 * @param {number} intensity — initial pixel offset magnitude
 * @param {number} [decay]   — per-frame decay multiplier (0.85 = fast, 0.95 = slow)
 */
export function triggerShake(intensity, decay = 0.88) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
    shakeDecay = decay;
}

/**
 * Trigger directional screen shake — biased toward a direction.
 * The first frame punches in the direction, subsequent frames randomize.
 * @param {number} intensity — pixel offset magnitude
 * @param {number} dirX — direction x (will be normalized)
 * @param {number} dirY — direction y (will be normalized)
 * @param {number} [decay] — per-frame decay multiplier
 */
export function triggerDirectionalShake(intensity, dirX, dirY, decay = 0.86) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
    shakeDecay = decay;
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    _dirX = dirX / len;
    _dirY = dirY / len;
    _dirBias = 0.7; // start with 70% directional bias
    _dirBiasDecay = 0.6; // decays quickly to random
}

/**
 * Called once per frame from main.js to compute the current offset.
 * Returns { x, y } offset to apply via ctx.translate().
 */
export function updateShake() {
    if (shakeIntensity < 0.3) {
        shakeIntensity = 0;
        _dirBias = 0;
        return { x: 0, y: 0 };
    }

    // Random component
    const rx = (Math.random() - 0.5) * 2 * shakeIntensity;
    const ry = (Math.random() - 0.5) * 2 * shakeIntensity;

    // Directional component (punch in the hit direction)
    const dx = _dirX * shakeIntensity * 1.2;
    const dy = _dirY * shakeIntensity * 1.2;

    // Blend between directional and random
    const b = _dirBias;
    const x = rx * (1 - b) + dx * b;
    const y = ry * (1 - b) + dy * b;

    shakeIntensity *= shakeDecay;
    _dirBias *= _dirBiasDecay;
    if (_dirBias < 0.05) _dirBias = 0;

    return { x, y };
}
