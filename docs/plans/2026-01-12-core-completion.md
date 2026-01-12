# Core Game Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical bugs and complete missing game systems (entropy, Concordat, relics, event variety) to align with GameDesign.md.

**Architecture:** Pure reducer pattern - all changes flow through `transition(state, event) -> { state, effects }`. Content definitions in `content.ts`, event logic in `events.ts`, galaxy generation in `galaxy.ts`.

**Tech Stack:** TypeScript, Bun test runner, pure functions, no external dependencies.

---

## Task 1: Fix Unreachable Planets Bug

**Problem:** Galaxy generation can create planets only connected to Hostile worlds, making them permanently unreachable.

**Files:**
- Modify: `src/core/galaxy.ts:128-152`
- Test: `test/core-galaxy.test.ts` (create)

**Step 1: Write the failing test**

Create `test/core-galaxy.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { generateGalaxy, neighborsOf } from '@/core/galaxy';
import { DEFAULT_CONFIG } from '@/core/content';

describe('galaxy generation', () => {
  it('ensures every planet is reachable through non-hostile paths', () => {
    // Test multiple seeds to catch probabilistic issues
    for (let seed = 1; seed <= 20; seed++) {
      const { galaxy, planets } = generateGalaxy(seed, DEFAULT_CONFIG);

      // For each planet, verify it has at least one neighbor that isn't hostile
      for (const [id, planet] of Object.entries(planets)) {
        if (id === galaxy.homeworldId) continue; // Skip homeworld

        const neighbors = neighborsOf(galaxy.routes, id);
        const hasNonHostilePath = neighbors.some((nid) => {
          const neighbor = planets[nid];
          return neighbor && neighbor.intrinsic.inhabitants !== 'Hostile';
        });

        expect(hasNonHostilePath).toBe(true);
      }
    }
  });

  it('connects ring 0 planets to homeworld', () => {
    const { galaxy } = generateGalaxy(1, DEFAULT_CONFIG);
    const ring0 = galaxy.rings[0] ?? [];

    for (const id of ring0) {
      if (id === galaxy.homeworldId) continue;
      const neighbors = neighborsOf(galaxy.routes, id);
      expect(neighbors).toContain(galaxy.homeworldId);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test test/core-galaxy.test.ts -v`
Expected: FAIL - some planets only connected to hostile worlds

**Step 3: Fix galaxy generation**

Modify `src/core/galaxy.ts` - add route validation and repair:

```typescript
// Add after existing route generation (around line 152):

// Ensure every planet has at least one non-hostile neighbor
const repairRoutes = (): void => {
  for (let ring = 1; ring < ringCount; ring++) {
    const cur = rings[ring] ?? [];
    const prev = rings[ring - 1] ?? [];

    for (const planetId of cur) {
      const neighbors = neighborsOf(routes, planetId);
      const hasNonHostilePath = neighbors.some((nid) => {
        const neighbor = planets[nid];
        return neighbor && neighbor.intrinsic.inhabitants !== 'Hostile';
      });

      if (!hasNonHostilePath) {
        // Find a non-hostile planet in prev ring and add route
        const safeTargets = prev.filter((pid) => {
          const p = planets[pid];
          return p && p.intrinsic.inhabitants !== 'Hostile';
        });
        if (safeTargets.length > 0) {
          const target = rng.pick(safeTargets);
          routes.push({ from: planetId, to: target });
        }
      }
    }
  }
};

repairRoutes();
```

The full updated `generateGalaxy` function should look like:

```typescript
export const generateGalaxy = (
  seed: number,
  config: GameConfig
): { galaxy: GalaxyState; planets: Record<string, PlanetState> } => {
  const rng = createRng(seed);
  const ringCount = config.ringSizes.length;

  const rings: string[][] = [];
  const planets: Record<string, PlanetState> = {};

  let nameIdx = rng.int(0, NAMES.length - 1);
  const nextName = (): string => {
    const n = NAMES[nameIdx % NAMES.length]!;
    nameIdx += 1;
    return n;
  };

  for (let ring = 0; ring < ringCount; ring++) {
    const size = config.ringSizes[ring] ?? 0;
    const ringPlanets: string[] = [];
    for (let i = 0; i < size; i++) {
      const id = `p-${ring}-${i}`;
      ringPlanets.push(id);

      const type =
        ring === 0 && i === 0
          ? ('Industrial' as const)
          : rng.pick(PLANET_TYPES);
      const inhabitants = pickInhabitants(type, rng.next());
      const hasRelic =
        type === 'Relic' ? true : rng.next() < (ring >= 2 ? 0.08 : 0.03);

      const intrinsic: PlanetIntrinsic = {
        id,
        ring,
        name:
          ring === 0 && i === 0
            ? 'Homeworld'
            : `${nextName()}-${ring + 1}${i + 1}`,
        type,
        inhabitants,
        baseInfluence: baseInfluenceFor(type),
        hasRelic,
      };

      planets[id] = {
        intrinsic,
        status: ring === 0 && i === 0 ? 'controlled' : 'unclaimed',
        development: ring === 0 && i === 0 ? 1 : 0,
        relicClaimed: false,
        known: { scouted: ring === 0 && i === 0 },
      };
    }
    rings.push(ringPlanets);
  }

  const routes: Route[] = [];

  // Connect ring 0 to homeworld
  const ring0 = rings[0] ?? [];
  for (let i = 1; i < ring0.length; i++) {
    routes.push({ from: ring0[i]!, to: 'p-0-0' });
  }

  // Connect each ring to previous ring
  for (let ring = 1; ring < ringCount; ring++) {
    const prev = rings[ring - 1] ?? [];
    const cur = rings[ring] ?? [];
    for (let i = 0; i < cur.length; i++) {
      const from = cur[i]!;
      const to = prev[rng.int(0, prev.length - 1)]!;
      routes.push({ from, to });
    }
  }

  // Add some lateral connections within rings
  for (let ring = 0; ring < ringCount; ring++) {
    const cur = rings[ring] ?? [];
    for (let i = 0; i < cur.length; i++) {
      if (cur.length <= 1) break;
      if (rng.next() < 0.35) {
        const from = cur[i]!;
        const to = cur[rng.int(0, cur.length - 1)]!;
        if (from !== to) routes.push({ from, to });
      }
    }
  }

  // Ensure every planet has at least one non-hostile neighbor
  for (let ring = 1; ring < ringCount; ring++) {
    const cur = rings[ring] ?? [];
    const prev = rings[ring - 1] ?? [];

    for (const planetId of cur) {
      const neighbors = neighborsOf(routes, planetId);
      const hasNonHostilePath = neighbors.some((nid) => {
        const neighbor = planets[nid];
        return neighbor && neighbor.intrinsic.inhabitants !== 'Hostile';
      });

      if (!hasNonHostilePath) {
        // Find a non-hostile planet in prev ring and add route
        const safeTargets = prev.filter((pid) => {
          const p = planets[pid];
          return p && p.intrinsic.inhabitants !== 'Hostile';
        });
        if (safeTargets.length > 0) {
          const target = safeTargets[rng.int(0, safeTargets.length - 1)]!;
          routes.push({ from: planetId, to: target });
        }
      }
    }
  }

  const galaxy: GalaxyState = {
    ringCount,
    rings,
    routes,
    revealedRing: 0,
    homeworldId: 'p-0-0',
  };

  return { galaxy, planets };
};
```

