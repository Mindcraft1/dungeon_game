# 🎨 Character Customization — Agent Instruction File

> **Purpose:** Step-by-step implementation plan for the Character Customization system.
> Follow each phase in order. Each phase is self-contained and shippable.

---

## Architecture Principles

- All customization data is stored **per-profile** in the `profiles[]` array inside `localStorage` key `dungeon_profiles`.
- Profile shape evolves from `{ name, highscore }` → `{ name, highscore, cosmetics, class, weapon, talents }`.
- Existing profiles without new fields must be **auto-migrated** (defaults applied on load).
- The `Player` class receives customization via properties set in `game.js._placePlayer()` — it never reads `localStorage` directly.
- All cosmetic definitions live in a new file `src/cosmetics.js`. Gameplay-affecting definitions (classes, weapons, talents) live in their own files under `src/`.
- UI for customization is rendered through pure render functions in `src/ui/` — same pattern as every other UI screen.

---

## Phase 1 — Body Color & Outline Picker (Cosmetic)

**Goal:** Let players pick a body color and outline color for their character on the Profiles screen. Purely visual — no gameplay impact.

### 1.1 New file: `src/cosmetics.js`

Create a data file with color palette definitions:

```js
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

export const DEFAULT_COLOR_ID = 'cyan'; // matches current PLAYER_COLOR

export function getColorById(id) {
    return PLAYER_COLORS.find(c => c.id === id) || PLAYER_COLORS[0];
}
```

Each color entry has:
- `body` — main circle fill (replaces `PLAYER_COLOR`)
- `outline` — circle stroke (replaces hardcoded `#2980b9`)
- `dash` — lighter tint used during dash (replaces hardcoded `#b3e5fc`)
- `ghost` — dash ghost afterimage color (replaces hardcoded `#4fc3f7` in afterimage)

### 1.2 Profile data migration

In `game.js._loadProfiles()`, after loading profiles, iterate and add defaults:

```js
for (const p of this.profiles) {
    if (!p.colorId) p.colorId = 'cyan';
}
```

### 1.3 Color picker on Profiles screen

**New state in `game.js`:**
- `this.profileCustomizing = false` — true when the color picker overlay is open
- `this.colorPickerCursor = 0` — index into `PLAYER_COLORS`

**Trigger:** When a profile row is selected (cursor on it, not the +New row), pressing **C** opens the color picker. The picker is an overlay (same pattern as delete confirmation overlay).

**Color picker UI** (rendered in `profiles.js` or a new `renderColorPicker()` helper):
- Overlay with dimmed background
- Title: "CHOOSE COLOR"
- Grid of color swatches (small circles) — 4 columns × 2 rows
- Currently selected swatch has a highlight border
- Player preview: a larger circle in the center using the hovered color
- Controls: Arrow keys / WASD navigate swatches, Enter confirms, Esc cancels

**On confirm:** Set `this.profiles[this.profileCursor].colorId = PLAYER_COLORS[this.colorPickerCursor].id`, call `this._saveProfiles()`.

### 1.4 Player class changes

Add optional cosmetic properties to `Player`:

```js
// In constructor, after existing properties:
this.bodyColor = PLAYER_COLOR;    // default, overridden by game.js
this.outlineColor = '#2980b9';
this.dashColor = '#b3e5fc';
this.ghostColor = '#4fc3f7';
```

In `_renderBody()`:
- Replace `PLAYER_COLOR` → `this.bodyColor`
- Replace `'#2980b9'` → `this.outlineColor`
- Replace `'#b3e5fc'` (dash body) → `this.dashColor`
- Replace `'#4fc3f7'` (ghost afterimage) → `this.ghostColor`

### 1.5 game.js — apply cosmetics on player creation

In `_placePlayer()`, after creating/positioning the player:

```js
const profile = this.activeProfile;
if (profile) {
    const colorDef = getColorById(profile.colorId);
    this.player.bodyColor = colorDef.body;
    this.player.outlineColor = colorDef.outline;
    this.player.dashColor = colorDef.dash;
    this.player.ghostColor = colorDef.ghost;
}
```

