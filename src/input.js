const keysDown = new Set();
const keysJustPressed = new Set();

window.addEventListener('keydown', (e) => {
    if (!keysDown.has(e.code)) {
        keysJustPressed.add(e.code);
    }
    keysDown.add(e.code);
    // Prevent browser scrolling for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
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

/** Must be called at the end of every frame */
export function clearFrameInput() {
    keysJustPressed.clear();
}
