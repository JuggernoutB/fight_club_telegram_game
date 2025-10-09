let telegram_id;
let challengePollingInterval = null;

window.onload = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const isDevMode = urlParams.get("dev") === "1";

    if (window.Telegram && window.Telegram.WebApp?.initDataUnsafe?.user) {
        telegram_id = window.Telegram.WebApp.initDataUnsafe.user.id;
        console.log("Telegram ID:", telegram_id);
    } else if (isDevMode) {
        telegram_id = "test_user";
        console.warn("Dev mode active — using test_user");
    } else {
        console.error("Telegram user data not found.");
        alert("Please open this via your Telegram bot button.");
    }

    if (telegram_id) {
        checkProfile();
        startChallengePolling();
    }
};

function startChallengePolling() {
    // Poll for challenges every 3 seconds
    challengePollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/check-challenges/${telegram_id}`);
            const data = await response.json();
            
            if (data.hasChallenge) {
                showChallengePopup(data.challenge.challenger_nickname);
            }
        } catch (error) {
            console.error('Error checking challenges:', error);
        }
    }, 3000);
}

function showChallengePopup(challengerNickname) {
    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create popup content
    const popup = document.createElement('div');
    popup.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    popup.innerHTML = `
        <h3>Fight Challenge!</h3>
        <p>${challengerNickname} challenges you to a fight!</p>
        <button id="okBtn" style="
            background-color: #2196f3;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
        ">OK</button>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Handle OK button click
    document.getElementById('okBtn').onclick = () => {
        document.body.removeChild(overlay);
    };
}
