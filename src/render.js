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
    const isSpaceship = biome && biome.id === 'spaceship';

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;
            const cell = grid[row][col];

            if (cell === TILE_WALL) {
                if (isSpaceship) {
                    _drawSpaceshipWall(ctx, x, y, col, row, grid, wallColor, wallLight, wallDark, decorSeed, biome);
                } else {
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
                }
            } else if (cell === TILE_CANYON) {
                // ── Canyon / Pit tile ───────────────────────
                _drawCanyonTile(ctx, x, y, col, row, grid, decorSeed);
            } else {
                if (isSpaceship) {
                    _drawSpaceshipFloor(ctx, x, y, col, row, grid, floorColor, gridTint, decorSeed, biome);
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
        case 'grid': {
            // Circuit-trace / hull plating grid lines (spaceship floor)
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 0.5;
            // Horizontal segment
            const hx = x + 4 + h1 * 8;
            const hy = y + 10 + h2 * 20;
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(hx + 14 + h2 * 14, hy);
            ctx.stroke();
            // Right-angle junction
            const jx = hx + 14 + h2 * 14;
            ctx.beginPath();
            ctx.moveTo(jx, hy);
            ctx.lineTo(jx, hy + (h1 > 0.5 ? -8 : 8) - h2 * 4);
            ctx.stroke();
            // Small node at junction
            ctx.fillStyle = type.color;
            ctx.fillRect(jx - 1, hy - 1, 2, 2);
            break;
        }
        case 'hullSeam': {
            // Long thin horizontal seam across hull plating
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.5;
            const sy = y + 6 + h1 * 28;
            ctx.beginPath();
            ctx.moveTo(x + 1, sy);
            ctx.lineTo(x + TILE_SIZE - 1, sy);
            ctx.stroke();
            // Rivet dots along seam
            ctx.fillStyle = type.colorAlt || type.color;
            ctx.globalAlpha = 0.4;
            for (let i = 0; i < 2; i++) {
                const rx = x + 8 + i * 20 + _tileHash(col + i, row, seed + 390) * 6;
                ctx.beginPath();
                ctx.arc(rx, sy, 1, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'vent': {
            // Small floor vent grate
            ctx.globalAlpha = 0.4;
            const vx = x + 8 + h1 * 16;
            const vy = y + 8 + h2 * 16;
            const vw = 8 + h1 * 6;
            const vh = 6 + h2 * 4;
            ctx.fillStyle = '#0a0e14';
            ctx.fillRect(vx, vy, vw, vh);
            // Slats
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 0.5;
            for (let s = 0; s < 3; s++) {
                const sy2 = vy + 1.5 + s * (vh / 3);
                ctx.beginPath();
                ctx.moveTo(vx + 1, sy2);
                ctx.lineTo(vx + vw - 1, sy2);
                ctx.stroke();
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
        case 'panel': {
            // Inset wall panel with border (spaceship hull panel)
            const inset = 4;
            const pw = TILE_SIZE - inset * 2;
            const ph = TILE_SIZE - inset * 2;
            // Panel recess (darker than wall)
            ctx.fillStyle = type.color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x + inset, y + inset, pw, ph);
            // Panel border
            ctx.strokeStyle = type.colorAlt || 'rgba(0,229,255,0.12)';
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.8;
            ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, pw - 1, ph - 1);
            // Inner detail line (horizontal divider)
            ctx.globalAlpha = 0.4;
            const midY = y + TILE_SIZE / 2 + (h1 - 0.5) * 6;
            ctx.beginPath();
            ctx.moveTo(x + inset + 3, midY);
            ctx.lineTo(x + TILE_SIZE - inset - 3, midY);
            ctx.stroke();
            // Corner rivets
            ctx.fillStyle = type.colorAlt || '#3a4a5a';
            ctx.globalAlpha = 0.6;
            const rivets = [
                [x + inset + 2, y + inset + 2],
                [x + TILE_SIZE - inset - 3, y + inset + 2],
                [x + inset + 2, y + TILE_SIZE - inset - 3],
                [x + TILE_SIZE - inset - 3, y + TILE_SIZE - inset - 3],
            ];
            for (const [rx, ry] of rivets) {
                ctx.fillRect(rx, ry, 1.5, 1.5);
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'light': {
            // Horizontal LED strip light on wall surface
            ctx.globalAlpha = 0.35;
            const ly = y + TILE_SIZE - 6 + h1 * 3;
            const lx1 = x + 4;
            const lx2 = x + TILE_SIZE - 4;
            // Glow behind
            ctx.shadowColor = type.color;
            ctx.shadowBlur = 8;
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lx1, ly);
            ctx.lineTo(lx2, ly);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Bright core
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(lx1, ly);
            ctx.lineTo(lx2, ly);
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
        case 'conduit': {
            // Vertical conduit / pipe running down the wall
            ctx.globalAlpha = 0.5;
            const cx2 = x + 10 + h1 * 20;
            ctx.fillStyle = type.color;
            ctx.fillRect(cx2 - 1.5, y, 3, TILE_SIZE);
            // Bracket clamps
            ctx.fillStyle = type.colorAlt || '#4a5a6a';
            ctx.fillRect(cx2 - 3, y + 6 + h2 * 8, 6, 2);
            ctx.fillRect(cx2 - 3, y + 22 + h1 * 8, 6, 2);
            ctx.globalAlpha = 1;
            break;
        }
    }
}

// ── Spaceship biome: custom floor tile ──────────────────────
function _drawSpaceshipFloor(ctx, x, y, col, row, grid, floorColor, gridTint, seed, biome) {
    const S = TILE_SIZE;
    const h = _tileHash(col, row, seed + 1000);
    const h2 = _tileHash(col, row, seed + 1001);

    // ── Base hull plate ──
    // Alternate between 2-3 slightly different plate shades for variety
    const shadeIdx = ((col + row * 3) ^ (col * 7)) & 3;
    const shades = ['#0d1117', '#0f1319', '#0b0f14', '#10151c'];
    ctx.fillStyle = shades[shadeIdx];
    ctx.fillRect(x, y, S, S);

    // ── Panel border (every floor tile has visible plate edges) ──
    // Thin recessed groove around each plate
    ctx.strokeStyle = '#070a0e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);

    // Inner highlight on top-left edges (metallic sheen)
    ctx.strokeStyle = 'rgba(40,60,80,0.25)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + S - 2);
    ctx.lineTo(x + 2, y + 2);
    ctx.lineTo(x + S - 2, y + 2);
    ctx.stroke();

    // ── Plate markings (deterministic per tile) ──
    // Some tiles get an inset panel look
    if (h < 0.25) {
        // Double-bordered panel inset
        ctx.strokeStyle = 'rgba(0,229,255,0.06)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 5, y + 5, S - 10, S - 10);
    }
    // Some tiles get subtle directional arrow / walkway marking
    if (h > 0.85) {
        ctx.fillStyle = 'rgba(0,229,255,0.04)';
        const stripeW = 3;
        if ((col + row) % 2 === 0) {
            ctx.fillRect(x + S / 2 - stripeW / 2, y + 4, stripeW, S - 8); // vertical stripe
        } else {
            ctx.fillRect(x + 4, y + S / 2 - stripeW / 2, S - 8, stripeW); // horizontal stripe
        }
    }
    // Corner rivets on some tiles
    if (h2 > 0.6) {
        ctx.fillStyle = 'rgba(50,70,90,0.4)';
        ctx.fillRect(x + 3, y + 3, 1.5, 1.5);
        ctx.fillRect(x + S - 5, y + 3, 1.5, 1.5);
        ctx.fillRect(x + 3, y + S - 5, 1.5, 1.5);
        ctx.fillRect(x + S - 5, y + S - 5, 1.5, 1.5);
    }

    // ── Floor decor (circuit traces, vents etc.) ──
    if (biome.floorDecor) {
        const rng = _tileHash(col, row, seed);
        if (rng < biome.floorDecor.chance) {
            const type = _pickWeighted(biome.floorDecor.types, _tileHash(col, row, seed + 100));
            _drawFloorDecor(ctx, x, y, type, col, row, seed);
        }
    }
}

// ── Spaceship biome: custom wall tile ───────────────────────
function _drawSpaceshipWall(ctx, x, y, col, row, grid, wallColor, wallLight, wallDark, seed, biome) {
    const S = TILE_SIZE;
    const h = _tileHash(col, row, seed + 2000);
    const h2 = _tileHash(col, row, seed + 2001);
    const exposed = _hasFloorNeighbour(grid, row, col);

    // ── Base bulkhead fill ──
    ctx.fillStyle = wallColor;
    ctx.fillRect(x, y, S, S);

    // ── Structural look: thick bevelled edges ──
    ctx.fillStyle = wallLight;
    ctx.fillRect(x, y, S, 3);
    ctx.fillRect(x, y, 3, S);
    ctx.fillStyle = wallDark;
    ctx.fillRect(x, y + S - 3, S, 3);
    ctx.fillRect(x + S - 3, y, 3, S);

    // ── Bulkhead panel insets (most wall tiles) ──
    if (h < 0.7) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x + 6, y + 6, S - 12, S - 12);
        // Inner panel highlight
        ctx.strokeStyle = 'rgba(50,70,90,0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 6.5, y + 6.5, S - 13, S - 13);
    }

    // ── Rivets / bolts on structural edges ──
    if (h2 > 0.3) {
        ctx.fillStyle = 'rgba(60,80,100,0.5)';
        ctx.fillRect(x + 4, y + 4, 2, 2);
        ctx.fillRect(x + S - 6, y + 4, 2, 2);
        ctx.fillRect(x + 4, y + S - 6, 2, 2);
        ctx.fillRect(x + S - 6, y + S - 6, 2, 2);
    }

    // ── Exposed walls (adjacent to floor) get special treatment ──
    if (exposed) {
        // Horizontal bar / warning stripe at base (facing floor)
        ctx.fillStyle = 'rgba(0,229,255,0.06)';
        ctx.fillRect(x + 3, y + S - 6, S - 6, 2);

        // Wall decorations
        if (biome.wallDecor) {
            const rng = _tileHash(col, row, seed + 99);
            if (rng < biome.wallDecor.chance) {
                const type = _pickWeighted(biome.wallDecor.types, _tileHash(col, row, seed + 200));
                _drawWallDecor(ctx, x, y, type, col, row, seed);
            }
        }
    }

    // ── Some walls get a subtle glowing indicator light ──
    if (h > 0.88 && exposed) {
        const lx = x + S / 2 + (h2 - 0.5) * 12;
        const ly = y + S / 2 + (h - 0.5) * 8;
        ctx.fillStyle = h2 > 0.5 ? 'rgba(0,229,255,0.25)' : 'rgba(255,100,50,0.2)';
        ctx.beginPath();
        ctx.arc(lx, ly, 2, 0, Math.PI * 2);
        ctx.fill();
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
