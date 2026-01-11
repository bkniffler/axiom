# AXIOM ASCENDANT

## Game Design Document

---

## Core Identity

A 2D turn-based strategy game where you guide a newly spacefaring species through galactic expansion. You begin knowing nothing about the universe's true nature - the ancient powers, the Concordat, the manipulated physics. You discover it all through play.

**Genre:** Turn-based strategy
**Tone:** Cosmic mystery, emergent narrative, strategic tension
**Inspirations:** Ozymandias (simplicity), FTL (events/discovery), Into the Breach (consequence), Stellaris (scope, not complexity)

---

## Setting

Your species just achieved colonization technology. The galaxy is vast, dangerous, and full of secrets.

Unknown to you:
- Reality itself is manipulated by incomprehensible forces (the Tzsari)
- Ancient relics carry terrible power and hidden costs
- Your expansion will eventually draw attention from galactic powers
- You are not the first. You will likely not be the last.

The player discovers these truths through gameplay, not exposition.

---

## Map Structure

### Galaxy Layout
- **Nodes:** Planets connected by routes (not hex grid)
- **Rings:** Galaxy organized in concentric rings from your homeworld
- **Progressive Revelation:** Outer rings are dark until you expand far enough

### Planet Properties (Hidden Until Scouted)
- **Type:** Industrial, Agricultural, Scientific, Military, Trade, Frontier, Relic, Barren
- **Resources:** Influence output potential
- **Inhabitants:** Empty, Primitives, Natives, Ruins, Hostile
- **Threats:** Environmental hazards, strategic value to rivals

---

## Single Resource: Influence

Everything costs Influence. Everything generates Influence.

**Income:**
- Controlled planets produce Influence per turn
- Base output modified by planet type and development
- Partnerships split output with natives

**Expenses:**
- All actions cost Influence
- Responding to events costs Influence
- Development costs Influence

**Philosophy:** One resource means clear tradeoffs. No complex economy to manage - just "can I afford this, and is it worth it?"

---

## Your Empire

### Control Levels

| Status | Meaning |
|--------|---------|
| **Controlled** | Fully yours, generates Influence, can develop |
| **Partnered** | Shared with natives, partial Influence, stable |
| **Sphere of Reach** | Adjacent to controlled, can act on |
| **Horizon** | Visible but not reachable yet |
| **Dark** | Unknown, unrevealed |

### Presence
No units or fleets. Your species IS your presence. If you control a planet, you're there. Expansion is about claiming and holding territory, not moving armies.

---

## Turn Structure

1. **Collect Influence** from controlled and partnered planets
2. **Wave Check** - if expansion threshold met, next ring reveals
3. **Hidden Events Progress** - timers tick down (invisible to you)
4. **Events Fire** - any events reaching zero trigger
5. **Spend Influence** - take actions in any order
6. **End Turn** - consequences resolve, state updates

---

## Actions

| Action | Cost | Effect |
|--------|------|--------|
| **Scout** | Low | Reveal planet's hidden properties |
| **Colonize** | Medium | Claim empty/primitive planet |
| **Partner** | Medium | Form alliance with native species |
| **Conquer** | High | Take planet by force |
| **Subjugate** | Medium | Dominate natives (more output, more problems) |
| **Develop** | Medium | Increase planet's Influence output |
| **Investigate** | Low | Reveal one hidden event and its timer |
| **Respond** | Varies | Address an active event |
| **Use Relic** | Free | Powerful one-time effect, adds Entropy |

---

## Events System

### Core Principles

1. **Planet-Driven:** Events emerge from planet types you control
2. **Hidden Timers:** Events brew invisibly until they fire
3. **Consequence Chains:** Unhandled events escalate and spread

### How Events Work

**Generation:**
- Each planet type contributes to an event pool
- More military planets = more military events possible
- Events are drawn from this pool and assigned hidden timers

**Timers:**
- Events brew for 2-6 turns before firing
- You don't see the timer unless you have intel
- When timer hits zero, event fires

**Intel:**
- "Investigate" action reveals one brewing event and its timer
- Certain relics reveal all events temporarily
- Some species traits grant passive intel
- Developed planets may detect local events

### Event Resolution

When an event fires (or you respond early), you face choices:

**Example: "Unrest on Kepler-7"**
- **Negotiate** (Medium Influence) → Unrest resolved, minor concessions
- **Suppress** (Low Influence) → Unrest crushed, "Resentment" event queued
- **Ignore** → Unrest escalates to "Rebellion" in 3 turns
- **Use Relic: Stasis Field** (Free, +Entropy) → Frozen for 10 turns

