import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import {
    BRANCH_ORDER, BRANCH_META,
    getNodesForBranch, canUpgradeNode, getSpentPoints,
} from '../talents.js';

/**
 * Render the talent tree overlay.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} talentState  - { ranks, points }
 * @param {number} cursorBranch - 0-2 (column index)
 * @param {number} cursorTier   - 0-4 (row index within branch)
 * @param {number} playerLevel
 */
export function renderTalentTree(ctx, talentState, cursorBranch, cursorTier, playerLevel) {
    // ── Backdrop ──
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // ── Panel ──
    const pw = 700, ph = 520;
    const px = (CANVAS_WIDTH - pw) / 2;
    const py = (CANVAS_HEIGHT - ph) / 2;

    ctx.fillStyle = 'rgba(15,15,28,0.97)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#ffd740';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    ctx.textAlign = 'center';

    // ── Title ──
    ctx.fillStyle = '#ffd740';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('TALENT TREE', CANVAS_WIDTH / 2, py + 32);

    // ── Points info ──
    const spent = getSpentPoints(talentState);
    const total = spent + talentState.points;
    ctx.fillStyle = talentState.points > 0 ? '#ffd740' : '#888';
    ctx.font = '13px monospace';
    ctx.fillText(`Points: ${talentState.points} available  (${spent}/${total} spent)`, CANVAS_WIDTH / 2, py + 54);

    // ── Three columns ──
    const colW = pw / 3;
    const nodeStartY = py + 90;
    const nodeSpacing = 78;
    const nodeRadius = 22;

    for (let bi = 0; bi < BRANCH_ORDER.length; bi++) {
        const branchId = BRANCH_ORDER[bi];
        const meta = BRANCH_META[branchId];
        const nodes = getNodesForBranch(branchId);
        const cx = px + colW * bi + colW / 2;

        // Branch header
        ctx.fillStyle = meta.color;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${meta.icon} ${meta.name}`, cx, py + 74);

        for (let ti = 0; ti < nodes.length; ti++) {
            const node = nodes[ti];
            const ny = nodeStartY + ti * nodeSpacing;
            const rank = talentState.ranks[node.id];
            const maxed = rank >= node.maxRank;
            const canUp = canUpgradeNode(talentState, node.id);
            const selected = bi === cursorBranch && ti === cursorTier;

            // ── Connector line to next node ──
            if (ti < nodes.length - 1) {
                const nextRank = talentState.ranks[nodes[ti + 1].id];
                ctx.strokeStyle = rank > 0 ? meta.color : 'rgba(255,255,255,0.1)';
                ctx.lineWidth = rank > 0 && nextRank > 0 ? 2.5 : 1;
                ctx.beginPath();
                ctx.moveTo(cx, ny + nodeRadius);
                ctx.lineTo(cx, ny + nodeSpacing - nodeRadius);
                ctx.stroke();
            }

            // ── Node circle ──
            // Background
            ctx.beginPath();
            ctx.arc(cx, ny, nodeRadius, 0, Math.PI * 2);
            if (maxed) {
                ctx.fillStyle = meta.color + '30'; // faint fill
            } else if (canUp) {
                ctx.fillStyle = 'rgba(255,215,64,0.10)';
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.03)';
            }
            ctx.fill();

            // Border
            ctx.strokeStyle = selected
                ? '#ffd740'
                : maxed
                    ? meta.color
                    : rank > 0
                        ? meta.color + '99'
                        : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = selected ? 2.5 : 1.5;
            ctx.stroke();

            // Selection glow
            if (selected) {
                ctx.save();
                ctx.shadowColor = '#ffd740';
                ctx.shadowBlur = 14;
                ctx.strokeStyle = '#ffd740';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, ny, nodeRadius + 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // ── Icon inside circle ──
            ctx.fillStyle = maxed ? meta.color : rank > 0 ? '#ddd' : '#666';
            ctx.font = '16px monospace';
            ctx.fillText(node.icon, cx, ny + 5);

            // ── Rank pips below the circle ──
            const pipY = ny + nodeRadius + 10;
            const pipGap = 10;
            const pipStartX = cx - ((node.maxRank - 1) * pipGap) / 2;
            for (let r = 0; r < node.maxRank; r++) {
                const pipX = pipStartX + r * pipGap;
                ctx.beginPath();
                ctx.arc(pipX, pipY, 3, 0, Math.PI * 2);
                if (r < rank) {
                    ctx.fillStyle = meta.color;
                    ctx.fill();
                } else {
                    ctx.strokeStyle = '#555';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            // ── Node name (right of pips) ──
            ctx.fillStyle = selected ? '#fff' : rank > 0 ? '#ccc' : '#777';
            ctx.font = '9px monospace';
            ctx.fillText(node.name, cx, pipY + 12);
        }
    }

    // ── Hovered node detail panel (bottom) ──
    const hoveredNode = getNodesForBranch(BRANCH_ORDER[cursorBranch])[cursorTier];
    if (hoveredNode) {
        const detY = py + ph - 62;
        const rank = talentState.ranks[hoveredNode.id];
        const meta = BRANCH_META[hoveredNode.branch];
        const canUp = canUpgradeNode(talentState, hoveredNode.id);

        // Background bar
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(px + 10, detY - 4, pw - 20, 48);

        // Name + rank
        ctx.fillStyle = meta.color;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${hoveredNode.icon} ${hoveredNode.name}  (${rank}/${hoveredNode.maxRank})`, CANVAS_WIDTH / 2, detY + 14);

        // Description
        ctx.fillStyle = '#bbb';
        ctx.font = '11px monospace';
        ctx.fillText(hoveredNode.desc, CANVAS_WIDTH / 2, detY + 31);

        // Upgrade hint
        if (canUp) {
            ctx.fillStyle = '#ffd740';
            ctx.font = '10px monospace';
            ctx.fillText('Press ENTER to upgrade', CANVAS_WIDTH / 2, detY + 44);
        } else if (rank >= hoveredNode.maxRank) {
            ctx.fillStyle = '#4caf50';
            ctx.font = '10px monospace';
            ctx.fillText('MAX RANK', CANVAS_WIDTH / 2, detY + 44);
        } else if (talentState.points <= 0) {
            ctx.fillStyle = '#666';
            ctx.font = '10px monospace';
            ctx.fillText('No points available', CANVAS_WIDTH / 2, detY + 44);
        } else {
            // Tier locked
            ctx.fillStyle = '#f44336';
            ctx.font = '10px monospace';
            ctx.fillText('Requires previous tier', CANVAS_WIDTH / 2, detY + 44);
        }
    }

    // ── Controls hint ──
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.fillText('WASD/Arrows = Navigate  ·  ENTER = Upgrade  ·  T/ESC = Close', CANVAS_WIDTH / 2, py + ph - 8);

    ctx.textAlign = 'left';
}
