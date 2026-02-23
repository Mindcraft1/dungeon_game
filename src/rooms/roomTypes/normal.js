// ── Normal Room Type Definition ─────────────────────────────
// Default room — kill all enemies to unlock the door.
// No special mechanics; serves as the baseline.
// ─────────────────────────────────────────────────────────────

import { ROOM_TYPE_NORMAL } from '../../constants.js';
import { registerRoomType } from '../roomRegistry.js';

registerRoomType(ROOM_TYPE_NORMAL, {
    id:    ROOM_TYPE_NORMAL,
    name:  'Dungeon Room',
    color: '#888',

    // Normal rooms use default completion (kill-all) and have
    // no special enter/update/render/exit behaviour.
    // All hooks are omitted → the registry's callHook() returns undefined,
    // and game.js falls through to its default logic.
});
