import type { CanvasKit, Surface, Canvas, Paint, Font, Typeface } from 'canvaskit-wasm';

export interface MenuCallbacks {
    onStartGame: () => void;
    onOptions: () => void;
}

export abstract class SkiaMenuStyle {
    protected CanvasKit: CanvasKit;
    protected surface: Surface;
    protected canvas: Canvas;
    protected width: number;
    protected height: number;
    protected selectedIndex = 0;
    protected callbacks: MenuCallbacks;
    protected animationId: number | null = null;
    protected destroyed = false;
    protected startGameTriggered = false;
    private disposed = false;

    // Transition state
    protected transitioning = false;
    protected transitionStart = 0;
    protected transitionDuration = 1500; // ms

    // Paints
    protected whitePaint!: Paint;
    protected titlePaint!: Paint;
    protected menuPaint!: Paint;
    protected menuSelectedPaint!: Paint;
    protected indicatorPaint!: Paint;

    // Font
    protected font!: Font;
    protected titleFont!: Font;
    protected typeface: Typeface | null;

    constructor(
        CanvasKit: CanvasKit,
        surface: Surface,
        callbacks: MenuCallbacks,
        width: number,
        height: number,
        typeface: Typeface | null
    ) {
        this.CanvasKit = CanvasKit;
        this.surface = surface;
        this.canvas = surface.getCanvas();
        this.callbacks = callbacks;
        this.width = width;
        this.height = height;
        this.typeface = typeface;

        this.setupPaints();
        this.setupInput();
    }

    private setupPaints(): void {
        const CK = this.CanvasKit;

        // Basic white paint for shapes
        this.whitePaint = new CK.Paint();
        this.whitePaint.setColor(CK.Color(255, 255, 255, 1.0));
        this.whitePaint.setStyle(CK.PaintStyle.Stroke);
        this.whitePaint.setStrokeWidth(1);
        this.whitePaint.setAntiAlias(true);

        // Title paint
        this.titlePaint = new CK.Paint();
        this.titlePaint.setColor(CK.Color(255, 255, 255, 0.4));
        this.titlePaint.setAntiAlias(true);

        // Menu paint (unselected)
        this.menuPaint = new CK.Paint();
        this.menuPaint.setColor(CK.Color(255, 255, 255, 0.6));
        this.menuPaint.setAntiAlias(true);

        // Menu paint (selected)
        this.menuSelectedPaint = new CK.Paint();
        this.menuSelectedPaint.setColor(CK.Color(255, 255, 255, 1.0));
        this.menuSelectedPaint.setAntiAlias(true);

        // Indicator paint
        this.indicatorPaint = new CK.Paint();
        this.indicatorPaint.setColor(CK.Color(255, 255, 255, 1.0));
        this.indicatorPaint.setStyle(CK.PaintStyle.Fill);
        this.indicatorPaint.setAntiAlias(true);

        // Fonts - use provided typeface or default
        this.font = new CK.Font(this.typeface, 18);
        this.titleFont = new CK.Font(this.typeface, 42);
    }

    protected measureText(text: string, font: Font): number {
        const glyphIds = font.getGlyphIDs(text);
        const widths = font.getGlyphWidths(glyphIds);
        let totalWidth = 0;
        for (let i = 0; i < widths.length; i++) {
            totalWidth += widths[i];
        }
        return totalWidth;
    }

    protected abstract createVisuals(): void;
    protected abstract animate(time: number): void;

    protected getMenuOpacity(transitionProgress: number): number {
        if (transitionProgress < 0.5) return 1 - transitionProgress * 2;
        return 0;
    }

    init(): void {
        this.createVisuals();
        this.startAnimation();
    }

    protected drawTitle(opacity: number = 1): void {
        const CK = this.CanvasKit;
        const title = 'A X I O M';
        const titleWidth = this.measureText(title, this.titleFont);
        const x = (this.width - titleWidth) / 2;
        const y = this.height * 0.2;

        if (opacity < 1) {
            const fadePaint = new CK.Paint();
            fadePaint.setColor(CK.Color(255, 255, 255, 0.4 * opacity));
            fadePaint.setAntiAlias(true);
            this.canvas.drawText(title, x, y, fadePaint, this.titleFont);
            fadePaint.delete();
        } else {
            this.canvas.drawText(title, x, y, this.titlePaint, this.titleFont);
        }
    }

    protected drawMenu(opacity: number = 1): void {
        const CK = this.CanvasKit;
        const options = ['NEW GAME', 'OPTIONS'];
        const startY = this.height * 0.6;
        const spacing = 50;

        options.forEach((text, i) => {
            const baseOpacity = i === this.selectedIndex ? 1.0 : 0.6;
            const textWidth = this.measureText(text, this.font);
            const x = (this.width - textWidth) / 2;
            const y = startY + i * spacing;

            if (opacity < 1) {
                const fadePaint = new CK.Paint();
                fadePaint.setColor(CK.Color(255, 255, 255, baseOpacity * opacity));
                fadePaint.setAntiAlias(true);
                this.canvas.drawText(text, x, y, fadePaint, this.font);
                fadePaint.delete();
            } else {
                const paint = i === this.selectedIndex ? this.menuSelectedPaint : this.menuPaint;
                this.canvas.drawText(text, x, y, paint, this.font);
            }
        });

        // Draw indicator circle
        const indicatorY = startY + this.selectedIndex * spacing - 6;
        if (opacity < 1) {
            const fadePaint = new CK.Paint();
            fadePaint.setColor(CK.Color(255, 255, 255, opacity));
            fadePaint.setStyle(CK.PaintStyle.Fill);
            fadePaint.setAntiAlias(true);
            this.canvas.drawCircle(this.width / 2 - 80, indicatorY, 4, fadePaint);
            fadePaint.delete();
        } else {
            this.canvas.drawCircle(this.width / 2 - 80, indicatorY, 4, this.indicatorPaint);
        }
    }