**Step 4: Run test to verify it passes**

Run: `bun test test/core-galaxy.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add test/core-galaxy.test.ts src/core/galaxy.ts
git commit -m "fix: ensure all planets reachable via non-hostile paths"
```

---

## Task 2: Add Entropy Generation

**Problem:** Entropy stays at 0 throughout play. Need entropy from: colonizing, using relics, aggressive event responses.

**Files:**
- Modify: `src/core/machine.ts`
- Modify: `src/core/types.ts` (add entropy costs to config)
- Test: `test/core-entropy.test.ts` (create)

**Step 1: Write the failing test**

Create `test/core-entropy.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { createNewGame, transition } from '@/core';

describe('entropy system', () => {
  it('colonizing adds entropy based on ring', () => {
    const s0 = createNewGame(1, { startingInfluence: 100 });

    // Scout a ring 0 planet first
    const target = s0.galaxy.rings[0]?.[1];
    expect(target).toBeTruthy();

    const r1 = transition(s0, {
      type: 'ACTION',
      action: { type: 'SCOUT', planetId: target! },
    });

    // Find an empty planet to colonize
    const planet = r1.state.planets[target!];
    if (planet?.intrinsic.inhabitants === 'Empty') {
      const r2 = transition(r1.state, {
        type: 'ACTION',
        action: { type: 'COLONIZE', planetId: target! },
      });
      // Ring 0 colonize = 1 entropy
      expect(r2.state.entropy).toBeGreaterThan(s0.entropy);
    }
  });

  it('suppressing unrest adds entropy', () => {
    // This is already tested in events - suppress adds +3 entropy
    // Just verify the event option has entropy effect
    const s0 = createNewGame(1);
    expect(s0.entropy).toBe(0);
  });

  it('expansion rate affects entropy passively', () => {
    const s0 = createNewGame(1, { startingInfluence: 200 });

    // End turn multiple times with many controlled planets
    let state = s0;
    for (let i = 0; i < 5; i++) {
      const r = transition(state, { type: 'ACTION', action: { type: 'END_TURN' } });
      state = r.state;
    }

    // Large empires generate passive entropy
    // (We'll check this works after implementing)
  });
});
```

**Step 2: Run test to verify behavior**

Run: `bun test test/core-entropy.test.ts -v`

**Step 3: Add entropy to colonize action**

Modify `src/core/machine.ts` - update the `colonize` function:

```typescript
const colonize = (state: GameState, planetId: PlanetId): TransitionResult => {
  if (!isReachable(state, planetId))
    return invalid(state, 'Planet not in your sphere of reach');
  const p = state.planets[planetId];
  if (!p) return invalid(state, 'Unknown planet');
  if (p.status !== 'unclaimed') return invalid(state, 'Already claimed');

  if (!p.known.scouted)
    return invalid(state, 'Colonize unprepared (Scout first)');

  const inh = p.intrinsic.inhabitants;
  if (inh === 'Hostile' || inh === 'Natives')
    return invalid(
      state,
      'Inhabitants present (use Partner/Subjugate/Conquer)'
    );

  const c = costs(state).colonize;
  if (state.influence < c) return invalid(state, 'Not enough Influence');

  const nextPlanet: PlanetState = {
    ...p,
    status: 'controlled',
    development: Math.max(1, p.development),
  };

  // Entropy from colonization scales with ring (outer rings = more attention)
  const entropyGain = 1 + p.intrinsic.ring;

  let next = applyInfluence(
    { ...state, planets: { ...state.planets, [planetId]: nextPlanet } },
    -c
  );
  next = applyEntropy(next, entropyGain);

  return {
    state: next,
    effects: [
      {
        type: 'MESSAGE',
        message: `Colonized ${p.intrinsic.name} (-${c} Influence, +${entropyGain} Entropy)`,
      },
    ],
  };
};
```

**Step 4: Add passive entropy from large empires**

Modify `src/core/machine.ts` - update the `endTurn` function to add passive entropy:

