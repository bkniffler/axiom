import type { CanvasKit, Surface, Paint, Typeface } from 'canvaskit-wasm';
import { SkiaMenuStyle, MenuCallbacks } from './SkiaMenu';

interface Planet {
    orbitRadius: number;
    orbitSpeed: number;
    angle: number;
    size: number;
    opacity: number;
    hasRing?: boolean;
    moon?: {
        orbitRadius: number;
        orbitSpeed: number;
        angle: number;
        size: number;
    };
}

interface Star {
    x: number;
    y: number;
    brightness: number;
    targetBrightness: number;
    twinkleSpeed: number;
    size: number;
    driftX: number;
    driftY: number;
}

export class StarMapStyle extends SkiaMenuStyle {
    private planets: Planet[] = [];
    private stars: Star[] = [];
    private startTime = 0;

    private readonly PLANET_COUNT = 5;
    private readonly STAR_COUNT = 80;

    // Zoom state
    private zoom = 1;
    private targetZoom = 1;
    private readonly MIN_ZOOM = 0.5;
    private readonly MAX_ZOOM = 3;
    private wheelHandler: ((e: WheelEvent) => void) | null = null;

    // Faster transition for more punch
    protected transitionDuration = 1800;

    // Paints
    private starPaint!: Paint;
    private orbitPaint!: Paint;
    private planetPaint!: Paint;
    private glowPaint!: Paint;
    private vignettePaint!: Paint;
    private disposedStyle = false;

    constructor(CanvasKit: CanvasKit, surface: Surface, callbacks: MenuCallbacks, width: number, height: number, typeface: Typeface | null) {
        super(CanvasKit, surface, callbacks, width, height, typeface);
    }

    protected createVisuals(): void {
        const CK = this.CanvasKit;
        this.startTime = performance.now();

        // Star paint
        this.starPaint = new CK.Paint();
        this.starPaint.setStyle(CK.PaintStyle.Fill);
        this.starPaint.setAntiAlias(true);

        // Orbit paint
        this.orbitPaint = new CK.Paint();
        this.orbitPaint.setColor(CK.Color(255, 255, 255, 0.08));
        this.orbitPaint.setStyle(CK.PaintStyle.Stroke);
        this.orbitPaint.setStrokeWidth(1);
        this.orbitPaint.setAntiAlias(true);

        // Planet paint
        this.planetPaint = new CK.Paint();
        this.planetPaint.setStyle(CK.PaintStyle.Fill);
        this.planetPaint.setAntiAlias(true);

        // Glow paint
        this.glowPaint = new CK.Paint();
        this.glowPaint.setStyle(CK.PaintStyle.Fill);
        this.glowPaint.setAntiAlias(true);

        // Vignette paint
        this.vignettePaint = new CK.Paint();
        this.vignettePaint.setStyle(CK.PaintStyle.Fill);
        this.vignettePaint.setAntiAlias(true);

        this.initStars();
        this.initPlanets();
        this.setupZoom();
    }

