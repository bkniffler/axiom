import { neighborsOf } from './galaxy';
import type {
  EconomyBreakdown,
  GameState,
  Networks,
  PlanetState,
  PlanetType,
} from './types';

/**
 * Detect active planet networks (3+ connected planets of same type)
 */
export const detectNetworks = (state: GameState): Networks => {
  const controlled = Object.values(state.planets).filter(
    (p) => p.status === 'controlled' || p.status === 'partnered'
  );

  const networks: Networks = {
    trade: false,
    industrial: false,
    scientific: false,
    military: false,
    agricultural: false,
  };

  // Check each network type
  const typeToNetwork: Record<PlanetType, keyof Networks | null> = {
    Trade: 'trade',
    Industrial: 'industrial',
    Scientific: 'scientific',
    Military: 'military',
    Agricultural: 'agricultural',
    Frontier: null,
    Relic: null,
    Barren: null,
  };

  for (const [planetType, networkKey] of Object.entries(typeToNetwork)) {
    if (!networkKey) continue;

    const planetsOfType = controlled.filter(
      (p) => p.intrinsic.type === planetType
    );

    if (planetsOfType.length >= 3) {
      // Check if at least 3 are connected via routes
      const largestCluster = findLargestConnectedCluster(
        planetsOfType,
        state.galaxy.routes
      );
      if (largestCluster >= 3) {
        networks[networkKey] = true;
      }
    }
  }

  return networks;
};

/**
 * Find the largest connected cluster of planets via routes
 */
