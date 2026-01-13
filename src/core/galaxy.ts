import { PLANET_TYPES } from './content';
import { createRng } from './rng';
import type {
  GalaxyState,
  GameConfig,
  Inhabitants,
  PlanetIntrinsic,
  PlanetState,
  PlanetType,
  Route,
} from './types';

const NAMES = [
  'Aster',
  'Boreal',
  'Cairn',
  'Dusk',
  'Eon',
  'Fallow',
  'Gleam',
  'Harrow',
  'Iris',
  'Juno',
  'Kestrel',
  'Lumen',
  'Morrow',
  'Nacre',
  'Orrery',
  'Palisade',
  'Quill',
  'Ravel',
  'Sable',
  'Thorn',
  'Umber',
  'Vesper',
  'Warden',
  'Xylem',
  'Yarrow',
  'Zephyr',
];

const pickInhabitants = (type: PlanetType, roll: number): Inhabitants => {
  if (type === 'Relic') return roll < 0.7 ? 'Ruins' : 'Hostile';
  if (type === 'Barren') return 'Empty';
  if (roll < 0.55) return 'Empty';
  if (roll < 0.7) return 'Primitives';
  if (roll < 0.92) return 'Natives';
  return 'Hostile';
};

const baseInfluenceFor = (type: PlanetType): number => {
  switch (type) {
    case 'Industrial':
      return 3;
    case 'Agricultural':
      return 2;
    case 'Scientific':
      return 2;
    case 'Military':
      return 2;
    case 'Trade':
      return 3;
    case 'Frontier':
      return 1;
    case 'Relic':
      return 1;
    case 'Barren':
      return 0;
  }
};

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
        incomeModifier: 0,
      };
    }
    rings.push(ringPlanets);
  }

  const routes: Route[] = [];
  const ring0 = rings[0] ?? [];
  for (let i = 1; i < ring0.length; i++) {
    routes.push({ from: ring0[i]!, to: 'p-0-0' });
  }
  for (let ring = 1; ring < ringCount; ring++) {
    const prev = rings[ring - 1] ?? [];
    const cur = rings[ring] ?? [];
    for (let i = 0; i < cur.length; i++) {
      const from = cur[i]!;
      const to = prev[rng.int(0, prev.length - 1)]!;
      routes.push({ from, to });
    }
  }
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

  // Ensure every planet has at least one non-hostile neighbor (fixes unreachable planets)
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

export const neighborsOf = (routes: Route[], planetId: string): string[] => {
  const out: string[] = [];
  for (const r of routes) {
    if (r.from === planetId) out.push(r.to);
    else if (r.to === planetId) out.push(r.from);
  }
  return out;
};
