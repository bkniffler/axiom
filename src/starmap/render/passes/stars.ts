import type { PixelRenderer } from '../PixelRenderer';

export interface StarSprite {
  x: number;
  y: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export interface DrawStarsParams {
  renderer: PixelRenderer;
  stars: StarSprite[];
  elapsedSeconds: number;
  transitionProgress: number;
  sceneFade: number;
  zoom: number;
  cx: number;
  cy: number;
  maxDim: number;
  starParallax: number;
  worldToScreen: (
    wx: number,
    wy: number,
    parallax: number
  ) => { x: number; y: number };
}

export function drawStars(params: DrawStarsParams): void {
  const p = Math.max(0, Math.min(1, params.transitionProgress));
  const pull = p * p;
  const collapse = Math.max(0.02, 1 - pull * 0.98);

  for (const star of params.stars) {
    const twinkle = Math.sin(
      params.elapsedSeconds * star.twinkleSpeed + star.twinklePhase
    );
    if (twinkle < -0.3) continue;

    const { x: sx, y: sy } = params.worldToScreen(
      star.x - params.cx,
      star.y - params.cy,
      params.starParallax
    );
    let x = sx;
    let y = sy;
    let brightness = star.brightness * params.sceneFade;

    if (p > 0) {
      const dx = x - params.cx;
      const dy = y - params.cy;
      const dist = Math.hypot(dx, dy);
      const nd = Math.min(1, dist / (params.maxDim * 0.55 * params.zoom));
      const angle = Math.atan2(dy, dx) + pull * 1.4 * (1 - nd) * (1 - nd);
      x = params.cx + Math.cos(angle) * dist * collapse;
      y = params.cy + Math.sin(angle) * dist * collapse;
      brightness *= 0.55;
    }

    if (brightness <= 0.1) continue;
    const level = brightness > 0.7 ? 0.55 : brightness > 0.4 ? 0.32 : 0.18;
    params.renderer.drawStarPixel(x, y, level);
  }
}
