// ── Achievements List (40 Achievements) ─────────────────────
// Every achievement has:
//   id, name, icon, tier, description, type, target (if progress-based)
//
// Tiers: 'easy' | 'medium' | 'hard' | 'very_hard' | 'legendary'
// Types: 'milestone' | 'progress' | 'challenge'
//
// Actual check logic lives in achievementEngine.js which listens
// to events and evaluates against runtime + persisted state.
// ─────────────────────────────────────────────────────────────

import { RELIC_COUNT } from '../meta/relics.js';
import { getBiomeCount } from '../biomes.js';

export const ALL_PICKUP_TYPES = [
    'rage_shard', 'heart_fragment', 'piercing_shot', 'phase_shield',
    'speed_surge', 'swift_boots', 'crushing_blow', 'iron_skin',
];

export const ACHIEVEMENTS = [
    // ═══════════════════════════════════════════════
    // EASY (1–10)
    // ═══════════════════════════════════════════════
    {
        id: 'first_blood',
        name: 'First Blood',
        icon: '🗡️',
        tier: 'easy',
        description: 'Kill your first enemy.',
        type: 'milestone',
    },
    {
        id: 'reach_stage_5',
        name: 'Getting Started',
        icon: '🚪',
        tier: 'easy',
        description: 'Reach Stage 5.',
        type: 'milestone',
    },
    {
        id: 'reach_stage_8',
        name: 'Dungeon Apprentice',
        icon: '🏰',
        tier: 'easy',
        description: 'Reach Stage 8.',
        type: 'milestone',
    },
    {
        id: 'untouchable_1',
        name: 'Untouchable I',
        icon: '🛡️',
        tier: 'easy',
        description: 'Clear a room (≥10 enemies) without taking damage.',
        type: 'challenge',
    },
    {
        id: 'coins_50_run',
        name: 'Coin Collector',
        icon: '🪙',
        tier: 'easy',
        description: 'Collect 50 coins in a single run.',
        type: 'milestone',
    },
    {
        id: 'level_5_run',
        name: 'Level Up!',
        icon: '⬆️',
        tier: 'easy',
        description: 'Reach player level 5 in a run.',
        type: 'milestone',
    },
    {
        id: 'first_boss_down',
        name: 'First Boss Down',
        icon: '💀',
        tier: 'easy',
        description: 'Defeat your first boss.',
        type: 'milestone',
    },
    {
        id: 'unlock_1_relic',
        name: 'Treasure Hunter',
        icon: '🔮',
        tier: 'easy',
        description: 'Unlock your first relic.',
        type: 'milestone',
    },
    {
        id: 'buy_1_meta_upgrade',
        name: 'Meta Investor',
        icon: '📈',
        tier: 'easy',
        description: 'Purchase your first meta perk upgrade.',
        type: 'milestone',
    },
    {
        id: 'buy_meta_booster',
        name: 'Prepared',
        icon: '🎒',
        tier: 'easy',
        description: 'Purchase a meta booster before a run.',
        type: 'milestone',
    },

    // ═══════════════════════════════════════════════
    // MEDIUM (11–20)
    // ═══════════════════════════════════════════════
    {
        id: 'kills_100_total',
        name: 'Centurion',
        icon: '⚔️',
        tier: 'medium',
        description: 'Kill 100 enemies in total.',
        type: 'progress',
        target: 100,
    },
    {
        id: 'untouchable_2',
        name: 'Untouchable II',
        icon: '🛡️',
        tier: 'medium',
        description: 'Clear 2 qualifying rooms (≥10 enemies) in a row without taking damage.',
        type: 'challenge',
    },
    {
        id: 'coins_100_run',
        name: 'Wealthy',
        icon: '💰',
        tier: 'medium',
        description: 'Collect 100 coins in a single run.',
        type: 'milestone',
    },
    {
        id: 'reach_stage_15',
        name: 'Dungeon Adept',
        icon: '🏰',
        tier: 'medium',
        description: 'Reach Stage 15.',
        type: 'milestone',
    },
    {
        id: 'boss_kills_2_run',
        name: 'Double Boss Slayer',
        icon: '💀',
        tier: 'medium',
        description: 'Defeat 2 bosses in a single run.',
        type: 'milestone',
    },
    {
        id: 'collector_pickups',
        name: 'Collector',
        icon: '🧪',
        tier: 'medium',
        description: 'Collect every pickup type at least once.',
        type: 'progress',
        target: ALL_PICKUP_TYPES.length,
    },
    {
        id: 'unlock_3_relics',
        name: 'Relic Seeker',
        icon: '🔮',
        tier: 'medium',
        description: 'Unlock 3 relics.',
        type: 'progress',
        target: 3,
    },
    {
        id: 'meta_upgrades_10_total',
        name: 'Upgrade Addict',
        icon: '📊',
        tier: 'medium',
        description: 'Purchase 10 meta perk upgrades total.',
        type: 'progress',
        target: 10,
    },
    {
        id: 'boss_no_hit_1',
        name: 'Efficient',
        icon: '🎯',
        tier: 'medium',
        description: 'Defeat a boss without taking damage during the fight.',
        type: 'challenge',
    },
    {
        id: 'reach_stage_10_fast',
        name: 'Speed Runner I',
        icon: '⏱️',
        tier: 'medium',
        description: 'Reach Stage 10 within 10 minutes.',
        type: 'challenge',
        target: 10 * 60 * 1000,  // 10 min in ms
    },

    // ═══════════════════════════════════════════════
    // HARD (21–30)
    // ═══════════════════════════════════════════════
    {
        id: 'kills_500_total',
        name: 'Monster Hunter',
        icon: '⚔️',
        tier: 'hard',
        description: 'Kill 500 enemies in total.',
        type: 'progress',
        target: 500,
    },
    {
        id: 'untouchable_3',
        name: 'Untouchable III',
        icon: '🛡️',
        tier: 'hard',
        description: 'Clear 3 qualifying rooms (≥10 enemies) in a row without taking damage.',
        type: 'challenge',
    },
    {
        id: 'boss_kills_3_run',
        name: 'Boss Hunter',
        icon: '💀',
        tier: 'hard',
        description: 'Defeat 3 bosses in a single run.',
        type: 'milestone',
    },
    {
        id: 'reach_stage_20',
        name: 'Dungeon Master',
        icon: '👑',
        tier: 'hard',
        description: 'Reach Stage 20.',
        type: 'milestone',
    },
    {
        id: 'level_15_run',
        name: 'Full Build',
        icon: '⬆️',
        tier: 'hard',
        description: 'Reach player level 15 in a run.',
        type: 'milestone',
    },
    {
        id: 'coins_200_run',
        name: 'High Roller',
        icon: '💎',
        tier: 'hard',
        description: 'Collect 200 coins in a single run.',
        type: 'milestone',
    },
    {
        id: 'no_revive_to_stage_20',
        name: 'No Panic',
        icon: '😤',
        tier: 'hard',
        description: 'Reach Stage 20 without using a revive.',
        type: 'challenge',
    },
    {
        id: 'visit_all_biomes_run',
        name: 'Biome Traveler',
        icon: '🌍',
        tier: 'hard',
        description: 'Visit every biome in a single run.',
        type: 'challenge',
        target: getBiomeCount(),
    },
    {
        id: 'trap_dancer_5',
        name: 'Trap Dancer',
        icon: '💃',
        tier: 'hard',
        description: 'Clear 5 trap rooms (≥10 enemies) without taking any damage.',
        type: 'progress',
        target: 5,
    },
    {
        id: 'minimalist_stage_20',
        name: 'Minimalist',
        icon: '🧘',
        tier: 'hard',
        description: 'Reach Stage 20 without using a meta booster.',
        type: 'challenge',
    },

    // ═══════════════════════════════════════════════
    // VERY HARD (31–39)
    // ═══════════════════════════════════════════════
    {
        id: 'kills_1000_total',
        name: 'Legend in the Making',
        icon: '⚔️',
        tier: 'very_hard',
        description: 'Kill 1000 enemies in total.',
        type: 'progress',
        target: 1000,
    },
    {
        id: 'untouchable_5',
        name: 'Untouchable IV',
        icon: '🛡️',
        tier: 'very_hard',
        description: 'Clear 5 qualifying rooms (≥10 enemies) in a row without taking damage.',
        type: 'challenge',
    },
    {
        id: 'boss_no_hit_3_streak',
        name: 'Boss Rush',
        icon: '🎯',
        tier: 'very_hard',
        description: 'Defeat 3 bosses in a row without taking damage during the fights.',
        type: 'challenge',
    },
    {
        id: 'reach_stage_30',
        name: 'Dungeon Overlord',
        icon: '👑',
        tier: 'very_hard',
        description: 'Reach Stage 30.',
        type: 'milestone',
    },
    {
        id: 'no_damage_to_stage_10',
        name: 'Perfect Run I',
        icon: '✨',
        tier: 'very_hard',
        description: 'Reach Stage 10 without taking any damage.',
        type: 'challenge',
    },
    {
        id: 'unlock_all_relics',
        name: 'Relic Master',
        icon: '🔮',
        tier: 'very_hard',
        description: 'Unlock every relic.',
        type: 'progress',
        target: RELIC_COUNT,
    },
    {
        id: 'max_one_meta_perk',
        name: 'Meta Maxer',
        icon: '🏅',
        tier: 'very_hard',
        description: 'Max out any meta perk to level 10.',
        type: 'milestone',
    },
    {
        id: 'shopaholic_10_run',
        name: 'Shopaholic',
        icon: '🛒',
        tier: 'very_hard',
        description: 'Buy 10 in-run shop items in a single run.',
        type: 'milestone',
    },
    {
        id: 'boss_kills_10_total',
        name: 'Seasoned Slayer',
        icon: '💀',
        tier: 'very_hard',
        description: 'Defeat 10 bosses in total.',
        type: 'progress',
        target: 10,
    },

    // ═══════════════════════════════════════════════
    // LEGENDARY (40)
    // ═══════════════════════════════════════════════
    {
        id: 'true_dungeon_god',
        name: 'True Dungeon God',
        icon: '🌟',
        tier: 'legendary',
        description: 'Stage ≥30, no booster, no revive, 3+ bosses no-hit, ≤3 damage events.',
        type: 'challenge',
    },
];

/** Quick lookup by ID */
export const ACHIEVEMENTS_MAP = {};
for (const a of ACHIEVEMENTS) {
    ACHIEVEMENTS_MAP[a.id] = a;
}

/** Total count */
export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;

/** Tier display info */
export const TIER_INFO = {
    easy:      { label: 'Easy',      color: '#4caf50', order: 0 },
    medium:    { label: 'Medium',    color: '#ffc107', order: 1 },
    hard:      { label: 'Hard',      color: '#ff9800', order: 2 },
    very_hard: { label: 'Very Hard', color: '#f44336', order: 3 },
    legendary: { label: 'Legendary', color: '#e040fb', order: 4 },
};

/** Tiers in display order */
export const TIER_ORDER = ['easy', 'medium', 'hard', 'very_hard', 'legendary'];
