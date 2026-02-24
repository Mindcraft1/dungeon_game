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
