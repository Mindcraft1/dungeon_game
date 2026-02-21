import {
    CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE,
    ENEMY_HP, ENEMY_SPEED, ENEMY_DAMAGE, ENEMY_XP,
    TRAINING_ENEMY_COUNT, TRAINING_RESPAWN_DELAY,
    STATE_MENU, STATE_PROFILES, STATE_PLAYING, STATE_LEVEL_UP, STATE_GAME_OVER,
} from './constants.js';
import { isDown, wasPressed, getMovement, getLastKey } from './input.js';
import { parseRoom, parseTrainingRoom, getEnemySpawns } from './rooms.js';
import { renderRoom } from './render.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Door } from './entities/door.js';
import { renderHUD } from './ui/hud.js';
import { renderLevelUpOverlay, renderGameOverOverlay } from './ui/levelup.js';
import { renderMenu } from './ui/menu.js';
import { renderProfiles, MAX_NAME_LEN } from './ui/profiles.js';

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
        this.door = null;
        this.grid = null;
        this.controlsHintTimer = 0;

        // Mode flags
        this.trainingMode = false;
        this.trainingRespawnTimer = 0;

        // Level-up selection
        this.upgradeIndex = 0;

        // Saved real-game state for returning from training
        this._savedGame = null;
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
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.menuIndex = (this.menuIndex + 1) % count;
        }
        if (wasPressed('Enter') || wasPressed('Space')) {
            if (this.menuIndex === 0) {
                this._startGame();
            } else if (this.menuIndex === 1) {
                this._startTraining();
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
        this.controlsHintTimer = 5000;
        this.loadRoom(0);
        this.state = STATE_PLAYING;
    }

    _startTraining() {
        this.trainingMode = true;
        this._savedGame = null;
        this.stage = 0;
        this.player = null;
        this.controlsHintTimer = 6000;
        this._loadTrainingRoom();
        this.state = STATE_PLAYING;
    }

    // ── Room management ────────────────────────────────────

    loadRoom(templateIndex) {
        const { grid, spawnPos, doorPos } = parseRoom(templateIndex);
        this.grid = grid;
        this._placePlayer(spawnPos);
        this.door = new Door(doorPos.col, doorPos.row);
        this._spawnEnemies(grid, spawnPos, doorPos);
    }

    _loadTrainingRoom() {
        const { grid, spawnPos, doorPos } = parseTrainingRoom();
        this.grid = grid;
        this._placePlayer(spawnPos);
        this.door = new Door(doorPos.col, doorPos.row);
        this.trainingRespawnTimer = 0;

        const spawns = getEnemySpawns(grid, spawnPos, doorPos, TRAINING_ENEMY_COUNT);
        this.enemies = spawns.map(p => new Enemy(
            p.x, p.y, ENEMY_HP, ENEMY_SPEED * 0.8, ENEMY_DAMAGE,
        ));
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
        };
        this.trainingMode = true;
        this.stage = 0;
        this.controlsHintTimer = 4000;
        // Keep player stats, move to training room, full heal
        const { grid, spawnPos, doorPos } = parseTrainingRoom();
        this.grid = grid;
        this.player.x = spawnPos.col * TILE_SIZE + TILE_SIZE / 2;
        this.player.y = spawnPos.row * TILE_SIZE + TILE_SIZE / 2;
        this.player.hp = this.player.maxHp;
        this.player.invulnTimer = 0;
        this.player.attackTimer = 0;
        this.player.attackVisualTimer = 0;
        this.door = new Door(doorPos.col, doorPos.row);
        this.trainingRespawnTimer = 0;
        const spawns = getEnemySpawns(grid, spawnPos, doorPos, TRAINING_ENEMY_COUNT);
        this.enemies = spawns.map(p => new Enemy(
            p.x, p.y, ENEMY_HP, ENEMY_SPEED * 0.8, ENEMY_DAMAGE,
        ));
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
    }

    // ── Update ─────────────────────────────────────────────

    update(dt) {
        if (this.controlsHintTimer > 0) this.controlsHintTimer -= dt * 1000;

        switch (this.state) {
            case STATE_MENU:      this._updateMenu();       break;
            case STATE_PROFILES:  this._updateProfiles();   break;
            case STATE_PLAYING:   this._updatePlaying(dt);  break;
            case STATE_LEVEL_UP:  this._updateLevelUp();    break;
            case STATE_GAME_OVER: this._updateGameOver();   break;
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
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.profileCursor = (this.profileCursor + 1) % (maxIdx + 1);
        }

        // Select / Create
        if (wasPressed('Enter') || wasPressed('Space')) {
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

        // Return from training / back to menu (Escape)
        if (wasPressed('Escape')) {
            if (this.trainingMode) {
                this._returnFromTraining();
            } else {
                this.state = STATE_MENU;
                this.menuIndex = 0;
            }
            return;
        }

        const movement = getMovement();
        this.player.update(dt, movement, this.grid);

        // Attack
        if (isDown('Space')) {
            this.player.attack(this.enemies);
        }

        // Enemies
        for (const e of this.enemies) {
            e.update(dt, this.player, this.grid, this.enemies, this.trainingMode);

            if (e.dead && !e.xpGiven) {
                e.xpGiven = true;
                if (!this.trainingMode) {
                    if (this.player.addXp(ENEMY_XP)) {
                        this.state = STATE_LEVEL_UP;
                        return;
                    }
                }
            }
        }

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

        if (this.trainingMode) {
            // In training the door is always open and returns to game/menu
            if (this.door.checkCollision(this.player)) {
                this._returnFromTraining();
            }
        } else {
            if (this.door.checkCollision(this.player)) {
                this.nextRoom();
            }
        }

        // Death (only in real game)
        if (!this.trainingMode && this.player.hp <= 0) {
            this._saveHighscore();
            this.state = STATE_GAME_OVER;
        }
    }

    _respawnTrainingEnemies() {
        this.trainingRespawnTimer = 0;
        const { spawnPos, doorPos } = parseTrainingRoom();
        const spawns = getEnemySpawns(this.grid, spawnPos, doorPos, TRAINING_ENEMY_COUNT);
        this.enemies = spawns.map(p => new Enemy(
            p.x, p.y, ENEMY_HP, ENEMY_SPEED * 0.8, ENEMY_DAMAGE,
        ));
    }

    _updateLevelUp() {
        const choices = ['hp', 'speed', 'damage'];

        // Navigate with W/S or arrows
        if (wasPressed('KeyW') || wasPressed('ArrowUp')) {
            this.upgradeIndex = (this.upgradeIndex - 1 + 3) % 3;
        }
        if (wasPressed('KeyS') || wasPressed('ArrowDown')) {
            this.upgradeIndex = (this.upgradeIndex + 1) % 3;
        }

        // Confirm with Space, Enter, or number keys
        let choice = null;
        if (wasPressed('Space') || wasPressed('Enter')) {
            choice = choices[this.upgradeIndex];
        } else if (wasPressed('Digit1')) { choice = 'hp'; }
        else if (wasPressed('Digit2')) { choice = 'speed'; }
        else if (wasPressed('Digit3')) { choice = 'damage'; }

        if (!choice) return;
        this.player.levelUp(choice);
        this.upgradeIndex = 0;

        // Chain level-ups
        this.state = this.player.xp >= this.player.xpToNext
            ? STATE_LEVEL_UP
            : STATE_PLAYING;
    }

    _updateGameOver() {
        if (wasPressed('Enter') || wasPressed('Space')) this.restart();
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

        renderRoom(ctx, this.grid);
        this.door.render(ctx);
        for (const e of this.enemies) e.render(ctx);
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
        renderHUD(ctx, this.player, this.stage, alive, this.trainingMode);

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
        if (this.state === STATE_LEVEL_UP) {
            renderLevelUpOverlay(ctx, this.player, this.upgradeIndex);
        } else if (this.state === STATE_GAME_OVER) {
            renderGameOverOverlay(ctx, this.stage, this.player.level);
        }
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
        ctx.fillRect(CANVAS_WIDTH / 2 - 210, CANVAS_HEIGHT - 68, 420, 28);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#bbb';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        const hint = this.trainingMode
            ? 'WASD / Arrows = Move    SPACE = Attack    ESC = Exit'
            : 'WASD / Arrows = Move    SPACE = Attack    T = Training';
        ctx.fillText(hint, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
        ctx.textAlign = 'left';
        ctx.restore();
    }
}
