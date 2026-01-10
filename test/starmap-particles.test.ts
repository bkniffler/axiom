import { describe, expect, it } from 'bun:test';
import { stepParticles } from '@/sim/particles';
import { spawnPlanetExplosionParticles } from '@/sim/particlesSpawn';

describe('particles', () => {
  it('spawns particles deterministically with injected rng', () => {
    let s = 1;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };

    const particles = spawnPlanetExplosionParticles({
      planets: [{ color: [10, 20, 30], size: 5, screenX: 100, screenY: 200 }],
      pixelSize: 3,
      targetParticleCount: 100,
      lightGray: [170, 170, 170],
      rand,
    });

    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0].x).toBeGreaterThan(90);
    expect(particles[0].x).toBeLessThan(110);
  });

  it('steps particles toward the center and removes them when they reach it', () => {
    const particles = [
      {
        x: 100,
        y: 0,
        vx: 0,
        vy: 0,
        color: [255, 255, 255],
        life: 1,
        maxLife: 10,
        size: 3,
      },
    ];
    stepParticles({
      particles,
      deltaSeconds: 0.1,
      transitionProgress: 0.6,
      shakeDuration: 0.3,
      zoom: 1,
      centerX: 0,
      centerY: 0,
    });
    expect(particles.length).toBe(1);
    expect(particles[0].x).toBeLessThan(100);

    particles[0].x = 1;
    particles[0].y = 1;
    stepParticles({
      particles,
      deltaSeconds: 0.1,
      transitionProgress: 0.8,
      shakeDuration: 0.3,
      zoom: 1,
      centerX: 0,
      centerY: 0,
    });
    expect(particles.length).toBe(0);
  });
});
