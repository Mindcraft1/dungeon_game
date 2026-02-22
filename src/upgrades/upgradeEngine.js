// ── Upgrade Engine ──────────────────────────────────────────
// Manages in-run node acquisition, eligibility checks,
// stack limits, and combat modifier application.
// ─────────────────────────────────────────────────────────────

import { NODE_DEFINITIONS, NODE_IDS, getNode, createDefaultCombatMods } from './nodes.js';
import { NODE_RARITY_COMMON, NODE_RARITY_UNCOMMON, NODE_RARITY_RARE } from '../constants.js';
import * as MetaStore from '../meta/metaStore.js';

// ── Rarity weights for random selection ──
const RARITY_WEIGHTS = {
    [NODE_RARITY_COMMON]:   50,
    [NODE_RARITY_UNCOMMON]: 35,
    [NODE_RARITY_RARE]:     15,
};

// ── Per-Run State ──

let _appliedNodes = {};     // Record<nodeId, number> — stacks applied this run
let _upgradeHistory = [];   // Array<{ source, nodeId, ts }>
let _combatMods = createDefaultCombatMods();

/**
 * Reset upgrade engine state at the start of a new run.
 */
export function resetForRun() {
    _appliedNodes = {};
    _upgradeHistory = [];
    _combatMods = createDefaultCombatMods();
}

/**
 * Get the current combat modifiers object (read by game systems).
 * @returns {ReturnType<typeof createDefaultCombatMods>}
 */
export function getCombatMods() {
    return _combatMods;
}

/**
 * Get currently applied nodes and their stack counts.
 * @returns {Record<string, number>}
 */
export function getAppliedNodes() {
    return { ..._appliedNodes };
}

/**
 * Get upgrade history for this run.
 */
export function getUpgradeHistory() {
    return [..._upgradeHistory];
}

/**
 * Check if a specific node can still be applied (not at max stacks).
 */
export function canApplyNode(nodeId) {
    const def = getNode(nodeId);
    if (!def) return false;
    const currentStacks = _appliedNodes[nodeId] || 0;
    return currentStacks < def.maxStacks;
}

/**
 * Check if a node is eligible given the current run context.
 * @param {string} nodeId
 * @param {object} context - { equippedAbilities: string[], equippedProcs: string[], stage: number }
 * @returns {boolean}
 */
export function isNodeEligible(nodeId, context) {
    const def = getNode(nodeId);
    if (!def) return false;

    // Stack cap check
    if (!canApplyNode(nodeId)) return false;

    // Check meta unlock (some nodes are always available = base nodes)
    if (def.requiresUnlocked !== false) {
        const meta = MetaStore.getState();
        if (meta.unlockedNodes && !meta.unlockedNodes[nodeId]) {
            // Check if it's a base node (common melee/dagger/dash/global without requires)
            if (!_isBaseNode(def)) return false;
        }
    }

    // Check ability/proc requirements
    if (def.requires) {
        if (def.requires.abilities) {
            const equipped = context.equippedAbilities || [];
            if (!def.requires.abilities.some(id => equipped.includes(id))) return false;
        }
        if (def.requires.procs) {
            const equipped = context.equippedProcs || [];
            if (!def.requires.procs.some(id => equipped.includes(id))) return false;
        }
        if (def.requires.stageMin && (context.stage || 1) < def.requires.stageMin) return false;
        if (def.requires.nodes) {
            for (const reqNode of def.requires.nodes) {
                if (!_appliedNodes[reqNode]) return false;
            }
        }
    }

    return true;
}

/**
 * Base nodes are common/uncommon melee/dagger/dash/global nodes without special unlock requirements.
 * They are always available in the upgrade pool even without being explicitly unlocked.
 * Ability-specific and proc-specific nodes are also auto-available when the player
 * has the corresponding ability/proc equipped (they're gated by that requirement instead).
 */
function _isBaseNode(def) {
    if (def.category === 'global') return true;
    if (['melee', 'dagger', 'dash'].includes(def.category)) {
        // base: common rarity without requires
        return def.rarity === NODE_RARITY_COMMON && !def.requires;
    }
    // Ability-specific and proc-specific nodes are "base" — they're gated
    // by the equipped ability/proc requirement, not by meta unlock
    if (def.category.startsWith('ability:') || def.category.startsWith('proc:')) {
        return true;
    }
    return false;
}

/**
 * Apply a node. Increments stack, records history, rebuilds combat mods.
 * @param {string} nodeId
 * @param {string} source - 'levelup' | 'event' | 'shop' | 'forge'
 * @returns {boolean} true if applied successfully
 */
