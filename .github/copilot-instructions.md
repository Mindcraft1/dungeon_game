# Dungeon Rooms — Game Architecture Reference

> **Purpose:** This document describes the full architecture of the "Dungeon Rooms" browser game so that any AI coding agent can understand the codebase and make changes without re-reading every file.

---

## Overview

A 2D top-down dungeon room-clearing game built with **HTML5 Canvas** and **Vanilla JavaScript ES Modules** — no frameworks, no build step, no bundler.

- **Canvas:** 800 × 600 logical pixels, DPI-aware (Retina support via `devicePixelRatio`)
- **Grid:** 20 × 15 tiles, each 40 × 40 px
- **Game loop:** `requestAnimationFrame` with delta-time (capped at 50 ms)
- **Dev server:** `npm start` → `npx serve -l 6969`
- **Persistence:** `localStorage` key `dungeon_profiles` (JSON)
- **Total:** ~3,000 lines across 18 files

---

## File Structure

```
game_test/
├── index.html              # Minimal HTML: <canvas id="game"> + module script
├── style.css               # Dark background, centered canvas, pixelated rendering
├── package.json            # "npm start" → npx serve -l 6969
└── src/
    ├── main.js             # Entry point: DPI canvas setup, Game instance, RAF loop
    ├── constants.js        # All tunable values + game state enums
    ├── input.js            # Keyboard abstraction (keysDown, wasPressed, getMovement, getLastKey)
    ├── collision.js        # Circle-vs-grid wall resolution, circle-circle, circle-rect
    ├── rooms.js            # 6 ASCII room templates + 1 training template, parsing, enemy spawn logic
    ├── render.js           # Room grid renderer (floor tiles + bevelled wall tiles)
    ├── game.js             # ⭐ Core Game class — state machine, all logic orchestration (~745 lines)
    ├── entities/
    │   ├── player.js       # Player class: movement, 120° arc melee, XP/leveling, rendering
    │   ├── enemy.js        # Enemy class: 4 types (basic/shooter/tank/dasher), type-specific AI + rendering
    │   ├── projectile.js   # Projectile class: linear movement, wall/player collision, glow rendering
    │   └── door.js         # Door class: lock/unlock, collision, lock icon / arrow animation
    └── ui/
        ├── hud.js          # In-game HUD: HP/XP bars, level, stage, enemy count, stats
        ├── levelup.js      # Level-Up overlay (3 upgrade choices) + Game Over overlay
        ├── menu.js         # Main menu: 3 options (Start / Training / Characters) + highscore
        └── profiles.js     # Character profile screen: list, create (text input), delete
```

---

## Dependency Graph

```
index.html
  └── src/main.js
        ├── src/constants.js
        ├── src/input.js
        └── src/game.js  ← CENTRAL HUB — imports everything else
              ├── src/constants.js
              ├── src/input.js
              ├── src/rooms.js         ← constants.js
              ├── src/render.js        ← constants.js
              ├── src/collision.js     (imported by entities, not game.js)
              ├── src/entities/player.js  ← constants.js, collision.js
              ├── src/entities/enemy.js   ← constants.js, collision.js, projectile.js
              ├── src/entities/projectile.js ← constants.js, collision.js
              ├── src/entities/door.js    ← constants.js, collision.js
              ├── src/ui/hud.js           ← constants.js
              ├── src/ui/levelup.js       ← constants.js
              ├── src/ui/menu.js          ← constants.js
              └── src/ui/profiles.js      ← constants.js
```

`game.js` is the **sole orchestrator**. No other module imports `game.js`. All UI modules are pure render functions — they receive data, draw to canvas, and return.

---

## State Machine

The game runs on a 6-state FSM controlled by `Game.state`:

```
STATE_PROFILES ──select──► STATE_MENU ──Start──► STATE_PLAYING ◄──Resume──► STATE_PAUSED
                                ▲                    │    │
                                │                    │    └──XP threshold──► STATE_LEVEL_UP ──choose──┐
                                │                    │                                                │
                                │                    └──HP ≤ 0──► STATE_GAME_OVER                     │
                                │                                       │                             │
                                └───────────Enter───────────────────────┘                             │
                                                                                                      │
                                                     STATE_PLAYING ◄──────────────────────────────────┘
```

| State | Value | Triggered by | Input handling |
|-------|-------|-------------|----------------|
| `STATE_MENU` | `'MENU'` | Game start (with profiles), restart, back from pause | W/S navigate, Enter/Space confirm (3 options) |
| `STATE_PROFILES` | `'PROFILES'` | First launch (no profiles), "Characters" menu option | W/S navigate, Enter select/create, X delete, Escape back |
| `STATE_PLAYING` | `'PLAYING'` | Start Game / Training / Resume | WASD move, Space attack, T teleport-to-training, Esc/P pause |
| `STATE_PAUSED` | `'PAUSED'` | Esc or P during gameplay (non-training) | W/S navigate, Enter/Space/Esc confirm, P quick-resume |
| `STATE_LEVEL_UP` | `'LEVEL_UP'` | XP reaches threshold | W/S navigate, Enter/Space/1-2-3 choose upgrade |
| `STATE_GAME_OVER` | `'GAME_OVER'` | Player HP ≤ 0 (non-training) | Enter/Space → menu |

