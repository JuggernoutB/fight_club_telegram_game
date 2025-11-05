"""
XP Calculator Module
Shared XP calculation logic for Fight Club game
"""

# XP constants
BASE_XP_WIN = 6
BASE_XP_DRAW = 3
BASE_XP_LOSS = 2


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


def check_level_up(current_xp: int, current_level: int) -> tuple:
    """Check if a level up occurred and return new level and whether level up happened"""
    xp_needed = get_xp_required_for_level(current_level + 1)

    if current_xp >= xp_needed and current_level < 10:
        return current_level + 1, True

    return current_level, False


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