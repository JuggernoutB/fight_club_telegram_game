"""
Combat Engine Package
Shared combat calculation modules for Fight Club game

This package provides consistent damage calculation logic
that can be used by both the Telegram game and game analyzer.
"""

from .combat_constants import *
from .player_stats import Player, Equipment, create_player, get_enabled_slots, calculate_knowledge_for_level
from .equipment_effects import (
    create_equipment_item, apply_projectile_effects, apply_melee_effects,
    check_fear_spell_usage, check_scream_spell_usage
)
from .damage_calculator import (
    calculate_damage, calculate_xp_for_fight, get_xp_required_for_level,
    get_xp_for_single_level, get_current_level_from_xp
)

__version__ = "1.0.0"
__author__ = "Fight Club Development Team"