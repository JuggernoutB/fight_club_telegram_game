let telegram_id;
let challengePollingInterval = null;

// Only run main game initialization if we're on the main page (not players.html)
if (!window.location.pathname.includes('players.html')) {
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
}

function startChallengePolling() {
    // Poll for challenges every 3 seconds
    challengePollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`/check-challenges/${telegram_id}`);
            const data = await response.json();
            
            if (data.hasChallenge) {
                console.log('Challenge polling detected:', data.challenge);
                if (data.challenge.is_challenger) {
                    if (data.challenge.status === 'accepted') {
                        // Challenge was accepted, stop polling and show simple fight window for Player #1 (challenger)
                        console.log('Challenge accepted! Redirecting Player #1 to fight screen...');
                        clearInterval(challengePollingInterval);
                        challengePollingInterval = null;
                        // Use the fight_id from the challenge response
                        startPvPFight(data.challenge.fight_id, data.challenge.target_nickname);
                    } else {
                        // This is the challenger waiting for acceptance
                        showChallengerWaiting(data.challenge.target_nickname);
                    }
                } else if (data.challenge.status === 'cancelled') {
                    // Challenge was cancelled by the other player
                    showChallengeCancelled(data.challenge);
                } else {
                    // This is the target receiving a challenge - only handled in requests tab now
                    // No popup, requests are shown in the Fight Requests tab only
                }
            }
        } catch (error) {
            console.error('Error checking challenges:', error);
        }
    }, 1000); // Poll every 1 second for more responsive detection
}

