// ── Canvas ──
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const TILE_SIZE = 40;
export const COLS = CANVAS_WIDTH / TILE_SIZE;   // 20
export const ROWS = CANVAS_HEIGHT / TILE_SIZE;  // 15

// ── Player ──
export const PLAYER_RADIUS = 14;
export const PLAYER_SPEED = 160;
export const PLAYER_MAX_HP = 100;
export const PLAYER_DAMAGE = 25;
export const PLAYER_COLOR = '#4fc3f7';
export const PLAYER_INVULN_TIME = 400;

// ── Attack ──
export const ATTACK_RANGE = 50;
export const ATTACK_ARC = (Math.PI * 2) / 3; // 120°
export const ATTACK_COOLDOWN = 350;
export const ATTACK_DURATION = 150;
export const ATTACK_KNOCKBACK = 20;

// ── Ranged Attack (Dagger Throw) ──
export const DAGGER_COOLDOWN = 800;       // ms between throws (longer than melee)
export const DAGGER_DAMAGE_MULT = 0.6;   // 60% of player melee damage
export const DAGGER_SPEED = 280;          // px/s (faster than enemy projectiles)
export const DAGGER_RANGE = 300;          // max travel distance in px
export const DAGGER_RADIUS = 5;           // slightly larger than enemy projectiles
export const DAGGER_COLOR = '#4fc3f7';    // player-themed cyan
export const DAGGER_KNOCKBACK = 10;       // half of melee knockback

// ── Dash / Dodge Roll ──
export const DASH_SPEED_MULT = 3.5;      // speed multiplier during dash
export const DASH_DURATION = 180;         // ms the dash lasts
export const DASH_COOLDOWN = 900;         // ms before next dash
export const DASH_INVULN_TIME = 160;      // ms of i-frames during dash

// ── Enemy ──
export const ENEMY_RADIUS = 12;
export const ENEMY_SPEED = 70;
export const ENEMY_HP = 50;
export const ENEMY_DAMAGE = 10;
export const ENEMY_HIT_COOLDOWN = 800;
export const ENEMY_COLOR = '#e74c3c';
export const ENEMY_XP = 15;

// ── Enemy types ──
export const ENEMY_TYPE_BASIC = 'basic';
export const ENEMY_TYPE_SHOOTER = 'shooter';
export const ENEMY_TYPE_TANK = 'tank';
export const ENEMY_TYPE_DASHER = 'dasher';

// ── Shooter enemy ──
export const SHOOTER_COLOR = '#9b59b6';
export const SHOOTER_HP_MULT = 0.7;
export const SHOOTER_SPEED_MULT = 0.55;
export const SHOOTER_RANGE = 200;
export const SHOOTER_FIRE_COOLDOWN = 2000;
export const SHOOTER_XP_MULT = 1.3;
export const SHOOTER_INTRO_STAGE = 5;

// ── Tank enemy ──
export const TANK_COLOR = '#e67e22';
export const TANK_HP_MULT = 2.0;
export const TANK_SPEED_MULT = 0.45;
export const TANK_DAMAGE_MULT = 1.5;
export const TANK_CHARGE_SPEED_MULT = 2.5;
export const TANK_CHARGE_COOLDOWN = 4000;
export const TANK_CHARGE_DURATION = 800;
export const TANK_CHARGE_RANGE = 250;
export const TANK_XP_MULT = 2.0;
export const TANK_INTRO_STAGE = 9;

// ── Dasher enemy ──
export const DASHER_COLOR = '#2ecc71';
export const DASHER_HP_MULT = 0.6;
export const DASHER_SPEED_MULT = 0.55;
export const DASHER_DAMAGE_MULT = 1.2;
export const DASHER_DASH_SPEED_MULT = 3.5;
export const DASHER_DASH_COOLDOWN = 2500;
export const DASHER_DASH_DURATION = 400;
export const DASHER_DASH_RANGE = 300;
export const DASHER_XP_MULT = 1.5;
export const DASHER_INTRO_STAGE = 7;

