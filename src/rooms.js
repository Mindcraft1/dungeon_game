import {
    TILE_SIZE, COLS, ROWS,
    HAZARD_TYPE_SPIKES, HAZARD_TYPE_LAVA, HAZARD_TYPE_ARROW,
    HAZARD_SPIKE_INTRO_STAGE, HAZARD_LAVA_INTRO_STAGE, HAZARD_ARROW_INTRO_STAGE,
} from './constants.js';
import { Hazard } from './entities/hazard.js';
import { isWall } from './collision.js';

/** Human-readable room names for the training config screen */
export const ROOM_NAMES = [
    'Open Arena',
    'Four Pillars',
    'Central Block',
    'Horizontal Bars',
    'Scattered Pillars',
    'Corner Covers',
    'Staggered Blocks',
    'Mirror L-Walls',
    'Pillar Grid',
    'Twin Blocks',
    'Plus Barrier',
    'Pinch Points',
    'Dense Asymmetric',
    'Fortress',
];

export const TRAINING_ROOM_NAME = 'Training Room';

/** Total number of room templates available */
export function getRoomCount() { return ROOM_TEMPLATES.length; }

// Each template is 20 cols × 15 rows.
// # = wall   . = floor   S = player spawn   D = door/exit
const ROOM_TEMPLATES = [
    // 0 – Open arena (tutorial)
    [
        '####################',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '####################',
    ],
    // 1 – Four pillars
    [
        '####################',
        '#..................#',
        '#..................#',
        '#....##......##....#',
        '#....##......##....#',
        '#..................#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#..................#',
        '#....##......##....#',
        '#....##......##....#',
        '#..................#',
        '#..................#',
        '####################',
    ],
    // 2 – Central block
    [
        '####################',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#........####......#',
        '#........####......#',
        '#S.......####.....D#',
        '#........####......#',
        '#........####......#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#..................#',
        '####################',
    ],
    // 3 – Horizontal bars
    [
        '####################',
        '#..................#',
        '#..................#',
        '#..#######.........#',
        '#..................#',
        '#..................#',
        '#.........#######..#',
        '#S................D#',
        '#..#######.........#',
        '#..................#',
        '#..................#',
        '#.........#######..#',
        '#..................#',
        '#..................#',
        '####################',
    ],
    // 4 – Scattered pillars
    [
        '####################',
        '#..................#',
        '#...##.........##..#',
        '#..................#',
        '#..........##......#',
        '#..................#',
        '#......##..........#',
        '#S................D#',
        '#..........##......#',
        '#..................#',
        '#......##..........#',
        '#..................#',
        '#...##.........##..#',
        '#..................#',
        '####################',
    ],
    // 5 – Corner covers
    [
        '####################',
        '#..................#',
        '#.##............##.#',
        '#.##............##.#',
        '#..................#',
        '#.......####.......#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#.......####.......#',
        '#..................#',
        '#.##............##.#',
        '#.##............##.#',
        '#..................#',
        '####################',
    ],
    // 6 – Staggered blocks (asymmetric obstacle placement)
    [
        '####################',
        '#..................#',
        '#.####.............#',
        '#.####.............#',
        '#..................#',
        '#..........####....#',
        '#..........####....#',
        '#S................D#',
        '#......####........#',
        '#......####........#',
        '#..................#',
        '#..............##..#',
        '#..............##..#',
        '#..................#',
        '####################',
    ],
    // 7 – Mirror L-walls (two L-shapes in opposite corners)
    [
        '####################',
        '#..................#',
        '#..####............#',
        '#..#...............#',
        '#..#...............#',
        '#..................#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#..................#',
        '#...............#..#',
        '#...............#..#',
        '#............####..#',
        '#..................#',
        '####################',
    ],
    // 8 – Pillar grid (many single-tile obstacles)
    [
        '####################',
        '#..................#',
        '#...#....#....#....#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#...#....#....#....#',
        '#S................D#',
        '#...#....#....#....#',
        '#..................#',
        '#..................#',
        '#..................#',
        '#...#....#....#....#',
        '#..................#',
        '####################',
    ],
    // 9 – Twin large blocks (two big symmetric obstacles)
    [
        '####################',
        '#..................#',
        '#..................#',
        '#...####...####....#',
        '#...####...####....#',
        '#...####...####....#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#...####...####....#',
        '#...####...####....#',
        '#...####...####....#',
        '#..................#',
        '#..................#',
        '####################',
    ],
    // 10 – Plus barrier (cross-shaped wall formation)
    [
        '####################',
        '#..................#',
        '#..................#',
        '#........##........#',
        '#........##........#',
        '#...############...#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#...############...#',
        '#........##........#',
        '#........##........#',
        '#..................#',
        '#..................#',
        '####################',
    ],
    // 11 – Pinch points (walls protruding from edges)
    [
        '####################',
        '#..................#',
        '#..................#',
        '###..............###',
        '#..................#',
        '#.##..........##...#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#.##..........##...#',
        '#..................#',
        '###..............###',
        '#..................#',
        '#..................#',
        '####################',
    ],
    // 12 – Dense asymmetric (varied obstacle sizes and placement)
    [
        '####################',
        '#..................#',
        '#..##..............#',
        '#..##....##........#',
        '#........##........#',
        '#..............##..#',
        '#..............##..#',
        '#S................D#',
        '#.....##...........#',
        '#.....##...........#',
        '#........##........#',
        '#........##....##..#',
        '#..............##..#',
        '#..................#',
        '####################',
    ],
    // 13 – Fortress (ring with side openings)
    [
        '####################',
        '#..................#',
        '#..................#',
        '#....##########....#',
        '#....#........#....#',
        '#....#........#....#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#....#........#....#',
        '#....#........#....#',
        '#....##########....#',
        '#..................#',
        '#..................#',
        '####################',
    ],
];

