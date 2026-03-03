// ── Internationalization (i18n) ─────────────────────────────
// Simple key-based translation system.
// Supports English (en) and German (de).
//
//   import { t } from './i18n.js';
//   t('menu.title')                 → "DUNGEON ROOMS"
//   t('hud.enemies', { n: 5 })      → "Enemies: 5"
//
//   import { td } from './i18n.js';
//   td(weaponObj)                   → German name when lang=de
//   td(weaponObj, 'desc')           → German desc when lang=de
//
// Placeholders use {name} syntax, replaced at runtime.
// ─────────────────────────────────────────────────────────────

import CONTENT_DE from './content_de.js';

const STORAGE_KEY = 'dungeon_language';

let _lang = 'en';

// Attempt to load persisted language
try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'de' || stored === 'en') _lang = stored;
} catch (_) {}

export function getLang() { return _lang; }

export function setLang(lang) {
    if (lang !== 'en' && lang !== 'de') return;
    _lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
}

export function toggleLang() {
    setLang(_lang === 'en' ? 'de' : 'en');
    return _lang;
}

/**
 * Translate a key. Returns the translated string with {placeholders} replaced.
 * Falls back to English, then to the raw key if not found.
 */
export function t(key, params) {
    const table = _lang === 'de' ? DE : EN;
    let str = table[key] ?? EN[key] ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            str = str.replaceAll(`{${k}}`, v);
        }
    }
    return str;
}

/**
 * Translate a data-driven object's field (name, desc, effect, passive, etc.).
 * Looks up the object's `id` in CONTENT_DE when language is German.
 * Falls back to the original English value on the object.
 *
 *   td(weaponObj)            → translated name
 *   td(weaponObj, 'desc')    → translated desc
 *   td(nodeObj, 'effect')    → translated effect
 */
export function td(obj, field = 'name') {
    if (!obj) return '';
    if (_lang === 'de') {
        const entry = CONTENT_DE[obj.id];
        if (entry && entry[field] !== undefined) return entry[field];
    }
    return obj[field] ?? '';
}

/**
 * Translate a data-driven object by raw id string + field.
 * Useful when you only have the id, not the full object.
 *
 *   tdId('sword', 'name')   → 'Schwert' when de
 */
export function tdId(id, field = 'name', fallback = '') {
    if (_lang === 'de') {
        const entry = CONTENT_DE[id];
        if (entry && entry[field] !== undefined) return entry[field];
    }
    return fallback;
}

