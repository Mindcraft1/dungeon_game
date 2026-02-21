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
export const SHOOTER_INTRO_STAGE = 4;

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
export const TANK_INTRO_STAGE = 8;

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
export const DASHER_INTRO_STAGE = 6;

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

// ── Hazards ──
export const HAZARD_TYPE_SPIKES = 'spikes';
export const HAZARD_TYPE_LAVA   = 'lava';
export const HAZARD_TYPE_ARROW  = 'arrow';

// Intro stages (progressive difficulty)
export const HAZARD_SPIKE_INTRO_STAGE = 3;
export const HAZARD_LAVA_INTRO_STAGE  = 5;
export const HAZARD_ARROW_INTRO_STAGE = 7;

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

// Hazard colors
export const HAZARD_SPIKE_COLOR    = '#8e8e8e';
export const HAZARD_LAVA_COLOR     = '#e25822';
export const HAZARD_LAVA_COLOR2    = '#ff6b35';
export const HAZARD_ARROW_COLOR    = '#ff6b35';

// Pickup type keys
export const PICKUP_RAGE_SHARD = 'rage_shard';
export const PICKUP_HEART_FRAGMENT = 'heart_fragment';
export const PICKUP_PIERCING_SHOT = 'piercing_shot';
export const PICKUP_PHASE_SHIELD = 'phase_shield';
export const PICKUP_SPEED_SURGE = 'speed_surge';
export const PICKUP_SWIFT_BOOTS = 'swift_boots';
export const PICKUP_CRUSHING_BLOW = 'crushing_blow';
export const PICKUP_IRON_SKIN = 'iron_skin';
