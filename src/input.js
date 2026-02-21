const keysDown = new Set();
const keysJustPressed = new Set();
let _lastKey = '';

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

    // Prevent browser scrolling for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Escape'].includes(e.code)) {
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
    _lastKey = '';
    _activatedCheat = '';

    // Decay cheat buffer timeout
    // (We approximate 16ms per frame — close enough for a timeout)
    _cheatBufferTimer -= 16;
    if (_cheatBufferTimer <= 0) {
        _cheatBuffer = '';
    }
}
