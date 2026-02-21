// ── Ability Definitions ────────────────────────────────────
// Data-driven ability objects. Each has an `onUse(ctx)` handler
// and optionally `onUpdate(ctx, dt)` for persistent effects.
// ────────────────────────────────────────────────────────────

import {
    ABILITY_SHOCKWAVE_CD, ABILITY_SHOCKWAVE_RADIUS, ABILITY_SHOCKWAVE_DMG_MULT, ABILITY_SHOCKWAVE_KB,
    ABILITY_BLADESTORM_CD, ABILITY_BLADESTORM_DURATION, ABILITY_BLADESTORM_RADIUS,
    ABILITY_BLADESTORM_TICK, ABILITY_BLADESTORM_DMG_MULT,
    ABILITY_GRAVITY_CD, ABILITY_GRAVITY_RADIUS, ABILITY_GRAVITY_PULL_DURATION,
    ABILITY_GRAVITY_SLOW_DURATION, ABILITY_GRAVITY_FORCE,
    ABILITY_FREEZE_CD, ABILITY_FREEZE_RADIUS, ABILITY_FREEZE_DURATION, ABILITY_FREEZE_DMG_MULT,
} from '../constants.js';
import { applyFreeze, applySlow } from './statusEffects.js';
import * as Impact from './impactSystem.js';

// ── Ability Registry ──

