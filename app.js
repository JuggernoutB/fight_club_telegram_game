const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const DATA_FILE = path.join(__dirname, "playerProfiles.json");

let playerProfiles = {};
let challenges = {}; // Store pending challenges: { challenger_id: { target_id, challenger_nickname, timestamp } }
let pvpFights = {}; // Store active PvP fights: { fight_id: { player1_id, player2_id, player1_action, player2_action, round, status, etc. } }

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
    extra_points: 0,
    last_seen: Date.now()
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
  const bot = player.currentBot;

  if (!bot) {
    return res.status(400).json({ message: "No ongoing fight found. Start a fight first." });
  }

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
      bot.hp = Math.max(bot.hp - playerDamage, 0);
      log.push(`You hit the bot's ${hit},bot HP ${bot.hp}, dealing ${playerDamage} damage.`);
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
        bot.hp = Math.max(bot.hp - playerDamage, 0);
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
      player.currentHP = Math.max(player.currentHP - botDamage, 0);
      log.push(`Bot hit your ${botHit}, your HP is ${player.currentHP}, dealing ${botDamage} damage.`);
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
        player.currentHP = Math.max(player.currentHP - botDamage, 0);
        log.push(`Bot hit your protected ${botHit}, dealing ${botDamage} damage.`);
      } else {
        log.push(`You blocked the bot's attack to your ${botHit}.`);
      }
    }
  }

  // Check win/loss
  let fightResult = null;
  if (player.currentHP <= 0) {
    fightResult = "lost";
    log.push("You lost the fight!");
    // Reset current HP, keep profile HP stat unchanged
    delete player.currentHP;
    delete player.currentBot;
  } else if (bot.hp <= 0) {
    fightResult = "won";
    log.push("You won the fight!");
    log.push("You gained 1 experience point.");
    player.experience += 1;
    checkLevelUp(player);
    delete player.currentHP;
    delete player.currentBot;
  }

  // update last_seen on activity
  if (player) {
    player.last_seen = Date.now();
  }
  saveProfiles();

  // Send structured response with current and max HP
  const playerHP = player.currentHP !== undefined ? player.currentHP : player.hp;
  res.json({
    log,
    player: {
      ...player,
      hp: playerHP,
      maxHP: player.hp
    },
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

  // update last_seen on activity
  profile.last_seen = Date.now();

  saveProfiles();

  res.json({
    message: "Points allocated successfully.",
    profile
  });
});

