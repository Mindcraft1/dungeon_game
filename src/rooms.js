import {
    TILE_SIZE, COLS, ROWS,
    TILE_FLOOR, TILE_WALL, TILE_CANYON,
    HAZARD_TYPE_SPIKES, HAZARD_TYPE_LAVA, HAZARD_TYPE_ARROW, HAZARD_TYPE_TAR,
    HAZARD_TYPE_LASER, HAZARD_TYPE_LASER_WALL,
    HAZARD_SPIKE_INTRO_STAGE, HAZARD_LAVA_INTRO_STAGE, HAZARD_ARROW_INTRO_STAGE, HAZARD_TAR_INTRO_STAGE,
    HAZARD_LASER_INTRO_STAGE, HAZARD_LASER_WALL_INTRO_STAGE,
    CANYON_INTRO_STAGE,
    CANYON_COUNT_STAGE_11_20, CANYON_COUNT_STAGE_21_30, CANYON_COUNT_STAGE_31,
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
    // 7 – Mirror L-walls (two L-shapes in opposite corners) + canyon pits
    [
        '####################',
        '#..................#',
        '#..####............#',
        '#..#..CC...........#',
        '#..#...............#',
        '#..................#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#..................#',
        '#...............#..#',
        '#..........CC...#..#',
        '#............####..#',
        '#..................#',
        '####################',
    ],
    // 8 – Pillar grid (many single-tile obstacles) + canyon pits
    [
        '####################',
        '#..................#',
        '#...#....#....#....#',
        '#.........CC.......#',
        '#..................#',
        '#..................#',
        '#...#....#....#....#',
        '#S................D#',
        '#...#....#....#....#',
        '#..................#',
        '#..................#',
        '#.......CC.........#',
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
    // 11 – Pinch points (walls protruding from edges) + canyon pits
    [
        '####################',
        '#..................#',
        '#..................#',
        '###.....CC......###',
        '#..................#',
        '#.##..........##...#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#.##..........##...#',
        '#..................#',
        '###......CC.....###',
        '#..................#',
        '#..................#',
        '####################',
    ],
    // 12 – Dense asymmetric (varied obstacle sizes and placement) + canyon pits
    [
        '####################',
        '#..................#',
        '#..##..............#',
        '#..##....##........#',
        '#........##..CC....#',
        '#..............##..#',
        '#..............##..#',
        '#S................D#',
        '#.....##...........#',
        '#.....##...........#',
        '#..CC....##........#',
        '#........##....##..#',
        '#..............##..#',
        '#..................#',
        '####################',
    ],
    // 13 – Fortress (ring with side openings) + canyon pits
    [
        '####################',
        '#..................#',
        '#..................#',
        '#....##########....#',
        '#....#..CC....#....#',
        '#....#........#....#',
        '#..................#',
        '#S................D#',
        '#..................#',
        '#....#........#....#',
        '#....#....CC..#....#',
        '#....##########....#',
        '#..................#',
        '#..................#',
        '####################',
    ],
];

// Boss arena – open room with 4 corner pillars for cover
const BOSS_TEMPLATE = [
    '####################',
    '#..................#',
    '#..................#',
    '#..##..........##..#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#S................D#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..##..........##..#',
    '#..................#',
    '#..................#',
    '####################',
];

export const BOSS_ROOM_NAME = 'Boss Arena';

/** Parse the dedicated boss room. */
export function parseBossRoom() {
    return _parse(BOSS_TEMPLATE);
}

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

// Shop room – open room with 6 pedestals (marked P) for shop items
// P tiles are parsed as floor but their positions are returned separately
const SHOP_TEMPLATE = [
    '####################',
    '#..................#',
    '#..####....####....#',
    '#..#..#....#..#....#',
    '#..####....####....#',
    '#..................#',
    '#......P..P..P.....#',
    '#S................D#',
    '#......P..P..P.....#',
    '#..................#',
    '#..####....####....#',
    '#..#..#....#..#....#',
    '#..####....####....#',
    '#..................#',
    '####################',
];

/** Parse the dedicated shop room. Returns grid, spawnPos, doorPos, and pedestalPositions. */
export function parseShopRoom() {
    const result = _parse(SHOP_TEMPLATE);
    // Extract pedestal positions (P characters in template)
    const pedestals = [];
    for (let row = 0; row < SHOP_TEMPLATE.length; row++) {
        for (let col = 0; col < SHOP_TEMPLATE[row].length; col++) {
            if (SHOP_TEMPLATE[row][col] === 'P') {
                pedestals.push({ col, row });
            }
        }
    }
    result.pedestalPositions = pedestals;
    return result;
}

function _parse(template) {
    const grid = [];
    let spawnPos = null;
    let doorPos = null;

    for (let row = 0; row < ROWS; row++) {
        grid[row] = [];
        for (let col = 0; col < COLS; col++) {
            const ch = template[row][col];
            grid[row][col] = ch === '#' ? TILE_WALL : ch === 'C' ? TILE_CANYON : TILE_FLOOR;
            if (ch === 'S') spawnPos = { col, row };
            if (ch === 'D') doorPos  = { col, row };
        }
    }

    if (!spawnPos || !doorPos) {
        console.error('Room template missing S or D marker!');
    }
    return { grid, spawnPos, doorPos };
}

// ── Procedural Room Generation ─────────────────────────────

/**
 * Generate a procedural room for the given stage.
 * Layout difficulty increases with stage:
 *  - More wall obstacles
 *  - Tighter corridors & chokepoints
 *  - More complex structures (pillars → walls → mazes)
 *
 * Guarantees:
 *  - S (spawn) at left, D (door) at right — always connected
 *  - Border walls always present
 *  - Playable path always exists (flood-fill validated)
 *
 * @param {number} stage - Current game stage (1-based)
 * @returns {{ grid: boolean[][], spawnPos: {col,row}, doorPos: {col,row} }}
 */
export function generateProceduralRoom(stage) {
    // Seeded RNG for reproducibility within a run (but different each run)
    let _seed = (stage * 9973 + (Date.now() & 0xffff)) | 0;
    function _rng() {
        _seed = (_seed * 16807 + 0) % 2147483647;
        return (_seed & 0x7fffffff) / 0x7fffffff;
    }
    function _rngInt(min, max) {
        return min + Math.floor(_rng() * (max - min + 1));
    }

    // Start with empty room (border walls)
    const template = [];
    for (let r = 0; r < ROWS; r++) {
        let row = '';
        for (let c = 0; c < COLS; c++) {
            if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
                row += '#';
            } else {
                row += '.';
            }
        }
        template.push(row.split(''));
    }

    // Fixed spawn & door positions
    const spawnRow = 7;
    const spawnCol = 1;
    const doorRow = 7;
    const doorCol = COLS - 2;
    template[spawnRow][spawnCol] = 'S';
    template[doorRow][doorCol] = 'D';

    // ── Difficulty scaling ──
    // difficulty ramps from 0.0 (stage 1) to ~1.0 (stage 20+)
    const difficulty = Math.min(1.0, (stage - 1) / 19);

    // Number of obstacle structures to place
    const minStructures = 1 + Math.floor(difficulty * 3);
    const maxStructures = 3 + Math.floor(difficulty * 6);
    const structCount = _rngInt(minStructures, maxStructures);

    // Place obstacle structures
    for (let s = 0; s < structCount; s++) {
        const structType = _rng();

        if (structType < 0.3) {
            // Single pillar (1×1 or 2×2)
            const size = difficulty > 0.3 && _rng() < 0.5 ? 2 : 1;
            _placePillar(template, size, _rng, _rngInt);
        } else if (structType < 0.6) {
            // Horizontal wall segment
            const len = _rngInt(2, 3 + Math.floor(difficulty * 4));
            _placeHWall(template, len, _rng, _rngInt);
        } else if (structType < 0.8) {
            // Vertical wall segment
            const len = _rngInt(2, 2 + Math.floor(difficulty * 3));
            _placeVWall(template, len, _rng, _rngInt);
        } else {
            // L-shape or T-shape (harder rooms)
            if (difficulty > 0.4) {
                _placeLShape(template, _rng, _rngInt, difficulty);
            } else {
                _placePillar(template, 2, _rng, _rngInt);
            }
        }
    }

    // ── Add chokepoints at higher difficulty ──
    if (difficulty > 0.5) {
        const chokeCount = _rngInt(1, Math.floor(difficulty * 3));
        for (let i = 0; i < chokeCount; i++) {
            _placeChokepoint(template, _rng, _rngInt, difficulty);
        }
    }

    // ── Ensure connectivity (flood-fill from S to D) ──
    // If not connected, carve a path
    _ensureConnectivity(template, spawnCol, spawnRow, doorCol, doorRow);

    // ── Ensure safe zones around spawn and door ──
    _clearSafeZone(template, spawnCol, spawnRow, 2);
    _clearSafeZone(template, doorCol, doorRow, 2);

    // ── Canyon / Pit placement (stage 7+) ──
    if (stage >= CANYON_INTRO_STAGE) {
        _placeCanyons(template, spawnCol, spawnRow, doorCol, doorRow, stage, _rng, _rngInt);
    }

    // ── Eliminate isolated floor pockets ──
    // Any floor tile unreachable from spawn becomes a wall so enemies
    // can never spawn in an enclosed area the player can't reach.
    _fillUnreachable(template, spawnCol, spawnRow);

    // Parse the template
    return _parse(template.map(row => row.join('')));
}

