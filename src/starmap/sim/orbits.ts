interface PlanetOrbitLike {
  orbitSpeed: number;
  angle: number;
  moon?: {
    orbitSpeed: number;
    angle: number;
  };
}

interface OrbitingObjectLike {
  orbitSpeed: number;
  angle: number;
}

interface AsteroidBeltLike {
  orbitSpeed: number;
  angle: number;
}

export function advancePlanetOrbits(
  planets: PlanetOrbitLike[],
  deltaSeconds: number,
  orbitSpeedScale: number
): void {
  for (const planet of planets) {
    planet.angle += planet.orbitSpeed * deltaSeconds * orbitSpeedScale;
    if (planet.moon) {
      planet.moon.angle +=
        planet.moon.orbitSpeed * deltaSeconds * orbitSpeedScale;
    }
  }
}

export function advanceOrbitingObjects(
  objects: OrbitingObjectLike[],
  deltaSeconds: number,
  orbitSpeedScale: number
): void {
  for (const obj of objects) {
    obj.angle += obj.orbitSpeed * deltaSeconds * orbitSpeedScale;
  }
}

export function advanceAsteroidBelts(
  belts: AsteroidBeltLike[],
  deltaSeconds: number,
  orbitSpeedScale: number
): void {
  for (const belt of belts) {
    belt.angle += belt.orbitSpeed * deltaSeconds * orbitSpeedScale;
  }
}
