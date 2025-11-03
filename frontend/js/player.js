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
    // No stat allocation - players get default race stats only

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
                    <select id="race" class="form-select">
                        <option value="human">🧑 Human (HP:25, PWR:5, DEF:5, AGL:6, KNW:0)</option>
                        <option value="orc">👹 Orc (HP:25, PWR:6, DEF:5, AGL:5, KNW:0)</option>
                        <option value="elf" selected>🧝 Elf (HP:25, PWR:5, DEF:5, AGL:6, KNW:0)</option>
                        <option value="dwarf">🧔 Dwarf (HP:25, PWR:5, DEF:6, AGL:5, KNW:0)</option>
                        <option value="skeleton">💀 Skeleton (HP:26, PWR:5, DEF:5, AGL:5, KNW:0)</option>
                    </select>
                </div>

                <button id="createProfileBtn" class="btn-primary" onclick="createProfile()">
                    ⚔️ Create Fighter
                </button>
            </div>
        </div>
    `;

    // No stat allocation needed - players get default race stats

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
            "orc": "👹",
            "skeleton": "💀"
        };
        return raceAvatars[race] || "👤";
    }

    window.createProfile = function() {
        console.log("Create Fighter button clicked!"); // Debug log

        const nickname = document.getElementById("nickname").value.trim();
        console.log("Nickname:", nickname); // Debug log

        if (!nickname) {
            alert("Please enter a nickname.");
            return;
        }

        const race = document.getElementById("race").value;
        console.log("Race:", race); // Debug log

        createProfileAPI({
            telegram_id: telegram_id,
            nickname: nickname,
            race: race
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
    window.currentProfile = profile; // Store profile globally for tab switching

    document.body.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1>⚔️ ${t('gameTitle')}</h1>
                <div class="subtitle">${t('gameSubtitle')}</div>
            </div>

            <div class="tab-navigation">
                <button class="tab-button active" id="lobbyTab" onclick="switchTab('lobby')">
                    🏠 ${t('lobbyTab')}
                </button>
                <button class="tab-button" id="equipmentTab" onclick="switchTab('equipment')">
                    ⚔️ ${t('equipmentTab')}
                </button>
                <button class="tab-button" id="settingsTab" onclick="switchTab('settings')">
                    ⚙️ ${t('settingsTab')}
                </button>
            </div>

            <div class="tab-content" id="tabContent">
                <!-- Tab content will be loaded here -->
            </div>
        </div>
    `;

    // Load default tab (lobby)
    window.switchTab('lobby');
}

// Make switchTab globally available
window.switchTab = function(tabName) {
    console.log("switchTab called with:", tabName);

    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    const tabButton = document.getElementById(tabName + 'Tab');
    if (tabButton) {
        tabButton.classList.add('active');
    } else {
        console.error("Tab button not found:", tabName + 'Tab');
    }

    // Load tab content
    const tabContent = document.getElementById('tabContent');
    if (!tabContent) {
        console.error("Tab content container not found");
        return;
    }

    console.log("Switching to tab:", tabName);
    switch(tabName) {
        case 'lobby':
            showLobbyTab();
            break;
        case 'equipment':
            showEquipmentTab();
            break;
        case 'settings':
            showSettingsTab();
            break;
        default:
            console.error("Unknown tab:", tabName);
    }
}