### 1.6 Profiles screen — show color indicator

On each profile row, draw a small colored circle (radius 8) to the left of the name, using the profile's color. This gives an immediate visual identity to each profile.

### 1.7 Update hints

Add `C = Color` to the controls hint at the bottom of the profiles screen.

### Files touched:
- **NEW:** `src/cosmetics.js`
- **EDIT:** `src/entities/player.js` (constructor + `_renderBody()`)
- **EDIT:** `src/game.js` (profile migration, picker state, `_updateProfiles()`, `_placePlayer()`, render call)
- **EDIT:** `src/ui/profiles.js` (color indicator on rows, color picker overlay rendering)

---

## Phase 2 — Character Classes (3 classes with passives + stat biases)

**Goal:** Three classes — Guardian, Rogue, Berserker — each with a unique passive ability and stat modifiers. Class is chosen at profile creation and shown on the profile screen.

### 2.1 New file: `src/classes.js`

Define class data:

| Class | Color | Body Icon | HP Mod | DMG Mod | SPD Mod | Passive |
|-------|-------|-----------|--------|---------|---------|---------|
| Guardian | `#4fc3f7` (blue) | Shield ◇ inside circle | +20% | — | -10% | Auto-shield: block 1 hit every 20s |
| Rogue | `#66bb6a` (green) | Slash ✕ inside circle | -15% | — | +15% | +15% Crit Chance, crits deal 1.8× |
| Berserker | `#ef5350` (red) | Fist ⬟ inside circle | -10% | +15% | — | Below 30% HP → +40% Damage |

Each class definition:
```js
{ id, name, icon, color, hpMult, damageMult, speedMult, passive: { type, desc, ...params } }
```

Default class for old profiles: `'guardian'` (closest to current balanced stats).

### 2.2 Profile data

- Add `classId` field to profile: `{ name, highscore, colorId, classId }`.
- Class is chosen during profile creation — after typing name, a class selection step appears.
- Class can NOT be changed after creation (encourages multiple profiles).

### 2.3 Class selection UI

After typing a name and pressing Enter, transition to a class selection overlay:
- 3 class cards side by side (icon, name, stat modifiers, passive description).
- A/D or Left/Right to navigate, Enter to confirm.
- Rendered in `src/ui/profiles.js` as `renderClassPicker()`.

### 2.4 Player stat application

In `game.js._placePlayer()` when creating a new `Player`:
- Read `classId` from active profile.
- Apply `hpMult`, `damageMult`, `speedMult` to base stats.

### 2.5 Passive implementation

In `player.js`:
- `classPassive` property set from class definition.
- **Guardian:** `shieldTimer` property, blocks 1 hit (sets invuln instead of taking damage), recharges after 20s. Shown as a faint shield ring.
- **Rogue:** `critChance` increased by +15%. Crit multiplier stored as property. Applied in `tryAttack()`.
- **Berserker:** In `update()`, check `hp/maxHp < 0.3` → set `berserkActive = true`, apply +40% damage mult. Visual: red pulsing aura.

### 2.6 Visual identity

Each class gets a small emblem drawn inside the player circle (in `_renderBody()`):
- Guardian: small shield shape
- Rogue: small X slash marks
- Berserker: small fist/flame

### Files touched:
- **NEW:** `src/classes.js`
- **EDIT:** `src/entities/player.js` (stat mults, passive logic, emblem rendering)
- **EDIT:** `src/game.js` (class migration, class picker state, stat application)
- **EDIT:** `src/ui/profiles.js` (class icon on profile rows, class picker overlay)

---

## Phase 3 — Weapon Types (3 weapons in loadout)

**Goal:** Three weapon types that change the primary attack's feel. Selected on the Loadout screen before a run.

### 3.1 New file: `src/weapons.js`

