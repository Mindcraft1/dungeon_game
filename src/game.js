import {
    CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE,
    ENEMY_HP, ENEMY_SPEED, ENEMY_DAMAGE, ENEMY_XP,
    ENEMY_TYPE_BASIC, ENEMY_TYPE_SHOOTER, ENEMY_TYPE_TANK, ENEMY_TYPE_DASHER,
    ENEMY_COLOR, SHOOTER_COLOR, TANK_COLOR, DASHER_COLOR,
    SHOOTER_INTRO_STAGE, TANK_INTRO_STAGE, DASHER_INTRO_STAGE,
    TRAINING_ENEMY_COUNT, TRAINING_RESPAWN_DELAY,
    SECOND_WAVE_CHANCE, SECOND_WAVE_MIN_STAGE, SECOND_WAVE_ENEMY_MULT, SECOND_WAVE_ANNOUNCE_TIME,
    ATTACK_RANGE, DASH_COOLDOWN, DAGGER_COOLDOWN,
    UPGRADE_HP, UPGRADE_SPEED, UPGRADE_DAMAGE,
    STATE_MENU, STATE_PROFILES, STATE_PLAYING, STATE_PAUSED, STATE_LEVEL_UP, STATE_GAME_OVER,
    STATE_TRAINING_CONFIG, STATE_BOSS_VICTORY, STATE_META_MENU, STATE_SETTINGS,
    STATE_META_SHOP, STATE_SHOP_RUN, STATE_ACHIEVEMENTS, STATE_LOADOUT,
    COMBO_TIMEOUT, COMBO_TIER_1, COMBO_TIER_2, COMBO_TIER_3, COMBO_TIER_4,
    COMBO_XP_MULT_1, COMBO_XP_MULT_2, COMBO_XP_MULT_3, COMBO_XP_MULT_4,
    BOSS_STAGE_INTERVAL, BOSS_TYPE_BRUTE, BOSS_TYPE_WARLOCK, BOSS_TYPE_PHANTOM, BOSS_TYPE_JUGGERNAUT,
    BOSS_REWARD_HP, BOSS_REWARD_DAMAGE, BOSS_REWARD_SPEED,
    COIN_REWARD_NORMAL_ENEMY, COIN_REWARD_ELITE_ENEMY, COIN_REWARD_BOSS,
    META_BOOSTERS, META_BOOSTER_IDS,
    RUN_SHOP_ITEMS, RUN_SHOP_ITEM_IDS,
    PLAYER_INVULN_TIME,
    BOMB_RADIUS, BOMB_DAMAGE_MULT, BOMB_STUN_DURATION, BOMB_KNOCKBACK,
    COIN_DROP_LIFETIME,
    PICKUP_RAGE_SHARD, PICKUP_PIERCING_SHOT, PICKUP_SWIFT_BOOTS,
    PICKUP_SPEED_SURGE, PICKUP_IRON_SKIN,
    BUFF_RAGE_DAMAGE_MULT, BUFF_PIERCING_DAMAGE_MULT, BUFF_PIERCING_RANGE_MULT,
    BUFF_SWIFT_SPEED_MULT, BUFF_SPEED_SURGE_CD_MULT, BUFF_IRON_SKIN_REDUCE,
    HAZARD_LAVA_SLOW,
} from './constants.js';
import { isDown, wasPressed, getMovement, getLastKey, getActivatedCheat } from './input.js';
import { parseRoom, parseTrainingRoom, getEnemySpawns, generateHazards, ROOM_NAMES, TRAINING_ROOM_NAME, getRoomCount, parseBossRoom, BOSS_ROOM_NAME, generateProceduralRoom } from './rooms.js';
import { renderRoom, renderAtmosphere } from './render.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Projectile, PlayerProjectile, RocketProjectile, Explosion } from './entities/projectile.js';
import { Door } from './entities/door.js';
import { Boss } from './entities/boss.js';
import { trySpawnPickup, PICKUP_INFO, CoinPickup } from './entities/pickup.js';
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
import { PERK_IDS, upgradePerk, canUpgrade, isMaxed as isPerkMaxed } from './meta/metaPerks.js';
import { renderMetaMenu, META_TAB_PERKS, META_TAB_RELICS, META_TAB_STATS, META_TAB_COUNT } from './meta/uiMetaMenu.js';
import { showToast, showBigToast, updateToasts, renderToasts, clearToasts } from './meta/uiRewardsToast.js';
import { getAvailableShards } from './meta/metaState.js';
import { renderMetaShop } from './ui/metaShop.js';
import { renderRunShop } from './ui/runShop.js';
import { renderBuffSummary } from './ui/buffSummary.js';

// ── Achievement System ──
import { emit as achEmit } from './achievements/achievementEvents.js';
import * as AchievementStore from './achievements/achievementStore.js';
import * as AchievementEngine from './achievements/achievementEngine.js';
import { renderAchievements } from './achievements/uiAchievements.js';
import { ACHIEVEMENTS, TIER_ORDER } from './achievements/achievementsList.js';

