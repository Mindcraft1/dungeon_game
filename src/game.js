import {
    CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE,
    ENEMY_HP, ENEMY_SPEED, ENEMY_DAMAGE, ENEMY_XP,
    STATE_PLAYING, STATE_LEVEL_UP, STATE_GAME_OVER,
} from './constants.js';
import { isDown, wasPressed, getMovement } from './input.js';
import { parseRoom, getEnemySpawns } from './rooms.js';
import { renderRoom } from './render.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Door } from './entities/door.js';
import { renderHUD } from './ui/hud.js';
import { renderLevelUpOverlay, renderGameOverOverlay } from './ui/levelup.js';

export class Game {
    constructor(ctx) {
        this.ctx = ctx;
        this.state = STATE_PLAYING;
        this.stage = 1;
        this.player = null;
        this.enemies = [];
        this.door = null;
        this.grid = null;
        this.controlsHintTimer = 5000; // ms – show controls for 5 s

        this.loadRoom(0);
    }

    // ── Room management ────────────────────────────────────

    loadRoom(templateIndex) {
        const { grid, spawnPos, doorPos } = parseRoom(templateIndex);
        this.grid = grid;

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

        this.door = new Door(doorPos.col, doorPos.row);

        // Enemy count & stat scaling
        const count = Math.min(2 + Math.floor((this.stage - 1) * 0.75), 10);
        const hpScale = 1 + (this.stage - 1) * 0.15;
        const spdScale = 1 + (this.stage - 1) * 0.05;
        const dmgExtra = Math.floor((this.stage - 1) * 0.5);

        const spawns = getEnemySpawns(grid, spawnPos, doorPos, count);
        this.enemies = spawns.map(p => new Enemy(
            p.x, p.y,
            Math.floor(ENEMY_HP * hpScale),
            Math.min(ENEMY_SPEED * spdScale, ENEMY_SPEED * 2),
            ENEMY_DAMAGE + dmgExtra,
        ));
    }

    nextRoom() {
        this.stage++;
        this.loadRoom(this.stage - 1);
    }

    restart() {
        this.stage = 1;
        this.player = null;
        this.state = STATE_PLAYING;
        this.controlsHintTimer = 5000;
        this.loadRoom(0);
    }

    // ── Update ─────────────────────────────────────────────

    update(dt) {
        if (this.controlsHintTimer > 0) this.controlsHintTimer -= dt * 1000;

        switch (this.state) {
            case STATE_PLAYING:  this._updatePlaying(dt); break;
            case STATE_LEVEL_UP: this._updateLevelUp();   break;
            case STATE_GAME_OVER: this._updateGameOver(); break;
        }
    }

    _updatePlaying(dt) {
        const movement = getMovement();
        this.player.update(dt, movement, this.grid);

        // Attack (holding Space auto-attacks with cooldown)
        if (isDown('Space')) {
            this.player.attack(this.enemies);
        }

        // Enemies
        for (const e of this.enemies) {
            e.update(dt, this.player, this.grid, this.enemies);

            if (e.dead && !e.xpGiven) {
                e.xpGiven = true;
                if (this.player.addXp(ENEMY_XP)) {
                    this.state = STATE_LEVEL_UP;
                    return; // pause immediately
                }
            }
        }

        // Door
        this.door.update(dt, this.enemies);
        if (this.door.checkCollision(this.player)) {
            this.nextRoom();
        }

        // Death
        if (this.player.hp <= 0) {
            this.state = STATE_GAME_OVER;
        }
    }

    _updateLevelUp() {
        if (wasPressed('Digit1'))      this.player.levelUp('hp');
        else if (wasPressed('Digit2')) this.player.levelUp('speed');
        else if (wasPressed('Digit3')) this.player.levelUp('damage');
        else return;

        // Chain level-ups
        this.state = this.player.xp >= this.player.xpToNext
            ? STATE_LEVEL_UP
            : STATE_PLAYING;
    }

    _updateGameOver() {
        if (wasPressed('Enter')) this.restart();
    }

    // ── Render ─────────────────────────────────────────────

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        renderRoom(ctx, this.grid);
        this.door.render(ctx);
        for (const e of this.enemies) e.render(ctx);
        this.player.render(ctx);

        // Locked-door hint
        if (this.door.locked && this.door.isPlayerNear(this.player)) {
            const hx = this.door.x + this.door.width / 2;
            const hy = this.door.y - 14;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(hx - 34, hy - 11, 68, 15);
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('LOCKED', hx, hy);
            ctx.textAlign = 'left';
        }

        const alive = this.enemies.filter(e => !e.dead).length;
        renderHUD(ctx, this.player, this.stage, alive);

        // Controls hint
        if (this.controlsHintTimer > 0 && this.state === STATE_PLAYING) {
            const alpha = Math.min(1, this.controlsHintTimer / 1000); // fade out last second
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = '#000';
            ctx.fillRect(CANVAS_WIDTH / 2 - 160, CANVAS_HEIGHT - 42, 320, 28);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#bbb';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('WASD / Arrows = Move    SPACE = Attack', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 24);
            ctx.textAlign = 'left';
            ctx.restore();
        }

        // Overlays
        if (this.state === STATE_LEVEL_UP) {
            renderLevelUpOverlay(ctx, this.player);
        } else if (this.state === STATE_GAME_OVER) {
            renderGameOverOverlay(ctx, this.stage, this.player.level);
        }
    }
}