| Weapon | Icon | Arc | Range | Cooldown | Damage Mult | Knockback | Special |
|--------|------|-----|-------|----------|-------------|-----------|---------|
| Sword (default) | ⚔ | 120° | 50px | 350ms | 1.0× | 20 | — |
| Spear | 🔱 | 40° | 75px | 400ms | 1.1× | 15 | Narrow but long reach |
| Hammer | 🔨 | 360° | 35px | 500ms | 1.3× | 35 | Full circle, slow, huge knockback |

Each weapon definition:
```js
{ id, name, icon, arcMult, rangeMult, cooldownMult, damageMult, knockbackMult, desc }
```

Multipliers are applied to the base constants, not absolutes — so they stack with class mults and upgrades.

### 3.2 Storage

Weapon selection is **per-run** (like abilities), stored in game state, not in profile. Selected on the Loadout screen.

### 3.3 Loadout screen changes

Add a "WEAPON" section at the top of the loadout screen (above abilities). Single-select from unlocked weapons. Sword is always unlocked. Spear unlocks at Stage 10 reached. Hammer unlocks at Stage 15 reached.

### 3.4 Player attack changes

In `player.js.tryAttack()`:
- Read `this.weaponArcMult`, `this.weaponRangeMult`, `this.weaponCooldownMult`, `this.weaponDamageMult`, `this.weaponKnockbackMult` (set by game.js from weapon definition).
- Apply to `ATTACK_ARC`, `ATTACK_RANGE`, `ATTACK_COOLDOWN`, etc.

### 3.5 Visual

- Attack arc rendering uses the weapon's arc/range multipliers (already parametric in `_renderAttackArc()`).
- Optionally different arc colors per weapon type.

### Files touched:
- **NEW:** `src/weapons.js`
- **EDIT:** `src/entities/player.js` (weapon mult properties, apply in attack logic + rendering)
- **EDIT:** `src/game.js` (weapon selection state, apply on run start)
- **EDIT:** `src/ui/loadoutScreen.js` (weapon section)

---

## Phase 4 — Cosmetic Hats & Accessories (Unlockable)

**Goal:** Small visual accessories drawn on top of the player circle. Unlocked via achievements, stage milestones, and boss kills.

### 4.1 Expand `src/cosmetics.js`

Add hat/accessory definitions:

```js
export const PLAYER_HATS = [
    { id: 'none',   name: 'None',   unlocked: true },
    { id: 'crown',  name: 'Crown',  unlock: { type: 'stage', value: 10 }, render: (ctx, x, y, r, facing) => { ... } },
    { id: 'horns',  name: 'Horns',  unlock: { type: 'achievement', id: 'boss_slayer_3' }, render: (ctx, x, y, r, facing) => { ... } },
    { id: 'halo',   name: 'Halo',   unlock: { type: 'stage', value: 20 }, render: (ctx, x, y, r, facing) => { ... } },
    { id: 'wizard', name: 'Wizard Hat', unlock: { type: 'achievement', id: 'centurion' }, render: (ctx, x, y, r, facing) => { ... } },
    { id: 'bandana',name: 'Bandana', unlock: { type: 'stage', value: 5 }, render: (ctx, x, y, r, facing) => { ... } },
];
```

Each hat has a `render(ctx, x, y, radius, facingAngle)` function that draws a small canvas shape on top of the player circle. These are ~5-10 lines of canvas drawing each (triangles, arcs, lines).

### 4.2 Profile data

Add `hatId` to profile: `{ name, highscore, colorId, classId, hatId }`. Default: `'none'`.

### 4.3 Hat picker UI

Accessible from profiles screen via **H** key. Same overlay pattern as color picker:
- Grid of hat previews (player circle + hat drawn on top)
- Locked hats shown grayed out with unlock requirement text
- Enter confirms, Esc cancels

### 4.4 Player rendering

In `player.js._renderBody()`, after drawing the circle + outline, call:
```js
if (this.hatRender) this.hatRender(ctx, this.x, this.y, this.radius, Math.atan2(this.facingY, this.facingX));
```

`hatRender` is the hat definition's `render` function, set by game.js from the profile's `hatId`.

