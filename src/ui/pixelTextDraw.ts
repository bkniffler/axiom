import type { Rgb } from '@/math/color';
import type { PixelRenderer } from '@/render/PixelRenderer';
import { FONT_3X5 } from './pixelFont3x5';

function drawPixelChar(
  renderer: PixelRenderer,
  x: number,
  y: number,
  char: string,
  color: Rgb,
  opacity: number,
  pixelSize: number
): void {
  const pattern = FONT_3X5[char.toUpperCase()];
  if (!pattern) return;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (pattern[row] & (1 << (2 - col))) {
        renderer.drawPixelAtSize(
          x + col * pixelSize,
          y + row * pixelSize,
          pixelSize,
          color,
          opacity
        );
      }
    }
  }
}

export function drawPixelText(
  renderer: PixelRenderer,
  x: number,
  y: number,
  text: string,
  color: Rgb,
  opacity: number,
  pixelSize: number
): void {
  let offsetX = x;
  const t = text.toUpperCase();
  for (const char of t) {
    if (char === ' ') {
      offsetX += pixelSize * 3;
      continue;
    }
    drawPixelChar(renderer, offsetX, y, char, color, opacity, pixelSize);
    offsetX += pixelSize * 4;
  }
}
