import { Application, Graphics, Container } from 'pixi.js';
import { MenuStyle } from './MenuStyle';

interface Line {
    start: { x: number; y: number };
    end: { x: number; y: number };
    brightness: number;
}

interface Pulse {
    lineIndex: number;
    progress: number;
    speed: number;
    graphics: Graphics;
}

export class AxiomCurrentStyle extends MenuStyle {
    private lines: Line[] = [];
    private nodes: { x: number; y: number; graphics?: Graphics }[] = [];

    private lineGraphics!: Graphics;
    private pulseContainer!: Container;
    private pulses: Pulse[] = [];
    private nextPulseTime = 0;

    constructor(app: Application) {
        super(app);
        this.shaderConfig = {
            vignette: 0.3,
            grain: 0.02,
            bloom: 0.4,
            chromatic: 0.001
        };
    }

    protected createVisuals(): void {
        // Line graphics layer
        this.lineGraphics = new Graphics();
        this.container.addChild(this.lineGraphics);

        // Pulse container
        this.pulseContainer = new Container();
        this.container.addChild(this.pulseContainer);

        // Define geometry
        this.defineGeometry();

        // Create nodes
        this.createNodes();

        // Initial draw
        this.drawLines();

        // Schedule first pulse
        this.nextPulseTime = performance.now() + 2000 + Math.random() * 2000;
    }

    private defineGeometry(): void {
        const normalizedLines = [
            { start: { x: 0.05, y: 0.62 }, end: { x: 0.95, y: 0.58 }, brightness: 0.3 },
            { start: { x: 0.15, y: 0.0 }, end: { x: 0.7, y: 1.0 }, brightness: 0.18 },
            { start: { x: 0.0, y: 0.85 }, end: { x: 0.55, y: 0.15 }, brightness: 0.2 },
            { start: { x: 0.1, y: 0.35 }, end: { x: 0.9, y: 0.28 }, brightness: 0.15 },
            { start: { x: 0.85, y: 0.1 }, end: { x: 0.4, y: 0.95 }, brightness: 0.18 }
        ];

        this.lines = normalizedLines.map(line => ({
            start: { x: line.start.x * this.width, y: line.start.y * this.height },
            end: { x: line.end.x * this.width, y: line.end.y * this.height },
            brightness: line.brightness
        }));

        this.calculateIntersections();
    }

    private calculateIntersections(): void {
        this.nodes = [];

        for (let i = 0; i < this.lines.length; i++) {
            for (let j = i + 1; j < this.lines.length; j++) {
                const intersection = this.lineIntersection(
                    this.lines[i].start, this.lines[i].end,
                    this.lines[j].start, this.lines[j].end
                );

                if (intersection &&
                    intersection.x > 50 && intersection.x < this.width - 50 &&
                    intersection.y > 50 && intersection.y < this.height - 50) {
                    const tooClose = this.nodes.some(n =>
                        Math.hypot(n.x - intersection.x, n.y - intersection.y) < 80
                    );
                    if (!tooClose && this.nodes.length < 4) {
                        this.nodes.push(intersection);
                    }
                }
            }
        }
    }

