import { DEFAULT_CONFIG } from './content';
import {
  findInvestigableBrewing,
  materializeEvent,
  maybeSpawnBrewingEvents,
  optionById,
  summarizeRevealedBrewing,
  tickBrewingEvents,
} from './events';
import { generateGalaxy, neighborsOf } from './galaxy';
import { rollShop } from './shop';
import type {
  ActiveEvent,
  GameConfig,
  GameEffect,
  GameEvent,
  GameState,
  PlanetId,
  PlanetState,
  PlayerAction,
  TransitionResult,
} from './types';

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const applyInfluence = (state: GameState, delta: number): GameState => ({
  ...state,
  influence: Math.max(0, state.influence + delta),
});

const applyEntropy = (state: GameState, delta: number): GameState => ({
  ...state,
  // Allow entropy to exceed max (for Concordat fight mechanic) but not go below 0
  entropy: Math.max(0, state.entropy + delta),
});

const isRevealed = (state: GameState, planetId: PlanetId): boolean => {
  const p = state.planets[planetId];
  if (!p) return false;
  return p.intrinsic.ring <= state.galaxy.revealedRing;
};

const isReachable = (state: GameState, planetId: PlanetId): boolean => {
  if (!isRevealed(state, planetId)) return false;
  if (planetId === state.galaxy.homeworldId) return true;

  const controlled = new Set(
    Object.values(state.planets)
      .filter((p) => p.status === 'controlled' || p.status === 'partnered')
      .map((p) => p.intrinsic.id)
  );

  for (const c of controlled) {
    const n = neighborsOf(state.galaxy.routes, c);
    if (n.includes(planetId)) return true;
  }
  return false;
};

const planetIncome = (state: GameState, planet: PlanetState): number => {
  const base = planet.intrinsic.baseInfluence;
  const dev = planet.development * state.config.income.developmentBonus;
  const raw = base + dev;
  if (planet.status === 'controlled') return raw;
  if (planet.status === 'partnered')
    return Math.floor(raw * state.config.income.partnerShare);
  return 0;
};

const collectInfluence = (
  state: GameState
): { state: GameState; income: number } => {
  const income = Object.values(state.planets).reduce(
    (acc, p) => acc + planetIncome(state, p),
    0
  );
  return { state: { ...state, influence: state.influence + income }, income };
};

const maybeRevealNextRing = (
  state: GameState
): { state: GameState; revealed: boolean } => {
  const current = state.galaxy.revealedRing;
  if (current >= state.galaxy.ringCount - 1) return { state, revealed: false };

  const ringPlanets = state.galaxy.rings[current] ?? [];
  const required = Math.max(
    1,
    Math.ceil(ringPlanets.length * state.config.revealThresholdPerRing)
  );
  const controlled = ringPlanets.filter((id) => {
    const p = state.planets[id];
    return p?.status === 'controlled' || p?.status === 'partnered';
  }).length;

  if (controlled < required) return { state, revealed: false };
  return {
    state: {
      ...state,
      galaxy: { ...state.galaxy, revealedRing: current + 1 },
    },
    revealed: true,
  };
};

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

export const createNewGame = (
  seed = 1,
  config?: Partial<GameConfig>
): GameState => {
  const merged: GameConfig = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  const { galaxy, planets } = generateGalaxy(seed, merged);

  const initial: GameState = {
    phase: 'playing',
    seed,
    turn: 1,
    config: merged,

    influence: merged.startingInfluence,
    entropy: merged.startingEntropy,

    galaxy,
    planets,
    selectedPlanetId: galaxy.homeworldId,

    events: { brewing: [], active: [] },
    shop: { offers: [], rerollsThisTurn: 0 },
    tech: {},
    relics: {},
  };

  return {
    ...initial,
    shop: { offers: rollShop(initial, 0), rerollsThisTurn: 0 },
  };
};

const invalid = (state: GameState, reason: string): TransitionResult => ({
  state,
  effects: [{ type: 'INVALID', reason }],
});

const checkGameOver = (state: GameState): TransitionResult | null => {
  if (state.phase !== 'playing') return null;

  // Loss only if entropy goes significantly over max (after fighting Concordat and losing)
  if (state.entropy > state.config.entropyMax + 20) {
    return {
      state: { ...state, phase: 'lost' },
      effects: [
        {
          type: 'GAME_OVER',
          outcome: 'lost',
          reason: 'The Concordat has overwhelmed your civilization',
        },
      ],
    };
  }

  const allScouted = Object.values(state.planets).every(
    (p) => p.known.scouted || p.intrinsic.ring > state.galaxy.revealedRing
  );
  if (state.galaxy.revealedRing === state.galaxy.ringCount - 1 && allScouted) {
    return {
      state: { ...state, phase: 'won' },
      effects: [
        {
          type: 'GAME_OVER',
          outcome: 'won',
          reason: 'All revealed worlds scouted',
        },
      ],
    };
  }

  return null;
};

