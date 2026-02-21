import {
    PICKUP_RADIUS, PICKUP_LIFETIME, PICKUP_BOBBLE_SPEED,
    ENEMY_TYPE_BASIC, ENEMY_TYPE_SHOOTER, ENEMY_TYPE_TANK, ENEMY_TYPE_DASHER,
    PICKUP_RAGE_SHARD, PICKUP_HEART_FRAGMENT,
    PICKUP_PIERCING_SHOT, PICKUP_PHASE_SHIELD,
    PICKUP_SPEED_SURGE, PICKUP_SWIFT_BOOTS,
    PICKUP_CRUSHING_BLOW, PICKUP_IRON_SKIN,
    DROP_CHANCE,
    COIN_DROP_LIFETIME, COIN_DROP_RADIUS, COIN_DROP_BOBBLE_SPEED, COIN_MAGNET_RANGE,
} from '../constants.js';

// ── Drop tables per enemy type ──
// Each enemy type drops one of two items (50/50 offensive/defensive)
const DROP_TABLE = {
    [ENEMY_TYPE_BASIC]:   [PICKUP_RAGE_SHARD, PICKUP_HEART_FRAGMENT],
    [ENEMY_TYPE_SHOOTER]: [PICKUP_PIERCING_SHOT, PICKUP_PHASE_SHIELD],
    [ENEMY_TYPE_DASHER]:  [PICKUP_SPEED_SURGE, PICKUP_SWIFT_BOOTS],
    [ENEMY_TYPE_TANK]:    [PICKUP_CRUSHING_BLOW, PICKUP_IRON_SKIN],
};

// ── Item metadata (display name, color, category, icon shape) ──
export const PICKUP_INFO = {
    [PICKUP_RAGE_SHARD]:    { name: 'Rage Shard',    color: '#e74c3c', glow: '#ff6b6b', category: 'offensive', icon: 'crystal', effect: '+50% DMG'        },
    [PICKUP_HEART_FRAGMENT]:{ name: 'Heart Fragment', color: '#e91e8c', glow: '#ff69b4', category: 'defensive', icon: 'heart',   effect: '+20 HP'          },
    [PICKUP_PIERCING_SHOT]: { name: 'Piercing Shot',  color: '#9b59b6', glow: '#bb86fc', category: 'offensive', icon: 'orb',     effect: '+40% Range +25% DMG' },
    [PICKUP_PHASE_SHIELD]:  { name: 'Phase Shield',   color: '#7c4dff', glow: '#b388ff', category: 'defensive', icon: 'shield',  effect: 'Block next hit'  },
    [PICKUP_SPEED_SURGE]:   { name: 'Speed Surge',    color: '#2ecc71', glow: '#69f0ae', category: 'offensive', icon: 'bolt',    effect: '-40% ATK CD'     },
    [PICKUP_SWIFT_BOOTS]:   { name: 'Swift Boots',    color: '#00c853', glow: '#76ff03', category: 'defensive', icon: 'boots',   effect: '+40% Speed'      },
    [PICKUP_CRUSHING_BLOW]: { name: 'Crushing Blow',  color: '#e67e22', glow: '#ffab40', category: 'offensive', icon: 'fist',    effect: 'Next hit 3x DMG' },
    [PICKUP_IRON_SKIN]:     { name: 'Iron Skin',      color: '#f39c12', glow: '#ffd54f', category: 'defensive', icon: 'armor',   effect: '-50% DMG taken'  },
};

/**
 * Try to create a pickup drop from a killed enemy.
 * Returns a Pickup instance or null.
 */
export function trySpawnPickup(enemyX, enemyY, enemyType) {
    if (Math.random() > DROP_CHANCE) return null;

    const table = DROP_TABLE[enemyType] || DROP_TABLE[ENEMY_TYPE_BASIC];
    const pickupType = table[Math.floor(Math.random() * table.length)];

    return new Pickup(enemyX, enemyY, pickupType);
}

