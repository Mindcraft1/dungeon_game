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

---

## 1. Biome System

Biome wechseln alle **5 Stages** (= Boss-Intervall) und beeinflussen Visuals, Gegner-Gewichtung, Hazard-Häufigkeit und Atmosphäre.

| Biome | Stages | Farbe | Gegner-Schwerpunkt | Hazard-Schwerpunkt | Besonderheit |
|-------|--------|-------|--------------------|--------------------|--------------|
| 🌿 **Jungle** | 1–5, 21–25, … | Grün | Dasher ×1.4 | Alles reduziert | Fallende Blätter, Glühwürmchen |
| 🏜️ **Desert** | 6–10, 26–30, … | Orange | Tank ×1.5 | Spikes ×1.4, Arrow ×1.2 | Sandkörner, Hitze-Flimmern |
| 🔥 **Wasteland** | 11–15, 31–35, … | Rot | Shooter ×1.2, Tank ×1.3 | Lava ×1.6, Arrow ×1.3 | Glut-Funken, Asche |
| 🌊 **Depths** | 16–20, 36–40, … | Blau | Shooter ×1.5 | Arrow ×1.4 | Spieler -10% Speed, Blasen, Lichtpunkte |

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
| **Shooter** | 🟣 Lila | Stage 4 | ×0.7 | ×0.55 | – | ×1.3 | Schießt Projektile (Range 200, CD 2s) |
| **Dasher** | 🟢 Grün | Stage 6 | ×0.6 | ×0.55 | ×1.2 | ×1.5 | Dash-Angriff (×3.5 Speed, Range 300) |
| **Tank** | 🟠 Orange | Stage 8 | ×2.0 | ×0.45 | ×1.5 | ×2.0 | Charge-Attacke (×2.5 Speed, Range 250) |

**Skalierung pro Stage:**
- Anzahl: `min(2 + floor((stage-1) × 0.75), 10)`
- HP: `× (1 + (stage-1) × 0.15)`
- Speed: `× (1 + (stage-1) × 0.05)` (max ×2)
- DMG: `+ (stage-1) × 0.5`

---

## 3. Hazards (Fallen)

Hazards werden dynamisch pro Raum platziert. Schaden skaliert +10% pro Stage über Intro, max ×2.

| Typ | Einführung | Basis-DMG | Mechanik |
|-----|------------|-----------|----------|
| ⬆️ **Spikes** | Stage 3 | 8 | Zyklisch (2.5s): inaktiv → 0.5s Warnung → 0.7s aktiv. Versetzter Timer. |
| 🟧 **Lava** | Stage 5 | 4/Tick | Dauerschaden alle 400ms + Slow (×0.55 Speed) solange drauf. |
| ➡️ **Arrow Trap** | Stage 7 | 8 | Schießt Projektile in eine Richtung (CD 3.5s, Speed 160). |

---

## 4. Boss System

**Alle 5 Stages** erscheint ein Boss. 4 verschiedene Typen, die rotieren.

| Boss | Farbe | HP-Mult | Speed-Mult | DMG-Mult | Radius |
|------|-------|---------|------------|----------|--------|
| 💪 **The Brute** | Orange | ×1.3 | ×0.8 | ×1.4 | 28px |
| 🧙 **The Warlock** | Lila | ×0.9 | ×0.85 | ×1.0 | 22px |
| 👻 **The Phantom** | Cyan | ×0.75 | ×1.3 | ×1.1 | 20px |
| 🛡️ **The Juggernaut** | Orange-Braun | ×1.5 | ×0.6 | ×1.2 | 30px |

**Basis-Stats:** HP 400, Speed 55, DMG 15

**Skalierung:**
- Pro Encounter: HP +45%, DMG +30%, Speed +12%
- Pro Stage: HP +4%, DMG +2.5%, Speed +1.5%

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

### Leveling
- **XP-Schwelle:** `30 × 1.25^(level-1)`
- **Level-Up Optionen:** 2 General-Nodes + 1 Synergy-Node + Base-Stat Fallback
- **Base-Upgrades:** +25 HP (heal +15), +15 Speed, +8 DMG

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