// Special training room – open area with pillars for practicing movement + combat
const TRAINING_TEMPLATE = [
    '####################',
    '#..................#',
    '#..................#',
    '#...##........##...#',
    '#..................#',
    '#..................#',
    '#......####........#',
    '#S.....####.......D#',
    '#......####........#',
    '#..................#',
    '#..................#',
    '#...##........##...#',
    '#..................#',
    '#..................#',
    '####################',
];

/**
 * Parse a room template into a boolean grid + spawn/door positions.
 * @param {number} templateIndex – cycled through ROOM_TEMPLATES
 * @returns {{ grid: boolean[][], spawnPos: {col,row}, doorPos: {col,row} }}
 */
export function parseRoom(templateIndex) {
    const template = ROOM_TEMPLATES[templateIndex % ROOM_TEMPLATES.length];
    return _parse(template);
}

/** Parse the dedicated training room. */
export function parseTrainingRoom() {
    return _parse(TRAINING_TEMPLATE);
}

function _parse(template) {
    const grid = [];
    let spawnPos = null;
    let doorPos = null;

    for (let row = 0; row < ROWS; row++) {
        grid[row] = [];
        for (let col = 0; col < COLS; col++) {
            const ch = template[row][col];
            grid[row][col] = ch === '#';
            if (ch === 'S') spawnPos = { col, row };
            if (ch === 'D') doorPos  = { col, row };
        }
    }

    if (!spawnPos || !doorPos) {
        console.error('Room template missing S or D marker!');
    }
    return { grid, spawnPos, doorPos };
}

/**
 * Pick random free tiles for enemy spawns (min distance from player spawn).
 */
export function getEnemySpawns(grid, spawnPos, doorPos, count) {
    const free = [];

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            if (grid[row][col]) continue;
            if (col === spawnPos.col && row === spawnPos.row) continue;
            if (col === doorPos.col  && row === doorPos.row)  continue;

            const dx = col - spawnPos.col;
            const dy = row - spawnPos.row;
            if (Math.sqrt(dx * dx + dy * dy) < 5) continue;

            free.push({ col, row });
        }
    }

    // Fisher-Yates shuffle
    for (let i = free.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [free[i], free[j]] = [free[j], free[i]];
    }

    return free.slice(0, Math.min(count, free.length)).map(t => ({
        x: t.col * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * 8,
        y: t.row * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * 8,
    }));
}