// Force-spawn Concordat Intervention when entropy hits threshold
const maybeSpawnConcordatIntervention = (
  state: GameState
): { state: GameState; spawned: boolean } => {
  if (state.entropy < state.config.entropyMax) return { state, spawned: false };

  // Check if intervention is already active or brewing
  const hasIntervention =
    state.events.active.some((e) => e.type === 'intervention') ||
    state.events.brewing.some((e) => e.type === 'intervention');
  if (hasIntervention) return { state, spawned: false };

  // Get a controlled planet for the event
  const controlled = Object.values(state.planets).find(
    (p) => p.status === 'controlled' || p.status === 'partnered'
  );
  if (!controlled) return { state, spawned: false };

  // Spawn intervention immediately as active event
  const intervention: ActiveEvent = {
    id: `concordat-intervention-${state.turn}`,
    kind: 'concordat',
    type: 'intervention',
    planetId: controlled.intrinsic.id,
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
  };

  return {
    state: {
      ...state,
      events: {
        ...state.events,
        active: [...state.events.active, intervention],
      },
    },
    spawned: true,
  };
};

const scout = (state: GameState, planetId: PlanetId): TransitionResult => {
  if (!isReachable(state, planetId))
    return invalid(state, 'Planet not in your sphere of reach');
  const p = state.planets[planetId];
  if (!p) return invalid(state, 'Unknown planet');
  if (p.known.scouted) return invalid(state, 'Already scouted');

  const c = costs(state).scout;
  if (state.influence < c) return invalid(state, 'Not enough Influence');

  const nextPlanet: PlanetState = {
    ...p,
    known: {
      scouted: true,
      type: p.intrinsic.type,
      inhabitants: p.intrinsic.inhabitants,
      baseInfluence: p.intrinsic.baseInfluence,
      hasRelic: p.intrinsic.hasRelic && !p.relicClaimed,
    },
  };

  const next = applyInfluence(
    { ...state, planets: { ...state.planets, [planetId]: nextPlanet } },
    -c
  );

  const effects: GameEffect[] = [
    {
      type: 'MESSAGE',
      message: `Scouted ${p.intrinsic.name}: ${p.intrinsic.type}, ${p.intrinsic.inhabitants}`,
    },
  ];

  if (
    nextPlanet.status !== 'unclaimed' &&
    nextPlanet.intrinsic.hasRelic &&
    !nextPlanet.relicClaimed
  ) {
    // intentionally gated behind control to avoid “free loot” by scouting only
  }

  return { state: next, effects };
};

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

const partner = (state: GameState, planetId: PlanetId): TransitionResult => {
  if (!isReachable(state, planetId))
    return invalid(state, 'Planet not in your sphere of reach');
  const p = state.planets[planetId];
  if (!p) return invalid(state, 'Unknown planet');
  if (p.status !== 'unclaimed') return invalid(state, 'Already claimed');
  if (!p.known.scouted)
    return invalid(state, 'Partner unprepared (Scout first)');

  const inh = p.intrinsic.inhabitants;
  if (inh !== 'Natives' && inh !== 'Primitives')
    return invalid(state, 'No inhabitants to partner with');

  const c = costs(state).partner;
  if (state.influence < c) return invalid(state, 'Not enough Influence');

  const nextPlanet: PlanetState = {
    ...p,
    status: 'partnered',
    development: Math.max(1, p.development),
  };
  const next = applyInfluence(
    { ...state, planets: { ...state.planets, [planetId]: nextPlanet } },
    -c
  );

  return {
    state: next,
    effects: [
      {
        type: 'MESSAGE',
        message: `Partnered with ${p.intrinsic.name} (-${c} Influence)`,
      },
    ],
  };
};

const develop = (state: GameState, planetId: PlanetId): TransitionResult => {
  if (!isReachable(state, planetId))
    return invalid(state, 'Planet not in your sphere of reach');
  const p = state.planets[planetId];
  if (!p) return invalid(state, 'Unknown planet');
  if (p.status === 'unclaimed')
    return invalid(state, 'You do not control this world');

  const c = costs(state).develop;
  if (state.influence < c) return invalid(state, 'Not enough Influence');

  const extraBarren =
    state.tech['tech-terraforming'] && p.intrinsic.type === 'Barren' ? 1 : 0;

  const nextPlanet: PlanetState = {
    ...p,
    development: p.development + 1,
    intrinsic: {
      ...p.intrinsic,
      baseInfluence: p.intrinsic.baseInfluence + extraBarren,
    },
  };

  const next = applyInfluence(
    { ...state, planets: { ...state.planets, [planetId]: nextPlanet } },
    -c
  );

  return {
    state: next,
    effects: [
      {
        type: 'MESSAGE',
        message: `Developed ${p.intrinsic.name} to L${nextPlanet.development} (-${c} Influence)`,
      },
    ],
  };
};

