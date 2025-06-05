// Detect Telegram WebApp or fallback for testing in a browser
let telegram_id;

if (window.Telegram && window.Telegram.WebApp) {
    let tg = window.Telegram.WebApp;
    telegram_id = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : "test_user";
    console.log("Telegram WebApp detected. Telegram ID: ", telegram_id);
} else {
    telegram_id = "test_user";
    console.log("Running outside Telegram. Using test_user ID");
}

console.log("script.js loaded!");

window.onload = function () {
    checkProfile();
};

function renderHPBar(current, max = 20) {
    const percent = Math.max(0, Math.min(100, (current / max) * 100));
    return `
        <div style="background:#ccc; width:150px; height:15px; border-radius:4px; overflow:hidden; margin-bottom:5px;">
            <div style="background:#4caf50; width:${percent}%; height:100%;"></div>
        </div>
    `;
}

function checkProfile() {
    fetch(`/profile/${telegram_id}`)
        .then(response => response.json())
        .then(data => {
            console.log("Profile check result: ", data);
            if (data.exists) {
                showGame(data.profile);
            } else {
                showCreateProfile();
            }
        })
        .catch(error => {
            console.error("Error checking profile:", error);
        });
}

function showCreateProfile() {
    const basePoints = 5;
    let remainingPoints = basePoints;
    const allocation = {
        hp: 0,
        power: 0,
        agility: 0,
        protection: 0
    };

    document.body.innerHTML = `
        <h1>Create your profile</h1>
        <input type="text" id="nickname" placeholder="Enter nickname" />
        <br/><br/>

        <label for="race">Choose race:</label>
        <select id="race" onchange="updateRaceBonus()">
            <option value="human">Human (+2 HP)</option>
            <option value="elf">Elf (+2 Agility)</option>
            <option value="dwarf">Dwarf (+2 Protection)</option>
            <option value="orc">Orc (+2 Power)</option>
        </select>
        <br/><br/>

        <div>
          <p>Distribute your 5 extra points among these attributes:</p>
          <div>
            <label>HP: <span id="hpVal">0</span></label>
            <button onclick="changeAllocation('hp', 1)">+</button>
            <button onclick="changeAllocation('hp', -1)">-</button>
          </div>
          <div>
            <label>Power: <span id="powerVal">0</span></label>
            <button onclick="changeAllocation('power', 1)">+</button>
            <button onclick="changeAllocation('power', -1)">-</button>
          </div>
          <div>
            <label>Agility: <span id="agilityVal">0</span></label>
            <button onclick="changeAllocation('agility', 1)">+</button>
            <button onclick="changeAllocation('agility', -1)">-</button>
          </div>
          <div>
            <label>Protection: <span id="protectionVal">0</span></label>
            <button onclick="changeAllocation('protection', 1)">+</button>
            <button onclick="changeAllocation('protection', -1)">-</button>
          </div>
          <p>Points remaining: <span id="pointsRemaining">${remainingPoints}</span></p>
        </div>

        <button id="createProfileBtn" onclick="createProfileWithAllocation()" disabled>Create Profile</button>
    `;

    // Expose to global so buttons can call these functions
    window.remainingPoints = remainingPoints;
    window.allocation = allocation;

    window.changeAllocation = function(attr, delta) {
        if (delta > 0 && window.remainingPoints <= 0) return;
        if (delta < 0 && window.allocation[attr] <= 0) return;

        window.allocation[attr] += delta;
        window.remainingPoints -= delta;

        if (window.remainingPoints < 0) {
            window.remainingPoints = 0; // safety
        }

        // Update UI
        document.getElementById(`${attr}Val`).textContent = window.allocation[attr];
        document.getElementById("pointsRemaining").textContent = window.remainingPoints;

        // Enable button only if all points allocated
        document.getElementById("createProfileBtn").disabled = (window.remainingPoints !== 0);
    };

    window.updateRaceBonus = function() {
        // No immediate action needed, race bonus applied on backend / profile creation
    };
}

function createProfileWithAllocation() {
    const nickname = document.getElementById("nickname").value.trim();
    if (!nickname) {
        alert("Please enter a nickname.");
        return;
    }

    if (window.remainingPoints !== 0) {
        alert("Please allocate all extra points.");
        return;
    }

    const race = document.getElementById("race").value;

    // Base stats (without race bonuses)
    const baseStats = {
        hp: 20,
        power: 2,
        agility: 2,
        protection: 2
    };

    // Add allocations
    baseStats.hp += window.allocation.hp;
    baseStats.power += window.allocation.power;
    baseStats.agility += window.allocation.agility;
    baseStats.protection += window.allocation.protection;

    // Send only nickname and race to backend; allocations handled backend 
    // (alternatively, you can send the extra points and let backend calculate final stats)
    // For now, let's send race and allocation so backend can apply race bonuses correctly

    fetch("/create-profile", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            telegram_id: telegram_id,
            nickname: nickname,
            race: race,
            extra_points: window.allocation
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.profile) {
            showGame(data.profile);
        }
    })
    .catch(err => {
        console.error("Error creating profile:", err);
        alert("Error creating profile.");
    });
}