Nodes werden bei **Level-Up**, **Events** und im **Shop** erworben. Jeder Node hat eine Rarität und Stack-Limit.

**Raritäts-Gewichtung bei Zufallsauswahl:**
| Rarität | Gewicht | Farbe |
|---------|---------|-------|
| Common | 50 | – |
| Uncommon | 35 | – |
| Rare | 15 | – |

### Melee-Nodes (8)

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| ⚔️ **Cleave** | Uncommon | 2 | +1 Extra Melee-Ziel pro Stack |
| 🌀 **Wide Arc** | Common | 2 | +20% Angriffs-Bogen pro Stack |
| ⚡ **Quick Strikes** | Common | 2 | +15% Angriffsgeschwindigkeit pro Stack |
| 💫 **Staggering Blows** | Uncommon | 1 | 10% Stun-Chance (0.5s) |
| 🩸 **Serrated Edge** | Uncommon | 1 | 20% Bleed (2s, 5 DPS) |
| 💥 **Kill Nova** | Rare | 1 | On Kill: AoE Burst (r60, ×0.4 DMG, 1s CD) |
| 🔨 **Heavy Strike** | Common | 1 | +30% KB, -10% Speed |
| 🏃 **Lunge** | Uncommon | 1 | Kleiner Vorstoß beim Angriff (30px) |

### Dagger-Nodes (8)

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| 🗡️ **Multi-Dagger** | Uncommon | 2 | +1 Dagger pro Wurf |
| 🌊 **Fan of Knives** | Rare | 1 | 3-Wege Kegel (Arc 0.4) |
| 📌 **Piercing Daggers** | Common | 3 | +1 Pierce pro Stack |
| 🔄 **Ricochet** | Uncommon | 2 | +1 Wand-Abpraller pro Stack |
| 🔥 **Fire Trail** | Rare | 1 | Dolche hinterlassen Feuer-Spur (1.2s, 4 DPS) |
| 💨 **Swift Throw** | Common | 2 | +25% Dagger-Speed pro Stack |
| 🎯 **Precision Throw** | Common | 2 | +5% Crit-Chance (Daggers) pro Stack |
| 🪃 **Boomerang** | Rare | 1 | Dolche kehren zurück |

### Dash-Nodes (5)

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| 💥 **Impact Dash** | Uncommon | 1 | AoE + KB am Dash-Ende (r50, KB 15) |
| 🔥 **Blazing Dash** | Uncommon | 1 | Feuer-Spur beim Dashen (6 DPS, 0.8s) |
| ⏱️ **Quick Recovery** | Common | 2 | -15% Dash-Cooldown pro Stack |
| 📏 **Extended Roll** | Common | 2 | +20% Dash-Distanz pro Stack |
| 💫 **Stunning Rush** | Uncommon | 1 | Dash-Kollision stunt 0.4s |

### Shockwave-Nodes (4) — *Benötigen Shockwave equipped*

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| 💥 **Wider Blast** | Common | 2 | +30% Radius pro Stack |
| 🔄 **Aftershock** | Rare | 1 | Zweiter Puls nach 0.3s (60% DMG) |
| 💫 **Concussive Blast** | Uncommon | 1 | Stun 0.6s im inneren Radius (50%) |
| ⏱️ **Seismic Affinity** | Common | 1 | -20% Cooldown |

### Blade Storm-Nodes (3) — *Benötigen Blade Storm equipped*

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| 🌀 **Prolonged Storm** | Common | 2 | +1s Dauer pro Stack |
| 🌀 **Expanding Vortex** | Common | 2 | +15% Radius pro Stack |
| ⏱️ **Storm Mastery** | Uncommon | 1 | -15% Cooldown |

### Gravity Pull-Nodes (2) — *Benötigen Gravity Pull equipped*

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| 🌑 **Gravity Well** | Common | 2 | +25% Radius pro Stack |
| ⏱️ **Warp Affinity** | Uncommon | 1 | -15% Cooldown |

