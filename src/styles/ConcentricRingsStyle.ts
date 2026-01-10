import { type Application, Graphics } from 'pixi.js';
import { MenuStyle } from './MenuStyle';

interface Ring {
  radius: number;
  targetRadius: number;
  alpha: number;
  graphics: Graphics;
}

export class ConcentricRingsStyle extends MenuStyle {
  private rings: Ring[] = [];
  private readonly RING_COUNT = 4;
  private centerX = 0;
  private centerY = 0;

  constructor(app: Application) {
    super(app);
    this.shaderConfig = {
      vignette: 0.3,
      grain: 0.01,
      bloom: 0.5,
      chromatic: 0.002,
    };
  }

  protected createVisuals(): void {
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    const maxRadius = Math.max(this.width, this.height) * 0.4;

    for (let i = 0; i < this.RING_COUNT; i++) {
      const graphics = new Graphics();
      const radius = (i + 1) * (maxRadius / this.RING_COUNT);

      const ring: Ring = {
        radius: radius,
        targetRadius: radius,
        alpha: 0.15 - i * 0.02,
        graphics,
      };

      this.drawRing(ring);
      this.container.addChildAt(graphics, 0);
      this.rings.push(ring);
    }
  }

  private drawRing(ring: Ring): void {
    ring.graphics.clear();
    ring.graphics
      .circle(this.centerX, this.centerY, ring.radius)
      .stroke({ width: 1, color: 0xffffff, alpha: ring.alpha });
  }

  protected createMenuIndicator(): void {
    this.menuIndicator = new Graphics();
    this.menuIndicator.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.9 });

    const startY = this.height * 0.6;
    this.menuIndicator.position.set(this.width / 2, startY);
    this.container.addChild(this.menuIndicator);

    // Pulse animation
    const animate = () => {
      if (this.destroyed) return;
      const time = performance.now() / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(time * 2);
      this.menuIndicator.alpha = 0.7 + pulse * 0.3;
      this.menuIndicator.scale.set(1 + pulse * 0.2);
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
      // Trigger ring pulse on selection
      this.pulseRings();

      const startX = this.menuIndicator.x;
      const startYPos = this.menuIndicator.y;
      const startTime = performance.now();
      const duration = 300;

      const animatePos = () => {
        if (this.destroyed) return;
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - (1 - t) ** 3;

        this.menuIndicator.x = startX + (targetX - startX) * eased;
        this.menuIndicator.y = startYPos + (targetY - startYPos) * eased;

        if (t < 1) this.requestAnimation(animatePos);
      };
      animatePos();
    } else {
      this.menuIndicator.position.set(targetX, targetY);
    }
  }

  private pulseRings(): void {
    this.rings.forEach((ring, i) => {
      const pulseAmount = 20 - i * 3;
      ring.targetRadius = ring.radius + pulseAmount;

      setTimeout(() => {
        ring.targetRadius = ring.radius;
      }, 300);
    });
  }

  protected update(): void {
    const time = performance.now() / 1000;

    this.rings.forEach((ring, i) => {
      // Slow breathing animation
      const breathe = Math.sin(time * 0.5 + i * 0.5) * 5;
      const currentRadius = ring.radius + breathe;

      // Smooth toward target if pulsing
      if (Math.abs(ring.targetRadius - currentRadius) > 1) {
        ring.graphics.clear();
        const displayRadius =
          currentRadius + (ring.targetRadius - ring.radius) * 0.1;
        ring.graphics
          .circle(this.centerX, this.centerY, displayRadius)
          .stroke({ width: 1, color: 0xffffff, alpha: ring.alpha });
      } else {
        ring.graphics.clear();
        ring.graphics
          .circle(this.centerX, this.centerY, currentRadius)
          .stroke({ width: 1, color: 0xffffff, alpha: ring.alpha });
      }

      // Subtle alpha variation
      ring.graphics.alpha = 0.8 + 0.2 * Math.sin(time * 0.3 + i);
    });
  }

  onResize(width: number, height: number): void {
    super.onResize(width, height);

    this.centerX = width / 2;
    this.centerY = height / 2;

    const maxRadius = Math.max(width, height) * 0.4;

    this.rings.forEach((ring, i) => {
      ring.radius = (i + 1) * (maxRadius / this.RING_COUNT);
      ring.targetRadius = ring.radius;
      this.drawRing(ring);
    });
  }
}
