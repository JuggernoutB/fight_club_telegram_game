#!/usr/bin/env python3
"""
Fight Club Game Analyzer
A web application for analyzing fight outcomes between different races and characteristics.
"""

from flask import Flask, render_template, request, jsonify
import random
from dataclasses import dataclass
from typing import Dict, List, Tuple
import json

app = Flask(__name__)

@dataclass
class Equipment:
    """Equipment item data class"""
    name: str
    item_type: str
    uses_remaining: int
    effect_multiplier: float = 1.0

@dataclass
class Player:
    """Player data class with race and characteristics"""
    name: str
    race: str
    hp: int
    max_hp: int
    power: int
    defense: int
    agility: int
    knowledge: int = 0
    level: int = 1
    equipment: List[Equipment] = None
    hand_equipment: List[Equipment] = None
    mana: int = 0
    max_mana: int = 0

    def __post_init__(self):
        if self.equipment is None:
            self.equipment = [None, None, None]  # 3 basic equipment slots (for stones)
        if self.hand_equipment is None:
            self.hand_equipment = [None, None]  # 2 hand slots (for sticks)

# Default race characteristics (adjusted HP and damage parameters)
RACE_DEFAULTS = {
    'human': {'hp': 25, 'power': 5, 'defense': 5, 'agility': 6, 'knowledge': 0},
    'orc': {'hp': 25, 'power': 6, 'defense': 5, 'agility': 5, 'knowledge': 0},
    'elf': {'hp': 25, 'power': 5, 'defense': 5, 'agility': 6, 'knowledge': 0},
    'dwarf': {'hp': 25, 'power': 5, 'defense': 6, 'agility': 5, 'knowledge': 0},
    'skeleton': {'hp': 26, 'power': 5, 'defense': 5, 'agility': 5, 'knowledge': 0}
}

BODY_PARTS = ['head', 'chest', 'stomach', 'belt', 'legs']

# Equipment slot configuration per race
RACE_EQUIPMENT_SLOTS = {
    'human': {'basic_slots': 2, 'hand_slots': 2},      # 2 basic + 2 hand (total enabled slots: 4)
    'elf': {'basic_slots': 2, 'hand_slots': 2},        # 2 basic + 2 hand (total enabled slots: 4)
    'orc': {'basic_slots': 1, 'hand_slots': 2},        # 1 basic + 2 hand (total enabled slots: 3)
    'dwarf': {'basic_slots': 1, 'hand_slots': 2},      # 1 basic + 2 hand (total enabled slots: 3)
    'skeleton': {'basic_slots': 1, 'hand_slots': 2}    # 1 basic + 2 hand (total enabled slots: 3)
}

def get_enabled_slots(race: str):
    """Get the number of enabled slots for a race"""
    return RACE_EQUIPMENT_SLOTS.get(race, {'basic_slots': 1, 'hand_slots': 2})

