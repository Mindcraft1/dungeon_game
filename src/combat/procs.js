// ── Proc Definitions ──────────────────────────────────────
// Data-driven passive proc objects.
// Each fires on hit or kill with a chance roll.
// ────────────────────────────────────────────────────────────

import {
    PROC_EXPLOSIVE_CHANCE, PROC_EXPLOSIVE_RADIUS, PROC_EXPLOSIVE_DMG_MULT,
    PROC_CHAIN_LIGHTNING_CHANCE, PROC_CHAIN_LIGHTNING_JUMPS,
    PROC_CHAIN_LIGHTNING_RANGE, PROC_CHAIN_LIGHTNING_DMG_MULT,
    PROC_HEAVY_CRIT_EXTRA_DMG,
} from '../constants.js';
import * as Impact from './impactSystem.js';

export const PROC_DEFINITIONS = {
    explosive_strikes: {
        id: 'explosive_strikes',
        name: 'Explosive Strikes',
        icon: '🔥',
        color: '#ff6d00',
        desc: `${(PROC_EXPLOSIVE_CHANCE * 100).toFixed(0)}% on hit: AoE explosion (${PROC_EXPLOSIVE_DMG_MULT}× DMG)`,
        trigger: 'onHit',
        chance: PROC_EXPLOSIVE_CHANCE,

        onProc(event, context) {
            const { target, source } = event;
            const { enemies, boss, particles } = context;
            if (!target || target.dead) return;

            const dmg = Math.floor(source.damage * PROC_EXPLOSIVE_DMG_MULT);
            const targets = boss && !boss.dead ? [...enemies, boss] : enemies;

            for (const e of targets) {
                if (e.dead || e === target) continue;
                const dx = e.x - target.x;
                const dy = e.y - target.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > PROC_EXPLOSIVE_RADIUS + (e.radius || 12)) continue;

                const d = dist || 1;
                e.takeDamage(dmg, (dx / d) * 8, (dy / d) * 8);
                Impact.flashEntity(e, 60);
            }

            Impact.hitStop(50);
            Impact.shake(3, 0.86);

            if (particles) {
                particles.procExplosion(target.x, target.y, PROC_EXPLOSIVE_RADIUS);
            }
        },
    },

    chain_lightning: {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        icon: '⚡',
        color: '#ffeb3b',
        desc: `${(PROC_CHAIN_LIGHTNING_CHANCE * 100).toFixed(0)}% on hit: chain to ${PROC_CHAIN_LIGHTNING_JUMPS} enemies`,
        trigger: 'onHit',
        chance: PROC_CHAIN_LIGHTNING_CHANCE,

        onProc(event, context) {
            const { target, source } = event;
            const { enemies, boss, particles } = context;
            if (!target || target.dead) return;

            const dmg = Math.floor(source.damage * PROC_CHAIN_LIGHTNING_DMG_MULT);
            const allTargets = boss && !boss.dead ? [...enemies, boss] : enemies;
            const hit = new Set();
            hit.add(target);

            let current = target;
            const chainPositions = [{ x: target.x, y: target.y }];

            for (let jump = 0; jump < PROC_CHAIN_LIGHTNING_JUMPS; jump++) {
                let nearest = null;
                let nearestDist = PROC_CHAIN_LIGHTNING_RANGE;

                for (const e of allTargets) {
                    if (e.dead || hit.has(e)) continue;
                    const dx = e.x - current.x;
                    const dy = e.y - current.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < nearestDist) {
                        nearest = e;
                        nearestDist = dist;
                    }
                }

                if (!nearest) break;

                nearest.takeDamage(dmg, 0, 0);
                Impact.flashEntity(nearest, 50);
                hit.add(nearest);
                chainPositions.push({ x: nearest.x, y: nearest.y });
                current = nearest;
            }

            // Visual: lightning lines between chain targets
            if (particles && chainPositions.length > 1) {
                particles.procChainLightning(chainPositions);
            }
        },
    },

    heavy_crit: {
        id: 'heavy_crit',
        name: 'Heavy Crit',
        icon: '💎',
        color: '#ff1744',
        desc: `On crit: +${(PROC_HEAVY_CRIT_EXTRA_DMG * 100).toFixed(0)}% DMG + big impact`,
        trigger: 'onCrit',  // special: only fires when isCrit is true
        chance: 1.0,         // always fires on crit

        onProc(event, context) {
            const { target, damage } = event;
            const { particles } = context;
            if (!target || target.dead) return;

            // Extra damage
            const extraDmg = Math.floor(damage * PROC_HEAVY_CRIT_EXTRA_DMG);
            target.takeDamage(extraDmg, 0, 0);

            // Big impact
            Impact.hitStop(80);
            Impact.shake(5, 0.86);
            Impact.flashEntity(target, 100);

            if (particles) {
                particles.procCritImpact(target.x, target.y);
            }
        },
    },
};

/** All proc IDs */
export const PROC_IDS = Object.keys(PROC_DEFINITIONS);

/** Get proc definition by ID */
export function getProc(id) {
    return PROC_DEFINITIONS[id] || null;
}
