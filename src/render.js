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
    const isDepths    = biome && biome.id === 'depths';
    const isJungle    = biome && biome.id === 'jungle';
    const isDesert    = biome && biome.id === 'desert';

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;
            const cell = grid[row][col];

            if (cell === TILE_WALL) {
                if (isSpaceship) {
                    _drawSpaceshipWall(ctx, x, y, col, row, grid, wallColor, wallLight, wallDark, decorSeed, biome);
                } else if (isDepths) {
                    _drawDepthsWall(ctx, x, y, col, row, grid, wallColor, wallLight, wallDark, floorColor, decorSeed, biome);
                } else if (isJungle) {
                    _drawJungleWall(ctx, x, y, col, row, grid, wallColor, wallLight, wallDark, decorSeed, biome);
                } else if (isDesert) {
                    _drawDesertWall(ctx, x, y, col, row, grid, wallColor, wallLight, wallDark, decorSeed, biome);
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
                } else if (isJungle) {
                    _drawJungleFloor(ctx, x, y, col, row, grid, floorColor, gridTint, decorSeed, biome);
                } else if (isDepths) {
                    _drawDepthsFloor(ctx, x, y, col, row, grid, floorColor, gridTint, decorSeed, biome);
                } else if (isDesert) {
                    _drawDesertFloor(ctx, x, y, col, row, grid, floorColor, gridTint, decorSeed, biome);
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
        case 'tallGrass': {
            // Taller, wavier grass tufts with multiple blades
            const count = 3 + Math.floor(h1 * 4);
            for (let i = 0; i < count; i++) {
                const bx = x + 4 + _tileHash(col + i, row, seed + 710 + i) * 32;
                const by = y + 30 + _tileHash(col, row + i, seed + 720 + i) * 6;
                const bh = 8 + _tileHash(col + i, row + i, seed + 730) * 10;
                const lean = (_tileHash(col, row, seed + 740 + i) - 0.5) * 8;
                const isAlt = _tileHash(col + i, row, seed + 750 + i) > 0.5;
                ctx.strokeStyle = isAlt && type.colorAlt ? type.colorAlt : type.color;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.moveTo(bx, by);
                // Curved blade using quadratic bezier
                ctx.quadraticCurveTo(bx + lean * 0.6, by - bh * 0.6, bx + lean, by - bh);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'mushroom': {
            // Small mushroom cluster (1-3 mushrooms)
            const count = 1 + Math.floor(h1 * 2.5);
            for (let i = 0; i < count; i++) {
                const mx = x + 8 + _tileHash(col + i, row, seed + 760 + i) * 24;
                const my = y + 20 + _tileHash(col, row + i, seed + 770 + i) * 14;
                const mh = 4 + _tileHash(col + i, row + i, seed + 780) * 4;
                const capR = 2 + _tileHash(col + i, row, seed + 790) * 2.5;
                // Stem
                ctx.strokeStyle = type.colorAlt || '#f5deb3';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.moveTo(mx, my);
                ctx.lineTo(mx, my - mh);
                ctx.stroke();
                // Cap (half-circle)
                ctx.fillStyle = type.color;
                ctx.beginPath();
                ctx.arc(mx, my - mh, capR, Math.PI, 0);
                ctx.fill();
                // Cap highlight
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.beginPath();
                ctx.arc(mx - capR * 0.3, my - mh - capR * 0.2, capR * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'flower': {
            // Tiny colorful jungle flowers (2-4 dots with petal arcs)
            const count = 2 + Math.floor(h1 * 3);
            for (let i = 0; i < count; i++) {
                const fx = x + 6 + _tileHash(col + i, row, seed + 800 + i) * 28;
                const fy = y + 6 + _tileHash(col, row + i, seed + 810 + i) * 28;
                const petalR = 1.5 + _tileHash(col + i, row + i, seed + 820) * 1;
                const isAlt = _tileHash(col + i, row, seed + 830 + i) > 0.4;
                // Petals (3-4 small circles around center)
                ctx.fillStyle = isAlt && type.colorAlt ? type.colorAlt : type.color;
                ctx.globalAlpha = 0.7;
                for (let p = 0; p < 4; p++) {
                    const angle = (p / 4) * Math.PI * 2 + h1 * 2;
                    const px = fx + Math.cos(angle) * petalR * 1.2;
                    const py = fy + Math.sin(angle) * petalR * 1.2;
                    ctx.beginPath();
                    ctx.arc(px, py, petalR * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Center dot
                ctx.fillStyle = '#ffeb3b';
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.arc(fx, fy, petalR * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'root': {
            // Exposed tree roots crossing the floor tile
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            const rx = x + h1 * 8;
            const ry = y + 10 + h2 * 20;
            ctx.moveTo(rx, ry);
            ctx.quadraticCurveTo(
                x + TILE_SIZE * 0.4 + h2 * 10,
                ry + (h1 - 0.5) * 16,
                x + TILE_SIZE - h2 * 6,
                ry + (h1 - 0.3) * 12
            );
            ctx.stroke();
            // Thinner secondary root
            if (h1 > 0.3) {
                ctx.lineWidth = 1;
                ctx.strokeStyle = type.colorAlt || type.color;
                ctx.globalAlpha = 0.35;
                ctx.beginPath();
                ctx.moveTo(x + TILE_SIZE * 0.3 + h2 * 10, ry + (h1 - 0.5) * 10);
                ctx.quadraticCurveTo(
                    x + TILE_SIZE * 0.5, ry + 6 + h2 * 8,
                    x + TILE_SIZE * 0.6 + h1 * 8, y + TILE_SIZE - 4
                );
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'seaweed': {
            // Swaying seaweed fronds rooted to the floor
            const fronds = 2 + Math.floor(h1 * 3);
            for (let i = 0; i < fronds; i++) {
                const fx = x + 6 + _tileHash(col + i, row, seed + 850 + i) * 28;
                const fy = y + TILE_SIZE - 2;
                const fh = 12 + _tileHash(col, row + i, seed + 860 + i) * 16;
                const sway = (_tileHash(col + i, row + i, seed + 870) - 0.5) * 10;
                const isAlt = _tileHash(col + i, row, seed + 880 + i) > 0.4;
                ctx.strokeStyle = isAlt && type.colorAlt ? type.colorAlt : type.color;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(fx, fy);
                ctx.quadraticCurveTo(fx + sway * 0.6, fy - fh * 0.5, fx + sway, fy - fh);
                ctx.stroke();
                // Small leaf/bulb at tip
                if (isAlt && type.colorAlt) {
                    ctx.fillStyle = type.colorAlt;
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.ellipse(fx + sway, fy - fh, 2, 1, sway * 0.05, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'barnacle': {
            // Small barnacle clusters on floor
            ctx.globalAlpha = 0.45;
            const bCount = 3 + Math.floor(h1 * 3);
            for (let i = 0; i < bCount; i++) {
                const bx = x + 5 + _tileHash(col + i, row, seed + 890 + i) * 30;
                const by = y + 5 + _tileHash(col, row + i, seed + 900 + i) * 30;
                const br = 1.5 + _tileHash(col + i, row + i, seed + 910) * 2;
                ctx.fillStyle = type.color;
                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.fill();
                // Inner dimple
                ctx.fillStyle = type.colorAlt || 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.arc(bx, by, br * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'coral': {
            // Small coral formation — branching structure
            ctx.globalAlpha = 0.55;
            const baseX = x + 10 + h1 * 20;
            const baseY = y + TILE_SIZE - 4;
            // Main stem
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            ctx.lineTo(baseX + (h2 - 0.5) * 4, baseY - 10 - h1 * 6);
            ctx.stroke();
            // Left branch
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(baseX + (h2 - 0.5) * 2, baseY - 6);
            ctx.lineTo(baseX - 4 - h1 * 3, baseY - 12 - h2 * 4);
            ctx.stroke();
            // Right branch
            ctx.beginPath();
            ctx.moveTo(baseX + (h2 - 0.5) * 3, baseY - 8);
            ctx.lineTo(baseX + 5 + h2 * 3, baseY - 14 - h1 * 3);
            ctx.stroke();
            // Polyp dots at tips
            if (type.colorAlt) {
                ctx.fillStyle = type.colorAlt;
                ctx.globalAlpha = 0.5;
                const tips = [
                    [baseX + (h2 - 0.5) * 4, baseY - 10 - h1 * 6],
                    [baseX - 4 - h1 * 3, baseY - 12 - h2 * 4],
                    [baseX + 5 + h2 * 3, baseY - 14 - h1 * 3],
                ];
                for (const [tx, ty] of tips) {
                    ctx.beginPath();
                    ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'shell': {
            // Tiny spiral shell
            const sx = x + 8 + h1 * 24;
            const sy = y + 10 + h2 * 20;
            ctx.fillStyle = type.color;
            ctx.globalAlpha = 0.5;
            // Spiral approximation: overlapping arcs decreasing in size
            const baseR = 2.5 + h1 * 1.5;
            ctx.beginPath();
            ctx.arc(sx, sy, baseR, 0, Math.PI * 2);
            ctx.fill();
            // Inner spiral lines
            ctx.strokeStyle = type.colorAlt || 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(sx, sy, baseR * 0.65, Math.PI * 0.3, Math.PI * 1.7);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(sx - 0.5, sy - 0.3, baseR * 0.35, Math.PI * 0.5, Math.PI * 1.8);
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
        // ── Desert floor decor ──────────────────────────────────
        case 'sandDrift': {
            // Wind-blown sand accumulation — small crescent shape
            const sx = x + 6 + h1 * 22;
            const sy = y + 10 + h2 * 18;
            ctx.fillStyle = type.color || 'rgba(180, 150, 90, 0.25)';
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.ellipse(sx, sy, 6 + h1 * 4, 2 + h2 * 1.5, h1 * 0.4 - 0.2, 0, Math.PI);
            ctx.fill();
            // Wind streak line
            ctx.strokeStyle = type.colorAlt || 'rgba(160, 130, 70, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.25;
            ctx.beginPath();
            ctx.moveTo(sx - 6 - h2 * 4, sy + 0.5);
            ctx.bezierCurveTo(sx - 3, sy - 1, sx + 3, sy - 0.5, sx + 8 + h1 * 3, sy + 1);
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
        case 'bone': {
            // Tiny bone fragment half-buried in sand
            const bx = x + 8 + h1 * 22;
            const by = y + 8 + h2 * 22;
            const ang = h1 * Math.PI;
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(ang);
            ctx.fillStyle = type.color || 'rgba(210, 200, 170, 0.4)';
            ctx.globalAlpha = 0.45;
            // Shaft
            ctx.fillRect(-4, -0.8, 8, 1.6);
            // Knobs at ends
            ctx.beginPath();
            ctx.arc(-4, 0, 1.5, 0, Math.PI * 2);
            ctx.arc(4, 0, 1.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
            break;
        }
        case 'scarab': {
            // Tiny beetle shape — oval body + head
            const bx = x + 10 + h1 * 18;
            const by = y + 10 + h2 * 18;
            ctx.fillStyle = type.color || 'rgba(60, 100, 80, 0.5)';
            ctx.globalAlpha = 0.5;
            // Body
            ctx.beginPath();
            ctx.ellipse(bx, by, 2.5 + h1 * 0.8, 1.8, h2 * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            // Head
            ctx.beginPath();
            const headAngle = h2 * Math.PI;
            ctx.arc(bx + Math.cos(headAngle) * 3, by + Math.sin(headAngle) * 3, 1, 0, Math.PI * 2);
            ctx.fill();
            // Sheen
            ctx.fillStyle = type.colorAlt || 'rgba(100, 180, 140, 0.3)';
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.ellipse(bx - 0.5, by - 0.5, 1.2, 0.8, headAngle, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            break;
        }
        case 'rune': {
            // Faded ancient carving on floor
            const rx = x + 10 + h1 * 18;
            const ry = y + 10 + h2 * 16;
            ctx.strokeStyle = type.color || 'rgba(160, 140, 100, 0.2)';
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = 0.25;
            // Pick from a few simple glyph patterns
            const glyph = Math.floor(h1 * 4);
            ctx.beginPath();
            if (glyph === 0) {
                // Eye of Horus style
                ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
                ctx.moveTo(rx - 5, ry);
                ctx.lineTo(rx + 5, ry);
                ctx.moveTo(rx, ry + 3.5);
                ctx.lineTo(rx + 2, ry + 6);
            } else if (glyph === 1) {
                // Ankh-ish
                ctx.arc(rx, ry - 2, 2.5, 0, Math.PI * 2);
                ctx.moveTo(rx, ry + 0.5);
                ctx.lineTo(rx, ry + 6);
                ctx.moveTo(rx - 3, ry + 3);
                ctx.lineTo(rx + 3, ry + 3);
            } else if (glyph === 2) {
                // Triangle / pyramid
                ctx.moveTo(rx, ry - 4);
                ctx.lineTo(rx - 4, ry + 3);
                ctx.lineTo(rx + 4, ry + 3);
                ctx.closePath();
            } else {
                // Wavy serpent
                ctx.moveTo(rx - 5, ry);
                ctx.bezierCurveTo(rx - 2, ry - 3, rx + 2, ry + 3, rx + 5, ry);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
    }
}

// ── Jungle biome: lush organic floor tile ───────────────────
function _drawJungleFloor(ctx, x, y, col, row, grid, floorColor, gridTint, seed, biome) {
    const S = TILE_SIZE;
    const h  = _tileHash(col, row, seed + 4000);
    const h2 = _tileHash(col, row, seed + 4001);
    const h3 = _tileHash(col, row, seed + 4002);

    // ── Base floor with subtle color variation ──
    // Alternate between slightly different earth/moss shades
    const shadeIdx = ((col * 3 + row * 7) ^ (col + row * 5)) & 7;
    const shades = [
        '#1a2e1a', '#1c301b', '#182c19', '#1b2f1c',
        '#192d18', '#1d311d', '#172b17', '#1e321e',
    ];
    ctx.fillStyle = shades[shadeIdx];
    ctx.fillRect(x, y, S, S);

    // ── Mossy patches — some tiles have a greener tint overlay ──
    if (h < 0.35) {
        ctx.fillStyle = 'rgba(40, 80, 30, 0.15)';
        // Irregular blob
        ctx.beginPath();
        ctx.ellipse(
            x + S * 0.3 + h2 * S * 0.4,
            y + S * 0.3 + h * S * 0.4,
            S * 0.3 + h2 * S * 0.15,
            S * 0.25 + h * S * 0.15,
            h3 * Math.PI, 0, Math.PI * 2
        );
        ctx.fill();
    }

    // ── Damp/dark patches — gives a more uneven natural look ──
    if (h3 > 0.6) {
        ctx.fillStyle = 'rgba(10, 20, 10, 0.12)';
        ctx.beginPath();
        ctx.ellipse(
            x + S * 0.5 + (h - 0.5) * S * 0.3,
            y + S * 0.5 + (h2 - 0.5) * S * 0.3,
            S * 0.2 + h * S * 0.2,
            S * 0.15 + h2 * S * 0.15,
            h * Math.PI * 2, 0, Math.PI * 2
        );
        ctx.fill();
    }

    // ── Organic tile edges — instead of grid lines, irregular soft edges ──
    // Subtle darker seam (like natural stone/dirt boundaries)
    ctx.strokeStyle = 'rgba(15, 25, 12, 0.3)';
    ctx.lineWidth = 0.5;
    // Top edge with slight wobble
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5);
    ctx.lineTo(x + S * 0.3, y + 0.5 + (h - 0.5) * 1.5);
    ctx.lineTo(x + S * 0.6, y + 0.5 - (h2 - 0.5) * 1);
    ctx.lineTo(x + S, y + 0.5);
    ctx.stroke();
    // Left edge with slight wobble
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y);
    ctx.lineTo(x + 0.5 + (h2 - 0.5) * 1.5, y + S * 0.4);
    ctx.lineTo(x + 0.5 - (h - 0.5) * 1, y + S * 0.7);
    ctx.lineTo(x + 0.5, y + S);
    ctx.stroke();

    // ── Tiny ambient detail: scattered micro-pebbles/dirt specks ──
    if (h2 > 0.4) {
        ctx.fillStyle = 'rgba(30, 50, 25, 0.3)';
        for (let i = 0; i < 3; i++) {
            const dx = x + 4 + _tileHash(col + i, row, seed + 4010 + i) * (S - 8);
            const dy = y + 4 + _tileHash(col, row + i, seed + 4020 + i) * (S - 8);
            const dr = 0.5 + _tileHash(col + i, row + i, seed + 4030) * 0.8;
            ctx.beginPath();
            ctx.arc(dx, dy, dr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Floor decorations ──
    if (biome.floorDecor) {
        const rng = _tileHash(col, row, seed);
        if (rng < biome.floorDecor.chance) {
            const type = _pickWeighted(biome.floorDecor.types, _tileHash(col, row, seed + 100));
            _drawFloorDecor(ctx, x, y, type, col, row, seed);
        }
    }
}

// ── Jungle biome: organic wall tile with bark texture ───────
function _drawJungleWall(ctx, x, y, col, row, grid, wallColor, wallLight, wallDark, seed, biome) {
    const S = TILE_SIZE;
    const h  = _tileHash(col, row, seed + 5000);
    const h2 = _tileHash(col, row, seed + 5001);
    const h3 = _tileHash(col, row, seed + 5002);
    const exposed = _hasFloorNeighbour(grid, row, col);

    // ── Base wall fill with per-tile color variation ──
    const wallShades = ['#3a5a2e', '#365628', '#3e5e32', '#345224', '#3c5c30', '#38582c'];
    ctx.fillStyle = wallShades[((col * 5 + row * 11) ^ (col + row)) % wallShades.length];
    ctx.fillRect(x, y, S, S);

    // ── Bark-like horizontal grain lines ──
    ctx.strokeStyle = 'rgba(30, 50, 20, 0.4)';
    ctx.lineWidth = 0.5;
    const grainCount = 3 + Math.floor(h * 3);
    for (let i = 0; i < grainCount; i++) {
        const gy = y + 4 + (i / grainCount) * (S - 8) + _tileHash(col, row + i, seed + 5010 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(x + 2, gy);
        // Wavy grain
        ctx.quadraticCurveTo(
            x + S * 0.3 + _tileHash(col + i, row, seed + 5020) * S * 0.2,
            gy + (_tileHash(col, row + i, seed + 5030) - 0.5) * 4,
            x + S - 2,
            gy + (_tileHash(col + i, row + i, seed + 5040) - 0.5) * 3
        );
        ctx.stroke();
    }

    // ── Knot detail (on ~25% of walls) ──
    if (h > 0.75) {
        const kx = x + 10 + h2 * 20;
        const ky = y + 10 + h3 * 20;
        const kr = 3 + h * 2;
        ctx.fillStyle = 'rgba(35, 55, 25, 0.6)';
        ctx.beginPath();
        ctx.ellipse(kx, ky, kr, kr * 0.7, h2 * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        // Inner ring
        ctx.strokeStyle = 'rgba(25, 40, 18, 0.5)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.ellipse(kx, ky, kr * 0.6, kr * 0.4, h2 * Math.PI, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── Light/dark bevels (softer, more organic than default) ──
    // Top + left: lighter bark
    ctx.fillStyle = wallLight;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, y, S, 2);
    ctx.fillRect(x, y, 2, S);
    ctx.globalAlpha = 1;
    // Bottom + right: darker bark
    ctx.fillStyle = wallDark;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x, y + S - 2, S, 2);
    ctx.fillRect(x + S - 2, y, 2, S);
    ctx.globalAlpha = 1;

    // ── Mossy overgrowth on exposed walls (facing floor) ──
    if (exposed) {
        // Green moss creeping onto the wall from the floor side
        // Find which side(s) face the floor
        const dirs = [
            { dr: -1, dc: 0, side: 'top' },
            { dr: 1, dc: 0, side: 'bottom' },
            { dr: 0, dc: -1, side: 'left' },
            { dr: 0, dc: 1, side: 'right' },
        ];
        for (const { dr, dc, side } of dirs) {
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length && grid[nr][nc] === 0) {
                // This side faces the floor — draw moss creeping in
                ctx.fillStyle = 'rgba(46, 125, 50, 0.25)';
                const mossHash = _tileHash(col, row, seed + 5050 + dr * 10 + dc);
                const mossDepth = 4 + mossHash * 6;
                if (side === 'bottom') {
                    // Moss creeping up from bottom
                    for (let i = 0; i < 4; i++) {
                        const mx = x + _tileHash(col + i, row, seed + 5060 + i) * S;
                        const mw = 4 + _tileHash(col, row + i, seed + 5070 + i) * 8;
                        const md = mossDepth + _tileHash(col + i, row + i, seed + 5080) * 4;
                        ctx.beginPath();
                        ctx.ellipse(mx, y + S, mw / 2, md / 2, 0, Math.PI, 0);
                        ctx.fill();
                    }
                } else if (side === 'top') {
                    for (let i = 0; i < 4; i++) {
                        const mx = x + _tileHash(col + i, row, seed + 5090 + i) * S;
                        const mw = 4 + _tileHash(col, row + i, seed + 5100 + i) * 8;
                        const md = mossDepth + _tileHash(col + i, row + i, seed + 5110) * 4;
                        ctx.beginPath();
                        ctx.ellipse(mx, y, mw / 2, md / 2, 0, 0, Math.PI);
                        ctx.fill();
                    }
                } else if (side === 'left') {
                    for (let i = 0; i < 3; i++) {
                        const my = y + _tileHash(col, row + i, seed + 5120 + i) * S;
                        const mh = 4 + _tileHash(col + i, row, seed + 5130 + i) * 8;
                        const md = mossDepth + _tileHash(col + i, row + i, seed + 5140) * 3;
                        ctx.beginPath();
                        ctx.ellipse(x, my, md / 2, mh / 2, 0, -Math.PI / 2, Math.PI / 2);
                        ctx.fill();
                    }
                } else if (side === 'right') {
                    for (let i = 0; i < 3; i++) {
                        const my = y + _tileHash(col, row + i, seed + 5150 + i) * S;
                        const mh = 4 + _tileHash(col + i, row, seed + 5160 + i) * 8;
                        const md = mossDepth + _tileHash(col + i, row + i, seed + 5170) * 3;
                        ctx.beginPath();
                        ctx.ellipse(x + S, my, md / 2, mh / 2, 0, Math.PI / 2, Math.PI * 1.5);
                        ctx.fill();
                    }
                }
            }
        }

        // ── Wall decorations ──
        if (biome.wallDecor) {
            const rng = _tileHash(col, row, seed + 99);
            if (rng < biome.wallDecor.chance) {
                const type = _pickWeighted(biome.wallDecor.types, _tileHash(col, row, seed + 200));
                _drawWallDecor(ctx, x, y, type, col, row, seed);
            }
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
        case 'thickVine': {
            // Thick vine with multiple leaves and curve
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.65;
            const startX = x + 6 + h2 * 28;
            const segments = 3 + Math.floor(h1 * 3);
            let vx = startX, vy = y + TILE_SIZE;
            ctx.beginPath();
            ctx.moveTo(vx, vy);
            for (let i = 0; i < segments; i++) {
                const prevX = vx, prevY = vy;
                vx += (h1 - 0.35) * 5;
                vy -= 5 + h2 * 5;
                const cpx = prevX + (vx - prevX) * 0.5 + (h2 - 0.5) * 6;
                const cpy = prevY + (vy - prevY) * 0.5;
                ctx.quadraticCurveTo(cpx, cpy, vx, vy);
            }
            ctx.stroke();
            // Leaves along the vine
            if (type.colorAlt) {
                ctx.fillStyle = type.colorAlt;
                ctx.globalAlpha = 0.6;
                let lx = startX, ly = y + TILE_SIZE;
                for (let i = 0; i < segments; i++) {
                    lx += (h1 - 0.35) * 5;
                    ly -= 5 + h2 * 5;
                    if (i % 2 === 0) {
                        const leafAngle = _tileHash(col + i, row, seed + 610 + i) * Math.PI;
                        ctx.save();
                        ctx.translate(lx, ly);
                        ctx.rotate(leafAngle);
                        ctx.beginPath();
                        ctx.ellipse(3, 0, 3, 1.5, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'hangingRoot': {
            // Dangling tree roots from wall edge
            ctx.strokeStyle = type.color;
            ctx.globalAlpha = 0.55;
            const rootCount = 2 + Math.floor(h1 * 3);
            for (let i = 0; i < rootCount; i++) {
                const rx = x + 4 + _tileHash(col + i, row, seed + 620 + i) * (TILE_SIZE - 8);
                const rootLen = 12 + _tileHash(col, row + i, seed + 630 + i) * 18;
                const sway = (_tileHash(col + i, row + i, seed + 640) - 0.5) * 8;
                ctx.lineWidth = 1.5 + _tileHash(col + i, row, seed + 650) * 1;
                ctx.beginPath();
                ctx.moveTo(rx, y + TILE_SIZE);
                ctx.quadraticCurveTo(rx + sway, y + TILE_SIZE - rootLen * 0.5, rx + sway * 0.6, y + TILE_SIZE - rootLen);
                ctx.stroke();
                // Tiny tendril at the end
                if (type.colorAlt && _tileHash(col + i, row, seed + 660) > 0.5) {
                    ctx.lineWidth = 0.5;
                    ctx.strokeStyle = type.colorAlt;
                    ctx.beginPath();
                    ctx.moveTo(rx + sway * 0.6, y + TILE_SIZE - rootLen);
                    ctx.lineTo(rx + sway * 0.6 + (h1 - 0.5) * 4, y + TILE_SIZE - rootLen - 3);
                    ctx.stroke();
                    ctx.strokeStyle = type.color;
                }
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'stalactite': {
            // Hanging mineral / stalactite formations on wall
            ctx.globalAlpha = 0.6;
            const stalCount = 2 + Math.floor(h1 * 3);
            for (let i = 0; i < stalCount; i++) {
                const sx = x + 4 + _tileHash(col + i, row, seed + 670 + i) * (TILE_SIZE - 8);
                const stalLen = 8 + _tileHash(col, row + i, seed + 680 + i) * 14;
                const stalW = 2 + _tileHash(col + i, row + i, seed + 690) * 2;
                // Triangular stalactite shape
                ctx.fillStyle = type.color;
                ctx.beginPath();
                ctx.moveTo(sx - stalW, y + TILE_SIZE);
                ctx.lineTo(sx + stalW, y + TILE_SIZE);
                ctx.lineTo(sx + (h1 - 0.5) * 2, y + TILE_SIZE - stalLen);
                ctx.closePath();
                ctx.fill();
                // Wet highlight
                if (type.colorAlt) {
                    ctx.fillStyle = type.colorAlt;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.moveTo(sx - stalW * 0.3, y + TILE_SIZE);
                    ctx.lineTo(sx, y + TILE_SIZE - stalLen + 2);
                    ctx.lineTo(sx + stalW * 0.3, y + TILE_SIZE);
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha = 0.6;
                }
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'crystal': {
            // Glowing crystal cluster on wall
            const cx2 = x + 8 + h1 * 22;
            const cy2 = y + TILE_SIZE - 6 - h2 * 14;
            ctx.save();
            ctx.shadowColor = type.color;
            ctx.shadowBlur = 8;
            // Main crystal shard
            ctx.fillStyle = type.color;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx2 - 2, cy2 + 6);
            ctx.lineTo(cx2, cy2 - 6 - h1 * 4);
            ctx.lineTo(cx2 + 2, cy2 + 6);
            ctx.closePath();
            ctx.fill();
            // Smaller secondary shard
            ctx.beginPath();
            ctx.moveTo(cx2 + 3, cy2 + 5);
            ctx.lineTo(cx2 + 4, cy2 - 2 - h2 * 3);
            ctx.lineTo(cx2 + 6, cy2 + 5);
            ctx.closePath();
            ctx.fill();
            // Tiny third shard
            if (h1 > 0.3) {
                ctx.beginPath();
                ctx.moveTo(cx2 - 5, cy2 + 4);
                ctx.lineTo(cx2 - 4, cy2 + 1 - h2 * 2);
                ctx.lineTo(cx2 - 3, cy2 + 4);
                ctx.closePath();
                ctx.fill();
            }
            // Bright highlight on main crystal
            ctx.fillStyle = type.colorAlt || '#ffffff';
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(cx2 - 0.5, cy2 + 3);
            ctx.lineTo(cx2, cy2 - 3);
            ctx.lineTo(cx2 + 0.5, cy2 + 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            break;
        }
        case 'barnacle': {
            // Barnacle clusters on wall surface
            ctx.globalAlpha = 0.5;
            const bCount = 3 + Math.floor(h1 * 4);
            for (let i = 0; i < bCount; i++) {
                const bx = x + 3 + _tileHash(col + i, row, seed + 700 + i) * (TILE_SIZE - 6);
                const by = y + TILE_SIZE - 3 - _tileHash(col, row + i, seed + 710 + i) * (TILE_SIZE * 0.6);
                const br = 1.5 + _tileHash(col + i, row + i, seed + 720) * 2;
                // Outer ring
                ctx.fillStyle = type.color;
                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.fill();
                // Inner hole
                ctx.fillStyle = type.colorAlt || 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.arc(bx, by, br * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'glowMushroom': {
            // Bioluminescent mushroom growing on wall
            const mx = x + 8 + h1 * 24;
            const my = y + TILE_SIZE - 8 - h2 * 16;
            const capR = 3 + h1 * 2;
            // Glow aura
            ctx.save();
            ctx.shadowColor = type.color;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = type.color;
            ctx.beginPath();
            ctx.arc(mx, my, capR + 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Stem
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#8d6e63';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(mx, my + capR);
            ctx.lineTo(mx + (h1 - 0.5) * 3, my + capR + 5 + h2 * 4);
            ctx.stroke();
            // Cap
            ctx.fillStyle = type.color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(mx, my, capR, Math.PI, 0);
            ctx.fill();
            // Bright highlight on cap
            ctx.fillStyle = type.colorAlt || '#ffffff';
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(mx - 1, my - capR * 0.3, capR * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
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
        // ── Desert wall decor ───────────────────────────────────
        case 'sandLayer': {
            // Horizontal sand deposit line across wall base
            ctx.globalAlpha = 0.4;
            const ly = y + TILE_SIZE - 3 - h1 * 4;
            ctx.fillStyle = type.color || 'rgba(180, 150, 90, 0.3)';
            // Main deposit band
            ctx.beginPath();
            ctx.moveTo(x + 1, y + TILE_SIZE);
            ctx.lineTo(x + 1, ly + 2);
            ctx.bezierCurveTo(x + TILE_SIZE * 0.3, ly, x + TILE_SIZE * 0.7, ly + 1 + h2 * 2, x + TILE_SIZE - 1, ly + 1);
            ctx.lineTo(x + TILE_SIZE - 1, y + TILE_SIZE);
            ctx.closePath();
            ctx.fill();
            // Granular top edge
            ctx.fillStyle = type.colorAlt || 'rgba(200, 170, 110, 0.2)';
            ctx.globalAlpha = 0.25;
            for (let i = 0; i < 5; i++) {
                const gx = x + 4 + _tileHash(col + i, row, seed + 900 + i) * (TILE_SIZE - 8);
                const gy = ly + 1 + _tileHash(col, row + i, seed + 910) * 2;
                ctx.beginPath();
                ctx.arc(gx, gy, 1 + _tileHash(col + i, row + i, seed + 920) * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'hieroglyph': {
            // Faded ancient wall marking / glyph
            const gx = x + 8 + h1 * 16;
            const gy = y + 8 + h2 * 16;
            ctx.strokeStyle = type.color || 'rgba(160, 140, 100, 0.2)';
            ctx.lineWidth = 0.8;
            ctx.globalAlpha = 0.2;
            const glyph = Math.floor(h1 * 5);
            ctx.beginPath();
            if (glyph === 0) {
                // Winged sun disc
                ctx.arc(gx, gy, 3, 0, Math.PI * 2);
                ctx.moveTo(gx - 3, gy);
                ctx.bezierCurveTo(gx - 7, gy - 3, gx - 10, gy - 1, gx - 11, gy);
                ctx.moveTo(gx + 3, gy);
                ctx.bezierCurveTo(gx + 7, gy - 3, gx + 10, gy - 1, gx + 11, gy);
            } else if (glyph === 1) {
                // Seated figure
                ctx.moveTo(gx - 2, gy - 5);
                ctx.lineTo(gx, gy - 6);
                ctx.lineTo(gx + 2, gy - 5);
                ctx.moveTo(gx, gy - 5);
                ctx.lineTo(gx, gy);
                ctx.lineTo(gx + 4, gy + 4);
                ctx.moveTo(gx, gy);
                ctx.lineTo(gx - 3, gy + 4);
            } else if (glyph === 2) {
                // Serpent wave
                ctx.moveTo(gx - 6, gy);
                ctx.bezierCurveTo(gx - 3, gy - 4, gx, gy + 4, gx + 3, gy);
                ctx.bezierCurveTo(gx + 5, gy - 2, gx + 7, gy - 1, gx + 8, gy - 3);
            } else if (glyph === 3) {
                // Scarab
                ctx.ellipse(gx, gy, 4, 3, 0, 0, Math.PI * 2);
                ctx.moveTo(gx - 4, gy - 1);
                ctx.lineTo(gx - 6, gy - 4);
                ctx.moveTo(gx + 4, gy - 1);
                ctx.lineTo(gx + 6, gy - 4);
            } else {
                // Bird (ibis)
                ctx.moveTo(gx - 2, gy - 4);
                ctx.lineTo(gx + 1, gy - 5);
                ctx.lineTo(gx + 4, gy - 3);
                ctx.moveTo(gx + 1, gy - 4);
                ctx.lineTo(gx, gy + 2);
                ctx.lineTo(gx, gy + 5);
                ctx.moveTo(gx, gy + 2);
                ctx.lineTo(gx + 3, gy + 5);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
            break;
        }
        case 'scorchMark': {
            // Heat/fire damage scorch on wall
            const sx = x + 8 + h1 * 20;
            const sy = y + 6 + h2 * 20;
            ctx.fillStyle = type.color || 'rgba(30, 20, 10, 0.3)';
            ctx.globalAlpha = 0.3;
            // Irregular darkened patch
            ctx.beginPath();
            ctx.ellipse(sx, sy, 5 + h1 * 4, 4 + h2 * 3, h1 * 0.6, 0, Math.PI * 2);
            ctx.fill();
            // Darker core
            ctx.fillStyle = 'rgba(15, 10, 5, 0.25)';
            ctx.globalAlpha = 0.25;
            ctx.beginPath();
            ctx.ellipse(sx, sy, 3 + h1 * 2, 2 + h2 * 1.5, h1 * 0.6, 0, Math.PI * 2);
            ctx.fill();
            // Faint ember glow at edge
            if (type.colorAlt) {
                ctx.fillStyle = type.colorAlt;
                ctx.globalAlpha = 0.1;
                ctx.beginPath();
                ctx.ellipse(sx + (h1 - 0.5) * 4, sy + (h2 - 0.5) * 3, 2, 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            break;
        }
    }
}

// ── Desert biome: sun-baked sandstone floor tile ────────────
function _drawDesertFloor(ctx, x, y, col, row, grid, floorColor, gridTint, seed, biome) {
    const S = TILE_SIZE;
    const h  = _tileHash(col, row, seed + 7000);
    const h2 = _tileHash(col, row, seed + 7001);
    const h3 = _tileHash(col, row, seed + 7002);

    // ── Base floor with warm sandstone variation ──
    const shadeIdx = ((col * 5 + row * 9) ^ (col * 3 + row * 2)) & 7;
    const shades = [
        '#2e251a', '#30271c', '#2c231a', '#32291e',
        '#2a2118', '#34291c', '#281f16', '#362b1e',
    ];
    ctx.fillStyle = shades[shadeIdx];
    ctx.fillRect(x, y, S, S);

    // ── Wind-blown sand accumulation — lighter warm patches ──
    if (h < 0.35) {
        ctx.fillStyle = 'rgba(180, 140, 80, 0.08)';
        ctx.beginPath();
        ctx.ellipse(
            x + S * 0.3 + h2 * S * 0.4,
            y + S * 0.4 + h * S * 0.3,
            S * 0.3 + h2 * S * 0.15,
            S * 0.2 + h * S * 0.1,
            h3 * 0.5, 0, Math.PI * 2
        );
        ctx.fill();
    }

    // ── Sun-baked hot spots — very subtle warm highlight ──
    if (h3 > 0.65) {
        const grad = ctx.createRadialGradient(
            x + S * (0.3 + h * 0.4), y + S * (0.3 + h2 * 0.4), 0,
            x + S * (0.3 + h * 0.4), y + S * (0.3 + h2 * 0.4), S * 0.4
        );
        grad.addColorStop(0, 'rgba(200, 160, 80, 0.06)');
        grad.addColorStop(1, 'rgba(200, 160, 80, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, S, S);
    }

    // ── Weathered stone seams ──
    ctx.strokeStyle = 'rgba(40, 30, 15, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5);
    ctx.lineTo(x + S * 0.35, y + 0.5 + (h - 0.5) * 2);
    ctx.lineTo(x + S * 0.65, y + 0.5 - (h2 - 0.5) * 1.5);
    ctx.lineTo(x + S, y + 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y);
    ctx.lineTo(x + 0.5 + (h2 - 0.5) * 1.5, y + S * 0.4);
    ctx.lineTo(x + 0.5, y + S);
    ctx.stroke();

    // ── Tiny sand grains / grit specks ──
    if (h2 > 0.3) {
        const grits = ['rgba(160, 130, 80, 0.35)', 'rgba(140, 110, 60, 0.3)', 'rgba(180, 150, 100, 0.25)'];
        for (let i = 0; i < 4; i++) {
            const dx = x + 3 + _tileHash(col + i, row, seed + 7010 + i) * (S - 6);
            const dy = y + 3 + _tileHash(col, row + i, seed + 7020 + i) * (S - 6);
            const dr = 0.4 + _tileHash(col + i, row + i, seed + 7030) * 0.6;
            ctx.fillStyle = grits[i % 3];
            ctx.beginPath();
            ctx.arc(dx, dy, dr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Floor decorations ──
    if (biome.floorDecor) {
        const rng = _tileHash(col, row, seed);
        if (rng < biome.floorDecor.chance) {
            const type = _pickWeighted(biome.floorDecor.types, _tileHash(col, row, seed + 100));
            _drawFloorDecor(ctx, x, y, type, col, row, seed);
        }
    }
}

// ── Desert biome: weathered sandstone wall tile ─────────────
function _drawDesertWall(ctx, x, y, col, row, grid, wallColor, wallLight, wallDark, seed, biome) {
    const S = TILE_SIZE;
    const h  = _tileHash(col, row, seed + 8000);
    const h2 = _tileHash(col, row, seed + 8001);
    const h3 = _tileHash(col, row, seed + 8002);
    const exposed = _hasFloorNeighbour(grid, row, col);

    // ── Base wall with per-tile sandstone variation ──
    const wallShades = ['#6a5535', '#665130', '#6e5938', '#625030', '#705b3a', '#5e4d2c'];
    ctx.fillStyle = wallShades[((col * 7 + row * 3) ^ (col + row * 5)) % wallShades.length];
    ctx.fillRect(x, y, S, S);

    // ── Layered sandstone striations (horizontal bands) ──
    ctx.globalAlpha = 0.25;
    const bandCount = 3 + Math.floor(h * 3);
    for (let i = 0; i < bandCount; i++) {
        const by = y + 3 + (i / bandCount) * (S - 6) + _tileHash(col, row + i, seed + 8010 + i) * 3;
        const bh = 1.5 + _tileHash(col + i, row, seed + 8020) * 2;
        const bright = _tileHash(col + i, row + i, seed + 8030) > 0.5;
        ctx.fillStyle = bright ? 'rgba(180, 150, 100, 0.3)' : 'rgba(50, 35, 15, 0.25)';
        ctx.fillRect(x + 2, by, S - 4, bh);
    }
    ctx.globalAlpha = 1;

    // ── Chipped stone texture — small dark pits ──
    if (h > 0.4) {
        ctx.fillStyle = 'rgba(40, 30, 15, 0.25)';
        for (let i = 0; i < 3; i++) {
            const px = x + 5 + _tileHash(col + i, row, seed + 8040 + i) * (S - 10);
            const py = y + 5 + _tileHash(col, row + i, seed + 8050 + i) * (S - 10);
            ctx.beginPath();
            ctx.arc(px, py, 0.8 + _tileHash(col + i, row + i, seed + 8060) * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Bevels (warm stone) ──
    ctx.fillStyle = wallLight;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, y, S, 2);
    ctx.fillRect(x, y, 2, S);
    ctx.globalAlpha = 1;
    ctx.fillStyle = wallDark;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x, y + S - 2, S, 2);
    ctx.fillRect(x + S - 2, y, 2, S);
    ctx.globalAlpha = 1;

    // ── Sand creeping onto exposed walls ──
    if (exposed) {
        const dirs = [
            { dr: -1, dc: 0, side: 'top' },
            { dr: 1, dc: 0, side: 'bottom' },
            { dr: 0, dc: -1, side: 'left' },
            { dr: 0, dc: 1, side: 'right' },
        ];
        for (const { dr, dc, side } of dirs) {
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length && grid[nr][nc] === 0) {
                ctx.fillStyle = 'rgba(180, 150, 90, 0.15)';
                const sandHash = _tileHash(col, row, seed + 8070 + dr * 10 + dc);
                const sandDepth = 3 + sandHash * 5;
                if (side === 'bottom') {
                    for (let i = 0; i < 3; i++) {
                        const sx = x + _tileHash(col + i, row, seed + 8080 + i) * S;
                        const sw = 6 + _tileHash(col, row + i, seed + 8090 + i) * 10;
                        ctx.beginPath();
                        ctx.ellipse(sx, y + S, sw / 2, sandDepth / 2, 0, Math.PI, 0);
                        ctx.fill();
                    }
                } else if (side === 'top') {
                    for (let i = 0; i < 3; i++) {
                        const sx = x + _tileHash(col + i, row, seed + 8100 + i) * S;
                        const sw = 6 + _tileHash(col, row + i, seed + 8110 + i) * 10;
                        ctx.beginPath();
                        ctx.ellipse(sx, y, sw / 2, sandDepth / 2, 0, 0, Math.PI);
                        ctx.fill();
                    }
                }
            }
        }

        // ── Wall decorations ──
        if (biome.wallDecor) {
            const rng = _tileHash(col, row, seed + 99);
            if (rng < biome.wallDecor.chance) {
                const type = _pickWeighted(biome.wallDecor.types, _tileHash(col, row, seed + 200));
                _drawWallDecor(ctx, x, y, type, col, row, seed);
            }
        }
    }
}

// ── Depths biome: underwater stone floor tile ───────────────
function _drawDepthsFloor(ctx, x, y, col, row, grid, floorColor, gridTint, seed, biome) {
    const S = TILE_SIZE;
    const h  = _tileHash(col, row, seed + 6000);
    const h2 = _tileHash(col, row, seed + 6001);
    const h3 = _tileHash(col, row, seed + 6002);

    // ── Base floor with subtle color variation (dark stone) ──
    const shadeIdx = ((col * 7 + row * 3) ^ (col * 5 + row)) & 7;
    const shades = [
        '#0c1220', '#0e1424', '#0a101e', '#0d1322',
        '#0b1120', '#0f1526', '#091018', '#10161e',
    ];
    ctx.fillStyle = shades[shadeIdx];
    ctx.fillRect(x, y, S, S);

    // ── Wet sheen — slight blue-tinted highlight on some tiles ──
    if (h < 0.4) {
        const grad = ctx.createLinearGradient(x, y, x + S, y + S);
        grad.addColorStop(0, 'rgba(40, 80, 150, 0.0)');
        grad.addColorStop(0.4 + h2 * 0.2, 'rgba(40, 80, 150, 0.08)');
        grad.addColorStop(1, 'rgba(40, 80, 150, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, S, S);
    }

    // ── Dark sediment patches ──
    if (h3 > 0.55) {
        ctx.fillStyle = 'rgba(5, 10, 25, 0.15)';
        ctx.beginPath();
        ctx.ellipse(
            x + S * 0.5 + (h - 0.5) * S * 0.3,
            y + S * 0.5 + (h2 - 0.5) * S * 0.3,
            S * 0.2 + h * S * 0.2,
            S * 0.15 + h2 * S * 0.15,
            h3 * Math.PI * 2, 0, Math.PI * 2
        );
        ctx.fill();
    }

    // ── Subtle blue bioluminescent spots (rare) ──
    if (h > 0.85) {
        ctx.fillStyle = 'rgba(60, 150, 255, 0.08)';
        const bx = x + 6 + h2 * (S - 12);
        const by = y + 6 + h3 * (S - 12);
        ctx.beginPath();
        ctx.arc(bx, by, 4 + h * 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Stone seams — irregular, like worn underwater rock ──
    ctx.strokeStyle = 'rgba(8, 16, 35, 0.25)';
    ctx.lineWidth = 0.5;
    // Top edge with erosion wobble
    ctx.beginPath();
    ctx.moveTo(x, y + 0.5);
    ctx.lineTo(x + S * 0.25, y + 0.5 + (h - 0.5) * 2);
    ctx.lineTo(x + S * 0.5, y + 0.5 - (h2 - 0.5) * 1.5);
    ctx.lineTo(x + S * 0.75, y + 0.5 + (h3 - 0.5) * 1.5);
    ctx.lineTo(x + S, y + 0.5);
    ctx.stroke();
    // Left edge
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y);
    ctx.lineTo(x + 0.5 + (h2 - 0.5) * 2, y + S * 0.35);
    ctx.lineTo(x + 0.5 - (h - 0.5) * 1.5, y + S * 0.65);
    ctx.lineTo(x + 0.5, y + S);
    ctx.stroke();

    // ── Micro-sediment specks ──
    if (h2 > 0.35) {
        ctx.fillStyle = 'rgba(20, 35, 60, 0.3)';
        for (let i = 0; i < 3; i++) {
            const dx = x + 3 + _tileHash(col + i, row, seed + 6010 + i) * (S - 6);
            const dy = y + 3 + _tileHash(col, row + i, seed + 6020 + i) * (S - 6);
            const dr = 0.5 + _tileHash(col + i, row + i, seed + 6030) * 0.7;
            ctx.beginPath();
            ctx.arc(dx, dy, dr, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Refracted sunlight net on the sea floor ──
    // Slowly moving bright cell pattern like light through rippling water surface.
    // Uses time-based sine offsets so the pattern gently shifts each frame.
    {
        const t = Date.now() * 0.0003;
        // Two crossing wave functions create a diamond/cell interference pattern
        // Sample 3×3 points within the tile and draw soft bright spots where waves peak
        ctx.fillStyle = 'rgba(100, 180, 255, 1)';
        const spacing = S / 3;
        for (let gx = 0; gx < 3; gx++) {
            for (let gy = 0; gy < 3; gy++) {
                const px = x + spacing * 0.5 + gx * spacing;
                const py = y + spacing * 0.5 + gy * spacing;
                // Two overlapping sine waves at different angles
                const wave1 = Math.sin((px * 0.06) + (py * 0.03) + t * 2.1 + h * 6);
                const wave2 = Math.sin((px * 0.04) - (py * 0.055) + t * 1.7 + h2 * 5);
                const combined = (wave1 + wave2) * 0.5; // -1..1
                // Only draw where both waves constructively interfere (bright spots)
                if (combined > 0.25) {
                    const intensity = (combined - 0.25) / 0.75; // 0..1
                    ctx.globalAlpha = intensity * 0.06;
                    const r = 3 + intensity * 4;
                    ctx.beginPath();
                    ctx.arc(px, py, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    // ── Floor decorations ──
    if (biome.floorDecor) {
        const rng = _tileHash(col, row, seed);
        if (rng < biome.floorDecor.chance) {
            const type = _pickWeighted(biome.floorDecor.types, _tileHash(col, row, seed + 100));
            _drawFloorDecor(ctx, x, y, type, col, row, seed);
        }
    }
}

// ── Depths biome: glassy translucent wall tile ──────────────
function _drawDepthsWall(ctx, x, y, col, row, grid, wallColor, wallLight, wallDark, floorColor, seed, biome) {
    const S = TILE_SIZE;
    const h  = _tileHash(col, row, seed + 3000);
    const h2 = _tileHash(col, row, seed + 3001);
    const h3 = _tileHash(col, row, seed + 3002);
    const exposed = _hasFloorNeighbour(grid, row, col);

    // ── Draw the floor behind so transparency reads properly ──
    ctx.fillStyle = floorColor;
    ctx.fillRect(x, y, S, S);

    // ── Glass body — smooth, translucent blue-teal ──
    // Slightly vary the tint per tile for a natural glass look
    const r = 25 + Math.floor(h * 15);
    const g = 55 + Math.floor(h2 * 25);
    const b = 110 + Math.floor(h3 * 30);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.45)`;
    ctx.fillRect(x, y, S, S);

    // ── Glass gets more saturated/darker at the edges (like real glass) ──
    // Edge-darkening gradient — thicker glass = more color at borders
    const eg = ctx.createLinearGradient(x, y, x + S, y + S);
    eg.addColorStop(0, 'rgba(15, 40, 80, 0.18)');
    eg.addColorStop(0.35, 'rgba(15, 40, 80, 0.0)');
    eg.addColorStop(0.65, 'rgba(15, 40, 80, 0.0)');
    eg.addColorStop(1, 'rgba(15, 40, 80, 0.15)');
    ctx.fillStyle = eg;
    ctx.fillRect(x, y, S, S);

    // ── Tile seams — thin dark lines to separate glass panes ──
    ctx.strokeStyle = 'rgba(8, 18, 40, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);

    // ── Inner seam highlight (thin bright line on top-left = light catch) ──
    ctx.strokeStyle = 'rgba(130, 190, 240, 0.22)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 1.5, y + S - 1.5);
    ctx.lineTo(x + 1.5, y + 1.5);
    ctx.lineTo(x + S - 1.5, y + 1.5);
    ctx.stroke();

    // ── Sharp specular reflection — the key "glass" indicator ──
    // A small bright rectangular highlight like light reflecting off a window
    if (h < 0.7) {
        const hx = x + 4 + h2 * 4;
        const hy = y + 4 + h * 3;
        const hw = 5 + h2 * 4;
        const hh = 3 + h * 3;
        // Soft white rectangle
        ctx.fillStyle = 'rgba(180, 215, 255, 0.14)';
        ctx.fillRect(hx, hy, hw, hh);
        // Brighter inner core
        ctx.fillStyle = 'rgba(220, 240, 255, 0.10)';
        ctx.fillRect(hx + 1, hy + 1, hw - 2, hh - 2);
    }

    // ── Secondary smaller reflection (offset, like a double-pane) ──
    if (h > 0.3 && h < 0.8) {
        const rx = x + 14 + h2 * 10;
        const ry = y + 16 + h * 8;
        const rw = 3 + h * 3;
        const rh = 2;
        ctx.fillStyle = 'rgba(180, 215, 255, 0.08)';
        ctx.fillRect(rx, ry, rw, rh);
    }

    // ── Subtle vertical caustic line (light refracting through glass) ──
    if (h3 > 0.35) {
        ctx.strokeStyle = 'rgba(100, 180, 240, 0.07)';
        ctx.lineWidth = 1;
        const lx = x + 8 + h * 22;
        ctx.beginPath();
        ctx.moveTo(lx, y + 2);
        ctx.lineTo(lx + (h2 - 0.5) * 4, y + S - 2);
        ctx.stroke();
    }

    // ── Green-blue tint at edges (glass edge color shift) ──
    // Real glass shows a green/teal hue when viewed at the edge
    // Top + left edges get a subtle teal tint
    ctx.fillStyle = 'rgba(60, 180, 170, 0.10)';
    ctx.fillRect(x, y, S, 1);
    ctx.fillRect(x, y, 1, S);
    // Bottom + right get a deeper blue
    ctx.fillStyle = 'rgba(20, 50, 120, 0.18)';
    ctx.fillRect(x, y + S - 1, S, 1);
    ctx.fillRect(x + S - 1, y, 1, S);

    // ── Exposed walls (facing the room) — subtle inner glow ──
    if (exposed) {
        // Very soft glow on the room-facing side
        ctx.fillStyle = 'rgba(60, 140, 220, 0.05)';
        ctx.fillRect(x, y, S, S);

        // Wall decorations
        if (biome.wallDecor) {
            const rng = _tileHash(col, row, seed + 99);
            if (rng < biome.wallDecor.chance) {
                const type = _pickWeighted(biome.wallDecor.types, _tileHash(col, row, seed + 200));
                _drawWallDecor(ctx, x, y, type, col, row, seed);
            }
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
 * Render atmospheric overlay: full-screen tint + radial vignette + dappled light.
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

    // ── Dappled sunlight (jungle canopy light filtering through) ──
    if (atm.dappledLight) {
        _renderDappledLight(ctx);
    }

    // ── Underwater caustic light (depths biome) ──
    if (atm.causticLight) {
        _renderCausticLight(ctx);
    }

    // ── Desert heat haze ──
    if (atm.heatHaze) {
        _renderHeatHaze(ctx);
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

// ── Dappled light: sun rays filtering through jungle canopy ─
// Creates slowly shifting soft light patches
const _DAPPLED_SPOTS = [];
// Pre-generate stable light spots (seeded, reused each frame)
for (let i = 0; i < 12; i++) {
    _DAPPLED_SPOTS.push({
        baseX: (i * 137.5 + 42) % CANVAS_WIDTH,
        baseY: (i * 89.3 + 31) % CANVAS_HEIGHT,
        radiusX: 30 + (i * 23 % 40),
        radiusY: 20 + (i * 17 % 30),
        phase: i * 0.52,
        speed: 0.0003 + (i % 5) * 0.0001,
        driftX: 0.4 + (i % 3) * 0.2,
        driftY: 0.2 + (i % 4) * 0.1,
        alpha: 0.025 + (i % 4) * 0.008,
        angle: (i * 0.4) % (Math.PI * 2),
    });
}

function _renderDappledLight(ctx) {
    const t = Date.now();
    ctx.save();
    for (const spot of _DAPPLED_SPOTS) {
        const drift = Math.sin(t * spot.speed + spot.phase);
        const drift2 = Math.cos(t * spot.speed * 0.7 + spot.phase * 1.3);
        const sx = spot.baseX + drift * spot.driftX * 40;
        const sy = spot.baseY + drift2 * spot.driftY * 30;
        const pulse = 1 + Math.sin(t * spot.speed * 2 + spot.phase) * 0.15;

        ctx.globalAlpha = spot.alpha * pulse;
        ctx.fillStyle = 'rgba(180, 220, 100, 1)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, spot.radiusX * pulse, spot.radiusY * pulse, spot.angle + drift * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Inner brighter core
        ctx.globalAlpha = spot.alpha * pulse * 0.6;
        ctx.fillStyle = 'rgba(220, 255, 150, 1)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, spot.radiusX * 0.4 * pulse, spot.radiusY * 0.4 * pulse, spot.angle + drift * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ── Caustic light: underwater light refraction patterns ─────
// Thin, slowly shifting wavy lines that drift across the floor.
const _CAUSTIC_LINES = [];
for (let i = 0; i < 14; i++) {
    _CAUSTIC_LINES.push({
        baseOffset: (i / 14) * CANVAS_WIDTH * 1.4 - CANVAS_WIDTH * 0.2,
        angle: 0.35 + (i % 3) * 0.15,           // slight diagonal
        waveFreq: 0.008 + (i % 4) * 0.003,
        waveAmp: 6 + (i * 7 % 10),
        speed: 0.00012 + (i % 3) * 0.00006,
        phase: i * 0.9,
        alpha: 0.03 + (i % 3) * 0.012,
        lineWidth: 0.6 + (i % 3) * 0.4,
    });
}

function _renderCausticLight(ctx) {
    const t = Date.now();
    ctx.save();

    for (const line of _CAUSTIC_LINES) {
        const shift = t * line.speed + line.phase;
        const drift = Math.sin(shift) * 30;         // slow lateral drift
        const pulse = 0.7 + Math.sin(shift * 2.2) * 0.3;

        ctx.globalAlpha = line.alpha * pulse;
        ctx.strokeStyle = 'rgba(80, 170, 255, 1)';
        ctx.lineWidth = line.lineWidth;

        ctx.beginPath();
        const cosA = Math.cos(line.angle);
        const sinA = Math.sin(line.angle);
        const steps = 18;
        for (let s = 0; s <= steps; s++) {
            const frac = s / steps;
            // Walk along the line's main axis (full canvas diagonal)
            const along = frac * (CANVAS_WIDTH + CANVAS_HEIGHT) - CANVAS_HEIGHT * 0.3;
            // Perpendicular wave offset
            const wave = Math.sin(along * line.waveFreq + shift * 3) * line.waveAmp;
            const px = cosA * along - sinA * wave + drift + line.baseOffset * cosA;
            const py = sinA * along + cosA * wave + drift * 0.3;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    ctx.restore();
}
// ── Heat haze: subtle shimmering warm air distortion ────────
function _renderHeatHaze(ctx) {
    const t = Date.now();
    ctx.save();

    // Layer 1 — very faint warm tint that slowly undulates
    const wavePhase = t * 0.0004;
    const bandCount = 6;
    for (let i = 0; i < bandCount; i++) {
        const baseY = (i / bandCount) * CANVAS_HEIGHT;
        const wobble = Math.sin(wavePhase + i * 1.3) * 8;
        const alpha = 0.015 + Math.sin(wavePhase * 1.7 + i * 0.9) * 0.008;

        ctx.fillStyle = `rgba(200, 160, 60, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, baseY + wobble);
        // Wavy horizontal band
        for (let sx = 0; sx <= CANVAS_WIDTH; sx += 40) {
            const y = baseY + wobble + Math.sin(sx * 0.008 + wavePhase * 2 + i) * 4;
            ctx.lineTo(sx, y);
        }
        ctx.lineTo(CANVAS_WIDTH, baseY + wobble + CANVAS_HEIGHT / bandCount);
        for (let sx = CANVAS_WIDTH; sx >= 0; sx -= 40) {
            const y = baseY + wobble + CANVAS_HEIGHT / bandCount + Math.sin(sx * 0.01 + wavePhase * 1.5 + i * 0.7) * 3;
            ctx.lineTo(sx, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // Layer 2 — drifting heat shimmer lines (very subtle)
    ctx.globalCompositeOperation = 'source-over';
    const lineCount = 5;
    for (let i = 0; i < lineCount; i++) {
        const baseY = 40 + (i / lineCount) * (CANVAS_HEIGHT - 80);
        const drift = Math.sin(t * 0.0003 + i * 2.1) * 20;
        const pulse = 0.5 + Math.sin(t * 0.0005 + i * 1.4) * 0.5;

        ctx.strokeStyle = `rgba(255, 220, 130, ${0.02 * pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let sx = 0; sx <= CANVAS_WIDTH; sx += 8) {
            const y = baseY + drift + Math.sin(sx * 0.012 + t * 0.001 + i * 1.1) * 3;
            if (sx === 0) ctx.moveTo(sx, y);
            else ctx.lineTo(sx, y);
        }
        ctx.stroke();
    }

    ctx.restore();
}