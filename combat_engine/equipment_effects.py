"""
Equipment Effects Module
Equipment creation and effect calculation functionality
"""

import random
from typing import Tuple, List
from .player_stats import Equipment, Player
from .combat_constants import *


def create_equipment_item(item_type: str) -> Equipment:
    """Create an equipment item of the specified type"""
    equipment_configs = {
        "stone": {
            "name": "Stone",
            "uses_remaining": 1,
            "effect_multiplier": 1.0
        },
        "big_stone": {
            "name": "Big Stone",
            "uses_remaining": 1,
            "effect_multiplier": 1.0
        },
        "metal_ball": {
            "name": "Metal Ball",
            "uses_remaining": 1,
            "effect_multiplier": 1.0
        },
        "wooden_stick": {
            "name": "Wooden Stick",
            "uses_remaining": 999,
            "effect_multiplier": WOODEN_STICK_MULTIPLIER
        },
        "big_wooden_stick": {
            "name": "Big Wooden Stick",
            "uses_remaining": 999,
            "effect_multiplier": BIG_WOODEN_STICK_MULTIPLIER
        },
        "knife": {
            "name": "Knife",
            "uses_remaining": 999,
            "effect_multiplier": KNIFE_MULTIPLIER
        },
        "small_club": {
            "name": "Small Club",
            "uses_remaining": 999,
            "effect_multiplier": SMALL_CLUB_MULTIPLIER
        },
        "blade": {
            "name": "Blade",
            "uses_remaining": 999,
            "effect_multiplier": BLADE_MULTIPLIER
        },
        "slingshot": {
            "name": "Slingshot",
            "uses_remaining": 999,
            "effect_multiplier": 1.0
        },
        "fear_spell": {
            "name": "Fear Spell",
            "uses_remaining": 999,
            "effect_multiplier": 1.0
        },
        "scream_spell": {
            "name": "Scream Spell",
            "uses_remaining": 999,
            "effect_multiplier": 1.0
        }
    }

    config = equipment_configs.get(item_type, equipment_configs["stone"])
    return Equipment(
        name=config["name"],
        item_type=item_type,
        uses_remaining=config["uses_remaining"],
        effect_multiplier=config["effect_multiplier"]
    )