// ── Projectile (shooter) ──
export const PROJECTILE_RADIUS = 4;
export const PROJECTILE_SPEED = 200;
export const PROJECTILE_DAMAGE = 8;
export const PROJECTILE_COLOR = '#bb86fc';
export const PROJECTILE_MAX_LIFETIME = 3000;

// ── Leveling ──
export const XP_BASE = 30;
export const XP_MULTIPLIER = 1.25;
export const UPGRADE_HP = 25;
export const UPGRADE_SPEED = 15;
export const UPGRADE_DAMAGE = 8;

// ── Door ──
export const DOOR_COLOR_LOCKED = '#c0392b';
export const DOOR_COLOR_UNLOCKED = '#27ae60';

// ── Room rendering ──
export const COLOR_FLOOR = '#1a1a2e';
export const COLOR_WALL = '#4a3f35';
export const COLOR_WALL_LIGHT = '#5d4e37';
export const COLOR_WALL_DARK = '#3a3028';

// ── Game states ──
export const STATE_MENU = 'MENU';
export const STATE_PROFILES = 'PROFILES';
export const STATE_PLAYING = 'PLAYING';
export const STATE_PAUSED = 'PAUSED';
export const STATE_LEVEL_UP = 'LEVEL_UP';
export const STATE_GAME_OVER = 'GAME_OVER';
export const STATE_TRAINING_CONFIG = 'TRAINING_CONFIG';

// ── Training ──
export const TRAINING_ENEMY_COUNT = 3;
export const TRAINING_RESPAWN_DELAY = 2000; // ms before dead enemies respawn

// ── Second Wave ──
export const SECOND_WAVE_CHANCE = 0.15;       // 15% chance for a second wave after clearing
export const SECOND_WAVE_MIN_STAGE = 8;       // no second waves before stage 8
export const SECOND_WAVE_ENEMY_MULT = 0.75;   // wave 2 spawns 75% of normal enemy count
export const SECOND_WAVE_ANNOUNCE_TIME = 2000; // ms to show "WAVE 2" banner

// ── Pickups / Item Drops ──
export const DROP_CHANCE = 0.25;           // 25% base drop chance
export const PICKUP_RADIUS = 10;
export const PICKUP_LIFETIME = 10000;      // 10s before disappearing
export const PICKUP_BOBBLE_SPEED = 0.004;  // visual bobbing speed

// Buff durations (ms)
export const BUFF_DURATION_SHORT = 8000;   // 8s for timed buffs
export const BUFF_DURATION_LONG = 15000;   // 15s for phase shield

// Buff strengths
export const BUFF_RAGE_DAMAGE_MULT = 1.5;       // +50% damage
export const BUFF_HEAL_AMOUNT = 20;              // instant heal
export const BUFF_PIERCING_RANGE_MULT = 1.4;     // +40% range
export const BUFF_PIERCING_DAMAGE_MULT = 1.25;   // +25% damage
export const BUFF_SPEED_SURGE_CD_MULT = 0.6;     // -40% cooldown (= 60% of original)
export const BUFF_SWIFT_SPEED_MULT = 1.4;        // +40% speed
export const BUFF_CRUSHING_DAMAGE_MULT = 3.0;    // 3× next attack
export const BUFF_CRUSHING_KB_MULT = 3.0;        // 3× knockback
export const BUFF_IRON_SKIN_REDUCE = 0.5;        // -50% damage taken

// Max simultaneous buffs
export const MAX_ACTIVE_BUFFS = 3;

// ── Tile types (numeric grid values) ──
export const TILE_FLOOR  = 0;
export const TILE_WALL   = 1;
export const TILE_CANYON = 2;

// ── Canyon / Pit Trap ──
export const CANYON_INTRO_STAGE       = 11;    // first stage canyons can appear (Act 2)
export const CANYON_FALL_HP_PENALTY   = 0.35;  // 35% of maxHP lost on fall
export const CANYON_FALL_COIN_PENALTY = 0.10;  // 10% of coins lost on fall
export const MAX_DASH_CROSS_TILES    = 2;      // max canyon gap dashable

