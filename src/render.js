import {
    TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT,
    COLOR_FLOOR, COLOR_WALL, COLOR_WALL_LIGHT, COLOR_WALL_DARK,
    TILE_WALL, TILE_CANYON,
    CANYON_COLOR_DEEP, CANYON_COLOR_EDGE, CANYON_COLOR_RIM,
} from './constants.js';

// ── Deterministic seeded random for decorations ─────────────
// Simple hash so decorations stay stable per-tile per-room.
function _tileHash(col, row, seed) {
    let h = (col * 374761 + row * 668265 + seed * 982451) | 0;
    h = ((h >> 16) ^ h) * 0x45d9f3b | 0;
    h = ((h >> 16) ^ h) * 0x45d9f3b | 0;
    h = (h >> 16) ^ h;
    return (h & 0x7fffffff) / 0x7fffffff; // 0..1
}

function _pickWeighted(types, rng) {
    let total = 0;
    for (const t of types) total += t.weight;
    let pick = rng * total;
    for (const t of types) {
        pick -= t.weight;
        if (pick <= 0) return t;
    }
    return types[types.length - 1];
}

// ── Check if wall tile has an exposed floor neighbour ───────
function _hasFloorNeighbour(grid, row, col) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of dirs) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length && grid[r][c] === 0) return true;
    }
    return false;
}

/**
 * Draw the room grid (floor + bevelled wall tiles) with optional biome decorations.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[][]} grid
 * @param {object|null} [biome] - Optional biome object with color overrides + decor config
 * @param {number} [decorSeed] - Seed for deterministic decoration placement (e.g. stage number)
 */
export function renderRoom(ctx, grid, biome = null, decorSeed = 0) {
    const floorColor = biome ? biome.floorColor : COLOR_FLOOR;
    const wallColor  = biome ? biome.wallColor  : COLOR_WALL;
    const wallLight  = biome ? biome.wallLight  : COLOR_WALL_LIGHT;
    const wallDark   = biome ? biome.wallDark   : COLOR_WALL_DARK;
    const gridTint   = biome ? biome.gridTint   : 'rgba(255,255,255,0.03)';

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;
            const cell = grid[row][col];

            if (cell === TILE_WALL) {
                // Wall – base fill
                ctx.fillStyle = wallColor;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                // Light edge (top + left)
                ctx.fillStyle = wallLight;
                ctx.fillRect(x, y, TILE_SIZE, 2);
                ctx.fillRect(x, y, 2, TILE_SIZE);

                // Dark edge (bottom + right)
                ctx.fillStyle = wallDark;
                ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
                ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);

                // ── Wall decorations ────────────────────────
                if (biome && biome.wallDecor && _hasFloorNeighbour(grid, row, col)) {
                    const rng = _tileHash(col, row, decorSeed + 99);
                    if (rng < biome.wallDecor.chance) {
                        const type = _pickWeighted(biome.wallDecor.types, _tileHash(col, row, decorSeed + 200));
                        _drawWallDecor(ctx, x, y, type, col, row, decorSeed);
                    }
                }
            } else if (cell === TILE_CANYON) {
                // ── Canyon / Pit tile ───────────────────────
                _drawCanyonTile(ctx, x, y, col, row, grid, decorSeed);
            } else {
                // Floor
                ctx.fillStyle = floorColor;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                // Subtle tile grid
                ctx.strokeStyle = gridTint;
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

                // ── Floor decorations ───────────────────────
                if (biome && biome.floorDecor) {
                    const rng = _tileHash(col, row, decorSeed);
                    if (rng < biome.floorDecor.chance) {
                        const type = _pickWeighted(biome.floorDecor.types, _tileHash(col, row, decorSeed + 100));
                        _drawFloorDecor(ctx, x, y, type, col, row, decorSeed);
                    }
                }
            }
        }
    }
}

