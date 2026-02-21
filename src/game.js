import {
    CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE,
    ENEMY_HP, ENEMY_SPEED, ENEMY_DAMAGE, ENEMY_XP,
    ENEMY_TYPE_BASIC, ENEMY_TYPE_SHOOTER, ENEMY_TYPE_TANK, ENEMY_TYPE_DASHER,
    ENEMY_COLOR, SHOOTER_COLOR, TANK_COLOR, DASHER_COLOR,
    SHOOTER_INTRO_STAGE, TANK_INTRO_STAGE, DASHER_INTRO_STAGE,
    TRAINING_ENEMY_COUNT, TRAINING_RESPAWN_DELAY,
    ATTACK_RANGE, DASH_COOLDOWN, DAGGER_COOLDOWN,
    UPGRADE_HP, UPGRADE_SPEED, UPGRADE_DAMAGE,
    STATE_MENU, STATE_PROFILES, STATE_PLAYING, STATE_PAUSED, STATE_LEVEL_UP, STATE_GAME_OVER,
    STATE_TRAINING_CONFIG, STATE_BOSS_VICTORY, STATE_META_MENU, STATE_SETTINGS,
    COMBO_TIMEOUT, COMBO_TIER_1, COMBO_TIER_2, COMBO_TIER_3, COMBO_TIER_4,
    COMBO_XP_MULT_1, COMBO_XP_MULT_2, COMBO_XP_MULT_3, COMBO_XP_MULT_4,
    BOSS_STAGE_INTERVAL, BOSS_TYPE_BRUTE, BOSS_TYPE_WARLOCK, BOSS_TYPE_PHANTOM,
    BOSS_REWARD_HP, BOSS_REWARD_DAMAGE, BOSS_REWARD_SPEED,
} from './constants.js';
import { isDown, wasPressed, getMovement, getLastKey, getActivatedCheat } from './input.js';
import { parseRoom, parseTrainingRoom, getEnemySpawns, generateHazards, ROOM_NAMES, TRAINING_ROOM_NAME, getRoomCount, parseBossRoom, BOSS_ROOM_NAME } from './rooms.js';
import { renderRoom, renderAtmosphere } from './render.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Projectile, PlayerProjectile } from './entities/projectile.js';
import { Door } from './entities/door.js';
import { Boss } from './entities/boss.js';
import { trySpawnPickup, PICKUP_INFO } from './entities/pickup.js';
import { ParticleSystem } from './entities/particle.js';
import { triggerShake } from './shake.js';
import { renderHUD, renderBossHPBar } from './ui/hud.js';
import { renderLevelUpOverlay, renderGameOverOverlay, renderBossVictoryOverlay } from './ui/levelup.js';
import { renderMenu } from './ui/menu.js';
import { renderProfiles, MAX_NAME_LEN } from './ui/profiles.js';
import { renderTrainingConfig } from './ui/training-config.js';
import { renderSettings } from './ui/settings.js';
import * as Audio from './audio.js';
import * as Music from './music.js';
import { getBiomeForStage } from './biomes.js';