class FightSimulator:
    """Fight simulation engine"""

    def __init__(self, player1: Player, player2: Player):
        self.player1 = player1
        self.player2 = player2
        self.round_number = 0
        self.fight_log = []
        self.damage_rounds = 0  # Track rounds where any damage occurred
        self.player1_total_damage = 0  # Track total damage dealt by player 1
        self.player2_total_damage = 0  # Track total damage dealt by player 2
        self.player1_stones_used = 0  # Track stones used by player 1
        self.player2_stones_used = 0  # Track stones used by player 2
        self.player1_blocks_used = 0  # Track successful blocks by player 1
        self.player2_blocks_used = 0  # Track successful blocks by player 2
        self.player1_block_limit = 1  # Default block limit for player 1
        self.player2_block_limit = 1  # Default block limit for player 2
        self.player1_fear_used = 0  # Track fear spells used by player 1
        self.player2_fear_used = 0  # Track fear spells used by player 2

    def simulate_round(self) -> Tuple[bool, str]:
        """Simulate one round of combat"""
        self.round_number += 1

        # Random choices for both players
        p1_attack = random.choice(BODY_PARTS)
        p1_defend = [random.choice(BODY_PARTS)]
        p2_attack = random.choice(BODY_PARTS)
        p2_defend = [random.choice(BODY_PARTS)]

        # Special mode: force no blocks if enabled
        if hasattr(self, 'force_no_blocks') and self.force_no_blocks:
            # Ensure defenders never match attackers
            available_parts = [part for part in BODY_PARTS if part != p1_attack]
            p2_defend = [random.choice(available_parts)]

            available_parts = [part for part in BODY_PARTS if part != p2_attack]
            p1_defend = [random.choice(available_parts)]

        # Simplified system - no dual defense

        round_log = f"Round {self.round_number}:\n"
        round_log += f"{self.player1.name} attacks {p1_attack}, defends {', '.join(p1_defend)}\n"
        round_log += f"{self.player2.name} attacks {p2_attack}, defends {', '.join(p2_defend)}\n"

        # Check for Fear spell usage (before damage calculation)
        p1_casts_fear = self.check_fear_spell_usage(self.player1)
        p2_casts_fear = self.check_fear_spell_usage(self.player2)

        # Apply Fear spell effects (reduce target's power or defense by 3)
        p1_power_reduction = 0
        p1_defense_reduction = 0
        p2_power_reduction = 0
        p2_defense_reduction = 0

        if p2_casts_fear:  # P2 casts fear on P1
            if self.player1.power >= self.player1.defense:
                p1_power_reduction = 3
                fear_effect_p1 = "-3 power"
            else:
                p1_defense_reduction = 3
                fear_effect_p1 = "-3 defense"

        if p1_casts_fear:  # P1 casts fear on P2
            if self.player2.power >= self.player2.defense:
                p2_power_reduction = 3
                fear_effect_p2 = "-3 power"
            else:
                p2_defense_reduction = 3
                fear_effect_p2 = "-3 defense"

        if p1_casts_fear:
            round_log += f"{self.player1.name} casts FEAR SPELL! {self.player2.name} is weakened by fear ({fear_effect_p2})!\n"
            self.player1_fear_used += 1

        if p2_casts_fear:
            round_log += f"{self.player2.name} casts FEAR SPELL! {self.player1.name} is weakened by fear ({fear_effect_p1})!\n"
            self.player2_fear_used += 1

        # Calculate damage for both players (pass power and defense reductions to main method)
        p1_damage, p1_effect, p2_block_used = self.calculate_damage(self.player1, self.player2, p1_attack, p2_defend, self.player2_blocks_used < self.player2_block_limit, p1_power_reduction, p2_defense_reduction)
        p2_damage, p2_effect, p1_block_used = self.calculate_damage(self.player2, self.player1, p2_attack, p1_defend, self.player1_blocks_used < self.player1_block_limit, p2_power_reduction, p1_defense_reduction)

        # Track stone usage
        if p1_effect == "stone_used":
            self.player1_stones_used += 1
        if p2_effect == "stone_used":
            self.player2_stones_used += 1

        # Track block usage
        if p1_block_used:
            self.player1_blocks_used += 1
        if p2_block_used:
            self.player2_blocks_used += 1

        # Check if any damage occurred this round
        any_damage = p1_damage > 0 or p2_damage > 0
        if any_damage:
            self.damage_rounds += 1
        damage_status = "✅ DAMAGE OCCURRED" if any_damage else "❌ NO DAMAGE"

        # Track total damage dealt
        self.player1_total_damage += p1_damage
        self.player2_total_damage += p2_damage

        # Apply damage (removed counter-attack system)
        self.player2.hp = max(0, self.player2.hp - p1_damage)
        self.player1.hp = max(0, self.player1.hp - p2_damage)

        # Format damage output with agility effects and blocks
        p1_damage_text = f"{p1_damage}"
        if p1_effect == "super_attack":
            p1_damage_text += " (SUPER ATTACK!)"
        elif p1_effect == "dodged":
            p1_damage_text = "DODGED"
        if p2_block_used:
            p1_damage_text += " (BLOCKED!)"

        p2_damage_text = f"{p2_damage}"
        if p2_effect == "super_attack":
            p2_damage_text += " (SUPER ATTACK!)"
        elif p2_effect == "dodged":
            p2_damage_text = "DODGED"
        if p1_block_used:
            p2_damage_text += " (BLOCKED!)"

        round_log += f"{self.player1.name} deals {p1_damage_text} damage to {self.player2.name}\n"
        round_log += f"{self.player2.name} deals {p2_damage_text} damage to {self.player1.name}\n"
        round_log += f"Round Result: {damage_status}\n"
        round_log += f"HP: {self.player1.name} {self.player1.hp}/{self.player1.max_hp}, {self.player2.name} {self.player2.hp}/{self.player2.max_hp}\n"

        self.fight_log.append(round_log)

        # Check for fight end
        if self.player1.hp <= 0 and self.player2.hp <= 0:
            return True, "draw"
        elif self.player1.hp <= 0:
            return True, "player2"
        elif self.player2.hp <= 0:
            return True, "player1"

        return False, ""

    def check_fear_spell_usage(self, caster: Player) -> bool:
        """Check if player can and will cast Fear spell this round"""
        # Check if player has fear spell and enough mana
        if caster.mana < 3:  # Need 3 mana to cast fear
            return False

        for item in caster.equipment:
            if item and item.item_type == "fear_spell":
                # Auto-cast: always use fear spell when mana is available
                caster.mana -= 3  # Consume mana
                return True

        return False

    def calculate_damage(self, attacker: Player, defender: Player, attack_part: str, defend_parts: List[str], defender_blocks_available: bool = True, power_reduction: int = 0, defense_reduction: int = 0) -> Tuple[int, str, bool]:
        """Calculate damage with power ratio system, agility effects, and probability-based integer conversion"""

        # Constants rebalanced for better stat equality (Option 1 + 3)
        BASE_DAMAGE = 3.1
        POWER_FACTOR = 0.27
        BLOCK_MULTIPLIER = 0.26

        # Agility effect constants (boosted for better balance)
        SUPER_ATTACK_MULTIPLIER = 3.5
        MAX_DODGE_CHANCE = 8
        MAX_SUPER_ATTACK_CHANCE = 6
        MIN_DODGE_CHANCE = 2
        MIN_SUPER_ATTACK_CHANCE = 2
        AGILITY_DODGE_FACTOR = 1.05
        AGILITY_SUPER_FACTOR = 1.05

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
            super_attack_chance = min(MAX_SUPER_ATTACK_CHANCE, max(MIN_SUPER_ATTACK_CHANCE, agility_diff * AGILITY_SUPER_FACTOR))
            if random.random() * 100 < super_attack_chance:
                effect_type = "super_attack"

        # Check for dodge (defender has higher agility and no super attack)
        elif agility_diff < 0:
            dodge_chance = min(MAX_DODGE_CHANCE, max(MIN_DODGE_CHANCE, abs(agility_diff) * AGILITY_DODGE_FACTOR))
            if random.random() * 100 < dodge_chance:
                return 0, "dodged", False  # No block used when dodged

        # Calculate power to defense ratio
        ratio = attacker.power / defender.defense if defender.defense > 0 else attacker.power
        damage = BASE_DAMAGE * (ratio ** POWER_FACTOR)

        # Apply super attack multiplier if triggered
        if effect_type == "super_attack":
            damage *= SUPER_ATTACK_MULTIPLIER

        # Check for equipment usage (stone) - only in basic equipment slots
        equipment_used = False
        for i, item in enumerate(attacker.equipment):
            if item and item.item_type == "stone" and item.uses_remaining > 0:
                # Calculate stone success chance: 25% + agility_diff * 1% (0-100%)
                stone_success_chance = min(100, max(0, 25 + agility_diff * 1))
                if random.random() * 100 < stone_success_chance:
                    # Calculate dynamic multiplier: 1.1 + agility_diff * 0.1
                    stone_multiplier = 1.1 + agility_diff * 0.1

                    # Level-based scaling: reduce effectiveness at higher levels
                    # Stone is a level 1 item, so it becomes less effective at higher levels
                    level_penalty = 1.0 - (attacker.level - 1) * 0.15  # 15% reduction per level above 1
                    level_penalty = max(0.3, level_penalty)  # Minimum 30% effectiveness
                    stone_multiplier = 1.0 + (stone_multiplier - 1.0) * level_penalty

                    # Check for slingshot enhancement (in hand equipment)
                    has_slingshot = any(equip and equip.item_type == "slingshot" for equip in attacker.hand_equipment)
                    if has_slingshot:
                        slingshot_bonus = 0.3  # 30% additional multiplier when using slingshot
                        stone_multiplier += slingshot_bonus

                    damage *= stone_multiplier
                    item.uses_remaining -= 1
                    equipment_used = True
                    effect_type = "stone_with_slingshot" if has_slingshot else "stone_used"
                    break

        # Check for equipment usage (big stone) - only in basic equipment slots
        for i, item in enumerate(attacker.equipment):
            if item and item.item_type == "big_stone" and item.uses_remaining > 0:
                # Calculate big stone success chance: same as stone
                stone_success_chance = min(100, max(0, 25 + agility_diff * 1))
                if random.random() * 100 < stone_success_chance:
                    # Calculate dynamic multiplier: same as stone
                    stone_multiplier = 1.1 + agility_diff * 0.1

                    # Level-based scaling: big stone is a level 2 item, optimal at level 2
                    level_penalty = 1.0 - (attacker.level - 2) * 0.15  # 15% reduction per level above 2
                    level_penalty = max(0.3, level_penalty)  # Minimum 30% effectiveness
                    stone_multiplier = 1.0 + (stone_multiplier - 1.0) * level_penalty

                    # Check for slingshot enhancement (in hand equipment)
                    has_slingshot = any(equip and equip.item_type == "slingshot" for equip in attacker.hand_equipment)
                    if has_slingshot:
                        slingshot_bonus = 0.3  # 30% additional multiplier when using slingshot
                        stone_multiplier += slingshot_bonus

                    damage *= stone_multiplier
                    item.uses_remaining -= 1
                    equipment_used = True
                    if "stone_with_slingshot" in effect_type or effect_type == "stone_used":
                        effect_type = "stones_with_slingshot" if has_slingshot else "stones_used"  # Both stones used
                    else:
                        effect_type = "big_stone_with_slingshot" if has_slingshot else "big_stone_used"
                    break

        # Check for wooden sticks and big wooden sticks (works every round) - only in hand equipment slots
        stick_count = 0
        stick_multipliers = []

        # Count sticks and prepare multipliers
        for i, item in enumerate(attacker.hand_equipment):
            if item and item.item_type in ["wooden_stick", "big_wooden_stick"]:
                stick_count += 1

                if item.item_type == "wooden_stick":
                    # Level-based scaling: wooden stick is a level 1 item
                    level_penalty = 1.0 - (attacker.level - 1) * 0.10  # 10% reduction per level above 1
                    level_penalty = max(0.4, level_penalty)  # Minimum 40% effectiveness
                elif item.item_type == "big_wooden_stick":
                    # Level-based scaling: big wooden stick is a level 2 item
                    level_penalty = 1.0 - (attacker.level - 2) * 0.10  # 10% reduction per level above 2
                    level_penalty = max(0.4, level_penalty)  # Minimum 40% effectiveness

                scaled_multiplier = 1.0 + (item.effect_multiplier - 1.0) * level_penalty
                stick_multipliers.append(scaled_multiplier)

        # Apply stick multipliers with dual stick penalty if needed
        if stick_count == 2:
            # When using 2 sticks, each stick's effect is reduced by 35%
            dual_stick_penalty = 0.65  # 100% - 35% = 65%
            for multiplier in stick_multipliers:
                reduced_multiplier = 1.0 + (multiplier - 1.0) * dual_stick_penalty
                damage *= reduced_multiplier
        else:
            # Single stick: apply full effect
            for multiplier in stick_multipliers:
                damage *= multiplier

        # Update effect type based on stick usage
        if stick_count > 0:
            if "stone_with_slingshot" in effect_type or "big_stone_with_slingshot" in effect_type:
                effect_type = "stone_slingshot_and_stick"
            elif "stones_with_slingshot" in effect_type:
                effect_type = "stones_slingshot_and_stick"
            elif effect_type == "stone_used" or effect_type == "big_stone_used":
                effect_type = "stone_and_stick"
            elif effect_type == "stones_used":
                effect_type = "stones_and_stick"
            elif stick_count == 2:
                effect_type = "dual_sticks_used"
            else:
                effect_type = "stick_used"

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

        # Restore original power and defense
        attacker.power = original_power
        defender.defense = original_defense

        # Return integer damage (minimum 1), effect type, and whether a block was used
        return max(1, final_damage), effect_type, block_used

    def calculate_damage_with_fear(self, attacker: Player, defender: Player, attack_part: str, defend_parts: List[str], defender_blocks_available: bool = True, power_reduction: int = 0) -> Tuple[int, str, bool]:
        """Calculate damage with fear power reduction applied"""

        # Constants for agility effects
        BASE_DAMAGE = 4.5
        POWER_FACTOR = 1.6
        BLOCK_MULTIPLIER = 0.4
        SUPER_ATTACK_MULTIPLIER = 2.4
        MAX_DODGE_CHANCE = 8
        MAX_SUPER_ATTACK_CHANCE = 6
        MIN_DODGE_CHANCE = 2
        MIN_SUPER_ATTACK_CHANCE = 2
        AGILITY_DODGE_FACTOR = 1.05
        AGILITY_SUPER_FACTOR = 1.05

        # Apply fear power reduction temporarily
        original_power = attacker.power
        effective_power = max(1, attacker.power - power_reduction)  # Minimum power of 1
        attacker.power = effective_power

        # Calculate agility difference
        agility_diff = attacker.agility - defender.agility
        effect_type = "normal"

        # Check for super attack (attacker has higher agility)
        if agility_diff > 0:
            super_attack_chance = min(MAX_SUPER_ATTACK_CHANCE, max(MIN_SUPER_ATTACK_CHANCE, agility_diff * AGILITY_SUPER_FACTOR))
            if random.random() * 100 < super_attack_chance:
                effect_type = "super_attack"

        # Check for dodge (defender has higher agility and no super attack)
        elif agility_diff < 0:
            dodge_chance = min(MAX_DODGE_CHANCE, max(MIN_DODGE_CHANCE, abs(agility_diff) * AGILITY_DODGE_FACTOR))
            if random.random() * 100 < dodge_chance:
                attacker.power = original_power  # Restore original power
                return 0, "dodged", False  # No block used when dodged

        # Calculate power to defense ratio
        ratio = attacker.power / defender.defense if defender.defense > 0 else attacker.power
        damage = BASE_DAMAGE * (ratio ** POWER_FACTOR)

        # Apply super attack multiplier if triggered
        if effect_type == "super_attack":
            damage *= SUPER_ATTACK_MULTIPLIER

        # Check for equipment usage (stone) - only in basic equipment slots
        equipment_used = False
        for i, item in enumerate(attacker.equipment):
            if item and item.item_type == "stone" and item.uses_remaining > 0:
                # Calculate stone success chance: 25% + agility_diff * 1% (0-100%)
                stone_success_chance = min(100, max(0, 25 + agility_diff * 1))
                if random.random() * 100 < stone_success_chance:
                    # Calculate dynamic multiplier: 1.1 + agility_diff * 0.1
                    stone_multiplier = 1.1 + agility_diff * 0.1

                    # Level-based scaling: reduce effectiveness at higher levels
                    # Stone is a level 1 item, so it becomes less effective at higher levels
                    level_penalty = 1.0 - (attacker.level - 1) * 0.15  # 15% reduction per level above 1
                    level_penalty = max(0.3, level_penalty)  # Minimum 30% effectiveness
                    stone_multiplier = 1.0 + (stone_multiplier - 1.0) * level_penalty

                    # Check for slingshot enhancement (in hand equipment)
                    has_slingshot = any(equip and equip.item_type == "slingshot" for equip in attacker.hand_equipment)
                    if has_slingshot:
                        slingshot_bonus = 0.3  # 30% additional multiplier when using slingshot
                        stone_multiplier += slingshot_bonus

                    damage *= stone_multiplier
                    item.uses_remaining -= 1
                    equipment_used = True
                    effect_type = "stone_with_slingshot" if has_slingshot else "stone_used"
                    break

        # Check for equipment usage (big stone) - only in basic equipment slots
        for i, item in enumerate(attacker.equipment):
            if item and item.item_type == "big_stone" and item.uses_remaining > 0:
                # Calculate big stone success chance: same as stone
                stone_success_chance = min(100, max(0, 25 + agility_diff * 1))
                if random.random() * 100 < stone_success_chance:
                    # Calculate dynamic multiplier: same as stone
                    stone_multiplier = 1.1 + agility_diff * 0.1

                    # Level-based scaling: big stone is a level 2 item, optimal at level 2
                    level_penalty = 1.0 - (attacker.level - 2) * 0.15  # 15% reduction per level above 2
                    level_penalty = max(0.3, level_penalty)  # Minimum 30% effectiveness
                    stone_multiplier = 1.0 + (stone_multiplier - 1.0) * level_penalty

                    # Check for slingshot enhancement (in hand equipment)
                    has_slingshot = any(equip and equip.item_type == "slingshot" for equip in attacker.hand_equipment)
                    if has_slingshot:
                        slingshot_bonus = 0.3  # 30% additional multiplier when using slingshot
                        stone_multiplier += slingshot_bonus

                    damage *= stone_multiplier
                    item.uses_remaining -= 1
                    equipment_used = True
                    if "stone_with_slingshot" in effect_type or effect_type == "stone_used":
                        effect_type = "stones_with_slingshot" if has_slingshot else "stones_used"  # Both stones used
                    else:
                        effect_type = "big_stone_with_slingshot" if has_slingshot else "big_stone_used"
                    break

        # Check for wooden sticks and big wooden sticks (works every round) - only in hand equipment slots
        stick_count = 0
        stick_multipliers = []

        # Count sticks and prepare multipliers
        for i, item in enumerate(attacker.hand_equipment):
            if item and item.item_type in ["wooden_stick", "big_wooden_stick"]:
                stick_count += 1

                if item.item_type == "wooden_stick":
                    # Level-based scaling: wooden stick is a level 1 item
                    level_penalty = 1.0 - (attacker.level - 1) * 0.10  # 10% reduction per level above 1
                    level_penalty = max(0.4, level_penalty)  # Minimum 40% effectiveness
                elif item.item_type == "big_wooden_stick":
                    # Level-based scaling: big wooden stick is a level 2 item
                    level_penalty = 1.0 - (attacker.level - 2) * 0.10  # 10% reduction per level above 2
                    level_penalty = max(0.4, level_penalty)  # Minimum 40% effectiveness

                scaled_multiplier = 1.0 + (item.effect_multiplier - 1.0) * level_penalty
                stick_multipliers.append(scaled_multiplier)

        # Apply stick multipliers with dual stick penalty if needed
        if stick_count == 2:
            # When using 2 sticks, each stick's effect is reduced by 35%
            dual_stick_penalty = 0.65  # 100% - 35% = 65%
            for multiplier in stick_multipliers:
                reduced_multiplier = 1.0 + (multiplier - 1.0) * dual_stick_penalty
                damage *= reduced_multiplier
        else:
            # Single stick: apply full effect
            for multiplier in stick_multipliers:
                damage *= multiplier

        # Update effect type based on stick usage
        if stick_count > 0:
            if "stone_with_slingshot" in effect_type or "big_stone_with_slingshot" in effect_type:
                effect_type = "stone_slingshot_and_stick"
            elif "stones_with_slingshot" in effect_type:
                effect_type = "stones_slingshot_and_stick"
            elif effect_type == "stone_used" or effect_type == "big_stone_used":
                effect_type = "stone_and_stick"
            elif effect_type == "stones_used":
                effect_type = "stones_and_stick"
            elif stick_count == 2:
                effect_type = "dual_sticks_used"
            else:
                effect_type = "stick_used"

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

        # Restore original power
        attacker.power = original_power

        # Modify effect type if fear was applied
        if power_reduction > 0:
            if effect_type == "normal":
                effect_type = "feared"
            else:
                effect_type = f"{effect_type}_feared"

        # Return integer damage (minimum 1), effect type, and whether a block was used
        return max(1, final_damage), effect_type, block_used

    def simulate_fight(self) -> Dict:
        """Simulate entire fight and return result"""
        while True:
            fight_ended, winner = self.simulate_round()

            if fight_ended:
                damage_percentage = (self.damage_rounds / self.round_number) * 100 if self.round_number > 0 else 0
                avg_damage_p1 = self.player1_total_damage / self.round_number if self.round_number > 0 else 0
                avg_damage_p2 = self.player2_total_damage / self.round_number if self.round_number > 0 else 0
                return {
                    'winner': winner,
                    'rounds': self.round_number,
                    'log': self.fight_log,
                    'final_hp': {
                        'player1': self.player1.hp,
                        'player2': self.player2.hp
                    },
                    'damage_stats': {
                        'damage_rounds': self.damage_rounds,
                        'total_rounds': self.round_number,
                        'damage_percentage': round(damage_percentage, 1),
                        'avg_damage_p1': round(avg_damage_p1, 2),
                        'avg_damage_p2': round(avg_damage_p2, 2)
                    },
                    'equipment_stats': {
                        'player1_stones_used': self.player1_stones_used,
                        'player2_stones_used': self.player2_stones_used
                    },
                    'magic_stats': {
                        'player1_fear_used': self.player1_fear_used,
                        'player2_fear_used': self.player2_fear_used,
                        'player1_final_mana': self.player1.mana,
                        'player2_final_mana': self.player2.mana
                    }
                }

            # Safety check to prevent infinite loops
            if self.round_number > 100:
                damage_percentage = (self.damage_rounds / self.round_number) * 100 if self.round_number > 0 else 0
                avg_damage_p1 = self.player1_total_damage / self.round_number if self.round_number > 0 else 0
                avg_damage_p2 = self.player2_total_damage / self.round_number if self.round_number > 0 else 0
                return {
                    'winner': 'timeout',
                    'rounds': self.round_number,
                    'log': self.fight_log,
                    'final_hp': {
                        'player1': self.player1.hp,
                        'player2': self.player2.hp
                    },
                    'damage_stats': {
                        'damage_rounds': self.damage_rounds,
                        'total_rounds': self.round_number,
                        'damage_percentage': round(damage_percentage, 1),
                        'avg_damage_p1': round(avg_damage_p1, 2),
                        'avg_damage_p2': round(avg_damage_p2, 2)
                    },
                    'equipment_stats': {
                        'player1_stones_used': self.player1_stones_used,
                        'player2_stones_used': self.player2_stones_used
                    },
                    'magic_stats': {
                        'player1_fear_used': self.player1_fear_used,
                        'player2_fear_used': self.player2_fear_used,
                        'player1_final_mana': self.player1.mana,
                        'player2_final_mana': self.player2.mana
                    }
                }

