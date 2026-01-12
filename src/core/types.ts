type GamePhase = 'playing' | 'won' | 'lost';

export type PlanetId = string;

export type PlanetType =
  | 'Industrial'
  | 'Agricultural'
  | 'Scientific'
  | 'Military'
  | 'Trade'
  | 'Frontier'
  | 'Relic'
  | 'Barren';

export type Inhabitants =
  | 'Empty'
  | 'Primitives'
  | 'Natives'
  | 'Ruins'
  | 'Hostile';

type ControlStatus = 'unclaimed' | 'controlled' | 'partnered';

export type PlanetIntrinsic = {
  id: PlanetId;
  ring: number;
  name: string;
  type: PlanetType;
  inhabitants: Inhabitants;
  baseInfluence: number;
  hasRelic: boolean;
};

type PlanetKnowledge = {
  scouted: boolean;
  type?: PlanetType;
  inhabitants?: Inhabitants;
  baseInfluence?: number;
  hasRelic?: boolean;
};

export type PlanetState = {
  intrinsic: PlanetIntrinsic;
  status: ControlStatus;
  development: number;
  relicClaimed: boolean;
  known: PlanetKnowledge;
  // Iteration 3: Permanent income modifier (from aggressive choices like Purge)
  incomeModifier: number;
};

export type Route = {
  from: PlanetId;
  to: PlanetId;
};

export type GalaxyState = {
  ringCount: number;
  rings: PlanetId[][];
  routes: Route[];
  revealedRing: number;
  homeworldId: PlanetId;
};

export type BrewingEvent = {
  id: string;
  kind: 'internal' | 'external' | 'cosmic' | 'concordat';
  type: string;
  planetId: PlanetId;
  turnsLeft: number;
  revealed: boolean;
};

export type EventOption = {
  id: string;
  label: string;
  costInfluence: number;
  effects: {
    influence?: number;
    entropy?: number;
    planet?: Partial<Pick<PlanetState, 'development' | 'status'>>;
    addBrewingEvent?: Omit<BrewingEvent, 'id' | 'revealed'> & {
      revealed?: boolean;
    };
    // Iteration 3: Aggressive options
    incomeModifier?: number; // Permanent income change on planet (e.g., -1 for Purge)
    destroyPlanet?: boolean; // Destroy the planet entirely (Orbital Strike)
  };
};

export type ActiveEvent = {
  id: string;
  kind: BrewingEvent['kind'];
  type: string;
  planetId: PlanetId;
  title: string;
  body: string;
  options: EventOption[];
};

type TechId = string;
type RelicId = string;

export type Networks = {
  trade: boolean;
  industrial: boolean;
  scientific: boolean;
  military: boolean;
  agricultural: boolean;
};

export type EconomyBreakdown = {
  baseIncome: number;
  multiplier: number;
  grossIncome: number;
  planetUpkeep: number;
  entropyDrain: number;
  concordatTribute: number;
  eventLosses: number;
  netIncome: number;
};

// Iteration 3: Concordat presence system
export type ConcordatStance = 'unaware' | 'watching' | 'curious' | 'hostile';

export type ConcordatPresence = {
  stance: ConcordatStance;
  stage: 'none' | 'awareness' | 'observers' | 'emissary' | 'fleet' | 'intervention';
};

// Iteration 3: Victory conditions
export type VictoryType = 'influence' | 'domination' | 'concordat' | 'exploration';

export type VictoryCondition =
  | { type: 'influence'; threshold: number } // Accumulate X influence
  | { type: 'domination'; percentage: number } // Control X% of planets
  | { type: 'concordat'; outcome: 'alliance' | 'defeat' } // Concordat alliance or defeat
  | { type: 'exploration' }; // Scout all planets (original)

export type ShopCard = {
  id: string;
  kind: 'tech' | 'relic';
  name: string;
  description: string;
  costInfluence: number;
  tier: 1 | 2 | 3;
};

export type ShopOffer = {
  slot: 1 | 2 | 3;
  cardId: string;
  name: string;
  description: string;
  costInfluence: number;
  kind: ShopCard['kind'];
  tier: ShopCard['tier'];
};

export type GameConfig = {
  ringSizes: number[];
  revealThresholdPerRing: number;

  startingInfluence: number;
  startingEntropy: number;
  entropyMax: number;

  costs: {
    scout: number;
    colonize: number;
    partner: number;
    develop: number;
    investigate: number;
    shopReroll: number;
  };

  income: {
    developmentBonus: number;
    partnerShare: number;
  };

  // Iteration 2: Upkeep system
  upkeepByRing: number[]; // [0, 1, 2, 3, 4] - upkeep per planet by ring
  entropyDrain: Record<number, number>; // { 25: 3, 50: 8, 75: 15 } - drain at threshold
  concordatTribute: {
    observers: number;
    emissary: number;
    ultimatum: number;
  };

  // Iteration 3: Victory conditions
  victory: {
    influenceThreshold: number; // Accumulate this much influence to win
    dominationPercentage: number; // Control this % of planets to win
  };
};

export type GameState = {
  phase: GamePhase;
  seed: number;
  turn: number;
  config: GameConfig;

  influence: number;
  entropy: number;

  galaxy: GalaxyState;
  planets: Record<PlanetId, PlanetState>;
  selectedPlanetId: PlanetId | null;

  events: {
    brewing: BrewingEvent[];
    active: ActiveEvent[];
  };

  shop: {
    offers: ShopOffer[];
    rerollsThisTurn: number;
  };

  tech: Record<TechId, true>;
  relics: Record<RelicId, number>;

  // Iteration 2: Economy system
  networks: Networks;
  economy: EconomyBreakdown;
  negativeIncomeTurns: number;
  echoOfMyrakathActive: boolean; // Temporary multiplier boost

  // Iteration 3: Concordat presence system
  concordat: ConcordatPresence;

  // Iteration 3.2: Positive feedback tracking
  previousNetworks: Networks;          // Track network state for activation detection
  highestMultiplier: number;           // Track highest multiplier achieved
  multiplierMilestones: number[];      // Track which milestones claimed (2.0, 2.5, 3.0, 4.0)
  colonizationsThisTurn: number;       // Track colonizations for streak bonus
};

export type PlayerAction =
  | { type: 'SCOUT'; planetId: PlanetId }
  | { type: 'COLONIZE'; planetId: PlanetId }
  | { type: 'PARTNER'; planetId: PlanetId }
  | { type: 'DEVELOP'; planetId: PlanetId }
  | { type: 'INVESTIGATE'; planetId: PlanetId }
  | { type: 'BUY_SHOP'; slot: 1 | 2 | 3 }
  | { type: 'REROLL_SHOP' }
  | { type: 'USE_RELIC'; relicId: RelicId; targetPlanetId?: PlanetId }
  | { type: 'RESPOND_EVENT'; eventId: string; optionId: string }
  | { type: 'END_TURN' };

export type GameEvent =
  | { type: 'NEW_GAME'; seed?: number; config?: Partial<GameConfig> }
  | { type: 'SELECT_PLANET'; planetId: PlanetId | null }
  | { type: 'ACTION'; action: PlayerAction };

export type GameEffect =
  | { type: 'MESSAGE'; message: string }
  | { type: 'INVALID'; reason: string }
  | { type: 'GAME_OVER'; outcome: 'won' | 'lost'; reason: string };

export type TransitionResult = {
  state: GameState;
  effects: GameEffect[];
};
