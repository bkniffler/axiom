import type { CanvasKit, Surface, Paint, Font, Typeface } from 'canvaskit-wasm';
import { SkiaMenuStyle, MenuCallbacks } from './SkiaMenu';

interface RainDrop {
    x: number;
    y: number;
    speed: number;
    length: number;
    opacity: number;
}

interface RainChar {
    x: number;
    y: number;
    speed: number;
    char: string;
    opacity: number;
}

export class DataRainStyle extends SkiaMenuStyle {
    private drops: RainDrop[] = [];
    private chars: RainChar[] = [];
    private lastTime = 0;

    private readonly DROP_COUNT = 40;
    private readonly CHAR_COUNT = 20;
    private readonly CHARS = '0123456789ABCDEF';

    private dropPaint!: Paint;
    private charPaint!: Paint;
    private charFont!: Font;
    private disposedStyle = false;

    constructor(CanvasKit: CanvasKit, surface: Surface, callbacks: MenuCallbacks, width: number, height: number, typeface: Typeface | null) {
        super(CanvasKit, surface, callbacks, width, height, typeface);
    }

    protected createVisuals(): void {
        const CK = this.CanvasKit;
        this.lastTime = performance.now();

        // Drop paint
        this.dropPaint = new CK.Paint();
        this.dropPaint.setColor(CK.Color(255, 255, 255, 0.1));
        this.dropPaint.setStyle(CK.PaintStyle.Stroke);
        this.dropPaint.setStrokeWidth(1);
        this.dropPaint.setAntiAlias(true);

        // Char paint
        this.charPaint = new CK.Paint();
        this.charPaint.setColor(CK.Color(255, 255, 255, 0.15));
        this.charPaint.setAntiAlias(true);

        // Char font
        this.charFont = new CK.Font(this.typeface, 14);

        // Create rain drops
        for (let i = 0; i < this.DROP_COUNT; i++) {
            this.drops.push(this.createDrop());
        }

        // Create rain characters
        for (let i = 0; i < this.CHAR_COUNT; i++) {
            this.chars.push(this.createChar());
        }
    }

    private createDrop(): RainDrop {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height - this.height,
            speed: 80 + Math.random() * 120,
            length: 30 + Math.random() * 60,
            opacity: 0.05 + Math.random() * 0.15
        };
    }

    private createChar(): RainChar {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height - this.height,
            speed: 40 + Math.random() * 60,
            char: this.CHARS[Math.floor(Math.random() * this.CHARS.length)],
            opacity: 0.1 + Math.random() * 0.2
        };
    }

    protected animate(time: number): void {
        const CK = this.CanvasKit;
        const delta = (time - this.lastTime) / 1000;
        this.lastTime = time;
        const elapsed = time / 1000;

        // Draw and update drops
        this.drops.forEach(drop => {
            drop.y += drop.speed * delta;

            if (drop.y > this.height + drop.length) {
                drop.y = -drop.length;
                drop.x = Math.random() * this.width;
            }

            // Set opacity and draw line
            this.dropPaint.setColor(CK.Color(255, 255, 255, drop.opacity));
            this.canvas.drawLine(
                drop.x, drop.y,
                drop.x, drop.y + drop.length,
                this.dropPaint
            );
        });

        // Draw and update chars
        this.chars.forEach(char => {
            char.y += char.speed * delta;

            if (char.y > this.height + 20) {
                char.y = -20;
                char.x = Math.random() * this.width;
                char.char = this.CHARS[Math.floor(Math.random() * this.CHARS.length)];
            }

            // Flicker effect
            let opacity = char.opacity;
            if (Math.random() < 0.005) {
                opacity = 0.5;
            } else {
                opacity = char.opacity * (0.8 + 0.2 * Math.sin(elapsed * 5 + char.x));
            }

            this.charPaint.setColor(CK.Color(255, 255, 255, opacity));
            this.canvas.drawText(char.char, char.x, char.y, this.charPaint, this.charFont);
        });
    }

    destroy(): void {
        if (this.disposedStyle) return;
        this.disposedStyle = true;
        super.destroy();
        this.dropPaint.delete();
        this.charPaint.delete();
        this.charFont.delete();
        this.drops = [];
        this.chars = [];
    }
}
