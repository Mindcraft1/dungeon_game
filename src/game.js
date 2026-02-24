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
    STATE_EVENT, STATE_BOSS_SCROLL,
    COMBO_TIMEOUT, COMBO_TIER_1, COMBO_TIER_2, COMBO_TIER_3, COMBO_TIER_4,
    COMBO_XP_MULT_1, COMBO_XP_MULT_2, COMBO_XP_MULT_3, COMBO_XP_MULT_4,
    BOSS_STAGE_INTERVAL, BOSS_TYPE_BRUTE, BOSS_TYPE_WARLOCK, BOSS_TYPE_PHANTOM, BOSS_TYPE_JUGGERNAUT, BOSS_TYPE_OVERLORD,
    BOSS_REWARD_HP, BOSS_REWARD_DAMAGE, BOSS_REWARD_SPEED,
    COIN_REWARD_NORMAL_ENEMY, COIN_REWARD_ELITE_ENEMY, COIN_REWARD_BOSS,
    META_BOOSTERS, META_BOOSTER_IDS,
    RUN_SHOP_ITEMS, RUN_SHOP_ITEM_IDS,
    PLAYER_INVULN_TIME,
    BOMB_RADIUS, BOMB_DAMAGE_MULT, BOMB_STUN_DURATION, BOMB_KNOCKBACK,
    COIN_DROP_CHANCE, COIN_DROP_LIFETIME,
    SHOP_FORGE_TOKEN_COST, SHOP_FORGE_TOKEN_CHANCE,
    PICKUP_RAGE_SHARD, PICKUP_PIERCING_SHOT, PICKUP_SWIFT_BOOTS,
    PICKUP_SPEED_SURGE, PICKUP_IRON_SKIN,
    BUFF_RAGE_DAMAGE_MULT, BUFF_PIERCING_DAMAGE_MULT, BUFF_PIERCING_RANGE_MULT,
    BUFF_SWIFT_SPEED_MULT, BUFF_SPEED_SURGE_CD_MULT, BUFF_IRON_SKIN_REDUCE,
    HAZARD_LAVA_SLOW,
    HAZARD_TAR_SLOW,
    HAZARD_TYPE_LASER_WALL,
    CANYON_FALL_HP_PENALTY, CANYON_FALL_COIN_PENALTY, CANYON_INTRO_STAGE,
    ROOM_TYPE_NORMAL, ROOM_TYPE_BOSS, ROOM_TYPE_EVENT, ROOM_TYPE_DARKNESS,
    DARKNESS_CONFIG,
} from './constants.js';
import { isDown, wasPressed, getMovement, getLastKey, getActivatedCheat, isMouseDown, wasMousePressed, getMousePos, isMouseActive, getMenuHover, getMenuHoverCustom, getMenuHoverGrid, getTabHover } from './input.js';
import { parseRoom, parseTrainingRoom, getEnemySpawns, generateHazards, ROOM_NAMES, TRAINING_ROOM_NAME, getRoomCount, parseBossRoom, BOSS_ROOM_NAME, generateProceduralRoom } from './rooms.js';
import { renderRoom, renderAtmosphere } from './render.js';
import { pushOutOfAABB } from './collision.js';
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
import { getColorById, PLAYER_COLORS } from './cosmetics.js';
import { getClassById, CLASS_DEFINITIONS, DEFAULT_CLASS_ID, renderClassEmblem } from './classes.js';

// ── Meta Progression ──
import * as MetaStore from './meta/metaStore.js';
import * as RewardSystem from './meta/rewardSystem.js';
import { RELIC_DEFINITIONS, RELIC_IDS, isRelicUnlocked } from './meta/relics.js';
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
import { ABILITY_IDS, ABILITY_DEFINITIONS } from './combat/abilities.js';
import { PROC_IDS, PROC_DEFINITIONS } from './combat/procs.js';
import { applyFreeze as applyFreezeStatus, applyBurn as applyBurnStatus } from './combat/statusEffects.js';
import { renderAbilityBar, updateProcNotifs } from './ui/uiAbilityBar.js';
import { ABILITY_ORDER, PROC_ORDER, TOTAL_LOADOUT_ITEMS, isAbilityUnlocked, isProcUnlocked, sanitizeLoadout, checkBossUnlocks } from './combat/combatUnlocks.js';
import { renderLoadoutScreen } from './ui/loadoutScreen.js';
import * as DevTools from './ui/devTools.js';

// ── Upgrade Node System ──
import * as UpgradeEngine from './upgrades/upgradeEngine.js';
import { getNode as getNodeDef, NODE_DEFINITIONS } from './upgrades/nodes.js';

// ── Unlock Map (achievements/biome mastery/scrolls) ──
import { processAchievementUnlock as processAchUnlock, processBiomeMasteryBossKill, generateBossScrollChoices, applyBossScrollChoice, checkPityUnlock } from './unlocks/unlockMap.js';

// ── Event System ──
import * as EventSystem from './events/eventSystem.js';

// ── Boss Scroll UI ──
import { renderBossScrollOverlay } from './ui/bossScrollUI.js';

