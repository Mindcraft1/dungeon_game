import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { clearFrameInput } from './input.js';
import { Game } from './game.js';

// ── Canvas setup (DPI-aware for Retina displays) ──
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const dpr = window.devicePixelRatio || 1;
canvas.width  = CANVAS_WIDTH  * dpr;
canvas.height = CANVAS_HEIGHT * dpr;
canvas.style.width  = CANVAS_WIDTH  + 'px';
canvas.style.height = CANVAS_HEIGHT + 'px';
ctx.scale(dpr, dpr);

// ── Game instance ──
const game = new Game(ctx);

// ── Main loop ──
let lastTime = performance.now();

function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50 ms
    lastTime = now;

    game.update(dt);
    game.render();
    clearFrameInput();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
