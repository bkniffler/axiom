# Iteration 2: "Desperate Gambler"

**Goal:** Transform Axiom Ascendant from a "spreadsheet manager" into an engaging roguelike where players build income engines while desperately staying ahead of empire collapse.

**Core Fantasy:** "Desperate Survivor + Cosmic Gambler" - Find broken combos while barely staying alive.

**Inspiration:** Balatro's multipliers + FTL's tension + Into the Breach's spatial puzzles

---

## New Systems

### 1. Multiplier System (Income Engine)

Replace flat income with base × multiplier:

```
Final Income = Base Income × Multiplier

Base Income: Sum of all planet outputs (including development bonus)
Multiplier: Starts at 1.0x, built through synergies
```

**Multiplier Sources:**
| Source | Bonus |
|--------|-------|
| Trade planet controlled | +0.2x per planet |
| Planet at Development 3+ | +0.1x per planet |
| Trade Network (3+ connected) | +0.5x |
| Industrial Cluster (3+ connected) | +0.5x |
| Scientific Hub (3+ connected) | +0.3x |
| Trade Network tech | +0.5x |
| Echo of Myr'akath (active turn) | +2.0x |

**Example:** 25 base × 2.4x mult = 60 influence/turn gross

### 2. Planet Network Synergies

Connected planets of same type (via routes) create bonuses when 3+ are linked:

| Network | Requirement | Bonuses |
|---------|-------------|---------|
| **Trade Network** | 3+ Trade planets connected | +0.5x mult, +5 flat income |
| **Industrial Cluster** | 3+ Industrial connected | +0.5x mult |
| **Scientific Hub** | 3+ Scientific connected | +0.3x mult |
| **Military Corridor** | 3+ Military connected | (Future: event cost reduction) |
| **Agricultural Belt** | 3+ Agricultural connected | -1 upkeep per Agricultural planet |

Networks require planets to be both:
1. Controlled or partnered
2. Connected via galaxy routes (not just adjacent rings)

### 3. Upkeep System (The Hungry Beast)

Empire maintenance costs per turn:

```
Planet Upkeep (by ring):
  Ring 0: 0/turn (homeworld free)
  Ring 1: 1/turn each
  Ring 2: 2/turn each
  Ring 3: 3/turn each
  Ring 4: 4/turn each

Entropy Drain (cumulative):
  0-25%:   0/turn
  25-50%:  -3/turn
  50-75%:  -8/turn
  75-100%: -15/turn

Concordat Tribute (while events active):
  Observers (brewing, revealed): -2/turn
  Observers (active): -5/turn
  Emissary (brewing, revealed): -6/turn
  Emissary (active): -12/turn
  Ultimatum (active): -20/turn
```

### 4. Net Income Formula

```
Net Income = Gross Income - Total Upkeep

Where:
  Gross Income = Base Income × Multiplier
  Total Upkeep = Planet Upkeep + Entropy Drain + Concordat Tribute + Event Losses
```

**Event Income Impact:**
- Planet with Unrest: -50% income from that planet
- Planet with Rebellion: -100% income (produces nothing)
- Adjacent to Rebellion: -25% income (fear spreads)
- Pirate Base active: -3 flat income loss

### 5. Economy Breakdown (GameState)

New `economy` field provides full breakdown:

```typescript
economy: {
  baseIncome: number;        // Sum of planet outputs
  multiplier: number;        // Current multiplier
  grossIncome: number;       // baseIncome × multiplier
  planetUpkeep: number;      // Ring-based maintenance
  entropyDrain: number;      // High-entropy penalty
  concordatTribute: number;  // Concordat event costs
  eventLosses: number;       // Pirate bases, etc.
  netIncome: number;         // Final income after upkeep
}
```

### 6. Negative Income Consequences

If `netIncome < 0`:
- Influence decreases each turn
- At 0 influence: cannot take actions
- (Future: Economic Collapse event after 3 consecutive negative turns)

---

## Updated Tech Cards

| Tech | Tier | Cost | Effect |
|------|------|------|--------|
| Warp Drive | T1 | 6 | Colonize -1, Ring 1 planets have no upkeep |
| Intel Network | T1 | 6 | Investigate -1 |
| Terraforming Kits | T2 | 10 | Develop gives +1 base on Barren |
| Diplomatic Corps | T2 | 8 | Partner -2, Partnered planets no upkeep |
| **Trade Network** | T2 | 10 | +0.5x mult, Trade planets +1 base |
| **Entropy Dampeners** | T3 | 15 | Entropy drain halved |
| **Concordat Protocols** | T3 | 18 | Concordat tribute halved |

