import { createRng } from './rng';
import type {
  ActiveEvent,
  BrewingEvent,
  EventOption,
  GameState,
  PlanetId,
} from './types';

const mkId = (prefix: string, seed: number, turn: number, n: number) =>
  `${prefix}-${seed.toString(16)}-${turn}-${n}`;

const unrestEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'internal',
  type: 'unrest',
  planetId,
  title: 'Unrest',
  body: 'A local movement is organizing against your rule. It will escalate if left unattended.',
  options: [
    {
      id: 'negotiate',
      label: 'Negotiate',
      costInfluence: 3,
      effects: { entropy: -1 },
    },
    {
      id: 'suppress',
      label: 'Suppress',
      costInfluence: 1,
      effects: { entropy: +3 },
    },
    {
      id: 'ignore',
      label: 'Ignore',
      costInfluence: 0,
      effects: {
        addBrewingEvent: {
          kind: 'internal',
          type: 'rebellion',
          planetId,
          turnsLeft: 3,
          revealed: false,
        },
      },
    },
  ],
});

const rebellionEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'internal',
  type: 'rebellion',
  planetId,
  title: 'Rebellion',
  body: 'Open resistance breaks out. Your influence income from this world is at risk.',
  options: [
    {
      id: 'crackdown',
      label: 'Crack Down',
      costInfluence: 4,
      effects: { entropy: +6 },
    },
    {
      id: 'concessions',
      label: 'Concessions',
      costInfluence: 5,
      effects: { entropy: -2 },
    },
    {
      id: 'abandon',
      label: 'Abandon',
      costInfluence: 0,
      effects: { planet: { status: 'unclaimed' }, entropy: -1 },
    },
  ],
});

const anomalyEvent = (planetId: PlanetId): Omit<ActiveEvent, 'id'> => ({
  kind: 'cosmic',
  type: 'anomaly',
  planetId,
  title: 'Anomaly',
  body: 'Sensors report a pattern in the Axiom Current. Exploiting it might help… or draw attention.',
  options: [
    {
      id: 'study',
      label: 'Study',
      costInfluence: 2,
      effects: { influence: +2, entropy: +2 },
    },
    {
      id: 'seal',
      label: 'Seal',
      costInfluence: 1,
      effects: { entropy: -1 },
    },
    {
      id: 'harvest',
      label: 'Harvest',
      costInfluence: 0,
      effects: { influence: +4, entropy: +8 },
    },
  ],
});

// External events
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

// Concordat events
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
  const externalFactor = 0.12;

  for (let i = 0; i < rolls; i++) {
    const planet = rng.pick(controlled);
    const p = planet.intrinsic;
    const r = rng.next();

    // Cosmic events (entropy-driven or relic worlds)
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

    // External events (raiders, refugees, traders)
    if (r < entropyFactor + unrestFactor + externalFactor) {
      // Trade planets attract traders, frontier/military attract raiders
      let type: 'raiders' | 'refugees' | 'traders';
      const typeRoll = rng.next();
      if (p.type === 'Trade') {
        type = typeRoll < 0.6 ? 'traders' : typeRoll < 0.8 ? 'refugees' : 'raiders';
      } else if (p.type === 'Frontier' || p.type === 'Military') {
        type = typeRoll < 0.5 ? 'raiders' : typeRoll < 0.8 ? 'refugees' : 'traders';
      } else {
        type = typeRoll < 0.33 ? 'raiders' : typeRoll < 0.66 ? 'refugees' : 'traders';
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

  // Concordat events at high entropy (spawn separately, max 1 at a time)
  const concordatThreshold = state.entropy >= 75 ? 0.25 : state.entropy >= 50 ? 0.12 : 0;
  if (concordatThreshold > 0 && rng.next() < concordatThreshold) {
    const hasConcordat = state.events.brewing.some((e) => e.kind === 'concordat');
    if (!hasConcordat && controlled.length > 0) {
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

  return out;
};

export const tickBrewingEvents = (
  brewing: BrewingEvent[]
): { brewing: BrewingEvent[]; fired: BrewingEvent[] } => {
  const next: BrewingEvent[] = [];
  const fired: BrewingEvent[] = [];
  for (const e of brewing) {
    const t = e.turnsLeft - 1;
    if (t <= 0) fired.push({ ...e, turnsLeft: 0 });
    else next.push({ ...e, turnsLeft: t });
  }
  return { brewing: next, fired };
};

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
    default:
      base = anomalyEvent(brewing.planetId); // Fallback
  }

  return { ...base, id: brewing.id };
};

export const summarizeRevealedBrewing = (e: BrewingEvent): string =>
  `${e.type} on ${e.planetId} in ${e.turnsLeft} turns`;

export const findInvestigableBrewing = (
  state: GameState,
  planetId: PlanetId
): BrewingEvent | null => {
  // First look for unrevealed events on the specified planet
  const onPlanet = state.events.brewing.filter(
    (e) => e.planetId === planetId && !e.revealed
  );
  if (onPlanet.length > 0) return onPlanet[0] ?? null;

  // With Intel Network tech, can investigate any unrevealed event from any controlled planet
  if (state.tech['tech-intel-network']) {
    const anyUnrevealed = state.events.brewing.find((e) => !e.revealed);
    return anyUnrevealed ?? null;
  }

  return null;
};

export const optionById = (
  active: ActiveEvent,
  optionId: string
): EventOption | null => active.options.find((o) => o.id === optionId) ?? null;
