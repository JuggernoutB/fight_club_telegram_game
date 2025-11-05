"""
Player Statistics Module
Player creation and stat management functionality
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from .combat_constants import RACE_DEFAULTS, RACE_EQUIPMENT_SLOTS


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
    equipment: List[Optional[Equipment]] = None
    hand_equipment: List[Optional[Equipment]] = None
    mana: int = 0
    max_mana: int = 0

    def __post_init__(self):
        if self.equipment is None:
            self.equipment = [None, None, None]  # 3 basic equipment slots
        if self.hand_equipment is None:
            self.hand_equipment = [None, None]  # 2 hand slots


def get_enabled_slots(race: str) -> Dict[str, int]:
    """Get the number of enabled slots for a race"""
    return RACE_EQUIPMENT_SLOTS.get(race, {'basic_slots': 1, 'hand_slots': 2})


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


def create_player(name: str, race: str, custom_stats: Dict = None,
                 equipment: List[str] = None, hand_equipment: List[str] = None,
                 level: int = 1) -> Player:
    """Create a player with race defaults or custom stats"""
    from .equipment_effects import create_equipment_item

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
                if item_type in ["stone", "big_stone", "metal_ball", "fear_spell", "scream_spell"]:
                    # Check knowledge requirements for spells
                    if ((item_type == "fear_spell" and knowledge >= 1) or
                        (item_type == "scream_spell" and knowledge >= 2) or
                        item_type in ["stone", "big_stone", "metal_ball"]):
                        player.equipment[i] = create_equipment_item(item_type)

    # Add hand equipment (wooden sticks and slingshot) if specified
    if hand_equipment:
        # Check for slingshot limit (only 1 slingshot allowed per player)
        slingshot_count = sum(1 for item in hand_equipment if item == "slingshot")

        for i, item_type in enumerate(hand_equipment):
            if i < enabled_hand_slots and i < 2:  # Only use enabled hand slots
                if item_type in ["wooden_stick", "big_wooden_stick", "knife",
                               "small_club", "blade", "slingshot"]:
                    if item_type == "slingshot" and slingshot_count <= 1:
                        player.hand_equipment[i] = create_equipment_item(item_type)
                    elif item_type != "slingshot":
                        player.hand_equipment[i] = create_equipment_item(item_type)

    return player