// Game translations
const translations = {
    en: {
        // Main headers
        gameTitle: "FIGHT CLUB",
        gameSubtitle: "Ready for battle, warrior?",
        createFighterTitle: "CREATE YOUR FIGHTER",
        createFighterSubtitle: "Build your ultimate warrior",

        // Tabs
        lobbyTab: "Lobby",
        equipmentTab: "Equipment",
        settingsTab: "Settings",

        // Player info
        welcome: "Welcome",
        level: "Level",

        // Stats
        power: "Power",
        defense: "Defense",
        agility: "Agility",
        knowledge: "Knowledge",
        race: "Race",

        // Progress bars
        healthPoints: "Health Points",
        experience: "Experience",
        manaPoints: "Mana Points",

        // Currency
        coins: "Coins",
        tickets: "Tickets",

        // Races
        races: {
            human: "Human",
            elf: "Elf",
            dwarf: "Dwarf",
            orc: "Orc",
            skeleton: "Skeleton"
        },

        // Race descriptions for character creation
        raceDescriptions: {
            human: "Human (HP:25, PWR:5, DEF:5, AGL:6, KNW:0)",
            orc: "Orc (HP:25, PWR:6, DEF:5, AGL:5, KNW:0)",
            elf: "Elf (HP:25, PWR:5, DEF:5, AGL:6, KNW:0)",
            dwarf: "Dwarf (HP:25, PWR:5, DEF:6, AGL:5, KNW:0)",
            skeleton: "Skeleton (HP:26, PWR:5, DEF:5, AGL:5, KNW:0)"
        },

        // Action buttons
        fightVsBot: "Fight vs Bot",
        fightVsPlayer: "Fight vs Player",
        allocatePoints: "Allocate Points",
        createFighter: "Create Fighter",
        backToLobby: "Back to Lobby",
        fightAgain: "Fight Again",
        attack: "ATTACK!",
        fighting: "Fighting...",

        // Equipment
        inventoryEquipment: "Inventory & Equipment",
        manageItems: "Manage your items and equipment",
        inventory: "Inventory",
        equippedItems: "Equipped Items",
        basicSlots: "Basic Slots",
        handSlots: "Hand Slots",
        emptyInventory: "Your inventory is empty",
        empty: "Empty",

        // Shop tabs
        basicSlotItems: "Basic Slot Items",
        handSlotItems: "Hand Slot Items",

        // Settings
        settings: "Settings",
        customizeExperience: "Customize your game experience",
        language: "Language",
        chooseLanguage: "Choose your preferred language",
        saveSettings: "Save Settings",
        currentLanguage: "Current Language",

        // Languages
        languages: {
            en: "English",
            ru: "Russian",
            es: "Spanish",
            fr: "French",
            de: "German"
        },

        // Fight screen
        fightArena: "FIGHT ARENA",
        battleVsBot: "Battle against the bot",
        attackTarget: "Attack Target",
        defendArea: "Defend Area",
        battleReport: "Battle Report",
        victory: "Victory!",
        defeat: "Defeat!",

        // Body parts
        bodyParts: {
            head: "Head",
            chest: "Chest",
            stomach: "Stomach",
            belt: "Belt",
            legs: "Legs"
        },

        // Character creation
        fighterName: "Fighter Name",
        enterFighterName: "Enter your fighter's name",
        chooseRace: "Choose Your Race",

        // Messages
        settingsSaved: "Settings saved! Language set to",
        languageNotAvailable: "This language is not yet available. Coming soon!",
        profileNotLoaded: "Profile not loaded",
        loadingInventory: "Loading inventory...",
        loadingEquipment: "Loading equipment...",
        connectionError: "Connection error",
        failedToLoad: "Failed to load",

        // Items
        items: {
            stone: "Stone",
            big_stone: "Big Stone",
            metal_ball: "Metal Ball",
            wooden_stick: "Wooden Stick",
            big_wooden_stick: "Big Wooden Stick",
            knife: "Knife",
            small_club: "Small Club",
            blade: "Blade",
            slingshot: "Slingshot",
            fear_spell: "Fear Spell",
            scream_spell: "Scream Spell"
        },

        // Map screen
        map: "Map",
        gameMap: "Game Map",
        exploreWorld: "Explore the world",
        arena: "Arena",
        shop: "Shop",
        rewardHub: "Reward Hub",
        backToLobby: "Back to Lobby",

        // Arena screen
        arenaTitle: "FIGHT ARENA",
        arenaSubtitle: "Choose your battle",
        enterArena: "Enter the Arena",

        // Shop screen
        shopTitle: "SHOP",
        shopSubtitle: "Buy items and equipment",
        enterShop: "Enter the Shop",

        // Reward Hub screen
        rewardHubTitle: "REWARD HUB",
        rewardHubSubtitle: "Claim your rewards",
        enterRewardHub: "Enter Reward Hub",

        // Reward Hub tabs
        dailyRewards: "Daily",
        tasks: "Tasks",
        lottery: "Lottery",
        dailyRewardsTab: "Daily Rewards",
        tasksTab: "Tasks",
        lotteryTab: "Lottery",
        claimReward: "Claim Reward",
        rewardClaimed: "Reward Claimed!",
        comeBackTomorrow: "Come back tomorrow for more rewards!",
        noTasksAvailable: "No tasks available right now",
        buyLotteryTicket: "Buy Lottery Ticket",
        lotteryDrawTime: "Next draw in:",
        yourTickets: "Your tickets:",
        nextRewardIn: "Next reward in:",
        rewardAvailable: "Available!",
        spinDrum: "Spin the Drum!",
        spinning: "Spinning...",
        youWon: "You won:",
        noTickets: "No tickets available",
        lotteryResult: "Lottery Result"
    },

    ru: {
        // Main headers
        gameTitle: "БОЙЦОВСКИЙ КЛУБ",
        gameSubtitle: "Готов к бою, воин?",
        createFighterTitle: "СОЗДАТЬ БОЙЦА",
        createFighterSubtitle: "Создай своего воина",

        // Tabs
        lobbyTab: "Лобби",
        equipmentTab: "Снаряжение",
        settingsTab: "Настройки",

        // Player info
        welcome: "Добро пожаловать",
        level: "Уровень",

        // Stats
        power: "Сила",
        defense: "Защита",
        agility: "Ловкость",
        knowledge: "Знания",
        race: "Раса",

        // Progress bars
        healthPoints: "Очки здоровья",
        experience: "Опыт",
        manaPoints: "Очки маны",

        // Currency
        coins: "Монеты",
        tickets: "Билеты",

        // Races
        races: {
            human: "Человек",
            elf: "Эльф",
            dwarf: "Гном",
            orc: "Орк",
            skeleton: "Скелет"
        },

        // Race descriptions for character creation
        raceDescriptions: {
            human: "Человек (ХП:25, СИЛ:5, ЗАЩ:5, ЛОВ:6, ЗНА:0)",
            orc: "Орк (ХП:25, СИЛ:6, ЗАЩ:5, ЛОВ:5, ЗНА:0)",
            elf: "Эльф (ХП:25, СИЛ:5, ЗАЩ:5, ЛОВ:6, ЗНА:0)",
            dwarf: "Гном (ХП:25, СИЛ:5, ЗАЩ:6, ЛОВ:5, ЗНА:0)",
            skeleton: "Скелет (ХП:26, СИЛ:5, ЗАЩ:5, ЛОВ:5, ЗНА:0)"
        },

        // Action buttons
        fightVsBot: "Бой с ботом",
        fightVsPlayer: "Бой с игроком",
        allocatePoints: "Распределить очки",
        createFighter: "Создать бойца",
        backToLobby: "В лобби",
        fightAgain: "Сражаться снова",
        attack: "АТАКА!",
        fighting: "Сражение...",

        // Equipment
        inventoryEquipment: "Инвентарь и снаряжение",
        manageItems: "Управляйте предметами и снаряжением",
        inventory: "Инвентарь",
        equippedItems: "Надетые предметы",
        basicSlots: "Основные слоты",
        handSlots: "Слоты рук",
        emptyInventory: "Ваш инвентарь пуст",
        empty: "Пусто",

        // Shop tabs
        basicSlotItems: "Предметы для основных слотов",
        handSlotItems: "Предметы для слотов рук",

        // Settings
        settings: "Настройки",
        customizeExperience: "Настройте игровой опыт",
        language: "Язык",
        chooseLanguage: "Выберите предпочитаемый язык",
        saveSettings: "Сохранить настройки",
        currentLanguage: "Текущий язык",

        // Languages
        languages: {
            en: "Английский",
            ru: "Русский",
            es: "Испанский",
            fr: "Французский",
            de: "Немецкий"
        },

        // Fight screen
        fightArena: "АРЕНА БОЯ",
        battleVsBot: "Битва против бота",
        attackTarget: "Цель атаки",
        defendArea: "Область защиты",
        battleReport: "Отчет о битве",
        victory: "Победа!",
        defeat: "Поражение!",

        // Body parts
        bodyParts: {
            head: "Голова",
            chest: "Грудь",
            stomach: "Живот",
            belt: "Пояс",
            legs: "Ноги"
        },

        // Character creation
        fighterName: "Имя бойца",
        enterFighterName: "Введите имя вашего бойца",
        chooseRace: "Выберите расу",

        // Messages
        settingsSaved: "Настройки сохранены! Язык установлен:",
        languageNotAvailable: "Этот язык пока недоступен. Скоро появится!",
        profileNotLoaded: "Профиль не загружен",
        loadingInventory: "Загрузка инвентаря...",
        loadingEquipment: "Загрузка снаряжения...",
        connectionError: "Ошибка соединения",
        failedToLoad: "Не удалось загрузить",

        // Items
        items: {
            stone: "Камень",
            big_stone: "Большой камень",
            metal_ball: "Металлический шар",
            wooden_stick: "Деревянная палка",
            big_wooden_stick: "Большая деревянная палка",
            knife: "Нож",
            small_club: "Небольшая дубинка",
            blade: "Клинок",
            slingshot: "Рогатка",
            fear_spell: "Заклинание страха",
            scream_spell: "Заклинание крика"
        },

        // Map screen
        map: "Карта",
        gameMap: "Игровая карта",
        exploreWorld: "Исследуйте мир",
        arena: "Арена",
        shop: "Магазин",
        rewardHub: "Центр наград",
        backToLobby: "Вернуться в лобби",

        // Arena screen
        arenaTitle: "АРЕНА БОЯ",
        arenaSubtitle: "Выберите свой бой",
        enterArena: "Войти в арену",

        // Shop screen
        shopTitle: "МАГАЗИН",
        shopSubtitle: "Купить предметы и снаряжение",
        enterShop: "Войти в магазин",

        // Reward Hub screen
        rewardHubTitle: "ЦЕНТР НАГРАД",
        rewardHubSubtitle: "Получить награды",
        enterRewardHub: "Войти в центр наград",

        // Reward Hub tabs
        dailyRewards: "Ежедневные",
        tasks: "Задания",
        lottery: "Лотерея",
        dailyRewardsTab: "Ежедневные награды",
        tasksTab: "Задания",
        lotteryTab: "Лотерея",
        claimReward: "Получить награду",
        rewardClaimed: "Награда получена!",
        comeBackTomorrow: "Возвращайтесь завтра за новыми наградами!",
        noTasksAvailable: "Заданий пока нет",
        buyLotteryTicket: "Купить лотерейный билет",
        lotteryDrawTime: "Следующий розыгрыш через:",
        yourTickets: "Ваши билеты:",
        nextRewardIn: "Следующая награда через:",
        rewardAvailable: "Доступно!",
        spinDrum: "Крутить барабан!",
        spinning: "Крутится...",
        youWon: "Вы выиграли:",
        noTickets: "Нет билетов",
        lotteryResult: "Результат лотереи"
    }
};

// Translation function
function t(key, language = null) {
    const currentLang = language || localStorage.getItem('gameLanguage') || 'en';

    // Handle nested keys (e.g., "races.human")
    const keys = key.split('.');
    let value = translations[currentLang];

    for (const k of keys) {
        value = value && value[k];
    }

    // Fallback to English if translation not found
    if (!value && currentLang !== 'en') {
        let fallback = translations.en;
        for (const k of keys) {
            fallback = fallback && fallback[k];
        }
        value = fallback;
    }

    return value || key;
}

// Get current language
function getCurrentLanguage() {
    return localStorage.getItem('gameLanguage') || 'en';
}

// Set language and trigger reload of current tab if needed
function setLanguage(languageCode) {
    localStorage.setItem('gameLanguage', languageCode);

    // Reload current tab content if we're in the game
    if (window.currentProfile && window.switchTab) {
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
            const tabName = activeTab.id.replace('Tab', '');
            window.switchTab(tabName);
        }
    }
}