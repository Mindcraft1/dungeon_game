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