    private setupInput(): void {
        window.addEventListener('keydown', (e) => {
            if (this.destroyed) return;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.navigate(-1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.navigate(1);
                    break;
                case 'Enter':
                case ' ':
                    this.confirmSelection();
                    break;
            }
        });
    }

    private navigate(dir: number): void {
        const newIndex = Math.max(0, Math.min(1, this.selectedIndex + dir));
        if (newIndex !== this.selectedIndex) {
            this.selectedIndex = newIndex;
        }
    }

    private confirmSelection(): void {
        if (this.selectedIndex === 0) {
            // Start transition animation
            this.startTransition();
        } else {
            this.callbacks.onOptions();
        }
    }

    protected startTransition(): void {
        this.transitioning = true;
        this.transitionStart = performance.now();
        this.startGameTriggered = false;
    }

    protected getTransitionProgress(): number {
        if (!this.transitioning) return 0;
        const elapsed = performance.now() - this.transitionStart;
        return Math.min(1, elapsed / this.transitionDuration);
    }

    // Override in subclasses for custom transition effects
    protected drawTransition(progress: number): void {
        const CK = this.CanvasKit;

        // Default: simple fade to white with expanding ring
        const cx = this.width / 2;
        const cy = this.height / 2;

        // Easing function for smooth animation
        const easeOutExpo = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        const easedProgress = easeOutExpo(progress);

        // Expanding shockwave ring
        const maxRadius = Math.max(this.width, this.height) * 1.5;
        const ringRadius = easedProgress * maxRadius;
        const ringWidth = 50 + easedProgress * 100;
        const ringOpacity = 1 - easedProgress;

        const ringPaint = new CK.Paint();
        ringPaint.setColor(CK.Color(255, 255, 255, ringOpacity * 0.8));
        ringPaint.setStyle(CK.PaintStyle.Stroke);
        ringPaint.setStrokeWidth(ringWidth);
        ringPaint.setAntiAlias(true);
        this.canvas.drawCircle(cx, cy, ringRadius, ringPaint);
        ringPaint.delete();

        // Inner flash
        if (progress < 0.3) {
            const flashProgress = progress / 0.3;
            const flashOpacity = (1 - flashProgress) * 0.5;
            const flashPaint = new CK.Paint();
            flashPaint.setColor(CK.Color(255, 255, 255, flashOpacity));
            flashPaint.setStyle(CK.PaintStyle.Fill);
            this.canvas.drawCircle(cx, cy, 100 + flashProgress * 200, flashPaint);
            flashPaint.delete();
        }

        // Screen fade to black at the end
        if (progress > 0.6) {
            const fadeProgress = (progress - 0.6) / 0.4;
            const fadePaint = new CK.Paint();
            fadePaint.setColor(CK.Color(0, 0, 0, fadeProgress));
            fadePaint.setStyle(CK.PaintStyle.Fill);
            this.canvas.drawRect(CK.LTRBRect(0, 0, this.width, this.height), fadePaint);
            fadePaint.delete();
        }

        // Transition complete
        if (progress >= 1 && !this.startGameTriggered) {
            this.startGameTriggered = true;
            this.callbacks.onStartGame();
            this.destroy();
        }
    }

    private startAnimation(): void {
        const loop = (time: number) => {
            if (this.destroyed) return;

            // Clear canvas
            this.canvas.clear(this.CanvasKit.BLACK);

            // Draw visuals (implemented by subclass)
            this.animate(time);

            // Draw menu on top (fade out during transition)
            const transitionProgress = this.getTransitionProgress();
            const menuOpacity = this.getMenuOpacity(transitionProgress);
            if (menuOpacity > 0) {
                this.drawTitle(menuOpacity);
                this.drawMenu(menuOpacity);
            }

            // Draw transition effect
            if (this.transitioning) {
                this.drawTransition(transitionProgress);
            }

            // Flush to screen
            this.surface.flush();

            if (!this.destroyed) {
                this.animationId = requestAnimationFrame(loop);
            }
        };
        this.animationId = requestAnimationFrame(loop);
    }

    destroy(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.destroyed = true;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Clean up paints
        this.whitePaint.delete();
        this.titlePaint.delete();
        this.menuPaint.delete();
        this.menuSelectedPaint.delete();
        this.indicatorPaint.delete();
        this.font.delete();
        this.titleFont.delete();
    }

    onResize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }
}
