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
import { applyBurn, applyFreeze, applySlow } from './statusEffects.js';
import { showProcTrigger } from '../ui/uiAbilityBar.js';
import { tdId } from '../i18n.js';

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
            showProcTrigger(tdId('explosive_strikes') || 'Explosive Strikes', '🔥', '#ff6d00');

            if (particles) {
                particles.procExplosion(target.x, target.y, effectiveRadius);
            }

            // ── Concussive Blast: slow on explosion ──
            if (procMods.slowOnExplosion) {
                for (const e of hitByExplosion) {
                    if (!e.dead) {
                        applySlow(e, procMods.slowDuration || 1500, procMods.slowFactor || 0.5);
                    }
                }
            }

            // ── Pyromaniac: heal % of explosion damage ──
            if (procMods.healPct && hitByExplosion.length > 0) {
                const healAmt = Math.max(1, Math.floor(dmg * hitByExplosion.length * procMods.healPct));
                source.hp = Math.min(source.hp + healAmt, source.maxHp);
            }

            // ── Cluster Bombs: chance to spawn mini-bombs ──
            if (procMods.clusterBomb && Math.random() < (procMods.clusterChance || 0.20)) {
                const clusterCount = procMods.clusterCount || 3;
                const clusterDmg = Math.floor(dmg * (procMods.clusterDmgMult || 0.25));
                const targets2 = boss && !boss.dead ? [...enemies, boss] : enemies;
                for (let c = 0; c < clusterCount; c++) {
                    const angle = (Math.PI * 2 / clusterCount) * c;
                    const cx = target.x + Math.cos(angle) * 30;
                    const cy = target.y + Math.sin(angle) * 30;
                    for (const e of targets2) {
                        if (e.dead) continue;
                        const dx = e.x - cx;
                        const dy = e.y - cy;
                        if (Math.sqrt(dx * dx + dy * dy) <= 35 + (e.radius || 12)) {
                            e.takeDamage(clusterDmg, 0, 0);
                        }
                    }
                    if (particles) particles.procExplosion(cx, cy, 35);
                }
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

                // ── Electro-Burn: lightning applies burn on each jump ──
                if (procMods.burnOnJump && !nearest.dead) {
                    applyBurn(nearest, procMods.burnDuration || 2000, procMods.burnDps || 3);
                }

                // ── Arc Splash: each jump also does small AoE damage ──
                if (procMods.splashOnJump) {
                    const splashR = procMods.splashRadius || 40;
                    const splashDmg = Math.floor(dmg * (procMods.splashDmgMult || 0.25));
                    for (const e of allTargets) {
                        if (e.dead || e === nearest) continue;
                        const sdx = e.x - nearest.x;
                        const sdy = e.y - nearest.y;
                        if (Math.sqrt(sdx * sdx + sdy * sdy) <= splashR + (e.radius || 12)) {
                            e.takeDamage(splashDmg, 0, 0);
                        }
                    }
                }

                // ── Forked Lightning: hit additional targets per jump ──
                if (procMods.fork) {
                    const forkCount = (procMods.forkTargets || 2) - 1; // -1 because nearest is already hit
                    let forked = 0;
                    for (const e of allTargets) {
                        if (e.dead || hit.has(e) || forked >= forkCount) continue;
                        const fdx = e.x - current.x;
                        const fdy = e.y - current.y;
                        if (Math.sqrt(fdx * fdx + fdy * fdy) <= effectiveRange) {
                            e.takeDamage(Math.floor(dmg * 0.6), 0, 0);
                            Impact.flashEntity(e, 40);
                            hit.add(e);
                            chainPositions.push({ x: e.x, y: e.y });
                            forked++;
                        }
                    }
                }
            }

            // ── Paralyzing Bolt: stun last target in chain ──
            if (procMods.stunLastTarget && lastHit && !lastHit.dead) {
                applyFreeze(lastHit, procMods.stunDuration || 500);
            }

            // ── Energize: reduce ability cooldowns per jump ──
            if (procMods.energize && source && source._abilitySystem) {
                const cdReduce = (procMods.energizePerJump || 0.3) * (hit.size - 1);
                source._abilitySystem.reduceCooldowns(cdReduce);
            }

            // Visual: lightning lines between chain targets
            Impact.hitStop(60);
            Impact.shake(6, 0.87);
            Impact.screenFlash('#ffeb3b', 0.25, 0.005);
            Audio.playChainLightning();
            showProcTrigger(tdId('chain_lightning') || 'Chain Lightning', '⚡', '#ffeb3b');
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

            // ── Vampiric Crits: heal % of damage dealt ──
            if (procMods.critLifesteal && source) {
                const healAmt = Math.max(1, Math.floor(damage * (procMods.critLifestealPct || 0.05)));
                source.hp = Math.min(source.hp + healAmt, source.maxHp);
            }

            // ── Crippling Crits: slow target ──
            if (procMods.critSlow && target && !target.dead) {
                applySlow(target, procMods.critSlowDuration || 1500, procMods.critSlowFactor || 0.7);
            }

            // ── Coup de Grâce: instant kill low-HP enemies ──
            if (procMods.execute && target && !target.dead && !target.isBoss) {
                if (target.hp / target.maxHp < (procMods.executeThreshold || 0.15)) {
                    target.takeDamage(target.hp + 1, 0, 0);
                    Impact.screenFlash('#b71c1c', 0.3, 0.003);
                }
            }

            // ── Crit Nova: every Nth crit triggers a free shockwave ──
            if (procMods.critNova && source) {
                source._critNovaCounter = (source._critNovaCounter || 0) + 1;
                if (source._critNovaCounter >= (procMods.critNovaEveryN || 3)) {
                    source._critNovaCounter = 0;
                    const novaR = procMods.critNovaRadius || 80;
                    const novaDmg = Math.floor(damage * (procMods.critNovaDmgMult || 0.5));
                    const allTargets = boss && !boss.dead ? [...enemies, boss] : enemies;
                    for (const e of allTargets) {
                        if (e.dead) continue;
                        const dx = e.x - source.x;
                        const dy = e.y - source.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > novaR + (e.radius || 12)) continue;
                        const d = dist || 1;
                        e.takeDamage(novaDmg, (dx / d) * 6, (dy / d) * 6);
                        Impact.flashEntity(e, 60);
                    }
                    if (particles) particles.abilityShockwave(source.x, source.y, novaR);
                    Impact.shake(8, 0.87);
                }
            }

            // Big impact
            Impact.hitStop(120);
            Impact.shake(10, 0.88);
            Impact.flashEntity(target, 120);
            Impact.screenFlash('#ff1744', 0.35, 0.004);
            Audio.playCritImpact();
            showProcTrigger(tdId('heavy_crit') || 'CRIT!', '💎', '#ff1744');

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
