import type { Rgb } from '../../math/color';
import type { PixelRenderer } from '../PixelRenderer';

interface Asteroid {
  angleOffset: number;
  radiusOffset: number;
  size: number; // world size (in same units used by renderer calls via worldToScreen)
}

interface AsteroidBelt {
  orbitRadius: number;
  angle: number;
  color: Rgb;
  asteroids: Asteroid[];
}

interface DrawAsteroidBeltsParams {
  renderer: PixelRenderer;
  belts: AsteroidBelt[];
  transitionProgress: number;
  zoom: number;
  pixelSize: number;
  worldToScreen: (wx: number, wy: number) => { x: number; y: number };
}

export function drawAsteroidBelts(params: DrawAsteroidBeltsParams): void {
  if (params.transitionProgress > 0) return;

  for (const belt of params.belts) {
    for (const a of belt.asteroids) {
      const angle = belt.angle + a.angleOffset;
      const radiusWorld = belt.orbitRadius + a.radiusOffset;
      const wx = Math.cos(angle) * radiusWorld;
      const wy = Math.sin(angle) * radiusWorld;
      const { x, y } = params.worldToScreen(wx, wy);
      const opacity = 0.35 + (a.size > params.pixelSize ? 0.2 : 0);
      if (a.size <= params.pixelSize) {
        params.renderer.drawPixel(x, y, belt.color, opacity);
      } else {
        params.renderer.drawPixelCircle(
          x,
          y,
          a.size * params.zoom,
          belt.color,
          opacity,
          true
        );
      }
    }
  }
}
