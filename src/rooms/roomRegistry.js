// ── Room Type Registry ─────────────────────────────────────
// Central registry mapping roomType → definition object.
//
// Every room type definition must implement the following contract:
//
//   {
//     id:          string,          // matches ROOM_TYPE_* constant
//     name:        string,          // human-readable name for banners
//     color:       string,          // accent color for UI
//
//     // ── Lifecycle Hooks (all optional) ──
//     onEnter(ctx)   → void         // called once when entering the room
//     onUpdate(ctx, dt) → void      // called every frame while in the room
//     onRender(ctx, renderCtx) → void // called after main render, before HUD overlays
//     onRenderPost(ctx, renderCtx) → void // called after HUD, for top-level overlays
//     isComplete(ctx) → bool|null   // null = use default (kill-all), true/false = override
//     getReward(ctx)  → object|null // reward descriptor applied on room clear
//     onExit(ctx)    → void         // cleanup when leaving the room (CRITICAL)
//   }
//
// The `ctx` object passed to hooks is a lightweight "room context" bag
// provided by game.js. It contains references the room might need
// (player, enemies, stage, etc.) without coupling to the full Game class.
// ─────────────────────────────────────────────────────────────

const _registry = new Map();

/**
 * Register a room type definition.
 * @param {string} id - ROOM_TYPE_* constant
 * @param {object} definition - room type definition implementing the contract
 */
export function registerRoomType(id, definition) {
    if (_registry.has(id)) {
        console.warn(`[RoomRegistry] Overwriting existing room type: ${id}`);
    }
    _registry.set(id, { ...definition, id });
}

/**
 * Retrieve a room type definition by id.
 * @param {string} id
 * @returns {object|null}
 */
export function getRoomType(id) {
    return _registry.get(id) || null;
}

/**
 * Check whether a room type is registered.
 * @param {string} id
 * @returns {boolean}
 */
export function hasRoomType(id) {
    return _registry.has(id);
}

/**
 * Get all registered room type ids.
 * @returns {string[]}
 */
export function getAllRoomTypeIds() {
    return [..._registry.keys()];
}

// ── Lifecycle helper: safely call a hook if it exists ────────

/**
 * Call a lifecycle hook on the given room definition, if it exists.
 * @param {object|null} def - room type definition (may be null for default rooms)
 * @param {string} hookName - e.g. 'onEnter', 'onUpdate', etc.
 * @param  {...any} args - arguments forwarded to the hook
 * @returns {*} return value of the hook, or undefined
 */
export function callHook(def, hookName, ...args) {
    if (def && typeof def[hookName] === 'function') {
        return def[hookName](...args);
    }
    return undefined;
}