// Canyon spawn rate by stage bracket (tiles per room)
export const CANYON_COUNT_STAGE_11_20 = [1, 3];   // [min, max]  Act 2
export const CANYON_COUNT_STAGE_21_30 = [3, 8];   //             Act 3
export const CANYON_COUNT_STAGE_31    = [6, 14];   //             Act 4+

// Canyon colors
export const CANYON_COLOR_DEEP   = '#0a0a12';   // deep void
export const CANYON_COLOR_EDGE   = '#2a1a3a';   // purple-tinted edge
export const CANYON_COLOR_RIM    = '#4a3060';   // visible rim highlight

// ── Hazards ──
export const HAZARD_TYPE_SPIKES     = 'spikes';
export const HAZARD_TYPE_LAVA       = 'lava';
export const HAZARD_TYPE_ARROW      = 'arrow';
export const HAZARD_TYPE_TAR        = 'tar';
export const HAZARD_TYPE_LASER      = 'laser';
export const HAZARD_TYPE_LASER_WALL = 'laser_wall';

// Intro stages (progressive difficulty)
export const HAZARD_SPIKE_INTRO_STAGE = 4;
export const HAZARD_LAVA_INTRO_STAGE  = 6;
export const HAZARD_ARROW_INTRO_STAGE = 8;
export const HAZARD_TAR_INTRO_STAGE        = 10;
export const HAZARD_LASER_INTRO_STAGE      = 21;   // spaceship biome only
export const HAZARD_LASER_WALL_INTRO_STAGE = 21;   // spaceship biome only

// Spike hazard
export const HAZARD_SPIKE_DAMAGE   = 8;
export const HAZARD_SPIKE_CYCLE    = 2500;   // ms full cycle
export const HAZARD_SPIKE_ACTIVE   = 700;    // ms spikes are out (damaging)
export const HAZARD_SPIKE_WARN     = 500;    // ms warning before active

// Lava hazard
export const HAZARD_LAVA_DAMAGE    = 4;      // per tick
export const HAZARD_LAVA_TICK      = 400;    // ms between ticks
export const HAZARD_LAVA_SLOW      = 0.55;   // speed multiplier

// Arrow trap hazard
export const HAZARD_ARROW_DAMAGE   = 8;
export const HAZARD_ARROW_COOLDOWN = 3500;   // ms between shots
export const HAZARD_ARROW_SPEED    = 160;
export const HAZARD_ARROW_RADIUS   = 3;

// Tar / oil hazard
export const HAZARD_TAR_SLOW       = 0.45;   // speed multiplier while on tar
export const HAZARD_TAR_LINGER     = 600;    // ms slow persists after leaving tar

// Laser beam hazard (spaceship biome)
export const HAZARD_LASER_DAMAGE       = 6;      // per tick while touching beam
export const HAZARD_LASER_TICK         = 200;    // ms between damage ticks
export const HAZARD_LASER_CYCLE        = 4000;   // full on/off cycle ms
export const HAZARD_LASER_ACTIVE       = 1800;   // ms beam is active (damaging)
export const HAZARD_LASER_WARN         = 800;    // ms telegraph before firing
export const HAZARD_LASER_BEAM_WIDTH   = 6;      // px width of the beam

// Laser wall hazard (spaceship biome)
export const HAZARD_LASER_WALL_CYCLE   = 5000;   // full open/close cycle ms
export const HAZARD_LASER_WALL_OPEN    = 2200;   // ms wall is open (safe)
export const HAZARD_LASER_WALL_WARN    = 600;    // ms warning before closing
export const HAZARD_LASER_WALL_DAMAGE  = 12;     // damage on contact

