import type { CameraTransformParams } from '@/camera/transforms';
import { worldToScreen } from '@/camera/transforms';

interface HitTestPlanet {
  worldX: number;
  worldY: number;
  size: number; // world-space size (same units as world coords)
}

interface HitTestResult {
  hoveredPlanetIndex: number;
  hoveredSun: boolean;
}

interface HitTestParams {
  mouseX: number;
  mouseY: number;
  zoom: number;
  pixelSize: number;
  viewportWidth: number;
  viewportHeight: number;
  cameraX: number;
  cameraY: number;
  planets: HitTestPlanet[];
}

export function hitTestStarMap(params: HitTestParams): HitTestResult {
  const transform: CameraTransformParams = {
    viewportWidth: params.viewportWidth,
    viewportHeight: params.viewportHeight,
    cameraX: params.cameraX,
    cameraY: params.cameraY,
    zoom: params.zoom,
    parallax: 1,
  };

  for (let i = 0; i < params.planets.length; i++) {
    const planet = params.planets[i];
    const { x: px, y: py } = worldToScreen(
      planet.worldX,
      planet.worldY,
      transform
    );
    const scaledSize = planet.size * params.zoom;
    const dist = Math.hypot(params.mouseX - px, params.mouseY - py);
    if (dist < scaledSize + 10) {
      return { hoveredPlanetIndex: i, hoveredSun: false };
    }
  }

  const sun = worldToScreen(0, 0, transform);
  const dist = Math.hypot(params.mouseX - sun.x, params.mouseY - sun.y);
  const sunClickableRadius = Math.max(14, params.pixelSize * 5 * params.zoom);
  return { hoveredPlanetIndex: -1, hoveredSun: dist < sunClickableRadius };
}