function showLobbyTab() {
    console.log("showLobbyTab called");
    const profile = window.currentProfile;
    console.log("Profile:", profile);

    if (!profile) {
        document.getElementById('tabContent').innerHTML = '<div class="error">Profile not loaded</div>';
        return;
    }

    const levelStars = "⭐".repeat(Math.min(profile.level, 5));
    const canAllocatePoints = profile.level % 3 === 0;
    const raceAvatar = getRaceAvatar(profile.race);

    console.log("About to render lobby content");

    document.getElementById('tabContent').innerHTML = `
        <div class="player-info">
            <div class="player-header">
                <div class="player-avatar" id="playerAvatar">
                    ${raceAvatar}
                </div>
                <div class="player-details">
                    <h2>${t('welcome')}, ${profile.nickname}!</h2>
                    <div class="player-level">
                        <span class="level-badge ${canAllocatePoints ? 'level-up-glow' : ''}">${t('level')} ${profile.level}</span>
                        <span class="stars">${levelStars}</span>
                    </div>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">⚔️ ${t('power')}</div>
                    <div class="stat-value">${profile.power}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">🛡️ ${t('defense')}</div>
                    <div class="stat-value">${profile.defense}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">💨 ${t('agility')}</div>
                    <div class="stat-value">${profile.agility}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">🧠 ${t('knowledge')}</div>
                    <div class="stat-value">${profile.knowledge}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">🏆 ${t('race')}</div>
                    <div class="stat-value">${t(`races.${profile.race}`)}</div>
                </div>
            </div>

            <div class="progress-container">
                <div class="progress-item">
                    <div class="progress-label">
                        <span>❤️ ${t('healthPoints')}</span>
                        <span class="progress-text">${profile.hp}/${profile.hp}</span>
                    </div>
                    ${renderHPBar(profile.hp, profile.hp)}
                </div>
                <div class="progress-item">
                    <div class="progress-label">
                        <span>⭐ ${t('experience')}</span>
                        <span class="progress-text">${profile.experience}/${xpToNextLevel(profile.level)}</span>
                    </div>
                    ${renderXPBar(profile.experience, xpToNextLevel(profile.level))}
                </div>
                <div class="progress-item">
                    <div class="progress-label">
                        <span>🔮 ${t('manaPoints')}</span>
                        <span class="progress-text">${profile.mana || 0}/${profile.maxMana || 0}</span>
                    </div>
                    ${renderManaBar(profile.mana || 0, profile.maxMana || 0)}
                </div>
            </div>
        </div>

        <div class="actions-container">
            <button id="fightButton" class="btn-action btn-fight-bot">
                🤖 ${t('fightVsBot')}
            </button>
            <button id="playersListButton" class="btn-action btn-fight-player">
                👥 ${t('fightVsPlayer')}
            </button>
            ${canAllocatePoints ? `
                <button id="allocatePointsButton" class="btn-action btn-allocate">
                    📈 ${t('allocatePoints')} (${profile.extra_points || 3})
                </button>
            ` : ""}
        </div>
    `;

    console.log("Lobby content rendered");

    // Load player's race avatar
    loadPlayerAvatar(profile.race);

    // Bind event handlers
    document.getElementById("fightButton").onclick = () => showFightScreen(profile);

    if (canAllocatePoints) {
        document.getElementById("allocatePointsButton").onclick = () => showAllocatePoints(profile);
    }

    document.getElementById("playersListButton").onclick = () => {
        window.location.href = `/players.html?telegram_id=${telegram_id}`;
    };
}

function showEquipmentTab() {
    console.log("showEquipmentTab called");
    document.getElementById('tabContent').innerHTML = `
        <div class="equipment-container">
            <h2>🎒 ${t('inventoryEquipment')}</h2>
            <p>${t('manageItems')}</p>
        </div>
    `;
    console.log("Equipment tab content rendered");
}

function showSettingsTab() {
    console.log("showSettingsTab called");

    // Get current language setting (default to English)
    const currentLanguage = localStorage.getItem('gameLanguage') || 'en';

    document.getElementById('tabContent').innerHTML = `
        <div class="settings-container">
            <div class="settings-header">
                <h2>⚙️ ${t('settings')}</h2>
                <p>${t('customizeExperience')}</p>
            </div>

            <div class="settings-section">
                <div class="setting-item">
                    <div class="setting-label">
                        <strong>🌐 ${t('language')}</strong>
                        <p>${t('chooseLanguage')}</p>
                    </div>
                    <div class="setting-control">
                        <select id="languageSelect" class="form-select">
                            <option value="en" ${currentLanguage === 'en' ? 'selected' : ''}>🇺🇸 English</option>
                            <option value="ru" ${currentLanguage === 'ru' ? 'selected' : ''}>🇷🇺 Russian</option>
                            <option value="es" disabled>🇪🇸 Spanish (Coming Soon)</option>
                            <option value="fr" disabled>🇫🇷 French (Coming Soon)</option>
                            <option value="de" disabled>🇩🇪 German (Coming Soon)</option>
                        </select>
                    </div>
                </div>

                <div class="setting-item">
                    <button class="btn-secondary" onclick="saveSettings()">
                        💾 ${t('saveSettings')}
                    </button>
                </div>

                <div class="setting-item">
                    <div class="setting-info">
                        <small>${t('currentLanguage')}: <strong>${getLanguageName(currentLanguage)}</strong></small>
                    </div>
                </div>
            </div>
        </div>
    `;
    console.log("Settings tab content rendered");
}

