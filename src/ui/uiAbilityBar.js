// ── UI: Ability Bar ───────────────────────────────────────
// Renders ability slot indicators (Q/E) and proc labels in the HUD.
// Also shows floating proc-trigger notifications.
// ────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

// ── Proc Trigger Notification Queue ──
const _procNotifs = [];   // { text, color, icon, timer, maxTimer }
const PROC_NOTIF_DURATION = 1200; // ms

/**
 * Call this when a proc fires to show a floating notification.
 * @param {string} name  – proc name
 * @param {string} icon  – emoji icon
 * @param {string} color – CSS color
 */
export function showProcTrigger(name, icon, color) {
    _procNotifs.push({
        text: `${icon} ${name}!`,
        color,
        timer: PROC_NOTIF_DURATION,
        maxTimer: PROC_NOTIF_DURATION,
    });
    // Cap queue so old ones fall off
    if (_procNotifs.length > 5) _procNotifs.shift();
}

/**
 * Tick notification timers. Call once per frame from game update.
 * @param {number} dtMs – frame delta in milliseconds
 */
export function updateProcNotifs(dtMs) {
    for (let i = _procNotifs.length - 1; i >= 0; i--) {
        _procNotifs[i].timer -= dtMs;
        if (_procNotifs[i].timer <= 0) {
            _procNotifs.splice(i, 1);
        }
    }
}

/**
 * Render the ability bar at the bottom-center of the screen.
 * Shows Q and E slots with cooldown overlays.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../combat/abilitySystem.js').AbilitySystem} abilitySystem
 * @param {import('../combat/procSystem.js').ProcSystem} procSystem
 */
export function renderAbilityBar(ctx, abilitySystem, procSystem) {
    if (!abilitySystem && !procSystem) return;

    const centerX = CANVAS_WIDTH / 2;
    const baseY = CANVAS_HEIGHT - 52;

    // ── Ability Slots (Q and E) ──
    if (abilitySystem) {
        const slotSize = 36;
        const slotGap = 8;
        const totalW = slotSize * 2 + slotGap;
        const startX = centerX - totalW / 2;

        const keys = ['Q', 'E'];
        for (let i = 0; i < 2; i++) {
            const info = abilitySystem.getSlotInfo(i);
            const sx = startX + i * (slotSize + slotGap);
            const sy = baseY;

            // Background
            ctx.fillStyle = info ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)';
            ctx.fillRect(sx, sy, slotSize, slotSize);

            if (info) {
                const onCooldown = info.cooldown > 0;
                const isActive = info.isActive;

                // Cooldown overlay
                if (onCooldown) {
                    const ratio = info.cooldown / info.maxCooldown;
                    ctx.fillStyle = 'rgba(0,0,0,0.55)';
                    ctx.fillRect(sx, sy, slotSize, slotSize * ratio);
                }

                // Active glow
                if (isActive) {
                    ctx.save();
                    const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.35;
                    ctx.globalAlpha = pulse;
                    ctx.strokeStyle = info.color;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(sx - 1, sy - 1, slotSize + 2, slotSize + 2);
                    ctx.restore();
                }

                // Border
                ctx.strokeStyle = onCooldown ? '#555' : info.color;
                ctx.lineWidth = onCooldown ? 1 : 1.5;
                ctx.strokeRect(sx, sy, slotSize, slotSize);

                // Icon
                ctx.save();
                ctx.fillStyle = onCooldown ? '#666' : '#fff';
                ctx.font = '16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(info.icon, sx + slotSize / 2, sy + slotSize / 2 + 2);
                ctx.restore();

                // Cooldown text
                if (onCooldown) {
                    ctx.save();
                    ctx.fillStyle = '#ff9800';
                    ctx.font = 'bold 10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(info.cooldown.toFixed(1), sx + slotSize / 2, sy + slotSize - 4);
                    ctx.restore();
                }

                // Name below slot
                ctx.save();
                ctx.fillStyle = onCooldown ? '#666' : info.color;
                ctx.font = '7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(info.name, sx + slotSize / 2, sy + slotSize + 9);
                ctx.restore();
            }

            // Key label (top-left corner)
            ctx.save();
            ctx.fillStyle = info ? '#fff' : '#555';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(keys[i], sx + 2, sy + 9);
            ctx.restore();
        }
    }

    // ── Proc Labels (right of ability bar) ──
    if (procSystem) {
        const procStartX = centerX + 50;
        const procY = baseY + 4;

        for (let i = 0; i < 2; i++) {
            const info = procSystem.getSlotInfo(i);
            if (!info) continue;

            const px = procStartX + i * 82;
            const pw = 76;
            const ph = 24;

            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(px, procY, pw, ph);

            // Colored left accent
            ctx.fillStyle = info.color;
            ctx.fillRect(px, procY, 3, ph);

            // Border
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, procY, pw, ph);

            // Icon + truncated name
            ctx.save();
            ctx.fillStyle = info.color;
            ctx.font = '9px monospace';
            ctx.textAlign = 'left';
            // Truncate name to fit: max ~9 chars
            let displayName = info.name;
            if (displayName.length > 10) displayName = displayName.slice(0, 9) + '…';
            ctx.fillText(`${info.icon} ${displayName}`, px + 6, procY + 15);
            ctx.restore();
        }
    }

    // ── Proc Trigger Notifications (floating above ability bar) ──
    if (_procNotifs.length > 0) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 13px monospace';

        for (let i = _procNotifs.length - 1; i >= 0; i--) {
            const n = _procNotifs[i];
            const progress = 1 - n.timer / n.maxTimer; // 0→1

            // Fade in fast, fade out in last 40%
            let alpha;
            if (progress < 0.1) {
                alpha = progress / 0.1;
            } else if (progress > 0.6) {
                alpha = 1 - (progress - 0.6) / 0.4;
            } else {
                alpha = 1;
            }

            // Float upward
            const floatY = baseY - 28 - progress * 50 - ((_procNotifs.length - 1 - i) * 26);
            // Scale pop on entry
            const scale = progress < 0.1 ? 0.7 + progress / 0.1 * 0.3 : 1;

            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.translate(centerX, floatY);
            ctx.scale(scale, scale);

            // Outer glow for readability
            ctx.shadowColor = n.color;
            ctx.shadowBlur = 12;

            // Drop shadow for readability
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillText(n.text, 2, 2);

            // Main text
            ctx.fillStyle = n.color;
            ctx.fillText(n.text, 0, 0);

            ctx.restore();
        }

        ctx.restore();
    }
}
