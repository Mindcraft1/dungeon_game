# 🎮 Dungeon Rooms — Feature Ideas

> Gesammelte Feature-Ideen, sortiert nach Impact und Aufwand.

---

## 🔥 High-Impact, gut machbar

### 1. Dash / Dodge Roll (Player-Ability)
- **Taste:** Shift
- **Mechanik:** Kurzer Dash in Bewegungsrichtung mit ~200ms i-Frames
- **Warum:** Gibt dem Spieler ein aktives Defensiv-Tool, macht Gameplay deutlich dynamischer
- **Aufwand:** ~1h — neuer Timer + Cooldown in `constants.js`, Logik in `player.js`
- **Status:** ⬜ Offend

---

### 2. Particle System (Game Juice)
- **Effekte:** Todes-Explosionen, Hit-Sparks, Pickup-Sammel-Glitzer, Dash-Trails
- **Umsetzung:** Kleine `Particle`-Klasse in `src/entities/`, Array in `game.js`, update/render pro Frame
- **Warum:** Macht das Spiel sofort 3× befriedigender
- **Aufwand:** ~1.5h
- **Status:** ⬜ Offen

---

### 3. Screen Shake
- **Mechanik:** Kleiner Canvas-Offset bei Treffern und Kills
- **Umsetzung:** ~20 Zeilen in `main.js` — `ctx.translate(shakeX, shakeY)` pro Frame mit Decay
- **Warum:** Enormer Juice-Faktor für minimalen Aufwand
- **Aufwand:** ~30min
- **Status:** ⬜ Offen

---

### 4. Combo / Kill-Chain System
- **Mechanik:** Kill-Streak-Counter, resettet nach 2s ohne Kill
- **Belohnung:** Bonus-XP-Multiplikator (×1.5, ×2, ×3)
- **Anzeige:** Combo-Counter im HUD mit Farbwechsel
- **Warum:** Belohnt aggressives Spielen, macht Room-Clearing befriedigender
- **Aufwand:** ~1h
- **Status:** ⬜ Offen

---

## ⚔️ Medium Effort, großer Gameplay-Wert

### 5. Boss-Räume
- **Trigger:** Alle 5 Stages ein Boss-Encounter
- **Boss-Attacken:** AoE Slam, Summon Adds, Dash-Kombo, Projectile-Patterns
- **Umsetzung:** Eigene `Boss`-Klasse in `src/entities/`, eigenes Boss-Room-Template in `rooms.js`
- **Warum:** Gibt dem Spiel echte Meilensteine und Spannung
- **Aufwand:** ~4h
- **Status:** ⬜ Offen

---

### 6. Room Hazards / Traps
- **Neue Tile-Typen:**
  - `^` = Spike-Felder (periodischer Schaden)
  - `~` = Lava (Damage-over-Time)
  - `>` / `<` = Pfeil-Fallen (horizontal/vertikal schießend)
- **Umsetzung:** Neue Zeichen in ASCII-Templates, Rendering in `render.js`, Logik in `game.js`
- **Warum:** Macht Räume taktischer und abwechslungsreicher
- **Aufwand:** ~3h
- **Status:** ⬜ Offen

---

