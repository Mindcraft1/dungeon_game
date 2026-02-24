/**
 * Dev Tools — In-game panel for tweaking base stats in real time.
 *
 * Renders an HTML overlay panel on top of the canvas. All changes are
 * applied live to the running game without reloading. Values can be
 * reset back to defaults at any time.
 *
 * Toggle: type the cheat code  DEVMOD  (processed by input.js / game.js).
 */

import {
    PLAYER_SPEED, PLAYER_MAX_HP, PLAYER_DAMAGE, PLAYER_RADIUS, PLAYER_INVULN_TIME,
    ATTACK_RANGE, ATTACK_ARC, ATTACK_COOLDOWN, ATTACK_DURATION, ATTACK_KNOCKBACK,
    DAGGER_COOLDOWN, DAGGER_DAMAGE_MULT, DAGGER_SPEED, DAGGER_RANGE,
    DASH_SPEED_MULT, DASH_DURATION, DASH_COOLDOWN,
    ENEMY_SPEED, ENEMY_HP, ENEMY_DAMAGE, ENEMY_RADIUS, ENEMY_XP,
    DROP_CHANCE, TRAINING_RESPAWN_DELAY,
    PROJECTILE_SPEED, PROJECTILE_DAMAGE,
} from '../constants.js';

// ── Dev-override store ────────────────────────────────────
// Other modules read from this object; null = use default.
export const devOverrides = {
    // Player
    playerSpeed:      null,
    playerMaxHp:      null,
    playerDamage:     null,
    playerRadius:     null,
    playerInvulnTime: null,
    // Melee
    attackRange:      null,
    attackCooldown:   null,
    attackDuration:   null,
    attackKnockback:  null,
    // Dagger
    daggerCooldown:   null,
    daggerDamageMult: null,
    daggerSpeed:      null,
    daggerRange:      null,
    // Dash
    dashSpeedMult:    null,
    dashDuration:     null,
    dashCooldown:     null,
    // Enemy
    enemySpeed:       null,
    enemyHp:          null,
    enemyDamage:      null,
    enemyRadius:      null,
    enemyXp:          null,
    // Projectile (enemy)
    projSpeed:        null,
    projDamage:       null,
    // Misc
    dropChance:       null,
    trainingRespawn:  null,
};

/** Helpers: get an override or fall back to default */
export function getVal(key, defaultVal) {
    return devOverrides[key] !== null ? devOverrides[key] : defaultVal;
}

// ── Parameter definitions (drives the UI) ─────────────────
const SECTIONS = [
    {
        title: '⚔️  PLAYER',
        params: [
            { key: 'playerSpeed',      label: 'Speed',        def: PLAYER_SPEED,      min: 40,   max: 600,  step: 5   },
            { key: 'playerMaxHp',      label: 'Max HP',       def: PLAYER_MAX_HP,     min: 10,   max: 500,  step: 5   },
            { key: 'playerDamage',     label: 'Damage',       def: PLAYER_DAMAGE,     min: 1,    max: 200,  step: 1   },
            { key: 'playerRadius',     label: 'Radius',       def: PLAYER_RADIUS,     min: 6,    max: 30,   step: 1   },
            { key: 'playerInvulnTime', label: 'Invuln (ms)',  def: PLAYER_INVULN_TIME,min: 0,    max: 2000, step: 50  },
        ],
    },
    {
        title: '🗡️  MELEE',
        params: [
            { key: 'attackRange',      label: 'Range',        def: ATTACK_RANGE,      min: 10,   max: 200,  step: 5   },
            { key: 'attackCooldown',   label: 'Cooldown (ms)',def: ATTACK_COOLDOWN,   min: 50,   max: 1500, step: 25  },
            { key: 'attackDuration',   label: 'Duration (ms)',def: ATTACK_DURATION,   min: 30,   max: 500,  step: 10  },
            { key: 'attackKnockback',  label: 'Knockback',    def: ATTACK_KNOCKBACK,  min: 0,    max: 100,  step: 2   },
        ],
    },
    {
        title: '🔪  DAGGER',
        params: [
            { key: 'daggerCooldown',   label: 'Cooldown (ms)',def: DAGGER_COOLDOWN,   min: 100,  max: 3000, step: 50  },
            { key: 'daggerDamageMult', label: 'Dmg Mult',     def: DAGGER_DAMAGE_MULT,min: 0.1,  max: 3.0,  step: 0.05},
            { key: 'daggerSpeed',      label: 'Speed',        def: DAGGER_SPEED,      min: 80,   max: 600,  step: 10  },
            { key: 'daggerRange',      label: 'Range',        def: DAGGER_RANGE,      min: 50,   max: 800,  step: 10  },
        ],
    },
    {
        title: '💨  DASH',
        params: [
            { key: 'dashSpeedMult',    label: 'Speed Mult',   def: DASH_SPEED_MULT,   min: 1.0,  max: 8.0,  step: 0.25},
            { key: 'dashDuration',     label: 'Duration (ms)',def: DASH_DURATION,     min: 50,   max: 600,  step: 10  },
            { key: 'dashCooldown',     label: 'Cooldown (ms)',def: DASH_COOLDOWN,     min: 100,  max: 3000, step: 50  },
        ],
    },
    {
        title: '👹  ENEMY (base)',
        params: [
            { key: 'enemySpeed',       label: 'Speed',        def: ENEMY_SPEED,       min: 10,   max: 300,  step: 5   },
            { key: 'enemyHp',          label: 'HP',           def: ENEMY_HP,          min: 5,    max: 300,  step: 5   },
            { key: 'enemyDamage',      label: 'Damage',       def: ENEMY_DAMAGE,      min: 1,    max: 100,  step: 1   },
            { key: 'enemyRadius',      label: 'Radius',       def: ENEMY_RADIUS,      min: 4,    max: 30,   step: 1   },
            { key: 'enemyXp',          label: 'XP per kill',  def: ENEMY_XP,          min: 1,    max: 100,  step: 1   },
        ],
    },
    {
        title: '🔮  ENEMY PROJ',
        params: [
            { key: 'projSpeed',        label: 'Speed',        def: PROJECTILE_SPEED,  min: 40,   max: 500,  step: 10  },
            { key: 'projDamage',       label: 'Damage',       def: PROJECTILE_DAMAGE, min: 1,    max: 60,   step: 1   },
        ],
    },
    {
        title: '⚙️  MISC',
        params: [
            { key: 'dropChance',       label: 'Drop %',       def: DROP_CHANCE,       min: 0,    max: 1.0,  step: 0.05},
            { key: 'trainingRespawn',  label: 'Trng Respawn', def: TRAINING_RESPAWN_DELAY, min: 200, max: 10000, step: 200 },
        ],
    },
];

