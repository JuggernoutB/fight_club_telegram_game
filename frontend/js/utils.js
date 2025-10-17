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

function xpToNextLevel(level) {
    return 10;  // Fixed 10 XP per level to match backend
}

function getMaxHP(profile) {
    // Calculate max HP based on profile stats
    // Base HP starts at 20, plus any HP points allocated during character creation or level-ups
    // The profile.hp value represents the base HP stat, so we use it directly as max HP
    return profile.hp;
}

