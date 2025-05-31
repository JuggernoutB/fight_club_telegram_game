const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const DATA_FILE = path.join(__dirname, "playerProfiles.json");

let playerProfiles = {};

try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    playerProfiles = JSON.parse(data);
    console.log("Loaded player profiles from file.");
  }
} catch (err) {
  console.error("Error loading profiles file:", err);
}

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, "frontend")));

// Function to save profiles to file
function saveProfiles() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(playerProfiles, null, 2));
    console.log("Profiles saved to file.");
  } catch (err) {
    console.error("Error saving profiles:", err);
  }
}

// Reset profiles (both in-memory and file) - useful for tests
function resetProfiles() {
  playerProfiles = {};
  try {
    fs.writeFileSync(DATA_FILE, '{}');
    console.log("Profiles reset to empty.");
  } catch (err) {
    console.error("Error resetting profiles file:", err);
  }
}

// Routes here:

app.post("/create-profile", (req, res) => {
  const { telegram_id, nickname } = req.body;
  console.log("Create profile request:", req.body);
  console.log("Current profiles:", playerProfiles);

  if (!telegram_id || !nickname) {
    return res.status(400).json({ message: "Missing telegram_id or nickname." });
  }

  if (playerProfiles[telegram_id]) {
    return res.status(400).json({ message: "Profile already exists." });
  }

  playerProfiles[telegram_id] = {
    nickname: nickname,
    hp: 10,
    power: 5
  };

  saveProfiles();

  res.json({
    message: "Profile created.",
    profile: playerProfiles[telegram_id]
  });
});

app.post("/fight", (req, res) => {
  const { telegram_id } = req.body;
  console.log("Fight request:", req.body);
  console.log("Current profiles:", playerProfiles);

  const profile = playerProfiles[telegram_id];
  if (!profile) {
    return res.status(400).json({ message: "Profile not found" });
  }

  const win = Math.random() < 0.5;

  if (win) {
    if (Math.random() < 0.5) {
      profile.hp += 1;
    } else {
      profile.power += 1;
    }
    saveProfiles();

    res.json({
      message: "You won! Your stats increased.",
      profile,
    });
  } else {
    profile.hp = Math.max(profile.hp - 1, 1);
    saveProfiles();

    res.json({
      message: "You lost! You lost 1 HP.",
      profile,
    });
  }
});

app.get("/profile/:telegram_id", (req, res) => {
  const telegram_id = req.params.telegram_id;
  const profile = playerProfiles[telegram_id];

  if (profile) {
    res.json({
      exists: true,
      profile: profile
    });
  } else {
    res.json({
      exists: false
    });
  }
});

// Serve index.html at root "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

module.exports = { app, resetProfiles };