// ── DOM Panel ─────────────────────────────────────────────

let _panel = null;
let _visible = false;
let _minimized = false;
let _inputEls = {};   // key → { slider, num, resetBtn }

function _buildPanel() {
    if (_panel) return;

    _panel = document.createElement('div');
    _panel.id = 'devtools-panel';
    _panel.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        width: 290px;
        max-height: calc(100vh - 20px);
        overflow-y: auto;
        background: rgba(10, 10, 20, 0.92);
        border: 1px solid #4fc3f7;
        border-radius: 6px;
        padding: 0;
        font-family: monospace;
        font-size: 11px;
        color: #ccc;
        z-index: 9999;
        display: none;
        user-select: none;
        box-shadow: 0 0 20px rgba(79, 195, 247, 0.3);
        scrollbar-width: thin;
        scrollbar-color: #4fc3f7 rgba(0,0,0,0.3);
    `;

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 8px 10px;
        background: rgba(79, 195, 247, 0.15);
        border-bottom: 1px solid #4fc3f7;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: default;
        position: sticky;
        top: 0;
        z-index: 1;
        backdrop-filter: blur(4px);
    `;

    const title = document.createElement('span');
    title.textContent = '🛠️ DEV TOOLS';
    title.style.cssText = 'font-weight: bold; color: #4fc3f7; font-size: 13px;';
    header.appendChild(title);

    const headerBtns = document.createElement('div');
    headerBtns.style.cssText = 'display: flex; gap: 6px;';

    // Minimize button
    const minBtn = document.createElement('button');
    minBtn.textContent = '—';
    minBtn.title = 'Minimize';
    _styleBtn(minBtn, '#888');
    minBtn.addEventListener('click', (e) => { e.stopPropagation(); _toggleMinimize(); });
    headerBtns.appendChild(minBtn);

    // Reset All button
    const resetAllBtn = document.createElement('button');
    resetAllBtn.textContent = '↺ ALL';
    resetAllBtn.title = 'Reset all to defaults';
    _styleBtn(resetAllBtn, '#ff6b6b');
    resetAllBtn.addEventListener('click', (e) => { e.stopPropagation(); _resetAll(); });
    headerBtns.appendChild(resetAllBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close (type DEVMOD to reopen)';
    _styleBtn(closeBtn, '#e74c3c');
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); hide(); });
    headerBtns.appendChild(closeBtn);

    header.appendChild(headerBtns);
    _panel.appendChild(header);

    // ── Content wrapper (for minimize toggle) ──
    const content = document.createElement('div');
    content.id = 'devtools-content';
    content.style.cssText = 'padding: 6px 10px 10px;';

    // ── Live-stats readout bar ──
    const liveBar = document.createElement('div');
    liveBar.id = 'devtools-live';
    liveBar.style.cssText = `
        padding: 4px 6px;
        margin-bottom: 6px;
        background: rgba(255,255,255,0.04);
        border-radius: 3px;
        font-size: 10px;
        color: #888;
        line-height: 1.5;
    `;
    liveBar.innerHTML = '<em>Live stats will appear during gameplay</em>';
    content.appendChild(liveBar);

    // ── Sections ──
    for (const section of SECTIONS) {
        const sec = document.createElement('div');
        sec.style.cssText = 'margin-bottom: 6px;';

        const secTitle = document.createElement('div');
        secTitle.textContent = section.title;
        secTitle.style.cssText = `
            font-weight: bold;
            color: #4fc3f7;
            font-size: 11px;
            margin: 6px 0 4px;
            padding-bottom: 2px;
            border-bottom: 1px solid rgba(79,195,247,0.2);
        `;
        sec.appendChild(secTitle);

        for (const p of section.params) {
            sec.appendChild(_buildParamRow(p));
        }
        content.appendChild(sec);
    }

    // ── Export / Log button ──
    const logBtn = document.createElement('button');
    logBtn.textContent = '📋 Log Current Values to Console';
    logBtn.style.cssText = `
        width: 100%;
        padding: 6px;
        margin-top: 6px;
        background: rgba(79,195,247,0.12);
        border: 1px solid #4fc3f7;
        border-radius: 3px;
        color: #4fc3f7;
        font-family: monospace;
        font-size: 11px;
        cursor: pointer;
    `;
    logBtn.addEventListener('click', () => _logValues());
    content.appendChild(logBtn);

    _panel.appendChild(content);
    document.body.appendChild(_panel);

    // Prevent game input when interacting with dev tools
    _panel.addEventListener('keydown', (e) => e.stopPropagation());
    _panel.addEventListener('keyup', (e) => e.stopPropagation());
    _panel.addEventListener('keypress', (e) => e.stopPropagation());
}

