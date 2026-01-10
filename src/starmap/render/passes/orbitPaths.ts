import type { Rgb } from '../../math/color';
import { mixRgb } from '../../math/color';
import type { PixelRenderer } from '../PixelRenderer';

export interface OrbitPathsPlanet {
  orbitRadius: number; // world units
  color: Rgb;
}

export interface OrbitPathsBelt {
  orbitRadius: number; // world units
}

export interface DrawOrbitPathsParams {
  renderer: PixelRenderer;
  show: boolean;
  sunScreenX: number;
  sunScreenY: number;
  zoom: number;
  pixelSize: number;
  planets: OrbitPathsPlanet[];
  belts: OrbitPathsBelt[];
  darkGray: Rgb;
  midGray: Rgb;
}

function drawDottedCircle(
  renderer: PixelRenderer,
  cx: number,
  cy: number,
  radius: number,
  pixelSize: number,
  color: Rgb,
  opacity: number
): void {
  const circumference = 2 * Math.PI * radius;
  const rawDotCount = Math.floor(circumference / (pixelSize * 10));
  const dotCount = Math.max(8, Math.min(140, rawDotCount));

  for (let i = 0; i < dotCount; i++) {
    const angle = (i / dotCount) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    renderer.drawPixel(x, y, color, opacity);
  }
}

export function drawOrbitPaths(params: DrawOrbitPathsParams): void {
  if (!params.show) return;

  for (const planet of params.planets) {
    const radius = planet.orbitRadius * params.zoom;
    const orbitColor = mixRgb(params.darkGray, planet.color, 0.28);
    drawDottedCircle(
      params.renderer,
      params.sunScreenX,
      params.sunScreenY,
      radius,
      params.pixelSize,
      orbitColor,
      0.18
    );
  }
  for (const belt of params.belts) {
    const radius = belt.orbitRadius * params.zoom;
    const orbitColor = mixRgb(params.darkGray, params.midGray, 0.25);
    drawDottedCircle(
      params.renderer,
      params.sunScreenX,
      params.sunScreenY,
      radius,
      params.pixelSize,
      orbitColor,
      0.12
    );
  }
}
