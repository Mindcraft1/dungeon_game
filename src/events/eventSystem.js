// ── Event System ────────────────────────────────────────────
// Random in-run events that serve as "build benders".
// Events appear from stage 6+, 12% per non-boss room,
// never back-to-back, and never on boss rooms.
//
// Event types: Forge, Shrine, Library, Chaos, Trial, Trader
// ─────────────────────────────────────────────────────────────

import {
    EVENT_MIN_STAGE, EVENT_CHANCE, CANVAS_WIDTH, CANVAS_HEIGHT,
    EVENT_FORGE, EVENT_SHRINE, EVENT_LIBRARY, EVENT_CHAOS, EVENT_TRIAL, EVENT_TRADER,
    BOSS_STAGE_INTERVAL,
} from '../constants.js';
import * as UpgradeEngine from '../upgrades/upgradeEngine.js';

// ── Event Definitions ──

export const EVENT_DEFINITIONS = {
    [EVENT_FORGE]: {
        id: EVENT_FORGE,
        name: 'Ancient Forge',
        icon: '🔨',
        color: '#ff9800',
        desc: 'Choose a category, then pick an upgrade.',
    },
    [EVENT_SHRINE]: {
        id: EVENT_SHRINE,
        name: 'Ritual Shrine',
        icon: '🏛️',
        color: '#9c27b0',
        desc: 'Power at a cost... or play it safe.',
    },
    [EVENT_LIBRARY]: {
        id: EVENT_LIBRARY,
        name: 'Mystic Library',
        icon: '📚',
        color: '#3f51b5',
        desc: 'Replace one upgrade with a new one.',
    },
    [EVENT_CHAOS]: {
        id: EVENT_CHAOS,
        name: 'Chaos Altar',
        icon: '🎲',
        color: '#e91e63',
        desc: 'Gamble for power.',
    },
    [EVENT_TRIAL]: {
        id: EVENT_TRIAL,
        name: 'Trial Room',
        icon: '⚔️',
        color: '#f44336',
        desc: 'Survive the challenge for a Forge Token.',
    },
    [EVENT_TRADER]: {
        id: EVENT_TRADER,
        name: 'Wandering Trader',
        icon: '🧳',
        color: '#ffd700',
        desc: 'Trade coins for upgrade tokens.',
    },
};

const EVENT_TYPES = Object.keys(EVENT_DEFINITIONS);

// ── Per-Run State ──

let _lastEventStage = -10;  // stage of last event (prevent back-to-back)
let _eventsThisRun = 0;

/**
 * Reset event state for a new run.
 */
export function resetForRun() {
    _lastEventStage = -10;
    _eventsThisRun = 0;
}

/**
 * Check if an event should spawn in the current room.
 * @param {number} stage - current stage
 * @returns {string|null} event type ID or null
 */
export function rollForEvent(stage) {
    // Conditions: stage >= 6, not a boss room, not back-to-back
    if (stage < EVENT_MIN_STAGE) return null;
    if (stage % BOSS_STAGE_INTERVAL === 0) return null;  // boss room
    if (stage <= _lastEventStage + 1) return null;         // prevent back-to-back

    if (Math.random() > EVENT_CHANCE) return null;

    // Pick a random event type
    const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    _lastEventStage = stage;
    _eventsThisRun++;

    return eventType;
}

/**
 * Create event state for a specific event type.
 * Returns the initial state object that game.js will manage.
 */
