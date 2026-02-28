import { TILE_SIZE, DOOR_COLOR_LOCKED, DOOR_COLOR_UNLOCKED } from '../constants.js';
import { circleVsRect } from '../collision.js';

export class Door {
    constructor(col, row) {
        this.col = col;
        this.row = row;
        this.x = col * TILE_SIZE;
        this.y = row * TILE_SIZE;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.locked = true;
        this.pulseTime = 0;
        this.manualLock = false; // When true, door stays locked even if enemies are dead (reward orb pending)
    }

    update(dt, enemies, forceUnlock = false) {
        if (this.manualLock) {
            // Stay locked regardless of enemies — waiting for reward orb pickup
            this.locked = true;
        } else {
            this.locked = forceUnlock ? false : enemies.some(e => !e.dead);
        }
        if (!this.locked) this.pulseTime += dt;
    }

    /** Returns true when the player overlaps an unlocked door. */
    checkCollision(player) {
        if (this.locked) return false;
        return circleVsRect(player.x, player.y, player.radius,
                            this.x, this.y, this.width, this.height);
    }

    /** Proximity check for "LOCKED" hint. */
    isPlayerNear(player) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const dx = player.x - cx;
        const dy = player.y - cy;
        return Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 2.2;
    }

    // ── Rendering ──────────────────────────────────────────

    render(ctx) {
        const pad = 4;

        ctx.save();
        if (!this.locked) {
            ctx.globalAlpha = 0.85 + Math.sin(this.pulseTime * 4) * 0.15;
        }

        // Fill
        ctx.fillStyle = this.locked ? DOOR_COLOR_LOCKED : DOOR_COLOR_UNLOCKED;
        ctx.fillRect(this.x + pad, this.y + pad,
                     this.width - pad * 2, this.height - pad * 2);

        // Frame
        ctx.strokeStyle = this.locked ? '#962d22' : '#1e8449';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x + pad, this.y + pad,
                       this.width - pad * 2, this.height - pad * 2);

        const mx = this.x + this.width / 2;
        const my = this.y + this.height / 2;

        if (this.locked) {
            // Lock icon
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(mx - 5, my - 1, 10, 8);
            ctx.beginPath();
            ctx.arc(mx, my - 2, 4, Math.PI, 0);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Arrow icon (→)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(mx + 7, my);
            ctx.lineTo(mx - 4, my - 6);
            ctx.lineTo(mx - 4, my + 6);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}
