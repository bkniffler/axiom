import type { GameConfig, PlanetType, ShopCard } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  ringSizes: [3, 6, 9, 12],
  revealThresholdPerRing: 0.6,

  startingInfluence: 8,
  startingEntropy: 0,
  entropyMax: 100,

  costs: {
    scout: 1,
    colonize: 5,
    partner: 4,
    develop: 4,
    investigate: 2,
    shopReroll: 2,
  },

  income: {
    developmentBonus: 1,
    partnerShare: 0.5,
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
    description: 'Use: terraform target planet to Industrial (+8 Entropy).',
    costInfluence: 15,
  },
  {
    id: 'relic-echo-of-myrakath',
    kind: 'relic',
    tier: 2,
    name: "Echo of Myr'akath",
    description: 'Use: gain bonus influence equal to income (+6 Entropy).',
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
];