export function createEventState(eventType, context) {
    const def = EVENT_DEFINITIONS[eventType];
    if (!def) return null;

    const base = {
        type: eventType,
        def,
        phase: 'intro',    // 'intro' → 'choosing' → 'result' → 'done'
        cursor: 0,
        choices: [],
        result: null,
    };

    switch (eventType) {
        case EVENT_FORGE:
            base.phase = 'category';  // first choose category, then node
            base.categories = UpgradeEngine.getForgeCategories(context);
            break;

        case EVENT_SHRINE: {
            // Offer: strong (rare) + curse, medium (common) no curse, skip
            const rareNodes = UpgradeEngine.pickRandomNodes('all', context, 1)
                .filter(n => n.rarity === 'rare' || n.rarity === 'uncommon');
            const commonNodes = UpgradeEngine.pickRandomNodes('all', context, 1)
                .filter(n => n.rarity === 'common');

            base.choices = [];
            if (rareNodes.length > 0) {
                base.choices.push({
                    label: `${rareNodes[0].icon} ${rareNodes[0].name} (${rareNodes[0].desc}) — Curse: -10% Max HP`,
                    nodeId: rareNodes[0].id,
                    color: rareNodes[0].color,
                    curse: 'hp_reduce',
                    curseAmount: 0.10,
                });
            }
            if (commonNodes.length > 0) {
                base.choices.push({
                    label: `${commonNodes[0].icon} ${commonNodes[0].name} (${commonNodes[0].desc})`,
                    nodeId: commonNodes[0].id,
                    color: commonNodes[0].color,
                    curse: null,
                });
            }
            base.choices.push({
                label: 'Skip — no effect',
                nodeId: null,
                color: '#666',
                curse: null,
            });
            base.phase = 'choosing';
            break;
        }

        case EVENT_LIBRARY: {
            // Show currently applied nodes that could be replaced
            const applied = UpgradeEngine.getAppliedNodes();
            const appliedList = Object.keys(applied).map(id => {
                const nodeDef = NODE_DEFINITIONS_LOOKUP(id);
                return nodeDef ? { id, name: nodeDef.name, icon: nodeDef.icon, color: nodeDef.color, category: nodeDef.category } : null;
            }).filter(Boolean);

            base.appliedNodes = appliedList;
            base.phase = appliedList.length > 0 ? 'select_remove' : 'empty';
            base.replacementChoices = [];
            break;
        }

        case EVENT_CHAOS: {
            // Option 1: random upgrade
            // Option 2: -15% HP → choose 1 of 3 rare
            // Option 3: skip
            const randomNode = UpgradeEngine.pickRandomNodes('all', context, 1);
            const rareChoices = UpgradeEngine.pickRandomNodes('all', context, 3)
                .filter(n => n.rarity !== 'common');

            base.choices = [];
            if (randomNode.length > 0) {
                base.choices.push({
                    label: `🎲 Random: ${randomNode[0].icon} ${randomNode[0].name}`,
                    nodeId: randomNode[0].id,
                    color: randomNode[0].color,
                    hpCost: 0,
                });
            }
            base.choices.push({
                label: '💀 Sacrifice 15% HP → Choose rare upgrade',
                nodeId: null,
                color: '#e91e63',
                hpCost: 0.15,
                rareChoices: rareChoices.map(n => ({ id: n.id, name: n.name, icon: n.icon, color: n.color, desc: n.desc })),
            });
            base.choices.push({
                label: 'Skip',
                nodeId: null,
                color: '#666',
                hpCost: 0,
            });
            base.phase = 'choosing';
            break;
        }

        case EVENT_TRIAL:
            // Trial: show intro first, then game.js handles the timed challenge
            base.phase = 'choosing';
            base.timeLimit = 15000;  // 15s survive timer
            base.timeRemaining = 15000;
            base.succeeded = false;
            base.choices = [
                { label: '⚔️ Accept the Trial — Survive 15s for a Forge Token', reward: 'start_trial', color: '#f44336' },
                { label: 'Decline — Skip this room', reward: null, color: '#666' },
            ];
            break;

        case EVENT_TRADER: {
            // Trade coins for tokens
            base.choices = [
                { label: '🔨 Forge Token (18 coins) — Pick an upgrade', cost: 18, reward: 'forge_token', color: '#ff9800' },
                { label: '🔄 Reroll Token (10 coins) — Reroll next level-up', cost: 10, reward: 'reroll_token', color: '#2196f3' },
                { label: 'Leave', cost: 0, reward: null, color: '#666' },
            ];
            base.phase = 'choosing';
            break;
        }
    }

    return base;
}

// Direct lookup for node definitions (no circular dependency issue)
import { getNode as _getNodeFromId } from '../upgrades/nodes.js';

function NODE_DEFINITIONS_LOOKUP(id) {
    return _getNodeFromId(id);
}

/**
 * Render the event overlay UI.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} eventState - current event state
 * @param {number} coins - player's current coins (for trader)
 */