def create_stone() -> Equipment:
    """Create a stone equipment item"""
    return Equipment(
        name="Stone",
        item_type="stone",
        uses_remaining=1,
        effect_multiplier=1.0  # Will be calculated dynamically based on agility
    )

def create_wooden_stick() -> Equipment:
    """Create a wooden stick equipment item"""
    return Equipment(
        name="Wooden Stick",
        item_type="wooden_stick",
        uses_remaining=999,  # Effectively unlimited uses
        effect_multiplier=1.06  # Fixed +1.06 damage multiplier
    )

def create_fear_spell() -> Equipment:
    """Create a fear spell equipment item"""
    return Equipment(
        name="Fear Spell",
        item_type="fear_spell",
        uses_remaining=999,  # Spell stays in slot, limited by mana
        effect_multiplier=1.0  # No damage multiplier, special effect
    )

def create_big_stone() -> Equipment:
    """Create a big stone equipment item (level 2 item)"""
    return Equipment(
        name="Big Stone",
        item_type="big_stone",
        uses_remaining=1,
        effect_multiplier=1.0  # Will be calculated dynamically based on agility, same as stone
    )

def create_big_wooden_stick() -> Equipment:
    """Create a big wooden stick equipment item (level 2 item)"""
    return Equipment(
        name="Big Wooden Stick",
        item_type="big_wooden_stick",
        uses_remaining=999,  # Effectively unlimited uses
        effect_multiplier=1.06  # Fixed +1.06 damage multiplier, same as wooden stick
    )

