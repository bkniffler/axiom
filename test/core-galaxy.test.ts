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

  it('generates deterministic galaxies from same seed', () => {
    const g1 = generateGalaxy(42, DEFAULT_CONFIG);
    const g2 = generateGalaxy(42, DEFAULT_CONFIG);

    expect(g1.galaxy.rings).toEqual(g2.galaxy.rings);
    expect(g1.galaxy.routes).toEqual(g2.galaxy.routes);
  });
});
