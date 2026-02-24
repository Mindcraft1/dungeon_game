// ── Player Color Cosmetics ──────────────────────────────────
// Purely visual — each palette defines body, outline, dash,
// and ghost afterimage colors.
// ─────────────────────────────────────────────────────────────

export const PLAYER_COLORS = [
    { id: 'cyan',    name: 'Cyan',    body: '#4fc3f7', outline: '#2980b9', dash: '#b3e5fc', ghost: '#4fc3f7' },
    { id: 'crimson', name: 'Crimson', body: '#ef5350', outline: '#b71c1c', dash: '#ffcdd2', ghost: '#ef5350' },
    { id: 'emerald', name: 'Emerald', body: '#66bb6a', outline: '#2e7d32', dash: '#c8e6c9', ghost: '#66bb6a' },
    { id: 'gold',    name: 'Gold',    body: '#ffd740', outline: '#f9a825', dash: '#fff9c4', ghost: '#ffd740' },
    { id: 'violet',  name: 'Violet',  body: '#ce93d8', outline: '#7b1fa2', dash: '#f3e5f5', ghost: '#ce93d8' },
    { id: 'white',   name: 'White',   body: '#eceff1', outline: '#78909c', dash: '#ffffff', ghost: '#eceff1' },
    { id: 'orange',  name: 'Orange',  body: '#ffa726', outline: '#e65100', dash: '#ffe0b2', ghost: '#ffa726' },
    { id: 'ice',     name: 'Ice',     body: '#80deea', outline: '#00838f', dash: '#e0f7fa', ghost: '#80deea' },
];

export const DEFAULT_COLOR_ID = 'cyan';

/**
 * Look up a color palette by its id. Falls back to the first palette (cyan).
 * @param {string} id
 * @returns {{ id:string, name:string, body:string, outline:string, dash:string, ghost:string }}
 */
export function getColorById(id) {
    return PLAYER_COLORS.find(c => c.id === id) || PLAYER_COLORS[0];
}

// ── Cosmetic Hats / Accessories ─────────────────────────────
// Each hat has a render(ctx, x, y, radius, facingAngle) function
// that draws a small shape on top of the player circle.
// ─────────────────────────────────────────────────────────────

