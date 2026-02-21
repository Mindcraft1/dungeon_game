import { TILE_SIZE, COLOR_FLOOR, COLOR_WALL, COLOR_WALL_LIGHT, COLOR_WALL_DARK } from './constants.js';

/**
 * Draw the room grid (floor + bevelled wall tiles).
 */
export function renderRoom(ctx, grid) {
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;

            if (grid[row][col]) {
                // Wall – base fill
                ctx.fillStyle = COLOR_WALL;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                // Light edge (top + left)
                ctx.fillStyle = COLOR_WALL_LIGHT;
                ctx.fillRect(x, y, TILE_SIZE, 2);
                ctx.fillRect(x, y, 2, TILE_SIZE);

                // Dark edge (bottom + right)
                ctx.fillStyle = COLOR_WALL_DARK;
                ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
                ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
            } else {
                // Floor
                ctx.fillStyle = COLOR_FLOOR;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                // Subtle tile grid
                ctx.strokeStyle = 'rgba(255,255,255,0.03)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
            }
        }
    }
}
