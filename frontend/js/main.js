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
                if (data.challenge.is_challenger) {
                    if (data.challenge.status === 'accepted') {
                        // Challenge was accepted, start the fight
                        startPvPFight(data.challenge.fight_id, data.challenge.target_nickname);
                    } else {
                        // This is the challenger waiting for acceptance
                        showChallengerWaiting(data.challenge.target_nickname);
                    }
                } else if (data.challenge.status === 'cancelled') {
                    // Challenge was cancelled by the other player
                    showChallengeCancelled(data.challenge);
                } else {
                    // This is the target receiving a challenge
                    showChallengePopup(data.challenge.challenger_nickname, data.challenge.challenger_id);
                }
            }
        } catch (error) {
            console.error('Error checking challenges:', error);
        }
    }, 3000);
}

function showChallengePopup(challengerNickname, challengerId) {
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
        <div style="margin-top: 16px;">
            <button id="acceptBtn" style="
                background-color: #4caf50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 16px;
                cursor: pointer;
                margin-right: 8px;
            ">Accept</button>
            <button id="cancelBtn" style="
                background-color: #f44336;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 16px;
                cursor: pointer;
            ">Cancel</button>
        </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Handle Accept button click
    document.getElementById('acceptBtn').onclick = async () => {
        document.body.removeChild(overlay);
        await acceptChallenge(challengerNickname, challengerId);
    };

    // Handle Cancel button click
    document.getElementById('cancelBtn').onclick = async () => {
        document.body.removeChild(overlay);
        await cancelChallengeByTarget(challengerId, challengerNickname);
    };
}

async function acceptChallenge(challengerNickname, challengerId) {
    // For now, just show that the challenge was accepted
    alert(`You accepted the fight challenge from ${challengerNickname}!`);
    // TODO: Implement actual fight logic
}

async function cancelChallengeByTarget(challengerId, challengerNickname) {
    try {
        // Cancel the challenge
        const response = await fetch('/cancel-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                challenger_id: challengerId,
                target_id: telegram_id,
                cancelled_by: telegram_id
            })
        });

        if (!response.ok) {
            console.error('Failed to cancel challenge');
        }
    } catch (error) {
        console.error('Error cancelling challenge:', error);
    }
}

function showChallengerWaiting(targetNickname) {
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
        <h3>Challenge Sent!</h3>
        <p>Waiting for ${targetNickname} to accept your challenge...</p>
        <div style="margin-top: 16px;">
            <button id="okBtn" style="
                background-color: #2196f3;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 16px;
                cursor: pointer;
            ">OK</button>
        </div>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Handle OK button click
    document.getElementById('okBtn').onclick = () => {
        document.body.removeChild(overlay);
    };
}

function showChallengeCancelled(challengeData) {
    // Check if we're on the players page and need to hide challenge status
    if (window.location.pathname.includes('players.html') && window.hideChallengeStatus) {
        window.hideChallengeStatus();
    }
    
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
        <h3>Challenge Cancelled</h3>
        <p>The fight challenge has been cancelled.</p>
        <div style="margin-top: 16px;">
            <button id="okBtn" style="
                background-color: #2196f3;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 16px;
                cursor: pointer;
            ">OK</button>
        </div>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Handle OK button click
    document.getElementById('okBtn').onclick = () => {
        document.body.removeChild(overlay);
    };
}

function startPvPFight(fight_id, opponentNickname) {
    let timeLeft = 30;
    let fightPollingInterval = null;
    
    // Create fight interface
    document.body.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h1>PvP Fight vs ${opponentNickname}</h1>
            <div id="timer" style="font-size: 24px; color: #f44336; margin: 20px 0;">
                Time left: ${timeLeft}s
            </div>
            
            <div style="margin: 20px 0;">
                <label>Hit Part:
                    <select id="hit">
                        <option value="head">Head</option>
                        <option value="chest">Chest</option>
                        <option value="stomach">Stomach</option>
                        <option value="legs">Legs</option>
                    </select>
                </label><br><br>
                
                <label>Defend Part:
                    <select id="defend">
                        <option value="head">Head</option>
                        <option value="chest">Chest</option>
                        <option value="stomach">Stomach</option>
                        <option value="legs">Legs</option>
                    </select>
                </label><br><br>
                
                <button id="submitBtn" style="
                    background-color: #2196f3;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 4px;
                    font-size: 18px;
                    cursor: pointer;
                ">Hit!</button>
            </div>
            
            <div id="status" style="margin: 20px 0; font-size: 16px;">
                Waiting for both players to submit actions...
            </div>
            
            <div id="results" style="display: none; margin: 20px 0;">
                <h3>Fight Results</h3>
                <div id="resultsContent"></div>
                <button id="backToLobbyBtn" style="
                    background-color: #4caf50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 16px;
                ">Back to Lobby</button>
            </div>
        </div>
    `;
    
    // Start countdown timer
    const timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = `Time left: ${timeLeft}s`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            clearInterval(fightPollingInterval);
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('status').textContent = 'Time\'s up!';
        }
    }, 1000);
    
    // Start polling for fight status
    fightPollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/fight-status/${fight_id}/${telegram_id}`);
            const data = await response.json();
            
            if (data.status === 'completed' || data.status === 'timeout') {
                clearInterval(timerInterval);
                clearInterval(fightPollingInterval);
                showFightResults(data.results);
            } else {
                updateFightStatus(data);
            }
        } catch (error) {
            console.error('Error checking fight status:', error);
        }
    }, 1000);
    
    // Handle submit button
    document.getElementById('submitBtn').onclick = async () => {
        const hit = document.getElementById('hit').value;
        const defend = document.getElementById('defend').value;
        
        try {
            const response = await fetch('/submit-fight-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fight_id,
                    player_id: telegram_id,
                    hit,
                    defend
                })
            });
            
            if (response.ok) {
                document.getElementById('submitBtn').disabled = true;
                document.getElementById('submitBtn').textContent = 'Submitted!';
                document.getElementById('status').textContent = 'Action submitted! Waiting for opponent...';
            } else {
                alert('Failed to submit action. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting action:', error);
            alert('Failed to submit action. Please try again.');
        }
    };
    
    // Handle back to lobby button
    document.getElementById('backToLobbyBtn').onclick = () => {
        clearInterval(timerInterval);
        clearInterval(fightPollingInterval);
        checkProfile();
    };
}

function updateFightStatus(data) {
    const statusDiv = document.getElementById('status');
    
    if (data.my_action_submitted && data.opponent_action_submitted) {
        statusDiv.textContent = 'Both players submitted! Processing fight...';
    } else if (data.my_action_submitted) {
        statusDiv.textContent = 'You submitted! Waiting for opponent...';
    } else if (data.opponent_action_submitted) {
        statusDiv.textContent = 'Opponent submitted! Make your move!';
    } else {
        statusDiv.textContent = 'Waiting for both players to submit actions...';
    }
}

function showFightResults(results) {
    document.getElementById('results').style.display = 'block';
    
    const resultsContent = document.getElementById('resultsContent');
    resultsContent.innerHTML = `
        <p><strong>${results.player1.nickname}:</strong> HP ${results.player1.hp}, Damage dealt: ${results.player1.damage_dealt}</p>
        <p><strong>${results.player2.nickname}:</strong> HP ${results.player2.hp}, Damage dealt: ${results.player2.damage_dealt}</p>
        <p><strong>Winner:</strong> ${results.winner || 'No winner (both lose)'}</p>
        <div style="margin-top: 16px;">
            <h4>Fight Log:</h4>
            ${results.log.map(log => `<p>${log}</p>`).join('')}
        </div>
    `;
}