// ── Combat System ──
import { AbilitySystem } from './combat/abilitySystem.js';
import { ProcSystem } from './combat/procSystem.js';
import * as Impact from './combat/impactSystem.js';
import { ABILITY_IDS } from './combat/abilities.js';
import { PROC_IDS } from './combat/procs.js';
import { renderAbilityBar, updateProcNotifs } from './ui/uiAbilityBar.js';
import { ABILITY_ORDER, PROC_ORDER, TOTAL_LOADOUT_ITEMS, isAbilityUnlocked, isProcUnlocked, sanitizeLoadout, checkBossUnlocks } from './combat/combatUnlocks.js';
import { renderLoadoutScreen } from './ui/loadoutScreen.js';
import * as DevTools from './ui/devTools.js';

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
        AchievementStore.load(this.activeProfileIndex);
        AchievementEngine.init((def) => this._onAchievementUnlock(def));

        // Start at profiles screen if no profiles exist, otherwise menu
        this.state = this.profiles.length === 0 ? STATE_PROFILES : STATE_MENU;
        this.menuIndex = 0;           // 0=Play, 1=Training, 2=Meta, 3=Shop, 4=Characters, 5=Settings

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
        this.explosions = [];         // lingering rocket explosion zones
        this.pickups = [];
        this.coinPickups = [];        // physical coin drops from enemies
        this.hazards = [];
        this.door = null;
        this.grid = null;
        this._currentSpawnPos = null;  // track for save/restore from training
        this.controlsHintTimer = 0;

        // Mode flags
        this.trainingMode = false;
        this.trainingRespawnTimer = 0;

        // Level-up selection
        this.upgradeIndex = 0;
        this._levelUpSpaceReady = false; // true after first Space press, confirm on second
        this._cachedLevelUpChoices = null; // cached to avoid different random choices between update & render

        // Pause menu selection
        this.pauseIndex = 0;  // 0 = Resume, 1 = Menu

        // ── Training config ──
        this.trainingConfigCursor = 0;  // 0=room, 1=enemy type, 2=count, 3=start
        this.trainingRoomIndex = -1;    // -1 = training room, 0..13 = game rooms
        this.trainingEnemyType = 0;     // 0=all, 1=basic, 2=shooter, 3=dasher, 4=tank
        this.trainingEnemyCount = 3;
        this.trainingDamage = false;    // false = no damage (default), true = take damage
        this.trainingDrops = false;     // false = no drops in training (default), true = drops enabled

        // ── Second Wave ──
        this.secondWaveTriggered = false;  // true after wave 2 has been rolled for this room
        this.secondWaveActive = false;     // true while wave 2 enemies are alive
        this.secondWaveAnnounceTimer = 0;  // ms remaining for "WAVE 2" banner

        // ── Audio ──
        this.muted = Audio.isMuted();

        // ── Settings screen ──
        this.settingsCursor = 0;  // 0=SFX, 1=Music, 2=Rooms, 3=Back
        this.proceduralRooms = this._loadRoomModeSetting();

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
        this.cheatBosses = [];        // cheat-summoned bosses (no victory flow)
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
        this.cheatsUsedThisRun = false;  // once true, ALL progression is blocked for this run
        this.cheatNotifications = [];  // [{text, timer, color}]

        // ── Achievements ──
        this.achievementCursor = 0;
        this.achievementFilter = 0;  // 0=All, 1-5=tier
        this._achievementToasts = [];  // [{text, icon, color, timer, maxTimer}]

        // ── Shop System ──
        this.runCoins = 0;                     // reset per run
        this.purchasedMetaBoosterId = null;    // selected meta booster for next run
        this.activeMetaBoosterId = null;       // applied meta booster for current run
        this.metaBoosterShieldCharges = 0;     // from shield_pack
        this.metaBoosterWeaponCoreActive = false;  // +12% dmg until boss 3
        this.metaBoosterTrainingActive = false;     // +20% XP until level 5
        this.metaBoosterPanicAvailable = false;     // 1x revive
        this.runShopDamageMult = 1;            // cumulative from sharpen_blade
        this.runShopSpeedMult = 1;             // cumulative from light_boots
        this.runShopTrapResistMult = 1;        // from trap_resist
        this.bombCharges = 0;                  // from bomb item
        this.metaShopCursor = 0;               // UI cursor for meta shop
        this.runShopCursor = 0;                // UI cursor for in-run shop
        this._pendingRunShop = false;          // true if shop should open after level-up chain

        // ── Combat System ──
        this.abilitySystem = new AbilitySystem();
        this.procSystem = new ProcSystem();

        // ── Loadout Screen state ──
        this.loadoutCursor = 0;
        this.loadoutAbilities = [];   // selected ability IDs (max 2)
        this.loadoutProcs = [];       // selected proc IDs (max 2)
        this.loadoutRejectFlash = 0;  // ms remaining for "full" feedback
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
        if (this.cheatsUsedThisRun) return;  // no progression with cheats
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

        // Mark cheats as used — permanently blocks ALL progression for this run
        if (!this.cheatsUsedThisRun) {
            this.cheatsUsedThisRun = true;
            this._cheatNotify('⛔ PROGRESSION DISABLED', '#ff6666');
        }

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
            case 'summon_brute':
            case 'summon_warlock':
            case 'summon_phantom':
            case 'summon_juggernaut': {
                if (this.state === STATE_PLAYING) {
                    this._cheatSummonBoss(cheatId);
                }
                break;
            }
            case 'devtools': {
                DevTools.toggle();
                this._cheatNotify(
                    DevTools.isVisible() ? 'DEV TOOLS OPENED' : 'DEV TOOLS CLOSED',
                    '#4fc3f7',
                );
                break;
            }
        }
    }

    _cheatSummonBoss(cheatId) {
        const typeMap = {
            summon_brute:      BOSS_TYPE_BRUTE,
            summon_warlock:    BOSS_TYPE_WARLOCK,
            summon_phantom:    BOSS_TYPE_PHANTOM,
            summon_juggernaut: BOSS_TYPE_JUGGERNAUT,
        };
        const bossType = typeMap[cheatId];
        if (!bossType) return;

        // Spawn the boss in the current room alongside existing enemies/bosses
        const b = new Boss(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, bossType, 0, this.stage, this.currentBiome);
        b.cheatSummoned = true;
        this.cheatBosses.push(b);
        Audio.playBossRoar();

        this._cheatNotify(`SUMMONED ${b.name.toUpperCase()}`, b.color);
    }

    /** All living bosses (real + cheat-summoned) */
    _allBosses() {
        const list = [];
        if (this.boss && !this.boss.dead) list.push(this.boss);
        for (const b of this.cheatBosses) { if (!b.dead) list.push(b); }
        return list;
    }

    _cheatNotify(text, color) {
        Audio.playMenuSelect();
        this.cheatNotifications.push({ text, timer: 2500, color });
    }

    /** Called by achievementEngine when an achievement unlocks */
    _onAchievementUnlock(def) {
        Audio.playAchievementUnlock();
        this._achievementToasts.push({
            text: def.name,
            icon: def.icon,
            color: '#e040fb',
            timer: 3500,
            maxTimer: 3500,
        });
    }

    // ── Menu ───────────────────────────────────────────────

    _updateMenu() {
        const count = 7; // Play, Meta Progress, Shop, Achievements, Characters, Training, Settings
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
                this._openLoadout();
            } else if (this.menuIndex === 1) {
                this._openMetaMenu(false);
            } else if (this.menuIndex === 2) {
                this.metaShopCursor = 0;
                this.state = STATE_META_SHOP;
            } else if (this.menuIndex === 3) {
                this.achievementCursor = 0;
                this.achievementFilter = 0;
                this.state = STATE_ACHIEVEMENTS;
            } else if (this.menuIndex === 4) {
                this.profileCursor = 0;
                this.profileCreating = false;
                this.profileDeleting = false;
                this.state = STATE_PROFILES;
            } else if (this.menuIndex === 5) {
                this._openTrainingConfig();
            } else if (this.menuIndex === 6) {
                this.settingsCursor = 0;
                this.state = STATE_SETTINGS;
            }
        }
    }

    _startGame() {
        this.trainingMode = false;
        this.stage = 1;
        this.player = null;
        this.pickups = [];
        this.coinPickups = [];
        this.playerProjectiles = [];
        this.controlsHintTimer = 5000;
        this.cheatsUsedThisRun = false;  // reset cheat flag for new run
        this.cheats.godmode = false;
        this.cheats.onehitkill = false;
        this.cheats.xpboost = false;
        this._comboReset();
        this.comboPopups = [];
        this.comboFlash = 0;
        this.boss = null;
        this.cheatBosses = [];
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

        // ── Shop System: reset run state & apply meta booster ──
        this.runCoins = 0;
        this.runShopDamageMult = 1;
        this.runShopSpeedMult = 1;
        this.runShopTrapResistMult = 1;
        this.bombCharges = 0;
        this.metaBoosterShieldCharges = 0;
        this.metaBoosterWeaponCoreActive = false;
        this.metaBoosterTrainingActive = false;
        this.metaBoosterPanicAvailable = false;
        this.activeMetaBoosterId = this.purchasedMetaBoosterId;
        this.purchasedMetaBoosterId = null;  // consumed
        this._applyMetaBooster();

        // ── Combat System: equip from saved loadout ──
        this._equipSavedLoadout();

        // ── Achievement event: run start (blocked by cheats) ──
        if (!this.cheatsUsedThisRun) {
            achEmit('run_start', { metaBoosterActive: !!this.activeMetaBoosterId });
            achEmit('stage_entered', { stage: 1 });
            if (this.currentBiome) {
                achEmit('biome_changed', { biomeId: this.currentBiome.id });
            }
        }

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

    _openTrainingConfig() {
        this.trainingConfigCursor = 0;
        this.state = STATE_TRAINING_CONFIG;
    }

    _startTraining() {
        this.trainingMode = true;
        this.player = null;
        this._equipSavedLoadout();
        this.stage = 0;
        this.currentBiome = null;
        if (this.player) this.player.biomeSpeedMult = 1.0;
        this.controlsHintTimer = 6000;
        this._loadConfiguredTrainingRoom();
        this.state = STATE_PLAYING;
    }

    // ── Room management ────────────────────────────────────

    loadRoom(templateIndex) {
        // Use procedural generation if enabled, otherwise use predefined templates
        const { grid, spawnPos, doorPos } = this.proceduralRooms
            ? generateProceduralRoom(this.stage || 1)
            : parseRoom(templateIndex);
        this.grid = grid;
        this._currentSpawnPos = spawnPos;
        this._placePlayer(spawnPos);
        this.door = new Door(doorPos.col, doorPos.row);
        this._spawnEnemies(grid, spawnPos, doorPos);
        const hazardWeights = this.currentBiome ? this.currentBiome.hazardWeights : null;
        this.hazards = generateHazards(grid, spawnPos, doorPos, this.stage, hazardWeights);
        this.pickups = [];
        this.coinPickups = [];
        this.playerProjectiles = [];
        this.particles.clear();

        // Reset second wave state for new room
        this.secondWaveTriggered = false;
        this.secondWaveActive = false;
        this.secondWaveAnnounceTimer = 0;

        // ── Achievement event: room started (blocked by cheats) ──
        if (!this.cheatsUsedThisRun) {
            achEmit('room_started', {
                stage: this.stage,
                enemyCount: this.enemies.length,
                hasTraps: this.hazards.length > 0,
            });
        }

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
        this.explosions = [];
        this.hazards = [];

        const spawns = getEnemySpawns(grid, spawnPos, doorPos, TRAINING_ENEMY_COUNT);
        this.enemies = spawns.map(p => new Enemy(
            p.x, p.y,
            DevTools.getVal('enemyHp', ENEMY_HP),
            DevTools.getVal('enemySpeed', ENEMY_SPEED) * 0.8,
            DevTools.getVal('enemyDamage', ENEMY_DAMAGE),
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
        this.explosions = [];
        this.playerProjectiles = [];
        this.pickups = [];
        this.coinPickups = [];
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
            const eHp  = DevTools.getVal('enemyHp',    ENEMY_HP);
            const eSpd = DevTools.getVal('enemySpeed',  ENEMY_SPEED);
            const eDmg = DevTools.getVal('enemyDamage', ENEMY_DAMAGE);
            return new Enemy(p.x, p.y, eHp, eSpd * 0.8, eDmg, type, 1);
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
        const eHp  = DevTools.getVal('enemyHp',     ENEMY_HP);
        const eSpd = DevTools.getVal('enemySpeed',   ENEMY_SPEED);
        const eDmg = DevTools.getVal('enemyDamage',  ENEMY_DAMAGE);
        const hpBase = Math.floor(eHp * (1 + (this.stage - 1) * 0.15));
        const spdBase = Math.min(eSpd * (1 + (this.stage - 1) * 0.05), eSpd * 2);
        const dmgBase = eDmg + Math.floor((this.stage - 1) * 0.5);

        const types = this._getEnemyTypes(this.stage, count, this.currentBiome);
        const spawns = getEnemySpawns(grid, spawnPos, doorPos, count);

        this.enemies = spawns.map((p, i) => new Enemy(
            p.x, p.y, hpBase, spdBase, dmgBase, types[i], this.stage,
        ));
        this.projectiles = [];
        this.explosions = [];
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

        // Meta: rare 1% shard from normal room clear (blocked by cheats)
        if (!this.cheatsUsedThisRun && !this._isBossStage(this.stage - 1)) {
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

        // ── Achievement events: stage entered + biome (blocked by cheats) ──
        if (!this.cheatsUsedThisRun) {
            achEmit('stage_entered', { stage: this.stage });
            if (this.currentBiome) {
                achEmit('biome_changed', { biomeId: this.currentBiome.id });
            }
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
        this._currentSpawnPos = spawnPos;
        this._placePlayer(spawnPos);
        this.door = new Door(doorPos.col, doorPos.row);
        this.enemies = [];
        this.projectiles = [];
        this.explosions = [];
        this.playerProjectiles = [];
        this.hazards = [];
        this.pickups = [];
        this.coinPickups = [];
        this.particles.clear();
        this.bossVictoryDelay = 0;
        this.cheatBosses = [];

        // Determine boss type (rotates: Brute → Warlock → Phantom → Juggernaut)
        const encounter = Math.floor(this.stage / BOSS_STAGE_INTERVAL) - 1;
        const bossTypes = [BOSS_TYPE_BRUTE, BOSS_TYPE_WARLOCK, BOSS_TYPE_PHANTOM, BOSS_TYPE_JUGGERNAUT];
        const bossType = bossTypes[encounter % bossTypes.length];

        this.boss = new Boss(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, bossType, encounter, this.stage, this.currentBiome);
        Audio.playBossRoar();
        this.controlsHintTimer = 3000;

        // ── Achievement events: boss fight + room started (blocked by cheats) ──
        if (!this.cheatsUsedThisRun) {
            achEmit('boss_fight_started', { stage: this.stage });
            achEmit('room_started', { stage: this.stage, enemyCount: 1, hasTraps: false });
        }
    }

    _returnFromTraining() {
        this.state = STATE_MENU;
        this.menuIndex = 0;
        this.trainingMode = false;
    }

    restart() {
        this.state = STATE_MENU;
        this.menuIndex = 0;
        this.trainingMode = false;
        this.projectiles = [];
        this.explosions = [];
        this.playerProjectiles = [];
        this.pickups = [];
        this.coinPickups = [];
        this.hazards = [];
        this.particles.clear();
        this._comboReset();
        this.comboPopups = [];
        this.comboFlash = 0;
        this.boss = null;
        this.cheatBosses = [];
        this.bossVictoryDelay = 0;
        this.currentBiome = null;
        this.biomeAnnounceTimer = 0;
        // Reset cheat state for new run
        this.cheatsUsedThisRun = false;
        this.cheats.godmode = false;
        this.cheats.onehitkill = false;
        this.cheats.xpboost = false;
        // Shop state reset (keep purchasedMetaBoosterId — it persists across runs)
        this.runCoins = 0;
        this.activeMetaBoosterId = null;
        this.metaBoosterShieldCharges = 0;
        this.metaBoosterWeaponCoreActive = false;
        this.metaBoosterTrainingActive = false;
        this.metaBoosterPanicAvailable = false;
        this.runShopDamageMult = 1;
        this.runShopSpeedMult = 1;
        this.runShopTrapResistMult = 1;
        this.bombCharges = 0;
        this._pendingRunShop = false;
        clearToasts();

        // Combat system reset (equip happens later via loadout screen)
        this.abilitySystem.reset();
        this.procSystem.reset();
    }

    // ── Loadout Screen ────────────────────────────────────────

    _openLoadout() {
        const meta = MetaStore.getState();
        const loadout = sanitizeLoadout(meta.selectedLoadout || { abilities: ['shockwave'], procs: ['explosive_strikes'] }, meta);
        this.loadoutAbilities = [...loadout.abilities];
        this.loadoutProcs = [...loadout.procs];
        this.loadoutCursor = TOTAL_LOADOUT_ITEMS - 1; // cursor on START
        this.loadoutRejectFlash = 0;
        this.state = STATE_LOADOUT;
    }

    _updateLoadout() {
        const totalItems = TOTAL_LOADOUT_ITEMS; // abilities + procs + START button
        const startIdx = totalItems - 1;

        // Navigation
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.loadoutCursor = (this.loadoutCursor - 1 + totalItems) % totalItems;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.loadoutCursor = (this.loadoutCursor + 1) % totalItems;
            Audio.playMenuNav();
        }

        // Escape → back to menu
        if (wasPressed('Escape')) {
            Audio.playMenuNav();
            this.state = STATE_MENU;
            return;
        }

        // Toggle selection (Space or Enter on a non-start item)
        const togglePressed = (wasPressed('Space') && this.loadoutCursor !== startIdx) || (wasPressed('Enter') && this.loadoutCursor !== startIdx);
        if (togglePressed && this.loadoutCursor < startIdx) {
            this._loadoutToggle(this.loadoutCursor);
        }

        // Confirm (Enter or Space on START)
        if ((wasPressed('Enter') || wasPressed('Space')) && this.loadoutCursor === startIdx) {
            if (this.loadoutAbilities.length >= 1) {
                // Save loadout to meta
                const meta = MetaStore.getState();
                meta.selectedLoadout = { abilities: [...this.loadoutAbilities], procs: [...this.loadoutProcs] };
                MetaStore.save();
                Audio.playMenuSelect();
                this._startGame();
            } else {
                this.loadoutRejectFlash = 400;
            }
            return;
        }

        // Reject flash decay
        if (this.loadoutRejectFlash > 0) {
            this.loadoutRejectFlash = Math.max(0, this.loadoutRejectFlash - 16);
        }
    }

    _loadoutToggle(index) {
        const meta = MetaStore.getState();

        if (index < ABILITY_ORDER.length) {
            // It's an ability
            const id = ABILITY_ORDER[index];
            if (!isAbilityUnlocked(id, meta)) return; // locked

            const pos = this.loadoutAbilities.indexOf(id);
            if (pos >= 0) {
                // Deselect
                this.loadoutAbilities.splice(pos, 1);
                Audio.playMenuNav();
            } else if (this.loadoutAbilities.length < 2) {
                // Select
                this.loadoutAbilities.push(id);
                Audio.playMenuSelect();
            } else {
                // Full → flash
                this.loadoutRejectFlash = 300;
            }
        } else {
            // It's a proc
            const procIndex = index - ABILITY_ORDER.length;
            const id = PROC_ORDER[procIndex];
            if (!isProcUnlocked(id, meta)) return; // locked

            const pos = this.loadoutProcs.indexOf(id);
            if (pos >= 0) {
                this.loadoutProcs.splice(pos, 1);
                Audio.playMenuNav();
            } else if (this.loadoutProcs.length < 2) {
                this.loadoutProcs.push(id);
                Audio.playMenuSelect();
            } else {
                this.loadoutRejectFlash = 300;
            }
        }
    }

    /** Equip abilities/procs from the saved loadout in metaState. */
    _equipSavedLoadout() {
        const meta = MetaStore.getState();
        const loadout = sanitizeLoadout(
            meta.selectedLoadout || { abilities: ['shockwave'], procs: ['explosive_strikes'] },
            meta,
        );
        this.abilitySystem.reset();
        this.procSystem.reset();
        loadout.abilities.forEach((id, i) => this.abilitySystem.equip(i, id));
        loadout.procs.forEach((id, i) => this.procSystem.equip(i, id));
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
                if (this.cheatsUsedThisRun) {
                    showToast('⛔ Cheats active — no progression', '#ff6666', '✗');
                } else {
                    const perkId = PERK_IDS[this.metaPerkCursor];
                    if (canUpgrade(perkId)) {
                        upgradePerk(perkId);
                        Audio.playPerkUpgrade();
                        achEmit('meta_upgrade_bought', { perkId });
                        // Check if perk reached max level
                        if (isPerkMaxed(perkId)) {
                            achEmit('meta_perk_maxed', { perkId });
                        }
                    } else {
                        // Can't afford or maxed — do nothing
                    }
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

    /** Apply the meta booster purchased for this run. */
    _applyMetaBooster() {
        if (!this.activeMetaBoosterId || !this.player) return;
        switch (this.activeMetaBoosterId) {
            case 'meta_booster_shield_pack':
                this.metaBoosterShieldCharges = 3;
                showToast('Shield Pack: 3 shield charges!', '#00bcd4', '🛡️');
                break;
            case 'meta_booster_weapon_core':
                this.metaBoosterWeaponCoreActive = true;
                showToast('Weapon Core: +12% Damage active!', '#f44336', '⚔️');
                break;
            case 'meta_booster_training_manual':
                this.metaBoosterTrainingActive = true;
                showToast('Training Manual: +20% XP active!', '#9c27b0', '📖');
                break;
            case 'meta_booster_panic_button':
                this.metaBoosterPanicAvailable = true;
                showToast('Panic Button: 1× Revive ready!', '#ffd700', '💀');
                break;
        }
    }

    /** Get effective damage multiplier including all shop boosts. */
    _getShopDamageMultiplier() {
        let mult = this.runShopDamageMult;
        // Weapon Core: +12% until boss 3
        if (this.metaBoosterWeaponCoreActive && this.bossesKilledThisRun < 3) {
            mult *= 1.12;
        }
        return mult;
    }

    /** Get effective XP multiplier from shop boosters. */
    _getShopXpMultiplier() {
        // Training Manual: +20% until level 5
        if (this.metaBoosterTrainingActive && this.player && this.player.level < 5) {
            return 1.20;
        }
        return 1;
    }

    /**
     * Compute net stat modifiers from ALL sources for the buff summary HUD.
     * Returns a flat object with multiplier values + special effect list.
     */
    _computeNetModifiers() {
        if (!this.player) return null;
        const p = this.player;
        const m = this.metaModifiers || {};

        // ── Damage multiplier ──
        let damage = (m.damageMultiplier || 1);
        damage *= this.runShopDamageMult;
        if (this.metaBoosterWeaponCoreActive && this.bossesKilledThisRun < 3) damage *= 1.12;
        if (p.hasBuff(PICKUP_RAGE_SHARD))    damage *= BUFF_RAGE_DAMAGE_MULT;
        if (p.hasBuff(PICKUP_PIERCING_SHOT)) damage *= BUFF_PIERCING_DAMAGE_MULT;

        // ── Speed multiplier ──
        let speed = (m.speedMultiplier || 1);
        speed *= this.runShopSpeedMult;
        if (p.hasBuff(PICKUP_SWIFT_BOOTS)) speed *= BUFF_SWIFT_SPEED_MULT;
        if (p.biomeSpeedMult !== 1.0) speed *= p.biomeSpeedMult;
        if (p.onLava) speed *= HAZARD_LAVA_SLOW;

        // ── Max HP multiplier ──
        const maxHp = (m.hpMultiplier || 1);

        // ── XP gain multiplier ──
        let xpGain = (m.xpMultiplier || 1);
        xpGain *= this._getShopXpMultiplier();
        if (this.runUpgradesActive.upgrade_xp_magnet) xpGain *= 1.15;

        // ── Defense (damage-taken multiplier, < 1 is a buff) ──
        let defense = (m.damageTakenMultiplier || 1);
        if (p.hasBuff(PICKUP_IRON_SKIN)) defense *= BUFF_IRON_SKIN_REDUCE;

        // ── Trap resist (spike + lava damage multiplier, < 1 is a buff) ──
        let trapResist = (m.spikeDamageMultiplier || 1);
        trapResist *= (m.lavaDotMultiplier || 1);
        trapResist *= this.runShopTrapResistMult;
        // Average the two trap types for a single display value
        // (they stack multiplicatively from different sources)

        // ── Boss damage multiplier ──
        const bossDamage = (m.bossDamageMultiplier || 1);

        // ── Attack range multiplier ──
        let attackRange = (p.attackRangeMultiplier || 1);
        if (p.hasBuff(PICKUP_PIERCING_SHOT)) attackRange *= BUFF_PIERCING_RANGE_MULT;

        // ── Attack speed (inverse of cooldown mult, > 1 = faster) ──
        let attackSpeed = 1;
        if (p.hasBuff(PICKUP_SPEED_SURGE)) attackSpeed *= (1 / BUFF_SPEED_SURGE_CD_MULT);

        // ── Special effects (non-percentage abilities) ──
        const specials = [];
        if (this.runUpgradesActive.upgrade_lifesteal) {
            specials.push({ icon: '🩸', name: 'Lifesteal', color: '#e91e63' });
        }
        if (this.runUpgradesActive.upgrade_thorns) {
            specials.push({ icon: '🌵', name: 'Thorns', color: '#795548' });
        }
        if (this.runUpgradesActive.upgrade_regen) {
            specials.push({ icon: '💗', name: 'Regen', color: '#4caf50' });
        }
        if (this.runUpgradesActive.upgrade_shield) {
            specials.push({ icon: '🔷', name: 'Barrier', color: '#00bcd4' });
        }
        if (p.phaseShieldActive) {
            specials.push({ icon: '🟣', name: 'Phase Shield', color: '#7c4dff' });
        }
        if (p.crushingBlowReady) {
            specials.push({ icon: '🟠', name: 'Next Hit 3×', color: '#e67e22' });
        }

        return { damage, speed, maxHp, xpGain, defense, trapResist, bossDamage, attackRange, attackSpeed, specials };
    }

    /** Update meta shop screen input. */
    _updateMetaShop() {
        const maxIdx = this.purchasedMetaBoosterId ? META_BOOSTER_IDS.length : META_BOOSTER_IDS.length - 1;

        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.metaShopCursor = (this.metaShopCursor - 1 + maxIdx + 1) % (maxIdx + 1);
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.metaShopCursor = (this.metaShopCursor + 1) % (maxIdx + 1);
            Audio.playMenuNav();
        }
        // Left/Right to navigate 2-column grid
        if (wasPressed('KeyA') || wasPressed('ArrowLeft')) {
            if (this.metaShopCursor < META_BOOSTER_IDS.length && this.metaShopCursor % 2 === 1) {
                this.metaShopCursor--;
                Audio.playMenuNav();
            }
        }
        if (wasPressed('KeyD') || wasPressed('ArrowRight')) {
            if (this.metaShopCursor < META_BOOSTER_IDS.length && this.metaShopCursor % 2 === 0
                && this.metaShopCursor + 1 < META_BOOSTER_IDS.length) {
                this.metaShopCursor++;
                Audio.playMenuNav();
            }
        }

        if (wasPressed('Enter') || wasPressed('Space')) {
            if (this.cheatsUsedThisRun) {
                showToast('⛔ Cheats active — no progression', '#ff6666', '✗');
                return;
            }

            // Clear selection
            if (this.metaShopCursor === META_BOOSTER_IDS.length && this.purchasedMetaBoosterId) {
                // Refund shards
                const booster = META_BOOSTERS[this.purchasedMetaBoosterId];
                if (booster) {
                    const state = MetaStore.getState();
                    state.spentCoreShards -= booster.cost;
                    MetaStore.save();
                }
                this.purchasedMetaBoosterId = null;
                showToast('Booster refunded', '#ff9800', '↩');
                Audio.playMenuSelect();
                return;
            }

            // Buy booster
            if (this.metaShopCursor < META_BOOSTER_IDS.length) {
                const id = META_BOOSTER_IDS[this.metaShopCursor];
                if (this.purchasedMetaBoosterId) {
                    // Already have one
                    return;
                }
                const booster = META_BOOSTERS[id];
                const state = MetaStore.getState();
                const shards = getAvailableShards(state);
                if (shards >= booster.cost) {
                    state.spentCoreShards += booster.cost;
                    MetaStore.save();
                    this.purchasedMetaBoosterId = id;
                    showToast(`Purchased: ${booster.name}!`, booster.color, booster.icon);
                    Audio.playMenuSelect();
                    achEmit('shop_purchase_meta_booster', { boosterId: id, costShards: booster.cost });
                } else {
                    showToast('Not enough Core Shards', '#e74c3c', '✗');
                }
            }
        }

        if (wasPressed('Escape')) {
            this.state = STATE_MENU;
            this.menuIndex = 0;
        }
    }

    /** Update in-run shop input. */
    _updateRunShop() {
        const maxIdx = RUN_SHOP_ITEM_IDS.length; // 0..5 items, 6 = continue

        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.runShopCursor = (this.runShopCursor - 1 + maxIdx + 1) % (maxIdx + 1);
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.runShopCursor = (this.runShopCursor + 1) % (maxIdx + 1);
            Audio.playMenuNav();
        }

        // Number keys 1-6 quick-buy
        let buyIdx = null;
        if (wasPressed('Digit1')) buyIdx = 0;
        else if (wasPressed('Digit2')) buyIdx = 1;
        else if (wasPressed('Digit3')) buyIdx = 2;
        else if (wasPressed('Digit4')) buyIdx = 3;
        else if (wasPressed('Digit5')) buyIdx = 4;
        else if (wasPressed('Digit6')) buyIdx = 5;

        if (wasPressed('Enter') || wasPressed('Space')) {
            if (this.runShopCursor === RUN_SHOP_ITEM_IDS.length) {
                // Continue
                Audio.playMenuSelect();
                this._closeRunShop();
                return;
            }
            buyIdx = this.runShopCursor;
        }

        if (wasPressed('Escape')) {
            Audio.playMenuSelect();
            this._closeRunShop();
            return;
        }

        if (buyIdx !== null && buyIdx < RUN_SHOP_ITEM_IDS.length) {
            this._buyRunShopItem(buyIdx);
        }
    }

    /** Purchase an in-run shop item by index. */
    _buyRunShopItem(index) {
        const id = RUN_SHOP_ITEM_IDS[index];
        const item = RUN_SHOP_ITEMS[id];
        if (this.runCoins < item.cost) {
            showToast('Not enough coins!', '#e74c3c', '✗');
            return;
        }
        this.runCoins -= item.cost;
        Audio.playMenuSelect();

        // ── Achievement event: run shop purchase (blocked by cheats) ──
        if (!this.cheatsUsedThisRun) {
            achEmit('shop_purchase_run_item', { itemId: id, costCoins: item.cost });
        }

        switch (id) {
            case 'run_item_max_hp_boost':
                if (this.player) {
                    this.player.maxHp += 15;
                    this.player.hp = Math.min(this.player.hp + 15, this.player.maxHp);
                }
                break;
            case 'run_item_repair_armor':
                this.metaBoosterShieldCharges++;
                break;
            case 'run_item_sharpen_blade':
                this.runShopDamageMult *= 1.08;
                break;
            case 'run_item_light_boots':
                this.runShopSpeedMult *= 1.05;
                if (this.player) {
                    this.player.speed = Math.floor(this.player.speed * 1.05);
                }
                break;
            case 'run_item_bomb':
                this.bombCharges++;
                break;
            case 'run_item_trap_resist':
                this.runShopTrapResistMult *= 0.85;
                if (this.player) {
                    this.player.shopTrapResistMult = this.runShopTrapResistMult;
                }
                break;
        }
        showToast(`Purchased: ${item.name}`, item.color, item.icon);
    }

    /** Close run shop and return to playing (player walks through door to next room). */
    _closeRunShop() {
        this._cachedLevelUpChoices = null;
        this.state = STATE_PLAYING;
    }

    /** Activate bomb (B key) — Big AoE damage + stun around player. */
    _activateBomb() {
        if (this.bombCharges <= 0) return;
        this.bombCharges--;
        Audio.playBossSlam();
        triggerShake(12, 0.85);
        this.particles.bossSlam(this.player.x, this.player.y, BOMB_RADIUS, '#ff9800');

        const bombDamage = Math.floor(this.player.damage * BOMB_DAMAGE_MULT);
        for (const e of this.enemies) {
            if (e.dead) continue;
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < BOMB_RADIUS + e.radius) {
                const d = dist || 1;
                e.takeDamage(bombDamage, (dx / d) * BOMB_KNOCKBACK, (dy / d) * BOMB_KNOCKBACK);
                // Stun: freeze enemy movement
                e.stunTimer = BOMB_STUN_DURATION;
            }
        }
        // Also damage + stun all bosses (real + cheat-summoned)
        for (const b of this._allBosses()) {
            const dx = b.x - this.player.x;
            const dy = b.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < BOMB_RADIUS + b.radius) {
                b.takeDamage(bombDamage);
                // Bosses get a shorter stun
                b.stunTimer = Math.floor(BOMB_STUN_DURATION * 0.5);
            }
        }
        showToast('💣 BOOM!', '#ff9800', '💣');
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

        // Update achievement toasts
        for (const at of this._achievementToasts) at.timer -= dt * 1000;
        this._achievementToasts = this._achievementToasts.filter(t => t.timer > 0);

        // ── Cheat code processing ──
        this._processCheatCodes();
        // Update cheat notifications
        for (const n of this.cheatNotifications) n.timer -= dt * 1000;
        this.cheatNotifications = this.cheatNotifications.filter(n => n.timer > 0);

        // ── Dev Tools: apply overrides each frame ──
        if (DevTools.hasOverrides()) {
            DevTools.applyToPlayer(this.player);
            DevTools.applyToEnemies(this.enemies);
        }
        DevTools.updateLiveStats(this);

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
            case STATE_META_SHOP:       this._updateMetaShop();      break;
            case STATE_SHOP_RUN:        this._updateRunShop();       break;
            case STATE_ACHIEVEMENTS:    this._updateAchievements();  break;
            case STATE_LOADOUT:         this._updateLoadout();       break;
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
                AchievementStore.load(this.activeProfileIndex);
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
                AchievementStore.load(this.activeProfileIndex);
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
        AchievementStore.deleteProfileAchievements(index, this.profiles.length);
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
        AchievementStore.load(this.activeProfileIndex);
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

        // ── Impact System: update hit-stop + time scale ──
        Impact.update(dt * 1000);
        updateProcNotifs(dt * 1000);
        const timeScale = Impact.getTimeScale();
        const effectiveDt = dt * timeScale;

        // Consume trail spawns from impact system
        const trails = Impact.consumeTrails();
        for (const t of trails) {
            this.particles.dashImpactTrail(t.x, t.y, t.vx, t.vy, t.color);
        }

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
        if (this.secondWaveAnnounceTimer > 0) {
            this.secondWaveAnnounceTimer -= dt * 1000;
        }
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

        // ── Ability Q/E input ──
        const allBosses = this._allBosses();
        const combatContext = {
            player: this.player,
            enemies: this.enemies,
            boss: allBosses.length > 0 ? allBosses[0] : null,
            allBosses: allBosses,
            projectiles: this.projectiles,
            particles: this.particles,
            procSystem: this.procSystem,
        };
        if (wasPressed('KeyQ')) {
            if (this.abilitySystem.use(0, combatContext)) {
                const info = this.abilitySystem.getSlotInfo(0);
                if (info) this._playAbilitySFX(info.id);
            }
        }
        if (wasPressed('KeyE')) {
            if (this.abilitySystem.use(1, combatContext)) {
                const info = this.abilitySystem.getSlotInfo(1);
                if (info) this._playAbilitySFX(info.id);
            }
        }
        // Update active persistent abilities (blade_storm, gravity_pull)
        this.abilitySystem.update(effectiveDt, combatContext);

        // Attack
        if (isDown('Space')) {
            const targets = allBosses.length > 0
                ? [...this.enemies, ...allBosses]
                : this.enemies;

            // ── Cheat: One Hit Kill — temporarily set massive damage ──
            // ── Shop damage multiplier (weapon core + sharpen blade) ──
            let savedDmg;
            const shopDmgMult = this._getShopDamageMultiplier();
            if (this.cheats.onehitkill) {
                savedDmg = this.player.damage;
                this.player.damage = 999999;
            } else if (shopDmgMult !== 1) {
                savedDmg = this.player.damage;
                this.player.damage = Math.floor(this.player.damage * shopDmgMult);
            }

            const hitCount = this.player.attack(targets);

            if (savedDmg !== undefined) {
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
                    for (const b of allBosses) {
                        if (b.damageFlashTimer > 100) {
                            const bx = b.x - this.player.x;
                            const by = b.y - this.player.y;
                            const bd = Math.sqrt(bx * bx + by * by) || 1;
                            this.particles.hitSparks(b.x, b.y, bx / bd, by / bd);
                        }
                    }

                    // ── Proc dispatch on melee hits ──
                    const isCrit = Math.random() < this.player.critChance;
                    // Fire procs for each enemy that was just hit (flash timer indicates recent hit)
                    for (const e of this.enemies) {
                        if (!e.dead && e.damageFlashTimer > 100) {
                            this.procSystem.handleHit(
                                { source: this.player, target: e, damage: this.player.damage, isCrit, attackType: 'melee' },
                                { enemies: this.enemies, boss: allBosses[0] || null, particles: this.particles },
                            );
                        }
                    }
                    for (const b of allBosses) {
                        if (b.damageFlashTimer > 100) {
                            this.procSystem.handleHit(
                                { source: this.player, target: b, damage: this.player.damage, isCrit, attackType: 'melee' },
                                { enemies: this.enemies, boss: allBosses[0] || null, particles: this.particles },
                            );
                        }
                    }
                    // Small impact on melee hits (screen shake + flash)
                    Impact.shake(1.5, 0.85);
                }
            }
        }

        // Ranged Attack (N key) — throw dagger
        if (wasPressed('KeyN')) {
            // Apply shop damage multiplier for dagger
            const shopDmgMultDagger = this._getShopDamageMultiplier();
            let savedDmgDagger;
            if (shopDmgMultDagger !== 1) {
                savedDmgDagger = this.player.damage;
                this.player.damage = Math.floor(this.player.damage * shopDmgMultDagger);
            }
            const throwData = this.player.tryThrow();
            if (savedDmgDagger !== undefined) {
                this.player.damage = savedDmgDagger;
            }
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

        // Bomb activation (B key)
        if (wasPressed('KeyB') && this.bombCharges > 0) {
            this._activateBomb();
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

                // ── Achievement event: enemy killed (blocked by cheats) ──
                if (!this.cheatsUsedThisRun) {
                    achEmit('enemy_killed', { enemyType: e.type, isElite: (e.type === ENEMY_TYPE_TANK || e.type === ENEMY_TYPE_DASHER) });
                }

                // Death explosion particles
                const eColor = ENEMY_COLORS[e.type] || ENEMY_COLOR;
                this.particles.enemyDeath(e.x, e.y, eColor, e.radius);

                // Proc dispatch: on kill
                this.procSystem.handleKill(
                    { source: this.player, target: e, attackType: 'melee' },
                    { enemies: this.enemies, boss: this._allBosses()[0] || null, particles: this.particles },
                );

                // Try to spawn a pickup drop
                if (dropsEnabled) {
                    const pickup = trySpawnPickup(e.x, e.y, e.type);
                    if (pickup) this.pickups.push(pickup);
                }

                // Combo kill registration (real game only)
                if (!this.trainingMode) {
                    this._comboRegisterKill(e.x, e.y);
                }

                // Coin drop (real game only) — physical coin the player must collect
                if (!this.trainingMode) {
                    const isElite = (e.type === ENEMY_TYPE_TANK || e.type === ENEMY_TYPE_DASHER);
                    const coinValue = isElite ? COIN_REWARD_ELITE_ENEMY : COIN_REWARD_NORMAL_ENEMY;
                    this.coinPickups.push(new CoinPickup(e.x, e.y, coinValue));
                }

                if (!this.trainingMode) {
                    // Apply combo XP multiplier + cheat XP boost + meta XP multiplier + shop booster
                    const xpMult = this.cheats.xpboost ? 10 : 1;
                    const metaXpMult = this.metaModifiers ? this.metaModifiers.xpMultiplier : 1;
                    const runXpMult = this.runUpgradesActive.upgrade_xp_magnet ? 1.15 : 1;
                    const shopXpMult = this._getShopXpMultiplier();
                    const xp = Math.floor(e.xpValue * this.comboMultiplier * xpMult * metaXpMult * runXpMult * shopXpMult);
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
                    case 'rocket_fire':
                        Audio.playProjectile();
                        break;
                    case 'stomp':
                        Audio.playBossSlam();
                        this.particles.bossSlam(evt.x, evt.y, evt.radius, this.boss.color);
                        triggerShake(10, 0.9);
                        break;
                    case 'bombardment': {
                        // Spawn explosion zones at each marked target
                        for (const t of evt.targets) {
                            this.explosions.push(new Explosion(
                                t.x, t.y, evt.radius, evt.damage, evt.linger, this.boss.color,
                            ));
                            this.particles.rocketExplosion(t.x, t.y, evt.radius, this.boss.color);
                        }
                        Audio.playBossSlam();
                        triggerShake(12, 0.9);
                        break;
                    }
                }
            }
            this.boss._events = [];

            // Process boss spawned adds
            if (this.boss.pendingSpawns.length > 0) {
                const eHp  = DevTools.getVal('enemyHp',    ENEMY_HP);
                const eSpd = DevTools.getVal('enemySpeed',  ENEMY_SPEED);
                const eDmg = DevTools.getVal('enemyDamage', ENEMY_DAMAGE);
                const hpBase = Math.floor(eHp * (1 + (this.stage - 1) * 0.15) * 0.7);
                const spdBase = Math.min(eSpd * (1 + (this.stage - 1) * 0.05), eSpd * 2) * 0.8;
                const dmgBase = Math.floor((eDmg + (this.stage - 1) * 0.5) * 0.7);
                for (const spawn of this.boss.pendingSpawns) {
                    this.enemies.push(new Enemy(spawn.x, spawn.y, hpBase, spdBase, dmgBase, spawn.type, this.stage));
                }
                this.boss.pendingSpawns = [];
            }
        }

        // ── Cheat bosses update ──
        for (const cb of this.cheatBosses) {
            if (cb.dead) continue;
            cb.update(dt, this.player, this.grid, this.enemies, this.projectiles);

            for (const evt of cb._events) {
                switch (evt.type) {
                    case 'slam':
                        Audio.playBossSlam();
                        this.particles.bossSlam(evt.x, evt.y, evt.radius, cb.color);
                        triggerShake(8, 0.88);
                        break;
                    case 'phase_transition':
                        Audio.playBossRoar();
                        this.particles.bossPhaseTransition(cb.x, cb.y);
                        triggerShake(10, 0.9);
                        break;
                    case 'charge': Audio.playTankCharge(); break;
                    case 'summon': Audio.playBossRoar(); break;
                    case 'projectile': Audio.playProjectile(); break;
                    case 'rocket_fire': Audio.playProjectile(); break;
                    case 'stomp':
                        Audio.playBossSlam();
                        this.particles.bossSlam(evt.x, evt.y, evt.radius, cb.color);
                        triggerShake(10, 0.9);
                        break;
                    case 'bombardment': {
                        for (const t of evt.targets) {
                            this.explosions.push(new Explosion(
                                t.x, t.y, evt.radius, evt.damage, evt.linger, cb.color,
                            ));
                            this.particles.rocketExplosion(t.x, t.y, evt.radius, cb.color);
                        }
                        Audio.playBossSlam();
                        triggerShake(12, 0.9);
                        break;
                    }
                }
            }
            cb._events = [];

            if (cb.pendingSpawns.length > 0) {
                const eHp  = DevTools.getVal('enemyHp',    ENEMY_HP);
                const eSpd = DevTools.getVal('enemySpeed',  ENEMY_SPEED);
                const eDmg = DevTools.getVal('enemyDamage', ENEMY_DAMAGE);
                const hpBase = Math.floor(eHp * (1 + (this.stage - 1) * 0.15) * 0.7);
                const spdBase = Math.min(eSpd * (1 + (this.stage - 1) * 0.05), eSpd * 2) * 0.8;
                const dmgBase = Math.floor((eDmg + (this.stage - 1) * 0.5) * 0.7);
                for (const spawn of cb.pendingSpawns) {
                    this.enemies.push(new Enemy(spawn.x, spawn.y, hpBase, spdBase, dmgBase, spawn.type, this.stage));
                }
                cb.pendingSpawns = [];
            }
        }
        // Remove dead cheat bosses
        for (const cb of this.cheatBosses) {
            if (cb.dead && !cb.xpGiven) {
                cb.xpGiven = true;
                Audio.playBossDeath();
                this.particles.bossDeath(cb.x, cb.y, cb.color);
                triggerShake(15, 0.92);
            }
        }
        this.cheatBosses = this.cheatBosses.filter(b => !b.dead);

        // Boss death (real boss only — cheat bosses handled above)
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
            this.explosions = [];
            Audio.playBossDeath();
            this.particles.bossDeath(this.boss.x, this.boss.y, this.boss.color);
            triggerShake(15, 0.92);

            // ── Achievement events: boss killed + room cleared (blocked by cheats) ──
            if (!this.cheatsUsedThisRun) {
                achEmit('boss_killed', {
                    bossIndexInRun: this.bossesKilledThisRun,
                    stage: this.stage,
                    biome: this.currentBiome ? this.currentBiome.id : null,
                });
                achEmit('room_cleared', { stage: this.stage });
            }

            // ── Meta Progression: boss kill rewards (blocked by cheats) ──
            this.bossesKilledThisRun++;
            // Coin reward for boss kill
            this.runCoins += COIN_REWARD_BOSS;
            if (!this.cheatsUsedThisRun) {
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
                    achEmit('relic_unlocked', { relicId: reward.relicId });
                }
                // Toast for run upgrade unlock
                if (reward.runUpgradeId) {
                    const upg = RUN_UPGRADE_DEFINITIONS[reward.runUpgradeId];
                    showToast(`New Upgrade: ${upg.name}`, upg.color, upg.icon);
                }
            } else {
                this.lastBossReward = { shardsGained: 0, relicId: null, runUpgradeId: null };
            }

            // ── Combat unlock: check boss milestone (blocked by cheats) ──
            if (!this.cheatsUsedThisRun) {
                const combatUnlock = checkBossUnlocks(MetaStore.getState().stats.bossesKilledTotal);
                if (combatUnlock) {
                    const label = combatUnlock.type === 'ability' ? 'Ability' : 'Passive';
                    showBigToast(`${label} Unlocked: ${combatUnlock.name}`, combatUnlock.color, combatUnlock.icon);
                    Audio.playRelicUnlock();
                    this.lastBossReward.combatUnlock = combatUnlock;
                }
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
            // Rocket exploded → spawn lingering explosion zone
            if (p.dead && p.isRocket && p.pendingExplosion) {
                const ex = p.pendingExplosion;
                this.explosions.push(new Explosion(ex.x, ex.y, ex.radius, ex.damage, ex.linger, ex.color));
                this.particles.rocketExplosion(ex.x, ex.y, ex.radius, ex.color);
                Audio.playBossSlam();        // reuse slam sound for explosion
                triggerShake(6, 0.85);
            }
        }
        this.projectiles = this.projectiles.filter(p => !p.dead);

        // Explosion zones — update lingering AoE
        for (const ex of this.explosions) {
            ex.update(dt, this.player, noDamage);
        }
        this.explosions = this.explosions.filter(ex => !ex.dead);

        // Player daggers — update + hit detection
        const activeBoss = allBosses.length > 0 ? allBosses[0] : null;
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
                // Proc dispatch on dagger hit
                const daggerCrit = Math.random() < this.player.critChance;
                const hitEntity = d.hitTarget.entity || d.hitTarget;
                if (hitEntity && !hitEntity.dead) {
                    this.procSystem.handleHit(
                        { source: this.player, target: hitEntity, damage: d.damage || this.player.damage, isCrit: daggerCrit, attackType: 'dagger' },
                        { enemies: this.enemies, boss: allBosses[0] || null, particles: this.particles },
                    );
                }
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

        // Meta booster shield: absorb hit if shield charges available
        if (this.player.hp < hpBefore && this.metaBoosterShieldCharges > 0) {
            // Undo the damage — restore HP to before
            this.player.hp = hpBefore;
            this.metaBoosterShieldCharges--;
            this.player.invulnTimer = PLAYER_INVULN_TIME;
            Audio.playShieldBlock();
            this.particles.shieldBlock(this.player.x, this.player.y);
            showToast(`Shield absorbed! (${this.metaBoosterShieldCharges} left)`, '#00bcd4', '🛡️');
        }

        // Detect player damage — apply meta damage reduction
        if (this.player.hp < hpBefore) {
            Audio.playPlayerHurt();
            this.particles.playerDamage(this.player.x, this.player.y);
            triggerShake(6, 0.86);

            // ── Achievement event: player took damage (blocked by cheats) ──
            if (!this.cheatsUsedThisRun) {
                achEmit('player_took_damage', { amount: hpBefore - this.player.hp, stage: this.stage });
            }

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

                // ── Achievement event: pickup collected (blocked by cheats) ──
                if (!this.cheatsUsedThisRun) {
                    achEmit('pickup_collected', { pickupType: pk.type });
                }
            }
        }
        this.pickups = this.pickups.filter(pk => !pk.dead);

        // Coin pickups: update + magnet + collect
        for (const coin of this.coinPickups) {
            coin.update(dt, this.player);
            if (!coin.dead && coin.checkCollection(this.player)) {
                this.runCoins += coin.value;
                Audio.playPickup();
                this.particles.pickupCollect(coin.x, coin.y, '#ffd700', '#ffe082');
                coin.dead = true;

                // ── Achievement event: coins gained (blocked by cheats) ──
                if (!this.cheatsUsedThisRun) {
                    achEmit('coins_gained', { amount: coin.value });
                }
            }
        }
        this.coinPickups = this.coinPickups.filter(c => !c.dead);

        // Training: respawn enemies when all dead
        if (this.trainingMode) {
            const alive = this.enemies.filter(e => !e.dead).length;
            if (alive === 0) {
                this.trainingRespawnTimer += dt * 1000;
                if (this.trainingRespawnTimer >= DevTools.getVal('trainingRespawn', TRAINING_RESPAWN_DELAY)) {
                    this._respawnTrainingEnemies();
                }
            }
        }

        // Door
        const allBossesForDoor = this._allBosses();
        const allFoes = allBossesForDoor.length > 0 ? [...this.enemies, ...allBossesForDoor] : this.enemies;
        this.door.update(dt, allFoes, this.trainingMode);

        // ── Second Wave check ──
        // When all enemies die, roll for a second wave (stage 5+, non-boss, non-training, once per room)
        if (doorWasLocked && !this.door.locked
            && !this.trainingMode
            && !this.secondWaveTriggered
            && !this._isBossStage(this.stage)
            && this.stage >= SECOND_WAVE_MIN_STAGE
            && Math.random() < SECOND_WAVE_CHANCE) {
            this.secondWaveTriggered = true;
            this.secondWaveActive = true;
            this.secondWaveAnnounceTimer = SECOND_WAVE_ANNOUNCE_TIME;

            // Spawn a smaller wave of enemies
            const baseCount = Math.min(2 + Math.floor((this.stage - 1) * 0.75), 10);
            const waveCount = Math.max(2, Math.round(baseCount * SECOND_WAVE_ENEMY_MULT));
            const spawns = getEnemySpawns(
                this.grid, this._currentSpawnPos, { col: this.door.col, row: this.door.row }, waveCount,
            );
            const eHp  = DevTools.getVal('enemyHp',    ENEMY_HP);
            const eSpd = DevTools.getVal('enemySpeed',  ENEMY_SPEED);
            const eDmg = DevTools.getVal('enemyDamage', ENEMY_DAMAGE);
            const hpBase  = Math.floor(eHp * (1 + (this.stage - 1) * 0.15));
            const spdBase = Math.min(eSpd * (1 + (this.stage - 1) * 0.05), eSpd * 2);
            const dmgBase = eDmg + Math.floor((this.stage - 1) * 0.5);
            const types = this._getEnemyTypes(this.stage, waveCount, this.currentBiome);

            this.enemies = spawns.map((p, i) => new Enemy(
                p.x, p.y, hpBase, spdBase, dmgBase, types[i], this.stage,
            ));
            this.projectiles = [];

            // Re-lock the door
            this.door.locked = true;

            // Effects
            triggerShake(6, 0.9);
            Audio.playBossRoar();  // dramatic sound for the ambush
        } else {
            // Normal door unlock — no second wave
            if (doorWasLocked && !this.door.locked) {
                if (this.secondWaveActive) this.secondWaveActive = false;
                Audio.playDoorUnlock();
                this.particles.doorUnlock(
                    this.door.x + this.door.width / 2,
                    this.door.y + this.door.height / 2,
                );
            }
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

                // ── Achievement event: room cleared (non-boss, blocked by cheats) ──
                if (!this.cheatsUsedThisRun && !this._isBossStage(this.stage)) {
                    achEmit('room_cleared', { stage: this.stage });
                }

                this.nextRoom();
            }
        }

        // Death (only in real game)
        if (!this.trainingMode && this.player.hp <= 0) {
            // Meta booster: Panic Button — revive once
            if (this.metaBoosterPanicAvailable) {
                this.metaBoosterPanicAvailable = false;
                this.player.hp = Math.floor(this.player.maxHp * 0.5);
                this.player.invulnTimer = 1500; // generous i-frames after revive
                Audio.playLevelUp();
                this.particles.levelUp(this.player.x, this.player.y);
                triggerShake(10, 0.92);
                showBigToast('💀 REVIVED! 💀', '#ffd700', '💀');
                if (!this.cheatsUsedThisRun) achEmit('revive_used', {});
            } else {
                this._saveHighscore();
                this.player.clearBuffs();
                this._comboReset();
                Audio.playGameOver();
                triggerShake(10, 0.9);
                // Meta: finalize run (blocked by cheats)
                if (!this.cheatsUsedThisRun) {
                    RewardSystem.onRunEnd(this.stage);
                    achEmit('run_end', { stage: this.stage });
                }
                this.state = STATE_GAME_OVER;
            }
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
            this.explosions = [];
            this.playerProjectiles = [];
            this.pickups = [];
            this.coinPickups = [];
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
        const count = 4; // 0=SFX, 1=Music, 2=Rooms, 3=Back

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

        // Toggle with Enter/Space or Left/Right arrows on toggleable rows
        const toggle = wasPressed('Enter') || wasPressed('Space');
        const leftRight = wasPressed('ArrowLeft') || wasPressed('ArrowRight')
                       || wasPressed('KeyA') || wasPressed('KeyD');

        if (toggle || (leftRight && this.settingsCursor < 3)) {
            Audio.playMenuSelect();
            if (this.settingsCursor === 0) {
                // Toggle SFX mute
                this.muted = Audio.toggleMute();
                Music.setMusicMuted(this.muted);
            } else if (this.settingsCursor === 1) {
                // Toggle music
                Music.toggleMusicEnabled();
            } else if (this.settingsCursor === 2) {
                // Toggle room generation mode
                this.proceduralRooms = !this.proceduralRooms;
                this._saveRoomModeSetting();
            } else if (this.settingsCursor === 3) {
                // Back to menu
                this.state = STATE_MENU;
            }
        }
    }

    _loadRoomModeSetting() {
        try {
            const val = localStorage.getItem('dungeon_procedural_rooms');
            if (val === null) return true; // default: procedural
            return val === 'true';
        } catch (e) { return true; }
    }

    _saveRoomModeSetting() {
        try {
            localStorage.setItem('dungeon_procedural_rooms', this.proceduralRooms ? 'true' : 'false');
        } catch (e) {}
    }

    _updateLevelUp() {
        // Use cached choices (computed at state transition to avoid random mismatch with render)
        const choices = this._cachedLevelUpChoices || this._getLevelUpChoices();
        const count = choices.length;

        // Navigate with W/S or arrows
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.upgradeIndex = (this.upgradeIndex - 1 + count) % count;
            this._levelUpSpaceReady = false;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.upgradeIndex = (this.upgradeIndex + 1) % count;
            this._levelUpSpaceReady = false;
            Audio.playMenuNav();
        }

        // Confirm with Enter or number keys
        let choiceIdx = null;
        if (wasPressed('Enter')) {
            choiceIdx = this.upgradeIndex;
        } else if (wasPressed('Space')) {
            // Double-press Space: first press readies, second confirms
            if (this._levelUpSpaceReady) {
                choiceIdx = this.upgradeIndex;
            } else {
                this._levelUpSpaceReady = true;
                Audio.playMenuNav();
            }
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

        // ── Achievement event: player level changed (blocked by cheats) ──
        if (!this.cheatsUsedThisRun) {
            achEmit('player_level_changed', { level: this.player.level });
        }

        this.upgradeIndex = 0;
        this._levelUpSpaceReady = false;

        // Chain level-ups
        if (this.player.xp >= this.player.xpToNext) {
            this._cachedLevelUpChoices = this._getLevelUpChoices();
            this.state = STATE_LEVEL_UP;
        } else {
            this._cachedLevelUpChoices = null;
            // Check if a run shop was pending (deferred from boss victory)
            if (this._pendingRunShop) {
                this._pendingRunShop = false;
                this.runShopCursor = 0;
                this.state = STATE_SHOP_RUN;
            } else {
                this.state = STATE_PLAYING;
            }
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
            this._startTraining();
            return;
        }

        // Back
        if (wasPressed('Escape')) {
            this.state = STATE_MENU;
            this.menuIndex = 0;
        }
    }

    _updateGameOver() {
        if (wasPressed('Enter')) {
            Audio.playMenuSelect();
            this.restart();
        }
        // Open meta menu from game over (KeyG for Meta Progress)
        if (wasPressed('KeyG')) {
            Audio.playMenuSelect();
            this._openMetaMenu(true);
        }
    }

    _updateAchievements() {
        const filterLabels = ['All', ...TIER_ORDER];
        const filterCount = filterLabels.length;

        // Tab switching (A/D)
        if (wasPressed('KeyA') || wasPressed('ArrowLeft')) {
            this.achievementFilter = (this.achievementFilter - 1 + filterCount) % filterCount;
            this.achievementCursor = 0;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyD') || wasPressed('ArrowRight')) {
            this.achievementFilter = (this.achievementFilter + 1) % filterCount;
            this.achievementCursor = 0;
            Audio.playMenuNav();
        }

        // Row navigation
        const filtered = this.achievementFilter === 0
            ? ACHIEVEMENTS
            : ACHIEVEMENTS.filter(a => a.tier === TIER_ORDER[this.achievementFilter - 1]);

        if (filtered.length > 0) {
            if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
                this.achievementCursor = (this.achievementCursor - 1 + filtered.length) % filtered.length;
                Audio.playMenuNav();
            }
            if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
                this.achievementCursor = (this.achievementCursor + 1) % filtered.length;
                Audio.playMenuNav();
            }
        }

        if (wasPressed('Escape')) {
            this.state = STATE_MENU;
            this.menuIndex = 0;
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
        if (wasPressed('Enter') || wasPressed('Space')) {
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
        const shopXpMult = this._getShopXpMultiplier();
        const xp = Math.floor(this.boss.xpValue * bossXpMult * metaXpMult * runXpMult * shopXpMult);
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
            // Open shop after every boss, flag it for after level-up chain
            this._pendingRunShop = true;
            this.state = STATE_LEVEL_UP;
            return;
        }

        // Open in-run shop after every boss
        this.runShopCursor = 0;
        this.state = STATE_SHOP_RUN;

        // No level-up, no shop → back to playing (door is unlocked, walk through to continue)
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
                // Menu/profiles/meta/settings/shops: silent
                Music.setDanger(0);
                break;
        }
    }

    _calculateDanger() {
        if (!this.player) return 0;

        const alive = this.enemies.filter(e => !e.dead);
        const livingBosses = this._allBosses();
        const bossAlive = livingBosses.length > 0;

        if (alive.length === 0 && !bossAlive) return 0.10;

        // Base: enemies or boss present
        let danger = 0.15;

        // Boss adds significant danger
        if (bossAlive) {
            danger += 0.25;
            const b = livingBosses[0];
            const dx = b.x - this.player.x;
            const dy = b.y - this.player.y;
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
            const boosterName = this.purchasedMetaBoosterId
                ? (META_BOOSTERS[this.purchasedMetaBoosterId]?.name || null)
                : null;
            renderMenu(ctx, this.menuIndex, this.highscore, profileName, shards, boosterName);
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
            renderSettings(ctx, this.settingsCursor, this.muted, Music.isMusicEnabled(), this.proceduralRooms);
            this._renderCheatNotifications(ctx);
            return;
        }

        if (this.state === STATE_META_SHOP) {
            const shards = getAvailableShards(MetaStore.getState());
            renderMetaShop(ctx, this.metaShopCursor, shards, this.purchasedMetaBoosterId);
            renderToasts(ctx);
            this._renderCheatNotifications(ctx);
            return;
        }

        if (this.state === STATE_ACHIEVEMENTS) {
            renderAchievements(ctx, this.achievementCursor, this.achievementFilter);
            this._renderAchievementToasts(ctx);
            this._renderCheatNotifications(ctx);
            return;
        }

        if (this.state === STATE_LOADOUT) {
            const meta = MetaStore.getState();
            renderLoadoutScreen(ctx, this.loadoutCursor, this.loadoutAbilities, this.loadoutProcs, meta, this.loadoutRejectFlash);
            this._renderCheatNotifications(ctx);
            return;
        }

        renderRoom(ctx, this.grid, this.currentBiome, this.stage || 0);
        for (const h of this.hazards) h.render(ctx);
        for (const ex of this.explosions) ex.render(ctx);
        this.door.render(ctx);
        for (const e of this.enemies) e.render(ctx);
        if (this.boss && !this.boss.dead) this.boss.render(ctx);
        for (const cb of this.cheatBosses) { if (!cb.dead) cb.render(ctx); }
        for (const p of this.projectiles) p.render(ctx);
        for (const d of this.playerProjectiles) d.render(ctx);
        for (const pk of this.pickups) pk.render(ctx);
        for (const coin of this.coinPickups) coin.render(ctx);
        this.particles.render(ctx);
        this.player.render(ctx);

        // Biome atmospheric overlay (tint + vignette) — after entities, before HUD
        renderAtmosphere(ctx, this.currentBiome);

        // Locked-door hint (real game only)
        if (!this.trainingMode && this.door.locked && this.door.isPlayerNear(this.player)) {
            const anyBossAlive = this._allBosses().length > 0;
            const lockText = anyBossAlive ? 'DEFEAT THE BOSS' : 'LOCKED';
            this._renderTooltip(
                this.door.x + this.door.width / 2,
                this.door.y - 14,
                lockText, '#e74c3c',
            );
        }

        // Training door hint
        if (this.trainingMode && this.door.isPlayerNear(this.player)) {
            this._renderTooltip(
                this.door.x + this.door.width / 2,
                this.door.y - 14,
                'EXIT (or ESC)', '#27ae60',
            );
        }

        let alive = this.enemies.filter(e => !e.dead).length;
        const livingBosses = this._allBosses();
        alive += livingBosses.length;
        const isBossRoom = !!(this.boss) || this.cheatBosses.length > 0;
        const biomeName  = this.currentBiome ? this.currentBiome.name : null;
        const biomeColor = this.currentBiome ? this.currentBiome.nameColor : null;
        renderHUD(ctx, this.player, this.stage, alive, this.trainingMode, this.muted,
                  this.comboCount, this.comboTier, this.comboMultiplier, this.comboTimer, isBossRoom,
                  biomeName, biomeColor,
                  this.runCoins, this.metaBoosterShieldCharges, this.bombCharges);

        // Stat modifier summary (net buffs/nerfs from all sources)
        renderBuffSummary(ctx, this._computeNetModifiers());

        // ── Ability / Proc bar ──
        renderAbilityBar(ctx, this.abilitySystem, this.procSystem);

        // Boss HP bars
        for (const b of this._allBosses()) {
            renderBossHPBar(ctx, b);
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

        // ── Second Wave announcement banner ──
        if (this.secondWaveAnnounceTimer > 0) {
            this._renderSecondWaveBanner(ctx);
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
            const remaining = Math.max(0, DevTools.getVal('trainingRespawn', TRAINING_RESPAWN_DELAY) - this.trainingRespawnTimer);
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

        // ── Achievement unlock toasts ──
        this._renderAchievementToasts(ctx);

        // Overlays
        if (this.state === STATE_PAUSED) {
            this._renderPauseOverlay(ctx);
        } else if (this.state === STATE_LEVEL_UP) {
            const choices = this._cachedLevelUpChoices || this._getLevelUpChoices();
            renderLevelUpOverlay(ctx, this.player, this.upgradeIndex, choices, this._levelUpSpaceReady);
        } else if (this.state === STATE_GAME_OVER) {
            const runRewards = RewardSystem.getRunRewards();
            renderGameOverOverlay(ctx, this.stage, this.player.level, runRewards);
        } else if (this.state === STATE_BOSS_VICTORY) {
            renderBossVictoryOverlay(ctx, this.boss.name, this.boss.color,
                this.bossRewardIndex, BOSS_REWARD_HP, BOSS_REWARD_DAMAGE, BOSS_REWARD_SPEED,
                this.lastBossReward, RELIC_DEFINITIONS, RUN_UPGRADE_DEFINITIONS);
        } else if (this.state === STATE_SHOP_RUN) {
            renderRunShop(ctx, this.runShopCursor, this.runCoins, this.stage,
                this.metaBoosterShieldCharges, this.bombCharges);
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

    _renderSecondWaveBanner(ctx) {
        const totalTime = SECOND_WAVE_ANNOUNCE_TIME;
        const fadeIn = 200;
        const fadeOut = 600;
        const elapsed = totalTime - this.secondWaveAnnounceTimer;

        let alpha;
        if (elapsed < fadeIn) alpha = elapsed / fadeIn;
        else if (this.secondWaveAnnounceTimer < fadeOut) alpha = this.secondWaveAnnounceTimer / fadeOut;
        else alpha = 1;

        const cy = CANVAS_HEIGHT / 2 - 20;

        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.textAlign = 'center';

        // Background bar
        ctx.fillStyle = 'rgba(80, 0, 0, 0.65)';
        ctx.fillRect(0, cy - 28, CANVAS_WIDTH, 60);

        // "WAVE 2" text
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 26px monospace';
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 16;
        ctx.fillText('⚔ SECOND WAVE ⚔', CANVAS_WIDTH / 2, cy + 4);
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.fillStyle = '#cc8888';
        ctx.font = '12px monospace';
        ctx.fillText('More enemies incoming!', CANVAS_WIDTH / 2, cy + 22);

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
        ctx.fillText('ESC = Back to menu  |  Door = Exit', CANVAS_WIDTH / 2, by - 6);
        ctx.textAlign = 'left';
    }

    /** Play the correct SFX for an ability activation. */
    _playAbilitySFX(abilityId) {
        switch (abilityId) {
            case 'shockwave':    Audio.playShockwave();    break;
            case 'blade_storm':  Audio.playBladeStorm();   break;
            case 'gravity_pull': Audio.playGravityPull();  break;
            case 'freeze_pulse': Audio.playFreezePulse();  break;
        }
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
            ? 'WASD = Move   SPACE = Attack   N = Throw   M = Dash   Q/E = Ability   ESC = Exit'
            : 'WASD = Move   SPACE = Attack   N = Throw   M = Dash   Q/E = Ability   P = Pause';
        ctx.fillText(hint, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
        ctx.textAlign = 'left';
        ctx.restore();
    }

    // ── Achievement toast rendering ────────────────────────

    _renderAchievementToasts(ctx) {
        if (this._achievementToasts.length === 0) return;
        ctx.save();
        ctx.textAlign = 'center';

        let y = 10;

        for (const t of this._achievementToasts) {
            const fadeMs = t.maxTimer * 0.3;
            const alpha = t.timer < fadeMs
                ? t.timer / fadeMs
                : Math.min(1, (t.maxTimer - t.timer) / 400);

            ctx.globalAlpha = alpha;

            const display = `${t.icon}  ACHIEVEMENT: ${t.text}`;
            const w = display.length * 8 + 32;
            const h = 30;
            const x = CANVAS_WIDTH / 2 - w / 2;

            // Background with glow
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#e040fb';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            // Text
            ctx.fillStyle = '#e040fb';
            ctx.font = 'bold 13px monospace';
            ctx.shadowColor = '#e040fb';
            ctx.shadowBlur = 8;
            ctx.fillText(display, CANVAS_WIDTH / 2, y + 20);
            ctx.shadowBlur = 0;

            y += h + 6;
        }

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
        if (DevTools.hasOverrides()) cheats.push({ label: '🛠️ DEV',  color: '#4fc3f7' });
        // Always show "NO PROGRESS" badge when cheats have been used this run
        if (this.cheatsUsedThisRun) cheats.push({ label: '⛔ NO PROGRESS', color: '#ff6666' });
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