async function acceptChallenge(challengerNickname, challengerId) {
    try {
        // Call the join-fight endpoint
        const response = await fetch('/join-fight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                challenger_id: challengerId,
                target_id: telegram_id
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Show simple fight window for Player #2 (target)
            showSimpleFightWindow(challengerNickname);
        } else {
            alert(`Failed to accept fight: ${result.message}`);
        }
    } catch (error) {
        console.error('Error accepting challenge:', error);
        alert('Failed to accept fight request');
    }
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
    let timeLeft = 120;
    let fightPollingInterval = null;
    let actualFightId = fight_id;

    // Only create a new fight if we don't have a fight_id (shouldn't happen in challenge flow)
    if (!actualFightId) {
        console.log('No fight_id provided - this should not happen in challenge acceptance flow');
        fetch('/create-pvp-fight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: telegram_id,
                opponent_nickname: opponentNickname
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.fight_id) {
                actualFightId = data.fight_id;
                console.log('PvP fight created:', actualFightId);
            }
        })
        .catch(error => {
            console.error('Error creating PvP fight:', error);
        });
    } else {
        console.log('Using existing fight_id:', actualFightId);
    }

    // Create styled fight interface similar to bot fight
    document.body.innerHTML = `
        <div class="game-container fight-container">
            <div class="game-header">
                <h1>⚔️ PVP ARENA</h1>
                <div class="subtitle">Battle against ${opponentNickname}</div>
                <div id="timer" class="fight-timer">
                    ⏰ Time left: ${timeLeft}s
                </div>
            </div>

            <div class="fight-vs-section">
                <div class="fighter-card" id="playerCard">
                    <div class="fighter-image-container" id="playerImageContainer">
                        <div class="fighter-fallback" id="playerFallback">🧑</div>
                    </div>
                    <div class="fighter-name" id="playerName">You</div>
                    <div class="fighter-hp">
                        <div class="hp-label">❤️ Health Points</div>
                        <div id="playerHPText">Loading...</div>
                        <div id="playerHPBar"></div>
                    </div>
                    <div class="fighter-stats" id="playerStats">
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

                <div class="vs-divider">⚔️<br>VS</div>

                <div class="fighter-card" id="opponentCard">
                    <div class="fighter-image-container" id="opponentImageContainer">
                        <div class="fighter-fallback">👤</div>
                    </div>
                    <div class="fighter-name">${opponentNickname}</div>
                    <div class="fighter-hp">
                        <div class="hp-label">❤️ Health Points</div>
                        <div id="opponentHPText">Loading...</div>
                        <div id="opponentHPBar"></div>
                    </div>
                    <div class="fighter-stats" id="opponentStats">
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

                <button class="attack-button" id="submitBtn" disabled>
                    ⚔️ ATTACK!
                </button>
            </div>

            <div id="status" class="fight-status">
                Waiting for both players to submit actions...
            </div>

            <div id="roundResults" class="fight-log" style="display:none;">
                <div class="fight-log-header">📜 Round Results</div>
                <div class="fight-log-content" id="roundContent"></div>
                <div class="fight-result-actions">
                    <button id="nextRoundBtn" class="btn-secondary">
                        ⏭️ Next Round
                    </button>
                </div>
            </div>

            <div id="finalResults" class="fight-log" style="display: none;">
                <div class="fight-log-header">🏆 Fight Finished!</div>
                <div class="fight-log-content" id="finalContent"></div>
                <div class="fight-result-actions">
                    <button id="backToLobbyBtn" class="btn-secondary">
                        🏠 Back to Lobby
                    </button>
                </div>
            </div>
        </div>
    `;

    // Initialize body part selection and fighter images
    setupPvPBodyPartSelection();
    loadPvPFighterImages();

    // Start countdown timer
    const timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = `Time left: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('status').textContent = 'Time\'s up!';
        }
    }, 1000);

    // Start polling for fight status
    fightPollingInterval = setInterval(async () => {
        if (!actualFightId) return;

        try {
            const response = await fetch(`/pvp-fight-status/${actualFightId}/${telegram_id}`);
            const data = await response.json();

            // Update player stats
            if (data.playerStats) {
                document.getElementById('playerHPText').textContent = `${data.playerStats.hp}/${data.playerStats.maxHP} HP`;
                document.getElementById('playerHPBar').innerHTML = renderHPBar(data.playerStats.hp, data.playerStats.maxHP);

                // Update player stats display
                const playerStats = document.getElementById('playerStats');
                if (playerStats) {
                    playerStats.innerHTML = `
                        <div class="mini-stat">
                            <div class="mini-stat-label">⚔️ PWR</div>
                            <div class="mini-stat-value">${data.playerStats.power || '-'}</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">💨 AGL</div>
                            <div class="mini-stat-value">${data.playerStats.agility || '-'}</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">🛡️ DEF</div>
                            <div class="mini-stat-value">${data.playerStats.defense || '-'}</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">🧠 KNW</div>
                            <div class="mini-stat-value">${data.playerStats.knowledge || '-'}</div>
                        </div>
                    `;
                }
            }
            if (data.opponentStats) {
                document.getElementById('opponentHPText').textContent = `${data.opponentStats.hp}/${data.opponentStats.maxHP} HP`;
                document.getElementById('opponentHPBar').innerHTML = renderHPBar(data.opponentStats.hp, data.opponentStats.maxHP);

                // Update opponent stats display
                const opponentStats = document.getElementById('opponentStats');
                if (opponentStats) {
                    opponentStats.innerHTML = `
                        <div class="mini-stat">
                            <div class="mini-stat-label">⚔️ PWR</div>
                            <div class="mini-stat-value">${data.opponentStats.power || '-'}</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">💨 AGL</div>
                            <div class="mini-stat-value">${data.opponentStats.agility || '-'}</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">🛡️ DEF</div>
                            <div class="mini-stat-value">${data.opponentStats.defense || '-'}</div>
                        </div>
                        <div class="mini-stat">
                            <div class="mini-stat-label">🧠 KNW</div>
                            <div class="mini-stat-value">${data.opponentStats.knowledge || '-'}</div>
                        </div>
                    `;
                }
            }

            if (data.status === 'round_complete') {
                clearInterval(timerInterval);
                showRoundResults(data.roundResults);
            } else if (data.status === 'fight_complete') {
                clearInterval(timerInterval);
                clearInterval(fightPollingInterval);
                showFinalResults(data.finalResults);
            } else if (data.status === 'waiting') {
                updateFightStatus(data);
            }
        } catch (error) {
            console.error('Error checking PvP fight status:', error);
        }
    }, 1000);

    // Handle submit button
    document.getElementById('submitBtn').onclick = async () => {
        if (!actualFightId) {
            alert('Fight not ready yet, please wait...');
            return;
        }

        const hit = window.getSelectedHit ? window.getSelectedHit() : null;
        const defend = window.getSelectedDefend ? window.getSelectedDefend() : null;

        if (!hit || !defend) {
            alert('Please select both hit and defend body parts');
            return;
        }

        try {
            const response = await fetch('/submit-pvp-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fight_id: actualFightId,
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
    const setupBackButton = () => {
        const backBtn = document.getElementById('backToLobbyBtn');
        if (backBtn) {
            backBtn.onclick = () => {
                clearInterval(timerInterval);
                clearInterval(fightPollingInterval);
                window.location.href = '/';
            };
        }
    };

    // Set up back button initially
    setTimeout(setupBackButton, 100);
}

// Helper functions for PvP fight screen
function setupPvPBodyPartSelection() {
    let selectedHit = null;
    let selectedDefend = null;

    // Hit parts selection
    document.querySelectorAll('#hitParts .body-part').forEach(part => {
        part.addEventListener('click', () => {
            document.querySelectorAll('#hitParts .body-part').forEach(p => p.classList.remove('selected'));
            part.classList.add('selected');
            selectedHit = part.dataset.part;
            updatePvPAttackButton();
        });
    });

    // Defend parts selection
    document.querySelectorAll('#defendParts .body-part').forEach(part => {
        part.addEventListener('click', () => {
            document.querySelectorAll('#defendParts .body-part').forEach(p => p.classList.remove('selected'));
            part.classList.add('selected');
            selectedDefend = part.dataset.part;
            updatePvPAttackButton();
        });
    });

    // Expose selection getters
    window.getSelectedHit = () => selectedHit;
    window.getSelectedDefend = () => selectedDefend;
}

function updatePvPAttackButton() {
    const attackBtn = document.getElementById("submitBtn");
    const hit = window.getSelectedHit ? window.getSelectedHit() : null;
    const defend = window.getSelectedDefend ? window.getSelectedDefend() : null;
    attackBtn.disabled = !(hit && defend);
}

function loadPvPFighterImages() {
    // Load player's fighter image
    fetchProfile(telegram_id)
        .then(data => {
            if (data.exists && data.profile && data.profile.race) {
                loadPvPPlayerImage(data.profile.race, data.profile.nickname);
            }
        })
        .catch(error => {
            console.error('Error fetching player profile for PvP:', error);
        });

    // Load opponent fighter image (random for now)
    loadPvPOpponentImage();
}

function loadPvPPlayerImage(race, nickname) {
    const container = document.getElementById("playerImageContainer");
    const fallback = document.getElementById("playerFallback");
    const nameElement = document.getElementById("playerName");

    if (!container || !race) return;

    if (nameElement) {
        nameElement.textContent = nickname || 'You';
    }

    console.log('Loading PvP player fighter image for race:', race);

    const imgPath = `./images/fighters/${race}.png`;
    const img = document.createElement('img');
    img.src = imgPath;
    img.alt = `${race} fighter`;
    img.className = 'fighter-image';

    img.onload = function() {
        console.log('PvP player fighter image loaded successfully:', imgPath);
        fallback.style.display = 'none';
        container.appendChild(img);
    };

    img.onerror = function() {
        console.log('PvP player fighter image failed to load:', imgPath, 'Using fallback');
        const raceAvatars = {
            "human": "🧑",
            "elf": "🧝",
            "dwarf": "🧔",
            "orc": "👹"
        };
        fallback.innerHTML = raceAvatars[race] || "👤";
        fallback.style.display = 'flex';
    };
}

function loadPvPOpponentImage() {
    const container = document.getElementById("opponentImageContainer");
    if (!container) return;

    // Pick a random race for the opponent
    const races = ['human', 'elf', 'dwarf', 'orc'];
    const randomRace = races[Math.floor(Math.random() * races.length)];

    console.log('Loading PvP opponent image, chosen race:', randomRace);

    const imgPath = `./images/fighters/${randomRace}.png`;
    const img = document.createElement('img');
    img.src = imgPath;
    img.alt = `${randomRace} opponent`;
    img.className = 'fighter-image';
    img.style.filter = 'sepia(50%) hue-rotate(10deg) saturate(1.5) brightness(0.9)'; // Make it look different

    img.onload = function() {
        console.log('PvP opponent image loaded successfully:', imgPath);
        const fallback = container.querySelector('.fighter-fallback');
        if (fallback) fallback.style.display = 'none';
        container.appendChild(img);
    };

    img.onerror = function() {
        console.log('PvP opponent image failed to load:', imgPath, 'keeping fallback');
        // Keep fallback visible
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

function showRoundResults(results) {
    const roundDiv = document.getElementById('roundResults');
    const roundContent = document.getElementById('roundContent');

    roundContent.innerHTML = `
        <div style="margin: 10px 0;">
            <strong>Round Results:</strong>
        </div>
        ${results.log.map(log => `<p>${log}</p>`).join('')}
        <div style="margin-top: 15px;">
            <strong>Your HP:</strong> ${results.playerHP} |
            <strong>Opponent HP:</strong> ${results.opponentHP}
        </div>
    `;

    roundDiv.style.display = 'block';

    // Setup next round button
    document.getElementById('nextRoundBtn').onclick = () => {
        roundDiv.style.display = 'none';

        // Re-enable the fight controls for next round
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').textContent = 'Hit!';
        document.getElementById('status').textContent = 'Waiting for both players to submit actions...';

        // Reset timer to 30 seconds
        let timeLeft = 120;
        const timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('timer').textContent = `Time left: ${timeLeft}s`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                document.getElementById('submitBtn').disabled = true;
                document.getElementById('status').textContent = 'Time\'s up!';
            }
        }, 1000);
    };
}

function showFinalResults(results) {
    const finalDiv = document.getElementById('finalResults');
    const finalContent = document.getElementById('finalContent');

    finalContent.innerHTML = `
        <div style="font-size: 20px; margin: 20px 0;">
            <strong>Winner: ${results.winner}</strong>
        </div>
        <div style="margin: 15px 0;">
            <strong>Final Stats:</strong><br>
            Your HP: ${results.playerHP}<br>
            Opponent HP: ${results.opponentHP}
        </div>
        ${results.xpGained ? `<div style="margin: 15px 0; color: #4caf50;"><strong>XP Gained: +${results.xpGained}</strong></div>` : ''}
        <div style="margin-top: 20px;">
            <h4>Fight Summary:</h4>
            ${results.fullLog.map(log => `<p>${log}</p>`).join('')}
        </div>
    `;

    finalDiv.style.display = 'block';

    // Hide the fight controls
    document.getElementById('timer').style.display = 'none';
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('status').style.display = 'none';
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

function showSimpleFightWindow(opponentNickname) {
    // Stop any existing polling
    if (challengePollingInterval) {
        clearInterval(challengePollingInterval);
        challengePollingInterval = null;
    }

    // Start PvP fight - this will be handled by startPvPFight function
    startPvPFight(null, opponentNickname);
}
