import { describe, expect, it } from 'bun:test';
import type { PixelRenderer } from '../src/game/skia/starmap/render/PixelRenderer';
import { drawOrbitPaths } from '../src/game/skia/starmap/render/passes/orbitPaths';
import { mixRgb } from '../src/game/skia/starmap/math/color';

describe('drawOrbitPaths', () => {
    it('draws planet-tinted orbit dots when enabled', () => {
        const calls: Array<{ x: number; y: number; color: number[]; opacity: number }> = [];
        const renderer: PixelRenderer = {
            drawPixel(x, y, color, opacity = 1) {
                calls.push({ x, y, color, opacity });
            },
            drawStarPixel() {},
            drawPixelAtSize() {},
            drawPixelCircle() {},
            drawPixelLine() {},
            drawPixelVertLine() {},
            fillRectLTRB() {},
        };

        const planetColor = [10, 200, 30];
        const orbitColor = mixRgb([50, 50, 50], planetColor, 0.28);

        drawOrbitPaths({
            renderer,
            show: true,
            sunScreenX: 400,
            sunScreenY: 300,
            zoom: 1,
            pixelSize: 3,
            planets: [{ orbitRadius: 100, color: planetColor }],
            belts: [],
            darkGray: [50, 50, 50],
            midGray: [100, 100, 100],
        });

        expect(calls.length).toBeGreaterThan(0);
        expect(calls.some((c) => c.opacity === 0.18)).toBe(true);
        expect(calls.some((c) => c.color[0] === orbitColor[0] && c.color[1] === orbitColor[1] && c.color[2] === orbitColor[2])).toBe(true);
    });
});
