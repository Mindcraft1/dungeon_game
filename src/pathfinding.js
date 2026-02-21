import { TILE_SIZE } from './constants.js';
import { isWall } from './collision.js';

/**
 * Check line-of-sight between two pixel positions on the tile grid.
 * Steps along the line in sub-tile increments and returns false if any
 * point lands inside a wall tile.
 */
export function hasLineOfSight(x1, y1, x2, y2, grid) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return true;

    // Step size ~30 % of a tile — small enough to never skip a tile
    const step = TILE_SIZE * 0.3;
    const steps = Math.ceil(dist / step);

    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const col = Math.floor((x1 + dx * t) / TILE_SIZE);
        const row = Math.floor((y1 + dy * t) / TILE_SIZE);
        if (isWall(grid, col, row)) return false;
    }
    return true;
}

/**
 * BFS pathfinding on the tile grid (8-directional).
 *
 * Returns an array of {x,y} **pixel-centre** waypoints leading from the
 * tile containing (startX,startY) to the tile containing (goalX,goalY).
 * The start tile is NOT included; the goal tile IS the last element.
 * Returns null if no path exists.
 *
 * Diagonal moves are only allowed when both cardinal neighbours are clear
 * (prevents corner-cutting through walls).
 */
export function findPath(startX, startY, goalX, goalY, grid) {
    const sc = Math.floor(startX / TILE_SIZE);
    const sr = Math.floor(startY / TILE_SIZE);
    const gc = Math.floor(goalX / TILE_SIZE);
    const gr = Math.floor(goalY / TILE_SIZE);

    // Trivial cases
    if (isWall(grid, sc, sr) || isWall(grid, gc, gr)) return null;
    if (sc === gc && sr === gr) return [];

    // BFS with 8 directions
    const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],   // cardinals
        [1, 1], [1, -1], [-1, 1], [-1, -1],  // diagonals
    ];

    const key = (c, r) => (r << 8) | c;       // fast int key (grid < 256×256)
    const visited = new Set();
    const cameFrom = new Map();
    const queue = [[sc, sr]];
    visited.add(key(sc, sr));

    while (queue.length > 0) {
        const [col, row] = queue.shift();

        for (const [dc, dr] of dirs) {
            const nc = col + dc;
            const nr = row + dr;
            const nk = key(nc, nr);

            if (visited.has(nk)) continue;
            if (isWall(grid, nc, nr)) continue;

            // Diagonal: require both adjacent cardinal tiles to be clear
            if (dc !== 0 && dr !== 0) {
                if (isWall(grid, col + dc, row) || isWall(grid, col, row + dr)) continue;
            }

            visited.add(nk);
            cameFrom.set(nk, key(col, row));

            if (nc === gc && nr === gr) {
                // Reconstruct path (goal → start), then reverse
                const path = [];
                let cur = nk;
                while (cameFrom.has(cur)) {
                    const c = cur & 0xff;
                    const r = cur >> 8;
                    path.push({
                        x: c * TILE_SIZE + TILE_SIZE / 2,
                        y: r * TILE_SIZE + TILE_SIZE / 2,
                    });
                    cur = cameFrom.get(cur);
                }
                path.reverse();
                return path;
            }

            queue.push([nc, nr]);
        }
    }

    return null; // unreachable goal
}
