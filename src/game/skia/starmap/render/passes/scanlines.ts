import type { PixelRenderer } from '../PixelRenderer';
import type { Rgb } from '../../math/color';

export interface DrawScanlinesParams {
    renderer: PixelRenderer;
    width: number;
    height: number;
    pixelSize: number;
    transitionProgress: number;
    color: Rgb;
}

export function drawScanlines(params: DrawScanlinesParams): void {
    const opacity = 0.08 * (1 - params.transitionProgress * 0.5);
    if (opacity <= 0) return;

    for (let y = 0; y < params.height; y += params.pixelSize * 2) {
        params.renderer.fillRectLTRB(0, y, params.width, y + 1, params.color, opacity);
    }
}