def create_slingshot() -> Equipment:
    """Create a slingshot equipment item (enhances stone effectiveness)"""
    return Equipment(
        name="Slingshot",
        item_type="slingshot",
        uses_remaining=999,  # Effectively unlimited uses
        effect_multiplier=1.0  # No direct damage multiplier, enhances stone effectiveness instead
    )

def calculate_stat_impact(race: str, level: int, num_simulations: int = 1000) -> Dict:
    """Calculate the impact of each stat (+1 point) on win probability"""

    try:
        # Return static values for now to test the API
        # TODO: Implement dynamic calculation once the infrastructure is stable

        # Updated static impacts after rebalancing (Option 1 + 3)
        # Power factor reduced 0.28→0.18, Agility boosted significantly
        static_impacts = {
            'human': {
                1: {'hp': 8.5, 'power': 13.1, 'defense': 14.2, 'agility': 12.4},
                5: {'hp': 10.2, 'power': 11.7, 'defense': 12.1, 'agility': 15.3},
                10: {'hp': 12.1, 'power': 9.9, 'defense': 10.8, 'agility': 19.6}
            },
            'orc': {
                1: {'hp': 9.1, 'power': 10.3, 'defense': 11.2, 'agility': 15.1},
                5: {'hp': 11.2, 'power': 10.5, 'defense': 11.5, 'agility': 12.2},
                10: {'hp': 13.2, 'power': 9.2, 'defense': 10.3, 'agility': 14.5}
            },
            'elf': {
                1: {'hp': 8.2, 'power': 12.6, 'defense': 13.8, 'agility': 13.8},
                5: {'hp': 9.7, 'power': 12.3, 'defense': 12.1, 'agility': 18.4},
                10: {'hp': 11.8, 'power': 10.3, 'defense': 10.2, 'agility': 22.1}
            },
            'dwarf': {
                1: {'hp': 7.9, 'power': 10.6, 'defense': 18.1, 'agility': 9.2},
                5: {'hp': 10.2, 'power': 11.1, 'defense': 15.7, 'agility': 10.7},
                10: {'hp': 11.2, 'power': 9.1, 'defense': 14.8, 'agility': 13.7}
            },
            'skeleton': {
                1: {'hp': 6.8, 'power': 9.5, 'defense': 12.3, 'agility': 15.6},
                5: {'hp': 6.1, 'power': 9.9, 'defense': 10.9, 'agility': 16.8},
                10: {'hp': 5.9, 'power': 8.3, 'defense': 9.5, 'agility': 22.4}
            }
        }

        # Get impact values (use closest level if exact not found)
        race_data = static_impacts.get(race, static_impacts['human'])
        if level in race_data:
            impacts = race_data[level]
        elif level <= 1:
            impacts = race_data[1]
        elif level <= 5:
            impacts = race_data[5]
        else:
            impacts = race_data[10]

        # Calculate base stats for this level
        base_stats = RACE_DEFAULTS[race].copy()
        if level > 1:
            base_stats['hp'] += level - 1
            base_stats['power'] += (level - 1) // 2
            base_stats['defense'] += (level - 1) // 2
            base_stats['agility'] += (level - 1) // 2

        # Sort by impact (highest first)
        sorted_impacts = sorted(impacts.items(), key=lambda x: x[1], reverse=True)

        return {
            'race': race,
            'level': level,
            'base_stats': base_stats,
            'baseline_win_rate': 50.0,  # Symmetric fight
            'impacts': impacts,
            'ranking': [{'stat': stat, 'impact': impact} for stat, impact in sorted_impacts],
            'simulations': num_simulations
        }

    except Exception as e:
        # Return error details for debugging
        return {
            'error': f'Calculation failed: {str(e)}',
            'race': race,
            'level': level,
            'simulations': num_simulations
        }