// Hazard colors
export const HAZARD_SPIKE_COLOR    = '#8e8e8e';
export const HAZARD_LAVA_COLOR     = '#e25822';
export const HAZARD_LAVA_COLOR2    = '#ff6b35';
export const HAZARD_ARROW_COLOR    = '#ff6b35';
export const HAZARD_TAR_COLOR      = '#1a1a1a';
export const HAZARD_TAR_COLOR2     = '#2c2418';
export const HAZARD_TAR_BUBBLE     = '#3a3225';
export const HAZARD_LASER_COLOR    = '#ff1744';   // bright red laser
export const HAZARD_LASER_COLOR2   = '#ff5252';   // glow color
export const HAZARD_LASER_WALL_COLOR  = '#00e5ff'; // cyan barrier
export const HAZARD_LASER_WALL_COLOR2 = '#18ffff'; // cyan glow

// Pickup type keys
export const PICKUP_RAGE_SHARD = 'rage_shard';
export const PICKUP_HEART_FRAGMENT = 'heart_fragment';
export const PICKUP_PIERCING_SHOT = 'piercing_shot';
export const PICKUP_PHASE_SHIELD = 'phase_shield';
export const PICKUP_SPEED_SURGE = 'speed_surge';
export const PICKUP_SWIFT_BOOTS = 'swift_boots';
export const PICKUP_CRUSHING_BLOW = 'crushing_blow';
export const PICKUP_IRON_SKIN = 'iron_skin';

// ── Combat: Impact System ──
export const HITSTOP_NORMAL = 0;              // no hitstop on normal melee
export const HITSTOP_BIG = 70;                // ms freeze for big hits (shockwave, bomb, crit)
export const HITSTOP_MEDIUM = 50;             // ms for medium hits (procs)
export const SHAKE_BIG = 5;                   // px intensity for big impacts
export const SHAKE_MEDIUM = 3;                // px for medium impacts
export const SHAKE_SMALL = 1.5;               // px for small hits (melee)

// ── Combat: Abilities ──
export const MAX_ACTIVE_ABILITIES = 2;        // ability slots (Q + E)
export const MAX_ACTIVE_PROCS = 2;            // passive proc slots

// Shockwave
export const ABILITY_SHOCKWAVE_CD = 8;        // seconds
export const ABILITY_SHOCKWAVE_RADIUS = 140;  // px
export const ABILITY_SHOCKWAVE_DMG_MULT = 1.2;
export const ABILITY_SHOCKWAVE_KB = 40;

// Blade Storm
export const ABILITY_BLADESTORM_CD = 12;      // seconds
export const ABILITY_BLADESTORM_DURATION = 3; // seconds
export const ABILITY_BLADESTORM_RADIUS = 110; // px
export const ABILITY_BLADESTORM_TICK = 0.2;   // seconds per damage tick
export const ABILITY_BLADESTORM_DMG_MULT = 0.4;

// Gravity Pull
export const ABILITY_GRAVITY_CD = 10;         // seconds
export const ABILITY_GRAVITY_RADIUS = 180;    // px
export const ABILITY_GRAVITY_PULL_DURATION = 1.0; // seconds
export const ABILITY_GRAVITY_SLOW_DURATION = 0.3; // seconds after pull
export const ABILITY_GRAVITY_FORCE = 220;     // pull speed px/s

// Freeze Pulse
export const ABILITY_FREEZE_CD = 10;          // seconds
export const ABILITY_FREEZE_RADIUS = 160;     // px
export const ABILITY_FREEZE_DURATION = 1.0;   // seconds
export const ABILITY_FREEZE_DMG_MULT = 0.3;

// ── Combat: Procs ──
export const PROC_EXPLOSIVE_CHANCE = 0.10;    // 10%
export const PROC_EXPLOSIVE_RADIUS = 90;      // px
export const PROC_EXPLOSIVE_DMG_MULT = 0.6;

export const PROC_CHAIN_LIGHTNING_CHANCE = 0.12; // 12%
export const PROC_CHAIN_LIGHTNING_JUMPS = 3;
export const PROC_CHAIN_LIGHTNING_RANGE = 180; // px
export const PROC_CHAIN_LIGHTNING_DMG_MULT = 0.35;

export const PROC_HEAVY_CRIT_EXTRA_DMG = 0.4; // +40% on crit
export const PLAYER_BASE_CRIT_CHANCE = 0.05;  // 5% base crit chance

