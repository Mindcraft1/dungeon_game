// ── HealingFountain Entity ────────────────────────────────────
// Spatial healing fountain in the post-boss reward room.
// Player walks near to auto-heal to full HP (one-use).
// ─────────────────────────────────────────────────────────────

import { TILE_SIZE } from '../constants.js';

const INTERACT_RADIUS = 30;
const WAVE_SPEED = 2.5;

export class HealingFountain {
    constructor(col, row) {
        this.col = col;
        this.row = row;
        this.x = col * TILE_SIZE + TILE_SIZE / 2;
        this.y = row * TILE_SIZE + TILE_SIZE / 2;
        this.used = false;
        this.nearby = false;
        this._time = 0;
        this._healFlash = 0; // flash timer after use
    }

    update(dt, player) {
        this._time += dt * WAVE_SPEED;
        if (this._healFlash > 0) this._healFlash -= dt * 1000;

        if (this.used) {
            this.nearby = false;
            return;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.nearby = dist < INTERACT_RADIUS + player.radius;
    }

    /**
     * Try to heal the player. Returns amount healed (0 if already full or used).
     */
    tryHeal(player) {
        if (this.used) return 0;
        if (player.hp >= player.maxHp) return 0;
        const healed = player.maxHp - player.hp;
        player.hp = player.maxHp;
        this.used = true;
        this._healFlash = 800;
        return healed;
    }

    render(ctx) {
        ctx.save();

        // Water pool glow
        const poolR = 16 + Math.sin(this._time) * 2;
        const alpha = this.used ? 0.2 : 0.6;
        const waterColor = this.used ? '#336677' : '#44ccff';
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, poolR + 6);
        grad.addColorStop(0, waterColor + (this.used ? '33' : '88'));
        grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, poolR + 6, 0, Math.PI * 2);
        ctx.fill();

        // Inner pool
        ctx.globalAlpha = this.used ? 0.3 : 0.7;
        ctx.fillStyle = waterColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, poolR, 0, Math.PI * 2);
        ctx.fill();

        // Water ring animation
        if (!this.used) {
            const ringR = 8 + ((this._time * 8) % 18);
            const ringAlpha = Math.max(0, 1 - ringR / 26) * 0.4;
            ctx.globalAlpha = ringAlpha;
            ctx.strokeStyle = '#88eeff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Fountain icon
        ctx.globalAlpha = this.used ? 0.3 : 1;
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.used ? '🪨' : '⛲', this.x, this.y - 2);

        // Label
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = this.used ? '#555' : '#44ccff';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        ctx.fillText(this.used ? 'Empty' : 'Heal', this.x, this.y + 14);

        // Interaction prompt
        if (this.nearby && !this.used) {
            const pulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#44ccff';
            ctx.font = 'bold 10px monospace';
            ctx.textBaseline = 'bottom';
            ctx.fillText('[SPACE] Heal', this.x, this.y - 20);

            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = '#44ccff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, INTERACT_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Heal flash effect
        if (this._healFlash > 0) {
            const flashAlpha = this._healFlash / 800 * 0.5;
            ctx.globalAlpha = flashAlpha;
            ctx.fillStyle = '#44ff88';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 30 + (1 - this._healFlash / 800) * 20, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
