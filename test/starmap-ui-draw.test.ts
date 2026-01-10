import { describe, expect, it } from 'bun:test';
import type { PixelRenderer } from '../src/game/skia/starmap/render/PixelRenderer';
import { drawPixelText } from '../src/game/skia/starmap/ui/pixelTextDraw';

describe('pixelTextDraw', () => {
  it('draws pixels via drawPixelAtSize', () => {
    const pixels: Array<{ x: number; y: number; s: number }> = [];
    const renderer: PixelRenderer = {
      drawPixel() {},
      drawStarPixel() {},
      drawPixelCircle() {},
      drawPixelLine() {},
      drawPixelVertLine() {},
      fillRectLTRB() {},
      drawPixelAtSize(x, y, pixelSize) {
        pixels.push({ x, y, s: pixelSize });
      },
    };

    drawPixelText(renderer, 10, 20, 'A', [255, 255, 255], 1, 3);
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every((p) => p.s === 3)).toBe(true);
  });
});