// New endpoint to initialize a fight by sending bot stats
app.post("/start-fight", (req, res) => {
  const { telegram_id } = req.body;

  if (!telegram_id) {
    return res.status(400).json({ message: "Missing telegram_id" });
  }

  const player = playerProfiles[telegram_id];
  if (!player) {
    return res.status(400).json({ message: "Profile not found" });
  }

  // Start fight with full HP (save max HP for proper tracking)
  const playerMaxHP = player.hp;
  player.currentBot = {
    hp: 20,
    power: 2,
    agility: 2,
    protection: 2
  };

  // Track current HP during fight separately from profile HP stat
  player.currentHP = playerMaxHP;

  // update last_seen on activity
  player.last_seen = Date.now();

  res.json({
    player: {
      ...player,
      hp: player.currentHP,
      maxHP: player.hp
    },
    bot: player.currentBot
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

  // update last_seen on activity
  profile.last_seen = Date.now();

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
    // update last_seen on read
    profile.last_seen = Date.now();
    saveProfiles();
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
  profile.last_seen = Date.now();
  saveProfiles();

  res.json({
    message: `Extra points reset to ${extra_points}`,
    profile,
  });
});

// List players online (seen within the last N milliseconds)
app.get("/players-online", (req, res) => {
  const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();
  const currentPlayerId = req.query.exclude; // optional query param to exclude current player

  const players = Object.entries(playerProfiles)
    .filter(([, p]) => p && p.nickname && typeof p.level === 'number')
    .filter(([, p]) => {
      const ls = p.last_seen || 0;
      return now - ls <= ONLINE_WINDOW_MS;
    })
    .filter(([telegram_id]) => !currentPlayerId || telegram_id !== currentPlayerId) // exclude current player if specified
    .map(([telegram_id, p]) => ({ telegram_id, nickname: p.nickname, level: p.level }));

  res.json({ players });
});

// Challenge system for PvP fights
app.post("/challenge", (req, res) => {
  const { challenger_id, target_id, challenger_nickname } = req.body;

  if (!challenger_id || !target_id || !challenger_nickname) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Check if both players exist
  if (!playerProfiles[challenger_id] || !playerProfiles[target_id]) {
    return res.status(400).json({ message: "One or both players not found" });
  }

  // Store the challenge
  challenges[target_id] = {
    challenger_id,
    challenger_nickname,
    timestamp: Date.now()
  };

  // Also store the challenge for the challenger so they can check if it was accepted
  challenges[challenger_id] = {
    target_id,
    target_nickname: playerProfiles[target_id].nickname,
    timestamp: Date.now(),
    is_challenger: true
  };

  res.json({ message: "Challenge sent successfully" });
});

// Cancel challenge
app.post("/cancel-challenge", (req, res) => {
  const { challenger_id, target_id, cancelled_by } = req.body;
  
  if (!challenger_id || !target_id || !cancelled_by) {
    return res.status(400).json({ message: "Missing player IDs or cancelled_by" });
  }
  
  // Notify the other player that challenge was cancelled
  const other_player_id = cancelled_by === challenger_id ? target_id : challenger_id;
  
  challenges[other_player_id] = {
    challenger_id,
    target_id,
    status: 'cancelled',
    cancelled_by,
    timestamp: Date.now()
  };
  
  // Remove original challenge
  delete challenges[target_id];
  delete challenges[challenger_id];
  
  res.json({ message: "Challenge cancelled successfully" });
});

// Check for incoming challenges
app.get("/check-challenges/:player_id", (req, res) => {
  const player_id = req.params.player_id;

  if (challenges[player_id]) {
    const challenge = challenges[player_id];

    // Only delete cancelled or accepted challenges after retrieving them
    // Keep pending challenges so they persist in the requests tab
    if (challenge.status === 'cancelled' || challenge.status === 'accepted') {
      delete challenges[player_id];
    }

    if (challenge.is_challenger) {
      res.json({
        hasChallenge: true,
        challenge: {
          target_nickname: challenge.target_nickname,
          target_id: challenge.target_id,
          is_challenger: true,
          status: challenge.status || 'pending',
          timestamp: challenge.timestamp
        }
      });
    } else if (challenge.status === 'cancelled') {
      res.json({
        hasChallenge: true,
        challenge: {
          challenger_id: challenge.challenger_id,
          target_id: challenge.target_id,
          status: 'cancelled',
          cancelled_by: challenge.cancelled_by
        }
      });
    } else if (challenge.status === 'accepted') {
      res.json({
        hasChallenge: true,
        challenge: {
          target_nickname: challenge.target_nickname,
          fight_id: challenge.fight_id,
          is_challenger: true,
          status: 'accepted'
        }
      });
    } else {
      res.json({
        hasChallenge: true,
        challenge: {
          challenger_nickname: challenge.challenger_nickname,
          challenger_id: challenge.challenger_id,
          is_challenger: false,
          timestamp: challenge.timestamp
        }
      });
    }
  } else {
    res.json({ hasChallenge: false });
  }
});

// Accept challenge (basic implementation)
app.post("/join-fight", (req, res) => {
  console.log('=== /join-fight called ===');
  console.log('Request body:', req.body);

  const { challenger_id, target_id } = req.body;

  if (!challenger_id || !target_id) {
    console.log('Missing player IDs:', { challenger_id, target_id });
    return res.status(400).json({ message: "Missing player IDs" });
  }

  // Check if both players exist
  if (!playerProfiles[challenger_id] || !playerProfiles[target_id]) {
    console.log('Player not found:', {
      challenger_exists: !!playerProfiles[challenger_id],
      target_exists: !!playerProfiles[target_id]
    });
    return res.status(400).json({ message: "One or both players not found" });
  }

  // Store original HP values (don't modify profiles!)
  const challengerMaxHP = playerProfiles[challenger_id].hp;
  const targetMaxHP = playerProfiles[target_id].hp;

  // Create the shared PvP fight when challenge is accepted
  const fight_id = `fight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create fight record with both players at full HP
  pvpFights[fight_id] = {
    player1_id: challenger_id,  // The original challenger
    player2_id: target_id,      // The target who accepted
    player1_stats: {
      hp: playerProfiles[challenger_id].hp,  // Always start at full HP
      maxHP: playerProfiles[challenger_id].hp,
      power: playerProfiles[challenger_id].power,
      agility: playerProfiles[challenger_id].agility,
      protection: playerProfiles[challenger_id].protection
    },
    player2_stats: {
      hp: playerProfiles[target_id].hp,  // Always start at full HP
      maxHP: playerProfiles[target_id].hp,
      power: playerProfiles[target_id].power,
      agility: playerProfiles[target_id].agility,
      protection: playerProfiles[target_id].protection
    },
    player1_action: null,
    player2_action: null,
    round: 1,
    status: 'waiting',
    fullLog: [],
    created_at: Date.now(),
    round_start_time: Date.now()
  };

  // Notify the challenger that their challenge was accepted and include fight_id
  challenges[challenger_id] = {
    target_id,
    target_nickname: playerProfiles[target_id].nickname,
    status: 'accepted',
    timestamp: Date.now(),
    fight_id: fight_id  // Add fight ID for Player #1 to use
  };

  // Remove the original challenge from the target (Player #2) so it doesn't appear in requests tab
  delete challenges[target_id];

  // Set a timer to clean up the "accepted" notification after a longer delay
  setTimeout(() => {
    delete challenges[challenger_id];
  }, 15000); // Remove after 15 seconds (gives multiple polling cycles)

  console.log('Created shared fight:', fight_id);
  console.log('Returning fight_id to Player #2:', fight_id);

  res.json({
    message: "Fight accepted",
    opponent_nickname: playerProfiles[challenger_id].nickname,
    fight_id: fight_id  // Return fight ID to Player #2
  });
  console.log('=== /join-fight completed ===');
});

// Create PvP fight
app.post("/create-pvp-fight", (req, res) => {
  console.log('=== /create-pvp-fight called (SHOULD NOT HAPPEN IN CHALLENGE FLOW) ===');
  console.log('Request body:', req.body);

  const { player_id, opponent_nickname } = req.body;

  if (!player_id || !opponent_nickname) {
    return res.status(400).json({ message: "Missing player ID or opponent nickname" });
  }

  // Find opponent by nickname
  const opponent = Object.values(playerProfiles).find(p => p.nickname === opponent_nickname);
  if (!opponent) {
    return res.status(400).json({ message: "Opponent not found" });
  }

  // Find opponent ID
  const opponent_id = Object.keys(playerProfiles).find(id => playerProfiles[id].nickname === opponent_nickname);

  // Generate unique fight ID
  const fight_id = `fight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create fight record
  pvpFights[fight_id] = {
    player1_id: player_id,
    player2_id: opponent_id,
    player1_stats: {
      hp: playerProfiles[player_id].hp,
      maxHP: playerProfiles[player_id].hp,
      power: playerProfiles[player_id].power,
      agility: playerProfiles[player_id].agility,
      protection: playerProfiles[player_id].protection
    },
    player2_stats: {
      hp: playerProfiles[opponent_id].hp,
      maxHP: playerProfiles[opponent_id].hp,
      power: playerProfiles[opponent_id].power,
      agility: playerProfiles[opponent_id].agility,
      protection: playerProfiles[opponent_id].protection
    },
    player1_action: null,
    player2_action: null,
    round: 1,
    status: 'waiting',
    fullLog: [],
    created_at: Date.now(),
    round_start_time: Date.now()
  };

  res.json({ fight_id });
});

// Submit PvP action
app.post("/submit-pvp-action", (req, res) => {
  const { fight_id, player_id, hit, defend } = req.body;

  if (!fight_id || !player_id || !hit || !defend) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  const fight = pvpFights[fight_id];
  if (!fight) {
    return res.status(404).json({ message: "Fight not found" });
  }

  if (fight.status !== 'waiting') {
    return res.status(400).json({ message: "Fight is not accepting actions" });
  }

  // Store player action
  if (player_id === fight.player1_id) {
    fight.player1_action = { hit, defend, timestamp: Date.now() };
    console.log(`Fight ${fight_id}: Player 1 (${player_id}) submitted action`);
  } else if (player_id === fight.player2_id) {
    fight.player2_action = { hit, defend, timestamp: Date.now() };
    console.log(`Fight ${fight_id}: Player 2 (${player_id}) submitted action`);
  } else {
    return res.status(400).json({ message: "Invalid player ID for this fight" });
  }

  console.log(`Fight ${fight_id} state: P1 action: ${!!fight.player1_action}, P2 action: ${!!fight.player2_action}`);

  // Check if both players have submitted
  if (fight.player1_action && fight.player2_action) {
    // Process the round
    console.log(`Processing round for fight ${fight_id}: both players submitted`);
    processRound(fight_id);
  } else {
    console.log(`Fight ${fight_id}: Player ${player_id} submitted, waiting for opponent`);
  }

  res.json({ message: "Action submitted" });
});

// Get PvP fight status
app.get("/pvp-fight-status/:fight_id/:player_id", (req, res) => {
  const { fight_id, player_id } = req.params;

  const fight = pvpFights[fight_id];
  if (!fight) {
    return res.status(404).json({ message: "Fight not found" });
  }

  // Check for timeout (30 seconds) - but only if not both players have submitted
  const now = Date.now();
  const timeSinceRoundStart = now - fight.round_start_time;
  const bothSubmitted = !!fight.player1_action && !!fight.player2_action;

  if (timeSinceRoundStart > 120000 && fight.status === 'waiting' && !bothSubmitted) {
    // Handle timeout only if both haven't submitted
    handleRoundTimeout(fight_id);
  }

  // Determine player stats based on which player is requesting
  let playerStats, opponentStats, opponentId, opponentProfile;
  if (player_id === fight.player1_id) {
    playerStats = fight.player1_stats;
    opponentStats = fight.player2_stats;
    opponentId = fight.player2_id;
  } else {
    playerStats = fight.player2_stats;
    opponentStats = fight.player1_stats;
    opponentId = fight.player1_id;
  }

  // Get opponent profile information for frontend
  opponentProfile = {
    nickname: playerProfiles[opponentId].nickname,
    race: playerProfiles[opponentId].race
  };

  const response = {
    status: fight.status,
    playerStats,
    opponentStats,
    opponentProfile,
    my_action_submitted: player_id === fight.player1_id ? !!fight.player1_action : !!fight.player2_action,
    opponent_action_submitted: player_id === fight.player1_id ? !!fight.player2_action : !!fight.player1_action,
    isPlayer1: player_id === fight.player1_id
  };

  // Add round results if available
  if (fight.lastRoundResults) {
    response.roundResults = fight.lastRoundResults;
  }

  // Add final results if fight is complete
  if (fight.status === 'fight_complete' && fight.finalResults) {
    // Adjust final results based on player perspective
    let adjustedResults = { ...fight.finalResults };

    // Determine if this player won
    let isWinner = false;
    if (fight.finalResults.winner !== "Draw" && fight.finalResults.winner.includes(playerProfiles[player_id].nickname)) {
      isWinner = true;
      adjustedResults.xpGained = fight.finalResults.xpGained;
    } else {
      adjustedResults.xpGained = 0;
    }

    // Add clear winner indicator for frontend
    adjustedResults.isWinner = isWinner;

    response.finalResults = adjustedResults;
  }

  res.json(response);
});

// Helper function to process a round
function processRound(fight_id) {
  console.log(`processRound called for fight ${fight_id}`);
  const fight = pvpFights[fight_id];
  if (!fight) {
    console.log(`processRound: Fight ${fight_id} not found!`);
    return;
  }

  const p1Action = fight.player1_action;
  const p2Action = fight.player2_action;

  const player1 = fight.player1_stats;
  const player2 = fight.player2_stats;

  let roundLog = [];
  let p1Damage = 0;
  let p2Damage = 0;

  // Player 1 attacks Player 2
  if (p1Action.hit !== p2Action.defend) {
    // Calculate damage - same logic as bot fights
    const avoidChance = Math.min((player2.agility - player1.agility) * 5, 75);
    const avoidRoll = Math.random() * 100;
    if (avoidRoll >= avoidChance) {
      p1Damage = player1.power;
      player2.hp = Math.max(player2.hp - p1Damage, 0);
      roundLog.push(`${playerProfiles[fight.player1_id].nickname} hit ${playerProfiles[fight.player2_id].nickname}'s ${p1Action.hit}, dealing ${p1Damage} damage.`);
    } else {
      roundLog.push(`${playerProfiles[fight.player2_id].nickname} dodged ${playerProfiles[fight.player1_id].nickname}'s attack to the ${p1Action.hit}.`);
    }
  } else {
    // Player 2 defends against Player 1's attack
    const diff = player1.power - player2.protection;
    if (diff <= 0) {
      roundLog.push(`${playerProfiles[fight.player2_id].nickname} blocked ${playerProfiles[fight.player1_id].nickname}'s attack to the ${p1Action.hit}.`);
    } else {
      const chance = diff === 1 ? 50 : 100;
      const roll = Math.random() * 100;
      if (roll < chance) {
        p1Damage = diff;
        player2.hp = Math.max(player2.hp - p1Damage, 0);
        roundLog.push(`${playerProfiles[fight.player1_id].nickname} hit ${playerProfiles[fight.player2_id].nickname}'s protected ${p1Action.hit}, dealing ${p1Damage} damage.`);
      } else {
        roundLog.push(`${playerProfiles[fight.player2_id].nickname} blocked ${playerProfiles[fight.player1_id].nickname}'s attack to the ${p1Action.hit}.`);
      }
    }
  }

  // Player 2 attacks Player 1
  if (p2Action.hit !== p1Action.defend) {
    // Calculate damage
    const avoidChance = Math.min((player1.agility - player2.agility) * 5, 75);
    const avoidRoll = Math.random() * 100;
    if (avoidRoll >= avoidChance) {
      p2Damage = player2.power;
      player1.hp = Math.max(player1.hp - p2Damage, 0);
      roundLog.push(`${playerProfiles[fight.player2_id].nickname} hit ${playerProfiles[fight.player1_id].nickname}'s ${p2Action.hit}, dealing ${p2Damage} damage.`);
    } else {
      roundLog.push(`${playerProfiles[fight.player1_id].nickname} dodged ${playerProfiles[fight.player2_id].nickname}'s attack to the ${p2Action.hit}.`);
    }
  } else {
    // Player 1 defends against Player 2's attack
    const diff = player2.power - player1.protection;
    if (diff <= 0) {
      roundLog.push(`${playerProfiles[fight.player1_id].nickname} blocked ${playerProfiles[fight.player2_id].nickname}'s attack to the ${p2Action.hit}.`);
    } else {
      const chance = diff === 1 ? 50 : 100;
      const roll = Math.random() * 100;
      if (roll < chance) {
        p2Damage = diff;
        player1.hp = Math.max(player1.hp - p2Damage, 0);
        roundLog.push(`${playerProfiles[fight.player2_id].nickname} hit ${playerProfiles[fight.player1_id].nickname}'s protected ${p2Action.hit}, dealing ${p2Damage} damage.`);
      } else {
        roundLog.push(`${playerProfiles[fight.player1_id].nickname} blocked ${playerProfiles[fight.player2_id].nickname}'s attack to the ${p2Action.hit}.`);
      }
    }
  }

  // Add to full log
  fight.fullLog.push(...roundLog);

  // Check if fight is over
  if (player1.hp <= 0 || player2.hp <= 0) {
    // Fight is complete
    let winner, loser, winnerProfile, loserProfile;

    if (player1.hp <= 0 && player2.hp <= 0) {
      // Draw
      winner = "Draw";
    } else if (player1.hp <= 0) {
      winner = playerProfiles[fight.player2_id].nickname;
      loser = fight.player1_id;
      winnerProfile = playerProfiles[fight.player2_id];
      loserProfile = playerProfiles[fight.player1_id];
    } else {
      winner = playerProfiles[fight.player1_id].nickname;
      loser = fight.player2_id;
      winnerProfile = playerProfiles[fight.player1_id];
      loserProfile = playerProfiles[fight.player2_id];
    }

    // Award XP if there's a winner
    let xpGained = 0;
    if (winner !== "Draw") {
      xpGained = 1; // Same as bot fights
      winnerProfile.experience = (winnerProfile.experience || 0) + xpGained;
      checkLevelUp(winnerProfile);
      saveProfiles();
    }

    fight.status = 'fight_complete';
    fight.finalResults = {
      winner,
      playerHP: player1.hp,
      opponentHP: player2.hp,
      xpGained: winner !== "Draw" ? xpGained : 0,
      fullLog: fight.fullLog
    };

    // Clean up fight after some time
    setTimeout(() => {
      delete pvpFights[fight_id];
    }, 60000); // Remove after 1 minute

  } else {
    // Continue to next round
    fight.round++;
    fight.status = 'round_complete';
    fight.lastRoundResults = {
      log: roundLog,
      playerHP: player1.hp,
      opponentHP: player2.hp,
      player1Actions: fight.player1_action,
      player2Actions: fight.player2_action
    };

    // Reset actions for next round
    fight.player1_action = null;
    fight.player2_action = null;
    fight.round_start_time = Date.now();

    // Auto-transition back to waiting after 3 seconds
    setTimeout(() => {
      if (fight.status === 'round_complete') {
        console.log(`Fight ${fight_id}: Transitioning from round_complete to waiting`);
        fight.status = 'waiting';
        fight.lastRoundResults = null; // Clear round results
      }
    }, 3000);
  }

  console.log(`processRound completed for fight ${fight_id}, status: ${fight.status}`);
}

// Helper function to handle round timeout
function handleRoundTimeout(fight_id) {
  const fight = pvpFights[fight_id];
  if (!fight) return;

  const p1Submitted = !!fight.player1_action;
  const p2Submitted = !!fight.player2_action;

  console.log(`Timeout for fight ${fight_id}: Player1 submitted: ${p1Submitted}, Player2 submitted: ${p2Submitted}`);

  if (!p1Submitted && !p2Submitted) {
    // Both players timed out - draw
    fight.status = 'fight_complete';
    fight.finalResults = {
      winner: "Draw (timeout)",
      playerHP: fight.player1_stats.hp,
      opponentHP: fight.player2_stats.hp,
      xpGained: 0,
      fullLog: [...fight.fullLog, "Both players timed out. No winner."]
    };
  } else if (!p1Submitted) {
    // Player 1 timed out - Player 2 wins
    const winnerProfile = playerProfiles[fight.player2_id];
    winnerProfile.experience = (winnerProfile.experience || 0) + 1;
    checkLevelUp(winnerProfile);
    saveProfiles();

    fight.status = 'fight_complete';
    fight.finalResults = {
      winner: winnerProfile.nickname + " (opponent timeout)",
      playerHP: fight.player1_stats.hp,
      opponentHP: fight.player2_stats.hp,
      xpGained: 1,
      fullLog: [...fight.fullLog, `${winnerProfile.nickname} wins by timeout.`]
    };
  } else if (!p2Submitted) {
    // Player 2 timed out - Player 1 wins
    const winnerProfile = playerProfiles[fight.player1_id];
    winnerProfile.experience = (winnerProfile.experience || 0) + 1;
    checkLevelUp(winnerProfile);
    saveProfiles();

    fight.status = 'fight_complete';
    fight.finalResults = {
      winner: winnerProfile.nickname + " (opponent timeout)",
      playerHP: fight.player1_stats.hp,
      opponentHP: fight.player2_stats.hp,
      xpGained: 1,
      fullLog: [...fight.fullLog, `${winnerProfile.nickname} wins by timeout.`]
    };
  }

  // Clean up fight after timeout
  setTimeout(() => {
    delete pvpFights[fight_id];
  }, 60000);
}

// Clean up old challenges and fights (optional - run periodically)
setInterval(() => {
  const now = Date.now();
  const CHALLENGE_TIMEOUT = 30 * 1000; // 30 seconds
  
  // Clean up old challenges
  Object.keys(challenges).forEach(target_id => {
    if (now - challenges[target_id].timestamp > CHALLENGE_TIMEOUT) {
      delete challenges[target_id];
    }
  });

  // Clean up old PvP fights (older than 5 minutes)
  const FIGHT_CLEANUP_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  Object.keys(pvpFights).forEach(fight_id => {
    const fight = pvpFights[fight_id];
    if (now - fight.created_at > FIGHT_CLEANUP_TIMEOUT) {
      delete pvpFights[fight_id];
    }
  });
  
}, 10000); // Check every 10 seconds

module.exports = { app, resetProfiles };