const findLargestConnectedCluster = (
  planets: PlanetState[],
  routes: { from: string; to: string }[]
): number => {
  const planetIds = new Set(planets.map((p) => p.intrinsic.id));
  const visited = new Set<string>();
  let maxClusterSize = 0;

  for (const planet of planets) {
    if (visited.has(planet.intrinsic.id)) continue;

    // BFS to find connected cluster
    const queue = [planet.intrinsic.id];
    let clusterSize = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      clusterSize++;

      // Find neighbors that are also in our planet set
      const neighbors = neighborsOf(routes, current);
      for (const neighborId of neighbors) {
        if (planetIds.has(neighborId) && !visited.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }

    maxClusterSize = Math.max(maxClusterSize, clusterSize);
  }

  return maxClusterSize;
};

/**
 * Get multiplier bonus from active networks
 */
export const getNetworkMultiplierBonus = (networks: Networks): number => {
  let bonus = 0;
  if (networks.trade) bonus += 0.5;
  if (networks.industrial) bonus += 0.5;
  if (networks.scientific) bonus += 0.3;
  // Military and Agricultural don't give mult bonus
  return bonus;
};

/**
 * Get flat income bonus from active networks
 */
export const getNetworkFlatBonus = (networks: Networks): number => {
  let bonus = 0;
  if (networks.trade) bonus += 5;
  // Other networks don't give flat income bonus
  return bonus;
};

/**
 * Get upkeep reduction from networks (applied per-planet in network)
 */
export const getNetworkUpkeepReduction = (
  networks: Networks,
  planetType: PlanetType
): number => {
  if (networks.agricultural && planetType === 'Agricultural') return 1;
  return 0;
};

/**
 * Calculate base income (sum of all planet outputs before multiplier)
 */
export const calculateBaseIncome = (state: GameState): number => {
  let base = 0;
  const networkFlatBonus = getNetworkFlatBonus(state.networks);

  for (const planet of Object.values(state.planets)) {
    if (planet.status === 'unclaimed') continue;

    // Iteration 3: Include permanent income modifier (from aggressive choices like Purge)
    const planetIncome =
      planet.intrinsic.baseInfluence +
      planet.development * state.config.income.developmentBonus +
      planet.incomeModifier;

    // Skip if planet income is destroyed (incomeModifier = -99 from orbital strike)
    if (planetIncome < 0) continue;

    // Check for event income loss
    const eventLossMultiplier = getEventIncomeMultiplier(state, planet);

    if (planet.status === 'partnered') {
      base += Math.floor(planetIncome * state.config.income.partnerShare * eventLossMultiplier);
    } else {
      base += Math.floor(planetIncome * eventLossMultiplier);
    }
  }

  return base + networkFlatBonus;
};

/**
 * Get income multiplier for a planet based on active events
 */
const getEventIncomeMultiplier = (
  state: GameState,
  planet: PlanetState
): number => {
  const planetId = planet.intrinsic.id;
  let multiplier = 1.0;

  // Check for active events on this planet
  for (const event of state.events.active) {
    if (event.planetId === planetId) {
      if (event.type === 'unrest') multiplier *= 0.5; // -50%
      if (event.type === 'rebellion') multiplier *= 0; // -100%
    }
    // Check for adjacent rebellion spread
    if (event.type === 'rebellion' && event.planetId !== planetId) {
      const neighbors = neighborsOf(state.galaxy.routes, planetId);
      if (neighbors.includes(event.planetId)) {
        multiplier *= 0.75; // -25% from adjacent rebellion
      }
    }
  }

  // Pirate base drains income (handled separately as flat)
  return multiplier;
};

/**
 * Calculate total income multiplier
 */
export const calculateMultiplier = (state: GameState): number => {
  let mult = 1.0;

  // Trade planets: +0.2x each
  const tradePlanets = Object.values(state.planets).filter(
    (p) =>
      (p.status === 'controlled' || p.status === 'partnered') &&
      p.intrinsic.type === 'Trade'
  );
  mult += tradePlanets.length * 0.2;

  // High development planets: +0.1x each (dev 3+)
  const highDevPlanets = Object.values(state.planets).filter(
    (p) =>
      (p.status === 'controlled' || p.status === 'partnered') &&
      p.development >= 3
  );
  mult += highDevPlanets.length * 0.1;

  // Network bonuses
  mult += getNetworkMultiplierBonus(state.networks);

  // Tech bonuses
  if (state.tech['tech-trade-network']) mult += 0.5;

  // Echo of Myr'akath (temporary boost)
  if (state.echoOfMyrakathActive) mult += 2.0;

  return mult;
};

/**
 * Calculate planet upkeep based on ring
 */
export const calculatePlanetUpkeep = (state: GameState): number => {
  let upkeep = 0;

  for (const planet of Object.values(state.planets)) {
    if (planet.status === 'unclaimed') continue;

    const ring = planet.intrinsic.ring;
    const baseUpkeep = state.config.upkeepByRing[ring] ?? ring;

    // Partnered planets have no upkeep with Diplomatic Corps
    if (planet.status === 'partnered' && state.tech['tech-diplomatic-corps']) {
      continue;
    }

    // Ring 1 upkeep = 0 with Warp Drive
    if (ring === 1 && state.tech['tech-warp-drive']) {
      continue;
    }

    // Network upkeep reduction
    const reduction = getNetworkUpkeepReduction(
      state.networks,
      planet.intrinsic.type
    );

    upkeep += Math.max(0, baseUpkeep - reduction);
  }

  return upkeep;
};

/**
 * Calculate entropy drain based on current entropy level
 */
export const calculateEntropyDrain = (state: GameState): number => {
  const entropyPercent = (state.entropy / state.config.entropyMax) * 100;

  // Find the highest threshold we're at or above
  let drain = 0;
  for (const [threshold, drainAmount] of Object.entries(
    state.config.entropyDrain
  )) {
    if (entropyPercent >= Number(threshold)) {
      drain = Math.max(drain, drainAmount);
    }
  }

  // Entropy Dampeners tech halves drain
  if (state.tech['tech-entropy-dampeners']) {
    drain = Math.floor(drain / 2);
  }

  return drain;
};

/**
 * Calculate Concordat tribute based on Concordat presence stage
 * Iteration 3: Uses concordat.stage instead of just active events
 */
export const calculateConcordatTribute = (state: GameState): number => {
  let tribute = 0;

  // Iteration 3: Base tribute from Concordat presence stage
  switch (state.concordat.stage) {
    case 'awareness':
      tribute = 2; // Turn 5+: small tribute
      break;
    case 'observers':
      tribute = state.config.concordatTribute.observers; // 5/turn
      break;
    case 'emissary':
      tribute = state.config.concordatTribute.emissary; // 12/turn
      break;
    case 'fleet':
    case 'intervention':
      tribute = state.config.concordatTribute.ultimatum; // 20/turn
      break;
    case 'none':
    default:
      tribute = 0;
  }

  // Add tribute from active Concordat events (stacks with base)
  for (const event of state.events.active) {
    if (event.kind === 'concordat') {
      if (event.type === 'observers')
        tribute += Math.floor(state.config.concordatTribute.observers / 2);
      if (event.type === 'emissary')
        tribute += Math.floor(state.config.concordatTribute.emissary / 2);
      if (event.type === 'ultimatum')
        tribute += Math.floor(state.config.concordatTribute.ultimatum / 2);
    }
  }

  // Concordat Protocols tech halves tribute
  if (state.tech['tech-concordat-protocols']) {
    tribute = Math.floor(tribute / 2);
  }

  return tribute;
};

/**
 * Calculate event-based income losses (pirate base, etc.)
 */
export const calculateEventLosses = (state: GameState): number => {
  let losses = 0;

  for (const event of state.events.active) {
    if (event.type === 'pirate-base') losses += 3;
  }

  return losses;
};

/**
 * Calculate full economy breakdown
 */
export const calculateEconomy = (state: GameState): EconomyBreakdown => {
  const baseIncome = calculateBaseIncome(state);
  const multiplier = calculateMultiplier(state);
  const grossIncome = Math.floor(baseIncome * multiplier);

  const planetUpkeep = calculatePlanetUpkeep(state);

  // Calculate raw entropy drain from config thresholds
  const rawEntropyDrain = calculateEntropyDrain(state);

  // Cap entropy drain at 50% of gross income to prevent death spirals
  const maxDrain = Math.floor(grossIncome * 0.5);
  const entropyDrain = Math.min(rawEntropyDrain, maxDrain);

  const concordatTribute = calculateConcordatTribute(state);
  const eventLosses = calculateEventLosses(state);

  const netIncome =
    grossIncome - planetUpkeep - entropyDrain - concordatTribute - eventLosses;

  return {
    baseIncome,
    multiplier,
    grossIncome,
    planetUpkeep,
    entropyDrain,
    concordatTribute,
    eventLosses,
    netIncome,
  };
};
