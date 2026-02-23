// ── Meta Menu UI ────────────────────────────────────────────
// Renders the perks / relics / stats meta-progression screen.
// Navigated with keyboard (W/S = sections, A/D = perk focus, Enter = buy).
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import { getAvailableShards } from './metaState.js';
import * as MetaStore from './metaStore.js';
import { PERK_DEFINITIONS, PERK_IDS, getPerkLevel, getNextCost, canUpgrade, isMaxed } from './metaPerks.js';
import { RELIC_DEFINITIONS, RELIC_IDS, isRelicUnlocked, getUnlockedRelicCount, RELIC_COUNT } from './relics.js';
import { getUnlockedRunUpgradeIds, RUN_UPGRADE_DEFINITIONS, RUN_UPGRADE_UNLOCK_THRESHOLDS } from './rewardSystem.js';

// ── Tab constants ──
export const META_TAB_PERKS  = 0;
export const META_TAB_RELICS = 1;
export const META_TAB_STATS  = 2;
export const META_TAB_COUNT  = 3;

/**
 * Render the full meta menu.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} activeTab         – 0=Perks, 1=Relics, 2=Stats
 * @param {number} perkCursor        – which perk is selected (0-3)
 * @param {boolean} fromGameOver     – show "run summary" header
 * @param {object}  runRewards       – { coreShardsGainedThisRun, bossesDefeatedThisRun, relicUnlockedThisRun, runUpgradeUnlockedThisRun }
 */
export function renderMetaMenu(ctx, activeTab, perkCursor, fromGameOver = false, runRewards = null) {
    // Full-screen background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle grid
    ctx.strokeStyle = 'rgba(79,195,247,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    const state = MetaStore.getState();
    const shards = getAvailableShards(state);

    ctx.textAlign = 'center';

    // ── Title ──
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('META PROGRESS', CANVAS_WIDTH / 2, 36);

    // Core Shards display
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`◆ Core Shards: ${shards}`, CANVAS_WIDTH / 2, 58);

    // ── Run Summary (game over only) ──
    if (fromGameOver && runRewards) {
        _renderRunSummary(ctx, runRewards);
    }

    // ── Tab bar ──
    const tabY = fromGameOver ? 130 : 78;
    const tabLabels = ['PERKS', 'RELICS', 'STATS'];
    const tabColors = ['#ffd700', '#bb86fc', '#4fc3f7'];
    const tabW = 100;
    const tabStartX = CANVAS_WIDTH / 2 - (tabW * META_TAB_COUNT) / 2;

    tabLabels.forEach((label, i) => {
        const tx = tabStartX + i * tabW + tabW / 2;
        const active = i === activeTab;
        ctx.fillStyle = active ? tabColors[i] : '#555';
        ctx.font = active ? 'bold 13px monospace' : '12px monospace';
        ctx.fillText(label, tx, tabY);
        if (active) {
            ctx.fillRect(tx - 30, tabY + 4, 60, 2);
        }
    });

    // ── Tab content ──
    const contentY = tabY + 20;
    switch (activeTab) {
        case META_TAB_PERKS:  _renderPerksTab(ctx, perkCursor, shards, contentY);  break;
        case META_TAB_RELICS: _renderRelicsTab(ctx, contentY);                     break;
        case META_TAB_STATS:  _renderStatsTab(ctx, state, contentY);               break;
    }

    // ── Controls hint ──
    ctx.fillStyle = '#444';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('A/D = Tab  ·  W/S = Select  ·  ENTER/Click = Buy  ·  ESC/RMB = Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 16);

    ctx.textAlign = 'left';
}

// ── Run Summary ──