function _styleBtn(btn, color) {
    btn.style.cssText = `
        background: none;
        border: 1px solid ${color};
        color: ${color};
        font-family: monospace;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
    `;
}

function _buildParamRow(p) {
    const row = document.createElement('div');
    row.style.cssText = `
        display: grid;
        grid-template-columns: 82px 1fr 52px 22px;
        gap: 4px;
        align-items: center;
        margin-bottom: 3px;
    `;

    // Label
    const label = document.createElement('span');
    label.textContent = p.label;
    label.style.cssText = 'color: #aaa; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    row.appendChild(label);

    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = p.min;
    slider.max = p.max;
    slider.step = p.step;
    slider.value = p.def;
    slider.style.cssText = `
        width: 100%;
        height: 14px;
        accent-color: #4fc3f7;
        cursor: pointer;
    `;
    row.appendChild(slider);

    // Number input
    const num = document.createElement('input');
    num.type = 'number';
    num.min = p.min;
    num.max = p.max;
    num.step = p.step;
    num.value = _formatNum(p.def, p.step);
    num.style.cssText = `
        width: 52px;
        background: rgba(255,255,255,0.06);
        border: 1px solid #555;
        border-radius: 2px;
        color: #fff;
        font-family: monospace;
        font-size: 10px;
        text-align: right;
        padding: 1px 3px;
    `;
    row.appendChild(num);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '↺';
    resetBtn.title = `Reset to ${p.def}`;
    resetBtn.style.cssText = `
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 12px;
        padding: 0;
    `;
    row.appendChild(resetBtn);

    // Store references
    _inputEls[p.key] = { slider, num, resetBtn, def: p.def, step: p.step };

    // ── Event wiring ──
    const apply = (val) => {
        const clamped = Math.max(p.min, Math.min(p.max, Number(val)));
        devOverrides[p.key] = clamped;
        slider.value = clamped;
        num.value = _formatNum(clamped, p.step);
        // Highlight if changed from default
        const isChanged = Math.abs(clamped - p.def) > (p.step / 10);
        num.style.borderColor = isChanged ? '#ffd700' : '#555';
        label.style.color = isChanged ? '#ffd700' : '#aaa';
        resetBtn.style.color = isChanged ? '#ff6b6b' : '#666';
    };

    slider.addEventListener('input', () => apply(slider.value));
    num.addEventListener('change', () => apply(num.value));
    resetBtn.addEventListener('click', () => {
        devOverrides[p.key] = null;
        slider.value = p.def;
        num.value = _formatNum(p.def, p.step);
        num.style.borderColor = '#555';
        label.style.color = '#aaa';
        resetBtn.style.color = '#666';
    });

    return row;
}