const investigate = (
  state: GameState,
  planetId: PlanetId
): TransitionResult => {
  if (!isReachable(state, planetId))
    return invalid(state, 'Planet not in your sphere of reach');
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
  if (!target) return invalid(state, 'No brewing events detected');

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

const rerollShop = (state: GameState): TransitionResult => {
  const c = costs(state).shopReroll;
  if (state.influence < c) return invalid(state, 'Not enough Influence');

  const next = applyInfluence(state, -c);
  const rerollsThisTurn = next.shop.rerollsThisTurn + 1;
  const offers = rollShop(next, rerollsThisTurn);
  return {
    state: { ...next, shop: { offers, rerollsThisTurn } },
    effects: [{ type: 'MESSAGE', message: `Rerolled shop (-${c} Influence)` }],
  };
};

const buyShop = (state: GameState, slot: 1 | 2 | 3): TransitionResult => {
  const offer = state.shop.offers.find((o) => o.slot === slot);
  if (!offer) return invalid(state, 'Empty shop slot');
  if (state.influence < offer.costInfluence)
    return invalid(state, 'Not enough Influence');

  let next: GameState = applyInfluence(state, -offer.costInfluence);
  const effects: GameEffect[] = [];

  if (offer.kind === 'tech') {
    next = { ...next, tech: { ...next.tech, [offer.cardId]: true } };
    effects.push({ type: 'MESSAGE', message: `Bought tech: ${offer.name}` });
  } else {
    next = {
      ...next,
      relics: {
        ...next.relics,
        [offer.cardId]: (next.relics[offer.cardId] ?? 0) + 1,
      },
    };
    effects.push({ type: 'MESSAGE', message: `Bought relic: ${offer.name}` });
  }

  return { state: next, effects };
};

const useRelic = (
  state: GameState,
  relicId: string,
  targetPlanetId?: PlanetId
): TransitionResult => {
  const count = state.relics[relicId] ?? 0;
  if (count <= 0) return invalid(state, 'You do not have that relic');

  const consumeRelic = (s: GameState): GameState => ({
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
      effects.push({
        type: 'MESSAGE',
        message: 'Relic used: Axiom Key (ring revealed, +10 Entropy)',
      });
      return { state: next, effects };
    }

    case 'relic-stasis-field': {
      if (!targetPlanetId)
        return invalid(state, 'Stasis Field requires a target planet');
      const eventIdx = state.events.brewing.findIndex(
        (e) => e.planetId === targetPlanetId
      );
      if (eventIdx === -1)
        return invalid(state, 'No brewing event on that planet');

      const updatedBrewing = state.events.brewing.map((e, i) =>
        i === eventIdx ? { ...e, turnsLeft: e.turnsLeft + 10 } : e
      );
      const next = applyEntropy(
        {
          ...consumeRelic(state),
          events: { ...state.events, brewing: updatedBrewing },
        },
        +5
      );
      effects.push({
        type: 'MESSAGE',
        message: 'Relic used: Stasis Field (event frozen +10 turns, +5 Entropy)',
      });
      return { state: next, effects };
    }

    case 'relic-precursor-archive': {
      const revealedBrewing = state.events.brewing.map((e) => ({
        ...e,
        revealed: true,
      }));
      const next = applyEntropy(
        {
          ...consumeRelic(state),
          events: { ...state.events, brewing: revealedBrewing },
        },
        +3
      );
      effects.push({
        type: 'MESSAGE',
        message: `Relic used: Precursor Archive (${revealedBrewing.length} events revealed, +3 Entropy)`,
      });
      return { state: next, effects };
    }

    case 'relic-genesis-seed': {
      if (!targetPlanetId)
        return invalid(state, 'Genesis Seed requires a target planet');
      const planet = state.planets[targetPlanetId];
      if (!planet) return invalid(state, 'Unknown planet');
      if (planet.status === 'unclaimed')
        return invalid(state, 'Must control the planet');

      const nextPlanet: PlanetState = {
        ...planet,
        intrinsic: { ...planet.intrinsic, type: 'Industrial', baseInfluence: 3 },
        known: { ...planet.known, type: 'Industrial', baseInfluence: 3 },
      };
      const next = applyEntropy(
        {
          ...consumeRelic(state),
          planets: { ...state.planets, [targetPlanetId]: nextPlanet },
        },
        +8
      );
      effects.push({
        type: 'MESSAGE',
        message:
          'Relic used: Genesis Seed (planet terraformed to Industrial, +8 Entropy)',
      });
      return { state: next, effects };
    }

    case 'relic-echo-of-myrakath': {
      const income = Object.values(state.planets).reduce(
        (acc, p) => acc + planetIncome(state, p),
        0
      );
      let next = consumeRelic(state);
      next = { ...next, influence: next.influence + income };
      next = applyEntropy(next, +6);
      effects.push({
        type: 'MESSAGE',
        message: `Relic used: Echo of Myr'akath (+${income} bonus Influence, +6 Entropy)`,
      });
      return { state: next, effects };
    }

    case 'relic-veil-of-silence': {
      const filteredBrewing = state.events.brewing.filter(
        (e) => e.kind !== 'concordat'
      );
      const next = applyEntropy(
        {
          ...consumeRelic(state),
          events: { ...state.events, brewing: filteredBrewing },
        },
        +12
      );
      effects.push({
        type: 'MESSAGE',
        message: 'Relic used: Veil of Silence (Concordat events cleared, +12 Entropy)',
      });
      return { state: next, effects };
    }

    default:
      return invalid(state, 'Relic not implemented');
  }
};

const respondEvent = (
  state: GameState,
  eventId: string,
  optionId: string
): TransitionResult => {
  const active = state.events.active.find((e) => e.id === eventId);
  if (!active) return invalid(state, 'Unknown active event');
  const option = optionById(active, optionId);
  if (!option) return invalid(state, 'Unknown event option');
  if (state.influence < option.costInfluence)
    return invalid(state, 'Not enough Influence');

  let next = applyInfluence(state, -option.costInfluence);
  if (typeof option.effects.influence === 'number')
    next = applyInfluence(next, option.effects.influence);
  if (typeof option.effects.entropy === 'number')
    next = applyEntropy(next, option.effects.entropy);
  if (option.effects.planet) {
    const p = next.planets[active.planetId];
    if (p) {
      next = {
        ...next,
        planets: {
          ...next.planets,
          [active.planetId]: { ...p, ...option.effects.planet },
        },
      };
    }
  }

  if (option.effects.addBrewingEvent) {
    const e = option.effects.addBrewingEvent;
    next = {
      ...next,
      events: {
        ...next.events,
        brewing: [
          ...next.events.brewing,
          {
            id: `${active.id}-chain`,
            kind: e.kind,
            type: e.type,
            planetId: e.planetId,
            turnsLeft: e.turnsLeft,
            revealed: e.revealed ?? false,
          },
        ],
      },
    };
  }

  next = {
    ...next,
    events: {
      brewing: next.events.brewing,
      active: next.events.active.filter((e) => e.id !== eventId),
    },
  };

  return {
    state: next,
    effects: [
      {
        type: 'MESSAGE',
        message: `Resolved event: ${active.title} → ${option.label}`,
      },
    ],
  };
};

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

  // At 100% entropy, spawn Concordat Intervention instead of instant loss
  const concordat = maybeSpawnConcordatIntervention(next);
  next = concordat.state;
  if (concordat.spawned) {
    effects.push({
      type: 'MESSAGE',
      message: 'The Concordat has arrived! You must respond.',
    });
  }

  const over = checkGameOver(next);
  if (over)
    return { state: over.state, effects: [...effects, ...over.effects] };
  return { state: next, effects };
};