async function loadInventoryData() {
    try {
        const response = await fetch(`/inventory/${telegram_id}`);
        const data = await response.json();

        if (response.ok) {
            displayInventory(data.inventory, data.items);
            displayEquipment(data.equipment, data.items);
        } else {
            document.getElementById('inventoryTable').innerHTML = '<div class="error">Failed to load inventory</div>';
            document.getElementById('equipmentSlots').innerHTML = '<div class="error">Failed to load equipment</div>';
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        document.getElementById('inventoryTable').innerHTML = '<div class="error">Connection error</div>';
        document.getElementById('equipmentSlots').innerHTML = '<div class="error">Connection error</div>';
    }
}

function displayInventory(inventory, itemDefinitions) {
    const inventoryTable = document.getElementById('inventoryTable');

    if (!inventory || Object.keys(inventory).length === 0) {
        inventoryTable.innerHTML = '<div class="empty-inventory">Your inventory is empty</div>';
        return;
    }

    let html = '<div class="inventory-grid">';

    for (const [itemType, quantity] of Object.entries(inventory)) {
        const item = itemDefinitions[itemType];
        if (!item) continue;

        html += `
            <div class="inventory-item">
                <div class="item-icon">
                    <img src="./images/items/${itemType}.png" alt="${item.name}"
                         onerror="this.innerHTML='${getItemEmoji(itemType)}'; this.style.display='flex'; this.style.alignItems='center'; this.style.justifyContent='center'; this.style.fontSize='24px';" />
                </div>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <div class="item-quantity">×${quantity}</div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    inventoryTable.innerHTML = html;
}

function displayEquipment(equipment, itemDefinitions) {
    const equipmentSlots = document.getElementById('equipmentSlots');

    let html = '<div class="equipment-slots-grid">';

    // Basic slots
    html += '<div class="slot-section"><h4>🔮 Basic Slots</h4>';
    equipment.basic_slots.forEach((item, index) => {
        html += createSlotHTML('basic', index, item, itemDefinitions);
    });
    html += '</div>';

    // Hand slots
    html += '<div class="slot-section"><h4>👊 Hand Slots</h4>';
    equipment.hand_slots.forEach((item, index) => {
        html += createSlotHTML('hand', index, item, itemDefinitions);
    });
    html += '</div>';

    html += '</div>';
    equipmentSlots.innerHTML = html;
}

function createSlotHTML(slotType, index, item, itemDefinitions) {
    if (item) {
        const itemDef = itemDefinitions[item.type];
        return `
            <div class="equipment-slot filled" onclick="unequipItem('${slotType}', ${index})">
                <div class="slot-icon">
                    <img src="./images/items/${item.type}.png" alt="${itemDef.name}"
                         onerror="this.innerHTML='${getItemEmoji(item.type)}'; this.style.display='flex'; this.style.alignItems='center'; this.style.justifyContent='center'; this.style.fontSize='20px';" />
                </div>
                <div class="slot-name">${itemDef.name}</div>
                <div class="slot-uses">${item.uses}/${item.maxUses}</div>
            </div>
        `;
    } else {
        return `
            <div class="equipment-slot empty">
                <div class="slot-icon">➕</div>
                <div class="slot-name">Empty</div>
            </div>
        `;
    }
}

function getItemEmoji(itemType) {
    const itemEmojis = {
        'stone': '🪨',
        'big_stone': '🗿',
        'metal_ball': '⚽',
        'wooden_stick': '🏏',
        'big_wooden_stick': '🏒',
        'knife': '🔪',
        'small_club': '🔨',
        'blade': '⚔️',
        'slingshot': '🏹',
        'fear_spell': '😱',
        'scream_spell': '😱'
    };
    return itemEmojis[itemType] || '📦';
}

// Make unequipItem globally available
window.unequipItem = async function(slotType, slotIndex) {
    try {
        const response = await fetch('/unequip-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: telegram_id,
                slot_type: slotType,
                slot_index: slotIndex
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Reload inventory display
            loadInventoryData();
        } else {
            alert('Failed to unequip item: ' + data.error);
        }
    } catch (error) {
        console.error('Error unequipping item:', error);
        alert('Connection error');
    }
}

function getLanguageName(languageCode) {
    const languages = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'ru': 'Russian'
    };
    return languages[languageCode] || 'English';
}

// Make saveSettings globally available
window.saveSettings = function() {
    const languageSelect = document.getElementById('languageSelect');
    if (!languageSelect) {
        alert('Language selection not found');
        return;
    }

    const selectedLanguage = languageSelect.value;

    // Allow English and Russian
    if (selectedLanguage !== 'en' && selectedLanguage !== 'ru') {
        alert(t('languageNotAvailable'));
        languageSelect.value = getCurrentLanguage(); // Reset to current language
        return;
    }

    // Save language to localStorage
    localStorage.setItem('gameLanguage', selectedLanguage);

    // Update the current language display
    const languageName = getLanguageName(selectedLanguage);
    const settingInfo = document.querySelector('.setting-info strong');
    if (settingInfo) {
        settingInfo.textContent = languageName;
    }

    // Show success message
    // Trigger language update
    setLanguage(selectedLanguage);

    alert(`${t('settingsSaved')} ${languageName}.`);

    console.log('Language setting saved:', selectedLanguage);
}

function getRaceAvatar(race) {
    const raceAvatars = {
        "human": "🧑",
        "elf": "🧝",
        "dwarf": "🧔",
        "orc": "👹",
        "skeleton": "💀"
    };
    return raceAvatars[race] || "👤";
}

function loadPlayerAvatar(race) {
    const avatarElement = document.getElementById("playerAvatar");
    if (!avatarElement || !race) return;

    const imgPath = `./images/avatars/${race}.png`;
    const img = document.createElement('img');
    img.src = imgPath;
    img.alt = `${race} avatar`;
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';

    img.onload = function() {
        avatarElement.innerHTML = '';
        avatarElement.appendChild(img);
    };

    img.onerror = function() {
        // Keep emoji if image fails to load
        avatarElement.innerHTML = getRaceAvatar(race);
    };
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
