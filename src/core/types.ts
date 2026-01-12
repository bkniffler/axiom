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
