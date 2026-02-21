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
    // Lush, slightly easier — fewer hazards, favors fast enemies.
    // On the first cycle dashers aren't unlocked yet, so the
    // weight boost is a no-op until cycle 2+.
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

        // Enemy spawn weight multipliers (applied to base probabilities)
        enemyWeights: {
            basic:   1.0,
            shooter: 0.8,
            dasher:  1.4,   // more fast enemies
            tank:    0.6,   // fewer tanks
        },

        // Hazard count multipliers
        hazardWeights: {
            spikes: 0.6,    // fewer traps overall
            lava:   0.5,
            arrow:  0.7,
        },

        // Player modifiers
        playerSpeedMult: 1.0,
    },

    // ── 2. DESERT (Stages 6–10, 26–30, …) ─────────────────
    // Harsh, tanky — more heavy enemies, more spike traps.
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
            basic:   1.0,
            shooter: 0.8,
            dasher:  0.7,   // fewer fast enemies
            tank:    1.5,   // more tanks
        },

        hazardWeights: {
            spikes: 1.4,    // more spikes
            lava:   0.8,
            arrow:  1.2,
        },

        playerSpeedMult: 1.0,
    },

    // ── 3. WASTELAND (Stages 11–15, 31–35, …) ─────────────
    // Dangerous — more lava, heavier enemy mix.
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
            basic:   0.8,
            shooter: 1.2,
            dasher:  1.1,
            tank:    1.3,   // more heavy enemies
        },

        hazardWeights: {
            spikes: 1.0,
            lava:   1.6,    // more lava
            arrow:  1.3,
        },

        playerSpeedMult: 1.0,
    },

    // ── 4. DEPTHS (Stages 16–20, 36–40, …) ────────────────
    // Oppressive — player is slower, more ranged/projectile threats.
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
            basic:   0.8,
            shooter: 1.5,   // more ranged enemies
            dasher:  0.9,
            tank:    1.0,
        },

        hazardWeights: {
            spikes: 0.8,
            lava:   0.8,
            arrow:  1.4,    // more projectile traps
        },

        playerSpeedMult: 0.9,  // −10% player speed
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
