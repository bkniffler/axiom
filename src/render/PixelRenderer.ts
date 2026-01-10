import type { Rgb } from '@/math/color';

export interface PixelRenderer {
  drawPixel(x: number, y: number, color: Rgb, opacity?: number): void;
  drawStarPixel(x: number, y: number, opacity: number): void;
  drawPixelAtSize(
    x: number,
    y: number,
    pixelSize: number,
    color: Rgb,
    opacity: number
  ): void;
  drawPixelCircle(
    cx: number,
    cy: number,
    radius: number,
    color: Rgb,
    opacity?: number,
    filled?: boolean
  ): void;
  drawPixelLine(
    x1: number,
    y: number,
    x2: number,
    color: Rgb,
    opacity?: number
  ): void;
  drawPixelVertLine(
    x: number,
    y1: number,
    y2: number,
    color: Rgb,
    opacity?: number
  ): void;
  fillRectLTRB(
    l: number,
    t: number,
    r: number,
    b: number,
    color: Rgb,
    opacity: number
  ): void;
}
