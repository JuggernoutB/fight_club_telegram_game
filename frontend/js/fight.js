let currentBot = null;

function updatePlayerStats(player) {
    console.log("Updating player stats for:", player);
    const playerStatsDiv = document.getElementById("playerStats");
    console.log("playerStatsDiv found?", playerStatsDiv);
    playerStatsDiv.innerHTML = `
        <h2>Your Stats:</h2>
        <p>HP: ${player.hp}</p>
        ${renderHPBar(player.hp, 20)}
        <p>Power: ${player.power}</p>
        <p>Agility: ${player.agility}</p>
        <p>Protection: ${player.protection}</p>
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
        <p>Protection: ${bot.protection}</p>
    `;
}

function showFightScreen(profile) {
    document.body.innerHTML = `
        <h1>Fight Arena</h1>
        <div id="playerStats"></div>
        <div id="botStats"></div>

        <form id="fightForm">
            <label>Hit Part:
                <select id="hit">
                    <option value="head">Head</option>
                    <option value="chest">Chest</option>
                    <option value="stomach">Stomach</option>
                    <option value="legs">Legs</option>
                </select>
            </label><br>

            <label>Defend Part:
                <select id="defend">
                    <option value="head">Head</option>
                    <option value="chest">Chest</option>
                    <option value="stomach">Stomach</option>
                    <option value="legs">Legs</option>
                </select>
            </label><br>

            <button type="submit">Hit</button>
        </form>

        <div id="fightLog" style="margin-top:20px; border:1px solid #ccc; padding:10px; display:none;">
            <h3>Fight Log:</h3>
            <div id="logContent"></div>
            <button id="fightAgainBtn" style="margin-top:10px; display:none;">Fight Again</button>
            <button id="backToLobbyBtn" style="margin-top:10px; display:none;">Back to Lobby</button>
        </div>
    `;

    // Show player stats
    document.getElementById("playerStats").innerHTML = `
        <h2>Your Stats:</h2>
        <p>HP: ${profile.hp}</p>
        ${renderHPBar(profile.hp, 20)}
        <p>Power: ${profile.power}</p>
        <p>Agility: ${profile.agility}</p>
        <p>Protection: ${profile.protection}</p>
    `;

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
            updateBotStats(currentBot);
        })
        .catch(error => {
            console.error("Error fetching bot stats:", error);
        });
    });

    // Fight submit listener
    document.getElementById("fightForm").addEventListener("submit", (e) => {
        e.preventDefault();
        fight(profile);
    });
}


function fight(profile) {
    const hit = document.getElementById("hit").value;
    const defend = document.getElementById("defend").value;

    fightAPI({ telegram_id, hit, defend })
        .then(data => {
            const logDiv = document.getElementById("fightLog");
            const logContent = document.getElementById("logContent");
            logContent.innerHTML = ``;

            // Update global currentBot
            currentBot = data.bot;
            updateBotStats(currentBot);

            // Update player stats
            updatePlayerStats(data.player);

            // Add fight log messages
            data.log.forEach(line => {
                const p = document.createElement("p");
                p.textContent = line;
                logContent.appendChild(p);
            });

            logDiv.style.display = "block";
            document.getElementById("fightAgainBtn").onclick = () => showFightScreen(data.player);
            document.getElementById("backToLobbyBtn").onclick = () => checkProfile();

            document.getElementById("fightAgainBtn").style.display = "inline-block";
            document.getElementById("backToLobbyBtn").style.display = "inline-block";
        })
        .catch(error => console.error("Fight error:", error));
}