// ── Upgrade Node System ──
export const NODE_RARITY_COMMON   = 'common';
export const NODE_RARITY_UNCOMMON = 'uncommon';
export const NODE_RARITY_RARE     = 'rare';

// ── Event System ──
export const EVENT_MIN_STAGE       = 8;      // events appear from stage 8+
export const EVENT_CHANCE           = 0.12;   // 12% per non-boss room
export const STATE_EVENT            = 'EVENT'; // game state for event rooms

// Event types
export const EVENT_FORGE   = 'forge';
export const EVENT_SHRINE  = 'shrine';
export const EVENT_LIBRARY = 'library';
export const EVENT_CHAOS   = 'chaos';
export const EVENT_TRIAL   = 'trial';
export const EVENT_TRADER  = 'trader';

// ── Boss Scroll (unlock) ──
export const STATE_BOSS_SCROLL      = 'BOSS_SCROLL'; // game state for scroll choice overlay
export const BOSS_SCROLL_DROP_CHANCE = 0.20;  // 20% on boss kill

// ── Forge Token in Boss Shop ──
export const SHOP_FORGE_TOKEN_CHANCE = 0.25;  // 25% chance token appears in shop
export const SHOP_FORGE_TOKEN_COST   = 18;    // coin cost

// ── Combo / Kill-Chain ──
export const COMBO_TIMEOUT = 2500;              // ms before combo resets
export const COMBO_TIER_1 = 3;                  // kills for tier 1
export const COMBO_TIER_2 = 5;                  // kills for tier 2
export const COMBO_TIER_3 = 8;                  // kills for tier 3
export const COMBO_TIER_4 = 12;                 // kills for tier 4
export const COMBO_XP_MULT_1 = 1.25;            // ×1.25 XP at tier 1
export const COMBO_XP_MULT_2 = 1.5;             // ×1.5 XP at tier 2
export const COMBO_XP_MULT_3 = 2.0;             // ×2.0 XP at tier 3
export const COMBO_XP_MULT_4 = 2.5;             // ×2.5 XP at tier 4

// ── Boss ──
export const BOSS_STAGE_INTERVAL = 10;           // boss every N stages (10-room acts)
export const BOSS_TYPE_BRUTE      = 'brute';
export const BOSS_TYPE_WARLOCK    = 'warlock';
export const BOSS_TYPE_PHANTOM    = 'phantom';
export const BOSS_TYPE_JUGGERNAUT = 'juggernaut';
export const BOSS_TYPE_OVERLORD   = 'overlord';

// Boss base stats (scaled per encounter)
export const BOSS_BASE_HP     = 400;
export const BOSS_BASE_SPEED   = 55;
export const BOSS_BASE_DAMAGE  = 15;

// Boss scaling per encounter (0, 1, 2, ...) — tuned for 10-room acts
export const BOSS_HP_SCALE  = 0.55;             // +55% HP per encounter (wider gaps)
export const BOSS_DMG_SCALE = 0.35;             // +35% damage per encounter
export const BOSS_SPD_SCALE = 0.14;             // +14% speed per encounter

// Boss scaling per stage (stacks with encounter scaling) — gentle slope
export const BOSS_STAGE_HP_SCALE  = 0.02;       // +2% HP per game stage (halved)
export const BOSS_STAGE_DMG_SCALE = 0.012;      // +1.2% damage per game stage
export const BOSS_STAGE_SPD_SCALE = 0.008;      // +0.8% speed per game stage

// Boss type-specific multipliers
export const BOSS_BRUTE_HP_MULT   = 1.3;
export const BOSS_BRUTE_SPD_MULT  = 0.8;
export const BOSS_BRUTE_DMG_MULT  = 1.4;
export const BOSS_BRUTE_RADIUS    = 28;
export const BOSS_WARLOCK_HP_MULT  = 0.9;
export const BOSS_WARLOCK_SPD_MULT = 0.85;
export const BOSS_WARLOCK_DMG_MULT = 1.0;
export const BOSS_WARLOCK_RADIUS   = 22;
export const BOSS_PHANTOM_HP_MULT  = 0.75;
export const BOSS_PHANTOM_SPD_MULT = 1.3;
export const BOSS_PHANTOM_DMG_MULT = 1.1;
export const BOSS_PHANTOM_RADIUS   = 20;