// ─────────────────────────────────────────────────────────────
//  ENGLISH
// ─────────────────────────────────────────────────────────────
const EN = {
    // ── General ──
    'on': 'ON',
    'off': 'OFF',
    'back': 'BACK',
    'skip': 'Skip',
    'confirm': 'Confirm',
    'cancel': 'Cancel',
    'stage': 'Stage',
    'level': 'Level',
    'max': 'MAX',

    // ── Main Menu ──
    'menu.title': 'DUNGEON ROOMS',
    'menu.subtitle': 'Clear every room. Level up. Survive.',
    'menu.best': '★ Best: Stage {n}',
    'menu.highscore': '★ Highscore: Stage {n}',
    'menu.start': 'START GAME',
    'menu.start.desc': 'Fight through dungeon rooms',
    'menu.meta': 'META PROGRESS',
    'menu.meta.desc': 'Perks, Relics & Stats  ·  ◆ {n}',
    'menu.shop': 'SHOP',
    'menu.shop.desc': 'Boosters for your next run',
    'menu.achievements': 'ACHIEVEMENTS',
    'menu.achievements.desc': 'View your trophies & milestones',
    'menu.characters': 'CHARACTERS',
    'menu.characters.desc': 'Create & switch player profiles',
    'menu.training': 'TRAINING',
    'menu.training.desc': 'Practice without taking damage',
    'menu.settings': 'SETTINGS',
    'menu.settings.desc': 'Audio, controls & preferences',
    'menu.controls': 'W/S or ↑/↓ to select  ·  ENTER or Click to confirm',

    // ── Settings ──
    'settings.title': 'SETTINGS',
    'settings.subtitle': 'Configure audio, controls & gameplay',
    'settings.sfx': 'SOUND EFFECTS',
    'settings.sfx.desc': 'Toggle game sound effects',
    'settings.music': 'MUSIC',
    'settings.music.desc': 'Toggle background music',
    'settings.rooms': 'ROOMS',
    'settings.rooms.procedural': 'PROCEDURAL',
    'settings.rooms.predefined': 'PREDEFINED',
    'settings.rooms.desc.proc': 'Rooms are randomly generated each run',
    'settings.rooms.desc.pre': 'Rooms use handcrafted layouts',
    'settings.dmgNumbers': 'DAMAGE NUMBERS',
    'settings.dmgNumbers.desc': 'Show floating damage numbers on hit',
    'settings.mouseAim': 'MOUSE AIM',
    'settings.mouseAim.desc': 'Aim toward mouse cursor (LMB=Attack, RMB=Dash, MMB=Dagger)',
    'settings.language': 'LANGUAGE',
    'settings.language.desc': 'Switch display language',
    'settings.back.desc.pause': 'Return to game',
    'settings.back.desc.menu': 'Return to main menu',
    'settings.keys.title': '─── KEY BINDINGS ───',
    'settings.keys.move': 'Move',
    'settings.keys.attack': 'Melee Attack',
    'settings.keys.dash': 'Dash / Roll',
    'settings.keys.dagger': 'Throw Dagger',
    'settings.keys.abilities': 'Abilities 1 & 2',
    'settings.keys.bomb': 'Use Bomb',
    'settings.keys.talents': 'Talent Tree',
    'settings.keys.pause': 'Pause',
    'settings.keys.reroll': 'Reroll (Level-Up)',
    'settings.keys.metaMenu': 'Meta Menu (Game Over)',
    'settings.keys.quickPick': 'Quick Pick (Level-Up)',
    'settings.keys.delete': 'Delete (Profiles)',
    'settings.hint': 'W/S to navigate  ·  ENTER/Click to toggle  ·  ESC/RMB = Back',

    // ── Profiles ──
    'profiles.title': 'CHARACTERS',
    'profiles.subtitle': 'Select who is playing',
    'profiles.active': '● ACTIVE',
    'profiles.noRuns': 'No runs yet',
    'profiles.best': '★ Stage {n}',
    'profiles.new': '+ NEW CHARACTER',
    'profiles.hint': 'W/S = Navigate  ·  ENTER/Click = Select  ·  C = Color  ·  H = Hat  ·  X = Delete  ·  ESC/RMB = Back',
    'profiles.create.title': 'NEW CHARACTER',
    'profiles.create.prompt': 'Type a name:',
    'profiles.create.hint': 'ENTER = Confirm  ·  ESC/RMB = Cancel',
    'profiles.class.title': 'CHOOSE YOUR CLASS',
    'profiles.class.for': 'for "{name}"',
    'profiles.class.passive': 'PASSIVE',
    'profiles.class.hint': 'A/D or Arrows = Navigate  ·  ENTER/Click = Confirm  ·  ESC/RMB = Back',
    'profiles.delete.title': 'DELETE CHARACTER?',
    'profiles.delete.warn': 'All progress will be permanently lost!',
    'profiles.delete.hint': 'ENTER/Click = Delete  ·  ESC/RMB = Cancel',
    'profiles.color.title': 'CHOOSE COLOR',
    'profiles.color.for': 'for "{name}"',
    'profiles.color.hint': 'WASD/Arrows = Navigate  ·  ENTER/Click = Confirm  ·  ESC/RMB = Cancel',
    'profiles.hat.title': 'CHOOSE HAT',
    'profiles.hat.for': 'for "{name}"',
    'profiles.hat.unlocked': '✓ Unlocked',
    'profiles.hat.hint': 'WASD/Arrows = Navigate  ·  ENTER/Click = Confirm  ·  ESC/RMB = Cancel',

    // ── HUD ──
    'hud.hp': 'HP {hp}/{max}',
    'hud.hpOver': 'HP {hp}+{over}/{max}',
    'hud.xp': 'XP {xp}/{next}',
    'hud.lvl': 'LVL {n}',
    'hud.training': 'TRAINING',
    'hud.stage': 'Stage {n}',
    'hud.enemies': 'Enemies: {n}',
    'hud.bossFight': 'BOSS FIGHT!',
    'hud.doorOpen': 'Door open!',
    'hud.dashReady': 'DASH ✓',
    'hud.dash': 'DASH',
    'hud.daggerReady': 'DAGGER ✓',
    'hud.dagger': 'DAGGER',
    'hud.dmg': 'DMG {n}',
    'hud.spd': 'SPD {n}',
    'hud.kill': '{n}× Kill',
    'hud.phase2': '⚡ PHASE 2 ⚡',

    // ── Combo tiers ──
    'combo.nice': 'Nice!',
    'combo.combo': 'Combo!',
    'combo.rampage': 'Rampage!',
    'combo.unstoppable': 'UNSTOPPABLE!',

    // ── Level-Up ──
    'levelup.title': '{icon} ROOM REWARD',
    'levelup.rating': '{tier} rating  ·  Lv {level}',
    'levelup.hp': '+{n} Max HP  (heal +{heal})',
    'levelup.speed': '+{n} Speed',
    'levelup.damage': '+{n} Damage',
    'levelup.spaceConfirm': 'Press SPACE again to confirm',
    'levelup.hint': 'W/S to select  ·  Click / ENTER / 1-3 to confirm',
    'levelup.hintReroll': 'W/S to select  ·  Click / ENTER / 1-3 to confirm  ·  R to Reroll ({n})',

    // ── Game Over ──
    'gameover.title': 'GAME OVER',
    'gameover.stats': 'Stage {stage}  ·  Level {level}',
    'gameover.bosses': 'Bosses Defeated: {n}',
    'gameover.shards': '◆ Core Shards Gained: +{n}',
    'gameover.relic': 'Relic Unlocked!',
    'gameover.unlocks': '── UNLOCKED THIS RUN ──',
    'gameover.effects': 'ACTIVE EFFECTS AT DEATH',
    'gameover.hint': 'Press ENTER or Click for menu',
    'gameover.metaHint': 'G = Meta Progress',

    // ── Boss Victory ──
    'boss.victory': 'BOSS DEFEATED!',
    'boss.healReward': '✦ Full Heal + Choose Permanent Reward ✦',
    'boss.shards': '◆ +{n} Core Shards',
    'boss.relicUnlock': '{icon} Relic Unlocked: {name}',
    'boss.upgradeUnlock': '{icon} New Upgrade: {name}',
    'boss.combatUnlock': '{icon} {type} Unlocked: {name}',
    'boss.reward.hp': '+{n} Max HP  (permanent)',
    'boss.reward.dmg': '+{n} Damage  (permanent)',
    'boss.reward.spd': '+{n} Speed  (permanent)',
    'boss.reward.hint': 'W/S to select  ·  Click / ENTER / 1-3 to confirm',

    // ── Pause ──
    'pause.title': 'PAUSED',
    'pause.info': '{biome}Stage {stage}  ·  Level {level}',
    'pause.resume': 'RESUME',
    'pause.settings': 'SETTINGS',
    'pause.quit': 'BACK TO MENU',
    'pause.quickResume': 'P = Quick Resume',
    'pause.effects': 'ACTIVE EFFECTS',
    'pause.moreEffects': '…more effects',

    // ── In-game tooltips / banners ──
    'tooltip.locked': 'LOCKED',
    'tooltip.defeatBoss': 'DEFEAT THE BOSS',
    'tooltip.exit': 'EXIT (or ESC)',
    'banner.training': 'TRAINING MODE',
    'banner.trainingHint': 'ESC = Back to menu  |  Door = Exit',
    'banner.secondWave': '⚔ SECOND WAVE ⚔',
    'banner.secondWaveDesc': 'More enemies incoming!',
    'banner.respawn': 'Enemies respawn in {n}s',
    'banner.trial': '⚔️ TRIAL — Survive: {n}s',
    'banner.reroll': '🔄 Reroll ×{n}',
    'banner.talentPoint': '🌟 {n} Talent point{s} available! (T)',
    'banner.achievement': '{icon}  ACHIEVEMENT: {text}',
    'controls.training': 'WASD=Move  SPACE/LMB=Attack  N/MMB=Throw  M/RMB=Dash  Q/E=Ability  ESC=Exit',
    'controls.playing': 'WASD=Move  SPACE/LMB=Attack  N/MMB=Throw  M/RMB=Dash  Q/E=Ability  P=Pause',
    'reward.coins': '🪙 {n} Coins',
    'reward.walkHint': 'Walk to rewards · Space to claim · Door to continue',

    // ── Loadout ──
    'loadout.title': '⚔  LOADOUT  ⚔',
    'loadout.subtitle': 'Choose abilities & passives for your run',
    'loadout.subtitleTraining': 'Choose abilities & passives for training',
    'loadout.abilities': '── ACTIVE ABILITIES ──  (max 2)',
    'loadout.passives': '── PASSIVE EFFECTS ──  (max 2)',
    'loadout.weapon': '── WEAPON ──  (A/D to change)',
    'loadout.startRun': '▶  START RUN',
    'loadout.startTraining': '▶  START TRAINING',
    'loadout.needAbility': 'Select at least 1 ability',
    'loadout.hint': 'W/S Navigate  ·  A/D Weapon  ·  Click/SPACE Select  ·  ENTER Start  ·  ESC/RMB Back',

    // ── Run Shop ──
    'shop.title': 'SHOP',
    'shop.coins': '🪙 Coins: {n}',
    'shop.stage': 'Stage {n}',
    'shop.buy': '[ENTER] Buy',
    'shop.cantAfford': 'Not enough coins',
    'shop.forgeToken': '🔨 Forge Token',
    'shop.forgeDesc': 'Pick any upgrade from the pool ({cost} coins)',
    'shop.continue': 'CONTINUE',
    'shop.hint': 'W/S = Select  ·  ENTER/Click = Buy  ·  ESC/RMB = Continue',
    'shop.current': 'current: {n}',
    'shop.charges': 'charges: {n}',

    // ── Meta Shop (Boosters) ──
    'metashop.title': 'BOOSTER SHOP',
    'metashop.shards': '◆ Core Shards: {n}',
    'metashop.subtitle': 'Choose 1 booster for your next run (purchased immediately)',
    'metashop.selected': '✓ Selected: {name}',
    'metashop.owned': '✓ OWNED',
    'metashop.buy': '[ENTER] Buy',
    'metashop.clear': 'CLEAR SELECTION (refund)',
    'metashop.hint': 'W/A/S/D = Select  ·  ENTER/Click = Buy  ·  ESC/RMB = Back',

    // ── Talent Tree ──
    'talents.title': 'TALENT TREE',
    'talents.points': 'Points: {available} available  ({spent}/{total} spent)',
    'talents.upgradeHint': 'Press ENTER to upgrade',
    'talents.maxRank': 'MAX RANK',
    'talents.hint': 'WASD/Arrows = Navigate  ·  ENTER = Upgrade  ·  T/ESC = Close',

    // ── Buff Summary ──
    'buffs.header': 'MODIFIERS',

    // ── Boss Scroll ──
    'scroll.title': '📜 ANCIENT SCROLL',
    'scroll.subtitle': 'Choose one permanent unlock:',
    'scroll.ability': 'ABILITY',
    'scroll.passive': 'PASSIVE',
    'scroll.node': 'NODE',
    'scroll.hint': 'W/S Navigate · ENTER/Click Confirm',

    // ── Meta Menu ──
    'metamenu.title': 'META PROGRESS',
    'metamenu.shards': '◆ Core Shards: {n}',
    'metamenu.perks': 'PERKS',
    'metamenu.relics': 'RELICS',
    'metamenu.stats': 'STATS',
    'metamenu.buy': '[ENTER] Buy',
    'metamenu.hint': 'A/D = Tab  ·  W/S = Select  ·  ENTER/Click = Buy  ·  ESC/RMB = Back',
    'metamenu.runsPlayed': 'Runs Played',
    'metamenu.bossesKilled': 'Bosses Killed',
    'metamenu.highestStage': 'Highest Stage',
    'metamenu.totalShards': 'Total Core Shards',
    'metamenu.shardsSpent': 'Shards Spent',
    'metamenu.relicsFound': 'Relics Found',

    // ── Achievements ──
    'achievements.title': 'ACHIEVEMENTS',
    'achievements.count': '{n} / {total} Unlocked',
    'achievements.all': 'All',
    'achievements.more.up': '▲ more ▲',
    'achievements.more.down': '▼ more ▼',
    'achievements.hint': 'W/S = Navigate  ·  A/D/Click = Filter  ·  ESC/RMB = Back',

    // ── Training Config ──
    'trainconfig.title': 'TRAINING CONFIG',
    'trainconfig.subtitle': 'Choose your training setup',
    'trainconfig.room': 'ROOM',
    'trainconfig.enemies': 'ENEMIES',
    'trainconfig.count': 'COUNT',
    'trainconfig.damage': 'DAMAGE',
    'trainconfig.drops': 'DROPS',
    'trainconfig.start': 'START',
    'trainconfig.hint': 'W/S = Navigate   A/D = Change   ENTER/Click = Start   ESC/RMB = Back',
    'trainconfig.enemyAll': 'All',
    'trainconfig.enemyBasic': 'Basic',
    'trainconfig.enemyShooter': 'Shooter',
    'trainconfig.enemyDasher': 'Dasher',
    'trainconfig.enemyTank': 'Tank',

    // ── Cheat badges ──
    'cheat.god': 'GOD',
    'cheat.oneHit': '1HIT',
    'cheat.xp': 'XP×10',
    'cheat.dev': '🛠️ DEV',
    'cheat.noProgress': '⛔ NO PROGRESS',

    // ── Event System ──
    'event.pressEnter': 'Press ENTER to continue',
    'event.hint': 'W/S Navigate · ENTER/Click Select · ESC/RMB Skip',
    'event.skipped': 'Skipped.',
    'event.tokenAcquired': '✦ {name} Token acquired!',
    'event.nothing': 'Nothing to modify.',
    'event.chooseCategory': 'Choose a category to upgrade:',
    'event.chooseReplace': 'Choose an upgrade to replace:',
    'event.leave': 'Leave',
    'event.acceptTrial': '⚔️ Accept the Trial — Survive 18s for a Forge Token',
    'event.declineTrial': 'Decline — Skip this room',
    'event.forgeToken': '🔨 Forge Token ({cost} coins) — Pick an upgrade',
    'event.rerollToken': '🔄 Reroll Token ({cost} coins) — Reroll next level-up',
    'event.sacrificeHP': '💀 Sacrifice 15% HP → Choose rare upgrade',
    'event.skip': 'Skip',
    'event.survive': 'Survive: {secs}s',
    'event.defeatOrSurvive': 'Defeat the enemies or survive the timer!',
    'event.applied': '✦ {icon} {name} applied!',
    // Event names
    'event.name.forge': 'Ancient Forge',
    'event.name.shrine': 'Ritual Shrine',
    'event.name.library': 'Mystic Library',
    'event.name.chaos': 'Chaos Altar',
    'event.name.trial': 'Trial Room',
    'event.name.trader': 'Wandering Trader',
    // Event descriptions
    'event.desc.forge': 'Choose a category, then pick an upgrade.',
    'event.desc.shrine': 'Power at a cost... or play it safe.',
    'event.desc.library': 'Replace one upgrade with a new one.',
    'event.desc.chaos': 'Gamble for power.',
    'event.desc.trial': 'Survive the challenge for a Forge Token.',
    'event.desc.trader': 'Trade coins for upgrade tokens.',

    // ── Misc data-driven labels ──
    'type.ability': 'Ability',
    'type.passive': 'Passive',
    'type.node': 'Node',

    // ── Effect categories (pause screen) ──
    'cat.abilities': 'Abilities',
    'cat.passives': 'Passives',
    'cat.upgrades': 'Upgrades',
    'cat.runUpgrades': 'Run Upgrades',
    'cat.relics': 'Relics',
    'cat.booster': 'Booster',
    'cat.biome': 'Biome',
    'cat.pickups': 'Pickups',
    'cat.talents': 'Talents',

    // ── Key aliases (code uses these keys) ──

    // Menu descriptions
    'menu.startDesc': 'Fight through dungeon rooms',
    'menu.metaDesc': 'Perks, Relics & Stats  ·  ◆ {n}',
    'menu.shopDesc': 'Boosters for your next run',
    'menu.achievementsDesc': 'View your trophies & milestones',
    'menu.charactersDesc': 'Create & switch player profiles',
    'menu.trainingDesc': 'Practice without taking damage',
    'menu.settingsDesc': 'Audio, controls & preferences',

    // HUD - combo aliases
    'hud.comboNice': 'Nice!',
    'hud.combo': 'Combo!',
    'hud.comboRampage': 'Rampage!',
    'hud.comboUnstoppable': 'UNSTOPPABLE!',
    'hud.killChain': '{n}× Kill',

    // Level-Up aliases
    'levelup.confirmHint': 'Press SPACE again to confirm',
    'levelup.selectHint': 'W/S to select  ·  Click / ENTER / 1-3 to confirm',
    'levelup.reroll': 'W/S to select  ·  Click / ENTER / 1-3 to confirm  ·  R to Reroll ({n})',

    // Game Over aliases
    'gameover.info': 'Stage {stage}  ·  Level {level}',
    'gameover.relicUnlocked': 'Relic Unlocked!',
    'gameover.unlockedThisRun': '── UNLOCKED THIS RUN ──',
    'gameover.activeEffects': 'ACTIVE EFFECTS AT DEATH',
    'gameover.menuHint': 'Press ENTER or Click for menu',

    // Boss Victory aliases
    'boss.defeated': 'BOSS DEFEATED!',
    'boss.rewardSubtitle': '✦ Full Heal + Choose Permanent Reward ✦',
    'boss.shardsGained': '◆ +{n} Core Shards',
    'boss.relicUnlocked': '{icon} Relic Unlocked: {name}',
    'boss.newUpgrade': '{icon} New Upgrade: {name}',
    'boss.ability': 'Ability',
    'boss.passive': 'Passive',
    'boss.rewardHP': '+{n} Max HP  (permanent)',
    'boss.rewardDamage': '+{n} Damage  (permanent)',
    'boss.rewardSpeed': '+{n} Speed  (permanent)',

    // Profiles aliases
    'profiles.bestStage': '★ Stage {n}',
    'profiles.newChar': '+ NEW CHARACTER',
    'profiles.controls': 'W/S = Navigate  ·  ENTER/Click = Select  ·  C = Color  ·  H = Hat  ·  X = Delete  ·  ESC/RMB = Back',
    'profiles.newCharTitle': 'NEW CHARACTER',
    'profiles.typeName': 'Type a name:',
    'profiles.confirmCancel': 'ENTER = Confirm  ·  ESC/RMB = Cancel',
    'profiles.chooseClass': 'CHOOSE YOUR CLASS',
    'profiles.forName': 'for "{name}"',
    'profiles.passive': 'PASSIVE',
    'profiles.classControls': 'A/D or Arrows = Navigate  ·  ENTER/Click = Confirm  ·  ESC/RMB = Back',
    'profiles.deleteTitle': 'DELETE CHARACTER?',
    'profiles.deleteWarning': 'All progress will be permanently lost!',
    'profiles.deleteControls': 'ENTER/Click = Delete  ·  ESC/RMB = Cancel',
    'profiles.chooseColor': 'CHOOSE COLOR',
    'profiles.pickerControls': 'WASD/Arrows = Navigate  ·  ENTER/Click = Confirm  ·  ESC/RMB = Cancel',
    'profiles.chooseHat': 'CHOOSE HAT',
    'profiles.unlocked': '✓ Unlocked',

    // Loadout aliases
    'loadout.activeAbilities': '── ACTIVE ABILITIES ──  (max 2)',
    'loadout.passiveEffects': '── PASSIVE EFFECTS ──  (max 2)',
    'loadout.selectAbility': 'Select at least 1 ability',
    'loadout.controls': 'W/S Navigate  ·  A/D Weapon  ·  Click/SPACE Select  ·  ENTER Start  ·  ESC/RMB Back',
    'loadout.reachStage': 'Reach stage {n} to unlock',
    'loadout.weapon': '── WEAPON ──  (A/D to change)',
    'loadout.startRun': '▶  START RUN',
    'loadout.startTraining': '▶  START TRAINING',

    // Run Shop aliases
    'runShop.title': 'SHOP',
    'runShop.coins': '🪙 Coins: {n}',
    'runShop.buy': '[ENTER] Buy',
    'runShop.notEnough': 'Not enough coins',
    'runShop.forgeToken': '🔨 Forge Token',
    'runShop.forgeDesc': 'Pick any upgrade from the pool ({cost} coins)',
    'runShop.continue': 'CONTINUE',
    'runShop.controls': 'W/S = Select  ·  ENTER/Click = Buy  ·  ESC/RMB = Continue',

    // Meta Shop aliases
    'metaShop.title': 'BOOSTER SHOP',
    'metaShop.shards': '◆ Core Shards: {n}',
    'metaShop.subtitle': 'Choose 1 booster for your next run (purchased immediately)',
    'metaShop.selected': '✓ Selected: {name}',
    'metaShop.owned': '✓ OWNED',
    'metaShop.notEnoughShards': 'Not enough Core Shards',
    'metaShop.alreadyHave': 'Already owned',
    'metaShop.clearSelection': 'CLEAR SELECTION (refund)',
    'metaShop.controls': 'W/A/S/D = Select  ·  ENTER/Click = Buy  ·  ESC/RMB = Back',

    // Talent aliases
    'talents.noPoints': 'No talent points available',
    'talents.requiresPrev': 'Requires previous talent',
    'talents.controls': 'WASD/Arrows = Navigate  ·  ENTER = Upgrade  ·  T/ESC = Close',

    // Buff Summary alias
    'buffSummary.title': 'MODIFIERS',

    // Boss Scroll aliases
    'bossScroll.title': '📜 ANCIENT SCROLL',
    'bossScroll.subtitle': 'Choose one permanent unlock:',
    'bossScroll.ability': 'ABILITY',
    'bossScroll.passive': 'PASSIVE',
    'bossScroll.node': 'NODE',
    'bossScroll.controls': 'W/S Navigate · ENTER/Click Confirm',

    // Meta Menu aliases
    'metaMenu.title': 'META PROGRESS',
    'metaMenu.shards': '◆ Core Shards: {n}',
    'metaMenu.perks': 'PERKS',
    'metaMenu.relics': 'RELICS',
    'metaMenu.stats': 'STATS',
    'metaMenu.controls': 'A/D = Tab  ·  W/S = Select  ·  ENTER/Click = Buy  ·  ESC/RMB = Back',
    'metaMenu.bosses': 'Bosses Defeated: {n}',
    'metaMenu.shardsLabel': '◆ Shards: +{n}',
    'metaMenu.relic': 'Relic: {name}',
    'metaMenu.new': 'NEW!',
    'metaMenu.runSummary': '── LAST RUN ──',
    'metaMenu.relicsUnlocked': 'Relics Unlocked',
    'metaMenu.runUpgrades': '── RUN UPGRADES ──',
    'metaMenu.nextUnlock': 'Next unlock at stage {n}',
    'metaMenu.defeatBosses': 'Defeat bosses to unlock perks & relics',
    'metaMenu.statRuns': 'Runs Played',
    'metaMenu.statBosses': 'Bosses Killed',
    'metaMenu.statHighest': 'Highest Stage',
    'metaMenu.statTotalShards': 'Total Core Shards',
    'metaMenu.statSpent': 'Shards Spent',
    'metaMenu.statRelics': 'Relics Found',

    // Achievements aliases
    'achievements.unlocked': '{n} / {total} Unlocked',
    'achievements.none': 'No achievements yet',
    'achievements.controls': 'W/S = Navigate  ·  A/D/Click = Filter  ·  ESC/RMB = Back',

    // Training Config aliases
    'trainingConfig.title': 'TRAINING CONFIG',
    'trainingConfig.subtitle': 'Choose your training setup',
    'trainingConfig.room': 'ROOM',
    'trainingConfig.enemies': 'ENEMIES',
    'trainingConfig.count': 'COUNT',
    'trainingConfig.damage': 'DAMAGE',
    'trainingConfig.drops': 'DROPS',
    'trainingConfig.on': 'ON',
    'trainingConfig.off': 'OFF',
    'trainingConfig.start': 'START',
    'trainingConfig.controls': 'W/S = Navigate   A/D = Change   ENTER/Click = Start   ESC/RMB = Back',

    // Cheat alias
    'cheat.xpBoost': 'XP×10',

    // ── Unlock toasts ──
    'unlock.ability': 'Ability',
    'unlock.passive': 'Passive',
    'unlock.node': 'Node',
    'unlock.achievement': 'Achievement Unlock',

    // ── Events ──
    'event.skipKeep': 'Skip (keep removal)',

    // ── Entity Chrome ──
    'entity.sold': 'SOLD',
    'entity.buy': '[SPACE] Buy',
    'entity.heal': 'Heal',
    'entity.empty': 'Empty',
    'entity.healPrompt': '[SPACE] Heal',
    'entity.reward': 'REWARD',
    'room.rewards': '🏆 REWARDS',
    'room.rewardsHint': 'Claim your rewards · Door to continue',
    'room.darkness': '🌑  The darkness surrounds you…',
};

