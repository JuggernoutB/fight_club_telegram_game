#!/usr/bin/env python3
"""
Test balance across all major race matchups with new stat distributions
"""

import random
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class Player:
    name: str
    race: str
    hp: int
    max_hp: int
    power: int
    defense: int
    agility: int
    super_attack: int

BODY_PARTS = ['head', 'chest', 'stomach', 'belt', 'legs']

# New race configurations
RACES = {
    'orc': {'hp': 9, 'power': 6, 'defense': 5, 'agility': 0, 'super_attack': 0},
    'dwarf': {'hp': 9, 'power': 5, 'defense': 6, 'agility': 0, 'super_attack': 0},
    'skeleton': {'hp': 11, 'power': 5, 'defense': 5, 'agility': 0, 'super_attack': 0},
    'human': {'hp': 9, 'power': 1, 'defense': 1, 'agility': 1, 'super_attack': 1},
    'elf': {'hp': 9, 'power': 1, 'defense': 0, 'agility': 2, 'super_attack': 1}
}

def calculate_damage(attacker: Player, defender: Player, attack_part: str, defend_parts: List[str]) -> int:
    """Calculate damage with current optimal settings"""

    # Calculate base damage with adjusted diminishing returns
    power_scaling = {
        0: 0.5,
        1: 1.0,
        2: 1.8,
        3: 2.4,
        4: 2.9,
        5: 3.3,
        6: 3.6
    }
    base_damage = power_scaling.get(attacker.power, 3.3 + (attacker.power - 5) * 0.25)

    # Calculate damage chance based on power vs defense
    power_defense_diff = attacker.power - defender.defense

    if attack_part in defend_parts:
        # Defended part: Base 30%, +12% per power advantage, -12% per defense advantage, range 5%-70%
        if power_defense_diff >= 0:
            damage_chance = min(70, max(5, 30 + (power_defense_diff * 12))) / 100
        else:
            damage_chance = min(70, max(5, 30 + (power_defense_diff * 12))) / 100
    else:
        # Undefended part: Base 50%, +12% per power advantage, -12% per defense advantage, range 15%-80%
        if power_defense_diff >= 0:
            damage_chance = min(80, max(15, 50 + (power_defense_diff * 12))) / 100
        else:
            damage_chance = min(80, max(15, 50 + (power_defense_diff * 12))) / 100

    # Check if damage occurs
    if random.random() < damage_chance:
        # Damage calculation: 60% full power, 40% power-1 (minimum 1)
        if random.random() < 0.60:
            return int(base_damage)
        else:
            return max(1, int(base_damage) - 1)
    else:
        return 0

def create_player(race: str) -> Player:
    """Create a player of specified race"""
    stats = RACES[race]
    return Player(
        name=race.capitalize(),
        race=race,
        hp=stats['hp'],
        max_hp=stats['hp'],
        power=stats['power'],
        defense=stats['defense'],
        agility=stats['agility'],
        super_attack=stats['super_attack']
    )

def simulate_matchup(race1: str, race2: str, num_fights: int = 500) -> Dict:
    """Simulate fights between two races"""

    wins_race1 = 0
    wins_race2 = 0
    draws = 0
    total_rounds = 0

    for _ in range(num_fights):
        player1 = create_player(race1)
        player2 = create_player(race2)

        round_count = 0
        while player1.hp > 0 and player2.hp > 0 and round_count < 50:
            round_count += 1

            # Random choices
            p1_attack = random.choice(BODY_PARTS)
            p1_defend = [random.choice(BODY_PARTS)]
            p2_attack = random.choice(BODY_PARTS)
            p2_defend = [random.choice(BODY_PARTS)]

            # Dual defense (10% chance for defense advantage)
            if player1.defense > player2.defense and random.random() < 0.10:
                available_parts = [part for part in BODY_PARTS if part != p1_defend[0]]
                p1_defend.append(random.choice(available_parts))

            if player2.defense > player1.defense and random.random() < 0.10:
                available_parts = [part for part in BODY_PARTS if part != p2_defend[0]]
                p2_defend.append(random.choice(available_parts))

            # Calculate damage
            p1_damage = calculate_damage(player1, player2, p1_attack, p2_defend)
            p2_damage = calculate_damage(player2, player1, p2_attack, p1_defend)

            # Apply damage
            player2.hp = max(0, player2.hp - p1_damage)
            player1.hp = max(0, player1.hp - p2_damage)

        total_rounds += round_count

        # Determine winner
        if player1.hp > 0 and player2.hp <= 0:
            wins_race1 += 1
        elif player2.hp > 0 and player1.hp <= 0:
            wins_race2 += 1
        else:
            draws += 1

    win_rate_1 = (wins_race1 / num_fights) * 100
    win_rate_2 = (wins_race2 / num_fights) * 100
    draw_rate = (draws / num_fights) * 100
    avg_rounds = total_rounds / num_fights

    return {
        'race1': race1,
        'race2': race2,
        'win_rate_1': win_rate_1,
        'win_rate_2': win_rate_2,
        'draw_rate': draw_rate,
        'gap': abs(win_rate_1 - win_rate_2),
        'avg_rounds': avg_rounds
    }

