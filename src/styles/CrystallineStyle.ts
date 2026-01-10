import { type Application, Graphics } from 'pixi.js';
import { MenuStyle } from './MenuStyle';

interface Crystal {
  x: number;
  y: number;
  size: number;
  rotation: number;
  alpha: number;
  lifespan: number;
  age: number;
  sides: number;
  graphics: Graphics;
}

export class CrystallineStyle extends MenuStyle {
  private crystals: Crystal[] = [];
  private nextSpawnTime = 0;
  private readonly MAX_CRYSTALS = 12;

  constructor(app: Application) {
    super(app);
    this.shaderConfig = {
      vignette: 0.3,
      grain: 0.01,
      bloom: 0.6,
      chromatic: 0.003,
    };
  }

  protected createVisuals(): void {
    // Spawn initial crystals
    for (let i = 0; i < 6; i++) {
      this.spawnCrystal();
    }
    this.nextSpawnTime = performance.now() + 1000;
  }

  private spawnCrystal(): void {
    if (this.crystals.length >= this.MAX_CRYSTALS) return;

    const graphics = new Graphics();

    // Spawn at edges
    let x: number;
    let y: number;
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0:
        x = Math.random() * this.width;
        y = 0;
        break;
      case 1:
        x = this.width;
        y = Math.random() * this.height;
        break;
      case 2:
        x = Math.random() * this.width;
        y = this.height;
        break;
      default:
        x = 0;
        y = Math.random() * this.height;
        break;
    }

    const crystal: Crystal = {
      x,
      y,
      size: 20 + Math.random() * 40,
      rotation: Math.random() * Math.PI * 2,
      alpha: 0,
      lifespan: 5000 + Math.random() * 5000,
      age: 0,
      sides: Math.random() > 0.5 ? 6 : 3, // Hexagon or triangle
      graphics,
    };

    this.drawCrystal(crystal);
    this.container.addChildAt(graphics, 0);
    this.crystals.push(crystal);
  }

  private drawCrystal(crystal: Crystal): void {
    crystal.graphics.clear();

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < crystal.sides; i++) {
      const angle = (i / crystal.sides) * Math.PI * 2 + crystal.rotation;
      points.push({
        x: Math.cos(angle) * crystal.size,
        y: Math.sin(angle) * crystal.size,
      });
    }

    // Draw outline
    crystal.graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      crystal.graphics.lineTo(points[i].x, points[i].y);
    }
    crystal.graphics.lineTo(points[0].x, points[0].y);
    crystal.graphics.stroke({
      width: 1,
      color: 0xffffff,
      alpha: crystal.alpha,
    });

    crystal.graphics.position.set(crystal.x, crystal.y);
  }

  protected createMenuIndicator(): void {
    this.menuIndicator = new Graphics();

    // Diamond shape
    this.menuIndicator.moveTo(0, -6);
    this.menuIndicator.lineTo(6, 0);
    this.menuIndicator.lineTo(0, 6);
    this.menuIndicator.lineTo(-6, 0);
    this.menuIndicator.lineTo(0, -6);
    this.menuIndicator.fill({ color: 0xffffff, alpha: 0.9 });

    const startY = this.height * 0.6;
    this.menuIndicator.position.set(this.width / 2, startY);
    this.container.addChild(this.menuIndicator);

    // Rotation animation
    const animate = () => {
      if (this.destroyed) return;
      const time = performance.now() / 1000;
      this.menuIndicator.rotation = time * 0.5;
      const pulse = 0.5 + 0.5 * Math.sin(time * 2);
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
      // Spawn a crystal on selection
      this.spawnCrystal();

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
    const delta = this.app.ticker.deltaMS;

    // Spawn new crystals periodically
    if (now > this.nextSpawnTime) {
      this.spawnCrystal();
      this.nextSpawnTime = now + 2000 + Math.random() * 3000;
    }

    // Update crystals
    this.crystals = this.crystals.filter((crystal) => {
      crystal.age += delta;

      // Fade in/out lifecycle
      const progress = crystal.age / crystal.lifespan;
      if (progress < 0.2) {
        crystal.alpha = (progress / 0.2) * 0.2;
      } else if (progress > 0.8) {
        crystal.alpha = ((1 - progress) / 0.2) * 0.2;
      } else {
        crystal.alpha = 0.2;
      }

      // Slow rotation
      crystal.rotation += 0.0005 * delta;

      // Redraw with updated alpha
      this.drawCrystal(crystal);

      // Remove when expired
      if (crystal.age >= crystal.lifespan) {
        this.container.removeChild(crystal.graphics);
        crystal.graphics.destroy();
        return false;
      }

      return true;
    });
  }

  onResize(width: number, height: number): void {
    const scaleX = width / this.width;
    const scaleY = height / this.height;

    super.onResize(width, height);

    // Scale crystal positions
    this.crystals.forEach((crystal) => {
      crystal.x *= scaleX;
      crystal.y *= scaleY;
      crystal.graphics.position.set(crystal.x, crystal.y);
    });
  }
}
