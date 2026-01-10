import { type Application, Graphics } from 'pixi.js';
import { MenuStyle } from './MenuStyle';

interface Pulse {
  radius: number;
  alpha: number;
  speed: number;
  graphics: Graphics;
}

export class PulseEmanationStyle extends MenuStyle {
  private pulses: Pulse[] = [];
  private centerX = 0;
  private centerY = 0;
  private nextPulseTime = 0;

  constructor(app: Application) {
    super(app);
    this.shaderConfig = {
      vignette: 0.4,
      grain: 0.02,
      bloom: 0.5,
      chromatic: 0.001,
    };
  }

  protected createVisuals(): void {
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    // Create initial pulses
    this.spawnPulse();
    this.nextPulseTime = performance.now() + 2000;
  }

  private spawnPulse(): void {
    const graphics = new Graphics();

    const pulse: Pulse = {
      radius: 10,
      alpha: 0.4,
      speed: 50 + Math.random() * 30,
      graphics,
    };

    this.drawPulse(pulse);
    this.container.addChildAt(graphics, 0);
    this.pulses.push(pulse);
  }

  private drawPulse(pulse: Pulse): void {
    pulse.graphics.clear();
    pulse.graphics
      .circle(this.centerX, this.centerY, pulse.radius)
      .stroke({ width: 1, color: 0xffffff, alpha: pulse.alpha });
  }

  protected createMenuIndicator(): void {
    this.menuIndicator = new Graphics();
    this.menuIndicator.circle(0, 0, 5).fill({ color: 0xffffff, alpha: 0.9 });

    const startY = this.height * 0.6;
    this.menuIndicator.position.set(this.width / 2, startY);
    this.container.addChild(this.menuIndicator);

    // Sonar-style pulse
    const animate = () => {
      if (this.destroyed) return;
      const time = performance.now() / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(time * 3);
      this.menuIndicator.alpha = 0.6 + pulse * 0.4;
      this.menuIndicator.scale.set(1 + pulse * 0.3);
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
      // Spawn pulse on selection
      this.spawnPulse();

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

  protected update(): void {
    const now = performance.now();
    const delta = this.app.ticker.deltaMS / 1000;
    const maxRadius = Math.max(this.width, this.height) * 0.8;

    // Spawn new pulses
    if (now > this.nextPulseTime) {
      this.spawnPulse();
      this.nextPulseTime = now + 3000 + Math.random() * 2000;
    }

    // Update pulses
    this.pulses = this.pulses.filter((pulse) => {
      pulse.radius += pulse.speed * delta;

      // Fade out as radius grows
      pulse.alpha = 0.4 * (1 - pulse.radius / maxRadius);

      if (pulse.alpha > 0.01) {
        this.drawPulse(pulse);
        return true;
      }
      this.container.removeChild(pulse.graphics);
      pulse.graphics.destroy();
      return false;
    });
  }

  onResize(width: number, height: number): void {
    super.onResize(width, height);

    this.centerX = width / 2;
    this.centerY = height / 2;

    // Redraw all pulses at new center
    this.pulses.forEach((pulse) => {
      this.drawPulse(pulse);
    });
  }
}
