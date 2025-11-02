let currentBot = null;

function updatePlayerStats(player) {
    console.log("Updating player stats for:", player);
    const playerStatsDiv = document.getElementById("playerStats");
    console.log("playerStatsDiv found?", playerStatsDiv);
    playerStatsDiv.innerHTML = `
        <h2>Your Stats:</h2>
        <p>HP: ${player.hp}</p>
        ${renderHPBar(player.hp, player.maxHP || 20)}
        <p>Power: ${player.power}</p>
        <p>Agility: ${player.agility}</p>
        <p>Protection: ${player.defense}</p>
    `;
}

function updateBotStats(bot) {
    console.log("Updating bot stats for:", bot);
    const botStatsDiv = document.getElementById("botStats");
    console.log("botStatsDiv found?", botStatsDiv);
    botStatsDiv.innerHTML = `
        <h2>Enemy Bot:</h2>
        <p>HP: ${bot.hp}</p>
        ${renderHPBar(bot.hp, 20)}
        <p>Power: ${bot.power}</p>
        <p>Agility: ${bot.agility}</p>
        <p>Protection: ${bot.defense}</p>
    `;
}

function showFightScreen(profile) {
    // Initialize selected body parts
    let selectedHit = null;
    let selectedDefend = null;

    document.body.innerHTML = `
        <div class="game-container fight-container">
            <div class="game-header">
                <h1>⚔️ FIGHT ARENA</h1>
                <div class="subtitle">Battle against the bot</div>
            </div>

            <div class="fight-vs-section">
                <div class="fighter-card" id="playerCard">
                    <div class="fighter-image-container" id="playerImageContainer">
                        <div class="fighter-fallback" id="playerFallback">🧑</div>
                    </div>
                    <div class="fighter-name">${profile.nickname}</div>
                    <div class="fighter-hp">
                        <div class="hp-label">❤️ Health Points</div>
                        <div id="playerHPText">${profile.hp}/${profile.hp}</div>
                        <div id="playerHPBar">${renderHPBar(profile.hp, profile.hp)}</div>
                    </div>
                    <div class="fighter-stats">
                        <div class="mini-stat">
                            <div class="mini-stat-label">⚔️ PWR</div>
                            <div class="mini-stat-value">${profile.power}</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">💨 AGL</div>
                            <div class="mini-stat-value">${profile.agility}</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">🛡️ PRO</div>
                            <div class="mini-stat-value">${profile.defense}</div>
                        </div>
                    </div>
                </div>

                <div class="vs-divider">⚔️<br>VS</div>

                <div class="fighter-card" id="botCard">
                    <div class="fighter-image-container" id="botImageContainer">
                        <div class="fighter-fallback">🤖</div>
                    </div>
                    <div class="fighter-name">Enemy Bot</div>
                    <div class="fighter-hp">
                        <div class="hp-label">❤️ Health Points</div>
                        <div id="botHPText">Loading...</div>
                        <div id="botHPBar">${renderHPBar(20, 20)}</div>
                    </div>
                    <div class="fighter-stats" id="botStats">
                        <div class="mini-stat">
                            <div class="mini-stat-label">⚔️ PWR</div>
                            <div class="mini-stat-value">-</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">💨 AGL</div>
                            <div class="mini-stat-value">-</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">🛡️ PRO</div>
                            <div class="mini-stat-value">-</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="fight-controls">
                <div class="fight-actions">
                    <div class="action-group">
                        <div class="action-label">🎯 Attack Target</div>
                        <div class="body-parts" id="hitParts">
                            <div class="body-part" data-part="head">🧠 Head</div>
                            <div class="body-part" data-part="chest">👕 Chest</div>
                            <div class="body-part" data-part="stomach">🥋 Stomach</div>
                            <div class="body-part" data-part="belt">🔗 Belt</div>
                            <div class="body-part" data-part="legs">🦵 Legs</div>
                        </div>
                    </div>

                    <div class="action-group">
                        <div class="action-label">🛡️ Defend Area</div>
                        <div class="body-parts" id="defendParts">
                            <div class="body-part" data-part="head">🧠 Head</div>
                            <div class="body-part" data-part="chest">👕 Chest</div>
                            <div class="body-part" data-part="stomach">🥋 Stomach</div>
                            <div class="body-part" data-part="belt">🔗 Belt</div>
                            <div class="body-part" data-part="legs">🦵 Legs</div>
                        </div>
                    </div>
                </div>

                <button class="attack-button" id="attackBtn" disabled>
                    ⚔️ ATTACK!
                </button>
            </div>

            <div id="fightLog" class="fight-log" style="display:none;">
                <div class="fight-log-header">📜 Battle Report</div>
                <div class="fight-log-content" id="logContent"></div>
                <div class="fight-result-actions">
                    <button id="fightAgainBtn" class="btn-secondary btn-fight-again" style="display:none;">
                        🔄 Fight Again
                    </button>
                    <button id="backToLobbyBtn" class="btn-secondary btn-back-lobby" style="display:none;">
                        🏠 Back to Lobby
                    </button>
                </div>
            </div>
        </div>
    `;

    // Load player avatar based on race
    loadFighterAvatar(profile.race);

    // Set up body part selection
    setupBodyPartSelection();

    // Fetch bot stats immediately
    requestAnimationFrame(() => {
        fetch("/start-fight", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                telegram_id: telegram_id
            })
        })
        .then(response => response.json())
        .then(data => {
            currentBot = data.bot;
            updateBotStatsNew(currentBot);
            // Update player stats with proper HP values from server
            if (data.player) {
                updatePlayerStatsNew(data.player);
            }
        })
        .catch(error => {
            console.error("Error fetching bot stats:", error);
        });
    });

    // Fight button listener
    document.getElementById("attackBtn").addEventListener("click", (e) => {
        e.preventDefault();
        if (selectedHit && selectedDefend) {
            fight(profile);
        }
    });

    function setupBodyPartSelection() {
        // Hit parts selection
        document.querySelectorAll('#hitParts .body-part').forEach(part => {
            part.addEventListener('click', () => {
                document.querySelectorAll('#hitParts .body-part').forEach(p => p.classList.remove('selected'));
                part.classList.add('selected');
                selectedHit = part.dataset.part;
                updateAttackButton();
            });
        });

        // Defend parts selection
        document.querySelectorAll('#defendParts .body-part').forEach(part => {
            part.addEventListener('click', () => {
                document.querySelectorAll('#defendParts .body-part').forEach(p => p.classList.remove('selected'));
                part.classList.add('selected');
                selectedDefend = part.dataset.part;
                updateAttackButton();
            });
        });
    }

    function updateAttackButton() {
        const attackBtn = document.getElementById("attackBtn");
        attackBtn.disabled = !(selectedHit && selectedDefend);
    }

    // Expose selection getters for fight function
    window.getSelectedHit = () => selectedHit;
    window.getSelectedDefend = () => selectedDefend;
}

