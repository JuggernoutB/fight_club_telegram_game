# Fight Logic Documentation

## Overview
This document describes the complete combat mechanics for the Fight Club Telegram Game, including all characteristics (stats) and their interactions.

## Character Statistics

### Race Defaults
Each race starts with the following base statistics:

| Race | HP | Power | Defense | Agility | Super Attack |
|------|----|----|---------|---------|--------------|
| Human | 9 | 1 | 1 | 1 | 1 |
| Orc | 9 | 6 | 5 | 0 | 0 |
| Elf | 9 | 1 | 0 | 2 | 1 |
| Dwarf | 9 | 5 | 6 | 0 | 0 |
| Skeleton | 11 | 5 | 5 | 0 | 0 |

### Stat Descriptions

#### HP (Health Points)
- **Function**: Determines survivability
- **Scaling**: Linear (1 point = 1 HP)
- **Notes**: Most predictable stat investment

#### Power
- **Function**: Base damage for all attacks
- **Scaling**: Diminishing returns to balance high power builds
  - Power 1: 1.0 damage
  - Power 2: 1.8 damage (10% reduction from linear)
  - Power 3: 2.4 damage (20% reduction from linear)
  - Power 4: 2.9 damage (28% reduction from linear)
- **Special**: Subject to defense mechanics and damage reduction

#### Defense
- **Function**: Reduces incoming damage and enables dual defense
- **Mechanics**:
  - Each point provides inherent damage reduction
  - Enables dual defense when higher than opponent
  - Provides strong protection for defended body parts

#### Agility
- **Function**: Provides dodge chance to avoid all damage
- **Scaling**: Percentage-based with bonuses for stat advantage

#### Super Attack
- **Function**: Chance to deal multiplied damage on undefended parts
- **Mechanics**: Activation chance based on stat comparison, damage multipliers on successful hits

## Combat Mechanics

### Body Parts
Combat involves targeting and defending 5 body parts:
- **Head**
- **Chest**
- **Stomach**
- **Belt**
- **Legs**

### Round Structure
Each combat round follows this sequence:

1. **Action Selection**: Both players simultaneously choose:
   - One body part to attack
   - One body part to defend (with possible dual defense)

2. **Dual Defense Check**: Players with defense advantage may defend an additional body part

3. **Damage Calculation**: For each attack, calculate damage considering:
   - Agility dodge check
   - Super attack activation
   - Power vs defense mechanics
   - Defended vs undefended target

4. **Damage Application**: Apply calculated damage to HP

5. **Victory Check**: Fight ends when one or both players reach 0 HP

## Detailed Stat Mechanics

### Agility - Dodge System
Agility provides a chance to completely avoid incoming damage.

**Dodge Calculation**:
- Base chance: `(defender_agility - attacker_agility) * percentage`
- If agility difference ≤ 0: Minimal base chance (5%)
- If agility difference = 1: 27% dodge chance
- If agility difference ≥ 2: Higher dodge percentages

**Examples**:
- Agility 2 vs Agility 0: ~40% dodge chance
- Agility 1 vs Agility 1: ~5% dodge chance
- Agility 0 vs Agility 2: ~5% dodge chance

### Super Attack System
Super Attack provides burst damage potential through damage multipliers.

**Activation Chances**:
- **Higher Super Attack**: 12% activation chance
- **Equal Super Attack** (both > 0): 4% activation chance
- **Lower/Zero Super Attack**: 0% activation chance

**Damage Multipliers** (for undefended parts):
- 20% chance: 3.5x damage
- 30% chance: 3.0x damage
- 40% chance: 2.5x damage
- 10% chance: 2.0x damage

**Special Rules**:
- Super attacks on defended parts deal normal power damage (no multiplier)
- Super attack multipliers only apply to undefended body parts

### Power vs Defense System
The power vs defense interaction is heavily defense-favored.

#### Undefended Parts
When attacking an undefended body part:

**Base chance**: 50% to deal damage
**Power advantage**: +12% per point advantage
**Defense advantage**: -12% per point advantage
**Range**: 15%-80% damage chance 

Damage is calculated:
- **60% chance**: Deal full power damage
- **40% chance**: Deal (power - 1) damage (minimum 1)


#### Defended Parts
When attacking a defended body part, compare attacker's power vs defender's defense:

**Base chance**: 30% to deal damage
**Power advantage**: +12% per point advantage
**Defense advantage**: -12% per point advantage
**Range**: 5%-70% damage chance

