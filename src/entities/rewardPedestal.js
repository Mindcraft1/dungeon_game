// ── RewardPedestal Entity ─────────────────────────────────────
// Spatial reward pedestal used in the post-boss reward room.
// Two variants:
//   'stat'   — permanent stat boost (HP / DMG / SPD)
//   'scroll' — boss scroll unlock (ability / proc / node)
//
// Player walks near and presses Space/Enter to claim.
// Once any pedestal in a group is claimed, siblings are disabled.
// ─────────────────────────────────────────────────────────────

import { TILE_SIZE, CANVAS_WIDTH } from '../constants.js';

const INTERACT_RADIUS = 34;
const BOB_SPEED = 2.0;
const BOB_AMP = 3;

export class RewardPedestal {
    /**
     * @param {number} col
     * @param {number} row
     * @param {'stat'|'scroll'} kind
     * @param {object} data  — { id, name, icon, color, desc } for the choice
     * @param {string} groupId — pedestals with same groupId are mutually exclusive
     */
    constructor(col, row, kind, data, groupId) {
        this.col = col;
        this.row = row;
        this.x = col * TILE_SIZE + TILE_SIZE / 2;
        this.y = row * TILE_SIZE + TILE_SIZE / 2;
        this.kind = kind;       // 'stat' or 'scroll'
        this.data = data;       // { id, name, icon, color, desc }
        this.groupId = groupId; // e.g. 'stat' or 'scroll'
        this.claimed = false;   // true when THIS pedestal was picked
        this.disabled = false;  // true when a sibling in the group was picked
        this.nearby = false;
        this._time = Math.random() * Math.PI * 2;
    }

    update(dt, player) {
        this._time += dt * BOB_SPEED;
        if (this.claimed || this.disabled) {
            this.nearby = false;
            return;
        }
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.nearby = dist < INTERACT_RADIUS + player.radius;
    }

    render(ctx) {
        const isActive = !this.claimed && !this.disabled;
        const bobY = this.y + (isActive ? Math.sin(this._time) * BOB_AMP : 0);
        const alpha = isActive ? 1 : 0.25;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow pedestal circle
        const glowR = 20 + (isActive ? Math.sin(this._time * 0.7) * 3 : 0);
        const baseColor = this.data.color || '#ffd700';
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
        grad.addColorStop(0, baseColor + '66');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Pedestal base
        ctx.fillStyle = 'rgba(40,40,60,0.8)';
        ctx.fillRect(this.x - 14, this.y + 6, 28, 8);
        ctx.strokeStyle = baseColor + '88';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - 14, this.y + 6, 28, 8);

        // Icon
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.data.icon, this.x, bobY - 6);

        // Label
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = baseColor;
        ctx.textBaseline = 'top';
        ctx.fillText(this.data.name, this.x, bobY + 12);

        // "Claimed" checkmark
        if (this.claimed) {
            ctx.globalAlpha = 0.7;
            ctx.font = 'bold 20px sans-serif';
            ctx.fillStyle = '#4caf50';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', this.x, this.y);
        }

        // Interaction prompt
        if (this.nearby && isActive) {
            ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 10px monospace';
            ctx.textBaseline = 'bottom';
            ctx.fillText('[SPACE]', this.x, bobY - 24);
            ctx.globalAlpha = 1;

            // Highlight ring
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, INTERACT_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderTooltip(ctx) {
        if (!this.nearby || this.claimed || this.disabled) return;

        ctx.save();
        ctx.textAlign = 'center';

        const tooltipW = 220;
        const tooltipH = 48;
        const tx = Math.max(tooltipW / 2 + 4, Math.min(this.x, CANVAS_WIDTH - tooltipW / 2 - 4));
        const ty = this.y - 60;

        ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
        ctx.fillRect(tx - tooltipW / 2, ty - tooltipH / 2, tooltipW, tooltipH);
        ctx.strokeStyle = this.data.color || '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx - tooltipW / 2, ty - tooltipH / 2, tooltipW, tooltipH);

        // Title
        ctx.fillStyle = this.data.color || '#ffd700';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`${this.data.icon} ${this.data.name}`, tx, ty - 8);

        // Description
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(this.data.desc, tx, ty + 10);

        ctx.restore();
    }
}
