/**
 * XP Calculator Module (JavaScript)
 * Shared XP calculation logic for Fight Club game
 */

// XP constants
const BASE_XP_WIN = 6;
const BASE_XP_DRAW = 3;
const BASE_XP_LOSS = 2;

/**
 * Calculate XP gained from a fight result
 */
function calculateXpForFight(result, playerLevel, opponentLevel) {
    // Get base XP based on result
    let baseXp;
    if (result === 'win') {
        baseXp = BASE_XP_WIN;
    } else if (result === 'draw') {
        baseXp = BASE_XP_DRAW;
    } else { // loss
        baseXp = BASE_XP_LOSS; // Beat bot gives some XP
    }

    // Apply level modifier
    const levelDiff = opponentLevel - playerLevel;
    let multiplier;

    if (levelDiff === -1) { // Fighting lower level
        if (result === 'draw') {
            return 0; // No XP for draw against lower level
        }
        multiplier = 0.7;
    } else if (levelDiff === 0) { // Same level
        multiplier = 1.0;
    } else if (levelDiff === 1) { // Fighting higher level
        if (result === 'draw') {
            return BASE_XP_WIN; // Draw against higher = win XP against same
        }
        multiplier = 1.5;
    } else {
        // For other level differences, use gradual scaling
        if (levelDiff < -1) {
            multiplier = Math.max(0.5, 0.7 + (levelDiff + 1) * 0.1);
        } else { // levelDiff > 1
            multiplier = Math.min(2.0, 1.5 + (levelDiff - 1) * 0.2);
        }
    }

    return Math.floor(baseXp * multiplier);
}

/**
 * Get XP required to advance from (level-1) to level
 */
function getXpForSingleLevel(level) {
    if (level <= 1) {
        return 0;
    } else if (level === 2) {
        return 82; // Keep base requirement same
    } else if (level === 3) {
        return 218; // 300 total - 82 = 218 for level 3
    } else if (level === 4) {
        return 780; // 1080 total - 300 = 780 for level 4
    } else {
        // For levels 5+, use escalating multiplier starting at 3.6x
        const prevLevelXp = getXpForSingleLevel(level - 1);
        // Increase multiplier slightly each level: 3.6, 3.7, 3.8, etc.
        const multiplier = 3.5 + (level - 4) * 0.1;
        return Math.floor(prevLevelXp * multiplier);
    }
}

/**
 * Get total XP required to reach a specific level
 */
function getXpRequiredForLevel(level) {
    if (level <= 1) {
        return 0;
    }

    // Calculate total XP by summing all level requirements
    let totalXp = 0;
    for (let lvl = 2; lvl <= level; lvl++) {
        totalXp += getXpForSingleLevel(lvl);
    }
    return totalXp;
}

/**
 * Get current level and progress from total XP
 */
function getCurrentLevelFromXp(xp) {
    if (xp < 82) {
        return [1, xp, 82];
    }

    let level = 1;
    let totalXpUsed = 0;

    while (level < 10) {
        const nextLevel = level + 1;
        const xpForNextLevel = getXpForSingleLevel(nextLevel);

        if (totalXpUsed + xpForNextLevel > xp) {
            // Current level found
            const currentLevelXp = xp - totalXpUsed;
            return [level, currentLevelXp, xpForNextLevel];
        }

        totalXpUsed += xpForNextLevel;
        level += 1;
    }

    // At max level (10)
    return [10, 0, 0];
}

/**
 * Check if a level up occurred and return new level and whether level up happened
 */
function checkLevelUp(currentXp, currentLevel) {
    const xpNeeded = getXpRequiredForLevel(currentLevel + 1);

    if (currentXp >= xpNeeded && currentLevel < 10) {
        return [currentLevel + 1, true];
    }

    return [currentLevel, false];
}

/**
 * Calculate time needed to reach target level
 */
function calculateTimeToTargetLevel(currentXp, dailyXp, targetLevel = 10) {
    const totalXpNeeded = getXpRequiredForLevel(targetLevel);
    const remainingXp = totalXpNeeded - currentXp;

    if (remainingXp <= 0) {
        return {
            already_target_level: true,
            days: 0,
            weeks: 0,
            months: 0
        };
    }

    const daysNeeded = dailyXp > 0 ? remainingXp / dailyXp : Infinity;
    const weeksNeeded = daysNeeded / 7;
    const monthsNeeded = daysNeeded / 30;

    return {
        already_target_level: false,
        total_xp_needed: totalXpNeeded,
        remaining_xp: remainingXp,
        days: Math.round(daysNeeded * 10) / 10,
        weeks: Math.round(weeksNeeded * 10) / 10,
        months: Math.round(monthsNeeded * 10) / 10
    };
}

// Export the module
module.exports = {
    BASE_XP_WIN,
    BASE_XP_DRAW,
    BASE_XP_LOSS,
    calculateXpForFight,
    getXpForSingleLevel,
    getXpRequiredForLevel,
    getCurrentLevelFromXp,
    checkLevelUp,
    calculateTimeToTargetLevel
};