export const BOSS_JUGGERNAUT_HP_MULT  = 1.5;
export const BOSS_JUGGERNAUT_SPD_MULT = 0.6;
export const BOSS_JUGGERNAUT_DMG_MULT = 1.2;
export const BOSS_JUGGERNAUT_RADIUS   = 30;

export const BOSS_OVERLORD_HP_MULT  = 1.4;
export const BOSS_OVERLORD_SPD_MULT = 0.75;
export const BOSS_OVERLORD_DMG_MULT = 1.3;
export const BOSS_OVERLORD_RADIUS   = 26;

// Boss attack timings (ms)
export const BOSS_ATTACK_COOLDOWN   = 2000;
export const BOSS_SLAM_WINDUP       = 900;
export const BOSS_SLAM_RADIUS       = 90;
export const BOSS_CHARGE_WINDUP     = 500;
export const BOSS_CHARGE_DURATION   = 800;
export const BOSS_CHARGE_SPEED_MULT = 3.5;
export const BOSS_SUMMON_WINDUP     = 800;
export const BOSS_FAN_WINDUP        = 600;
export const BOSS_VOLLEY_WINDUP     = 400;
export const BOSS_VOLLEY_INTERVAL   = 200;
export const BOSS_DASH_WINDUP       = 400;
export const BOSS_DASH_DURATION     = 300;
export const BOSS_DASH_SPEED_MULT   = 5.0;
export const BOSS_RING_WINDUP       = 500;
export const BOSS_CLONE_WINDUP      = 600;
export const BOSS_ROCKET_WINDUP     = 700;
export const BOSS_ROCKET_SPEED      = 130;
export const BOSS_ROCKET_RADIUS     = 7;
export const BOSS_ROCKET_EXPLOSION_RADIUS = 70;
export const BOSS_ROCKET_EXPLOSION_LINGER = 800;
export const BOSS_BARRAGE_WINDUP    = 500;
export const BOSS_BARRAGE_INTERVAL  = 350;
export const BOSS_BOMBARDMENT_WINDUP  = 1400;
export const BOSS_BOMBARDMENT_RADIUS  = 55;
export const BOSS_BOMBARDMENT_COUNT   = 5;
export const BOSS_BOMBARDMENT_LINGER  = 700;
export const BOSS_STOMP_WINDUP      = 800;
export const BOSS_STOMP_RADIUS      = 100;
export const BOSS_LEAP_WINDUP       = 900;
export const BOSS_LEAP_RADIUS       = 75;
export const BOSS_SHOCKWAVE_WINDUP  = 600;
export const BOSS_SHOCKWAVE_COUNT   = 10;    // projectiles in the ring
export const BOSS_SHOCKWAVE_SPEED   = 100;   // px/s — slow, dodgeable

// Overlord attack timings
export const BOSS_LASER_SWEEP_WINDUP  = 1000;
export const BOSS_LASER_SWEEP_DURATION = 2200;
export const BOSS_LASER_SWEEP_WIDTH   = 10;    // px beam width
export const BOSS_DRONE_WINDUP        = 800;
export const BOSS_EMP_WINDUP           = 900;
export const BOSS_EMP_RADIUS           = 130;   // px EMP blast radius
export const BOSS_PLASMA_FAN_WINDUP   = 600;

export const BOSS_HIT_COOLDOWN      = 1000;

// Boss rewards
export const BOSS_XP_REWARD     = 80;           // base XP award
export const BOSS_REWARD_HP     = 10;           // permanent +HP option
export const BOSS_REWARD_DAMAGE = 5;            // permanent +DMG option
export const BOSS_REWARD_SPEED  = 10;           // permanent +SPD option