### Escalation

Unhandled events grow and spread:

```
Unrest (1 planet)
    → Rebellion (1 planet)
    → Civil War (spreads to adjacent)
    → Secession (planets lost)
```

```
Pirate Raid (1 planet)
    → Pirate Base (persistent drain)
    → Pirate Fleet (threatens routes)
    → Pirate Empire (rival faction emerges)
```

### Event Categories

| Category | Source | Examples |
|----------|--------|----------|
| **Internal** | Your planets | Rebellion, corruption, plague, economic boom, cultural renaissance |
| **External** | Neighbors/horizon | Raiders, refugees, traders, rival scouts, first contact |
| **Cosmic** | Entropy/relics | Anomalies, whispers, reality glitches, relic activations |
| **Concordat** | High power/entropy | Observers, emissaries, ultimatums, intervention |

### Event Chains (Examples)

**Positive Chain:**
1. "Trade Opportunity" → Accept
2. "Merchant Delegation" → Grant access
3. "Trade Hub" → Planet becomes trade center (+Influence)
4. "Economic Boom" → Adjacent planets benefit

**Negative Chain:**
1. "Labor Dispute" → Ignore
2. "Strike" → Ignore
3. "Sabotage" → Planet output halved
4. "Revolutionary Movement" → Spreads to similar planet types

**Cosmic Chain:**
1. "Strange Signal" → Investigate with relic
2. "Precursor Cache Found" → Gain powerful relic
3. "Tzsari Notice" → Entropy spike
4. "Reality Tremor" → Random planet affected

---

## Relics

### What They Are
Ancient artifacts from dead civilizations or the Precursors. Found through exploration, events, or relic worlds. Single-use items of immense power.

### The Bargain
All relics add Entropy when used. Power now, consequences later.

### Example Relics

| Relic | Effect | Entropy |
|-------|--------|---------|
| **Null Bomb** | Destroy all life on target planet (Total Erasure) | High |
| **Stasis Field** | Freeze any event for 10 turns | Medium |
| **Genesis Seed** | Terraform any planet to ideal type | Medium |
| **Axiom Key** | Reveal entire next ring instantly | Low |
| **Echo of Myr'akath** | Double Influence income this turn | Medium |
| **Veil of Silence** | Hide your empire from Concordat for 5 turns | High |
| **Precursor Archive** | Reveal all hidden events and timers | Low |
| **Reality Anchor** | Prevent all cosmic events for 3 turns | Medium |
| **Extinction Protocol** | Eliminate a rival faction entirely | Very High |

---

## Entropy

### What It Represents
Your disturbance of the cosmic order. The attention you've drawn from forces beyond comprehension.

### Sources
- Using relics (primary source)
- Total Erasure of planets
- Aggressive expansion patterns
- Ignoring cosmic events
- Certain desperate actions

### Effects of Rising Entropy

| Level | Effect |
|-------|--------|
| **Low (0-25%)** | No effect. You're beneath notice. |
| **Medium (25-50%)** | Cosmic events appear more frequently |
| **High (50-75%)** | Anomalies spawn. Planets become unstable. |
| **Critical (75-100%)** | Concordat scouts appear. Reality glitches. |
| **Threshold (100%)** | Concordat arrives. Endgame triggers. |

### Reducing Entropy
- Time (very slow natural decay)
- Certain events offer entropy reduction
- Rare relics can absorb entropy
- Joining the Concordat resets it (at a cost)

---

## Species Evolution

### Starting Traits
Begin by choosing 2 traits for your species:

**Examples:**
- **Adaptable** - Colonize any planet type at reduced cost
- **Militant** - Conquer actions cost less, Partnerships cost more
- **Diplomatic** - Partnership actions cost less, gain intel on neighbors
- **Industrial** - Developed planets produce more
- **Curious** - Scout actions are free
- **Resilient** - Events take longer to escalate
- **Void-Born** - Start with a relic, higher base entropy

### Evolutionary Traits
As you play, your actions shape your species. After certain thresholds, you're offered new traits based on your history:

| If You... | You're Offered... |
|-----------|-------------------|
| Conquer frequently | Warrior Caste, Fearsome Reputation |
| Partner frequently | Galactic Diplomats, Cultural Exchange |
| Use many relics | Relic Attuned, Entropy Resistant (or Void-Touched) |
| Develop heavily | Industrial Masters, Efficient Bureaucracy |
| Expand rapidly | Manifest Destiny, Overextended |
| Maintain stability | Steady Hand, Conservative |

**You can accept or reject offered traits.** Accepting changes your capabilities permanently.

