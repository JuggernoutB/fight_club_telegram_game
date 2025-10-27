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
class Player:
    """Player data class with race and characteristics"""
    name: str
    race: str
    hp: int
    max_hp: int
    power: int
    defense: int
    agility: int

# Default race characteristics (adjusted HP and damage parameters)
RACE_DEFAULTS = {
    'human': {'hp': 21, 'power': 5, 'defense': 5, 'agility': 6},
    'orc': {'hp': 20, 'power': 6, 'defense': 5, 'agility': 5},
    'elf': {'hp': 21, 'power': 5, 'defense': 5, 'agility': 6},
    'dwarf': {'hp': 20, 'power': 5, 'defense': 6, 'agility': 5},
    'skeleton': {'hp': 22, 'power': 5, 'defense': 5, 'agility': 5}
}

BODY_PARTS = ['head', 'chest', 'stomach', 'belt', 'legs']

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

    def simulate_round(self) -> Tuple[bool, str]:
        """Simulate one round of combat"""
        self.round_number += 1

        # Random choices for both players
        p1_attack = random.choice(BODY_PARTS)
        p1_defend = [random.choice(BODY_PARTS)]
        p2_attack = random.choice(BODY_PARTS)
        p2_defend = [random.choice(BODY_PARTS)]

        # Simplified system - no dual defense

        round_log = f"Round {self.round_number}:\n"
        round_log += f"{self.player1.name} attacks {p1_attack}, defends {', '.join(p1_defend)}\n"
        round_log += f"{self.player2.name} attacks {p2_attack}, defends {', '.join(p2_defend)}\n"

        # Calculate damage for both players
        p1_damage, p1_effect = self.calculate_damage(self.player1, self.player2, p1_attack, p2_defend)
        p2_damage, p2_effect = self.calculate_damage(self.player2, self.player1, p2_attack, p1_defend)

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

        # Format damage output with agility effects
        p1_damage_text = f"{p1_damage}"
        if p1_effect == "super_attack":
            p1_damage_text += " (SUPER ATTACK!)"
        elif p1_effect == "dodged":
            p1_damage_text = "DODGED"

        p2_damage_text = f"{p2_damage}"
        if p2_effect == "super_attack":
            p2_damage_text += " (SUPER ATTACK!)"
        elif p2_effect == "dodged":
            p2_damage_text = "DODGED"

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

    def calculate_damage(self, attacker: Player, defender: Player, attack_part: str, defend_parts: List[str]) -> Tuple[int, str]:
        """Calculate damage with power ratio system, agility effects, and probability-based integer conversion"""

        # Constants optimized for levels 1-5 balance
        BASE_DAMAGE = 3.5
        POWER_FACTOR = 0.5
        BLOCK_MULTIPLIER = 0.5

        # Agility effect constants
        SUPER_ATTACK_MULTIPLIER = 3.5
        MAX_DODGE_CHANCE = 40  # 30% max
        MAX_SUPER_ATTACK_CHANCE = 30  # 20% max
        AGILITY_DODGE_FACTOR = 1  # 2% per agility point difference
        AGILITY_SUPER_FACTOR = 1  # 1% per agility point difference

        # Calculate agility difference
        agility_diff = attacker.agility - defender.agility
        effect_type = "normal"

        # Check for super attack (attacker has higher agility)
        if agility_diff > 0:
            super_attack_chance = min(MAX_SUPER_ATTACK_CHANCE, agility_diff * AGILITY_SUPER_FACTOR)
            if random.random() * 100 < super_attack_chance:
                effect_type = "super_attack"

        # Check for dodge (defender has higher agility and no super attack)
        elif agility_diff < 0:
            dodge_chance = min(MAX_DODGE_CHANCE, abs(agility_diff) * AGILITY_DODGE_FACTOR)
            if random.random() * 100 < dodge_chance:
                return 0, "dodged"

        # Calculate power to defense ratio
        ratio = attacker.power / defender.defense if defender.defense > 0 else attacker.power
        damage = BASE_DAMAGE * (ratio ** POWER_FACTOR)

        # Apply super attack multiplier if triggered
        if effect_type == "super_attack":
            damage *= SUPER_ATTACK_MULTIPLIER

        # Check if attack is blocked (defended)
        is_blocked = attack_part in defend_parts
        if is_blocked:
            damage *= BLOCK_MULTIPLIER

        # Probability-based integer conversion
        # Get the base integer and fractional part
        base_damage = int(damage)
        fractional_part = damage - base_damage

        # Determine final damage based on fractional probability
        if random.random() < fractional_part:
            final_damage = base_damage + 1
        else:
            final_damage = base_damage

        # Return integer damage (minimum 1) and effect type
        return max(1, final_damage), effect_type

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
                    }
                }

