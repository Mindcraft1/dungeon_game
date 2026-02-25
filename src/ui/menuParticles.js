// ── Menu Background Particles ───────────────────────────────
// Subtle ambient particles on the main menu, themed to the
// biome where the player last died. A small easter egg that
// gives a hint about your last run.
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import {
    BIOME_JUNGLE, BIOME_DEPTHS, BIOME_DESERT,
    BIOME_WASTELAND, BIOME_SPACESHIP,
} from '../biomes.js';

// ── Per-biome particle configurations ──

const CONFIGS = {
    // ── Jungle: gentle falling leaves ──
    [BIOME_JUNGLE]: {
        maxCount: 18,
        spawnRate: 0.6,            // particles / second
        colors: ['#4caf50', '#66bb6a', '#388e3c', '#81c784'],
        alpha: [0.15, 0.30],
        size: [3, 6],
        speed: [15, 35],
        drift: 12,                 // horizontal sine sway amplitude
        driftFreq: [0.4, 0.9],    // sway frequency range
        direction: 'down',
        shape: 'leaf',
    },

    // ── Depths: rising bubbles ──
    [BIOME_DEPTHS]: {
        maxCount: 14,
        spawnRate: 0.5,
        colors: ['#64b5f6', '#42a5f5', '#90caf9', '#bbdefb'],
        alpha: [0.10, 0.25],
        size: [2, 5],
        speed: [18, 40],
        drift: 8,
        driftFreq: [0.6, 1.2],
        direction: 'up',
        shape: 'circle',
    },

    // ── Desert: blowing sand grains ──
    [BIOME_DESERT]: {
        maxCount: 22,
        spawnRate: 0.9,
        colors: ['#d4a056', '#c49a42', '#b8860b', '#deb887'],
        alpha: [0.10, 0.22],
        size: [1, 3],
        speed: [25, 55],
        drift: 0,
        driftFreq: [0, 0],
        direction: 'wind',         // left-to-right diagonal
        shape: 'dot',
    },

    // ── Wasteland: rising embers ──
    [BIOME_WASTELAND]: {
        maxCount: 16,
        spawnRate: 0.55,
        colors: ['#ff6b35', '#ff4500', '#ff8c00', '#e25822'],
        alpha: [0.12, 0.28],
        size: [1, 3],
        speed: [20, 45],
        drift: 10,
        driftFreq: [0.5, 1.0],
        direction: 'up',
        shape: 'glow',
    },

    // ── Spaceship: floating data motes ──
    [BIOME_SPACESHIP]: {
        maxCount: 15,
        spawnRate: 0.45,
        colors: ['#00e5ff', '#18ffff', '#80d8ff', '#82b1ff'],
        alpha: [0.15, 0.35],
        size: [1.5, 4],
        speed: [10, 30],
        drift: 6,
        driftFreq: [0.3, 0.7],
        direction: 'float',        // random gentle drift
        shape: 'glow',
    },
};

// ── Helpers ──

function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Particle class (internal) ──

class Particle {
    constructor(cfg) {
        this.color = pick(cfg.colors);
        this.alpha = rand(cfg.alpha[0], cfg.alpha[1]);
        this.r     = rand(cfg.size[0], cfg.size[1]);
        this.speed = rand(cfg.speed[0], cfg.speed[1]);
        this.shape = cfg.shape;
        this.age   = 0;
        this.life  = rand(8, 16);       // seconds before fade-out
        this.sway  = cfg.drift;
        this.swayFreq = rand(cfg.driftFreq[0], cfg.driftFreq[1]);
        this.swayPhase = Math.random() * Math.PI * 2;
        // rotation for leaf shape
        this.rot   = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 1.2;

        // Spawn position & velocity based on direction
        switch (cfg.direction) {
            case 'down':
                this.x  = rand(0, CANVAS_WIDTH);
                this.y  = rand(-20, -5);
                this.vx = 0;
                this.vy = this.speed;
                break;
            case 'up':
                this.x  = rand(0, CANVAS_WIDTH);
                this.y  = rand(CANVAS_HEIGHT + 5, CANVAS_HEIGHT + 20);
                this.vx = 0;
                this.vy = -this.speed;
                break;
            case 'wind':
                // Blow from left side diagonally downward
                this.x  = rand(-20, -5);
                this.y  = rand(-20, CANVAS_HEIGHT * 0.7);
                this.vx = this.speed;
                this.vy = this.speed * 0.3;
                break;
            case 'float':
            default:
                this.x  = rand(0, CANVAS_WIDTH);
                this.y  = rand(0, CANVAS_HEIGHT);
                const angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(angle) * this.speed;
                this.vy = Math.sin(angle) * this.speed;
                break;
        }
    }

    update(dt) {
        this.age += dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Horizontal sway
        if (this.sway > 0) {
            this.x += Math.sin(this.age * this.swayFreq * Math.PI * 2 + this.swayPhase) * this.sway * dt;
        }

        // Rotation (for leaves)
        this.rot += this.rotSpeed * dt;
    }

    get dead() {
        // Off-screen or past lifetime
        if (this.age > this.life) return true;
        const margin = 30;
        return (
            this.x < -margin || this.x > CANVAS_WIDTH + margin ||
            this.y < -margin || this.y > CANVAS_HEIGHT + margin
        );
    }

    /** 0→1 fade-in over first 1s, 1→0 fade-out over last 2s */
    get opacity() {
        const fadeIn  = Math.min(this.age / 1.0, 1);
        const fadeOut = Math.max(0, Math.min((this.life - this.age) / 2.0, 1));
        return this.alpha * fadeIn * fadeOut;
    }

    render(ctx) {
        const a = this.opacity;
        if (a <= 0.005) return;

        ctx.save();
        ctx.globalAlpha = a;

        switch (this.shape) {
            case 'leaf': {
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rot);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, this.r * 1.6, this.r * 0.7, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'circle': {
                // Bubble with small highlight
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fill();
                // Tiny highlight
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.arc(this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'glow': {
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = this.r * 3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                break;
            }
            case 'dot':
            default: {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }

        ctx.restore();
    }
}

// ── Public API ──────────────────────────────────────────────

let _particles = [];
let _biomeId   = null;
let _spawnAcc  = 0;       // spawn accumulator (seconds)

/**
 * Set the biome whose particles should be shown.
 * Pass null to clear (no particles).
 */
export function setMenuBiome(biomeId) {
    if (biomeId === _biomeId) return;
    _biomeId   = biomeId;
    _particles = [];
    _spawnAcc  = 0;
}

/** Call once per frame with delta-time in seconds. */
export function updateMenuParticles(dt) {
    if (!_biomeId) return;
    const cfg = CONFIGS[_biomeId];
    if (!cfg) return;

    // Spawn new particles
    _spawnAcc += dt;
    const interval = 1 / cfg.spawnRate;
    while (_spawnAcc >= interval && _particles.length < cfg.maxCount) {
        _particles.push(new Particle(cfg));
        _spawnAcc -= interval;
    }
    if (_spawnAcc >= interval) _spawnAcc = 0; // drain if at cap

    // Update existing
    for (const p of _particles) p.update(dt);

    // Remove dead
    _particles = _particles.filter(p => !p.dead);
}

/** Draw all particles. Call between background fill and UI text. */
export function renderMenuParticles(ctx) {
    if (!_biomeId || _particles.length === 0) return;
    for (const p of _particles) p.render(ctx);
}
