import type { GameConfig, PlanetType, ShopCard } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  ringSizes: [3, 6, 9, 12],
  revealThresholdPerRing: 0.6,

  // Iteration 3: Tighter economy
  startingInfluence: 5, // Was 8 - immediate scarcity
  startingEntropy: 0,
  entropyMax: 100,

  costs: {
    scout: 1,
    colonize: 6, // Was 5 - harder to expand
    partner: 4,
    develop: 4,
    investigate: 2,
    shopReroll: 2,
  },

  income: {
    developmentBonus: 1,
    partnerShare: 0.5,
  },

  // Iteration 3: Higher upkeep costs
  upkeepByRing: [0, 2, 3, 4, 5], // Was [0,1,2,3,4] - expansion costs more
  entropyDrain: {
    25: 3,  // 25%+ entropy = -3/turn
    50: 8,  // 50%+ entropy = -8/turn
    75: 15, // 75%+ entropy = -15/turn
  },
  concordatTribute: {
    observers: 5,
    emissary: 12,
    ultimatum: 20,
  },

  // Iteration 3: Victory conditions
  victory: {
    influenceThreshold: 500, // Accumulate 500 influence to win
    dominationPercentage: 0.8, // Control 80% of planets to win
  },
};

export const PLANET_TYPES: PlanetType[] = [
  'Industrial',
  'Agricultural',
  'Scientific',
  'Military',
  'Trade',
  'Frontier',
  'Relic',
  'Barren',
];

export const SHOP_CARDS: ShopCard[] = [
  // Tech
  {
    id: 'tech-warp-drive',
    kind: 'tech',
    tier: 1,
    name: 'Warp Drive',
    description: 'Colonize cost -1. Ring 1 planets have no upkeep.',
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
    description: 'Partner cost -2. Partnered planets have no upkeep.',
    costInfluence: 8,
  },
  {
    id: 'tech-trade-network',
    kind: 'tech',
    tier: 2,
    name: 'Trade Network',
    description: '+0.5x multiplier. Trade planets +1 base income.',
    costInfluence: 10,
  },
  {
    id: 'tech-entropy-dampeners',
    kind: 'tech',
    tier: 3,
    name: 'Entropy Dampeners',
    description: 'Entropy drain halved.',
    costInfluence: 15,
  },
  {
    id: 'tech-concordat-protocols',
    kind: 'tech',
    tier: 3,
    name: 'Concordat Protocols',
    description: 'Concordat tribute costs halved.',
    costInfluence: 18,
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
    description: 'Use: terraform target planet to Industrial (+8 Entropy).',
    costInfluence: 15,
  },
  {
    id: 'relic-echo-of-myrakath',
    kind: 'relic',
    tier: 2,
    name: "Echo of Myr'akath",
    description: 'Use: +2.0x multiplier this turn (+6 Entropy).',
    costInfluence: 10,
  },
  {
    id: 'relic-veil-of-silence',
    kind: 'relic',
    tier: 3,
    name: 'Veil of Silence',
    description: 'Use: clear all Concordat events (+12 Entropy).',
    costInfluence: 18,
  },

  // Iteration 3: Aggressive relics
  {
    id: 'relic-orbital-cannon',
    kind: 'relic',
    tier: 2,
    name: 'Orbital Cannon',
    description: 'Use: destroy target planet. Removes all events there. Adjacent planets -50% income for 3 turns (+20 Entropy).',
    costInfluence: 15,
  },
  {
    id: 'relic-propaganda-engine',
    kind: 'relic',
    tier: 2,
    name: 'Propaganda Engine',
    description: 'Use: resolve all Unrest events for free (+1 Entropy per event resolved).',
    costInfluence: 12,
  },
  {
    id: 'relic-doomsday-device',
    kind: 'relic',
    tier: 3,
    name: 'Doomsday Device',
    description: 'Use: destroy all planets in target ring. Massive consequences (+40 Entropy).',
    costInfluence: 25,
  },
];