// ── Meta Progression ──
import * as MetaStore from './meta/metaStore.js';
import * as RewardSystem from './meta/rewardSystem.js';
import { RELIC_DEFINITIONS } from './meta/relics.js';
import { RUN_UPGRADE_DEFINITIONS, getUnlockedRunUpgradeIds } from './meta/rewardSystem.js';
import { PERK_IDS, upgradePerk, canUpgrade } from './meta/metaPerks.js';
import { renderMetaMenu, META_TAB_PERKS, META_TAB_RELICS, META_TAB_STATS, META_TAB_COUNT } from './meta/uiMetaMenu.js';
import { showToast, showBigToast, updateToasts, renderToasts, clearToasts } from './meta/uiRewardsToast.js';
import { getAvailableShards } from './meta/metaState.js';

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

        // Load meta progression for the active profile
        MetaStore.load(this.activeProfileIndex);

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
        this.playerProjectiles = [];  // player-fired daggers
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
        this._cachedLevelUpChoices = null; // cached to avoid different random choices between update & render

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

        // ── Settings screen ──
        this.settingsCursor = 0;  // 0=SFX, 1=Music, 2=Back

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

        // ── Boss ──
        this.boss = null;
        this.bossRewardIndex = 0;     // 0=HP, 1=Damage, 2=Speed
        this.bossVictoryDelay = 0;    // ms delay before showing victory overlay
        this.lastBossReward = null;   // reward result from last boss kill

        // ── Biome system ──
        this.currentBiome = null;          // biome object for current stage
        this.biomeAnnounceTimer = 0;       // ms remaining for biome banner

        // ── Meta Progression ──
        this.metaModifiers = null;         // combined perk+relic modifiers for current run
        this.metaTab = META_TAB_PERKS;     // meta menu active tab
        this.metaPerkCursor = 0;           // selected perk in meta menu
        this.metaFromGameOver = false;     // opened meta menu from game over screen
        this.bossesKilledThisRun = 0;      // track boss count for first-boss bonus

        // ── Run upgrade tracking (chosen during level-up) ──
        this.runUpgradesActive = {};       // Record<upgradeId, true> — picked this run
        this.shieldCharges = 0;            // from upgrade_shield
        this.regenTimer = 0;               // from upgrade_regen

        // ── Cheat codes ──
        this.cheats = {
            godmode:    false,   // IDDQD  — invincible
            onehitkill: false,   // IDKFA  — enemies die in one hit
            xpboost:    false,   // BIGXP  — 10× XP gain
        };
        this.cheatNotifications = [];  // [{text, timer, color}]
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

    // ── Cheat codes ──────────────────────────────────────────

    _processCheatCodes() {
        const cheatId = getActivatedCheat();
        if (!cheatId) return;

        switch (cheatId) {
            case 'godmode': {
                this.cheats.godmode = !this.cheats.godmode;
                this._cheatNotify(
                    this.cheats.godmode ? 'GOD MODE ON' : 'GOD MODE OFF',
                    this.cheats.godmode ? '#ffd700' : '#888',
                );
                break;
            }
            case 'onehitkill': {
                this.cheats.onehitkill = !this.cheats.onehitkill;
                this._cheatNotify(
                    this.cheats.onehitkill ? 'ONE HIT KILL ON' : 'ONE HIT KILL OFF',
                    this.cheats.onehitkill ? '#ff4444' : '#888',
                );
                break;
            }
            case 'xpboost': {
                this.cheats.xpboost = !this.cheats.xpboost;
                this._cheatNotify(
                    this.cheats.xpboost ? 'XP BOOST ×10 ON' : 'XP BOOST OFF',
                    this.cheats.xpboost ? '#bb86fc' : '#888',
                );
                break;
            }
            case 'fullheal': {
                if (this.player) {
                    this.player.hp = this.player.maxHp;
                    this._cheatNotify('FULL HEAL', '#4caf50');
                }
                break;
            }
            case 'skipstage': {
                if (this.state === STATE_PLAYING && !this.trainingMode) {
                    this.nextRoom();
                    this._cheatNotify('STAGE SKIPPED', '#4fc3f7');
                }
                break;
            }
            case 'maxlevel': {
                if (this.player) {
                    for (let i = 0; i < 10; i++) {
                        this.player.level++;
                        this.player.xpToNext = Math.floor(this.player.xpToNext * 1.25);
                        this.player.damage += 8;
                        this.player.maxHp += 25;
                        this.player.hp = this.player.maxHp;
                        this.player.speed += 15;
                    }
                    this._cheatNotify('+10 LEVELS', '#ffd700');
                }
                break;
            }
        }
    }

    _cheatNotify(text, color) {
        Audio.playMenuSelect();
        this.cheatNotifications.push({ text, timer: 2500, color });
    }

    // ── Menu ───────────────────────────────────────────────

    _updateMenu() {
        const count = 5; // Play, Training, Characters, Settings, Meta Progress
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
            } else if (this.menuIndex === 2) {
                this.profileCursor = 0;
                this.profileCreating = false;
                this.profileDeleting = false;
                this.state = STATE_PROFILES;
            } else if (this.menuIndex === 3) {
                this.settingsCursor = 0;
                this.state = STATE_SETTINGS;
            } else if (this.menuIndex === 4) {
                this._openMetaMenu(false);
            }
        }
    }

    _startGame() {
        this.trainingMode = false;
        this._savedGame = null;
        this.stage = 1;
        this.player = null;
        this.pickups = [];
        this.playerProjectiles = [];
        this.controlsHintTimer = 5000;
        this._comboReset();
        this.comboPopups = [];
        this.comboFlash = 0;
        this.boss = null;
        this.bossVictoryDelay = 0;
        this._updateBiome();
        this.biomeAnnounceTimer = 3000;  // announce first biome
        this.loadRoom(0);

        // ── Meta Progression: apply modifiers at run start ──
        this.metaModifiers = RewardSystem.onRunStart();
        this.bossesKilledThisRun = 0;
        this.runUpgradesActive = {};
        this.shieldCharges = 0;
        this.regenTimer = 0;
        this._applyMetaModifiers();

        this.state = STATE_PLAYING;
    }

    /** Compute the current biome from stage and apply player modifiers */
    _updateBiome() {
        this.currentBiome = getBiomeForStage(this.stage);
        if (this.player) {
            this.player.biomeSpeedMult = this.currentBiome
                ? this.currentBiome.playerSpeedMult
                : 1.0;
        }
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
        this.currentBiome = null;
        if (this.player) this.player.biomeSpeedMult = 1.0;
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
        const hazardWeights = this.currentBiome ? this.currentBiome.hazardWeights : null;
        this.hazards = generateHazards(grid, spawnPos, doorPos, this.stage, hazardWeights);
        this.pickups = [];
        this.playerProjectiles = [];
        this.particles.clear();

        // Run upgrade: shield — grant shield charge as invuln at room start
        if (this.runUpgradesActive && this.runUpgradesActive.upgrade_shield && this.shieldCharges > 0) {
            this.player.invulnTimer = Math.max(this.player.invulnTimer, 1500);
            this.shieldCharges--;
        }
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
        this.playerProjectiles = [];
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
        // Apply biome speed modifier
        this.player.biomeSpeedMult = this.currentBiome
            ? this.currentBiome.playerSpeedMult
            : 1.0;
    }

    _spawnEnemies(grid, spawnPos, doorPos) {
        const count = Math.min(2 + Math.floor((this.stage - 1) * 0.75), 10);
        const hpBase = Math.floor(ENEMY_HP * (1 + (this.stage - 1) * 0.15));
        const spdBase = Math.min(ENEMY_SPEED * (1 + (this.stage - 1) * 0.05), ENEMY_SPEED * 2);
        const dmgBase = ENEMY_DAMAGE + Math.floor((this.stage - 1) * 0.5);

        const types = this._getEnemyTypes(this.stage, count, this.currentBiome);
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
    _getEnemyTypes(stage, count, biome = null) {
        if (stage < SHOOTER_INTRO_STAGE) {
            return Array(count).fill(ENEMY_TYPE_BASIC);
        }

        // Build base probability for each type
        let pShooter = stage >= SHOOTER_INTRO_STAGE
            ? Math.min(0.15 + (stage - SHOOTER_INTRO_STAGE) * 0.02, 0.30) : 0;
        let pDasher = stage >= DASHER_INTRO_STAGE
            ? Math.min(0.12 + (stage - DASHER_INTRO_STAGE) * 0.02, 0.22) : 0;
        let pTank = stage >= TANK_INTRO_STAGE
            ? Math.min(0.08 + (stage - TANK_INTRO_STAGE) * 0.02, 0.15) : 0;
        let pBasic = 1 - pShooter - pDasher - pTank;

        // Apply biome enemy weight modifiers (multiply + renormalize)
        if (biome && biome.enemyWeights) {
            const w = biome.enemyWeights;
            pBasic   *= (w.basic   || 1);
            pShooter *= (w.shooter || 1);
            pDasher  *= (w.dasher  || 1);
            pTank    *= (w.tank    || 1);
            const total = pBasic + pShooter + pDasher + pTank;
            if (total > 0) {
                pBasic   /= total;
                pShooter /= total;
                pDasher  /= total;
                pTank    /= total;
            }
        }

        const types = [];
        for (let i = 0; i < count; i++) {
            const roll = Math.random();
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
        const oldBiome = this.currentBiome;
        this.stage++;
        this._saveHighscore();
        this._updateBiome();

        // Meta: rare 1% shard from normal room clear
        if (!this._isBossStage(this.stage - 1)) {
            const rareShards = RewardSystem.processRoomClear();
            if (rareShards > 0) {
                showToast('+1 Core Shard (rare!)', '#ffd700', '◆');
                Audio.playShardGain();
            }
        }

        // Shield charge regen from run upgrade
        if (this.runUpgradesActive.upgrade_shield) {
            this.shieldCharges = Math.min(this.shieldCharges + 1, 3);
        }

        // Announce biome change
        if (this.currentBiome && (!oldBiome || oldBiome.id !== this.currentBiome.id)) {
            this.biomeAnnounceTimer = 3000;
        }

        if (this._isBossStage(this.stage)) {
            this._loadBossRoom();
        } else {
            this.boss = null;
            this.bossVictoryDelay = 0;
            this.loadRoom(this.stage - 1);
        }
    }

    _isBossStage(stage) {
        return stage > 0 && stage % BOSS_STAGE_INTERVAL === 0;
    }

    _loadBossRoom() {
        const { grid, spawnPos, doorPos } = parseBossRoom();
        this.grid = grid;
        this._placePlayer(spawnPos);
        this.door = new Door(doorPos.col, doorPos.row);
        this.enemies = [];
        this.projectiles = [];
        this.playerProjectiles = [];
        this.hazards = [];
        this.pickups = [];
        this.particles.clear();
        this.bossVictoryDelay = 0;

        // Determine boss type (rotates: Brute → Warlock → Phantom)
        const encounter = Math.floor(this.stage / BOSS_STAGE_INTERVAL) - 1;
        const bossTypes = [BOSS_TYPE_BRUTE, BOSS_TYPE_WARLOCK, BOSS_TYPE_PHANTOM];
        const bossType = bossTypes[encounter % bossTypes.length];

        this.boss = new Boss(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, bossType, encounter, this.stage);
        Audio.playBossRoar();
        this.controlsHintTimer = 3000;
    }

    // ── Teleport to training (T key) ──────────────────────

    _teleportToTraining() {
        this._savedGame = {
            stage: this.stage,
            enemies: this.enemies,
            door: this.door,
            grid: this.grid,
            projectiles: this.projectiles,
            playerProjectiles: this.playerProjectiles,
            pickups: this.pickups,
            hazards: this.hazards,
            boss: this.boss,
        };
        this._openTrainingConfig(true);
    }

    /** Actually enter training after config (when coming from mid-game) */
    _enterTrainingFromGame() {
        this.trainingMode = true;
        this.projectiles = [];
        this.playerProjectiles = [];
        this.stage = 0;
        this.currentBiome = null;
        this.player.biomeSpeedMult = 1.0;
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
        this.playerProjectiles = this._savedGame.playerProjectiles || [];
        this.pickups = this._savedGame.pickups || [];
        this.hazards = this._savedGame.hazards || [];
        this.boss = this._savedGame.boss || null;
        this.trainingMode = false;
        this._savedGame = null;

        let spawnPos;
        if (this._isBossStage(this.stage)) {
            ({ spawnPos } = parseBossRoom());
        } else {
            ({ spawnPos } = parseRoom(this.stage - 1));
        }
        this.player.x = spawnPos.col * TILE_SIZE + TILE_SIZE / 2;
        this.player.y = spawnPos.row * TILE_SIZE + TILE_SIZE / 2;
        this.player.hp = this.player.maxHp;
        this.controlsHintTimer = 0;
        this._updateBiome();  // restore biome from saved stage
        this.state = STATE_PLAYING;
    }

    restart() {
        this.state = STATE_MENU;
        this.menuIndex = 0;
        this.trainingMode = false;
        this._savedGame = null;
        this.projectiles = [];
        this.playerProjectiles = [];
        this.pickups = [];
        this.hazards = [];
        this.particles.clear();
        this._comboReset();
        this.comboPopups = [];
        this.comboFlash = 0;
        this.boss = null;
        this.bossVictoryDelay = 0;
        this.currentBiome = null;
        this.biomeAnnounceTimer = 0;
        clearToasts();
    }

    // ── Meta Progression helpers ──────────────────────────────

    /** Apply meta perk + relic modifiers to the player at run start. */
    _applyMetaModifiers() {
        if (!this.player || !this.metaModifiers) return;
        const m = this.metaModifiers;

        // HP multiplier (perk)
        this.player.maxHp = Math.floor(this.player.maxHp * m.hpMultiplier);
        this.player.hp = this.player.maxHp;

        // Damage multiplier (perk only, not relic general damage)
        this.player.damage = Math.floor(this.player.damage * m.damageMultiplier);

        // Speed multiplier (perk + relic)
        this.player.speed = Math.floor(this.player.speed * m.speedMultiplier);

        // Starting XP bonus (relic)
        if (m.startingXpBonus > 0) {
            this.player.addXp(m.startingXpBonus);
        }

        // Store modifiers on player for runtime use
        this.player.metaBossDamageMultiplier = m.bossDamageMultiplier;
        this.player.metaDamageTakenMultiplier = m.damageTakenMultiplier;
        this.player.metaSpikeDamageMultiplier = m.spikeDamageMultiplier;
        this.player.metaLavaDotMultiplier = m.lavaDotMultiplier;
    }

    /** Open meta menu from any screen. */
    _openMetaMenu(fromGameOver) {
        this.metaFromGameOver = fromGameOver;
        this.metaTab = META_TAB_PERKS;
        this.metaPerkCursor = 0;
        this.state = STATE_META_MENU;
    }

    /** Update meta menu input. */
    _updateMetaMenu() {
        // Tab switching (A/D or Left/Right)
        if (wasPressed('KeyA') || wasPressed('ArrowLeft')) {
            this.metaTab = (this.metaTab - 1 + META_TAB_COUNT) % META_TAB_COUNT;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyD') || wasPressed('ArrowRight')) {
            this.metaTab = (this.metaTab + 1) % META_TAB_COUNT;
            Audio.playMenuNav();
        }

        // Perk selection (W/S) — only on perks tab
        if (this.metaTab === META_TAB_PERKS) {
            if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
                this.metaPerkCursor = (this.metaPerkCursor - 1 + PERK_IDS.length) % PERK_IDS.length;
                Audio.playMenuNav();
            }
            if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
                this.metaPerkCursor = (this.metaPerkCursor + 1) % PERK_IDS.length;
                Audio.playMenuNav();
            }

            // Buy perk
            if (wasPressed('Enter') || wasPressed('Space')) {
                const perkId = PERK_IDS[this.metaPerkCursor];
                if (canUpgrade(perkId)) {
                    upgradePerk(perkId);
                    Audio.playPerkUpgrade();
                } else {
                    // Can't afford or maxed — do nothing
                }
            }
        }

        // Back
        if (wasPressed('Escape')) {
            if (this.metaFromGameOver) {
                this.state = STATE_GAME_OVER;
            } else {
                this.state = STATE_MENU;
                this.menuIndex = 0;
            }
        }
    }

    // ── Update ─────────────────────────────────────────────

    update(dt) {
        if (this.controlsHintTimer > 0) this.controlsHintTimer -= dt * 1000;

        // Audio init on any key press + mute toggle (M)
        Audio.init();
        Music.initMusic();
        if (!Music.isMusicPlaying()) {
            Music.startMusic();
            Music.setMusicMuted(this.muted);
        }


        // Always update particles (they should animate even on overlays)
        this.particles.update(dt);

        // Always update toasts
        updateToasts(dt);

        // ── Cheat code processing ──
        this._processCheatCodes();
        // Update cheat notifications
        for (const n of this.cheatNotifications) n.timer -= dt * 1000;
        this.cheatNotifications = this.cheatNotifications.filter(n => n.timer > 0);

        switch (this.state) {
            case STATE_MENU:            this._updateMenu();           break;
            case STATE_PROFILES:        this._updateProfiles();       break;
            case STATE_PLAYING:         this._updatePlaying(dt);      break;
            case STATE_PAUSED:          this._updatePaused();         break;
            case STATE_LEVEL_UP:        this._updateLevelUp();        break;
            case STATE_GAME_OVER:       this._updateGameOver();       break;
            case STATE_TRAINING_CONFIG: this._updateTrainingConfig(); break;
            case STATE_BOSS_VICTORY:    this._updateBossVictory();   break;
            case STATE_META_MENU:       this._updateMetaMenu();      break;
            case STATE_SETTINGS:        this._updateSettings();      break;
        }

        // Adaptive music — set danger level based on game state
        this._updateMusicDanger();
        Music.updateMusic(dt);
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
                MetaStore.load(this.activeProfileIndex);
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
                MetaStore.load(this.activeProfileIndex);
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
        // Delete meta data for this profile (and shift higher indices)
        MetaStore.deleteProfileMeta(index, this.profiles.length);
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
        // Reload meta for the (possibly changed) active profile
        MetaStore.load(this.activeProfileIndex);
    }

    _updatePlaying(dt) {
        // Boss victory delay (freeze frame while particles play)
        if (this.bossVictoryDelay > 0) {
            this.bossVictoryDelay -= dt * 1000;
            if (this.bossVictoryDelay <= 0) {
                Audio.playBossVictory();
                this.bossRewardIndex = 0;
                clearToasts();
                this.state = STATE_BOSS_VICTORY;
            }
            return;
        }

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

        // ── Cheat: God Mode — keep player invulnerable ──
        if (this.cheats.godmode && this.player) {
            this.player.invulnTimer = 999;
            this.player.hp = this.player.maxHp;
        }

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
        // Biome announcement timer
        if (this.biomeAnnounceTimer > 0) {
            this.biomeAnnounceTimer -= dt * 1000;
        }
        // Update floating combo popups
        for (const p of this.comboPopups) {
            p.timer -= dt * 1000;
            p.y -= 30 * dt;  // float upward
        }
        this.comboPopups = this.comboPopups.filter(p => p.timer > 0);

        // Biome ambient particles (leaves, embers, bubbles, etc.)
        if (this.currentBiome) {
            this.particles.biomeAmbient(this.currentBiome);
        }

        // Dash / Dodge Roll (M key)
        if (wasPressed('KeyM')) {
            if (this.player.tryDash(movement)) {
                Audio.playPlayerDash();
                this.particles.dashBurst(this.player.x, this.player.y);
            }
        }

        // ── Run upgrade: Regeneration (heal 1 HP every 3s) ──
        if (this.runUpgradesActive.upgrade_regen && this.player.hp < this.player.maxHp) {
            this.regenTimer += dt * 1000;
            if (this.regenTimer >= 3000) {
                this.regenTimer -= 3000;
                this.player.hp = Math.min(this.player.hp + 1, this.player.maxHp);
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
            const targets = this.boss && !this.boss.dead
                ? [...this.enemies, this.boss]
                : this.enemies;

            // ── Cheat: One Hit Kill — temporarily set massive damage ──
            let savedDmg;
            if (this.cheats.onehitkill) {
                savedDmg = this.player.damage;
                this.player.damage = 999999;
            }

            const hitCount = this.player.attack(targets);

            if (this.cheats.onehitkill && savedDmg !== undefined) {
                this.player.damage = savedDmg;
            }
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
                    // Run upgrade: lifesteal — heal 1% of damage dealt per hit
                    if (this.runUpgradesActive.upgrade_lifesteal && hitCount > 0) {
                        const healAmt = Math.max(1, Math.floor(this.player.damage * 0.01 * hitCount));
                        this.player.hp = Math.min(this.player.hp + healAmt, this.player.maxHp);
                    }
                    // Hit sparks on each damaged enemy
                    for (const e of this.enemies) {
                        if (!e.dead && e.damageFlashTimer > 100) {
                            const dx = e.x - this.player.x;
                            const dy = e.y - this.player.y;
                            const d = Math.sqrt(dx * dx + dy * dy) || 1;
                            this.particles.hitSparks(e.x, e.y, dx / d, dy / d);
                        }
                    }
                    // Boss hit sparks
                    if (this.boss && !this.boss.dead && this.boss.damageFlashTimer > 100) {
                        const bx = this.boss.x - this.player.x;
                        const by = this.boss.y - this.player.y;
                        const bd = Math.sqrt(bx * bx + by * by) || 1;
                        this.particles.hitSparks(this.boss.x, this.boss.y, bx / bd, by / bd);
                    }
                }
            }
        }

        // Ranged Attack (N key) — throw dagger
        if (wasPressed('KeyN')) {
            const throwData = this.player.tryThrow();
            if (throwData) {
                const dagger = new PlayerProjectile(
                    throwData.x, throwData.y,
                    throwData.dirX, throwData.dirY,
                    throwData.speed, throwData.damage,
                    throwData.radius, throwData.color,
                    throwData.maxDist, throwData.knockback,
                );
                // Meta relic: Boss Hunter — extra damage vs bosses
                if (this.metaModifiers && this.metaModifiers.bossDamageMultiplier > 1) {
                    dagger.bossDamageMultiplier = this.metaModifiers.bossDamageMultiplier;
                }
                this.playerProjectiles.push(dagger);
                Audio.playDaggerThrow();
                // Throw particles
                this.particles.daggerThrow(
                    throwData.x, throwData.y,
                    throwData.dirX, throwData.dirY,
                );
            }
        }

        // Track player HP to detect damage
        const hpBefore = this.player.hp;
        const shieldBefore = this.player.phaseShieldActive;
        const shieldChargesBefore = this.shieldCharges;
        const projCountBefore = this.projectiles.length;

        // Run upgrade: shield — if player is about to take damage, store pre-invuln state
        // (shield charges are checked after enemy updates by comparing HP)

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
                    // Apply combo XP multiplier + cheat XP boost + meta XP multiplier
                    const xpMult = this.cheats.xpboost ? 10 : 1;
                    const metaXpMult = this.metaModifiers ? this.metaModifiers.xpMultiplier : 1;
                    const runXpMult = this.runUpgradesActive.upgrade_xp_magnet ? 1.15 : 1;
                    const xp = Math.floor(e.xpValue * this.comboMultiplier * xpMult * metaXpMult * runXpMult);
                    if (this.player.addXp(xp)) {
                        Audio.playLevelUp();
                        // Level-up particles
                        this.particles.levelUp(this.player.x, this.player.y);
                        // Relic: heal on level-up
                        if (this.metaModifiers && this.metaModifiers.healOnLevelUpPct > 0) {
                            const healAmt = Math.floor(this.player.maxHp * this.metaModifiers.healOnLevelUpPct);
                            this.player.hp = Math.min(this.player.hp + healAmt, this.player.maxHp);
                        }
                        this._cachedLevelUpChoices = this._getLevelUpChoices();
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

        // ── Boss update ──
        if (this.boss && !this.boss.dead) {
            this.boss.update(dt, this.player, this.grid, this.enemies, this.projectiles);

            // Process boss events
            for (const evt of this.boss._events) {
                switch (evt.type) {
                    case 'slam':
                        Audio.playBossSlam();
                        this.particles.bossSlam(evt.x, evt.y, evt.radius, this.boss.color);
                        triggerShake(8, 0.88);
                        break;
                    case 'phase_transition':
                        Audio.playBossRoar();
                        this.particles.bossPhaseTransition(this.boss.x, this.boss.y);
                        triggerShake(10, 0.9);
                        break;
                    case 'charge':
                        Audio.playTankCharge();
                        break;
                    case 'summon':
                        Audio.playBossRoar();
                        break;
                    case 'projectile':
                        Audio.playProjectile();
                        break;
                }
            }
            this.boss._events = [];

            // Process boss spawned adds
            if (this.boss.pendingSpawns.length > 0) {
                const hpBase = Math.floor(ENEMY_HP * (1 + (this.stage - 1) * 0.15) * 0.7);
                const spdBase = Math.min(ENEMY_SPEED * (1 + (this.stage - 1) * 0.05), ENEMY_SPEED * 2) * 0.8;
                const dmgBase = Math.floor((ENEMY_DAMAGE + (this.stage - 1) * 0.5) * 0.7);
                for (const spawn of this.boss.pendingSpawns) {
                    this.enemies.push(new Enemy(spawn.x, spawn.y, hpBase, spdBase, dmgBase, spawn.type, this.stage));
                }
                this.boss.pendingSpawns = [];
            }
        }

        // Boss death
        if (this.boss && this.boss.dead && !this.boss.xpGiven) {
            this.boss.xpGiven = true;
            // Kill all remaining adds
            for (const e of this.enemies) {
                if (!e.dead) {
                    e.dead = true;
                    e.xpGiven = true;
                    const eColor = ENEMY_COLORS[e.type] || ENEMY_COLOR;
                    this.particles.enemyDeath(e.x, e.y, eColor, e.radius);
                }
            }
            this.projectiles = [];
            Audio.playBossDeath();
            this.particles.bossDeath(this.boss.x, this.boss.y, this.boss.color);
            triggerShake(15, 0.92);

            // ── Meta Progression: boss kill rewards ──
            this.bossesKilledThisRun++;
            const reward = RewardSystem.processBossKill(this.stage, this.bossesKilledThisRun);
            this.lastBossReward = reward;
            // Toast for shards
            if (reward.shardsGained > 0) {
                showToast(`+${reward.shardsGained} Core Shards`, '#ffd700', '◆');
                Audio.playShardGain();
            }
            // Toast for relic
            if (reward.relicId) {
                const relic = RELIC_DEFINITIONS[reward.relicId];
                showBigToast(`Relic Unlocked: ${relic.name}`, relic.color, relic.icon);
                Audio.playRelicUnlock();
            }
            // Toast for run upgrade unlock
            if (reward.runUpgradeId) {
                const upg = RUN_UPGRADE_DEFINITIONS[reward.runUpgradeId];
                showToast(`New Upgrade: ${upg.name}`, upg.color, upg.icon);
            }

            this.bossVictoryDelay = 1200; // 1.2s freeze before victory overlay
            return;
        }

        // Projectiles — update + trail particles
        for (const p of this.projectiles) {
            p.update(dt, this.player, this.grid, noDamage);
            if (!p.dead) {
                this.particles.projectileTrail(p.x, p.y);
            }
        }
        this.projectiles = this.projectiles.filter(p => !p.dead);

        // Player daggers — update + hit detection
        const activeBoss = this.boss && !this.boss.dead ? this.boss : null;
        for (const d of this.playerProjectiles) {
            d.update(dt, this.enemies, activeBoss, this.grid);
            if (!d.dead) {
                this.particles.daggerTrail(d.x, d.y, d.color);
            }
            // Hit sparks when dagger hits a target
            if (d.dead && d.hitTarget) {
                Audio.playDaggerHit();
                this.particles.hitSparks(
                    d.hitTarget.x, d.hitTarget.y,
                    d.hitTarget.dirX, d.hitTarget.dirY,
                );
            }
        }
        this.playerProjectiles = this.playerProjectiles.filter(d => !d.dead);

        // Hazards — update (damage, projectile spawning)
        for (const h of this.hazards) {
            h.update(dt, this.player, this.projectiles, this.grid, noDamage);
            if (h.justFired) {
                Audio.playArrowTrap();
            }
        }

        // Detect player damage — apply meta damage reduction
        if (this.player.hp < hpBefore) {
            Audio.playPlayerHurt();
            this.particles.playerDamage(this.player.x, this.player.y);
            triggerShake(6, 0.86);
            // Run upgrade: thorns — 10% chance reflect 5 dmg to nearest enemy
            if (this.runUpgradesActive.upgrade_thorns) {
                if (Math.random() < 0.10) {
                    let nearest = null;
                    let minDist = Infinity;
                    for (const e of this.enemies) {
                        if (e.dead) continue;
                        const dx = e.x - this.player.x;
                        const dy = e.y - this.player.y;
                        const d = dx * dx + dy * dy;
                        if (d < minDist) { minDist = d; nearest = e; }
                    }
                    if (nearest) nearest.takeDamage(5, 0, 0);
                }
            }
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
        const allFoes = this.boss && !this.boss.dead ? [...this.enemies, this.boss] : this.enemies;
        this.door.update(dt, allFoes, this.trainingMode);

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
            // Meta: finalize run
            RewardSystem.onRunEnd(this.stage);
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
            this.playerProjectiles = [];
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

    _updateSettings() {
        const count = 3; // 0=SFX, 1=Music, 2=Back

        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.settingsCursor = (this.settingsCursor - 1 + count) % count;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.settingsCursor = (this.settingsCursor + 1) % count;
            Audio.playMenuNav();
        }

        if (wasPressed('Escape')) {
            Audio.playMenuSelect();
            this.state = STATE_MENU;
            return;
        }

        // Toggle with Enter/Space or Left/Right arrows on SFX/Music rows
        const toggle = wasPressed('Enter') || wasPressed('Space');
        const leftRight = wasPressed('ArrowLeft') || wasPressed('ArrowRight')
                       || wasPressed('KeyA') || wasPressed('KeyD');

        if (toggle || (leftRight && this.settingsCursor < 2)) {
            Audio.playMenuSelect();
            if (this.settingsCursor === 0) {
                // Toggle SFX mute
                this.muted = Audio.toggleMute();
                Music.setMusicMuted(this.muted);
            } else if (this.settingsCursor === 1) {
                // Toggle music
                Music.toggleMusicEnabled();
            } else if (this.settingsCursor === 2) {
                // Back to menu
                this.state = STATE_MENU;
            }
        }
    }

    _updateLevelUp() {
        // Use cached choices (computed at state transition to avoid random mismatch with render)
        const choices = this._cachedLevelUpChoices || this._getLevelUpChoices();
        const count = choices.length;

        // Navigate with W/S or arrows
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.upgradeIndex = (this.upgradeIndex - 1 + count) % count;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.upgradeIndex = (this.upgradeIndex + 1) % count;
            Audio.playMenuNav();
        }

        // Confirm with Space, Enter, or number keys
        let choiceIdx = null;
        if (wasPressed('Space') || wasPressed('Enter')) {
            choiceIdx = this.upgradeIndex;
        } else if (wasPressed('Digit1')) { choiceIdx = 0; }
        else if (wasPressed('Digit2')) { choiceIdx = 1; }
        else if (wasPressed('Digit3')) { choiceIdx = 2; }
        else if (wasPressed('Digit4') && count > 3) { choiceIdx = 3; }

        if (choiceIdx === null || choiceIdx >= count) return;
        Audio.playMenuSelect();

        const chosen = choices[choiceIdx];
        if (chosen.type === 'base') {
            this.player.levelUp(chosen.id);
        } else if (chosen.type === 'runUpgrade') {
            // Activate run upgrade
            this.runUpgradesActive[chosen.id] = true;
            // Apply immediate effects
            this._applyRunUpgrade(chosen.id);
            // Still do the level-up stat bookkeeping (level counter, xp)
            this.player.level++;
            this.player.xp -= this.player.xpToNext;
            this.player.xpToNext = Math.floor(this.player.xpToNext * 1.25);
        }

        this.upgradeIndex = 0;

        // Chain level-ups
        if (this.player.xp >= this.player.xpToNext) {
            this._cachedLevelUpChoices = this._getLevelUpChoices();
            this.state = STATE_LEVEL_UP;
        } else {
            this._cachedLevelUpChoices = null;
            this.state = STATE_PLAYING;
        }
    }

    /**
     * Build array of level-up choices: 3 base + optionally 1 run upgrade.
     * Each: { type: 'base'|'runUpgrade', id, label, color, key }
     */
    _getLevelUpChoices() {
        const choices = [
            { type: 'base', id: 'hp',     label: `+${UPGRADE_HP} Max HP  (heal +${Math.floor(UPGRADE_HP * 0.6)})`, color: '#4caf50', key: '1' },
            { type: 'base', id: 'speed',  label: `+${UPGRADE_SPEED} Speed`, color: '#2196f3', key: '2' },
            { type: 'base', id: 'damage', label: `+${UPGRADE_DAMAGE} Damage`, color: '#f44336', key: '3' },
        ];

        // Add an unlocked run upgrade if available and not yet picked this run
        const unlocked = getUnlockedRunUpgradeIds();
        const available = unlocked.filter(id => !this.runUpgradesActive[id]);
        if (available.length > 0) {
            // Pick one random available upgrade to offer
            const id = available[Math.floor(Math.random() * available.length)];
            const def = RUN_UPGRADE_DEFINITIONS[id];
            if (def) {
                choices.push({
                    type: 'runUpgrade',
                    id,
                    label: `${def.icon} ${def.name}: ${def.desc}`,
                    color: def.color,
                    key: '4',
                });
            }
        }

        return choices;
    }

    /** Apply a chosen run upgrade's immediate effects. */
    _applyRunUpgrade(upgradeId) {
        switch (upgradeId) {
            case 'upgrade_aoe_swing':
                // Increase player's attack range multiplier for this run
                this.player.attackRangeMultiplier = (this.player.attackRangeMultiplier || 1) * 1.10;
                break;
            case 'upgrade_shield':
                this.shieldCharges = 1;
                break;
            case 'upgrade_regen':
                this.regenTimer = 0;
                break;
            // lifesteal, thorns, xp_magnet — checked dynamically via runUpgradesActive
        }
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
                    this._updateBiome();  // restore biome from stage
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
        // Open meta menu from game over (KeyG for Meta Progress)
        if (wasPressed('KeyG')) {
            Audio.playMenuSelect();
            this._openMetaMenu(true);
        }
    }

    _updateBossVictory() {
        const choices = ['hp', 'damage', 'speed'];

        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.bossRewardIndex = (this.bossRewardIndex - 1 + 3) % 3;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.bossRewardIndex = (this.bossRewardIndex + 1) % 3;
            Audio.playMenuNav();
        }

        let choice = null;
        if (wasPressed('Space') || wasPressed('Enter')) {
            choice = choices[this.bossRewardIndex];
        } else if (wasPressed('Digit1')) { choice = 'hp'; }
        else if (wasPressed('Digit2')) { choice = 'damage'; }
        else if (wasPressed('Digit3')) { choice = 'speed'; }

        if (!choice) return;
        Audio.playMenuSelect();

        // Apply permanent reward
        switch (choice) {
            case 'hp':
                this.player.maxHp += BOSS_REWARD_HP;
                break;
            case 'damage':
                this.player.damage += BOSS_REWARD_DAMAGE;
                break;
            case 'speed':
                this.player.speed += BOSS_REWARD_SPEED;
                break;
        }

        // Full heal
        this.player.hp = this.player.maxHp;

        // Award boss XP (may trigger level-up chain)
        const bossXpMult = this.cheats.xpboost ? 10 : 1;
        const metaXpMult = this.metaModifiers ? this.metaModifiers.xpMultiplier : 1;
        const runXpMult = this.runUpgradesActive.upgrade_xp_magnet ? 1.15 : 1;
        const xp = Math.floor(this.boss.xpValue * bossXpMult * metaXpMult * runXpMult);
        if (this.player.addXp(xp)) {
            Audio.playLevelUp();
            this.particles.levelUp(this.player.x, this.player.y);
            // Relic: heal on level-up
            if (this.metaModifiers && this.metaModifiers.healOnLevelUpPct > 0) {
                const healAmt = Math.floor(this.player.maxHp * this.metaModifiers.healOnLevelUpPct);
                this.player.hp = Math.min(this.player.hp + healAmt, this.player.maxHp);
            }
            this.upgradeIndex = 0;
            this._cachedLevelUpChoices = this._getLevelUpChoices();
            this.state = STATE_LEVEL_UP;
            return;
        }

        // No level-up → back to playing (door is unlocked, walk through to continue)
        this._cachedLevelUpChoices = null;
        this.state = STATE_PLAYING;
    }

    // ── Adaptive Music ───────────────────────────────────

    _updateMusicDanger() {
        switch (this.state) {
            case STATE_PLAYING:
                Music.setDanger(this._calculateDanger());
                break;
            case STATE_PAUSED:
                Music.setDanger(0.15);
                break;
            case STATE_LEVEL_UP:
            case STATE_BOSS_VICTORY:
                break;  // keep current danger
            case STATE_GAME_OVER:
                Music.setDanger(0.18);
                break;
            case STATE_SETTINGS:
            default:
                // Menu/profiles/meta/settings: silent
                Music.setDanger(0);
                break;
        }
    }

    _calculateDanger() {
        if (!this.player) return 0;

        const alive = this.enemies.filter(e => !e.dead);
        const bossAlive = this.boss && !this.boss.dead;

        if (alive.length === 0 && !bossAlive) return 0.10;

        // Base: enemies or boss present
        let danger = 0.15;

        // Boss adds significant danger
        if (bossAlive) {
            danger += 0.25;
            const dx = this.boss.x - this.player.x;
            const dy = this.boss.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            danger += 0.15 * Math.max(0, 1 - dist / 300);
        }

        // Enemy count (up to +0.25)
        danger += Math.min(0.25, alive.length * 0.04);

        // Nearest enemy proximity (up to +0.25)
        let minDist = Infinity;
        for (const e of alive) {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
        }
        if (minDist < Infinity) {
            danger += 0.25 * Math.max(0, 1 - minDist / 300);
        }

        // Low HP (up to +0.25)
        const hpRatio = this.player.hp / this.player.maxHp;
        danger += (1 - hpRatio) * 0.25;

        // Stage progression (up to +0.1)
        danger += Math.min(0.1, (this.stage - 1) * 0.008);

        return Math.min(1, danger);
    }

    // ── Render ─────────────────────────────────────────────

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (this.state === STATE_MENU) {
            const profileName = this.activeProfile ? this.activeProfile.name : null;
            const shards = getAvailableShards(MetaStore.getState());
            renderMenu(ctx, this.menuIndex, this.highscore, profileName, shards);
            this._renderCheatNotifications(ctx);
            return;
        }

        if (this.state === STATE_PROFILES) {
            renderProfiles(ctx, this.profiles, this.activeProfileIndex,
                           this.profileCursor, this.profileCreating,
                           this.profileNewName, this.profileDeleting);
            this._renderCheatNotifications(ctx);
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
            this._renderCheatNotifications(ctx);
            return;
        }

        if (this.state === STATE_META_MENU) {
            const runRewards = this.metaFromGameOver ? RewardSystem.getRunRewards() : null;
            renderMetaMenu(ctx, this.metaTab, this.metaPerkCursor, this.metaFromGameOver, runRewards);
            this._renderCheatNotifications(ctx);
            return;
        }

        if (this.state === STATE_SETTINGS) {
            renderSettings(ctx, this.settingsCursor, this.muted, Music.isMusicEnabled());
            this._renderCheatNotifications(ctx);
            return;
        }

        renderRoom(ctx, this.grid, this.currentBiome, this.stage || 0);
        for (const h of this.hazards) h.render(ctx);
        this.door.render(ctx);
        for (const e of this.enemies) e.render(ctx);
        if (this.boss && !this.boss.dead) this.boss.render(ctx);
        for (const p of this.projectiles) p.render(ctx);
        for (const d of this.playerProjectiles) d.render(ctx);
        for (const pk of this.pickups) pk.render(ctx);
        this.particles.render(ctx);
        this.player.render(ctx);

        // Biome atmospheric overlay (tint + vignette) — after entities, before HUD
        renderAtmosphere(ctx, this.currentBiome);

        // Locked-door hint (real game only)
        if (!this.trainingMode && this.door.locked && this.door.isPlayerNear(this.player)) {
            const lockText = this.boss && !this.boss.dead ? 'DEFEAT THE BOSS' : 'LOCKED';
            this._renderTooltip(
                this.door.x + this.door.width / 2,
                this.door.y - 14,
                lockText, '#e74c3c',
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

        let alive = this.enemies.filter(e => !e.dead).length;
        if (this.boss && !this.boss.dead) alive++;
        const isBossRoom = !!(this.boss);
        const biomeName  = this.currentBiome ? this.currentBiome.name : null;
        const biomeColor = this.currentBiome ? this.currentBiome.nameColor : null;
        renderHUD(ctx, this.player, this.stage, alive, this.trainingMode, this.muted,
                  this.comboCount, this.comboTier, this.comboMultiplier, this.comboTimer, isBossRoom,
                  biomeName, biomeColor);

        // Boss HP bar
        if (this.boss && !this.boss.dead) {
            renderBossHPBar(ctx, this.boss);
        }

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

        // ── Biome announcement banner ──
        if (this.biomeAnnounceTimer > 0 && this.currentBiome) {
            this._renderBiomeAnnouncement(ctx);
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

        // ── Cheat indicators + notifications ──
        this._renderCheatOverlay(ctx);

        // ── Meta rewards toasts ──
        renderToasts(ctx);

        // Overlays
        if (this.state === STATE_PAUSED) {
            this._renderPauseOverlay(ctx);
        } else if (this.state === STATE_LEVEL_UP) {
            const choices = this._cachedLevelUpChoices || this._getLevelUpChoices();
            renderLevelUpOverlay(ctx, this.player, this.upgradeIndex, choices);
        } else if (this.state === STATE_GAME_OVER) {
            const runRewards = RewardSystem.getRunRewards();
            renderGameOverOverlay(ctx, this.stage, this.player.level, runRewards);
        } else if (this.state === STATE_BOSS_VICTORY) {
            renderBossVictoryOverlay(ctx, this.boss.name, this.boss.color,
                this.bossRewardIndex, BOSS_REWARD_HP, BOSS_REWARD_DAMAGE, BOSS_REWARD_SPEED,
                this.lastBossReward, RELIC_DEFINITIONS, RUN_UPGRADE_DEFINITIONS);
        }
    }

    _renderBiomeAnnouncement(ctx) {
        const totalTime = 3000;
        const fadeIn = 400;
        const fadeOut = 1000;
        const elapsed = totalTime - this.biomeAnnounceTimer;

        let alpha;
        if (elapsed < fadeIn) alpha = elapsed / fadeIn;
        else if (this.biomeAnnounceTimer < fadeOut) alpha = this.biomeAnnounceTimer / fadeOut;
        else alpha = 1;

        const biome = this.currentBiome;
        const cy = CANVAS_HEIGHT / 2 - 20;

        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.textAlign = 'center';

        // Background bar
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, cy - 28, CANVAS_WIDTH, 60);

        // Biome name
        ctx.fillStyle = biome.nameColor;
        ctx.font = 'bold 22px monospace';
        ctx.shadowColor = biome.nameColor;
        ctx.shadowBlur = 12;
        ctx.fillText(biome.name.toUpperCase(), CANVAS_WIDTH / 2, cy + 2);
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.fillStyle = '#888';
        ctx.font = '11px monospace';
        ctx.fillText(`Stage ${this.stage}`, CANVAS_WIDTH / 2, cy + 20);

        ctx.restore();
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
        const biomeLabel = this.currentBiome ? `${this.currentBiome.name} · ` : '';
        ctx.fillText(`${biomeLabel}Stage ${this.stage}  ·  Level ${this.player.level}`, CANVAS_WIDTH / 2, by + 72);

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
            ? 'WASD = Move   SPACE = Attack   N = Throw   M = Dash   ESC = Exit'
            : 'WASD = Move   SPACE = Attack   N = Throw   M = Dash   T = Training   P = Pause';
        ctx.fillText(hint, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
        ctx.textAlign = 'left';
        ctx.restore();
    }

    // ── Cheat overlay rendering ────────────────────────────

    _renderCheatOverlay(ctx) {
        this._renderCheatBadges(ctx);
        this._renderCheatNotifications(ctx);
    }

    /** Persistent badges in top-right for active toggle cheats */
    _renderCheatBadges(ctx) {
        const cheats = [];
        if (this.cheats.godmode)    cheats.push({ label: 'GOD',     color: '#ffd700' });
        if (this.cheats.onehitkill) cheats.push({ label: '1HIT',    color: '#ff4444' });
        if (this.cheats.xpboost)    cheats.push({ label: 'XP×10',   color: '#bb86fc' });
        if (cheats.length === 0) return;

        ctx.save();
        ctx.textAlign = 'right';
        const startX = CANVAS_WIDTH - 10;
        let y = 14;

        for (const c of cheats) {
            const w = c.label.length * 8 + 12;
            const h = 18;
            const x = startX - w;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x, y - 1, w, h);
            ctx.strokeStyle = c.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y - 1, w, h);

            // Text
            ctx.fillStyle = c.color;
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(c.label, x + w / 2, y + 12);

            y += h + 4;
        }
        ctx.restore();
    }

    /** Temporary notification popups (center top) */
    _renderCheatNotifications(ctx) {
        if (this.cheatNotifications.length === 0) return;
        ctx.save();
        ctx.textAlign = 'center';

        let y = 80;
        for (const n of this.cheatNotifications) {
            const alpha = Math.min(1, n.timer / 500);
            ctx.globalAlpha = alpha;

            // Glowing background
            const text = `⚡ ${n.text} ⚡`;
            const w = text.length * 9 + 24;
            const h = 28;
            const x = CANVAS_WIDTH / 2 - w / 2;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(x, y - 18, w, h);
            ctx.strokeStyle = n.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y - 18, w, h);

            ctx.fillStyle = n.color;
            ctx.font = 'bold 14px monospace';
            ctx.shadowColor = n.color;
            ctx.shadowBlur = 10;
            ctx.fillText(text, CANVAS_WIDTH / 2, y);
            ctx.shadowBlur = 0;

            y += h + 6;
        }
        ctx.restore();
    }
}
