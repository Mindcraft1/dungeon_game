// ── Upgrade Node Definitions ─────────────────────────────────
// Data-driven node/mod definitions for in-run build crafting.
// Each node modifies player.combatMods when applied.
//
// Categories:
//   melee, dagger, dash, ability:<id>, proc:<id>, global
//
// Rarity: common, uncommon, rare
// ─────────────────────────────────────────────────────────────

import {
    NODE_RARITY_COMMON, NODE_RARITY_UNCOMMON, NODE_RARITY_RARE,
} from '../constants.js';

// ── Node Registry ──

export const NODE_DEFINITIONS = {

    // ═══════════════════════════════════════════════════
    // MELEE NODES
    // ═══════════════════════════════════════════════════

    melee_cleave: {
        id: 'melee_cleave',
        name: 'Cleave',
        desc: '+1 extra melee target',
        icon: '⚔️',
        color: '#f44336',
        category: 'melee',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 2,
        apply(mods, stacks) { mods.melee.extraTargets = (mods.melee.extraTargets || 0) + 1; },
    },
    melee_arc_wider: {
        id: 'melee_arc_wider',
        name: 'Wide Arc',
        desc: '+20% attack arc',
        icon: '🌀',
        color: '#ff9800',
        category: 'melee',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        apply(mods, stacks) { mods.melee.arcMult = (mods.melee.arcMult || 1) * 1.20; },
    },
    melee_attack_speed: {
        id: 'melee_attack_speed',
        name: 'Quick Strikes',
        desc: '+15% attack speed',
        icon: '⚡',
        color: '#ffeb3b',
        category: 'melee',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        apply(mods, stacks) { mods.melee.cooldownMult = (mods.melee.cooldownMult || 1) * 0.85; },
    },
    melee_stun_chance: {
        id: 'melee_stun_chance',
        name: 'Staggering Blows',
        desc: '10% chance stun 0.5s',
        icon: '💫',
        color: '#9c27b0',
        category: 'melee',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        apply(mods) { mods.melee.stunChance = 0.10; mods.melee.stunDuration = 500; },
    },
    melee_bleed: {
        id: 'melee_bleed',
        name: 'Serrated Edge',
        desc: '20% bleed for 2s',
        icon: '🩸',
        color: '#e91e63',
        category: 'melee',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        apply(mods) { mods.melee.bleedChance = 0.20; mods.melee.bleedDuration = 2000; mods.melee.bleedDps = 5; },
    },
    melee_kill_nova: {
        id: 'melee_kill_nova',
        name: 'Kill Nova',
        desc: 'On kill: small AoE burst (1s CD)',
        icon: '💥',
        color: '#ff5722',
        category: 'melee',
        rarity: NODE_RARITY_RARE,
        maxStacks: 1,
        apply(mods) { mods.melee.killNova = true; mods.melee.killNovaCooldown = 1000; mods.melee.killNovaRadius = 60; mods.melee.killNovaDmgMult = 0.4; },
    },
    melee_heavy_hit: {
        id: 'melee_heavy_hit',
        name: 'Heavy Strike',
        desc: '+30% knockback, -10% speed',
        icon: '🔨',
        color: '#795548',
        category: 'melee',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 1,
        apply(mods) { mods.melee.knockbackMult = (mods.melee.knockbackMult || 1) * 1.30; mods.melee.cooldownMult = (mods.melee.cooldownMult || 1) * 1.10; },
    },
    melee_lunge: {
        id: 'melee_lunge',
        name: 'Lunge',
        desc: 'Small forward lunge on attack',
        icon: '🏃',
        color: '#2196f3',
        category: 'melee',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        apply(mods) { mods.melee.lunge = true; mods.melee.lungeDistance = 30; },
    },

    // ═══════════════════════════════════════════════════
    // DAGGER NODES
    // ═══════════════════════════════════════════════════

    dagger_extra_projectile: {
        id: 'dagger_extra_projectile',
        name: 'Multi-Dagger',
        desc: '+1 dagger per throw',
        icon: '🗡️',
        color: '#4fc3f7',
        category: 'dagger',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 2,
        apply(mods, stacks) { mods.dagger.extraProjectiles = (mods.dagger.extraProjectiles || 0) + 1; },
    },
    dagger_spread: {
        id: 'dagger_spread',
        name: 'Fan of Knives',
        desc: 'Daggers shoot in 3-way cone',
        icon: '🌊',
        color: '#00bcd4',
        category: 'dagger',
        rarity: NODE_RARITY_RARE,
        maxStacks: 1,
        apply(mods) { mods.dagger.spreadPattern = true; mods.dagger.spreadCount = 3; mods.dagger.spreadArc = 0.4; },
    },
    dagger_pierce: {
        id: 'dagger_pierce',
        name: 'Piercing Daggers',
        desc: '+1 pierce',
        icon: '📌',
        color: '#8bc34a',
        category: 'dagger',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 3,
        apply(mods, stacks) { mods.dagger.pierce = (mods.dagger.pierce || 0) + 1; },
    },
    dagger_ricochet: {
        id: 'dagger_ricochet',
        name: 'Ricochet',
        desc: '+1 bounce off walls',
        icon: '🔄',
        color: '#ff9800',
        category: 'dagger',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 2,
        apply(mods, stacks) { mods.dagger.ricochet = (mods.dagger.ricochet || 0) + 1; },
    },
    dagger_fire_trail: {
        id: 'dagger_fire_trail',
        name: 'Fire Trail',
        desc: 'Daggers leave burn trail (1.2s)',
        icon: '🔥',
        color: '#ff6d00',
        category: 'dagger',
        rarity: NODE_RARITY_RARE,
        maxStacks: 1,
        apply(mods) { mods.dagger.fireTrail = true; mods.dagger.fireTrailDuration = 1200; mods.dagger.fireTrailDps = 4; },
    },
    dagger_speed: {
        id: 'dagger_speed',
        name: 'Swift Throw',
        desc: '+25% dagger speed',
        icon: '💨',
        color: '#03a9f4',
        category: 'dagger',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        apply(mods, stacks) { mods.dagger.speedMult = (mods.dagger.speedMult || 1) * 1.25; },
    },
    dagger_crit: {
        id: 'dagger_crit',
        name: 'Precision Throw',
        desc: '+5% crit chance (daggers)',
        icon: '🎯',
        color: '#ff1744',
        category: 'dagger',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        apply(mods, stacks) { mods.dagger.critBonus = (mods.dagger.critBonus || 0) + 0.05; },
    },
    dagger_returning: {
        id: 'dagger_returning',
        name: 'Boomerang',
        desc: 'Daggers return to you',
        icon: '🪃',
        color: '#7c4dff',
        category: 'dagger',
        rarity: NODE_RARITY_RARE,
        maxStacks: 1,
        apply(mods) { mods.dagger.returning = true; },
    },

    // ═══════════════════════════════════════════════════
    // DASH NODES
    // ═══════════════════════════════════════════════════

    dash_end_shockwave: {
        id: 'dash_end_shockwave',
        name: 'Impact Dash',
        desc: 'AoE + knockback at dash end',
        icon: '💥',
        color: '#ff9800',
        category: 'dash',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        apply(mods) { mods.dash.endShockwave = true; mods.dash.endShockwaveRadius = 50; mods.dash.endShockwaveKb = 15; },
    },
    dash_fire_trail: {
        id: 'dash_fire_trail',
        name: 'Blazing Dash',
        desc: 'Leave a fire trail when dashing',
        icon: '🔥',
        color: '#ff6d00',
        category: 'dash',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        apply(mods) { mods.dash.fireTrail = true; mods.dash.fireTrailDps = 6; mods.dash.fireTrailDuration = 800; },
    },
    dash_cooldown_reduction: {
        id: 'dash_cooldown_reduction',
        name: 'Quick Recovery',
        desc: '-15% dash cooldown',
        icon: '⏱️',
        color: '#2196f3',
        category: 'dash',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        apply(mods, stacks) { mods.dash.cooldownMult = (mods.dash.cooldownMult || 1) * 0.85; },
    },
    dash_longer: {
        id: 'dash_longer',
        name: 'Extended Roll',
        desc: '+20% dash distance',
        icon: '📏',
        color: '#4caf50',
        category: 'dash',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        apply(mods, stacks) { mods.dash.durationMult = (mods.dash.durationMult || 1) * 1.20; },
    },
    dash_stun: {
        id: 'dash_stun',
        name: 'Stunning Rush',
        desc: 'Dash collision stuns 0.4s',
        icon: '💫',
        color: '#9c27b0',
        category: 'dash',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        apply(mods) { mods.dash.stunOnHit = true; mods.dash.stunDuration = 400; },
    },

    // ═══════════════════════════════════════════════════
    // ABILITY-SPECIFIC: SHOCKWAVE
    // ═══════════════════════════════════════════════════

    shockwave_radius: {
        id: 'shockwave_radius',
        name: 'Wider Blast',
        desc: '+30% shockwave radius',
        icon: '💥',
        color: '#ff9800',
        category: 'ability:shockwave',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        requires: { abilities: ['shockwave'] },
        apply(mods, stacks) { mods.abilities.shockwave = mods.abilities.shockwave || {}; mods.abilities.shockwave.radiusMult = (mods.abilities.shockwave.radiusMult || 1) * 1.30; },
    },
    shockwave_double_pulse: {
        id: 'shockwave_double_pulse',
        name: 'Aftershock',
        desc: 'Second pulse after 0.3s (60% DMG)',
        icon: '🔄',
        color: '#ff5722',
        category: 'ability:shockwave',
        rarity: NODE_RARITY_RARE,
        maxStacks: 1,
        requires: { abilities: ['shockwave'] },
        apply(mods) { mods.abilities.shockwave = mods.abilities.shockwave || {}; mods.abilities.shockwave.doublePulse = true; mods.abilities.shockwave.secondPulseDmgMult = 0.6; mods.abilities.shockwave.secondPulseDelay = 300; },
    },
    shockwave_stun: {
        id: 'shockwave_stun',
        name: 'Concussive Blast',
        desc: 'Stun 0.6s in inner radius',
        icon: '💫',
        color: '#ffd700',
        category: 'ability:shockwave',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        requires: { abilities: ['shockwave'] },
        apply(mods) { mods.abilities.shockwave = mods.abilities.shockwave || {}; mods.abilities.shockwave.stunDuration = 600; mods.abilities.shockwave.stunInnerRadius = 0.5; },
    },
    shockwave_cd: {
        id: 'shockwave_cd',
        name: 'Seismic Affinity',
        desc: '-20% shockwave cooldown',
        icon: '⏱️',
        color: '#ff9800',
        category: 'ability:shockwave',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 1,
        requires: { abilities: ['shockwave'] },
        apply(mods) { mods.abilities.shockwave = mods.abilities.shockwave || {}; mods.abilities.shockwave.cooldownMult = (mods.abilities.shockwave.cooldownMult || 1) * 0.80; },
    },

    // ═══════════════════════════════════════════════════
    // ABILITY-SPECIFIC: BLADE STORM
    // ═══════════════════════════════════════════════════

    bladestorm_duration: {
        id: 'bladestorm_duration',
        name: 'Prolonged Storm',
        desc: '+1s blade storm duration',
        icon: '🌀',
        color: '#e040fb',
        category: 'ability:blade_storm',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        requires: { abilities: ['blade_storm'] },
        apply(mods, stacks) { mods.abilities.blade_storm = mods.abilities.blade_storm || {}; mods.abilities.blade_storm.durationBonus = (mods.abilities.blade_storm.durationBonus || 0) + 1; },
    },
    bladestorm_radius: {
        id: 'bladestorm_radius',
        name: 'Expanding Vortex',
        desc: '+15% blade storm radius',
        icon: '🌀',
        color: '#ce93d8',
        category: 'ability:blade_storm',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        requires: { abilities: ['blade_storm'] },
        apply(mods, stacks) { mods.abilities.blade_storm = mods.abilities.blade_storm || {}; mods.abilities.blade_storm.radiusMult = (mods.abilities.blade_storm.radiusMult || 1) * 1.15; },
    },
    bladestorm_cd: {
        id: 'bladestorm_cd',
        name: 'Storm Mastery',
        desc: '-15% blade storm cooldown',
        icon: '⏱️',
        color: '#e040fb',
        category: 'ability:blade_storm',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        requires: { abilities: ['blade_storm'] },
        apply(mods) { mods.abilities.blade_storm = mods.abilities.blade_storm || {}; mods.abilities.blade_storm.cooldownMult = (mods.abilities.blade_storm.cooldownMult || 1) * 0.85; },
    },

    // ═══════════════════════════════════════════════════
    // ABILITY-SPECIFIC: GRAVITY PULL
    // ═══════════════════════════════════════════════════

    gravity_pull_radius: {
        id: 'gravity_pull_radius',
        name: 'Gravity Well',
        desc: '+25% gravity radius',
        icon: '🌑',
        color: '#7c4dff',
        category: 'ability:gravity_pull',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        requires: { abilities: ['gravity_pull'] },
        apply(mods, stacks) { mods.abilities.gravity_pull = mods.abilities.gravity_pull || {}; mods.abilities.gravity_pull.radiusMult = (mods.abilities.gravity_pull.radiusMult || 1) * 1.25; },
    },
    gravity_pull_cd: {
        id: 'gravity_pull_cd',
        name: 'Warp Affinity',
        desc: '-15% gravity pull cooldown',
        icon: '⏱️',
        color: '#7c4dff',
        category: 'ability:gravity_pull',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        requires: { abilities: ['gravity_pull'] },
        apply(mods) { mods.abilities.gravity_pull = mods.abilities.gravity_pull || {}; mods.abilities.gravity_pull.cooldownMult = (mods.abilities.gravity_pull.cooldownMult || 1) * 0.85; },
    },

    // ═══════════════════════════════════════════════════
    // ABILITY-SPECIFIC: FREEZE PULSE
    // ═══════════════════════════════════════════════════

    freeze_pulse_radius: {
        id: 'freeze_pulse_radius',
        name: 'Permafrost',
        desc: '+25% freeze radius',
        icon: '❄️',
        color: '#40c4ff',
        category: 'ability:freeze_pulse',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        requires: { abilities: ['freeze_pulse'] },
        apply(mods, stacks) { mods.abilities.freeze_pulse = mods.abilities.freeze_pulse || {}; mods.abilities.freeze_pulse.radiusMult = (mods.abilities.freeze_pulse.radiusMult || 1) * 1.25; },
    },
    freeze_pulse_duration: {
        id: 'freeze_pulse_duration',
        name: 'Deep Freeze',
        desc: '+0.5s freeze duration',
        icon: '❄️',
        color: '#80d8ff',
        category: 'ability:freeze_pulse',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 2,
        requires: { abilities: ['freeze_pulse'] },
        apply(mods, stacks) { mods.abilities.freeze_pulse = mods.abilities.freeze_pulse || {}; mods.abilities.freeze_pulse.durationBonus = (mods.abilities.freeze_pulse.durationBonus || 0) + 0.5; },
    },
    freeze_pulse_cd: {
        id: 'freeze_pulse_cd',
        name: 'Frost Mastery',
        desc: '-20% freeze pulse cooldown',
        icon: '⏱️',
        color: '#40c4ff',
        category: 'ability:freeze_pulse',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 1,
        requires: { abilities: ['freeze_pulse'] },
        apply(mods) { mods.abilities.freeze_pulse = mods.abilities.freeze_pulse || {}; mods.abilities.freeze_pulse.cooldownMult = (mods.abilities.freeze_pulse.cooldownMult || 1) * 0.80; },
    },

    // ═══════════════════════════════════════════════════
    // PROC-SPECIFIC: EXPLOSIVE STRIKES
    // ═══════════════════════════════════════════════════

    proc_explosion_chance: {
        id: 'proc_explosion_chance',
        name: 'Volatile Mix',
        desc: '+5% explosion chance (cap 25%)',
        icon: '🔥',
        color: '#ff6d00',
        category: 'proc:explosive_strikes',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 3,
        requires: { procs: ['explosive_strikes'] },
        apply(mods, stacks) {
            mods.procs.explosive_strikes = mods.procs.explosive_strikes || {};
            const bonus = (mods.procs.explosive_strikes.chanceBonus || 0) + 0.05;
            mods.procs.explosive_strikes.chanceBonus = Math.min(bonus, 0.15); // cap at +15% → total 25%
        },
    },
    proc_explosion_radius: {
        id: 'proc_explosion_radius',
        name: 'Blast Radius',
        desc: '+20% explosion radius',
        icon: '💥',
        color: '#ff9800',
        category: 'proc:explosive_strikes',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        requires: { procs: ['explosive_strikes'] },
        apply(mods, stacks) { mods.procs.explosive_strikes = mods.procs.explosive_strikes || {}; mods.procs.explosive_strikes.radiusMult = (mods.procs.explosive_strikes.radiusMult || 1) * 1.20; },
    },
    proc_explosion_damage: {
        id: 'proc_explosion_damage',
        name: 'Bigger Boom',
        desc: '+15% explosion damage',
        icon: '💣',
        color: '#e65100',
        category: 'proc:explosive_strikes',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 2,
        requires: { procs: ['explosive_strikes'] },
        apply(mods, stacks) { mods.procs.explosive_strikes = mods.procs.explosive_strikes || {}; mods.procs.explosive_strikes.dmgMult = (mods.procs.explosive_strikes.dmgMult || 1) * 1.15; },
    },

    // ═══════════════════════════════════════════════════
    // PROC-SPECIFIC: CHAIN LIGHTNING
    // ═══════════════════════════════════════════════════

    proc_chain_targets: {
        id: 'proc_chain_targets',
        name: 'Longer Chain',
        desc: '+1 lightning jump',
        icon: '⚡',
        color: '#ffeb3b',
        category: 'proc:chain_lightning',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        requires: { procs: ['chain_lightning'] },
        apply(mods, stacks) { mods.procs.chain_lightning = mods.procs.chain_lightning || {}; mods.procs.chain_lightning.extraJumps = (mods.procs.chain_lightning.extraJumps || 0) + 1; },
    },
    proc_chain_chance: {
        id: 'proc_chain_chance',
        name: 'Conduction',
        desc: '+5% lightning chance (cap 25%)',
        icon: '⚡',
        color: '#fdd835',
        category: 'proc:chain_lightning',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 2,
        requires: { procs: ['chain_lightning'] },
        apply(mods, stacks) {
            mods.procs.chain_lightning = mods.procs.chain_lightning || {};
            const bonus = (mods.procs.chain_lightning.chanceBonus || 0) + 0.05;
            mods.procs.chain_lightning.chanceBonus = Math.min(bonus, 0.13); // cap +13% → total 25%
        },
    },
    proc_chain_range: {
        id: 'proc_chain_range',
        name: 'Extended Arc',
        desc: '+20% lightning range',
        icon: '⚡',
        color: '#fff176',
        category: 'proc:chain_lightning',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 2,
        requires: { procs: ['chain_lightning'] },
        apply(mods, stacks) { mods.procs.chain_lightning = mods.procs.chain_lightning || {}; mods.procs.chain_lightning.rangeMult = (mods.procs.chain_lightning.rangeMult || 1) * 1.20; },
    },

    // ═══════════════════════════════════════════════════
    // PROC-SPECIFIC: HEAVY CRIT
    // ═══════════════════════════════════════════════════

    proc_crit_damage: {
        id: 'proc_crit_damage',
        name: 'Devastating Crits',
        desc: '+20% crit bonus damage',
        icon: '💎',
        color: '#ff1744',
        category: 'proc:heavy_crit',
        rarity: NODE_RARITY_UNCOMMON,
        maxStacks: 2,
        requires: { procs: ['heavy_crit'] },
        apply(mods, stacks) { mods.procs.heavy_crit = mods.procs.heavy_crit || {}; mods.procs.heavy_crit.extraDmgMult = (mods.procs.heavy_crit.extraDmgMult || 1) * 1.20; },
    },
    proc_crit_chance_global: {
        id: 'proc_crit_chance_global',
        name: 'Keen Eye',
        desc: '+3% global crit chance',
        icon: '🎯',
        color: '#d50000',
        category: 'proc:heavy_crit',
        rarity: NODE_RARITY_COMMON,
        maxStacks: 3,
        requires: { procs: ['heavy_crit'] },
        apply(mods, stacks) { mods.procs.heavy_crit = mods.procs.heavy_crit || {}; mods.procs.heavy_crit.globalCritBonus = (mods.procs.heavy_crit.globalCritBonus || 0) + 0.03; },
    },

    // ═══════════════════════════════════════════════════
    // GLOBAL NODES (rare, category-agnostic)
    // ═══════════════════════════════════════════════════

    global_damage_boost: {
        id: 'global_damage_boost',
        name: 'Power Surge',
        desc: '+8% all damage',
        icon: '⚡',
        color: '#f44336',
        category: 'global',
        rarity: NODE_RARITY_RARE,
        maxStacks: 2,
        apply(mods, stacks) { mods.global.damageMult = (mods.global.damageMult || 1) * 1.08; },
    },
    global_cooldown_reduction: {
        id: 'global_cooldown_reduction',
        name: 'Temporal Flux',
        desc: '-8% all cooldowns',
        icon: '⏱️',
        color: '#7c4dff',
        category: 'global',
        rarity: NODE_RARITY_RARE,
        maxStacks: 2,
        apply(mods, stacks) { mods.global.cooldownMult = (mods.global.cooldownMult || 1) * 0.92; },
    },
};

/** All node IDs */
export const NODE_IDS = Object.keys(NODE_DEFINITIONS);

/** Get a node definition by ID */
export function getNode(id) {
    return NODE_DEFINITIONS[id] || null;
}

/** Get all nodes of a given category */
export function getNodesByCategory(category) {
    return NODE_IDS.filter(id => NODE_DEFINITIONS[id].category === category).map(id => NODE_DEFINITIONS[id]);
}

/** Get all base category names (without ability/proc prefixes) */
export const BASE_CATEGORIES = ['melee', 'dagger', 'dash', 'global'];

/**
 * Create a fresh combatMods object for a new run.
 * Game systems read these modifiers to adjust behavior.
 */
export function createDefaultCombatMods() {
    return {
        melee: {},
        dagger: {},
        dash: {},
        abilities: {},   // keyed by abilityId
        procs: {},        // keyed by procId
        global: {},
    };
}