def create_player(name: str, race: str, custom_stats: Dict = None) -> Player:
    """Create a player with race defaults or custom stats"""
    stats = RACE_DEFAULTS[race].copy()

    if custom_stats:
        stats.update(custom_stats)

    return Player(
        name=name,
        race=race,
        hp=stats['hp'],
        max_hp=stats['hp'],
        power=stats['power'],
        defense=stats['defense'],
        agility=stats['agility']
    )

def run_simulation(player1_config: Dict, player2_config: Dict, num_simulations: int = 1000) -> Dict:
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
        'sample_fights': []
    }

    for i in range(num_simulations):
        # Create fresh players for each simulation
        player1 = create_player("Player 1", player1_config['race'], player1_config.get('stats'))
        player2 = create_player("Player 2", player2_config['race'], player2_config.get('stats'))

        simulator = FightSimulator(player1, player2)
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

    return results

def calculate_xp_for_fight(result: str, player_level: int, opponent_level: int) -> int:
    """Calculate XP gained from a fight result"""

    # Base XP values (calibrated for 1 week to level 2)
    BASE_XP_WIN = 110
    BASE_XP_DRAW = 55
    BASE_XP_LOSS = 0  # No XP for losses

    # Get base XP based on result
    if result == 'win':
        base_xp = BASE_XP_WIN
    elif result == 'draw':
        base_xp = BASE_XP_DRAW
    else:  # loss
        return 0  # Always 0 XP for losses

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

    # Level 2 requires 1500 XP (1 week target)
    # Each subsequent level requires 1.5x more than the previous level
    total_xp = 0
    level_2_xp = 1500

    for lvl in range(2, level + 1):
        if lvl == 2:
            level_xp = level_2_xp
        else:
            # Calculate XP needed from previous level
            prev_level_xp = get_xp_for_single_level(lvl - 1)
            level_xp = int(prev_level_xp * 1.5)

        total_xp += level_xp

    return total_xp

def get_xp_for_single_level(level: int) -> int:
    """Get XP required to advance from (level-1) to level"""
    if level <= 1:
        return 0
    elif level == 2:
        return 1500  # Base requirement
    else:
        # Each level requires 1.5x more than the previous
        prev_level_xp = get_xp_for_single_level(level - 1)
        return int(prev_level_xp * 1.5)

def get_current_level_from_xp(xp: int) -> tuple:
    """Get current level and progress from total XP"""
    if xp < 1500:
        return 1, xp, 1500

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

@app.route('/')
def index():
    """Main page with fight simulator"""
    return render_template('index.html', races=list(RACE_DEFAULTS.keys()), race_defaults=RACE_DEFAULTS)

@app.route('/simulate', methods=['POST'])
def simulate():
    """API endpoint for fight simulation"""
    data = request.json

    player1_config = {
        'race': data['player1']['race'],
        'stats': data['player1']['stats']
    }

    player2_config = {
        'race': data['player2']['race'],
        'stats': data['player2']['stats']
    }

    num_simulations = data.get('simulations', 1000)

    results = run_simulation(player1_config, player2_config, num_simulations)

    # Add XP calculations to results
    player1_level = data.get('player1_level', 1)
    player2_level = data.get('player2_level', 1)

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

@app.route('/xp_calculator', methods=['POST'])
def xp_calculator():
    """API endpoint for XP calculations"""
    data = request.json

    current_xp = data.get('current_xp', 0)
    daily_fights = data.get('daily_fights', 3)
    avg_xp_per_fight = data.get('avg_xp_per_fight', 69)
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)