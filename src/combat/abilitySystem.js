// ── Ability System ─────────────────────────────────────────
// Manages active ability slots (Q/E), cooldowns, and usage.
// ────────────────────────────────────────────────────────────

import { MAX_ACTIVE_ABILITIES } from '../constants.js';
import { getAbility } from './abilities.js';
import * as UpgradeEngine from '../upgrades/upgradeEngine.js';

export class AbilitySystem {
    constructor() {
        /** @type {(string|null)[]} */
        this.slots = new Array(MAX_ACTIVE_ABILITIES).fill(null);

        /** @type {Map<string, number>} Cooldown remaining (seconds) per ability id */
        this.cooldowns = new Map();

        /** @type {Map<string, object>} Active persistent state per ability id (e.g. blade_storm) */
        this.activeStates = new Map();
    }

    /**
     * Equip an ability in a slot.
     * @param {number} slot – 0 or 1
     * @param {string} abilityId
     */
    equip(slot, abilityId) {
        if (slot < 0 || slot >= MAX_ACTIVE_ABILITIES) return;
        const old = this.slots[slot];
        if (old) {
            this.cooldowns.delete(old);
            this.activeStates.delete(old);
        }
        this.slots[slot] = abilityId;
        this.cooldowns.set(abilityId, 0);
    }

    /**
     * Unequip an ability from a slot.
     * @param {number} slot
     */
    unequip(slot) {
        if (slot < 0 || slot >= MAX_ACTIVE_ABILITIES) return;
        const id = this.slots[slot];
        if (id) {
            this.cooldowns.delete(id);
            this.activeStates.delete(id);
        }
        this.slots[slot] = null;
    }

    /**
     * Try to use the ability in the given slot.
     * @param {number} slot – 0 or 1
     * @param {object} context – { player, enemies, boss, projectiles, particles, procSystem }
     * @returns {boolean} true if ability was used
     */
    use(slot, context) {
        const id = this.slots[slot];
        if (!id) return false;

        const cd = this.cooldowns.get(id) || 0;
        if (cd > 0) return false;

        const def = getAbility(id);
        if (!def) return false;

        // ── Read ability-specific mods from upgrade nodes ──
        const cmods = UpgradeEngine.getCombatMods();
        const abilityMods = (cmods.abilities && cmods.abilities[id]) || {};
        const globalMods = cmods.global || {};

        // Pass mods into context so ability definitions can read them
        const enrichedContext = { ...context, abilityMods, globalMods };
        const result = def.onUse(enrichedContext);

        // Set cooldown (with node + global cooldown multiplier)
        const cdMult = (abilityMods.cooldownMult || 1) * (globalMods.cooldownMult || 1);
        this.cooldowns.set(id, def.cooldownSec * cdMult);

        // If ability returns a persistent state object, store it
        if (result && typeof result === 'object' && result.active) {
            // Store mods in state so onUpdate can access them
            result._abilityMods = abilityMods;
            result._globalMods = globalMods;
            this.activeStates.set(id, result);
        }

        return true;
    }

    /**
     * Update all cooldowns and active persistent abilities.
     * @param {number} dt – seconds
     * @param {object} context – same as use()
     */
    update(dt, context) {
        // Update cooldowns
        for (const [id, cd] of this.cooldowns.entries()) {
            if (cd > 0) {
                this.cooldowns.set(id, Math.max(0, cd - dt));
            }
        }

        // Update active persistent abilities (e.g. blade_storm, gravity_pull)
        for (const [id, state] of this.activeStates.entries()) {
            const def = getAbility(id);
            if (def && def.onUpdate && state && state.active) {
                // Pass enriched context with mods stored in state
                const enrichedContext = { ...context, abilityMods: state._abilityMods || {}, globalMods: state._globalMods || {} };
                const newState = def.onUpdate(enrichedContext, dt, state);
                if (newState && newState.active) {
                    // Preserve mods reference
                    newState._abilityMods = state._abilityMods;
                    newState._globalMods = state._globalMods;
                    this.activeStates.set(id, newState);
                } else {
                    this.activeStates.delete(id);
                }
            }
        }
    }

    /**
     * Get info about a slot for UI rendering.
     * @param {number} slot
     * @returns {{ id, name, icon, color, cooldown, maxCooldown, isActive }|null}
     */
    getSlotInfo(slot) {
        const id = this.slots[slot];
        if (!id) return null;
        const def = getAbility(id);
        if (!def) return null;
        const cd = this.cooldowns.get(id) || 0;
        const state = this.activeStates.get(id);
        return {
            id,
            name: def.name,
            icon: def.icon,
            color: def.color,
            cooldown: cd,
            maxCooldown: def.cooldownSec,
            isActive: !!(state && state.active),
        };
    }

    /**
     * Check if any persistent ability is currently active (for rendering).
     */
    hasActiveAbility() {
        for (const [, state] of this.activeStates) {
            if (state && state.active) return true;
        }
        return false;
    }

    /**
     * Get all equipped ability IDs.
     * @returns {string[]}
     */
    getEquippedIds() {
        return this.slots.filter(Boolean);
    }

    /**
     * Reset all cooldowns and states (e.g. on new run).
     */
    reset() {
        this.slots.fill(null);
        this.cooldowns.clear();
        this.activeStates.clear();
    }
}