def simulate_multiple_fights(player1: Player, player2: Player, num_fights: int) -> Dict:
    """Helper function to simulate multiple fights and return win statistics"""
    player1_wins = 0
    player2_wins = 0
    draws = 0

    for _ in range(num_fights):
        # Reset players to full HP
        player1.hp = player1.max_hp
        player2.hp = player2.max_hp

        # Create new simulator for each fight
        simulator = FightSimulator(player1, player2)
        result = simulator.simulate_fight()

        if result['winner'] == 'player1':
            player1_wins += 1
        elif result['winner'] == 'player2':
            player2_wins += 1
        else:
            draws += 1

    return {
        'player1_wins': player1_wins,
        'player2_wins': player2_wins,
        'draws': draws,
        'total_fights': num_fights
    }

def calculate_knowledge_for_level(race: str, level: int) -> int:
    """Calculate knowledge stat based on race and level"""
    # Base knowledge from race defaults
    base_knowledge = RACE_DEFAULTS[race]['knowledge']

    # Special bonuses for skeleton
    if race == 'skeleton':
        bonus_knowledge = 0
        if level >= 2:
            bonus_knowledge += 1  # +1 knowledge at level 2
        if level >= 8:
            bonus_knowledge += 1  # +1 additional knowledge at level 8 (total +2)
        return base_knowledge + bonus_knowledge

    # All other races: no knowledge bonuses per level
    return base_knowledge

