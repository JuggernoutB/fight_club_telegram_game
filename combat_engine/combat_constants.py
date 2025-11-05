"""
Combat Constants Module
All combat-related constants and configuration data
"""

# Default race characteristics
RACE_DEFAULTS = {
    'human': {'hp': 25, 'power': 5, 'defense': 5, 'agility': 6, 'knowledge': 0},
    'orc': {'hp': 25, 'power': 6, 'defense': 5, 'agility': 5, 'knowledge': 0},
    'elf': {'hp': 25, 'power': 5, 'defense': 5, 'agility': 6, 'knowledge': 0},
    'dwarf': {'hp': 25, 'power': 5, 'defense': 6, 'agility': 5, 'knowledge': 0},
    'skeleton': {'hp': 26, 'power': 5, 'defense': 5, 'agility': 5, 'knowledge': 0}
}

# Body parts for combat targeting
BODY_PARTS = ['head', 'chest', 'stomach', 'belt', 'legs']

# Equipment slot configuration per race
RACE_EQUIPMENT_SLOTS = {
    'human': {'basic_slots': 2, 'hand_slots': 2},
    'elf': {'basic_slots': 2, 'hand_slots': 2},
    'orc': {'basic_slots': 1, 'hand_slots': 2},
    'dwarf': {'basic_slots': 1, 'hand_slots': 2},
    'skeleton': {'basic_slots': 1, 'hand_slots': 2}
}

# Damage calculation constants
BASE_DAMAGE = 3.1
POWER_FACTOR = 0.27
BLOCK_MULTIPLIER = 0.26

# Agility effect constants
SUPER_ATTACK_MULTIPLIER = 3.5
MAX_DODGE_CHANCE = 8
MAX_SUPER_ATTACK_CHANCE = 6
MIN_DODGE_CHANCE = 2
MIN_SUPER_ATTACK_CHANCE = 2
AGILITY_DODGE_FACTOR = 1.05
AGILITY_SUPER_FACTOR = 1.05

# Equipment multipliers and effects
STONE_BASE_SUCCESS_CHANCE = 25  # 25% + agility_diff * 1%
STONE_BASE_MULTIPLIER = 1.1  # 1.1 + agility_diff * 0.1
SLINGSHOT_BONUS = 0.3  # 30% additional multiplier when using slingshot

# Wooden stick multipliers
WOODEN_STICK_MULTIPLIER = 1.06
BIG_WOODEN_STICK_MULTIPLIER = 1.06
KNIFE_MULTIPLIER = 1.04
BLADE_MULTIPLIER = 1.04
SMALL_CLUB_MULTIPLIER = 1.06

# Dual-wield penalties
DUAL_STICK_PENALTY = 0.65  # 35% reduction when using 2 sticks
DUAL_CLUB_PENALTY = 0.75   # 25% reduction when using 2 small clubs

# Level scaling penalties for equipment
STONE_LEVEL_PENALTY = 0.15  # 15% reduction per level above 1
STICK_LEVEL_PENALTY = 0.10  # 10% reduction per level above optimal
CLUB_LEVEL_PENALTY = 0.15   # 15% reduction per level above optimal

# Minimum effectiveness after level scaling
MIN_STONE_EFFECTIVENESS = 0.3  # 30%
MIN_STICK_EFFECTIVENESS = 0.4  # 40%
MIN_CLUB_EFFECTIVENESS = 0.3   # 30%

# Magic constants
FEAR_SPELL_MANA_COST = 3
SCREAM_SPELL_MANA_COST = 4
FEAR_STAT_REDUCTION = 3
SCREAM_DAMAGE_CHANCE = 0.35  # 35% chance of +1 damage
SCREAM_DAMAGE_BONUS = 1

# XP constants
BASE_XP_WIN = 6
BASE_XP_DRAW = 3
BASE_XP_LOSS = 2