export class Pickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = PICKUP_RADIUS;
        this.lifetime = PICKUP_LIFETIME;
        this.dead = false;
        this.spawnTime = Date.now();

        const info = PICKUP_INFO[type];
        this.color = info.color;
        this.glow = info.glow;
        this.icon = info.icon;
        this.name = info.name;
    }

    update(dt) {
        if (this.dead) return;
        this.lifetime -= dt * 1000;
        if (this.lifetime <= 0) {
            this.dead = true;
        }
    }

    /**
     * Check if the player is close enough to collect this pickup.
     */
    checkCollection(player) {
        if (this.dead) return false;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.radius + player.radius;
    }

    render(ctx) {
        if (this.dead) return;

        const elapsed = Date.now() - this.spawnTime;
        const bob = Math.sin(elapsed * PICKUP_BOBBLE_SPEED) * 3;
        const drawY = this.y + bob;

        // Fade out in last 3 seconds
        const fadeStart = 3000;
        let alpha = 1;
        if (this.lifetime < fadeStart) {
            // Blink faster as time runs out
            const blink = Math.sin(this.lifetime * 0.01) > 0 ? 1 : 0.3;
            alpha = (this.lifetime / fadeStart) * blink;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        // Outer glow
        ctx.shadowColor = this.glow;
        ctx.shadowBlur = 12 + Math.sin(elapsed * 0.005) * 4;

        // Draw icon shape
        this._drawIcon(ctx, this.x, drawY);

        ctx.shadowBlur = 0;

        ctx.restore();
    }

    _drawIcon(ctx, x, y) {
        const r = this.radius;

        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.glow;
        ctx.lineWidth = 1.5;

        switch (this.icon) {
            case 'crystal': // Red crystal (Rage Shard)
                ctx.beginPath();
                ctx.moveTo(x, y - r * 1.2);
                ctx.lineTo(x + r * 0.6, y - r * 0.2);
                ctx.lineTo(x + r * 0.4, y + r);
                ctx.lineTo(x - r * 0.4, y + r);
                ctx.lineTo(x - r * 0.6, y - r * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath();
                ctx.moveTo(x - r * 0.15, y - r);
                ctx.lineTo(x + r * 0.15, y - r * 0.4);
                ctx.lineTo(x - r * 0.1, y - r * 0.2);
                ctx.closePath();
                ctx.fill();
                break;

            case 'heart': // Pink heart (Heart Fragment)
                ctx.beginPath();
                ctx.moveTo(x, y + r * 0.8);
                ctx.bezierCurveTo(x - r * 1.3, y - r * 0.3, x - r * 0.5, y - r * 1.2, x, y - r * 0.4);
                ctx.bezierCurveTo(x + r * 0.5, y - r * 1.2, x + r * 1.3, y - r * 0.3, x, y + r * 0.8);
                ctx.fill();
                ctx.stroke();
                break;

            case 'orb': // Purple orb (Piercing Shot)
                ctx.beginPath();
                ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Inner ring
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
                ctx.stroke();
                // Bright center
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.beginPath();
                ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'shield': // Purple shield (Phase Shield)
                ctx.beginPath();
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r * 0.9, y - r * 0.5);
                ctx.lineTo(x + r * 0.7, y + r * 0.5);
                ctx.lineTo(x, y + r);
                ctx.lineTo(x - r * 0.7, y + r * 0.5);
                ctx.lineTo(x - r * 0.9, y - r * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Inner line
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, y - r * 0.5);
                ctx.lineTo(x, y + r * 0.5);
                ctx.stroke();
                break;

            case 'bolt': // Green lightning bolt (Speed Surge)
                ctx.beginPath();
                ctx.moveTo(x + r * 0.1, y - r * 1.1);
                ctx.lineTo(x - r * 0.4, y - r * 0.1);
                ctx.lineTo(x + r * 0.05, y - r * 0.05);
                ctx.lineTo(x - r * 0.2, y + r * 1.1);
                ctx.lineTo(x + r * 0.5, y + r * 0.05);
                ctx.lineTo(x + r * 0.05, y + r * 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'boots': // Green boots (Swift Boots)
                // Left boot
                ctx.beginPath();
                ctx.moveTo(x - r * 0.6, y - r * 0.6);
                ctx.lineTo(x - r * 0.6, y + r * 0.4);
                ctx.lineTo(x - r * 0.1, y + r * 0.6);
                ctx.lineTo(x - r * 0.1, y + r * 0.2);
                ctx.lineTo(x - r * 0.2, y - r * 0.6);
                ctx.closePath();
                ctx.fill();
                // Right boot
                ctx.beginPath();
                ctx.moveTo(x + r * 0.2, y - r * 0.4);
                ctx.lineTo(x + r * 0.2, y + r * 0.5);
                ctx.lineTo(x + r * 0.7, y + r * 0.7);
                ctx.lineTo(x + r * 0.7, y + r * 0.3);
                ctx.lineTo(x + r * 0.4, y - r * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'fist': // Orange fist (Crushing Blow)
                ctx.beginPath();
                ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Knuckle details
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.arc(x + i * r * 0.35, y - r * 0.25, r * 0.18, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case 'armor': // Orange armor (Iron Skin)
                ctx.beginPath();
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r, y - r * 0.3);
                ctx.lineTo(x + r * 0.8, y + r * 0.6);
                ctx.lineTo(x, y + r);
                ctx.lineTo(x - r * 0.8, y + r * 0.6);
                ctx.lineTo(x - r, y - r * 0.3);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Cross detail
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y - r * 0.5);
                ctx.lineTo(x, y + r * 0.4);
                ctx.moveTo(x - r * 0.35, y - r * 0.05);
                ctx.lineTo(x + r * 0.35, y - r * 0.05);
                ctx.stroke();
                break;
        }
    }
}

// ── Coin Pickup ────────────────────────────────────────────

/**
 * Physical coin drop from a killed enemy.
 * Player must walk over it to collect. Disappears after COIN_DROP_LIFETIME ms.
 * Gently drifts toward the player when within COIN_MAGNET_RANGE.
 */
export class CoinPickup {
    constructor(x, y, value = 1) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = COIN_DROP_RADIUS;
        this.lifetime = COIN_DROP_LIFETIME;
        this.dead = false;
        this.spawnTime = Date.now();

        // Initial scatter: toss the coin randomly away from death spot
        const angle = Math.random() * Math.PI * 2;
        const tossSpeed = 60 + Math.random() * 40;
        this.vx = Math.cos(angle) * tossSpeed;
        this.vy = Math.sin(angle) * tossSpeed;
        this.friction = 0.92;
    }

    update(dt, player) {
        if (this.dead) return;
        this.lifetime -= dt * 1000;
        if (this.lifetime <= 0) {
            this.dead = true;
            return;
        }

        // Apply initial toss velocity with friction
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Magnet: gently drift toward player when close
        if (player) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < COIN_MAGNET_RANGE && dist > 1) {
                const pull = 180 * dt; // px/s attraction
                this.x += (dx / dist) * pull;
                this.y += (dy / dist) * pull;
            }
        }
    }

    checkCollection(player) {
        if (this.dead) return false;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.radius + player.radius;
    }

    render(ctx) {
        if (this.dead) return;

        const elapsed = Date.now() - this.spawnTime;
        const bob = Math.sin(elapsed * COIN_DROP_BOBBLE_SPEED) * 2;
        const drawY = this.y + bob;
        const r = this.radius;

        // Fade out + blink in last 3 seconds
        const fadeStart = 3000;
        let alpha = 1;
        if (this.lifetime < fadeStart) {
            const blink = Math.sin(this.lifetime * 0.012) > 0 ? 1 : 0.3;
            alpha = (this.lifetime / fadeStart) * blink;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 6 + Math.sin(elapsed * 0.006) * 2;

        // Coin body (golden circle)
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.ellipse(this.x, drawY, r, r * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(this.x, drawY, r * 0.6, r * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // "¢" symbol
        ctx.fillStyle = '#b8860b';
        ctx.font = `bold ${Math.round(r * 1.1)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', this.x, drawY + 0.5);

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
