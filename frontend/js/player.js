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
    document.body.innerHTML = `
        <h1>Create Your Fighter</h1>
        <form id="createProfileForm">
            <label>Name: <input type="text" id="name" required></label><br>
            <button type="submit">Create Profile</button>
        </form>
    `;

    document.getElementById("createProfileForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("name").value.trim();
        if (name) createProfileWithAllocation(name);
    });
}

function createProfileWithAllocation(name) {
    let stats = { strength: 5, agility: 5, endurance: 5 };
    let remainingPoints = 5;

    function renderAllocationForm() {
        document.body.innerHTML = `
            <h1>Allocate Points</h1>
            <p>Remaining Points: ${remainingPoints}</p>
            <div>
                <p>Strength: ${stats.strength} <button onclick="changeStat('strength', 1)">+</button> <button onclick="changeStat('strength', -1)">-</button></p>
                <p>Agility: ${stats.agility} <button onclick="changeStat('agility', 1)">+</button> <button onclick="changeStat('agility', -1)">-</button></p>
                <p>Endurance: ${stats.endurance} <button onclick="changeStat('endurance', 1)">+</button> <button onclick="changeStat('endurance', -1)">-</button></p>
            </div>
            <button id="confirmAllocation" ${remainingPoints > 0 ? "disabled" : ""}>Confirm</button>
        `;

        document.getElementById("confirmAllocation").onclick = () => {
            createProfileAPI({
                telegram_id,
                name,
                strength: stats.strength,
                agility: stats.agility,
                endurance: stats.endurance
            })
                .then(data => checkProfile())
                .catch(error => console.error("Profile creation error:", error));
        };
    }

    window.changeStat = function (stat, delta) {
        if (delta > 0 && remainingPoints > 0) {
            stats[stat]++;
            remainingPoints--;
        } else if (delta < 0 && stats[stat] > 1) {
            stats[stat]--;
            remainingPoints++;
        }
        renderAllocationForm();
    };

    renderAllocationForm();
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
        <button id="fightButton">Fight</button>
        ${profile.level % 3 === 0 ? '<button id="allocatePointsButton">Allocate Points</button>' : ""}
    `;

    document.getElementById("fightButton").onclick = () => showFightScreen(profile);

    if (profile.level % 3 === 0) {
        document.getElementById("allocatePointsButton").onclick = () => showAllocatePoints(profile);
    }
}