/** Place a square pillar (1×1 or 2×2) on the grid */
function _placePillar(template, size, _rng, _rngInt) {
    const maxR = ROWS - 2 - size;
    const maxC = COLS - 2 - size;
    for (let attempt = 0; attempt < 15; attempt++) {
        const r = _rngInt(2, maxR);
        const c = _rngInt(3, maxC - 1); // avoid spawn/door columns
        if (_isNearSpecial(template, r, c, size, 3)) continue;
        for (let dr = 0; dr < size; dr++) {
            for (let dc = 0; dc < size; dc++) {
                template[r + dr][c + dc] = '#';
            }
        }
        return;
    }
}

/** Place a horizontal wall segment */
function _placeHWall(template, len, _rng, _rngInt) {
    for (let attempt = 0; attempt < 15; attempt++) {
        const r = _rngInt(2, ROWS - 3);
        const c = _rngInt(3, COLS - 3 - len);
        if (_isNearSpecial(template, r, c, 1, 3)) continue;
        if (_isNearSpecial(template, r, c + len - 1, 1, 3)) continue;
        for (let dc = 0; dc < len; dc++) {
            template[r][c + dc] = '#';
        }
        return;
    }
}

/** Place a vertical wall segment */
function _placeVWall(template, len, _rng, _rngInt) {
    for (let attempt = 0; attempt < 15; attempt++) {
        const r = _rngInt(2, ROWS - 3 - len);
        const c = _rngInt(3, COLS - 4);
        if (_isNearSpecial(template, r, c, 1, 3)) continue;
        if (_isNearSpecial(template, r + len - 1, c, 1, 3)) continue;
        for (let dr = 0; dr < len; dr++) {
            template[r + dr][c] = '#';
        }
        return;
    }
}