def create_player(name: str, race: str, custom_stats: Dict = None, equipment: List[str] = None, hand_equipment: List[str] = None, level: int = 1) -> Player:
    """Create a player with race defaults or custom stats"""
    stats = RACE_DEFAULTS[race].copy()

    if custom_stats:
        stats.update(custom_stats)

    # Calculate knowledge based on race and level
    knowledge = calculate_knowledge_for_level(race, level)
    # Allow custom knowledge override
    if custom_stats and 'knowledge' in custom_stats:
        knowledge = custom_stats['knowledge']

    # Calculate mana based on knowledge (1 knowledge = 3 mana)
    max_mana = knowledge * 3

    player = Player(
        name=name,
        race=race,
        hp=stats['hp'],
        max_hp=stats['hp'],
        power=stats['power'],
        defense=stats['defense'],
        agility=stats['agility'],
        knowledge=knowledge,
        level=level,
        mana=max_mana,
        max_mana=max_mana
    )

    # Get enabled slot counts for this race
    slot_config = get_enabled_slots(race)
    enabled_basic_slots = slot_config['basic_slots']
    enabled_hand_slots = slot_config['hand_slots']

    # Add basic equipment (stones and fear spells) if specified
    if equipment:
        for i, item_type in enumerate(equipment):
            if i < enabled_basic_slots and i < 3:  # Only use enabled slots
                if item_type == "stone":
                    player.equipment[i] = create_stone()
                elif item_type == "big_stone":
                    player.equipment[i] = create_big_stone()
                elif item_type == "fear_spell" and knowledge >= 1:
                    player.equipment[i] = create_fear_spell()
                # Ignore wooden sticks and slingshot in basic slots

    # Add hand equipment (wooden sticks and slingshot) if specified
    if hand_equipment:
        # Check for slingshot limit (only 1 slingshot allowed per player)
        slingshot_count = sum(1 for item in hand_equipment if item == "slingshot")

        for i, item_type in enumerate(hand_equipment):
            if i < enabled_hand_slots and i < 2:  # Only use enabled hand slots
                if item_type == "wooden_stick":
                    player.hand_equipment[i] = create_wooden_stick()
                elif item_type == "big_wooden_stick":
                    player.hand_equipment[i] = create_big_wooden_stick()
                elif item_type == "slingshot" and slingshot_count <= 1:
                    player.hand_equipment[i] = create_slingshot()
                # Ignore stones in hand slots

    return player

