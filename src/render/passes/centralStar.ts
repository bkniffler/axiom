import type { Rgb } from '@/math/color';
import type { PixelRenderer } from '../PixelRenderer';

interface DrawCentralStarParams {
  renderer: PixelRenderer;
  sunX: number;
  sunY: number;
  zoom: number;
  pixelSize: number;
  pulse: boolean;
  white: Rgb;
  lightGray: Rgb;
}

export function drawCentralStar(params: DrawCentralStarParams): void {
  const z = params.zoom;
  const starSize = (params.pulse ? 2 : 1) * z;
  params.renderer.drawPixelCircle(
    params.sunX,
    params.sunY,
    starSize * params.pixelSize,
    params.white,
    1,
    true
  );
  const flareLen = (params.pulse ? 4 : 3) * params.pixelSize * z;
  params.renderer.drawPixelLine(
    params.sunX - flareLen,
    params.sunY,
    params.sunX + flareLen,
    params.lightGray,
    0.6
  );
  params.renderer.drawPixelVertLine(
    params.sunX,
    params.sunY - flareLen,
    params.sunY + flareLen,
    params.lightGray,
    0.6
  );
}