function _renderRunSummary(ctx, rw) {
    const y = 84;
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';

    const parts = [];
    if (rw.bossesDefeatedThisRun > 0) parts.push(`Bosses: ${rw.bossesDefeatedThisRun}`);
    parts.push(`Shards: +${rw.coreShardsGainedThisRun}`);
    if (rw.relicUnlockedThisRun) {
        const relic = RELIC_DEFINITIONS[rw.relicUnlockedThisRun];
        parts.push(`Relic: ${relic ? relic.name : rw.relicUnlockedThisRun}`);
    }
    if (rw.runUpgradeUnlockedThisRun) {
        const upg = RUN_UPGRADE_DEFINITIONS[rw.runUpgradeUnlockedThisRun];
        parts.push(`New: ${upg ? upg.name : rw.runUpgradeUnlockedThisRun}`);
    }

    ctx.fillText(`Run Summary:  ${parts.join('  ·  ')}`, CANVAS_WIDTH / 2, y);
}

// ── Perks Tab ──

function _renderPerksTab(ctx, cursor, shards, startY) {
    const rowH = 70;
    const panelW = 460;
    const panelX = CANVAS_WIDTH / 2 - panelW / 2;

    PERK_IDS.forEach((id, i) => {
        const def = PERK_DEFINITIONS[id];
        const lvl = getPerkLevel(id);
        const maxed = isMaxed(id);
        const cost = getNextCost(id);
        const affordable = canUpgrade(id);
        const selected = i === cursor;
        const y = startY + i * rowH;

        // Row background
        if (selected) {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(panelX, y, panelW, rowH - 6);
            ctx.strokeStyle = def.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(panelX, y, panelW, rowH - 6);
        }

        // Icon + Name
        ctx.textAlign = 'left';
        ctx.fillStyle = selected ? def.color : '#888';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`${def.icon} ${def.name}`, panelX + 10, y + 20);

        // Level pips
        const pipX = panelX + 140;
        for (let p = 0; p < def.maxLevel; p++) {
            ctx.fillStyle = p < lvl ? def.color : '#333';
            ctx.fillRect(pipX + p * 16, y + 10, 12, 12);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(pipX + p * 16, y + 10, 12, 12);
        }

        // Effect text
        ctx.fillStyle = '#aaa';
        ctx.font = '11px monospace';
        ctx.fillText(def.effectLabel(lvl), panelX + 10, y + 40);

        // Cost / MAX
        ctx.textAlign = 'right';
        if (maxed) {
            ctx.fillStyle = '#4caf50';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('MAX', panelX + panelW - 10, y + 20);
        } else {
            ctx.fillStyle = affordable ? '#ffd700' : '#666';
            ctx.font = '12px monospace';
            ctx.fillText(`◆ ${cost}`, panelX + panelW - 10, y + 20);
            if (selected && affordable) {
                ctx.fillStyle = '#4caf50';
                ctx.font = 'bold 10px monospace';
                ctx.fillText('[ENTER] Buy', panelX + panelW - 10, y + 38);
            }
        }
    });

    ctx.textAlign = 'left';
}

// ── Relics Tab ──

