// ── UI: Ability Bar ───────────────────────────────────────
// Renders ability slot indicators (Q/E) and proc labels in the HUD.
// ────────────────────────────────────────────────────────────

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

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

    // ── Proc Labels (small, right of ability bar) ──
    if (procSystem) {
        const procStartX = centerX + 50;
        const procY = baseY + 8;

        for (let i = 0; i < 2; i++) {
            const info = procSystem.getSlotInfo(i);
            if (!info) continue;

            const px = procStartX + i * 70;
            const pw = 64;
            const ph = 20;

            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(px, procY, pw, ph);

            // Colored left accent
            ctx.fillStyle = info.color;
            ctx.fillRect(px, procY, 2, ph);

            // Icon + name
            ctx.save();
            ctx.fillStyle = info.color;
            ctx.font = '8px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${info.icon} ${info.name}`, px + 5, procY + 13);
            ctx.restore();
        }
    }
}
