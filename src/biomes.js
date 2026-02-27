// ── Biome System ─────────────────────────────────────────────
// Biomes cycle every 10 stages (matching BOSS_STAGE_INTERVAL).
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
export const BIOME_SPACESHIP = 'spaceship';

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
            spikes: 0.6, lava: 0.5, arrow: 0.7, tar: 1.2,
        },
        playerSpeedMult: 1.0,

        // ── Visual: Ambient particles ──
        ambientParticles: {
            // Falling leaves
            leaves: { rate: 0.14, colors: ['#4caf50', '#66bb6a', '#388e3c', '#81c784', '#a5d6a7'], sizeMin: 2, sizeMax: 5 },
            // Fireflies
            fireflies: { rate: 0.04, color: '#c8e6c9', glow: true },
            // Floating pollen / spores
            pollen: { rate: 0.06, colors: ['rgba(200,230,150,0.6)', 'rgba(180,220,120,0.5)', 'rgba(255,255,200,0.4)'], sizeMin: 1, sizeMax: 2.5 },
        },

        // ── Visual: Floor decorations (drawn on ~18% of floor tiles, seeded per room) ──
        floorDecor: {
            chance: 0.18,
            types: [
                { shape: 'grass',     color: '#2e7d32', colorAlt: '#388e3c', weight: 3 },
                { shape: 'tallGrass', color: '#2e7d32', colorAlt: '#4caf50', weight: 2 },  // taller, wavier grass tufts
                { shape: 'dot',       color: '#33691e', weight: 1 },  // moss dot
                { shape: 'mushroom',  color: '#d4a057', colorAlt: '#f5deb3', weight: 1.5 }, // small mushroom cluster
                { shape: 'flower',    color: '#e040fb', colorAlt: '#ff80ab', weight: 1 },  // tiny jungle flowers
                { shape: 'root',      color: '#5d4037', colorAlt: '#795548', weight: 1.5 }, // exposed tree roots
                { shape: 'puddle',    color: 'rgba(60,120,80,0.25)', weight: 0.8 },         // mossy water puddle
                { shape: 'crack',     color: '#2a4020', weight: 0.5 },
            ],
        },

        // ── Visual: Wall decorations (drawn on ~30% of walls with exposed floor edge) ──
        wallDecor: {
            chance: 0.30,
            types: [
                { shape: 'vine',         color: '#388e3c', colorAlt: '#4caf50', weight: 3 },
                { shape: 'thickVine',    color: '#2e7d32', colorAlt: '#66bb6a', weight: 2 },  // thicker vine with multiple leaves
                { shape: 'moss',         color: '#2e7d32', weight: 2 },
                { shape: 'hangingRoot',  color: '#5d4037', colorAlt: '#795548', weight: 1.5 }, // dangling roots from walls
                { shape: 'glowMushroom', color: '#76ff03', colorAlt: '#b2ff59', weight: 1 },  // bioluminescent fungi on walls
            ],
        },

        // ── Visual: Atmospheric overlay ──
        atmosphere: {
            tintColor: 'rgba(40,130,40,0.03)',    // subtle green mist
            vignetteColor: 'rgba(5,25,5,0.40)',   // deep jungle darkness at edges
            vignetteSize: 0.35,                    // how far vignette reaches inward (0–1)
            dappledLight: true,                    // sunlight filtering through canopy
        },

        // ── Boss appearance per type ──
        bossTheme: {
            brute: {
                body: '#4e7a2e',       // mossy green
                stroke: '#2e5a10',
                eyes: '#a8d840',
                eyesFlash: '#66ff33',
                chargeAura: '#4caf50',
            },
            warlock: {
                body: '#2d6a4f',       // deep jungle green
                stroke: '#1b4332',
                innerEye: '#95d5b2',
                innerEyeFlash: '#66bb6a',
                pupil: '#0b2218',
                orbit: '#4caf50',
            },
            phantom: {
                body: '#20b2aa',       // teal-green
                stroke: '#0e6655',
                glow: '#b2dfdb',
                afterimage: '#20b2aa',
            },
            juggernaut: {
                body: '#5d4037',       // bark brown
                stroke: '#3e2723',
                armor: '#6d4c41',
                armorLight: '#8d6e63',
                viewport: '#ff5722',
                viewportGlow: '#ff8a65',
            },
        },
    },

    // ── 2. DEPTHS (Stages 6–10, 26–30, …) ────────────────
    {
        id:   BIOME_DEPTHS,
        name: 'Depths',
        nameColor: '#42a5f5',

        floorColor: '#0c1220',
        wallColor:  '#2a4878',
        wallLight:  '#4a80b8',
        wallDark:   '#152040',
        gridTint:   'rgba(80,150,220,0.04)',

        enemyWeights: {
            basic: 0.8, shooter: 1.5, dasher: 0.9, tank: 1.0,
        },
        hazardWeights: {
            spikes: 0.8, lava: 0.8, arrow: 1.4, tar: 1.0,
        },
        playerSpeedMult: 0.95,

        ambientParticles: {
            // Rising bubbles
            bubbles: { rate: 0.12, colors: ['rgba(150,200,255,0.5)', 'rgba(100,180,255,0.4)', 'rgba(180,220,255,0.35)', 'rgba(200,230,255,0.3)'], sizeMin: 1, sizeMax: 4.5 },
            // Drifting light motes
            motes: { rate: 0.05, colors: ['rgba(100,200,255,0.4)', 'rgba(150,220,255,0.3)', 'rgba(80,180,240,0.35)'], sizeMin: 2, sizeMax: 5, glow: true },
            // Tiny drifting sediment
            sediment: { rate: 0.07, colors: ['rgba(80,120,160,0.3)', 'rgba(60,100,140,0.25)', 'rgba(100,140,180,0.2)'], sizeMin: 0.8, sizeMax: 2 },
        },

        floorDecor: {
            chance: 0.20,
            types: [
                { shape: 'puddle',    color: 'rgba(50,90,170,0.3)', weight: 2.5 },     // deep water pool
                { shape: 'dot',       color: '#1e3a5e', weight: 1.5 },                  // algae
                { shape: 'crack',     color: '#1e2a40', weight: 1 },
                { shape: 'seaweed',   color: '#1b5e3b', colorAlt: '#2e8b57', weight: 2 },  // swaying seaweed
                { shape: 'barnacle',  color: '#3a5070', colorAlt: '#4a6888', weight: 1.5 }, // barnacle clusters
                { shape: 'coral',     color: '#6a3060', colorAlt: '#9a50a0', weight: 1 },  // small coral formation
                { shape: 'shell',     color: '#b0a090', colorAlt: '#d0c8b8', weight: 0.8 }, // tiny shells
            ],
        },

        wallDecor: {
            chance: 0.30,
            types: [
                { shape: 'drip',       color: '#4a6a9a', colorAlt: 'rgba(80,140,220,0.3)', weight: 3 },
                { shape: 'moss',       color: '#2e4a6e', weight: 1.5 },
                { shape: 'stalactite', color: '#3a5878', colorAlt: '#4a6888', weight: 2 },   // hanging mineral formations
                { shape: 'crystal',    color: '#42a5f5', colorAlt: '#90caf9', weight: 1.5 }, // glowing crystal cluster
                { shape: 'barnacle',   color: '#2a4060', colorAlt: '#3a5878', weight: 1.5 }, // wall barnacles
            ],
        },

        atmosphere: {
            tintColor: 'rgba(30,70,180,0.05)',
            vignetteColor: 'rgba(0,3,25,0.50)',
            vignetteSize: 0.40,
            causticLight: true,                     // underwater light caustics
        },

        // ── Boss appearance per type ──
        bossTheme: {
            brute: {
                body: '#1565c0',       // deep blue
                stroke: '#0d47a1',
                eyes: '#64b5f6',
                eyesFlash: '#42a5f5',
                chargeAura: '#1e88e5',
            },
            warlock: {
                body: '#4527a0',       // deep indigo
                stroke: '#1a237e',
                innerEye: '#b39ddb',
                innerEyeFlash: '#9575cd',
                pupil: '#0d0040',
                orbit: '#7c4dff',
            },
            phantom: {
                body: '#00838f',       // deep teal
                stroke: '#004d40',
                glow: '#b2ebf2',
                afterimage: '#00838f',
            },
            juggernaut: {
                body: '#1a237e',       // deep navy
                stroke: '#0d1642',
                armor: '#283593',
                armorLight: '#3949ab',
                viewport: '#00e5ff',
                viewportGlow: '#84ffff',
            },
        },
    },

    // ── 3. DESERT (Stages 11–15, 31–35, …) ─────────────────
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
            spikes: 1.4, lava: 0.8, arrow: 1.2, tar: 0.6,
        },
        playerSpeedMult: 1.0,

        ambientParticles: {
            // Blowing sand grains
            sand: { rate: 0.20, colors: ['#d4a056', '#c49a42', '#b8860b', '#deb887', '#c8a860'], sizeMin: 1, sizeMax: 3 },
            // Heat shimmer (rare, large, faint)
            shimmer: { rate: 0.02, color: 'rgba(255,220,150,0.25)', size: 9 },
            // Dust motes — tiny slow-floating specks
            dust: { rate: 0.06, colors: ['rgba(180,150,100,0.4)', 'rgba(200,170,120,0.35)', 'rgba(160,130,80,0.3)'], sizeMin: 0.8, sizeMax: 2 },
        },

        floorDecor: {
            chance: 0.18,
            types: [
                { shape: 'crack',     color: '#5a4528', weight: 3 },
                { shape: 'dot',       color: '#6a5535', weight: 1.5 },  // sand cluster
                { shape: 'pebble',    color: '#7a6540', weight: 2 },
                { shape: 'sandDrift', color: '#c49a42', colorAlt: '#b8860b', weight: 2.5 },  // wind-blown sand piles
                { shape: 'bone',      color: '#d4c8a0', colorAlt: '#e8dcc0', weight: 1 },    // tiny bone fragments
                { shape: 'scarab',    color: '#4a6a30', colorAlt: '#6a8a40', weight: 0.6 },  // tiny beetle
                { shape: 'rune',      color: '#8a7040', colorAlt: '#a08850', weight: 0.8 },  // ancient worn carving
            ],
        },

        wallDecor: {
            chance: 0.28,
            types: [
                { shape: 'erosion',    color: '#5a4528', colorAlt: '#4a3a20', weight: 3 },
                { shape: 'crack',      color: '#4a3a20', weight: 2 },
                { shape: 'sandLayer',  color: '#c49a42', colorAlt: '#a08040', weight: 2.5 },   // sand deposit line on wall
                { shape: 'hieroglyph', color: '#6a5535', colorAlt: '#8a7545', weight: 1.5 },   // faded wall marking
                { shape: 'scorchMark', color: '#3a2a18', colorAlt: '#5a4020', weight: 1 },     // heat damage on stone
            ],
        },

        atmosphere: {
            tintColor: 'rgba(200,160,80,0.04)',
            vignetteColor: 'rgba(40,25,5,0.35)',
            vignetteSize: 0.32,
            heatHaze: true,
        },

        // ── Boss appearance per type ──
        bossTheme: {
            brute: {
                body: '#c68a17',       // golden sand
                stroke: '#8b6914',
                eyes: '#ffe082',
                eyesFlash: '#ffcc00',
                chargeAura: '#ffa726',
            },
            warlock: {
                body: '#a0522d',       // sienna
                stroke: '#6d3a1f',
                innerEye: '#ffd54f',
                innerEyeFlash: '#ffb300',
                pupil: '#3e2723',
                orbit: '#d4a056',
            },
            phantom: {
                body: '#d4a056',       // dusty gold
                stroke: '#8d6e63',
                glow: '#fff8e1',
                afterimage: '#d4a056',
            },
            juggernaut: {
                body: '#8b6914',       // scorched gold
                stroke: '#5d4037',
                armor: '#a07b28',
                armorLight: '#c68a17',
                viewport: '#ff3d00',
                viewportGlow: '#ff6e40',
            },
        },
    },

    // ── 4. WASTELAND (Stages 16–20, 36–40, …) ─────────────
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
            spikes: 1.0, lava: 1.6, arrow: 1.3, tar: 1.4,
        },
        playerSpeedMult: 1.0,

        ambientParticles: {
            // Rising ember sparks
            embers: { rate: 0.14, colors: ['#ff6b35', '#ff4500', '#ff8c00', '#e25822'], sizeMin: 1, sizeMax: 2.5 },
            // Falling ash flakes
            ash: { rate: 0.08, colors: ['#666', '#777', '#555'], sizeMin: 1.5, sizeMax: 3 },
            // Drifting smoke wisps
            smoke: { rate: 0.04, colors: ['rgba(80,50,30,0.3)', 'rgba(60,40,25,0.25)', 'rgba(100,60,30,0.2)'], sizeMin: 4, sizeMax: 8 },
        },

        floorDecor: {
            chance: 0.18,
            types: [
                { shape: 'scorch', color: '#2a1a1a', colorAlt: '#3a2020', weight: 3 },
                { shape: 'crack',  color: '#3a2525', weight: 3 },
                { shape: 'debris', color: '#4a3535', weight: 2 },
                { shape: 'lavaPuddle', color: '#cc3300', colorAlt: '#ff6600', weight: 1.5 },
                { shape: 'ashPile',    color: '#444', colorAlt: '#555', weight: 2 },
                { shape: 'charredBone', color: '#3a3030', colorAlt: '#554540', weight: 1 },
            ],
        },

        wallDecor: {
            chance: 0.28,
            types: [
                { shape: 'glowCrack', color: '#ff4500', colorAlt: '#ff6b35', weight: 3 },
                { shape: 'crack',     color: '#3a2525', weight: 2 },
                { shape: 'sootStain', color: '#1a1010', colorAlt: '#2a1818', weight: 2 },
                { shape: 'lavaVein',  color: '#cc3300', colorAlt: '#ff6600', weight: 1.5 },
                { shape: 'ashDrip',   color: '#555', colorAlt: '#666', weight: 1.5 },
            ],
        },

        atmosphere: {
            tintColor: 'rgba(200,60,30,0.05)',
            vignetteColor: 'rgba(30,5,0,0.40)',
            vignetteSize: 0.35,
            emberGlow: true,
        },

        // ── Boss appearance per type ──
        bossTheme: {
            brute: {
                body: '#c62828',       // crimson
                stroke: '#7f0000',
                eyes: '#ff8a65',
                eyesFlash: '#ff5722',
                chargeAura: '#ff4444',
            },
            warlock: {
                body: '#7b1fa2',       // deep purple fire
                stroke: '#4a0072',
                innerEye: '#ff8a80',
                innerEyeFlash: '#ff5252',
                pupil: '#1a0020',
                orbit: '#e040fb',
            },
            phantom: {
                body: '#e65100',       // ember orange
                stroke: '#bf360c',
                glow: '#ffccbc',
                afterimage: '#e65100',
            },
            juggernaut: {
                body: '#b71c1c',       // molten red
                stroke: '#7f0000',
                armor: '#d32f2f',
                armorLight: '#ef5350',
                viewport: '#ffab00',
                viewportGlow: '#ffd740',
            },
        },
    },

    // ── 5. SPACESHIP (Stages 21–25, 41–45, …) ─────────────
    {
        id:   BIOME_SPACESHIP,
        name: 'Spaceship',
        nameColor: '#00e5ff',

        floorColor: '#0d1117',
        wallColor:  '#1c2533',
        wallLight:  '#2a3545',
        wallDark:   '#0f1922',
        gridTint:   'rgba(0,229,255,0.04)',

        enemyWeights: {
            basic: 0.7, shooter: 1.5, dasher: 1.3, tank: 1.0,
        },
        hazardWeights: {
            spikes: 0.4, lava: 0.3, arrow: 1.0, tar: 0.5,
            laser: 1.8, laser_wall: 1.6,
        },
        playerSpeedMult: 1.0,

        ambientParticles: {
            // Floating data motes / holographic dust
            dataMotes: { rate: 0.10, colors: ['rgba(0,229,255,0.4)', 'rgba(100,255,218,0.35)', 'rgba(130,177,255,0.3)'], sizeMin: 1, sizeMax: 3, glow: true },
            // Sparking electricity
            sparks: { rate: 0.06, colors: ['#00e5ff', '#18ffff', '#80d8ff'], sizeMin: 1, sizeMax: 2 },
            // Holographic glitch fragments
            holoGlitch: { rate: 0.02, colors: ['rgba(0,229,255,0.3)', 'rgba(255,23,68,0.25)', 'rgba(100,255,218,0.25)'], sizeMin: 2, sizeMax: 5 },
        },

        floorDecor: {
            chance: 0.25,
            types: [
                { shape: 'grid',       color: 'rgba(0,229,255,0.08)', weight: 4 },
                { shape: 'hullSeam',   color: '#1a2a3a', colorAlt: '#2a3a4a', weight: 3 },
                { shape: 'vent',       color: '#1a2a3a', weight: 2 },
                { shape: 'dot',        color: '#1a2a3a', weight: 1 },
                { shape: 'dataStream', color: 'rgba(0,229,255,0.06)', colorAlt: 'rgba(100,255,218,0.08)', weight: 2 },
                { shape: 'hazardMark', color: 'rgba(255,183,77,0.12)', colorAlt: 'rgba(255,138,0,0.15)', weight: 1 },
                { shape: 'oilStain',   color: 'rgba(20,30,40,0.4)', colorAlt: 'rgba(0,229,255,0.06)', weight: 1.5 },
            ],
        },

        wallDecor: {
            chance: 0.38,
            types: [
                { shape: 'panel',     color: '#2a3545', colorAlt: 'rgba(0,229,255,0.12)', weight: 4 },
                { shape: 'light',     color: '#00e5ff', weight: 3 },
                { shape: 'conduit',   color: '#2a3a4a', colorAlt: '#3a4a5a', weight: 2 },
                { shape: 'screen',    color: '#0a1520', colorAlt: 'rgba(0,229,255,0.2)', weight: 1.5 },
                { shape: 'wiring',    color: '#2a3a4a', colorAlt: '#00e5ff', weight: 1.5 },
                { shape: 'ventGrate', color: '#1a2533', colorAlt: '#0f1922', weight: 1 },
            ],
        },

        atmosphere: {
            tintColor: 'rgba(0,229,255,0.03)',
            vignetteColor: 'rgba(0,5,15,0.45)',
            vignetteSize: 0.35,
            scanlines: true,
        },

        bossTheme: {
            brute: {
                body: '#37474f',
                stroke: '#263238',
                eyes: '#00e5ff',
                eyesFlash: '#18ffff',
                chargeAura: '#00bcd4',
            },
            warlock: {
                body: '#1a237e',
                stroke: '#0d1042',
                innerEye: '#82b1ff',
                innerEyeFlash: '#448aff',
                pupil: '#000a12',
                orbit: '#00e5ff',
            },
            phantom: {
                body: '#00bfa5',
                stroke: '#00695c',
                glow: '#a7ffeb',
                afterimage: '#00bfa5',
            },
            juggernaut: {
                body: '#263238',
                stroke: '#0f1922',
                armor: '#37474f',
                armorLight: '#455a64',
                viewport: '#ff1744',
                viewportGlow: '#ff5252',
            },
            overlord: {
                body: '#0d47a1',
                stroke: '#01579b',
                innerEye: '#00e5ff',
                innerEyeFlash: '#18ffff',
                pupil: '#000a12',
                orbit: '#82b1ff',
                viewport: '#00e5ff',
                viewportGlow: '#80d8ff',
                shieldColor: '#00e5ff',
                laserColor: '#ff1744',
            },
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