export function renderEvent(ctx, eventState) {
    if (!eventState) return;

    const { def, phase, cursor, choices } = eventState;

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.80)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Event panel
    const panelW = 560;
    const panelH = phase === 'empty' ? 200 : 380;
    const px = (CANVAS_WIDTH - panelW) / 2;
    const py = (CANVAS_HEIGHT - panelH) / 2;

    ctx.fillStyle = 'rgba(15, 15, 25, 0.97)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, panelW, panelH);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = def.color;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${def.icon}  ${def.name}`, CANVAS_WIDTH / 2, py + 36);

    // Description
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.fillText(def.desc, CANVAS_WIDTH / 2, py + 58);

    // Phase-specific rendering
    if (phase === 'empty') {
        ctx.fillStyle = '#666';
        ctx.font = '14px monospace';
        ctx.fillText('Nothing to modify.', CANVAS_WIDTH / 2, py + 100);
        ctx.fillText('Press ENTER to continue', CANVAS_WIDTH / 2, py + 130);
    } else if (phase === 'category') {
        // Forge: show category choices
        const cats = eventState.categories || [];
        ctx.fillStyle = '#ccc';
        ctx.font = '13px monospace';
        ctx.fillText('Choose a category to upgrade:', CANVAS_WIDTH / 2, py + 80);

        const startY = py + 110;
        const rowH = 36;
        cats.forEach((cat, i) => {
            const y = startY + i * rowH;
            const selected = i === cursor;

            if (selected) {
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(px + 20, y - 14, panelW - 40, rowH - 4);
                ctx.strokeStyle = cat.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 20, y - 14, panelW - 40, rowH - 4);
            }

            ctx.fillStyle = selected ? cat.color : '#888';
            ctx.font = selected ? 'bold 14px monospace' : '13px monospace';
            ctx.fillText(cat.label, CANVAS_WIDTH / 2, y + 4);
        });
    } else if (phase === 'choosing' || phase === 'forge_nodes') {
        // Show choices
        const items = phase === 'forge_nodes' ? eventState.forgeNodeChoices : choices;
        const startY = py + 90;
        const rowH = 42;

        (items || []).forEach((choice, i) => {
            const y = startY + i * rowH;
            const selected = i === cursor;

            if (selected) {
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(px + 16, y - 16, panelW - 32, rowH - 4);
                ctx.strokeStyle = choice.color || '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 16, y - 16, panelW - 32, rowH - 4);
            }

            if (selected) {
                ctx.fillStyle = choice.color || '#fff';
                ctx.font = 'bold 13px monospace';
            } else {
                ctx.fillStyle = '#888';
                ctx.font = '12px monospace';
            }

            const label = choice.label || `${choice.icon} ${choice.name}: ${choice.desc}`;
            ctx.fillText(label, CANVAS_WIDTH / 2, y + 2);
        });
    } else if (phase === 'select_remove') {
        // Library: show applied nodes to remove
        ctx.fillStyle = '#ccc';
        ctx.font = '13px monospace';
        ctx.fillText('Choose an upgrade to replace:', CANVAS_WIDTH / 2, py + 80);

        const nodes = eventState.appliedNodes || [];
        const startY = py + 110;
        const rowH = 34;
        nodes.forEach((node, i) => {
            const y = startY + i * rowH;
            const selected = i === cursor;
            if (selected) {
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(px + 20, y - 14, panelW - 40, rowH - 4);
                ctx.strokeStyle = node.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 20, y - 14, panelW - 40, rowH - 4);
            }
            ctx.fillStyle = selected ? node.color : '#888';
            ctx.font = selected ? 'bold 13px monospace' : '12px monospace';
            ctx.fillText(`${node.icon} ${node.name}`, CANVAS_WIDTH / 2, y + 4);
        });

        // Skip option
        const skipY = startY + nodes.length * rowH;
        const skipSelected = cursor === nodes.length;
        ctx.fillStyle = skipSelected ? '#aaa' : '#555';
        ctx.font = skipSelected ? 'bold 13px monospace' : '12px monospace';
        ctx.fillText('Skip', CANVAS_WIDTH / 2, skipY + 4);
    } else if (phase === 'challenge') {
        // Trial countdown (rendered as HUD banner during gameplay, not here)
        const secs = Math.ceil((eventState.timeRemaining || 0) / 1000);
        ctx.fillStyle = '#f44336';
        ctx.font = 'bold 28px monospace';
        ctx.fillText(`Survive: ${secs}s`, CANVAS_WIDTH / 2, py + 120);
        ctx.fillStyle = '#aaa';
        ctx.font = '13px monospace';
        ctx.fillText('Defeat the enemies or survive the timer!', CANVAS_WIDTH / 2, py + 160);
    } else if (phase === 'result') {
        // Show result
        const r = eventState.result;
        if (r && r.nodeApplied) {
            ctx.fillStyle = '#4caf50';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`✦ ${r.nodeApplied.icon} ${r.nodeApplied.name} applied!`, CANVAS_WIDTH / 2, py + 110);
        } else if (r && r.skipped) {
            ctx.fillStyle = '#888';
            ctx.font = '14px monospace';
            ctx.fillText('Skipped.', CANVAS_WIDTH / 2, py + 110);
        } else if (r && r.tokenGranted) {
            ctx.fillStyle = '#ff9800';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`✦ ${r.tokenGranted} Token acquired!`, CANVAS_WIDTH / 2, py + 110);
        }

        ctx.fillStyle = '#666';
        ctx.font = '13px monospace';
        ctx.fillText('Press ENTER to continue', CANVAS_WIDTH / 2, py + 150);
    }

    // Controls hint at bottom
    ctx.fillStyle = '#444';
    ctx.font = '11px monospace';
    ctx.fillText('W/S Navigate · ENTER/Click Select · ESC/RMB Skip', CANVAS_WIDTH / 2, py + panelH - 14);

    ctx.textAlign = 'left';
}
