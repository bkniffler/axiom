import { type Application, Container, Graphics } from 'pixi.js';
import { MenuStyle } from './MenuStyle';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  graphics: Graphics;
}

export class ParticleDriftStyle extends MenuStyle {
  private particles: Particle[] = [];
  private particleContainer!: Container;
  private readonly PARTICLE_COUNT = 80;

  constructor(app: Application) {
    super(app);
    this.shaderConfig = {
      vignette: 0.4,
      grain: 0.03,
      bloom: 0.3,
      chromatic: 0,
    };
  }

  protected createVisuals(): void {
    this.particleContainer = new Container();
    this.container.addChildAt(this.particleContainer, 0);

    // Create particles
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.createParticle();
    }
  }

  private createParticle(): void {
    const graphics = new Graphics();
    const size = 1 + Math.random() * 2;
    const alpha = 0.1 + Math.random() * 0.3;

    graphics.circle(0, 0, size).fill({ color: 0xffffff, alpha });

    const particle: Particle = {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size,
      alpha,
      graphics,
    };

    graphics.position.set(particle.x, particle.y);
    this.particleContainer.addChild(graphics);
    this.particles.push(particle);
  }

  protected createMenuIndicator(): void {
    this.menuIndicator = new Graphics();
    this.menuIndicator.circle(0, 0, 6).fill({ color: 0xffffff, alpha: 0.8 });

    const startY = this.height * 0.6;
    this.menuIndicator.position.set(this.width / 2, startY);
    this.container.addChild(this.menuIndicator);

    // Gentle pulse
    const animate = () => {
      if (this.destroyed) return;
      const time = performance.now() / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(time * 1.5);
      this.menuIndicator.alpha = 0.6 + pulse * 0.4;
      this.menuIndicator.scale.set(1 + pulse * 0.15);
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
      const duration = 400;

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
    const delta = this.app.ticker.deltaMS / 1000;

    // Get indicator position for gravity effect
    const indicatorX = this.menuIndicator.x;
    const indicatorY = this.menuIndicator.y;

    this.particles.forEach((particle) => {
      // Subtle gravity toward indicator
      const dx = indicatorX - particle.x;
      const dy = indicatorY - particle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 50 && dist < 300) {
        const force = 0.0001 / (dist * 0.01);
        particle.vx += (dx / dist) * force;
        particle.vy += (dy / dist) * force;
      }

      // Apply velocity with damping
      particle.x += particle.vx * delta * 60;
      particle.y += particle.vy * delta * 60;
      particle.vx *= 0.99;
      particle.vy *= 0.99;

      // Add slight random drift
      particle.vx += (Math.random() - 0.5) * 0.01;
      particle.vy += (Math.random() - 0.5) * 0.01;

      // Wrap around screen
      if (particle.x < -20) particle.x = this.width + 20;
      if (particle.x > this.width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = this.height + 20;
      if (particle.y > this.height + 20) particle.y = -20;

      particle.graphics.position.set(particle.x, particle.y);

      // Subtle alpha variation
      const time = performance.now() / 1000;
      particle.graphics.alpha =
        particle.alpha * (0.8 + 0.2 * Math.sin(time + particle.x * 0.01));
    });
  }

  onResize(width: number, height: number): void {
    const oldWidth = this.width;
    const oldHeight = this.height;

    super.onResize(width, height);

    // Scale particle positions
    const scaleX = width / oldWidth;
    const scaleY = height / oldHeight;

    this.particles.forEach((particle) => {
      particle.x *= scaleX;
      particle.y *= scaleY;
      particle.graphics.position.set(particle.x, particle.y);
    });
  }
}
