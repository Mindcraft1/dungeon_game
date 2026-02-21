import {
    CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE,
    ENEMY_HP, ENEMY_SPEED, ENEMY_DAMAGE, ENEMY_XP,
    ENEMY_TYPE_BASIC, ENEMY_TYPE_SHOOTER, ENEMY_TYPE_TANK, ENEMY_TYPE_DASHER,
    ENEMY_COLOR, SHOOTER_COLOR, TANK_COLOR, DASHER_COLOR,
    SHOOTER_INTRO_STAGE, TANK_INTRO_STAGE, DASHER_INTRO_STAGE,
    TRAINING_ENEMY_COUNT, TRAINING_RESPAWN_DELAY,
    ATTACK_RANGE, DASH_COOLDOWN,
    STATE_MENU, STATE_PROFILES, STATE_PLAYING, STATE_PAUSED, STATE_LEVEL_UP, STATE_GAME_OVER,
    STATE_TRAINING_CONFIG,
    COMBO_TIMEOUT, COMBO_TIER_1, COMBO_TIER_2, COMBO_TIER_3, COMBO_TIER_4,
    COMBO_XP_MULT_1, COMBO_XP_MULT_2, COMBO_XP_MULT_3, COMBO_XP_MULT_4,
} from './constants.js';
import { isDown, wasPressed, getMovement, getLastKey } from './input.js';
import { parseRoom, parseTrainingRoom, getEnemySpawns, generateHazards, ROOM_NAMES, TRAINING_ROOM_NAME, getRoomCount } from './rooms.js';
import { renderRoom } from './render.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Projectile } from './entities/projectile.js';
import { Door } from './entities/door.js';
import { trySpawnPickup, PICKUP_INFO } from './entities/pickup.js';
import { ParticleSystem } from './entities/particle.js';
import { triggerShake } from './shake.js';
import { renderHUD } from './ui/hud.js';
import { renderLevelUpOverlay, renderGameOverOverlay } from './ui/levelup.js';
import { renderMenu } from './ui/menu.js';
import { renderProfiles, MAX_NAME_LEN } from './ui/profiles.js';
import { renderTrainingConfig } from './ui/training-config.js';
import * as Audio from './audio.js';

// ── Enemy type → color mapping for particles ──
const ENEMY_COLORS = {
    [ENEMY_TYPE_BASIC]:   ENEMY_COLOR,
    [ENEMY_TYPE_SHOOTER]: SHOOTER_COLOR,
    [ENEMY_TYPE_TANK]:    TANK_COLOR,
    [ENEMY_TYPE_DASHER]:  DASHER_COLOR,
};

export class Game {
    constructor(ctx) {
        this.ctx = ctx;

        // ── Profile system ──
        this.profiles = [];       // [{name, highscore}, ...]
        this.activeProfileIndex = 0;
        this._loadProfiles();

        // Start at profiles screen if no profiles exist, otherwise menu
        this.state = this.profiles.length === 0 ? STATE_PROFILES : STATE_MENU;
        this.menuIndex = 0;           // 0=Play, 1=Training, 2=Characters

        // Profiles screen state
        this.profileCursor = 0;
        this.profileCreating = false;
        this.profileNewName = '';
        this.profileDeleting = false;

        this.stage = 1;
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.hazards = [];
        this.door = null;
        this.grid = null;
        this.controlsHintTimer = 0;

        // Mode flags
        this.trainingMode = false;
        this.trainingRespawnTimer = 0;

        // Level-up selection
        this.upgradeIndex = 0;

        // Pause menu selection
        this.pauseIndex = 0;  // 0 = Resume, 1 = Menu

        // Saved real-game state for returning from training
        this._savedGame = null;

        // ── Training config ──
        this.trainingConfigCursor = 0;  // 0=room, 1=enemy type, 2=count, 3=start
        this.trainingRoomIndex = -1;    // -1 = training room, 0..13 = game rooms
        this.trainingEnemyType = 0;     // 0=all, 1=basic, 2=shooter, 3=dasher, 4=tank
        this.trainingEnemyCount = 3;
        this.trainingDamage = false;    // false = no damage (default), true = take damage
        this.trainingDrops = false;     // false = no drops in training (default), true = drops enabled
        this._trainingFromGame = false; // true if opened via T key mid-game

        // ── Audio ──
        this.muted = Audio.isMuted();

        // ── Particles ──
        this.particles = new ParticleSystem();

        // ── Combo / Kill-Chain ──
        this.comboCount = 0;          // current kill streak
        this.comboTimer = 0;          // ms remaining before combo resets
        this.comboMultiplier = 1;     // current XP multiplier
        this.comboTier = 0;           // 0=none, 1-4=tier level
        this.comboPopups = [];        // floating text popups [{text, x, y, timer, maxTimer, color, size}]
        this.comboFlash = 0;          // screen flash timer (ms)
        this.comboFlashColor = '';    // screen flash color
    }

    // ── Profile helpers ─────────────────────────────────────

    get activeProfile() {
        return this.profiles[this.activeProfileIndex] || null;
    }

    get highscore() {
        return this.activeProfile ? this.activeProfile.highscore : 0;
    }

    _loadProfiles() {
        try {
            const raw = localStorage.getItem('dungeon_profiles');
            if (raw) {
                const data = JSON.parse(raw);
                this.profiles = data.profiles || [];
                this.activeProfileIndex = data.activeIndex || 0;
                // Clamp
                if (this.activeProfileIndex >= this.profiles.length) this.activeProfileIndex = 0;
            }
        } catch (e) {
            this.profiles = [];
            this.activeProfileIndex = 0;
        }
        // Migrate old single highscore if profiles are empty
        if (this.profiles.length === 0) {
            try {
                const old = parseInt(localStorage.getItem('dungeon_highscore'));
                if (old > 0) {
                    this.profiles.push({ name: 'Player', highscore: old });
                    this.activeProfileIndex = 0;
                    this._saveProfiles();
                    localStorage.removeItem('dungeon_highscore');
                }
            } catch (e) {}
        }
    }

