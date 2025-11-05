/**
 * Combat Engine Module (JavaScript)
 * Shared combat calculation logic for Fight Club game
 * This mirrors the Python combat_engine functionality
 */

// Combat constants
const COMBAT_CONSTANTS = {
    // Default race characteristics
    RACE_DEFAULTS: {
        human: { hp: 25, power: 5, defense: 5, agility: 6, knowledge: 0 },
        orc: { hp: 25, power: 6, defense: 5, agility: 5, knowledge: 0 },
        elf: { hp: 25, power: 5, defense: 5, agility: 6, knowledge: 0 },
        dwarf: { hp: 25, power: 5, defense: 6, agility: 5, knowledge: 0 },
        skeleton: { hp: 26, power: 5, defense: 5, agility: 5, knowledge: 0 }
    },

    // Body parts for combat targeting
    BODY_PARTS: ['head', 'chest', 'stomach', 'belt', 'legs'],

    // Equipment slot configuration per race
    RACE_EQUIPMENT_SLOTS: {
        human: { basic_slots: 2, hand_slots: 2 },
        elf: { basic_slots: 2, hand_slots: 2 },
        orc: { basic_slots: 1, hand_slots: 2 },
        dwarf: { basic_slots: 1, hand_slots: 2 },
        skeleton: { basic_slots: 1, hand_slots: 2 }
    },

    // Damage calculation constants
    BASE_DAMAGE: 3.1,
    POWER_FACTOR: 0.27,
    BLOCK_MULTIPLIER: 0.26,

    // Agility effect constants
    SUPER_ATTACK_MULTIPLIER: 3.5,
    MAX_DODGE_CHANCE: 8,
    MAX_SUPER_ATTACK_CHANCE: 6,
    MIN_DODGE_CHANCE: 2,
    MIN_SUPER_ATTACK_CHANCE: 2,
    AGILITY_DODGE_FACTOR: 1.05,
    AGILITY_SUPER_FACTOR: 1.05,

    // Equipment effects
    STONE_BASE_SUCCESS_CHANCE: 25,
    STONE_BASE_MULTIPLIER: 1.1,
    SLINGSHOT_BONUS: 0.3,

    // Weapon multipliers
    WOODEN_STICK_MULTIPLIER: 1.06,
    BIG_WOODEN_STICK_MULTIPLIER: 1.06,
    KNIFE_MULTIPLIER: 1.04,
    BLADE_MULTIPLIER: 1.04,
    SMALL_CLUB_MULTIPLIER: 1.06,

    // Dual-wield penalties
    DUAL_STICK_PENALTY: 0.65,
    DUAL_CLUB_PENALTY: 0.75,

    // Level scaling penalties
    STONE_LEVEL_PENALTY: 0.15,
    STICK_LEVEL_PENALTY: 0.10,
    CLUB_LEVEL_PENALTY: 0.15,

    // Minimum effectiveness
    MIN_STONE_EFFECTIVENESS: 0.3,
    MIN_STICK_EFFECTIVENESS: 0.4,
    MIN_CLUB_EFFECTIVENESS: 0.3,

    // Magic constants
    FEAR_SPELL_MANA_COST: 3,
    SCREAM_SPELL_MANA_COST: 4,
    FEAR_STAT_REDUCTION: 3,
    SCREAM_DAMAGE_CHANCE: 0.35,
    SCREAM_DAMAGE_BONUS: 1,

    // XP constants
    BASE_XP_WIN: 6,
    BASE_XP_DRAW: 3,
    BASE_XP_LOSS: 2
};

/**
 * Calculate knowledge stat based on race and level
 */
function calculateKnowledgeForLevel(race, level) {
    const baseKnowledge = COMBAT_CONSTANTS.RACE_DEFAULTS[race].knowledge;

    // Special bonuses for skeleton
    if (race === 'skeleton') {
        let bonusKnowledge = 0;
        if (level >= 2) bonusKnowledge += 1;
        if (level >= 8) bonusKnowledge += 1;
        return baseKnowledge + bonusKnowledge;
    }

    return baseKnowledge;
}

/**
 * Get enabled slots for a race
 */
function getEnabledSlots(race) {
    return COMBAT_CONSTANTS.RACE_EQUIPMENT_SLOTS[race] || { basic_slots: 1, hand_slots: 2 };
}

/**
 * Apply projectile effects (stones, big stones, metal balls)
 */