/** Place an L-shaped wall */
function _placeLShape(template, _rng, _rngInt, difficulty) {
    const hLen = _rngInt(2, 3 + Math.floor(difficulty * 2));
    const vLen = _rngInt(2, 3 + Math.floor(difficulty * 2));

    for (let attempt = 0; attempt < 15; attempt++) {
        const r = _rngInt(2, ROWS - 3 - vLen);
        const c = _rngInt(3, COLS - 4 - hLen);
        if (_isNearSpecial(template, r, c, 1, 3)) continue;

        // Horizontal part
        for (let dc = 0; dc < hLen; dc++) {
            template[r][c + dc] = '#';
        }
        // Vertical part (going down from the left end)
        for (let dr = 1; dr < vLen; dr++) {
            template[r + dr][c] = '#';
        }
        return;
    }
}

/** Place a chokepoint — walls protruding from top and bottom */
function _placeChokepoint(template, _rng, _rngInt, difficulty) {
    for (let attempt = 0; attempt < 15; attempt++) {
        const c = _rngInt(5, COLS - 6);
        // Check if column is near spawn/door
        if (c <= 3 || c >= COLS - 4) continue;

        const topLen = _rngInt(2, 3 + Math.floor(difficulty * 2));
        const botLen = _rngInt(2, 3 + Math.floor(difficulty * 2));

        // Ensure a gap of at least 3 tiles in the middle
        const totalBlocked = topLen + botLen;
        const innerHeight = ROWS - 2; // 13 inner tiles
        if (totalBlocked > innerHeight - 3) continue;

        // Place from top
        for (let dr = 0; dr < topLen; dr++) {
            const r = 1 + dr;
            if (template[r][c] !== 'S' && template[r][c] !== 'D') {
                template[r][c] = '#';
            }
        }
        // Place from bottom
        for (let dr = 0; dr < botLen; dr++) {
            const r = ROWS - 2 - dr;
            if (template[r][c] !== 'S' && template[r][c] !== 'D') {
                template[r][c] = '#';
            }
        }
        return;
    }
}