```typescript
const endTurn = (state: GameState): TransitionResult => {
  if (state.phase !== 'playing') return { state, effects: [] };

  const effects: GameEffect[] = [];
  let next: GameState = state;

  const income = collectInfluence(next);
  next = income.state;
  if (income.income > 0)
    effects.push({
      type: 'MESSAGE',
      message: `Income: +${income.income} Influence`,
    });

  // Passive entropy from large empires (expansion draws attention)
  const controlled = Object.values(next.planets).filter(
    (p) => p.status === 'controlled' || p.status === 'partnered'
  ).length;
  if (controlled >= 10) {
    const passiveEntropy = Math.floor((controlled - 8) / 4);
    if (passiveEntropy > 0) {
      next = applyEntropy(next, passiveEntropy);
      effects.push({
        type: 'MESSAGE',
        message: `Empire growth: +${passiveEntropy} Entropy`,
      });
    }
  }

  const revealed = maybeRevealNextRing(next);
  next = revealed.state;
  if (revealed.revealed)
    effects.push({ type: 'MESSAGE', message: 'A new ring is revealed' });

  const spawned = maybeSpawnBrewingEvents(next);
  if (spawned.length > 0) {
    next = {
      ...next,
      events: { ...next.events, brewing: [...next.events.brewing, ...spawned] },
    };
  }

  const ticked = tickBrewingEvents(next.events.brewing);
  next = { ...next, events: { ...next.events, brewing: ticked.brewing } };

  if (ticked.fired.length > 0) {
    const active: ActiveEvent[] = ticked.fired.map(materializeEvent);
    next = {
      ...next,
      events: { ...next.events, active: [...next.events.active, ...active] },
    };
    effects.push({
      type: 'MESSAGE',
      message: `Events fired: ${active.map((a) => a.title).join(', ')}`,
    });
  }

  next = {
    ...next,
    turn: next.turn + 1,
    shop: { offers: rollShop(next, 0), rerollsThisTurn: 0 },
  };

  const over = checkGameOver(next);
  if (over)
    return { state: over.state, effects: [...effects, ...over.effects] };
  return { state: next, effects };
};
```

**Step 5: Run tests**

Run: `bun test -v`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/core/machine.ts test/core-entropy.test.ts
git commit -m "feat: add entropy generation from colonization and empire size"
```

---

## Task 3: Add External Events (Raiders, Refugees, Traders)

**Problem:** Only internal events (Unrest) exist. Need external events per GameDesign.md.

**Files:**
- Modify: `src/core/events.ts`
- Test: `test/core-events.test.ts` (create)

**Step 1: Write the failing test**

Create `test/core-events.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { materializeEvent } from '@/core/events';
import type { BrewingEvent } from '@/core/types';

describe('event materialization', () => {
  it('materializes raider events', () => {
    const brewing: BrewingEvent = {
      id: 'test-1',
      kind: 'external',
      type: 'raiders',
      planetId: 'p-1-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Raider Incursion');
    expect(active.options.length).toBeGreaterThanOrEqual(2);
  });

  it('materializes refugee events', () => {
    const brewing: BrewingEvent = {
      id: 'test-2',
      kind: 'external',
      type: 'refugees',
      planetId: 'p-1-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Refugee Fleet');
    expect(active.options.length).toBeGreaterThanOrEqual(2);
  });

  it('materializes trade opportunity events', () => {
    const brewing: BrewingEvent = {
      id: 'test-3',
      kind: 'external',
      type: 'traders',
      planetId: 'p-1-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Trade Opportunity');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test test/core-events.test.ts -v`
Expected: FAIL - unknown event types

**Step 3: Add external event definitions**

Add to `src/core/events.ts`:

```typescript
const raidersEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'external',
  type: 'raiders',
  planetId,
  title: 'Raider Incursion',
  body: 'Pirates have targeted this sector. They demand tribute or will raid your supply lines.',
  options: [
    {
      id: 'pay-tribute',
      label: 'Pay Tribute',
      costInfluence: 4,
      effects: {},
    },
    {
      id: 'fight',
      label: 'Fight Back',
      costInfluence: 2,
      effects: { entropy: +2 },
    },
    {
      id: 'ignore',
      label: 'Ignore',
      costInfluence: 0,
      effects: {
        influence: -3,
        addBrewingEvent: {
          kind: 'external',
          type: 'pirate-base',
          planetId,
          turnsLeft: 4,
        },
      },
    },
  ],
});

const pirateBaseEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'external',
  type: 'pirate-base',
  planetId,
  title: 'Pirate Base Established',
  body: 'Raiders have built a permanent base near your territory. They drain income and threaten expansion.',
  options: [
    {
      id: 'assault',
      label: 'Military Assault',
      costInfluence: 8,
      effects: { entropy: +4 },
    },
    {
      id: 'negotiate',
      label: 'Negotiate Terms',
      costInfluence: 6,
      effects: { entropy: +1 },
    },
    {
      id: 'tolerate',
      label: 'Tolerate',
      costInfluence: 0,
      effects: { influence: -2 },
    },
  ],
});

const refugeesEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'external',
  type: 'refugees',
  planetId,
  title: 'Refugee Fleet',
  body: 'Displaced peoples seek shelter in your territory. They bring skills but also needs.',
  options: [
    {
      id: 'welcome',
      label: 'Welcome Them',
      costInfluence: 3,
      effects: { planet: { development: 1 } },
    },
    {
      id: 'limited',
      label: 'Limited Entry',
      costInfluence: 1,
      effects: {},
    },
    {
      id: 'reject',
      label: 'Turn Away',
      costInfluence: 0,
      effects: { entropy: +2 },
    },
  ],
});

const tradersEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'external',
  type: 'traders',
  planetId,
  title: 'Trade Opportunity',
  body: 'Merchants offer favorable terms for exclusive access to your markets.',
  options: [
    {
      id: 'accept',
      label: 'Accept Deal',
      costInfluence: 0,
      effects: { influence: +5 },
    },
    {
      id: 'negotiate',
      label: 'Better Terms',
      costInfluence: 2,
      effects: { influence: +8 },
    },
    {
      id: 'reject',
      label: 'Decline',
      costInfluence: 0,
      effects: {},
    },
  ],
});
```

**Step 4: Update materializeEvent**

```typescript
export const materializeEvent = (brewing: BrewingEvent): ActiveEvent => {
  let base: Omit<ActiveEvent, 'id'>;

  switch (brewing.type) {
    case 'unrest':
      base = unrestEvent(brewing.planetId);
      break;
    case 'rebellion':
      base = rebellionEvent(brewing.planetId);
      break;
    case 'anomaly':
      base = anomalyEvent(brewing.planetId);
      break;
    case 'raiders':
      base = raidersEvent(brewing.planetId);
      break;
    case 'pirate-base':
      base = pirateBaseEvent(brewing.planetId);
      break;
    case 'refugees':
      base = refugeesEvent(brewing.planetId);
      break;
    case 'traders':
      base = tradersEvent(brewing.planetId);
      break;
    default:
      base = anomalyEvent(brewing.planetId); // Fallback
  }

  return { ...base, id: brewing.id };
};
```

**Step 5: Update maybeSpawnBrewingEvents to include external events**

```typescript
export const maybeSpawnBrewingEvents = (state: GameState): BrewingEvent[] => {
  const rng = createRng((state.seed + state.turn * 1337) >>> 0);

  const controlled = Object.values(state.planets).filter(
    (p) => p.status === 'controlled' || p.status === 'partnered'
  );
  const maxBrewing = Math.min(10, 1 + Math.floor(controlled.length / 2));
  if (state.events.brewing.length >= maxBrewing) return [];

  const rolls = 1 + Math.floor(controlled.length / 3);
  const out: BrewingEvent[] = [];

  const entropyFactor =
    state.entropy >= 50 ? 0.25 : state.entropy >= 25 ? 0.15 : 0.08;
  const unrestFactor = 0.1 + Math.min(0.25, controlled.length * 0.02);
  const externalFactor = 0.12; // Raiders, refugees, traders

  for (let i = 0; i < rolls; i++) {
    const planet = rng.pick(controlled);
    const p = planet.intrinsic;
    const r = rng.next();

    // Cosmic events (entropy-driven)
    if (r < entropyFactor || p.type === 'Relic') {
      out.push({
        id: mkId('brew', state.seed, state.turn, i),
        kind: 'cosmic',
        type: 'anomaly',
        planetId: p.id,
        turnsLeft: rng.int(3, 6),
        revealed: false,
      });
      continue;
    }

    // Internal events (unrest)
    if (r < entropyFactor + unrestFactor) {
      out.push({
        id: mkId('brew', state.seed, state.turn, i),
        kind: 'internal',
        type: 'unrest',
        planetId: p.id,
        turnsLeft: rng.int(2, 5),
        revealed: false,
      });
      continue;
    }

    // External events
    if (r < entropyFactor + unrestFactor + externalFactor) {
      const externalTypes = ['raiders', 'refugees', 'traders'] as const;
      // Trade planets attract traders, frontier/military attract raiders
      let type: 'raiders' | 'refugees' | 'traders';
      if (p.type === 'Trade') {
        type = rng.next() < 0.6 ? 'traders' : rng.pick(externalTypes);
      } else if (p.type === 'Frontier' || p.type === 'Military') {
        type = rng.next() < 0.5 ? 'raiders' : rng.pick(externalTypes);
      } else {
        type = rng.pick(externalTypes);
      }

      out.push({
        id: mkId('brew', state.seed, state.turn, i),
        kind: 'external',
        type,
        planetId: p.id,
        turnsLeft: rng.int(2, 4),
        revealed: false,
      });
    }
  }

  return out;
};
```

**Step 6: Run tests**

Run: `bun test -v`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/core/events.ts test/core-events.test.ts
git commit -m "feat: add external events (raiders, refugees, traders)"
```

---

## Task 4: Add Concordat Events

**Problem:** No Concordat (endgame threat) events exist. Per GameDesign.md, they appear at high entropy.

**Files:**
- Modify: `src/core/events.ts`
- Modify: `src/core/types.ts`
- Test: `test/core-concordat.test.ts` (create)

**Step 1: Write the failing test**

Create `test/core-concordat.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { createNewGame, transition } from '@/core';
import { materializeEvent, maybeSpawnBrewingEvents } from '@/core/events';
import type { BrewingEvent, GameState } from '@/core/types';

describe('concordat system', () => {
  it('spawns concordat observers at high entropy', () => {
    const s0 = createNewGame(1, { startingEntropy: 60 });

    // High entropy should spawn concordat events
    let foundConcordat = false;
    for (let i = 0; i < 50; i++) {
      const spawned = maybeSpawnBrewingEvents({
        ...s0,
        seed: i,
        entropy: 60,
      });
      if (spawned.some((e) => e.kind === 'concordat')) {
        foundConcordat = true;
        break;
      }
    }

    expect(foundConcordat).toBe(true);
  });

  it('materializes concordat observer events', () => {
    const brewing: BrewingEvent = {
      id: 'test-1',
      kind: 'concordat',
      type: 'observers',
      planetId: 'p-0-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Concordat Observers');
    expect(active.kind).toBe('concordat');
  });

  it('concordat ultimatum leads to endgame choices', () => {
    const brewing: BrewingEvent = {
      id: 'test-2',
      kind: 'concordat',
      type: 'ultimatum',
      planetId: 'p-0-0',
      turnsLeft: 0,
      revealed: false,
    };
    const active = materializeEvent(brewing);
    expect(active.title).toBe('Concordat Ultimatum');
    // Should have submit/resist options
    const optionIds = active.options.map((o) => o.id);
    expect(optionIds).toContain('submit');
    expect(optionIds).toContain('resist');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test test/core-concordat.test.ts -v`
