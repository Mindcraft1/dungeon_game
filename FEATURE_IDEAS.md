# 🎮 Dungeon Rooms — Feature Ideas

> Gesammelte Feature-Ideen, sortiert nach Impact und Aufwand.

---

## 🔥 High-Impact, gut machbar

### 1. Dash / Dodge Roll (Player-Ability)
- **Taste:** Shift
- **Mechanik:** Kurzer Dash in Bewegungsrichtung mit ~200ms i-Frames
- **Warum:** Gibt dem Spieler ein aktives Defensiv-Tool, macht Gameplay deutlich dynamischer
- **Aufwand:** ~1h — neuer Timer + Cooldown in `constants.js`, Logik in `player.js`
- **Status:** ✅ Fertig

---

### 2. Particle System (Game Juice)
- **Effekte:** Todes-Explosionen, Hit-Sparks, Pickup-Sammel-Glitzer, Dash-Trails
- **Umsetzung:** Kleine `Particle`-Klasse in `src/entities/`, Array in `game.js`, update/render pro Frame
- **Warum:** Macht das Spiel sofort 3× befriedigender
- **Aufwand:** ~1.5h
- **Status:** ✅ Fertig

---

### 3. Screen Shake
- **Mechanik:** Kleiner Canvas-Offset bei Treffern und Kills
- **Umsetzung:** ~20 Zeilen in `main.js` — `ctx.translate(shakeX, shakeY)` pro Frame mit Decay
- **Warum:** Enormer Juice-Faktor für minimalen Aufwand
- **Aufwand:** ~30min
- **Status:** ✅ Fertig

---

### 4. Combo / Kill-Chain System
- **Mechanik:** Kill-Streak-Counter, resettet nach 2.5s ohne Kill
- **Belohnung:** Bonus-XP-Multiplikator (×1.25, ×1.5, ×2.0, ×2.5) in 4 Tiers
- **Tier-Namen:** Nice! (3 Kills) → Combo! (5) → Rampage! (8) → UNSTOPPABLE! (12)
- **Anzeige:** Combo-Counter im HUD mit Timer-Bar + Farbwechsel pro Tier
- **Effekte:** Tier-spezifische Sounds, Partikel-Bursts, Screen-Flash, Floating-Text-Popups
- **Balance:** Nur XP-Bonus (kein Damage-Boost), nur im echten Spiel (nicht Training)
- **Aufwand:** ~1.5h
- **Status:** ✅ Fertig

---

## ⚔️ Medium Effort, großer Gameplay-Wert

### 5. Boss-Räume
- **Trigger:** Alle 5 Stages ein Boss-Encounter
- **Boss-Typen:** The Brute (Slam/Charge/Summon), The Warlock (Fan/Volley/Summon), The Phantom (Dash/Ring/Clone)
- **Phase 2:** Bei 50% HP — schnellere Angriffe, mehr Projektile, mehr Adds
- **Boss-Attacken:** AoE Slam, Summon Adds, Dash-Kombo, Projectile-Patterns
- **Belohnung:** Full Heal + Bonus-XP + permanenter Stat-Boost (Wahl: +HP, +DMG, +SPD)
- **Umsetzung:** `Boss`-Klasse in `src/entities/boss.js`, Boss-Arena in `rooms.js`, Boss-HP-Bar in HUD, Victory-Overlay in `levelup.js`, 4 Boss-Sounds in `audio.js`, 3 Boss-Partikeleffekte
- **Warum:** Gibt dem Spiel echte Meilensteine und Spannung
- **Aufwand:** ~4h
- **Status:** ✅ Fertig

---

### 6. Room Hazards / Traps
- **Neue Tile-Typen:**
  - `^` = Spike-Felder (periodischer Schaden)
  - `~` = Lava (Damage-over-Time)
  - `>` / `<` = Pfeil-Fallen (horizontal/vertikal schießend)
- **Umsetzung:** Neue Zeichen in ASCII-Templates, Rendering in `render.js`, Logik in `game.js`
- **Warum:** Macht Räume taktischer und abwechslungsreicher
- **Aufwand:** ~3h
- **Status:** ✅ Fertig

---

### 7. Sound Effects (Web Audio API)
- **Sounds:** Attack-Swoosh, Hit-Impact, Pickup-Chime, Enemy-Death-Pop, Door-Unlock, Level-Up-Fanfare
- **Umsetzung:** Web Audio API + generierte Sounds via [sfxr.me](https://sfxr.me) oder [jsfxr](https://sfxr.me)
- **Warum:** Kein Game fühlt sich komplett an ohne Sound
- **Aufwand:** ~2h
- **Status:** ✅ Fertig

---

### 8. Sekundär-Angriff / Ranged Attack
- **Taste:** B
- **Mechanik:** Wurf-Dolch in Blickrichtung mit eigenem Cooldown (800ms) und begrenzter Reichweite (300px)
- **Damage:** 60% des Melee-Schadens — belohnt Nahkampf-Engagement
- **Balance:** Längerer Cooldown als Melee, weniger Schaden, weniger Knockback (10 vs 20)
- **Buff-Interaktion:** Rage Shard (+50% DMG), Piercing Shot (+40% Reichweite/+25% DMG), Speed Surge (-40% CD), Crushing Blow (3× nächster Treffer)
- **Visuals:** Dolch-förmiges Projektil (cyan), Trail-Partikel, Wurf-Burst, Hit-Sparks
- **Sound:** Metallischer Wurf-Whoosh + Impact-Ping bei Treffer
- **HUD:** Cooldown-Bar unter Dash-Anzeige (orange)
- **Umsetzung:** `PlayerProjectile`-Klasse in `projectile.js`, `tryThrow()` in `player.js`, Integration in `game.js`
- **Warum:** Gibt taktische Optionen gegen Shooter-Enemies und zum Finishen
- **Aufwand:** ~2h
- **Status:** ✅ Fertig

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
