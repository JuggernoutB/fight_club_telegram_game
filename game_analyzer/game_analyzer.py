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
    'human': {'hp': 20, 'power': 5, 'defense': 5, 'agility': 6},
    'orc': {'hp': 20, 'power': 6, 'defense': 5, 'agility': 5},
    'elf': {'hp': 20, 'power': 5, 'defense': 5, 'agility': 6},
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
        SUPER_ATTACK_MULTIPLIER = 4
        MAX_DODGE_CHANCE = 70  # 30% max
        MAX_SUPER_ATTACK_CHANCE = 70  # 20% max
        AGILITY_DODGE_FACTOR = 1  # 2% per agility point difference
        AGILITY_SUPER_FACTOR = 3  # 1% per agility point difference

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

    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)