function showGame(profile) {
    if (profile.extra_points && profile.extra_points > 0) {
        showAllocatePoints(profile);
        return;
    }

    document.body.innerHTML = `
        <h1>Welcome, ${profile.nickname}!</h1>
        <p>HP: ${profile.hp}</p>
        ${renderHPBar(profile.hp, 20)}
        <p>Power: ${profile.power}</p>
        <p>Agility: ${profile.agility}</p>
        <p>Protection: ${profile.protection}</p>

        <h2>Start a Fight</h2>
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

            <button type="submit">Fight!</button>
        </form>

        <div id="fightLog" style="margin-top:20px; border:1px solid #ccc; padding:10px; display:none;">
            <h3>Fight Log:</h3>
            <div id="logContent"></div>
            <button id="fightAgainBtn" style="margin-top:10px; display:none;">Fight Again</button>
            <button id="backToLobbyBtn" style="margin-top:10px; display:none;">Back to Lobby</button>
        </div>
    `;

    document.getElementById("fightForm").addEventListener("submit", (e) => {
        e.preventDefault();
        fight();
    });
}

function showAllocatePoints(profile) {
    document.body.innerHTML = `
        <h1>Level Up! Allocate your ${profile.extra_points} extra points</h1>
        <form id="allocateForm">
            <label>HP: <input type="number" id="hp" name="hp" value="0" min="0" max="${profile.extra_points}"></label><br>
            <label>Power: <input type="number" id="power" name="power" value="0" min="0" max="${profile.extra_points}"></label><br>
            <label>Agility: <input type="number" id="agility" name="agility" value="0" min="0" max="${profile.extra_points}"></label><br>
            <label>Protection: <input type="number" id="protection" name="protection" value="0" min="0" max="${profile.extra_points}"></label><br>
            <p id="pointsLeft">${profile.extra_points} points left</p>
            <button type="submit">Allocate Points</button>
        </form>
    `;

    const form = document.getElementById("allocateForm");
    const inputs = form.querySelectorAll('input[type="number"]');
    const pointsLeftElem = document.getElementById("pointsLeft");

    function updatePointsLeft() {
        let sum = 0;
        inputs.forEach(input => {
            sum += Number(input.value);
        });
        const pointsLeft = profile.extra_points - sum;
        pointsLeftElem.textContent = `${pointsLeft} points left`;
        // Prevent negative allocation
        inputs.forEach(input => {
            input.max = Number(input.value) + pointsLeft;
        });
    }

    inputs.forEach(input => {
        input.addEventListener("input", updatePointsLeft);
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        let allocation = {};
        let totalAllocated = 0;
        inputs.forEach(input => {
            const val = Number(input.value);
            allocation[input.name] = val;
            totalAllocated += val;
        });
        if (totalAllocated !== profile.extra_points) {
            alert(`Please allocate exactly ${profile.extra_points} points.`);
            return;
        }

        // Send allocation to backend
        fetch("/allocate-points", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                telegram_id: telegram_id,
                allocation: allocation
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) alert(data.message);
            showGame(data.profile);
        })
        .catch(err => {
            console.error("Error allocating points:", err);
        });
    });

    updatePointsLeft();
}

function createProfile() {
    console.log("Create Profile button clicked!");
    const nickname = document.getElementById("nickname").value;
    console.log("Nickname entered: ", nickname);

    fetch("/create-profile", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            telegram_id: telegram_id,
            nickname: nickname
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Data received: ", data);
        alert(data.message);
        showGame(data.profile);
    })
    .catch(error => {
        console.error("Error occurred: ", error);
    });
}

function fight() {
    console.log("Fight button clicked!");

    const hit = document.getElementById("hit").value;
    const defend = document.getElementById("defend").value;

    fetch("/fight", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            telegram_id: telegram_id,
            hit: hit,
            defend: defend
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Fight result received: ", data);
    
        const fightLog = document.getElementById("fightLog");
        const logContent = document.getElementById("logContent");
        logContent.innerHTML = "";

        // Bot HP bar
        const botHPLabel = document.createElement("p");
        botHPLabel.textContent = `Bot HP: ${data.bot.hp}`;
        logContent.appendChild(botHPLabel);

        const botHPBar = document.createElement("div");
        botHPBar.innerHTML = renderHPBar(data.bot.hp, 20);
        logContent.appendChild(botHPBar);
    
        data.log.forEach(line => {
            const p = document.createElement("p");
            p.textContent = line;
            logContent.appendChild(p);
        });
    
        fightLog.style.display = "block";
    
        // Update stats
        document.body.querySelector("p:nth-of-type(1)").innerText = `HP: ${data.player.hp}`;
        document.body.querySelector("p:nth-of-type(2)").innerText = `Power: ${data.player.power}`;
        document.body.querySelector("p:nth-of-type(3)").innerText = `Agility: ${data.player.agility}`;
        document.body.querySelector("p:nth-of-type(4)").innerText = `Protection: ${data.player.protection}`;
    
        // Show Fight Again and Back to Lobby buttons
        document.getElementById("fightAgainBtn").style.display = "inline-block";
        document.getElementById("backToLobbyBtn").style.display = "inline-block";
    
        // Attach event handlers
        document.getElementById("fightAgainBtn").onclick = () => {
            showGame(data.player);
        };
    
        document.getElementById("backToLobbyBtn").onclick = () => {
            checkProfile();
        };
    })
    .catch(error => {
        console.error("Error occurred: ", error);
    });
}