---

## Key Constants (src/constants.js)

| Category | Constant | Value |
|----------|----------|-------|
| Canvas | `CANVAS_WIDTH / HEIGHT` | `800 / 600` |
| | `TILE_SIZE` | `40` |
| Player | `PLAYER_RADIUS / SPEED / MAX_HP / DAMAGE` | `14 / 160 / 100 / 25` |
| | `PLAYER_INVULN_TIME` | `400` ms |
| Attack | `ATTACK_RANGE / ARC / COOLDOWN / DURATION` | `50 / 120° / 350ms / 150ms` |
| Enemy | `ENEMY_RADIUS / SPEED / HP / DAMAGE` | `12 / 70 / 50 / 10` |
| | `ENEMY_XP` | `15` |
| Enemy types | `SHOOTER_INTRO_STAGE / DASHER / TANK` | `4 / 6 / 8` |
| Projectile | `PROJECTILE_SPEED / DAMAGE / RADIUS` | `200 / 8 / 4` |
| Leveling | `XP_BASE / XP_MULTIPLIER` | `30 / 1.25` |
| | `UPGRADE_HP / SPEED / DAMAGE` | `25 / 15 / 8` |
| Training | `TRAINING_ENEMY_COUNT / RESPAWN_DELAY` | `3 / 2000ms` |

---

## Core Systems

### Player (src/entities/player.js)

- **Movement:** Normalized WASD/Arrow input × `PLAYER_SPEED` × dt, resolved against wall grid
- **Attack:** 120° arc melee. Hits enemies within `ATTACK_RANGE` and within arc angle. Applies damage + knockback. `ATTACK_COOLDOWN` between attacks, `ATTACK_DURATION` for visual
- **Damage:** HP reduction with `PLAYER_INVULN_TIME` invulnerability window
- **Leveling:** XP accumulates, threshold = `XP_BASE × XP_MULTIPLIER^(level-1)`. On level-up: choose +HP, +Speed, or +Damage. Chain level-ups if XP overflows
- **Rendering:** Circle with facing "eye" dot, flashes white on damage, pulsing alpha during invuln, white arc during attack

### Enemy (src/entities/enemy.js)

Enemies have 4 types with distinct shapes, colors, AI behaviors, and stat multipliers:

| Type | Shape | Color | Intro Stage | HP | Speed | Damage | Special Ability |
|------|-------|-------|-------------|-----|-------|--------|----------------|
| **Basic** | Circle | Red `#e74c3c` | 1 | 1× | 1× | 1× | Seek player |
| **Shooter** | Diamond | Purple `#9b59b6` | 4 | 0.7× | 0.55× | 0.5× contact | Fires projectiles, keeps distance, strafes |
| **Tank** | Hexagon | Orange `#e67e22` | 8 | 2× | 0.45× | 1.5× | Charges at 2.5× speed, resists knockback while charging |
| **Dasher** | Triangle | Green `#2ecc71` | 6 | 0.6× | 0.55× | 1.2× | Fast dashes (3.5× speed) toward player |

- **Base stat scaling per stage:** Count `min(2 + floor((stage-1)*0.75), 10)`, HP `×(1 + (stage-1)*0.15)`, Speed `×(1 + (stage-1)*0.05)` (max ×2), Damage `+(stage-1)*0.5`
- **Type multipliers** are applied on top of stage scaling
- **XP per type:** Basic=15, Shooter=19, Dasher=22, Tank=30
- **Spawn composition** (`_getEnemyTypes`): Weighted random per stage, at least 1 basic guaranteed
  - Stage 1–3: 100% basic
  - Stage 4+: ~15–30% shooters
  - Stage 6+: ~12–22% dashers
  - Stage 8+: ~8–15% tanks
- **Rendering:** Type-specific shapes, damage flash, HP bar, plus ability indicators (shooter glow, tank charge ring, dasher trail)

### Projectile (src/entities/projectile.js)

- Created by Shooter enemies, stored in `Game.projectiles[]`
- **Movement:** Linear (dirX/dirY × `PROJECTILE_SPEED`), destroyed on wall collision or player hit
- **Damage:** Base 8 + `0.4 × (stage - 4)`, skipped in training mode
- **Lifetime:** Max 3000ms
- **Rendering:** Purple glow circle with bright white center

### Door (src/entities/door.js)

