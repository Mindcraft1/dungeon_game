// ── Proc System ───────────────────────────────────────────
// Manages active passive proc slots and dispatches events.
// ────────────────────────────────────────────────────────────

import { MAX_ACTIVE_PROCS } from '../constants.js';
import { getProc } from './procs.js';
import * as UpgradeEngine from '../upgrades/upgradeEngine.js';

export class ProcSystem {
    constructor() {
        /** @type {(string|null)[]} */
        this.slots = new Array(MAX_ACTIVE_PROCS).fill(null);
    }

    /**
     * Equip a proc in a slot.
     * @param {number} slot – 0 or 1
     * @param {string} procId
     */
    equip(slot, procId) {
        if (slot < 0 || slot >= MAX_ACTIVE_PROCS) return;
        this.slots[slot] = procId;
    }

    /**
     * Unequip a proc from a slot.
     * @param {number} slot
     */
    unequip(slot) {
        if (slot < 0 || slot >= MAX_ACTIVE_PROCS) return;
        this.slots[slot] = null;
    }

    /**
     * Handle a hit event — check each active proc for trigger.
     * @param {object} event – { source, target, damage, isCrit, attackType }
     * @param {object} context – { enemies, boss, particles }
     */
    handleHit(event, context) {
        const cmods = UpgradeEngine.getCombatMods();
        const procMods = cmods.procs || {};
        const globalMods = cmods.global || {};

        for (const procId of this.slots) {
            if (!procId) continue;
            const def = getProc(procId);
            if (!def) continue;

            // Get proc-specific mods from upgrade nodes
            const mods = procMods[procId] || {};

            if (def.trigger === 'onHit') {
                const chanceBonus = mods.chanceBonus || 0;
                if (Math.random() < (def.chance + chanceBonus)) {
                    // Pass mods + globalMods into context so proc can use them
                    def.onProc(event, { ...context, procMods: mods, globalMods });
                }
            }

            // Heavy Crit fires only when isCrit is true
            if (def.trigger === 'onCrit') {
                if (event.isCrit) {
                    if (Math.random() < def.chance) {
                        def.onProc(event, { ...context, procMods: mods, globalMods });
                    }
                }
            }
        }
    }

    /**
     * Handle a kill event — check each active proc for kill triggers.
     * @param {object} event – { source, target, attackType }
     * @param {object} context – { enemies, boss, particles }
     */
    handleKill(event, context) {
        for (const procId of this.slots) {
            if (!procId) continue;
            const def = getProc(procId);
            if (!def || def.trigger !== 'onKill') continue;

            if (Math.random() < def.chance) {
                def.onProc(event, context);
            }
        }
    }

    /**
     * Get info about a slot for UI rendering.
     * @param {number} slot
     * @returns {{ id, name, icon, color }|null}
     */
    getSlotInfo(slot) {
        const id = this.slots[slot];
        if (!id) return null;
        const def = getProc(id);
        if (!def) return null;
        return { id, name: def.name, icon: def.icon, color: def.color, desc: def.desc };
    }

    /**
     * Get all equipped proc IDs.
     * @returns {string[]}
     */
    getEquippedIds() {
        return this.slots.filter(Boolean);
    }

    /**
     * Check if a proc is equipped.
     */
    hasProc(procId) {
        return this.slots.includes(procId);
    }

    /**
     * Reset (new run).
     */
    reset() {
        this.slots.fill(null);
    }
}