    _saveProfiles() {
        try {
            localStorage.setItem('dungeon_profiles', JSON.stringify({
                profiles: this.profiles,
                activeIndex: this.activeProfileIndex,
            }));
        } catch (e) {}
    }

    _saveHighscore() {
        const p = this.activeProfile;
        if (p && this.stage > p.highscore) {
            p.highscore = this.stage;
            this._saveProfiles();
        }
    }

    // ── Menu ───────────────────────────────────────────────

    _updateMenu() {
        const count = 3; // Play, Training, Characters
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.menuIndex = (this.menuIndex - 1 + count) % count;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.menuIndex = (this.menuIndex + 1) % count;
            Audio.playMenuNav();
        }
        if (wasPressed('Enter') || wasPressed('Space')) {
            Audio.playMenuSelect();
            if (this.menuIndex === 0) {
                this._startGame();
            } else if (this.menuIndex === 1) {
                this._openTrainingConfig(false);
            } else {
                this.profileCursor = 0;
                this.profileCreating = false;
                this.profileDeleting = false;
                this.state = STATE_PROFILES;
            }
        }
    }

    _startGame() {
        this.trainingMode = false;
        this._savedGame = null;
        this.stage = 1;
        this.player = null;
        this.pickups = [];
        this.controlsHintTimer = 5000;
        this._comboReset();
        this.comboPopups = [];
        this.comboFlash = 0;
        this.loadRoom(0);
        this.state = STATE_PLAYING;
    }

    _openTrainingConfig(fromGame) {
        this._trainingFromGame = fromGame;
        this.trainingConfigCursor = 0;
        this.state = STATE_TRAINING_CONFIG;
    }

    _startTraining() {
        this.trainingMode = true;
        if (!this._trainingFromGame) {
            this._savedGame = null;
            this.player = null;
        }
        this.stage = 0;
        this.controlsHintTimer = 6000;
        this._loadConfiguredTrainingRoom();
        this.state = STATE_PLAYING;
    }

    // ── Room management ────────────────────────────────────

    loadRoom(templateIndex) {
        const { grid, spawnPos, doorPos } = parseRoom(templateIndex);
        this.grid = grid;
        this._placePlayer(spawnPos);
        this.door = new Door(doorPos.col, doorPos.row);
        this._spawnEnemies(grid, spawnPos, doorPos);
        this.hazards = generateHazards(grid, spawnPos, doorPos, this.stage);
        this.pickups = [];
        this.particles.clear();
    }

    _loadTrainingRoom() {
        const { grid, spawnPos, doorPos } = parseTrainingRoom();
        this.grid = grid;
        this._placePlayer(spawnPos);
        this.door = new Door(doorPos.col, doorPos.row);
        this.trainingRespawnTimer = 0;
        this.projectiles = [];
        this.hazards = [];

        const spawns = getEnemySpawns(grid, spawnPos, doorPos, TRAINING_ENEMY_COUNT);
        this.enemies = spawns.map(p => new Enemy(
            p.x, p.y, ENEMY_HP, ENEMY_SPEED * 0.8, ENEMY_DAMAGE,
        ));
    }

    /** Load training room using user-selected config */
    _loadConfiguredTrainingRoom() {
        let grid, spawnPos, doorPos;
        if (this.trainingRoomIndex === -1) {
            ({ grid, spawnPos, doorPos } = parseTrainingRoom());
        } else {
            ({ grid, spawnPos, doorPos } = parseRoom(this.trainingRoomIndex));
        }
        this.grid = grid;
        this._placePlayer(spawnPos);
        this.door = new Door(doorPos.col, doorPos.row);
        this.trainingRespawnTimer = 0;
        this.projectiles = [];
        this.pickups = [];
        this.hazards = [];
        this.particles.clear();

        this._spawnTrainingEnemies(grid, spawnPos, doorPos);
    }

    /** Spawn enemies in training based on the config selection */
    _spawnTrainingEnemies(grid, spawnPos, doorPos) {
        const count = this.trainingEnemyCount;
        const spawns = getEnemySpawns(grid, spawnPos, doorPos, count);
        const typeOptions = [null, ENEMY_TYPE_BASIC, ENEMY_TYPE_SHOOTER, ENEMY_TYPE_DASHER, ENEMY_TYPE_TANK];
        const selectedType = typeOptions[this.trainingEnemyType]; // null = all

        this.enemies = spawns.map(p => {
            let type;
            if (selectedType) {
                type = selectedType;
            } else {
                // Random from all types
                const all = [ENEMY_TYPE_BASIC, ENEMY_TYPE_SHOOTER, ENEMY_TYPE_DASHER, ENEMY_TYPE_TANK];
                type = all[Math.floor(Math.random() * all.length)];
            }
            return new Enemy(p.x, p.y, ENEMY_HP, ENEMY_SPEED * 0.8, ENEMY_DAMAGE, type, 1);
        });
    }

    _placePlayer(spawnPos) {
        const px = spawnPos.col * TILE_SIZE + TILE_SIZE / 2;
        const py = spawnPos.row * TILE_SIZE + TILE_SIZE / 2;
        if (!this.player) {
            this.player = new Player(px, py);
        } else {
            this.player.x = px;
            this.player.y = py;
            this.player.attackTimer = 0;
            this.player.attackVisualTimer = 0;
        }
    }

    _spawnEnemies(grid, spawnPos, doorPos) {
        const count = Math.min(2 + Math.floor((this.stage - 1) * 0.75), 10);
        const hpBase = Math.floor(ENEMY_HP * (1 + (this.stage - 1) * 0.15));
        const spdBase = Math.min(ENEMY_SPEED * (1 + (this.stage - 1) * 0.05), ENEMY_SPEED * 2);
        const dmgBase = ENEMY_DAMAGE + Math.floor((this.stage - 1) * 0.5);

        const types = this._getEnemyTypes(this.stage, count);
        const spawns = getEnemySpawns(grid, spawnPos, doorPos, count);

        this.enemies = spawns.map((p, i) => new Enemy(
            p.x, p.y, hpBase, spdBase, dmgBase, types[i], this.stage,
        ));
        this.projectiles = [];
    }

    /**
     * Determine enemy type composition for a given stage.
     * New types are introduced gradually:
     *   Stage 1-3:  100% basic
     *   Stage 4+:   shooters mixed in
     *   Stage 6+:   dashers mixed in
     *   Stage 8+:   tanks mixed in
     * At least one basic enemy is always guaranteed.
     */
    _getEnemyTypes(stage, count) {
        if (stage < SHOOTER_INTRO_STAGE) {
            return Array(count).fill(ENEMY_TYPE_BASIC);
        }

        // Build cumulative probability thresholds
        const pShooter = stage >= SHOOTER_INTRO_STAGE
            ? Math.min(0.15 + (stage - SHOOTER_INTRO_STAGE) * 0.02, 0.30) : 0;
        const pDasher = stage >= DASHER_INTRO_STAGE
            ? Math.min(0.12 + (stage - DASHER_INTRO_STAGE) * 0.02, 0.22) : 0;
        const pTank = stage >= TANK_INTRO_STAGE
            ? Math.min(0.08 + (stage - TANK_INTRO_STAGE) * 0.02, 0.15) : 0;

        const total = pTank + pDasher + pShooter + (1 - pTank - pDasher - pShooter);

        const types = [];
        for (let i = 0; i < count; i++) {
            const roll = Math.random() * total;
            if (roll < pTank) types.push(ENEMY_TYPE_TANK);
            else if (roll < pTank + pDasher) types.push(ENEMY_TYPE_DASHER);
            else if (roll < pTank + pDasher + pShooter) types.push(ENEMY_TYPE_SHOOTER);
            else types.push(ENEMY_TYPE_BASIC);
        }

        // Guarantee at least one basic enemy
        if (!types.includes(ENEMY_TYPE_BASIC) && count > 0) {
            types[0] = ENEMY_TYPE_BASIC;
        }

        return types;
    }

    // ── Combo / Kill-Chain helpers ─────────────────────────

    /** Register an enemy kill for the combo system */
    _comboRegisterKill(x, y) {
        this.comboCount++;
        this.comboTimer = COMBO_TIMEOUT;

        const oldTier = this.comboTier;
        this.comboTier = this._getComboTier(this.comboCount);
        this.comboMultiplier = this._getComboMultiplier(this.comboTier);

        // Small per-kill popup showing current count (only after 2+ kills)
        if (this.comboCount >= 2) {
            this.comboPopups.push({
                text: `${this.comboCount}×`,
                x: x + (Math.random() - 0.5) * 20,
                y: y - 20,
                timer: 800,
                maxTimer: 800,
                color: this._getComboColor(this.comboTier),
                size: 12 + Math.min(this.comboTier, 4) * 2,
            });
        }

        // Tier milestone reached — big celebration
        if (this.comboTier > oldTier && this.comboTier >= 1) {
            const tierNames = ['', 'Nice!', 'Combo!', 'Rampage!', 'UNSTOPPABLE!'];
            const tierColors = ['', '#ffd700', '#ff9800', '#e040fb', '#00e5ff'];
            const name = tierNames[Math.min(this.comboTier, 4)];
            const color = tierColors[Math.min(this.comboTier, 4)];

            // Big centered popup
            this.comboPopups.push({
                text: `${name}  ×${this.comboMultiplier.toFixed(2)} XP`,
                x: CANVAS_WIDTH / 2,
                y: CANVAS_HEIGHT / 2 - 60,
                timer: 1500,
                maxTimer: 1500,
                color,
                size: 18 + this.comboTier * 3,
            });

            // Sound & particles
            Audio.playComboTier(this.comboTier);
            this.particles.comboBurst(this.player.x, this.player.y, this.comboTier);
            triggerShake(2 + this.comboTier * 1.5, 0.88);

            // Screen flash
            this.comboFlash = 200 + this.comboTier * 50;
            this.comboFlashColor = color;
        }
    }

    /** Reset combo state */
    _comboReset() {
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboMultiplier = 1;
        this.comboTier = 0;
    }

    /** Determine combo tier from kill count */
    _getComboTier(count) {
        if (count >= COMBO_TIER_4) return 4;
        if (count >= COMBO_TIER_3) return 3;
        if (count >= COMBO_TIER_2) return 2;
        if (count >= COMBO_TIER_1) return 1;
        return 0;
    }

    /** Get XP multiplier for a combo tier */
    _getComboMultiplier(tier) {
        switch (tier) {
            case 1: return COMBO_XP_MULT_1;
            case 2: return COMBO_XP_MULT_2;
            case 3: return COMBO_XP_MULT_3;
            case 4: return COMBO_XP_MULT_4;
            default: return 1;
        }
    }

    /** Get color for current combo tier */
    _getComboColor(tier) {
        switch (tier) {
            case 1: return '#ffd700';
            case 2: return '#ff9800';
            case 3: return '#e040fb';
            case 4: return '#00e5ff';
            default: return '#aaa';
        }
    }

    nextRoom() {
        this.stage++;
        this._saveHighscore();
        this.loadRoom(this.stage - 1);
    }

    // ── Teleport to training (T key) ──────────────────────

    _teleportToTraining() {
        this._savedGame = {
            stage: this.stage,
            enemies: this.enemies,
            door: this.door,
            grid: this.grid,
            projectiles: this.projectiles,
            pickups: this.pickups,
            hazards: this.hazards,
        };
        this._openTrainingConfig(true);
    }

    /** Actually enter training after config (when coming from mid-game) */
    _enterTrainingFromGame() {
        this.trainingMode = true;
        this.projectiles = [];
        this.stage = 0;
        this.controlsHintTimer = 4000;

        let grid, spawnPos, doorPos;
        if (this.trainingRoomIndex === -1) {
            ({ grid, spawnPos, doorPos } = parseTrainingRoom());
        } else {
            ({ grid, spawnPos, doorPos } = parseRoom(this.trainingRoomIndex));
        }
        this.grid = grid;
        this.player.x = spawnPos.col * TILE_SIZE + TILE_SIZE / 2;
        this.player.y = spawnPos.row * TILE_SIZE + TILE_SIZE / 2;
        this.player.hp = this.player.maxHp;
        this.player.invulnTimer = 0;
        this.player.attackTimer = 0;
        this.player.attackVisualTimer = 0;
        this.door = new Door(doorPos.col, doorPos.row);
        this.trainingRespawnTimer = 0;
        this.pickups = [];
        this.hazards = [];

        this._spawnTrainingEnemies(grid, spawnPos, doorPos);
        this.state = STATE_PLAYING;
    }

    _returnFromTraining() {
        if (!this._savedGame) {
            this.state = STATE_MENU;
            this.menuIndex = 0;
            this.trainingMode = false;
            return;
        }
        // Restore saved game
        this.stage = this._savedGame.stage;
        this.enemies = this._savedGame.enemies;
        this.door = this._savedGame.door;
        this.grid = this._savedGame.grid;
        this.projectiles = this._savedGame.projectiles || [];
        this.pickups = this._savedGame.pickups || [];
        this.hazards = this._savedGame.hazards || [];
        this.trainingMode = false;
        this._savedGame = null;

        const { spawnPos } = parseRoom(this.stage - 1);
        this.player.x = spawnPos.col * TILE_SIZE + TILE_SIZE / 2;
        this.player.y = spawnPos.row * TILE_SIZE + TILE_SIZE / 2;
        this.player.hp = this.player.maxHp;
        this.controlsHintTimer = 0;
        this.state = STATE_PLAYING;
    }

    restart() {
        this.state = STATE_MENU;
        this.menuIndex = 0;
        this.trainingMode = false;
        this._savedGame = null;
        this.projectiles = [];
        this.pickups = [];
        this.hazards = [];
        this.particles.clear();
        this._comboReset();
        this.comboPopups = [];
        this.comboFlash = 0;
    }

    // ── Update ─────────────────────────────────────────────

    update(dt) {
        if (this.controlsHintTimer > 0) this.controlsHintTimer -= dt * 1000;

        // Audio init on any key press + mute toggle (M)
        Audio.init();
        if (wasPressed('KeyM')) {
            this.muted = Audio.toggleMute();
        }

        // Always update particles (they should animate even on overlays)
        this.particles.update(dt);

        switch (this.state) {
            case STATE_MENU:            this._updateMenu();           break;
            case STATE_PROFILES:        this._updateProfiles();       break;
            case STATE_PLAYING:         this._updatePlaying(dt);      break;
            case STATE_PAUSED:          this._updatePaused();         break;
            case STATE_LEVEL_UP:        this._updateLevelUp();        break;
            case STATE_GAME_OVER:       this._updateGameOver();       break;
            case STATE_TRAINING_CONFIG: this._updateTrainingConfig(); break;
        }
    }

    // ── Profiles screen ────────────────────────────────────

    _updateProfiles() {
        // Creating a new character (typing name)
        if (this.profileCreating) {
            this._updateProfileCreate();
            return;
        }

        // Delete confirmation
        if (this.profileDeleting) {
            if (wasPressed('Enter')) {
                this._deleteProfile(this.profileCursor);
                this.profileDeleting = false;
            } else if (wasPressed('Escape')) {
                this.profileDeleting = false;
            }
            return;
        }

        // Navigation
        const maxIdx = Math.min(this.profiles.length, 5); // profiles + "+New" row
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.profileCursor = (this.profileCursor - 1 + maxIdx + 1) % (maxIdx + 1);
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.profileCursor = (this.profileCursor + 1) % (maxIdx + 1);
            Audio.playMenuNav();
        }

        // Select / Create
        if (wasPressed('Enter') || wasPressed('Space')) {
            Audio.playMenuSelect();
            if (this.profileCursor < this.profiles.length) {
                // Select this profile
                this.activeProfileIndex = this.profileCursor;
                this._saveProfiles();
                this.state = STATE_MENU;
                this.menuIndex = 0;
            } else {
                // Start creating
                this.profileCreating = true;
                this.profileNewName = '';
            }
        }

        // Delete (X key)
        if (wasPressed('KeyX') && this.profileCursor < this.profiles.length) {
            // Can't delete if it's the only profile
            if (this.profiles.length > 1) {
                this.profileDeleting = true;
            }
        }

        // Back
        if (wasPressed('Escape')) {
            this.state = STATE_MENU;
            this.menuIndex = 0;
        }
    }

    _updateProfileCreate() {
        if (wasPressed('Escape')) {
            this.profileCreating = false;
            return;
        }

        if (wasPressed('Enter')) {
            const name = this.profileNewName.trim();
            if (name.length > 0) {
                this.profiles.push({ name, highscore: 0 });
                this.activeProfileIndex = this.profiles.length - 1;
                this._saveProfiles();
                this.profileCreating = false;
                this.profileCursor = this.activeProfileIndex;
            }
            return;
        }

        // Backspace
        if (wasPressed('Backspace')) {
            this.profileNewName = this.profileNewName.slice(0, -1);
            return;
        }

        // Type character
        const key = getLastKey();
        if (key.length === 1 && this.profileNewName.length < MAX_NAME_LEN) {
            // Allow letters, numbers, spaces, some symbols
            if (/^[a-zA-Z0-9 ._\-]$/.test(key)) {
                this.profileNewName += key;
            }
        }
    }

    _deleteProfile(index) {
        if (index < 0 || index >= this.profiles.length) return;
        this.profiles.splice(index, 1);
        // Adjust active index
        if (this.activeProfileIndex >= this.profiles.length) {
            this.activeProfileIndex = Math.max(0, this.profiles.length - 1);
        } else if (this.activeProfileIndex > index) {
            this.activeProfileIndex--;
        }
        // Adjust cursor
        if (this.profileCursor >= this.profiles.length) {
            this.profileCursor = Math.max(0, this.profiles.length - 1);
        }
        this._saveProfiles();
    }

    _updatePlaying(dt) {
        // Teleport to training (T)
        if (!this.trainingMode && wasPressed('KeyT')) {
            this._teleportToTraining();
            return;
        }

        // Pause / Return from training (Escape or P)
        if (wasPressed('Escape') || wasPressed('KeyP')) {
            if (this.trainingMode) {
                this._returnFromTraining();
            } else {
                this.pauseIndex = 0;
                this.state = STATE_PAUSED;
            }
            return;
        }

        const movement = getMovement();
        // Reset lava slow flag each frame (hazards will set it if player is on lava)
        this.player.onLava = false;
        this.player.update(dt, movement, this.grid);

        // ── Combo timer + popups ──
        if (this.comboTimer > 0) {
            this.comboTimer -= dt * 1000;
            if (this.comboTimer <= 0) {
                this._comboReset();
            }
        }
        if (this.comboFlash > 0) {
            this.comboFlash -= dt * 1000;
        }
        // Update floating combo popups
        for (const p of this.comboPopups) {
            p.timer -= dt * 1000;
            p.y -= 30 * dt;  // float upward
        }
        this.comboPopups = this.comboPopups.filter(p => p.timer > 0);

        // Dash / Dodge Roll (Shift key)
        if (wasPressed('ShiftLeft') || wasPressed('ShiftRight')) {
            if (this.player.tryDash(movement)) {
                Audio.playPlayerDash();
                this.particles.dashBurst(this.player.x, this.player.y);
            }
        }

        // Dash trail particles while dashing
        if (this.player.dashing) {
            this.particles.dashTrail(
                this.player.x, this.player.y,
                this.player.dashDirX, this.player.dashDirY,
            );
        }

        // Attack
        if (isDown('Space')) {
            const hitCount = this.player.attack(this.enemies);
            if (hitCount >= 0) {
                Audio.playAttack();
                // Attack arc particles
                this.particles.attackArc(
                    this.player.x, this.player.y,
                    this.player.facingX, this.player.facingY,
                    ATTACK_RANGE,
                );
                if (hitCount > 0) {
                    Audio.playHit();
                    // Hit sparks on each damaged enemy
                    for (const e of this.enemies) {
                        if (!e.dead && e.damageFlashTimer > 100) {
                            const dx = e.x - this.player.x;
                            const dy = e.y - this.player.y;
                            const d = Math.sqrt(dx * dx + dy * dy) || 1;
                            this.particles.hitSparks(e.x, e.y, dx / d, dy / d);
                        }
                    }
                }
            }
        }

        // Track player HP to detect damage
        const hpBefore = this.player.hp;
        const shieldBefore = this.player.phaseShieldActive;
        const projCountBefore = this.projectiles.length;

        // Track door lock state
        const doorWasLocked = this.door.locked;

        // Enemies
        const noDamage = this.trainingMode && !this.trainingDamage;
        const dropsEnabled = !this.trainingMode || this.trainingDrops;
        for (const e of this.enemies) {
            e.update(dt, this.player, this.grid, this.enemies, this.projectiles, noDamage);

            if (e.dead && !e.xpGiven) {
                e.xpGiven = true;
                Audio.playEnemyDeath();

                // Death explosion particles
                const eColor = ENEMY_COLORS[e.type] || ENEMY_COLOR;
                this.particles.enemyDeath(e.x, e.y, eColor, e.radius);

                // Try to spawn a pickup drop
                if (dropsEnabled) {
                    const pickup = trySpawnPickup(e.x, e.y, e.type);
                    if (pickup) this.pickups.push(pickup);
                }

                // Combo kill registration (real game only)
                if (!this.trainingMode) {
                    this._comboRegisterKill(e.x, e.y);
                }

                if (!this.trainingMode) {
                    // Apply combo XP multiplier
                    const xp = Math.floor(e.xpValue * this.comboMultiplier);
                    if (this.player.addXp(xp)) {
                        Audio.playLevelUp();
                        // Level-up particles
                        this.particles.levelUp(this.player.x, this.player.y);
                        this.state = STATE_LEVEL_UP;
                        return;
                    }
                }
            }
        }

        // Detect new projectiles fired by shooters
        if (this.projectiles.length > projCountBefore) {
            Audio.playProjectile();
        }

        // Projectiles — update + trail particles
        for (const p of this.projectiles) {
            p.update(dt, this.player, this.grid, noDamage);
            if (!p.dead) {
                this.particles.projectileTrail(p.x, p.y);
            }
        }
        this.projectiles = this.projectiles.filter(p => !p.dead);

        // Hazards — update (damage, projectile spawning)
        for (const h of this.hazards) {
            h.update(dt, this.player, this.projectiles, this.grid, noDamage);
            if (h.justFired) {
                Audio.playArrowTrap();
            }
        }

        // Detect player damage
        if (this.player.hp < hpBefore) {
            Audio.playPlayerHurt();
            this.particles.playerDamage(this.player.x, this.player.y);
            triggerShake(6, 0.86);
        } else if (shieldBefore && !this.player.phaseShieldActive) {
            Audio.playShieldBlock();
            this.particles.shieldBlock(this.player.x, this.player.y);
        }

        // Pickups: update lifetime + check collection
        for (const pk of this.pickups) {
            pk.update(dt);
            if (!pk.dead && pk.checkCollection(this.player)) {
                // Heart Fragment = heal sound, others = pickup chime
                if (pk.type === 'heart_fragment') {
                    Audio.playHeal();
                } else {
                    Audio.playPickup();
                }
                // Pickup collection particles
                const info = PICKUP_INFO[pk.type];
                if (info) {
                    this.particles.pickupCollect(pk.x, pk.y, info.color, info.glow);
                }
                this.player.applyBuff(pk.type);
                pk.dead = true;
            }
        }
        this.pickups = this.pickups.filter(pk => !pk.dead);

        // Training: respawn enemies when all dead
        if (this.trainingMode) {
            const alive = this.enemies.filter(e => !e.dead).length;
            if (alive === 0) {
                this.trainingRespawnTimer += dt * 1000;
                if (this.trainingRespawnTimer >= TRAINING_RESPAWN_DELAY) {
                    this._respawnTrainingEnemies();
                }
            }
        }

        // Door
        this.door.update(dt, this.enemies, this.trainingMode);

        // Door unlock sound + particles
        if (doorWasLocked && !this.door.locked) {
            Audio.playDoorUnlock();
            this.particles.doorUnlock(
                this.door.x + this.door.width / 2,
                this.door.y + this.door.height / 2,
            );
        }

        if (this.trainingMode) {
            // In training the door is always open and returns to game/menu
            if (this.door.checkCollision(this.player)) {
                Audio.playDoorEnter();
                this._returnFromTraining();
            }
        } else {
            if (this.door.checkCollision(this.player)) {
                Audio.playDoorEnter();
                this.nextRoom();
            }
        }

        // Death (only in real game)
        if (!this.trainingMode && this.player.hp <= 0) {
            this._saveHighscore();
            this.player.clearBuffs();
            this._comboReset();
            Audio.playGameOver();
            triggerShake(10, 0.9);
            this.state = STATE_GAME_OVER;
        }

        // Death in training with damage on → full heal + respawn enemies
        if (this.trainingMode && this.trainingDamage && this.player.hp <= 0) {
            this.player.hp = this.player.maxHp;
            this.player.invulnTimer = 0;
            // Re-place player at spawn
            let spawnPos;
            if (this.trainingRoomIndex === -1) {
                ({ spawnPos } = parseTrainingRoom());
            } else {
                ({ spawnPos } = parseRoom(this.trainingRoomIndex));
            }
            this.player.x = spawnPos.col * TILE_SIZE + TILE_SIZE / 2;
            this.player.y = spawnPos.row * TILE_SIZE + TILE_SIZE / 2;
            this.projectiles = [];
            this.pickups = [];
            this._respawnTrainingEnemies();
        }
    }

    _respawnTrainingEnemies() {
        this.trainingRespawnTimer = 0;
        let spawnPos, doorPos;
        if (this.trainingRoomIndex === -1) {
            ({ spawnPos, doorPos } = parseTrainingRoom());
        } else {
            ({ spawnPos, doorPos } = parseRoom(this.trainingRoomIndex));
        }
        this._spawnTrainingEnemies(this.grid, spawnPos, doorPos);
    }

    _updatePaused() {
        // Resume with P or Escape
        if (wasPressed('KeyP')) {
            this.state = STATE_PLAYING;
            return;
        }

        // Navigate
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.pauseIndex = (this.pauseIndex - 1 + 2) % 2;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.pauseIndex = (this.pauseIndex + 1) % 2;
            Audio.playMenuNav();
        }

        // Confirm
        if (wasPressed('Enter') || wasPressed('Space') || wasPressed('Escape')) {
            Audio.playMenuSelect();
            if (this.pauseIndex === 0) {
                this.state = STATE_PLAYING;
            } else {
                this._saveHighscore();
                this.restart();
            }
        }
    }

    _updateLevelUp() {
        const choices = ['hp', 'speed', 'damage'];

        // Navigate with W/S or arrows
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.upgradeIndex = (this.upgradeIndex - 1 + 3) % 3;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.upgradeIndex = (this.upgradeIndex + 1) % 3;
            Audio.playMenuNav();
        }

        // Confirm with Space, Enter, or number keys
        let choice = null;
        if (wasPressed('Space') || wasPressed('Enter')) {
            choice = choices[this.upgradeIndex];
        } else if (wasPressed('Digit1')) { choice = 'hp'; }
        else if (wasPressed('Digit2')) { choice = 'speed'; }
        else if (wasPressed('Digit3')) { choice = 'damage'; }

        if (!choice) return;
        Audio.playMenuSelect();
        this.player.levelUp(choice);
        this.upgradeIndex = 0;

        // Chain level-ups
        this.state = this.player.xp >= this.player.xpToNext
            ? STATE_LEVEL_UP
            : STATE_PLAYING;
    }

    // ── Training Config Screen ──────────────────────────────

    _updateTrainingConfig() {
        const ROWS = 6; // 0=room, 1=enemy type, 2=count, 3=damage, 4=drops, 5=start
        const ENEMY_LABELS = ['All', 'Basic', 'Shooter', 'Dasher', 'Tank'];
        const roomCount = getRoomCount(); // 14

        // Navigate rows (W/S)
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.trainingConfigCursor = (this.trainingConfigCursor - 1 + ROWS) % ROWS;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.trainingConfigCursor = (this.trainingConfigCursor + 1) % ROWS;
            Audio.playMenuNav();
        }

        // Change values (A/D or Left/Right)
        const left  = wasPressed('KeyA') || wasPressed('ArrowLeft');
        const right = wasPressed('KeyD') || wasPressed('ArrowRight');

        if (this.trainingConfigCursor === 0) {
            // Room selection: -1 = training room, 0..roomCount-1 = game rooms
            if (left)  this.trainingRoomIndex = (this.trainingRoomIndex - 1 + roomCount + 1) % (roomCount + 1) - 1;
            if (right) this.trainingRoomIndex = (this.trainingRoomIndex + 1 + 1) % (roomCount + 1) - 1;
        } else if (this.trainingConfigCursor === 1) {
            // Enemy type
            if (left)  this.trainingEnemyType = (this.trainingEnemyType - 1 + ENEMY_LABELS.length) % ENEMY_LABELS.length;
            if (right) this.trainingEnemyType = (this.trainingEnemyType + 1) % ENEMY_LABELS.length;
        } else if (this.trainingConfigCursor === 2) {
            // Enemy count: 1..10
            if (left)  this.trainingEnemyCount = Math.max(1, this.trainingEnemyCount - 1);
            if (right) this.trainingEnemyCount = Math.min(10, this.trainingEnemyCount + 1);
        } else if (this.trainingConfigCursor === 3) {
            // Damage toggle
            if (left || right) this.trainingDamage = !this.trainingDamage;
        } else if (this.trainingConfigCursor === 4) {
            // Drops toggle
            if (left || right) this.trainingDrops = !this.trainingDrops;
        }

        // Play nav sound for A/D value changes
        if (left || right) Audio.playMenuNav();

        // Confirm (Enter / Space) — start training from any row
        if (wasPressed('Enter') || wasPressed('Space')) {
            Audio.playMenuSelect();
            if (this._trainingFromGame) {
                this._enterTrainingFromGame();
            } else {
                this._startTraining();
            }
            return;
        }

        // Back
        if (wasPressed('Escape')) {
            if (this._trainingFromGame) {
                // Cancel: restore saved state and resume
                if (this._savedGame) {
                    this.stage = this._savedGame.stage;
                    this.enemies = this._savedGame.enemies;
                    this.door = this._savedGame.door;
                    this.grid = this._savedGame.grid;
                    this.projectiles = this._savedGame.projectiles || [];
                    this.hazards = this._savedGame.hazards || [];
                    this._savedGame = null;
                }
                this.state = STATE_PLAYING;
            } else {
                this.state = STATE_MENU;
                this.menuIndex = 0;
            }
        }
    }

    _updateGameOver() {
        if (wasPressed('Enter') || wasPressed('Space')) {
            Audio.playMenuSelect();
            this.restart();
        }
    }

    // ── Render ─────────────────────────────────────────────

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (this.state === STATE_MENU) {
            const profileName = this.activeProfile ? this.activeProfile.name : null;
            renderMenu(ctx, this.menuIndex, this.highscore, profileName);
            return;
        }

        if (this.state === STATE_PROFILES) {
            renderProfiles(ctx, this.profiles, this.activeProfileIndex,
                           this.profileCursor, this.profileCreating,
                           this.profileNewName, this.profileDeleting);
            return;
        }

        if (this.state === STATE_TRAINING_CONFIG) {
            const ENEMY_LABELS = ['All', 'Basic', 'Shooter', 'Dasher', 'Tank'];
            const roomName = this.trainingRoomIndex === -1
                ? TRAINING_ROOM_NAME
                : ROOM_NAMES[this.trainingRoomIndex] || `Room ${this.trainingRoomIndex + 1}`;
            renderTrainingConfig(
                ctx,
                this.trainingConfigCursor,
                this.trainingRoomIndex,
                roomName,
                ENEMY_LABELS[this.trainingEnemyType],
                this.trainingEnemyCount,
                this.trainingDamage,
                this.trainingDrops,
                this._trainingFromGame,
            );
            return;
        }

        renderRoom(ctx, this.grid);
        for (const h of this.hazards) h.render(ctx);
        this.door.render(ctx);
        for (const e of this.enemies) e.render(ctx);
        for (const p of this.projectiles) p.render(ctx);
        for (const pk of this.pickups) pk.render(ctx);
        this.particles.render(ctx);
        this.player.render(ctx);

        // Locked-door hint (real game only)
        if (!this.trainingMode && this.door.locked && this.door.isPlayerNear(this.player)) {
            this._renderTooltip(
                this.door.x + this.door.width / 2,
                this.door.y - 14,
                'LOCKED', '#e74c3c',
            );
        }

        // Training door hint
        if (this.trainingMode && this.door.isPlayerNear(this.player)) {
            const label = this._savedGame ? 'RETURN (or ESC)' : 'EXIT (or ESC)';
            this._renderTooltip(
                this.door.x + this.door.width / 2,
                this.door.y - 14,
                label, '#27ae60',
            );
        }

        const alive = this.enemies.filter(e => !e.dead).length;
        renderHUD(ctx, this.player, this.stage, alive, this.trainingMode, this.muted,
                  this.comboCount, this.comboTier, this.comboMultiplier, this.comboTimer);

        // ── Combo screen flash ──
        if (this.comboFlash > 0 && this.comboFlashColor) {
            const flashAlpha = Math.min(0.15, (this.comboFlash / 400) * 0.15);
            ctx.save();
            ctx.globalAlpha = flashAlpha;
            ctx.fillStyle = this.comboFlashColor;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();
        }

        // ── Combo floating popups ──
        for (const p of this.comboPopups) {
            const alpha = Math.min(1, p.timer / (p.maxTimer * 0.3));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.font = `bold ${p.size}px monospace`;
            ctx.textAlign = 'center';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        }

        // Training mode banner
        if (this.trainingMode) {
            this._renderTrainingBanner(ctx);
        }

        // Controls hint
        if (this.controlsHintTimer > 0 && this.state === STATE_PLAYING) {
            this._renderControlsHint(ctx);
        }

        // Training respawn countdown
        if (this.trainingMode && this.enemies.every(e => e.dead)) {
            const remaining = Math.max(0, TRAINING_RESPAWN_DELAY - this.trainingRespawnTimer);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
                `Enemies respawn in ${(remaining / 1000).toFixed(1)}s`,
                CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
            );
            ctx.textAlign = 'left';
        }

        // Overlays
        if (this.state === STATE_PAUSED) {
            this._renderPauseOverlay(ctx);
        } else if (this.state === STATE_LEVEL_UP) {
            renderLevelUpOverlay(ctx, this.player, this.upgradeIndex);
        } else if (this.state === STATE_GAME_OVER) {
            renderGameOverOverlay(ctx, this.stage, this.player.level);
        }
    }

    _renderPauseOverlay(ctx) {
        // Dim background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Pause box
        const boxW = 300;
        const boxH = 200;
        const bx = CANVAS_WIDTH / 2 - boxW / 2;
        const by = CANVAS_HEIGHT / 2 - boxH / 2;

        ctx.fillStyle = 'rgba(15, 15, 25, 0.95)';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.textAlign = 'center';

        // Title
        ctx.fillStyle = '#4fc3f7';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('PAUSED', CANVAS_WIDTH / 2, by + 50);

        // Stage info
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.fillText(`Stage ${this.stage}  ·  Level ${this.player.level}`, CANVAS_WIDTH / 2, by + 72);

        // Options
        const options = [
            { label: 'RESUME', color: '#4fc3f7' },
            { label: 'BACK TO MENU', color: '#e74c3c' },
        ];

        const startY = by + 110;
        const spacing = 44;

        options.forEach((opt, i) => {
            const oy = startY + i * spacing;
            const selected = i === this.pauseIndex;

            if (selected) {
                const selW = 220;
                const selH = 34;
                ctx.fillStyle = 'rgba(79,195,247,0.08)';
                ctx.fillRect(CANVAS_WIDTH / 2 - selW / 2, oy - 20, selW, selH);
                ctx.strokeStyle = opt.color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(CANVAS_WIDTH / 2 - selW / 2, oy - 20, selW, selH);

                ctx.fillStyle = opt.color;
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('▸', CANVAS_WIDTH / 2 - 85, oy);
                ctx.textAlign = 'center';
            }

            ctx.fillStyle = selected ? opt.color : '#555';
            ctx.font = `bold 16px monospace`;
            ctx.fillText(opt.label, CANVAS_WIDTH / 2, oy);
        });

        // Hint
        ctx.fillStyle = '#444';
        ctx.font = '10px monospace';
        ctx.fillText('P = Quick Resume', CANVAS_WIDTH / 2, by + boxH - 14);
        ctx.textAlign = 'left';
    }

    _renderTooltip(x, y, text, color) {
        const ctx = this.ctx;
        const w = text.length * 7 + 16;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - w / 2, y - 11, w, 15);
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y);
        ctx.textAlign = 'left';
    }

    _renderTrainingBanner(ctx) {
        const bw = 200;
        const bh = 22;
        const bx = CANVAS_WIDTH / 2 - bw / 2;
        const by = CANVAS_HEIGHT - 30;

        ctx.fillStyle = 'rgba(255,215,0,0.12)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TRAINING MODE', CANVAS_WIDTH / 2, by + 15);

        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        if (this._savedGame) {
            ctx.fillText('ESC = Return to game  |  Door = Return', CANVAS_WIDTH / 2, by - 6);
        } else {
            ctx.fillText('ESC = Back to menu  |  Door = Exit', CANVAS_WIDTH / 2, by - 6);
        }
        ctx.textAlign = 'left';
    }

    _renderControlsHint(ctx) {
        const alpha = Math.min(1, this.controlsHintTimer / 1000);
        ctx.save();
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = '#000';
        ctx.fillRect(CANVAS_WIDTH / 2 - 260, CANVAS_HEIGHT - 68, 520, 28);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#bbb';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        const hint = this.trainingMode
            ? 'WASD = Move   SPACE = Attack   SHIFT = Dash   M = Mute   ESC = Exit'
            : 'WASD = Move   SPACE = Attack   SHIFT = Dash   M = Mute   T = Training   P = Pause';
        ctx.fillText(hint, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
        ctx.textAlign = 'left';
        ctx.restore();
    }
}
