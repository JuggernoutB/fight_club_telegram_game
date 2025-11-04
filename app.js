const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const DATA_FILE = path.join(__dirname, "playerProfiles.json");

let playerProfiles = {};
let challenges = {}; // Store pending challenges: { challenger_id: { target_id, challenger_nickname, timestamp } }
let pvpFights = {}; // Store active PvP fights: { fight_id: { player1_id, player2_id, player1_action, player2_action, round, status, etc. } }

// Item definitions from game analyzer
const ITEMS = {
  // Level 1 items
  stone: { name: "Stone", level: 1, slot: "basic", uses: 1, damage_multiplier: 1.1, type: "projectile" },
  wooden_stick: { name: "Wooden Stick", level: 1, slot: "hand", uses: 999, damage_multiplier: 1.06, type: "melee" },

  // Level 2 items
  big_stone: { name: "Big Stone", level: 2, slot: "basic", uses: 1, damage_multiplier: 1.1, type: "projectile" },
  big_wooden_stick: { name: "Big Wooden Stick", level: 2, slot: "hand", uses: 999, damage_multiplier: 1.06, type: "melee" },
  knife: { name: "Knife", level: 2, slot: "hand", uses: 999, damage_multiplier: 1.04, type: "melee", no_dual_penalty: true },

  // Level 3 items
  metal_ball: { name: "Metal Ball", level: 3, slot: "basic", uses: 1, damage_multiplier: 1.1, type: "projectile" },
  small_club: { name: "Small Club", level: 3, slot: "hand", uses: 999, damage_multiplier: 1.06, type: "melee", dual_penalty: 0.25 },
  blade: { name: "Blade", level: 3, slot: "hand", uses: 999, damage_multiplier: 1.04, type: "melee", no_dual_penalty: true },

  // Special items
  slingshot: { name: "Slingshot", level: 1, slot: "hand", uses: 999, stone_bonus: 0.3, type: "enhancement", max_per_player: 1 },

  // Spells
  fear_spell: { name: "Fear Spell", level: 1, slot: "basic", mana_cost: 3, knowledge_req: 1, type: "spell" },
  scream_spell: { name: "Scream Spell", level: 2, slot: "basic", mana_cost: 4, knowledge_req: 2, type: "spell" }
};

// Race equipment slot configuration
const RACE_EQUIPMENT_SLOTS = {
  human: { basic_slots: 2, hand_slots: 2 },
  elf: { basic_slots: 2, hand_slots: 2 },
  orc: { basic_slots: 1, hand_slots: 2 },
  dwarf: { basic_slots: 1, hand_slots: 2 },
  skeleton: { basic_slots: 1, hand_slots: 2 }
};

try {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    playerProfiles = JSON.parse(data);
    console.log("Loaded player profiles from file.");

    // Migrate old profiles to new stat system
    migratePlayerProfiles();
  }
} catch (err) {
  console.error("Error loading profiles file:", err);
}

