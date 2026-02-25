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
        /** @type {Array<{segments: Array<{x:number,y:number}[]>, timer: number, maxTimer: number, color: string, width: number}>} */
        this._lightningBolts = [];
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
        // Update lightning bolts
        const dtMs = dt * 1000;
        for (let i = this._lightningBolts.length - 1; i >= 0; i--) {
            this._lightningBolts[i].timer -= dtMs;
            if (this._lightningBolts[i].timer <= 0) {
                this._lightningBolts.splice(i, 1);
            }
        }
    }

    render(ctx) {
        // Draw lightning bolts first (behind particles)
        for (const bolt of this._lightningBolts) {
            const progress = 1 - bolt.timer / bolt.maxTimer;
            // Fade: full brightness for first 30%, then fade out
            let alpha;
            if (progress < 0.3) {
                alpha = 1;
            } else {
                alpha = 1 - (progress - 0.3) / 0.7;
            }
            if (alpha <= 0) continue;

            const w = bolt.width * (1 - progress * 0.5); // thin out over time

            ctx.save();
            ctx.globalAlpha = alpha;

            // Glow layer (wide, soft)
            ctx.shadowColor = bolt.color;
            ctx.shadowBlur = 18;
            ctx.strokeStyle = bolt.color;
            ctx.lineWidth = w * 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = alpha * 0.35;
            for (const seg of bolt.segments) {
                if (seg.length < 2) continue;
                ctx.beginPath();
                ctx.moveTo(seg[0].x, seg[0].y);
                for (let j = 1; j < seg.length; j++) {
                    ctx.lineTo(seg[j].x, seg[j].y);
                }
                ctx.stroke();
            }

            // Core layer (bright white/yellow)
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = w;
            ctx.globalAlpha = alpha * 0.9;
            for (const seg of bolt.segments) {
                if (seg.length < 2) continue;
                ctx.beginPath();
                ctx.moveTo(seg[0].x, seg[0].y);
                for (let j = 1; j < seg.length; j++) {
                    ctx.lineTo(seg[j].x, seg[j].y);
                }
                ctx.stroke();
            }

            ctx.restore();
        }

        for (const p of this.particles) {
            p.render(ctx);
        }
    }

    clear() {
        this.particles = [];
        this._lightningBolts = [];
    }

    /**
     * Generate a jagged lightning bolt path between two points.
     * @param {{x:number,y:number}} a – start
     * @param {{x:number,y:number}} b – end
     * @param {number} [jag=20] – max perpendicular offset
     * @param {number} [subdivisions=6] – number of midpoints
     * @returns {Array<{x:number,y:number}>}
     */
    _generateBoltPath(a, b, jag = 20, subdivisions = 6) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Perpendicular direction
        const nx = -dy / (dist || 1);
        const ny = dx / (dist || 1);

        const points = [{ x: a.x, y: a.y }];
        for (let i = 1; i < subdivisions; i++) {
            const t = i / subdivisions;
            const offset = (Math.random() - 0.5) * 2 * jag;
            points.push({
                x: a.x + dx * t + nx * offset,
                y: a.y + dy * t + ny * offset,
            });
        }
        points.push({ x: b.x, y: b.y });
        return points;
    }

    // ── Preset effects ──────────────────────────────────────

    /**
     * Enemy death explosion — big burst of colored fragments + debris.
     */
    enemyDeath(x, y, color, radius = 12) {
        // Main colored fragments (more + faster)
        const count = 20 + Math.floor(Math.random() * 8);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 220;
            const size = 2 + Math.random() * 3.5;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * radius,
                y + (Math.random() - 0.5) * radius,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                size, color,
                250 + Math.random() * 400,
                { friction: 0.91, glow: true, glowColor: color, shape: Math.random() > 0.4 ? 'spark' : 'circle' },
            ));
        }
        // White core flash (brighter, bigger)
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 80;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2.5 + Math.random() * 2.5, '#ffffff',
                120 + Math.random() * 180,
                { friction: 0.88, glow: true, glowColor: '#ffffff' },
            ));
        }
        // Debris chunks flung outward with gravity
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 120;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 6,
                y + (Math.random() - 0.5) * 6,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 2, '#555555',
                350 + Math.random() * 300,
                { friction: 0.93, gravity: 100, glow: false, shape: 'square' },
            ));
        }
        // Big central pop flash
        this.particles.push(new Particle(
            x, y, 0, 0,
            radius * 1.2, '#ffffff',
            100,
            { shrink: true, glow: true, glowColor: color },
        ));
    }

    /**
     * Hit sparks — punchy directional burst when player melee hits an enemy.
     */
    hitSparks(x, y, dirX, dirY) {
        // Main directional sparks — biased in the hit direction
        const count = 10 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 1.2;
            const speed = 120 + Math.random() * 180;
            const vx = (dirX * 0.7 + spread) * speed;
            const vy = (dirY * 0.7 + spread) * speed;
            this.particles.push(new Particle(
                x, y, vx, vy,
                1.5 + Math.random() * 2.5, '#ffd700',
                120 + Math.random() * 180,
                { friction: 0.89, shape: 'spark', glow: true, glowColor: '#ffab40' },
            ));
        }
        // White-hot core sparks (fewer, brighter)
        for (let i = 0; i < 4; i++) {
            const spread = (Math.random() - 0.5) * 0.8;
            const speed = 60 + Math.random() * 100;
            this.particles.push(new Particle(
                x, y,
                (dirX + spread) * speed,
                (dirY + spread) * speed,
                2 + Math.random() * 2, '#ffffff',
                80 + Math.random() * 100,
                { friction: 0.88, shape: 'circle', glow: true, glowColor: '#ffd700' },
            ));
        }
        // Impact flash at hit point
        this.particles.push(new Particle(
            x, y, 0, 0,
            8, '#ffffff',
            80,
            { shrink: true, glow: true, glowColor: '#ffd700' },
        ));
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

    /**
     * Rocket explosion — fiery burst with debris and shockwave ring.
     */
    rocketExplosion(x, y, radius, color) {
        // Fiery ring of sparks
        const count = 20;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const speed = 80 + Math.random() * 100;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 10,
                y + (Math.random() - 0.5) * 10,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2.5 + Math.random() * 2,
                Math.random() > 0.5 ? '#ff6600' : '#ff9900',
                350 + Math.random() * 250,
                { friction: 0.91, glow: true, glowColor: '#ff3300', shape: 'spark' },
            ));
        }
        // Inner flame burst
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 50;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + Math.random() * 2,
                Math.random() > 0.5 ? '#ff4400' : color,
                280 + Math.random() * 200,
                { friction: 0.88, glow: true, glowColor: '#ff6600', shape: 'circle' },
            ));
        }
        // Smoke puffs
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 15 + Math.random() * 30;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * radius * 0.3,
                y + (Math.random() - 0.5) * radius * 0.3,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                5 + Math.random() * 4,
                '#555',
                500 + Math.random() * 300,
                { friction: 0.95, shrink: true, shape: 'circle' },
            ));
        }
        // Core flash
        this.particles.push(new Particle(
            x, y, 0, 0, 16, '#ffffff', 120,
            { shrink: true, glow: true, glowColor: '#ff6600' },
        ));
    }
    /**
     * Dagger throw — small cyan burst at throw origin.
     */
    daggerThrow(x, y, dirX, dirY) {
        const count = 5;
        for (let i = 0; i < count; i++) {
            const spread = (Math.random() - 0.5) * 0.8;
            const speed = 30 + Math.random() * 50;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 4,
                y + (Math.random() - 0.5) * 4,
                (dirX + spread) * speed,
                (dirY + spread) * speed,
                1 + Math.random() * 1.5, '#4fc3f7',
                120 + Math.random() * 80,
                { friction: 0.9, shrink: true, glow: true, glowColor: '#03a9f4' },
            ));
        }
    }

    /**
     * Dagger trail — subtle cyan wisps behind the flying dagger.
     */
    daggerTrail(x, y, color) {
        if (Math.random() > 0.3) return; // don't spawn every frame
        this.particles.push(new Particle(
            x + (Math.random() - 0.5) * 3,
            y + (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            1 + Math.random(), color || '#4fc3f7',
            100 + Math.random() * 80,
            { friction: 0.95, glow: true, glowColor: '#03a9f4', shrink: true },
        ));
    }

    // ── Biome ambient particles ─────────────────────────────
    // Called once per frame from game update. Each biome particle
    // type has a spawn `rate` — probability per frame of spawning.
    // Particles drift across the screen as background atmosphere.

    biomeAmbient(biome) {
        if (!biome || !biome.ambientParticles) return;
        const ap = biome.ambientParticles;

        // Cap total ambient to avoid perf issues
        const MAX_AMBIENT = 80;
        let ambientCount = 0;
        for (const p of this.particles) { if (p._ambient) ambientCount++; }
        if (ambientCount >= MAX_AMBIENT) return;

        switch (biome.id) {
            case 'jungle':
                this._spawnJungleAmbient(ap);
                break;
            case 'desert':
                this._spawnDesertAmbient(ap);
                break;
            case 'wasteland':
                this._spawnWastelandAmbient(ap);
                break;
            case 'depths':
                this._spawnDepthsAmbient(ap);
                break;
        }
    }

    _spawnJungleAmbient(ap) {
        // Falling leaves — drift down and sideways
        if (ap.leaves && Math.random() < ap.leaves.rate) {
            const colors = ap.leaves.colors;
            const p = new Particle(
                Math.random() * CANVAS_WIDTH,
                -5,
                20 + Math.random() * 40, // drift right
                30 + Math.random() * 40,  // fall down
                ap.leaves.sizeMin + Math.random() * (ap.leaves.sizeMax - ap.leaves.sizeMin),
                colors[Math.floor(Math.random() * colors.length)],
                3000 + Math.random() * 2000,
                { friction: 1.0, gravity: 8, shrink: false, shape: 'square' },
            );
            p._ambient = true;
            this.particles.push(p);
        }
        // Fireflies — slow wandering glow dots
        if (ap.fireflies && Math.random() < ap.fireflies.rate) {
            const p = new Particle(
                Math.random() * CANVAS_WIDTH,
                Math.random() * CANVAS_HEIGHT,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15,
                1.5 + Math.random() * 1.5,
                ap.fireflies.color,
                2500 + Math.random() * 2000,
                { friction: 0.98, shrink: false, glow: true, glowColor: '#a5d6a7' },
            );
            p._ambient = true;
            this.particles.push(p);
        }
    }

    _spawnDesertAmbient(ap) {
        // Sand grains — blow across screen horizontally
        if (ap.sand && Math.random() < ap.sand.rate) {
            const colors = ap.sand.colors;
            const p = new Particle(
                -5,
                CANVAS_HEIGHT * 0.3 + Math.random() * CANVAS_HEIGHT * 0.6,
                80 + Math.random() * 100,  // strong rightward wind
                (Math.random() - 0.5) * 20,
                ap.sand.sizeMin + Math.random() * (ap.sand.sizeMax - ap.sand.sizeMin),
                colors[Math.floor(Math.random() * colors.length)],
                2500 + Math.random() * 2000,
                { friction: 1.0, shrink: false, shape: 'spark' },
            );
            p._ambient = true;
            this.particles.push(p);
        }
        // Heat shimmer — large faint blobs that rise slowly
        if (ap.shimmer && Math.random() < ap.shimmer.rate) {
            const p = new Particle(
                Math.random() * CANVAS_WIDTH,
                CANVAS_HEIGHT + 5,
                (Math.random() - 0.5) * 10,
                -(10 + Math.random() * 15),
                ap.shimmer.size,
                ap.shimmer.color,
                3000 + Math.random() * 2000,
                { friction: 1.0, shrink: false, glow: false },
            );
            p._ambient = true;
            this.particles.push(p);
        }
    }

    _spawnWastelandAmbient(ap) {
        // Rising embers — float up with slight drift
        if (ap.embers && Math.random() < ap.embers.rate) {
            const colors = ap.embers.colors;
            const p = new Particle(
                Math.random() * CANVAS_WIDTH,
                CANVAS_HEIGHT + 5,
                (Math.random() - 0.5) * 30,
                -(50 + Math.random() * 60), // rise upward
                ap.embers.sizeMin + Math.random() * (ap.embers.sizeMax - ap.embers.sizeMin),
                colors[Math.floor(Math.random() * colors.length)],
                2000 + Math.random() * 2000,
                { friction: 0.99, shrink: true, glow: true, glowColor: '#ff4500' },
            );
            p._ambient = true;
            this.particles.push(p);
        }
        // Ash flakes — drift down slowly
        if (ap.ash && Math.random() < ap.ash.rate) {
            const colors = ap.ash.colors;
            const p = new Particle(
                Math.random() * CANVAS_WIDTH,
                -5,
                (Math.random() - 0.5) * 25,
                15 + Math.random() * 25,
                ap.ash.sizeMin + Math.random() * (ap.ash.sizeMax - ap.ash.sizeMin),
                colors[Math.floor(Math.random() * colors.length)],
                3500 + Math.random() * 2000,
                { friction: 1.0, gravity: 3, shrink: false, shape: 'square' },
            );
            p._ambient = true;
            this.particles.push(p);
        }
    }

    _spawnDepthsAmbient(ap) {
        // Bubbles — rise up from bottom
        if (ap.bubbles && Math.random() < ap.bubbles.rate) {
            const colors = ap.bubbles.colors;
            const p = new Particle(
                Math.random() * CANVAS_WIDTH,
                CANVAS_HEIGHT + 5,
                (Math.random() - 0.5) * 12,
                -(25 + Math.random() * 35),
                ap.bubbles.sizeMin + Math.random() * (ap.bubbles.sizeMax - ap.bubbles.sizeMin),
                colors[Math.floor(Math.random() * colors.length)],
                3000 + Math.random() * 3000,
                { friction: 0.99, shrink: false, glow: false },
            );
            p._ambient = true;
            this.particles.push(p);
        }
        // Drifting light motes — slow random movement with glow
        if (ap.motes && Math.random() < ap.motes.rate) {
            const colors = ap.motes.colors;
            const p = new Particle(
                Math.random() * CANVAS_WIDTH,
                Math.random() * CANVAS_HEIGHT,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                ap.motes.sizeMin + Math.random() * (ap.motes.sizeMax - ap.motes.sizeMin),
                colors[Math.floor(Math.random() * colors.length)],
                3500 + Math.random() * 3000,
                { friction: 0.98, shrink: false, glow: true, glowColor: '#42a5f5' },
            );
            p._ambient = true;
            this.particles.push(p);
        }
    }

    // ── Combat ability / proc effects ───────────────────────

    /**
     * Shockwave — expanding orange ring burst.
     */
    abilityShockwave(x, y, radius) {
        // Outer expanding ring — dense and fast
        const outerCount = 48;
        for (let i = 0; i < outerCount; i++) {
            const angle = (Math.PI * 2 / outerCount) * i + (Math.random() - 0.5) * 0.15;
            const speed = 180 + Math.random() * 140;
            this.particles.push(new Particle(
                x + Math.cos(angle) * 8,
                y + Math.sin(angle) * 8,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + Math.random() * 3, '#ff9800',
                350 + Math.random() * 250,
                { friction: 0.91, glow: true, glowColor: '#ff6d00', shape: 'spark' },
            ));
        }
        // Inner fire ring — slower, bigger, more orange-red
        const innerCount = 24;
        for (let i = 0; i < innerCount; i++) {
            const angle = (Math.PI * 2 / innerCount) * i;
            const speed = 60 + Math.random() * 80;
            this.particles.push(new Particle(
                x + Math.cos(angle) * 5,
                y + Math.sin(angle) * 5,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                4 + Math.random() * 3,
                Math.random() > 0.5 ? '#ff5722' : '#ffab40',
                300 + Math.random() * 200,
                { friction: 0.88, glow: true, glowColor: '#ff3d00', shape: 'circle' },
            ));
        }
        // Debris chunks — scattered ground debris flung outward
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 160;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 12,
                y + (Math.random() - 0.5) * 12,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 2.5,
                Math.random() > 0.5 ? '#795548' : '#ffcc80',
                400 + Math.random() * 300,
                { friction: 0.93, gravity: 120, glow: false, shape: 'square' },
            ));
        }
        // Bright white core flash — large and punchy
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 60;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                5 + Math.random() * 4, '#ffffff',
                200 + Math.random() * 150,
                { friction: 0.88, glow: true, glowColor: '#ff9800', shrink: true },
            ));
        }
        // Central mega flash
        this.particles.push(new Particle(
            x, y, 0, 0, 18, '#ffffff', 150,
            { shrink: true, glow: true, glowColor: '#ff9800' },
        ));
    }

    /**
     * Blade Storm — spinning purple blade sparks.
     */
    abilityBladeStorm(x, y, radius, angle) {
        const bladeCount = 5;
        for (let i = 0; i < bladeCount; i++) {
            const a = angle + (Math.PI * 2 / bladeCount) * i;
            const bx = x + Math.cos(a) * radius * 0.8;
            const by = y + Math.sin(a) * radius * 0.8;
            // Main blade spark
            this.particles.push(new Particle(
                bx, by,
                -Math.sin(a) * 60 + (Math.random() - 0.5) * 30,
                Math.cos(a) * 60 + (Math.random() - 0.5) * 30,
                2.5 + Math.random() * 2, '#e040fb',
                160 + Math.random() * 100,
                { friction: 0.90, glow: true, glowColor: '#aa00ff', shape: 'spark' },
            ));
            // Trailing blade shards
            this.particles.push(new Particle(
                bx + (Math.random() - 0.5) * 8,
                by + (Math.random() - 0.5) * 8,
                -Math.sin(a) * 35 + (Math.random() - 0.5) * 40,
                Math.cos(a) * 35 + (Math.random() - 0.5) * 40,
                1.5 + Math.random() * 1.5,
                Math.random() > 0.5 ? '#ce93d8' : '#f8bbd0',
                100 + Math.random() * 80,
                { friction: 0.88, glow: true, glowColor: '#e040fb', shape: 'circle' },
            ));
        }
        // Central whirl glow
        if (Math.random() < 0.5) {
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 12,
                y + (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                3 + Math.random() * 2, '#e040fb',
                120 + Math.random() * 80,
                { friction: 0.9, glow: true, glowColor: '#aa00ff', shrink: true },
            ));
        }
    }

    /**
     * Gravity Pull — purple inward lines.
     */
    abilityGravityPull(x, y, radius) {
        // Inward streaking lines
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = radius * (0.5 + Math.random() * 0.5);
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            const speed = 90 + Math.random() * 60;
            this.particles.push(new Particle(
                px, py,
                -Math.cos(angle) * speed,
                -Math.sin(angle) * speed,
                2 + Math.random() * 1.5, '#7c4dff',
                250 + Math.random() * 180,
                { friction: 0.94, glow: true, glowColor: '#b388ff', shape: 'spark' },
            ));
        }
        // Dark energy wisps swirling toward center
        for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = radius * (0.3 + Math.random() * 0.6);
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            // Tangential + inward velocity for spiral effect
            const inSpeed = 40 + Math.random() * 30;
            const tanSpeed = 30 + Math.random() * 20;
            this.particles.push(new Particle(
                px, py,
                -Math.cos(angle) * inSpeed + -Math.sin(angle) * tanSpeed,
                -Math.sin(angle) * inSpeed + Math.cos(angle) * tanSpeed,
                3 + Math.random() * 2,
                Math.random() > 0.5 ? '#311b92' : '#4a148c',
                200 + Math.random() * 150,
                { friction: 0.92, glow: true, glowColor: '#7c4dff', shrink: true },
            ));
        }
    }

    /**
     * Freeze Pulse — blue-white expanding ring.
     */
    abilityFreezePulse(x, y, radius) {
        // Main expanding ice ring
        const count = 40;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 120 + Math.random() * 80;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + Math.random() * 2.5, '#80d8ff',
                350 + Math.random() * 250,
                { friction: 0.91, glow: true, glowColor: '#40c4ff' },
            ));
        }
        // Ice shard debris — angular fragments
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 120;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 10,
                y + (Math.random() - 0.5) * 10,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 2,
                Math.random() > 0.5 ? '#e0f7fa' : '#b2ebf2',
                300 + Math.random() * 200,
                { friction: 0.92, glow: true, glowColor: '#4dd0e1', shape: 'square' },
            ));
        }
        // Snowflake-like central burst — bigger and brighter
        for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                4 + Math.random() * 3, '#ffffff',
                250 + Math.random() * 200,
                { friction: 0.88, glow: true, glowColor: '#80d8ff', shrink: true },
            ));
        }
        // Central mega flash
        this.particles.push(new Particle(
            x, y, 0, 0, 16, '#ffffff', 150,
            { shrink: true, glow: true, glowColor: '#40c4ff' },
        ));
    }

    /**
     * Proc: Explosive Strikes — orange/red AoE burst at target.
     */
    procExplosion(x, y, radius) {
        // Primary explosion ring
        const count = 28;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const speed = 90 + Math.random() * 120;
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 8,
                y + (Math.random() - 0.5) * 8,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + Math.random() * 2.5,
                Math.random() > 0.5 ? '#ff6d00' : '#ff9800',
                300 + Math.random() * 250,
                { friction: 0.90, glow: true, glowColor: '#ff3d00', shape: 'spark' },
            ));
        }
        // Inner fire burst
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + Math.random() * 2,
                Math.random() > 0.5 ? '#ff1744' : '#ffab40',
                250 + Math.random() * 200,
                { friction: 0.88, glow: true, glowColor: '#ff6d00', shape: 'circle' },
            ));
        }
        // Core flash — big
        this.particles.push(new Particle(
            x, y, 0, 0, 14, '#ffffff', 150,
            { shrink: true, glow: true, glowColor: '#ff6d00' },
        ));
    }

    /**
     * Proc: Chain Lightning — bright lines between positions.
     * @param {Array<{x,y}>} positions
     */
    procChainLightning(positions) {
        // ── 1. Lightning bolt lines (jagged, glowing) ──
        const boltSegments = [];
        for (let i = 0; i < positions.length - 1; i++) {
            const a = positions[i];
            const b = positions[i + 1];
            // Main bolt + 1-2 branch bolts for a thicker look
            boltSegments.push(this._generateBoltPath(a, b, 18, 7));
            boltSegments.push(this._generateBoltPath(a, b, 12, 5)); // secondary thinner bolt
        }
        this._lightningBolts.push({
            segments: boltSegments,
            timer: 400,
            maxTimer: 400,
            color: '#ffeb3b',
            width: 3,
        });

        // ── 2. Spark particles along each segment ──
        for (let i = 0; i < positions.length - 1; i++) {
            const a = positions[i];
            const b = positions[i + 1];
            const count = 14;
            for (let j = 0; j < count; j++) {
                const t = j / count;
                const px = a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 20;
                const py = a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 20;
                this.particles.push(new Particle(
                    px, py,
                    (Math.random() - 0.5) * 80,
                    (Math.random() - 0.5) * 80,
                    3 + Math.random() * 3,
                    Math.random() > 0.3 ? '#ffeb3b' : '#ffffff',
                    250 + Math.random() * 200,
                    { friction: 0.86, glow: true, glowColor: '#fdd835', shape: 'spark' },
                ));
            }
            // Big impact flash at each target position
            this.particles.push(new Particle(
                b.x, b.y, 0, 0, 14, '#ffffff', 200,
                { shrink: true, glow: true, glowColor: '#ffeb3b' },
            ));
            // Impact ring burst at target
            for (let j = 0; j < 8; j++) {
                const angle = (Math.PI * 2 / 8) * j;
                const speed = 60 + Math.random() * 50;
                this.particles.push(new Particle(
                    b.x, b.y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    2.5 + Math.random() * 2,
                    '#ffeb3b',
                    200 + Math.random() * 100,
                    { friction: 0.88, glow: true, glowColor: '#fdd835', shape: 'spark' },
                ));
            }
            // Branch sparks — stray bolts
            for (let j = 0; j < 6; j++) {
                const t = Math.random();
                const px = a.x + (b.x - a.x) * t;
                const py = a.y + (b.y - a.y) * t;
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 80;
                this.particles.push(new Particle(
                    px, py,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    2 + Math.random() * 2, '#fff9c4',
                    150 + Math.random() * 120,
                    { friction: 0.84, glow: true, glowColor: '#ffeb3b', shape: 'spark' },
                ));
            }
        }

        // ── 3. Flash at origin (first target) ──
        this.particles.push(new Particle(
            positions[0].x, positions[0].y, 0, 0, 16, '#fff9c4', 180,
            { shrink: true, glow: true, glowColor: '#ffeb3b' },
        ));
    }

    /**
     * Proc: Heavy Crit — big red/white impact burst.
     */
    procCritImpact(x, y) {
        // Outer burst ring
        const count = 20;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 120 + Math.random() * 80;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                3 + Math.random() * 2.5,
                Math.random() > 0.5 ? '#ff1744' : '#ffffff',
                280 + Math.random() * 200,
                { friction: 0.90, glow: true, glowColor: '#d50000', shape: 'spark' },
            ));
        }
        // Inner sharp fragments
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 80;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 2,
                Math.random() > 0.5 ? '#ffcdd2' : '#ff8a80',
                200 + Math.random() * 150,
                { friction: 0.88, glow: true, glowColor: '#ff1744', shape: 'square' },
            ));
        }
        // Big central flash
        this.particles.push(new Particle(
            x, y, 0, 0, 16, '#ffffff', 140,
            { shrink: true, glow: true, glowColor: '#ff1744' },
        ));
    }

    /**
     * Dash impact trail (for improved dash feedback).
     */
    dashImpactTrail(x, y, dirX, dirY) {
        const count = 4;
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(
                x - dirX * (8 + i * 6) + (Math.random() - 0.5) * 6,
                y - dirY * (8 + i * 6) + (Math.random() - 0.5) * 6,
                (-dirX + (Math.random() - 0.5) * 0.5) * 30,
                (-dirY + (Math.random() - 0.5) * 0.5) * 30,
                2 + Math.random() * 1.5, '#4fc3f7',
                100 + Math.random() * 80,
                { friction: 0.88, shrink: true, glow: true, glowColor: '#03a9f4' },
            ));
        }
    }

    /**
     * Impact ring — expanding ring of particles at the point of impact.
     * Gives hits a satisfying radial burst at contact point.
     */
    impactRing(x, y, color = '#ffd700', radius = 20) {
        const count = 14;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
            const speed = 100 + Math.random() * 80;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 1.5, color,
                120 + Math.random() * 100,
                { friction: 0.88, glow: true, glowColor: color, shape: 'spark' },
            ));
        }
        // Central flash
        this.particles.push(new Particle(
            x, y, 0, 0,
            10, '#ffffff',
            90,
            { shrink: true, glow: true, glowColor: color },
        ));
    }

    /**
     * Slash trail — arc of particles that follow the melee attack sweep.
     * Creates a visible slash smear for attack weight.
     */
    slashTrail(playerX, playerY, facingX, facingY, range, color = '#ffffff') {
        const angle = Math.atan2(facingY, facingX);
        const arcSpread = 1.4; // wider than the actual arc for visual
        const count = 12;
        for (let i = 0; i < count; i++) {
            const t = (i / count) - 0.5; // -0.5 to 0.5
            const a = angle + t * arcSpread;
            const dist = range * (0.5 + Math.random() * 0.5);
            const px = playerX + Math.cos(a) * dist;
            const py = playerY + Math.sin(a) * dist;
            // Velocity: tangential to arc (sweep direction) + outward
            const tangentX = -Math.sin(a);
            const tangentY = Math.cos(a);
            const outX = Math.cos(a);
            const outY = Math.sin(a);
            const speed = 40 + Math.random() * 60;
            this.particles.push(new Particle(
                px, py,
                (tangentX * 0.6 + outX * 0.4) * speed,
                (tangentY * 0.6 + outY * 0.4) * speed,
                1.5 + Math.random() * 2, color,
                80 + Math.random() * 100,
                { friction: 0.85, shrink: true, glow: true, glowColor: color },
            ));
        }
    }

    /**
     * Kill burst — extra satisfying pop on enemy death (called in addition to enemyDeath).
     * Ring of white-hot sparks + upward celebratory particles.
     */
    killBurst(x, y, color) {
        // Outward white ring
        const count = 10;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 80 + Math.random() * 60;
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                2 + Math.random() * 1.5, '#ffffff',
                150 + Math.random() * 100,
                { friction: 0.9, glow: true, glowColor: color || '#ffd700', shape: 'spark' },
            ));
        }
        // Upward celebratory sparks
        for (let i = 0; i < 5; i++) {
            const spread = (Math.random() - 0.5) * 60;
            this.particles.push(new Particle(
                x + spread, y,
                (Math.random() - 0.5) * 40,
                -(100 + Math.random() * 80),
                1.5 + Math.random() * 2,
                Math.random() > 0.5 ? color || '#ffd700' : '#ffffff',
                300 + Math.random() * 200,
                { friction: 0.96, gravity: 60, glow: true, glowColor: color || '#ffd700' },
            ));
        }
    }
}