// ─────────────────────────────────────────────────────────────
//  GERMAN
// ─────────────────────────────────────────────────────────────
const DE = {
    // ── Allgemein ──
    'on': 'AN',
    'off': 'AUS',
    'back': 'ZURÜCK',
    'skip': 'Überspringen',
    'confirm': 'Bestätigen',
    'cancel': 'Abbrechen',
    'stage': 'Stufe',
    'level': 'Level',
    'max': 'MAX',

    // ── Hauptmenü ──
    'menu.title': 'DUNGEON ROOMS',
    'menu.subtitle': 'Räume jeden Raum. Steige auf. Überlebe.',
    'menu.best': '★ Bestes: Stufe {n}',
    'menu.highscore': '★ Highscore: Stufe {n}',
    'menu.start': 'SPIEL STARTEN',
    'menu.start.desc': 'Kämpfe durch Dungeon-Räume',
    'menu.meta': 'META-FORTSCHRITT',
    'menu.meta.desc': 'Perks, Relikte & Stats  ·  ◆ {n}',
    'menu.shop': 'LADEN',
    'menu.shop.desc': 'Booster für deinen nächsten Run',
    'menu.achievements': 'ERRUNGENSCHAFTEN',
    'menu.achievements.desc': 'Deine Trophäen & Meilensteine',
    'menu.characters': 'CHARAKTERE',
    'menu.characters.desc': 'Profile erstellen & wechseln',
    'menu.training': 'TRAINING',
    'menu.training.desc': 'Üben ohne Schaden zu nehmen',
    'menu.settings': 'EINSTELLUNGEN',
    'menu.settings.desc': 'Audio, Steuerung & Optionen',
    'menu.controls': 'W/S oder ↑/↓ = Wählen  ·  ENTER oder Klick = Bestätigen',

    // ── Einstellungen ──
    'settings.title': 'EINSTELLUNGEN',
    'settings.subtitle': 'Audio, Steuerung & Spieloptionen',
    'settings.sfx': 'SOUNDEFFEKTE',
    'settings.sfx.desc': 'Soundeffekte ein-/ausschalten',
    'settings.music': 'MUSIK',
    'settings.music.desc': 'Hintergrundmusik ein-/ausschalten',
    'settings.rooms': 'RÄUME',
    'settings.rooms.procedural': 'PROZEDURAL',
    'settings.rooms.predefined': 'VORGEFERTIGT',
    'settings.rooms.desc.proc': 'Räume werden zufällig generiert',
    'settings.rooms.desc.pre': 'Räume verwenden vorgefertigte Layouts',
    'settings.dmgNumbers': 'SCHADENSZAHLEN',
    'settings.dmgNumbers.desc': 'Schwebende Schadenszahlen anzeigen',
    'settings.mouseAim': 'MAUS-ZIELEN',
    'settings.mouseAim.desc': 'Zum Mauszeiger zielen (LMT=Angriff, RMT=Ausweichen, MMT=Dolch)',
    'settings.language': 'SPRACHE',
    'settings.language.desc': 'Anzeigesprache wechseln',
    'settings.back.desc.pause': 'Zurück zum Spiel',
    'settings.back.desc.menu': 'Zurück zum Hauptmenü',
    'settings.keys.title': '─── TASTENBELEGUNG ───',
    'settings.keys.move': 'Bewegen',
    'settings.keys.attack': 'Nahkampf',
    'settings.keys.dash': 'Ausweichen',
    'settings.keys.dagger': 'Dolch werfen',
    'settings.keys.abilities': 'Fähigkeiten 1 & 2',
    'settings.keys.bomb': 'Bombe benutzen',
    'settings.keys.talents': 'Talentbaum',
    'settings.keys.pause': 'Pause',
    'settings.keys.reroll': 'Neu würfeln (Level-Up)',
    'settings.keys.metaMenu': 'Meta-Menü (Game Over)',
    'settings.keys.quickPick': 'Schnellwahl (Level-Up)',
    'settings.keys.delete': 'Löschen (Profile)',
    'settings.hint': 'W/S = Navigieren  ·  ENTER/Klick = Umschalten  ·  ESC/RMT = Zurück',

    // ── Profile ──
    'profiles.title': 'CHARAKTERE',
    'profiles.subtitle': 'Wähle deinen Charakter',
    'profiles.active': '● AKTIV',
    'profiles.noRuns': 'Noch keine Runs',
    'profiles.best': '★ Stufe {n}',
    'profiles.new': '+ NEUER CHARAKTER',
    'profiles.hint': 'W/S = Navigieren  ·  ENTER/Klick = Wählen  ·  C = Farbe  ·  H = Hut  ·  X = Löschen  ·  ESC/RMT = Zurück',
    'profiles.create.title': 'NEUER CHARAKTER',
    'profiles.create.prompt': 'Namen eingeben:',
    'profiles.create.hint': 'ENTER = Bestätigen  ·  ESC/RMT = Abbrechen',
    'profiles.class.title': 'WÄHLE DEINE KLASSE',
    'profiles.class.for': 'für „{name}"',
    'profiles.class.passive': 'PASSIV',
    'profiles.class.hint': 'A/D oder Pfeile = Navigieren  ·  ENTER/Klick = Bestätigen  ·  ESC/RMT = Zurück',
    'profiles.delete.title': 'CHARAKTER LÖSCHEN?',
    'profiles.delete.warn': 'Aller Fortschritt geht unwiderruflich verloren!',
    'profiles.delete.hint': 'ENTER/Klick = Löschen  ·  ESC/RMT = Abbrechen',
    'profiles.color.title': 'FARBE WÄHLEN',
    'profiles.color.for': 'für „{name}"',
    'profiles.color.hint': 'WASD/Pfeile = Navigieren  ·  ENTER/Klick = Bestätigen  ·  ESC/RMT = Abbrechen',
    'profiles.hat.title': 'HUT WÄHLEN',
    'profiles.hat.for': 'für „{name}"',
    'profiles.hat.unlocked': '✓ Freigeschaltet',
    'profiles.hat.hint': 'WASD/Pfeile = Navigieren  ·  ENTER/Klick = Bestätigen  ·  ESC/RMT = Abbrechen',

    // ── HUD ──
    'hud.hp': 'LP {hp}/{max}',
    'hud.hpOver': 'LP {hp}+{over}/{max}',
    'hud.xp': 'EP {xp}/{next}',
    'hud.lvl': 'LVL {n}',
    'hud.training': 'TRAINING',
    'hud.stage': 'Stufe {n}',
    'hud.enemies': 'Gegner: {n}',
    'hud.bossFight': 'BOSSKAMPF!',
    'hud.doorOpen': 'Tür offen!',
    'hud.dashReady': 'SPRINT ✓',
    'hud.dash': 'SPRINT',
    'hud.daggerReady': 'DOLCH ✓',
    'hud.dagger': 'DOLCH',
    'hud.dmg': 'SCH {n}',
    'hud.spd': 'GES {n}',
    'hud.kill': '{n}× Kill',
    'hud.phase2': '⚡ PHASE 2 ⚡',

    // ── Combo-Stufen ──
    'combo.nice': 'Stark!',
    'combo.combo': 'Kombo!',
    'combo.rampage': 'Amoklauf!',
    'combo.unstoppable': 'UNAUFHALTBAR!',

    // ── Level-Up ──
    'levelup.title': '{icon} RAUMBELOHNUNG',
    'levelup.rating': '{tier}-Wertung  ·  Lv {level}',
    'levelup.hp': '+{n} Max LP  (Heilung +{heal})',
    'levelup.speed': '+{n} Tempo',
    'levelup.damage': '+{n} Schaden',
    'levelup.spaceConfirm': 'Erneut LEERTASTE zum Bestätigen',
    'levelup.hint': 'W/S = Wählen  ·  Klick / ENTER / 1-3 = Bestätigen',
    'levelup.hintReroll': 'W/S = Wählen  ·  Klick / ENTER / 1-3 = Bestätigen  ·  R = Neu würfeln ({n})',

    // ── Game Over ──
    'gameover.title': 'SPIEL VORBEI',
    'gameover.stats': 'Stufe {stage}  ·  Level {level}',
    'gameover.bosses': 'Bosse besiegt: {n}',
    'gameover.shards': '◆ Kernscherben erhalten: +{n}',
    'gameover.relic': 'Relikt freigeschaltet!',
    'gameover.unlocks': '── IN DIESEM RUN FREIGESCHALTET ──',
    'gameover.effects': 'AKTIVE EFFEKTE BEIM TOD',
    'gameover.hint': 'ENTER oder Klick für Menü',
    'gameover.metaHint': 'G = Meta-Fortschritt',

    // ── Boss-Sieg ──
    'boss.victory': 'BOSS BESIEGT!',
    'boss.healReward': '✦ Volle Heilung + Permanente Belohnung wählen ✦',
    'boss.shards': '◆ +{n} Kernscherben',
    'boss.relicUnlock': '{icon} Relikt freigeschaltet: {name}',
    'boss.upgradeUnlock': '{icon} Neues Upgrade: {name}',
    'boss.combatUnlock': '{icon} {type} freigeschaltet: {name}',
    'boss.reward.hp': '+{n} Max LP  (permanent)',
    'boss.reward.dmg': '+{n} Schaden  (permanent)',
    'boss.reward.spd': '+{n} Tempo  (permanent)',
    'boss.reward.hint': 'W/S = Wählen  ·  Klick / ENTER / 1-3 = Bestätigen',

    // ── Pause ──
    'pause.title': 'PAUSE',
    'pause.info': '{biome}Stufe {stage}  ·  Level {level}',
    'pause.resume': 'FORTSETZEN',
    'pause.settings': 'EINSTELLUNGEN',
    'pause.quit': 'ZURÜCK ZUM MENÜ',
    'pause.quickResume': 'P = Schnell fortsetzen',
    'pause.effects': 'AKTIVE EFFEKTE',
    'pause.moreEffects': '…weitere Effekte',

    // ── Ingame-Tooltips / Banner ──
    'tooltip.locked': 'GESPERRT',
    'tooltip.defeatBoss': 'BESIEGE DEN BOSS',
    'tooltip.exit': 'AUSGANG (oder ESC)',
    'banner.training': 'TRAININGSMODUS',
    'banner.trainingHint': 'ESC = Zurück zum Menü  |  Tür = Ausgang',
    'banner.secondWave': '⚔ ZWEITE WELLE ⚔',
    'banner.secondWaveDesc': 'Mehr Gegner kommen!',
    'banner.respawn': 'Gegner erscheinen in {n}s',
    'banner.trial': '⚔️ PRÜFUNG — Überlebe: {n}s',
    'banner.reroll': '🔄 Neu würfeln ×{n}',
    'banner.talentPoint': '🌟 {n} Talentpunkt{s} verfügbar! (T)',
    'banner.achievement': '{icon}  ERRUNGENSCHAFT: {text}',
    'controls.training': 'WASD=Bewegen  LEER/LMT=Angriff  N/MMT=Werfen  M/RMT=Sprint  Q/E=Fähigkeit  ESC=Ende',
    'controls.playing': 'WASD=Bewegen  LEER/LMT=Angriff  N/MMT=Werfen  M/RMT=Sprint  Q/E=Fähigkeit  P=Pause',
    'reward.coins': '🪙 {n} Münzen',
    'reward.walkHint': 'Zu Belohnungen laufen · Leertaste zum Einsammeln · Tür zum Weitergehen',

    // ── Ausrüstung ──
    'loadout.title': '⚔  AUSRÜSTUNG  ⚔',
    'loadout.subtitle': 'Wähle Fähigkeiten & Passive für deinen Run',
    'loadout.subtitleTraining': 'Wähle Fähigkeiten & Passive fürs Training',
    'loadout.abilities': '── AKTIVE FÄHIGKEITEN ──  (max 2)',
    'loadout.passives': '── PASSIVE EFFEKTE ──  (max 2)',
    'loadout.weapon': '── WAFFE ──  (A/D zum Wechseln)',
    'loadout.startRun': '▶  RUN STARTEN',
    'loadout.startTraining': '▶  TRAINING STARTEN',
    'loadout.needAbility': 'Mindestens 1 Fähigkeit wählen',
    'loadout.hint': 'W/S Navigieren  ·  A/D Waffe  ·  Klick/LEER Wählen  ·  ENTER Start  ·  ESC/RMT Zurück',

    // ── Run-Shop ──
    'shop.title': 'LADEN',
    'shop.coins': '🪙 Münzen: {n}',
    'shop.stage': 'Stufe {n}',
    'shop.buy': '[ENTER] Kaufen',
    'shop.cantAfford': 'Nicht genug Münzen',
    'shop.forgeToken': '🔨 Schmiedemarke',
    'shop.forgeDesc': 'Wähle ein Upgrade aus dem Pool ({cost} Münzen)',
    'shop.continue': 'WEITER',
    'shop.hint': 'W/S = Wählen  ·  ENTER/Klick = Kaufen  ·  ESC/RMT = Weiter',
    'shop.current': 'aktuell: {n}',
    'shop.charges': 'Ladungen: {n}',

    // ── Meta-Shop (Booster) ──
    'metashop.title': 'BOOSTER-LADEN',
    'metashop.shards': '◆ Kernscherben: {n}',
    'metashop.subtitle': '1 Booster für deinen nächsten Run wählen (sofort gekauft)',
    'metashop.selected': '✓ Gewählt: {name}',
    'metashop.owned': '✓ BESITZT',
    'metashop.buy': '[ENTER] Kaufen',
    'metashop.clear': 'AUSWAHL AUFHEBEN (Erstattung)',
    'metashop.hint': 'W/A/S/D = Wählen  ·  ENTER/Klick = Kaufen  ·  ESC/RMT = Zurück',

    // ── Talentbaum ──
    'talents.title': 'TALENTBAUM',
    'talents.points': 'Punkte: {available} verfügbar  ({spent}/{total} ausgegeben)',
    'talents.upgradeHint': 'ENTER zum Verbessern',
    'talents.maxRank': 'MAX RANG',
    'talents.hint': 'WASD/Pfeile = Navigieren  ·  ENTER = Verbessern  ·  T/ESC = Schließen',

    // ── Buff-Übersicht ──
    'buffs.header': 'MODIFIKATOREN',

    // ── Boss-Schriftrolle ──
    'scroll.title': '📜 ALTE SCHRIFTROLLE',
    'scroll.subtitle': 'Wähle eine permanente Freischaltung:',
    'scroll.ability': 'FÄHIGKEIT',
    'scroll.passive': 'PASSIV',
    'scroll.node': 'KNOTEN',
    'scroll.hint': 'W/S Navigieren · ENTER/Klick Bestätigen',

    // ── Meta-Menü ──
    'metamenu.title': 'META-FORTSCHRITT',
    'metamenu.shards': '◆ Kernscherben: {n}',
    'metamenu.perks': 'PERKS',
    'metamenu.relics': 'RELIKTE',
    'metamenu.stats': 'STATISTIKEN',
    'metamenu.buy': '[ENTER] Kaufen',
    'metamenu.hint': 'A/D = Tab  ·  W/S = Wählen  ·  ENTER/Klick = Kaufen  ·  ESC/RMT = Zurück',
    'metamenu.runsPlayed': 'Runs gespielt',
    'metamenu.bossesKilled': 'Bosse besiegt',
    'metamenu.highestStage': 'Höchste Stufe',
    'metamenu.totalShards': 'Kernscherben gesamt',
    'metamenu.shardsSpent': 'Scherben ausgegeben',
    'metamenu.relicsFound': 'Relikte gefunden',

    // ── Errungenschaften ──
    'achievements.title': 'ERRUNGENSCHAFTEN',
    'achievements.count': '{n} / {total} Freigeschaltet',
    'achievements.all': 'Alle',
    'achievements.more.up': '▲ mehr ▲',
    'achievements.more.down': '▼ mehr ▼',
    'achievements.hint': 'W/S = Navigieren  ·  A/D/Klick = Filtern  ·  ESC/RMT = Zurück',

    // ── Training-Konfiguration ──
    'trainconfig.title': 'TRAININGS-EINSTELLUNG',
    'trainconfig.subtitle': 'Wähle dein Trainings-Setup',
    'trainconfig.room': 'RAUM',
    'trainconfig.enemies': 'GEGNER',
    'trainconfig.count': 'ANZAHL',
    'trainconfig.damage': 'SCHADEN',
    'trainconfig.drops': 'DROPS',
    'trainconfig.start': 'START',
    'trainconfig.hint': 'W/S = Navigieren   A/D = Ändern   ENTER/Klick = Start   ESC/RMT = Zurück',
    'trainconfig.enemyAll': 'Alle',
    'trainconfig.enemyBasic': 'Standard',
    'trainconfig.enemyShooter': 'Schütze',
    'trainconfig.enemyDasher': 'Stürmer',
    'trainconfig.enemyTank': 'Tank',

    // ── Cheat-Anzeigen ──
    'cheat.god': 'GOTT',
    'cheat.oneHit': '1TREFFER',
    'cheat.xp': 'EP×10',
    'cheat.dev': '🛠️ DEV',
    'cheat.noProgress': '⛔ KEIN FORTSCHRITT',

    // ── Event-System ──
    'event.pressEnter': 'ENTER zum Fortfahren',
    'event.hint': 'W/S Navigieren · ENTER/Klick Wählen · ESC/RMT Überspringen',
    'event.skipped': 'Übersprungen.',
    'event.tokenAcquired': '✦ {name}-Marke erhalten!',
    'event.nothing': 'Nichts zu verändern.',
    'event.chooseCategory': 'Wähle eine Kategorie zum Verbessern:',
    'event.chooseReplace': 'Wähle ein Upgrade zum Ersetzen:',
    'event.leave': 'Verlassen',
    'event.acceptTrial': '⚔️ Prüfung annehmen — 18s überleben für eine Schmiedemarke',
    'event.declineTrial': 'Ablehnen — Raum überspringen',
    'event.forgeToken': '🔨 Schmiedemarke ({cost} Münzen) — Upgrade wählen',
    'event.rerollToken': '🔄 Neu-Würfel-Marke ({cost} Münzen) — Nächstes Level-Up neu würfeln',
    'event.sacrificeHP': '💀 15% LP opfern → Seltenes Upgrade wählen',
    'event.skip': 'Überspringen',
    'event.survive': 'Überlebe: {secs}s',
    'event.defeatOrSurvive': 'Besiege die Gegner oder überlebe den Timer!',
    'event.applied': '✦ {icon} {name} angewendet!',
    // Event-Namen
    'event.name.forge': 'Alte Schmiede',
    'event.name.shrine': 'Ritualschrein',
    'event.name.library': 'Mystische Bibliothek',
    'event.name.chaos': 'Chaosaltar',
    'event.name.trial': 'Prüfungsraum',
    'event.name.trader': 'Wandernder Händler',
    // Event-Beschreibungen
    'event.desc.forge': 'Wähle eine Kategorie, dann ein Upgrade.',
    'event.desc.shrine': 'Macht um einen Preis… oder auf Nummer sicher gehen.',
    'event.desc.library': 'Ersetze ein Upgrade durch ein neues.',
    'event.desc.chaos': 'Glücksspiel um Macht.',
    'event.desc.trial': 'Überlebe die Herausforderung für eine Schmiedemarke.',
    'event.desc.trader': 'Tausche Münzen gegen Upgrade-Marken.',

    // ── Sonstige Labels ──
    'type.ability': 'Fähigkeit',
    'type.passive': 'Passiv',
    'type.node': 'Knoten',

    // ── Effekt-Kategorien (Pause-Bildschirm) ──
    'cat.abilities': 'Fähigkeiten',
    'cat.passives': 'Passive',
    'cat.upgrades': 'Upgrades',
    'cat.runUpgrades': 'Run-Upgrades',
    'cat.relics': 'Relikte',
    'cat.booster': 'Booster',
    'cat.biome': 'Biom',
    'cat.pickups': 'Pickups',
    'cat.talents': 'Talente',

    // ── Schlüssel-Aliase (Code verwendet diese Schlüssel) ──

    // Menübeschreibungen
    'menu.startDesc': 'Kämpfe durch Dungeon-Räume',
    'menu.metaDesc': 'Perks, Relikte & Stats  ·  ◆ {n}',
    'menu.shopDesc': 'Booster für deinen nächsten Run',
    'menu.achievementsDesc': 'Deine Trophäen & Meilensteine',
    'menu.charactersDesc': 'Profile erstellen & wechseln',
    'menu.trainingDesc': 'Üben ohne Schaden zu nehmen',
    'menu.settingsDesc': 'Audio, Steuerung & Optionen',

    // HUD – Combo-Aliase
    'hud.comboNice': 'Stark!',
    'hud.combo': 'Kombo!',
    'hud.comboRampage': 'Amoklauf!',
    'hud.comboUnstoppable': 'UNAUFHALTBAR!',
    'hud.killChain': '{n}× Kill',

    // Level-Up-Aliase
    'levelup.confirmHint': 'Erneut LEERTASTE zum Bestätigen',
    'levelup.selectHint': 'W/S = Wählen  ·  Klick / ENTER / 1-3 = Bestätigen',
    'levelup.reroll': 'W/S = Wählen  ·  Klick / ENTER / 1-3 = Bestätigen  ·  R = Neu würfeln ({n})',

    // Game-Over-Aliase
    'gameover.info': 'Stufe {stage}  ·  Level {level}',
    'gameover.relicUnlocked': 'Relikt freigeschaltet!',
    'gameover.unlockedThisRun': '── IN DIESEM RUN FREIGESCHALTET ──',
    'gameover.activeEffects': 'AKTIVE EFFEKTE BEIM TOD',
    'gameover.menuHint': 'ENTER oder Klick für Menü',

    // Boss-Sieg-Aliase
    'boss.defeated': 'BOSS BESIEGT!',
    'boss.rewardSubtitle': '✦ Volle Heilung + Permanente Belohnung wählen ✦',
    'boss.shardsGained': '◆ +{n} Kernscherben',
    'boss.relicUnlocked': '{icon} Relikt freigeschaltet: {name}',
    'boss.newUpgrade': '{icon} Neues Upgrade: {name}',
    'boss.ability': 'Fähigkeit',
    'boss.passive': 'Passiv',
    'boss.rewardHP': '+{n} Max LP  (permanent)',
    'boss.rewardDamage': '+{n} Schaden  (permanent)',
    'boss.rewardSpeed': '+{n} Tempo  (permanent)',

    // Profil-Aliase
    'profiles.bestStage': '★ Stufe {n}',
    'profiles.newChar': '+ NEUER CHARAKTER',
    'profiles.controls': 'W/S = Navigieren  ·  ENTER/Klick = Wählen  ·  C = Farbe  ·  H = Hut  ·  X = Löschen  ·  ESC/RMT = Zurück',
    'profiles.newCharTitle': 'NEUER CHARAKTER',
    'profiles.typeName': 'Namen eingeben:',
    'profiles.confirmCancel': 'ENTER = Bestätigen  ·  ESC/RMT = Abbrechen',
    'profiles.chooseClass': 'WÄHLE DEINE KLASSE',
    'profiles.forName': 'für „{name}"',
    'profiles.passive': 'PASSIV',
    'profiles.classControls': 'A/D oder Pfeile = Navigieren  ·  ENTER/Klick = Bestätigen  ·  ESC/RMT = Zurück',
    'profiles.deleteTitle': 'CHARAKTER LÖSCHEN?',
    'profiles.deleteWarning': 'Aller Fortschritt geht unwiderruflich verloren!',
    'profiles.deleteControls': 'ENTER/Klick = Löschen  ·  ESC/RMT = Abbrechen',
    'profiles.chooseColor': 'FARBE WÄHLEN',
    'profiles.pickerControls': 'WASD/Pfeile = Navigieren  ·  ENTER/Klick = Bestätigen  ·  ESC/RMT = Abbrechen',
    'profiles.chooseHat': 'HUT WÄHLEN',
    'profiles.unlocked': '✓ Freigeschaltet',

    // Ausrüstungs-Aliase
    'loadout.activeAbilities': '── AKTIVE FÄHIGKEITEN ──  (max 2)',
    'loadout.passiveEffects': '── PASSIVE EFFEKTE ──  (max 2)',
    'loadout.selectAbility': 'Mindestens 1 Fähigkeit wählen',
    'loadout.controls': 'W/S Navigieren  ·  A/D Waffe  ·  Klick/LEER Wählen  ·  ENTER Start  ·  ESC/RMT Zurück',
    'loadout.reachStage': 'Erreiche Stufe {n} zum Freischalten',
    'loadout.weapon': '── WAFFE ──  (A/D zum Wechseln)',
    'loadout.startRun': '▶  RUN STARTEN',
    'loadout.startTraining': '▶  TRAINING STARTEN',

    // Run-Shop-Aliase
    'runShop.title': 'LADEN',
    'runShop.coins': '🪙 Münzen: {n}',
    'runShop.buy': '[ENTER] Kaufen',
    'runShop.notEnough': 'Nicht genug Münzen',
    'runShop.forgeToken': '🔨 Schmiedemarke',
    'runShop.forgeDesc': 'Wähle ein Upgrade aus dem Pool ({cost} Münzen)',
    'runShop.continue': 'WEITER',
    'runShop.controls': 'W/S = Wählen  ·  ENTER/Klick = Kaufen  ·  ESC/RMT = Weiter',

    // Meta-Shop-Aliase
    'metaShop.title': 'BOOSTER-LADEN',
    'metaShop.shards': '◆ Kernscherben: {n}',
    'metaShop.subtitle': '1 Booster für deinen nächsten Run wählen (sofort gekauft)',
    'metaShop.selected': '✓ Gewählt: {name}',
    'metaShop.owned': '✓ BESITZT',
    'metaShop.notEnoughShards': 'Nicht genug Kernscherben',
    'metaShop.alreadyHave': 'Bereits besessen',
    'metaShop.clearSelection': 'AUSWAHL AUFHEBEN (Erstattung)',
    'metaShop.controls': 'W/A/S/D = Wählen  ·  ENTER/Klick = Kaufen  ·  ESC/RMT = Zurück',

    // Talent-Aliase
    'talents.noPoints': 'Keine Talentpunkte verfügbar',
    'talents.requiresPrev': 'Vorheriges Talent benötigt',
    'talents.controls': 'WASD/Pfeile = Navigieren  ·  ENTER = Verbessern  ·  T/ESC = Schließen',

    // Buff-Übersicht-Alias
    'buffSummary.title': 'MODIFIKATOREN',

    // Boss-Schriftrolle-Aliase
    'bossScroll.title': '📜 ALTE SCHRIFTROLLE',
    'bossScroll.subtitle': 'Wähle eine permanente Freischaltung:',
    'bossScroll.ability': 'FÄHIGKEIT',
    'bossScroll.passive': 'PASSIV',
    'bossScroll.node': 'KNOTEN',
    'bossScroll.controls': 'W/S Navigieren · ENTER/Klick Bestätigen',

    // Meta-Menü-Aliase
    'metaMenu.title': 'META-FORTSCHRITT',
    'metaMenu.shards': '◆ Kernscherben: {n}',
    'metaMenu.perks': 'PERKS',
    'metaMenu.relics': 'RELIKTE',
    'metaMenu.stats': 'STATISTIKEN',
    'metaMenu.controls': 'A/D = Tab  ·  W/S = Wählen  ·  ENTER/Klick = Kaufen  ·  ESC/RMT = Zurück',
    'metaMenu.bosses': 'Bosse besiegt: {n}',
    'metaMenu.shardsLabel': '◆ Scherben: +{n}',
    'metaMenu.relic': 'Relikt: {name}',
    'metaMenu.new': 'NEU!',
    'metaMenu.runSummary': '── LETZTER RUN ──',
    'metaMenu.relicsUnlocked': 'Relikte freigeschaltet',
    'metaMenu.runUpgrades': '── RUN-UPGRADES ──',
    'metaMenu.nextUnlock': 'Nächste Freischaltung bei Stufe {n}',
    'metaMenu.defeatBosses': 'Besiege Bosse, um Perks & Relikte freizuschalten',
    'metaMenu.statRuns': 'Runs gespielt',
    'metaMenu.statBosses': 'Bosse besiegt',
    'metaMenu.statHighest': 'Höchste Stufe',
    'metaMenu.statTotalShards': 'Kernscherben gesamt',
    'metaMenu.statSpent': 'Scherben ausgegeben',
    'metaMenu.statRelics': 'Relikte gefunden',

    // Errungenschaften-Aliase
    'achievements.unlocked': '{n} / {total} Freigeschaltet',
    'achievements.none': 'Noch keine Errungenschaften',
    'achievements.controls': 'W/S = Navigieren  ·  A/D/Klick = Filtern  ·  ESC/RMT = Zurück',

    // Training-Konfig-Aliase
    'trainingConfig.title': 'TRAININGS-EINSTELLUNG',
    'trainingConfig.subtitle': 'Wähle dein Trainings-Setup',
    'trainingConfig.room': 'RAUM',
    'trainingConfig.enemies': 'GEGNER',
    'trainingConfig.count': 'ANZAHL',
    'trainingConfig.damage': 'SCHADEN',
    'trainingConfig.drops': 'DROPS',
    'trainingConfig.on': 'AN',
    'trainingConfig.off': 'AUS',
    'trainingConfig.start': 'START',
    'trainingConfig.controls': 'W/S = Navigieren   A/D = Ändern   ENTER/Klick = Start   ESC/RMT = Zurück',

    // Cheat-Alias
    'cheat.xpBoost': 'EP×10',

    // ── Freischalt-Toasts ──
    'unlock.ability': 'Fähigkeit',
    'unlock.passive': 'Passiv',
    'unlock.node': 'Knoten',
    'unlock.achievement': 'Erfolg freigeschaltet',

    // ── Events ──
    'event.skipKeep': 'Überspringen (Entfernung behalten)',

    // ── Entität-Chrome ──
    'entity.sold': 'VERKAUFT',
    'entity.buy': '[LEERTASTE] Kaufen',
    'entity.heal': 'Heilen',
    'entity.empty': 'Leer',
    'entity.healPrompt': '[LEERTASTE] Heilen',
    'entity.reward': 'BELOHNUNG',
    'room.rewards': '🏆 BELOHNUNGEN',
    'room.rewardsHint': 'Belohnungen einsammeln · Tür zum Weitergehen',
    'room.darkness': '🌑  Die Dunkelheit umgibt dich…',
};
