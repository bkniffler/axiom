# Core Roadmap (Headless, Deterministic)

This roadmap defines the **headless game core** for *Axiom Ascendant*.

It intentionally replaces all earlier prototype milestones (capacity/stability, etc). The source of truth is `docs/GameDesign.md`.

## Non-Negotiables
- **Pure reducer**: all state changes happen via `transition(state, event) -> { state, effects }`
- **Serializable state**: JSON-friendly; no DOM, timers, classes, or hidden singletons
- **Deterministic**: given `seed + initialState + eventLog`, outcomes are replayable
- **Thin UI**: terminal/renderer are adapters; core is platform-agnostic
- **Test-first**: core rules are unit tested; content has targeted tests

## Current Core (Implemented)

### Galaxy & Planets
- **Ring-based galaxy**: concentric rings revealed by expansion
- **Planet types**: Industrial, Agricultural, Scientific, Military, Trade, Frontier, Relic, Barren
- **Inhabitants**: Empty, Primitives, Natives, Ruins, Hostile
- **Route connectivity**: guaranteed non-hostile paths to all planets (bug fixed)

### Economy (Iteration 2)
- **Single currency**: Influence (everything costs it; planets produce it)
- **Multiplier system**: Final Income = Base Income × Multiplier
- **Planet Networks**: 3+ connected same-type planets create synergy bonuses
- **Upkeep costs**: Ring-based planet maintenance, entropy drain, Concordat tribute
- **Net Income**: Gross income minus all upkeep costs

See `docs/ITERATION-2.md` for full economy details.

### Actions
- **Scout**: reveal planet properties (1 Influence)
- **Colonize**: claim empty/primitive planets (5 Influence, +entropy by ring)
- **Partner**: ally with natives (4 Influence, -2 with Diplomatic Corps)
- **Develop**: boost planet output (4 Influence)
- **Investigate**: reveal brewing events (2 Influence, -1 with Intel Network)
- **Use Relic**: powerful one-time effects (+entropy)

### Events System
- **Hidden timers**: events brew invisibly, fire after countdown
- **Event kinds**:
  - **Internal**: Unrest -> Rebellion (escalation chain)
  - **External**: Raiders -> Pirate Base, Refugees, Traders
  - **Cosmic**: Anomaly (entropy-driven)
  - **Concordat**: Observers -> Emissary -> Ultimatum -> Intervention
- **Escalation**: ignoring events triggers worse follow-up events

### Entropy
- **Sources**:
  - Colonization (scales by ring: 1 + ring number)
  - Large empire (passive: 1 per 4 planets over 8)
  - Aggressive event choices (Suppress, Harvest, etc.)
  - Relic use (+3 to +12 depending on relic)
- **Effects**:
  - 25%+ entropy: increased cosmic events
  - 50%+ entropy: Concordat observers appear (12% chance/turn)
  - 75%+ entropy: Concordat emissaries (25% chance/turn)
  - 100%: Concordat Intervention event (final choice)
    - **Surrender**: entropy → 0, survive under Concordat rule
    - **Fight**: +25 entropy, if entropy > 120 on turn end → defeat

### Shop & Tech
- **3-slot shop**: refreshes each turn, reroll available
- **Tech cards**:
  - Warp Drive (T1): Colonize -1 Influence
  - Intel Network (T1): Investigate -1 Influence, can find any event
  - Terraforming Kits (T2): Develop gives +1 base influence on Barren
  - Diplomatic Corps (T2): Partner -2 Influence
- **Relics**:
  - Axiom Key (T1): Reveal next ring (+10 Entropy)
  - Precursor Archive (T1): Reveal all hidden events (+3 Entropy)
  - Stasis Field (T2): Freeze event +10 turns (+5 Entropy)
  - Echo of Myr'akath (T2): Bonus influence = income (+6 Entropy)
  - Genesis Seed (T3): Terraform planet to Industrial (+8 Entropy)
  - Veil of Silence (T3): Clear all Concordat events (+12 Entropy)

### Victory/Loss
- **Win**: Scout all revealed planets
- **Lose**: Fight Concordat and fail (entropy > 120)

## Roadmap Status

### Milestone A - Planet Interaction Slice
- [x] Scout, Colonize, Partner, Develop actions
- [x] Planet type/inhabitants constrain actions
- [x] Colonize without scout blocked
- [x] All planets reachable via non-hostile paths

### Milestone B - Event Engine
- [x] Brewing event pools by planet type
- [x] Escalation chains (Unrest -> Rebellion)
- [x] External events (Raiders -> Pirate Base, Refugees, Traders)
- [x] Intel economy with Investigate action
- [x] Intel Network tech enables global investigation

### Milestone C - Card Shop
- [x] 3-slot shop with reroll
- [x] Tech cards unlock modifiers
- [x] Card tiers (T1, T2, T3)

### Milestone D - Relics + Entropy
- [x] 6 relics with unique effects
- [x] Relic use adds entropy
- [x] Entropy from colonization (scales by ring)
- [x] Passive entropy from large empires
- [x] Entropy affects event spawning rates

### Milestone E - Concordat
- [x] Concordat event chain (Observers -> Emissary -> Ultimatum -> Intervention)
- [x] High entropy triggers Concordat attention
- [x] Submit vs Resist choices
- [x] Veil of Silence relic counters Concordat

### Milestone F - Endgame (Partial)
- [x] Victory: full exploration (scout all planets)
- [x] Loss: entropy threshold
- [ ] Multiple victory paths (integration, independence)
- [ ] Concordat final battle mechanics

## Testing

**Iteration 2:** Core tests removed for faster iteration. Testing via playtest:

```bash
bun terminal/llm.ts --session=test --reset --seed=42
```

Remaining test files in `test/`:
- `starmap-pixel.test.ts` - StarMap rendering tests

Run tests: `bun test`

## Implementation Notes
- Keep authored content (cards/events) data-only in `content.ts`
- Prefer small, composable effect helpers (`applyInfluence`/`applyEntropy`)
- Test event materialization separately from spawning logic
- Galaxy route repair ensures no dead-end planets