**By endgame, your species reflects how you played.**

---

## The Concordat

### What It Is
The Axiometric Concordat - the galactic government you didn't know existed. Controlled by ancient powers, they manage younger species like gardeners manage weeds.

### How They Appear
The Concordat notices you through:
- **High Entropy** - You're disturbing the cosmic order
- **Massive Expansion** - You're becoming a threat
- **Relic Abuse** - You're touching things you shouldn't
- **Specific Events** - Some chains draw their attention

### Concordat Escalation

1. **Observers** - Strange ships at your borders. No interaction yet.
2. **Emissaries** - First contact. They "invite" you to comply with regulations.
3. **Ultimatums** - Demands. Reduce expansion. Stop using relics. Submit.
4. **Intervention** - If you refuse, they act.

### Endgame: The Choice

When the Concordat fully arrives, you face the final decision:

**Join Them:**
- Your species becomes part of the galactic order
- Lose autonomy, gain stability
- Entropy resets, but you're now managed
- "Victory" through submission

**Fight Them:**
- Final crisis: Survive the Concordat response
- Use everything you have (relics, allies, evolved traits)
- Win = true independence, galaxy is yours
- Lose = extinction or forced submission

**The Twist:** The Concordat isn't evil. They're maintaining cosmic stability against entropy. You might be the problem.

---

## Win Conditions

### Primary Victory: Full Exploration
Scout every planet in the galaxy before the Concordat stops you.

**The Challenge:**
- Each ring has more planets than the last
- Expansion triggers new rings
- You're chasing a moving target
- Events and entropy slow you down

### Secondary Victory: Concordat Integration
Join the Concordat willingly. Your species survives and thrives, but as part of their order.

### True Victory: Independence
Fight off the Concordat. Claim the galaxy on your own terms. Your species becomes a new power.

### Failure States
- Empire collapses from unhandled events
- Concordat eliminates you
- Entropy reaches critical without preparation

---

## Core Tensions

### The Expansion Paradox
- More planets = more Influence = more power
- More planets = more events = more problems
- Expansion triggers new rings = more to explore
- Expansion draws Concordat attention

**Question:** How fast do you grow?

### The Relic Temptation
- Relics solve problems instantly
- Relics add entropy
- Entropy brings the Concordat
- But without relics, can you survive?

**Question:** When is power worth the price?

### The Information Gap
- Events brew invisibly
- Intel costs resources
- Perfect information requires investment
- Ignorance is cheaper but dangerous

**Question:** How much do you need to know?

### The Species Identity
- Your choices offer traits
- Traits shape your capabilities
- Early choices constrain late game
- Who you become depends on how you played

**Question:** Who is your species becoming?

---

## What Makes It AXIOM

| Element | Purpose |
|---------|---------|
| Progressive revelation | You never see the whole problem |
| Hidden events with timers | Tension without randomness |
| Escalation chains | Consequences compound |
| Single resource (Influence) | Clear tradeoffs |
| Relics + Entropy | Temptation with real cost |
| Species evolution | Playstyle becomes identity |
| Concordat as emergent threat | You're racing your own success |
| Discovery through play | The universe reveals itself |

---

## Game Parameters

### Pacing

**Ring Revelation:** Expansion-based, not turn-based.
- New rings unlock when you control a threshold of planets in the current ring
- "You opened this door" - expansion triggers revelation
- Prevents passive waiting; rewards active play

**Event Frequency:** Scales with empire size.
- Early game: 1-2 brewing events at a time
- Mid game: 3-5 brewing events
- Late game: 6-10+ brewing events
- More planets = more event sources = more fires

**Event Timers:** 2-6 turns depending on severity.
- Minor events: 2-3 turns
- Major events: 4-5 turns
- Cosmic events: 5-6 turns

---

### Difficulty & Rivals

**Emergent Rivals:** No rival factions at game start.

Rivals are CREATED through event chains:
- Pirates raid repeatedly → Pirate Empire forms
- Rebellion succeeds → Separatist faction emerges
- Ignored refugees → They settle and become competitors
- Failed first contact → Hostile species expands against you

