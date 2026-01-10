import type { Rgb } from '@/math/color';
import type { Particle } from '@/render/passes/particles';

interface SpawnPlanet {
  color: Rgb;
  size: number;
  screenX: number;
  screenY: number;
  moonScreenX?: number;
  moonScreenY?: number;
  moonColor?: Rgb;
}

interface SpawnParticlesParams {
  planets: SpawnPlanet[];
  pixelSize: number;
  targetParticleCount: number;
  lightGray: Rgb;
  rand?: () => number;
}

export function spawnPlanetExplosionParticles(
  params: SpawnParticlesParams
): Particle[] {
  const rand = params.rand ?? Math.random;
  const particles: Particle[] = [];
  const particlesPerPlanet = Math.max(
    10,
    Math.floor(params.targetParticleCount / Math.max(1, params.planets.length))
  );

  for (const planet of params.planets) {
    for (let i = 0; i < particlesPerPlanet; i++) {
      const angle = rand() * Math.PI * 2;
      const speed = 5 + rand() * 15;
      particles.push({
        x: planet.screenX + (rand() - 0.5) * planet.size * 1.5,
        y: planet.screenY + (rand() - 0.5) * planet.size * 1.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: [...planet.color],
        life: 1.0,
        maxLife: 1.2 + rand() * 0.8,
        size: params.pixelSize * (0.5 + rand() * 1),
      });
    }

    if (planet.moonScreenX !== undefined && planet.moonScreenY !== undefined) {
      for (let i = 0; i < 10; i++) {
        const angle = rand() * Math.PI * 2;
        const speed = 3 + rand() * 10;
        particles.push({
          x: planet.moonScreenX,
          y: planet.moonScreenY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: [...(planet.moonColor ?? params.lightGray)],
          life: 1.0,
          maxLife: 0.8 + rand() * 0.5,
          size: params.pixelSize,
        });
      }
    }
  }

  return particles;
}
