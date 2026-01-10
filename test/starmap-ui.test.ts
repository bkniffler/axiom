import { describe, expect, it } from 'bun:test';
import { measurePixelTextWidth, wrapPixelText } from '../src/game/skia/starmap/ui/pixelFont3x5';
import { layoutPlanetInfoPanel } from '../src/game/skia/starmap/ui/infoPanelLayout';

describe('pixelFont3x5', () => {
    it('measures text width with fixed spacing', () => {
        expect(measurePixelTextWidth('A', 2)).toBe(8);
        expect(measurePixelTextWidth(' ', 2)).toBe(6);
        expect(measurePixelTextWidth('A A', 2)).toBe(8 + 6 + 8);
    });

    it('wraps text without exceeding max width', () => {
        const pixelSize = 2;
        const maxWidth = 20;
        const lines = wrapPixelText('HELLO WORLD', maxWidth, pixelSize);
        expect(lines.length).toBeGreaterThanOrEqual(2);
        for (const line of lines) {
            expect(measurePixelTextWidth(line, pixelSize)).toBeLessThanOrEqual(maxWidth);
        }
    });

    it('splits a single long word to avoid overflow', () => {
        const pixelSize = 2;
        const maxWidth = 20;
        const lines = wrapPixelText('SUPERCALIFRAGILISTIC', maxWidth, pixelSize);
        expect(lines.length).toBeGreaterThan(1);
        for (const line of lines) {
            expect(measurePixelTextWidth(line, pixelSize)).toBeLessThanOrEqual(maxWidth);
        }
    });
});

describe('layoutPlanetInfoPanel', () => {
    it('sizes panel to content and clamps to viewport', () => {
        const pixelSize = 3;
        const layout = layoutPlanetInfoPanel({
            viewportWidth: 800,
            viewportHeight: 600,
            pixelSize,
            name: 'Verdant',
            type: 'Garden World',
            description: 'A temperate world wrapped in dense cloud bands and emerald continents.',
        });

        expect(layout.panelX).toBeGreaterThanOrEqual(0);
        expect(layout.panelY).toBeGreaterThanOrEqual(0);
        expect(layout.panelWidth).toBeGreaterThanOrEqual(190);
        expect(layout.panelWidth).toBeLessThanOrEqual(340);
        expect(layout.panelHeight).toBeGreaterThanOrEqual(120);

        const contentWidth = layout.panelWidth - layout.paddingX * 2;
        for (const line of layout.descLines) {
            expect(measurePixelTextWidth(line, pixelSize)).toBeLessThanOrEqual(contentWidth);
        }
    });

    it('truncates description with ellipsis when height is constrained', () => {
        const layout = layoutPlanetInfoPanel({
            viewportWidth: 420,
            viewportHeight: 140,
            pixelSize: 3,
            name: 'Nebulos',
            type: 'Gas Giant',
            description:
                'A massive gas giant with swirling storms and a spectacular ring system. Vast stations orbit within its belts.',
        });
        expect(layout.descLines.length).toBeGreaterThan(0);
        expect(layout.descLines[layout.descLines.length - 1]).toBe('...');
    });
});