### 7. Sound Effects (Web Audio API)
- **Sounds:** Attack-Swoosh, Hit-Impact, Pickup-Chime, Enemy-Death-Pop, Door-Unlock, Level-Up-Fanfare
- **Umsetzung:** Web Audio API + generierte Sounds via [sfxr.me](https://sfxr.me) oder [jsfxr](https://sfxr.me)
- **Warum:** Kein Game fühlt sich komplett an ohne Sound
- **Aufwand:** ~2h
- **Status:** ⬜ Offen

---

### 8. Sekundär-Angriff / Ranged Attack
- **Taste:** E oder rechte Maustaste
- **Mechanik:** Wurf-Dolch mit eigenem Cooldown und begrenzter Reichweite
- **Umsetzung:** Nutzt die existierende `Projectile`-Klasse wieder
- **Warum:** Gibt taktische Optionen gegen Shooter-Enemies und zum Finishen
- **Aufwand:** ~2h
- **Status:** ⬜ Offen

---

## 🧠 Ambitious, aber lohnend

### 9. Unlockbare Charaktere / Klassen
- **Klassen-Ideen:**
  - **Warrior** — Höhere HP, Schild-Block-Ability
  - **Rogue** — Schneller, Dash-Fähigkeit, Crit Chance
  - **Mage** — Ranged-Angriff als Primary, niedrigere HP
- **Umsetzung:** `class`-Feld zum Profil hinzufügen, Klassen-spezifische Stats in `player.js`
- **Warum:** Enormer Wiederspielwert, Profile-System existiert bereits
- **Aufwand:** ~5h
- **Status:** ⬜ Offen

---

### 10. Procedural Room Generation
- **Algorithmen:** BSP-Tree oder Cellular Automata
- **Umsetzung:** Neue Generator-Funktion in `rooms.js`, gibt ASCII-Grid zurück
- **Warum:** Unendliche Raum-Varianz statt 14 feste Templates
- **Aufwand:** ~6h
- **Status:** ⬜ Offen

---

### 11. Run-Modifiers (Roguelike Mutations)
- **Beispiele:**
  - 🔴 **Glass Cannon** — 2× DMG, ½ HP
  - 🟡 **Swarm Mode** — 2× Enemies, 2× XP
  - 🔵 **Speedrun** — Timer, Bonus-Score bei schnellem Clear
  - 🟢 **Vampiric** — Kein Heal, aber Lifesteal bei Kills
- **Umsetzung:** Modifier-Auswahl vor Run-Start, Flags in `game.js`
- **Warum:** Massiver Wiederspielwert
- **Aufwand:** ~4h
- **Status:** ⬜ Offen

---

### 12. Achievement-System
- **Beispiel-Achievements:**
  - 🏆 "First Blood" — Ersten Gegner besiegen
  - 🏆 "Untouchable" — Raum ohne Schaden clearen
  - 🏆 "Centurion" — 100 Gegner besiegen
  - 🏆 "Dungeon Master" — Stage 10 erreichen
  - 🏆 "Collector" — Jeden Pickup-Typ einmal einsammeln
- **Umsetzung:** Achievement-Daten in `localStorage`, Badge-Anzeige im Profil-Screen
- **Warum:** Langzeit-Motivation und Ziele
- **Aufwand:** ~3h
- **Status:** ⬜ Offen

---

## 📊 Priorisierung

| Prio | Feature | Aufwand | Impact | Empfehlung |
|------|---------|---------|--------|------------|
| 🥇 | Dash / Dodge Roll | ~1h | ⭐⭐⭐⭐⭐ | **Sofort machen** — transformiert das Gameplay |
| 🥈 | Particles + Screen Shake | ~2h | ⭐⭐⭐⭐⭐ | **Sofort machen** — macht alles "juicy" |
| 🥉 | Boss-Räume | ~4h | ⭐⭐⭐⭐ | **Nächstes großes Feature** — gibt dem Spiel ein Ziel |
| 4 | Combo-System | ~1h | ⭐⭐⭐⭐ | Quick Win für mehr Spielspaß |
| 5 | Sound Effects | ~2h | ⭐⭐⭐⭐ | Polishing, macht alles professioneller |
| 6 | Room Hazards | ~3h | ⭐⭐⭐ | Content-Erweiterung |
| 7 | Ranged Attack | ~2h | ⭐⭐⭐ | Gameplay-Tiefe |
| 8 | Charakter-Klassen | ~5h | ⭐⭐⭐⭐ | Wiederspielwert |
| 9 | Run-Modifiers | ~4h | ⭐⭐⭐⭐ | Wiederspielwert |
| 10 | Achievements | ~3h | ⭐⭐⭐ | Langzeit-Motivation |
| 11 | Procedural Rooms | ~6h | ⭐⭐⭐ | Nice-to-have |