### 4.5 Unlock checking

Use existing achievement system (`achievementStore.js`) and profile highscore to determine which hats are unlocked. Check in the hat picker UI renderer.

### Files touched:
- **EDIT:** `src/cosmetics.js` (add hat definitions)
- **EDIT:** `src/entities/player.js` (hat render hook in `_renderBody()`)
- **EDIT:** `src/game.js` (hat picker state, apply hat on player creation)
- **EDIT:** `src/ui/profiles.js` (hat picker overlay, hat preview on profile rows)

---

## Phase 5 — Talent Tree (3 branches, 5 nodes each)

**Goal:** A per-run talent tree that players spend level-up points in, adding build depth. Replaces or supplements the current 3-choice level-up system.

### 5.1 New file: `src/talents.js`

Three branches with 5 nodes each (15 total). Each node has 3 ranks:

**Offense Branch (⚔ Red):**
1. Sharp Edge — +5% melee damage per rank
2. Quick Slash — -5% attack cooldown per rank
3. Wide Swing — +8% attack arc per rank
4. Critical Eye — +3% crit chance per rank
5. Executioner — +10% damage to enemies below 30% HP per rank

**Defense Branch (🛡 Blue):**
1. Tough Hide — +8% max HP per rank
2. Quick Recovery — -8% invuln cooldown per rank
3. Iron Will — -3% damage taken per rank
4. Second Wind — Heal 2% max HP per room cleared per rank
5. Endurance — +10% buff duration per rank

**Utility Branch (⚡ Green):**
1. Fleet Foot — +3% move speed per rank
2. Dash Mastery — -8% dash cooldown per rank
3. XP Siphon — +5% XP gain per rank
4. Pickup Magnet — +15% pickup attraction radius per rank
5. Fortune — +5% coin drop rate per rank

### 5.2 Integration with level-up system

On level up, instead of (or in addition to) the current 3-choice overlay, the player can also put a point into the talent tree. Two options:
- **Option A:** Replace the 3-choice system entirely with talent points (1 point per level, open tree to spend).
- **Option B (recommended):** Keep the 3-choice system AND give 1 talent point every 2 levels. Talent tree opened via a button on the pause screen or a dedicated key (Tab).

### 5.3 Talent tree UI

New screen state `STATE_TALENTS`. Rendered as three vertical columns (branches) with nodes as circles connected by lines. Each node shows rank pips (○○○). Cursor navigates nodes, Enter spends a point.

### 5.4 Talent effects

In `player.js`, add a `talents` object tracking rank in each node. Effects are applied as multipliers in the relevant systems:
- Damage mults in `tryAttack()` 
- HP mults in constructor / level-up
- Speed mults in `update()` movement
- etc.

### 5.5 Reset on new run

Talent points reset each run (roguelike). They're part of the run state, not profile persistence.

### 5.6 Leverage existing `upgradeEngine.js` / `nodes.js`

Check if the existing node system can be reused or extended rather than building from scratch.

### Files touched:
- **NEW:** `src/talents.js` (definitions + talent state management)
- **NEW:** `src/ui/talentTree.js` (render function for tree UI)
- **EDIT:** `src/entities/player.js` (talent multiplier properties, apply in relevant methods)
- **EDIT:** `src/game.js` (talent state, STATE_TALENTS, point allocation, reset on new run)
- **EDIT:** `src/constants.js` (new state constant)
- **EDIT:** `src/ui/levelup.js` (optionally show talent point notification)

---

## Summary

| Phase | Feature | Complexity | Gameplay Impact | Files |
|-------|---------|-----------|-----------------|-------|
| 1 | Body Color Picker | ~2h | Cosmetic only | 4 files |
| 2 | Character Classes | ~4h | Major — stat variety + passives | 4 files |
| 3 | Weapon Types | ~3h | Major — attack feel variety | 4 files |
| 4 | Cosmetic Hats | ~3h | Cosmetic + unlock motivation | 4 files |
| 5 | Talent Tree | ~4h | Major — build depth per run | 6 files |
