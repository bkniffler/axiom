import type { CanvasKit, Surface, Paint, Typeface } from 'canvaskit-wasm';
import { SkiaMenuStyle, MenuCallbacks } from './SkiaMenu';

interface WarpLine {
    angle: number;
    speed: number;
    length: number;
    startRadius: number;
}

export class ConcentricRingsStyle extends SkiaMenuStyle {
    private readonly RING_COUNT = 5;
    private ringPaints: Paint[] = [];
    private startTime = 0;

    // Warp effect
    private warpLines: WarpLine[] = [];
    private readonly WARP_LINE_COUNT = 80;
    private disposedStyle = false;

    constructor(CanvasKit: CanvasKit, surface: Surface, callbacks: MenuCallbacks, width: number, height: number, typeface: Typeface | null) {
        super(CanvasKit, surface, callbacks, width, height, typeface);
        this.initWarpLines();
    }

    private initWarpLines(): void {
        for (let i = 0; i < this.WARP_LINE_COUNT; i++) {
            this.warpLines.push({
                angle: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.5,
                length: 50 + Math.random() * 150,
                startRadius: 0.3 + Math.random() * 0.7 // 0.3 to 1.0 of max radius
            });
        }
    }

    protected createVisuals(): void {
        const CK = this.CanvasKit;
        this.startTime = performance.now();

        // Create paints for each ring with different opacities
        for (let i = 0; i < this.RING_COUNT; i++) {
            const paint = new CK.Paint();
            paint.setColor(CK.Color(255, 255, 255, 0.15 - i * 0.02));
            paint.setStyle(CK.PaintStyle.Stroke);
            paint.setStrokeWidth(1);
            paint.setAntiAlias(true);
            this.ringPaints.push(paint);
        }
    }