export function applyNode(nodeId, source = 'levelup') {
    const def = getNode(nodeId);
    if (!def) return false;

    const currentStacks = _appliedNodes[nodeId] || 0;
    if (currentStacks >= def.maxStacks) return false;

    _appliedNodes[nodeId] = currentStacks + 1;
    _upgradeHistory.push({ source, nodeId, ts: Date.now() });

    // Rebuild all combat mods from scratch (safer than incremental)
    _rebuildCombatMods();
    return true;
}

/**
 * Remove a node (used by Library event for node replacement).
 * @param {string} nodeId
 * @returns {boolean}
 */
export function removeNode(nodeId) {
    if (!_appliedNodes[nodeId] || _appliedNodes[nodeId] <= 0) return false;
    _appliedNodes[nodeId]--;
    if (_appliedNodes[nodeId] <= 0) delete _appliedNodes[nodeId];
    _rebuildCombatMods();
    return true;
}

/**
 * Rebuild combat mods from scratch based on all applied nodes.
 * This is called after every apply/remove to keep mods consistent.
 */
function _rebuildCombatMods() {
    _combatMods = createDefaultCombatMods();
    for (const [nodeId, stacks] of Object.entries(_appliedNodes)) {
        const def = getNode(nodeId);
        if (!def || stacks <= 0) continue;
        // Apply once for each stack
        for (let i = 0; i < stacks; i++) {
            def.apply(_combatMods, i + 1);
        }
    }
}

/**
 * Get eligible nodes for a given pool type and context.
 * @param {string} poolType - 'melee' | 'dagger' | 'dash' | 'ability' | 'proc' | 'global' | 'all'
 * @param {object} context - { equippedAbilities, equippedProcs, stage }
 * @returns {object[]} array of node definitions
 */
export function getEligibleNodes(poolType, context) {
    return NODE_IDS
        .map(id => NODE_DEFINITIONS[id])
        .filter(def => {
            // Pool type filter
            if (poolType !== 'all') {
                if (poolType === 'ability') {
                    if (!def.category.startsWith('ability:')) return false;
                } else if (poolType === 'proc') {
                    if (!def.category.startsWith('proc:')) return false;
                } else {
                    if (def.category !== poolType) return false;
                }
            }
            return isNodeEligible(def.id, context);
        });
}

/**
 * Pick N random nodes from eligible pool, weighted by rarity.
 * @param {string} poolType
 * @param {object} context
 * @param {number} count
 * @returns {object[]} node definitions (may be fewer than count if pool is small)
 */
export function pickRandomNodes(poolType, context, count = 3) {
    const eligible = getEligibleNodes(poolType, context);
    if (eligible.length === 0) return [];
    if (eligible.length <= count) return _shuffle(eligible);

    // Weighted random selection without replacement
    const selected = [];
    const remaining = [...eligible];

    for (let i = 0; i < count && remaining.length > 0; i++) {
        const totalWeight = remaining.reduce((sum, def) => sum + (RARITY_WEIGHTS[def.rarity] || 30), 0);
        let roll = Math.random() * totalWeight;
        let picked = remaining.length - 1;

        for (let j = 0; j < remaining.length; j++) {
            roll -= (RARITY_WEIGHTS[remaining[j].rarity] || 30);
            if (roll <= 0) { picked = j; break; }
        }

        selected.push(remaining[picked]);
        remaining.splice(picked, 1);
    }

    return selected;
}

/**
 * Build level-up choices: 2 general nodes + 1 synergy node (if applicable) + base stat fallbacks.
 * @param {object} context - { equippedAbilities, equippedProcs, stage }
 * @param {object} player - player object for stat display
 * @returns {Array<{ type: 'node'|'base', id, label, color, icon, nodeId? }>}
 */