    private lineIntersection(
        p1: { x: number; y: number }, p2: { x: number; y: number },
        p3: { x: number; y: number }, p4: { x: number; y: number }
    ): { x: number; y: number } | null {
        const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (Math.abs(d) < 0.0001) return null;

        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
            };
        }
        return null;
    }

    private drawLines(): void {
        this.lineGraphics.clear();

        for (const line of this.lines) {
            const alpha = line.brightness;
            // Draw lines as 1px filled rectangles for ultra-crisp rendering
            this.drawCrispLine(
                line.start.x, line.start.y,
                line.end.x, line.end.y,
                alpha
            );
        }
    }

    private drawCrispLine(x1: number, y1: number, x2: number, y2: number, alpha: number): void {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return;

        // Normalize direction
        const nx = dx / length;
        const ny = dy / length;

        // Perpendicular (for line thickness)
        const px = -ny * 0.5;
        const py = nx * 0.5;

        // Round coordinates for pixel-perfect alignment
        const ax = Math.round(x1 + px);
        const ay = Math.round(y1 + py);
        const bx = Math.round(x1 - px);
        const by = Math.round(y1 - py);
        const cx = Math.round(x2 - px);
        const cy = Math.round(y2 - py);
        const dx2 = Math.round(x2 + px);
        const dy2 = Math.round(y2 + py);

        // Draw as filled polygon (quad)
        this.lineGraphics
            .moveTo(ax, ay)
            .lineTo(bx, by)
            .lineTo(cx, cy)
            .lineTo(dx2, dy2)
            .closePath()
            .fill({ color: 0xffffff, alpha });
    }

    private createNodes(): void {
        for (const node of this.nodes) {
            const nodeGraphics = new Graphics();
            nodeGraphics.circle(0, 0, 3).fill({ color: 0xffffff, alpha: 0.3 });
            nodeGraphics.position.set(node.x, node.y);
            this.container.addChild(nodeGraphics);
            node.graphics = nodeGraphics;

            this.animateNode(nodeGraphics);
        }
    }

    private animateNode(node: Graphics): void {
        const animate = () => {
            if (this.destroyed) return;
            const time = performance.now() / 1000;
            const pulse = 0.5 + 0.5 * Math.sin(time * 0.8);
            node.scale.set(1 + pulse * 0.3);
            node.alpha = 0.2 + pulse * 0.2;
            this.requestAnimation(animate);
        };
        animate();
    }

    protected createMenuIndicator(): void {
        const startY = this.height * 0.6;
        const pos = { x: this.width / 2, y: startY };

        this.menuIndicator = new Graphics();
        this.menuIndicator.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.9 });
        this.menuIndicator.position.set(pos.x, pos.y);
        this.container.addChild(this.menuIndicator);

        const animate = () => {
            if (this.destroyed) return;
            const time = performance.now() / 1000;
            const pulse = 0.5 + 0.5 * Math.sin(time * 2);
            this.menuIndicator.scale.set(1 + pulse * 0.2);
            this.menuIndicator.alpha = 0.7 + pulse * 0.3;
            this.requestAnimation(animate);
        };
        animate();
    }

    protected updateIndicatorPosition(animate = true): void {
        const startY = this.height * 0.6;
        const spacing = 50;
        const targetY = startY + this.selectedIndex * spacing;
        const targetX = this.width / 2;

        if (animate) {
            const startX = this.menuIndicator.x;
            const startYPos = this.menuIndicator.y;
            const startTime = performance.now();
            const duration = 300;

            const animatePos = () => {
                if (this.destroyed) return;
                const elapsed = performance.now() - startTime;
                const t = Math.min(1, elapsed / duration);
                const eased = 1 - Math.pow(1 - t, 3);

                this.menuIndicator.x = startX + (targetX - startX) * eased;
                this.menuIndicator.y = startYPos + (targetY - startYPos) * eased;

                if (t < 1) this.requestAnimation(animatePos);
            };
            animatePos();

            // Spawn navigation pulse
            this.spawnNavigationPulse();
        } else {
            this.menuIndicator.position.set(targetX, targetY);
        }
    }

    private spawnNavigationPulse(): void {
        const lineIndex = Math.floor(Math.random() * this.lines.length);
        const direction = Math.random() > 0.5 ? 1 : -1;
        const startProgress = direction > 0 ? 0 : 1;
        this.spawnPulse(lineIndex, startProgress, direction, 0.3);
    }

    private spawnPulse(lineIndex: number, startProgress: number, direction: number, speed: number): void {
        const line = this.lines[lineIndex];
        const pos = this.getPointOnLine(line, startProgress);

        const graphics = new Graphics();
        graphics.circle(0, 0, 4).fill({ color: 0xffffff, alpha: 0.8 });
        graphics.position.set(pos.x, pos.y);
        this.pulseContainer.addChild(graphics);

        this.pulses.push({
            lineIndex,
            progress: startProgress,
            speed: direction * speed,
            graphics
        });
    }

    private spawnAmbientPulse(): void {
        const lineIndex = Math.floor(Math.random() * this.lines.length);
        const direction = Math.random() > 0.5 ? 1 : -1;
        const startProgress = direction > 0 ? 0 : 1;

        this.spawnPulse(lineIndex, startProgress, direction, 0.15 + Math.random() * 0.1);
    }

    private getPointOnLine(line: Line, t: number): { x: number; y: number } {
        return {
            x: line.start.x + (line.end.x - line.start.x) * t,
            y: line.start.y + (line.end.y - line.start.y) * t
        };
    }

    protected update(): void {
        const now = performance.now();
        const delta = this.app.ticker.deltaMS;

        // Spawn ambient pulses
        if (now > this.nextPulseTime) {
            this.spawnAmbientPulse();
            this.nextPulseTime = now + 3000 + Math.random() * 2000;
        }

        // Update pulses
        this.pulses = this.pulses.filter(pulse => {
            pulse.progress += pulse.speed * (delta / 1000);

            const line = this.lines[pulse.lineIndex];
            const pos = this.getPointOnLine(line, pulse.progress);
            pulse.graphics.position.set(pos.x, pos.y);

            const distFromCenter = Math.abs(pulse.progress - 0.5) * 2;
            pulse.graphics.alpha = 0.8 * (1 - distFromCenter * 0.5);

            if (pulse.progress < -0.1 || pulse.progress > 1.1) {
                this.pulseContainer.removeChild(pulse.graphics);
                pulse.graphics.destroy();
                return false;
            }
            return true;
        });
    }

    onResize(width: number, height: number): void {
        super.onResize(width, height);

        // Recalculate geometry
        this.defineGeometry();
        this.drawLines();

        // Reposition nodes
        this.nodes.forEach((node) => {
            if (node.graphics) {
                node.graphics.position.set(node.x, node.y);
            }
        });
    }
}
