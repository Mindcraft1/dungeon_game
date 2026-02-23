// ── Boss Room Type Definition ───────────────────────────────
// Boss encounter room. Completion = boss defeated.
// No special lifecycle needed beyond what game.js already handles
// for boss stages; this exists so every room has a type tag.
// ─────────────────────────────────────────────────────────────

import { ROOM_TYPE_BOSS } from '../../constants.js';
import { registerRoomType } from '../roomRegistry.js';

registerRoomType(ROOM_TYPE_BOSS, {
    id:    ROOM_TYPE_BOSS,
    name:  'Boss Arena',
    color: '#e74c3c',
    // All boss-specific logic remains in game.js (_loadBossRoom, etc.)
});