def apply_projectile_effects(damage: float, attacker: Player, agility_diff: int) -> Tuple[float, str, bool]:
    """Apply stone, big stone, and metal ball effects"""
    equipment_used = False
    effect_type = "normal"

    # Check for equipment usage (stone) - only in basic equipment slots
    for i, item in enumerate(attacker.equipment):
        if item and item.item_type == "stone" and item.uses_remaining > 0:
            # Calculate stone success chance: 25% + agility_diff * 1% (0-100%)
            stone_success_chance = min(100, max(0, STONE_BASE_SUCCESS_CHANCE + agility_diff * 1))
            if random.random() * 100 < stone_success_chance:
                # Calculate dynamic multiplier: 1.1 + agility_diff * 0.1
                stone_multiplier = STONE_BASE_MULTIPLIER + agility_diff * 0.1

                # Level-based scaling: reduce effectiveness at higher levels
                # Stone is a level 1 item, so it becomes less effective at higher levels
                level_penalty = 1.0 - (attacker.level - 1) * STONE_LEVEL_PENALTY
                level_penalty = max(MIN_STONE_EFFECTIVENESS, level_penalty)
                stone_multiplier = 1.0 + (stone_multiplier - 1.0) * level_penalty

                # Check for slingshot enhancement (in hand equipment)
                has_slingshot = any(equip and equip.item_type == "slingshot" for equip in attacker.hand_equipment)
                if has_slingshot:
                    stone_multiplier += SLINGSHOT_BONUS

                damage *= stone_multiplier
                item.uses_remaining -= 1
                equipment_used = True
                effect_type = "stone_with_slingshot" if has_slingshot else "stone_used"
                break

    # Check for equipment usage (big stone) - only in basic equipment slots
    for i, item in enumerate(attacker.equipment):
        if item and item.item_type == "big_stone" and item.uses_remaining > 0:
            # Calculate big stone success chance: same as stone
            stone_success_chance = min(100, max(0, STONE_BASE_SUCCESS_CHANCE + agility_diff * 1))
            if random.random() * 100 < stone_success_chance:
                # Calculate dynamic multiplier: same as stone
                stone_multiplier = STONE_BASE_MULTIPLIER + agility_diff * 0.1

                # Level-based scaling: big stone is a level 2 item, optimal at level 2
                level_penalty = 1.0 - (attacker.level - 2) * STONE_LEVEL_PENALTY
                level_penalty = max(MIN_STONE_EFFECTIVENESS, level_penalty)
                stone_multiplier = 1.0 + (stone_multiplier - 1.0) * level_penalty

                # Check for slingshot enhancement (in hand equipment)
                has_slingshot = any(equip and equip.item_type == "slingshot" for equip in attacker.hand_equipment)
                if has_slingshot:
                    stone_multiplier += SLINGSHOT_BONUS

                damage *= stone_multiplier
                item.uses_remaining -= 1
                equipment_used = True
                if "stone_with_slingshot" in effect_type or effect_type == "stone_used":
                    effect_type = "stones_with_slingshot" if has_slingshot else "stones_used"
                else:
                    effect_type = "big_stone_with_slingshot" if has_slingshot else "big_stone_used"
                break

    # Check for equipment usage (metal ball) - only in basic equipment slots
    for i, item in enumerate(attacker.equipment):
        if item and item.item_type == "metal_ball" and item.uses_remaining > 0:
            # Calculate metal ball success chance: same as stone/big stone
            stone_success_chance = min(100, max(0, STONE_BASE_SUCCESS_CHANCE + agility_diff * 1))
            if random.random() * 100 < stone_success_chance:
                # Calculate dynamic multiplier: same effect as big stone at level 2
                stone_multiplier = STONE_BASE_MULTIPLIER + agility_diff * 0.1

                # Level-based scaling: metal ball is a level 3 item, optimal at level 3, decreased at level 4+
                if attacker.level >= 4:
                    # At level 4+, effectiveness decreases by 15% per level above 3
                    level_penalty = 1.0 - (attacker.level - 3) * STONE_LEVEL_PENALTY
                    level_penalty = max(MIN_STONE_EFFECTIVENESS, level_penalty)
                else:
                    # At level 3, full effectiveness
                    level_penalty = 1.0

                stone_multiplier = 1.0 + (stone_multiplier - 1.0) * level_penalty

                # Check for slingshot enhancement (in hand equipment)
                has_slingshot = any(equip and equip.item_type == "slingshot" for equip in attacker.hand_equipment)
                if has_slingshot:
                    stone_multiplier += SLINGSHOT_BONUS

                damage *= stone_multiplier
                item.uses_remaining -= 1
                equipment_used = True
                if "stone_with_slingshot" in effect_type or effect_type == "stone_used" or "big_stone" in effect_type:
                    # Multiple projectiles used
                    effect_type = "multiple_projectiles_with_slingshot" if has_slingshot else "multiple_projectiles_used"
                else:
                    effect_type = "metal_ball_with_slingshot" if has_slingshot else "metal_ball_used"
                break

    return damage, effect_type, equipment_used


