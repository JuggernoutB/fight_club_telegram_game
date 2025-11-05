"""
Damage Calculator Module
Core damage calculation logic extracted from game analyzer
"""

import random
from typing import Tuple, List
from .player_stats import Player
from .combat_constants import *
from .equipment_effects import apply_projectile_effects, apply_melee_effects


def calculate_damage(attacker: Player, defender: Player, attack_part: str,
                    defend_parts: List[str], defender_blocks_available: bool = True,
                    power_reduction: int = 0, defense_reduction: int = 0,
                    scream_active: bool = False) -> Tuple[int, str, bool]:
    """Calculate damage with power ratio system, agility effects, and probability-based integer conversion"""

    # Apply fear power reduction temporarily if any
    original_power = attacker.power
    if power_reduction > 0:
        attacker.power = max(1, attacker.power - power_reduction)

    # Apply fear defense reduction temporarily if any
    original_defense = defender.defense
    if defense_reduction > 0:
        defender.defense = max(1, defender.defense - defense_reduction)

    # Calculate agility difference
    agility_diff = attacker.agility - defender.agility
    effect_type = "normal"

    # Check for super attack (attacker has higher agility)
    if agility_diff > 0:
        super_attack_chance = min(MAX_SUPER_ATTACK_CHANCE,
                                max(MIN_SUPER_ATTACK_CHANCE, agility_diff * AGILITY_SUPER_FACTOR))
        if random.random() * 100 < super_attack_chance:
            effect_type = "super_attack"

    # Check for dodge (defender has higher agility and no super attack)
    elif agility_diff < 0:
        dodge_chance = min(MAX_DODGE_CHANCE,
                         max(MIN_DODGE_CHANCE, abs(agility_diff) * AGILITY_DODGE_FACTOR))
        if random.random() * 100 < dodge_chance:
            # Restore original stats before returning
            attacker.power = original_power
            defender.defense = original_defense
            return 0, "dodged", False  # No block used when dodged

    # Calculate power to defense ratio
    ratio = attacker.power / defender.defense if defender.defense > 0 else attacker.power
    damage = BASE_DAMAGE * (ratio ** POWER_FACTOR)

    # Apply super attack multiplier if triggered
    if effect_type == "super_attack":
        damage *= SUPER_ATTACK_MULTIPLIER

    # Apply projectile effects (stones, big stones, metal balls)
    damage, projectile_effect, equipment_used = apply_projectile_effects(damage, attacker, agility_diff)
    if projectile_effect != "normal":
        effect_type = projectile_effect

    # Apply melee effects (sticks, clubs, knives, blades)
    damage, melee_effect = apply_melee_effects(damage, attacker)

    # Combine effects if both projectile and melee are used
    if projectile_effect != "normal" and melee_effect != "normal":
        if "stone_with_slingshot" in effect_type or "big_stone_with_slingshot" in effect_type or "metal_ball_with_slingshot" in effect_type:
            effect_type = "stone_slingshot_and_stick"
        elif "stones_with_slingshot" in effect_type or "multiple_projectiles_with_slingshot" in effect_type:
            effect_type = "stones_slingshot_and_stick"
        elif effect_type in ["stone_used", "big_stone_used", "metal_ball_used"]:
            effect_type = "stone_and_stick"
        elif effect_type in ["stones_used", "multiple_projectiles_used"]:
            effect_type = "stones_and_stick"
    elif melee_effect != "normal" and projectile_effect == "normal":
        effect_type = melee_effect

    # Check if attack is blocked (defended) and blocks are available
    is_blocked = attack_part in defend_parts and defender_blocks_available
    block_used = False
    if is_blocked:
        damage *= BLOCK_MULTIPLIER
        block_used = True

    # Probability-based integer conversion
    # Get the base integer and fractional part
    base_damage = int(damage)
    fractional_part = damage - base_damage

    # Determine final damage based on fractional probability
    if random.random() < fractional_part:
        final_damage = base_damage + 1
    else:
        final_damage = base_damage

    # Apply scream spell damage buff (35% chance of +1 damage)
    if scream_active:
        if random.random() < SCREAM_DAMAGE_CHANCE:
            final_damage += SCREAM_DAMAGE_BONUS

    # Restore original power and defense
    attacker.power = original_power
    defender.defense = original_defense

    # Return integer damage (minimum 1), effect type, and whether a block was used
    return max(1, final_damage), effect_type, block_used


def calculate_xp_for_fight(result: str, player_level: int, opponent_level: int) -> int:
    """Calculate XP gained from a fight result"""

    # Get base XP based on result
    if result == 'win':
        base_xp = BASE_XP_WIN
    elif result == 'draw':
        base_xp = BASE_XP_DRAW
    else:  # loss
        base_xp = BASE_XP_LOSS  # Beat bot gives some XP

    # Apply level modifier
    level_diff = opponent_level - player_level

    if level_diff == -1:  # Fighting lower level
        if result == 'draw':
            return 0  # No XP for draw against lower level
        multiplier = 0.7
    elif level_diff == 0:  # Same level
        multiplier = 1.0
    elif level_diff == 1:  # Fighting higher level
        if result == 'draw':
            return BASE_XP_WIN  # Draw against higher = win XP against same
        multiplier = 1.5
    else:
        # For other level differences, use gradual scaling
        if level_diff < -1:
            multiplier = max(0.5, 0.7 + (level_diff + 1) * 0.1)
        else:  # level_diff > 1
            multiplier = min(2.0, 1.5 + (level_diff - 1) * 0.2)

    return int(base_xp * multiplier)


def get_xp_required_for_level(level: int) -> int:
    """Get total XP required to reach a specific level"""
    if level <= 1:
        return 0

    # Calculate total XP by summing all level requirements
    total_xp = 0

    for lvl in range(2, level + 1):
        level_xp = get_xp_for_single_level(lvl)
        total_xp += level_xp

    return total_xp


def get_xp_for_single_level(level: int) -> int:
    """Get XP required to advance from (level-1) to level"""
    if level <= 1:
        return 0
    elif level == 2:
        return 82  # Keep base requirement same
    elif level == 3:
        return 218  # 300 total - 82 = 218 for level 3
    elif level == 4:
        return 780  # 1080 total - 300 = 780 for level 4
    else:
        # For levels 5+, use escalating multiplier starting at 3.6x
        prev_level_xp = get_xp_for_single_level(level - 1)
        # Increase multiplier slightly each level: 3.6, 3.7, 3.8, etc.
        multiplier = 3.5 + (level - 4) * 0.1
        return int(prev_level_xp * multiplier)


def get_current_level_from_xp(xp: int) -> tuple:
    """Get current level and progress from total XP"""
    if xp < 82:
        return 1, xp, 82

    level = 1
    total_xp_used = 0

    while level < 10:
        next_level = level + 1
        xp_for_next_level = get_xp_for_single_level(next_level)

        if total_xp_used + xp_for_next_level > xp:
            # Current level found
            current_level_xp = xp - total_xp_used
            return level, current_level_xp, xp_for_next_level

        total_xp_used += xp_for_next_level
        level += 1

    # At max level (10)
    return 10, 0, 0