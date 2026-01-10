import type { Rgb } from '../../math/color';
import type { PixelRenderer } from '../PixelRenderer';

type OrbitingObjectKind = 'station' | 'probe' | 'ship';

interface OrbitingObject {
  kind: OrbitingObjectKind;
  orbitRadius: number;
  angle: number;
  size: number;
  color: Rgb;
  blinkSpeed?: number;
}

interface DrawOrbitingObjectsParams {
  renderer: PixelRenderer;
  objects: OrbitingObject[];
  elapsedSeconds: number;
  transitionProgress: number;
  zoom: number;
  pixelSize: number;
  white: Rgb;
  lightGray: Rgb;
  worldToScreen: (wx: number, wy: number) => { x: number; y: number };
}

export function drawOrbitingObjects(params: DrawOrbitingObjectsParams): void {
  if (params.transitionProgress > 0) return;

  for (const obj of params.objects) {
    const wx = Math.cos(obj.angle) * obj.orbitRadius;
    const wy = Math.sin(obj.angle) * obj.orbitRadius;
    let { x, y } = params.worldToScreen(wx, wy);

    x +=
      Math.sin(params.elapsedSeconds * 1.7 + obj.orbitRadius * 0.01) *
      params.pixelSize *
      0.15;
    y +=
      Math.cos(params.elapsedSeconds * 1.9 + obj.orbitRadius * 0.01) *
      params.pixelSize *
      0.15;

    switch (obj.kind) {
      case 'station': {
        const o = 0.65;
        const ps = params.pixelSize * params.zoom;
        params.renderer.drawPixel(x, y, obj.color, o);
        params.renderer.drawPixel(x - ps, y, obj.color, o);
        params.renderer.drawPixel(x + ps, y, obj.color, o);
        params.renderer.drawPixel(x, y - ps, obj.color, o);
        params.renderer.drawPixel(x, y + ps, obj.color, o);
        params.renderer.drawPixel(x, y, params.white, 0.4);
        break;
      }
      case 'probe': {
        const blink = obj.blinkSpeed
          ? Math.sin(params.elapsedSeconds * obj.blinkSpeed)
          : 1;
        const opacity = 0.35 + Math.max(0, blink) * 0.45;
        params.renderer.drawPixelCircle(
          x,
          y,
          obj.size * params.zoom,
          obj.color,
          opacity,
          true
        );
        break;
      }
      case 'ship': {
        const ps = params.pixelSize * params.zoom;
        params.renderer.drawPixel(x, y, obj.color, 0.7);
        params.renderer.drawPixel(x - ps, y + ps, obj.color, 0.55);
        params.renderer.drawPixel(x + ps, y + ps, obj.color, 0.55);
        params.renderer.drawPixel(x, y + ps, params.lightGray, 0.35);
        break;
      }
    }
  }
}
