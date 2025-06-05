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

function checkLevelUp(profile) {
  const XP_PER_LEVEL = 10;

  while (profile.experience >= XP_PER_LEVEL) {
    profile.experience -= XP_PER_LEVEL;
    profile.level += 1;
    profile.extra_points += 3;
    console.log(`${profile.nickname} leveled up! Now at level ${profile.level}`);
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
  const { telegram_id, nickname, race, extra_points } = req.body;

  if (!telegram_id || !nickname || !race || !extra_points) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  if (playerProfiles[telegram_id]) {
    return res.status(400).json({ message: "Profile already exists." });
  }

  // Base stats
  let baseStats = {
    hp: 20,
    power: 2,
    agility: 2,
    protection: 2
  };

  // Apply race bonuses
  switch (race) {
    case "human":
      baseStats.hp += 2;
      break;
    case "elf":
      baseStats.agility += 2;
      break;
    case "dwarf":
      baseStats.protection += 2;
      break;
    case "orc":
      baseStats.power += 2;
      break;
    default:
      return res.status(400).json({ message: "Invalid race selected." });
  }

  // Validate extra_points keys and values (non-negative integers)
  const keys = ["hp", "power", "agility", "protection"];
  for (const key of keys) {
    if (!(key in extra_points) || typeof extra_points[key] !== "number" || extra_points[key] < 0) {
      return res.status(400).json({ message: `Invalid extra points for ${key}.` });
    }
  }

  // Calculate total allocated points, must be exactly 5 (for initial creation)
  const totalAllocated = keys.reduce((sum, key) => sum + extra_points[key], 0);
  if (totalAllocated !== 5) {
    return res.status(400).json({ message: "You must allocate exactly 5 extra points." });
  }

  // Add allocated points to base stats
  keys.forEach(key => {
    baseStats[key] += extra_points[key];
  });

  // Create profile object
  playerProfiles[telegram_id] = {
    nickname,
    race,
    hp: baseStats.hp,
    power: baseStats.power,
    agility: baseStats.agility,
    protection: baseStats.protection,
    experience: 0,
    level: 1,
    extra_points: 5 // 5 extra points available at start, for next level up
  };

  saveProfiles();

  res.json({
    message: "Profile created.",
    profile: playerProfiles[telegram_id]
  });
});

app.post("/fight", (req, res) => {
  const { telegram_id, hit, defend } = req.body;
  const player = playerProfiles[telegram_id];

  if (!player) {
    return res.status(400).json({ message: "Profile not found" });
  }

  // Bot randomly picks hit and defend parts
  const parts = ["head", "chest", "stomach", "legs"];
  const botHit = parts[Math.floor(Math.random() * parts.length)];
  const botDefend = parts[Math.floor(Math.random() * parts.length)];

  // Default bot profile
  const bot = {
    hp: 20,
    power: 2,
    agility: 2,
    protection: 2
  };

  let playerDamage = 0;
  let botDamage = 0;
  let log = [];

  // Player attacks bot
  if (botDefend !== hit) {
    // Bot agility chance to avoid
    const avoidChance = Math.min((bot.agility - player.agility) * 5, 75);
    const avoidRoll = Math.random() * 100;
    if (avoidRoll >= avoidChance) {
      playerDamage = player.power;
      bot.hp -= playerDamage;
      log.push(`You hit the bot's ${hit}, dealing ${playerDamage} damage.`);
    } else {
      log.push(`Bot dodged your attack to the ${hit}.`);
    }
  } else {
    // Bot defends
    const diff = player.power - bot.protection;
    if (diff <= 0) {
      log.push(`Bot blocked your attack to the ${hit}.`);
    } else {
      const chance = diff === 1 ? 50 : 100;
      const roll = Math.random() * 100;
      if (roll < chance) {
        playerDamage = diff;
        bot.hp -= playerDamage;
        log.push(`You hit the bot's protected ${hit}, dealing ${playerDamage} damage.`);
      } else {
        log.push(`Bot blocked your attack to the ${hit}.`);
      }
    }
  }

  // Bot attacks player
  if (defend !== botHit) {
    const avoidChance = Math.min((player.agility - bot.agility) * 5, 75);
    const avoidRoll = Math.random() * 100;
    if (avoidRoll >= avoidChance) {
      botDamage = bot.power;
      player.hp -= botDamage;
      log.push(`Bot hit your ${botHit}, dealing ${botDamage} damage.`);
    } else {
      log.push(`You dodged the bot's attack to your ${botHit}.`);
    }
  } else {
    const diff = bot.power - player.protection;
    if (diff <= 0) {
      log.push(`You blocked the bot's attack to your ${botHit}.`);
    } else {
      const chance = diff === 1 ? 50 : 100;
      const roll = Math.random() * 100;
      if (roll < chance) {
        botDamage = diff;
        player.hp -= botDamage;
        log.push(`Bot hit your protected ${botHit}, dealing ${botDamage} damage.`);
      } else {
        log.push(`You blocked the bot's attack to your ${botHit}.`);
      }
    }
  }

  // Check win/loss
  let fightResult = null;
  if (player.hp <= 0) {
    fightResult = "lost";
    log.push("You lost the fight!");
    player.hp = 1;
  } else if (bot.hp <= 0) {
    fightResult = "won";
    log.push("You won the fight!");
    log.push("You gained 1 experience point.");
    player.experience += 1;
    checkLevelUp(player);
  }

  saveProfiles();

  res.json({
    log,
    player,
    fightResult,
    bot
  });
});