### Freeze Pulse-Nodes (3) — *Benötigen Freeze Pulse equipped*

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| ❄️ **Permafrost** | Common | 2 | +25% Radius pro Stack |
| ❄️ **Deep Freeze** | Uncommon | 2 | +0.5s Freeze-Dauer pro Stack |
| ⏱️ **Frost Mastery** | Uncommon | 1 | -20% Cooldown |

### Explosive Strikes-Nodes (3) — *Benötigen Explosive Strikes equipped*

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| 🔥 **Volatile Mix** | Uncommon | 3 | +5% Explosion-Chance (cap +15% → 25% total) |
| 💥 **Blast Radius** | Common | 2 | +20% Explosion-Radius pro Stack |
| 💣 **Bigger Boom** | Uncommon | 2 | +15% Explosion-DMG pro Stack |

### Chain Lightning-Nodes (3) — *Benötigen Chain Lightning equipped*

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| ⚡ **Longer Chain** | Common | 2 | +1 Blitz-Sprung pro Stack |
| ⚡ **Conduction** | Uncommon | 2 | +5% Lightning-Chance (cap +13% → 25% total) |
| ⚡ **Extended Arc** | Common | 2 | +20% Lightning-Range pro Stack |

### Heavy Crit-Nodes (2) — *Benötigen Heavy Crit equipped*

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| 💎 **Devastating Crits** | Uncommon | 2 | +20% Crit-Bonus-DMG pro Stack |
| 🎯 **Keen Eye** | Common | 3 | +3% globale Crit-Chance pro Stack |

### Global-Nodes (2)

| Node | Rarität | Max Stacks | Effekt |
|------|---------|------------|--------|
| ⚡ **Power Surge** | Rare | 2 | +8% aller Schaden pro Stack |
| ⏱️ **Temporal Flux** | Rare | 2 | -8% aller Cooldowns pro Stack |

---

## 11. Event System (Spezial-Räume)

**Bedingungen:** Stage ≥ 6, kein Boss-Raum, nicht in Folge, **12% Chance** pro Raum.

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
| 👑 Stage 15 erreicht | 💥 Kill Nova (Melee-Node) |
| 👑 Stage 20 erreicht | 🌊 Fan of Knives (Dagger-Node) |
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

Ab **Stage 7** erscheinen Abgründe im Raum.

| Stage-Bracket | Anzahl pro Raum |
|--------------|----------------|
| 7–10 | 1–3 |
| 11–15 | 3–8 |
| 16+ | 6–14 |

**Sturz-Strafe:** -35% Max HP + -10% Coins.  
**Dash-Überquerung:** Bis zu 2 Tiles breit überdashbar.

---

## 18. Achievements (40 Stück)

### Easy (10)

| ID | Name | Beschreibung |
|----|------|--------------|
| first_blood | First Blood | Ersten Gegner töten |
| reach_stage_3 | Getting Started | Stage 3 erreichen |
| reach_stage_5 | Dungeon Apprentice | Stage 5 erreichen |
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
| reach_stage_10 | Dungeon Adept | Stage 10 erreichen |
| boss_kills_2_run | Double Boss Slayer | 2 Bosse in einem Run |
| collector_pickups | Collector | Jeden Pickup-Typ mindestens 1× sammeln |
| unlock_3_relics | Relic Seeker | 3 Relics freischalten |
| meta_upgrades_10_total | Upgrade Addict | 10 Meta-Perk Upgrades insgesamt |
| boss_no_hit_1 | Efficient | Boss ohne Schaden besiegen |
| reach_stage_10_fast | Speed Runner I | Stage 10 in unter 6 Minuten |

### Hard (10)