function loadFighterAvatar(race) {
    const container = document.getElementById("playerImageContainer");
    const fallback = document.getElementById("playerFallback");
    if (!container || !race) return;

    console.log('Loading fighter image for race:', race);

    const imgPath = `./images/fighters/${race}.png`;
    const img = document.createElement('img');
    img.src = imgPath;
    img.alt = `${race} fighter`;
    img.className = 'fighter-image';

    img.onload = function() {
        console.log('Fighter image loaded successfully:', imgPath);
        // Hide fallback and show image
        fallback.style.display = 'none';
        container.appendChild(img);
    };

    img.onerror = function() {
        console.log('Fighter image failed to load:', imgPath, 'Using fallback');
        // Keep emoji fallback visible
        const raceAvatars = {
            "human": "🧑",
            "elf": "🧝",
            "dwarf": "🧔",
            "orc": "👹"
        };
        fallback.innerHTML = raceAvatars[race] || "👤";
        fallback.style.display = 'flex';
    };

    // Also load random bot enemy
    loadBotImage();
}

function loadBotImage() {
    const container = document.getElementById("botImageContainer");
    if (!container) return;

    // For now, pick a random race for the bot enemy
    const botRaces = ['human', 'elf', 'dwarf', 'orc'];
    const randomRace = botRaces[Math.floor(Math.random() * botRaces.length)];

    console.log('Loading bot image, chosen race:', randomRace);

    const imgPath = `./images/fighters/${randomRace}.png`;
    const img = document.createElement('img');
    img.src = imgPath;
    img.alt = `${randomRace} enemy`;
    img.className = 'fighter-image';
    img.style.filter = 'sepia(100%) hue-rotate(0deg) saturate(2) brightness(0.8)'; // Make it look more enemy-like

    img.onload = function() {
        console.log('Bot image loaded successfully:', imgPath);
        // Hide fallback and show image
        const fallback = container.querySelector('.fighter-fallback');
        if (fallback) fallback.style.display = 'none';
        container.appendChild(img);
    };

    img.onerror = function() {
        console.log('Bot image failed to load:', imgPath, 'keeping robot emoji');
        // Keep robot emoji as fallback
    };
}

