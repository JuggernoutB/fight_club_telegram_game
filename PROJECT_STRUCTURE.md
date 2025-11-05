# 🗡️ Fight Club Telegram Game - Project Structure

## 📁 **Clean Project Overview (29 essential files)**

### 🎮 **Main Game Application**
```
bot/bot.py             # Telegram bot entry point (START HERE)
app.js                 # Main Telegram game server
server.js              # Frontend web server
playerProfiles.json    # Player data storage
package.json           # Dependencies
package-lock.json      # Dependency lock file
```

### ⚔️ **Shared Combat Engine**
```
combat_engine.js       # JavaScript combat engine
combat_engine/         # Python combat engine package
├── __init__.py        # Package initialization
├── combat_constants.py # Game constants and race defaults
├── damage_calculator.py # Core damage calculation logic
├── equipment_effects.py # Equipment creation and effects
├── player_stats.py    # Player creation and stat management
└── xp_calculator.py   # XP progression system

xp_calculator.js       # JavaScript XP calculation module
```

### 🌐 **Frontend Web Interface**
```
frontend/
├── index.html         # Main game interface
├── players.html       # Player management page
└── js/               # JavaScript modules
    ├── api.js         # API communication
    ├── fight.js       # Fight mechanics
    ├── main.js        # Main application logic
    ├── player.js      # Player management
    ├── translations.js # Internationalization
    └── utils.js       # Utility functions
```

### 📊 **Game Analyzer**
```
game_analyzer/
├── game_analyzer.py   # Main analysis web app
└── templates/
    └── index.html     # Analyzer web interface
```

### 🎬 **Sprite Animator**
```
sprite_animator/
├── index.html         # Animation tool interface
├── README.md          # Usage documentation
└── sample_sprites/    # Sprite files folder
    ├── README.md      # File naming guide
    └── Giant Goblin/  # Sample character sprites
```

### 📚 **Documentation**
```
README.md              # Main project documentation
PROJECT_STRUCTURE.md   # This file
docs/
├── fight-logic.md     # Combat system documentation
└── project-overview.md # Detailed project overview
```

### 🧪 **Testing**
```
tests/
└── server.test.js     # Server tests
```

## ✅ **Cleaned Up (Removed 75+ files)**

- ❌ **70+ test files** (`test_*.py`, `debug_*.py`)
- ❌ **Old XP test files** (`test_*.js`)
- ❌ **Unused bot folder**
- ❌ **Development debug scripts**

## 🚀 **How to Use**

1. **Start Telegram Bot**: `python3 bot/bot.py` (MAIN ENTRY POINT)
2. **Start Game Backend**: `node app.js` (in separate terminal)
3. **Start Frontend**: `node server.js` (in separate terminal)
4. **Run Game Analyzer**: `cd game_analyzer && python3 game_analyzer.py`
5. **Use Sprite Animator**: Open `sprite_animator/index.html`

## 🎯 **Key Features**

- **Shared Combat Logic**: Both Python and JavaScript versions use identical calculations
- **Modular Architecture**: Clean separation of concerns
- **Cross-Platform**: Web frontend + Telegram backend
- **Animation Tools**: Built-in sprite animation testing
- **Game Analysis**: Comprehensive balance testing tools

Project is now clean, organized, and production-ready! 🎮✨