function migratePlayerProfiles() {
  let needsSave = false;

  Object.keys(playerProfiles).forEach(playerId => {
    const profile = playerProfiles[playerId];

    // Migrate defense to defense
    if (profile.defense !== undefined && profile.defense === undefined) {
      profile.defense = profile.defense;
      delete profile.defense;
      needsSave = true;
      console.log(`Migrated ${profile.nickname}: defense -> defense`);
    }

    // Add knowledge stat if missing or recalculate for current level
    const correctKnowledge = calculateKnowledgeForLevel(profile.race, profile.level || 1);
    if (profile.knowledge === undefined || profile.knowledge !== correctKnowledge) {
      const oldKnowledge = profile.knowledge || 0;
      profile.knowledge = correctKnowledge;
      needsSave = true;
      console.log(`Updated knowledge for ${profile.nickname}: ${oldKnowledge} -> ${correctKnowledge} (level ${profile.level || 1})`);
    }

    // Add mana fields if missing or recalculate based on knowledge
    const correctMaxMana = profile.knowledge * 3;
    if (profile.maxMana === undefined || profile.maxMana !== correctMaxMana) {
      profile.maxMana = correctMaxMana;
      profile.mana = correctMaxMana; // Start with full mana
      needsSave = true;
      console.log(`Updated mana for ${profile.nickname}: ${correctMaxMana} max mana`);
    }

    // Add equipment slots if missing
    if (!profile.equipment) {
      const slots = RACE_EQUIPMENT_SLOTS[profile.race] || RACE_EQUIPMENT_SLOTS.human;
      profile.equipment = {
        basic_slots: Array(slots.basic_slots).fill(null),
        hand_slots: Array(slots.hand_slots).fill(null)
      };
      needsSave = true;
      console.log(`Added equipment slots for ${profile.nickname}: ${slots.basic_slots} basic, ${slots.hand_slots} hand`);
    }

    // Add inventory if missing
    if (!profile.inventory) {
      profile.inventory = {};
      needsSave = true;
      console.log(`Added inventory for ${profile.nickname}`);
    }

    // Give starter items based on player level
    let gaveStarterItems = false;
    const playerLevel = profile.level || 1;

    // Level 1 starter items
    if (playerLevel >= 1) {
      if (!profile.inventory.stone) {
        profile.inventory.stone = 3; // 3 stones
        gaveStarterItems = true;
      }
      if (!profile.inventory.wooden_stick) {
        profile.inventory.wooden_stick = 1; // 1 wooden stick
        gaveStarterItems = true;
      }
    }

    // Level 2 additional items
    if (playerLevel >= 2) {
      if (!profile.inventory.big_stone) {
        profile.inventory.big_stone = 2; // 2 big stones
        gaveStarterItems = true;
      }
      if (!profile.inventory.knife && profile.race !== 'orc') { // Orcs get different items
        profile.inventory.knife = 1; // 1 knife
        gaveStarterItems = true;
      }
    }

    // Level 3 additional items
    if (playerLevel >= 3) {
      if (!profile.inventory.small_club) {
        profile.inventory.small_club = 1; // 1 small club
        gaveStarterItems = true;
      }
    }

    if (gaveStarterItems) {
      needsSave = true;
      console.log(`Gave starter items to ${profile.nickname} (level ${playerLevel})`);
    }
  });

  if (needsSave) {
    saveProfiles();
    console.log("Profile migration completed and saved.");
  }
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

// XP system matching game analyzer
function calculateXpForFight(result, playerLevel, opponentLevel) {
  // Base XP values from analyzer
  const BASE_XP_WIN = 6;      // Win against player
  const BASE_XP_DRAW = 3;     // Draw against player
  const BASE_XP_LOSS = 2;     // Beat bot (reward for trying)

  // Get base XP based on result
  let baseXp;
  if (result === 'win') {
    baseXp = BASE_XP_WIN;
  } else if (result === 'draw') {
    baseXp = BASE_XP_DRAW;
  } else { // loss
    baseXp = BASE_XP_LOSS;  // Beat bot gives some XP
  }

  // Apply level modifier
  const levelDiff = opponentLevel - playerLevel;

  let multiplier;
  if (levelDiff === -1) {  // Fighting lower level
    if (result === 'draw') {
      return 0;  // No XP for draw against lower level
    }
    multiplier = 0.7;
  } else if (levelDiff === 0) {  // Same level
    multiplier = 1.0;
  } else if (levelDiff === 1) {  // Fighting higher level
    if (result === 'draw') {
      return BASE_XP_WIN;  // Draw against higher = win XP against same
    }
    multiplier = 1.5;
  } else {
    // For other level differences, use gradual scaling
    if (levelDiff < -1) {
      multiplier = Math.max(0.5, 0.7 + (levelDiff + 1) * 0.1);
    } else { // levelDiff > 1
      multiplier = Math.min(2.0, 1.5 + (levelDiff - 1) * 0.2);
    }
  }

  return Math.floor(baseXp * multiplier);
}

function getXpForSingleLevel(level) {
  // XP required to advance from (level-1) to level
  if (level <= 1) {
    return 0;
  } else if (level === 2) {
    return 82;  // Keep base requirement same
  } else if (level === 3) {
    return 218;  // 300 total - 82 = 218 for level 3
  } else if (level === 4) {
    return 780;  // 1080 total - 300 = 780 for level 4
  } else {
    // For levels 5+, use escalating multiplier starting at 3.6x
    const prevLevelXp = getXpForSingleLevel(level - 1);
    // Increase multiplier slightly each level: 3.6, 3.7, 3.8, etc.
    const multiplier = 3.5 + (level - 4) * 0.1;
    return Math.floor(prevLevelXp * multiplier);
  }
}

function getXpRequiredForLevel(level) {
  // Get total XP required to reach a specific level
  if (level <= 1) {
    return 0;
  }

  let totalXp = 0;
  for (let lvl = 2; lvl <= level; lvl++) {
    totalXp += getXpForSingleLevel(lvl);
  }
  return totalXp;
}

function calculateDamage(attacker, defender, attackPart, defendPart, attackerItems = null) {
  // Constants from game analyzer (rebalanced for better stat equality)
  const BASE_DAMAGE = 3.1;
  const POWER_FACTOR = 0.27;
  const BLOCK_MULTIPLIER = 0.26;

  // Agility effect constants
  const SUPER_ATTACK_MULTIPLIER = 3.5;
  const MAX_DODGE_CHANCE = 8;
  const MAX_SUPER_ATTACK_CHANCE = 6;
  const MIN_DODGE_CHANCE = 2;
  const MIN_SUPER_ATTACK_CHANCE = 2;
  const AGILITY_DODGE_FACTOR = 1.05;
  const AGILITY_SUPER_FACTOR = 1.05;

  // Calculate agility difference
  const agilityDiff = attacker.agility - defender.agility;
  let effectType = "normal";
  let itemEffects = [];

  // Check for super attack (attacker has higher agility)
  if (agilityDiff > 0) {
    const superAttackChance = Math.min(MAX_SUPER_ATTACK_CHANCE, Math.max(MIN_SUPER_ATTACK_CHANCE, agilityDiff * AGILITY_SUPER_FACTOR));
    if (Math.random() * 100 < superAttackChance) {
      effectType = "super_attack";
    }
  }

  // Check for dodge (defender has higher agility and no super attack)
  else if (agilityDiff < 0) {
    const dodgeChance = Math.min(MAX_DODGE_CHANCE, Math.max(MIN_DODGE_CHANCE, Math.abs(agilityDiff) * AGILITY_DODGE_FACTOR));
    if (Math.random() * 100 < dodgeChance) {
      return { damage: 0, effect: "dodged", itemEffects: [] };
    }
  }

  // Calculate power to defense ratio
  const ratio = defender.defense > 0 ? attacker.power / defender.defense : attacker.power;
  let damage = BASE_DAMAGE * Math.pow(ratio, POWER_FACTOR);

  // Apply item effects if provided
  let totalMultiplier = 1.0;
  if (attackerItems && attackerItems.equipment) {
    const { multiplier, effects } = calculateItemEffects(attacker, attackerItems.equipment);
    totalMultiplier = multiplier;
    itemEffects = effects;
  }

  damage *= totalMultiplier;

  // Apply super attack multiplier if triggered
  if (effectType === "super_attack") {
    damage *= SUPER_ATTACK_MULTIPLIER;
    effectType = "super_attack";
  }

  // Check if attack is blocked (defended)
  const isBlocked = attackPart === defendPart;
  if (isBlocked) {
    damage *= BLOCK_MULTIPLIER;
  }

  // Probability-based integer conversion
  const baseDamage = Math.floor(damage);
  const fractionalPart = damage - baseDamage;

  let finalDamage;
  if (Math.random() < fractionalPart) {
    finalDamage = baseDamage + 1;
  } else {
    finalDamage = baseDamage;
  }

  return {
    damage: Math.max(1, finalDamage),
    effect: effectType,
    blocked: isBlocked,
    itemEffects: itemEffects
  };
}

function calculateItemEffects(player, equipment) {
  let totalMultiplier = 1.0;
  let effects = [];
  const playerLevel = player.level || 1;

  // Check hand slots for melee weapons
  const handItems = equipment.hand_slots || [];
  const meleeWeapons = handItems.filter(item => item && ITEMS[item.type] && ITEMS[item.type].type === "melee");
  const hasSlingshot = handItems.some(item => item && item.type === "slingshot");

  // Apply melee weapon effects
  if (meleeWeapons.length > 0) {
    let weaponMultiplier = 1.0;

    for (const weapon of meleeWeapons) {
      const itemTemplate = ITEMS[weapon.type];
      const scaling = getItemLevelScaling(weapon, playerLevel);
      let weaponBonus = (itemTemplate.damage_multiplier - 1.0) * scaling;

      // Apply dual-wield penalty if multiple weapons
      if (meleeWeapons.length > 1 && !itemTemplate.no_dual_penalty) {
        const penalty = itemTemplate.dual_penalty || 0.35; // Default 35% penalty
        weaponBonus *= (1.0 - penalty);
        effects.push(`${weapon.name} (dual-wield penalty)`);
      } else {
        effects.push(`${weapon.name}`);
      }

      weaponMultiplier += weaponBonus;
    }

    totalMultiplier *= weaponMultiplier;
  }

  // Check basic slots for projectiles and their slingshot bonus
  const basicItems = equipment.basic_slots || [];
  const projectiles = basicItems.filter(item => item && ITEMS[item.type] && ITEMS[item.type].type === "projectile");

  for (const projectile of projectiles) {
    const itemTemplate = ITEMS[projectile.type];

    // Check if projectile hits (stones have success chance based on agility)
    const successChance = Math.min(100, Math.max(0, 25 + (player.agility - 5) * 1)); // Assume base agility diff

    if (Math.random() * 100 < successChance) {
      const scaling = getItemLevelScaling(projectile, playerLevel);
      let projectileMultiplier = itemTemplate.damage_multiplier;

      // Apply agility-based damage bonus for stones
      const agilityBonus = 0.1 + ((player.agility - 5) * 0.1); // Simplified agility bonus
      projectileMultiplier += agilityBonus;

      // Apply slingshot bonus if equipped
      if (hasSlingshot && itemTemplate.stone_bonus !== undefined) {
        projectileMultiplier += itemTemplate.stone_bonus;
        effects.push(`${projectile.name} + Slingshot`);
      } else {
        effects.push(`${projectile.name}`);
      }

      projectileMultiplier = 1.0 + (projectileMultiplier - 1.0) * scaling;
      totalMultiplier *= projectileMultiplier;

      // Consume projectile use
      projectile.uses--;
    } else {
      effects.push(`${projectile.name} (missed)`);
    }
  }

  return { multiplier: totalMultiplier, effects: effects };
}

function calculateKnowledgeForLevel(race, level) {
  // Calculate knowledge stat based on race and level (from analyzer)
  let baseKnowledge = 0; // Most races start with 0 knowledge (0 mana)

  // Special bonuses for skeleton only
  if (race === 'skeleton') {
    let bonusKnowledge = 0;
    if (level >= 2) {
      bonusKnowledge += 1;  // +1 knowledge at level 2
    }
    if (level >= 8) {
      bonusKnowledge += 1;  // +1 additional knowledge at level 8 (total +2)
    }
    return baseKnowledge + bonusKnowledge;
  }

  // All other races: no knowledge bonuses per level (0 knowledge = 0 mana)
  return baseKnowledge;
}

// Item management functions
function createItem(itemType) {
  const itemTemplate = ITEMS[itemType];
  if (!itemTemplate) return null;

  return {
    type: itemType,
    name: itemTemplate.name,
    uses: itemTemplate.uses,
    maxUses: itemTemplate.uses
  };
}

function getItemLevelScaling(item, playerLevel) {
  const itemTemplate = ITEMS[item.type];
  if (!itemTemplate) return 1.0;

  const levelDiff = playerLevel - itemTemplate.level;
  if (levelDiff <= 0) return 1.0; // Item is appropriate level or higher

  // Apply level scaling penalty
  let penaltyRate = 0.15; // 15% penalty per level for projectiles
  let minEffectiveness = 0.3; // 30% minimum effectiveness

  if (itemTemplate.type === "melee" || itemTemplate.type === "enhancement") {
    penaltyRate = 0.10; // 10% penalty per level for melee/enhancement
    minEffectiveness = 0.4; // 40% minimum effectiveness
  }

  const levelPenalty = 1.0 - (levelDiff * penaltyRate);
  return Math.max(minEffectiveness, levelPenalty);
}

function canEquipItem(profile, itemType, slotIndex, slotType) {
  const itemTemplate = ITEMS[itemType];
  if (!itemTemplate) return { canEquip: false, reason: "Item does not exist" };

  // Check if item goes in correct slot type
  if (itemTemplate.slot !== slotType) {
    return { canEquip: false, reason: `Item belongs in ${itemTemplate.slot} slot, not ${slotType}` };
  }

  // Check slot availability
  const slots = profile.equipment[slotType + "_slots"];
  if (!slots || slotIndex >= slots.length) {
    return { canEquip: false, reason: "Slot does not exist" };
  }

  // Check slingshot limit
  if (itemType === "slingshot") {
    const currentSlingshots = profile.equipment.hand_slots.filter(item => item && item.type === "slingshot").length;
    if (currentSlingshots >= 1) {
      return { canEquip: false, reason: "Only one slingshot allowed per player" };
    }
  }

  // Check spell requirements
  if (itemTemplate.type === "spell") {
    if (profile.knowledge < itemTemplate.knowledge_req) {
      return { canEquip: false, reason: `Requires ${itemTemplate.knowledge_req} knowledge` };
    }
  }

  return { canEquip: true };
}

function equipItem(profile, itemType, slotIndex, slotType) {
  const canEquip = canEquipItem(profile, itemType, slotIndex, slotType);
  if (!canEquip.canEquip) return { success: false, reason: canEquip.reason };

  // Check if player has item in inventory
  if (!profile.inventory[itemType] || profile.inventory[itemType] <= 0) {
    return { success: false, reason: "Item not in inventory" };
  }

  // Remove item from inventory
  profile.inventory[itemType]--;
  if (profile.inventory[itemType] === 0) {
    delete profile.inventory[itemType];
  }

  // If slot already has an item, return it to inventory
  const currentItem = profile.equipment[slotType + "_slots"][slotIndex];
  if (currentItem) {
    profile.inventory[currentItem.type] = (profile.inventory[currentItem.type] || 0) + 1;
  }

  // Equip new item
  profile.equipment[slotType + "_slots"][slotIndex] = createItem(itemType);

  return { success: true };
}

function unequipItem(profile, slotIndex, slotType) {
  const slots = profile.equipment[slotType + "_slots"];
  if (!slots || slotIndex >= slots.length || !slots[slotIndex]) {
    return { success: false, reason: "No item in slot" };
  }

  const item = slots[slotIndex];
  slots[slotIndex] = null;

  // Return item to inventory
  profile.inventory[item.type] = (profile.inventory[item.type] || 0) + 1;

  return { success: true, item: item };
}

function giveItemToPlayer(profile, itemType, quantity = 1) {
  if (!ITEMS[itemType]) return false;

  profile.inventory[itemType] = (profile.inventory[itemType] || 0) + quantity;
  return true;
}

function checkLevelUp(profile) {
  let leveledUp = false;

  while (true) {
    const nextLevel = profile.level + 1;
    const xpNeeded = getXpRequiredForLevel(nextLevel);

    if (profile.experience >= xpNeeded) {
      profile.level = nextLevel;

      // Update knowledge based on race and new level
      const newKnowledge = calculateKnowledgeForLevel(profile.race, profile.level);
      if (newKnowledge !== profile.knowledge) {
        profile.knowledge = newKnowledge;
        // Recalculate mana based on new knowledge (1 knowledge = 3 mana)
        const newMaxMana = newKnowledge * 3;
        profile.maxMana = newMaxMana;
        profile.mana = newMaxMana; // Restore to full mana on level up
        console.log(`${profile.nickname} gained knowledge! Now has ${newKnowledge} knowledge and ${newMaxMana} mana`);
      }

      leveledUp = true;
      console.log(`${profile.nickname} leveled up! Now at level ${profile.level} (${profile.experience}/${xpNeeded} XP)`);
    } else {
      break;
    }
  }

  return leveledUp;
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
  const { telegram_id, nickname, race } = req.body;

  if (!telegram_id || !nickname || !race) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  if (playerProfiles[telegram_id]) {
    return res.status(400).json({ message: "Profile already exists." });
  }

  // Base stats matching game analyzer
  let baseStats = {
    hp: 25,
    power: 5,
    defense: 5,
    agility: 6,
    knowledge: 0
  };

  // Apply race bonuses to match game analyzer
  switch (race) {
    case "human":
      // Human: hp: 25, power: 5, defense: 5, agility: 6, knowledge: 0 (default values)
      break;
    case "orc":
      // Orc: hp: 25, power: 6, defense: 5, agility: 5, knowledge: 0
      baseStats.power = 6;
      baseStats.agility = 5;
      break;
    case "elf":
      // Elf: hp: 25, power: 5, defense: 5, agility: 6, knowledge: 0 (same as human)
      break;
    case "dwarf":
      // Dwarf: hp: 25, power: 5, defense: 6, agility: 5, knowledge: 0
      baseStats.defense = 6;
      baseStats.agility = 5;
      break;
    case "skeleton":
      // Skeleton: hp: 26, power: 5, defense: 5, agility: 5, knowledge: 0
      baseStats.hp = 26;
      baseStats.agility = 5;
      break;
    default:
      return res.status(400).json({ message: "Invalid race selected." });
  }

  // No additional points by default - user starts with default race stats only
  // Remove extra points allocation system for new registrations

  // Calculate mana based on knowledge (1 knowledge = 3 mana)
  const maxMana = baseStats.knowledge * 3;

  // Create profile object
  playerProfiles[telegram_id] = {
    nickname,
    race,
    hp: baseStats.hp,
    power: baseStats.power,
    defense: baseStats.defense,
    agility: baseStats.agility,
    knowledge: baseStats.knowledge,
    mana: maxMana,
    maxMana: maxMana,
    experience: 0,
    level: 1,
    extra_points: 0,
    coins: 20,
    tickets: 2,
    last_seen: Date.now(),
    equipment: {
      basic_slots: [null, null],
      hand_slots: [null, null]
    },
    inventory: {
      stone: 3,
      wooden_stick: 1
    }
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
  const parts = ["head", "chest", "stomach", "belt", "legs"];
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

  // Player attacks bot - using game analyzer damage calculation
  const playerAttackResult = calculateDamage(player, bot, hit, botDefend);
  playerDamage = playerAttackResult.damage;

  if (playerAttackResult.effect === "dodged") {
    log.push(`Bot dodged your attack to the ${hit}.`);
  } else if (playerDamage > 0) {
    bot.hp = Math.max(bot.hp - playerDamage, 0);

    let attackMsg = "";
    if (playerAttackResult.effect === "super_attack") {
      attackMsg = `You performed a super attack on the bot's ${hit}`;
    } else if (playerAttackResult.blocked) {
      attackMsg = `You hit the bot's protected ${hit}`;
    } else {
      attackMsg = `You hit the bot's ${hit}`;
    }

    log.push(`${attackMsg}, bot HP ${bot.hp}, dealing ${playerDamage} damage.`);
  } else {
    log.push(`Bot blocked your attack to the ${hit}.`);
  }

  // Bot attacks player - using game analyzer damage calculation
  const botAttackResult = calculateDamage(bot, player, botHit, defend);
  botDamage = botAttackResult.damage;

  if (botAttackResult.effect === "dodged") {
    log.push(`You dodged the bot's attack to your ${botHit}.`);
  } else if (botDamage > 0) {
    player.currentHP = Math.max(player.currentHP - botDamage, 0);

    let attackMsg = "";
    if (botAttackResult.effect === "super_attack") {
      attackMsg = `Bot performed a super attack on your ${botHit}`;
    } else if (botAttackResult.blocked) {
      attackMsg = `Bot hit your protected ${botHit}`;
    } else {
      attackMsg = `Bot hit your ${botHit}`;
    }

    log.push(`${attackMsg}, your HP is ${player.currentHP}, dealing ${botDamage} damage.`);
  } else {
    log.push(`You blocked the bot's attack to your ${botHit}.`);
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

    // Calculate XP using new system (bot fights count as "loss" - reward for trying)
    const xpGained = calculateXpForFight("loss", player.level, 1); // Bot is level 1
    log.push(`You gained ${xpGained} experience points.`);
    player.experience += xpGained;
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

  const keys = ["hp", "power", "agility", "defense"];

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
    defense: 2
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
    (points.defense || 0);

  if (totalPointsToSpend > profile.extra_points) {
    return res.status(400).json({ message: "Not enough extra points" });
  }

  // Spend points
  profile.hp += points.hp || 0;
  profile.power += points.power || 0;
  profile.agility += points.agility || 0;
  profile.defense += points.defense || 0;

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
        defense: profile.defense,
        agility: profile.agility,
        knowledge: profile.knowledge,
        mana: profile.mana,
        maxMana: profile.maxMana,
        experience: profile.experience,
        level: profile.level,
        extra_points: profile.extra_points,
        coins: profile.coins || 0,
        tickets: profile.tickets || 0,
        inventory: profile.inventory || {},
        equipment: profile.equipment || { basic_slots: [null, null], hand_slots: [null, null] }
      }
    });
  } else {
    res.json({
      exists: false
    });
  }
});