function _renderRelicsTab(ctx, startY) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(`Relics Unlocked: ${getUnlockedRelicCount()} / ${RELIC_COUNT}`, CANVAS_WIDTH / 2, startY + 10);

    const cols = 4;
    const cellW = 110;
    const cellH = 90;
    const gridW = cols * cellW;
    const gridX = CANVAS_WIDTH / 2 - gridW / 2;
    const gridY = startY + 28;

    RELIC_IDS.forEach((id, i) => {
        const def = RELIC_DEFINITIONS[id];
        const unlocked = isRelicUnlocked(id);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = gridX + col * cellW + cellW / 2;
        const cy = gridY + row * cellH;

        // Cell background
        ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)';
        ctx.fillRect(cx - cellW / 2 + 4, cy, cellW - 8, cellH - 8);
        ctx.strokeStyle = unlocked ? def.color : '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - cellW / 2 + 4, cy, cellW - 8, cellH - 8);

        // Icon
        ctx.fillStyle = unlocked ? def.color : '#444';
        ctx.font = '18px monospace';
        ctx.fillText(unlocked ? def.icon : '?', cx, cy + 24);

        // Name
        ctx.fillStyle = unlocked ? '#ddd' : '#555';
        ctx.font = '9px monospace';
        ctx.fillText(unlocked ? def.name : '???', cx, cy + 42);

        // Description (word-wrapped)
        if (unlocked) {
            ctx.fillStyle = '#999';
            ctx.font = '8px monospace';
            const maxTextW = cellW - 16;
            const words = def.desc.split(' ');
            let line = '';
            let lineY = cy + 56;
            for (let w = 0; w < words.length; w++) {
                const test = line ? line + ' ' + words[w] : words[w];
                if (ctx.measureText(test).width > maxTextW && line) {
                    ctx.fillText(line, cx, lineY);
                    line = words[w];
                    lineY += 11;
                } else {
                    line = test;
                }
            }
            if (line) ctx.fillText(line, cx, lineY);
        }
    });

    // Unlocked run upgrades section
    const upgrades = getUnlockedRunUpgradeIds();
    const totalUpgrades = Object.keys(RUN_UPGRADE_DEFINITIONS).length;
    const totalBossKills = MetaStore.getState().stats.bossesKilledTotal;
    const ugY = gridY + Math.ceil(RELIC_IDS.length / cols) * cellH + 16;

    ctx.fillStyle = '#888';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`Run Upgrades (${upgrades.length}/${totalUpgrades})`, CANVAS_WIDTH / 2, ugY);

    // Show next unlock threshold
    if (upgrades.length < totalUpgrades) {
        const nextThreshold = RUN_UPGRADE_UNLOCK_THRESHOLDS[upgrades.length];
        ctx.fillStyle = '#666';
        ctx.font = '9px monospace';
        ctx.fillText(`Next unlock at ${nextThreshold} boss kills (you have ${totalBossKills})`, CANVAS_WIDTH / 2, ugY + 14);
    }

    if (upgrades.length > 0) {
        ctx.font = '10px monospace';
        upgrades.forEach((uid, i) => {
            const def = RUN_UPGRADE_DEFINITIONS[uid];
            if (!def) return;
            ctx.fillStyle = def.color;
            ctx.fillText(`${def.icon} ${def.name}: ${def.desc}`, CANVAS_WIDTH / 2, ugY + 30 + i * 16);
        });
    } else {
        ctx.fillStyle = '#555';
        ctx.font = '9px monospace';
        ctx.fillText('Defeat bosses to unlock run upgrades!', CANVAS_WIDTH / 2, ugY + 30);
    }

    ctx.textAlign = 'left';
}

// ── Stats Tab ──

function _renderStatsTab(ctx, state, startY) {
    const s = state.stats;
    const lines = [
        { label: 'Runs Played',      value: `${s.runsPlayed}`,        color: '#4fc3f7' },
        { label: 'Bosses Killed',     value: `${s.bossesKilledTotal}`, color: '#ff5722' },
        { label: 'Highest Stage',     value: `${s.highestStage}`,      color: '#ffd700' },
        { label: 'Total Core Shards', value: `${state.totalCoreShards}`, color: '#ffd700' },
        { label: 'Shards Spent',      value: `${state.spentCoreShards}`, color: '#888' },
        { label: 'Relics Found',      value: `${getUnlockedRelicCount()} / ${RELIC_COUNT}`, color: '#bb86fc' },
    ];

    const panelW = 340;
    const panelX = CANVAS_WIDTH / 2 - panelW / 2;
    const rowH = 30;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(panelX, startY, panelW, lines.length * rowH + 12);

    lines.forEach((line, i) => {
        const y = startY + 20 + i * rowH;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#aaa';
        ctx.font = '13px monospace';
        ctx.fillText(line.label, panelX + 16, y);

        ctx.textAlign = 'right';
        ctx.fillStyle = line.color;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(line.value, panelX + panelW - 16, y);
    });

    ctx.textAlign = 'left';
}
