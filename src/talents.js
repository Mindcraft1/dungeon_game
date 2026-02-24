// ── Talent Tree System ──
// Per-run talent tree with 3 branches × 5 nodes × 3 ranks.
// Points are earned every 2 levels and reset each run.

// ── Branch definitions ──
export const BRANCH_OFFENSE  = 'offense';
export const BRANCH_DEFENSE  = 'defense';
export const BRANCH_UTILITY  = 'utility';

export const BRANCH_META = {
    [BRANCH_OFFENSE]: { name: 'Offense',  icon: '⚔',  color: '#f44336' },
    [BRANCH_DEFENSE]: { name: 'Defense',  icon: '🛡',  color: '#2196f3' },
    [BRANCH_UTILITY]: { name: 'Utility',  icon: '⚡', color: '#4caf50' },
};

export const BRANCH_ORDER = [BRANCH_OFFENSE, BRANCH_DEFENSE, BRANCH_UTILITY];

// ── Node definitions ──
// Each node: { id, branch, tier (0-4), name, icon, maxRank, desc, perRank }
// perRank is the value added per rank (e.g. 0.05 = +5%)
export const TALENT_NODES = [
    // ── Offense Branch ──
    { id: 'sharp_edge',    branch: BRANCH_OFFENSE, tier: 0, name: 'Sharp Edge',    icon: '🗡️', maxRank: 3, desc: '+5% melee damage per rank',                       perRank: 0.05 },
    { id: 'quick_slash',   branch: BRANCH_OFFENSE, tier: 1, name: 'Quick Slash',   icon: '⚡', maxRank: 3, desc: '-5% attack cooldown per rank',                     perRank: 0.05 },
    { id: 'wide_swing',    branch: BRANCH_OFFENSE, tier: 2, name: 'Wide Swing',    icon: '🌀', maxRank: 3, desc: '+8% attack arc per rank',                          perRank: 0.08 },
    { id: 'critical_eye',  branch: BRANCH_OFFENSE, tier: 3, name: 'Critical Eye',  icon: '🎯', maxRank: 3, desc: '+3% crit chance per rank',                         perRank: 0.03 },
    { id: 'executioner',   branch: BRANCH_OFFENSE, tier: 4, name: 'Executioner',   icon: '💀', maxRank: 3, desc: '+10% damage to enemies below 30% HP per rank',     perRank: 0.10 },

    // ── Defense Branch ──
    { id: 'tough_hide',    branch: BRANCH_DEFENSE, tier: 0, name: 'Tough Hide',    icon: '🛡️', maxRank: 3, desc: '+8% max HP per rank',                              perRank: 0.08 },
    { id: 'quick_recovery',branch: BRANCH_DEFENSE, tier: 1, name: 'Quick Recovery', icon: '💨', maxRank: 3, desc: '-8% invuln cooldown per rank',                     perRank: 0.08 },
    { id: 'iron_will',     branch: BRANCH_DEFENSE, tier: 2, name: 'Iron Will',     icon: '🪨', maxRank: 3, desc: '-3% damage taken per rank',                        perRank: 0.03 },
    { id: 'second_wind',   branch: BRANCH_DEFENSE, tier: 3, name: 'Second Wind',   icon: '💚', maxRank: 3, desc: 'Heal 2% max HP per room cleared per rank',         perRank: 0.02 },
    { id: 'endurance',     branch: BRANCH_DEFENSE, tier: 4, name: 'Endurance',     icon: '⏳', maxRank: 3, desc: '+10% buff duration per rank',                      perRank: 0.10 },

    // ── Utility Branch ──
    { id: 'fleet_foot',    branch: BRANCH_UTILITY, tier: 0, name: 'Fleet Foot',    icon: '👟', maxRank: 3, desc: '+3% move speed per rank',                          perRank: 0.03 },
    { id: 'dash_mastery',  branch: BRANCH_UTILITY, tier: 1, name: 'Dash Mastery',  icon: '💫', maxRank: 3, desc: '-8% dash cooldown per rank',                       perRank: 0.08 },
    { id: 'xp_siphon',     branch: BRANCH_UTILITY, tier: 2, name: 'XP Siphon',     icon: '✨', maxRank: 3, desc: '+5% XP gain per rank',                             perRank: 0.05 },
    { id: 'pickup_magnet', branch: BRANCH_UTILITY, tier: 3, name: 'Pickup Magnet', icon: '🧲', maxRank: 3, desc: '+15% pickup attraction radius per rank',           perRank: 0.15 },
    { id: 'fortune',       branch: BRANCH_UTILITY, tier: 4, name: 'Fortune',       icon: '🍀', maxRank: 3, desc: '+5% coin drop rate per rank',                      perRank: 0.05 },
];

