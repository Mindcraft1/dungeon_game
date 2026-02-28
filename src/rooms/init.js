// ── Room Types Init ─────────────────────────────────────────
// Import this module once (from game.js) to ensure all room
// type definitions self-register with the room registry.
//
// To add a new room type:
//   1. Create a new file in src/rooms/roomTypes/<name>.js
//   2. Import and register it here
//   3. Add spawn rules in game.js nextRoom() (or a future spawn-rule module)
// ─────────────────────────────────────────────────────────────

import './roomTypes/normal.js';
import './roomTypes/boss.js';
import './roomTypes/event.js';
import './roomTypes/darkness.js';
import './roomTypes/shop.js';

// Re-export the registry API for convenience
export { getRoomType, callHook, hasRoomType, getAllRoomTypeIds } from './roomRegistry.js';
