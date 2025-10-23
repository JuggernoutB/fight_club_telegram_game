# Fight Club Telegram Game - Project Overview

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Backend Components](#backend-components)
- [Frontend Components](#frontend-components)
- [Data Flow](#data-flow)
- [Game Features](#game-features)
- [Technology Stack](#technology-stack)

## Overview

Fight Club Telegram Game is a web-based fighting game integrated with Telegram using the WebApp API. Players create profiles, allocate stat points, and engage in combat either against AI bots or other players in real-time PvP battles. The game features animated sprite characters and a turn-based combat system with body part targeting.

## Architecture

The application follows a **client-server architecture** with:
- **Backend**: Node.js/Express REST API server
- **Frontend**: Vanilla JavaScript SPA (Single Page Application)
- **Data Storage**: JSON file-based persistence
- **Integration**: Telegram WebApp API
- **Real-time Features**: HTTP polling for PvP functionality

## Project Structure

```
fight_club_telegram_game/
├── 📁 backend/
│   ├── server.js              # Server entry point
│   ├── app.js                 # Main Express application & API routes
│   ├── playerProfiles.json    # Player data storage
│   └── 📁 bot/
│       └── bot.py             # Telegram bot integration
├── 📁 frontend/
│   ├── index.html             # Main game interface
│   ├── players.html           # PvP lobby interface
│   ├── 📁 css/
│   │   └── game-styles.css    # Complete application styling
│   ├── 📁 js/
│   │   ├── main.js            # App initialization & profile management
│   │   ├── api.js             # Backend communication layer
│   │   ├── fight.js           # Combat system & sprite animations
│   │   ├── player.js          # Player stats & profile management
│   │   └── utils.js           # Shared utility functions
│   └── 📁 images/
│       ├── 📁 avatars/        # Race portrait images (64x64)
│       ├── 📁 fighters/       # Static fighter images (128x128)
│       └── 📁 sprites/        # Animated sprite frames (128x128)
│           ├── 📁 human/
│           ├── 📁 elf/
│           ├── 📁 dwarf/
│           └── 📁 orc/
│               ├── 📁 breathe/   # Idle breathing animation
│               ├── 📁 attack/    # Attack animation
│               ├── 📁 defend/    # Defense animation
│               ├── 📁 dodge/     # Dodge animation
│               ├── 📁 win/       # Victory animation
│               └── 📁 loss/      # Defeat animation
├── 📁 docs/
│   └── project-overview.md    # This documentation file
└── 📁 tests/
    └── server.test.js         # Backend unit tests
```

## Backend Components

### 🔧 server.js
**Purpose**: Application entry point
**Functionality**:
- Starts Express server on port 3000
- Imports and initializes the main app from app.js

### 🔧 app.js (Main Backend Logic)
**Purpose**: Core Express application with all API endpoints
**Key Responsibilities**:
- Player profile management (creation, updates, validation)
- Bot combat system with dynamic AI generation
- PvP challenge and fight management
- Stat allocation and leveling system
- Data persistence to JSON files

**API Endpoints**:
- `POST /create-profile` - Create new player profile
- `GET /profile/:telegram_id` - Retrieve player profile
- `POST /fight` - Execute bot fight round
- `POST /start-fight` - Initialize bot fight session
- `POST /allocate-points` - Distribute stat points
- `POST /spend-points` - Spend stat points on upgrades
- `POST /reset-points` - Reset stat allocation
- `GET /players-online` - List online players for PvP
- `POST /challenge` - Send PvP challenge to player
- `POST /cancel-challenge` - Cancel pending challenge
- `GET /check-challenges/:player_id` - Check for incoming challenges
- `POST /join-fight` - Accept PvP challenge
- `POST /create-pvp-fight` - Create PvP fight session
- `POST /submit-pvp-action` - Submit fight actions
- `GET /pvp-fight-status/:fight_id/:player_id` - Get real-time fight status

### 🔧 bot/bot.py
**Purpose**: Telegram bot integration
**Functionality**:
- Provides WebApp launch button when user types /start
- Integrates with Telegram Bot API
- Redirects users to the web application

### 🔧 playerProfiles.json
**Purpose**: Player data persistence
**Structure**: JSON object storing player profiles keyed by Telegram ID
**Contains**: Player stats, experience, level, race, nickname, and fight history

## Frontend Components

### 🌐 index.html (Main Game Page)
**Purpose**: Primary game interface
**Features**:
- Player profile creation and management
- Stat allocation interface
- Bot fighting arena
- Character customization (race selection)
- Sprite animation display

### 🌐 players.html (PvP Lobby)
**Purpose**: Player vs Player interface
**Features**:
- Online players listing
- Challenge system (send/receive/accept)
- Real-time PvP combat interface
- Fight request management
- Interactive body part selection for combat

### 🎨 css/game-styles.css
**Purpose**: Complete application styling
**Features**:
- Responsive design for mobile devices
- Game-themed UI components
- Animation effects for combat
- Telegram WebApp integration styling

## JavaScript Modules

### ⚙️ main.js (Application Bootstrap)
**Purpose**: App initialization and core navigation
**Key Functions**:
- `checkProfile()` - Load and validate player profile on startup
- `createProfile()` - Handle new player registration
- `showLobby()` - Display main menu with game options
- Telegram WebApp API integration and user data extraction

### ⚙️ api.js (Backend Communication)
**Purpose**: HTTP request abstraction layer
**Key Functions**:
- `fightAPI()` - Execute bot combat rounds
- `createProfileAPI()` - Create new player profiles
- `allocatePointsAPI()` - Handle stat point distribution
- Centralized error handling and response parsing

### ⚙️ fight.js (Combat System)
**Purpose**: Bot fights and character animation system
**Key Functions**:
- `showFightScreen()` - Initialize fight interface
- `loadFighterAvatar()` - Load player character (static or animated)
- `loadSpriteAnimation()` - Handle 8-frame sprite animations
- `fight()` - Execute combat rounds and display results
- Body part targeting system (head, chest, stomach, legs)

### ⚙️ player.js (Player Management)
**Purpose**: Player statistics and profile interface
**Key Functions**:
- `showProfile()` - Display detailed player statistics
- `allocatePoints()` - Handle stat point distribution
- `showAllocatePointsScreen()` - Stat allocation interface
- Profile validation and character progression

### ⚙️ utils.js (Shared Utilities)
**Purpose**: Common helper functions
**Key Functions**:
- `renderHPBar()` - Generate visual health bars
- `telegram_id` - Extract Telegram user ID globally
- Reusable UI component generators

## Data Flow

### Player Journey
1. **Telegram Bot** launches WebApp via /start command
2. **index.html** loads and checks for existing player profile
3. **Profile Creation** (if new user) or **Main Lobby** display
4. **Game Mode Selection**: Bot Fight or PvP
5. **Combat Execution** with real-time updates
6. **Results Processing** and experience/level updates

### Combat System Flow
1. **Player Input**: Select attack target and defense area
2. **API Request**: Send combat actions to backend
3. **Server Processing**: Calculate damage, generate bot response
4. **Response Handling**: Update UI with results
5. **Animation Trigger**: Display appropriate sprite animations
6. **State Update**: Refresh health bars and stats

### Real-time PvP Flow
1. **Challenge System**: Send/receive fight requests
2. **Fight Creation**: Generate unique fight sessions
3. **Action Submission**: Both players submit moves
4. **Synchronization**: Wait for both actions via polling
5. **Resolution**: Calculate and display results
6. **Round Continuation**: Repeat until victory/defeat

## Game Features

### Character System
- **4 Races**: Human, Elf, Dwarf, Orc
- **4 Stats**: Power (attack), Agility (speed), Protection (defense), HP (health)
- **Leveling System**: Gain experience, level up, earn stat points
- **Customization**: Allocate stat points to create unique builds

### Combat Mechanics
- **Body Part Targeting**: Attack head, chest, stomach, or legs
- **Defense System**: Choose which body part to protect
- **Damage Calculation**: Based on attacker power vs defender protection
- **Critical Hits**: Enhanced damage for successful hits
- **AI Opponents**: Dynamic bot generation with scaling difficulty

### Visual Features
- **Sprite Animations**: 8-frame character animations (breathing, attacking, defending)
- **Race-specific Graphics**: Unique visuals for each character race
- **Interactive UI**: Touch-friendly interface for mobile devices
- **Real-time Updates**: Live health bars and status indicators

### Social Features
- **PvP System**: Real-time player vs player combat
- **Online Players**: See who's available for challenges
- **Challenge System**: Send and receive fight requests
- **Leaderboards**: Track wins, losses, and progression

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Data Storage**: JSON files
- **HTTP Handling**: Body-parser, CORS
- **Testing**: Jest, Supertest

### Frontend
- **Core**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with Flexbox/Grid
- **Integration**: Telegram WebApp API
- **Images**: PNG sprites (128x128 pixels)
- **Architecture**: Modular JavaScript without frameworks

### Integration
- **Telegram Bot**: Python with pyTelegramBotAPI
- **WebApp**: Telegram WebApp API
- **Communication**: RESTful HTTP API
- **Real-time**: HTTP polling (no WebSockets)

### Development
- **Version Control**: Git
- **Testing**: Jest unit tests
- **Documentation**: Markdown files
- **Deployment**: Simple Node.js server hosting

This architecture provides a scalable foundation for a browser-based fighting game while maintaining simplicity and ease of deployment.