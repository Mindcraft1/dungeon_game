import { CANVAS_WIDTH, CANVAS_HEIGHT, UPGRADE_HP, UPGRADE_SPEED, UPGRADE_DAMAGE,
    UPGRADE_HP_PER_LEVEL, UPGRADE_SPEED_PER_LEVEL, UPGRADE_DAMAGE_PER_LEVEL } from '../constants.js';
import { drawRarityBadge } from './rarityBadge.js';

/**
 * Draw the Level-Up overlay (game is paused while visible).
 * @param {Array} [choices] – dynamic choices array from game.js, or null for default
 */
export function renderLevelUpOverlay(ctx, player, selectedIndex = 0, choices = null, spaceConfirmReady = false, rerollTokenCount = 0) {
    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const optCount = choices ? choices.length : 3;

    // --- Dynamic width: measure all option labels and pick the widest ---
    // Level-scaling upgrade amounts
    const _lvl = player.level;
    const _hpG  = UPGRADE_HP     + Math.floor(_lvl * UPGRADE_HP_PER_LEVEL);
    const _spdG = UPGRADE_SPEED  + Math.floor(_lvl * UPGRADE_SPEED_PER_LEVEL);
    const _dmgG = UPGRADE_DAMAGE + Math.floor(_lvl * UPGRADE_DAMAGE_PER_LEVEL);

    const opts0 = choices
        ? choices.map((c, i) => `[${i + 1}]  ${c.label}`)
        : [
            `[1]  +${_hpG} Max HP  (heal +${Math.floor(_hpG * 0.6)})`,
            `[2]  +${_spdG} Speed`,
            `[3]  +${_dmgG} Damage`,
        ];
    ctx.font = 'bold 16px monospace';
    let maxTextW = 0;
    for (const t of opts0) maxTextW = Math.max(maxTextW, ctx.measureText(t).width);
    // Reserve extra space for rarity badge if any choice has one
    const hasAnyRarity = choices ? choices.some(c => c.rarity) : false;
    const badgeReserve = hasAnyRarity ? 80 : 0;
    // Add padding (arrow + margins on both sides + badge space)
    const bw = Math.min(Math.max(Math.ceil(maxTextW) + 80 + badgeReserve, 380), CANVAS_WIDTH - 40);

    // Dynamic height: header (title+subtitle) + rows + footer (hint text)
    const rowH = 38;
    const headerH = 100;   // top padding → first option baseline
    const footerH = 46;    // space below last option for hint text
    const bh = Math.min(headerH + optCount * rowH + footerH, CANVAS_HEIGHT - 40);
    const bx = (CANVAS_WIDTH - bw) / 2;
    const by = (CANVAS_HEIGHT - bh) / 2;

    // Box
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('LEVEL UP!', CANVAS_WIDTH / 2, by + 40);

    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText(`Level ${player.level} → ${player.level + 1}`, CANVAS_WIDTH / 2, by + 65);

    // Options — use dynamic choices if provided, else base options
    const opts = choices
        ? choices.map((c, i) => ({ key: `${i + 1}`, text: c.label, color: c.color, rarity: c.rarity }))
        : [
            { key: '1', text: `+${_hpG} Max HP  (heal +${Math.floor(_hpG * 0.6)})`, color: '#4caf50' },
            { key: '2', text: `+${_spdG} Speed`, color: '#2196f3' },
            { key: '3', text: `+${_dmgG} Damage`, color: '#f44336' },
        ];

    const startY = by + headerH;
    // Text center offset: shift left when badges are present to avoid overlap
    const textCenterX = hasAnyRarity ? CANVAS_WIDTH / 2 - badgeReserve / 2 : CANVAS_WIDTH / 2;
    // Max text width before truncation (leave room for arrow, padding, and badge)
    const maxLabelW = bw - 80 - badgeReserve;

    opts.forEach((o, i) => {
        const oy = startY + i * rowH;
        const selected = i === selectedIndex;

        // Selection highlight
        if (selected) {
            // Pulsing confirm glow when Space has been pressed once
            if (spaceConfirmReady) {
                const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.25;
                ctx.fillStyle = `rgba(255,215,0,${pulse})`;
                ctx.fillRect(bx + 10, oy - 16, bw - 20, rowH - 4);
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2;
                ctx.strokeRect(bx + 10, oy - 16, bw - 20, rowH - 4);
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(bx + 10, oy - 16, bw - 20, rowH - 4);
                ctx.strokeStyle = o.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(bx + 10, oy - 16, bw - 20, rowH - 4);
            }

            ctx.fillStyle = o.color;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('▸', textCenterX - maxLabelW / 2 - 8, oy + 4);
            ctx.textAlign = 'center';
        }

        ctx.fillStyle = selected ? o.color : '#666';
        ctx.font = selected ? 'bold 16px monospace' : '15px monospace';

        // Truncate label text if it would overflow into badge area
        let displayText = `[${o.key}]  ${o.text}`;
        if (ctx.measureText(displayText).width > maxLabelW) {
            while (displayText.length > 4 && ctx.measureText(displayText + '…').width > maxLabelW) {
                displayText = displayText.slice(0, -1);
            }
            displayText += '…';
        }
        ctx.fillText(displayText, textCenterX, oy + 2);

        // Rarity badge (right side of the row, inside the box)
        if (o.rarity) {
            drawRarityBadge(ctx, o.rarity, bx + bw - 38, oy, !selected);
        }
    });

    // Hint text — changes when Space-confirm is primed
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    if (spaceConfirmReady) {
        ctx.fillStyle = '#ffd700';
        ctx.fillText('Press SPACE again to confirm', CANVAS_WIDTH / 2, by + bh - 16);
    } else {
        const rerollHint = rerollTokenCount > 0 ? `  ·  R to Reroll (${rerollTokenCount})` : '';
        ctx.fillText('W/S to select  ·  Click / ENTER / 1-3 to confirm' + rerollHint, CANVAS_WIDTH / 2, by + bh - 16);
    }
    ctx.textAlign = 'left';
}