export const PLAYER_HATS = [
    {
        id: 'none',
        name: 'None',
        unlockDesc: null,
        isUnlocked: () => true,
        render: null,
    },
    {
        id: 'bandana',
        name: 'Bandana',
        unlockDesc: 'Reach Stage 5',
        isUnlocked: (profile, achStore) => (profile.highscore || 0) >= 5,
        render: (ctx, x, y, r, facing) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(facing);
            // Cloth band across forehead
            ctx.strokeStyle = '#e53935';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r + 1, -0.8, 0.8);
            ctx.stroke();
            // Trailing tail
            ctx.strokeStyle = '#c62828';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-r * 0.5, -r * 0.6);
            ctx.quadraticCurveTo(-r * 1.2, -r * 0.3, -r * 1.4, -r * 0.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-r * 0.5, -r * 0.4);
            ctx.quadraticCurveTo(-r * 1.1, -r * 0.1, -r * 1.3, -r * 0.5);
            ctx.stroke();
            ctx.restore();
        },
    },
    {
        id: 'crown',
        name: 'Crown',
        unlockDesc: 'Reach Stage 10',
        isUnlocked: (profile, achStore) => (profile.highscore || 0) >= 10,
        render: (ctx, x, y, r, facing) => {
            ctx.save();
            ctx.translate(x, y);
            // Crown sits on top of the circle
            const crownY = -r - 2;
            const cw = r * 1.1;
            const ch = r * 0.6;
            ctx.fillStyle = '#ffd740';
            ctx.strokeStyle = '#f9a825';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-cw, crownY);
            ctx.lineTo(-cw, crownY - ch);
            ctx.lineTo(-cw * 0.5, crownY - ch * 0.5);
            ctx.lineTo(0, crownY - ch);
            ctx.lineTo(cw * 0.5, crownY - ch * 0.5);
            ctx.lineTo(cw, crownY - ch);
            ctx.lineTo(cw, crownY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Jewels
            ctx.fillStyle = '#e53935';
            ctx.beginPath();
            ctx.arc(0, crownY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#42a5f5';
            ctx.beginPath();
            ctx.arc(-cw * 0.55, crownY - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cw * 0.55, crownY - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        },
    },
    {
        id: 'horns',
        name: 'Horns',
        unlockDesc: 'Achievement: Boss Hunter',
        isUnlocked: (profile, achStore) => achStore.isUnlocked('boss_kills_3_run'),
        render: (ctx, x, y, r, facing) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = '#8d6e63';
            ctx.fillStyle = '#a1887f';
            ctx.lineWidth = 2;
            // Left horn
            ctx.beginPath();
            ctx.moveTo(-r * 0.5, -r * 0.7);
            ctx.quadraticCurveTo(-r * 1.0, -r * 1.8, -r * 0.3, -r * 1.6);
            ctx.quadraticCurveTo(-r * 0.1, -r * 1.1, -r * 0.3, -r * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Right horn
            ctx.beginPath();
            ctx.moveTo(r * 0.5, -r * 0.7);
            ctx.quadraticCurveTo(r * 1.0, -r * 1.8, r * 0.3, -r * 1.6);
            ctx.quadraticCurveTo(r * 0.1, -r * 1.1, r * 0.3, -r * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        },
    },
    {
        id: 'halo',
        name: 'Halo',
        unlockDesc: 'Reach Stage 20',
        isUnlocked: (profile, achStore) => (profile.highscore || 0) >= 20,
        render: (ctx, x, y, r, facing) => {
            ctx.save();
            ctx.translate(x, y);
            const haloY = -r - 7;
            ctx.strokeStyle = '#fff9c4';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.004) * 0.15;
            ctx.beginPath();
            ctx.ellipse(0, haloY, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
            ctx.stroke();
            // Inner glow
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.004) * 0.1;
            ctx.strokeStyle = '#ffd740';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, haloY, r * 0.55, r * 0.18, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        },
    },
    {
        id: 'wizard',
        name: 'Wizard Hat',
        unlockDesc: 'Achievement: Centurion',
        isUnlocked: (profile, achStore) => achStore.isUnlocked('kills_100_total'),
        render: (ctx, x, y, r, facing) => {
            ctx.save();
            ctx.translate(x, y);
            const baseY = -r + 1;
            ctx.fillStyle = '#5c6bc0';
            ctx.strokeStyle = '#3949ab';
            ctx.lineWidth = 1.5;
            // Hat body (triangle)
            ctx.beginPath();
            ctx.moveTo(0, baseY - r * 1.6);
            ctx.lineTo(-r * 0.9, baseY);
            ctx.lineTo(r * 0.9, baseY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Brim
            ctx.fillStyle = '#3949ab';
            ctx.beginPath();
            ctx.ellipse(0, baseY, r * 1.1, r * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            // Star on hat
            ctx.fillStyle = '#ffd740';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('★', 0, baseY - r * 0.6);
            ctx.textAlign = 'left';
            ctx.restore();
        },
    },
    {
        id: 'antlers',
        name: 'Antlers',
        unlockDesc: 'Reach Stage 30',
        isUnlocked: (profile, achStore) => (profile.highscore || 0) >= 30,
        render: (ctx, x, y, r, facing) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.strokeStyle = '#6d4c41';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            // Left antler
            ctx.beginPath();
            ctx.moveTo(-r * 0.4, -r * 0.6);
            ctx.lineTo(-r * 0.7, -r * 1.5);
            ctx.lineTo(-r * 1.1, -r * 1.3);
            ctx.moveTo(-r * 0.7, -r * 1.5);
            ctx.lineTo(-r * 0.5, -r * 2.0);
            ctx.moveTo(-r * 0.7, -r * 1.5);
            ctx.lineTo(-r * 0.95, -r * 1.8);
            ctx.stroke();
            // Right antler
            ctx.beginPath();
            ctx.moveTo(r * 0.4, -r * 0.6);
            ctx.lineTo(r * 0.7, -r * 1.5);
            ctx.lineTo(r * 1.1, -r * 1.3);
            ctx.moveTo(r * 0.7, -r * 1.5);
            ctx.lineTo(r * 0.5, -r * 2.0);
            ctx.moveTo(r * 0.7, -r * 1.5);
            ctx.lineTo(r * 0.95, -r * 1.8);
            ctx.stroke();
            ctx.restore();
        },
    },
];

export const DEFAULT_HAT_ID = 'none';

/**
 * Look up a hat definition by its id. Falls back to 'none'.
 * @param {string} id
 * @returns {object}
 */
export function getHatById(id) {
    return PLAYER_HATS.find(h => h.id === id) || PLAYER_HATS[0];
}
