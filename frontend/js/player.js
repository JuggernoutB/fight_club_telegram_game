function checkProfile() {
    fetchProfile(telegram_id)
        .then(data => {
            if (data.exists) {
                showGame(data.profile);
            } else {
                showCreateProfile();
            }
        })
        .catch(error => console.error("Profile check error:", error));
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
        <div class="game-container">
            <div class="game-header">
                <h1>⚔️ CREATE YOUR FIGHTER</h1>
                <div class="subtitle">Build your ultimate warrior</div>
            </div>

            <div class="avatar-preview">
                <div class="avatar-placeholder" id="avatarPreview">
                    👤
                </div>
            </div>

            <div class="game-form">
                <div class="form-group">
                    <label for="nickname">Fighter Name</label>
                    <input type="text" id="nickname" class="form-input" placeholder="Enter your fighter's name" maxlength="20" />
                </div>

                <div class="form-group">
                    <label for="race">Choose Your Race</label>
                    <select id="race" class="form-select" onchange="updateRaceBonus()">
                        <option value="human">🧑 Human (+2 HP)</option>
                        <option value="elf" selected>🧝 Elf (+2 Agility)</option>
                        <option value="dwarf">🧔 Dwarf (+2 Protection)</option>
                        <option value="orc">👹 Orc (+2 Power)</option>
                    </select>
                </div>

                <div class="stats-container">
                    <div class="stats-header">
                        <div class="points-remaining">
                            <span id="pointsRemaining">${remainingPoints}</span> Points Remaining
                        </div>
                    </div>

                    <div class="stat-row">
                        <div class="stat-name">❤️ HP</div>
                        <div class="stat-value" id="hpVal">0</div>
                        <div class="stat-controls">
                            <button class="stat-button" onclick="changeAllocation('hp', -1)">−</button>
                            <button class="stat-button" onclick="changeAllocation('hp', 1)">+</button>
                        </div>
                    </div>

                    <div class="stat-row">
                        <div class="stat-name">⚔️ Power</div>
                        <div class="stat-value" id="powerVal">0</div>
                        <div class="stat-controls">
                            <button class="stat-button" onclick="changeAllocation('power', -1)">−</button>
                            <button class="stat-button" onclick="changeAllocation('power', 1)">+</button>
                        </div>
                    </div>

                    <div class="stat-row">
                        <div class="stat-name">💨 Agility</div>
                        <div class="stat-value" id="agilityVal">0</div>
                        <div class="stat-controls">
                            <button class="stat-button" onclick="changeAllocation('agility', -1)">−</button>
                            <button class="stat-button" onclick="changeAllocation('agility', 1)">+</button>
                        </div>
                    </div>

                    <div class="stat-row">
                        <div class="stat-name">🛡️ Protection</div>
                        <div class="stat-value" id="protectionVal">0</div>
                        <div class="stat-controls">
                            <button class="stat-button" onclick="changeAllocation('protection', -1)">−</button>
                            <button class="stat-button" onclick="changeAllocation('protection', 1)">+</button>
                        </div>
                    </div>
                </div>

                <button id="createProfileBtn" class="btn-primary" onclick="createProfileWithAllocation()" disabled>
                    ⚔️ Create Fighter
                </button>
            </div>
        </div>
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

        // Update button states
        updateButtonStates();

        // Enable create button only if all points allocated
        document.getElementById("createProfileBtn").disabled = (window.remainingPoints !== 0);
    };

    function updateButtonStates() {
        const stats = ['hp', 'power', 'agility', 'protection'];

        stats.forEach(stat => {
            const statRow = document.querySelector(`#${stat}Val`).closest('.stat-row');
            const minusBtn = statRow.querySelector('.stat-button:first-child');
            const plusBtn = statRow.querySelector('.stat-button:last-child');

            // Disable minus button if stat is 0
            minusBtn.disabled = window.allocation[stat] <= 0;

            // Disable plus button if no points remaining
            plusBtn.disabled = window.remainingPoints <= 0;
        });
    }

    window.updateRaceBonus = function() {
        const race = document.getElementById("race").value;
        const avatarPreview = document.getElementById("avatarPreview");

        console.log('Updating race avatar for:', race); // Debug log

        // Update avatar with image or fallback to emoji
        if (race) {
            const imgPath = `./images/avatars/${race}.png`;
            console.log('Trying to load image:', imgPath); // Debug log
            console.log('Current URL:', window.location.href); // Debug log

            const img = document.createElement('img');
            img.src = imgPath;
            img.alt = `${race} avatar`;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';

            img.onload = function() {
                console.log('Image loaded successfully:', imgPath);
                avatarPreview.innerHTML = '';
                avatarPreview.appendChild(img);
            };

            img.onerror = function() {
                console.log('Image failed to load:', imgPath);
                console.log('Falling back to emoji for:', race);
                avatarPreview.innerHTML = getRaceEmoji(race);
            };

            // Set a temporary loading state
            avatarPreview.innerHTML = '⏳';
        } else {
            avatarPreview.innerHTML = "👤";
        }
    };

    function getRaceEmoji(race) {
        const raceAvatars = {
            "human": "🧑",
            "elf": "🧝",
            "dwarf": "🧔",
            "orc": "👹"
        };
        return raceAvatars[race] || "👤";
    }

    window.createProfileWithAllocation = function() {
        console.log("Create Fighter button clicked!"); // Debug log

        const nickname = document.getElementById("nickname").value.trim();
        console.log("Nickname:", nickname); // Debug log

        if (!nickname) {
            alert("Please enter a nickname.");
            return;
        }

        console.log("Remaining points:", window.remainingPoints); // Debug log
        if (window.remainingPoints !== 0) {
            alert("Please allocate all extra points.");
            return;
        }

        const race = document.getElementById("race").value;
        console.log("Race:", race); // Debug log
        console.log("Allocation:", window.allocation); // Debug log

        createProfileAPI({
            telegram_id: telegram_id,
            nickname: nickname,
            race: race,
            extra_points: window.allocation
        })
        .then(data => {
            console.log("Profile creation response:", data); // Debug log
            alert(data.message);
            if (data.profile) {
                checkProfile();
            }
        })
        .catch(err => {
            console.error("Error creating profile:", err);
            alert("Error creating profile.");
        });
    };

    // Initialize button states and race avatar
    updateButtonStates();
    window.updateRaceBonus();
}