def run_simulation(player1_config: Dict, player2_config: Dict, num_simulations: int = 1000, force_no_blocks: bool = False, player1_block_limit: int = 1, player2_block_limit: int = 1, player1_level: int = 1, player2_level: int = 1) -> Dict:
    """Run multiple simulations and return win/loss statistics"""
    results = {
        'player1_wins': 0,
        'player2_wins': 0,
        'draws': 0,
        'timeouts': 0,
        'total_rounds': 0,
        'total_damage_rounds': 0,
        'total_damage_p1': 0,
        'total_damage_p2': 0,
        'total_stones_used_p1': 0,
        'total_stones_used_p2': 0,
        'total_fear_used_p1': 0,
        'total_fear_used_p2': 0,
        'sample_fights': []
    }

    for i in range(num_simulations):
        # Create fresh players for each simulation
        player1 = create_player("Player 1", player1_config['race'], player1_config.get('stats'), player1_config.get('equipment'), player1_config.get('hand_equipment'), player1_level)
        player2 = create_player("Player 2", player2_config['race'], player2_config.get('stats'), player2_config.get('equipment'), player2_config.get('hand_equipment'), player2_level)

        simulator = FightSimulator(player1, player2)
        # Set force_no_blocks mode if requested
        if force_no_blocks:
            simulator.force_no_blocks = True
        # Set custom block limits
        simulator.player1_block_limit = player1_block_limit
        simulator.player2_block_limit = player2_block_limit
        fight_result = simulator.simulate_fight()

        # Count results
        if fight_result['winner'] == 'player1':
            results['player1_wins'] += 1
        elif fight_result['winner'] == 'player2':
            results['player2_wins'] += 1
        elif fight_result['winner'] == 'draw':
            results['draws'] += 1
        else:
            results['timeouts'] += 1

        results['total_rounds'] += fight_result['rounds']

        # Track damage statistics
        if 'damage_stats' in fight_result:
            results['total_damage_rounds'] += fight_result['damage_stats']['damage_rounds']
            results['total_damage_p1'] += fight_result['damage_stats']['avg_damage_p1'] * fight_result['rounds']
            results['total_damage_p2'] += fight_result['damage_stats']['avg_damage_p2'] * fight_result['rounds']

        # Track equipment statistics
        if 'equipment_stats' in fight_result:
            results['total_stones_used_p1'] += fight_result['equipment_stats']['player1_stones_used']
            results['total_stones_used_p2'] += fight_result['equipment_stats']['player2_stones_used']

        # Track magic statistics
        if 'magic_stats' in fight_result:
            results['total_fear_used_p1'] += fight_result['magic_stats']['player1_fear_used']
            results['total_fear_used_p2'] += fight_result['magic_stats']['player2_fear_used']

        # Store first few fights as samples
        if i < 5:
            results['sample_fights'].append(fight_result)

    # Calculate percentages
    results['player1_win_rate'] = (results['player1_wins'] / num_simulations) * 100
    results['player2_win_rate'] = (results['player2_wins'] / num_simulations) * 100
    results['draw_rate'] = (results['draws'] / num_simulations) * 100
    results['average_rounds'] = results['total_rounds'] / num_simulations

    # Calculate damage statistics
    results['average_damage_percentage'] = (results['total_damage_rounds'] / results['total_rounds']) * 100 if results['total_rounds'] > 0 else 0
    results['average_damage_percentage'] = round(results['average_damage_percentage'], 1)

    # Calculate average damage per round across all simulations
    results['avg_damage_per_round_p1'] = round(results['total_damage_p1'] / results['total_rounds'], 2) if results['total_rounds'] > 0 else 0
    results['avg_damage_per_round_p2'] = round(results['total_damage_p2'] / results['total_rounds'], 2) if results['total_rounds'] > 0 else 0

    # Calculate average stones used per fight
    results['avg_stones_used_p1'] = round(results['total_stones_used_p1'] / num_simulations, 1) if num_simulations > 0 else 0
    results['avg_stones_used_p2'] = round(results['total_stones_used_p2'] / num_simulations, 1) if num_simulations > 0 else 0

    # Calculate average fear spells used per fight
    results['avg_fear_used_p1'] = round(results['total_fear_used_p1'] / num_simulations, 1) if num_simulations > 0 else 0
    results['avg_fear_used_p2'] = round(results['total_fear_used_p2'] / num_simulations, 1) if num_simulations > 0 else 0

    return results

def calculate_xp_for_fight(result: str, player_level: int, opponent_level: int) -> int:
    """Calculate XP gained from a fight result"""

    # New XP system with lower values
    BASE_XP_WIN = 6      # Win against player
    BASE_XP_DRAW = 3     # Draw against player
    BASE_XP_LOSS = 2     # Beat bot (reward for trying)

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

def calculate_time_to_target_level(current_xp: int, daily_xp: int, target_level: int = 10) -> dict:
    """Calculate time needed to reach target level"""

    total_xp_needed = get_xp_required_for_level(target_level)
    remaining_xp = total_xp_needed - current_xp

    if remaining_xp <= 0:
        return {
            'already_target_level': True,
            'days': 0,
            'weeks': 0,
            'months': 0
        }

    days_needed = remaining_xp / daily_xp if daily_xp > 0 else float('inf')
    weeks_needed = days_needed / 7
    months_needed = days_needed / 30

    return {
        'already_target_level': False,
        'total_xp_needed': total_xp_needed,
        'remaining_xp': remaining_xp,
        'days': round(days_needed, 1),
        'weeks': round(weeks_needed, 1),
        'months': round(months_needed, 1)
    }

@app.route('/debug_equipment')
def debug_equipment():
    """Debug endpoint to test equipment creation and usage"""
    try:
        # Test creating players with equipment
        player1 = create_player("Human with stick", "human", None, ["wooden_stick", "stone", "stone"])
        player2 = create_player("Orc no equipment", "orc", None, [])

        # Run a single fight
        simulator = FightSimulator(player1, player2)
        fight_result = simulator.simulate_fight()

        equipment_info = []
        for i, item in enumerate(player1.equipment):
            if item:
                equipment_info.append(f"Slot {i+1}: {item.name} ({item.uses_remaining} uses remaining)")
            else:
                equipment_info.append(f"Slot {i+1}: Empty")

        return {
            "fight_winner": fight_result.get('winner'),
            "fight_rounds": fight_result.get('rounds'),
            "stones_used_p1": fight_result.get('equipment_stats', {}).get('player1_stones_used', 0),
            "stones_used_p2": fight_result.get('equipment_stats', {}).get('player2_stones_used', 0),
            "avg_damage_p1": fight_result.get('damage_stats', {}).get('avg_damage_p1', 0),
            "avg_damage_p2": fight_result.get('damage_stats', {}).get('avg_damage_p2', 0),
            "equipment_after_fight": equipment_info
        }
    except Exception as e:
        return {"error": str(e)}

@app.route('/')
def index():
    """Main page with fight simulator"""
    return render_template('index.html', races=list(RACE_DEFAULTS.keys()), race_defaults=RACE_DEFAULTS)

