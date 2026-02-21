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
export const STATE_LEVEL_UP = 'LEVEL_UP';
export const STATE_GAME_OVER = 'GAME_OVER';

// ── Training ──
export const TRAINING_ENEMY_COUNT = 3;
export const TRAINING_RESPAWN_DELAY = 2000; // ms before dead enemies respawn