function showAllocatePoints(profile) {
    let remainingPoints = 5;
    let stats = { strength: profile.strength, agility: profile.agility, endurance: profile.endurance };

    function renderForm() {
        document.body.innerHTML = `
            <h1>Allocate Extra Points</h1>
            <p>Remaining Points: ${remainingPoints}</p>
            <div>
                <p>Strength: ${stats.strength} <button onclick="adjustStat('strength', 1)">+</button> <button onclick="adjustStat('strength', -1)">-</button></p>
                <p>Agility: ${stats.agility} <button onclick="adjustStat('agility', 1)">+</button> <button onclick="adjustStat('agility', -1)">-</button></p>
                <p>Endurance: ${stats.endurance} <button onclick="adjustStat('endurance', 1)">+</button> <button onclick="adjustStat('endurance', -1)">-</button></p>
            </div>
            <button id="confirmAllocation" ${remainingPoints > 0 ? "disabled" : ""}>Confirm</button>
        `;

        document.getElementById("confirmAllocation").onclick = () => {
            allocatePointsAPI({
                telegram_id,
                strength: stats.strength,
                agility: stats.agility,
                endurance: stats.endurance
            })
                .then(data => checkProfile())
                .catch(error => console.error("Point allocation error:", error));
        };
    }

    window.adjustStat = function (stat, delta) {
        if (delta > 0 && remainingPoints > 0) {
            stats[stat]++;
            remainingPoints--;
        } else if (delta < 0 && stats[stat] > profile[stat]) {
            stats[stat]--;
            remainingPoints++;
        }
        renderForm();
    };

    renderForm();
}

function showGame(profile) {
    console.log("Profile data:", profile);
    // Restore HP to full if not fighting
    if (profile.hp < 20) {
        profile.hp = 20;
    }
    
    document.body.innerHTML = `
        <h1>Welcome, ${profile.nickname}</h1>
        <p>Level: ${profile.level}</p>
        <p>Power: ${profile.power}</p>
        <p>Agility: ${profile.agility}</p>
        <p>Protection: ${profile.protection}</p>
        <p>HP: ${profile.hp}</p>
        ${renderHPBar(profile.hp, 20)}
        <p>Experience:</p>
        ${renderXPBar(profile.experience, xpToNextLevel(profile.level))}
        <button id="fightButton">Fight vs bot</button>
        <button id="playersListButton">Fight vs player</button>
        ${profile.level % 3 === 0 ? '<button id="allocatePointsButton">Allocate Points</button>' : ""}
    `;

    document.getElementById("fightButton").onclick = () => showFightScreen(profile);

    if (profile.level % 3 === 0) {
        document.getElementById("allocatePointsButton").onclick = () => showAllocatePoints(profile);
    }

    document.getElementById("playersListButton").onclick = () => {
        window.location.href = `/players.html?telegram_id=${telegram_id}`;
    };
}
