// Global variable to track last visited screen for dynamic lobby button
window.lastVisitedScreen = 'arena';

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

function showGame(profile, lastScreen = 'arena') {
    console.log("Profile data:", profile, "lastScreen:", lastScreen);
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
window.switchTab = async function(tabName) {
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
            await showLobbyTab();
            break;
        case 'equipment':
            await showEquipmentTab();
            break;
        case 'settings':
            showSettingsTab();
            break;
        default:
            console.error("Unknown tab:", tabName);
    }
}

async function showLobbyTab() {
    console.log("showLobbyTab called");

    // Refresh profile data from server to get latest coin/inventory values
    try {
        const profileData = await fetchProfile(telegram_id);
        if (profileData.exists) {
            window.currentProfile = profileData.profile;
        }
    } catch (error) {
        console.error("Failed to refresh profile:", error);
    }

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
                <div class="stat-card">
                    <div class="stat-label">🪙 ${t('coins')}</div>
                    <div class="stat-value" id="coins-display">${profile.coins || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">🎫 ${t('tickets')}</div>
                    <div class="stat-value">${profile.tickets || 0}</div>
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
            ${window.lastVisitedScreen === 'arena' ? `
                <button id="arenaButton" class="btn-action btn-arena">
                    🏟️ ${t('enterArena')}
                </button>
            ` : window.lastVisitedScreen === 'shop' ? `
                <button id="shopButton" class="btn-action btn-shop">
                    🏪 ${t('enterShop')}
                </button>
            ` : window.lastVisitedScreen === 'rewardHub' ? `
                <button id="rewardHubButton" class="btn-action btn-reward">
                    🏆 ${t('enterRewardHub')}
                </button>
            ` : `
                <button id="arenaButton" class="btn-action btn-arena">
                    🏟️ ${t('enterArena')}
                </button>
            `}
            <button id="mapButton" class="btn-action btn-map">
                🗺️ ${t('map')}
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
    // Bind dynamic button based on lastVisitedScreen
    if (window.lastVisitedScreen === 'arena') {
        document.getElementById("arenaButton").onclick = () => showArenaScreen(profile);
    } else if (window.lastVisitedScreen === 'shop') {
        document.getElementById("shopButton").onclick = () => showShopScreen(profile);
    } else if (window.lastVisitedScreen === 'rewardHub') {
        document.getElementById("rewardHubButton").onclick = () => showRewardHubScreen(profile);
    } else {
        // Default fallback to arena
        document.getElementById("arenaButton").onclick = () => showArenaScreen(profile);
    }

    document.getElementById("mapButton").onclick = () => showMapScreen(profile);

    if (canAllocatePoints) {
        document.getElementById("allocatePointsButton").onclick = () => showAllocatePoints(profile);
    }
}

async function showEquipmentTab() {
    console.log("showEquipmentTab called");

    try {
        // Fetch fresh profile data to get current inventory and equipment
        const profileData = await fetchProfile(telegram_id);
        if (!profileData.exists) {
            document.getElementById('tabContent').innerHTML = `
                <div class="equipment-container">
                    <h2>🎒 ${t('inventoryEquipment')}</h2>
                    <p>${t('profileNotLoaded')}</p>
                </div>
            `;
            return;
        }

        const profile = profileData.profile;

        // Generate inventory items HTML
        let inventoryHTML = '';
        if (profile.inventory && Object.keys(profile.inventory).length > 0) {
            for (const [itemName, quantity] of Object.entries(profile.inventory)) {
                if (quantity > 0) {
                    inventoryHTML += `
                        <div class="inventory-item clickable" onclick="equipItem('${itemName}')">
                            <span class="item-name">${t('items.' + itemName)}</span>
                            <span class="item-quantity">x${quantity}</span>
                        </div>
                    `;
                }
            }
        } else {
            inventoryHTML = `<p class="empty-text">${t('emptyInventory')}</p>`;
        }

        // Generate equipment slots HTML
        const equipment = profile.equipment || { basic_slots: [null, null], hand_slots: [null, null] };

        let basicSlotsHTML = '';
        for (let i = 0; i < equipment.basic_slots.length; i++) {
            const item = equipment.basic_slots[i];
            const isEmpty = !item;
            const clickHandler = isEmpty ? `onclick="selectEquipmentSlot('basic_slots', ${i})"` : `onclick="unequipItem('basic_slots', ${i})"`;
            const classes = isEmpty ? 'equipment-slot empty clickable' : 'equipment-slot filled clickable';

            basicSlotsHTML += `
                <div class="${classes}" ${clickHandler}>
                    ${item ? t('items.' + item) : t('empty')}
                </div>
            `;
        }

        let handSlotsHTML = '';
        for (let i = 0; i < equipment.hand_slots.length; i++) {
            const item = equipment.hand_slots[i];
            const isEmpty = !item;
            const clickHandler = isEmpty ? `onclick="selectEquipmentSlot('hand_slots', ${i})"` : `onclick="unequipItem('hand_slots', ${i})"`;
            const classes = isEmpty ? 'equipment-slot empty clickable' : 'equipment-slot filled clickable';

            handSlotsHTML += `
                <div class="${classes}" ${clickHandler}>
                    ${item ? t('items.' + item) : t('empty')}
                </div>
            `;
        }

        document.getElementById('tabContent').innerHTML = `
            <div class="equipment-container">
                <h2>🎒 ${t('inventoryEquipment')}</h2>
                <p>${t('manageItems')}</p>

                <div class="equipment-section">
                    <h3>📦 ${t('inventory')}</h3>
                    <div class="inventory-grid">
                        ${inventoryHTML}
                    </div>
                </div>

                <div class="equipment-section">
                    <h3>⚔️ ${t('equippedItems')}</h3>

                    <div class="slots-section">
                        <h4>🛡️ ${t('basicSlots')}</h4>
                        <div class="equipment-slots">
                            ${basicSlotsHTML}
                        </div>
                    </div>

                    <div class="slots-section">
                        <h4>🤲 ${t('handSlots')}</h4>
                        <div class="equipment-slots">
                            ${handSlotsHTML}
                        </div>
                    </div>
                </div>

                <div class="return-section">
                    <button class="btn-secondary" onclick="showLobbyTab()">← ${t('backToLobby')}</button>
                </div>
            </div>
        `;
        console.log("Equipment tab content rendered with data");
    } catch (error) {
        console.error("Failed to load equipment data:", error);
        document.getElementById('tabContent').innerHTML = `
            <div class="equipment-container">
                <h2>🎒 ${t('inventoryEquipment')}</h2>
                <p>${t('failedToLoad')} ${t('inventoryEquipment')}</p>
            </div>
        `;
    }
}

// Global variables for equipment interaction
let selectedSlotType = null;
let selectedSlotIndex = null;

// Function to equip an item from inventory
async function equipItem(itemName) {
    console.log("equipItem called with:", itemName);

    // Check if we need to ask user which slot to equip to
    if (!selectedSlotType || selectedSlotIndex === null) {
        alert(`Click on an empty slot to equip ${t('items.' + itemName)}`);
        // Store the item to equip
        window.pendingEquipItem = itemName;
        return;
    }

    try {
        const response = await fetch("/equip-item-v2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                telegram_id: telegram_id,
                item_name: itemName,
                slot_type: selectedSlotType,
                slot_index: selectedSlotIndex
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Item equipped successfully:", result);

            // Clear selection
            selectedSlotType = null;
            selectedSlotIndex = null;
            window.pendingEquipItem = null;

            // Refresh equipment tab
            await showEquipmentTab();
        } else {
            const error = await response.json();
            alert(error.message || "Failed to equip item");
        }
    } catch (error) {
        console.error("Error equipping item:", error);
        alert("Connection error while equipping item");
    }
}

// Function to unequip an item from equipment slot
async function unequipItem(slotType, slotIndex) {
    console.log("unequipItem called with:", slotType, slotIndex);

    try {
        const response = await fetch("/unequip-item-v2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                telegram_id: telegram_id,
                slot_type: slotType,
                slot_index: slotIndex
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Item unequipped successfully:", result);

            // Refresh equipment tab
            await showEquipmentTab();
        } else {
            const error = await response.json();
            alert(error.message || "Failed to unequip item");
        }
    } catch (error) {
        console.error("Error unequipping item:", error);
        alert("Connection error while unequipping item");
    }
}

// Function to select an equipment slot for equipping
function selectEquipmentSlot(slotType, slotIndex) {
    console.log("selectEquipmentSlot called with:", slotType, slotIndex);

    selectedSlotType = slotType;
    selectedSlotIndex = slotIndex;

    // If there's a pending item to equip, equip it now
    if (window.pendingEquipItem) {
        equipItem(window.pendingEquipItem);
    } else {
        alert(`Selected slot: ${slotType} ${slotIndex + 1}. Now click on an inventory item to equip it here.`);
    }
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

function showMapScreen(profile) {
    console.log("showMapScreen called");

    document.body.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1>🗺️ ${t('gameMap')}</h1>
                <div class="subtitle">${t('exploreWorld')}</div>
            </div>

            <div class="map-container">
                <div class="map-locations">
                    <button id="arenaButton" class="btn-action btn-location">
                        🏟️ ${t('arena')}
                    </button>
                    <button id="shopButton" class="btn-action btn-location">
                        🏪 ${t('shop')}
                    </button>
                    <button id="rewardHubButton" class="btn-action btn-location">
                        🏆 ${t('rewardHub')}
                    </button>
                    <button id="backToLobbyButton" class="btn-action btn-back">
                        🏠 ${t('backToLobby')}
                    </button>
                </div>
            </div>
        </div>
    `;

    // Bind event handlers
    document.getElementById("arenaButton").onclick = () => {
        showArenaScreen(window.currentProfile);
    };

    document.getElementById("shopButton").onclick = () => {
        showShopScreen(window.currentProfile);
    };

    document.getElementById("rewardHubButton").onclick = () => {
        showRewardHubScreen(window.currentProfile);
    };

    document.getElementById("backToLobbyButton").onclick = () => {
        showGame(profile);
    };

    console.log("Map screen rendered");
}

function showArenaScreen(profile) {
    console.log("showArenaScreen called");
    window.lastVisitedScreen = 'arena';

    document.body.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1>🏟️ ${t('arenaTitle')}</h1>
                <div class="subtitle">${t('arenaSubtitle')}</div>
            </div>

            <div class="arena-container">
                <div class="arena-options">
                    <button id="fightBotButton" class="btn-action btn-fight-bot">
                        🤖 ${t('fightVsBot')}
                    </button>
                    <button id="fightPlayerButton" class="btn-action btn-fight-player">
                        👥 ${t('fightVsPlayer')}
                    </button>
                    <button id="backToLobbyFromArenaButton" class="btn-action btn-back">
                        🏠 ${t('backToLobby')}
                    </button>
                </div>
            </div>
        </div>
    `;

    // Bind event handlers
    document.getElementById("fightBotButton").onclick = () => {
        showFightScreen(profile);
    };

    document.getElementById("fightPlayerButton").onclick = () => {
        window.location.href = `/players.html?telegram_id=${telegram_id}`;
    };

    document.getElementById("backToLobbyFromArenaButton").onclick = () => {
        showGame(profile);
    };

    console.log("Arena screen rendered");
}

function showShopScreen(profile) {
    console.log("showShopScreen called");
    window.lastVisitedScreen = 'shop';

    document.body.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1>🏪 ${t('shopTitle')}</h1>
                <div class="subtitle">${t('shopSubtitle')}</div>
            </div>

            <div class="shop-container">
                <div class="shop-tabs">
                    <button id="basicSlotTab" class="shop-tab-button active">
                        📦 ${t('basicSlotItems')}
                    </button>
                    <button id="handSlotTab" class="shop-tab-button">
                        🗡️ ${t('handSlotItems')}
                    </button>
                </div>

                <div id="shopTabContent" class="shop-tab-content">
                    <!-- Tab content will be loaded here -->
                </div>
            </div>
        </div>
    `;

    // Initialize with basic slot tab
    showShopTab('basicSlot', profile);

    // Bind tab event handlers
    document.getElementById("basicSlotTab").onclick = () => {
        showShopTab('basicSlot', profile);
    };
    document.getElementById("handSlotTab").onclick = () => {
        showShopTab('handSlot', profile);
    };

    console.log("Shop screen rendered");
}

function showShopTab(tabName, profile) {
    // Update tab buttons
    document.querySelectorAll('.shop-tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');

    let tabContent = '';

    if (tabName === 'basicSlot') {
        const basicItems = ['stone', 'big_stone', 'metal_ball', 'fear_spell', 'scream_spell'];
        const itemsList = basicItems.map(item => `
            <div class="shop-item">
                <div class="shop-item-info">
                    <span class="shop-item-name">${t(`items.${item}`)}</span>
                </div>
                <div class="shop-item-price">
                    <button id="buy-${item}" class="btn-buy" onclick="buyItem('${item}', 5)">
                        🪙 5 ${t('coins')}
                    </button>
                </div>
            </div>
        `).join('');

        tabContent = `
            <div class="shop-section">
                <h3>📦 ${t('basicSlotItems')}</h3>
                <div class="shop-items-list">
                    ${itemsList}
                </div>
                <button id="backToLobbyFromBasicShopButton" class="btn-action btn-back">
                    🏠 ${t('backToLobby')}
                </button>
            </div>
        `;
    } else if (tabName === 'handSlot') {
        const handItems = ['wooden_stick', 'big_wooden_stick', 'knife', 'small_club', 'blade', 'slingshot'];
        const itemsList = handItems.map(item => `
            <div class="shop-item">
                <div class="shop-item-info">
                    <span class="shop-item-name">${t(`items.${item}`)}</span>
                </div>
                <div class="shop-item-price">
                    <button id="buy-${item}" class="btn-buy" onclick="buyItem('${item}', 5)">
                        🪙 5 ${t('coins')}
                    </button>
                </div>
            </div>
        `).join('');

        tabContent = `
            <div class="shop-section">
                <h3>🗡️ ${t('handSlotItems')}</h3>
                <div class="shop-items-list">
                    ${itemsList}
                </div>
                <button id="backToLobbyFromHandShopButton" class="btn-action btn-back">
                    🏠 ${t('backToLobby')}
                </button>
            </div>
        `;
    }

    document.getElementById('shopTabContent').innerHTML = tabContent;

    // Bind back to lobby buttons
    const basicButton = document.getElementById("backToLobbyFromBasicShopButton");
    const handButton = document.getElementById("backToLobbyFromHandShopButton");

    if (basicButton) {
        basicButton.onclick = () => showGame(profile, 'shop');
    }
    if (handButton) {
        handButton.onclick = () => showGame(profile, 'shop');
    }
}

// Buy item function
async function buyItem(itemName, price) {
    console.log(`Attempting to buy ${itemName} for ${price} coins`);

    const profile = window.currentProfile;
    if (!profile) {
        alert("Profile not loaded");
        return;
    }

    // Check if player has enough coins
    if (profile.coins < price) {
        alert("Not enough coins");
        return;
    }

    try {
        const response = await fetch("/buy-item", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                telegram_id: telegram_id,
                item_name: itemName,
                price: price
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Update local profile data
            profile.coins = result.profile.coins;
            profile.inventory = result.profile.inventory;

            // Update the displayed coins count if we're in lobby
            const coinsElement = document.getElementById('coins-display');
            if (coinsElement) {
                coinsElement.textContent = profile.coins;
            }

            alert(`Successfully bought ${t(`items.${itemName}`)}!`);
            console.log(`Purchase successful. New coins: ${profile.coins}`);
        } else {
            alert(result.message || "Purchase failed");
        }
    } catch (error) {
        console.error("Purchase error:", error);
        alert("Connection error");
    }
}

function showRewardHubScreen(profile) {
    console.log("showRewardHubScreen called");
    window.lastVisitedScreen = 'rewardHub';

    document.body.innerHTML = `
        <div class="game-container">
            <div class="game-header">
                <h1>🏆 ${t('rewardHubTitle')}</h1>
                <div class="subtitle">${t('rewardHubSubtitle')}</div>
            </div>

            <div class="reward-hub-container">
                <div class="reward-hub-tabs">
                    <button class="reward-tab-button active" id="dailyTab" onclick="showRewardHubTab('daily')">
                        ${t('dailyRewards')}
                    </button>
                    <button class="reward-tab-button" id="tasksTab" onclick="showRewardHubTab('tasks')">
                        ${t('tasks')}
                    </button>
                    <button class="reward-tab-button" id="lotteryTab" onclick="showRewardHubTab('lottery')">
                        ${t('lottery')}
                    </button>
                </div>

                <div class="reward-hub-content">
                    <div id="rewardTabContent">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // Show default tab
    showRewardHubTab('daily', profile);

    console.log("Reward Hub screen rendered");
}

function showRewardHubTab(tabName, profile) {
    // Update active tab
    document.querySelectorAll('.reward-tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');

    let content = '';

    switch(tabName) {
        case 'daily':
            content = `
                <div class="daily-rewards-content">
                    <h3>${t('dailyRewardsTab')}</h3>
                    <div class="daily-reward-item">
                        <div class="reward-info">
                            <span class="reward-icon">🪙</span>
                            <span class="reward-text">5 ${t('coins')}</span>
                        </div>
                        <button class="btn-action btn-claim" onclick="claimDailyReward()">
                            ${t('claimReward')}
                        </button>
                    </div>
                    <div class="daily-reward-item">
                        <div class="reward-info">
                            <span class="reward-icon">🎫</span>
                            <span class="reward-text">1 ${t('tickets')}</span>
                        </div>
                        <button class="btn-action btn-claim" onclick="claimDailyReward()">
                            ${t('claimReward')}
                        </button>
                    </div>
                    <button class="btn-action btn-back" onclick="showGame(window.currentProfile, 'rewardHub')">
                        🏠 ${t('backToLobby')}
                    </button>
                </div>
            `;
            break;
        case 'tasks':
            content = `
                <div class="tasks-content">
                    <h3>${t('tasksTab')}</h3>
                    <div class="tasks-list">
                        <p>${t('noTasksAvailable')}</p>
                    </div>
                    <button class="btn-action btn-back" onclick="showGame(window.currentProfile, 'rewardHub')">
                        🏠 ${t('backToLobby')}
                    </button>
                </div>
            `;
            break;
        case 'lottery':
            content = `
                <div class="lottery-content">
                    <h3>${t('lotteryTab')}</h3>
                    <div class="lottery-info">
                        <p>${t('yourTickets')} ${profile ? profile.tickets || 0 : 0}</p>
                        <button class="btn-action btn-buy" onclick="buyLotteryTicket()">
                            ${t('buyLotteryTicket')} (10 ${t('coins')})
                        </button>
                        <p class="lottery-timer">${t('lotteryDrawTime')} 24:00:00</p>
                    </div>
                    <button class="btn-action btn-back" onclick="showGame(window.currentProfile, 'rewardHub')">
                        🏠 ${t('backToLobby')}
                    </button>
                </div>
            `;
            break;
    }

    document.getElementById('rewardTabContent').innerHTML = content;
}

function claimDailyReward() {
    // Show success message
    const content = document.getElementById('rewardTabContent');
    content.innerHTML = `
        <div class="daily-rewards-content">
            <h3>${t('dailyRewardsTab')}</h3>
            <div class="reward-claimed-message">
                <p class="success-message">${t('rewardClaimed')}</p>
                <p>${t('comeBackTomorrow')}</p>
            </div>
            <button class="btn-action btn-back" onclick="showGame(window.currentProfile, 'rewardHub')">
                🏠 ${t('backToLobby')}
            </button>
        </div>
    `;
}

function buyLotteryTicket() {
    // Simple implementation - could be enhanced with server integration
    alert(`${t('buyLotteryTicket')} - Feature coming soon!`);
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