- **Lock logic:** Locked while any enemy alive. `forceUnlock` param for training room
- **Collision:** Player overlaps unlocked door → next room (or return from training)
- **Rendering:** Rect with padlock icon (locked) or right-arrow triangle (unlocked, pulsing)

### Rooms (src/rooms.js)

- 14 room templates (ASCII art, 20×15 grid): `#`=wall, `.`=floor, `S`=spawn, `D`=door
- 1 training template (open arena with pillars)
- Room cycling: `templates[stageIndex % 14]`
- Enemy spawns: random floor tiles ≥5 tiles from player spawn, Fisher-Yates shuffled

### Collision (src/collision.js)

- `resolveWalls(entity, grid)` — pushes circle entity out of overlapping wall tiles (AABB neighborhood scan, closest-point resolution)
- `circleVsCircle()`, `circleVsRect()` — overlap tests for combat/door collision

---

## Profile System

- **Storage:** `localStorage.getItem('dungeon_profiles')` → `{ profiles: [{name, highscore}, ...], activeIndex: number }`
- **Max profiles:** 6, max name length: 12 chars
- **Migration:** On first load, migrates legacy `dungeon_highscore` key into a "Player" profile
- **Per-profile highscore:** `highscore` = highest stage reached by that character
- **Text input:** `getLastKey()` from input.js captures raw `e.key`, filtered by regex `/^[a-zA-Z0-9 ._\-]$/`

---

## Training Mode

- Accessed via menu option or **T key** mid-game (teleports, saves game state)
- **No damage** to player (enemies skip contact damage)
- Enemies respawn after `TRAINING_RESPAWN_DELAY` (2s) when all dead
- Door always open (`forceUnlock`)
- Door / ESC returns to saved game (full heal) or menu
- Player keeps XP/level progress (XP not awarded in training)

---

## Pause System

- **Trigger:** Esc or P during gameplay (non-training only)
- **Overlay:** Dimmed background, "PAUSED" title, Stage/Level info, Resume / Back to Menu options
- **P key:** Quick resume without navigating menu
- **Back to Menu:** Saves highscore before exiting

---

## Rendering Architecture

All rendering is immediate-mode Canvas 2D. The render pipeline per frame:

1. `ctx.clearRect()` — clear canvas
2. **Menu/Profiles:** Early return with dedicated render functions
3. **In-game:**
   - `renderRoom(ctx, grid)` — floor + wall tiles
   - `door.render(ctx)` — door entity
   - `enemies.forEach(e => e.render(ctx))` — enemy entities (type-specific shapes)
   - `projectiles.forEach(p => p.render(ctx))` — shooter projectiles
   - `player.render(ctx)` — player entity (drawn last = on top)
   - Door tooltips (LOCKED / EXIT hints)
   - `renderHUD(ctx, ...)` — HP/XP bars, stats
   - Training banner (if training mode)
   - Controls hint (fading)
   - Training respawn countdown
4. **Overlays:** Pause / Level-Up / Game-Over (drawn on top of game world)

---

## Input System (src/input.js)

| Export | Purpose |
|--------|---------|
| `isDown(code)` | True while key held (for movement, continuous actions) |
| `wasPressed(code)` | True only in frame key first pressed (for menus, attacks) |
| `getMovement()` | Normalized `{x, y}` from WASD/Arrows |
| `getLastKey()` | Raw `e.key` string for text input (profile names) |
| `clearFrameInput()` | **Must** be called at end of each frame (clears `keysJustPressed` + `_lastKey`) |

Key codes used: `KeyW`, `KeyA`, `KeyS`, `KeyD`, `ArrowUp/Down/Left/Right`, `Space`, `Enter`, `Escape`, `KeyT`, `KeyP`, `KeyX`, `Backspace`, `Digit1-3`

---

## Development Notes

- **Port 6969** is used because Chrome blocks port 6000 as unsafe (`ERR_UNSAFE_PORT`)
- **No build step** — all files served as-is via `npx serve`
- **No favicon** — the only 404 in the network log is `/favicon.ico` (harmless)
- **DPI handling:** Canvas buffer is scaled by `devicePixelRatio`, CSS dimensions set to logical size, context scaled with `ctx.scale(dpr, dpr)` in main.js
- **Delta-time cap:** 50ms max to prevent physics tunneling on tab-switch

---

## How to Add Features

1. **New game state:** Add constant in `constants.js`, import in `game.js`, add case to `update()` switch + render method
2. **New entity:** Create class in `src/entities/`, import in `game.js`, add to update/render cycle
3. **New UI screen:** Create render function in `src/ui/`, import in `game.js`, call from `render()`
4. **New room:** Add ASCII template string to `ROOM_TEMPLATES` array in `rooms.js`
5. **Tuning:** All gameplay values are in `constants.js` — change values there
6. **New input:** Add key handling in the appropriate `_update*()` method in `game.js`; prevent default in `input.js` if needed
