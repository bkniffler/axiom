import type { CanvasKit, Canvas, Paint } from 'canvaskit-wasm';
import type { PixelRenderer } from './PixelRenderer';
import type { Rgb } from '../math/color';

export class SkiaPixelRenderer implements PixelRenderer {
    private readonly CK: CanvasKit;
    private readonly canvas: Canvas;
    private readonly paint: Paint;
    private readonly pixelSize: number;
    private readonly starPixelSize: number;
    private readonly white: Rgb;

    constructor(params: {
        CanvasKit: CanvasKit;
        canvas: Canvas;
        paint: Paint;
        pixelSize: number;
        starPixelSize: number;
        white: Rgb;
    }) {
        this.CK = params.CanvasKit;
        this.canvas = params.canvas;
        this.paint = params.paint;
        this.pixelSize = params.pixelSize;
        this.starPixelSize = params.starPixelSize;
        this.white = params.white;
    }

    private snap(v: number): number {
        return Math.floor(v / this.pixelSize) * this.pixelSize;
    }

    private snapTo(v: number, pixelSize: number): number {
        return Math.floor(v / pixelSize) * pixelSize;
    }

    drawPixel(x: number, y: number, color: Rgb, opacity: number = 1): void {
        const sx = this.snap(x);
        const sy = this.snap(y);
        this.paint.setColor(this.CK.Color(color[0], color[1], color[2], opacity));
        this.canvas.drawRect(this.CK.LTRBRect(sx, sy, sx + this.pixelSize, sy + this.pixelSize), this.paint);
    }

    drawStarPixel(x: number, y: number, opacity: number): void {
        const ps = this.starPixelSize;
        const sx = this.snapTo(x, ps);
        const sy = this.snapTo(y, ps);
        this.paint.setColor(this.CK.Color(this.white[0], this.white[1], this.white[2], opacity));
        this.canvas.drawRect(this.CK.LTRBRect(sx, sy, sx + ps, sy + ps), this.paint);
    }

    drawPixelAtSize(x: number, y: number, pixelSize: number, color: Rgb, opacity: number): void {
        const sx = this.snapTo(x, pixelSize);
        const sy = this.snapTo(y, pixelSize);
        this.paint.setColor(this.CK.Color(color[0], color[1], color[2], opacity));
        this.canvas.drawRect(this.CK.LTRBRect(sx, sy, sx + pixelSize, sy + pixelSize), this.paint);
    }

    drawPixelCircle(cx: number, cy: number, radius: number, color: Rgb, opacity: number = 1, filled: boolean = true): void {
        const r = Math.max(1, Math.floor(radius / this.pixelSize));
        const scx = this.snap(cx);
        const scy = this.snap(cy);

        this.paint.setColor(this.CK.Color(color[0], color[1], color[2], opacity));

        if (filled) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy <= r * r) {
                        const px = scx + dx * this.pixelSize;
                        const py = scy + dy * this.pixelSize;
                        this.canvas.drawRect(this.CK.LTRBRect(px, py, px + this.pixelSize, py + this.pixelSize), this.paint);
                    }
                }
            }
            return;
        }

        const drawPixelAt = (x: number, y: number) => {
            this.paint.setColor(this.CK.Color(color[0], color[1], color[2], opacity));
            this.canvas.drawRect(this.CK.LTRBRect(x, y, x + this.pixelSize, y + this.pixelSize), this.paint);
        };

        let x = r;
        let y = 0;
        let err = 1 - r;

        while (x >= y) {
            drawPixelAt(scx + x * this.pixelSize, scy + y * this.pixelSize);
            drawPixelAt(scx + y * this.pixelSize, scy + x * this.pixelSize);
            drawPixelAt(scx - y * this.pixelSize, scy + x * this.pixelSize);
            drawPixelAt(scx - x * this.pixelSize, scy + y * this.pixelSize);
            drawPixelAt(scx - x * this.pixelSize, scy - y * this.pixelSize);
            drawPixelAt(scx - y * this.pixelSize, scy - x * this.pixelSize);
            drawPixelAt(scx + y * this.pixelSize, scy - x * this.pixelSize);
            drawPixelAt(scx + x * this.pixelSize, scy - y * this.pixelSize);

            y++;
            if (err < 0) err += 2 * y + 1;
            else {
                x--;
                err += 2 * (y - x) + 1;
            }
        }
    }

    drawPixelLine(x1: number, y: number, x2: number, color: Rgb, opacity: number = 1): void {
        const sy = this.snap(y);
        const sx1 = this.snap(Math.min(x1, x2));
        const sx2 = this.snap(Math.max(x1, x2));
        this.paint.setColor(this.CK.Color(color[0], color[1], color[2], opacity));
        for (let x = sx1; x <= sx2; x += this.pixelSize) {
            this.canvas.drawRect(this.CK.LTRBRect(x, sy, x + this.pixelSize, sy + this.pixelSize), this.paint);
        }
    }

    drawPixelVertLine(x: number, y1: number, y2: number, color: Rgb, opacity: number = 1): void {
        const sx = this.snap(x);
        const sy1 = this.snap(Math.min(y1, y2));
        const sy2 = this.snap(Math.max(y1, y2));
        this.paint.setColor(this.CK.Color(color[0], color[1], color[2], opacity));
        for (let y = sy1; y <= sy2; y += this.pixelSize) {
            this.canvas.drawRect(this.CK.LTRBRect(sx, y, sx + this.pixelSize, y + this.pixelSize), this.paint);
        }
    }

    fillRectLTRB(l: number, t: number, r: number, b: number, color: Rgb, opacity: number): void {
        this.paint.setColor(this.CK.Color(color[0], color[1], color[2], opacity));
        this.canvas.drawRect(this.CK.LTRBRect(l, t, r, b), this.paint);
    }
}
