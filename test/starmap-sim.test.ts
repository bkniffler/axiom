import { describe, expect, it } from 'bun:test';
import {
  advanceAsteroidBelts,
  advanceOrbitingObjects,
  advancePlanetOrbits,
} from '@/sim/orbits';

describe('starmap simulation', () => {
  it('advances planet and moon orbits using dt and scale', () => {
    const planets = [
      { orbitSpeed: 1, angle: 0, moon: { orbitSpeed: 2, angle: 0 } },
      { orbitSpeed: 0.5, angle: 1 },
    ];
    advancePlanetOrbits(planets, 0.25, 0.4);
    expect(planets[0].angle).toBeCloseTo(0.1, 6);
    expect(planets[0].moon!.angle).toBeCloseTo(0.2, 6);
    expect(planets[1].angle).toBeCloseTo(1.05, 6);
  });

  it('advances belts and orbiting objects', () => {
    const belts = [{ orbitSpeed: 0.5, angle: 0 }];
    const objects = [{ orbitSpeed: 1, angle: 2 }];
    advanceAsteroidBelts(belts, 1, 0.2);
    advanceOrbitingObjects(objects, 0.5, 0.4);
    expect(belts[0].angle).toBeCloseTo(0.1, 6);
    expect(objects[0].angle).toBeCloseTo(2.2, 6);
  });
});
