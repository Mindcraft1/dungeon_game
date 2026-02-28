// ── ShopItem Entity ──────────────────────────────────────────
// Spatial shop item placed on the floor in the post-boss shop room.
// Player walks near and presses Space/Enter to purchase.
// ─────────────────────────────────────────────────────────────

import { TILE_SIZE, CANVAS_WIDTH } from '../constants.js';

const INTERACT_RADIUS = 36;   // how close the player must be to buy
const BOB_SPEED = 2.5;        // floating bob frequency
const BOB_AMP = 3;            // floating bob amplitude (px)

export class ShopItem {
    /**
     * @param {number} col - grid column (pedestal position)
     * @param {number} row - grid row
     * @param {object} itemDef - item definition from RUN_SHOP_ITEMS
     * @param {boolean} isForgeToken - true if this is the forge token slot
     * @param {number} forgeTokenCost - cost if forge token
     */
    constructor(col, row, itemDef, isForgeToken = false, forgeTokenCost = 0) {
        this.col = col;
        this.row = row;
        this.x = col * TILE_SIZE + TILE_SIZE / 2;
        this.y = row * TILE_SIZE + TILE_SIZE / 2;
        this.itemDef = itemDef;
        this.isForgeToken = isForgeToken;
        this.cost = isForgeToken ? forgeTokenCost : (itemDef ? itemDef.cost : 0);
        this.name = isForgeToken ? 'Forge Token' : (itemDef ? itemDef.name : '');
        this.icon = isForgeToken ? '🔨' : (itemDef ? itemDef.icon : '?');
        this.color = isForgeToken ? '#ff9800' : (itemDef ? itemDef.color : '#aaa');
        this.desc = isForgeToken ? 'Upgrade a node' : (itemDef ? itemDef.desc : '');
        this.id = isForgeToken ? 'forge_token' : (itemDef ? itemDef.id : '');
        this.purchased = false;
        this.nearby = false;      // true when player is in range
        this._time = Math.random() * Math.PI * 2; // randomize bob phase
    }

    update(dt, player) {
        this._time += dt * BOB_SPEED;

        if (this.purchased) {
            this.nearby = false;
            return;
        }

        // Check proximity to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.nearby = dist < INTERACT_RADIUS + player.radius;
    }

    /**
     * Render the shop item on the floor.
     */
    render(ctx) {
        if (this.purchased) {
            // Show a faded "SOLD" marker
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#666';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SOLD', this.x, this.y + 4);
            ctx.restore();
            return;
        }

        const bobY = this.y + Math.sin(this._time) * BOB_AMP;

        ctx.save();

        // Glow circle on floor (pedestal)
        const glowRadius = 18 + Math.sin(this._time * 0.7) * 3;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRadius);
        grad.addColorStop(0, this.color + '44');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Icon (large)
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.x, bobY - 8);

        // Price tag
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.textBaseline = 'top';
        ctx.fillText(`🪙${this.cost}`, this.x, bobY + 10);

        // Name (below price)
        ctx.font = '9px monospace';
        ctx.fillStyle = '#ccc';
        ctx.fillText(this.name, this.x, bobY + 24);

        // Interaction prompt when nearby
        if (this.nearby) {
            // Highlight ring
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, INTERACT_RADIUS, 0, Math.PI * 2);
            ctx.stroke();

            // "Press Space" hint
            const pulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 10px monospace';
            ctx.textBaseline = 'bottom';
            ctx.fillText('[SPACE] Buy', this.x, bobY - 26);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    /**
     * Render a description tooltip when the player is nearby (drawn above HUD).
     */
    renderTooltip(ctx) {
        if (this.purchased || !this.nearby) return;

        ctx.save();
        ctx.textAlign = 'center';

        // Tooltip background
        const tooltipW = 200;
        const tooltipH = 44;
        const tx = Math.max(tooltipW / 2 + 4, Math.min(this.x, CANVAS_WIDTH - tooltipW / 2 - 4));
        const ty = this.y - 60;

        ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
        ctx.fillRect(tx - tooltipW / 2, ty - tooltipH / 2, tooltipW, tooltipH);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(tx - tooltipW / 2, ty - tooltipH / 2, tooltipW, tooltipH);

        // Item name + desc
        ctx.fillStyle = this.color;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`${this.icon} ${this.name}`, tx, ty - 6);
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(this.desc, tx, ty + 10);

        ctx.restore();
    }
}