const act = (state: GameState, action: PlayerAction): TransitionResult => {
  if (state.phase !== 'playing')
    return invalid(state, 'Game is over (start a new game)');

  switch (action.type) {
    case 'SCOUT':
      return scout(state, action.planetId);
    case 'COLONIZE':
      return colonize(state, action.planetId);
    case 'PARTNER':
      return partner(state, action.planetId);
    case 'DEVELOP':
      return develop(state, action.planetId);
    case 'INVESTIGATE':
      return investigate(state, action.planetId);
    case 'REROLL_SHOP':
      return rerollShop(state);
    case 'BUY_SHOP':
      return buyShop(state, action.slot);
    case 'USE_RELIC':
      return useRelic(state, action.relicId, action.targetPlanetId);
    case 'RESPOND_EVENT':
      return respondEvent(state, action.eventId, action.optionId);
    case 'END_TURN':
      return endTurn(state);
  }
};

export const transition = (
  state: GameState,
  event: GameEvent
): TransitionResult => {
  switch (event.type) {
    case 'NEW_GAME': {
      const seed = event.seed ?? 1;
      const next = createNewGame(seed, event.config);
      return {
        state: next,
        effects: [
          { type: 'MESSAGE', message: `New game started (seed=${seed})` },
        ],
      };
    }
    case 'SELECT_PLANET':
      return {
        state: { ...state, selectedPlanetId: event.planetId },
        effects: [],
      };
    case 'ACTION':
      return act(state, event.action);
  }
};