/** Check if a position is too close to S or D markers */
function _isNearSpecial(template, r, c, size, minDist) {
    for (let dr = -minDist; dr < size + minDist; dr++) {
        for (let dc = -minDist; dc < size + minDist; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
            const ch = template[rr][cc];
            if (ch === 'S' || ch === 'D') return true;
        }
    }
    return false;
}

/** Clear a safe zone around a position (set to floor) */
function _clearSafeZone(template, col, row, radius) {
    for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
            const rr = row + dr;
            const cc = col + dc;
            if (rr <= 0 || rr >= ROWS - 1 || cc <= 0 || cc >= COLS - 1) continue;
            const ch = template[rr][cc];
            if (ch !== 'S' && ch !== 'D') {
                template[rr][cc] = '.';
            }
        }
    }
}

/** Ensure S and D are connected via flood-fill; carve a path if not */
function _ensureConnectivity(template, sc, sr, dc, dr) {
    // Flood-fill from spawn
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    const queue = [{ r: sr, c: sc }];
    visited[sr][sc] = true;

    while (queue.length > 0) {
        const { r, c } = queue.shift();
        if (r === dr && c === dc) return; // Already connected

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [ddr, ddc] of dirs) {
            const nr = r + ddr;
            const nc = c + ddc;
            if (nr <= 0 || nr >= ROWS - 1 || nc <= 0 || nc >= COLS - 1) continue;
            if (visited[nr][nc]) continue;
            const ch = template[nr][nc];
            if (ch === '#' || ch === 'C') continue;  // walls and canyons block
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
        }
    }

    // Not connected — carve a simple path from spawn to door
    let cr = sr, cc = sc;
    while (cc !== dc || cr !== dr) {
        if (cc < dc) cc++;
        else if (cc > dc) cc--;
        else if (cr < dr) cr++;
        else if (cr > dr) cr--;

        if (template[cr][cc] === '#' || template[cr][cc] === 'C') {
            template[cr][cc] = '.';
        }
        // Also clear one tile above or below for wider passage
        if (cr > 1 && template[cr - 1][cc] === '#' && Math.random() < 0.3) {
            template[cr - 1][cc] = '.';
        }
        if (cr < ROWS - 2 && template[cr + 1][cc] === '#' && Math.random() < 0.3) {
            template[cr + 1][cc] = '.';
        }
    }
}

/**
 * Flood-fill from spawn and convert every floor tile that is NOT reachable
 * into a wall. This prevents enemies from spawning in isolated pockets
 * created by obstacle placement. Canyon tiles are left as-is (non-walkable).
 */
function _fillUnreachable(template, sc, sr) {
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    const queue = [{ r: sr, c: sc }];
    visited[sr][sc] = true;

    while (queue.length > 0) {
        const { r, c } = queue.shift();
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr <= 0 || nr >= ROWS - 1 || nc <= 0 || nc >= COLS - 1) continue;
            if (visited[nr][nc]) continue;
            const ch = template[nr][nc];
            if (ch === '#' || ch === 'C') continue;  // walls and canyons block flood-fill
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
        }
    }

    // Any non-wall, non-canyon tile that wasn't visited is unreachable → make it a wall
    for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
            if (!visited[r][c] && template[r][c] !== '#' && template[r][c] !== 'C') {
                template[r][c] = '#';
            }
        }
    }
}

// ── Canyon / Pit Placement ─────────────────────────────────

/**
 * Place canyon tiles in a procedural room.
 * - Only on floor tiles away from spawn/door
 * - After placement, BFS-validate that a walkable path S→D still exists
 * - If a canyon would break connectivity or isolate enemy-spawnable floor, revert it
 */