// ── Floor decoration shapes ─────────────────────────────────
function _drawFloorDecor(ctx, x, y, type, col, row, seed) {
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;
    const h1 = _tileHash(col, row, seed + 300);
    const h2 = _tileHash(col, row, seed + 400);

    switch (type.shape) {
        case 'grass': {
            // 2-4 small grass blades
            const count = 2 + Math.floor(h1 * 3);
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 1;
            for (let i = 0; i < count; i++) {
                const bx = x + 8 + _tileHash(col + i, row, seed + 500 + i) * 24;
                const by = y + 28 + _tileHash(col, row + i, seed + 600 + i) * 8;
                const bh = 4 + _tileHash(col + i, row + i, seed + 700) * 6;
                const lean = (_tileHash(col, row, seed + 800 + i) - 0.5) * 4;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + lean, by - bh);
                ctx.stroke();
            }
            // Occasional alt-color blade
            if (h2 > 0.5 && type.colorAlt) {
                ctx.strokeStyle = type.colorAlt;
                ctx.beginPath();
                ctx.moveTo(cx - 2, cy + 6);
                ctx.lineTo(cx + 1, cy - 3);
                ctx.stroke();
            }
            break;
        }
        case 'dot': {
            // Small cluster of 2-3 dots (moss, sand, algae)
            const count = 2 + Math.floor(h1 * 2);
            ctx.fillStyle = type.color;
            for (let i = 0; i < count; i++) {
                const dx = x + 6 + _tileHash(col + i, row, seed + 310 + i) * 28;
                const dy = y + 6 + _tileHash(col, row + i, seed + 320 + i) * 28;
                const r = 1 + _tileHash(col + i, row + i, seed + 330) * 1.5;
                ctx.beginPath();
                ctx.arc(dx, dy, r, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }
        case 'crack': {
            // Jagged crack line
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            const sx = x + 6 + h1 * 12;
            const sy = y + 8 + h2 * 8;
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + 8 + h2 * 8, sy + 4 - h1 * 6);
            ctx.lineTo(sx + 16 + h1 * 6, sy + 8 + h2 * 4);
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
        case 'pebble': {
            // 2-3 small rounded rects
            ctx.fillStyle = type.color;
            ctx.globalAlpha = 0.5;
            const count = 2 + Math.floor(h1 * 2);
            for (let i = 0; i < count; i++) {
                const px = x + 5 + _tileHash(col + i, row, seed + 340 + i) * 26;
                const py = y + 5 + _tileHash(col, row + i, seed + 350 + i) * 26;
                ctx.fillRect(px, py, 3 + h2 * 2, 2 + h1 * 2);
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'scorch': {
            // Circular scorch mark
            ctx.fillStyle = type.color;
            ctx.globalAlpha = 0.4;
            const sr = 6 + h1 * 6;
            ctx.beginPath();
            ctx.arc(cx + (h2 - 0.5) * 10, cy + (h1 - 0.5) * 10, sr, 0, Math.PI * 2);
            ctx.fill();
            if (type.colorAlt) {
                ctx.fillStyle = type.colorAlt;
                ctx.beginPath();
                ctx.arc(cx + (h2 - 0.5) * 10, cy + (h1 - 0.5) * 10, sr * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'puddle': {
            // Oval puddle
            ctx.fillStyle = type.color;
            const pw = 10 + h1 * 12;
            const ph = 6 + h2 * 8;
            ctx.beginPath();
            ctx.ellipse(cx + (h1 - 0.5) * 8, cy + (h2 - 0.5) * 6, pw / 2, ph / 2, h1 * 0.5, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'debris': {
            // Small scattered rectangles
            ctx.fillStyle = type.color;
            ctx.globalAlpha = 0.5;
            for (let i = 0; i < 3; i++) {
                const dx = x + 4 + _tileHash(col + i, row, seed + 360 + i) * 28;
                const dy = y + 4 + _tileHash(col, row + i, seed + 370 + i) * 28;
                const angle = _tileHash(col + i, row + i, seed + 380) * Math.PI;
                ctx.save();
                ctx.translate(dx, dy);
                ctx.rotate(angle);
                ctx.fillRect(-2, -1, 4, 2);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            break;
        }
    }
}

// ── Canyon / Pit tile rendering ─────────────────────────────
function _drawCanyonTile(ctx, x, y, col, row, grid, seed) {
    const S = TILE_SIZE;
    const cx = x + S / 2;
    const cy = y + S / 2;

    // Deep void fill
    ctx.fillStyle = CANYON_COLOR_DEEP;
    ctx.fillRect(x, y, S, S);

    // Inner gradient: dark center with slightly lighter edges
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, S * 0.6);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, S, S);

    // Edge highlight — draw rim on sides adjacent to non-canyon tiles
    const rimWidth = 3;
    ctx.fillStyle = CANYON_COLOR_EDGE;

    // Top edge
    const topSolid = row > 0 && grid[row - 1][col] !== TILE_CANYON;
    if (topSolid) {
        ctx.fillRect(x, y, S, rimWidth);
        ctx.fillStyle = CANYON_COLOR_RIM;
        ctx.fillRect(x, y, S, 1);
        ctx.fillStyle = CANYON_COLOR_EDGE;
    }
    // Bottom edge
    const botSolid = row < grid.length - 1 && grid[row + 1][col] !== TILE_CANYON;
    if (botSolid) {
        ctx.fillRect(x, y + S - rimWidth, S, rimWidth);
        ctx.fillStyle = CANYON_COLOR_RIM;
        ctx.fillRect(x, y + S - 1, S, 1);
        ctx.fillStyle = CANYON_COLOR_EDGE;
    }
    // Left edge
    const leftSolid = col > 0 && grid[row][col - 1] !== TILE_CANYON;
    if (leftSolid) {
        ctx.fillRect(x, y, rimWidth, S);
        ctx.fillStyle = CANYON_COLOR_RIM;
        ctx.fillRect(x, y, 1, S);
        ctx.fillStyle = CANYON_COLOR_EDGE;
    }
    // Right edge
    const rightSolid = col < grid[0].length - 1 && grid[row][col + 1] !== TILE_CANYON;
    if (rightSolid) {
        ctx.fillRect(x + S - rimWidth, y, rimWidth, S);
        ctx.fillStyle = CANYON_COLOR_RIM;
        ctx.fillRect(x + S - 1, y, 1, S);
        ctx.fillStyle = CANYON_COLOR_EDGE;
    }

    // Subtle shimmer / depth lines for visual interest
    const h1 = _tileHash(col, row, seed + 900);
    const h2 = _tileHash(col, row, seed + 901);
    ctx.strokeStyle = 'rgba(80, 50, 120, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 4 + h1 * 12, y + 6 + h2 * 8);
    ctx.lineTo(x + 20 + h2 * 10, y + 14 + h1 * 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10 + h2 * 15, y + 20 + h1 * 6);
    ctx.lineTo(x + 28 + h1 * 8, y + 30 + h2 * 6);
    ctx.stroke();
}

// ── Wall decoration shapes ──────────────────────────────────
function _drawWallDecor(ctx, x, y, type, col, row, seed) {
    const h1 = _tileHash(col, row, seed + 500);
    const h2 = _tileHash(col, row, seed + 600);

    switch (type.shape) {
        case 'vine': {
            // Dangling vine segments from top or side
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.7;
            const segments = 2 + Math.floor(h1 * 3);
            const startX = x + 8 + h2 * 24;
            let vx = startX, vy = y + TILE_SIZE - 2;
            ctx.beginPath();
            ctx.moveTo(vx, vy);
            for (let i = 0; i < segments; i++) {
                vx += (h1 - 0.4) * 6;
                vy -= 5 + h2 * 4;
                ctx.lineTo(vx, vy);
            }
            ctx.stroke();
            // Small leaf at end
            if (type.colorAlt) {
                ctx.fillStyle = type.colorAlt;
                ctx.beginPath();
                ctx.arc(vx, vy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'moss': {
            // Irregular moss patches on wall edge
            ctx.fillStyle = type.color;
            ctx.globalAlpha = 0.45;
            const count = 2 + Math.floor(h1 * 3);
            for (let i = 0; i < count; i++) {
                const mx = x + _tileHash(col + i, row, seed + 510 + i) * TILE_SIZE;
                const my = y + TILE_SIZE - 4 + _tileHash(col, row + i, seed + 520 + i) * 6;
                const mr = 2 + _tileHash(col + i, row + i, seed + 530) * 3;
                ctx.beginPath();
                ctx.arc(mx, my, mr, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'erosion': {
            // Chipped/eroded edge lines
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            const ey = y + TILE_SIZE - 1;
            ctx.moveTo(x + 2, ey);
            for (let i = 0; i < 4; i++) {
                const nx = x + 6 + i * 8 + _tileHash(col + i, row, seed + 540) * 4;
                const ny = ey - 1 - _tileHash(col, row + i, seed + 550) * 3;
                ctx.lineTo(nx, ny);
            }
            ctx.lineTo(x + TILE_SIZE - 2, ey);
            ctx.stroke();
            if (type.colorAlt) {
                ctx.strokeStyle = type.colorAlt;
                ctx.beginPath();
                ctx.moveTo(x + 4, ey - 2);
                ctx.lineTo(x + 14 + h1 * 8, ey - 3 - h2 * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'crack': {
            // Wall crack
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            const sx = x + 8 + h1 * 16;
            const sy = y + 6 + h2 * 10;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + 6, sy + 8);
            ctx.lineTo(sx + 2, sy + 18);
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
        case 'glowCrack': {
            // Glowing lava/energy crack in wall
            ctx.globalAlpha = 0.5;
            ctx.shadowColor = type.color;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 1.5;
            const sx = x + 6 + h1 * 18;
            const sy = y + 4 + h2 * 12;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + 5, sy + 10);
            ctx.lineTo(sx - 2, sy + 20);
            ctx.stroke();
            // Brighter inner line
            if (type.colorAlt) {
                ctx.strokeStyle = type.colorAlt;
                ctx.lineWidth = 0.8;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.moveTo(sx + 0.5, sy + 1);
                ctx.lineTo(sx + 5.5, sy + 10);
                ctx.lineTo(sx - 1.5, sy + 19);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            break;
        }
        case 'drip': {
            // Water drip streaks
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            const count = 1 + Math.floor(h1 * 2);
            for (let i = 0; i < count; i++) {
                const dx = x + 6 + _tileHash(col + i, row, seed + 560 + i) * 28;
                const dy1 = y + 4 + _tileHash(col, row + i, seed + 570 + i) * 10;
                const dLen = 10 + _tileHash(col + i, row + i, seed + 580) * 16;
                ctx.beginPath();
                ctx.moveTo(dx, dy1);
                ctx.lineTo(dx + (h2 - 0.5) * 2, dy1 + dLen);
                ctx.stroke();
            }
            // Drip droplet at bottom
            if (type.colorAlt) {
                ctx.fillStyle = type.colorAlt;
                const bx = x + 10 + h2 * 20;
                ctx.beginPath();
                ctx.arc(bx, y + TILE_SIZE - 3, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
    }
}

// ── Atmospheric overlay (vignette + tint) ───────────────────
let _vignetteCache = null;
let _vignetteCacheKey = '';

/**
 * Render atmospheric overlay: full-screen tint + radial vignette.
 * Call after entities but before HUD.
 */
export function renderAtmosphere(ctx, biome) {
    if (!biome || !biome.atmosphere) return;
    const atm = biome.atmosphere;

    // Full-screen color tint
    if (atm.tintColor) {
        ctx.fillStyle = atm.tintColor;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Radial vignette (cached to an offscreen canvas for perf)
    if (atm.vignetteColor && atm.vignetteSize > 0) {
        const key = atm.vignetteColor + '|' + atm.vignetteSize;
        if (_vignetteCacheKey !== key) {
            const oc = document.createElement('canvas');
            oc.width = CANVAS_WIDTH;
            oc.height = CANVAS_HEIGHT;
            const octx = oc.getContext('2d');
            const cx = CANVAS_WIDTH / 2;
            const cy = CANVAS_HEIGHT / 2;
            const outerR = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.75;
            const innerR = outerR * (1 - atm.vignetteSize);
            const grad = octx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, atm.vignetteColor);
            octx.fillStyle = grad;
            octx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            _vignetteCache = oc;
            _vignetteCacheKey = key;
        }
        ctx.drawImage(_vignetteCache, 0, 0);
    }
}