**Power < Defense**:
- **100% chance**: Deal 0 damage (completely blocked)

### Dual Defense Mechanism
Players with higher defense than their opponent gain dual defense opportunities.

**Activation of dual defense**:
- Requires: `defender.defense > attacker.defense`
- Chance: 10% per round (optimized for perfect balance)
- Effect: Defend an additional body part (different from primary defense)

**Selection**:
- Second defended part chosen randomly from remaining 4 body parts
- Cannot defend the same part twice in one round

## Combat Examples

### Example 1: Equal Stats Attack
**Scenario**: Human (Power 1) attacks Orc's (Defense 1) chest, Orc defends chest

**Resolution**:
1. No agility dodge (equal agility)
2. No super attack activated
3. Power 1 vs Defense 1 (defended part): 20% damage chance
4. If damage occurs: 20% chance for 1 damage, 80% chance for 0 damage (power-1, min 1)
5. **Result**: 20% chance for 1 damage, 80% chance for 0 damage

### Example 2: Power Advantage on Undefended Part
**Scenario**: Orc (Power 2) attacks Human's (Defense 1) head, Human defends chest

**Resolution**:
1. No agility dodge
2. Power 2 vs Defense 1 (undefended part): 60% + 10% = 70% damage chance
3. If damage occurs: 20% chance for 2 damage, 80% chance for 1 damage
4. **Result**: 70% chance for damage (1-2 points), 30% chance for 0 damage

### Example 3: Defense Advantage
**Scenario**: Human (Power 1) attacks Dwarf's (Defense 3) stomach, Dwarf defends stomach

**Resolution**:
1. Power 1 vs Defense 3 (defended part): 20% + (-2 × 10%) = 5% damage chance (minimum)
2. If damage occurs: 20% chance for 1 damage, 80% chance for 0 damage (power-1, min 1)
3. **Result**: 5% chance for 1 damage, 95% chance for 0 damage

### Example 4: High Power vs Low Defense
**Scenario**: High Power Attacker (Power 4) attacks Low Defense (Defense 1) target

**Undefended Part**:
- Damage chance: 60% + (3 × 10%) = 90% (maximum)
- Result: 90% chance for 3-4 damage

**Defended Part**:
- Damage chance: 20% + (3 × 10%) = 50%
- Result: 50% chance for 3-4 damage, 50% chance for 0 damage

## Balance Philosophy

### Balanced Combat System
The system creates more balanced power vs defense interactions:
- **Undefended parts**: 50% base chance ± asymmetric multipliers (15%-80% range)
- **Defended parts**: 30% base chance ± asymmetric multipliers (5%-70% range)
- **Symmetric scaling**: Power advantage +12% per point, Defense advantage -12% per point
- **Enhanced damage variance**: 60% full damage, 40% reduced damage (improved power advantage)
- **Diminishing power returns**: Power scaling reduced for higher levels to prevent dominance
- **Balanced dual defense**: 10% activation chance for defense advantage

### Power Investment Risk/Reward
- High power provides excellent damage potential
- Power effectiveness heavily mitigated by defense
- Super attacks make power investment rewarding but risky

### Agility as Equalizer
- Provides reliable damage avoidance
- Effective against both high power and defense builds
- Linear scaling with diminishing returns at high levels

### Strategic Depth
- Body part selection matters significantly
- Stat distribution creates meaningful build diversity
- Rock-paper-scissors dynamics between stat focuses

## Implementation Notes

### Random Number Generation
All percentage-based mechanics use standard random number generation with the specified probabilities.

### Damage Minimums
All damage calculations have a minimum of 1 damage when damage > 0 is calculated, preventing fractional damage.

### Round Limits
Combat rounds are capped at 100 rounds to prevent infinite fights, resulting in "timeout" outcomes.

### Simultaneous Resolution
All actions within a round are resolved simultaneously - both players' attacks are calculated and applied in the same round.

## Future Balance Considerations

### Current Strengths
- Clear stat identity and purpose
- Meaningful choice in stat distribution
- Defense provides strong protection without being overpowered

### Areas for Monitoring
- Very high block rates may slow combat pace
- Power scaling may need adjustment for higher stat levels
- Super attack frequency and damage balance

### Recommended Stat Costs
For balanced gameplay, all stats should cost equal points with a recommended total of 11 points per character to maintain competitive balance.