function _placeCanyons(template, sc, sr, dc, dr, stage, _rng, _rngInt) {
    // Determine how many canyon tiles to place based on stage bracket
    let minC, maxC;
    if (stage <= 20) {
        [minC, maxC] = CANYON_COUNT_STAGE_11_20;
    } else if (stage <= 30) {
        [minC, maxC] = CANYON_COUNT_STAGE_21_30;
    } else {
        [minC, maxC] = CANYON_COUNT_STAGE_31;
    }
    const targetCount = _rngInt(minC, maxC);

    // Collect candidate floor tiles (not near spawn/door, not border)
    const candidates = [];
    for (let r = 2; r < ROWS - 2; r++) {
        for (let c = 2; c < COLS - 2; c++) {
            const ch = template[r][c];
            if (ch !== '.') continue;

            // Min distance from spawn (4 tiles)
            const dxS = c - sc, dyS = r - sr;
            if (Math.sqrt(dxS * dxS + dyS * dyS) < 4) continue;

            // Min distance from door (3 tiles)
            const dxD = c - dc, dyD = r - dr;
            if (Math.sqrt(dxD * dxD + dyD * dyD) < 3) continue;

            candidates.push({ r, c });
        }
    }

    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(_rng() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Place canyons one by one, validating after each
    let placed = 0;
    for (const cand of candidates) {
        if (placed >= targetCount) break;

        // Tentatively place canyon
        template[cand.r][cand.c] = 'C';

        // Validate: S→D still connected via walkable tiles
        if (!_bfsConnected(template, sc, sr, dc, dr)) {
            // Revert
            template[cand.r][cand.c] = '.';
            continue;
        }

        // Validate: no floor tile becomes isolated (unreachable from spawn)
        // We do a quick check — if any immediate floor neighbor becomes cut off, revert
        if (_createsIsolatedFloor(template, sc, sr)) {
            template[cand.r][cand.c] = '.';
            continue;
        }

        placed++;
    }
}

/**
 * BFS check: is there a walkable path from (sc,sr) to (dc,dr)?
 * Only walks through floor tiles ('.', 'S', 'D').
 */
function _bfsConnected(template, sc, sr, dc, dr) {
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    const queue = [{ r: sr, c: sc }];
    visited[sr][sc] = true;

    while (queue.length > 0) {
        const { r, c } = queue.shift();
        if (r === dr && c === dc) return true;

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [ddr, ddc] of dirs) {
            const nr = r + ddr;
            const nc = c + ddc;
            if (nr <= 0 || nr >= ROWS - 1 || nc <= 0 || nc >= COLS - 1) continue;
            if (visited[nr][nc]) continue;
            const ch = template[nr][nc];
            if (ch === '#' || ch === 'C') continue;
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
        }
    }
    return false;
}

/**
 * Check if placing a canyon has isolated any floor tiles from the spawn.
 * Returns true if any floor tile is unreachable from spawn (bad — would create
 * islands where enemies could spawn but player can't reach).
 */