**Why this works:**
- Rivals feel earned/caused by your actions
- Every rival is a story of something you did (or didn't do)
- No arbitrary AI opponents from turn 1
- The Concordat remains the ultimate "opponent"

**Rival Behavior:**
- Claim planets in your sphere
- Compete for resources
- Can be negotiated with, conquered, or allied
- Some may join you against the Concordat

---

### Map Size

**Default: Medium**

| Size | Rings | Planets | Game Length | Best For |
|------|-------|---------|-------------|----------|
| Small | 4 | 20-30 | 30-45 min | Quick sessions, learning |
| Medium | 6 | 40-60 | 60-90 min | Standard experience |
| Large | 8 | 80-100 | 2+ hours | Epic campaigns |

**Ring Distribution (Medium):**
- Ring 1: Homeworld + 2-3 planets (starting area)
- Ring 2: 5-8 planets
- Ring 3: 8-12 planets
- Ring 4: 10-15 planets
- Ring 5: 12-18 planets
- Ring 6: 8-12 planets (galactic edge)

---

### Event Balance

**Philosophy:** Start forgiving, escalate faster as game progresses.

**Early Game (Rings 1-2):**
- Escalation is slow (4-5 turns between stages)
- Consequences are recoverable
- Mistakes are lessons, not doom
- Teaches the system gently

**Mid Game (Rings 3-4):**
- Escalation speeds up (3-4 turns between stages)
- Consequences start to compound
- Ignoring events becomes costly
- Multiple fires require prioritization

**Late Game (Rings 5+):**
- Escalation is fast (2-3 turns between stages)
- Consequences cascade hard
- Missing events can spiral into crises
- Mastery required to juggle everything

**The Goal:** A skilled player CAN handle everything. But it requires skill, foresight, and good prioritization. The game should be beatable without losses - but only if you're good.

---

### Intel Economy

**Philosophy:** Intel scales with investment.

**Base State:**
- Events brew invisibly
- You know something is coming (planet types hint at risks)
- But you don't know what or when

**Intel Sources:**

| Source | Effect | Cost |
|--------|--------|------|
| **Investigate Action** | Reveal one event + timer | Low Influence |
| **Developed Planets** | Auto-detect local events | Development investment |
| **Species Traits** | Passive intel bonuses | Trait slot |
| **Relics** | Temporary full vision | Entropy |

**Developed Planet Intel:**
- Level 1: No intel
- Level 2: Detect events on this planet
- Level 3: Detect events on this + adjacent planets

**Intel Traits:**
- **Curious:** Scout actions also reveal one local event
- **Paranoid:** All events revealed 1 turn before firing
- **Networked:** Developed planets share intel across empire

**The Tradeoff:**
- Cheap to stay blind (but dangerous)
- Expensive to see everything (but safe)
- Sweet spot: Invest in key areas, accept uncertainty elsewhere

---

### Relic Distribution

**Quantity:** Rare (5-8 per game)
- Each relic is a major decision
- Not a regular tool - a desperate measure or strategic trump card
- Finding one should feel significant

**Acquisition Sources:**

| Source | Frequency | Notes |
|--------|-----------|-------|
| **Relic Planets** | 1-2 per game | Must scout to identify, colonize to claim |
| **Major Event Chains** | 2-3 per game | Reward for completing difficult chains |
| **Cosmic Events** | 1-2 per game | High risk, high reward encounters |
| **Starting Trait** | 0-1 per game | "Void-Born" trait grants starting relic |

**Relic Discovery:**
- Relic planets appear in outer rings (risk/reward)
- Event chain relics require investment to unlock
- Cosmic relics come with strings attached

**No Relic Trading/Buying:** Relics are found, not purchased. Maintains their mystique.

---

### Multiplayer

**Single-player only.**

**Rationale:**
- Focus on personal narrative and discovery
- AI provides challenge through events and emergent rivals
- Pacing can be experimental without multiplayer balance concerns
- Simpler development scope
- The "discovery" experience works best solo

**Future Consideration:** If successful, async multiplayer could work (turn-based fits the format). But not in initial design.

---

### Art Style

**Pixel Art**

- Prototype already exists in this style
- Retro aesthetic fits the genre (FTL, Into the Breach precedent)
- Scalable for different screen sizes
- Charming, readable, achievable scope

**Palette Direction:**
- Dark background (space)
- Vibrant planets and UI elements
- Glowing effects for relics and cosmic events
- Color-coding for planet types and threat levels

**Key Visual Elements:**
- Galaxy map with node connections
- Planet icons showing type/status
- Event notifications (subtle when brewing, urgent when firing)
- Entropy meter (visual escalation)
- Species portrait (evolves with traits)

---

## Summary

**AXIOM ASCENDANT** is a turn-based strategy game about guiding a young species through a dangerous galaxy. You expand, discover, and evolve - but every action has consequences you can't fully see. Events brew beneath the surface. Relics offer power at a price. And somewhere out there, ancient forces are watching.

The galaxy is not what it seems. Neither is your species, by the end.