| ID | Name | Beschreibung |
|----|------|--------------|
| kills_500_total | Monster Hunter | 500 Gegner insgesamt töten |
| untouchable_3 | Untouchable III | 3 Räume in Folge ohne Schaden |
| boss_kills_5_run | Boss Hunter | 5 Bosse in einem Run |
| reach_stage_15 | Dungeon Master | Stage 15 erreichen |
| level_15_run | Full Build | Level 15 in einem Run |
| coins_200_run | High Roller | 200 Coins in einem Run |
| no_revive_to_stage_15 | No Panic | Stage 15 ohne Revive |
| visit_all_biomes_run | Biome Traveler | Alle 4 Biome in einem Run besuchen |
| trap_dancer_5 | Trap Dancer | 5 Trap-Räume (≥10 Gegner) ohne Schaden clearen |
| minimalist_stage_10 | Minimalist | Stage 15 ohne Meta-Booster |

### Very Hard (9)

| ID | Name | Beschreibung |
|----|------|--------------|
| kills_1000_total | Legend in the Making | 1000 Gegner insgesamt |
| untouchable_5 | Untouchable IV | 5 Räume in Folge ohne Schaden |
| boss_no_hit_3_streak | Boss Rush | 3 Bosse in Folge no-hit |
| reach_stage_20 | Dungeon Overlord | Stage 20 erreichen |
| no_damage_to_stage_10 | Perfect Run I | Stage 10 ohne jeglichen Schaden |
| unlock_all_relics | Relic Master | Alle 8 Relics freischalten |
| max_one_meta_perk | Meta Maxer | Einen Meta-Perk auf Level 10 |
| shopaholic_10_run | Shopaholic | 10 Shop-Items in einem Run kaufen |
| boss_kills_10_total | Seasoned Slayer | 10 Bosse insgesamt besiegen |

### Legendary (1)

| ID | Name | Beschreibung |
|----|------|--------------|
| true_dungeon_god | True Dungeon God | Stage ≥25, kein Booster, kein Revive, 3+ Bosse no-hit, ≤3 Schadens-Events |

---

## 19. Loadout System

Vor jedem Run wählt der Spieler sein Loadout:
- **2 Ability-Slots** (Q + E) — aus freigeschalteten Abilities
- **2 Proc-Slots** — aus freigeschalteten Passives

Locked Items zeigen den nächsten Unlock-Hinweis (z.B. „Next Ability at 6 boss kills (4/6)").

---

## 20. Meta-Boosters (Einmal-pro-Run)

Vor dem Run im Meta-Shop kaufbar. Max **1 Booster pro Run**.

| Booster | Icon | Kosten | Effekt |
|---------|------|--------|--------|
| 🛡️ **Shield Pack** | 🛡️ | 20 Shards | Start mit 3 Shield Charges (absorbieren 3 Hits) |
| ⚔️ **Weapon Core** | ⚔️ | 25 Shards | +12% DMG bis Boss 3 |
| 📖 **Training Manual** | 📖 | 18 Shards | +20% XP bis Level 5 |
| 💀 **Panic Button** | 💀 | 30 Shards | 1× Revive mit 50% HP pro Run |

---

## Second Wave System

Ab **Stage 5** besteht eine **15% Chance**, dass nach dem Clearen eines Raumes eine zweite Welle spawnt.
- **Gegner-Anzahl:** 75% der normalen Menge
- **Ankündigung:** 2s „WAVE 2" Banner

---

## Zusammenfassung: Wann tritt was auf?

| Stage | Neue Mechanik |
|-------|---------------|
| 1 | Basic Enemies, Melee + Dagger + Dash |
| 3 | ⬆️ Spike Hazards |
| 4 | 🟣 Shooter Enemies |
| 5 | 🟧 Lava Hazards, 🏜️ Desert Biome, 💪 Erster Boss, Second Wave möglich |
| 6 | 🟢 Dasher Enemies, 🎲 Events möglich (12% Chance) |
| 7 | ➡️ Arrow Traps, 🕳️ Canyon Pits |
| 8 | 🟠 Tank Enemies |
| 10 | 🏪 Zweiter Boss + Shop, Pity-System prüft |
| 11 | 🔥 Wasteland Biome |
| 16 | 🌊 Depths Biome (-10% Player Speed) |
| 20+ | Fortgeschrittene Skalierung, Boss Scroll Drops |

---

*Generiert aus dem Quellcode des Projekts. Stand: aktueller Entwicklungsstand.*
