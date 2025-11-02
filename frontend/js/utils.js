function renderHPBar(current, max = 20) {
    const percent = Math.max(0, Math.min(100, (current / max) * 100));
    return `
        <div class="progress-bar">
            <div class="progress-fill hp-bar" style="width: ${percent}%;"></div>
        </div>
    `;
}

function renderXPBar(current, max) {
    const percentage = Math.min((current / max) * 100, 100);
    return `
        <div class="progress-bar">
            <div class="progress-fill xp-bar" style="width: ${percentage}%;"></div>
        </div>
    `;
}

function renderManaBar(current, max) {
    const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    return `
        <div class="progress-bar">
            <div class="progress-fill mana-bar" style="width: ${percentage}%;"></div>
        </div>
    `;
}

function getXpForSingleLevel(level) {
    // XP required to advance from (level-1) to level
    if (level <= 1) {
        return 0;
    } else if (level === 2) {
        return 82;  // Keep base requirement same
    } else if (level === 3) {
        return 218;  // 300 total - 82 = 218 for level 3
    } else if (level === 4) {
        return 780;  // 1080 total - 300 = 780 for level 4
    } else {
        // For levels 5+, use escalating multiplier starting at 3.6x
        const prevLevelXp = getXpForSingleLevel(level - 1);
        // Increase multiplier slightly each level: 3.6, 3.7, 3.8, etc.
        const multiplier = 3.5 + (level - 4) * 0.1;
        return Math.floor(prevLevelXp * multiplier);
    }
}

function getXpRequiredForLevel(level) {
    // Get total XP required to reach a specific level
    if (level <= 1) {
        return 0;
    }

    let totalXp = 0;
    for (let lvl = 2; lvl <= level; lvl++) {
        totalXp += getXpForSingleLevel(lvl);
    }
    return totalXp;
}

function xpToNextLevel(level) {
    // Return total XP needed to reach the next level
    const nextLevel = level + 1;
    return getXpRequiredForLevel(nextLevel);
}

function getMaxHP(profile) {
    // Calculate max HP based on profile stats
    // Base HP starts at 20, plus any HP points allocated during character creation or level-ups
    // The profile.hp value represents the base HP stat, so we use it directly as max HP
    return profile.hp;
}

