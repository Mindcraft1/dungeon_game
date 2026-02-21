// ── Achievement UI ──────────────────────────────────────────
// Full-screen achievement list with tier filtering, progress
// bars, lock/unlock display. Rendered when state = STATE_ACHIEVEMENTS.
// ─────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import { ACHIEVEMENTS, TIER_INFO, TIER_ORDER } from './achievementsList.js';
import * as Store from './achievementStore.js';
import { getDisplayProgress } from './achievementEngine.js';

const PAGE_SIZE = 7;  // visible rows

/**
 * Render the achievements screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cursor – selected row index (within filtered list)
 * @param {number} filterIndex – 0=All, 1=Easy, 2=Medium, 3=Hard, 4=Very Hard, 5=Legendary
 */
export function renderAchievements(ctx, cursor, filterIndex) {
    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Decorative grid
    ctx.strokeStyle = 'rgba(224,64,251,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#e040fb';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('ACHIEVEMENTS', CANVAS_WIDTH / 2, 45);

    // Unlocked count
    const total = ACHIEVEMENTS.length;
    const unlocked = Store.getUnlockedCount();
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText(`${unlocked} / ${total} Unlocked`, CANVAS_WIDTH / 2, 65);

    // ── Tab filters ──
    const filterLabels = ['All', ...TIER_ORDER.map(t => TIER_INFO[t].label)];
    const filterColors = ['#aaa', ...TIER_ORDER.map(t => TIER_INFO[t].color)];
    const tabY = 84;
    const tabSpacing = 120;
    const tabStartX = CANVAS_WIDTH / 2 - (filterLabels.length - 1) * tabSpacing / 2;

    for (let i = 0; i < filterLabels.length; i++) {
        const tx = tabStartX + i * tabSpacing;
        const selected = i === filterIndex;
        ctx.fillStyle = selected ? filterColors[i] : '#444';
        ctx.font = selected ? 'bold 12px monospace' : '11px monospace';
        ctx.fillText(filterLabels[i], tx, tabY);
        if (selected) {
            ctx.fillRect(tx - 20, tabY + 3, 40, 2);
        }
    }

    // ── Filtered list ──
    const filtered = _getFiltered(filterIndex);

    if (filtered.length === 0) {
        ctx.fillStyle = '#555';
        ctx.font = '14px monospace';
        ctx.fillText('No achievements in this category.', CANVAS_WIDTH / 2, 220);
        _renderHints(ctx);
        return;
    }

    // Scrolling
    const maxScroll = Math.max(0, filtered.length - PAGE_SIZE);
    let scrollOffset = Math.max(0, Math.min(cursor - Math.floor(PAGE_SIZE / 2), maxScroll));

    const startY = 110;
    const rowH = 64;

    for (let i = 0; i < PAGE_SIZE && (scrollOffset + i) < filtered.length; i++) {
        const idx = scrollOffset + i;
        const ach = filtered[idx];
        const isSelected = idx === cursor;
        const isUnlocked = Store.isUnlocked(ach.id);
        const y = startY + i * rowH;

        _renderRow(ctx, ach, y, isSelected, isUnlocked);
    }

    // Scroll indicators
    if (scrollOffset > 0) {
        ctx.fillStyle = '#555';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▲ more ▲', CANVAS_WIDTH / 2, startY - 6);
    }
    if (scrollOffset + PAGE_SIZE < filtered.length) {
        ctx.fillStyle = '#555';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('▼ more ▼', CANVAS_WIDTH / 2, startY + PAGE_SIZE * rowH + 8);
    }

    _renderHints(ctx);
}

function _getFiltered(filterIndex) {
    if (filterIndex === 0) return ACHIEVEMENTS;
    const tier = TIER_ORDER[filterIndex - 1];
    return ACHIEVEMENTS.filter(a => a.tier === tier);
}

function _renderRow(ctx, ach, y, isSelected, isUnlocked) {
    const tierInfo = TIER_INFO[ach.tier];
    const rowW = 700;
    const rowH = 56;
    const rx = CANVAS_WIDTH / 2 - rowW / 2;

    // Background
    if (isSelected) {
        ctx.fillStyle = isUnlocked ? 'rgba(224,64,251,0.08)' : 'rgba(100,100,100,0.08)';
        ctx.fillRect(rx, y, rowW, rowH);
        ctx.strokeStyle = isUnlocked ? tierInfo.color : '#555';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, y, rowW, rowH);
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(rx, y, rowW, rowH);
    }

    ctx.textAlign = 'left';

    // Icon
    const iconX = rx + 16;
    const iconY = y + 28;
    ctx.font = '20px monospace';
    ctx.fillStyle = isUnlocked ? '#fff' : '#333';
    ctx.fillText(isUnlocked ? ach.icon : '🔒', iconX, iconY + 4);

    // Name
    const nameX = rx + 50;
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = isUnlocked ? tierInfo.color : '#555';
    ctx.fillText(isUnlocked ? ach.name : ach.name, nameX, y + 22);

    // Description
    ctx.font = '11px monospace';
    ctx.fillStyle = isUnlocked ? '#aaa' : '#444';
    ctx.fillText(ach.description, nameX, y + 38);

    // Tier badge
    ctx.textAlign = 'right';
    const badgeX = rx + rowW - 16;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = isUnlocked ? tierInfo.color : '#444';
    ctx.fillText(tierInfo.label.toUpperCase(), badgeX, y + 18);

    // Progress bar (if applicable and not yet unlocked)
    if (!isUnlocked) {
        const progress = getDisplayProgress(ach.id);
        if (progress) {
            const barW = 100;
            const barH = 8;
            const barX = badgeX - barW;
            const barY = y + 28;
            const pct = Math.min(1, progress.current / progress.target);

            // Bar background
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(barX, barY, barW, barH);

            // Bar fill
            ctx.fillStyle = tierInfo.color + '88';  // semi-transparent tier color
            ctx.fillRect(barX, barY, barW * pct, barH);

            // Bar border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(barX, barY, barW, barH);

            // Progress text
            ctx.font = '9px monospace';
            ctx.fillStyle = '#777';
            ctx.fillText(`${progress.current}/${progress.target}`, badgeX, barY + barH + 10);
        }
    } else {
        // Checkmark
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#4caf50';
        ctx.fillText('✓', badgeX, y + 38);
    }

    ctx.textAlign = 'center';  // reset
}

function _renderHints(ctx) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#444';
    ctx.font = '11px monospace';
    ctx.fillText('W/S = Navigate  ·  A/D = Filter  ·  ESC = Back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 25);
}