function applyProjectileEffects(damage, attacker, agilityDiff) {
    let effectType = "normal";
    let equipmentUsed = false;

    // Check for stone usage
    for (let i = 0; i < attacker.equipment.length; i++) {
        const item = attacker.equipment[i];
        if (item && item.item_type === "stone" && item.uses_remaining > 0) {
            const stoneSuccessChance = Math.min(100, Math.max(0,
                COMBAT_CONSTANTS.STONE_BASE_SUCCESS_CHANCE + agilityDiff * 1));

            if (Math.random() * 100 < stoneSuccessChance) {
                let stoneMultiplier = COMBAT_CONSTANTS.STONE_BASE_MULTIPLIER + agilityDiff * 0.1;

                // Level-based scaling
                let levelPenalty = 1.0 - (attacker.level - 1) * COMBAT_CONSTANTS.STONE_LEVEL_PENALTY;
                levelPenalty = Math.max(COMBAT_CONSTANTS.MIN_STONE_EFFECTIVENESS, levelPenalty);
                stoneMultiplier = 1.0 + (stoneMultiplier - 1.0) * levelPenalty;

                // Slingshot enhancement
                const hasSlingshot = attacker.hand_equipment.some(equip =>
                    equip && equip.item_type === "slingshot");
                if (hasSlingshot) {
                    stoneMultiplier += COMBAT_CONSTANTS.SLINGSHOT_BONUS;
                }

                damage *= stoneMultiplier;
                item.uses_remaining -= 1;
                equipmentUsed = true;
                effectType = hasSlingshot ? "stone_with_slingshot" : "stone_used";
                break;
            }
        }
    }

    // Similar logic for big_stone and metal_ball would follow...

    return { damage, effectType, equipmentUsed };
}

/**
 * Apply melee effects (sticks, clubs, knives, blades)
 */
function applyMeleeEffects(damage, attacker) {
    let effectType = "normal";

    // Count wooden sticks and apply multipliers
    let stickCount = 0;
    let stickMultipliers = [];

    for (const item of attacker.hand_equipment) {
        if (item && (item.item_type === "wooden_stick" || item.item_type === "big_wooden_stick")) {
            stickCount++;

            let levelPenalty = 1.0;
            if (item.item_type === "wooden_stick") {
                levelPenalty = 1.0 - (attacker.level - 1) * COMBAT_CONSTANTS.STICK_LEVEL_PENALTY;
            } else {
                levelPenalty = 1.0 - (attacker.level - 2) * COMBAT_CONSTANTS.STICK_LEVEL_PENALTY;
            }
            levelPenalty = Math.max(COMBAT_CONSTANTS.MIN_STICK_EFFECTIVENESS, levelPenalty);

            const scaledMultiplier = 1.0 + (item.effect_multiplier - 1.0) * levelPenalty;
            stickMultipliers.push(scaledMultiplier);
        }
    }

    // Apply stick multipliers with dual penalty
    if (stickCount === 2) {
        for (const multiplier of stickMultipliers) {
            const reducedMultiplier = 1.0 + (multiplier - 1.0) * COMBAT_CONSTANTS.DUAL_STICK_PENALTY;
            damage *= reducedMultiplier;
        }
    } else {
        for (const multiplier of stickMultipliers) {
            damage *= multiplier;
        }
    }

    // Handle knives and blades (no dual-wield penalty)
    for (const item of attacker.hand_equipment) {
        if (item && (item.item_type === "knife" || item.item_type === "blade")) {
            let levelPenalty = 1.0;
            if (item.item_type === "knife") {
                levelPenalty = 1.0 - (attacker.level - 2) * COMBAT_CONSTANTS.STICK_LEVEL_PENALTY;
                levelPenalty = Math.max(COMBAT_CONSTANTS.MIN_STICK_EFFECTIVENESS, levelPenalty);
            } else if (item.item_type === "blade") {
                if (attacker.level >= 4) {
                    levelPenalty = 1.0 - (attacker.level - 3) * COMBAT_CONSTANTS.CLUB_LEVEL_PENALTY;
                    levelPenalty = Math.max(COMBAT_CONSTANTS.MIN_CLUB_EFFECTIVENESS, levelPenalty);
                }
            }

            const scaledMultiplier = 1.0 + (item.effect_multiplier - 1.0) * levelPenalty;
            damage *= scaledMultiplier;
        }
    }

    if (stickCount > 0) {
        effectType = stickCount === 2 ? "dual_sticks_used" : "stick_used";
    }

    return { damage, effectType };
}

/**
 * Calculate damage with all effects
 */
