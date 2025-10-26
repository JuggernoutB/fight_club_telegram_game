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
    super_attack: int

# Default race characteristics (updated HP and minimal dual defense)
RACE_DEFAULTS = {
    'human': {'hp': 14, 'power': 5, 'defense': 5, 'agility': 5, 'super_attack': 6},
    'orc': {'hp': 14, 'power': 6, 'defense': 5, 'agility': 5, 'super_attack': 5},
    'elf': {'hp': 14, 'power': 5, 'defense': 5, 'agility': 6, 'super_attack': 5},
    'dwarf': {'hp': 14, 'power': 5, 'defense': 6, 'agility': 5, 'super_attack': 5},
    'skeleton': {'hp': 17, 'power': 5, 'defense': 5, 'agility': 5, 'super_attack': 5}
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

    def simulate_round(self) -> Tuple[bool, str]:
        """Simulate one round of combat"""
        self.round_number += 1

        # Random choices for both players
        p1_attack = random.choice(BODY_PARTS)
        p1_defend = [random.choice(BODY_PARTS)]
        p2_attack = random.choice(BODY_PARTS)
        p2_defend = [random.choice(BODY_PARTS)]

        # Check for dual defense based on defense comparison
        defense_diff_p1 = self.player1.defense - self.player2.defense
        defense_diff_p2 = self.player2.defense - self.player1.defense

        # Player 1 dual defense chance (reduced to 2% for minimal dual defense)
        if defense_diff_p1 > 0 and random.random() < 0.01:
            # Add second defense part, different from first
            available_parts = [part for part in BODY_PARTS if part != p1_defend[0]]
            p1_defend.append(random.choice(available_parts))

        # Player 2 dual defense chance (reduced to 2% for minimal dual defense)
        if defense_diff_p2 > 0 and random.random() < 0.01:
            # Add second defense part, different from first
            available_parts = [part for part in BODY_PARTS if part != p2_defend[0]]
            p2_defend.append(random.choice(available_parts))

        round_log = f"Round {self.round_number}:\n"
        round_log += f"{self.player1.name} attacks {p1_attack}, defends {', '.join(p1_defend)}\n"
        round_log += f"{self.player2.name} attacks {p2_attack}, defends {', '.join(p2_defend)}\n"

        # Calculate damage for both players
        p1_damage = self.calculate_damage(self.player1, self.player2, p1_attack, p2_defend)
        p2_damage = self.calculate_damage(self.player2, self.player1, p2_attack, p1_defend)

        # Check if any damage occurred this round
        any_damage = p1_damage > 0 or p2_damage > 0
        if any_damage:
            self.damage_rounds += 1
        damage_status = "✅ DAMAGE OCCURRED" if any_damage else "❌ NO DAMAGE"

        # Apply damage (removed counter-attack system)
        self.player2.hp = max(0, self.player2.hp - p1_damage)
        self.player1.hp = max(0, self.player1.hp - p2_damage)

        round_log += f"{self.player1.name} deals {p1_damage} damage to {self.player2.name}\n"
        round_log += f"{self.player2.name} deals {p2_damage} damage to {self.player1.name}\n"
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

    def calculate_damage(self, attacker: Player, defender: Player, attack_part: str, defend_parts: List[str]) -> int:
        """Calculate damage based on balanced power vs defense system"""

        # Check for agility dodge - scaling system
        agility_diff = defender.agility - attacker.agility
        dodge_chance = 0
        if agility_diff >= 1:
            # Scaling dodge: 20% for +1 agility, +4.5% for each additional point
            dodge_chance = 0.20 + (agility_diff - 1) * 0.25
            dodge_chance = min(0.9, dodge_chance)  # Cap at 85% max dodge
        elif agility_diff == 0:
            dodge_chance = 0.05  # 5% dodge if equal agility

        if random.random() < dodge_chance:
            return 0  # Dodged

        # Check for super attack - scaling system
        super_attack_diff = attacker.super_attack - defender.super_attack
        super_attack_chance = 0

        if super_attack_diff >= 1:
            # Scaling super attack: 16% for +1 SA, +4% for each additional point
            super_attack_chance = 0.11 + (super_attack_diff - 1) * 0.02
            super_attack_chance = min(0.50, super_attack_chance)  # Cap at 50% max
        elif super_attack_diff == 0 and attacker.super_attack > 0:
            super_attack_chance = 0.08  # 8% super attack if equal and > 0

        is_super_attack = random.random() < super_attack_chance

        # Calculate base damage with adjusted diminishing returns for better balance
        power_scaling = {
            0: 0.5,
            1: 1.0,
            2: 1.8,  # Adjusted to 1.8 (10% reduction from 2.0)
            3: 2.4,  # Adjusted to 2.4 (20% reduction from 3.0)
            4: 2.9,  # Adjusted proportionally
            5: 3.3   # Adjusted proportionally
        }
        base_damage = power_scaling.get(attacker.power, 3.3 + (attacker.power - 5) * 0.25)
        if is_super_attack:
            if attack_part not in defend_parts:  # Undefended part
                # Balanced damage multipliers: 20% 4.0x, 30% 3.5x, 35% 3.0x, 15% 2.5x
                roll = random.random()
                if roll < 0.25:
                    base_damage *= 4.5    # 20% chance for 4.0x damage
                elif roll < 0.40:         # 30% chance (20% + 30%)
                    base_damage *= 4.0    # 3.5x damage
                elif roll < 0.75:         # 35% chance (50% + 35%)
                    base_damage *= 3.5    # 3.0x damage
                else:                     # 15% chance (remaining)
                    base_damage *= 3.0    # 2.5x damage
            else:
                # For defended part, super attack gets 2x damage multiplier
                base_damage *= 2.0

        # Calculate damage chance based on power vs defense
        power_defense_diff = attacker.power - defender.defense

        if attack_part in defend_parts:
            # Defended part: Base 10%, +12% per power advantage, -12% per defense advantage, range 5%-70%
            if power_defense_diff >= 0:
                damage_chance = min(20, max(5, 5 + (power_defense_diff * 5))) / 100
            else:
                damage_chance = min(5, max(5, 5 + (power_defense_diff * 5))) / 100
        else:
            # Undefended part: Base 65%, +12% per power advantage, -12% per defense advantage, range 15%-80%
            if power_defense_diff >= 0:
                damage_chance = min(80, max(15, 60 + (power_defense_diff * 12))) / 100
            else:
                damage_chance = min(80, max(15, 60 + (power_defense_diff * 12))) / 100

        # Check if damage occurs
        if random.random() < damage_chance:
            # Damage calculation: 80% full power, 20% power-1 (minimum 1) - enhanced power advantage
            if random.random() < 0.80:
                return int(base_damage)  # Full power damage
            else:
                return max(1, int(base_damage) - 1)  # Reduced damage
        else:
            return 0  # No damage

    def simulate_fight(self) -> Dict:
        """Simulate entire fight and return result"""
        while True:
            fight_ended, winner = self.simulate_round()

            if fight_ended:
                damage_percentage = (self.damage_rounds / self.round_number) * 100 if self.round_number > 0 else 0
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
                        'damage_percentage': round(damage_percentage, 1)
                    }
                }

            # Safety check to prevent infinite loops
            if self.round_number > 100:
                damage_percentage = (self.damage_rounds / self.round_number) * 100 if self.round_number > 0 else 0
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
                        'damage_percentage': round(damage_percentage, 1)
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
        agility=stats['agility'],
        super_attack=stats['super_attack']
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