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
    document.body.innerHTML = `
        <h1>Create your profile</h1>
        <input type="text" id="nickname" placeholder="Enter nickname">
        <button onclick="createProfile()">Create Profile</button>
    `;
}

function showGame(profile) {
    document.body.innerHTML = `
        <h1>Welcome, ${profile.nickname}!</h1>
        <p>HP: ${profile.hp}</p>
        <p>Power: ${profile.power}</p>
        <button onclick="fight()">Fight</button>
    `;
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

    fetch("/fight", {
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
        console.log("Fight result received: ", data);
        alert(data.message);
        showGame(data.profile); // Refresh stats after fight
    })
    .catch(error => {
        console.error("Error occurred: ", error);
    });
}
