---

# 🥊 Fight Club Telegram Game

A simple web-based fighting game integrated with Telegram using the Telegram Web Apps API, a Node.js backend, and file-based JSON storage for player profiles.

---

## 📖 Project Overview

Players launch the game through a Telegram bot, create a personal profile, and engage in random fights to boost their stats. Player profiles are saved in a local JSON file to persist stats between sessions.

---

## 📂 Project Structure

```
fight_club_telegram_game/
├── frontend/
│   ├── index.html             # Main web page
│   └── script.js              # Frontend logic
├── playerProfiles.json         # JSON file for player profiles
├── server.js                   # Node.js Express backend
├── package.json                # Project dependencies and metadata
└── README.md                   # Project description and instructions
```

---

## 🚀 How to Run the App with Telegram

### 📌 Requirements

* [Node.js](https://nodejs.org/)
* [ngrok](https://ngrok.com/) account and installation
* A Telegram bot with a Web App Game URL

---

### 📥 Install Dependencies

From your project directory:

```bash
npm install
```

---

### ▶️ Run the App

1. **Start the server**

   ```bash
   node server.js
   ```

   The server will start at [http://localhost:3000](http://localhost:3000)

2. **Expose Local Server with Ngrok**

   In a new terminal window:

   ```bash
   ngrok http 3000
   ```

   Copy the generated HTTPS URL (e.g. `https://abc123.ngrok.io`)

3. **Configure Telegram Bot**

   * Open your Telegram app.
   * Start a chat with your bot.
   * Open [BotFather](https://t.me/botfather)
   * Type `/setgame`
   * Choose your game name.
   * Set the **Game URL** to your Ngrok URL (e.g. `https://abc123.ngrok.io`)

4. **Test the Game**

   * In your bot chat, tap **Play Game**
   * Create your player profile.
   * Start fighting battles.
   * Stats will persist between sessions!

---

## 📒 Notes

* Player profiles are stored in `playerProfiles.json`
* Battles are random — winning increases either `hp` or `power`
* Losing decreases `hp` (with a minimum of 1)
* Easy to extend later for:

  * Real player vs. player fights
  * Leaderboards
  * Enhanced stats or inventory systems

---

## 📜 License

MIT — free for personal and educational use.

---

## 🙌 Author

**Dmitrii Belov** — [JuggernoutB](https://github.com/JuggernoutB)

---