// ── Hazard generation ──────────────────────────────────────

/**
 * Dynamically generate hazards for a room based on the current stage.
 * Hazards are placed on floor tiles away from the player spawn and door.
 * Count and variety increase with stage progression.
 *
 * @param {boolean[][]} grid - The room grid
 * @param {{col:number, row:number}} spawnPos - Player spawn position
 * @param {{col:number, row:number}} doorPos - Door position
 * @param {number} stage - Current game stage
 * @returns {Hazard[]}
 */
export function generateHazards(grid, spawnPos, doorPos, stage) {
    if (stage < HAZARD_SPIKE_INTRO_STAGE) return [];

    // ── Determine counts per type ──
    const spikeDiff = stage - HAZARD_SPIKE_INTRO_STAGE;
    const spikeCount = Math.min(2 + Math.floor(spikeDiff * 0.6), 6);

    const lavaCount = stage >= HAZARD_LAVA_INTRO_STAGE
        ? Math.min(1 + Math.floor((stage - HAZARD_LAVA_INTRO_STAGE) * 0.4), 3)
        : 0;

    const arrowCount = stage >= HAZARD_ARROW_INTRO_STAGE
        ? Math.min(1 + Math.floor((stage - HAZARD_ARROW_INTRO_STAGE) * 0.35), 3)
        : 0;

    // ── Collect valid floor tiles ──
    const floorTiles = [];
    for (let row = 1; row < grid.length - 1; row++) {
        for (let col = 1; col < grid[row].length - 1; col++) {
            if (grid[row][col]) continue; // skip walls

            // Not spawn or door tile
            if (col === spawnPos.col && row === spawnPos.row) continue;
            if (col === doorPos.col && row === doorPos.row) continue;

            // Min distance from spawn (3 tiles) — safe zone
            const dx = col - spawnPos.col;
            const dy = row - spawnPos.row;
            if (Math.sqrt(dx * dx + dy * dy) < 3) continue;

            // Min distance from door (2 tiles)
            const ddx = col - doorPos.col;
            const ddy = row - doorPos.row;
            if (Math.sqrt(ddx * ddx + ddy * ddy) < 2) continue;

            floorTiles.push({ col, row });
        }
    }

    // Fisher-Yates shuffle
    for (let i = floorTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [floorTiles[i], floorTiles[j]] = [floorTiles[j], floorTiles[i]];
    }

    const hazards = [];
    const usedTiles = new Set(); // "col,row" strings to prevent overlap

    let tileIdx = 0;

    // ── Place spikes (individual tiles) ──
    for (let i = 0; i < spikeCount && tileIdx < floorTiles.length; i++) {
        const t = floorTiles[tileIdx++];
        const key = `${t.col},${t.row}`;
        if (usedTiles.has(key)) { i--; continue; }
        usedTiles.add(key);
        hazards.push(new Hazard(HAZARD_TYPE_SPIKES, t.col, t.row, stage));
    }

    // ── Place lava (in small clusters of 1–3 adjacent tiles) ──
    let lavaPlaced = 0;
    while (lavaPlaced < lavaCount && tileIdx < floorTiles.length) {
        const seed = floorTiles[tileIdx++];
        const seedKey = `${seed.col},${seed.row}`;
        if (usedTiles.has(seedKey)) continue;

        usedTiles.add(seedKey);
        hazards.push(new Hazard(HAZARD_TYPE_LAVA, seed.col, seed.row, stage));
        lavaPlaced++;

        // Try to expand to 0–1 adjacent tiles for a cluster feel
        const clusterSize = Math.floor(Math.random() * 2); // 0–1 extra
        const neighbors = [
            { col: seed.col + 1, row: seed.row },
            { col: seed.col - 1, row: seed.row },
            { col: seed.col, row: seed.row + 1 },
            { col: seed.col, row: seed.row - 1 },
        ];
        // Shuffle neighbors
        for (let i = neighbors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
        }
        let added = 0;
        for (const n of neighbors) {
            if (added >= clusterSize) break;
            const nk = `${n.col},${n.row}`;
            if (usedTiles.has(nk)) continue;
            if (n.row < 1 || n.row >= grid.length - 1 || n.col < 1 || n.col >= grid[0].length - 1) continue;
            if (grid[n.row][n.col]) continue; // wall
            // Distance checks from spawn/door
            const sdx = n.col - spawnPos.col, sdy = n.row - spawnPos.row;
            if (Math.sqrt(sdx * sdx + sdy * sdy) < 3) continue;
            const ddx2 = n.col - doorPos.col, ddy2 = n.row - doorPos.row;
            if (Math.sqrt(ddx2 * ddx2 + ddy2 * ddy2) < 2) continue;

            usedTiles.add(nk);
            hazards.push(new Hazard(HAZARD_TYPE_LAVA, n.col, n.row, stage));
            added++;
        }
    }

    // ── Place arrow traps (on wall tiles adjacent to open floor) ──
    if (arrowCount > 0) {
        const arrowCandidates = _findArrowTrapPositions(grid, spawnPos, doorPos, usedTiles);
        for (let i = 0; i < arrowCount && i < arrowCandidates.length; i++) {
            const ac = arrowCandidates[i];
            hazards.push(new Hazard(HAZARD_TYPE_ARROW, ac.col, ac.row, stage, {
                dirX: ac.dirX,
                dirY: ac.dirY,
            }));
        }
    }

    return hazards;
}

