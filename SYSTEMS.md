# 🏰 Dungeon Rooms — Vollständige System-Dokumentation

> Umfassende Referenz aller implementierten Systeme, Buffs, Debuffs, Events, Unlocks und Mechaniken.

---

## Inhaltsverzeichnis

1. [Biome System](#1-biome-system)
2. [Gegner-Typen](#2-gegner-typen)
3. [Hazards (Fallen)](#3-hazards-fallen)
4. [Boss System](#4-boss-system)
5. [Kampfsystem — Spieler](#5-kampfsystem--spieler)
6. [Abilities (Aktive Fähigkeiten)](#6-abilities-aktive-fähigkeiten)
7. [Procs (Passive Effekte)](#7-procs-passive-effekte)
8. [Status-Effekte (Debuffs auf Gegner)](#8-status-effekte-debuffs-auf-gegner)
9. [Pickup-Buffs (Item-Drops)](#9-pickup-buffs-item-drops)
10. [Upgrade-Nodes (In-Run Builds)](#10-upgrade-nodes-in-run-builds)
11. [Event System (Spezial-Räume)](#11-event-system-spezial-räume)
12. [Unlock-System](#12-unlock-system)
13. [Boss Scroll (Permanente Unlocks)](#13-boss-scroll-permanente-unlocks)
14. [Meta-Progression](#14-meta-progression)
15. [Run-Shop (Coin-Ökonomie)](#15-run-shop-coin-ökonomie)
16. [Combo / Kill-Chain](#16-combo--kill-chain)
17. [Canyon / Pit Traps](#17-canyon--pit-traps)
18. [Achievements (40 Stück)](#18-achievements-40-stück)
19. [Loadout System](#19-loadout-system)
20. [Meta-Boosters (Einmal-pro-Run)](#20-meta-boosters-einmal-pro-run)
21. [Charakter-Klassen](#21-charakter-klassen)
22. [Waffen-Typen](#22-waffen-typen)
23. [Charakter-Anpassung (Kosmetik)](#23-charakter-anpassung-kosmetik)
24. [Talent Tree (Per-Run)](#24-talent-tree-per-run)
25. [Reward Orb & Performance System](#25-reward-orb--performance-system)

---

## 1. Biome System

Biome wechseln alle **10 Stages** (= Boss-Intervall / Act-Grenze) und beeinflussen Visuals, Gegner-Gewichtung, Hazard-Häufigkeit und Atmosphäre.

| Biome | Stages | Farbe | Gegner-Schwerpunkt | Hazard-Schwerpunkt | Besonderheit |
|-------|--------|-------|--------------------|--------------------|--------------|
| 🌿 **Jungle** | 1–10, 51–60, … | Grün | Dasher ×1.4 | Alles reduziert | Fallende Blätter, Glühwürmchen |
| 🌊 **Depths** | 11–20, 61–70, … | Blau | Shooter ×1.5 | Arrow ×1.4 | Spieler -10% Speed, Blasen, Lichtpunkte |
| 🏜️ **Desert** | 21–30, 71–80, … | Orange | Tank ×1.5 | Spikes ×1.4, Arrow ×1.2 | Sandkörner, Hitze-Flimmern |
| 🔥 **Wasteland** | 31–40, 81–90, … | Rot | Shooter ×1.2, Tank ×1.3 | Lava ×1.6, Arrow ×1.3 | Glut-Funken, Asche |
| 🚀 **Spaceship** | 41–50, 91–100, … | Cyan | Shooter ×1.5, Dasher ×1.3 | Laser ×1.8, Laser Wall ×1.6 | Daten-Partikel, Funken, Schaltkreis-Böden |

Jedes Biome hat eigene:
- **Boden- & Wand-Farben** (Floor/Wall Tiles)
- **Ambient-Partikel** (Blätter, Sand, Glut, Blasen)
- **Boden-Dekorationen** (Gras, Risse, Pfützen, Verbrennungen)
- **Wand-Dekorationen** (Ranken, Erosion, Leucht-Risse, Tropfen)
- **Atmosphären-Overlay** (Farb-Tint, Vignette)
- **Boss-Themes** (angepasste Farben für jeden Boss-Typ)

---

## 2. Gegner-Typen

| Typ | Farbe | Einführung | HP-Mult | Speed-Mult | DMG-Mult | XP-Mult | Besonderheit |
|-----|-------|------------|---------|------------|----------|---------|--------------|
| **Basic** | 🔴 Rot | Stage 1 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | Einfacher Seek-AI |
| **Shooter** | 🟣 Lila | Stage 5 | ×0.7 | ×0.55 | – | ×1.3 | Schießt Projektile (Range 200, CD 2s) |
| **Dasher** | 🟢 Grün | Stage 7 | ×0.6 | ×0.55 | ×1.2 | ×1.5 | Dash-Angriff (×3.5 Speed, Range 300) |
| **Tank** | 🟠 Orange | Stage 9 | ×2.0 | ×0.45 | ×1.5 | ×2.0 | Charge-Attacke (×2.5 Speed, Range 250) |

**Skalierung (Phasen-basiert, nie alle 3 Achsen gleichzeitig):**

*Dichte (Gegner-Anzahl):* Gestufte Erhöhung alle 2–3 Räume, nicht pro Raum:
- Phase 1 (Rooms 1–9): 2 → 3 → 4 → 5 → 6 (alle 2 Räume +1)
- Phase 2 (Rooms 11–19): 6 → 7 → 8 (alle 3 Räume +1)
- Phase 3 (Rooms 21–29): 8 → 9 → 10 (alle 3 Räume +1)
- Phase 4+ (Rooms 31+): max 10

*HP:* Sanft pro Raum, steiler pro Phase:
- Phase 1: +5% pro Raum (max ×1.45 bei Room 9)
- Phase 2: +7% pro Raum
- Phase 3+: +8% pro Raum

*Schaden:* Flach pro Phase, NICHT pro Raum:
- Phase 1: Basis-Schaden (kein Anstieg)
- Phase 2: +2 Schaden
- Phase 3: +4 Schaden
- Phase 4+: +6 Schaden

*Speed:* Langsam pro Raum, max ×1.6

---

## 3. Hazards (Fallen)

Hazards werden dynamisch pro Raum platziert. Schaden skaliert +10% pro Stage über Intro, max ×2.

| Typ | Einführung | Basis-DMG | Mechanik |
|-----|------------|-----------|----------|
| ⬆️ **Spikes** | Stage 4 | 8 | Zyklisch (2.5s): inaktiv → 0.5s Warnung → 0.7s aktiv. Versetzter Timer. |
| 🟧 **Lava** | Stage 6 | 4/Tick | Dauerschaden alle 400ms + Slow (×0.55 Speed) solange drauf. |
| ➡️ **Arrow Trap** | Stage 8 | 8 | Schießt Projektile in eine Richtung (CD 3.5s, Speed 160). |

---

## 4. Boss System

**Alle 10 Stages** erscheint ein Boss (= Act-Grenze). 4 verschiedene Typen, die rotieren.

| Boss | Farbe | HP-Mult | Speed-Mult | DMG-Mult | Radius |
|------|-------|---------|------------|----------|--------|
| 💪 **The Brute** | Orange | ×1.3 | ×0.8 | ×1.4 | 28px |
| 🧙 **The Warlock** | Lila | ×0.9 | ×0.85 | ×1.0 | 22px |
| 👻 **The Phantom** | Cyan | ×0.75 | ×1.3 | ×1.1 | 20px |
| 🛡️ **The Juggernaut** | Orange-Braun | ×1.5 | ×0.6 | ×1.2 | 30px |

**Basis-Stats:** HP 400, Speed 55, DMG 15

**Skalierung (angepasst für 10-Room Acts):**
- Pro Encounter: HP +55%, DMG +35%, Speed +14%
- Pro Stage: HP +2%, DMG +1.2%, Speed +0.8%

**Phase 2** ab 50% HP — Boss wird aggressiver, kürzere Cooldowns.

### Boss-Attacken

| Boss | Attacke | Windup | Beschreibung |
|------|---------|--------|--------------|
| Brute | **Slam** | 900ms | AoE Radius 90px |
| Brute | **Charge** | 500ms | 800ms Sprint ×3.5 Speed |
| Brute | **Stomp** | 800ms | AoE Radius 100px |
| Warlock | **Fan** | 600ms | Fächer aus Projektilen |
| Warlock | **Volley** | 400ms | Serie von Schüssen (200ms Intervall) |
| Warlock | **Summon** | 800ms | Beschwört Adds |
| Phantom | **Dash Strike** | 400ms | 300ms Sprint ×5.0 Speed |
| Phantom | **Ring** | 500ms | Projektil-Ring |
| Phantom | **Clone** | 600ms | Erzeugt Klone |
| Juggernaut | **Rocket** | 700ms | Verfolgungsrakete (Speed 130, Explosion r70) |
| Juggernaut | **Barrage** | 500ms | Schnellfeuer (350ms Intervall) |
| Juggernaut | **Bombardment** | 1400ms | 5× AoE-Zonen (r55, 700ms Linger) |

**Boss-Belohnungen:**
- 80 Base-XP (skaliert +30% pro Encounter)
- 10 Coins
- Permanente Stat-Wahl: +10 HP, +5 DMG oder +10 Speed
- 20% Chance auf **Boss Scroll** (permanenter Unlock)
- 5% Chance auf **Relic-Drop**

---

## 5. Kampfsystem — Spieler

### Basis-Stats
| Stat | Wert |
|------|------|
| HP | 100 |
| Speed | 160 px/s |
| Melee-DMG | 25 |
| Radius | 14px |
| Invuln nach Hit | 400ms |
| Crit-Chance | 5% |

### Melee-Angriff
- **Arc:** 120° (2π/3)
- **Range:** 50px
- **Cooldown:** 350ms
- **Duration:** 150ms
- **Knockback:** 20

### Dagger-Wurf (Ranged)
- **Cooldown:** 800ms
- **DMG:** 60% von Melee-DMG
- **Speed:** 280 px/s
- **Range:** 300px
- **Knockback:** 10

### Dash / Dodge Roll
- **Speed:** ×3.5 normal
- **Dauer:** 180ms
- **Cooldown:** 900ms
- **I-Frames:** 160ms

### Leveling & Late-Game Skalierung

**XP-Kurve (Soft-Cap):**
- **Basis-Schwelle:** 30 XP (Level 1 → 2)
- **Multiplikator:** ×1.25 pro Level bis Level 10
- **Soft-Cap ab Level 10:** Multiplikator sinkt um 0.015 pro Level über 10
- **Minimum-Multiplikator:** ×1.08 (wird nie unterschritten)
- **Formel:** `mult = max(1.08, 1.25 - (level - 10) × 0.015)` für Level > 10

| Level | XP benötigt (alt) | XP benötigt (neu) | Unterschied |
|-------|--------------------|--------------------|-------------|
| 5 | 73 | 73 | identisch |
| 10 | 224 | 224 | identisch |
| 15 | 683 | 448 | −34% |
| 20 | 2.088 | 762 | −64% |
| 25 | 6.381 | 1.170 | −82% |

**Gegner-XP skaliert mit Stage:**
- Formel: `xpValue × (1 + (stage - 1) × 0.04)`
- +4% XP pro Stage → Stage 30 Gegner geben ~2.2× so viel XP
- Gilt für alle Gegner-Typen (Basic, Shooter, Dasher, Tank) und Bosse
- Typ-Multiplikatoren (×1.3 Shooter, ×1.5 Dasher, ×2.0 Tank) werden *vor* der Stage-Skalierung angewandt

| Stage | Basic XP | Shooter XP | Tank XP |
|-------|----------|------------|---------|
| 1 | 15 | 19 | 30 |
| 10 | 20 | 26 | 41 |
| 20 | 26 | 34 | 53 |
| 30 | 32 | 42 | 65 |
| 40 | 38 | 50 | 77 |

**Level-Up:** Passives Auto-Leveling (siehe [Sektion 25](#25-reward-orb--performance-system)). Upgrade-Auswahl erfolgt über Reward Orb nach Raum-Clear.

**Level-skalierende Base-Upgrades (Reward Orb Auswahl):**

Base-Stat-Upgrades wachsen mit dem Spieler-Level, damit jede Belohnung im Endgame spürbar bleibt:

| Upgrade | Formel | Level 1 | Level 10 | Level 20 | Level 30 |
|---------|--------|---------|----------|----------|----------|
| ❤️ Max HP | `25 + floor(level × 2)` | +27 | +45 | +65 | +85 |
| 👢 Speed | `15 + floor(level × 0.5)` | +15 | +20 | +25 | +30 |
| ⚔️ Damage | `8 + floor(level × 1.5)` | +9 | +23 | +38 | +53 |

HP-Upgrade heilt zusätzlich 60% des gewährten HP-Bonus.

**Konstanten** (in `constants.js`):

| Konstante | Wert | Beschreibung |
|-----------|------|--------------|
| `XP_BASE` | 30 | Basis-XP für Level 1 → 2 |
| `XP_MULTIPLIER` | 1.25 | XP-Mult bis zum Soft-Cap |
| `XP_SOFT_CAP_LEVEL` | 10 | Ab wann Mult sinkt |
| `XP_MULT_FLOOR` | 1.08 | Minimaler XP-Mult |
| `XP_MULT_DECAY` | 0.015 | Mult-Verringerung pro Level über Soft-Cap |
| `ENEMY_XP_STAGE_SCALE` | 0.04 | +4% Gegner-XP pro Stage |
| `UPGRADE_HP_PER_LEVEL` | 2 | Extra HP pro Spieler-Level bei HP-Upgrade |
| `UPGRADE_SPEED_PER_LEVEL` | 0.5 | Extra Speed pro Spieler-Level |
| `UPGRADE_DAMAGE_PER_LEVEL` | 1.5 | Extra DMG pro Spieler-Level |

**Design-Ziel:** Der Spieler soll sich ab Stage 30+ zunehmend mächtiger fühlen und weiter spürbar stärker werden, während die Herausforderung durch Gegner-HP/Anzahl/Typen erhalten bleibt. Leveling darf nie zum Stillstand kommen.

---

## 6. Abilities (Aktive Fähigkeiten)

Max **2 Slots** (Q + E). Müssen permanent freigeschaltet werden.

| Ability | Icon | Cooldown | Beschreibung |
|---------|------|----------|--------------|
| 💥 **Shockwave** | 💥 | 8s | AoE Burst r140, ×1.2 DMG, KB 40. Triggert Procs. |
| 🌀 **Blade Storm** | 🌀 | 12s | 3s rotierende Klingen r110, ×0.4 DMG/Tick (alle 0.2s). Triggert Procs pro Tick. |
| 🌑 **Gravity Pull** | 🌑 | 10s | 1s Gegner in r180 anziehen (Force 220), dann 0.3s Slow (×0.4). |
| ❄️ **Freeze Pulse** | ❄️ | 10s | Alle Gegner in r160 einfrieren (1s), ×0.3 DMG. |

---

## 7. Procs (Passive Effekte)

Max **2 Slots**. Müssen permanent freigeschaltet werden.

| Proc | Icon | Trigger | Chance | Beschreibung |
|------|------|---------|--------|--------------|
| 🔥 **Explosive Strikes** | 🔥 | On Hit | 10% | AoE-Explosion am Ziel (r90, ×0.6 DMG), KB 8. Screen-Flash + Shake. |
| ⚡ **Chain Lightning** | ⚡ | On Hit | 12% | Blitz springt zu 3 Gegnern (r180, ×0.35 DMG). Visuell: Blitz-Linien. |
| 💎 **Heavy Crit** | 💎 | On Crit | 100% | +40% Extra-DMG + großer Impact (Hit-Stop 120ms, Shake 10). |

---

## 8. Status-Effekte (Debuffs auf Gegner)

Diese werden durch Abilities, Nodes und Procs auf Gegner angewendet:

| Status | Visuell | Effekt | Quellen |
|--------|---------|--------|---------|
| ❄️ **Freeze** | Blau-weißer Overlay, Eis-Kristalle | Gegner komplett bewegungsunfähig | Freeze Pulse, Freeze-Nodes |
| 🐢 **Slow** | Cyan gepunkteter Ring | Reduzierte Geschwindigkeit (Faktor einstellbar) | Gravity Pull (×0.4), Lava-Fallen (×0.55) |
| 🔥 **Burn** | Orange flackerndes Glühen | Schaden über Zeit (DPS-basiert) | Dagger Fire Trail (4 DPS, 1.2s), Dash Fire Trail (6 DPS, 0.8s) |

**Priorität:** Freeze > Slow (Freeze überschreibt Slow solange aktiv).  
**Burn** läuft unabhängig, auch während Freeze/Slow.

---

## 9. Pickup-Buffs (Item-Drops)

Jeder besiegte Gegner hat **25% Chance** einen Pickup zu droppen. Drops hängen vom Gegner-Typ ab.  
**Max aktive Buffs:** 3 gleichzeitig.  
**Lifetime:** 10s bevor sie verschwinden (blinken in den letzten 3s).

### Drop-Tabelle

| Gegner-Typ | Offensive Drop | Defensive Drop |
|------------|----------------|----------------|
| Basic | 🔴 Rage Shard | 💗 Heart Fragment |
| Shooter | 🟣 Piercing Shot | 🟪 Phase Shield |
| Dasher | 🟢 Speed Surge | 🟩 Swift Boots |
| Tank | 🟠 Crushing Blow | 🟡 Iron Skin |

### Buff-Details

| Pickup | Kategorie | Effekt | Dauer |
|--------|-----------|--------|-------|
| 🔴 **Rage Shard** | Offensiv | +50% DMG (×1.5) | 8s |
| 💗 **Heart Fragment** | Defensiv | +20 HP (instant heal) | Sofort |
| 🟣 **Piercing Shot** | Offensiv | +40% Range, +25% DMG | 8s |
| 🟪 **Phase Shield** | Defensiv | Nächsten Hit blocken | 15s |
| 🟢 **Speed Surge** | Offensiv | -40% Cooldowns (×0.6) | 8s |
| 🟩 **Swift Boots** | Defensiv | +40% Speed (×1.4) | 8s |
| 🟠 **Crushing Blow** | Offensiv | Nächster Angriff ×3 DMG + ×3 KB | Einmalig |
| 🟡 **Iron Skin** | Defensiv | -50% erlittener Schaden | 8s |

---

## 10. Upgrade-Nodes (In-Run Builds)

Nodes werden bei **Reward Orb Pickup**, **Events** und im **Shop** erworben. Jeder Node hat eine Rarität und Stack-Limit.

### 10.1 Rarity System (5 Tiers)

| Rarität | Farbe | Frühestes Stage | Badge-Effekt |
|---------|-------|-----------------|--------------|
| Common | `#b0bec5` | 1 | Standard-Pill |
| Uncommon | `#66bb6a` | 1 | Standard-Pill |
| Rare | `#42a5f5` | 1 | Standard-Pill |
| Epic | `#e040fb` | 10 | Pulsierender Glow-Aura |
| Legendary | `#ff6d00` | 25 | Starker Glow + leuchtender Text |

### 10.2 Stage-Scaled Rarity Weights

Gewichte skalieren dynamisch mit dem aktuellen Stage. Höhere Stages verschieben Gewicht in Richtung seltener Tiers.

**Progression-Faktor:** `progression = min(1.0, (stage - 1) / 49)` (0 bei Stage 1, ~1.0 bei Stage 50)

| Rarität | Stage 1 | Stage 10 | Stage 25 | Stage 50 |
|---------|---------|----------|----------|----------|
| Common | 50 | 45 | 36 | 22 |
| Uncommon | 35 | 36 | 37 | 40 |
| Rare | 12 | 14 | 17 | 22 |
| Epic | 0 | 5 | 8 | 13 |
| Legendary | 0 | 0 | 0 | 10 |

- **Epic** nodes werden erst ab **Stage 10** in die Pool aufgenommen
- **Legendary** nodes werden erst ab **Stage 25** verfügbar, Gewicht steigt linear mit `(stage - 25) × 0.4`
- `getEligibleNodes()` filtert Nodes raus, deren Rarity-Unlock-Stage noch nicht erreicht ist

### 10.3 Reward Selection (ehemals Level-Up Selection)

`buildRewardChoices()` bietet **3 Optionen** beim Reward Orb Pickup an:
- **2 General Picks** — aus dem gesamten Pool (stage-weighted rarity + Performance-Bonus)
- **1 Synergy Pick** — aus der Kategorie der aktuellen Waffe/Ability/Proc (bevorzugt passende Nodes)
- Duplikate werden gefiltert, Forge/Reroll Tokens können den Pool verändern
- Performance-Tier verschiebt Rarity-Gewichte (siehe [Sektion 25.3](#253-room-xp-performance-system))

---

### Melee-Nodes (13)

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| ⚔️ **Cleave** | Uncommon | 2 | +1 Extra Melee-Ziel pro Stack |
| 🌀 **Wide Arc** | Common | 2 | +20% Angriffs-Bogen pro Stack |
| ⚡ **Quick Strikes** | Common | 2 | +15% Angriffsgeschwindigkeit pro Stack |
| 💫 **Staggering Blows** | Uncommon | 1 | 10% Stun-Chance (0.5s) |
| 🩸 **Serrated Edge** | Uncommon | 1 | 20% Bleed (2s, 5 DPS) |
| 💥 **Kill Nova** | Rare | 1 | On Kill: AoE Burst (r60, ×0.4 DMG, 1s CD) |
| 🔨 **Heavy Strike** | Common | 1 | +30% KB, -10% Speed |
| 🏃 **Lunge** | Uncommon | 1 | Kleiner Vorstoß beim Angriff (30px) |
| 🧛 **Vampiric Edge** | Rare | 2 | 8% Melee-Lifesteal pro Stack |
| 🔗 **Chain Fury** | Uncommon | 1 | Kills geben +50% DMG für 2s |
| 🌋 **Earthquake Slam** | **Epic** | 1 | Jeder 5. Hit: Massives AoE Groundpound (r120, ×0.8 DMG) |
| 🌪️ **Whirlwind Strike** | **Epic** | 1 | 360° Angriffe, aber 20% langsamer |
| 🔆 **Razor Orbit** | Rare | 2 | Melee-Kill spawnt orbitierende Klinge (15s, ×0.25 DMG) |

### Dagger-Nodes (12)

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| 🗡️ **Multi-Dagger** | Uncommon | 2 | +1 Dagger pro Wurf |
| 🌊 **Fan of Knives** | Rare | 1 | 3-Wege Kegel (Arc 0.4) |
| 📌 **Piercing Daggers** | Common | 3 | +1 Pierce pro Stack |
| 🔄 **Ricochet** | Uncommon | 2 | +1 Wand-Abpraller pro Stack |
| 🔥 **Fire Trail** | Rare | 1 | Dolche hinterlassen Feuer-Spur (1.2s, 4 DPS) |
| 💨 **Swift Throw** | Common | 2 | +25% Dagger-Speed pro Stack |
| 🎯 **Precision Throw** | Common | 2 | +5% Crit-Chance (Daggers) pro Stack |
| 🪃 **Boomerang** | Rare | 1 | Dolche kehren zurück |
| 💣 **Explosive Daggers** | **Epic** | 1 | Dolche explodieren beim letzten Hit (r60, ×0.5 DMG) |
| 🎯 **Homing Daggers** | Rare | 1 | Dolche verfolgen leicht Gegner |
| 👻 **Shadow Daggers** | **Epic** | 1 | Dolche spawnen Geister-Kopie nach 0.3s (×0.4 DMG) |
| 🐍 **Venomous Tips** | Uncommon | 1 | Dolche verlangsamen Gegner 30% für 1.5s |

### Dash-Nodes (9)

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| 💥 **Impact Dash** | Uncommon | 1 | AoE + KB am Dash-Ende (r50, KB 15) |
| 🔥 **Blazing Dash** | Uncommon | 1 | Feuer-Spur beim Dashen (6 DPS, 0.8s) |
| ⏱️ **Quick Recovery** | Common | 2 | -15% Dash-Cooldown pro Stack |
| 📏 **Extended Roll** | Common | 2 | +20% Dash-Distanz pro Stack |
| 💫 **Stunning Rush** | Uncommon | 1 | Dash-Kollision stunt 0.4s |
| ⚡ **Double Dash** | **Legendary** | 2 | +1 Dash Charge (verkettbare Dashes!) |
| 👻 **Phantom Trail** | **Epic** | 1 | Dash hinterlässt schadenverursachende Nachbilder (×0.35, 0.6s) |
| 🌀 **Void Rift** | **Epic** | 1 | Dash hinterlässt Vortex der Gegner anzieht (r80, 1.5s) |
| ♻️ **Dash Reset** | Uncommon | 1 | Kills resetten sofort Dash-Cooldown |

### Shockwave-Nodes (7) — *Benötigen Shockwave equipped*

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| 💥 **Wider Blast** | Common | 2 | +30% Radius pro Stack |
| 🔄 **Aftershock** | Rare | 1 | Zweiter Puls nach 0.3s (60% DMG) |
| 💫 **Concussive Blast** | Uncommon | 1 | Stun 0.6s im inneren Radius (50%) |
| ⏱️ **Seismic Affinity** | Common | 1 | -20% Cooldown |
| 💥 **Chain Reaction** | **Epic** | 1 | Getötete Feinde explodieren (×0.4 DMG, r70) |
| 🔥 **Scorching Wave** | Uncommon | 1 | Shockwave entzündet Feinde (4 DPS, 2s) |
| 🌑 **Gravity Shock** | Uncommon | 1 | Shockwave zieht Feinde erst nach innen |

### Blade Storm-Nodes (6) — *Benötigen Blade Storm equipped*

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| 🌀 **Prolonged Storm** | Common | 2 | +1s Dauer pro Stack |
| 🌀 **Expanding Vortex** | Common | 2 | +15% Radius pro Stack |
| ⏱️ **Storm Mastery** | Uncommon | 1 | -15% Cooldown |
| ⚡ **Lightning Vortex** | Rare | 1 | Storm zappt Feinde mit Bonus-⚡-DMG (×0.2) |
| 🩸 **Shredding Blades** | Uncommon | 1 | Storm verursacht Bleed (3 DPS, 2s) |
| 🌋 **Blade Eruption** | **Legendary** | 1 | Storm endet mit massiver Explosion (r160, ×1.0 DMG) |

### Gravity Pull-Nodes (4) — *Benötigen Gravity Pull equipped*

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| 🌑 **Gravity Well** | Common | 2 | +25% Radius pro Stack |
| ⏱️ **Warp Affinity** | Uncommon | 1 | -15% Cooldown |
| ⚫ **Singularity** | **Epic** | 1 | Pull komprimiert Feinde, +25% DMG taken (3s) |
| 💥 **Void Explosion** | **Epic** | 1 | Pull endet mit violenter Explosion (r120, ×0.8 DMG) |

### Freeze Pulse-Nodes (6) — *Benötigen Freeze Pulse equipped*

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| ❄️ **Permafrost** | Common | 2 | +25% Radius pro Stack |
| ❄️ **Deep Freeze** | Uncommon | 2 | +0.5s Freeze-Dauer pro Stack |
| ⏱️ **Frost Mastery** | Uncommon | 1 | -20% Cooldown |
| 💎 **Shatter** | **Epic** | 1 | Gefrorene Feinde töten: AoE Eis-DMG (r80, ×0.6) |
| ❄️ **Frost Nova Chain** | **Epic** | 1 | Freeze breitet sich auf 2 nahe Feinde aus (r120) |
| 🧊 **Absolute Zero** | Uncommon | 1 | Gefrorene Feinde nehmen +30% mehr DMG |

### Explosive Strikes-Nodes (5) — *Benötigen Explosive Strikes equipped*

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| 🔥 **Volatile Mix** | Uncommon | 3 | +5% Explosion-Chance (cap +15% → 25% total) |
| 💥 **Blast Radius** | Common | 2 | +20% Explosion-Radius pro Stack |
| 💣 **Bigger Boom** | Uncommon | 2 | +15% Explosion-DMG pro Stack |
| 🔥 **Inferno Chain** | **Epic** | 1 | Explosionen können weitere Explosionen triggern (25% Chance) |
| 🔥 **Napalm** | Uncommon | 1 | Explosionen hinterlassen Feuer (5 DPS, 2s) |

### Chain Lightning-Nodes (5) — *Benötigen Chain Lightning equipped*

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| ⚡ **Longer Chain** | Common | 2 | +1 Blitz-Sprung pro Stack |
| ⚡ **Conduction** | Uncommon | 2 | +5% Lightning-Chance (cap +13% → 25% total) |
| ⚡ **Extended Arc** | Common | 2 | +20% Lightning-Range pro Stack |
| ⚡ **Overcharge** | Uncommon | 2 | +25% Chain Lightning-DMG pro Stack |
| ⚡ **Paralyzing Bolt** | Rare | 1 | Lightning stunt letztes Ziel 0.5s |

### Heavy Crit-Nodes (4) — *Benötigen Heavy Crit equipped*

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| 💎 **Devastating Crits** | Uncommon | 2 | +20% Crit-Bonus-DMG pro Stack |
| 🎯 **Keen Eye** | Common | 3 | +3% globale Crit-Chance pro Stack |
| 💥 **Critical Mass** | **Epic** | 1 | Crits verursachen kleine Explosion (r50, ×0.3 DMG) |
| 🔥 **Crit Streak** | Uncommon | 1 | Jeder Crit: +5% nächste Crit-Chance (max +25%) |

### Global-Nodes (6)

| Node | Rarität | Max | Effekt |
|------|---------|-----|--------|
| ⚡ **Power Surge** | Rare | 2 | +8% aller Schaden pro Stack |
| ⏱️ **Temporal Flux** | Rare | 2 | -8% aller Cooldowns pro Stack |
| 🌈 **Elemental Fury** | **Legendary** | 1 | On Kill: zufälliger elementarer Burst (r70, ×0.35) |
| 🏃 **Momentum** | Rare | 1 | Kills innerhalb 3s: +5% Speed (max +30%) |
| 🔮 **Glass Cannon** | **Legendary** | 1 | +25% aller DMG, aber -15% Max HP |
| ⚡ **Overcharge** | **Epic** | 1 | +15% Ability-DMG, -10% Ability-CD |

### Node-Zählung nach Rarität

| Rarität | Anzahl |
|---------|--------|
| Common | 23 |
| Uncommon | 27 |
| Rare | 12 |
| Epic | 14 |
| Legendary | 4 |
| **Gesamt** | **80** |

---

## 11. Event System (Spezial-Räume)

**Bedingungen:** Stage ≥ 8, kein Boss-Raum, nicht in Folge, **12% Chance** pro Raum.

| Event | Icon | Beschreibung |
|-------|------|--------------|
| 🔨 **Ancient Forge** | 🔨 | Wähle eine Kategorie (Melee/Dagger/Dash/Ability/Proc), dann einen Node daraus. Garantierter Upgrade. |
| 🏛️ **Shrine** | 🏛️ | 3 Optionen: Rarer Node + Curse (-10% Max HP), Common Node ohne Curse, oder Skip. |
| 📚 **Library** | 📚 | Ersetze einen bereits angewendeten Node durch einen neuen. Gut für Build-Korrektur. |
| 🎲 **Chaos** | 🎲 | 3 Optionen: Zufälliger Node gratis, 15% HP opfern für Rare-Auswahl (1 von 3), oder Skip. |
| ⚔️ **Trial** | ⚔️ | Überlebe 15 Sekunden! Bei Erfolg: Belohnung. Timed Challenge. |
| 🧳 **Trader** | 🧳 | Kaufe Tokens für Coins: Forge Token (18 🪙) zum gezielten Upgrade, oder Reroll Token (10 🪙) für Level-Up Reroll. |

### Event-Ablauf
1. **Intro** → Typ-Anzeige
2. **Auswahl** → W/S navigieren, Enter/Space bestätigen
3. **Ergebnis** → Node angewendet / Token erhalten / Übersprungen
4. **Enter** → Weiter zum nächsten Raum

---

## 12. Unlock-System

### Achievement-basierte Unlocks

| Achievement | Freigeschaltet |
|------------|----------------|
| 🛡️ Untouchable III (3 Räume no-hit) | ❄️ Freeze Pulse (Ability) |
| ⚔️ 500 Kills total | 🌀 Blade Storm (Ability) |
| 🎯 3 Bosse no-hit Streak | 🌑 Gravity Pull (Ability) |
| 🌍 Alle Biome besucht | ⚡ Chain Lightning (Proc) |
| 💀 3 Bosse in einem Run | 💎 Heavy Crit (Proc) |
| 👑 Stage 20 erreicht | 💥 Kill Nova (Melee-Node) |
| 👑 Stage 30 erreicht | 🌊 Fan of Knives (Dagger-Node) |
| 🛡️ Untouchable IV (5 Räume no-hit) | 💥 Impact Dash (Dash-Node) |
| ✨ Perfect Run I (Stage 10 ohne DMG) | 🪃 Boomerang (Dagger-Node) |

### Biome-Mastery Unlocks

Freischaltung durch Besiegen von Bossen in einem bestimmten Biome.

| Biome | Milestone 1 (1 Boss) | Milestone 2 (3 Bosse) |
|-------|----------------------|----------------------|
| 🌿 Jungle | 🏃 Lunge (Melee) | 🔥 Fire Trail (Dagger) |
| 🏜️ Desert | 🔥 Blazing Dash (Dash) | 🩸 Serrated Edge (Melee) |
| 🔥 Wasteland | 💫 Staggering Blows (Melee) | 🔄 Ricochet (Dagger) |
| 🌊 Depths | 💫 Stunning Rush (Dash) | 🔨 Heavy Strike (Melee) |

### Boss-Kill Milestones

| Boss-Kills | Unlock-Typ |
|-----------|------------|
| 2 | Zufällige Ability |
| 4 | Zufälliger Proc |
| 6 | Zufällige Ability |
| 8 | Zufälliger Proc |
| 11 | Zufällige Ability |
| 14 | Zufälliger Proc |

### Pity-System

Wenn ein Spieler **Stage 10+** erreicht und nur **≤ 1 Ability** freigeschaltet hat, bekommt er **automatisch** eine zufällige Ability geschenkt.

---

## 13. Boss Scroll (Permanente Unlocks)

- **Drop-Chance:** 20% bei Boss-Kill
- **UI:** Goldener Overlay „📜 ANCIENT SCROLL"
- **Auswahl:** 3 zufällige noch gesperrte Items (Abilities, Procs, oder Uncommon/Rare Nodes)
- **Wahl:** Spieler wählt 1 Item → permanent freigeschaltet

---

## 14. Meta-Progression

### Core Shards (Währung)

Verdient durch Runs, ausgegeben im Meta-Shop.

### Meta-Perks (4 Stück, je max Level 10)

| Perk | Icon | Effekt pro Level | Max-Effekt |
|------|------|-----------------|------------|
| ♥ **Vitality** | ♥ | +1% Max HP | +10% HP |
| ⚔ **Might** | ⚔ | +1% DMG | +10% DMG |
| ⚡ **Haste** | ⚡ | +0.5% Speed | +5% Speed |
| ✦ **Wisdom** | ✦ | +1% XP Gain | +10% XP |

**Kosten pro Level:** 3, 3, 5, 5, 7, 7, 9, 12, 15, 20 Core Shards

### Relics (8 permanente Passives)

Relics droppen mit **5% Chance** bei Boss-Kill. Einmal freigeschaltet, immer aktiv.

| Relic | Icon | Effekt |
|-------|------|--------|
| ✧ **XP Spark** | ✧ | +3% XP Gain |
| ☠ **Boss Hunter** | ☠ | +5% DMG vs Bosse |
| 🛡 **Tough Skin** | 🛡 | -3% erlittener Schaden |
| 💨 **Quick Step** | 💨 | +2% Bewegungs-Speed |
| 💚 **Vitality Surge** | 💚 | Heile 10% Max HP bei Level-Up |
| 🔮 **Starting Orb** | 🔮 | Starte jeden Run mit +10 XP |
| ▲ **Spike Sense** | ▲ | Spikes -10% Schaden |
| 🔥 **Lava Boots** | 🔥 | Lava -10% Schaden |

---

## 15. Run-Shop (Coin-Ökonomie)

### Coin-Verdienst

| Quelle | Coins |
|--------|-------|
| Normaler Gegner | 1 |
| Elite (Tank, Dasher) | 3 |
| Boss | 10 |

Coins droppen als sammelbare Münzen (4s Lifetime, r50 Magnet-Anziehung).

### Shop-Items (erscheint nach Boss-Kill)

| Item | Icon | Kosten | Effekt |
|------|------|--------|--------|
| 💎 **Vitality Shard** | 💎 | 10 🪙 | +15 Max HP permanent |
| 🔷 **Repair Armor** | 🔷 | 12 🪙 | +1 Shield Charge |
| 🗡️ **Sharpen Blade** | 🗡️ | 15 🪙 | +8% DMG (Rest des Runs) |
| 👢 **Light Boots** | 👢 | 15 🪙 | +5% Speed (Rest des Runs) |
| 💣 **Bomb** | 💣 | 10 🪙 | 1 Ladung: Große AoE + Stun (B-Taste, r180, ×2.5 DMG, 1.2s Stun) |
| 🧱 **Trap Resist** | 🧱 | 14 🪙 | -15% Spike & Lava Schaden |
| 🔨 **Forge Token** | 🔨 | 18 🪙 | Gezieltes Upgrade wählen (25% Chance im Shop) |

---

## 16. Combo / Kill-Chain

Schnelle aufeinanderfolgende Kills innerhalb von **2.5 Sekunden** bauen eine Combo auf.

| Tier | Kills | XP-Multiplikator |
|------|-------|-----------------|
| Tier 1 | 3 | ×1.25 |
| Tier 2 | 5 | ×1.5 |
| Tier 3 | 8 | ×2.0 |
| Tier 4 | 12 | ×2.5 |

---

## 17. Canyon / Pit Traps

Ab **Stage 11** (Act 2) erscheinen Abgründe im Raum.

| Stage-Bracket | Anzahl pro Raum |
|--------------|----------------|
| 11–20 | 1–3 |
| 21–30 | 3–8 |
| 31+ | 6–14 |

**Sturz-Strafe:** -35% Max HP + -10% Coins.  
**Dash-Überquerung:** Bis zu 2 Tiles breit überdashbar.

---

## 18. Achievements (40 Stück)

### Easy (10)

| ID | Name | Beschreibung |
|----|------|--------------|
| first_blood | First Blood | Ersten Gegner töten |
| reach_stage_5 | Getting Started | Stage 5 erreichen |
| reach_stage_8 | Dungeon Apprentice | Stage 8 erreichen |
| untouchable_1 | Untouchable I | Raum (≥10 Gegner) ohne Schaden clearen |
| coins_50_run | Coin Collector | 50 Coins in einem Run |
| level_5_run | Level Up! | Level 5 in einem Run |
| first_boss_down | First Boss Down | Ersten Boss besiegen |
| unlock_1_relic | Treasure Hunter | Erstes Relic freischalten |
| buy_1_meta_upgrade | Meta Investor | Ersten Meta-Perk kaufen |
| buy_meta_booster | Prepared | Meta-Booster vor Run kaufen |

### Medium (10)

| ID | Name | Beschreibung |
|----|------|--------------|
| kills_100_total | Centurion | 100 Gegner insgesamt töten |
| untouchable_2 | Untouchable II | 2 Räume (≥10 Gegner) in Folge ohne Schaden |
| coins_100_run | Wealthy | 100 Coins in einem Run |
| reach_stage_15 | Dungeon Adept | Stage 15 erreichen |
| boss_kills_2_run | Double Boss Slayer | 2 Bosse in einem Run |
| collector_pickups | Collector | Jeden Pickup-Typ mindestens 1× sammeln |
| unlock_3_relics | Relic Seeker | 3 Relics freischalten |
| meta_upgrades_10_total | Upgrade Addict | 10 Meta-Perk Upgrades insgesamt |
| boss_no_hit_1 | Efficient | Boss ohne Schaden besiegen |
| reach_stage_10_fast | Speed Runner I | Stage 10 in unter 10 Minuten |

### Hard (10)

| ID | Name | Beschreibung |
|----|------|--------------|
| kills_500_total | Monster Hunter | 500 Gegner insgesamt töten |
| untouchable_3 | Untouchable III | 3 Räume in Folge ohne Schaden |
| boss_kills_3_run | Boss Hunter | 3 Bosse in einem Run |
| reach_stage_20 | Dungeon Master | Stage 20 erreichen |
| level_15_run | Full Build | Level 15 in einem Run |
| coins_200_run | High Roller | 200 Coins in einem Run |
| no_revive_to_stage_20 | No Panic | Stage 20 ohne Revive |
| visit_all_biomes_run | Biome Traveler | Alle 4 Biome in einem Run besuchen |
| trap_dancer_5 | Trap Dancer | 5 Trap-Räume (≥10 Gegner) ohne Schaden clearen |
| minimalist_stage_20 | Minimalist | Stage 20 ohne Meta-Booster |

### Very Hard (9)

| ID | Name | Beschreibung |
|----|------|--------------|
| kills_1000_total | Legend in the Making | 1000 Gegner insgesamt |
| untouchable_5 | Untouchable IV | 5 Räume in Folge ohne Schaden |
| boss_no_hit_3_streak | Boss Rush | 3 Bosse in Folge no-hit |
| reach_stage_30 | Dungeon Overlord | Stage 30 erreichen |
| no_damage_to_stage_10 | Perfect Run I | Stage 10 ohne jeglichen Schaden |
| unlock_all_relics | Relic Master | Alle 8 Relics freischalten |
| max_one_meta_perk | Meta Maxer | Einen Meta-Perk auf Level 10 |
| shopaholic_10_run | Shopaholic | 10 Shop-Items in einem Run kaufen |
| boss_kills_10_total | Seasoned Slayer | 10 Bosse insgesamt besiegen |

### Legendary (1)

| ID | Name | Beschreibung |
|----|------|--------------|
| true_dungeon_god | True Dungeon God | Stage ≥30, kein Booster, kein Revive, 3+ Bosse no-hit, ≤3 Schadens-Events |

---

## 19. Loadout System

Vor jedem Run wählt der Spieler sein Loadout:
- **1 Waffe** — aus freigeschalteten Waffen (siehe [§22 Waffen-Typen](#22-waffen-typen))
- **2 Ability-Slots** (Q + E) — aus freigeschalteten Abilities
- **2 Proc-Slots** — aus freigeschalteten Passives

Locked Items zeigen den nächsten Unlock-Hinweis (z.B. „Next Ability at 6 boss kills (4/6)").

---

## 20. Meta-Boosters (Einmal-pro-Run)

Vor dem Run im Meta-Shop kaufbar. Max **1 Booster pro Run**.

| Booster | Icon | Kosten | Effekt | Unlock |
|---------|------|--------|--------|--------|
| 🛡️ **Shield Pack** | 🛡️ | 12 Shards | Start mit 3 Shield Charges (absorbieren 3 Hits) | 5 Runs gespielt |
| ⚔️ **Weapon Core** | ⚔️ | 25 Shards | +12% DMG bis Boss 2 | 3 Bosse getötet (total) |
| 📖 **Training Manual** | 📖 | 10 Shards | +20% XP bis Level 5 | 3 Runs gespielt |
| 💀 **Panic Button** | 💀 | 30 Shards | 1× Revive mit 50% HP pro Run | 8 Bosse getötet (total) |
| 🍀 **Lucky Start** | 🍀 | 8 Shards | Start mit 15 Bonus-Coins | 8 Runs gespielt |
| 🪨 **Thick Skin** | 🪨 | 20 Shards | -10% Schaden genommen (gesamter Run) | 5 Bosse getötet (total) |
| 💨 **Swift Feet** | 💨 | 15 Shards | +10% Bewegungsspeed (gesamter Run) | Stage 20 erreicht |
| 🪙 **Scavenger** | 🪙 | 22 Shards | +30% Coin-Drops von allen Gegnern | Stage 30 erreicht |

---

## Second Wave System

Ab **Stage 8** besteht eine **15% Chance**, dass nach dem Clearen eines Raumes eine zweite Welle spawnt.
- **Gegner-Anzahl:** 75% der normalen Menge
- **Ankündigung:** 2s „WAVE 2" Banner

---

## Zusammenfassung: Wann tritt was auf?

| Stage | Neue Mechanik |
|-------|---------------|
| 1 | Basic Enemies, Melee + Dagger + Dash |
| 4 | ⬆️ Spike Hazards |
| 5 | 🟣 Shooter Enemies |
| 6 | 🟧 Lava Hazards, 🌑 Darkness Rooms möglich |
| 7 | 🟢 Dasher Enemies |
| 8 | ➡️ Arrow Traps, 🎲 Events möglich (12% Chance), Second Wave möglich |
| 9 | 🟠 Tank Enemies |
| 10 | 💪 **Boss 1 (The Brute)** + Shop, Pity-System prüft |
| 11 | � Depths Biome (-10% Player Speed), 🕳️ Canyon Pits |
| 20 | 🧙 **Boss 2 (The Warlock)** + Shop |
| 21 | 🏜️ Desert Biome |
| 30 | 👻 **Boss 3 (The Phantom)** + Shop |
| 31 | 🔥 Wasteland Biome |
| 40 | 🛡️ **Boss 4 (The Juggernaut)** + Shop |
| 41 | 🚀 Spaceship Biome |
| 50 | 💪 **Boss 5** + Shop |

### Act-Struktur

| Act | Rooms | Ziel | Feind-Dichte | Schaden |
|-----|-------|------|--------------|---------|
| **Act 1** (Formation) | 1–9 → Boss 10 | Build aufbauen | 2→6 (gestuft) | Basis |
| **Act 2** (Identity) | 11–19 → Boss 20 | Build testen | 6→8 | +2 |
| **Act 3** (Synergy) | 21–29 → Boss 30 | Synergie beweisen | 8→10 | +4 |
| **Act 4** (Mastery) | 31–39 → Boss 40 | Meisterschaft | 10 (max) | +6 |
| **Act 5** (Endurance) | 41–49 → Boss 50 | Grenzen austesten | 10 (max) | +6 |

---

## 21. Charakter-Klassen

Klasse wird bei **Profil-Erstellung** gewählt und kann danach nicht geändert werden. Jede Klasse hat eigene Stat-Multiplikatoren und eine passive Fähigkeit.

| Klasse | Farbe | HP-Mult | DMG-Mult | Speed-Mult | Passive |
|--------|-------|---------|----------|------------|---------|
| ⭐ **Adventurer** | Gold | ×1.0 | ×1.0 | ×1.0 | Heile 10% Max HP nach jedem geclarten Raum |
| 🛡️ **Guardian** | Blau | ×1.2 | ×1.0 | ×0.9 | Auto-Shield: blockt 1 Hit, alle 20s aufladbar |
| 🗡️ **Rogue** | Grün | ×0.85 | ×1.0 | ×1.15 | +15% Crit-Chance, Crits machen ×1.8 Schaden |
| 💥 **Berserker** | Rot | ×0.9 | ×1.15 | ×1.0 | Unter 30% HP → +40% Schaden |

**Default-Klasse:** Adventurer (für alte Profile ohne Klasse).

### Passive Details

- **Adventurer – Room Heal:** Nach jedem geclarten Raum wird 10% Max HP geheilt. Zuverlässige passive Heilung.
- **Guardian – Auto-Shield:** Blockt den nächsten erlittenen Hit komplett (setzt Invulnerabilität statt Schaden). Cooldown: 20 Sekunden. Visuell: pulsierender blauer Ring + 🛡 Icon über dem Spieler.
- **Rogue – Crit Bonus:** +15% auf die Basis-Crit-Chance (5% → 20%). Crits machen ×1.8 statt normalem Schaden. Stapelt mit Keen Eye-Nodes.
- **Berserker – Rage:** Wenn HP unter 30% fällt, wird `berserkActive = true` → +40% Schadens-Multiplikator. Visuell: roter pulsierender Aura-Ring + rote Partikel.

### Klassen-Emblem

Jede Klasse hat ein kleines Emblem, das semi-transparent im Spieler-Kreis gezeichnet wird:
- Adventurer: Kompass-Stern
- Guardian: Schild-Form
- Rogue: X Schrägstriche
- Berserker: Flamme / Faust

---
mwdada
## 22. Waffen-Typen

Drei Waffen ändern das Verhalten des Melee-Angriffs. Ausgewählt im **Loadout-Screen** vor dem Run.

Multiplikatoren werden auf die Basis-Werte angewendet und stapeln mit Klassen-Mults, Buffs und Nodes.

| Waffe | Icon | Arc | Range | Cooldown | DMG-Mult | KB-Mult | Unlock | Besonderheit |
|-------|------|-----|-------|----------|----------|---------|--------|--------------|
| ⚔ **Sword** | ⚔ | 120° (×1.0) | 50px (×1.0) | 350ms (×1.0) | ×1.0 | ×1.0 | Immer | Ausgewogen, keine Schwächen |
| 🔱 **Spear** | 🔱 | ~40° (×0.33) | 75px (×1.5) | ~400ms (×1.14) | ×1.1 | ×0.75 | Stage 10 | Enger Bogen, große Reichweite |
| 🔨 **Hammer** | 🔨 | 360° (×3.0) | 35px (×0.7) | ~500ms (×1.43) | ×1.3 | ×1.75 | Stage 15 | Voller Kreis, langsam, massiver Knockback |

### Waffen-Auswahl

- Waffen-Auswahl ist **pro Run** (nicht im Profil gespeichert)
- Gesperrte Waffen zeigen die Freischalt-Bedingung
- Im Loadout-Screen als obere Sektion über den Abilities

---

## 23. Charakter-Anpassung (Kosmetik)

Rein visuelle Optionen, die pro Profil auf dem **Characters-Screen** eingestellt werden.

### Körperfarbe (C-Taste auf Profil-Screen)

8 Farbpaletten — jede definiert Körper, Umriss, Dash- und Geister-Farbe:

| Farbe | Body | Outline | Dash | Ghost |
|-------|------|---------|------|-------|
| 🔵 **Cyan** (Default) | `#4fc3f7` | `#2980b9` | `#b3e5fc` | `#4fc3f7` |
| 🔴 **Crimson** | `#ef5350` | `#b71c1c` | `#ffcdd2` | `#ef5350` |
| 🟢 **Emerald** | `#66bb6a` | `#2e7d32` | `#c8e6c9` | `#66bb6a` |
| 🟡 **Gold** | `#ffd740` | `#f9a825` | `#fff9c4` | `#ffd740` |
| 🟣 **Violet** | `#ce93d8` | `#7b1fa2` | `#f3e5f5` | `#ce93d8` |
| ⚪ **White** | `#eceff1` | `#78909c` | `#ffffff` | `#eceff1` |
| 🟠 **Orange** | `#ffa726` | `#e65100` | `#ffe0b2` | `#ffa726` |
| 🧊 **Ice** | `#80deea` | `#00838f` | `#e0f7fa` | `#80deea` |

### Hüte / Accessoires (H-Taste auf Profil-Screen)

12 kosmetische Hüte, die auf dem Spieler-Kreis gezeichnet werden. Müssen freigeschaltet werden.

| Hut | Unlock-Bedingung | Visuell |
|-----|------------------|---------|
| **None** | Immer | Kein Hut |
| 🎀 **Bandana** | Stage 5 erreicht | Rotes Stirnband mit Schweif |
| 👑 **Crown** | Stage 10 erreicht | Goldene Krone mit Juwelen |
| 😈 **Horns** | Achievement: Boss Hunter (3 Bosse in 1 Run) | Braune gebogene Hörner |
| 😇 **Halo** | Stage 20 erreicht | Pulsierender goldener Heiligenschein |
| 🧙 **Wizard Hat** | Achievement: Centurion (100 Kills total) | Lila Spitzhut mit Stern |
| 🦌 **Antlers** | Stage 30 erreicht | Verzweigte Geweihe |
| 🦍 **Ape** | 🌿 Jungle-Biome abgeschlossen (Stage 10) | Braunes Fell, Augenbrauen, Ohren |
| 🤿 **Diving Mask** | 🌊 Depths-Biome abgeschlossen (Stage 20) | Blaue Taucherbrille + Schnorchel |
| 🧕 **Turban** | 🏜️ Desert-Biome abgeschlossen (Stage 30) | Cremefarbene Wicklung, Juwel, Feder |
| ☣️ **Gas Mask** | 🔥 Wasteland-Biome abgeschlossen (Stage 40) | Dunkle Gläser, Filterkanister |
| 🧑‍🚀 **Astronaut** | 🚀 Spaceship-Biome abgeschlossen (Stage 50) | Weißer Helm, goldenes Visier |

### Profil-Daten

Pro Profil gespeichert: `{ name, highscore, colorId, classId, hatId }`

- `colorId` — Default: `'cyan'`
- `classId` — Default: `'adventurer'` (gewählt bei Erstellung)
- `hatId` — Default: `'none'`
- Alte Profile ohne diese Felder werden automatisch migriert

---

## 24. Talent Tree (Per-Run)

Ein pro-Run Talent-Baum mit **3 Zweigen × 5 Knoten × 3 Ränge** (15 Talente, 45 Ränge total). Punkte werden durch Leveln verdient und verfallen am Ende des Runs.

### Punkte-Vergabe

- **1 Talentpunkt alle 2 Level** (berechnet als `Math.floor(playerLevel / 2)`)
- Koexistiert mit dem bestehenden 3-Wahl Level-Up System (Option B)
- Talentbaum öffnen: **Tab-Taste** (während Gameplay oder Level-Up Overlay)
- Punkte werden beim Starten eines neuen Runs zurückgesetzt

### Offense-Zweig (⚔ Rot)

| Tier | Talent | Icon | Effekt pro Rang | Max Rang |
|------|--------|------|-----------------|----------|
| 1 | **Sharp Edge** | 🗡️ | +5% Nahkampfschaden | 3 |
| 2 | **Quick Slash** | ⚡ | -5% Angriffs-Cooldown | 3 |
| 3 | **Wide Swing** | 🌀 | +8% Angriffsbogen | 3 |
| 4 | **Critical Eye** | 🎯 | +3% Krit-Chance | 3 |
| 5 | **Executioner** | 💀 | +10% Schaden gegen Gegner unter 30% HP | 3 |

### Defense-Zweig (🛡 Grün)

| Tier | Talent | Icon | Effekt pro Rang | Max Rang |
|------|--------|------|-----------------|----------|
| 1 | **Tough Hide** | 🛡️ | +8% Max-HP | 3 |
| 2 | **Quick Recovery** | 💎 | -8% Unverwundbarkeits-Cooldown | 3 |
| 3 | **Iron Will** | 🏔️ | -3% erlittener Schaden | 3 |
| 4 | **Second Wind** | 💚 | +2% Max-HP Heilung pro Raumabschluss | 3 |
| 5 | **Endurance** | ⏳ | +10% Buff-Dauer | 3 |

### Utility-Zweig (⚡ Blau)

| Tier | Talent | Icon | Effekt pro Rang | Max Rang |
|------|--------|------|-----------------|----------|
| 1 | **Fleet Foot** | 👟 | +3% Bewegungsgeschwindigkeit | 3 |
| 2 | **Dash Mastery** | 💨 | -8% Dash-Cooldown | 3 |
| 3 | **XP Siphon** | ✨ | +5% XP-Gewinn | 3 |
| 4 | **Pickup Magnet** | 🧲 | +15% Pickup-Sammelradius & Münz-Magnetreichweite | 3 |
| 5 | **Fortune** | 🍀 | +5% Münz-Droprate | 3 |

### Modifier-Integration

Talent-Multiplikatoren werden auf den `Player` als Properties gesetzt und greifen in:

| Modifier | Anwendung in |
|----------|--------------|
| `talentMeleeDmgMult` | `player.getEffectiveDamage()` |
| `talentAtkCdMult` | `player.attack()` — Cooldown |
| `talentArcMult` | `player.attack()` — Bogenwinkel |
| `talentCritBonus` | Krit-Checks in `game.js` (Nahkampf + Dolch) |
| `talentExecutionerMult` | `player.attack()` — Bonus unter 30% HP |
| `talentMaxHpMult` | `game._applyTalentMods()` — Verhältnis-basiert |
| `talentInvulnCdMult` | `player.takeDamage()` |
| `talentDmgTakenMult` | `player.takeDamage()` — nach Meta-Mult |
| `talentRoomHealPct` | `game.nextRoom()` — nach Adventurer-Heal |
| `talentBuffDurMult` | `player.applyBuff()` |
| `talentSpeedMult` | `player.getEffectiveSpeed()` |
| `talentDashCdMult` | `player.tryDash()` |
| `talentXpMult` | XP-Berechnung bei Gegner-Kill + Boss-Kill |
| `talentPickupRadiusMult` | `Pickup.checkCollection()` + `CoinPickup` + Münz-Magnetreichweite |
| `talentCoinDropMult` | Münz-Drop-Chance in `game.js` |

### UI

- **State:** `STATE_TALENTS` — eigener Zustand in der State-Machine
- **Öffnen:** Tab-Taste (aus `STATE_PLAYING` oder `STATE_LEVEL_UP`)
- **Schließen:** Tab oder Esc → zurück zum vorherigen State
- **Layout:** 3 Spalten (Offense / Defense / Utility), 5 Reihen pro Spalte
- **Navigation:** WASD/Pfeiltasten (W/S = Tier, A/D = Zweig), Enter/Space = Upgrade
- **Level-Up Hinweis:** Pulsierender goldener Text „🌟 X Talent point(s) available! (Tab)" im Level-Up Overlay
- **Pause-Menü:** Investierte Talente erscheinen in der „Active Effects" Liste

### Dateien

| Datei | Rolle |
|-------|-------|
| `src/talents.js` | Talent-Definitionen, State-Management, `computeTalentMods()` |
| `src/ui/talentTree.js` | Render-Funktion für das Talent-Tree Overlay |
| `src/constants.js` | `STATE_TALENTS` Konstante |
| `src/entities/player.js` | 15 Talent-Modifier Properties + Integration |
| `src/entities/pickup.js` | Pickup-Radius-Multiplikator |
| `src/game.js` | State-Management, Punkt-Sync, Modifier-Anwendung |

---

## 25. Reward Orb & Performance System

> **Design-Inspiration:** Hades — Belohnungen sind räumliche Objekte, die der Spieler aktiv einsammelt. Kein Gameplay-Interrupt mehr durch Level-Up Overlays.

### 25.1 Überblick — Neuer Progressions-Flow

Der alte Flow (Kill → XP → Level-Up Interrupt → Wahl) wurde ersetzt durch einen flüssigeren, Hades-inspirierten Flow:

```
Kill Enemies → XP fließt (passives Auto-Leveling) → Raum gecleart
   → Reward Orb spawnt in Raum-Mitte → Spieler läuft zum Orb
   → Belohnungs-Overlay (3 Optionen) → Tür öffnet sich → Weiter
```

**Kernprinzipien:**
1. **Kein Gameplay-Interrupt:** Level-Ups passieren passiv im Hintergrund (nicht-blockierende Banner)
2. **Räumliche Belohnung:** Spieler muss zum leuchtenden Orb laufen (bewusste Entscheidung)
3. **Performance wird belohnt:** XP-Rating im Raum beeinflusst die Qualität der Belohnungsoptionen
4. **Tür bleibt gesperrt** bis der Reward Orb eingesammelt wurde (kein Überspringen)

### 25.2 Passives Auto-Leveling

Wenn der Spieler genug XP sammelt, steigt er **automatisch** auf — ohne Overlay, ohne Pause.

**Ablauf pro Kill:**
1. `player.addXp(xp)` — XP wird hinzugefügt
2. `roomXP += xp` — Room XP-Counter steigt
3. **While** `player.xp >= threshold`: `player.autoLevelUp()` wird aufgerufen
4. Performance-Tier wird neu berechnet

**Auto-Level Stat-Gains (kleine, passive Boosts):**

| Stat | Wert pro Level | Beschreibung |
|------|----------------|--------------|
| ❤️ Max HP | +10 | `AUTO_LEVEL_HP` — kleiner HP-Boost |
| ⚔️ Damage | +3 | `AUTO_LEVEL_DAMAGE` — kleiner DMG-Boost |
| 👢 Speed | +5 | `AUTO_LEVEL_SPEED` — kleiner Speed-Boost |

**Level-Up Banner:**
- Nicht-blockierendes, goldenes Banner „⬆ LEVEL X!" erscheint über dem Spieler
- Fade-In (schnell, ×5), Fade-Out (letzte 500ms), Slide-Up Animation
- Dauer: 2000ms pro Banner
- Mehrere Banner können gestapelt werden (Offset: -30px pro Banner)

### 25.3 Room XP Performance System

Jeder Raum hat ein XP-Baseline basierend auf den gespawnten Gegnern. Die XP, die der Spieler im Raum sammelt, werden mit dieser Baseline verglichen.

**Baseline-Berechnung:**
```
roomXPBaseline = enemyCount × ENEMY_XP × (1 + (stage - 1) × ENEMY_XP_STAGE_SCALE)
```

**Performance Tiers:**

| Tier | Icon | Farbe | Schwelle (Ratio) | Rarity-Bonus |
|------|------|-------|-------------------|--------------|
| 🥉 Bronze | 🥉 | `#cd7f32` | < 0.6 (< 60%) | +0% |
| 🥈 Silver | 🥈 | `#c0c0c0` | ≥ 0.6 (≥ 60%) | +10% |
| 🥇 Gold | 🥇 | `#ffd700` | ≥ 1.0 (≥ 100%) | +20% |
| 💎 Diamond | 💎 | `#b9f2ff` | ≥ 1.5 (≥ 150%) | +30% |

**Wie erreicht man über 100%?**
- Combo-Multiplikator gibt Bonus-XP
- Zweite Welle gibt zusätzliche Gegner
- Spezielle XP-Buffs und Procs

**Rarity-Bonus Mechanik:**
Der Performance-Tier verschiebt die Rarity-Gewichte bei der Reward-Orb Auswahl:

| Rarität | Ohne Bonus | +10% (Silver) | +20% (Gold) | +30% (Diamond) |
|---------|------------|---------------|-------------|-----------------|
| Common | Basis | -1.5 | -3.0 | -4.5 |
| Uncommon | Basis | +0.5 | +1.0 | +1.5 |
| Rare | Basis | +0.8 | +1.6 | +2.4 |
| Epic | Basis | +1.0 | +2.0 | +3.0 |
| Legendary | Basis | +0.5 | +1.0 | +1.5 |

> Die Stage-basierte Rarity bleibt erhalten — der Performance-Bonus ist ein **zusätzlicher Shift** obendrauf.

### 25.4 Performance Meter (HUD)

Ein Echtzeit-Meter oben rechts im HUD zeigt den Performance-Fortschritt:

- **Position:** Oben rechts (unterhalb der Standardposition)
- **Anzeige:** Tier-Icon + Label, Fortschrittsbalken (0–200% der Baseline)
- **Schwellen-Marker:** Vertikale Linien bei Silver (60%), Gold (100%), Diamond (150%)
- **Farbcodierung:** Balken wechselt Farbe je nach aktuellem Tier
- **XP-Zähler:** Aktuelle Room-XP wird angezeigt
- **Visibility:** Nur in normalen Räumen (nicht Training, nicht Boss)
- **Freeze bei Clear:** Meter friert ein wenn der Raum gecleart ist

### 25.5 Reward Orb (Entity)

Der Reward Orb ist ein visuelles Entity, das nach dem Raum-Clear in der Raum-Mitte spawnt.

**Visuelles Design:**
- Pulsierender Glow-Effekt (Sinus-Animation, Frequenz 3Hz)
- Tier-farbiger Kern (Bronze/Silver/Gold/Diamond-Farbe)
- Spawn Pop-In mit `easeOutBack` (Overshoot-Animation)
- Schwebendes Bob (vertikale Oszillation)
- Tier-Icon über dem Orb
- "REWARD" Label unter dem Orb

**Konstanten:**

| Konstante | Wert | Beschreibung |
|-----------|------|--------------|
| `REWARD_ORB_RADIUS` | 16 | Visuelle Größe des Orbs |
| `REWARD_ORB_COLLECT_RADIUS` | 30 | Einsammel-Radius (größer für Komfort) |

**Collision-Check:**
```
distance(player, orb) < REWARD_ORB_COLLECT_RADIUS + player.radius
```

### 25.6 Reward-Auswahl (Level-Up Overlay)

Wenn der Spieler den Orb einsammelt, öffnet sich das bestehende Level-Up Overlay mit **Performance-beeinflussten Optionen**:

**Auswahl-Generierung:** `buildRewardChoices(context, player, perfTier)`
- Identische Struktur wie `buildLevelUpChoices()` (2 General + 1 Synergy)
- Rarity-Gewichte werden um `PERF_RARITY_SHIFT[perfTier]` verschoben
- Stage-basierte Basis-Gewichte bleiben erhalten

**Choice-Typen:**

| Typ | Anwendung | Level-Bookkeeping |
|-----|-----------|-------------------|
| `base` (HP/Speed/DMG) | `player.applyStatBoost(id)` | Nein — keine Level-Änderung |
| `node` (Upgrade-Node) | `UpgradeEngine.applyNode(id, 'reward')` | Nein — Node wird direkt angewandt |
| `runUpgrade` | `_applyRunUpgrade(id)` | Nein — direkter Effekt |

> **Wichtig:** Im Gegensatz zum alten System verändert die Reward-Auswahl **nicht** das Spieler-Level. Leveling ist vollständig passiv.

**Nach der Wahl:**
1. `door.manualLock = false` — Tür wird freigeschaltet
2. 1 Sekunde Unverwundbarkeit wird gewährt
3. Spieler kann zur Tür laufen und den nächsten Raum betreten

### 25.7 Door Manual Lock

Die Tür hat ein neues `manualLock` Property:

- **Aktivierung:** `door.manualLock = true` in `loadRoom()` für normale Räume (nicht Boss, nicht Training)
- **Effekt:** Tür bleibt gesperrt unabhängig vom Gegner-Status
- **Deaktivierung:** `door.manualLock = false` nach Orb-Pickup
- **Boss-Räume:** Kein `manualLock` — normaler Flow über `STATE_BOSS_VICTORY`
- **Training:** Kein `manualLock` — Tür ist immer offen

### 25.8 Boss-Raum Progression

Boss-Räume nutzen weiterhin den bestehenden Flow, aber XP wird passiv verarbeitet:

1. Boss stirbt → `bossVictoryDelay` läuft
2. Boss-XP wird vergeben + passives Auto-Leveling (mit Bannern)
3. `STATE_BOSS_VICTORY` — Boss Scroll + Victory Overlay
4. Kein Level-Up Overlay nach Boss — direkter Übergang zu Boss Scroll → Shop → Playing

### 25.9 Room Clear Detection

Die Raum-Clear-Erkennung nutzt ein `_roomCleared` Flag statt der Tür-Transition:

1. Jeder Frame: Prüfe ob alle Feinde tot sind
2. Wenn erstmals alle tot und `!_roomCleared`:
   - Flag setzen: `_roomCleared = true`
   - **Second Wave Check** (wenn Stage ≥ Minimum und nicht schon getriggert):
     - Zufalls-Roll → Wave 2 spawnt → `_roomCleared = false` (zurücksetzen)
   - **Sonst:** Tür-Unlock-Effekte + Reward Orb spawnen
3. Door.update() wird *danach* aufgerufen — `manualLock` hält Tür gesperrt

### 25.10 Dateien & Änderungen

| Datei | Rolle |
|-------|-------|
| `src/constants.js` | `PERF_TIER_*`, `PERF_*_THRESHOLD`, `PERF_TIER_COLORS`, `PERF_TIER_ICONS`, `PERF_RARITY_SHIFT`, `AUTO_LEVEL_*`, `REWARD_ORB_*` |
| `src/entities/rewardOrb.js` | **NEU** — `RewardOrb` Klasse (spawn, update, render, collision) |
| `src/entities/player.js` | `autoLevelUp()` (passiv), `applyStatBoost(choice)` (Reward-Stat-Boost) |
| `src/entities/door.js` | `manualLock` Property für Reward-Gate |
| `src/upgrades/upgradeEngine.js` | `buildRewardChoices()`, `_weightedPickNWithBonus()`, `getRarityWeights(bonus)` |
| `src/ui/hud.js` | `renderPerformanceMeter()` — Echtzeit Performance-Meter |
| `src/game.js` | State-Variablen, XP-Flow, Door/Reward-Logik, Helper-Methoden, Render |

### 25.11 Konstanten-Referenz

| Konstante | Wert | Beschreibung |
|-----------|------|--------------|
| `PERF_TIER_BRONZE` | `'bronze'` | Niedrigster Tier |
| `PERF_TIER_SILVER` | `'silver'` | Ab 60% Baseline |
| `PERF_TIER_GOLD` | `'gold'` | Ab 100% Baseline |
| `PERF_TIER_DIAMOND` | `'diamond'` | Ab 150% Baseline |
| `PERF_SILVER_THRESHOLD` | 0.6 | 60% der Baseline |
| `PERF_GOLD_THRESHOLD` | 1.0 | 100% der Baseline |
| `PERF_DIAMOND_THRESHOLD` | 1.5 | 150% der Baseline |
| `PERF_RARITY_SHIFT` | `{bronze: 0, silver: 0.10, gold: 0.20, diamond: 0.30}` | Rarity-Bonus pro Tier |
| `AUTO_LEVEL_HP` | 10 | Passiver HP-Gain pro Level |
| `AUTO_LEVEL_DAMAGE` | 3 | Passiver DMG-Gain pro Level |
| `AUTO_LEVEL_SPEED` | 5 | Passiver Speed-Gain pro Level |
| `REWARD_ORB_RADIUS` | 16 | Visuelle Orb-Größe |
| `REWARD_ORB_COLLECT_RADIUS` | 30 | Einsammel-Radius |

---

*Generiert aus dem Quellcode des Projekts. Stand: aktueller Entwicklungsstand.*
