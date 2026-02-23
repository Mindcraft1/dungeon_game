// ── Event Room Type Definition ──────────────────────────────
// Rooms that trigger an event overlay (Forge, Shrine, etc.).
// The event system is already managed by eventSystem.js + game.js;
// this definition just tags the room for the registry.
// ─────────────────────────────────────────────────────────────

import { ROOM_TYPE_EVENT } from '../../constants.js';
import { registerRoomType } from '../roomRegistry.js';

registerRoomType(ROOM_TYPE_EVENT, {
    id:    ROOM_TYPE_EVENT,
    name:  'Event Room',
    color: '#9c27b0',
    // Event logic handled by eventSystem.js; no new lifecycle hooks needed.
});
