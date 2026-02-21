import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

// ── Individual Particle ──

class Particle {
    constructor(x, y, vx, vy, radius, color, lifetime, opts = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.dead = false;

        // Optional features
        this.friction = opts.friction ?? 0.97;
        this.gravity = opts.gravity ?? 0;
        this.shrink = opts.shrink !== false;     // shrink over lifetime
        this.glow = opts.glow ?? false;          // add shadow glow
        this.glowColor = opts.glowColor ?? color;
        this.shape = opts.shape ?? 'circle';     // 'circle' | 'square' | 'spark'
    }

    update(dt) {
        if (this.dead) return;
        const ms = dt * 1000;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity * dt;

        this.lifetime -= ms;
        if (this.lifetime <= 0) this.dead = true;

        // Cull particles that leave the canvas
        if (this.x < -20 || this.x > CANVAS_WIDTH + 20 ||
            this.y < -20 || this.y > CANVAS_HEIGHT + 20) {
            this.dead = true;
        }
    }

    render(ctx) {
        if (this.dead) return;

        const progress = 1 - this.lifetime / this.maxLifetime; // 0→1
        const alpha = Math.max(0, 1 - progress * 1.1);        // fade out
        const r = this.shrink ? this.radius * (1 - progress * 0.7) : this.radius;

        if (r <= 0.2 || alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (this.glow) {
            ctx.shadowColor = this.glowColor;
            ctx.shadowBlur = r * 3;
        }

        ctx.fillStyle = this.color;

        switch (this.shape) {
            case 'square':
                ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
                break;
            case 'spark': {
                // Elongated line in velocity direction
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed > 1) {
                    const nx = this.vx / speed;
                    const ny = this.vy / speed;
                    const len = Math.min(r * 4, speed * 0.05);
                    ctx.lineWidth = r * 0.8;
                    ctx.strokeStyle = this.color;
                    ctx.beginPath();
                    ctx.moveTo(this.x - nx * len, this.y - ny * len);
                    ctx.lineTo(this.x + nx * len, this.y + ny * len);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            default: // circle
                ctx.beginPath();
                ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                ctx.fill();
                break;
        }

        ctx.restore();
    }
}

// ── Particle System (manages all particles) ──

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    get count() {
        return this.particles.length;
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].dead) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (const p of this.particles) {
            p.render(ctx);
        }
    }

    clear() {
        this.particles = [];
    }

    // ── Preset effects ──────────────────────────────────────

    /**
     * Enemy death explosion — burst of colored fragments.
     */
    enemyDeath(x, y, color, radius = 12) {
        const count = 14 + Math.floor(Math.random() * 6);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 160;
            const size = 1.5 + Math.random() * 3;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * radius,
                y + (Math.random() - 0.5) * radius,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size, color,
                300 + Math.random() * 400,
                { friction: 0.93, glow: true, glowColor: color, shape: Math.random() > 0.5 ? 'spark' : 'circle' },
            ));
        }
        // White core flash
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 60;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 2, '#ffffff',
                150 + Math.random() * 200,
                { friction: 0.9, glow: true, glowColor: '#ffffff' },
            ));
        }
    }

    /**
     * Hit sparks — small burst when player melee hits an enemy.
     */
    hitSparks(x, y, dirX, dirY) {
        const count = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 1.5;
            const speed = 80 + Math.random() * 120;
            const vx = (dirX + spread) * speed;
            const vy = (dirY + spread) * speed;
            this.particles.push(new Particle(
                x, y, vx, vy,
                1 + Math.random() * 2, '#ffd700',
                150 + Math.random() * 200,
                { friction: 0.92, shape: 'spark', glow: true, glowColor: '#ffab40' },
            ));
        }
    }

    /**
     * Player attack swoosh arc particles.
     */
    attackArc(playerX, playerY, facingX, facingY, range) {
        const angle = Math.atan2(facingY, facingX);
        const count = 5;
        for (let i = 0; i < count; i++) {
            const a = angle + (Math.random() - 0.5) * 1.2; // spread across arc
            const dist = range * (0.4 + Math.random() * 0.6);
            const px = playerX + Math.cos(a) * dist;
            const py = playerY + Math.sin(a) * dist;
            const speed = 20 + Math.random() * 40;
            this.particles.push(new Particle(
                px, py,
                Math.cos(a) * speed,
                Math.sin(a) * speed,
                1 + Math.random() * 1.5, 'rgba(255,255,255,0.8)',
                100 + Math.random() * 150,
                { friction: 0.9, shrink: true },
            ));
        }
    }

    /**
     * Pickup collection — sparkle implosion + color burst.
     */
    pickupCollect(x, y, color, glowColor) {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const speed = 40 + Math.random() * 80;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                1.5 + Math.random() * 2, color,
                300 + Math.random() * 300,
                { friction: 0.94, glow: true, glowColor: glowColor || color },
            ));
        }
        // Central flash
        this.particles.push(new Particle(
            x, y, 0, 0,
            6, '#ffffff',
            200,
            { shrink: true, glow: true, glowColor: color },
        ));
    }

    /**
     * Player damage — red burst inward.
     */
    playerDamage(x, y) {
        const count = 10;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            this.particles.push(new Particle(
                x + Math.cos(angle) * 20,
                y + Math.sin(angle) * 20,
                -Math.cos(angle) * speed * 0.3,
                -Math.sin(angle) * speed * 0.3,
                1.5 + Math.random() * 2, '#ff4444',
                200 + Math.random() * 200,
                { friction: 0.92, glow: true, glowColor: '#ff0000' },
            ));
        }
    }

    /**
     * Shield block — purple flash ring.
     */
    shieldBlock(x, y) {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 60 + Math.random() * 40;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random(), '#b388ff',
                250 + Math.random() * 150,
                { friction: 0.93, glow: true, glowColor: '#7c4dff' },
            ));
        }
    }

    /**
     * Level-up — golden upward fountain.
     */
    levelUp(x, y) {
        const count = 24;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 120;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 10,
                y + (Math.random() - 0.5) * 10,
                Math.cos(angle) * speed * 0.5,
                -Math.abs(Math.sin(angle) * speed),  // mostly upward
                2 + Math.random() * 2.5,
                Math.random() > 0.5 ? '#ffd700' : '#fffde7',
                400 + Math.random() * 400,
                { friction: 0.96, gravity: 80, glow: true, glowColor: '#ffd700' },
            ));
        }
    }

    /**
     * Door unlock — green ring burst.
     */
    doorUnlock(x, y) {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 40 + Math.random() * 50;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 1.5, '#27ae60',
                300 + Math.random() * 200,
                { friction: 0.94, glow: true, glowColor: '#69f0ae' },
            ));
        }
    }

    /**
     * Dash trail — cyan speed streaks behind the player.
     */
    dashTrail(x, y, dirX, dirY) {
        const count = 3;
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 0.6;
            const speed = 20 + Math.random() * 40;
            this.particles.push(new Particle(
                x - dirX * 10 + (Math.random() - 0.5) * 8,
                y - dirY * 10 + (Math.random() - 0.5) * 8,
                (-dirX + spread) * speed,
                (-dirY + spread) * speed,
                1.5 + Math.random() * 2, '#4fc3f7',
                120 + Math.random() * 100,
                { friction: 0.9, shrink: true, glow: true, glowColor: '#03a9f4' },
            ));
        }
    }

    /**
     * Dash start burst — quick burst at dash origin.
     */
    dashBurst(x, y) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 50 + Math.random() * 60;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                1.5 + Math.random() * 1.5, '#b3e5fc',
                150 + Math.random() * 100,
                { friction: 0.92, shrink: true, glow: true, glowColor: '#4fc3f7' },
            ));
        }
    }

    /**
     * Projectile trail — subtle purple wisps (call each frame).
     */
    projectileTrail(x, y) {
        if (Math.random() > 0.4) return; // don't spawn every frame
        this.particles.push(new Particle(
            x + (Math.random() - 0.5) * 4,
            y + (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            1 + Math.random() * 1.5, '#bb86fc',
            150 + Math.random() * 100,
            { friction: 0.95, glow: true, glowColor: '#9b59b6', shrink: true },
        ));
    }

    /**
     * Combo tier burst — celebratory ring explosion around the player.
     * Higher tiers produce more particles with brighter colors.
     */
    comboBurst(x, y, tier) {
        const TIER_COLORS = {
            1: { main: '#ffd700', glow: '#ffab40' },    // gold
            2: { main: '#ff9800', glow: '#ff6d00' },    // orange
            3: { main: '#e040fb', glow: '#aa00ff' },    // magenta
            4: { main: '#00e5ff', glow: '#18ffff' },    // cyan
        };
        const colors = TIER_COLORS[Math.min(tier, 4)] || TIER_COLORS[1];
        const count = 12 + tier * 6;
        const baseSpeed = 60 + tier * 30;

        // Ring burst
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.2;
            const speed = baseSpeed + Math.random() * 60;
            const size = 1.5 + Math.random() * 2 + tier * 0.3;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size, colors.main,
                300 + tier * 80 + Math.random() * 200,
                { friction: 0.93, glow: true, glowColor: colors.glow,
                  shape: Math.random() > 0.4 ? 'spark' : 'circle' },
            ));
        }

        // Central white flash (bigger at higher tiers)
        for (let i = 0; i < 3 + tier; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 15 + Math.random() * 30;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + tier * 0.5, '#ffffff',
                180 + Math.random() * 120,
                { friction: 0.9, glow: true, glowColor: colors.main, shrink: true },
            ));
        }

        // Upward sparkles for tier 3+
        if (tier >= 3) {
            for (let i = 0; i < 8; i++) {
                const spread = (Math.random() - 0.5) * 80;
                this.particles.push(new Particle(
                    x + spread, y,
                    (Math.random() - 0.5) * 30,
                    -(80 + Math.random() * 100),
                    1.5 + Math.random() * 2,
                    Math.random() > 0.5 ? colors.main : '#ffffff',
                    400 + Math.random() * 300,
                    { friction: 0.97, gravity: 50, glow: true, glowColor: colors.glow },
                ));
            }
        }
    }

    // ── Boss effects ────────────────────────────────────────

    /**
     * Boss death — massive explosion with type-colored fragments + golden reward sparkles.
     */
    bossDeath(x, y, color) {
        const count = 40 + Math.floor(Math.random() * 15);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 250;
            const size = 2 + Math.random() * 4;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 20,
                y + (Math.random() - 0.5) * 20,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size, color,
                500 + Math.random() * 600,
                { friction: 0.94, glow: true, glowColor: color, shape: Math.random() > 0.4 ? 'spark' : 'circle' },
            ));
        }
        // White core flash
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 80;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + Math.random() * 3, '#ffffff',
                250 + Math.random() * 300,
                { friction: 0.9, glow: true, glowColor: '#ffffff' },
            ));
        }
        // Golden reward sparkles
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 30,
                y + (Math.random() - 0.5) * 30,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 40,
                2 + Math.random() * 2, '#ffd700',
                600 + Math.random() * 400,
                { friction: 0.96, gravity: 30, glow: true, glowColor: '#ffab40' },
            ));
        }
    }

    /**
     * Boss AoE slam — shockwave ring of sparks.
     */
    bossSlam(x, y, radius, color) {
        const count = 24;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 60 + Math.random() * 50;
            this.particles.push(new Particle(
                x + Math.cos(angle) * radius * 0.3,
                y + Math.sin(angle) * radius * 0.3,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 2, color,
                300 + Math.random() * 200,
                { friction: 0.92, glow: true, glowColor: color, shape: 'spark' },
            ));
        }
    }

    /**
     * Boss phase transition — red/white ring explosion.
     */
    bossPhaseTransition(x, y) {
        const count = 24;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 100 + Math.random() * 60;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2.5 + Math.random() * 2, '#ff4444',
                400 + Math.random() * 200,
                { friction: 0.93, glow: true, glowColor: '#ff0000' },
            ));
        }
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 50;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + Math.random() * 2, '#ffffff',
                300 + Math.random() * 200,
                { friction: 0.9, glow: true, glowColor: '#ff4444' },
            ));
        }
    }
}
