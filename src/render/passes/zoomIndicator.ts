import type { Rgb } from '@/math/color';
import { drawPixelText } from '@/ui/pixelTextDraw';
import type { PixelRenderer } from '../PixelRenderer';

interface DrawZoomIndicatorParams {
  renderer: PixelRenderer;
  width: number;
  height: number;
  zoom: number;
  pixelSize: number;
  lightGray: Rgb;
}

export function drawZoomIndicator(params: DrawZoomIndicatorParams): void {
  if (Math.abs(params.zoom - 1.0) < 0.05) return;

  const ps = params.pixelSize;
  const x = 20;
  const y = params.height - 50;
  const zoomPercent = Math.round(params.zoom * 100);
  const digits = zoomPercent.toString();
  const opacity = 0.25;

  drawPixelText(params.renderer, x, y, digits, params.lightGray, opacity, ps);

  const offsetX = x + digits.length * ps * 4;
  params.renderer.drawPixel(offsetX + ps, y, params.lightGray, opacity);
  params.renderer.drawPixel(offsetX, y + ps * 4, params.lightGray, opacity);
  params.renderer.drawPixel(
    offsetX + ps,
    y + ps * 2,
    params.lightGray,
    opacity
  );
}