def apply_melee_effects(damage: float, attacker: Player) -> Tuple[float, str]:
    """Apply wooden stick, club, knife, and blade effects"""
    effect_type = "normal"

    # Check for wooden sticks and big wooden sticks (works every round) - only in hand equipment slots
    stick_count = 0
    stick_multipliers = []

    # Count sticks and prepare multipliers (excluding small clubs)
    for i, item in enumerate(attacker.hand_equipment):
        if item and item.item_type in ["wooden_stick", "big_wooden_stick"]:
            stick_count += 1

            if item.item_type == "wooden_stick":
                # Level-based scaling: wooden stick is a level 1 item
                level_penalty = 1.0 - (attacker.level - 1) * STICK_LEVEL_PENALTY
                level_penalty = max(MIN_STICK_EFFECTIVENESS, level_penalty)
            elif item.item_type == "big_wooden_stick":
                # Level-based scaling: big wooden stick is a level 2 item
                level_penalty = 1.0 - (attacker.level - 2) * STICK_LEVEL_PENALTY
                level_penalty = max(MIN_STICK_EFFECTIVENESS, level_penalty)

            scaled_multiplier = 1.0 + (item.effect_multiplier - 1.0) * level_penalty
            stick_multipliers.append(scaled_multiplier)

    # Apply stick multipliers with dual stick penalty if needed
    if stick_count == 2:
        # When using 2 sticks, each stick's effect is reduced by 35%
        for multiplier in stick_multipliers:
            reduced_multiplier = 1.0 + (multiplier - 1.0) * DUAL_STICK_PENALTY
            damage *= reduced_multiplier
    else:
        # Single stick: apply full effect
        for multiplier in stick_multipliers:
            damage *= multiplier

    # Handle small clubs separately (with dual-wield penalty, but higher than single club)
    small_club_count = 0
    small_club_multipliers = []

    # Count small clubs and prepare multipliers
    for i, item in enumerate(attacker.hand_equipment):
        if item and item.item_type == "small_club":
            small_club_count += 1

            # Level-based scaling: small club is a level 3 item, decreased at level 4+
            if attacker.level >= 4:
                level_penalty = 1.0 - (attacker.level - 3) * CLUB_LEVEL_PENALTY
                level_penalty = max(MIN_CLUB_EFFECTIVENESS, level_penalty)
            else:
                # At level 3, full effectiveness
                level_penalty = 1.0

            scaled_multiplier = 1.0 + (item.effect_multiplier - 1.0) * level_penalty
            small_club_multipliers.append(scaled_multiplier)

    # Apply small club multipliers with special dual-wield penalty
    if small_club_count == 2:
        # When using 2 small clubs, each club's effect is reduced by 25% (less penalty than sticks)
        # But total damage is still higher than using 1 small club
        for multiplier in small_club_multipliers:
            reduced_multiplier = 1.0 + (multiplier - 1.0) * DUAL_CLUB_PENALTY
            damage *= reduced_multiplier
    else:
        # Single small club: apply full effect
        for multiplier in small_club_multipliers:
            damage *= multiplier

    # Handle knives and blades separately (no dual-wield penalty)
    knife_blade_count = 0
    knife_blade_multipliers = []

    # Count knives and blades and prepare multipliers
    for i, item in enumerate(attacker.hand_equipment):
        if item and item.item_type in ["knife", "blade"]:
            knife_blade_count += 1

            if item.item_type == "knife":
                # Level-based scaling: knife is a level 2 item
                level_penalty = 1.0 - (attacker.level - 2) * STICK_LEVEL_PENALTY
                level_penalty = max(MIN_STICK_EFFECTIVENESS, level_penalty)
            elif item.item_type == "blade":
                # Level-based scaling: blade is a level 3 item, decreased at level 4+
                if attacker.level >= 4:
                    level_penalty = 1.0 - (attacker.level - 3) * CLUB_LEVEL_PENALTY
                    level_penalty = max(MIN_CLUB_EFFECTIVENESS, level_penalty)
                else:
                    # At level 3, full effectiveness
                    level_penalty = 1.0

            scaled_multiplier = 1.0 + (item.effect_multiplier - 1.0) * level_penalty
            knife_blade_multipliers.append(scaled_multiplier)

    # Apply knife/blade multipliers (NO dual-wield penalty - this is the knife/blade advantage)
    for multiplier in knife_blade_multipliers:
        damage *= multiplier

    # Update effect type based on weapon usage
    total_melee_count = stick_count + small_club_count

    if total_melee_count > 0:
        if stick_count == 2:
            effect_type = "dual_sticks_used"
        else:
            effect_type = "stick_used"

    # Update effect type based on knife/blade usage
    if knife_blade_count > 0:
        if stick_count > 0:
            # Mixed weapons (sticks and knives/blades)
            if knife_blade_count == 2:
                effect_type = f"{effect_type}_and_dual_knives"
            elif knife_blade_count == 1:
                effect_type = f"{effect_type}_and_knife"
        else:
            # Only knives/blades
            if knife_blade_count == 2:
                effect_type = "dual_knives_used"
            else:
                effect_type = "knife_used"

    return damage, effect_type


def check_fear_spell_usage(caster: Player) -> bool:
    """Check if player can and will cast Fear spell this round"""
    # Check if player has fear spell and enough mana
    if caster.mana < FEAR_SPELL_MANA_COST:
        return False

    for item in caster.equipment:
        if item and item.item_type == "fear_spell":
            # Auto-cast: always use fear spell when mana is available
            caster.mana -= FEAR_SPELL_MANA_COST
            return True

    return False


def check_scream_spell_usage(caster: Player, scream_active: bool) -> bool:
    """Check if player can and will cast Scream spell this round"""
    # Check if player has scream spell, enough mana, and hasn't used it yet
    if caster.mana < SCREAM_SPELL_MANA_COST:
        return False

    # Check if scream is already active for this player
    if scream_active:
        return False

    for item in caster.equipment:
        if item and item.item_type == "scream_spell":
            # Auto-cast: use scream spell when mana is available and not already active
            caster.mana -= SCREAM_SPELL_MANA_COST
            return True

    return False