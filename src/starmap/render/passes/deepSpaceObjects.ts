import type { Rgb } from '../../math/color';
import type { PixelRenderer } from '../PixelRenderer';

export type DeepSpaceObject =
  | {
      kind: 'nebula';
      x: number;
      y: number;
      size: number;
      color: Rgb;
      opacity: number;
      points: { dx: number; dy: number; opacity: number }[];
    }
  | {
      kind: 'roguePlanet';
      x: number;
      y: number;
      size: number;
      color: Rgb;
      opacity: number;
    }
  | {
      kind: 'derelict';
      x: number;
      y: number;
      size: number;
      color: Rgb;
      opacity: number;
    }
  | {
      kind: 'beacon';
      x: number;
      y: number;
      size: number;
      color: Rgb;
      opacity: number;
      blinkSpeed: number;
    }
  | {
      kind: 'comet';
      x: number;
      y: number;
      size: number;
      color: Rgb;
      opacity: number;
      vx: number;
      vy: number;
      tail: number;
    };

export interface DrawDeepSpaceParams {
  renderer: PixelRenderer;
  objects: DeepSpaceObject[];
  elapsedSeconds: number;
  transitionProgress: number;
  pull: number;
  collapse: number;
  sceneFade: number;
  zoom: number;
  pixelSize: number;
  deepSpaceParallax: number;
  cx: number;
  cy: number;
  maxDim: number;
  worldToScreen: (
    wx: number,
    wy: number,
    parallax: number
  ) => { x: number; y: number };
  lightGray: Rgb;
  white: Rgb;
}

function collapsePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  maxDim: number,
  z: number,
  pull: number,
  collapse: number
): { x: number; y: number } {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0.0001) return { x, y };
  const nd = Math.min(1, dist / (maxDim * 0.55 * z));
  const angle = Math.atan2(dy, dx) + pull * 1.4 * (1 - nd) * (1 - nd);
  return {
    x: cx + Math.cos(angle) * dist * collapse,
    y: cy + Math.sin(angle) * dist * collapse,
  };
}

export function drawDeepSpaceObjects(params: DrawDeepSpaceParams): void {
  for (const obj of params.objects) {
    let { x, y } = params.worldToScreen(obj.x, obj.y, params.deepSpaceParallax);
    let opacity = obj.opacity * params.sceneFade;

    if (params.transitionProgress > 0) {
      const collapsed = collapsePoint(
        x,
        y,
        params.cx,
        params.cy,
        params.maxDim,
        params.zoom,
        params.pull,
        params.collapse
      );
      x = collapsed.x;
      y = collapsed.y;
      opacity *= 0.55;
    }

    const objRadius =
      (obj.kind === 'nebula' ? obj.size : obj.size * 2) * params.zoom;
    const margin = objRadius + 60;
    if (
      x < -margin ||
      x > params.cx * 2 + margin ||
      y < -margin ||
      y > params.cy * 2 + margin
    )
      continue;

    if (opacity <= 0.01) continue;

    switch (obj.kind) {
      case 'nebula': {
        const tick = Math.floor(params.elapsedSeconds * 12);
        for (let i = 0; i < obj.points.length; i++) {
          const pt = obj.points[i];
          const px = x + pt.dx * params.zoom;
          const py = y + pt.dy * params.zoom;
          const o = opacity * pt.opacity;
          if (o < 0.05) continue;
          if ((i + tick) % 6 !== 0)
            params.renderer.drawPixel(px, py, obj.color, o);
        }
        break;
      }
      case 'roguePlanet': {
        params.renderer.drawPixelCircle(
          x,
          y,
          obj.size * params.zoom,
          obj.color,
          opacity,
          true
        );
        params.renderer.drawPixel(
          x - obj.size * 0.4 * params.zoom,
          y - obj.size * 0.4 * params.zoom,
          params.lightGray,
          opacity * 0.25
        );
        break;
      }
      case 'derelict': {
        const ps = params.pixelSize * params.zoom;
        const s = Math.max(ps, obj.size * params.zoom);
        params.renderer.drawPixelLine(
          x - s,
          y,
          x + s,
          obj.color,
          opacity * 0.6
        );
        params.renderer.drawPixelLine(
          x - s * 0.5,
          y - ps,
          x + s * 0.5,
          obj.color,
          opacity * 0.6
        );
        params.renderer.drawPixel(
          x + s * 0.2,
          y + ps,
          params.lightGray,
          opacity * 0.35
        );
        params.renderer.drawPixel(
          x - s * 0.6,
          y + ps * 2,
          obj.color,
          opacity * 0.3
        );
        break;
      }
      case 'beacon': {
        const blink = Math.sin(params.elapsedSeconds * obj.blinkSpeed);
        const on = blink > -0.2;
        const o = opacity * (on ? 1 : 0.35);
        const ps = params.pixelSize * params.zoom;
        params.renderer.drawPixelCircle(
          x,
          y,
          obj.size * params.zoom,
          obj.color,
          o,
          true
        );
        params.renderer.drawPixel(x + ps, y, params.white, o * 0.35);
        params.renderer.drawPixel(x - ps, y, params.white, o * 0.25);
        break;
      }
      case 'comet': {
        const headR = obj.size * params.zoom;
        params.renderer.drawPixelCircle(x, y, headR, obj.color, opacity, true);

        const len = obj.tail;
        const v = Math.hypot(obj.vx, obj.vy) || 1;
        const tx = -(obj.vx / v);
        const ty = -(obj.vy / v);

        for (let i = 1; i <= len; i++) {
          const t = i / len;
          const px = x + tx * i * params.pixelSize * params.zoom * 0.9;
          const py = y + ty * i * params.pixelSize * params.zoom * 0.9;
          const o = opacity * (1 - t) * 0.6;
          if (o > 0.05) params.renderer.drawPixel(px, py, params.lightGray, o);
        }
        break;
      }
    }
  }
}