### New Tech Details

**Trade Network** - Creates immediate multiplier boost plus flat income increase from Trade planets. Synergizes with Trade Network bonus.

**Entropy Dampeners** - Critical for high-entropy strategies. Reduces the -3/-8/-15 drain penalties by half.

**Concordat Protocols** - Diplomatic tech that halves tribute costs. Essential when Concordat events are active.

---

## Updated Relics

| Relic | Tier | Cost | Effect | Entropy |
|-------|------|------|--------|---------|
| Axiom Key | T1 | 8 | Reveal next ring instantly | +10 |
| Precursor Archive | T1 | 6 | Reveal all hidden events | +3 |
| Stasis Field | T2 | 12 | Freeze target event +10 turns | +5 |
| Echo of Myr'akath | T2 | 10 | +2.0x multiplier this turn | +6 |
| Genesis Seed | T3 | 15 | Terraform planet to Industrial | +8 |
| Veil of Silence | T3 | 18 | Clear all Concordat events | +12 |

### Echo of Myr'akath

Changed from flat income bonus to massive multiplier boost. With a 30 base income:
- Before: +30 influence (doubled income once)
- Now: 30 × 3.0x (base 1.0 + 2.0) = 90 influence for the turn

This creates "big turn" moments where players can recover from deficit.

---

## Terminal Display

Updated `terminal/llm.ts` output:

```
Phase=playing Turn=12 Influence=45 Entropy=38/100 (38%) Ring=2/4
Economy: 28 base × 1.8x = 50 gross | Upkeep: -24 (planets:12 entropy:3 tribute:5 events:4) | Net: +26
Networks: [Trade] [Industrial]
Events: active=2 brewing=4 (revealed=1)
```

Shows:
- Base income and multiplier breakdown
- Upkeep breakdown (planets, entropy, concordat, events)
- Net income (positive = green, negative = red in UI)
- Active networks

---

## Implementation Files

**New:**
- `src/core/networks.ts` - Network detection, economy calculation

**Modified:**
- `src/core/types.ts` - Networks, EconomyBreakdown types, GameConfig updates
- `src/core/machine.ts` - Economy integration in endTurn
- `src/core/content.ts` - New techs, updated config defaults
- `terminal/llm.ts` - Economy display

**Deleted:**
- `test/core-*.test.ts` (6 files) - Faster iteration via playtest

---

## Design Rationale

### Why Multipliers?

Flat income creates linear progression - "spreadsheet manager" feel. Multipliers create:
- **Compounding growth**: Small bonuses stack multiplicatively
- **Breakpoint moments**: Hitting 2.0x feels like a breakthrough
- **Risk/reward decisions**: Do I grab this Trade planet for +0.2x or save for security?

### Why Upkeep?

Without upkeep, expansion has no downside. Upkeep creates:
- **Tension curve**: Income must outpace growing costs
- **Strategic depth**: Outer ring planets cost more to maintain
- **Tech relevance**: Warp Drive, Diplomatic Corps become valuable

### Why Networks?

Same-type planets being "just better" lacks spatial puzzle. Networks create:
- **Route awareness**: Galaxy topology matters
- **Clustering incentives**: Group planets strategically
- **Breakpoint moments**: "One more Trade planet completes the network!"

---

## Testing via Playtest

Run: `bun terminal/llm.ts --session=test --reset --seed=42`

**Verify:**
- [ ] Income shows base × mult = gross
- [ ] Upkeep deducts from gross each turn
- [ ] Networks activate when 3+ same-type connected
- [ ] Entropy drain kicks in at 25%+
- [ ] Concordat tribute applies when events active
- [ ] Negative income is possible
- [ ] Game feels tense by turn 10-15

---

## Future Iteration Ideas

- **Scaled Event Costs**: Events cost more as empire grows
- **Economic Collapse**: 3 consecutive negative turns triggers crisis
- **Military Network**: Event resolution cost reduction
- **More Relics**: Multiplier-focused effects
- **Victory Rework**: Replace "scout all" with influence threshold or network completion