// Lookup helpers
const _nodeMap = new Map(TALENT_NODES.map(n => [n.id, n]));
export function getNodeDef(id) { return _nodeMap.get(id) || null; }
export function getNodesForBranch(branch) { return TALENT_NODES.filter(n => n.branch === branch).sort((a, b) => a.tier - b.tier); }

// ── Talent State (per-run) ──
// Managed as a plain object: { ranks: { nodeId: number }, points: number }

/** Create a fresh talent state for a new run. */
export function createTalentState() {
    const ranks = {};
    for (const n of TALENT_NODES) ranks[n.id] = 0;
    return { ranks, points: 0 };
}

/** Get total points spent across all nodes. */
export function getSpentPoints(state) {
    let sum = 0;
    for (const id in state.ranks) sum += state.ranks[id];
    return sum;
}

/** Check if a node can be upgraded (has points, not maxed, tier prerequisite met). */
export function canUpgradeNode(state, nodeId) {
    if (state.points <= 0) return false;
    const def = _nodeMap.get(nodeId);
    if (!def) return false;
    if (state.ranks[nodeId] >= def.maxRank) return false;

    // Tier gating: need at least 1 rank in the previous tier node of the same branch
    if (def.tier > 0) {
        const prevNode = TALENT_NODES.find(n => n.branch === def.branch && n.tier === def.tier - 1);
        if (prevNode && state.ranks[prevNode.id] <= 0) return false;
    }
    return true;
}

/** Spend a point to upgrade a node. Returns true on success. */
export function upgradeNode(state, nodeId) {
    if (!canUpgradeNode(state, nodeId)) return false;
    state.ranks[nodeId]++;
    state.points--;
    return true;
}

/**
 * Compute talent multipliers from the current state.
 * Returns an object with all derived modifiers that player.js / game.js can read.
 */
export function computeTalentMods(state) {
    const r = state.ranks;
    return {
        // Offense
        meleeDamageMult:     1 + r.sharp_edge    * 0.05,   // +5% per rank
        attackCooldownMult:  1 - r.quick_slash    * 0.05,   // -5% per rank
        attackArcMult:       1 + r.wide_swing     * 0.08,   // +8% per rank
        critChanceBonus:         r.critical_eye   * 0.03,   // +3% per rank
        executionerMult:     1 + r.executioner    * 0.10,   // +10% per rank (to enemies < 30% HP)

        // Defense
        maxHpMult:           1 + r.tough_hide     * 0.08,   // +8% per rank
        invulnCooldownMult:  1 - r.quick_recovery * 0.08,   // -8% per rank
        damageTakenMult:     1 - r.iron_will      * 0.03,   // -3% per rank
        roomClearHealPct:        r.second_wind    * 0.02,   // +2% per rank
        buffDurationMult:    1 + r.endurance      * 0.10,   // +10% per rank

        // Utility
        moveSpeedMult:       1 + r.fleet_foot     * 0.03,   // +3% per rank
        dashCooldownMult:    1 - r.dash_mastery   * 0.08,   // -8% per rank
        xpGainMult:          1 + r.xp_siphon      * 0.05,   // +5% per rank
        pickupRadiusMult:    1 + r.pickup_magnet  * 0.15,   // +15% per rank
        coinDropRateMult:    1 + r.fortune        * 0.05,   // +5% per rank
    };
}

/** Calculate how many talent points have been earned for a given player level.
 *  1 point every 2 levels (level 2, 4, 6, ...) */
export function talentPointsForLevel(playerLevel) {
    return Math.floor(playerLevel / 2);
}