// Boss colors
export const BOSS_BRUTE_COLOR   = '#d35400';
export const BOSS_WARLOCK_COLOR = '#8e44ad';
export const BOSS_PHANTOM_COLOR    = '#00bcd4';
export const BOSS_JUGGERNAUT_COLOR = '#e67e22';
export const BOSS_OVERLORD_COLOR   = '#00e5ff';

// Boss names
export const BOSS_BRUTE_NAME      = 'The Brute';
export const BOSS_WARLOCK_NAME    = 'The Warlock';
export const BOSS_PHANTOM_NAME    = 'The Phantom';
export const BOSS_JUGGERNAUT_NAME = 'The Juggernaut';
export const BOSS_OVERLORD_NAME   = 'The Overlord';

// Game state
export const STATE_BOSS_VICTORY = 'BOSS_VICTORY';
export const STATE_META_MENU = 'META_MENU';
export const STATE_SETTINGS = 'SETTINGS';
export const STATE_META_SHOP = 'META_SHOP';
export const STATE_SHOP_RUN = 'SHOP_RUN';
export const STATE_ACHIEVEMENTS = 'ACHIEVEMENTS';
export const STATE_LOADOUT = 'LOADOUT';
export const STATE_TALENTS = 'TALENTS';

// ── Shop: Coin Economy ──
export const COIN_REWARD_NORMAL_ENEMY = 1;
export const COIN_REWARD_ELITE_ENEMY  = 3;   // tank + dasher count as "elite"
export const COIN_REWARD_BOSS         = 10;

// ── Meta-Shop Boosters (Core Shards, max 1 per run) ──
export const META_BOOSTERS = {
    meta_booster_shield_pack: {
        id:    'meta_booster_shield_pack',
        name:  'Shield Pack',
        desc:  'Start with 3 shield charges (absorb 3 hits)',
        icon:  '🛡️',
        color: '#00bcd4',
        cost:  12,
        unlock: { stat: 'runsPlayed', value: 5, label: 'Complete 5 runs' },
    },
    meta_booster_weapon_core: {
        id:    'meta_booster_weapon_core',
        name:  'Weapon Core',
        desc:  '+12% Damage until Boss 2',
        icon:  '⚔️',
        color: '#f44336',
        cost:  25,
        unlock: { stat: 'bossesKilledTotal', value: 3, label: 'Kill 3 bosses total' },
    },
    meta_booster_training_manual: {
        id:    'meta_booster_training_manual',
        name:  'Training Manual',
        desc:  '+20% XP gain until Level 5',
        icon:  '📖',
        color: '#9c27b0',
        cost:  10,
        unlock: { stat: 'runsPlayed', value: 3, label: 'Complete 3 runs' },
    },
    meta_booster_panic_button: {
        id:    'meta_booster_panic_button',
        name:  'Panic Button',
        desc:  '1× Revive with 50% HP per run',
        icon:  '💀',
        color: '#ffd700',
        cost:  30,
        unlock: { stat: 'bossesKilledTotal', value: 8, label: 'Kill 8 bosses total' },
    },
    meta_booster_lucky_start: {
        id:    'meta_booster_lucky_start',
        name:  'Lucky Start',
        desc:  'Start the run with 15 bonus coins',
        icon:  '🍀',
        color: '#4caf50',
        cost:  8,
        unlock: { stat: 'runsPlayed', value: 8, label: 'Complete 8 runs' },
    },
    meta_booster_thick_skin: {
        id:    'meta_booster_thick_skin',
        name:  'Thick Skin',
        desc:  '-10% all damage taken (entire run)',
        icon:  '🪨',
        color: '#795548',
        cost:  20,
        unlock: { stat: 'bossesKilledTotal', value: 5, label: 'Kill 5 bosses total' },
    },
    meta_booster_swift_feet: {
        id:    'meta_booster_swift_feet',
        name:  'Swift Feet',
        desc:  '+10% move speed (entire run)',
        icon:  '💨',
        color: '#2196f3',
        cost:  15,
        unlock: { stat: 'highestStage', value: 25, label: 'Reach stage 25' },
    },
    meta_booster_scavenger: {
        id:    'meta_booster_scavenger',
        name:  'Scavenger',
        desc:  '+30% coin drops from all enemies',
        icon:  '🪙',
        color: '#ffab00',
        cost:  22,
        unlock: { stat: 'highestStage', value: 40, label: 'Reach stage 40' },
    },
};
export const META_BOOSTER_IDS = Object.keys(META_BOOSTERS);