app.post("/allocate-points", (req, res) => {
  const { telegram_id, allocation } = req.body;

  if (!telegram_id || !allocation) {
    return res.status(400).json({ message: "Missing telegram_id or allocation." });
  }

  const profile = playerProfiles[telegram_id];
  if (!profile) {
    return res.status(400).json({ message: "Profile not found." });
  }

  const keys = ["hp", "power", "agility", "protection"];

  // Validate allocation keys and values
  for (const key of keys) {
    if (!(key in allocation) || typeof allocation[key] !== "number" || allocation[key] < 0) {
      return res.status(400).json({ message: `Invalid allocation for ${key}.` });
    }
  }

  // Sum allocated points, must be exactly equal to profile.extra_points
  const totalAllocated = keys.reduce((sum, key) => sum + allocation[key], 0);
  if (totalAllocated !== profile.extra_points) {
    return res.status(400).json({ message: `You must allocate exactly ${profile.extra_points} points.` });
  }

  // Apply allocation to profile stats
  keys.forEach(key => {
    profile[key] += allocation[key];
  });

  // Reset extra points after allocation
  profile.extra_points = 0;

  saveProfiles();

  res.json({
    message: "Points allocated successfully.",
    profile
  });
});

app.post("/spend-points", (req, res) => {
  const { telegram_id, points } = req.body;

  const profile = playerProfiles[telegram_id];
  if (!profile) {
    return res.status(400).json({ message: "Profile not found" });
  }

  const totalPointsToSpend = 
    (points.hp || 0) + 
    (points.power || 0) + 
    (points.agility || 0) + 
    (points.protection || 0);

  if (totalPointsToSpend > profile.extra_points) {
    return res.status(400).json({ message: "Not enough extra points" });
  }

  // Spend points
  profile.hp += points.hp || 0;
  profile.power += points.power || 0;
  profile.agility += points.agility || 0;
  profile.protection += points.protection || 0;

  profile.extra_points -= totalPointsToSpend;

  saveProfiles();

  res.json({
    message: "Points spent successfully",
    profile,
  });
});

app.get("/profile/:telegram_id", (req, res) => {
  const telegram_id = req.params.telegram_id;
  const profile = playerProfiles[telegram_id];

  if (profile) {
    res.json({
      exists: true,
      profile: {
        nickname: profile.nickname,
        race: profile.race,
        hp: profile.hp,
        power: profile.power,
        agility: profile.agility,
        protection: profile.protection,
        experience: profile.experience,
        level: profile.level,
        extra_points: profile.extra_points
      }
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

// TEST ONLY: Reset extra points for a player
app.post("/reset-points", (req, res) => {
  const { telegram_id, extra_points } = req.body;

  const profile = playerProfiles[telegram_id];
  if (!profile) {
    return res.status(400).json({ message: "Profile not found" });
  }

  profile.extra_points = extra_points;
  saveProfiles();

  res.json({
    message: `Extra points reset to ${extra_points}`,
    profile,
  });
});

module.exports = { app, resetProfiles };
