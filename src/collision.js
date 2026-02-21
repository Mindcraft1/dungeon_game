import { TILE_SIZE } from './constants.js';

/** Check whether grid cell (col, row) is a wall (out-of-bounds counts as wall) */
export function isWall(grid, col, row) {
    if (row < 0 || row >= grid.length) return true;
    if (col < 0 || col >= grid[0].length) return true;
    return grid[row][col];
}

/**
 * Push a circle entity out of any overlapping wall tiles.
 * Call this AFTER all position changes (movement + separation) so walls
 * always have the final say.
 */
export function resolveWalls(entity, radius, grid) {
    const startCol = Math.floor((entity.x - radius) / TILE_SIZE);
    const endCol   = Math.floor((entity.x + radius) / TILE_SIZE);
    const startRow = Math.floor((entity.y - radius) / TILE_SIZE);
    const endRow   = Math.floor((entity.y + radius) / TILE_SIZE);

    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            if (!isWall(grid, col, row)) continue;

            const tileL = col * TILE_SIZE;
            const tileT = row * TILE_SIZE;
            const tileR = tileL + TILE_SIZE;
            const tileB = tileT + TILE_SIZE;

            // Closest point on AABB to circle centre
            const closestX = Math.max(tileL, Math.min(entity.x, tileR));
            const closestY = Math.max(tileT, Math.min(entity.y, tileB));

            const dx = entity.x - closestX;
            const dy = entity.y - closestY;
            const distSq = dx * dx + dy * dy;

            if (distSq < radius * radius) {
                if (distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = radius - dist;
                    entity.x += (dx / dist) * overlap;
                    entity.y += (dy / dist) * overlap;
                } else {
                    // Centre is inside the tile → push out via shortest axis
                    const oL = entity.x - tileL + radius;
                    const oR = tileR - entity.x + radius;
                    const oT = entity.y - tileT + radius;
                    const oB = tileB - entity.y + radius;
                    const min = Math.min(oL, oR, oT, oB);
                    if (min === oL)      entity.x = tileL - radius;
                    else if (min === oR) entity.x = tileR + radius;
                    else if (min === oT) entity.y = tileT - radius;
                    else                 entity.y = tileB + radius;
                }
            }
        }
    }
}

/** Circle vs Circle overlap test */
export function circleVsCircle(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    return (dx * dx + dy * dy) < (ar + br) * (ar + br);
}

/** Circle vs axis-aligned rectangle overlap test */
export function circleVsRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
}