function calculateDamage(attacker, defender, attackPart, defendParts,
                        defenderBlocksAvailable = true, powerReduction = 0,
                        defenseReduction = 0, screamActive = false) {

    // Apply fear reductions temporarily
    const originalPower = attacker.power;
    const originalDefense = defender.defense;

    if (powerReduction > 0) {
        attacker.power = Math.max(1, attacker.power - powerReduction);
    }
    if (defenseReduction > 0) {
        defender.defense = Math.max(1, defender.defense - defenseReduction);
    }

    // Calculate agility difference
    const agilityDiff = attacker.agility - defender.agility;
    let effectType = "normal";

    // Check for super attack
    if (agilityDiff > 0) {
        const superAttackChance = Math.min(
            COMBAT_CONSTANTS.MAX_SUPER_ATTACK_CHANCE,
            Math.max(COMBAT_CONSTANTS.MIN_SUPER_ATTACK_CHANCE,
                    agilityDiff * COMBAT_CONSTANTS.AGILITY_SUPER_FACTOR)
        );
        if (Math.random() * 100 < superAttackChance) {
            effectType = "super_attack";
        }
    }

    // Check for dodge
    else if (agilityDiff < 0) {
        const dodgeChance = Math.min(
            COMBAT_CONSTANTS.MAX_DODGE_CHANCE,
            Math.max(COMBAT_CONSTANTS.MIN_DODGE_CHANCE,
                    Math.abs(agilityDiff) * COMBAT_CONSTANTS.AGILITY_DODGE_FACTOR)
        );
        if (Math.random() * 100 < dodgeChance) {
            // Restore original stats
            attacker.power = originalPower;
            defender.defense = originalDefense;
            return { damage: 0, effectType: "dodged", blockUsed: false };
        }
    }

    // Calculate base damage
    const ratio = defender.defense > 0 ? attacker.power / defender.defense : attacker.power;
    let damage = COMBAT_CONSTANTS.BASE_DAMAGE * Math.pow(ratio, COMBAT_CONSTANTS.POWER_FACTOR);

    // Apply super attack multiplier
    if (effectType === "super_attack") {
        damage *= COMBAT_CONSTANTS.SUPER_ATTACK_MULTIPLIER;
    }

    // Apply equipment effects
    const projectileResult = applyProjectileEffects(damage, attacker, agilityDiff);
    damage = projectileResult.damage;
    if (projectileResult.effectType !== "normal") {
        effectType = projectileResult.effectType;
    }

    const meleeResult = applyMeleeEffects(damage, attacker);
    damage = meleeResult.damage;
    if (meleeResult.effectType !== "normal" && projectileResult.effectType === "normal") {
        effectType = meleeResult.effectType;
    }

    // Check for block
    const isBlocked = defendParts.includes(attackPart) && defenderBlocksAvailable;
    let blockUsed = false;
    if (isBlocked) {
        damage *= COMBAT_CONSTANTS.BLOCK_MULTIPLIER;
        blockUsed = true;
    }

    // Probability-based integer conversion
    const baseDamage = Math.floor(damage);
    const fractionalPart = damage - baseDamage;
    let finalDamage = Math.random() < fractionalPart ? baseDamage + 1 : baseDamage;

    // Apply scream spell damage buff
    if (screamActive && Math.random() < COMBAT_CONSTANTS.SCREAM_DAMAGE_CHANCE) {
        finalDamage += COMBAT_CONSTANTS.SCREAM_DAMAGE_BONUS;
    }

    // Restore original stats
    attacker.power = originalPower;
    defender.defense = originalDefense;

    return {
        damage: Math.max(1, finalDamage),
        effectType,
        blockUsed
    };
}

/**
 * Calculate XP for fight result
 */
function calculateXpForFight(result, playerLevel, opponentLevel) {
    let baseXp;
    if (result === 'win') {
        baseXp = COMBAT_CONSTANTS.BASE_XP_WIN;
    } else if (result === 'draw') {
        baseXp = COMBAT_CONSTANTS.BASE_XP_DRAW;
    } else {
        baseXp = COMBAT_CONSTANTS.BASE_XP_LOSS;
    }

    // Apply level modifier
    const levelDiff = opponentLevel - playerLevel;
    let multiplier;

    if (levelDiff === -1) {
        if (result === 'draw') return 0;
        multiplier = 0.7;
    } else if (levelDiff === 0) {
        multiplier = 1.0;
    } else if (levelDiff === 1) {
        if (result === 'draw') return COMBAT_CONSTANTS.BASE_XP_WIN;
        multiplier = 1.5;
    } else {
        if (levelDiff < -1) {
            multiplier = Math.max(0.5, 0.7 + (levelDiff + 1) * 0.1);
        } else {
            multiplier = Math.min(2.0, 1.5 + (levelDiff - 1) * 0.2);
        }
    }

    return Math.floor(baseXp * multiplier);
}

// Export the module
module.exports = {
    COMBAT_CONSTANTS,
    calculateKnowledgeForLevel,
    getEnabledSlots,
    calculateDamage,
    calculateXpForFight,
    applyProjectileEffects,
    applyMeleeEffects
};