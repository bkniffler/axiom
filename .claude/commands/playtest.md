# Playtest Skill

Play through Axiom Ascendant and evaluate the experience against the game design document.

## How to Run

```bash
bun terminal/llm.ts --session=playtest-{timestamp} --reset [--seed=N]
```

## Playtest Protocol

### Phase 1: Early Game (Turns 1-5)
Focus: Basic mechanics, initial expansion

1. Start a new session with `--reset`
2. Scout adjacent planets to understand your neighborhood
3. Colonize 2-3 accessible planets (Empty/Primitives only)
4. Try partnering with at least one Native planet
5. Check shop for useful tech (Intel Network, Warp Drive)
6. Note initial entropy, influence income

**Track:**
- Are planets reachable via non-hostile paths?
- Does scouting work correctly?
- Are colonization costs appropriate?
- Does income feel reasonable?

### Phase 2: Mid Game (Turns 6-15)
Focus: Events, entropy, expansion pressure

1. Continue expanding - aim for 8+ controlled planets
2. Use Investigate action to reveal brewing events
3. Respond to at least 2-3 events with different choices
4. Buy tech/relics from shop when available
5. Use at least one relic to test effects
6. Push entropy above 25% to trigger cosmic events

**Track:**
- Do events spawn at appropriate rates?
- Do event choices feel meaningful?
- Does entropy accumulate as expected?
- Are external events (raiders, refugees, traders) appearing?
- Is the escalation chain working (unrest -> rebellion)?

### Phase 3: Late Game (Turns 16+)
Focus: Concordat, endgame tension

1. Push entropy above 50% to trigger Concordat attention
2. Handle Concordat events (Observers, Emissary, Ultimatum)
3. Test Veil of Silence relic if available
4. Push toward victory (scout all planets) or defeat (100% entropy)

**Track:**
- Does Concordat chain progress correctly?
- Is the endgame tension appropriate?
- Are win/loss conditions triggering correctly?

## Command Reference

```
scout <planetId>         - Reveal planet properties (1 Influence)
colonize <planetId>      - Claim empty/primitive planet (5 Influence)
partner <planetId>       - Ally with natives (4 Influence)
develop <planetId>       - Boost planet output (4 Influence)
investigate <planetId>   - Reveal brewing event (2 Influence)
respond <eventId> <opt>  - Handle active event
buy <1|2|3>              - Purchase shop item
reroll                   - Reroll shop (2 Influence)
use <relicId> [planet]   - Use a relic
end                      - End turn
```

## Evaluation Criteria

### Design Alignment (from docs/GameDesign.md)

1. **Single Resource Economy**
   - Is Influence the only currency?
   - Are tradeoffs clear?

2. **Progressive Revelation**
   - Are rings revealed through expansion?
   - Is the "fog of war" working?

3. **Hidden Events with Timers**
   - Do events brew invisibly?
   - Does Investigate reveal them properly?
   - Do escalation chains work?

4. **Entropy as Risk Meter**
   - Does colonization add entropy (scaled by ring)?
   - Does large empire add passive entropy?
   - Does high entropy trigger Concordat?

5. **Relics + Entropy Bargain**
   - Do relics provide powerful effects?
   - Do they add entropy as cost?

6. **Concordat as Emergent Threat**
   - Do they appear at high entropy?
   - Does the escalation chain work?

### Fun Factor

Rate 1-5:
- **Clarity**: Are mechanics easy to understand?
- **Agency**: Do choices feel meaningful?
- **Tension**: Is there pressure and risk?
- **Progression**: Does power growth feel satisfying?
- **Variety**: Are events diverse enough?
- **Pacing**: Is turn-to-turn engaging?

### Issues to Report

- **Bugs**: Crashes, incorrect behavior, broken mechanics
- **Balance**: Costs too high/low, events too frequent/rare
- **UX**: Confusing output, missing information
- **Missing Features**: Referenced in design but not implemented
- **Exploits**: Broken strategies, easy wins

## Output Format

After playing, provide a structured report:

```markdown
## Playtest Report

**Session:** playtest-{id}
**Seed:** N
**Turns Played:** N
**Outcome:** Victory/Defeat/Ongoing

### Design Alignment
- [x] Single resource economy works
- [x] Progressive revelation works
- [ ] Issue: <describe>

### Fun Ratings (1-5)
- Clarity: N
- Agency: N
- Tension: N
- Progression: N
- Variety: N
- Pacing: N

### Bugs Found
1. <description>

### Balance Issues
1. <description>

### Missing Features (vs GameDesign.md)
1. <feature from design doc not implemented>

### Suggestions
1. <improvement idea>

### Session Log Highlights
- Turn X: <notable event>
```

## Example Playtest Session

```bash
# Start fresh game
bun terminal/llm.ts --session=playtest-001 --reset --seed=42

# Scout neighbors
bun terminal/llm.ts --session=playtest-001 --do "scout p-0-1" --do "scout p-0-2"

# Colonize accessible planet
bun terminal/llm.ts --session=playtest-001 --do "colonize p-0-1"

# Check for events
bun terminal/llm.ts --session=playtest-001 --do "investigate p-0-0"

# End turn
bun terminal/llm.ts --session=playtest-001 --do "end"

# Continue playing...
```

## Tips

- Use `--show` to see command help anytime
- Session state is saved in `.llm-sessions/<session>/`
- Turn snapshots are in `.llm-sessions/<session>/turns/`
- Event log is in `.llm-sessions/<session>/events.jsonl`
- Test different seeds to verify determinism
- Play the same seed twice to verify reproducibility