/**
 * Draw the Game-Over overlay.
 * @param {object|null} runRewards - meta progression run rewards summary
 * @param {Array|null} activeEffects - all active effects [{category, icon, name, desc, color}]
 * @param {Array|null} runUnlocks - permanent unlocks from this run [{icon, name, color, type}]
 */
export function renderGameOverOverlay(ctx, stage, level, runRewards = null, activeEffects = null, runUnlocks = null) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // ── Determine layout: full-width with two columns at bottom ──
    const cx = CANVAS_WIDTH / 2;
    const hasEffects = activeEffects && activeEffects.length > 0;
    const hasUnlocks = runUnlocks && runUnlocks.length > 0;

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('GAME OVER', cx, 65);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText(`Stage ${stage}  ·  Level ${level}`, cx, 95);

    // Run summary (meta rewards)
    let summaryY = 122;
    if (runRewards) {
        ctx.font = '12px monospace';

        if (runRewards.bossesDefeatedThisRun > 0) {
            ctx.fillStyle = '#ff5722';
            ctx.fillText(`Bosses Defeated: ${runRewards.bossesDefeatedThisRun}`, cx, summaryY);
            summaryY += 17;
        }

        if (runRewards.coreShardsGainedThisRun > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`◆ Core Shards Gained: +${runRewards.coreShardsGainedThisRun}`, cx, summaryY);
            summaryY += 17;
        }

        if (runRewards.relicUnlockedThisRun) {
            ctx.fillStyle = '#bb86fc';
            ctx.fillText(`Relic Unlocked!`, cx, summaryY);
            summaryY += 17;
        }
    }

    // ── Unlocks earned this run ──
    if (hasUnlocks) {
        summaryY += 4;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('── UNLOCKED THIS RUN ──', cx, summaryY);
        summaryY += 14;

        for (const u of runUnlocks) {
            ctx.fillStyle = u.color;
            ctx.font = '10px monospace';
            ctx.fillText(`${u.icon} ${u.type}: ${u.name}`, cx, summaryY);
            summaryY += 14;
        }
    }

    // ── Active Effects (adaptive multi-column layout) ──
    if (hasEffects) {
        const panelTop = Math.max(summaryY + 10, 210);
        const panelBottom = CANVAS_HEIGHT - 50;
        const panelH = panelBottom - panelTop;
        const panelMargin = 20;

        // Panel background
        ctx.fillStyle = 'rgba(20,20,35,0.7)';
        ctx.fillRect(panelMargin, panelTop - 6, CANVAS_WIDTH - panelMargin * 2, panelH + 12);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelMargin, panelTop - 6, CANVAS_WIDTH - panelMargin * 2, panelH + 12);

        // Header
        ctx.fillStyle = '#888';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ACTIVE EFFECTS AT DEATH', cx, panelTop + 8);

        // Clip for effects
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelMargin + 2, panelTop + 14, CANVAS_WIDTH - panelMargin * 2 - 4, panelH - 18);
        ctx.clip();

        // Adaptive column/row sizing based on effect count
        const contentW = CANVAS_WIDTH - panelMargin * 2 - 20;
        const availableH = panelH - 22;
        const effectCount = activeEffects.length;

        // Estimate unique categories for overhead rows
        const uniqueCats = new Set(activeEffects.map(fx => fx.category)).size;
        const catOverhead = uniqueCats * 0.7; // category headers add ~0.7 rows each per column

        // Decide layout: compact (no descriptions) if effects won't fit 2 cols
        const normalRowH = 26;
        const compactRowH = 14;
        const normalMaxPerCol = Math.floor(availableH / normalRowH);
        const normalCapacity = normalMaxPerCol * 2 - catOverhead * 2;

        const compact = effectCount > normalCapacity;
        const rowH = compact ? compactRowH : normalRowH;
        const maxRowsPerCol = Math.floor(availableH / rowH);

        // Calculate number of columns needed (2–5)
        let numCols = 2;
        if (compact) {
            const effPerCol = maxRowsPerCol - catOverhead;
            numCols = Math.min(5, Math.max(2, Math.ceil(effectCount / Math.max(1, effPerCol))));
        }

        const colGap = 8;
        const colW = (contentW - colGap * (numCols - 1)) / numCols;
        const baseX = panelMargin + 10;

        let col = 0;
        let row = 0;
        let lastCat = Array(numCols).fill('');

        for (const fx of activeEffects) {
            const x = baseX + col * (colW + colGap);

            // Category header
            if (fx.category !== lastCat[col]) {
                if (row > 0) row += 0.2;
                const catY = panelTop + 20 + row * rowH;
                if (row < maxRowsPerCol) {
                    ctx.fillStyle = '#666';
                    ctx.font = compact ? 'bold 6px monospace' : 'bold 7px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(fx.category.toUpperCase(), x, catY + (compact ? 5 : 7));
                }
                row += compact ? 0.4 : 0.5;
                lastCat[col] = fx.category;
            }

            if (row >= maxRowsPerCol) {
                if (col < numCols - 1) {
                    col++;
                    row = 0;
                    lastCat[col] = '';
                    continue;
                }
                break; // all columns full
            }

            const fy = panelTop + 20 + row * rowH;

            // Icon
            ctx.fillStyle = fx.color;
            ctx.font = compact ? '7px monospace' : '8px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(fx.icon, x, fy + (compact ? 6 : 8));

            // Name
            ctx.fillStyle = '#bbb';
            ctx.font = compact ? '7px monospace' : '8px monospace';
            const maxNameW = colW - 16;
            let nameStr = fx.name;
            if (ctx.measureText(nameStr).width > maxNameW) {
                while (nameStr.length > 0 && ctx.measureText(nameStr + '…').width > maxNameW) {
                    nameStr = nameStr.slice(0, -1);
                }
                nameStr += '…';
            }
            ctx.fillText(nameStr, x + 12, fy + (compact ? 6 : 8));

            // Description — only in non-compact mode
            if (!compact && fx.desc) {
                ctx.fillStyle = '#777';
                ctx.font = '7px monospace';
                const maxDescW = colW - 16;
                let descStr = fx.desc;
                if (ctx.measureText(descStr).width > maxDescW) {
                    while (descStr.length > 0 && ctx.measureText(descStr + '…').width > maxDescW) {
                        descStr = descStr.slice(0, -1);
                    }
                    descStr += '…';
                }
                ctx.fillText(descStr, x + 12, fy + 18);
            }

            row++;
        }

        ctx.restore();
    }

    // Navigation hints (always at bottom)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('Press ENTER or Click for menu', cx, CANVAS_HEIGHT - 28);

    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('G = Meta Progress', cx, CANVAS_HEIGHT - 12);

    ctx.textAlign = 'left';
}