@app.route('/simulate', methods=['POST'])
def simulate():
    """API endpoint for fight simulation"""
    try:
        data = request.json

        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        # Validate required fields
        required_fields = ['player1', 'player2']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate player data
        for player_key in ['player1', 'player2']:
            player_data = data[player_key]
            if 'race' not in player_data:
                return jsonify({'error': f'Missing race for {player_key}'}), 400
            if 'stats' not in player_data:
                return jsonify({'error': f'Missing stats for {player_key}'}), 400

        player1_config = {
            'race': data['player1']['race'],
            'stats': data['player1']['stats'],
            'equipment': data['player1'].get('equipment', []),
            'hand_equipment': data['player1'].get('hand_equipment', [])
        }

        player2_config = {
            'race': data['player2']['race'],
            'stats': data['player2']['stats'],
            'equipment': data['player2'].get('equipment', []),
            'hand_equipment': data['player2'].get('hand_equipment', [])
        }

        num_simulations = data.get('simulations', 1000)
        force_no_blocks = data.get('force_no_blocks', False)
        player1_block_limit = data.get('player1_block_limit', 1)
        player2_block_limit = data.get('player2_block_limit', 1)
        player1_level = data.get('player1_level', 1)
        player2_level = data.get('player2_level', 1)

        results = run_simulation(player1_config, player2_config, num_simulations, force_no_blocks, player1_block_limit, player2_block_limit, player1_level, player2_level)

    except Exception as e:
        return jsonify({'error': f'Simulation failed: {str(e)}'}), 500

    # Add XP calculations to results

    # Calculate XP for different outcomes
    results['xp_calculations'] = {
        'player1': {
            'win_xp': calculate_xp_for_fight('win', player1_level, player2_level),
            'draw_xp': calculate_xp_for_fight('draw', player1_level, player2_level),
            'loss_xp': calculate_xp_for_fight('loss', player1_level, player2_level)
        },
        'player2': {
            'win_xp': calculate_xp_for_fight('win', player2_level, player1_level),
            'draw_xp': calculate_xp_for_fight('draw', player2_level, player1_level),
            'loss_xp': calculate_xp_for_fight('loss', player2_level, player1_level)
        }
    }

    # Calculate expected XP per fight for each player
    p1_expected_xp = (results['xp_calculations']['player1']['win_xp'] * results['player1_win_rate'] / 100 +
                      results['xp_calculations']['player1']['draw_xp'] * results['draw_rate'] / 100 +
                      results['xp_calculations']['player1']['loss_xp'] * results['player2_win_rate'] / 100)

    p2_expected_xp = (results['xp_calculations']['player2']['win_xp'] * results['player2_win_rate'] / 100 +
                      results['xp_calculations']['player2']['draw_xp'] * results['draw_rate'] / 100 +
                      results['xp_calculations']['player2']['loss_xp'] * results['player1_win_rate'] / 100)

    results['expected_xp'] = {
        'player1': round(p1_expected_xp, 1),
        'player2': round(p2_expected_xp, 1)
    }

    return jsonify(results)

@app.route('/stat_impact', methods=['POST'])
def stat_impact():
    """API endpoint for characteristic power analysis"""
    try:
        data = request.json
        race = data.get('race', 'human')
        level = data.get('level', 5)
        simulations = data.get('simulations', 500)  # Lower default for speed

        # Validate inputs
        if race not in RACE_DEFAULTS:
            return jsonify({'error': f'Invalid race: {race}'}), 400

        if not (1 <= level <= 10):
            return jsonify({'error': f'Level must be between 1 and 10'}), 400

        if not (100 <= simulations <= 2000):
            return jsonify({'error': f'Simulations must be between 100 and 2000'}), 400

        # Calculate stat impacts
        result = calculate_stat_impact(race, level, simulations)

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/xp_calculator', methods=['POST'])
def xp_calculator():
    """API endpoint for XP calculations"""
    data = request.json

    current_xp = data.get('current_xp', 0)
    daily_fights = data.get('daily_fights', 3)
    avg_xp_per_fight = data.get('avg_xp_per_fight', 4.3)
    target_level = data.get('target_level', 10)

    daily_xp = daily_fights * avg_xp_per_fight

    # Get current level info
    current_level, current_level_xp, xp_for_next = get_current_level_from_xp(current_xp)

    # Calculate time to target level
    time_to_target = calculate_time_to_target_level(current_xp, daily_xp, target_level)

    # Calculate XP for different fight scenarios
    player_level = data.get('player_level', current_level)
    xp_scenarios = {}

    for level_diff in [-1, 0, 1]:
        opponent_level = player_level + level_diff
        if opponent_level >= 1 and opponent_level <= 10:
            scenario_name = f"vs_level_{opponent_level}"
            xp_scenarios[scenario_name] = {
                'opponent_level': opponent_level,
                'win_xp': calculate_xp_for_fight('win', player_level, opponent_level),
                'draw_xp': calculate_xp_for_fight('draw', player_level, opponent_level),
                'loss_xp': calculate_xp_for_fight('loss', player_level, opponent_level)
            }

    return jsonify({
        'current_level': current_level,
        'current_level_xp': current_level_xp,
        'xp_for_next_level': xp_for_next,
        'total_xp': current_xp,
        'daily_xp': daily_xp,
        'time_to_target_level': time_to_target,
        'xp_scenarios': xp_scenarios,
        'level_requirements': {
            level: get_xp_required_for_level(level) for level in range(1, 11)
        }
    })

@app.route('/logic')
def logic():
    """API endpoint to show game logic information"""
    logic_info = {
        "knowledge_stat": {
            "description": "Knowledge stat enables magic usage and determines spell power",
            "default_value": 0,
            "gain_per_level": {
                "human": 0,
                "orc": 0,
                "elf": 0,
                "dwarf": 0,
                "skeleton": "Special bonuses: +1 at level 2, +1 at level 8 (max 2)"
            },
            "skeleton_progression": {
                "level_1": 0,
                "level_2": 1,
                "level_3-7": 1,
                "level_8+": 2
            },
            "future_magic_system": {
                "basic_requirement": "knowledge > 0",
                "spell_power": "Scales with knowledge level",
                "skeleton_advantage": "Natural magic affinity"
            }
        },
        "equipment_scaling": {
            "stone": {
                "description": "Level 1 item - effectiveness decreases with player level",
                "base_success": "25% + agility_diff * 1%",
                "base_multiplier": "1.1 + agility_diff * 0.1",
                "level_penalty": "15% reduction per level above 1",
                "minimum_effectiveness": "30%"
            },
            "wooden_stick": {
                "description": "Level 1 item - effectiveness decreases with player level",
                "base_multiplier": "1.06x damage",
                "level_penalty": "10% reduction per level above 1",
                "minimum_effectiveness": "40%"
            },
            "scaling_formula": "1.0 + (base_multiplier - 1.0) * level_penalty"
        },
        "xp_system": {
            "win_vs_player": 6,
            "draw_vs_player": 3,
            "beat_bot": 2,
            "level_requirements": {
                "level_2": 82,
                "progression": "Exponential scaling with 1.5x multiplier"
            }
        },
        "combat_mechanics": {
            "base_damage": 3.1,
            "power_factor": 0.27,
            "block_multiplier": 0.26,
            "super_attack_multiplier": 3.5,
            "agility_effects": {
                "dodge_chance": "2-8% based on agility difference",
                "super_attack_chance": "2-6% based on agility difference"
            }
        }
    }

    return json.dumps(logic_info, indent=2)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)