export function buildLevelUpChoices(context, player) {
    const choices = [];

    // 1) Two general nodes from melee/dagger/dash/global pools
    const generalPools = ['melee', 'dagger', 'dash', 'global'];
    const allGeneral = [];
    for (const pool of generalPools) {
        allGeneral.push(...getEligibleNodes(pool, context));
    }

    const generalPicks = _weightedPickN(allGeneral, 2);
    for (const def of generalPicks) {
        choices.push({
            type: 'node',
            id: def.id,
            nodeId: def.id,
            label: `${def.icon} ${def.name}: ${def.desc}`,
            color: def.color,
        });
    }

    // 2) One synergy node (ability or proc specific) if available
    const synergyPools = [];
    for (const abId of (context.equippedAbilities || [])) {
        synergyPools.push(...getEligibleNodes('all', context).filter(d => d.category === `ability:${abId}`));
    }
    for (const prId of (context.equippedProcs || [])) {
        synergyPools.push(...getEligibleNodes('all', context).filter(d => d.category === `proc:${prId}`));
    }

    // Remove any already picked
    const pickedIds = new Set(choices.map(c => c.id));
    const synergyFiltered = synergyPools.filter(d => !pickedIds.has(d.id));

    if (synergyFiltered.length > 0) {
        const synPick = _weightedPickN(synergyFiltered, 1);
        for (const def of synPick) {
            choices.push({
                type: 'node',
                id: def.id,
                nodeId: def.id,
                label: `${def.icon} ${def.name}: ${def.desc}`,
                color: def.color,
            });
        }
    }

    // 3) Always offer at least one base stat as fallback (if fewer than 3 choices)
    // Also include a base stat option always so player has a safe pick
    if (choices.length < 3) {
        const baseOptions = _getBaseStatChoices(player);
        while (choices.length < 3 && baseOptions.length > 0) {
            choices.push(baseOptions.shift());
        }
    }

    // If we got 3+ node choices, still add one base stat as a 4th option
    if (choices.length === 3 && choices.every(c => c.type === 'node')) {
        const baseOptions = _getBaseStatChoices(player);
        if (baseOptions.length > 0) {
            // Pick a random base stat
            choices.push(baseOptions[Math.floor(Math.random() * baseOptions.length)]);
        }
    }

    return choices;
}

function _getBaseStatChoices(player) {
    const UPGRADE_HP = 25, UPGRADE_SPEED = 15, UPGRADE_DAMAGE = 8;
    return [
        { type: 'base', id: 'hp', label: `+${UPGRADE_HP} Max HP (heal +${Math.floor(UPGRADE_HP * 0.6)})`, color: '#4caf50', icon: '❤️' },
        { type: 'base', id: 'speed', label: `+${UPGRADE_SPEED} Speed`, color: '#2196f3', icon: '👢' },
        { type: 'base', id: 'damage', label: `+${UPGRADE_DAMAGE} Damage`, color: '#f44336', icon: '⚔️' },
    ];
}

/**
 * Build choices for Ancient Forge event (pick from specific category).
 */
export function buildForgeChoices(category, context, count = 3) {
    return pickRandomNodes(category, context, count);
}

/**
 * Get all categories available for forge selection based on loadout.
 * @param {object} context
 * @returns {Array<{id: string, label: string, color: string}>}
 */
export function getForgeCategories(context) {
    const cats = [
        { id: 'melee', label: '⚔️ Melee', color: '#f44336' },
        { id: 'dagger', label: '🗡️ Dagger', color: '#4fc3f7' },
        { id: 'dash', label: '💨 Dash', color: '#2196f3' },
    ];

    for (const abId of (context.equippedAbilities || [])) {
        const abDef = NODE_IDS.find(nid => NODE_DEFINITIONS[nid].category === `ability:${abId}`);
        if (abDef) {
            const def = NODE_DEFINITIONS[abDef];
            cats.push({ id: `ability:${abId}`, label: `${def.icon} ${abId.replace(/_/g, ' ')}`, color: def.color });
        }
    }

    for (const prId of (context.equippedProcs || [])) {
        const prDef = NODE_IDS.find(nid => NODE_DEFINITIONS[nid].category === `proc:${prId}`);
        if (prDef) {
            const def = NODE_DEFINITIONS[prDef];
            cats.push({ id: `proc:${prId}`, label: `${def.icon} ${prId.replace(/_/g, ' ')}`, color: def.color });
        }
    }

    return cats;
}

// ── Helpers ──

function _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function _weightedPickN(pool, n) {
    if (pool.length <= n) return _shuffle(pool);
    const selected = [];
    const remaining = [...pool];
    for (let i = 0; i < n && remaining.length > 0; i++) {
        const totalWeight = remaining.reduce((sum, def) => sum + (RARITY_WEIGHTS[def.rarity] || 30), 0);
        let roll = Math.random() * totalWeight;
        let picked = remaining.length - 1;
        for (let j = 0; j < remaining.length; j++) {
            roll -= (RARITY_WEIGHTS[remaining[j].rarity] || 30);
            if (roll <= 0) { picked = j; break; }
        }
        selected.push(remaining[picked]);
        remaining.splice(picked, 1);
    }
    return selected;
}
