import type { Rgb } from '../../math/color';
import { mixRgb } from '../../math/color';
import { drawPixelText } from '../../ui/pixelTextDraw';
import type { PixelRenderer } from '../PixelRenderer';

interface PlanetMoon {
  orbitRadius: number;
  angle: number;
  size: number;
}

interface PlanetSprite {
  name: string;
  type: string;
  description: string;
  orbitRadius: number;
  angle: number;
  size: number;
  color: Rgb;
  hasRing?: boolean;
  moon?: PlanetMoon;
}

interface ShakeOffset {
  seed: number;
  delay: number;
}

interface DrawPlanetsParams {
  renderer: PixelRenderer;
  planets: PlanetSprite[];
  shakeOffsets: ShakeOffset[];
  selectedPlanetIndex: number;
  elapsedSeconds: number;
  shakePhase: number;
  zoom: number;
  pixelSize: number;
  white: Rgb;
  lightGray: Rgb;
  worldToScreen: (wx: number, wy: number) => { x: number; y: number };
}

function getPlanetWorldPosition(planet: {
  orbitRadius: number;
  angle: number;
}): { x: number; y: number } {
  return {
    x: Math.cos(planet.angle) * planet.orbitRadius,
    y: Math.sin(planet.angle) * planet.orbitRadius,
  };
}

export function drawPlanets(params: DrawPlanetsParams): void {
  const z = params.zoom;
  const psWorld = params.pixelSize;

  for (let i = 0; i < params.planets.length; i++) {
    const planet = params.planets[i];
    const shakeOffset = params.shakeOffsets[i];

    const w = getPlanetWorldPosition(planet);
    let { x: px, y: py } = params.worldToScreen(w.x, w.y);

    const scaledSize = planet.size * z;
    const isSelected = i === params.selectedPlanetIndex;

    if (params.shakePhase > 0 && shakeOffset) {
      const planetShakePhase =
        Math.max(0, params.shakePhase - shakeOffset.delay) /
        (1 - shakeOffset.delay);
      if (planetShakePhase > 0) {
        const shakeIntensity = planetShakePhase * planetShakePhase * 0.8 * z;
        const t = params.elapsedSeconds * 20 + shakeOffset.seed;
        px += Math.sin(t * 1.3) * shakeIntensity * psWorld;
        py += Math.cos(t * 1.7) * shakeIntensity * psWorld;
      }
    }

    params.renderer.drawPixelCircle(px, py, scaledSize, planet.color, 1, true);
    params.renderer.drawPixel(
      px - scaledSize * 0.5,
      py - scaledSize * 0.5,
      params.white,
      0.5
    );

    if (planet.hasRing) {
      const ringWidth = scaledSize * 2.5;
      params.renderer.drawPixelLine(
        px - ringWidth,
        py,
        px + ringWidth,
        params.lightGray,
        0.6
      );
    }

    if (isSelected) {
      const pulse = 0.5 + 0.5 * Math.sin(params.elapsedSeconds * 2.6);
      const ringColor = mixRgb(planet.color, params.white, 0.35);
      const ringRadius = scaledSize + psWorld * z * (3 + pulse * 1.5);
      const ringOpacity = 0.25 + pulse * 0.25;

      params.renderer.drawPixelCircle(
        px,
        py,
        ringRadius,
        ringColor,
        ringOpacity,
        false
      );

      const tickR = ringRadius + psWorld * z * 0.5;
      params.renderer.drawPixel(px + tickR, py, ringColor, ringOpacity * 0.9);
      params.renderer.drawPixel(px - tickR, py, ringColor, ringOpacity * 0.9);
      params.renderer.drawPixel(px, py + tickR, ringColor, ringOpacity * 0.9);
      params.renderer.drawPixel(px, py - tickR, ringColor, ringOpacity * 0.9);
    }

    if (planet.moon) {
      const mwx = w.x + Math.cos(planet.moon.angle) * planet.moon.orbitRadius;
      const mwy = w.y + Math.sin(planet.moon.angle) * planet.moon.orbitRadius;
      let { x: mx, y: my } = params.worldToScreen(mwx, mwy);

      if (params.shakePhase > 0 && shakeOffset) {
        const planetShakePhase =
          Math.max(0, params.shakePhase - shakeOffset.delay) /
          (1 - shakeOffset.delay);
        if (planetShakePhase > 0) {
          const shakeIntensity = planetShakePhase * planetShakePhase * 0.6 * z;
          const t = params.elapsedSeconds * 20 + shakeOffset.seed + 500;
          mx += Math.sin(t * 1.5) * shakeIntensity * psWorld;
          my += Math.cos(t * 1.9) * shakeIntensity * psWorld;
        }
      }
      params.renderer.drawPixel(mx, my, params.lightGray, 0.8);
    }
  }
}

interface DrawHoverLabelParams {
  renderer: PixelRenderer;
  planet: PlanetSprite;
  zoom: number;
  pixelSize: number;
  worldToScreen: (wx: number, wy: number) => { x: number; y: number };
  color: Rgb;
  opacity: number;
}

export function drawPlanetHoverLabel(params: DrawHoverLabelParams): void {
  const w = getPlanetWorldPosition(params.planet);
  const { x: px, y: py } = params.worldToScreen(w.x, w.y);
  const scaledSize = params.planet.size * params.zoom;
  const labelX = px + scaledSize + 12;
  const labelY = py - 8;
  drawPixelText(
    params.renderer,
    labelX,
    labelY,
    params.planet.name.toUpperCase(),
    params.color,
    params.opacity,
    params.pixelSize
  );
}