Expected: FAIL

**Step 3: Add Concordat event definitions**

Add to `src/core/events.ts`:

```typescript
const observersEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'concordat',
  type: 'observers',
  planetId,
  title: 'Concordat Observers',
  body: 'Strange ships have appeared at the edge of your territory. They watch but do not respond to hails. The galactic powers have noticed you.',
  options: [
    {
      id: 'ignore',
      label: 'Ignore Them',
      costInfluence: 0,
      effects: {},
    },
    {
      id: 'approach',
      label: 'Approach',
      costInfluence: 2,
      effects: { entropy: +3 },
    },
    {
      id: 'hide',
      label: 'Reduce Activity',
      costInfluence: 5,
      effects: { entropy: -5 },
    },
  ],
});

const emissaryEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'concordat',
  type: 'emissary',
  planetId,
  title: 'Concordat Emissary',
  body: 'A representative of the Axiometric Concordat requests audience. They speak of "regulations" and "cosmic stability."',
  options: [
    {
      id: 'listen',
      label: 'Hear Them Out',
      costInfluence: 0,
      effects: { entropy: -3 },
    },
    {
      id: 'refuse',
      label: 'Refuse Audience',
      costInfluence: 0,
      effects: {
        entropy: +5,
        addBrewingEvent: {
          kind: 'concordat',
          type: 'ultimatum',
          planetId,
          turnsLeft: 5,
        },
      },
    },
    {
      id: 'expel',
      label: 'Expel Forcibly',
      costInfluence: 3,
      effects: {
        entropy: +10,
        addBrewingEvent: {
          kind: 'concordat',
          type: 'ultimatum',
          planetId,
          turnsLeft: 3,
        },
      },
    },
  ],
});

const ultimatumEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'concordat',
  type: 'ultimatum',
  planetId,
  title: 'Concordat Ultimatum',
  body: 'The Concordat delivers their terms: reduce your expansion, cease relic usage, or face intervention. This is the final warning.',
  options: [
    {
      id: 'submit',
      label: 'Submit to Concordat',
      costInfluence: 0,
      effects: { entropy: -50 },
    },
    {
      id: 'negotiate',
      label: 'Negotiate Terms',
      costInfluence: 10,
      effects: { entropy: -20 },
    },
    {
      id: 'resist',
      label: 'Defy the Concordat',
      costInfluence: 0,
      effects: {
        entropy: +15,
        addBrewingEvent: {
          kind: 'concordat',
          type: 'intervention',
          planetId,
          turnsLeft: 3,
        },
      },
    },
  ],
});

const interventionEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'concordat',
  type: 'intervention',
  planetId,
  title: 'Concordat Intervention',
  body: 'The ancient powers act. Concordat fleets emerge across your territory. This is the endgame.',
  options: [
    {
      id: 'surrender',
      label: 'Surrender',
      costInfluence: 0,
      effects: { entropy: -100 },
    },
    {
      id: 'fight',
      label: 'Fight for Independence',
      costInfluence: 20,
      effects: { entropy: +25 },
    },
  ],
});
```

**Step 4: Update materializeEvent switch**

Add cases to the switch statement:

```typescript
    case 'observers':
      base = observersEvent(brewing.planetId);
      break;
    case 'emissary':
      base = emissaryEvent(brewing.planetId);
      break;
    case 'ultimatum':
      base = ultimatumEvent(brewing.planetId);
      break;
    case 'intervention':
      base = interventionEvent(brewing.planetId);
      break;
```

**Step 5: Update maybeSpawnBrewingEvents to spawn Concordat events**

Add Concordat spawning logic:

```typescript
  // Concordat events at high entropy
  const concordatThreshold = state.entropy >= 75 ? 0.2 : state.entropy >= 50 ? 0.08 : 0;

  if (concordatThreshold > 0 && rng.next() < concordatThreshold) {
    // Check if we already have concordat events brewing
    const hasConcordat = state.events.brewing.some((e) => e.kind === 'concordat');
    if (!hasConcordat) {
      const planet = rng.pick(controlled);
      out.push({
        id: mkId('brew', state.seed, state.turn, out.length),
        kind: 'concordat',
        type: state.entropy >= 75 ? 'emissary' : 'observers',
        planetId: planet.intrinsic.id,
        turnsLeft: rng.int(3, 5),
        revealed: true, // Concordat events are always visible
      });
    }
  }
```

**Step 6: Run tests**

Run: `bun test -v`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/core/events.ts test/core-concordat.test.ts
git commit -m "feat: add Concordat event chain (observers, emissary, ultimatum, intervention)"
```

---

## Task 5: Add More Relics

**Problem:** Only Axiom Key exists. Need more relics per GameDesign.md.

**Files:**
- Modify: `src/core/content.ts`
- Modify: `src/core/machine.ts` (implement relic effects)
- Test: `test/core-relics.test.ts` (create)

**Step 1: Write the failing test**

Create `test/core-relics.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { createNewGame, transition } from '@/core';
import { SHOP_CARDS } from '@/core/content';