export const ABILITY_DEFINITIONS = {
    shockwave: {
        id: 'shockwave',
        name: 'Shockwave',
        icon: '💥',
        color: '#ff9800',
        cooldownSec: ABILITY_SHOCKWAVE_CD,
        desc: `AoE burst (r${ABILITY_SHOCKWAVE_RADIUS}), ${ABILITY_SHOCKWAVE_DMG_MULT}× DMG + KB`,

        onUse(ctx) {
            const { player, enemies, boss, particles, procSystem } = ctx;
            const baseDmg = Math.floor(player.damage * ABILITY_SHOCKWAVE_DMG_MULT);

            const targets = boss && !boss.dead ? [...enemies, boss] : enemies;
            let hitCount = 0;

            for (const e of targets) {
                if (e.dead) continue;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > ABILITY_SHOCKWAVE_RADIUS + (e.radius || 12)) continue;

                // Knockback scales inversely with distance
                const d = dist || 1;
                const kbScale = 1 - (dist / (ABILITY_SHOCKWAVE_RADIUS + e.radius));
                const kb = ABILITY_SHOCKWAVE_KB * Math.max(0.3, kbScale);
                e.takeDamage(baseDmg, (dx / d) * kb, (dy / d) * kb);
                Impact.flashEntity(e, 80);
                hitCount++;

                // Trigger proc on each hit
                if (procSystem) {
                    procSystem.handleHit(
                        { source: player, target: e, damage: baseDmg, isCrit: false, attackType: 'shockwave' },
                        { enemies, boss, particles },
                    );
                }
            }

            // Impact
            Impact.bigImpact(70, 6, 0.86);

            // Visual: expanding ring (via particle system)
            if (particles) {
                particles.abilityShockwave(player.x, player.y, ABILITY_SHOCKWAVE_RADIUS);
            }

            return hitCount;
        },
    },

    blade_storm: {
        id: 'blade_storm',
        name: 'Blade Storm',
        icon: '🌀',
        color: '#e040fb',
        cooldownSec: ABILITY_BLADESTORM_CD,
        durationSec: ABILITY_BLADESTORM_DURATION,
        desc: `Spinning blades for ${ABILITY_BLADESTORM_DURATION}s, tick DMG in r${ABILITY_BLADESTORM_RADIUS}`,

        onUse(ctx) {
            const { player } = ctx;
            // Mark the ability as active with duration tracking
            Impact.shake(3, 0.85);
            return {
                active: true,
                remaining: ABILITY_BLADESTORM_DURATION,
                tickTimer: 0,
                angle: 0,
            };
        },

        onUpdate(ctx, dt, state) {
            if (!state || !state.active) return state;
            const { player, enemies, boss, particles, procSystem } = ctx;

            state.remaining -= dt;
            state.tickTimer -= dt;
            state.angle += dt * 8; // rotation speed

            if (state.remaining <= 0) {
                state.active = false;
                return state;
            }

            // Tick damage
            if (state.tickTimer <= 0) {
                state.tickTimer = ABILITY_BLADESTORM_TICK;
                const tickDmg = Math.floor(player.damage * ABILITY_BLADESTORM_DMG_MULT);
                const targets = boss && !boss.dead ? [...enemies, boss] : enemies;

                for (const e of targets) {
                    if (e.dead) continue;
                    const dx = e.x - player.x;
                    const dy = e.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > ABILITY_BLADESTORM_RADIUS + (e.radius || 12)) continue;

                    e.takeDamage(tickDmg, 0, 0);
                    Impact.flashEntity(e, 40);

                    if (procSystem) {
                        procSystem.handleHit(
                            { source: player, target: e, damage: tickDmg, isCrit: false, attackType: 'blade_storm' },
                            { enemies, boss, particles },
                        );
                    }
                }
            }

            // Visual: spinning blade particles (per frame, throttled)
            if (particles && Math.random() < 0.4) {
                particles.abilityBladeStorm(player.x, player.y, ABILITY_BLADESTORM_RADIUS, state.angle);
            }

            return state;
        },
    },

    gravity_pull: {
        id: 'gravity_pull',
        name: 'Gravity Pull',
        icon: '🌑',
        color: '#7c4dff',
        cooldownSec: ABILITY_GRAVITY_CD,
        durationSec: ABILITY_GRAVITY_PULL_DURATION + ABILITY_GRAVITY_SLOW_DURATION,
        desc: `Pull enemies for ${ABILITY_GRAVITY_PULL_DURATION}s, then slow`,

        onUse(ctx) {
            Impact.shake(3, 0.86);
            return {
                active: true,
                pullRemaining: ABILITY_GRAVITY_PULL_DURATION,
                slowApplied: false,
            };
        },

        onUpdate(ctx, dt, state) {
            if (!state || !state.active) return state;
            const { player, enemies, boss, particles } = ctx;

            state.pullRemaining -= dt;

            if (state.pullRemaining > 0) {
                // Pull phase: drag enemies toward player
                const targets = boss && !boss.dead ? [...enemies, boss] : enemies;
                for (const e of targets) {
                    if (e.dead) continue;
                    const dx = player.x - e.x;
                    const dy = player.y - e.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > ABILITY_GRAVITY_RADIUS + (e.radius || 12)) continue;
                    if (dist < 5) continue; // don't pull into player center

                    const pullStr = ABILITY_GRAVITY_FORCE * dt;
                    e.x += (dx / dist) * pullStr;
                    e.y += (dy / dist) * pullStr;
                }

                // Visual: pull lines
                if (particles && Math.random() < 0.3) {
                    particles.abilityGravityPull(player.x, player.y, ABILITY_GRAVITY_RADIUS);
                }
            } else if (!state.slowApplied) {
                // Apply slow after pull ends
                state.slowApplied = true;
                const targets = boss && !boss.dead ? [...enemies, boss] : enemies;
                for (const e of targets) {
                    if (e.dead) continue;
                    const dx = player.x - e.x;
                    const dy = player.y - e.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < ABILITY_GRAVITY_RADIUS + (e.radius || 12)) {
                        applySlow(e, ABILITY_GRAVITY_SLOW_DURATION * 1000, 0.4);
                    }
                }
                state.active = false;
            }

            return state;
        },
    },

    freeze_pulse: {
        id: 'freeze_pulse',
        name: 'Freeze Pulse',
        icon: '❄️',
        color: '#40c4ff',
        cooldownSec: ABILITY_FREEZE_CD,
        desc: `Freeze enemies in r${ABILITY_FREEZE_RADIUS} for ${ABILITY_FREEZE_DURATION}s`,

        onUse(ctx) {
            const { player, enemies, boss, particles, procSystem } = ctx;
            const targets = boss && !boss.dead ? [...enemies, boss] : enemies;
            const dmg = Math.floor(player.damage * ABILITY_FREEZE_DMG_MULT);
            let hitCount = 0;

            for (const e of targets) {
                if (e.dead) continue;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > ABILITY_FREEZE_RADIUS + (e.radius || 12)) continue;

                applyFreeze(e, ABILITY_FREEZE_DURATION * 1000);
                if (dmg > 0) {
                    e.takeDamage(dmg, 0, 0);
                }
                Impact.flashEntity(e, 100);
                hitCount++;
            }

            Impact.shake(3, 0.86);

            if (particles) {
                particles.abilityFreezePulse(player.x, player.y, ABILITY_FREEZE_RADIUS);
            }

            return hitCount;
        },
    },
};

/** All ability IDs */
export const ABILITY_IDS = Object.keys(ABILITY_DEFINITIONS);

/** Get ability definition by ID */
export function getAbility(id) {
    return ABILITY_DEFINITIONS[id] || null;
}