function _createsIsolatedFloor(template, sc, sr) {
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    const queue = [{ r: sr, c: sc }];
    visited[sr][sc] = true;

    while (queue.length > 0) {
        const { r, c } = queue.shift();
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr <= 0 || nr >= ROWS - 1 || nc <= 0 || nc >= COLS - 1) continue;
            if (visited[nr][nc]) continue;
            const ch = template[nr][nc];
            if (ch === '#' || ch === 'C') continue;
            visited[nr][nc] = true;
            queue.push({ r: nr, c: nc });
        }
    }

    // Check if any walkable floor tile is not visited
    for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
            const ch = template[r][c];
            if (ch !== '#' && ch !== 'C' && !visited[r][c]) {
                return true;  // found isolated floor
            }
        }
    }
    return false;
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
export function generateHazards(grid, spawnPos, doorPos, stage, hazardWeights = null) {
    if (stage < HAZARD_SPIKE_INTRO_STAGE) return [];

    // ── Determine base counts per type ──
    const spikeDiff = stage - HAZARD_SPIKE_INTRO_STAGE;
    let spikeCount = Math.min(2 + Math.floor(spikeDiff * 0.6), 6);

    let lavaCount = stage >= HAZARD_LAVA_INTRO_STAGE
        ? Math.min(1 + Math.floor((stage - HAZARD_LAVA_INTRO_STAGE) * 0.4), 3)
        : 0;

    let arrowCount = stage >= HAZARD_ARROW_INTRO_STAGE
        ? Math.min(1 + Math.floor((stage - HAZARD_ARROW_INTRO_STAGE) * 0.35), 3)
        : 0;

    let tarCount = stage >= HAZARD_TAR_INTRO_STAGE
        ? Math.min(1 + Math.floor((stage - HAZARD_TAR_INTRO_STAGE) * 0.45), 4)
        : 0;

    let laserCount = stage >= HAZARD_LASER_INTRO_STAGE
        ? Math.min(1 + Math.floor((stage - HAZARD_LASER_INTRO_STAGE) * 0.4), 3)
        : 0;

    let laserWallCount = stage >= HAZARD_LASER_WALL_INTRO_STAGE
        ? Math.min(1 + Math.floor((stage - HAZARD_LASER_WALL_INTRO_STAGE) * 0.3), 2)
        : 0;

    // ── Apply biome hazard weight modifiers ──
    if (hazardWeights) {
        spikeCount = Math.max(0, Math.round(spikeCount * (hazardWeights.spikes || 1)));
        lavaCount  = Math.max(0, Math.round(lavaCount  * (hazardWeights.lava   || 1)));
        arrowCount = Math.max(0, Math.round(arrowCount * (hazardWeights.arrow  || 1)));
        tarCount   = Math.max(0, Math.round(tarCount   * (hazardWeights.tar    || 1)));
        laserCount = Math.max(0, Math.round(laserCount * (hazardWeights.laser  || 0)));
        laserWallCount = Math.max(0, Math.round(laserWallCount * (hazardWeights.laser_wall || 0)));
    } else {
        // No biome weights → laser hazards only appear in spaceship biome (weight defaults to 0)
        laserCount = 0;
        laserWallCount = 0;
    }

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

    // ── Place tar / oil pools (in small clusters of 2–3 adjacent tiles) ──
    let tarPlaced = 0;
    while (tarPlaced < tarCount && tileIdx < floorTiles.length) {
        const seed = floorTiles[tileIdx++];
        const seedKey = `${seed.col},${seed.row}`;
        if (usedTiles.has(seedKey)) continue;

        usedTiles.add(seedKey);
        hazards.push(new Hazard(HAZARD_TYPE_TAR, seed.col, seed.row, stage));
        tarPlaced++;

        // Expand to 1–2 adjacent tiles for a sticky puddle feel
        const clusterSize = 1 + Math.floor(Math.random() * 2); // 1–2 extra
        const neighbors = [
            { col: seed.col + 1, row: seed.row },
            { col: seed.col - 1, row: seed.row },
            { col: seed.col, row: seed.row + 1 },
            { col: seed.col, row: seed.row - 1 },
        ];
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
            const sdx = n.col - spawnPos.col, sdy = n.row - spawnPos.row;
            if (Math.sqrt(sdx * sdx + sdy * sdy) < 3) continue;
            const ddx2 = n.col - doorPos.col, ddy2 = n.row - doorPos.row;
            if (Math.sqrt(ddx2 * ddx2 + ddy2 * ddy2) < 2) continue;

            usedTiles.add(nk);
            hazards.push(new Hazard(HAZARD_TYPE_TAR, n.col, n.row, stage));
            added++;
        }
    }

    // ── Place laser beams (on wall tiles adjacent to floor, fires beam across room) ──
    if (laserCount > 0) {
        const laserCandidates = _findLaserPositions(grid, spawnPos, doorPos, usedTiles);
        for (let i = 0; i < laserCount && i < laserCandidates.length; i++) {
            const lc = laserCandidates[i];
            usedTiles.add(`${lc.col},${lc.row}`);
            hazards.push(new Hazard(HAZARD_TYPE_LASER, lc.col, lc.row, stage, {
                dirX: lc.dirX,
                dirY: lc.dirY,
                beamLength: lc.beamLength,
            }));
        }
    }

    // ── Place laser walls (spanning 2-3 floor tiles, blocking passages) ──
    if (laserWallCount > 0) {
        const wallCandidates = _findLaserWallPositions(grid, spawnPos, doorPos, usedTiles);
        // Pick laser walls ensuring a minimum tile gap between any two,
        // so the player can never get trapped between two adjacent doors.
        const MIN_LASER_WALL_GAP = 4; // tiles
        const chosen = [];
        for (const wc of wallCandidates) {
            if (chosen.length >= laserWallCount) break;
            // Check distance to every already-chosen laser wall (centre-to-centre)
            const cx = wc.axis === 'h' ? wc.col + wc.span / 2 : wc.col;
            const cy = wc.axis === 'v' ? wc.row + wc.span / 2 : wc.row;
            let tooClose = false;
            for (const prev of chosen) {
                const px = prev.axis === 'h' ? prev.col + prev.span / 2 : prev.col;
                const py = prev.axis === 'v' ? prev.row + prev.span / 2 : prev.row;
                const dist = Math.abs(cx - px) + Math.abs(cy - py); // Manhattan distance
                if (dist < MIN_LASER_WALL_GAP) { tooClose = true; break; }
            }
            if (tooClose) continue;
            chosen.push(wc);
        }
        for (const wc of chosen) {
            // Mark all tiles in the wall span as used
            for (let s = 0; s < wc.span; s++) {
                const tc = wc.axis === 'h' ? wc.col + s : wc.col;
                const tr = wc.axis === 'h' ? wc.row : wc.row + s;
                usedTiles.add(`${tc},${tr}`);
            }
            hazards.push(new Hazard(HAZARD_TYPE_LASER_WALL, wc.col, wc.row, stage, {
                axis: wc.axis,
                span: wc.span,
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
            if (grid[row][col] !== 1) continue; // only actual wall tiles (not floor or canyon)

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

/**
 * Find wall tiles suitable for laser emitters — similar to arrow traps but prefers
 * longer clear paths (laser beams are most interesting when they sweep across a room).
 */
function _findLaserPositions(grid, spawnPos, doorPos, usedTiles) {
    const candidates = [];
    const rows = grid.length;
    const cols = grid[0].length;

    for (let row = 1; row < rows - 1; row++) {
        for (let col = 1; col < cols - 1; col++) {
            if (grid[row][col] !== 1) continue; // must be wall
            const key = `${col},${row}`;
            if (usedTiles.has(key)) continue;

            const dirs = [
                { dr: 0, dc: 1, dirX: 1, dirY: 0 },
                { dr: 0, dc: -1, dirX: -1, dirY: 0 },
                { dr: 1, dc: 0, dirX: 0, dirY: 1 },
                { dr: -1, dc: 0, dirX: 0, dirY: -1 },
            ];

            for (const d of dirs) {
                const nr = row + d.dr;
                const nc = col + d.dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                if (grid[nr][nc]) continue; // adjacent must be floor

                // Measure clear path length in pixels
                let clearTiles = 0;
                let cr = nr, cc = nc;
                while (cr >= 0 && cr < rows && cc >= 0 && cc < cols && !grid[cr][cc]) {
                    clearTiles++;
                    cr += d.dr;
                    cc += d.dc;
                }
                if (clearTiles < 4) continue; // need a decent beam length

                // Safety: don't place if beam would start right at spawn
                if (nc === spawnPos.col && nr === spawnPos.row) continue;
                if (d.dirX !== 0 && nr === spawnPos.row && Math.abs(col - spawnPos.col) < 5) continue;
                if (d.dirY !== 0 && nc === spawnPos.col && Math.abs(row - spawnPos.row) < 5) continue;

                candidates.push({
                    col, row,
                    dirX: d.dirX,
                    dirY: d.dirY,
                    beamLength: clearTiles * TILE_SIZE,
                });
            }
        }
    }

    // Prefer longer beams — more dramatic
    candidates.sort((a, b) => b.beamLength - a.beamLength);

    // Shuffle top picks for variety
    const top = candidates.slice(0, Math.min(8, candidates.length));
    for (let i = top.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [top[i], top[j]] = [top[j], top[i]];
    }
    return top;
}

/**
 * Find positions for laser walls — horizontal or vertical barriers spanning 2-3 floor tiles.
 * Only places walls in doorway-like gaps — the span must bridge between
 * wall tiles on both ends so it acts like a gate blocking a passage.
 */
function _findLaserWallPositions(grid, spawnPos, doorPos, usedTiles) {
    const candidates = [];
    const rows = grid.length;
    const cols = grid[0].length;

    const isWallAt = (r, c) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return true; // OOB = wall
        return grid[r][c] !== 0;
    };

    // Try horizontal walls (axis 'h') — wall blocks a corridor running north/south
    // Require: wall tile immediately LEFT of span start AND immediately RIGHT of span end
    // Also require: wall above OR below every tile in the span (passage between walls)
    for (let row = 2; row < rows - 2; row++) {
        for (let col = 2; col < cols - 2; col++) {
            if (grid[row][col]) continue; // must start on floor

            for (let span = 2; span <= 3; span++) {
                if (col + span > cols - 1) continue;

                // All tiles in span must be floor and unused
                let valid = true;
                for (let s = 0; s < span; s++) {
                    if (grid[row][col + s]) { valid = false; break; }
                    const tk = `${col + s},${row}`;
                    if (usedTiles.has(tk)) { valid = false; break; }
                }
                if (!valid) continue;

                // REQUIRED: wall at both ends along the span axis (like a door frame)
                const wallLeft  = isWallAt(row, col - 1);
                const wallRight = isWallAt(row, col + span);
                if (!wallLeft || !wallRight) continue;

                // Score: prefer passages with walls above/below (tighter corridor feel)
                let sideScore = 0;
                for (let s = 0; s < span; s++) {
                    if (isWallAt(row - 1, col + s)) sideScore++;
                    if (isWallAt(row + 1, col + s)) sideScore++;
                }

                // Safety distance from spawn and door
                const midCol = col + span / 2;
                const sdx = midCol - spawnPos.col, sdy = row - spawnPos.row;
                if (Math.sqrt(sdx * sdx + sdy * sdy) < 4) continue;
                const ddx = midCol - doorPos.col, ddy = row - doorPos.row;
                if (Math.sqrt(ddx * ddx + ddy * ddy) < 3) continue;

                candidates.push({ col, row, axis: 'h', span, wallScore: 2, sideScore });
            }
        }
    }

    // Try vertical walls (axis 'v') — wall blocks a corridor running east/west
    // Require: wall tile immediately ABOVE span start AND immediately BELOW span end
    for (let row = 2; row < rows - 2; row++) {
        for (let col = 2; col < cols - 2; col++) {
            if (grid[row][col]) continue;

            for (let span = 2; span <= 3; span++) {
                if (row + span > rows - 1) continue;

                let valid = true;
                for (let s = 0; s < span; s++) {
                    if (grid[row + s][col]) { valid = false; break; }
                    const tk = `${col},${row + s}`;
                    if (usedTiles.has(tk)) { valid = false; break; }
                }
                if (!valid) continue;

                // REQUIRED: wall at both ends along the span axis
                const wallAbove = isWallAt(row - 1, col);
                const wallBelow = isWallAt(row + span, col);
                if (!wallAbove || !wallBelow) continue;

                // Score: prefer passages with walls left/right (tighter corridor)
                let sideScore = 0;
                for (let s = 0; s < span; s++) {
                    if (isWallAt(row + s, col - 1)) sideScore++;
                    if (isWallAt(row + s, col + 1)) sideScore++;
                }

                const midRow = row + span / 2;
                const sdx = col - spawnPos.col, sdy = midRow - spawnPos.row;
                if (Math.sqrt(sdx * sdx + sdy * sdy) < 4) continue;
                const ddx = col - doorPos.col, ddy = midRow - doorPos.row;
                if (Math.sqrt(ddx * ddx + ddy * ddy) < 3) continue;

                candidates.push({ col, row, axis: 'v', span, wallScore: 2, sideScore });
            }
        }
    }

    // Sort by sideScore (tighter corridors first), then span size
    candidates.sort((a, b) => (b.sideScore * 10 + b.span) - (a.sideScore * 10 + a.span));

    // Shuffle top picks for variety
    const top = candidates.slice(0, Math.min(12, candidates.length));
    for (let i = top.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [top[i], top[j]] = [top[j], top[i]];
    }
    return top;
}
