// ── Achievement Event Bus ────────────────────────────────────
// Lightweight pub/sub for decoupling game logic from achievement
// tracking. game.js emits events, achievementEngine listens.
// ─────────────────────────────────────────────────────────────

const _listeners = {};  // Record<eventName, Function[]>

/**
 * Subscribe to an event.
 * @param {string} eventName
 * @param {Function} callback – receives (payload)
 */
export function on(eventName, callback) {
    if (!_listeners[eventName]) _listeners[eventName] = [];
    _listeners[eventName].push(callback);
}

/**
 * Unsubscribe a specific callback.
 */
export function off(eventName, callback) {
    const list = _listeners[eventName];
    if (!list) return;
    _listeners[eventName] = list.filter(fn => fn !== callback);
}

/**
 * Emit an event to all subscribers.
 * @param {string} eventName
 * @param {object} [payload={}]
 */
export function emit(eventName, payload = {}) {
    const list = _listeners[eventName];
    if (!list || list.length === 0) return;
    for (const fn of list) {
        try {
            fn(payload);
        } catch (e) {
            console.warn(`[achievement-event] Error in handler for "${eventName}":`, e);
        }
    }
}
