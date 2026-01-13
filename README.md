# Axiom Ascendant

**A roguelike 4X where you build income engines while desperately staying ahead of galactic collapse.**

You're a fledgling civilization expanding through a ring-based galaxy. Scout planets, colonize worlds, and stack multipliers to build a powerful economy—but your success draws attention. Events brew in the shadows, entropy rises, and the ancient Concordat watches.

**Choose your path:** Play as a diplomatic Federation, carefully managing events while building sustainable income. Or embrace the Empire path—suppress dissent, deploy orbital cannons, and race the Concordat clock. Both paths are desperate. Both are valid.

**Core Fantasy:** "Desperate Gambler" — Find broken combos while barely staying alive.

**Inspiration:** Balatro's multipliers × FTL's tension × Into the Breach's spatial puzzles

---

## Quick Start

```bash
# Install dependencies
bun install

# Play via terminal
bun terminal/llm.ts --session=game1 --seed=42

# Commands
bun terminal/llm.ts --session=game1 --do "scout p-0-1" --do "colonize p-0-1" --do "end"
```

---

## Core Mechanics

### Economy: Base × Multiplier

```
Net Income = (Base Income × Multiplier) - Upkeep
```

**Base Income:** Sum of planet outputs + development bonuses

**Multiplier Sources:**

| Source | Bonus |
|--------|-------|
| Trade planet | +0.2x each |
| High development (3+) | +0.1x each |
| Trade Network tech | +0.5x |
| Planet Networks | +0.3x to +0.5x |
| Echo of Myr'akath relic | +2.0x (one turn) |

### Upkeep: The Hungry Beast

| Cost | Amount |
|------|--------|
| Ring 1 planets | 2/turn each |
| Ring 2 planets | 3/turn each |
| Ring 3 planets | 4/turn each |
| Entropy 25%+ | -3/turn |
| Entropy 50%+ | -8/turn |
| Entropy 75%+ | -15/turn |
| Concordat tribute | -2 to -20/turn |
| Pirate bases | -3/turn |

### Planet Networks

3+ connected planets of the same type create synergies:

| Network | Bonus |
|---------|-------|
| Trade | +0.5x mult, +5 flat income |
| Industrial | +0.5x mult |
| Scientific | +0.3x mult |
| Agricultural | -1 upkeep per planet |

---

## Playstyle: Federation vs Empire

Your choices define your path. Entropy is your "alignment indicator":

| Playstyle | Entropy | Tension |
|-----------|---------|---------|
| **Federation** | 0-30% | Events drain influence faster than you earn |
| **Balanced** | 30-60% | Juggling both pressures |
| **Empire** | 60%+ | Racing the Concordat clock |

### Event Choices

Every event offers multiple paths:

**Unrest Example:**
- **Negotiate** (5 Influence, -1 Entropy) — Diplomatic, expensive
- **Suppress** (2 Influence, +3 Entropy) — Cheap but draws attention
- **Purge District** (Free, +8 Entropy, -1 planet income) — Brutal, permanent damage
- **Ignore** — Free, but escalates to Rebellion

**Escalation Chain:** Unrest → Rebellion (-100% planet income!)

### Desperate Measures (Relics)

When diplomacy fails:

| Relic | Cost | Effect | Entropy |
|-------|------|--------|---------|
| Orbital Cannon | 15 | Destroy target planet, remove all events | +20 |
| Propaganda Engine | 12 | Resolve all Unrest events for free | +1 per event |
| Doomsday Device | 25 | Destroy entire ring | +40 |
| Echo of Myr'akath | 10 | +2.0x multiplier this turn | +6 |
| Veil of Silence | 18 | Clear all Concordat events | +12 |

---

## The Concordat

The Concordat isn't a death trigger—they're a **looming presence** demanding tribute and offering dark bargains.

| Stage | Trigger | Tribute | Offers |
|-------|---------|---------|--------|
| Awareness | Turn 5+ | -2/turn | — |
| Observers | 25%+ entropy | -5/turn | "Pay 20 to ignore entropy for 10 turns" |
| Emissary | 50%+ entropy | -12/turn | "Destroy a planet, we reduce entropy by 30" |
| Fleet | 75%+ entropy | -20/turn | 5 turns to submit or fight |
| Intervention | 100% entropy | — | Final choice: Submit or Fight |

**Concordat reacts to your playstyle:**
- Low entropy (Federation): They see ally potential, offer partnership
- High entropy (Empire): They see threat, sabotage your empire

---

## Victory Conditions

Multiple paths to win:

| Victory | Requirement |
|---------|-------------|
| **Influence** | Accumulate 500 influence |
| **Domination** | Control 80% of planets |
| **Concordat** | Negotiate alliance OR defeat them |

**Defeat:** Entropy exceeds 120% after fighting Concordat

---

## The Feel

**Turn 1-5:** Every influence matters. Scout carefully. Expand strategically.

**Turn 5-15:** Events accumulate. Upkeep grows. The Concordat is watching.

**Turn 15+:** Knife fight. One bad cascade crashes your income. Desperate choices.

*The question: Can you build fast enough to win before everything collapses?*

---

## Project Structure

```
src/core/           # Headless game engine (pure reducer)
  machine.ts        # State transitions
  networks.ts       # Economy calculations
  types.ts          # Type definitions
  content.ts        # Game content (techs, relics, config)

terminal/           # CLI interface for playtesting
  llm.ts            # Terminal game client

docs/               # Design documentation
  CORE.md           # Core systems roadmap
  ITERATION-2.md    # Economy system design
  GameDesign.md     # Full game design doc
```

---

## Development

```bash
# Run tests
bun test

# Playtest with specific seed
bun terminal/llm.ts --session=test --reset --seed=123

# View session state
cat .llm-sessions/test/state.json
```

---

## License

MIT
