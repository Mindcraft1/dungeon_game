import { TILE_SIZE, COLS, ROWS } from './constants.js';

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