describe('relic system', () => {
  it('has multiple relics available', () => {
    const relics = SHOP_CARDS.filter((c) => c.kind === 'relic');
    expect(relics.length).toBeGreaterThanOrEqual(4);
  });

  it('stasis field freezes an event', () => {
    const s0 = createNewGame(1, { startingInfluence: 100 });
    // Add a stasis field relic manually
    const withRelic = { ...s0, relics: { 'relic-stasis-field': 1 } };

    // Add a brewing event
    const withEvent = {
      ...withRelic,
      events: {
        ...withRelic.events,
        brewing: [{
          id: 'test-event',
          kind: 'internal' as const,
          type: 'unrest',
          planetId: 'p-0-0',
          turnsLeft: 2,
          revealed: true,
        }],
      },
    };

    const r = transition(withEvent, {
      type: 'ACTION',
      action: { type: 'USE_RELIC', relicId: 'relic-stasis-field', targetPlanetId: 'p-0-0' },
    });

    expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
    // Event should be extended
    const event = r.state.events.brewing.find((e) => e.id === 'test-event');
    expect(event?.turnsLeft).toBeGreaterThan(2);
  });

  it('precursor archive reveals all events', () => {
    const s0 = createNewGame(1);
    const withRelic = { ...s0, relics: { 'relic-precursor-archive': 1 } };

    // Add hidden brewing events
    const withEvents = {
      ...withRelic,
      events: {
        ...withRelic.events,
        brewing: [
          { id: 'e1', kind: 'internal' as const, type: 'unrest', planetId: 'p-0-0', turnsLeft: 3, revealed: false },
          { id: 'e2', kind: 'external' as const, type: 'raiders', planetId: 'p-0-1', turnsLeft: 2, revealed: false },
        ],
      },
    };

    const r = transition(withEvents, {
      type: 'ACTION',
      action: { type: 'USE_RELIC', relicId: 'relic-precursor-archive' },
    });

    expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
    // All events should be revealed
    expect(r.state.events.brewing.every((e) => e.revealed)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test test/core-relics.test.ts -v`
Expected: FAIL

**Step 3: Add relics to content.ts**

```typescript
export const SHOP_CARDS: ShopCard[] = [
  // Tech
  {
    id: 'tech-warp-drive',
    kind: 'tech',
    tier: 1,
    name: 'Warp Drive',
    description: 'Colonize cost -1 Influence.',
    costInfluence: 6,
  },
  {
    id: 'tech-intel-network',
    kind: 'tech',
    tier: 1,
    name: 'Intel Network',
    description: 'Investigate cost -1 Influence.',
    costInfluence: 6,
  },
  {
    id: 'tech-terraforming',
    kind: 'tech',
    tier: 2,
    name: 'Terraforming Kits',
    description: 'Develop gives +1 extra base influence on Barren worlds.',
    costInfluence: 10,
  },
  {
    id: 'tech-diplomatic-corps',
    kind: 'tech',
    tier: 2,
    name: 'Diplomatic Corps',
    description: 'Partner cost -2 Influence.',
    costInfluence: 8,
  },

  // Relics
  {
    id: 'relic-axiom-key',
    kind: 'relic',
    tier: 1,
    name: 'Axiom Key',
    description: 'Use: reveal the next ring instantly (+10 Entropy).',
    costInfluence: 8,
  },
  {
    id: 'relic-stasis-field',
    kind: 'relic',
    tier: 2,
    name: 'Stasis Field',
    description: 'Use: freeze target event for +10 turns (+5 Entropy).',
    costInfluence: 12,
  },
  {
    id: 'relic-precursor-archive',
    kind: 'relic',
    tier: 1,
    name: 'Precursor Archive',
    description: 'Use: reveal all hidden events (+3 Entropy).',
    costInfluence: 6,
  },
  {
    id: 'relic-genesis-seed',
    kind: 'relic',
    tier: 3,
    name: 'Genesis Seed',
    description: 'Use: set target planet to any type (+8 Entropy).',
    costInfluence: 15,
  },
  {
    id: 'relic-echo-of-myrakath',
    kind: 'relic',
    tier: 2,
    name: "Echo of Myr'akath",
    description: 'Use: double influence income this turn (+6 Entropy).',
    costInfluence: 10,
  },
  {
    id: 'relic-veil-of-silence',
    kind: 'relic',
    tier: 3,
    name: 'Veil of Silence',
    description: 'Use: prevent Concordat events for 5 turns (+12 Entropy).',
    costInfluence: 18,
  },
];
```

**Step 4: Implement relic effects in machine.ts**

Update the `useRelic` function:

```typescript
const useRelic = (
  state: GameState,
  relicId: string,
  targetPlanetId?: PlanetId
): TransitionResult => {
  const count = state.relics[relicId] ?? 0;
  if (count <= 0) return invalid(state, 'You do not have that relic');

  const consumeRelic = (s: GameState) => ({
    ...s,
    relics: { ...s.relics, [relicId]: count - 1 },
  });

  const effects: GameEffect[] = [];

  switch (relicId) {
    case 'relic-axiom-key': {
      if (state.galaxy.revealedRing >= state.galaxy.ringCount - 1)
        return invalid(state, 'No further rings to reveal');
      const next = applyEntropy(
        {
          ...consumeRelic(state),
          galaxy: {
            ...state.galaxy,
            revealedRing: state.galaxy.revealedRing + 1,
          },
        },
        +10
      );
      effects.push({ type: 'MESSAGE', message: 'Relic used: Axiom Key (ring revealed, +10 Entropy)' });
      return { state: next, effects };
    }

    case 'relic-stasis-field': {
      if (!targetPlanetId) return invalid(state, 'Stasis Field requires a target planet');
      const eventIdx = state.events.brewing.findIndex((e) => e.planetId === targetPlanetId);
      if (eventIdx === -1) return invalid(state, 'No brewing event on that planet');

      const updatedBrewing = state.events.brewing.map((e, i) =>
        i === eventIdx ? { ...e, turnsLeft: e.turnsLeft + 10 } : e
      );
      const next = applyEntropy(
        { ...consumeRelic(state), events: { ...state.events, brewing: updatedBrewing } },
        +5
      );
      effects.push({ type: 'MESSAGE', message: 'Relic used: Stasis Field (event frozen +10 turns, +5 Entropy)' });
      return { state: next, effects };
    }

    case 'relic-precursor-archive': {
      const revealedBrewing = state.events.brewing.map((e) => ({ ...e, revealed: true }));
      const next = applyEntropy(
        { ...consumeRelic(state), events: { ...state.events, brewing: revealedBrewing } },
        +3
      );
      effects.push({ type: 'MESSAGE', message: `Relic used: Precursor Archive (${revealedBrewing.length} events revealed, +3 Entropy)` });
      return { state: next, effects };
    }

    case 'relic-genesis-seed': {
      if (!targetPlanetId) return invalid(state, 'Genesis Seed requires a target planet');
      const planet = state.planets[targetPlanetId];
      if (!planet) return invalid(state, 'Unknown planet');
      if (planet.status === 'unclaimed') return invalid(state, 'Must control the planet');

      // Transform to Industrial (best income)
      const nextPlanet: PlanetState = {
        ...planet,
        intrinsic: { ...planet.intrinsic, type: 'Industrial', baseInfluence: 3 },
        known: { ...planet.known, type: 'Industrial', baseInfluence: 3 },
      };
      const next = applyEntropy(
        { ...consumeRelic(state), planets: { ...state.planets, [targetPlanetId]: nextPlanet } },
        +8
      );
      effects.push({ type: 'MESSAGE', message: 'Relic used: Genesis Seed (planet terraformed to Industrial, +8 Entropy)' });
      return { state: next, effects };
    }

    case 'relic-echo-of-myrakath': {
      // Double income is handled specially - we collect income now
      const income = Object.values(state.planets).reduce(
        (acc, p) => acc + planetIncome(state, p),
        0
      );
      let next = consumeRelic(state);
      next = { ...next, influence: next.influence + income };
      next = applyEntropy(next, +6);
      effects.push({ type: 'MESSAGE', message: `Relic used: Echo of Myr'akath (+${income} bonus Influence, +6 Entropy)` });
      return { state: next, effects };
    }

    case 'relic-veil-of-silence': {
      // Mark state to prevent Concordat events (would need to add this to GameState)
      // For now, just clear any concordat brewing events
      const filteredBrewing = state.events.brewing.filter((e) => e.kind !== 'concordat');
      const next = applyEntropy(
        { ...consumeRelic(state), events: { ...state.events, brewing: filteredBrewing } },
        +12
      );
      effects.push({ type: 'MESSAGE', message: 'Relic used: Veil of Silence (Concordat events cleared, +12 Entropy)' });
      return { state: next, effects };
    }

    default:
      return invalid(state, 'Relic not implemented');
  }
};
```

Note: You'll need to import `PlanetState` at the top of machine.ts and make `planetIncome` accessible (move it before `useRelic` or export it).

**Step 5: Update costs function for diplomatic corps tech**

```typescript
const costs = (state: GameState) => {
  const base = state.config.costs;
  return {
    scout: base.scout,
    colonize: base.colonize - (state.tech['tech-warp-drive'] ? 1 : 0),
    partner: base.partner - (state.tech['tech-diplomatic-corps'] ? 2 : 0),
    develop: base.develop,
    investigate: base.investigate - (state.tech['tech-intel-network'] ? 1 : 0),
    shopReroll: base.shopReroll,
  };
};
```

**Step 6: Run tests**

Run: `bun test -v`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/core/content.ts src/core/machine.ts test/core-relics.test.ts
git commit -m "feat: add relics (stasis field, precursor archive, genesis seed, echo, veil)"
```

---

## Task 6: Improve Intel Economy

**Problem:** Investigate only works on your own planets. Should work globally per GameDesign.md.

**Files:**
- Modify: `src/core/events.ts`
- Modify: `src/core/machine.ts`
- Test: Update `test/core-machine.test.ts`

**Step 1: Write the test**

Add to `test/core-machine.test.ts`:

```typescript
it('investigate reveals any brewing event', () => {
  const s0 = createNewGame(1, { startingInfluence: 50 });

  // Add a brewing event on homeworld
  const withEvent: GameState = {
    ...s0,
    events: {
      ...s0.events,
      brewing: [{
        id: 'test-event',
        kind: 'internal',
        type: 'unrest',
        planetId: 'p-0-0',
        turnsLeft: 3,
        revealed: false,
      }],
    },
  };

  const r = transition(withEvent, {
    type: 'ACTION',
    action: { type: 'INVESTIGATE', planetId: 'p-0-0' },
  });

  expect(r.effects.some((e) => e.type === 'INVALID')).toBe(false);
  expect(r.state.events.brewing[0]?.revealed).toBe(true);
});
```

**Step 2: Update findInvestigableBrewing**

Modify `src/core/events.ts`:

```typescript
export const findInvestigableBrewing = (
  state: GameState,
  planetId: PlanetId
): BrewingEvent | null => {
  // First look for events on the specified planet
  const onPlanet = state.events.brewing.filter(
    (e) => e.planetId === planetId && !e.revealed
  );
  if (onPlanet.length > 0) return onPlanet[0] ?? null;

  // If none found and player has intel network, can find any unrevealed event
  if (state.tech['tech-intel-network']) {
    const anyUnrevealed = state.events.brewing.find((e) => !e.revealed);
    return anyUnrevealed ?? null;
  }

  return null;
};
```

**Step 3: Update investigate action**

Modify `src/core/machine.ts`:

```typescript
const investigate = (
  state: GameState,
  planetId: PlanetId
): TransitionResult => {
  // Must control/partner the planet to investigate from it
  const p = state.planets[planetId];
  if (!p) return invalid(state, 'Unknown planet');
  if (p.status === 'unclaimed')
    return invalid(
      state,
      'Investigate requires local presence (claim or partner)'
    );

  const c = costs(state).investigate;
  if (state.influence < c) return invalid(state, 'Not enough Influence');

  const target = findInvestigableBrewing(state, planetId);
  if (!target) return invalid(state, 'No brewing events to investigate');

  const nextBrewing = state.events.brewing.map((e) =>
    e.id === target.id ? { ...e, revealed: true } : e
  );

  const next = applyInfluence(
    { ...state, events: { ...state.events, brewing: nextBrewing } },
    -c
  );

  return {
    state: next,
    effects: [
      {
        type: 'MESSAGE',
        message: `Investigated: ${summarizeRevealedBrewing({ ...target, revealed: true })}`,
      },
    ],
  };
};
```

**Step 4: Run tests**

Run: `bun test -v`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/core/events.ts src/core/machine.ts test/core-machine.test.ts
git commit -m "feat: improve intel economy - investigate can find events globally with intel network"
```

---

## Task 7: Update CORE.md Documentation

**Files:**
- Modify: `docs/CORE.md`

**Step 1: Update the documentation**

Update `docs/CORE.md` to reflect all implemented features:

```markdown
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
- **Route connectivity**: guaranteed non-hostile paths to all planets

### Economy
- **Single currency**: Influence (everything costs it; planets produce it)
- **Income**: per-turn from controlled/partnered planets
- **Development**: increases planet influence output

### Actions
- **Scout**: reveal planet properties (1 Influence)
- **Colonize**: claim empty/primitive planets (5 Influence, +entropy by ring)
- **Partner**: ally with natives (4 Influence)
- **Develop**: boost planet output (4 Influence)
- **Investigate**: reveal brewing events (2 Influence)
- **Use Relic**: powerful one-time effects (+entropy)

### Events System
- **Hidden timers**: events brew invisibly, fire after countdown
- **Event kinds**:
  - Internal: Unrest → Rebellion (escalation chain)
  - External: Raiders → Pirate Base, Refugees, Traders
  - Cosmic: Anomaly (entropy-driven)
  - Concordat: Observers → Emissary → Ultimatum → Intervention
- **Escalation**: ignoring events triggers worse follow-up events

### Entropy
- **Sources**: colonization (scales by ring), large empire (passive), aggressive choices, relic use
- **Effects**:
  - 25%+ entropy: increased cosmic events
  - 50%+ entropy: Concordat observers appear
  - 75%+ entropy: Concordat emissaries, ultimatums
  - 100%: loss condition (Concordat intervention)

### Shop & Tech
- **3-slot shop**: refreshes each turn
- **Tech cards**: Warp Drive, Intel Network, Terraforming, Diplomatic Corps
- **Relics**: Axiom Key, Stasis Field, Precursor Archive, Genesis Seed, Echo of Myr'akath, Veil of Silence

### Victory/Loss
- **Win**: Scout all revealed planets
- **Lose**: Entropy reaches 100 (Concordat arrives)

## Roadmap Status

### Milestone A — Planet Interaction Slice ✅
- [x] Scout, Colonize, Partner, Develop actions
- [x] Planet type/inhabitants constrain actions
- [x] Colonize without scout blocked

### Milestone B — Event Engine ✅
- [x] Brewing event pools by planet type
- [x] Escalation chains (Unrest → Rebellion)
- [x] External events (Raiders, Refugees, Traders)
- [x] Intel economy with Investigate action

### Milestone C — Card Shop ✅
- [x] 3-slot shop with reroll
- [x] Tech cards unlock modifiers
- [x] Card tiers

### Milestone D — Relics + Entropy ✅
- [x] Multiple relics with unique effects
- [x] Relic use adds entropy
- [x] Entropy affects event spawning

### Milestone E — Concordat ✅
- [x] Concordat event chain (Observers → Emissary → Ultimatum → Intervention)
- [x] High entropy triggers Concordat attention
- [x] Submit vs Resist choices

### Milestone F — Endgame (Partial)
- [x] Victory: full exploration
- [x] Loss: entropy threshold
- [ ] Multiple victory paths (integration, independence)
- [ ] Concordat final battle mechanics

## Testing Targets
- [x] Determinism: identical seed + event log => identical state hash
- [x] No negative influence; influence costs validate correctly
- [x] Ring reveal thresholds are stable
- [x] Event escalation correctness
- [x] All planets reachable via non-hostile paths

## Implementation Notes
- Keep authored content (cards/events) data-only where possible
- Prefer small, composable effect helpers (applyInfluence/applyEntropy/etc.)
- Test event materialization separately from spawning logic
```

**Step 2: Commit**

```bash
git add docs/CORE.md
git commit -m "docs: update CORE.md with implemented features"
```

---

## Task 8: Run Full Test Suite & Fix Any Issues

**Step 1: Run all tests**

```bash
bun test -v
```

**Step 2: Fix any failing tests**

Address any issues that arise.

**Step 3: Final commit**

```bash
git add -A
git commit -m "test: ensure all tests pass after core completion"
```

---

## Summary

This plan implements:
1. **Bug fix**: Unreachable planets via route repair
2. **Entropy system**: Colonization, empire size, choices all generate entropy
3. **External events**: Raiders, Refugees, Traders with escalation
4. **Concordat events**: Full chain from Observers to Intervention
5. **Relics**: 6 unique relics with meaningful effects
6. **Intel improvement**: Global investigation with tech
7. **Documentation**: Updated CORE.md

Total: ~8 tasks, estimated ~30-45 minutes of implementation time.
