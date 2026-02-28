// ── Reward Room Type Definition ───────────────────────────────
// A post-boss reward room with stat pedestals, scroll pedestals,
// shop items, healing fountain, and an exit door.
//
// Lifecycle:
//   onEnter   → show banner, play ambient music
//   onUpdate  → (no combat, just reward interactions)
//   onRender  → render "REWARDS" banner
//   isComplete → always true (no enemies to kill)
//   onExit    → cleanup
// ─────────────────────────────────────────────────────────────

import {
    ROOM_TYPE_SHOP,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
} from '../../constants.js';
import { registerRoomType } from '../roomRegistry.js';

let _bannerTimer = 0;

registerRoomType(ROOM_TYPE_SHOP, {
    id:    ROOM_TYPE_SHOP,
    name:  'Rewards',
    color: '#ffd700',

    onEnter(ctx) {
        _bannerTimer = 3000; // 3s entrance banner
    },

    onUpdate(ctx, dt) {
        if (_bannerTimer > 0) _bannerTimer -= dt * 1000;
    },

    onRender(ctx) {
        // Entrance banner: "SHOP" announcement
        if (_bannerTimer > 0) {
            const alpha = Math.min(1, _bannerTimer / 500); // fade out last 500ms
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, CANVAS_HEIGHT / 2 - 30, CANVAS_WIDTH, 60);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 28px monospace';
            ctx.fillText('� REWARDS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 6);
            ctx.fillStyle = '#ccc';
            ctx.font = '13px monospace';
            ctx.fillText('Claim your rewards · Door to continue', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 18);
            ctx.restore();
        }
    },

    isComplete() {
        return true; // no enemies — door is always unlocked
    },

    onExit() {
        _bannerTimer = 0;
    },
});