function updateBotStatsNew(bot) {
    document.getElementById("botHPText").textContent = `${bot.hp}/20`;
    document.getElementById("botHPBar").innerHTML = renderHPBar(bot.hp, 20);

    const botStatsDiv = document.getElementById("botStats");
    botStatsDiv.innerHTML = `
        <div class="mini-stat">
            <div class="mini-stat-label">⚔️ PWR</div>
            <div class="mini-stat-value">${bot.power}</div>
        </div>
        <div class="mini-stat">
            <div class="mini-stat-label">💨 AGL</div>
            <div class="mini-stat-value">${bot.agility}</div>
        </div>
        <div class="mini-stat">
            <div class="mini-stat-label">🛡️ PRO</div>
            <div class="mini-stat-value">${bot.defense}</div>
        </div>
    `;
}


function fight(profile) {
    // Get selections from the new interface
    const hit = window.getSelectedHit();
    const defend = window.getSelectedDefend();

    // Disable attack button during fight
    const attackBtn = document.getElementById("attackBtn");
    attackBtn.disabled = true;
    attackBtn.textContent = "⚔️ Fighting...";

    fightAPI({ telegram_id, hit, defend })
        .then(data => {
            // Update global currentBot
            currentBot = data.bot;
            updateBotStatsNew(currentBot);

            // Update player stats
            updatePlayerStatsNew(data.player);

            // Show fight log
            showFightLog(data.log, data.fightResult);

            // Set up result buttons
            document.getElementById("fightAgainBtn").onclick = () => showFightScreen(data.player);
            document.getElementById("backToLobbyBtn").onclick = () => checkProfile();

            document.getElementById("fightAgainBtn").style.display = "inline-block";
            document.getElementById("backToLobbyBtn").style.display = "inline-block";
        })
        .catch(error => {
            console.error("Fight error:", error);
            // Re-enable button on error
            attackBtn.disabled = false;
            attackBtn.textContent = "⚔️ ATTACK!";
        });
}

function updatePlayerStatsNew(player) {
    document.getElementById("playerHPText").textContent = `${player.hp}/${player.maxHP || 20}`;
    document.getElementById("playerHPBar").innerHTML = renderHPBar(player.hp, player.maxHP || 20);
    if (player.mana !== undefined && player.maxMana !== undefined) {
        const manaElement = document.getElementById("playerManaText");
        const manaBarElement = document.getElementById("playerManaBar");
        if (manaElement) manaElement.textContent = `${player.mana}/${player.maxMana} MP`;
        if (manaBarElement) manaBarElement.innerHTML = renderManaBar(player.mana, player.maxMana);
    }
}

function showFightLog(logMessages, fightResult) {
    const logDiv = document.getElementById("fightLog");
    const logContent = document.getElementById("logContent");

    // Clear previous content
    logContent.innerHTML = '';

    // Add fight log messages with styling
    logMessages.forEach(line => {
        const logEntry = document.createElement("div");
        logEntry.className = "fight-log-entry";
        logEntry.textContent = line;
        logContent.appendChild(logEntry);
    });

    // Add result message if fight ended
    if (fightResult) {
        const resultEntry = document.createElement("div");
        resultEntry.className = "fight-log-entry";
        resultEntry.style.fontWeight = "bold";
        resultEntry.style.color = fightResult === "won" ? "var(--success-green)" : "var(--error-red)";
        resultEntry.textContent = fightResult === "won" ? "🎉 Victory!" : "💀 Defeat!";
        logContent.appendChild(resultEntry);
    }

    // Show the log
    logDiv.style.display = "block";

    // Scroll to bottom of log
    logDiv.scrollTop = logDiv.scrollHeight;
}

