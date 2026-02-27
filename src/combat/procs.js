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
import * as Audio from '../audio.js';
import { applyBurn, applyFreeze } from './statusEffects.js';
import { showProcTrigger } from '../ui/uiAbilityBar.js';

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
            const { enemies, boss, particles, procMods = {}, globalMods = {} } = context;
            if (!target || target.dead) return;

            const effectiveRadius = PROC_EXPLOSIVE_RADIUS * (procMods.radiusMult || 1);
            const dmg = Math.floor(source.damage * PROC_EXPLOSIVE_DMG_MULT * (procMods.dmgMult || 1) * (globalMods.damageMult || 1));
            const targets = boss && !boss.dead ? [...enemies, boss] : enemies;

            const hitByExplosion = []; // track for chain explosions

            for (const e of targets) {
                if (e.dead || e === target) continue;
                const dx = e.x - target.x;
                const dy = e.y - target.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > effectiveRadius + (e.radius || 12)) continue;

                const d = dist || 1;
                e.takeDamage(dmg, (dx / d) * 8, (dy / d) * 8);
                Impact.flashEntity(e, 60);
                hitByExplosion.push(e);

                // ── Napalm: burn on explosion ──
                if (procMods.burnOnExplosion) {
                    applyBurn(e, procMods.burnDuration || 2000, procMods.burnDps || 5);
                }
            }

            Impact.hitStop(90);
            Impact.shake(8, 0.88);
            Impact.screenFlash('#ff6d00', 0.3, 0.004);
            Audio.playProcExplosion();
            showProcTrigger('Explosive Strikes', '🔥', '#ff6d00');

            if (particles) {
                particles.procExplosion(target.x, target.y, effectiveRadius);
            }

            // ── Inferno Chain: explosions can trigger more explosions ──
            if (procMods.chainExplosion && hitByExplosion.length > 0) {
                const chainChance = procMods.chainChance || 0.25;
                for (const hit of hitByExplosion) {
                    if (hit.dead || Math.random() > chainChance) continue;
                    const chainRadius = effectiveRadius * 0.7;
                    const chainDmg = Math.floor(dmg * 0.6);
                    for (const e of targets) {
                        if (e.dead || e === hit) continue;
                        const dx = e.x - hit.x;
                        const dy = e.y - hit.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > chainRadius + (e.radius || 12)) continue;
                        const d = dist || 1;
                        e.takeDamage(chainDmg, (dx / d) * 5, (dy / d) * 5);
                        if (procMods.burnOnExplosion) applyBurn(e, (procMods.burnDuration || 2000) * 0.6, procMods.burnDps || 5);
                    }
                    if (particles) particles.procExplosion(hit.x, hit.y, chainRadius);
                    Impact.shake(5, 0.90);
                }
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
            const { enemies, boss, particles, procMods = {}, globalMods = {} } = context;
            if (!target || target.dead) return;

            const dmg = Math.floor(source.damage * PROC_CHAIN_LIGHTNING_DMG_MULT * (procMods.dmgMult || 1) * (globalMods.damageMult || 1));
            const allTargets = boss && !boss.dead ? [...enemies, boss] : enemies;
            const hit = new Set();
            hit.add(target);

            const effectiveRange = PROC_CHAIN_LIGHTNING_RANGE * (procMods.rangeMult || 1);
            const totalJumps = PROC_CHAIN_LIGHTNING_JUMPS + (procMods.extraJumps || 0);

            let current = target;
            let lastHit = target;
            const chainPositions = [{ x: target.x, y: target.y }];

            for (let jump = 0; jump < totalJumps; jump++) {
                let nearest = null;
                let nearestDist = effectiveRange;

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
                lastHit = nearest;
                current = nearest;
            }

            // ── Paralyzing Bolt: stun last target in chain ──
            if (procMods.stunLastTarget && lastHit && !lastHit.dead) {
                applyFreeze(lastHit, procMods.stunDuration || 500);
            }

            // Visual: lightning lines between chain targets
            Impact.hitStop(60);
            Impact.shake(6, 0.87);
            Impact.screenFlash('#ffeb3b', 0.25, 0.005);
            Audio.playChainLightning();
            showProcTrigger('Chain Lightning', '⚡', '#ffeb3b');
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
            const { target, damage, source } = event;
            const { enemies, boss, particles, procMods = {} } = context;
            if (!target || target.dead) return;

            // Extra damage (node can increase crit damage multiplier)
            const extraDmgMult = PROC_HEAVY_CRIT_EXTRA_DMG * (procMods.extraDmgMult || 1);
            const extraDmg = Math.floor(damage * extraDmgMult);
            target.takeDamage(extraDmg, 0, 0, true);

            // ── Critical Mass: crit causes a small explosion ──
            if (procMods.critExplosion) {
                const cExpRadius = procMods.critExplosionRadius || 50;
                const cExpDmg = Math.floor(damage * (procMods.critExplosionDmgMult || 0.3));
                const allTargets = boss && !boss.dead ? [...enemies, boss] : enemies;
                for (const e of allTargets) {
                    if (e.dead || e === target) continue;
                    const dx = e.x - target.x;
                    const dy = e.y - target.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > cExpRadius + (e.radius || 12)) continue;
                    const d = dist || 1;
                    e.takeDamage(cExpDmg, (dx / d) * 5, (dy / d) * 5);
                    Impact.flashEntity(e, 50);
                }
                if (particles) particles.procExplosion(target.x, target.y, cExpRadius);
            }

            // ── Crit Streak: each crit increases next crit chance ──
            if (procMods.critStreak && source) {
                const bonus = procMods.critStreakBonus || 0.05;
                const max = procMods.critStreakMax || 0.25;
                source.critStreakBonus = Math.min((source.critStreakBonus || 0) + bonus, max);
            }

            // Big impact
            Impact.hitStop(120);
            Impact.shake(10, 0.88);
            Impact.flashEntity(target, 120);
            Impact.screenFlash('#ff1744', 0.35, 0.004);
            Audio.playCritImpact();
            showProcTrigger('CRIT!', '💎', '#ff1744');

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