// Buy item endpoint
app.post("/buy-item", (req, res) => {
  const { telegram_id, item_name, price } = req.body;

  // Debug logging
  console.log("Buy item request received:");
  console.log("- telegram_id:", telegram_id);
  console.log("- item_name:", item_name);
  console.log("- price:", price);
  console.log("- Available profiles:", Object.keys(playerProfiles));

  if (!telegram_id || !item_name || !price) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const profile = playerProfiles[telegram_id];
  if (!profile) {
    console.log("Profile not found for telegram_id:", telegram_id);
    return res.status(400).json({ message: "Profile not found" });
  }

  // Check if player has enough coins
  if (profile.coins < price) {
    return res.status(400).json({ message: "Not enough coins" });
  }

  // Validate item name (security check)
  const validItems = [
    'stone', 'big_stone', 'metal_ball', 'fear_spell', 'scream_spell',
    'wooden_stick', 'big_wooden_stick', 'knife', 'small_club', 'blade', 'slingshot'
  ];

  if (!validItems.includes(item_name)) {
    return res.status(400).json({ message: "Invalid item" });
  }

  // Deduct coins
  profile.coins -= price;

  // Add item to inventory
  if (!profile.inventory) {
    profile.inventory = {};
  }

  if (profile.inventory[item_name]) {
    profile.inventory[item_name] += 1;
  } else {
    profile.inventory[item_name] = 1;
  }

  // Update last seen and save
  profile.last_seen = Date.now();
  saveProfiles();

  res.json({
    message: "Item purchased successfully",
    profile: {
      coins: profile.coins,
      inventory: profile.inventory
    }
  });
});

