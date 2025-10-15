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
    return level * 10;  // or your custom formula
}