    private setupZoom(): void {
        this.wheelHandler = (e: WheelEvent) => {
            e.preventDefault();
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            this.targetZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.targetZoom * zoomDelta));
        };
        window.addEventListener('wheel', this.wheelHandler, { passive: false });
    }

    private initStars(): void {
        for (let i = 0; i < this.STAR_COUNT; i++) {
            const brightness = 0.05 + Math.random() * 0.15;
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                brightness,
                targetBrightness: brightness,
                twinkleSpeed: 0.5 + Math.random() * 2,
                size: 1 + Math.random() * 1.5,
                driftX: (Math.random() - 0.5) * 0.05,
                driftY: (Math.random() - 0.5) * 0.05
            });
        }
    }

    private initPlanets(): void {
        const maxRadius = Math.min(this.width, this.height) * 0.35;

        // Create planets at different orbital distances
        const orbitRadii = [0.25, 0.4, 0.55, 0.72, 0.9];

        for (let i = 0; i < this.PLANET_COUNT; i++) {
            const orbitRadius = maxRadius * orbitRadii[i];
            // Kepler-ish: outer planets orbit slower (much slower now)
            const orbitSpeed = 0.08 - i * 0.012;
            const size = 4 + Math.random() * 6;
            const opacity = 0.6 + Math.random() * 0.4;

            const planet: Planet = {
                orbitRadius,
                orbitSpeed,
                angle: Math.random() * Math.PI * 2,
                size,
                opacity,
                hasRing: i === 2 // Third planet has rings (Saturn-like)
            };

            // Add moon to one planet
            if (i === 1) {
                planet.moon = {
                    orbitRadius: size * 2.5,
                    orbitSpeed: 0.4,
                    angle: Math.random() * Math.PI * 2,
                    size: 2
                };
            }

            this.planets.push(planet);
        }
    }

    protected animate(time: number): void {
        const elapsed = (time - this.startTime) / 1000;

        // Smooth zoom interpolation
        this.zoom += (this.targetZoom - this.zoom) * 0.1;

        const transitionProgress = this.getTransitionProgress();

        this.drawAllElements(elapsed, transitionProgress);
        this.drawVignette();
    }

    protected override getMenuOpacity(transitionProgress: number): number {
        if (transitionProgress <= 0) return 1;
        return Math.max(0, 1 - transitionProgress * 12);
    }

    protected override drawTransition(progress: number): void {
        const CK = this.CanvasKit;

        // Fade to black at the end (no flashes).
        const t = Math.max(0, Math.min(1, (progress - 0.62) / 0.38));
        const alpha = t * t * (3 - 2 * t);

        const paint = new CK.Paint();
        paint.setStyle(CK.PaintStyle.Fill);
        paint.setColor(CK.Color(0, 0, 0, alpha));
        this.canvas.drawRect(CK.LTRBRect(0, 0, this.width, this.height), paint);
        paint.delete();

        if (progress >= 1 && !this.startGameTriggered) {
            this.startGameTriggered = true;
            this.callbacks.onStartGame();
            this.destroy();
        }
    }

    private drawAllElements(elapsed: number, transitionProgress: number): void {
        const CK = this.CanvasKit;
        const cx = this.width / 2;
        const cy = this.height / 2;
        const maxDim = Math.max(this.width, this.height);

        const p = Math.max(0, Math.min(1, transitionProgress));
        const pull = p * p;
        const collapse = Math.max(0.02, 1 - pull * 0.98);
        const twist = pull * 1.4;
        const sceneFade = p > 0 ? Math.max(0, 1 - p * 1.1) : 1;

        // === STARS (tiny points, not spheres) ===
        for (const star of this.stars) {
            star.x += star.driftX;
            star.y += star.driftY;
            if (star.x < 0) star.x = this.width;
            if (star.x > this.width) star.x = 0;
            if (star.y < 0) star.y = this.height;
            if (star.y > this.height) star.y = 0;

            if (Math.random() < 0.02) {
                star.targetBrightness = 0.03 + Math.random() * 0.1;
            }
            star.brightness += (star.targetBrightness - star.brightness) * 0.1;

            let x = star.x;
            let y = star.y;
            let opacity = star.brightness * sceneFade;

            if (p > 0) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.hypot(dx, dy);
                const nd = Math.min(1, dist / (maxDim * 0.55));
                const angle = Math.atan2(dy, dx) + twist * (1 - nd) * (1 - nd);
                x = cx + Math.cos(angle) * dist * collapse;
                y = cy + Math.sin(angle) * dist * collapse;
                opacity *= 0.55;
            }

            if (opacity <= 0) continue;

            // Tiny 1px points only
            this.starPaint.setColor(CK.Color(255, 255, 255, opacity));
            this.canvas.drawCircle(x, y, 0.5, this.starPaint);
        }

        if (p <= 0) {
            // === ORBITAL PATHS ===
            for (const planet of this.planets) {
                const radius = planet.orbitRadius * this.zoom;
                this.orbitPaint.setColor(CK.Color(255, 255, 255, 0.08));
                this.canvas.drawCircle(cx, cy, radius, this.orbitPaint);
            }

            // === CENTRAL STAR ===
            const pulseAmount = 1 + Math.sin(elapsed * 0.5) * 0.2;
            const glowLayers = [
                { size: 40 * pulseAmount * this.zoom, opacity: 0.02 },
                { size: 25 * pulseAmount * this.zoom, opacity: 0.05 },
                { size: 15 * pulseAmount * this.zoom, opacity: 0.1 },
                { size: 8 * pulseAmount * this.zoom, opacity: 0.2 },
                { size: 4 * pulseAmount * this.zoom, opacity: 0.6 }
            ];
            for (const layer of glowLayers) {
                this.glowPaint.setColor(CK.Color(255, 255, 255, layer.opacity));
                this.canvas.drawCircle(cx, cy, layer.size, this.glowPaint);
            }
            this.glowPaint.setColor(CK.Color(255, 255, 255, 1));
            this.canvas.drawCircle(cx, cy, 2 * this.zoom, this.glowPaint);

            // === PLANETS ===
            for (const planet of this.planets) {
                planet.angle += planet.orbitSpeed * 0.016;
                const px = cx + Math.cos(planet.angle) * planet.orbitRadius * this.zoom;
                const py = cy + Math.sin(planet.angle) * planet.orbitRadius * this.zoom;

                // Planet glow
                this.glowPaint.setColor(CK.Color(255, 255, 255, planet.opacity * 0.15));
                this.canvas.drawCircle(px, py, planet.size * 2.5, this.glowPaint);

                // Planet
                this.planetPaint.setColor(CK.Color(255, 255, 255, planet.opacity));
                this.canvas.drawCircle(px, py, planet.size, this.planetPaint);

                // Saturn ring
                if (planet.hasRing) {
                    const ringPaint = new CK.Paint();
                    ringPaint.setStyle(CK.PaintStyle.Stroke);
                    ringPaint.setStrokeWidth(1.5);
                    ringPaint.setColor(CK.Color(255, 255, 255, planet.opacity * 0.4));
                    ringPaint.setAntiAlias(true);
                    const ringPath = new CK.Path();
                    const ringRadius = planet.size * 2;
                    ringPath.addOval(CK.LTRBRect(px - ringRadius, py - ringRadius * 0.3, px + ringRadius, py + ringRadius * 0.3));
                    this.canvas.drawPath(ringPath, ringPaint);
                    ringPath.delete();
                    ringPaint.delete();
                }

                // Moon
                if (planet.moon) {
                    planet.moon.angle += planet.moon.orbitSpeed * 0.016;
                    const mx = px + Math.cos(planet.moon.angle) * planet.moon.orbitRadius;
                    const my = py + Math.sin(planet.moon.angle) * planet.moon.orbitRadius;
                    this.planetPaint.setColor(CK.Color(255, 255, 255, planet.opacity * 0.7));
                    this.canvas.drawCircle(mx, my, planet.moon.size, this.planetPaint);
                }
            }

            return;
        }

        // === SIMPLE PULL-IN (no shader, no glows) ===
        const orbitOpacity = 0.06 * Math.max(0, 1 - p * 1.2);
        for (const planet of this.planets) {
            const radius = planet.orbitRadius * this.zoom * collapse;
            if (orbitOpacity > 0) {
                this.orbitPaint.setColor(CK.Color(255, 255, 255, orbitOpacity));
                this.canvas.drawCircle(cx, cy, radius, this.orbitPaint);
            }
        }

        for (const planet of this.planets) {
            const speedMul = 1 + pull * 30;
            planet.angle += planet.orbitSpeed * 0.016 * speedMul;

            const orbitRadius = planet.orbitRadius * this.zoom * collapse;
            const px = cx + Math.cos(planet.angle) * orbitRadius;
            const py = cy + Math.sin(planet.angle) * orbitRadius;

            const planetOpacity = planet.opacity * Math.max(0, 1 - p * 1.1) * 0.35;
            if (planetOpacity <= 0) continue;

            this.planetPaint.setColor(CK.Color(255, 255, 255, planetOpacity));
            this.canvas.drawCircle(px, py, Math.max(0.6, planet.size * 0.7), this.planetPaint);

            if (planet.hasRing && p < 0.25) {
                const ringPaint = new CK.Paint();
                ringPaint.setStyle(CK.PaintStyle.Stroke);
                ringPaint.setStrokeWidth(1.2);
                ringPaint.setColor(CK.Color(255, 255, 255, planetOpacity * 0.25));
                ringPaint.setAntiAlias(true);
                const ringPath = new CK.Path();
                const ringRadius = planet.size * 2 * 0.75;
                ringPath.addOval(CK.LTRBRect(px - ringRadius, py - ringRadius * 0.3, px + ringRadius, py + ringRadius * 0.3));
                this.canvas.drawPath(ringPath, ringPaint);
                ringPath.delete();
                ringPaint.delete();
            }

            if (planet.moon && planetOpacity > 0 && p < 0.6) {
                planet.moon.angle += planet.moon.orbitSpeed * 0.016 * speedMul;
                const mx = px + Math.cos(planet.moon.angle) * planet.moon.orbitRadius * collapse;
                const my = py + Math.sin(planet.moon.angle) * planet.moon.orbitRadius * collapse;
                this.planetPaint.setColor(CK.Color(255, 255, 255, planetOpacity * 0.65));
                this.canvas.drawCircle(mx, my, Math.max(0.5, planet.moon.size * 0.75), this.planetPaint);
            }
        }
    }

    private drawVignette(): void {
        const CK = this.CanvasKit;
        const cx = this.width / 2;
        const cy = this.height / 2;
        const maxDim = Math.max(this.width, this.height);

        // Draw concentric semi-transparent circles from edge inward
        const vignetteSteps = 8;
        for (let i = vignetteSteps; i >= 0; i--) {
            const ratio = i / vignetteSteps;
            const radius = maxDim * (0.4 + ratio * 0.5);
            const opacity = ratio * ratio * 0.3;

            this.vignettePaint.setColor(CK.Color(0, 0, 0, opacity));
            this.canvas.drawCircle(cx, cy, radius, this.vignettePaint);
        }
    }

    destroy(): void {
        if (this.disposedStyle) return;
        this.disposedStyle = true;
        super.destroy();
        if (this.wheelHandler) {
            window.removeEventListener('wheel', this.wheelHandler);
            this.wheelHandler = null;
        }
        this.starPaint?.delete();
        this.orbitPaint?.delete();
        this.planetPaint?.delete();
        this.glowPaint?.delete();
        this.vignettePaint?.delete();
        this.planets = [];
        this.stars = [];
    }
}