// ── In-Run Shop Items (Coins) ──
// ── Coin Drop Economy ──
export const COIN_DROP_CHANCE = 0.35;        // 35% chance normal enemies drop a coin (elites/bosses always drop)
export const COIN_DROP_LIFETIME = 4000;      // 4s before disappearing
export const COIN_DROP_RADIUS = 8;
export const COIN_DROP_BOBBLE_SPEED = 0.005;
export const COIN_MAGNET_RANGE = 50;          // auto-attract range in px

// ── Bomb ──
export const BOMB_RADIUS = 180;              // AoE radius
export const BOMB_DAMAGE_MULT = 2.5;         // × player damage
export const BOMB_STUN_DURATION = 1200;      // ms enemies are stunned
export const BOMB_KNOCKBACK = 22;

export const RUN_SHOP_ITEMS = {
    run_item_max_hp_boost: {
        id:    'run_item_max_hp_boost',
        name:  'Vitality Shard',
        desc:  '+15 Max HP permanently',
        icon:  '💎',
        color: '#4caf50',
        cost:  10,
    },
    run_item_repair_armor: {
        id:    'run_item_repair_armor',
        name:  'Repair Armor',
        desc:  '+1 shield charge',
        icon:  '🔷',
        color: '#00bcd4',
        cost:  12,
    },
    run_item_sharpen_blade: {
        id:    'run_item_sharpen_blade',
        name:  'Sharpen Blade',
        desc:  '+8% Damage (rest of run)',
        icon:  '🗡️',
        color: '#f44336',
        cost:  15,
    },
    run_item_light_boots: {
        id:    'run_item_light_boots',
        name:  'Light Boots',
        desc:  '+5% Speed (rest of run)',
        icon:  '👢',
        color: '#2196f3',
        cost:  15,
    },
    run_item_bomb: {
        id:    'run_item_bomb',
        name:  'Bomb',
        desc:  '1 charge: Big AoE + stun (B key)',
        icon:  '💣',
        color: '#ff9800',
        cost:  10,
    },
    run_item_trap_resist: {
        id:    'run_item_trap_resist',
        name:  'Trap Resist',
        desc:  '-15% spike & lava damage (rest of run)',
        icon:  '🧱',
        color: '#795548',
        cost:  14,
    },
};
export const RUN_SHOP_ITEM_IDS = Object.keys(RUN_SHOP_ITEMS);

// ── Room Types ──
export const ROOM_TYPE_NORMAL   = 'normal';
export const ROOM_TYPE_BOSS     = 'boss';
export const ROOM_TYPE_EVENT    = 'event';
export const ROOM_TYPE_TRAINING = 'training';
export const ROOM_TYPE_DARKNESS = 'darkness';

// ── Darkness Room ──
export const DARKNESS_CONFIG = {
    lightRadius: 130,           // px around player that is visible
    lightEdgeSoftness: 30,      // px feather on the edge of the light
    flickerStrength: 0.015,     // subtle flicker amplitude (0 = none)
    introMessageDuration: 2000, // ms to show "The darkness surrounds you…"
    // Spawn rules
    minStage: 6,                // earliest stage darkness rooms can appear
    spawnChance: 0.08,          // 8% of eligible rooms
    // Reward: bonus XP multiplier for the room
    rewardXPMultiplier: 1.5,    // 1.5× XP for enemies killed in darkness
    rewardHealPercent: 0.10,    // 10% max HP heal on room clear
    // Future scaling hooks (not active yet)
    stageRadiusScale: 0,        // decrease per stage (0 = disabled)
    stageFlickerScale: 0,       // increase per stage (0 = disabled)
};