    protected animate(time: number): void {
        const CK = this.CanvasKit;
        const elapsed = (time - this.startTime) / 1000;
        const cx = this.width / 2;
        const cy = this.height / 2;
        const maxRadius = Math.max(this.width, this.height) * 0.45;

        const transitionProgress = this.getTransitionProgress();

        // Easing functions
        const easeInExpo = (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10);
        const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        // === DRAW RINGS (fade out during transition) ===
        const ringOpacityMultiplier = transitionProgress > 0 ? Math.max(0, 1 - transitionProgress * 3) : 1;

        for (let i = 0; i < this.RING_COUNT; i++) {
            const baseRadius = (i + 1) * (maxRadius / this.RING_COUNT);
            const breathe = Math.sin(elapsed * 0.5 + i * 0.5) * 8;
            const radius = baseRadius + breathe;

            const baseOpacity = 0.15 - i * 0.02;
            const opacityPulse = 0.8 + 0.2 * Math.sin(elapsed * 0.3 + i);
            const opacity = baseOpacity * opacityPulse * ringOpacityMultiplier;

            this.ringPaints[i].setColor(CK.Color(255, 255, 255, opacity));
            this.canvas.drawCircle(cx, cy, radius, this.ringPaints[i]);
        }

        // === WARP TUNNEL EFFECT ===
        if (transitionProgress > 0) {
            const warpPaint = new CK.Paint();
            warpPaint.setStyle(CK.PaintStyle.Stroke);
            warpPaint.setAntiAlias(true);

            // Phase 1: Lines appear and stretch toward center (0-0.4)
            // Phase 2: Lines accelerate into center with motion blur (0.4-0.7)
            // Phase 3: White flash and fade to black (0.7-1.0)

            const screenDiagonal = Math.sqrt(this.width * this.width + this.height * this.height);

            for (const line of this.warpLines) {
                const cos = Math.cos(line.angle);
                const sin = Math.sin(line.angle);

                let lineOpacity = 0;
                let lineStart = 0;
                let lineEnd = 0;
                let lineWidth = 1;

                if (transitionProgress < 0.5) {
                    // Phase 1: Lines fade in and start moving
                    const phase = transitionProgress / 0.5;
                    const eased = easeInOutCubic(phase);

                    lineOpacity = phase * 0.6;
                    const outerRadius = screenDiagonal * line.startRadius;
                    const innerRadius = outerRadius * (1 - eased * 0.3);

                    lineStart = innerRadius;
                    lineEnd = outerRadius;
                    lineWidth = 1 + eased * 2;

                } else if (transitionProgress < 0.8) {
                    // Phase 2: Lines accelerate into center with stretching
                    const phase = (transitionProgress - 0.5) / 0.3;
                    const eased = easeInExpo(phase);

                    lineOpacity = 0.6 + phase * 0.4;
                    const outerRadius = screenDiagonal * line.startRadius * (1 - eased * 0.95);
                    const stretch = line.length * (1 + eased * 4); // Lines stretch as they speed up

                    lineStart = Math.max(0, outerRadius - stretch);
                    lineEnd = outerRadius;
                    lineWidth = 2 + eased * 4;

                } else {
                    // Phase 3: Lines at center, fading
                    const phase = (transitionProgress - 0.8) / 0.2;
                    lineOpacity = (1 - phase) * 0.8;
                    lineStart = 0;
                    lineEnd = 50 * (1 - phase);
                    lineWidth = 3;
                }

                if (lineOpacity > 0 && lineEnd > lineStart) {
                    warpPaint.setColor(CK.Color(255, 255, 255, lineOpacity));
                    warpPaint.setStrokeWidth(lineWidth);

                    const x1 = cx + cos * lineStart;
                    const y1 = cy + sin * lineStart;
                    const x2 = cx + cos * lineEnd;
                    const y2 = cy + sin * lineEnd;

                    this.canvas.drawLine(x1, y1, x2, y2, warpPaint);
                }
            }

            warpPaint.delete();

            // === CENTER GLOW during acceleration ===
            if (transitionProgress > 0.3 && transitionProgress < 0.9) {
                const glowPhase = (transitionProgress - 0.3) / 0.6;
                const glowSize = 20 + easeInExpo(glowPhase) * 200;
                const glowOpacity = Math.sin(glowPhase * Math.PI) * 0.5;

                const glowPaint = new CK.Paint();
                glowPaint.setStyle(CK.PaintStyle.Fill);
                glowPaint.setColor(CK.Color(255, 255, 255, glowOpacity));
                glowPaint.setAntiAlias(true);
                this.canvas.drawCircle(cx, cy, glowSize, glowPaint);
                glowPaint.delete();
            }

            // === WHITE FLASH at climax ===
            if (transitionProgress > 0.75 && transitionProgress < 0.9) {
                const flashPhase = (transitionProgress - 0.75) / 0.15;
                const flashOpacity = Math.sin(flashPhase * Math.PI) * 0.8;

                const flashPaint = new CK.Paint();
                flashPaint.setStyle(CK.PaintStyle.Fill);
                flashPaint.setColor(CK.Color(255, 255, 255, flashOpacity));
                this.canvas.drawRect(CK.LTRBRect(0, 0, this.width, this.height), flashPaint);
                flashPaint.delete();
            }

            // === FADE TO BLACK ===
            if (transitionProgress > 0.85) {
                const fadePhase = (transitionProgress - 0.85) / 0.15;
                const fadePaint = new CK.Paint();
                fadePaint.setStyle(CK.PaintStyle.Fill);
                fadePaint.setColor(CK.Color(0, 0, 0, fadePhase));
                this.canvas.drawRect(CK.LTRBRect(0, 0, this.width, this.height), fadePaint);
                fadePaint.delete();
            }
        }
    }

    destroy(): void {
        if (this.disposedStyle) return;
        this.disposedStyle = true;
        super.destroy();
        // Clean up ring paints
        this.ringPaints.forEach(paint => paint.delete());
        this.ringPaints = [];
    }
}
