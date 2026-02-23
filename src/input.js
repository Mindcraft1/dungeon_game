const keysDown = new Set();
const keysJustPressed = new Set();
let _lastKey = '';

// ── Mouse State ──
const mouseDown = new Set();          // currently held buttons (0=left, 1=middle, 2=right)
const mouseJustPressed = new Set();   // buttons pressed this frame
let _mouseX = 0;                      // canvas-local X (logical pixels)
let _mouseY = 0;                      // canvas-local Y (logical pixels)
let _mouseActive = false;             // true after first mouse move — used to auto-detect mouse users
let _canvasRef = null;                // set once via initMouse()

/** Call once from main.js after canvas is ready. Also blocks the context menu. */
export function initMouse(canvas) {
    _canvasRef = canvas;

    canvas.addEventListener('mousedown', (e) => {
        if (!mouseDown.has(e.button)) mouseJustPressed.add(e.button);
        mouseDown.add(e.button);
        _mouseActive = true;
        e.preventDefault();
    });

    canvas.addEventListener('mouseup', (e) => {
        mouseDown.delete(e.button);
    });

    canvas.addEventListener('mousemove', (e) => {
        _mouseActive = true;
        _updateMousePos(e);
    });

    // Prevent right-click context menu on canvas so button 2 works for dash
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // If mouse leaves window, release all buttons
    canvas.addEventListener('mouseleave', () => {
        mouseDown.clear();
    });
}

function _updateMousePos(e) {
    if (!_canvasRef) return;
    const rect = _canvasRef.getBoundingClientRect();
    // Convert to logical (CSS) pixels — matches the 800×600 coordinate space
    _mouseX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    _mouseY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
}

// Canvas dimensions needed for coordinate conversion
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

/** True while the mouse button is held (0=left, 1=middle, 2=right) */
export function isMouseDown(button) { return mouseDown.has(button); }

/** True only in the frame the mouse button was first pressed */
export function wasMousePressed(button) { return mouseJustPressed.has(button); }

/** Current mouse position in canvas logical coordinates */
export function getMousePos() { return { x: _mouseX, y: _mouseY }; }

/** True if the user has moved/clicked the mouse at least once */
export function isMouseActive() { return _mouseActive; }

/**
 * Returns which vertical menu item the mouse is hovering over, or -1 if none.
 * Works for any centered vertical list.
 * @param {number} startY - Y centre of first item
 * @param {number} count  - number of items
 * @param {number} spacing - Y distance between items
 * @param {number} [itemH] - clickable height per item (defaults to spacing)
 * @param {number} [boxW]  - clickable width (defaults to 400, centred on canvas)
 * @param {number} [centerX] - horizontal center (defaults to CANVAS_WIDTH/2)
 */
export function getMenuHover(startY, count, spacing, itemH, boxW, centerX) {
    if (!_mouseActive) return -1;
    itemH  = itemH  || spacing;
    boxW   = boxW   || 400;
    centerX = centerX || (CANVAS_WIDTH / 2);
    const halfW = boxW / 2;
    if (_mouseX < centerX - halfW || _mouseX > centerX + halfW) return -1;
    for (let i = 0; i < count; i++) {
        const cy = startY + i * spacing;
        if (_mouseY >= cy - itemH / 2 && _mouseY <= cy + itemH / 2) return i;
    }
    return -1;
}

/**
 * Returns which item in a list of custom Y-positions the mouse hovers, or -1.
 * @param {number[]} ys - array of Y centres for each item
 * @param {number} itemH - clickable height per item
 * @param {number} [boxW] - clickable width (centred)
 * @param {number} [centerX]
 */
export function getMenuHoverCustom(ys, itemH, boxW, centerX) {
    if (!_mouseActive) return -1;
    boxW    = boxW    || 400;
    centerX = centerX || (CANVAS_WIDTH / 2);
    const halfW = boxW / 2;
    if (_mouseX < centerX - halfW || _mouseX > centerX + halfW) return -1;
    for (let i = 0; i < ys.length; i++) {
        if (_mouseY >= ys[i] - itemH / 2 && _mouseY <= ys[i] + itemH / 2) return i;
    }
    return -1;
}

// ── Cheat Code Buffer ──
const CHEAT_BUFFER_MAX = 20;       // max chars remembered
const CHEAT_BUFFER_TIMEOUT = 3000; // ms before buffer resets
let _cheatBuffer = '';
let _cheatBufferTimer = 0;
let _activatedCheat = '';          // set when a code matches this frame

// Registered cheat codes: { code: string, id: string }
const _cheatCodes = [
    { code: 'iddqd',   id: 'godmode' },
    { code: 'idkfa',   id: 'onehitkill' },
    { code: 'noclip',  id: 'fullheal' },
    { code: 'bigxp',   id: 'xpboost' },
    { code: 'showme',  id: 'skipstage' },
    { code: 'maxlvl',  id: 'maxlevel' },
    { code: 'brute',   id: 'summon_brute' },
    { code: 'warlock', id: 'summon_warlock' },
    { code: 'phantom', id: 'summon_phantom' },
    { code: 'jugger',  id: 'summon_juggernaut' },
    { code: 'devmod', id: 'devtools' },
];

window.addEventListener('keydown', (e) => {
    if (!keysDown.has(e.code)) {
        keysJustPressed.add(e.code);
    }
    keysDown.add(e.code);
    _lastKey = e.key;

    // Feed single-char keys into cheat buffer
    if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        _cheatBuffer += e.key.toLowerCase();
        _cheatBufferTimer = CHEAT_BUFFER_TIMEOUT;
        if (_cheatBuffer.length > CHEAT_BUFFER_MAX) {
            _cheatBuffer = _cheatBuffer.slice(-CHEAT_BUFFER_MAX);
        }
        // Check for matches
        for (const cheat of _cheatCodes) {
            if (_cheatBuffer.endsWith(cheat.code)) {
                _activatedCheat = cheat.id;
                _cheatBuffer = '';
                break;
            }
        }
    }

    // Prevent browser defaults for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Escape', 'KeyQ', 'KeyE', 'Tab'].includes(e.code)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
});

/** True while the key is held */
export function isDown(code) {
    return keysDown.has(code);
}

/** True only in the frame the key was first pressed */
export function wasPressed(code) {
    return keysJustPressed.has(code);
}

/** Normalized movement vector from WASD / Arrow Keys */
export function getMovement() {
    let dx = 0;
    let dy = 0;
    if (keysDown.has('KeyA') || keysDown.has('ArrowLeft'))  dx -= 1;
    if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) dx += 1;
    if (keysDown.has('KeyW') || keysDown.has('ArrowUp'))    dy -= 1;
    if (keysDown.has('KeyS') || keysDown.has('ArrowDown'))  dy += 1;

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }
    return { x: dx, y: dy };
}

/** Returns the last raw key pressed this frame (for text input). */
export function getLastKey() {
    return _lastKey;
}

/** Returns the cheat code ID activated this frame (or '' if none). */
export function getActivatedCheat() {
    return _activatedCheat;
}

/** Must be called at the end of every frame */
export function clearFrameInput() {
    keysJustPressed.clear();
    mouseJustPressed.clear();
    _lastKey = '';
    _activatedCheat = '';

    // Decay cheat buffer timeout
    // (We approximate 16ms per frame — close enough for a timeout)
    _cheatBufferTimer -= 16;
    if (_cheatBufferTimer <= 0) {
        _cheatBuffer = '';
    }
}