function _formatNum(val, step) {
    if (step < 1) {
        const decimals = Math.max(1, -Math.floor(Math.log10(step)));
        return Number(val).toFixed(decimals);
    }
    return String(Math.round(val));
}

function _resetAll() {
    for (const key of Object.keys(devOverrides)) {
        devOverrides[key] = null;
    }
    // Reset UI controls to defaults
    for (const [key, els] of Object.entries(_inputEls)) {
        els.slider.value = els.def;
        els.num.value = _formatNum(els.def, els.step);
        els.num.style.borderColor = '#555';
        els.resetBtn.style.color = '#666';
        // Reset label color
        const label = els.slider.closest('div').querySelector('span');
        if (label) label.style.color = '#aaa';
    }
}

function _toggleMinimize() {
    _minimized = !_minimized;
    const content = document.getElementById('devtools-content');
    if (content) content.style.display = _minimized ? 'none' : 'block';
}

function _logValues() {
    const snapshot = {};
    for (const section of SECTIONS) {
        for (const p of section.params) {
            const current = devOverrides[p.key] !== null ? devOverrides[p.key] : p.def;
            const changed = devOverrides[p.key] !== null;
            snapshot[p.key] = { value: current, default: p.def, changed };
        }
    }
    console.group('%c🛠️ Dev Tools — Current Values', 'color: #4fc3f7; font-weight: bold');
    console.table(snapshot);

    // Also log a ready-to-paste constants block
    const changed = Object.entries(snapshot).filter(([, v]) => v.changed);
    if (changed.length > 0) {
        console.log('%cChanged values (paste into constants.js):', 'color: #ffd700');
        for (const [key, v] of changed) {
            // Find the matching param definition
            for (const section of SECTIONS) {
                const p = section.params.find(p2 => p2.key === key);
                if (p) {
                    console.log(`  ${key}: ${v.value}  (was ${v.default})`);
                    break;
                }
            }
        }
    } else {
        console.log('%cAll values at default.', 'color: #888');
    }
    console.groupEnd();
}

// ── Live stats readout ────────────────────────────────────

export function updateLiveStats(game) {
    if (!_visible || _minimized) return;
    const bar = document.getElementById('devtools-live');
    if (!bar || !game.player) return;

    const p = game.player;
    const enemyCount = game.enemies ? game.enemies.filter(e => !e.dead).length : 0;
    bar.innerHTML = `
        <b style="color:#4fc3f7">Player</b> HP:${p.hp}/${p.maxHp} SPD:${Math.round(p.getEffectiveSpeed())} DMG:${p.damage} LVL:${p.level}
        &nbsp;|&nbsp; <b style="color:#e74c3c">Enemies</b> ×${enemyCount}
        &nbsp;|&nbsp; <b style="color:#ffd700">Stage</b> ${game.stage}
    `;
}

// ── Public API ────────────────────────────────────────────

export function show() {
    _buildPanel();
    _panel.style.display = 'block';
    _visible = true;
}

export function hide() {
    if (_panel) _panel.style.display = 'none';
    _visible = false;
}

export function toggle() {
    if (_visible) hide();
    else show();
}

export function isVisible() {
    return _visible;
}

/**
 * Apply dev overrides to a living player instance.
 * Called each frame from game.js so slider changes take effect immediately.
 */
export function applyToPlayer(player) {
    if (!player) return;

    if (devOverrides.playerSpeed !== null)      player.speed  = devOverrides.playerSpeed;
    if (devOverrides.playerMaxHp !== null) {
        const oldMax = player.maxHp;
        player.maxHp = devOverrides.playerMaxHp;
        player._baseMaxHp = Math.round(player.maxHp / (player.talentMaxHpMult || 1));
        // Scale current HP proportionally
        if (oldMax > 0) player.hp = Math.min(player.hp, player.maxHp);
    }
    if (devOverrides.playerDamage !== null)     player.damage = devOverrides.playerDamage;
    if (devOverrides.playerRadius !== null)     player.radius = devOverrides.playerRadius;
}

/**
 * Apply dev overrides to living enemy instances.
 * Speed and radius are applied each frame; HP only on new spawns.
 */
export function applyToEnemies(enemies) {
    if (!enemies) return;
    for (const e of enemies) {
        if (e.dead) continue;
        if (devOverrides.enemySpeed !== null)  e.speed  = devOverrides.enemySpeed;
        if (devOverrides.enemyRadius !== null) e.radius = devOverrides.enemyRadius;
        if (devOverrides.enemyDamage !== null) e.damage = devOverrides.enemyDamage;
    }
}

/** Check if any values have been overridden */
export function hasOverrides() {
    return Object.values(devOverrides).some(v => v !== null);
}
