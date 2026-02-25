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
import { stopBladeStorm } from '../audio.js';

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
            const { player, enemies, boss, particles, procSystem, abilityMods = {}, globalMods = {} } = ctx;
            const baseDmg = Math.floor(player.damage * ABILITY_SHOCKWAVE_DMG_MULT * (globalMods.damageMult || 1));
            const effectiveRadius = ABILITY_SHOCKWAVE_RADIUS * (abilityMods.radiusMult || 1);

            const targets = boss && !boss.dead ? [...enemies, boss] : enemies;
            let hitCount = 0;

            for (const e of targets) {
                if (e.dead) continue;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > effectiveRadius + (e.radius || 12)) continue;

                // Knockback scales inversely with distance
                const d = dist || 1;
                const kbScale = 1 - (dist / (effectiveRadius + e.radius));
                const kb = ABILITY_SHOCKWAVE_KB * Math.max(0.3, kbScale);
                e.takeDamage(baseDmg, (dx / d) * kb, (dy / d) * kb);
                Impact.flashEntity(e, 80);
                hitCount++;

                // Concussive Blast: stun in inner radius
                if (abilityMods.stunDuration && abilityMods.stunInnerRadius) {
                    if (dist <= effectiveRadius * abilityMods.stunInnerRadius) {
                        applyFreeze(e, abilityMods.stunDuration);
                    }
                }

                // Trigger proc on each hit
                if (procSystem) {
                    const abilityCrit = Math.random() < (player.critChance + (player.talentCritBonus || 0));
                    procSystem.handleHit(
                        { source: player, target: e, damage: baseDmg, isCrit: abilityCrit, attackType: 'shockwave' },
                        { enemies, boss, particles },
                    );
                }
            }

            // Impact — big, punchy hit-stop + heavy shake + screen flash
            Impact.bigImpact(120, 14, 0.90);
            Impact.screenFlash('#ff9800', 0.4, 0.003);

            // Visual: expanding ring (via particle system)
            if (particles) {
                particles.abilityShockwave(player.x, player.y, effectiveRadius);
            }

            // Aftershock (double pulse): schedule second pulse
            if (abilityMods.doublePulse) {
                const secondDelay = abilityMods.secondPulseDelay || 300;
                const secondDmgMult = abilityMods.secondPulseDmgMult || 0.6;
                setTimeout(() => {
                    const dmg2 = Math.floor(baseDmg * secondDmgMult);
                    for (const e of targets) {
                        if (e.dead) continue;
                        const dx2 = e.x - player.x;
                        const dy2 = e.y - player.y;
                        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                        if (dist2 > effectiveRadius + (e.radius || 12)) continue;
                        const d2 = dist2 || 1;
                        e.takeDamage(dmg2, (dx2 / d2) * 6, (dy2 / d2) * 6);
                    }
                    Impact.shake(8, 0.87);
                    if (particles) particles.abilityShockwave(player.x, player.y, effectiveRadius * 0.8);
                }, secondDelay);
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
            const { player, abilityMods = {} } = ctx;
            // Duration bonus from nodes (+1s per stack of Prolonged Storm)
            const bonusDuration = abilityMods.durationBonus || 0;
            // Mark the ability as active with duration tracking
            Impact.bigImpact(60, 8, 0.88);
            Impact.screenFlash('#e040fb', 0.3, 0.004);
            return {
                active: true,
                remaining: ABILITY_BLADESTORM_DURATION + bonusDuration,
                tickTimer: 0,
                angle: 0,
            };
        },

        onUpdate(ctx, dt, state) {
            if (!state || !state.active) return state;
            const { player, enemies, boss, particles, procSystem, abilityMods = {}, globalMods = {} } = ctx;
            const effectiveRadius = ABILITY_BLADESTORM_RADIUS * (abilityMods.radiusMult || 1);

            state.remaining -= dt;
            state.tickTimer -= dt;
            state.angle += dt * 8; // rotation speed

            if (state.remaining <= 0) {
                state.active = false;
                // Stop the looping blade storm sound
                stopBladeStorm();
                return state;
            }

            // Tick damage
            if (state.tickTimer <= 0) {
                state.tickTimer = ABILITY_BLADESTORM_TICK;
                const tickDmg = Math.floor(player.damage * ABILITY_BLADESTORM_DMG_MULT * (globalMods.damageMult || 1));
                const targets = boss && !boss.dead ? [...enemies, boss] : enemies;

                let tickHits = 0;
                for (const e of targets) {
                    if (e.dead) continue;
                    const dx = e.x - player.x;
                    const dy = e.y - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > effectiveRadius + (e.radius || 12)) continue;

                    // Push enemies outward on each tick
                    const d = dist || 1;
                    e.takeDamage(tickDmg, (dx / d) * 4, (dy / d) * 4);
                    Impact.flashEntity(e, 60);
                    tickHits++;

                    if (procSystem) {
                        const abilityCrit = Math.random() < (player.critChance + (player.talentCritBonus || 0));
                        procSystem.handleHit(
                            { source: player, target: e, damage: tickDmg, isCrit: abilityCrit, attackType: 'blade_storm' },
                            { enemies, boss, particles },
                        );
                    }
                }
                if (tickHits > 0) {
                    Impact.shake(3 + tickHits, 0.86);
                }
            }

            // Visual: spinning blade particles (per frame, high frequency)
            if (particles && Math.random() < 0.7) {
                particles.abilityBladeStorm(player.x, player.y, effectiveRadius, state.angle);
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
            Impact.bigImpact(80, 10, 0.90);
            Impact.screenFlash('#7c4dff', 0.3, 0.004);
            return {
                active: true,
                pullRemaining: ABILITY_GRAVITY_PULL_DURATION,
                slowApplied: false,
            };
        },

        onUpdate(ctx, dt, state) {
            if (!state || !state.active) return state;
            const { player, enemies, boss, particles, abilityMods = {} } = ctx;
            const effectiveRadius = ABILITY_GRAVITY_RADIUS * (abilityMods.radiusMult || 1);

            state.pullRemaining -= dt;

            if (state.pullRemaining > 0) {
                // Pull phase: drag enemies toward player
                const targets = boss && !boss.dead ? [...enemies, boss] : enemies;
                let pulling = 0;
                for (const e of targets) {
                    if (e.dead) continue;
                    const dx = player.x - e.x;
                    const dy = player.y - e.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > effectiveRadius + (e.radius || 12)) continue;
                    if (dist < 5) continue; // don't pull into player center

                    const pullStr = ABILITY_GRAVITY_FORCE * dt;
                    e.x += (dx / dist) * pullStr;
                    e.y += (dy / dist) * pullStr;
                    pulling++;
                }
                // Continuous rumble while pulling
                if (pulling > 0) Impact.shake(2 + pulling * 0.5, 0.82);

                // Visual: pull lines (more frequent)
                if (particles && Math.random() < 0.6) {
                    particles.abilityGravityPull(player.x, player.y, effectiveRadius);
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
                    if (dist < effectiveRadius + (e.radius || 12)) {
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
            const { player, enemies, boss, particles, procSystem, abilityMods = {}, globalMods = {} } = ctx;
            const targets = boss && !boss.dead ? [...enemies, boss] : enemies;
            const dmg = Math.floor(player.damage * ABILITY_FREEZE_DMG_MULT * (globalMods.damageMult || 1));
            const effectiveRadius = ABILITY_FREEZE_RADIUS * (abilityMods.radiusMult || 1);
            const freezeDuration = ABILITY_FREEZE_DURATION + (abilityMods.durationBonus || 0);
            let hitCount = 0;

            for (const e of targets) {
                if (e.dead) continue;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > effectiveRadius + (e.radius || 12)) continue;

                applyFreeze(e, freezeDuration * 1000);
                if (dmg > 0) {
                    e.takeDamage(dmg, 0, 0);
                }
                Impact.flashEntity(e, 100);
                hitCount++;
            }

            Impact.bigImpact(90, 12, 0.90);
            Impact.screenFlash('#80d8ff', 0.35, 0.003);

            if (particles) {
                particles.abilityFreezePulse(player.x, player.y, effectiveRadius);
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