// Claim daily reward endpoint
app.post("/claim-daily-reward", (req, res) => {
  const { telegram_id, reward_type } = req.body;

  console.log("Daily reward claim request received:");
  console.log("- telegram_id:", telegram_id);
  console.log("- reward_type:", reward_type);

  if (!telegram_id || !reward_type) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const profile = playerProfiles[telegram_id];
  if (!profile) {
    console.log("Profile not found for telegram_id:", telegram_id);
    return res.status(400).json({ message: "Profile not found" });
  }

  // Validate reward type
  if (!['coins', 'tickets'].includes(reward_type)) {
    return res.status(400).json({ message: "Invalid reward type" });
  }

  // Check if reward can be claimed (server-side validation for security)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayKey = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Initialize daily claims if not exists
  if (!profile.daily_claims) {
    profile.daily_claims = {};
  }

  const rewardKey = `${reward_type}_${todayKey}`;
  if (profile.daily_claims[rewardKey]) {
    return res.status(400).json({ message: "Reward already claimed today" });
  }

  // Grant reward
  if (reward_type === 'coins') {
    profile.coins = (profile.coins || 0) + 5;
  } else if (reward_type === 'tickets') {
    profile.tickets = (profile.tickets || 0) + 1;
  }

  // Mark as claimed
  profile.daily_claims[rewardKey] = Date.now();

  // Update last seen and save
  profile.last_seen = Date.now();
  saveProfiles();

  console.log(`Daily ${reward_type} reward claimed successfully for ${telegram_id}`);

  res.json({
    message: `Daily ${reward_type} reward claimed successfully!`,
    profile: {
      coins: profile.coins,
      tickets: profile.tickets
    }
  });
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
      defense: playerProfiles[challenger_id].defense,
      knowledge: playerProfiles[challenger_id].knowledge,
      mana: playerProfiles[challenger_id].mana,
      maxMana: playerProfiles[challenger_id].maxMana
    },
    player2_stats: {
      hp: playerProfiles[target_id].hp,  // Always start at full HP
      maxHP: playerProfiles[target_id].hp,
      power: playerProfiles[target_id].power,
      agility: playerProfiles[target_id].agility,
      defense: playerProfiles[target_id].defense,
      knowledge: playerProfiles[target_id].knowledge,
      mana: playerProfiles[target_id].mana,
      maxMana: playerProfiles[target_id].maxMana
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
      defense: playerProfiles[player_id].defense,
      knowledge: playerProfiles[player_id].knowledge,
      mana: playerProfiles[player_id].mana,
      maxMana: playerProfiles[player_id].maxMana
    },
    player2_stats: {
      hp: playerProfiles[opponent_id].hp,
      maxHP: playerProfiles[opponent_id].hp,
      power: playerProfiles[opponent_id].power,
      agility: playerProfiles[opponent_id].agility,
      defense: playerProfiles[opponent_id].defense,
      knowledge: playerProfiles[opponent_id].knowledge,
      mana: playerProfiles[opponent_id].mana,
      maxMana: playerProfiles[opponent_id].maxMana
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

  // Player 1 attacks Player 2 - using game analyzer damage calculation
  const p1AttackResult = calculateDamage(player1, player2, p1Action.hit, p2Action.defend);
  p1Damage = p1AttackResult.damage;

  const p1Name = playerProfiles[fight.player1_id].nickname;
  const p2Name = playerProfiles[fight.player2_id].nickname;

  if (p1AttackResult.effect === "dodged") {
    roundLog.push(`${p2Name} dodged ${p1Name}'s attack to the ${p1Action.hit}.`);
  } else if (p1Damage > 0) {
    player2.hp = Math.max(player2.hp - p1Damage, 0);

    let attackMsg = "";
    if (p1AttackResult.effect === "super_attack") {
      attackMsg = `${p1Name} performed a super attack on ${p2Name}'s ${p1Action.hit}`;
    } else if (p1AttackResult.blocked) {
      attackMsg = `${p1Name} hit ${p2Name}'s protected ${p1Action.hit}`;
    } else {
      attackMsg = `${p1Name} hit ${p2Name}'s ${p1Action.hit}`;
    }

    roundLog.push(`${attackMsg}, dealing ${p1Damage} damage.`);
  } else {
    roundLog.push(`${p2Name} blocked ${p1Name}'s attack to the ${p1Action.hit}.`);
  }

  // Player 2 attacks Player 1 - using game analyzer damage calculation
  const p2AttackResult = calculateDamage(player2, player1, p2Action.hit, p1Action.defend);
  p2Damage = p2AttackResult.damage;

  if (p2AttackResult.effect === "dodged") {
    roundLog.push(`${p1Name} dodged ${p2Name}'s attack to the ${p2Action.hit}.`);
  } else if (p2Damage > 0) {
    player1.hp = Math.max(player1.hp - p2Damage, 0);

    let attackMsg = "";
    if (p2AttackResult.effect === "super_attack") {
      attackMsg = `${p2Name} performed a super attack on ${p1Name}'s ${p2Action.hit}`;
    } else if (p2AttackResult.blocked) {
      attackMsg = `${p2Name} hit ${p1Name}'s protected ${p2Action.hit}`;
    } else {
      attackMsg = `${p2Name} hit ${p1Name}'s ${p2Action.hit}`;
    }

    roundLog.push(`${attackMsg}, dealing ${p2Damage} damage.`);
  } else {
    roundLog.push(`${p1Name} blocked ${p2Name}'s attack to the ${p2Action.hit}.`);
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

    // Award XP using new system
    let winnerXp = 0;
    let loserXp = 0;

    if (winner !== "Draw") {
      // Winner gets win XP
      winnerXp = calculateXpForFight("win", winnerProfile.level, loserProfile.level);
      winnerProfile.experience = (winnerProfile.experience || 0) + winnerXp;

      // Loser gets loss XP
      loserXp = calculateXpForFight("loss", loserProfile.level, winnerProfile.level);
      loserProfile.experience = (loserProfile.experience || 0) + loserXp;

      checkLevelUp(winnerProfile);
      checkLevelUp(loserProfile);
      saveProfiles();
    } else {
      // Draw - both players get draw XP
      const player1Xp = calculateXpForFight("draw", playerProfiles[fight.player1_id].level, playerProfiles[fight.player2_id].level);
      const player2Xp = calculateXpForFight("draw", playerProfiles[fight.player2_id].level, playerProfiles[fight.player1_id].level);

      playerProfiles[fight.player1_id].experience = (playerProfiles[fight.player1_id].experience || 0) + player1Xp;
      playerProfiles[fight.player2_id].experience = (playerProfiles[fight.player2_id].experience || 0) + player2Xp;

      checkLevelUp(playerProfiles[fight.player1_id]);
      checkLevelUp(playerProfiles[fight.player2_id]);
      saveProfiles();

      winnerXp = player1Xp; // For logging
      loserXp = player2Xp;
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
    const loserProfile = playerProfiles[fight.player1_id];

    const winnerXp = calculateXpForFight("win", winnerProfile.level, loserProfile.level);
    const loserXp = calculateXpForFight("loss", loserProfile.level, winnerProfile.level);

    winnerProfile.experience = (winnerProfile.experience || 0) + winnerXp;
    loserProfile.experience = (loserProfile.experience || 0) + loserXp;

    checkLevelUp(winnerProfile);
    checkLevelUp(loserProfile);
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
    const loserProfile = playerProfiles[fight.player2_id];

    const winnerXp = calculateXpForFight("win", winnerProfile.level, loserProfile.level);
    const loserXp = calculateXpForFight("loss", loserProfile.level, winnerProfile.level);

    winnerProfile.experience = (winnerProfile.experience || 0) + winnerXp;
    loserProfile.experience = (loserProfile.experience || 0) + loserXp;

    checkLevelUp(winnerProfile);
    checkLevelUp(loserProfile);
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

// Inventory and Equipment API endpoints
app.get("/inventory/:player_id", (req, res) => {
  const { player_id } = req.params;
  const profile = playerProfiles[player_id];

  if (!profile) {
    return res.status(404).json({ error: "Player not found" });
  }

  res.json({
    inventory: profile.inventory || {},
    equipment: profile.equipment || { basic_slots: [], hand_slots: [] },
    items: ITEMS // Send item definitions for frontend
  });
});

app.post("/equip-item", (req, res) => {
  const { player_id, item_type, slot_index, slot_type } = req.body;
  const profile = playerProfiles[player_id];

  if (!profile) {
    return res.status(404).json({ error: "Player not found" });
  }

  const result = equipItem(profile, item_type, slot_index, slot_type);
  if (result.success) {
    saveProfiles();
    res.json({ success: true, equipment: profile.equipment });
  } else {
    res.status(400).json({ error: result.reason });
  }
});

app.post("/unequip-item", (req, res) => {
  const { player_id, slot_index, slot_type } = req.body;
  const profile = playerProfiles[player_id];

  if (!profile) {
    return res.status(404).json({ error: "Player not found" });
  }

  const result = unequipItem(profile, slot_index, slot_type);
  if (result.success) {
    saveProfiles();
    res.json({ success: true, equipment: profile.equipment, inventory: profile.inventory });
  } else {
    res.status(400).json({ error: result.reason });
  }
});

app.post("/give-item", (req, res) => {
  const { player_id, item_type, quantity = 1 } = req.body;
  const profile = playerProfiles[player_id];

  if (!profile) {
    return res.status(404).json({ error: "Player not found" });
  }

  const success = giveItemToPlayer(profile, item_type, quantity);
  if (success) {
    saveProfiles();
    res.json({ success: true, inventory: profile.inventory });
  } else {
    res.status(400).json({ error: "Invalid item type" });
  }
});

// New Equip/Unequip item endpoints for Equipment Tab
app.post("/equip-item-v2", (req, res) => {
  const { telegram_id, item_name, slot_type, slot_index } = req.body;

  console.log("Equip item v2 request received:");
  console.log("- telegram_id:", telegram_id);
  console.log("- item_name:", item_name);
  console.log("- slot_type:", slot_type);
  console.log("- slot_index:", slot_index);

  const profile = playerProfiles[telegram_id];
  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }

  // Validate item exists in inventory
  if (!profile.inventory || !profile.inventory[item_name] || profile.inventory[item_name] <= 0) {
    return res.status(400).json({ message: "Item not available in inventory" });
  }

  // Validate slot type and index
  if (!profile.equipment) {
    profile.equipment = { basic_slots: [null, null], hand_slots: [null, null] };
  }

  if (slot_type !== "basic_slots" && slot_type !== "hand_slots") {
    return res.status(400).json({ message: "Invalid slot type" });
  }

  if (slot_index < 0 || slot_index >= profile.equipment[slot_type].length) {
    return res.status(400).json({ message: "Invalid slot index" });
  }

  // Validate item can be equipped in this slot type
  const item = ITEMS[item_name];
  if (!item) {
    return res.status(400).json({ message: "Unknown item" });
  }

  const expectedSlotType = item.slot === "basic" ? "basic_slots" : "hand_slots";
  if (slot_type !== expectedSlotType) {
    return res.status(400).json({ message: `Item ${item_name} cannot be equipped in ${slot_type}` });
  }

  // If slot is occupied, return item to inventory
  const currentItem = profile.equipment[slot_type][slot_index];
  if (currentItem) {
    profile.inventory[currentItem] = (profile.inventory[currentItem] || 0) + 1;
  }

  // Equip new item
  profile.equipment[slot_type][slot_index] = item_name;
  profile.inventory[item_name]--;

  // Remove item from inventory if quantity reaches 0
  if (profile.inventory[item_name] <= 0) {
    delete profile.inventory[item_name];
  }

  saveProfiles();

  res.json({
    message: "Item equipped successfully",
    equipment: profile.equipment,
    inventory: profile.inventory
  });
});

app.post("/unequip-item-v2", (req, res) => {
  const { telegram_id, slot_type, slot_index } = req.body;

  console.log("Unequip item v2 request received:");
  console.log("- telegram_id:", telegram_id);
  console.log("- slot_type:", slot_type);
  console.log("- slot_index:", slot_index);

  const profile = playerProfiles[telegram_id];
  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }

  if (!profile.equipment) {
    return res.status(400).json({ message: "No equipment found" });
  }

  if (slot_type !== "basic_slots" && slot_type !== "hand_slots") {
    return res.status(400).json({ message: "Invalid slot type" });
  }

  if (slot_index < 0 || slot_index >= profile.equipment[slot_type].length) {
    return res.status(400).json({ message: "Invalid slot index" });
  }

  const item_name = profile.equipment[slot_type][slot_index];
  if (!item_name) {
    return res.status(400).json({ message: "Slot is already empty" });
  }

  // Return item to inventory
  profile.inventory[item_name] = (profile.inventory[item_name] || 0) + 1;

  // Clear equipment slot
  profile.equipment[slot_type][slot_index] = null;

  saveProfiles();

  res.json({
    message: "Item unequipped successfully",
    equipment: profile.equipment,
    inventory: profile.inventory
  });
});

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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = { app, resetProfiles };
