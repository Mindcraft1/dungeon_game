// ── German Content Translations ──────────────────────────────
// Data-driven game content: names + descriptions for all items,
// abilities, nodes, classes, weapons, relics, perks, talents,
// achievements, biomes, boosters, shop items, pickups.
//
// Used by td(obj, field) in i18n.js when language is 'de'.
// Key = item id, value = { name, desc } (only fields that differ).
// ─────────────────────────────────────────────────────────────

const DE = {

    // ══════════════════════════════════════════════════
    //  WEAPONS
    // ══════════════════════════════════════════════════
    sword:   { name: 'Schwert',  desc: 'Ausgewogene Klinge. Keine Stärken, keine Schwächen.' },
    spear:   { name: 'Speer',    desc: 'Große Reichweite, schmaler Bogen. Sicher angreifen.' },
    hammer:  { name: 'Hammer',   desc: 'Voller 360°-Schlag. Langsam, aber verheerend.' },

    // ══════════════════════════════════════════════════
    //  CLASSES
    // ══════════════════════════════════════════════════
    adventurer: { name: 'Abenteurer', desc: 'Vielseitiger Allrounder mit Überlebensinstinkt', passive: 'Heile 10% max LP nach jedem Raum' },
    guardian:   { name: 'Wächter',    desc: 'Zäher Beschützer mit Auto-Schild', passive: 'Auto-Schild blockt 1 Treffer alle 20s' },
    rogue:      { name: 'Schurke',    desc: 'Schneller Assassine mit tödlichen Krits', passive: '+15% Krit-Chance, Krits machen 1,8×' },
    berserker:  { name: 'Berserker',  desc: 'Rohe Kraft, die bei wenig LP aufblüht', passive: 'Unter 30% LP → +40% Schaden' },

    // ══════════════════════════════════════════════════
    //  ABILITIES
    // ══════════════════════════════════════════════════
    shockwave:    { name: 'Schockwelle',  desc: 'Flächenschaden (r140), 1,2× SCH + Rückstoß' },
    blade_storm:  { name: 'Klingensturm', desc: 'Wirbelnde Klingen für 3s, Tick-SCH in r110' },
    gravity_pull: { name: 'Gravitationszug', desc: 'Gegner anziehen für 1s, dann verlangsamen' },
    freeze_pulse: { name: 'Frostpuls',   desc: 'Gegner in r160 einfrieren für 1s' },

    // ══════════════════════════════════════════════════
    //  PROCS (Passive Effects)
    // ══════════════════════════════════════════════════
    explosive_strikes: { name: 'Explosive Schläge', desc: '10% bei Treffer: Flächenexplosion (0,6× SCH)' },
    chain_lightning:   { name: 'Kettenblitz',       desc: '12% bei Treffer: Kette zu 3 Gegnern' },
    heavy_crit:        { name: 'Schwerer Krit',     desc: 'Bei Krit: +40% SCH + großer Einschlag' },

    // ══════════════════════════════════════════════════
    //  RELICS
    // ══════════════════════════════════════════════════
    relic_xp_spark:       { name: 'EP-Funke',          desc: '+8% EP-Gewinn' },
    relic_boss_hunter:    { name: 'Bossjäger',          desc: '+5% Schaden gegen Bosse' },
    relic_tough_skin:     { name: 'Dickes Fell',        desc: '-8% erlittener Schaden' },
    relic_quick_step:     { name: 'Schneller Schritt',  desc: '+5% Laufgeschwindigkeit' },
    relic_heal_on_level:  { name: 'Vitalitätsschub',    desc: 'Heile 10% max LP bei Level-Up' },
    relic_starting_orb:   { name: 'Startkugel',         desc: 'Starte jeden Run mit +30 EP' },
    relic_spike_sense:    { name: 'Stachelgespür',      desc: 'Stacheln machen -25% Schaden' },
    relic_lava_boots:     { name: 'Lavastiefel',        desc: 'Lava macht -25% Schaden' },

    // ══════════════════════════════════════════════════
    //  META PERKS
    // ══════════════════════════════════════════════════
    vitality: { name: 'Vitalität', desc: '+1% Max LP pro Stufe' },
    might:    { name: 'Macht',     desc: '+1% Schaden pro Stufe' },
    haste:    { name: 'Eile',      desc: '+0,5% Laufgeschwindigkeit pro Stufe' },
    wisdom:   { name: 'Weisheit',  desc: '+1% EP-Gewinn pro Stufe' },

    // ══════════════════════════════════════════════════
    //  BIOMES
    // ══════════════════════════════════════════════════
    jungle:    { name: 'Dschungel' },
    desert:    { name: 'Wüste' },
    wasteland: { name: 'Ödland' },
    depths:    { name: 'Tiefen' },
    spaceship: { name: 'Raumschiff' },

    // ══════════════════════════════════════════════════
    //  BOSSES  (keyed by boss type string)
    // ══════════════════════════════════════════════════
    brute:      { name: 'Der Koloss' },
    warlock:    { name: 'Der Hexer' },
    phantom:    { name: 'Das Phantom' },
    juggernaut: { name: 'Der Juggernaut' },
    overlord:   { name: 'Der Overlord' },

    // ══════════════════════════════════════════════════
    //  TALENT BRANCHES
    // ══════════════════════════════════════════════════
    offense: { name: 'Angriff' },
    defense: { name: 'Verteidigung' },
    utility: { name: 'Vielseitigkeit' },

    // ══════════════════════════════════════════════════
    //  TALENT NODES
    // ══════════════════════════════════════════════════
    sharp_edge:   { name: 'Scharfe Klinge',   desc: '+5% Nahkampfschaden pro Rang' },
    quick_slash:  { name: 'Schneller Hieb',    desc: '-5% Angriffsabklingzeit pro Rang' },
    wide_swing:   { name: 'Weiter Schwung',    desc: '+8% Angriffsbogen pro Rang' },
    critical_eye: { name: 'Kritisches Auge',   desc: '+3% Krit-Chance pro Rang' },
    executioner:  { name: 'Henker',            desc: '+10% Schaden gegen Gegner unter 30% LP pro Rang' },
    tough_hide:   { name: 'Dicke Haut',        desc: '+8% Max LP pro Rang' },
    quick_recovery: { name: 'Schnelle Erholung', desc: '-8% Unverwundbarkeits-CD pro Rang' },
    iron_will:    { name: 'Eiserner Wille',    desc: '-3% erlittener Schaden pro Rang' },
    second_wind:  { name: 'Zweite Luft',       desc: 'Heile 2% max LP pro gereinigtem Raum pro Rang' },
    endurance:    { name: 'Ausdauer',          desc: '+10% Buff-Dauer pro Rang' },
    fleet_foot:   { name: 'Flinker Fuß',       desc: '+3% Laufgeschwindigkeit pro Rang' },
    dash_mastery: { name: 'Sprint-Meisterung', desc: '-8% Sprint-CD pro Rang' },
    xp_siphon:   { name: 'EP-Sauger',         desc: '+5% EP-Gewinn pro Rang' },
    pickup_magnet: { name: 'Pickup-Magnet',    desc: '+15% Aufsammelradius pro Rang' },
    fortune:      { name: 'Glück',             desc: '+5% Münz-Droprate pro Rang' },

    // ══════════════════════════════════════════════════
    //  META BOOSTERS
    // ══════════════════════════════════════════════════
    meta_booster_shield_pack:      { name: 'Schildpaket',       desc: 'Starte mit 3 Schildladungen (3 Treffer absorbieren)', unlock: '5 Runs abschließen' },
    meta_booster_weapon_core:      { name: 'Waffenkern',        desc: '+12% Schaden bis Boss 2', unlock: '3 Bosse besiegen' },
    meta_booster_training_manual:  { name: 'Trainingshandbuch', desc: '+20% EP-Gewinn bis Level 5', unlock: '3 Runs abschließen' },
    meta_booster_panic_button:     { name: 'Panikknopf',        desc: '1× Wiederbelebung mit 50% LP pro Run', unlock: '8 Bosse besiegen' },
    meta_booster_lucky_start:      { name: 'Glücksstart',       desc: 'Starte den Run mit 15 Bonusmünzen', unlock: '8 Runs abschließen' },
    meta_booster_thick_skin:       { name: 'Dickes Fell',       desc: '-10% erlittener Schaden (gesamter Run)', unlock: '5 Bosse besiegen' },
    meta_booster_swift_feet:       { name: 'Flinke Füße',       desc: '+10% Laufgeschwindigkeit (gesamter Run)', unlock: 'Stufe 25 erreichen' },
    meta_booster_scavenger:        { name: 'Sammler',           desc: '+30% Münz-Drops von allen Gegnern', unlock: 'Stufe 40 erreichen' },

    // ══════════════════════════════════════════════════
    //  RUN SHOP ITEMS
    // ══════════════════════════════════════════════════
    forge_token:             { name: 'Schmiedestein',      desc: 'Einen Knoten aufwerten' },
    run_item_max_hp_boost:   { name: 'Vitalitätssplitter', desc: '+15 Max LP permanent' },
    run_item_repair_armor:   { name: 'Rüstung reparieren', desc: '+1 Schildladung' },
    run_item_sharpen_blade:  { name: 'Klinge schärfen',    desc: '+8% Schaden (Rest des Runs)' },
    run_item_light_boots:    { name: 'Leichte Stiefel',    desc: '+5% Geschwindigkeit (Rest des Runs)' },
    run_item_bomb:           { name: 'Bombe',              desc: '1 Ladung: Großer Flächenschaden + Betäubung (B-Taste)' },
    run_item_trap_resist:    { name: 'Fallenresistenz',    desc: '-15% Stachel- & Lavaschaden (Rest des Runs)' },

    // ══════════════════════════════════════════════════
    //  PICKUPS
    // ══════════════════════════════════════════════════
    rage_shard:     { name: 'Wutscherbe',      effect: '+50% SCH' },
    heart_fragment: { name: 'Herzfragment',     effect: '+20 LP' },
    piercing_shot:  { name: 'Durchschuss',      effect: '+40% Reichweite +25% SCH' },
    phase_shield:   { name: 'Phasenschild',     effect: 'Nächsten Treffer blocken' },
    speed_surge:    { name: 'Temposchub',       effect: '-40% Angriffs-CD' },
    swift_boots:    { name: 'Schnelle Stiefel', effect: '+40% Tempo' },
    crushing_blow:  { name: 'Zerschmetternder Schlag', effect: 'Nächster Treffer 3× SCH' },
    iron_skin:      { name: 'Eisenhaut',        effect: '-50% erlittener SCH' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – MELEE
    // ══════════════════════════════════════════════════
    melee_cleave:           { name: 'Spalten',             desc: '+1 extra Nahkampfziel' },
    melee_arc_wider:        { name: 'Weiter Bogen',        desc: '+20% Angriffsbogen' },
    melee_attack_speed:     { name: 'Schnelle Schläge',    desc: '+15% Angriffsgeschwindigkeit' },
    melee_stun_chance:      { name: 'Betäubende Schläge',  desc: '10% Chance auf 0,5s Betäubung' },
    melee_bleed:            { name: 'Gezackte Klinge',     desc: '20% Blutung für 2s' },
    melee_kill_nova:        { name: 'Kill-Nova',           desc: 'Bei Kill: kleiner Flächenstoß (1s CD)' },
    melee_heavy_hit:        { name: 'Schwerer Schlag',     desc: '+30% Rückstoß, -10% Tempo' },
    melee_lunge:            { name: 'Ausfallschritt',      desc: 'Kleiner Vorwärtsstoß beim Angriff' },
    melee_vampiric:         { name: 'Vampirklinge',        desc: 'Heile 8% des Nahkampfschadens' },
    melee_chain_kill:       { name: 'Kettenwut',           desc: 'Kills geben +50% SCH für 2s' },
    melee_quake:            { name: 'Erdbebenschlag',      desc: 'Jeder 5. Treffer: massiver Flächenstoß' },
    melee_whirlwind:        { name: 'Wirbelsturm-Schlag',  desc: 'Angriffe treffen 360°, aber 20% langsamer' },
    melee_razor_orbit:      { name: 'Rasierklingen-Orbit', desc: 'Nahkampf-Kills erzeugen kreisende Klinge (15s)' },
    melee_iron_fists:       { name: 'Eiserne Fäuste',      desc: '+10% Nahkampfschaden' },
    melee_siphon_strike:    { name: 'Saugschlag',          desc: 'Kills stellen 3% max LP wieder her' },
    melee_berserker_frenzy: { name: 'Berserker-Rausch',    desc: 'Unter 50% LP: +25% Angriffsgeschwindigkeit' },
    melee_executioner_mark: { name: 'Henkerzeichen',       desc: '+20% Nahkampf-SCH gegen Gegner unter 30% LP' },
    melee_afterimage:       { name: 'Nachbild',            desc: '15% Chance: verzögerter Geisterschlag (40% SCH)' },
    melee_echo_strike:      { name: 'Echo-Schlag',         desc: '15% Chance: Angriff trifft zweimal' },
    melee_riposte:          { name: 'Riposte',             desc: 'Nach Schaden: nächster Nahkampf kritet (3s)' },
    melee_tempest_blade:    { name: 'Sturmklinge',         desc: 'Jeder 3. Schwung feuert eine Projektitwelle' },
    melee_relentless:       { name: 'Unerbittlich',        desc: '3+ Gegner treffen setzt Angriffs-CD zurück' },
    melee_impact_armor:     { name: 'Einschlagsrüstung',   desc: 'Nahkampftreffer geben 3% Schadensreduzierung für 2s (max 15%)' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – DAGGER
    // ══════════════════════════════════════════════════
    dagger_extra_projectile: { name: 'Multi-Dolch',        desc: '+1 Dolch pro Wurf' },
    dagger_spread:           { name: 'Messerfächer',       desc: 'Dolche fliegen im 3er-Kegel' },
    dagger_pierce:           { name: 'Durchbohrende Dolche', desc: '+1 Durchdringung' },
    dagger_ricochet:         { name: 'Abpraller',          desc: '+1 Wandabpraller' },
    dagger_fire_trail:       { name: 'Feuerspur',          desc: 'Dolche hinterlassen Brandspur (1,2s)' },
    dagger_speed:            { name: 'Schnellwurf',        desc: '+25% Dolchgeschwindigkeit' },
    dagger_crit:             { name: 'Präzisionswurf',     desc: '+5% Krit-Chance (Dolche)' },
    dagger_returning:        { name: 'Bumerang',           desc: 'Dolche kehren zurück' },
    dagger_explosive:        { name: 'Explosivdolche',     desc: 'Dolche explodieren beim letzten Treffer (r60)' },
    dagger_homing:           { name: 'Zielsuchende Dolche', desc: 'Dolche verfolgen Gegner leicht' },
    dagger_shadow:           { name: 'Schattendolche',     desc: 'Dolche erzeugen eine Geisterkopie nach 0,3s' },
    dagger_venom:            { name: 'Giftige Spitzen',    desc: 'Dolche verlangsamen Gegner 30% für 1,5s' },
    dagger_damage:           { name: 'Dolchmeisterung',    desc: '+12% Dolchschaden' },
    dagger_frozen_tips:      { name: 'Gefrorene Spitzen',  desc: 'Dolche frieren Gegner 0,4s ein' },
    dagger_assassin_mark:    { name: 'Assassinenzeichen',  desc: '+30% Dolch-SCH gegen Gegner unter 30% LP' },
    dagger_barrage:          { name: 'Sperrfeuer',         desc: 'Doppelte Wurfrate, -15% Schaden pro Dolch' },
    dagger_spectral:         { name: 'Geisterdolche',      desc: 'Dolche durchdringen Wände' },
    dagger_rain:             { name: 'Messerregen',        desc: 'Alle 8s: Auto-Dolche in alle Richtungen' },
    dagger_chain_throw:      { name: 'Kettenwurf',         desc: 'Dolchtreffer feuern 1 Extra auf nächsten Gegner' },
    dagger_bleed:            { name: 'Gezackte Dolche',    desc: 'Dolche verursachen Blutung (3 SCH/s, 1,5s)' },
    dagger_gravity_pull:     { name: 'Magnetdolche',       desc: 'Dolche ziehen Gegner leicht zum Einschlag' },
    dagger_rapid_fire:       { name: 'Schnellfeuer',       desc: '-20% Dolch-Abklingzeit' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – DASH
    // ══════════════════════════════════════════════════
    dash_end_shockwave:     { name: 'Einschlag-Sprint',    desc: 'Flächenschaden + Rückstoß am Sprint-Ende' },
    dash_fire_trail:        { name: 'Brennender Sprint',   desc: 'Hinterlasse eine Feuerspur beim Sprinten' },
    dash_cooldown_reduction: { name: 'Schnelle Erholung',  desc: '-15% Sprint-Abklingzeit' },
    dash_longer:            { name: 'Verlängertes Rollen', desc: '+20% Sprint-Distanz' },
    dash_stun:              { name: 'Betäubender Ansturm', desc: 'Sprint-Kollision betäubt 0,4s' },
    dash_extra_charge:      { name: 'Doppel-Sprint',       desc: '+1 Sprint-Ladung (Ketten-Sprints!)' },
    dash_phantom_trail:     { name: 'Phantom-Spur',        desc: 'Sprint hinterlässt schadende Nachbilder' },
    dash_void_rift:         { name: 'Leereriss',           desc: 'Sprint hinterlässt einen Strudel, der Gegner zieht' },
    dash_kill_reset:        { name: 'Sprint-Reset',        desc: 'Kills setzen Sprint-CD sofort zurück' },
    dash_speed_boost:       { name: 'Flinkes Rollen',      desc: '+15% Sprint-Geschwindigkeit' },
    dash_shadow_step:       { name: 'Schattenschritt',     desc: '0,3s Unverwundbarkeit nach Sprint-Ende' },
    dash_momentum_strike:   { name: 'Schwungschlag',       desc: 'Erster Nahkampf nach Sprint macht +40% SCH' },
    dash_afterburn:         { name: 'Nachbrenner',         desc: 'Gegner nahe der Sprint-Bahn nehmen 15 SCH' },
    dash_phase_strike:      { name: 'Phasenschlag',        desc: 'Durch Gegner sprinten fügt Schaden zu' },
    dash_mirror_image:      { name: 'Spiegelbild',         desc: 'Sprint erzeugt einen Köder, der 3s provoziert' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – SHOCKWAVE
    // ══════════════════════════════════════════════════
    shockwave_radius:         { name: 'Größere Explosion',   desc: '+30% Schockwellen-Radius' },
    shockwave_double_pulse:   { name: 'Nachbeben',           desc: 'Zweiter Puls nach 0,3s (60% SCH)' },
    shockwave_stun:           { name: 'Betäubende Explosion', desc: 'Betäubung 0,6s im inneren Radius' },
    shockwave_cd:             { name: 'Seismische Affinität', desc: '-20% Schockwellen-Abklingzeit' },
    shockwave_chain_reaction: { name: 'Kettenreaktion',      desc: 'Getötete Gegner explodieren für 40% SCH' },
    shockwave_scorching:      { name: 'Sengende Welle',      desc: 'Schockwelle entzündet Gegner (4 SCH/s, 2s)' },
    shockwave_pull:           { name: 'Gravitationsschock',   desc: 'Schockwelle zieht Gegner erst nach innen' },
    shockwave_tremor:         { name: 'Erschütterung',       desc: 'Schockwelle verlangsamt alle Getroffenen (1,5s)' },
    shockwave_fortify:        { name: 'Befestigen',          desc: 'Schockwelle gibt +15% Schadensreduzierung für 3s' },
    shockwave_ground_fire:    { name: 'Verbrannte Erde',     desc: 'Schockwelle hinterlässt brennenden Boden (3s)' },
    shockwave_empowered:      { name: 'Verstärkte Welle',    desc: '+20% Schockwellen-Schaden' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – BLADE STORM
    // ══════════════════════════════════════════════════
    bladestorm_duration:   { name: 'Verlängerter Sturm',    desc: '+1s Klingensturm-Dauer' },
    bladestorm_radius:     { name: 'Expandierender Wirbel',  desc: '+15% Klingensturm-Radius' },
    bladestorm_cd:         { name: 'Sturmmeisterung',        desc: '-15% Klingensturm-CD' },
    bladestorm_lightning:  { name: 'Blitzwirbel',            desc: 'Sturm trifft Gegner mit Bonus-⚡-SCH' },
    bladestorm_shredding:  { name: 'Reißende Klingen',       desc: 'Sturm verursacht Blutung (3 SCH/s, 2s)' },
    bladestorm_eruption:   { name: 'Klingenausbruch',        desc: 'Sturm endet mit massiver Explosion' },
    bladestorm_speed:      { name: 'Auge des Sturms',        desc: '+20% Laufgeschwindigkeit während Klingensturm' },
    bladestorm_vacuum:     { name: 'Vakuumwirbel',           desc: 'Klingensturm zieht Gegner nach innen' },
    bladestorm_frozen:     { name: 'Frostklingen',           desc: 'Klingensturm verlangsamt Gegner um 30%' },
    bladestorm_empowered:  { name: 'Rasiersturm',            desc: '+20% Klingensturm-Tickschaden' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – GRAVITY PULL
    // ══════════════════════════════════════════════════
    gravity_pull_radius:   { name: 'Gravitationsbrunnen',    desc: '+25% Gravitationsradius' },
    gravity_pull_cd:       { name: 'Warp-Affinität',         desc: '-15% Gravitationszug-CD' },
    gravity_singularity:   { name: 'Singularität',           desc: 'Zug komprimiert Gegner, +25% erlittener SCH' },
    gravity_void_explosion: { name: 'Leerenexplosion',       desc: 'Zug endet mit heftiger Explosion' },
    gravity_pull_damage:   { name: 'Zermahlende Gravitation', desc: 'Gezogene Gegner nehmen 3 SCH/s' },
    gravity_pull_duration: { name: 'Verlängerter Zug',       desc: '+0,3s Zug-Dauer' },
    gravity_crush:         { name: 'Gravitationszermalmer',   desc: 'Eng gruppierte Gegner nehmen +20% SCH' },
    gravity_empowered:     { name: 'Intensives Feld',        desc: '+20% Zugkraft' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – FREEZE PULSE
    // ══════════════════════════════════════════════════
    freeze_pulse_radius:   { name: 'Permafrost',             desc: '+25% Einfrier-Radius' },
    freeze_pulse_duration: { name: 'Tiefkühle',              desc: '+0,5s Einfrier-Dauer' },
    freeze_pulse_cd:       { name: 'Frostmeisterung',        desc: '-20% Frostpuls-CD' },
    freeze_shatter:        { name: 'Zersplittern',           desc: 'Getötete Eisfroste verursachen Flächen-Eisschaden' },
    freeze_chain:          { name: 'Frostnova-Kette',        desc: 'Einfrieren breitet sich auf 2 Nahegegner aus' },
    freeze_absolute_zero:  { name: 'Absoluter Nullpunkt',    desc: 'Eingefrorene Gegner nehmen +30% mehr Schaden' },
    freeze_frostbite:      { name: 'Erfrierung',             desc: 'Eingefrorene Gegner nehmen 4 Kälte-SCH/s' },
    freeze_ice_armor:      { name: 'Eispanzer',              desc: 'Einfrieren gibt Spieler 20% Schadensreduzierung für 3s' },
    freeze_empowered:      { name: 'Glaziale Kraft',         desc: '+25% Frostpuls-Schaden' },
    freeze_brittle:        { name: 'Brüchig',                desc: 'Eingefrorene Gegner nehmen +50% Krit-Schaden' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – PROC: EXPLOSIVE
    // ══════════════════════════════════════════════════
    proc_explosion_chance:   { name: 'Volatiles Gemisch',    desc: '+5% Explosionschance (max 25%)' },
    proc_explosion_radius:   { name: 'Explosionsradius',     desc: '+20% Explosionsradius' },
    proc_explosion_damage:   { name: 'Größerer Knall',       desc: '+15% Explosionsschaden' },
    proc_explosion_chain:    { name: 'Infernokette',         desc: 'Explosionen können weitere auslösen' },
    proc_explosion_burn:     { name: 'Napalm',               desc: 'Explosionen hinterlassen Feuer (5 SCH/s, 2s)' },
    proc_explosion_slow:     { name: 'Betäubende Explosion', desc: 'Explosionen verlangsamen Gegner (1,5s)' },
    proc_explosion_vampiric: { name: 'Pyromane',             desc: 'Heile 5% des Explosionsschadens' },
    proc_explosion_cluster:  { name: 'Streubomben',          desc: '20% Chance: Explosion erzeugt 3 Mini-Bomben' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – PROC: CHAIN LIGHTNING
    // ══════════════════════════════════════════════════
    proc_chain_targets:    { name: 'Längere Kette',          desc: '+1 Blitz-Sprung' },
    proc_chain_chance:     { name: 'Leitung',                desc: '+5% Blitz-Chance (max 25%)' },
    proc_chain_range:      { name: 'Erweiterter Bogen',      desc: '+20% Blitz-Reichweite' },
    proc_chain_damage:     { name: 'Überladen',              desc: '+25% Kettenblitz-Schaden' },
    proc_chain_stun:       { name: 'Lähmender Blitz',        desc: 'Blitz betäubt letztes Ziel 0,5s' },
    proc_chain_burn:       { name: 'Elektro-Brand',          desc: 'Blitz verursacht Brand (3 SCH/s, 2s)' },
    proc_chain_splash:     { name: 'Bogen-Spritzer',         desc: 'Jeder Sprung macht auch kleinen Flächenschaden' },
    proc_chain_energize:   { name: 'Energisieren',           desc: 'Blitz reduziert Fähigkeits-CD um 0,3s pro Sprung' },
    proc_chain_fork:       { name: 'Gegabelter Blitz',       desc: 'Blitz gabelt sich – trifft 2 Gegner pro Sprung' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – PROC: HEAVY CRIT
    // ══════════════════════════════════════════════════
    proc_crit_damage:        { name: 'Verheerende Krits',    desc: '+20% Krit-Bonusschaden' },
    proc_crit_chance_global: { name: 'Scharfes Auge',        desc: '+3% globale Krit-Chance' },
    proc_crit_explosion:     { name: 'Kritische Masse',      desc: 'Krits verursachen kleine Explosion (r50)' },
    proc_crit_chain:         { name: 'Krit-Serie',           desc: 'Jeder Krit erhöht nächste Krit-Chance +5%' },
    proc_crit_lifesteal:     { name: 'Vampirische Krits',    desc: 'Krits heilen 5% des Schadens' },
    proc_crit_slow:          { name: 'Verkrüppelnde Krits',  desc: 'Krits verlangsamen Ziel 30% für 1,5s' },
    proc_crit_execute:       { name: 'Gnadenstoß',           desc: 'Krits gegen Gegner unter 15% LP: sofortiger Kill' },
    proc_crit_shockwave:     { name: 'Krit-Nova',            desc: 'Jeder 3. Krit löst eine Gratis-Schockwelle aus' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – GLOBAL
    // ══════════════════════════════════════════════════
    global_damage_boost:      { name: 'Kraftschub',           desc: '+8% Gesamtschaden' },
    global_cooldown_reduction: { name: 'Zeitfluss',           desc: '-8% alle Abklingzeiten' },
    global_elemental_fury:    { name: 'Elementarwut',         desc: 'Bei Kill: zufälliger Elementarausbruch' },
    global_momentum:          { name: 'Schwung',              desc: 'Kills in 3s geben +5% Tempo (max +30%)' },
    global_glass_cannon:      { name: 'Glaskanone',           desc: '+25% Gesamtschaden, aber -15% max LP' },
    global_overcharge:        { name: 'Überladung',           desc: '+15% Fähigkeits-SCH, -10% Fähigkeits-CD' },
    global_bloodthirst:       { name: 'Blutdurst',            desc: 'Kills heilen 2% max LP' },
    global_adrenaline:        { name: 'Adrenalinschub',       desc: 'Kills geben +5% Tempo für 3s (max +25%)' },
    global_executioner:       { name: 'Henker',               desc: '+15% SCH gegen Gegner unter 25% LP' },
    global_last_stand:        { name: 'Letztes Gefecht',      desc: 'Unter 20% LP: +35% SCH, -20% erlittener SCH' },
    global_thorns:            { name: 'Dornen',               desc: '15% erlittener Schaden wird reflektiert' },
    global_soul_collector:    { name: 'Seelensammler',        desc: 'Jeder Raum-Kill gibt +2% SCH (max +20%)' },
    global_versatile:         { name: 'Vielseitiger Kämpfer', desc: '+5% Nahkampf-SCH + 5% Dolch-SCH' },
    global_evasion:           { name: 'Ausweichen',           desc: '8% Chance, Schaden auszuweichen' },
    global_rampage:           { name: 'Amoklauf',             desc: 'Alle 5 Kills: 3s +40% Tempo + SCH' },
    global_second_life:       { name: 'Zweites Leben',        desc: 'Einmal mit 30% LP bei Tod wiederbeleben' },
    global_aura_of_decay:     { name: 'Aura des Verfalls',    desc: 'Nahe Gegner nehmen 2 SCH/s (r80)' },
    global_crit_momentum:     { name: 'Krit-Schwung',         desc: 'Krits geben +8% Lauftempo für 2s' },
    global_battle_hardened:   { name: 'Kampfgestählt',        desc: '-5% erlittener Schaden' },
    global_scavenger:         { name: 'Plünderer',            desc: '+15% EP-Gewinn + 10% Münzgewinn' },
    global_focus:             { name: 'Fokus',                desc: '+4% globale Krit-Chance' },
    global_berserker_soul:    { name: 'Berserkerseele',       desc: 'Weniger LP = mehr SCH (bis +30% bei 1 LP)' },
    global_shield_on_kill:    { name: 'Saugschild',           desc: 'Kills geben 10 LP Schild (max 30)' },

    // ══════════════════════════════════════════════════
    //  UPGRADE NODES – SYNERGY
    // ══════════════════════════════════════════════════
    synergy_blade_dance:       { name: 'Klingentanz',          desc: 'Nahkampf-Kills verstärken nächsten Dolch +30% SCH' },
    synergy_assassin_path:     { name: 'Assassinenpfad',       desc: 'Sprinten feuert automatisch einen Dolch' },
    synergy_frozen_strike:     { name: 'Frostschlag',          desc: '+25% Nahkampf-SCH gegen eingefrorene/verlangsamte Gegner' },
    synergy_burning_blades:    { name: 'Brennende Klingen',    desc: '+20% Dolch-SCH gegen brennende Gegner' },
    synergy_storm_caller:      { name: 'Sturmrufer',           desc: 'Fähigkeitseinsatz erhöht Proc-Chance +10% für 5s' },
    synergy_combo_master:      { name: 'Kombomeister',         desc: 'Abwechselnde Nahkampf-/Dolchkombos: +20% SCH' },
    synergy_elemental_mastery: { name: 'Elementarmeisterung',  desc: 'Statuseffekte machen +25% mehr Schaden' },
    synergy_war_machine:       { name: 'Kriegsmaschine',       desc: '+8% Gesamt-SCH, +5% Angriffsgeschwindigkeit, -5% max LP' },
    synergy_dash_melee:        { name: 'Blitzangriff',         desc: 'Durch Gegner sprinten greift sie automatisch an' },
    synergy_proc_amplifier:    { name: 'Proc-Verstärker',      desc: '+5% Proc-Chance für alle Procs' },
    synergy_ability_echo:      { name: 'Fähigkeitsecho',       desc: '15% Chance: Fähigkeit verbraucht keine CD' },

    // ══════════════════════════════════════════════════
    //  ACHIEVEMENTS
    // ══════════════════════════════════════════════════
    first_blood:           { name: 'Erstes Blut',           description: 'Töte deinen ersten Gegner.' },
    reach_stage_5:         { name: 'Erste Schritte',        description: 'Erreiche Stufe 5.' },
    reach_stage_8:         { name: 'Dungeon-Lehrling',      description: 'Erreiche Stufe 8.' },
    untouchable_1:         { name: 'Unberührbar I',         description: 'Räume einen Raum (≥10 Gegner) ohne Schaden.' },
    coins_50_run:          { name: 'Münzsammler',           description: 'Sammle 50 Münzen in einem Run.' },
    level_5_run:           { name: 'Aufgestiegen!',         description: 'Erreiche Spielerlevel 5 in einem Run.' },
    first_boss_down:       { name: 'Erster Boss besiegt',   description: 'Besiege deinen ersten Boss.' },
    unlock_1_relic:        { name: 'Schatzsucher',          description: 'Schalte dein erstes Relikt frei.' },
    buy_1_meta_upgrade:    { name: 'Meta-Investor',         description: 'Kaufe dein erstes Meta-Perk-Upgrade.' },
    buy_meta_booster:      { name: 'Vorbereitet',           description: 'Kaufe einen Meta-Booster vor einem Run.' },
    kills_100_total:       { name: 'Zenturio',              description: 'Töte insgesamt 100 Gegner.' },
    untouchable_2:         { name: 'Unberührbar II',        description: 'Räume 2 Räume (≥10 Gegner) hintereinander ohne Schaden.' },
    coins_100_run:         { name: 'Wohlhabend',            description: 'Sammle 100 Münzen in einem Run.' },
    reach_stage_15:        { name: 'Dungeon-Adept',         description: 'Erreiche Stufe 15.' },
    boss_kills_2_run:      { name: 'Doppelter Bosssieger',  description: 'Besiege 2 Bosse in einem Run.' },
    collector_pickups:     { name: 'Sammler',               description: 'Sammle jeden Pickup-Typ mindestens einmal.' },
    unlock_3_relics:       { name: 'Reliktsucher',          description: 'Schalte 3 Relikte frei.' },
    meta_upgrades_10_total: { name: 'Upgrade-Süchtiger',    description: 'Kaufe insgesamt 10 Meta-Perk-Upgrades.' },
    boss_no_hit_1:         { name: 'Effizient',             description: 'Besiege einen Boss ohne Schaden im Kampf.' },
    reach_stage_10_fast:   { name: 'Speedrunner I',         description: 'Erreiche Stufe 10 in unter 10 Minuten.' },
    kills_500_total:       { name: 'Monsterjäger',          description: 'Töte insgesamt 500 Gegner.' },
    untouchable_3:         { name: 'Unberührbar III',       description: 'Räume 3 Räume (≥10 Gegner) hintereinander ohne Schaden.' },
    boss_kills_3_run:      { name: 'Bossjäger',             description: 'Besiege 3 Bosse in einem Run.' },
    reach_stage_20:        { name: 'Dungeon-Meister',       description: 'Erreiche Stufe 20.' },
    level_15_run:          { name: 'Voll ausgebaut',        description: 'Erreiche Spielerlevel 15 in einem Run.' },
    coins_200_run:         { name: 'Großer Spieler',        description: 'Sammle 200 Münzen in einem Run.' },
    no_revive_to_stage_20: { name: 'Keine Panik',           description: 'Erreiche Stufe 20 ohne Wiederbelebung.' },
    visit_all_biomes_run:  { name: 'Biom-Reisender',        description: 'Besuche jedes Biom in einem Run.' },
    trap_dancer_5:         { name: 'Fallentänzer',           description: 'Räume 5 Fallenräume (≥10 Gegner) ohne Schaden.' },
    minimalist_stage_20:   { name: 'Minimalist',            description: 'Erreiche Stufe 20 ohne Meta-Booster.' },
    reach_stage_40:        { name: 'Raumfahrer',             description: 'Erreiche Stufe 40.' },
    kills_1000_total:      { name: 'Werdende Legende',      description: 'Töte insgesamt 1000 Gegner.' },
    untouchable_5:         { name: 'Unberührbar IV',        description: 'Räume 5 Räume (≥10 Gegner) hintereinander ohne Schaden.' },
    boss_no_hit_3_streak:  { name: 'Boss-Ansturm',          description: 'Besiege 3 Bosse hintereinander ohne Schaden.' },
    reach_stage_30:        { name: 'Dungeon-Herrscher',     description: 'Erreiche Stufe 30.' },
    no_damage_to_stage_10: { name: 'Perfekter Run I',       description: 'Erreiche Stufe 10 ohne jeglichen Schaden.' },
    unlock_all_relics:     { name: 'Reliktmeister',         description: 'Schalte jedes Relikt frei.' },
    max_one_meta_perk:     { name: 'Meta-Maximierer',       description: 'Maximiere ein beliebiges Meta-Perk auf Stufe 10.' },
    shopaholic_10_run:     { name: 'Kaufsüchtig',           description: 'Kaufe 10 Shop-Items in einem Run.' },
    boss_kills_10_total:   { name: 'Erfahrener Schlächter',  description: 'Besiege insgesamt 10 Bosse.' },
    boss_kills_5_run:      { name: 'Pentakill',             description: 'Besiege 5 Bosse in einem Run.' },
    boss_kills_20_total:   { name: 'Boss-Vernichter',       description: 'Besiege insgesamt 20 Bosse.' },
    reach_stage_50:        { name: 'Letzte Grenze',         description: 'Erreiche Stufe 50.' },
    true_dungeon_god:      { name: 'Wahrer Dungeon-Gott',   description: 'Stufe ≥50, kein Booster, keine Wiederbelebung, 5+ Bosse ohne Treffer, ≤3 Schadensereignisse.' },
};

export default DE;