/**
 * Draw the Boss Victory overlay with permanent reward selection.
 */
export function renderBossVictoryOverlay(ctx, bossName, bossColor, selectedIndex, rewardHP, rewardDamage, rewardSpeed, bossReward, relicDefs, upgradeDefs) {
    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Count extra lines needed for unlock info
    const unlockLines = [];
    if (bossReward) {
        if (bossReward.shardsGained > 0)
            unlockLines.push({ text: `◆ +${bossReward.shardsGained} Core Shards`, color: '#ffd700' });
        if (bossReward.relicId && relicDefs && relicDefs[bossReward.relicId]) {
            const r = relicDefs[bossReward.relicId];
            unlockLines.push({ text: `${r.icon} Relic Unlocked: ${r.name}`, color: r.color });
        }
        if (bossReward.runUpgradeId && upgradeDefs && upgradeDefs[bossReward.runUpgradeId]) {
            const u = upgradeDefs[bossReward.runUpgradeId];
            unlockLines.push({ text: `${u.icon} New Upgrade: ${u.name}`, color: u.color });
        }
        if (bossReward.combatUnlock) {
            const cu = bossReward.combatUnlock;
            const label = cu.type === 'ability' ? 'Ability' : 'Passive';
            unlockLines.push({ text: `${cu.icon} ${label} Unlocked: ${cu.name}`, color: cu.color });
        }
    }
    const extraH = unlockLines.length * 22 + (unlockLines.length > 0 ? 16 : 0);

    const bw = 380;
    const bh = 320 + extraH;
    const bx = (CANVAS_WIDTH - bw) / 2;
    const by = (CANVAS_HEIGHT - bh) / 2;

    // Box
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);

    // Gold shimmer on border
    const shimmer = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = shimmer * 0.3;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 6;
    ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.restore();

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('BOSS DEFEATED!', CANVAS_WIDTH / 2, by + 42);

    // Boss name
    ctx.fillStyle = bossColor;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(bossName, CANVAS_WIDTH / 2, by + 68);

    // Subtitle
    ctx.fillStyle = '#4caf50';
    ctx.font = '12px monospace';
    ctx.fillText('✦ Full Heal + Choose Permanent Reward ✦', CANVAS_WIDTH / 2, by + 94);

    // Unlock info
    if (unlockLines.length > 0) {
        let uy = by + 116;
        ctx.font = 'bold 13px monospace';
        for (const line of unlockLines) {
            ctx.fillStyle = line.color;
            ctx.fillText(line.text, CANVAS_WIDTH / 2, uy);
            uy += 22;
        }
    }

    // Reward options
    const opts = [
        { key: '1', text: `+${rewardHP} Max HP  (permanent)`, color: '#4caf50' },
        { key: '2', text: `+${rewardDamage} Damage  (permanent)`, color: '#f44336' },
        { key: '3', text: `+${rewardSpeed} Speed  (permanent)`, color: '#2196f3' },
    ];
    const startY = by + 132 + extraH;
    const rowH = 46;
    opts.forEach((o, i) => {
        const oy = startY + i * rowH;
        const selected = i === selectedIndex;

        if (selected) {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(bx + 14, oy - 18, bw - 28, rowH - 6);
            ctx.strokeStyle = o.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx + 14, oy - 18, bw - 28, rowH - 6);

            ctx.fillStyle = o.color;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('▸', CANVAS_WIDTH / 2 - 155, oy + 4);
            ctx.textAlign = 'center';
        }

        ctx.fillStyle = selected ? o.color : '#666';
        ctx.font = selected ? 'bold 16px monospace' : '15px monospace';
        ctx.fillText(`[${o.key}]  ${o.text}`, CANVAS_WIDTH / 2, oy + 2);
    });

    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.fillText('W/S to select  ·  Click / ENTER / 1-3 to confirm', CANVAS_WIDTH / 2, by + bh - 18);
    ctx.textAlign = 'left';
}
