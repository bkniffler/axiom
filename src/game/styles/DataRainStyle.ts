import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { MenuStyle } from './MenuStyle';

interface RainDrop {
    x: number;
    y: number;
    speed: number;
    length: number;
    alpha: number;
    graphics: Graphics;
}

interface RainChar {
    x: number;
    y: number;
    speed: number;
    char: string;
    alpha: number;
    text: Text;
}

export class DataRainStyle extends MenuStyle {
    private rainDrops: RainDrop[] = [];
    private rainChars: RainChar[] = [];
    private readonly DROP_COUNT = 30;
    private readonly CHAR_COUNT = 15;
    private charStyle!: TextStyle;

    constructor(app: Application) {
        super(app);
        this.shaderConfig = {
            vignette: 0.3,
            grain: 0.04,
            bloom: 0.2,
            chromatic: 0
        };
    }

    protected createVisuals(): void {
        this.charStyle = new TextStyle({
            fontFamily: 'Courier New, monospace',
            fontSize: 14,
            fill: 0xffffff,
        });

        // Create rain drops (lines)
        for (let i = 0; i < this.DROP_COUNT; i++) {
            this.createRainDrop();
        }

        // Create rain chars
        for (let i = 0; i < this.CHAR_COUNT; i++) {
            this.createRainChar();
        }
    }

    private createRainDrop(): void {
        const graphics = new Graphics();

        const drop: RainDrop = {
            x: Math.random() * this.width,
            y: Math.random() * this.height - this.height,
            speed: 50 + Math.random() * 100,
            length: 30 + Math.random() * 60,
            alpha: 0.05 + Math.random() * 0.15,
            graphics
        };

        this.drawRainDrop(drop);
        this.container.addChildAt(graphics, 0);
        this.rainDrops.push(drop);
    }

    private drawRainDrop(drop: RainDrop): void {
        drop.graphics.clear();
        drop.graphics
            .moveTo(drop.x, drop.y)
            .lineTo(drop.x, drop.y + drop.length)
            .stroke({ width: 1, color: 0xffffff, alpha: drop.alpha });
    }

    private createRainChar(): void {
        const chars = '0123456789ABCDEF';
        const char = chars[Math.floor(Math.random() * chars.length)];

        const text = new Text({ text: char, style: this.charStyle });
        text.anchor.set(0.5);

        const rainChar: RainChar = {
            x: Math.random() * this.width,
            y: Math.random() * this.height - this.height,
            speed: 30 + Math.random() * 50,
            char,
            alpha: 0.1 + Math.random() * 0.2,
            text
        };

        text.position.set(rainChar.x, rainChar.y);
        text.alpha = rainChar.alpha;
        this.container.addChildAt(text, 0);
        this.rainChars.push(rainChar);
    }

    protected createMenuIndicator(): void {
        this.menuIndicator = new Graphics();
        this.menuIndicator.rect(-4, -4, 8, 8).fill({ color: 0xffffff, alpha: 0.9 });

        const startY = this.height * 0.6;
        this.menuIndicator.position.set(this.width / 2, startY);
        this.container.addChild(this.menuIndicator);

        // Digital pulse
        const animate = () => {
            if (this.destroyed) return;
            const time = performance.now() / 1000;
            const pulse = Math.floor(time * 4) % 2;
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
            const duration = 200;

            const animatePos = () => {
                if (this.destroyed) return;
                const elapsed = performance.now() - startTime;
                const t = Math.min(1, elapsed / duration);
                // Stepped animation for digital feel
                const stepped = Math.floor(t * 4) / 4;

                this.menuIndicator.x = startX + (targetX - startX) * stepped;
                this.menuIndicator.y = startYPos + (targetY - startYPos) * stepped;

                if (t < 1) this.requestAnimation(animatePos);
            };
            animatePos();
        } else {
            this.menuIndicator.position.set(targetX, targetY);
        }
    }

    protected update(): void {
        const delta = this.app.ticker.deltaMS / 1000;

        // Update rain drops
        this.rainDrops.forEach(drop => {
            drop.y += drop.speed * delta;

            if (drop.y > this.height + drop.length) {
                drop.y = -drop.length;
                drop.x = Math.random() * this.width;
            }

            this.drawRainDrop(drop);
        });

        // Update rain chars
        this.rainChars.forEach(char => {
            char.y += char.speed * delta;

            if (char.y > this.height + 20) {
                char.y = -20;
                char.x = Math.random() * this.width;
                // Change character
                const chars = '0123456789ABCDEF';
                char.char = chars[Math.floor(Math.random() * chars.length)];
                char.text.text = char.char;
            }

            char.text.position.set(char.x, char.y);

            // Flicker effect
            const time = performance.now() / 1000;
            if (Math.random() < 0.01) {
                char.text.alpha = 0.4;
            } else {
                char.text.alpha = char.alpha * (0.8 + 0.2 * Math.sin(time * 5 + char.x));
            }
        });
    }

    onResize(width: number, height: number): void {
        const scaleX = width / this.width;

        super.onResize(width, height);

        // Redistribute drops
        this.rainDrops.forEach(drop => {
            drop.x *= scaleX;
        });

        this.rainChars.forEach(char => {
            char.x *= scaleX;
            char.text.position.set(char.x, char.y);
        });
    }
}
