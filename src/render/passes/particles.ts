import type { Rgb } from '../../math/color';
import type { PixelRenderer } from '../PixelRenderer';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: Rgb;
  life: number;
  maxLife: number;
  size: number;
}

interface DrawParticlesParams {
  renderer: PixelRenderer;
  particles: Particle[];
  rand?: () => number;
}

export function drawParticles(params: DrawParticlesParams): void {
  const rand = params.rand ?? Math.random;
  for (const p of params.particles) {
    const opacity = p.life * 0.9;
    if (opacity <= 0.05) continue;
    if (rand() > 0.08) params.renderer.drawPixel(p.x, p.y, p.color, opacity);
  }
}