/**
 * Find wall tiles suitable for arrow traps (adjacent to open floor, not border walls,
 * fires into a long clear path for maximum threat).
 */
function _findArrowTrapPositions(grid, spawnPos, doorPos, usedTiles) {
    const candidates = [];

    for (let row = 1; row < grid.length - 1; row++) {
        for (let col = 1; col < grid[0].length - 1; col++) {
            if (!grid[row][col]) continue; // not a wall

            // Check each cardinal direction for adjacent floor
            const dirs = [
                { dr: 0, dc: 1, dirX: 1, dirY: 0 },   // fire right
                { dr: 0, dc: -1, dirX: -1, dirY: 0 },  // fire left
                { dr: 1, dc: 0, dirX: 0, dirY: 1 },    // fire down
                { dr: -1, dc: 0, dirX: 0, dirY: -1 },  // fire up
            ];

            for (const d of dirs) {
                const nr = row + d.dr;
                const nc = col + d.dc;
                if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) continue;
                if (grid[nr][nc]) continue; // adjacent is also a wall

                // Make sure the arrow has at least 3 tiles of clear path
                let clearPath = 0;
                let cr = nr, cc = nc;
                while (cr >= 0 && cr < grid.length && cc >= 0 && cc < grid[0].length && !grid[cr][cc]) {
                    clearPath++;
                    cr += d.dr;
                    cc += d.dc;
                }
                if (clearPath < 3) continue;

                // Don't fire directly at spawn or door
                const adjKey = `${nc},${nr}`;
                if (nc === spawnPos.col && nr === spawnPos.row) continue;
                if (nc === doorPos.col && nr === doorPos.row) continue;

                // Don't aim directly along spawn row/col within 2 tiles
                if (d.dirX !== 0 && nr === spawnPos.row && Math.abs(col - spawnPos.col) < 4) continue;
                if (d.dirY !== 0 && nc === spawnPos.col && Math.abs(row - spawnPos.row) < 4) continue;

                candidates.push({
                    col, row,
                    dirX: d.dirX,
                    dirY: d.dirY,
                    pathLen: clearPath,
                });
            }
        }
    }

    // Prefer traps with longer clear paths (more dangerous / interesting)
    candidates.sort((a, b) => b.pathLen - a.pathLen);

    // Shuffle top candidates slightly for variety
    const top = candidates.slice(0, Math.min(10, candidates.length));
    for (let i = top.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [top[i], top[j]] = [top[j], top[i]];
    }

    return top;
}