def test_all_race_matchups():
    """Test balance across all major race matchups"""

    print("=== ALL RACE MATCHUPS BALANCE TEST ===")
    print("Testing major competitive matchups with new stat distributions")
    print()

    # Key matchups to test
    matchups = [
        ('orc', 'dwarf'),      # Power vs Defense
        ('orc', 'skeleton'),   # High Power vs Balanced
        ('dwarf', 'skeleton'), # High Defense vs Balanced
        ('human', 'orc'),      # Balanced vs Power
        ('human', 'dwarf'),    # Balanced vs Defense
        ('elf', 'orc'),        # Agility vs Power
        ('elf', 'dwarf')       # Agility vs Defense
    ]

    results = []

    print(f"{'Matchup':<20} {'Player 1':<12} {'Player 2':<12} {'Gap':<8} {'Status'}")
    print("-" * 70)

    for race1, race2 in matchups:
        result = simulate_matchup(race1, race2)
        results.append(result)

        # Assess gap
        gap = result['gap']
        if gap <= 3.0:
            status = "✅ BALANCED"
        elif gap <= 6.0:
            status = "⚡ GOOD"
        elif gap <= 10.0:
            status = "⚠️ ACCEPTABLE"
        else:
            status = "❌ IMBALANCED"

        matchup_name = f"{race1.title()} vs {race2.title()}"
        print(f"{matchup_name:<20} {result['win_rate_1']:<12.1f} {result['win_rate_2']:<12.1f} {gap:<8.1f} {status}")

    print()

    # Summary analysis
    balanced_matchups = sum(1 for r in results if r['gap'] <= 3.0)
    total_matchups = len(results)

    print("=== BALANCE SUMMARY ===")
    print(f"Matchups meeting 3% gap target: {balanced_matchups}/{total_matchups} ({balanced_matchups/total_matchups*100:.1f}%)")

    avg_gap = sum(r['gap'] for r in results) / len(results)
    avg_rounds = sum(r['avg_rounds'] for r in results) / len(results)

    print(f"Average gap across all matchups: {avg_gap:.1f}%")
    print(f"Average fight length: {avg_rounds:.1f} rounds")
    print()

    # Combat pace assessment
    if avg_rounds < 8:
        pace = "🚀 VERY FAST"
    elif avg_rounds < 12:
        pace = "⚡ FAST"
    elif avg_rounds < 16:
        pace = "✅ MODERATE"
    else:
        pace = "🐌 SLOW"

    print(f"Overall combat pace: {pace}")

    # Race power level analysis
    print()
    print("=== RACE PERFORMANCE ANALYSIS ===")
    race_wins = {}
    race_fights = {}

    for result in results:
        race1, race2 = result['race1'], result['race2']

        if race1 not in race_wins:
            race_wins[race1] = 0
            race_fights[race1] = 0
        if race2 not in race_wins:
            race_wins[race2] = 0
            race_fights[race2] = 0

        race_wins[race1] += result['win_rate_1']
        race_wins[race2] += result['win_rate_2']
        race_fights[race1] += 100
        race_fights[race2] += 100

    print("Average win rates across all matchups:")
    race_performance = []
    for race in race_wins:
        avg_performance = race_wins[race] / race_fights[race] * 100
        race_performance.append((race, avg_performance))
        print(f"{race.title()}: {avg_performance:.1f}%")

    race_performance.sort(key=lambda x: x[1], reverse=True)
    print(f"\nStrongest race: {race_performance[0][0].title()} ({race_performance[0][1]:.1f}%)")
    print(f"Weakest race: {race_performance[-1][0].title()} ({race_performance[-1][1]:.1f}%)")

    return results

if __name__ == '__main__':
    random.seed(42)
    test_all_race_matchups()