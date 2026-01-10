import { type Application, Graphics } from 'pixi.js';
import { MenuStyle } from './MenuStyle';

export class HorizonLineStyle extends MenuStyle {
  private horizonGraphics!: Graphics;
  private glowGraphics!: Graphics;
  private horizonY = 0;

  constructor(app: Application) {
    super(app);
    this.shaderConfig = {
      vignette: 0.5,
      grain: 0.02,
      bloom: 0.3,
      chromatic: 0,
    };
  }

  protected createVisuals(): void {
    this.horizonY = this.height * 0.75;

    // Atmospheric glow above horizon
    this.glowGraphics = new Graphics();
    this.container.addChildAt(this.glowGraphics, 0);

    // Horizon line
    this.horizonGraphics = new Graphics();
    this.container.addChildAt(this.horizonGraphics, 1);

    this.drawHorizon();
    this.drawGlow();
  }

  private drawHorizon(): void {
    this.horizonGraphics.clear();
    this.horizonGraphics
      .moveTo(0, this.horizonY)
      .lineTo(this.width, this.horizonY)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.4 });
  }

  private drawGlow(): void {
    this.glowGraphics.clear();

    // Gradient glow above horizon
    const gradientHeight = this.height * 0.3;

    for (let i = 0; i < 20; i++) {
      const y = this.horizonY - (i / 20) * gradientHeight;
      const alpha = 0.08 * (1 - i / 20);

      this.glowGraphics
        .moveTo(0, y)
        .lineTo(this.width, y)
        .stroke({ width: 2, color: 0xffffff, alpha });
    }
  }

  protected createMenuIndicator(): void {
    this.menuIndicator = new Graphics();
    this.menuIndicator.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.9 });

    const startY = this.height * 0.6;
    this.menuIndicator.position.set(this.width / 2, startY);
    this.container.addChild(this.menuIndicator);

    // Subtle glow pulse
    const animate = () => {
      if (this.destroyed) return;
      const time = performance.now() / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.5);
      this.menuIndicator.alpha = 0.7 + pulse * 0.3;
      this.menuIndicator.scale.set(1 + pulse * 0.1);
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
      const duration = 350;

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

  protected update(): void {
    const time = performance.now() / 1000;

    // Subtle shimmer on horizon
    const shimmer = 0.35 + 0.1 * Math.sin(time * 0.8);
    this.horizonGraphics.alpha = shimmer;

    // Glow breathing
    const glowPulse = 0.8 + 0.2 * Math.sin(time * 0.4);
    this.glowGraphics.alpha = glowPulse;
  }

  onResize(width: number, height: number): void {
    super.onResize(width, height);

    this.horizonY = height * 0.75;
    this.drawHorizon();
    this.drawGlow();
  }
}
