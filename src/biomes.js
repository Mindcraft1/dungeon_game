// ── Biome System ─────────────────────────────────────────────
// Biomes cycle every 5 stages (matching BOSS_STAGE_INTERVAL).
// They apply modifier overlays on top of the existing global
// difficulty progression — they NEVER override unlock gates,
// only tweak spawn weights, hazard counts, visuals, and
// player parameters.
// ─────────────────────────────────────────────────────────────

import { BOSS_STAGE_INTERVAL } from './constants.js';

// ── Biome IDs ──
export const BIOME_JUNGLE    = 'jungle';
export const BIOME_DESERT    = 'desert';
export const BIOME_WASTELAND = 'wasteland';
export const BIOME_DEPTHS    = 'depths';

// ── Biome definitions ──
const BIOMES = [
    // ── 1. JUNGLE (Stages 1–5, 21–25, …) ──────────────────
    {
        id:   BIOME_JUNGLE,
        name: 'Jungle',
        nameColor: '#66bb6a',

        // Room tile colors
        floorColor: '#1a2e1a',
        wallColor:  '#3a5a2e',
        wallLight:  '#4a6a38',
        wallDark:   '#2a4020',
        gridTint:   'rgba(100,255,100,0.03)',

        // Enemy spawn weight multipliers
        enemyWeights: {
            basic: 1.0, shooter: 0.8, dasher: 1.4, tank: 0.6,
        },
        // Hazard count multipliers
        hazardWeights: {
            spikes: 0.6, lava: 0.5, arrow: 0.7,
        },
        playerSpeedMult: 1.0,

        // ── Visual: Ambient particles ──
        ambientParticles: {
            // Falling leaves
            leaves: { rate: 0.12, colors: ['#4caf50', '#66bb6a', '#388e3c', '#81c784'], sizeMin: 2, sizeMax: 4 },
            // Fireflies
            fireflies: { rate: 0.03, color: '#c8e6c9', glow: true },
        },

        // ── Visual: Floor decorations (drawn on ~12% of floor tiles, seeded per room) ──
        floorDecor: {
            chance: 0.12,
            types: [
                { shape: 'grass',   color: '#2e7d32', colorAlt: '#388e3c', weight: 3 },
                { shape: 'dot',     color: '#33691e', weight: 2 },  // moss dot
                { shape: 'crack',   color: '#2a4020', weight: 1 },
            ],
        },

        // ── Visual: Wall decorations (drawn on ~20% of walls with exposed floor edge) ──
        wallDecor: {
            chance: 0.20,
            types: [
                { shape: 'vine',   color: '#388e3c', colorAlt: '#4caf50', weight: 3 },
                { shape: 'moss',   color: '#2e7d32', weight: 2 },
            ],
        },

        // ── Visual: Atmospheric overlay ──
        atmosphere: {
            tintColor: 'rgba(50,150,50,0.04)',   // subtle green mist
            vignetteColor: 'rgba(10,30,10,0.35)', // warm dark green
            vignetteSize: 0.30,                    // how far vignette reaches inward (0–1)
        },
    },

    // ── 2. DESERT (Stages 6–10, 26–30, …) ─────────────────
    {
        id:   BIOME_DESERT,
        name: 'Desert',
        nameColor: '#ffa726',

        floorColor: '#2e251a',
        wallColor:  '#6a5535',
        wallLight:  '#7a6540',
        wallDark:   '#5a4528',
        gridTint:   'rgba(255,200,100,0.03)',

        enemyWeights: {
            basic: 1.0, shooter: 0.8, dasher: 0.7, tank: 1.5,
        },
        hazardWeights: {
            spikes: 1.4, lava: 0.8, arrow: 1.2,
        },
        playerSpeedMult: 1.0,

        ambientParticles: {
            // Blowing sand grains
            sand: { rate: 0.18, colors: ['#d4a056', '#c49a42', '#b8860b'], sizeMin: 1, sizeMax: 2.5 },
            // Heat shimmer (rare, large, faint)
            shimmer: { rate: 0.015, color: 'rgba(255,220,150,0.3)', size: 8 },
        },

        floorDecor: {
            chance: 0.10,
            types: [
                { shape: 'crack',  color: '#5a4528', weight: 4 },
                { shape: 'dot',    color: '#6a5535', weight: 2 },  // sand cluster
                { shape: 'pebble', color: '#7a6540', weight: 2 },
            ],
        },

        wallDecor: {
            chance: 0.18,
            types: [
                { shape: 'erosion', color: '#5a4528', colorAlt: '#4a3a20', weight: 3 },
                { shape: 'crack',   color: '#4a3a20', weight: 2 },
            ],
        },

        atmosphere: {
            tintColor: 'rgba(200,160,80,0.04)',
            vignetteColor: 'rgba(40,25,5,0.30)',
            vignetteSize: 0.28,
        },
    },

    // ── 3. WASTELAND (Stages 11–15, 31–35, …) ─────────────
    {
        id:   BIOME_WASTELAND,
        name: 'Wasteland',
        nameColor: '#ef5350',

        floorColor: '#1e1a1a',
        wallColor:  '#4a3535',
        wallLight:  '#5a4545',
        wallDark:   '#3a2525',
        gridTint:   'rgba(255,100,50,0.03)',

        enemyWeights: {
            basic: 0.8, shooter: 1.2, dasher: 1.1, tank: 1.3,
        },
        hazardWeights: {
            spikes: 1.0, lava: 1.6, arrow: 1.3,
        },
        playerSpeedMult: 1.0,

        ambientParticles: {
            // Rising ember sparks
            embers: { rate: 0.14, colors: ['#ff6b35', '#ff4500', '#ff8c00', '#e25822'], sizeMin: 1, sizeMax: 2.5 },
            // Falling ash flakes
            ash: { rate: 0.08, colors: ['#666', '#777', '#555'], sizeMin: 1.5, sizeMax: 3 },
        },

        floorDecor: {
            chance: 0.12,
            types: [
                { shape: 'scorch', color: '#2a1a1a', colorAlt: '#3a2020', weight: 3 },
                { shape: 'crack',  color: '#3a2525', weight: 3 },
                { shape: 'debris', color: '#4a3535', weight: 2 },
            ],
        },

        wallDecor: {
            chance: 0.22,
            types: [
                { shape: 'glowCrack', color: '#ff4500', colorAlt: '#ff6b35', weight: 3 },
                { shape: 'crack',     color: '#3a2525', weight: 2 },
            ],
        },

        atmosphere: {
            tintColor: 'rgba(200,60,30,0.05)',
            vignetteColor: 'rgba(30,5,0,0.40)',
            vignetteSize: 0.35,
        },
    },

    // ── 4. DEPTHS (Stages 16–20, 36–40, …) ────────────────
    {
        id:   BIOME_DEPTHS,
        name: 'Depths',
        nameColor: '#42a5f5',

        floorColor: '#141a2e',
        wallColor:  '#2e3a5a',
        wallLight:  '#3a4a6a',
        wallDark:   '#1e2a40',
        gridTint:   'rgba(100,150,255,0.04)',

        enemyWeights: {
            basic: 0.8, shooter: 1.5, dasher: 0.9, tank: 1.0,
        },
        hazardWeights: {
            spikes: 0.8, lava: 0.8, arrow: 1.4,
        },
        playerSpeedMult: 0.9,

        ambientParticles: {
            // Rising bubbles
            bubbles: { rate: 0.10, colors: ['rgba(150,200,255,0.5)', 'rgba(100,180,255,0.4)', 'rgba(180,220,255,0.35)'], sizeMin: 1.5, sizeMax: 4 },
            // Drifting light motes
            motes: { rate: 0.04, colors: ['rgba(100,200,255,0.4)', 'rgba(150,220,255,0.3)'], sizeMin: 2, sizeMax: 5, glow: true },
        },

        floorDecor: {
            chance: 0.14,
            types: [
                { shape: 'puddle', color: 'rgba(60,100,180,0.25)', weight: 3 },
                { shape: 'dot',    color: '#1e3a5e', weight: 2 },  // algae
                { shape: 'crack',  color: '#1e2a40', weight: 1 },
            ],
        },

        wallDecor: {
            chance: 0.20,
            types: [
                { shape: 'drip',   color: '#4a6a9a', colorAlt: 'rgba(80,140,220,0.3)', weight: 3 },
                { shape: 'moss',   color: '#2e4a6e', weight: 2 },
            ],
        },

        atmosphere: {
            tintColor: 'rgba(40,80,200,0.06)',
            vignetteColor: 'rgba(0,5,30,0.45)',
            vignetteSize: 0.38,
        },
    },
];

// ── Public helpers ──────────────────────────────────────────

/**
 * Get the biome for a given stage.
 * Returns null for training (stage ≤ 0) or invalid stages.
 */
export function getBiomeForStage(stage) {
    if (stage <= 0) return null;
    const biomeIndex = Math.floor((stage - 1) / BOSS_STAGE_INTERVAL);
    return BIOMES[biomeIndex % BIOMES.length];
}

/** Total number of defined biomes */
export function getBiomeCount() {
    return BIOMES.length;
}

export { BIOMES };
