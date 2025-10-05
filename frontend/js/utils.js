function renderHPBar(current, max = 20) {
    const percent = Math.max(0, Math.min(100, (current / max) * 100));
    return `
        <div style="background:#ccc; width:150px; height:15px; border-radius:4px; overflow:hidden; margin-bottom:5px;">
            <div style="background:#4caf50; width:${percent}%; height:100%;"></div>
        </div>
    `;
}

function renderXPBar(current, max) {
    const percentage = Math.min((current / max) * 100, 100);
    return `
        <div style="width: 200px; background: #ddd; border: 1px solid #000; margin: 5px 0; border-radius: 4px; overflow: hidden;">
            <div style="width: ${percentage}%; background: #00aaff; color: #fff; text-align: center; height: 20px; line-height: 20px;">
                ${current} / ${max}
            </div>
        </div>
    `;
}

function xpToNextLevel(level) {
    return level * 10;  // or your custom formula
}

