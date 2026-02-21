// ── Screen Shake Module ──
// Standalone module to avoid circular imports (main.js ↔ game.js).

let shakeIntensity = 0;
let shakeDecay = 0.88;

/**
 * Trigger screen shake.
 * @param {number} intensity — initial pixel offset magnitude
 * @param {number} [decay]   — per-frame decay multiplier (0.85 = fast, 0.95 = slow)
 */
export function triggerShake(intensity, decay = 0.88) {
    shakeIntensity = Math.max(shakeIntensity, intensity); // keep the stronger shake
    shakeDecay = decay;
}

/**
 * Called once per frame from main.js to compute the current offset.
 * Returns { x, y } offset to apply via ctx.translate().
 */
export function updateShake() {
    if (shakeIntensity < 0.3) {
        shakeIntensity = 0;
        return { x: 0, y: 0 };
    }
    const x = (Math.random() - 0.5) * 2 * shakeIntensity;
    const y = (Math.random() - 0.5) * 2 * shakeIntensity;
    shakeIntensity *= shakeDecay;
    return { x, y };
}
