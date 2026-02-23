import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { clearFrameInput, initMouse } from './input.js';
import { Game } from './game.js';
import { updateShake } from './shake.js';
import { renderFlash } from './combat/impactSystem.js';

// ── Canvas setup (DPI-aware for Retina displays) ──
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const dpr = window.devicePixelRatio || 1;
canvas.width  = CANVAS_WIDTH  * dpr;
canvas.height = CANVAS_HEIGHT * dpr;
canvas.style.width  = CANVAS_WIDTH  + 'px';
canvas.style.height = CANVAS_HEIGHT + 'px';
ctx.scale(dpr, dpr);

// ── Mouse input setup (tracks position + buttons on canvas) ──
initMouse(canvas);

// ── Game instance ──
const game = new Game(ctx);

// ── Main loop ──
let lastTime = performance.now();

function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50 ms
    lastTime = now;

    game.update(dt);

    // Apply screen shake
    const shake = updateShake();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    game.render();
    ctx.restore();

    // Screen flash overlay (drawn on top, unshaken)
    renderFlash(ctx);

    clearFrameInput();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