// ── Room Type System ──
import { getRoomType, callHook } from './rooms/init.js';
import { isDarknessActive, isInsideLight } from './rooms/roomTypes/darkness.js';

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
        this.profileColorPicking = false;
        this.colorPickerCursor = 0;
        this.profileClassPicking = false;  // class selection during profile creation
        this.classPickerCursor = 0;        // index into CLASS_DEFINITIONS

        this.stage = 1;
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.playerProjectiles = [];  // player-fired daggers
        this.explosions = [];         // lingering rocket explosion zones
        this._fireZones = [];         // fire trail damage zones (from dagger/dash fire trail nodes)
        this._killNovaCooldown = 0;   // Kill Nova cooldown tracker
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
        this.settingsCursor = 0;  // 0=SFX, 1=Music, 2=Rooms, 3=DmgNumbers, 4=MouseAim, 5=Back
        this._settingsReturnState = STATE_MENU;  // tracks where to return from settings
        this.proceduralRooms = this._loadRoomModeSetting();
        this.showDamageNumbers = this._loadDamageNumbersSetting();
        this.mouseAimEnabled = this._loadMouseAimSetting();

        // ── Particles ──
        this.particles = new ParticleSystem();

        // ── Damage Numbers ──
        this.damageNumbers = [];  // [{x, y, amount, timer, maxTimer}]

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
        this.runUnlocksLog = [];      // all permanent unlocks earned this run [{icon, name, color, type}]

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
        this.metaBoosterWeaponCoreActive = false;  // +12% dmg until boss 2
        this.metaBoosterTrainingActive = false;     // +20% XP until level 5
        this.metaBoosterPanicAvailable = false;     // 1x revive
        this.metaBoosterThickSkinActive = false;   // -10% damage taken
        this.metaBoosterSwiftFeetActive = false;   // +10% move speed
        this.metaBoosterScavengerActive = false;   // +30% coin drops
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

        // ── Upgrade Node / Event / Scroll state ──
        this.eventState = null;              // current event state object (from eventSystem)
        this.scrollChoices = null;           // boss scroll choices array (3 items)
        this.scrollCursor = 0;              // cursor for boss scroll overlay
        this.forgeTokenCount = 0;           // forge tokens held (from trader/trial/shop)
        this.rerollTokenCount = 0;          // reroll tokens held (from trader)
        this.hasForgeTokenInShop = false;   // whether forge token appears in current shop visit
        this.trialActive = false;           // true while trial challenge is in progress
        this._pendingForge = false;          // true when forge UI should open after current event
        this._pendingBossScroll = null;     // scroll choices deferred until after boss rewards

        // ── Room Type System ──
        this.currentRoomType = ROOM_TYPE_NORMAL;   // active room type id
        this._lastDarknessStage = -10;             // stage of last darkness room (prevent consecutive)
        this.darknessXpMult = 1;                   // XP multiplier for darkness rooms (reset per room)
        this._darknessRewardPending = false;        // true if darkness reward should be applied on clear

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
                // Migrate: ensure every profile has a colorId and classId
                for (const p of this.profiles) {
                    if (!p.colorId) p.colorId = 'cyan';
                    if (!p.classId) p.classId = DEFAULT_CLASS_ID;
                }
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
            case 'summon_juggernaut':
            case 'summon_overlord': {
                if (this.state === STATE_PLAYING) {
                    this._cheatSummonBoss(cheatId);
                }
                break;
            }
            case 'jumpbiome': {
                if (this.state === STATE_PLAYING && !this.trainingMode) {
                    const curBiomeIdx = Math.floor((this.stage - 1) / BOSS_STAGE_INTERVAL);
                    const nextBiomeStart = (curBiomeIdx + 1) * BOSS_STAGE_INTERVAL + 1;
                    this.stage = nextBiomeStart - 1; // nextRoom() will increment
                    this.nextRoom();
                    const name = this.currentBiome ? this.currentBiome.name : 'Unknown';
                    this._cheatNotify(`JUMPED TO ${name.toUpperCase()}`, this.currentBiome?.nameColor ?? '#4fc3f7');
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
            summon_overlord:   BOSS_TYPE_OVERLORD,
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

        // ── Process achievement → item unlock via unlockMap ──
        const unlocked = processAchUnlock(def.id);
        for (const u of unlocked) {
            const tLabel = u.type === 'ability' ? 'Ability' : u.type === 'proc' ? 'Passive' : 'Node';
            showBigToast(`Achievement Unlock: ${tLabel} ${u.name}`, u.color, u.icon);
            Audio.playRelicUnlock();
        }
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
        // Mouse hover
        const mh = getMenuHover(270, count, 43, 43, 340);
        if (mh >= 0 && mh !== this.menuIndex) { this.menuIndex = mh; Audio.playMenuNav(); }
        if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
            Audio.playMenuSelect();
            if (this.menuIndex === 0) {
                this._openLoadout();
            } else if (this.menuIndex === 1) {
                this._openMetaMenu(false);
            } else if (this.menuIndex === 2) {
                this.metaShopCursor = 0;
                this._checkBoosterUnlocks();
                this.state = STATE_META_SHOP;
            } else if (this.menuIndex === 3) {
                this.achievementCursor = 0;
                this.achievementFilter = 0;
                this.state = STATE_ACHIEVEMENTS;
            } else if (this.menuIndex === 4) {
                this.profileCursor = 0;
                this.profileCreating = false;
                this.profileDeleting = false;
                this.profileColorPicking = false;
                this.profileClassPicking = false;
                this.state = STATE_PROFILES;
            } else if (this.menuIndex === 5) {
                this._openTrainingConfig();
            } else if (this.menuIndex === 6) {
                this.settingsCursor = 0;
                this._settingsReturnState = STATE_MENU;
                this.state = STATE_SETTINGS;
            }
        }
    }

    _startGame() {
        this.trainingMode = false;
        this.stage = 1;
        this.currentRoomType = ROOM_TYPE_NORMAL;
        this._lastDarknessStage = -10;
        this.darknessXpMult = 1;
        this._darknessRewardPending = false;
        this.player = null;
        this.pickups = [];
        this.coinPickups = [];
        this.playerProjectiles = [];
        this._fireZones = [];
        this._killNovaCooldown = 0;
        this.controlsHintTimer = 5000;
        this.cheatsUsedThisRun = false;  // reset cheat flag for new run
        this.cheats.godmode = false;
        this.cheats.onehitkill = false;
        this.cheats.xpboost = false;
        this._comboReset();
        this.comboPopups = [];
        this.comboFlash = 0;
        this.damageNumbers = [];
        Enemy.damageEvents.length = 0;
        Boss.damageEvents.length = 0;
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
        this.runUnlocksLog = [];
        this._gameOverEffects = null;
        this.shieldCharges = 0;
        this.regenTimer = 0;

        // ── Low-HP heartbeat system ──
        this._heartbeatTimer = 0;       // ms until next heartbeat sound
        this._heartbeatPulse = 0;       // 0–1 visual pulse intensity (for vignette throb)
        this._applyMetaModifiers();

        // ── Class stat multipliers ──
        this._applyClassModifiers();

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
        this.metaBoosterThickSkinActive = false;
        this.metaBoosterSwiftFeetActive = false;
        this.metaBoosterScavengerActive = false;
        this.activeMetaBoosterId = this.purchasedMetaBoosterId;
        this.purchasedMetaBoosterId = null;  // consumed
        this._applyMetaBooster();
        this._checkBoosterUnlocks();  // update unlocks based on current stats

        // ── Combat System: equip from saved loadout ──
        this._equipSavedLoadout();

        // ── Upgrade Node System: reset for new run ──
        UpgradeEngine.resetForRun();
        EventSystem.resetForRun();
        this.eventState = null;
        this.scrollChoices = null;
        this.scrollCursor = 0;
        this.forgeTokenCount = 0;
        this.rerollTokenCount = 0;
        this.hasForgeTokenInShop = false;
        this.trialActive = false;
        this._pendingForge = false;
        this._pendingBossScroll = null;

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
        this._applyClassModifiers();
        this.state = STATE_PLAYING;
    }

    // ── Room management ────────────────────────────────────

    loadRoom(templateIndex) {
        // Use procedural generation if enabled, otherwise use predefined templates
        const { grid, spawnPos, doorPos } = this.proceduralRooms
            ? generateProceduralRoom(this.stage || 1)
            : parseRoom(templateIndex);

        // Strip canyon tiles from rooms if stage is below canyon intro stage
        if ((this.stage || 1) < CANYON_INTRO_STAGE) {
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c] === 2) grid[r][c] = 0;  // canyon → floor
                }
            }
        }

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
        this._fireZones = [];
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

        // ── Room type lifecycle: onEnter ──
        const roomDef = getRoomType(this.currentRoomType);
        callHook(roomDef, 'onEnter', { player: this.player, stage: this.stage });
    }

    _loadTrainingRoom() {
        const { grid, spawnPos, doorPos } = parseTrainingRoom();
        this.grid = grid;
        this._currentSpawnPos = spawnPos;
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
        this._currentSpawnPos = spawnPos;
        this._placePlayer(spawnPos);
        this.door = new Door(doorPos.col, doorPos.row);
        this.trainingRespawnTimer = 0;
        this.projectiles = [];
        this.explosions = [];
        this.playerProjectiles = [];
        this._fireZones = [];
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
        // Set initial safe position to spawn
        this.player.lastSafeX = px;
        this.player.lastSafeY = py;
        // Apply cosmetic colors from profile
        const _profile = this.activeProfile;
        if (_profile) {
            const colorDef = getColorById(_profile.colorId);
            this.player.bodyColor = colorDef.body;
            this.player.outlineColor = colorDef.outline;
            this.player.dashColor = colorDef.dash;
            this.player.ghostColor = colorDef.ghost;
        }
        // Apply class definition (stat mults + passive) from profile
        if (_profile && _profile.classId) {
            const classDef = getClassById(_profile.classId);
            this.player.classId = classDef.id;
            this.player.classPassive = classDef.passive;
        } else {
            this.player.classId = DEFAULT_CLASS_ID;
            this.player.classPassive = getClassById(DEFAULT_CLASS_ID).passive;
        }

        // Apply biome speed modifier
        this.player.biomeSpeedMult = this.currentBiome
            ? this.currentBiome.playerSpeedMult
            : 1.0;
    }

    /**
     * Compute enemy count using stepped density (increases every 2-3 rooms, not every room).
     * Density is the strongest difficulty lever — treat it carefully.
     *
     * Phase 1 (Rooms 1-9):  2 → 3 → 4 → 5 → 6  (stepped every 2 rooms, cap 6)
     * Phase 2 (Rooms 11-19): 6 → 7 → 8           (stepped every 3 rooms)
     * Phase 3 (Rooms 21-29): 8 → 9 → 10          (stepped every 3 rooms)
     * Phase 4+ (Rooms 31+):  10 (max cap)
     */
    _getEnemyCount(stage) {
        if (stage <= 0) return 2;
        // Determine which act and room-within-act we're in
        const act = Math.floor((stage - 1) / 10);       // 0-based act index
        const roomInAct = ((stage - 1) % 10);            // 0-9 within act

        if (act === 0) {
            // Phase 1 (rooms 1-9): stepped increases every 2 rooms
            // Room 1-2: 2, Room 3-4: 3, Room 5-6: 4, Room 7-8: 5, Room 9: 6
            const step = Math.floor(roomInAct / 2);
            return Math.min(2 + step, 6);
        } else if (act === 1) {
            // Phase 2 (rooms 11-19): start at 6, increase once or twice
            // Room 11-13: 6, Room 14-16: 7, Room 17-19: 8
            const step = Math.floor(roomInAct / 3);
            return Math.min(6 + step, 8);
        } else if (act === 2) {
            // Phase 3 (rooms 21-29): start at 8, increase gently
            // Room 21-23: 8, Room 24-26: 9, Room 27-29: 10
            const step = Math.floor(roomInAct / 3);
            return Math.min(8 + step, 10);
        }
        // Phase 4+ (rooms 31+): max density
        return 10;
    }

    /**
     * Compute phase-based enemy scaling. Never scales all three axes at once.
     * HP: gentle per-room slope.
     * Damage: flat per phase, not per room.
     * Speed: slow per-room slope, capped.
     */
    _getEnemyScaling(stage) {
        const eHp  = DevTools.getVal('enemyHp',    ENEMY_HP);
        const eSpd = DevTools.getVal('enemySpeed',  ENEMY_SPEED);
        const eDmg = DevTools.getVal('enemyDamage', ENEMY_DAMAGE);
        const act = Math.floor((stage - 1) / 10);

        // ── HP: gentle per-room increase, slightly steeper each act ──
        // Phase 1: +5% per room (rooms 1-9)   → max ~1.45× at room 9
        // Phase 2: +7% per room (rooms 11-19) → ~1.63× at room 19
        // Phase 3+: +8% per room              → continues climbing
        let hpMult;
        if (act === 0) {
            hpMult = 1 + (stage - 1) * 0.05;
        } else if (act === 1) {
            const phase1Max = 1 + 9 * 0.05;  // 1.45
            hpMult = phase1Max + (stage - 10) * 0.07;
        } else {
            const phase1Max = 1 + 9 * 0.05;  // 1.45
            const phase2Max = phase1Max + 9 * 0.07;  // 2.08
            hpMult = phase2Max + (stage - 20) * 0.08;
        }

        // ── Damage: flat per-phase, NOT per room ──
        // Phase 1: base damage (no increase)
        // Phase 2: +2 damage
        // Phase 3: +4 damage
        // Phase 4+: +6 damage
        const dmgBonus = act === 0 ? 0 : act === 1 ? 2 : act === 2 ? 4 : 6;

        // ── Speed: slow per-room slope, capped at ×1.6 ──
        const spdMult = Math.min(1 + (stage - 1) * 0.02, 1.6);

        return {
            hp:    Math.floor(eHp * hpMult),
            speed: eSpd * spdMult,
            damage: eDmg + dmgBonus,
        };
    }

    _spawnEnemies(grid, spawnPos, doorPos) {
        const count = this._getEnemyCount(this.stage);
        const { hp: hpBase, speed: spdBase, damage: dmgBase } = this._getEnemyScaling(this.stage);

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
     *   Stage 1-4:  100% basic
     *   Stage 5+:   shooters mixed in
     *   Stage 7+:   dashers mixed in
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

        // ── Adventurer class passive: heal on room clear ──
        if (this.player.adventurerHealPercent > 0) {
            const healAmt = Math.floor(this.player.maxHp * this.player.adventurerHealPercent);
            if (this.player.hp < this.player.maxHp) {
                this.player.hp = Math.min(this.player.hp + healAmt, this.player.maxHp);
                this.particles.levelUp(this.player.x, this.player.y);
                Audio.playHeal();
                showToast(`+${healAmt} HP (Survivor's Instinct)`, '#ffd54f', '✦');
            }
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

        // ── Room type lifecycle: exit previous room ──
        const prevDef = getRoomType(this.currentRoomType);
        callHook(prevDef, 'onExit');

        if (this._isBossStage(this.stage)) {
            this.currentRoomType = ROOM_TYPE_BOSS;
            this._loadBossRoom();
        } else {
            this.boss = null;
            this.bossVictoryDelay = 0;

            // ── Determine room type for this stage ──
            this.currentRoomType = ROOM_TYPE_NORMAL;
            this.darknessXpMult = 1;
            this._darknessRewardPending = false;

            if (!this.trainingMode) {
                // Roll for Darkness room
                if (this.stage >= DARKNESS_CONFIG.minStage
                    && this.stage > this._lastDarknessStage + 1     // not consecutive
                    && !this._isBossStage(this.stage + 1)           // not directly before a boss
                    && Math.random() < DARKNESS_CONFIG.spawnChance) {
                    this.currentRoomType = ROOM_TYPE_DARKNESS;
                    this._lastDarknessStage = this.stage;
                    this.darknessXpMult = DARKNESS_CONFIG.rewardXPMultiplier;
                    this._darknessRewardPending = true;
                }
            }

            this.loadRoom(this.stage - 1);

            // ── Check for random event (only non-darkness normal rooms) ──
            if (!this.trainingMode && !this.cheatsUsedThisRun
                && this.currentRoomType === ROOM_TYPE_NORMAL) {
                let eventType = EventSystem.rollForEvent(this.stage);
                // Library requires applied upgrade nodes; if player has none, re-roll once
                if (eventType === 'library') {
                    const appliedNodes = UpgradeEngine.getAppliedNodes();
                    if (Object.keys(appliedNodes).length === 0) {
                        eventType = EventSystem.rollForEvent(this.stage);
                        // If re-roll gives Library again or null, skip the event
                        if (eventType === 'library') eventType = null;
                    }
                }
                if (eventType) {
                    this.currentRoomType = ROOM_TYPE_EVENT;
                    this.eventState = EventSystem.createEventState(eventType, this._getUpgradeContext());
                    this.state = STATE_EVENT;
                }
            }
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
        this._fireZones = [];
        this.hazards = [];
        this.pickups = [];
        this.coinPickups = [];
        this.particles.clear();
        this.bossVictoryDelay = 0;
        this.cheatBosses = [];

        // Determine boss type (rotates: Brute → Warlock → Phantom → Juggernaut)
        const encounter = Math.floor(this.stage / BOSS_STAGE_INTERVAL) - 1;
        const bossTypes = [BOSS_TYPE_BRUTE, BOSS_TYPE_WARLOCK, BOSS_TYPE_PHANTOM, BOSS_TYPE_JUGGERNAUT, BOSS_TYPE_OVERLORD];
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
        this._fireZones = [];
        this.pickups = [];
        this.coinPickups = [];
        this.hazards = [];
        this.particles.clear();
        this._comboReset();
        this.comboPopups = [];
        this.comboFlash = 0;
        this.damageNumbers = [];
        this.boss = null;
        this.cheatBosses = [];
        this.bossVictoryDelay = 0;
        this.currentBiome = null;
        this.biomeAnnounceTimer = 0;
        // ── Room type cleanup ──
        const restartDef = getRoomType(this.currentRoomType);
        callHook(restartDef, 'onExit');
        this.currentRoomType = ROOM_TYPE_NORMAL;
        this._lastDarknessStage = -10;
        this.darknessXpMult = 1;
        this._darknessRewardPending = false;
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
        this.metaBoosterThickSkinActive = false;
        this.metaBoosterSwiftFeetActive = false;
        this.metaBoosterScavengerActive = false;
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
        // Mouse hover (loadout: abilities at 155, procs follow, spacing=40, START at end)
        const _loAbStartY = 155;
        const _loSpacing = 40;
        const _lomh = getMenuHover(_loAbStartY, totalItems, _loSpacing, 34, 400);
        if (_lomh >= 0 && _lomh !== this.loadoutCursor) { this.loadoutCursor = _lomh; Audio.playMenuNav(); }

        // Escape or RMB → back to menu
        if (wasPressed('Escape') || wasMousePressed(2)) {
            Audio.playMenuNav();
            this.state = STATE_MENU;
            return;
        }

        // Toggle selection (Space, Enter, or Click on a non-start item)
        const togglePressed = (wasPressed('Space') && this.loadoutCursor !== startIdx) || (wasPressed('Enter') && this.loadoutCursor !== startIdx) || (wasMousePressed(0) && this.loadoutCursor !== startIdx);
        if (togglePressed && this.loadoutCursor < startIdx) {
            this._loadoutToggle(this.loadoutCursor);
        }

        // Confirm (Enter, Space, or Click on START)
        if (((wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) && this.loadoutCursor === startIdx)) {
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
        this.player.overHeal = 0;

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

    /**
     * Apply character class stat multipliers and passive setup.
     * Called at run start after meta modifiers.
     */
    _applyClassModifiers() {
        if (!this.player || !this.player.classId) return;
        const cls = getClassById(this.player.classId);

        // Stat multipliers (applied to already-modified base stats)
        this.player.maxHp = Math.floor(this.player.maxHp * cls.hpMult);
        this.player.hp = this.player.maxHp;
        this.player.damage = Math.floor(this.player.damage * cls.damageMult);
        this.player.speed = Math.floor(this.player.speed * cls.speedMult);

        // Passive setup
        const passive = cls.passive;
        if (passive.type === 'shield') {
            // Guardian: auto-shield that blocks 1 hit, recharges after cooldown
            this.player.guardianShieldReady = true;
            this.player.guardianShieldCooldown = 0;
            this.player.guardianShieldMaxCooldown = passive.cooldown;
        }
        if (passive.type === 'crit') {
            // Rogue: bonus crit chance and crit damage multiplier
            this.player.critChance += passive.critBonus;
            this.player.rogueCritMult = passive.critMult;
        }
        if (passive.type === 'berserk') {
            // Berserker: damage buff when below HP threshold
            this.player.berserkThreshold = passive.hpThreshold;
            this.player.berserkDamageBuff = passive.damageBuff;
            this.player.berserkActive = false;
        }
        if (passive.type === 'roomHeal') {
            // Adventurer: heal % of max HP after each room clear
            this.player.adventurerHealPercent = passive.healPercent;
        }
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
        // Mouse tab click (tabs: 3 tabs, tabW=100, centred)
        const _mmTabY = this.metaFromGameOver ? 130 : 78;
        const _mmTabW = 100;
        const _mmTabStartX = CANVAS_WIDTH / 2 - (_mmTabW * META_TAB_COUNT) / 2;
        const _mmTabCenters = [0, 1, 2].map(i => _mmTabStartX + i * _mmTabW + _mmTabW / 2);
        const _mmTabH = getTabHover(_mmTabCenters, _mmTabY, _mmTabW, 24);
        if (_mmTabH >= 0 && wasMousePressed(0)) {
            if (_mmTabH !== this.metaTab) { this.metaTab = _mmTabH; Audio.playMenuNav(); }
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
            // Mouse hover on perk rows (startY = tabY+20, rowH=70, panelW=460)
            const _mmPerkStartY = _mmTabY + 20;
            const _mmph = getMenuHover(_mmPerkStartY + 32, PERK_IDS.length, 70, 64, 460);
            if (_mmph >= 0 && _mmph !== this.metaPerkCursor) { this.metaPerkCursor = _mmph; Audio.playMenuNav(); }

            // Buy perk
            if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
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

        // Back (ESC or RMB)
        if (wasPressed('Escape') || wasMousePressed(2)) {
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
            case 'meta_booster_lucky_start':
                this.runCoins += 15;
                showToast('Lucky Start: +15 bonus coins!', '#4caf50', '🍀');
                break;
            case 'meta_booster_thick_skin':
                this.metaBoosterThickSkinActive = true;
                if (this.player) this.player.metaDamageTakenMultiplier *= 0.90;
                showToast('Thick Skin: -10% damage taken!', '#795548', '🪨');
                break;
            case 'meta_booster_swift_feet':
                this.metaBoosterSwiftFeetActive = true;
                if (this.player) this.player.speed = Math.floor(this.player.speed * 1.10);
                showToast('Swift Feet: +10% move speed!', '#2196f3', '💨');
                break;
            case 'meta_booster_scavenger':
                this.metaBoosterScavengerActive = true;
                showToast('Scavenger: +30% coin drops!', '#ffab00', '🪙');
                break;
        }
    }

    /**
     * Check meta stats and unlock any boosters whose conditions are now met.
     * Called at run start, boss kill, and when opening the shop.
     */
    _checkBoosterUnlocks() {
        const meta = MetaStore.getState();
        let anyNew = false;
        for (const id of META_BOOSTER_IDS) {
            if (meta.unlockedBoosters[id]) continue;
            const booster = META_BOOSTERS[id];
            if (!booster.unlock) {
                // No condition — always unlocked
                meta.unlockedBoosters[id] = true;
                anyNew = true;
                continue;
            }
            const { stat, value } = booster.unlock;
            const current = meta.stats[stat] || 0;
            if (current >= value) {
                meta.unlockedBoosters[id] = true;
                anyNew = true;
                showToast(`Shop unlocked: ${booster.name}!`, booster.color, booster.icon);
            }
        }
        if (anyNew) MetaStore.save();
    }

    /** Get effective damage multiplier including all shop boosts. */
    _getShopDamageMultiplier() {
        let mult = this.runShopDamageMult;
        // Weapon Core: +12% until boss 2
        if (this.metaBoosterWeaponCoreActive && this.bossesKilledThisRun < 2) {
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

    // ── Fire Zone helpers (used by dagger fire trail + dash fire trail) ──

    /** Spawn a lingering fire damage zone at (x, y). */
    _spawnFireZone(x, y, dps, duration, radius) {
        if (!this._fireZones) this._fireZones = [];
        this._fireZones.push({ x, y, dps, timer: duration, radius, tickTimer: 0 });
    }

    /** Spawn orange/red fire trail particles at (x, y) via particle system. */
    _spawnFireTrailParticles(x, y) {
        // Use the particle system's internal array directly
        if (this.particles && this.particles.particles) {
            const colors = ['#ff6d00', '#ff9800', '#ffab40', '#ff3d00'];
            const c = colors[Math.floor(Math.random() * colors.length)];
            this.particles.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                vx: (Math.random() - 0.5) * 20,
                vy: -20 - Math.random() * 30,
                radius: 1.5 + Math.random() * 2,
                color: c,
                lifetime: 200 + Math.random() * 200,
                maxLifetime: 400,
                dead: false,
                friction: 0.95,
                gravity: -40,
                shrink: true,
                glow: true,
                glowColor: '#ff6d00',
                shape: 'circle',
                update(dt) {
                    if (this.dead) return;
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.vy += this.gravity * dt;
                    this.vx *= this.friction;
                    this.vy *= this.friction;
                    this.lifetime -= dt * 1000;
                    if (this.lifetime <= 0) this.dead = true;
                },
                render(ctx) {
                    if (this.dead) return;
                    const alpha = Math.max(0, this.lifetime / this.maxLifetime);
                    const r = this.shrink ? this.radius * alpha : this.radius;
                    if (this.glow) {
                        ctx.save();
                        ctx.globalAlpha = alpha * 0.3;
                        ctx.fillStyle = this.glowColor;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, r * 2.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                },
            });
        }
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
        if (this.metaBoosterSwiftFeetActive) speed *= 1.10;
        if (p.hasBuff(PICKUP_SWIFT_BOOTS)) speed *= BUFF_SWIFT_SPEED_MULT;
        if (p.biomeSpeedMult !== 1.0) speed *= p.biomeSpeedMult;
        if (p.onLava) speed *= HAZARD_LAVA_SLOW;
        if (p.onTar || p.tarLingerTimer > 0) speed *= HAZARD_TAR_SLOW;

        // ── Max HP multiplier ──
        const maxHp = (m.hpMultiplier || 1);

        // ── XP gain multiplier ──
        let xpGain = (m.xpMultiplier || 1);
        xpGain *= this._getShopXpMultiplier();
        if (this.runUpgradesActive.upgrade_xp_magnet) xpGain *= 1.15;

        // ── Defense (damage-taken multiplier, < 1 is a buff) ──
        let defense = (m.damageTakenMultiplier || 1);
        if (this.metaBoosterThickSkinActive) defense *= 0.90;
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

        // ── Crit chance (base + node bonuses) ──
        const _cmods = UpgradeEngine.getCombatMods();
        const _procMods = _cmods.procs || {};
        const globalCritBonus = (_procMods.heavy_crit && _procMods.heavy_crit.globalCritBonus) || 0;
        const critChance = p.critChance + globalCritBonus;

        // ── Crit damage multiplier (only meaningful if heavy_crit proc is equipped) ──
        let critDamage = 1;
        // Rogue class passive: base crit damage multiplier
        if (p.rogueCritMult > 0) {
            critDamage = p.rogueCritMult; // e.g. 1.8×
        }
        if (this.procSystem.hasProc('heavy_crit')) {
            const extraDmgMult = (_procMods.heavy_crit && _procMods.heavy_crit.extraDmgMult) || 1;
            critDamage += (0.4 * extraDmgMult); // stacks on top of rogue bonus
        }

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

        // Class passive indicators
        if (p.adventurerHealPercent > 0) {
            specials.push({ icon: '✦', name: 'Room Heal', color: '#ffd54f' });
        }
        if (p.guardianShieldReady) {
            specials.push({ icon: '🛡', name: 'Shield Ready', color: '#4fc3f7' });
        }
        if (p.berserkActive) {
            specials.push({ icon: '🔥', name: 'Berserk!', color: '#ef5350' });
        }

        return { damage, speed, maxHp, xpGain, defense, trapResist, bossDamage, attackRange, attackSpeed, critChance, critDamage, specials };
    }

    /**
     * Gather ALL active effects for the pause/game-over screens.
     * Returns an array of { category, icon, name, desc, color }.
     */
    _getAllActiveEffects() {
        const effects = [];

        // ── Equipped Abilities ──
        for (const id of this.abilitySystem.getEquippedIds()) {
            const def = ABILITY_DEFINITIONS[id];
            if (def) effects.push({ category: 'Abilities', icon: def.icon, name: def.name, desc: def.desc, color: def.color });
        }

        // ── Equipped Procs (Passives) ──
        for (const id of this.procSystem.getEquippedIds()) {
            const def = PROC_DEFINITIONS[id];
            if (def) effects.push({ category: 'Passives', icon: def.icon, name: def.name, desc: def.desc, color: def.color });
        }

        // ── Upgrade Nodes (from UpgradeEngine) ──
        const appliedNodes = UpgradeEngine.getAppliedNodes();
        for (const [nodeId, stacks] of Object.entries(appliedNodes)) {
            if (stacks <= 0) continue;
            const def = getNodeDef(nodeId);
            if (!def) continue;
            const stackLabel = stacks > 1 ? ` ×${stacks}` : '';
            effects.push({ category: 'Upgrades', icon: def.icon, name: `${def.name}${stackLabel}`, desc: def.desc, color: def.color });
        }

        // ── Run Upgrades (level-up picks) ──
        for (const [id, active] of Object.entries(this.runUpgradesActive)) {
            if (!active) continue;
            const def = RUN_UPGRADE_DEFINITIONS[id];
            if (def) effects.push({ category: 'Run Upgrades', icon: def.icon, name: def.name, desc: def.desc, color: def.color });
        }

        // ── Active Relics ──
        for (const id of RELIC_IDS) {
            if (isRelicUnlocked(id)) {
                const def = RELIC_DEFINITIONS[id];
                effects.push({ category: 'Relics', icon: def.icon, name: def.name, desc: def.desc, color: def.color });
            }
        }

        // ── Meta Booster ──
        if (this.activeMetaBoosterId) {
            const b = META_BOOSTERS[this.activeMetaBoosterId];
            if (b) effects.push({ category: 'Booster', icon: b.icon, name: b.name, desc: b.desc || '', color: b.color });
        }

        // ── Biome Effect ──
        if (this.currentBiome && this.currentBiome.effect) {
            const b = this.currentBiome;
            effects.push({ category: 'Biome', icon: '🌍', name: b.name, desc: b.effect || '', color: b.nameColor || '#888' });
        }

        // ── Temporary Pickup Buffs ──
        if (this.player && this.player.activeBuffs) {
            for (const buff of this.player.activeBuffs) {
                const info = PICKUP_INFO[buff.type];
                if (info) {
                    const remaining = Math.ceil(buff.remaining / 1000);
                    effects.push({ category: 'Pickups', icon: info.icon || '⬆', name: info.name || buff.type, desc: `${remaining}s remaining`, color: info.color || '#fff' });
                }
            }
        }

        return effects;
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
        // Mouse hover for 2-column grid
        const _msCount = META_BOOSTER_IDS.length;
        const _msCols = 2;
        const _msRows = Math.ceil(_msCount / _msCols);
        const _msCardW = 230;
        const _msCardH = _msRows > 2 ? 104 : 130;
        const _msGapX = 20;
        const _msGapY = _msRows > 2 ? 10 : 16;
        const _msBannerH = this.purchasedMetaBoosterId ? 28 : 0;
        const _msGridStartX = CANVAS_WIDTH / 2 - (_msCardW * _msCols + _msGapX) / 2;
        const _msGridStartY = 82 + _msBannerH;
        const _msmh = getMenuHoverGrid(_msGridStartX, _msGridStartY, _msCols, _msCount, _msCardW, _msCardH, _msGapX, _msGapY);
        if (_msmh >= 0 && _msmh !== this.metaShopCursor) { this.metaShopCursor = _msmh; Audio.playMenuNav(); }
        // Also detect hover on "clear" button below grid
        if (this.purchasedMetaBoosterId) {
            const _msClearY = _msGridStartY + _msRows * (_msCardH + _msGapY) + 4;
            if (getMousePos().y >= _msClearY && getMousePos().y <= _msClearY + 30
                && getMousePos().x >= CANVAS_WIDTH / 2 - 120 && getMousePos().x <= CANVAS_WIDTH / 2 + 120) {
                if (this.metaShopCursor !== META_BOOSTER_IDS.length) { this.metaShopCursor = META_BOOSTER_IDS.length; Audio.playMenuNav(); }
            }
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

        if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
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
                const meta = MetaStore.getState();
                // Can't buy locked boosters
                if (!meta.unlockedBoosters[id]) return;
                if (this.purchasedMetaBoosterId) {
                    // Already have one
                    return;
                }
                const booster = META_BOOSTERS[id];
                const state = meta;
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

        if (wasPressed('Escape') || wasMousePressed(2)) {
            this.state = STATE_MENU;
            this.menuIndex = 0;
        }
    }

    /** Update in-run shop input. */
    _updateRunShop() {
        const extraRows = this.hasForgeTokenInShop ? 1 : 0;
        const totalRows = RUN_SHOP_ITEM_IDS.length + extraRows; // items + optional forge + continue
        const contIdx = totalRows;
        const maxIdx = contIdx; // continue button index

        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.runShopCursor = (this.runShopCursor - 1 + maxIdx + 1) % (maxIdx + 1);
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.runShopCursor = (this.runShopCursor + 1) % (maxIdx + 1);
            Audio.playMenuNav();
        }
        // Mouse hover (run shop: approximate layout, startY ~ 190, rowH ~ 44)
        const _rsmh = getMenuHover(190, maxIdx + 1, 44, 40, 400);
        if (_rsmh >= 0 && _rsmh !== this.runShopCursor) { this.runShopCursor = _rsmh; Audio.playMenuNav(); }

        // Number keys 1-6 quick-buy
        let buyIdx = null;
        if (wasPressed('Digit1')) buyIdx = 0;
        else if (wasPressed('Digit2')) buyIdx = 1;
        else if (wasPressed('Digit3')) buyIdx = 2;
        else if (wasPressed('Digit4')) buyIdx = 3;
        else if (wasPressed('Digit5')) buyIdx = 4;
        else if (wasPressed('Digit6')) buyIdx = 5;

        if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
            if (this.runShopCursor === contIdx) {
                // Continue
                Audio.playMenuSelect();
                this._closeRunShop();
                return;
            }
            buyIdx = this.runShopCursor;
        }

        if (wasPressed('Escape') || wasMousePressed(2)) {
            Audio.playMenuSelect();
            this._closeRunShop();
            return;
        }

        if (buyIdx !== null) {
            if (buyIdx < RUN_SHOP_ITEM_IDS.length) {
                this._buyRunShopItem(buyIdx);
            } else if (buyIdx === RUN_SHOP_ITEM_IDS.length && this.hasForgeTokenInShop) {
                this._buyForgeToken();
            }
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

    /** Purchase forge token from the boss shop → immediately open Forge UI. */
    _buyForgeToken() {
        if (this.runCoins < SHOP_FORGE_TOKEN_COST) {
            showToast('Not enough coins!', '#e74c3c', '✗');
            return;
        }
        this.runCoins -= SHOP_FORGE_TOKEN_COST;
        this.hasForgeTokenInShop = false; // max 1 per shop visit
        Audio.playMenuSelect();
        this._openForgeUI();
    }

    /** Close run shop and return to playing (player walks through door to next room). */
    _closeRunShop() {
        this._cachedLevelUpChoices = null;
        this.hasForgeTokenInShop = false;
        this.state = STATE_PLAYING;
    }

    /** Open the Forge upgrade UI directly (used when acquiring a forge token). */
    _openForgeUI() {
        const context = this._getUpgradeContext();
        this.eventState = EventSystem.createEventState('forge', context);
        this.state = STATE_EVENT;
        showToast('Choose a Forge upgrade! 🔨', '#ff9800', '🔨');
    }

    // ── Event System ──────────────────────────────────────

    /** Update event overlay interaction. */
    _updateEvent() {
        if (!this.eventState) { this.state = STATE_PLAYING; return; }

        const es = this.eventState;

        // Skip/exit on ESC or RMB at any phase
        if (wasPressed('Escape') || wasMousePressed(2)) {
            Audio.playMenuNav();
            this.trialActive = false;
            this.eventState = null;
            this.state = STATE_PLAYING;
            return;
        }

        // Result phase → ENTER/Click continues
        if (es.phase === 'result' || es.phase === 'done' || es.phase === 'empty') {
            if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
                Audio.playMenuSelect();
                this.trialActive = false;
                this.eventState = null;
                // If a forge token was just earned, open the Forge UI immediately
                if (this._pendingForge) {
                    this._pendingForge = false;
                    this._openForgeUI();
                } else {
                    this.state = STATE_PLAYING;
                }
            }
            return;
        }

        // Challenge phase (Trial) — now handled in _updatePlaying, but keep fallback
        if (es.phase === 'challenge') {
            // This shouldn't run since trial challenge is in STATE_PLAYING now
            // But if somehow reached, forfeit
            es.phase = 'result';
            es.result = { skipped: true };
            this.trialActive = false;
            Audio.playMenuNav();
            return;
        }

        // Navigation
        const items = this._getEventChoiceList(es);
        const count = items.length;
        if (count === 0) return;

        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            es.cursor = (es.cursor - 1 + count) % count;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            es.cursor = (es.cursor + 1) % count;
            Audio.playMenuNav();
        }
        // Mouse hover (event panel: panelW=560, centred, startY varies by phase ~py+90 or py+110, rowH ~36-42)
        const _evPanelH = 380;
        const _evPy = (CANVAS_HEIGHT - _evPanelH) / 2;
        const _evStartY = _evPy + (es.phase === 'choosing' ? 90 : 110);
        const _evRowH = es.phase === 'choosing' ? 42 : 36;
        const _evmh = getMenuHover(_evStartY, count, _evRowH, _evRowH - 4, 560);
        if (_evmh >= 0 && _evmh !== es.cursor) { es.cursor = _evmh; Audio.playMenuNav(); }

        // Confirm
        if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
            this._confirmEventChoice(es);
        }
    }

    /** Get the list of selectable items for the current event phase. */
    _getEventChoiceList(es) {
        if (es.phase === 'category') return es.categories || [];
        if (es.phase === 'forge_nodes') return es.forgeNodeChoices || [];
        if (es.phase === 'choosing') return es.choices || [];
        if (es.phase === 'select_remove') {
            const list = [...(es.appliedNodes || [])];
            list.push({ id: '__skip__', name: 'Skip', icon: '', color: '#666' }); // skip option
            return list;
        }
        return [];
    }

    /** Handle confirming a choice in the current event phase. */
    _confirmEventChoice(es) {
        Audio.playMenuSelect();

        if (es.phase === 'category') {
            // Forge: picked a category → show nodes from that category
            const cat = es.categories[es.cursor];
            if (!cat) return;
            const context = this._getUpgradeContext();
            es.forgeNodeChoices = UpgradeEngine.buildForgeChoices(cat.id, context, 3).map(n => ({
                id: n.id, label: `${n.icon} ${n.name}: ${n.desc}`, color: n.color, nodeId: n.id,
            }));
            if (es.forgeNodeChoices.length === 0) {
                es.phase = 'result';
                es.result = { skipped: true };
            } else {
                es.phase = 'forge_nodes';
                es.cursor = 0;
            }
            return;
        }

        if (es.phase === 'forge_nodes') {
            const pick = es.forgeNodeChoices[es.cursor];
            if (pick && pick.nodeId) {
                UpgradeEngine.applyNode(pick.nodeId, 'forge');
                const nDef = getNodeDef(pick.nodeId);
                es.phase = 'result';
                es.result = { nodeApplied: { icon: nDef ? nDef.icon : '✦', name: nDef ? nDef.name : pick.nodeId, color: pick.color } };
            }
            return;
        }

        if (es.phase === 'choosing') {
            const choice = es.choices[es.cursor];
            if (!choice) return;

            // Trial event: accept → start the timed challenge in gameplay
            if (choice.reward === 'start_trial') {
                es.phase = 'challenge';
                es.cursor = 0;
                this.trialActive = true;
                // Spawn 2 extra enemies for the trial challenge
                const extraCount = 2;
                const { hp: hpBase, speed: spdBase, damage: dmgBase } = this._getEnemyScaling(this.stage);
                const extraSpawns = getEnemySpawns(this.grid, this._currentSpawnPos, { col: this.door.col, row: this.door.row }, extraCount);
                const extraTypes = this._getEnemyTypes(this.stage, extraCount, this.currentBiome);
                for (let i = 0; i < extraSpawns.length; i++) {
                    this.enemies.push(new Enemy(
                        extraSpawns[i].x, extraSpawns[i].y,
                        hpBase, spdBase, dmgBase, extraTypes[i], this.stage,
                    ));
                }
                this.state = STATE_PLAYING;
                return;
            }

            // Trader event
            if (choice.reward) {
                if (choice.cost > 0 && this.runCoins < choice.cost) {
                    showToast('Not enough coins!', '#e74c3c', '✗');
                    return;
                }
                if (choice.cost > 0) this.runCoins -= choice.cost;

                if (choice.reward === 'forge_token') {
                    this._pendingForge = true;
                    es.phase = 'result';
                    es.result = { tokenGranted: 'Forge' };
                } else if (choice.reward === 'reroll_token') {
                    this.rerollTokenCount++;
                    es.phase = 'result';
                    es.result = { tokenGranted: 'Reroll' };
                }
                return;
            }

            // Shrine/Chaos choices
            if (choice.nodeId) {
                UpgradeEngine.applyNode(choice.nodeId, 'event');
                // Apply curse if present
                if (choice.curse === 'hp_reduce' && choice.curseAmount && this.player) {
                    const reduce = Math.floor(this.player.maxHp * choice.curseAmount);
                    this.player.maxHp = Math.max(20, this.player.maxHp - reduce);
                    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
                    showToast(`Curse: -${reduce} Max HP`, '#e91e63', '💀');
                }
                const nDef = getNodeDef(choice.nodeId);
                es.phase = 'result';
                es.result = { nodeApplied: { icon: nDef ? nDef.icon : '✦', name: nDef ? nDef.name : choice.nodeId, color: choice.color } };
            } else if (choice.hpCost > 0 && choice.rareChoices) {
                // Chaos: sacrifice HP for rare choices
                const hpLoss = Math.floor(this.player.maxHp * choice.hpCost);
                this.player.hp = Math.max(1, this.player.hp - hpLoss);
                showToast(`Sacrificed ${hpLoss} HP`, '#e91e63', '💀');
                // Show rare choices
                es.choices = choice.rareChoices.map(n => ({
                    label: `${n.icon} ${n.name}: ${n.desc}`,
                    nodeId: n.id,
                    color: n.color,
                    hpCost: 0,
                }));
                es.cursor = 0;
                // Stay in choosing phase with new choices
            } else {
                // Skip
                es.phase = 'result';
                es.result = { skipped: true };
            }
            return;
        }

        if (es.phase === 'select_remove') {
            // Library: select node to remove
            const nodes = es.appliedNodes || [];
            if (es.cursor >= nodes.length) {
                // Skip
                es.phase = 'result';
                es.result = { skipped: true };
                return;
            }
            const toRemove = nodes[es.cursor];
            UpgradeEngine.removeNode(toRemove.id);
            // Now offer replacement choices
            const context = this._getUpgradeContext();
            const replacements = UpgradeEngine.pickRandomNodes('all', context, 3);
            es.choices = replacements.map(n => ({
                label: `${n.icon} ${n.name}: ${n.desc}`,
                nodeId: n.id,
                color: n.color,
            }));
            es.choices.push({ label: 'Skip (keep removal)', nodeId: null, color: '#666' });
            es.phase = 'choosing';
            es.cursor = 0;
            return;
        }
    }

    // ── Boss Scroll ──────────────────────────────────────

    /** Update boss scroll choice overlay. */
    _updateBossScroll() {
        if (!this.scrollChoices || this.scrollChoices.length === 0) {
            this.state = STATE_PLAYING;
            return;
        }

        const count = this.scrollChoices.length;

        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.scrollCursor = (this.scrollCursor - 1 + count) % count;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.scrollCursor = (this.scrollCursor + 1) % count;
            Audio.playMenuNav();
        }
        // Mouse hover (boss scroll: panelH=300, centred, startY=py+90, rowH=50)
        const _bsPy = (CANVAS_HEIGHT - 300) / 2;
        const _bsmh = getMenuHover(_bsPy + 90, count, 50, 44, 420);
        if (_bsmh >= 0 && _bsmh !== this.scrollCursor) { this.scrollCursor = _bsmh; Audio.playMenuNav(); }

        if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
            const chosen = this.scrollChoices[this.scrollCursor];
            if (chosen) {
                const result = applyBossScrollChoice(chosen);
                if (result) {
                    const typeLabel = result.type === 'ability' ? 'Ability' : result.type === 'proc' ? 'Passive' : 'Node';
                    showBigToast(`${typeLabel} Unlocked: ${result.name}`, result.color, result.icon);
                    Audio.playRelicUnlock();
                }
            }
            Audio.playMenuSelect();
            this.scrollChoices = null;
            // Proceed to run shop or playing
            if (this._pendingRunShop) {
                this._pendingRunShop = false;
                this.runShopCursor = 0;
                this.hasForgeTokenInShop = Math.random() < SHOP_FORGE_TOKEN_CHANCE;
                this.state = STATE_SHOP_RUN;
            } else {
                this.state = STATE_PLAYING;
            }
        }

        if (wasPressed('Escape')) {
            // Can't skip scroll — must choose
            // (optional: allow skip for UX, but design says "choose 1 of 3")
        }
    }

    // ── Canyon / Pit Fall Handling ─────────────────────────

    /** Apply canyon fall penalty: HP loss, coin loss, teleport to safety, screen shake. */
    _applyCanyonFall() {
        const p = this.player;

        // HP penalty (percentage of max HP)
        const noDamage = this.trainingMode && !this.trainingDamage;
        if (!noDamage && !this.cheats.godmode) {
            const dmg = Math.max(1, Math.floor(p.maxHp * CANYON_FALL_HP_PENALTY));
            p.hp = Math.max(1, p.hp - dmg);  // can't kill from fall (min 1 HP)
            p.damageFlashTimer = 300;
            p.invulnTimer = Math.max(p.invulnTimer, PLAYER_INVULN_TIME);
        }

        // Coin penalty
        if (this.runCoins > 0) {
            const coinLoss = Math.max(1, Math.floor(this.runCoins * CANYON_FALL_COIN_PENALTY));
            this.runCoins = Math.max(0, this.runCoins - coinLoss);
        }

        // Teleport back to room spawn
        const sp = this._currentSpawnPos;
        if (sp) {
            p.x = sp.col * TILE_SIZE + TILE_SIZE / 2;
            p.y = sp.row * TILE_SIZE + TILE_SIZE / 2;
        }
        p.dashing = false;
        p.dashTimer = 0;
        p.canyonFallCooldown = 800; // ms — canyons block like walls during this window

        // Visual / audio feedback
        triggerShake(4, 0.85);
        Audio.playHit();
        this.particles.hitSparks(p.x, p.y, 0, -1);

        // Floating text popup
        this.comboPopups.push({
            text: 'You fell!',
            x: p.x,
            y: p.y - 30,
            timer: 1200,
            maxTimer: 1200,
            color: '#ff4444',
            size: 16,
        });

        // Check for game over (shouldn't happen since min 1 HP, but safety check)
        if (p.hp <= 0 && !this.trainingMode) {
            this._gameOverEffects = this._getAllActiveEffects();
            this.state = STATE_GAME_OVER;
        }
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
            case STATE_EVENT:           this._updateEvent();         break;
            case STATE_BOSS_SCROLL:     this._updateBossScroll();    break;
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

        // Color picker overlay
        if (this.profileColorPicking) {
            this._updateColorPicker();
            return;
        }

        // Delete confirmation
        if (this.profileDeleting) {
            if (wasPressed('Enter') || wasMousePressed(0)) {
                this._deleteProfile(this.profileCursor);
                this.profileDeleting = false;
            } else if (wasPressed('Escape') || wasMousePressed(2)) {
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
        // Mouse hover (profiles: startY=140, rowH=52, item center = 140 + 26 = 166 first)
        const _pmh2 = getMenuHover(140 + 23, maxIdx + 1, 52, 46, 380);
        if (_pmh2 >= 0 && _pmh2 !== this.profileCursor) { this.profileCursor = _pmh2; Audio.playMenuNav(); }

        // Select / Create
        if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
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
            this.profileDeleting = true;
        }

        // Color picker (C key)
        if (wasPressed('KeyC') && this.profileCursor < this.profiles.length) {
            const currentColorId = this.profiles[this.profileCursor].colorId || 'cyan';
            this.colorPickerCursor = Math.max(0, PLAYER_COLORS.findIndex(c => c.id === currentColorId));
            this.profileColorPicking = true;
            Audio.playMenuSelect();
        }

        // Back (only if a profile is selected) — ESC or RMB
        if ((wasPressed('Escape') || wasMousePressed(2)) && this.profiles.length > 0) {
            this.state = STATE_MENU;
            this.menuIndex = 0;
        }
    }

    _updateProfileCreate() {
        // If class picker is open, delegate to that
        if (this.profileClassPicking) {
            this._updateClassPicker();
            return;
        }

        if (wasPressed('Escape') || wasMousePressed(2)) {
            this.profileCreating = false;
            return;
        }

        if (wasPressed('Enter')) {
            const name = this.profileNewName.trim();
            if (name.length > 0) {
                // Open class picker before creating profile
                this.profileClassPicking = true;
                this.classPickerCursor = 0;
                Audio.playMenuSelect();
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

    _updateColorPicker() {
        const cols = 4;
        const total = PLAYER_COLORS.length;

        // Navigation
        if (wasPressed('KeyA') || wasPressed('ArrowLeft')) {
            this.colorPickerCursor = (this.colorPickerCursor - 1 + total) % total;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyD') || wasPressed('ArrowRight')) {
            this.colorPickerCursor = (this.colorPickerCursor + 1) % total;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.colorPickerCursor = (this.colorPickerCursor - cols + total) % total;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.colorPickerCursor = (this.colorPickerCursor + cols) % total;
            Audio.playMenuNav();
        }

        // Mouse hover on color swatches
        const mp = getMousePos();
        if (mp && isMouseActive()) {
            const gridX = 400 - (cols * 60) / 2;
            const gridY = 240;
            const swatchSize = 50;
            const gap = 10;
            const col = Math.floor((mp.x - gridX) / (swatchSize + gap));
            const row = Math.floor((mp.y - gridY) / (swatchSize + gap));
            if (col >= 0 && col < cols && row >= 0) {
                const idx = row * cols + col;
                if (idx >= 0 && idx < total) {
                    if (idx !== this.colorPickerCursor) {
                        this.colorPickerCursor = idx;
                        Audio.playMenuNav();
                    }
                }
            }
        }

        // Confirm
        if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
            const chosen = PLAYER_COLORS[this.colorPickerCursor];
            if (chosen) {
                this.profiles[this.profileCursor].colorId = chosen.id;
                this._saveProfiles();
                Audio.playMenuSelect();
            }
            this.profileColorPicking = false;
        }

        // Cancel
        if (wasPressed('Escape') || wasMousePressed(2)) {
            this.profileColorPicking = false;
        }
    }

    _updateClassPicker() {
        const total = CLASS_DEFINITIONS.length;

        // Navigation (left/right or A/D)
        if (wasPressed('KeyA') || wasPressed('ArrowLeft')) {
            this.classPickerCursor = (this.classPickerCursor - 1 + total) % total;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyD') || wasPressed('ArrowRight')) {
            this.classPickerCursor = (this.classPickerCursor + 1) % total;
            Audio.playMenuNav();
        }
        // Also allow W/S for consistency
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.classPickerCursor = (this.classPickerCursor - 1 + total) % total;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.classPickerCursor = (this.classPickerCursor + 1) % total;
            Audio.playMenuNav();
        }

        // Mouse hover on class cards
        const mp = getMousePos();
        if (mp && isMouseActive()) {
            const cardW = 160;
            const gap = 20;
            const totalW = total * cardW + (total - 1) * gap;
            const startX = (800 - totalW) / 2;
            const cardY = 200;
            const cardH = 240;
            for (let i = 0; i < total; i++) {
                const cx = startX + i * (cardW + gap);
                if (mp.x >= cx && mp.x <= cx + cardW && mp.y >= cardY && mp.y <= cardY + cardH) {
                    if (i !== this.classPickerCursor) {
                        this.classPickerCursor = i;
                        Audio.playMenuNav();
                    }
                    break;
                }
            }
        }

        // Confirm
        if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
            const chosen = CLASS_DEFINITIONS[this.classPickerCursor];
            if (chosen) {
                const name = this.profileNewName.trim();
                this.profiles.push({ name, highscore: 0, colorId: 'cyan', classId: chosen.id });
                this.activeProfileIndex = this.profiles.length - 1;
                this._saveProfiles();
                MetaStore.load(this.activeProfileIndex);
                AchievementStore.load(this.activeProfileIndex);
                this.profileCreating = false;
                this.profileClassPicking = false;
                this.profileCursor = this.activeProfileIndex;
                Audio.playMenuSelect();
            }
        }

        // Cancel — go back to name entry
        if (wasPressed('Escape') || wasMousePressed(2)) {
            this.profileClassPicking = false;
        }
    }

    _deleteProfile(index) {
        if (index < 0 || index >= this.profiles.length) return;
        // Delete meta data for this profile (and shift higher indices)
        MetaStore.deleteProfileMeta(index, this.profiles.length);
        AchievementStore.deleteProfileAchievements(index, this.profiles.length);
        this.profiles.splice(index, 1);

        if (this.profiles.length === 0) {
            // All profiles deleted — reset and stay on profiles screen
            this.activeProfileIndex = 0;
            this.profileCursor = 0;
            this._saveProfiles();
            this.state = STATE_PROFILES;
            return;
        }

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

        // ── Trial event timer (active during gameplay) ──
        if (this.trialActive && this.eventState && this.eventState.phase === 'challenge') {
            this.eventState.timeRemaining -= dt * 1000;
            const allDead = this.enemies.every(e => e.dead);
            if (this.eventState.timeRemaining <= 0 || allDead) {
                // Trial succeeded — award forge token (opens forge UI after result)
                this.trialActive = false;
                this.eventState.succeeded = true;
                this.eventState.phase = 'result';
                this.eventState.result = { tokenGranted: 'Forge' };
                this._pendingForge = true;
                showToast('Trial Complete! Choose your upgrade 🔨', '#ff9800', '⚔️');
                Audio.playMenuSelect();
                this.state = STATE_EVENT;
                return;
            }
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
        // Reset tar slow flag each frame (hazards will set it if player is on tar)
        this.player.onTar = false;
        if (this.player.tarLingerTimer > 0) this.player.tarLingerTimer -= dt * 1000;
        this.player._mouseAiming = false; // reset per frame — setFacingFromMouse will re-enable
        this.player.update(dt, movement, this.grid);

        // ── Laser wall solid collision ──
        // Push player out of active laser walls (blocks both walking and dashing)
        for (const h of this.hazards) {
            const aabb = h.getWallAABB();
            if (aabb) {
                pushOutOfAABB(this.player, this.player.radius, aabb.x, aabb.y, aabb.w, aabb.h);
            }
        }

        // ── Mouse aim: point player toward cursor ──
        if (this.mouseAimEnabled && isMouseActive()) {
            const mpos = getMousePos();
            this.player.setFacingFromMouse(mpos.x, mpos.y);
        }

        // ── Canyon fall check ──
        if (this.player.fellInCanyon) {
            this._applyCanyonFall();
        }

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
            this.player.overHeal = 0;
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

        // ── Floating damage numbers ──
        // Consume damage events from Enemy & Boss
        if (this.showDamageNumbers) {
            for (const evt of Enemy.damageEvents) {
                // slight random x offset so stacked hits don't overlap
                this.damageNumbers.push({
                    x: evt.x + (Math.random() - 0.5) * 16,
                    y: evt.y,
                    amount: Math.round(evt.amount),
                    isCrit: evt.isCrit || false,
                    timer: evt.isCrit ? 800 : 600,
                    maxTimer: evt.isCrit ? 800 : 600,
                });
            }
            for (const evt of Boss.damageEvents) {
                this.damageNumbers.push({
                    x: evt.x + (Math.random() - 0.5) * 20,
                    y: evt.y,
                    amount: Math.round(evt.amount),
                    isCrit: evt.isCrit || false,
                    timer: evt.isCrit ? 1000 : 800,
                    maxTimer: evt.isCrit ? 1000 : 800,
                });
            }
        }
        Enemy.damageEvents.length = 0;
        Boss.damageEvents.length = 0;

        // Update damage numbers
        for (const d of this.damageNumbers) {
            d.timer -= dt * 1000;
            d.y -= 40 * dt;  // float upward
        }
        this.damageNumbers = this.damageNumbers.filter(d => d.timer > 0);

        // Biome ambient particles (leaves, embers, bubbles, etc.)
        if (this.currentBiome) {
            this.particles.biomeAmbient(this.currentBiome);
        }

        // ── Room type lifecycle: per-frame update ──
        const _roomDef = getRoomType(this.currentRoomType);
        callHook(_roomDef, 'onUpdate', { player: this.player, enemies: this.enemies, dt }, dt);

        // ── Get current combat mods from upgrade nodes ──
        const _cmods = UpgradeEngine.getCombatMods();
        const _meleeMods  = _cmods.melee  || {};
        const _daggerMods = _cmods.dagger || {};
        const _dashMods   = _cmods.dash   || {};
        const _globalMods = _cmods.global || {};

        // Track dash state before update (for end-of-dash effects)
        const wasDashing = this.player.dashing;

        // Dash / Dodge Roll (M key or Right Click)
        if (wasPressed('KeyM') || wasMousePressed(2)) {
            if (this.player.tryDash(movement, _dashMods, _globalMods)) {
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
            // Dash fire trail (Blazing Dash node) — spawn fire zones along path
            if (_dashMods.fireTrail) {
                if (!this._dashFireTrailTimer) this._dashFireTrailTimer = 0;
                this._dashFireTrailTimer += dt * 1000;
                if (this._dashFireTrailTimer >= 50) {
                    this._dashFireTrailTimer -= 50;
                    this._spawnFireZone(this.player.x, this.player.y, _dashMods.fireTrailDps || 6, _dashMods.fireTrailDuration || 800, 14);
                }
            }
        }

        // Dash just ended — check for end-of-dash effects
        if (wasDashing && !this.player.dashing) {
            this._dashFireTrailTimer = 0;
            // Impact Dash (endShockwave node): AoE + knockback at dash end
            if (_dashMods.endShockwave) {
                const swRadius = _dashMods.endShockwaveRadius || 50;
                const swKb = _dashMods.endShockwaveKb || 15;
                const swTargets = this._allBosses().length > 0 ? [...this.enemies, ...this._allBosses()] : this.enemies;
                for (const e of swTargets) {
                    if (e.dead) continue;
                    const dx = e.x - this.player.x;
                    const dy = e.y - this.player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > swRadius + (e.radius || 12)) continue;
                    const d = dist || 1;
                    e.takeDamage(Math.floor(this.player.damage * 0.3), (dx / d) * swKb, (dy / d) * swKb);
                }
                Impact.shake(6, 0.88);
                this.particles.abilityShockwave(this.player.x, this.player.y, swRadius);
            }
            // Stunning Rush (stunOnHit node): stun nearby enemies at dash end
            if (_dashMods.stunOnHit) {
                const stunRadius = 40;
                const stunDur = _dashMods.stunDuration || 400;
                const stunTargets = this._allBosses().length > 0 ? [...this.enemies, ...this._allBosses()] : this.enemies;
                for (const e of stunTargets) {
                    if (e.dead) continue;
                    const dx = e.x - this.player.x;
                    const dy = e.y - this.player.y;
                    if (Math.sqrt(dx * dx + dy * dy) <= stunRadius + (e.radius || 12)) {
                        applyFreezeStatus(e, stunDur);
                    }
                }
            }
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

        // Attack (Space or Left Click)
        if (isDown('Space') || isMouseDown(0)) {
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

            const attackResult = this.player.attack(targets, _meleeMods, _globalMods);

            if (savedDmg !== undefined) {
                this.player.damage = savedDmg;
            }

            // attack() now returns { hitCount, hitEnemies, killed } or -1
            const hitCount = typeof attackResult === 'object' ? attackResult.hitCount : attackResult;
            const hitEnemies = typeof attackResult === 'object' ? attackResult.hitEnemies : [];
            const killedEnemies = typeof attackResult === 'object' ? attackResult.killed : [];

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
                    // Hit sparks on each hit enemy
                    for (const e of hitEnemies) {
                        if (!e.dead) {
                            const dx = e.x - this.player.x;
                            const dy = e.y - this.player.y;
                            const d = Math.sqrt(dx * dx + dy * dy) || 1;
                            this.particles.hitSparks(e.x, e.y, dx / d, dy / d);
                        }
                    }

                    // ── Proc dispatch on melee hits ──
                    const isCrit = Math.random() < this.player.critChance;

                    // Rogue passive: crit bonus damage (applied before procs)
                    if (isCrit && this.player.rogueCritMult > 0) {
                        const critExtraMult = this.player.rogueCritMult - 1; // e.g. 1.8 → 0.8
                        for (const e of hitEnemies) {
                            if (!e.dead) {
                                const extraDmg = Math.floor(this.player.getEffectiveDamage() * critExtraMult);
                                e.takeDamage(extraDmg, 0, 0);
                            }
                        }
                    }

                    for (const e of hitEnemies) {
                        if (!e.dead) {
                            this.procSystem.handleHit(
                                { source: this.player, target: e, damage: this.player.damage, isCrit, attackType: 'melee' },
                                { enemies: this.enemies, boss: allBosses[0] || null, particles: this.particles },
                            );
                        }
                    }

                    // ── Kill Nova (melee node) — AoE burst on kill ──
                    if (_meleeMods.killNova && killedEnemies.length > 0) {
                        if (!this._killNovaCooldown || this._killNovaCooldown <= 0) {
                            const novaRadius = _meleeMods.killNovaRadius || 60;
                            const novaDmg = Math.floor(this.player.damage * (_meleeMods.killNovaDmgMult || 0.4));
                            const novaTarget = killedEnemies[0];
                            const novaTargets = allBosses.length > 0 ? [...this.enemies, ...allBosses] : this.enemies;
                            for (const e of novaTargets) {
                                if (e.dead) continue;
                                const dx = e.x - novaTarget.x;
                                const dy = e.y - novaTarget.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist > novaRadius + (e.radius || 12)) continue;
                                const d = dist || 1;
                                e.takeDamage(novaDmg, (dx / d) * 8, (dy / d) * 8);
                            }
                            this.particles.abilityShockwave(novaTarget.x, novaTarget.y, novaRadius);
                            Impact.shake(5, 0.88);
                            this._killNovaCooldown = _meleeMods.killNovaCooldown || 1000;
                        }
                    }

                    // Small impact on melee hits (screen shake + flash)
                    Impact.shake(1.5, 0.85);
                }
            }
        }

        // ── Kill Nova cooldown tick ──
        if (this._killNovaCooldown > 0) this._killNovaCooldown -= dt * 1000;

        // Ranged Attack (N key or Middle Click) — throw dagger
        if (wasPressed('KeyN') || wasMousePressed(1)) {
            // Apply shop damage multiplier for dagger
            const shopDmgMultDagger = this._getShopDamageMultiplier();
            let savedDmgDagger;
            if (shopDmgMultDagger !== 1) {
                savedDmgDagger = this.player.damage;
                this.player.damage = Math.floor(this.player.damage * shopDmgMultDagger);
            }
            const throwDataArr = this.player.tryThrow(_daggerMods, _globalMods);
            if (savedDmgDagger !== undefined) {
                this.player.damage = savedDmgDagger;
            }
            if (throwDataArr && throwDataArr.length > 0) {
                for (const throwData of throwDataArr) {
                    const dagger = new PlayerProjectile(
                        throwData.x, throwData.y,
                        throwData.dirX, throwData.dirY,
                        throwData.speed, throwData.damage,
                        throwData.radius, throwData.color,
                        throwData.maxDist, throwData.knockback,
                        {
                            pierce: throwData.pierce,
                            ricochet: throwData.ricochet,
                            fireTrail: throwData.fireTrail,
                            fireTrailDuration: throwData.fireTrailDuration,
                            fireTrailDps: throwData.fireTrailDps,
                            returning: throwData.returning,
                            critBonus: throwData.critBonus,
                            owner: this.player,
                        },
                    );
                    // Meta relic: Boss Hunter — extra damage vs bosses
                    if (this.metaModifiers && this.metaModifiers.bossDamageMultiplier > 1) {
                        dagger.bossDamageMultiplier = this.metaModifiers.bossDamageMultiplier;
                    }
                    this.playerProjectiles.push(dagger);
                }
                Audio.playDaggerThrow();
                // Throw particles (use first dagger for position)
                this.particles.daggerThrow(
                    throwDataArr[0].x, throwDataArr[0].y,
                    throwDataArr[0].dirX, throwDataArr[0].dirY,
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
            // Darkness fairness: enemies outside light can't deal contact damage
            const darkNoDmg = isDarknessActive() && !isInsideLight(e.x, e.y);
            e.update(dt, this.player, this.grid, this.enemies, this.projectiles, noDamage || darkNoDmg);

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
                    // Elites always drop; normal enemies only have a % chance
                    if (isElite || Math.random() < COIN_DROP_CHANCE) {
                        let coinValue = isElite ? COIN_REWARD_ELITE_ENEMY : COIN_REWARD_NORMAL_ENEMY;
                        if (this.metaBoosterScavengerActive) coinValue = Math.ceil(coinValue * 1.3);
                        this.coinPickups.push(new CoinPickup(e.x, e.y, coinValue));
                    }
                }

                if (!this.trainingMode) {
                    // Apply combo XP multiplier + cheat XP boost + meta XP multiplier + shop booster
                    const xpMult = this.cheats.xpboost ? 10 : 1;
                    const metaXpMult = this.metaModifiers ? this.metaModifiers.xpMultiplier : 1;
                    const runXpMult = this.runUpgradesActive.upgrade_xp_magnet ? 1.15 : 1;
                    const shopXpMult = this._getShopXpMultiplier();
                    const darkXpMult = this.darknessXpMult;
                    const xp = Math.floor(e.xpValue * this.comboMultiplier * xpMult * metaXpMult * runXpMult * shopXpMult * darkXpMult);
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
                    case 'leap':
                        Audio.playBossSlam();
                        this.particles.bossSlam(evt.x, evt.y, evt.radius, this.boss.color);
                        triggerShake(9, 0.88);
                        break;
                    case 'shockwave':
                        Audio.playBossSlam();
                        this.particles.bossSlam(evt.x, evt.y, this.boss.radius * 1.5, this.boss.color);
                        triggerShake(6, 0.85);
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
                const { hp, speed, damage } = this._getEnemyScaling(this.stage);
                const hpBase = Math.floor(hp * 0.7);
                const spdBase = speed * 0.8;
                const dmgBase = Math.floor(damage * 0.7);
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
                    case 'leap':
                        Audio.playBossSlam();
                        this.particles.bossSlam(evt.x, evt.y, evt.radius, cb.color);
                        triggerShake(9, 0.88);
                        break;
                    case 'shockwave':
                        Audio.playBossSlam();
                        this.particles.bossSlam(evt.x, evt.y, cb.radius * 1.5, cb.color);
                        triggerShake(6, 0.85);
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
                const { hp, speed, damage } = this._getEnemyScaling(this.stage);
                const hpBase = Math.floor(hp * 0.7);
                const spdBase = speed * 0.8;
                const dmgBase = Math.floor(damage * 0.7);
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
            let bossCoins = COIN_REWARD_BOSS;
            if (this.metaBoosterScavengerActive) bossCoins = Math.ceil(bossCoins * 1.3);
            this.runCoins += bossCoins;
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
                    this.runUnlocksLog.push({ icon: relic.icon, name: relic.name, color: relic.color, type: 'Relic' });
                }
                // Toast for run upgrade unlock
                if (reward.runUpgradeId) {
                    const upg = RUN_UPGRADE_DEFINITIONS[reward.runUpgradeId];
                    showToast(`New Upgrade: ${upg.name}`, upg.color, upg.icon);
                    this.runUnlocksLog.push({ icon: upg.icon, name: upg.name, color: upg.color, type: 'Upgrade' });
                }
            } else {
                this.lastBossReward = { shardsGained: 0, relicId: null, runUpgradeId: null };
            }

            // ── Combat unlock: check boss milestone (blocked by cheats) ──
            if (!this.cheatsUsedThisRun) {
                this._checkBoosterUnlocks();
                const combatUnlock = checkBossUnlocks(MetaStore.getState().stats.bossesKilledTotal);
                if (combatUnlock) {
                    const label = combatUnlock.type === 'ability' ? 'Ability' : 'Passive';
                    showBigToast(`${label} Unlocked: ${combatUnlock.name}`, combatUnlock.color, combatUnlock.icon);
                    Audio.playRelicUnlock();
                    this.lastBossReward.combatUnlock = combatUnlock;
                    this.runUnlocksLog.push({ icon: combatUnlock.icon, name: combatUnlock.name, color: combatUnlock.color, type: label });
                }
            }

            // ── Biome mastery tracking + boss scroll (blocked by cheats) ──
            if (!this.cheatsUsedThisRun) {
                // Biome mastery
                if (this.currentBiome) {
                    const masteryUnlocks = processBiomeMasteryBossKill(this.currentBiome.id, this.stage);
                    for (const u of masteryUnlocks) {
                        const tLabel = u.type === 'ability' ? 'Ability' : u.type === 'proc' ? 'Passive' : 'Node';
                        showBigToast(`Biome Mastery: ${tLabel} ${u.name}`, u.color, u.icon);
                        Audio.playRelicUnlock();
                        this.runUnlocksLog.push({ icon: u.icon, name: u.name, color: u.color, type: `Mastery ${tLabel}` });
                    }
                }

                // Boss scroll drop chance
                const scrollChoices = generateBossScrollChoices();
                if (scrollChoices) {
                    this._pendingBossScroll = scrollChoices;
                    showToast('📜 Ancient Scroll dropped!', '#ffd700', '📜');
                }

                // Pity unlock check
                const pity = checkPityUnlock(this.stage);
                if (pity) {
                    showBigToast(`Pity Unlock: ${pity.name}`, pity.color, pity.icon);
                    Audio.playRelicUnlock();
                    this.runUnlocksLog.push({ icon: pity.icon, name: pity.name, color: pity.color, type: 'Pity Unlock' });
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
            // Store previous hitTarget to detect new hits (piercing daggers hit multiple times)
            const prevHitTarget = d.hitTarget;
            d.update(dt, this.enemies, activeBoss, this.grid);

            if (!d.dead) {
                // Normal dagger trail
                this.particles.daggerTrail(d.x, d.y, d.fireTrail ? '#ff6d00' : d.color);
                // Fire trail: spawn fire zone particles along path
                if (d.fireTrail) {
                    this._spawnFireTrailParticles(d.x, d.y);
                }
            }

            // Consume pending fire zones (from dagger fire trail)
            if (d.pendingFireZones && d.pendingFireZones.length > 0) {
                for (const fz of d.pendingFireZones) {
                    this._spawnFireZone(fz.x, fz.y, fz.dps, fz.duration, fz.radius);
                }
                d.pendingFireZones = [];
            }

            // Hit sparks when dagger hits a target (new hit detected)
            if (d.hitTarget && d.hitTarget !== prevHitTarget) {
                Audio.playDaggerHit();
                this.particles.hitSparks(
                    d.hitTarget.x, d.hitTarget.y,
                    d.hitTarget.dirX, d.hitTarget.dirY,
                );
                // Proc dispatch on dagger hit (include dagger crit bonus from nodes)
                const daggerCritChance = this.player.critChance + (d.critBonus || 0);
                const daggerCrit = Math.random() < daggerCritChance;
                const hitEntity = d.hitTarget.entity || d.hitTarget;

                // Rogue passive: crit bonus damage on dagger crit
                if (daggerCrit && this.player.rogueCritMult > 0 && hitEntity && !hitEntity.dead) {
                    const critExtraMult = this.player.rogueCritMult - 1;
                    const extraDmg = Math.floor((d.damage || this.player.getEffectiveDamage()) * critExtraMult);
                    hitEntity.takeDamage(extraDmg, 0, 0);
                }

                if (hitEntity && !hitEntity.dead) {
                    this.procSystem.handleHit(
                        { source: this.player, target: hitEntity, damage: d.damage || this.player.damage, isCrit: daggerCrit, attackType: 'dagger' },
                        { enemies: this.enemies, boss: allBosses[0] || null, particles: this.particles },
                    );
                }
            }
        }
        this.playerProjectiles = this.playerProjectiles.filter(d => !d.dead);

        // ── Fire Zones — update lingering damage areas ──
        if (this._fireZones) {
            for (let i = this._fireZones.length - 1; i >= 0; i--) {
                const fz = this._fireZones[i];
                fz.timer -= dt * 1000;
                if (fz.timer <= 0) {
                    this._fireZones.splice(i, 1);
                    continue;
                }
                // Damage enemies in zone
                fz.tickTimer = (fz.tickTimer || 0) - dt * 1000;
                if (fz.tickTimer <= 0) {
                    fz.tickTimer = 200; // tick every 200ms
                    const fzTargets = allBosses.length > 0 ? [...this.enemies, ...allBosses] : this.enemies;
                    for (const e of fzTargets) {
                        if (e.dead) continue;
                        const dx = e.x - fz.x;
                        const dy = e.y - fz.y;
                        if (dx * dx + dy * dy <= (fz.radius + (e.radius || 12)) ** 2) {
                            e.takeDamage(Math.ceil(fz.dps * 0.2), 0, 0); // 200ms × dps fraction
                        }
                    }
                }
                // Visual: fire particles
                if (Math.random() < 0.4) {
                    this._spawnFireTrailParticles(fz.x + (Math.random() - 0.5) * fz.radius, fz.y + (Math.random() - 0.5) * fz.radius);
                }
            }
        }

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
        // When all enemies die, roll for a second wave (stage 8+, non-boss, non-training, once per room)
        if (doorWasLocked && !this.door.locked
            && !this.trainingMode
            && !this.secondWaveTriggered
            && !this._isBossStage(this.stage)
            && this.stage >= SECOND_WAVE_MIN_STAGE
            && Math.random() < SECOND_WAVE_CHANCE) {
            this.secondWaveTriggered = true;
            this.secondWaveActive = true;
            this.secondWaveAnnounceTimer = SECOND_WAVE_ANNOUNCE_TIME;

            // Spawn a smaller wave of enemies using new stepped density + phase scaling
            const baseCount = this._getEnemyCount(this.stage);
            const waveCount = Math.max(2, Math.round(baseCount * SECOND_WAVE_ENEMY_MULT));
            const spawns = getEnemySpawns(
                this.grid, this._currentSpawnPos, { col: this.door.col, row: this.door.row }, waveCount,
            );
            const { hp: hpBase, speed: spdBase, damage: dmgBase } = this._getEnemyScaling(this.stage);
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

                // ── Darkness room clear reward ──
                if (this._darknessRewardPending) {
                    this._darknessRewardPending = false;
                    const healAmt = Math.floor(this.player.maxHp * DARKNESS_CONFIG.rewardHealPercent);
                    this.player.hp = Math.min(this.player.hp + healAmt, this.player.maxHp);
                    this.particles.levelUp(this.player.x, this.player.y);
                    showToast(`+${healAmt} HP (Darkness Bonus)`, '#8866cc', '🌑');
                }

                this.nextRoom();
            }
        }

        // ── Low-HP heartbeat pulse ──
        const hpRatio = this.player.hp / this.player.maxHp;
        const LOW_HP_THRESHOLD = 0.30;
        if (hpRatio > 0 && hpRatio <= LOW_HP_THRESHOLD && !this.trainingMode) {
            // Intensity 0→1 as HP goes from 30% → 0%
            const intensity = 1 - (hpRatio / LOW_HP_THRESHOLD);
            // Interval: 900ms at 30% HP → 400ms near death
            const interval = 900 - intensity * 500;
            this._heartbeatTimer -= dt * 1000;
            // Visual pulse decays each frame
            this._heartbeatPulse = Math.max(0, this._heartbeatPulse - dt * 3.5);
            if (this._heartbeatTimer <= 0) {
                Audio.playHeartbeat(0.5 + intensity * 0.5);
                this._heartbeatTimer = interval;
                this._heartbeatPulse = 1; // flash on beat
            }
        } else {
            this._heartbeatTimer = 0;
            this._heartbeatPulse = 0;
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
                // Cache effects before clearing buffs (for game-over screen)
                this._gameOverEffects = this._getAllActiveEffects();
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
            this.player.overHeal = 0;
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
            this._fireZones = [];
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
        // Resume with P, Escape, or RMB
        if (wasPressed('KeyP') || wasMousePressed(2)) {
            this.state = STATE_PLAYING;
            return;
        }

        const pauseOptionCount = 3; // Resume, Settings, Back to Menu

        // Navigate
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.pauseIndex = (this.pauseIndex - 1 + pauseOptionCount) % pauseOptionCount;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.pauseIndex = (this.pauseIndex + 1) % pauseOptionCount;
            Audio.playMenuNav();
        }
        // Mouse hover (pause panel: panelH=440, by=(600-440)/2=80, leftW=280, leftCx depends on effects)
        const _pauseEffects = this._getAllActiveEffects();
        const _pauseTotalW = _pauseEffects.length > 0 ? 620 : 300;
        const _pauseBx = (CANVAS_WIDTH - _pauseTotalW) / 2;
        const _pauseLeftCx = _pauseBx + 280 / 2;
        const _pauseBy = (CANVAS_HEIGHT - 440) / 2;
        const _pmh = getMenuHover(_pauseBy + 105, pauseOptionCount, 44, 34, 220, _pauseLeftCx);
        if (_pmh >= 0 && _pmh !== this.pauseIndex) { this.pauseIndex = _pmh; Audio.playMenuNav(); }

        // Confirm
        if (wasPressed('Enter') || wasPressed('Space') || wasPressed('Escape') || wasMousePressed(0)) {
            Audio.playMenuSelect();
            if (this.pauseIndex === 0) {
                this.state = STATE_PLAYING;
            } else if (this.pauseIndex === 1) {
                this.settingsCursor = 0;
                this._settingsReturnState = STATE_PAUSED;
                this.state = STATE_SETTINGS;
            } else {
                this._saveHighscore();
                this.restart();
            }
        }
    }

    _updateSettings() {
        const count = 6; // 0=SFX, 1=Music, 2=Rooms, 3=DmgNumbers, 4=MouseAim, 5=Back

        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.settingsCursor = (this.settingsCursor - 1 + count) % count;
            Audio.playMenuNav();
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.settingsCursor = (this.settingsCursor + 1) % count;
            Audio.playMenuNav();
        }
        // Mouse hover
        const _smh = getMenuHover(190, count, 52, 52, 400);
        if (_smh >= 0 && _smh !== this.settingsCursor) { this.settingsCursor = _smh; Audio.playMenuNav(); }

        if (wasPressed('Escape') || wasMousePressed(2)) {
            Audio.playMenuSelect();
            this.state = this._settingsReturnState;
            return;
        }

        // Toggle with Enter/Space/Click or Left/Right arrows on toggleable rows
        const toggle = wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0);
        const leftRight = wasPressed('ArrowLeft') || wasPressed('ArrowRight')
                       || wasPressed('KeyA') || wasPressed('KeyD');

        if (toggle || (leftRight && this.settingsCursor < 5)) {
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
                // Toggle damage numbers
                this.showDamageNumbers = !this.showDamageNumbers;
                this._saveDamageNumbersSetting();
            } else if (this.settingsCursor === 4) {
                // Toggle mouse aim
                this.mouseAimEnabled = !this.mouseAimEnabled;
                this._saveMouseAimSetting();
            } else if (this.settingsCursor === 5) {
                // Back to previous screen
                this.state = this._settingsReturnState;
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

    _loadDamageNumbersSetting() {
        try {
            const val = localStorage.getItem('dungeon_damage_numbers');
            if (val === null) return true; // default: on
            return val === 'true';
        } catch (e) { return true; }
    }

    _saveDamageNumbersSetting() {
        try {
            localStorage.setItem('dungeon_damage_numbers', this.showDamageNumbers ? 'true' : 'false');
        } catch (e) {}
    }

    _loadMouseAimSetting() {
        try {
            const val = localStorage.getItem('dungeon_mouse_aim');
            if (val === null) return false; // default: off
            return val === 'true';
        } catch (e) { return false; }
    }

    _saveMouseAimSetting() {
        try {
            localStorage.setItem('dungeon_mouse_aim', this.mouseAimEnabled ? 'true' : 'false');
        } catch (e) {}
    }

    _updateLevelUp() {
        // Use cached choices (computed at state transition to avoid random mismatch with render)
        const choices = this._cachedLevelUpChoices || this._getLevelUpChoices();
        const count = choices.length;

        // ── Reroll Token: press R to reroll choices ──
        if (wasPressed('KeyR') && this.rerollTokenCount > 0) {
            this.rerollTokenCount--;
            this._cachedLevelUpChoices = this._getLevelUpChoices();
            this.upgradeIndex = 0;
            this._levelUpSpaceReady = false;
            showToast('Rerolled! 🔄 (' + this.rerollTokenCount + ' left)', '#2196f3', '🔄');
            Audio.playMenuSelect();
            return;
        }

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
        // Mouse hover (level-up: dynamic box centred, headerH=100, rowH=38)
        const _luBh = Math.min(100 + count * 38 + 46, CANVAS_HEIGHT - 40);
        const _luBy = (CANVAS_HEIGHT - _luBh) / 2;
        const _luStartY = _luBy + 100;
        const _lumh = getMenuHover(_luStartY, count, 38, 34, 500);
        if (_lumh >= 0 && _lumh !== this.upgradeIndex) {
            this.upgradeIndex = _lumh;
            this._levelUpSpaceReady = false;
            Audio.playMenuNav();
        }

        // Confirm with Enter, click, or number keys
        let choiceIdx = null;
        if (wasPressed('Enter') || wasMousePressed(0)) {
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
        } else if (chosen.type === 'node') {
            // Apply upgrade node from UpgradeEngine
            UpgradeEngine.applyNode(chosen.nodeId || chosen.id, 'levelup');
            // Still do the level-up stat bookkeeping (level counter, xp)
            this.player.level++;
            this.player.xp -= this.player.xpToNext;
            this.player.xpToNext = Math.floor(this.player.xpToNext * 1.25);
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
            this._afterLevelUpChain();
        }
    }

    /** Transition logic after all chained level-ups are resolved. */
    _afterLevelUpChain() {
        // Boss scroll pending?
        if (this._pendingBossScroll) {
            this.scrollChoices = this._pendingBossScroll;
            this._pendingBossScroll = null;
            this.scrollCursor = 0;
            this.state = STATE_BOSS_SCROLL;
            return;
        }
        // Run shop pending?
        if (this._pendingRunShop) {
            this._pendingRunShop = false;
            this.runShopCursor = 0;
            this.hasForgeTokenInShop = Math.random() < SHOP_FORGE_TOKEN_CHANCE;
            this.state = STATE_SHOP_RUN;
            return;
        }
        this.state = STATE_PLAYING;
    }

    /**
     * Build array of level-up choices using UpgradeEngine (node-based + base stat fallbacks).
     * Each: { type: 'node'|'base'|'runUpgrade', id, label, color, icon?, nodeId? }
     */
    _getLevelUpChoices() {
        const context = this._getUpgradeContext();
        const choices = UpgradeEngine.buildLevelUpChoices(context, this.player);

        // Also offer an unlocked run upgrade if available (as extra 4th option)
        const unlocked = getUnlockedRunUpgradeIds();
        const available = unlocked.filter(id => !this.runUpgradesActive[id]);
        if (available.length > 0) {
            const id = available[Math.floor(Math.random() * available.length)];
            const def = RUN_UPGRADE_DEFINITIONS[id];
            if (def) {
                choices.push({
                    type: 'runUpgrade',
                    id,
                    label: `${def.icon} ${def.name}: ${def.desc}`,
                    color: def.color,
                });
            }
        }

        return choices;
    }

    /** Build the context object used by UpgradeEngine for node eligibility checks. */
    _getUpgradeContext() {
        return {
            equippedAbilities: this.abilitySystem.getEquippedIds(),
            equippedProcs: this.procSystem.getEquippedIds(),
            stage: this.stage,
        };
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
        // Mouse hover (training config: custom Y positions + start button)
        const _tcStartY = 140;
        const _tcRowYs = [_tcStartY + 20, _tcStartY + 82, _tcStartY + 178, _tcStartY + 240, _tcStartY + 302, _tcStartY + 282 + 48 + 16 + 22];
        const _tcmh = getMenuHoverCustom(_tcRowYs, 44, 460);
        if (_tcmh >= 0 && _tcmh !== this.trainingConfigCursor) { this.trainingConfigCursor = _tcmh; Audio.playMenuNav(); }

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

        // Confirm (Enter / Space / Click) — start training from any row
        if (wasPressed('Enter') || wasPressed('Space') || (wasMousePressed(0) && this.trainingConfigCursor === 5)) {
            Audio.playMenuSelect();
            this._startTraining();
            return;
        }

        // Back (ESC or RMB)
        if (wasPressed('Escape') || wasMousePressed(2)) {
            this.state = STATE_MENU;
            this.menuIndex = 0;
        }
    }

    _updateGameOver() {
        if (wasPressed('Enter') || wasMousePressed(0)) {
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
        // Mouse tab click (tabs at tabY=84, tabSpacing=120, centred)
        const _achTabY = 84;
        const _achTabSpacing = 120;
        const _achTabStartX = CANVAS_WIDTH / 2 - (filterCount - 1) * _achTabSpacing / 2;
        const _achTabCenters = [];
        for (let i = 0; i < filterCount; i++) _achTabCenters.push(_achTabStartX + i * _achTabSpacing);
        const _achTabH = getTabHover(_achTabCenters, _achTabY, 100, 24);
        if (_achTabH >= 0 && wasMousePressed(0)) {
            if (_achTabH !== this.achievementFilter) {
                this.achievementFilter = _achTabH;
                this.achievementCursor = 0;
                Audio.playMenuNav();
            }
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
            // Mouse hover on achievement rows (startY=110, rowH=64, PAGE_SIZE=7, with scroll)
            const _achPageSize = 7;
            const _achStartY = 110;
            const _achRowH = 64;
            const _achMaxScroll = Math.max(0, filtered.length - _achPageSize);
            const _achScrollOffset = Math.max(0, Math.min(this.achievementCursor - Math.floor(_achPageSize / 2), _achMaxScroll));
            const _achmh = getMenuHover(_achStartY + _achRowH / 2, Math.min(_achPageSize, filtered.length - _achScrollOffset), _achRowH, _achRowH - 4, 700);
            if (_achmh >= 0) {
                const realIdx = _achScrollOffset + _achmh;
                if (realIdx !== this.achievementCursor) { this.achievementCursor = realIdx; Audio.playMenuNav(); }
            }
        }

        // Back (ESC or RMB)
        if (wasPressed('Escape') || wasMousePressed(2)) {
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
        // Mouse hover (boss victory: bh=320+extraH, centred, startY=by+132+extraH, rowH=46)
        // Approximate: assume no extra unlocks for hover region
        const _bvBh = 320;
        const _bvBy = (CANVAS_HEIGHT - _bvBh) / 2;
        const _bvStartY = _bvBy + 132;
        const _bvmh = getMenuHover(_bvStartY, 3, 46, 40, 380);
        if (_bvmh >= 0 && _bvmh !== this.bossRewardIndex) { this.bossRewardIndex = _bvmh; Audio.playMenuNav(); }

        let choice = null;
        if (wasPressed('Enter') || wasPressed('Space') || wasMousePressed(0)) {
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
        this.player.overHeal = 0;

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

        // No level-up: scroll → shop → playing (via _afterLevelUpChain logic)
        this._pendingRunShop = true;
        this._afterLevelUpChain();
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
            case STATE_EVENT:
            case STATE_BOSS_SCROLL:
                break;  // keep current danger
            case STATE_GAME_OVER:
                Music.setDanger(0.18);
                break;
            case STATE_SETTINGS:
                // If opened from pause, keep low ambience; otherwise silent
                Music.setDanger(this._settingsReturnState === STATE_PAUSED ? 0.15 : 0);
                break;
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
                           this.profileNewName, this.profileDeleting,
                           this.profileColorPicking, this.colorPickerCursor,
                           this.profileClassPicking, this.classPickerCursor);
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
            renderSettings(ctx, this.settingsCursor, this.muted, Music.isMusicEnabled(), this.proceduralRooms, this.showDamageNumbers, this.mouseAimEnabled, this._settingsReturnState === STATE_PAUSED);
            this._renderCheatNotifications(ctx);
            return;
        }

        if (this.state === STATE_META_SHOP) {
            const meta = MetaStore.getState();
            const shards = getAvailableShards(meta);
            renderMetaShop(ctx, this.metaShopCursor, shards, this.purchasedMetaBoosterId, meta.unlockedBoosters, meta.stats);
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

        // ── Fire zones (from dagger/dash fire trail) ──
        if (this._fireZones) {
            for (const fz of this._fireZones) {
                const alpha = Math.min(1, fz.timer / 300) * 0.35;
                ctx.save();
                ctx.globalAlpha = alpha + Math.sin(Date.now() * 0.008 + fz.x) * 0.1;
                ctx.fillStyle = '#ff6d00';
                ctx.beginPath();
                ctx.arc(fz.x, fz.y, fz.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha * 0.5;
                ctx.fillStyle = '#ff3d00';
                ctx.beginPath();
                ctx.arc(fz.x, fz.y, fz.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        this.door.render(ctx);
        // Enemies: hidden if outside light in darkness rooms
        for (const e of this.enemies) {
            if (!e.dead && isDarknessActive() && !isInsideLight(e.x, e.y)) continue;
            e.render(ctx);
        }
        if (this.boss && !this.boss.dead) this.boss.render(ctx);
        for (const cb of this.cheatBosses) { if (!cb.dead) cb.render(ctx); }
        for (const p of this.projectiles) {
            if (isDarknessActive() && !isInsideLight(p.x, p.y)) continue;
            p.render(ctx);
        }
        for (const d of this.playerProjectiles) d.render(ctx);
        for (const pk of this.pickups) pk.render(ctx);
        for (const coin of this.coinPickups) coin.render(ctx);
        this.particles.render(ctx);
        this.player.render(ctx);

        // Biome atmospheric overlay (tint + vignette) — after entities, before HUD
        renderAtmosphere(ctx, this.currentBiome);

        // ── Low-HP red vignette ──
        const _hpRatio = this.player.hp / this.player.maxHp;
        if (_hpRatio > 0 && _hpRatio <= 0.30 && !this.trainingMode) {
            const _intensity = 1 - (_hpRatio / 0.30); // 0→1 as HP drops
            // Pulse throb adds extra brightness on each heartbeat
            const throb = this._heartbeatPulse || 0;
            const baseAlpha = 0.10 + _intensity * 0.25;  // 0.10 → 0.35
            const pulseAlpha = baseAlpha + throb * 0.15;  // extra flash on beat
            ctx.save();
            // Left edge
            const gLeft = ctx.createLinearGradient(0, 0, CANVAS_WIDTH * 0.3, 0);
            gLeft.addColorStop(0, `rgba(180, 0, 0, ${pulseAlpha})`);
            gLeft.addColorStop(1, 'rgba(180, 0, 0, 0)');
            ctx.fillStyle = gLeft;
            ctx.fillRect(0, 0, CANVAS_WIDTH * 0.3, CANVAS_HEIGHT);
            // Right edge
            const gRight = ctx.createLinearGradient(CANVAS_WIDTH, 0, CANVAS_WIDTH * 0.7, 0);
            gRight.addColorStop(0, `rgba(180, 0, 0, ${pulseAlpha})`);
            gRight.addColorStop(1, 'rgba(180, 0, 0, 0)');
            ctx.fillStyle = gRight;
            ctx.fillRect(CANVAS_WIDTH * 0.7, 0, CANVAS_WIDTH * 0.3, CANVAS_HEIGHT);
            // Top edge
            const gTop = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.2);
            gTop.addColorStop(0, `rgba(180, 0, 0, ${pulseAlpha * 0.6})`);
            gTop.addColorStop(1, 'rgba(180, 0, 0, 0)');
            ctx.fillStyle = gTop;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * 0.2);
            // Bottom edge
            const gBot = ctx.createLinearGradient(0, CANVAS_HEIGHT, 0, CANVAS_HEIGHT * 0.8);
            gBot.addColorStop(0, `rgba(180, 0, 0, ${pulseAlpha * 0.6})`);
            gBot.addColorStop(1, 'rgba(180, 0, 0, 0)');
            ctx.fillStyle = gBot;
            ctx.fillRect(0, CANVAS_HEIGHT * 0.8, CANVAS_WIDTH, CANVAS_HEIGHT * 0.2);
            ctx.restore();
        }

        // ── Room type lifecycle: render overlay ──
        const _renderRoomDef = getRoomType(this.currentRoomType);
        callHook(_renderRoomDef, 'onRender', ctx);

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

        // ── Trial timer banner ──
        if (this.trialActive && this.eventState && this.eventState.phase === 'challenge') {
            const secs = Math.max(0, this.eventState.timeRemaining / 1000).toFixed(1);
            ctx.save();
            ctx.fillStyle = 'rgba(244, 67, 54, 0.25)';
            ctx.fillRect(0, 50, CANVAS_WIDTH, 36);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f44336';
            ctx.font = 'bold 18px monospace';
            ctx.fillText(`⚔️ TRIAL — Survive: ${secs}s`, CANVAS_WIDTH / 2, 74);
            ctx.restore();
        }

        // ── Token indicator (reroll) ──
        if (this.rerollTokenCount > 0) {
            ctx.save();
            ctx.textAlign = 'right';
            ctx.font = '11px monospace';
            ctx.fillStyle = '#2196f3';
            ctx.fillText(`🔄 Reroll ×${this.rerollTokenCount}`, CANVAS_WIDTH - 10, 108);
            ctx.restore();
        }

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

        // ── Floating damage numbers ──
        for (const d of this.damageNumbers) {
            const progress = 1 - d.timer / d.maxTimer; // 0→1
            const alpha = progress < 0.7 ? 1 : 1 - ((progress - 0.7) / 0.3); // fade out last 30%
            const scale = progress < 0.1 ? 0.5 + (progress / 0.1) * 0.5 : 1; // pop-in
            if (d.isCrit) {
                // Crit: larger, golden text with orange glow
                const fontSize = Math.round(20 * scale);
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.font = `bold ${fontSize}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffd740';
                ctx.strokeStyle = '#ff6d00';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#ff6d00';
                ctx.shadowBlur = 12;
                ctx.strokeText(`${d.amount}!`, d.x, d.y);
                ctx.fillText(`${d.amount}!`, d.x, d.y);
                ctx.restore();
            } else {
                // Normal: white text with red glow
                const fontSize = Math.round(14 * scale);
                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.font = `bold ${fontSize}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#ff4444';
                ctx.shadowBlur = 6;
                ctx.fillText(`${d.amount}`, d.x, d.y);
                ctx.restore();
            }
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
            renderLevelUpOverlay(ctx, this.player, this.upgradeIndex, choices, this._levelUpSpaceReady, this.rerollTokenCount);
        } else if (this.state === STATE_GAME_OVER) {
            const runRewards = RewardSystem.getRunRewards();
            renderGameOverOverlay(ctx, this.stage, this.player.level, runRewards, this._gameOverEffects || null, this.runUnlocksLog.length > 0 ? this.runUnlocksLog : null);
        } else if (this.state === STATE_BOSS_VICTORY) {
            renderBossVictoryOverlay(ctx, this.boss.name, this.boss.color,
                this.bossRewardIndex, BOSS_REWARD_HP, BOSS_REWARD_DAMAGE, BOSS_REWARD_SPEED,
                this.lastBossReward, RELIC_DEFINITIONS, RUN_UPGRADE_DEFINITIONS);
        } else if (this.state === STATE_SHOP_RUN) {
            renderRunShop(ctx, this.runShopCursor, this.runCoins, this.stage,
                this.metaBoosterShieldCharges, this.bombCharges,
                this.hasForgeTokenInShop, this.forgeTokenCount);
        } else if (this.state === STATE_EVENT) {
            EventSystem.renderEvent(ctx, this.eventState);
        } else if (this.state === STATE_BOSS_SCROLL) {
            renderBossScrollOverlay(ctx, this.scrollChoices || [], this.scrollCursor);
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

        // ── Gather active effects ──
        const effects = this._getAllActiveEffects();

        // ── Layout: left panel = pause controls, right panel = effects ──
        const totalW = effects.length > 0 ? 620 : 300;
        const panelH = 440;
        const bx = (CANVAS_WIDTH - totalW) / 2;
        const by = (CANVAS_HEIGHT - panelH) / 2;

        // Left panel (pause controls) - 280px wide
        const leftW = 280;

        ctx.fillStyle = 'rgba(15, 15, 25, 0.95)';
        ctx.fillRect(bx, by, totalW, panelH);
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, totalW, panelH);

        ctx.textAlign = 'center';

        // Title
        const leftCx = bx + leftW / 2;
        ctx.fillStyle = '#4fc3f7';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('PAUSED', leftCx, by + 45);

        // Stage info
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        const biomeLabel = this.currentBiome ? `${this.currentBiome.name} · ` : '';
        ctx.fillText(`${biomeLabel}Stage ${this.stage}  ·  Level ${this.player.level}`, leftCx, by + 67);

        // Options
        const options = [
            { label: 'RESUME', color: '#4fc3f7' },
            { label: 'SETTINGS', color: '#e0e0e0' },
            { label: 'BACK TO MENU', color: '#e74c3c' },
        ];

        const startY = by + 105;
        const spacing = 44;

        options.forEach((opt, i) => {
            const oy = startY + i * spacing;
            const selected = i === this.pauseIndex;

            if (selected) {
                const selW = 220;
                const selH = 34;
                ctx.fillStyle = 'rgba(79,195,247,0.08)';
                ctx.fillRect(leftCx - selW / 2, oy - 20, selW, selH);
                ctx.strokeStyle = opt.color;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(leftCx - selW / 2, oy - 20, selW, selH);

                ctx.fillStyle = opt.color;
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('▸', leftCx - 85, oy);
                ctx.textAlign = 'center';
            }

            ctx.fillStyle = selected ? opt.color : '#555';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(opt.label, leftCx, oy);
        });

        // Hint
        ctx.fillStyle = '#444';
        ctx.font = '10px monospace';
        ctx.fillText('P = Quick Resume', leftCx, by + panelH - 14);

        // ── Right panel: Active Effects ──
        if (effects.length > 0) {
            const rightX = bx + leftW;
            const rightW = totalW - leftW;

            // Separator line
            ctx.strokeStyle = 'rgba(79,195,247,0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rightX, by + 8);
            ctx.lineTo(rightX, by + panelH - 8);
            ctx.stroke();

            // Header
            ctx.fillStyle = '#4fc3f7';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('ACTIVE EFFECTS', rightX + rightW / 2, by + 22);

            // ── Render categorized effects with clipping ──
            ctx.save();
            ctx.beginPath();
            ctx.rect(rightX + 2, by + 30, rightW - 4, panelH - 44);
            ctx.clip();

            let ey = by + 40;
            const lineH = 14;
            const catGap = 6;
            let lastCat = '';

            for (const fx of effects) {
                if (fx.category !== lastCat) {
                    if (lastCat !== '') ey += catGap;
                    // Category header
                    ctx.fillStyle = '#666';
                    ctx.font = 'bold 8px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(fx.category.toUpperCase(), rightX + 10, ey + 7);
                    ey += 12;
                    lastCat = fx.category;
                }

                // Effect row: icon + name + desc
                ctx.fillStyle = fx.color;
                ctx.font = '9px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(fx.icon, rightX + 10, ey + 8);

                ctx.fillStyle = '#ccc';
                ctx.font = '8px monospace';
                const nameText = fx.name;
                ctx.fillText(nameText, rightX + 24, ey + 8);

                // Desc — show what the effect actually does
                if (fx.desc) {
                    ctx.fillStyle = '#999';
                    ctx.font = '8px monospace';
                    const maxDescW = rightW - 36;
                    let descText = fx.desc;
                    if (ctx.measureText(descText).width > maxDescW) {
                        while (descText.length > 0 && ctx.measureText(descText + '…').width > maxDescW) {
                            descText = descText.slice(0, -1);
                        }
                        descText += '…';
                    }
                    ctx.fillText(descText, rightX + 24, ey + 17);
                    ey += lineH + 8;
                } else {
                    ey += lineH;
                }
            }

            ctx.restore();

            // Scroll hint if content overflows
            if (ey > by + panelH - 14) {
                ctx.fillStyle = '#555';
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('…more effects', rightX + rightW / 2, by + panelH - 6);
            }
        }

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
            ? 'WASD=Move  SPACE/LMB=Attack  N/MMB=Throw  M/RMB=Dash  Q/E=Ability  ESC=Exit'
            : 'WASD=Move  SPACE/LMB=Attack  N/MMB=Throw  M/RMB=Dash  Q/E=Ability  P=Pause';
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
