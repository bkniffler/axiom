import { Scene, GameObjects } from 'phaser';

interface Line {
    start: { x: number; y: number };
    end: { x: number; y: number };
    brightness: number;
}

interface Pulse {
    lineIndex: number;
    progress: number;
    speed: number;
    active: boolean;
    graphics?: GameObjects.Arc;
}

interface Node {
    x: number;
    y: number;
    graphics?: GameObjects.Arc;
}

interface MenuOption {
    text: string;
    position: number;
    textObject?: GameObjects.Text;
    scene: string;
}

export class MainMenu extends Scene {
    private graphics!: GameObjects.Graphics;

    // Geometry (in screen coordinates)
    private lines: Line[] = [];
    private menuLineIndex: number = 0;
    private nodes: Node[] = [];

    // Pulses
    private pulses: Pulse[] = [];
    private nextPulseTime: number = 0;

    // Menu state
    private menuOptions: MenuOption[] = [];
    private selectedIndex: number = 0;
    private menuIndicator?: GameObjects.Arc;
    private isTransitioning: boolean = false;

    // Screen dimensions
    private readonly WIDTH = 1024;
    private readonly HEIGHT = 768;

    constructor() {
        super('MainMenu');
    }

    create(): void {
        // Black background
        this.cameras.main.setBackgroundColor('#000000');

        // Create graphics object for drawing lines
        this.graphics = this.add.graphics();

        // Define geometry
        this.defineGeometry();

        // Create node graphics
        this.createNodeGraphics();

        // Create menu indicator
        this.createMenuIndicator();

        // Create menu options
        this.createMenuOptions();

        // Create title
        this.createTitle();

        // Setup input
        this.setupInput();

        // Schedule first ambient pulse
        this.nextPulseTime = this.time.now + Phaser.Math.Between(2000, 4000);
    }

    private defineGeometry(): void {
        // Define 5 lines in normalized coordinates (0-1), then convert to screen coords
        const normalizedLines = [
            // Menu line (the navigable thread) - gentle angle across lower third
            { start: { x: 0.05, y: 0.62 }, end: { x: 0.95, y: 0.58 }, brightness: 0.25 },
            // Background lines at various angles
            { start: { x: 0.15, y: 0.0 }, end: { x: 0.7, y: 1.0 }, brightness: 0.15 },
            { start: { x: 0.0, y: 0.85 }, end: { x: 0.55, y: 0.15 }, brightness: 0.18 },
            { start: { x: 0.1, y: 0.35 }, end: { x: 0.9, y: 0.28 }, brightness: 0.12 },
            { start: { x: 0.85, y: 0.1 }, end: { x: 0.4, y: 0.95 }, brightness: 0.15 }
        ];

        this.menuLineIndex = 0;

        // Convert to screen coordinates
        this.lines = normalizedLines.map(line => ({
            start: { x: line.start.x * this.WIDTH, y: line.start.y * this.HEIGHT },
            end: { x: line.end.x * this.WIDTH, y: line.end.y * this.HEIGHT },
            brightness: line.brightness
        }));

        // Calculate intersections
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
                    intersection.x > 50 && intersection.x < this.WIDTH - 50 &&
                    intersection.y > 50 && intersection.y < this.HEIGHT - 50) {

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

    private createNodeGraphics(): void {
        this.nodes.forEach(node => {
            node.graphics = this.add.circle(node.x, node.y, 4, 0xffffff, 0.3);

            // Add heartbeat animation
            this.tweens.add({
                targets: node.graphics,
                alpha: { from: 0.2, to: 0.4 },
                scale: { from: 1, to: 1.3 },
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }

    private createMenuIndicator(): void {
        const menuLine = this.lines[this.menuLineIndex];
        const pos = this.getPointOnLine(menuLine, 0.35);

        this.menuIndicator = this.add.circle(pos.x, pos.y, 6, 0xffffff, 0.9);

        // Subtle pulse animation
        this.tweens.add({
            targets: this.menuIndicator,
            alpha: { from: 0.7, to: 1 },
            scale: { from: 1, to: 1.2 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private createMenuOptions(): void {
        this.menuOptions = [
            { text: 'NEW GAME', position: 0.35, scene: 'Game' },
            { text: 'OPTIONS', position: 0.65, scene: 'Options' }
        ];

        const menuLine = this.lines[this.menuLineIndex];

        this.menuOptions.forEach((option) => {
            const pos = this.getPointOnLine(menuLine, option.position);

            option.textObject = this.add.text(pos.x, pos.y - 35, option.text, {
                fontFamily: 'Helvetica Neue, Arial, sans-serif',
                fontSize: '18px',
                color: '#ffffff',
                letterSpacing: 4
            }).setOrigin(0.5).setAlpha(0.6);
        });

        this.updateMenuSelection();
    }

    private createTitle(): void {
        this.add.text(512, 150, 'A X I O M', {
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: '42px',
            color: '#ffffff',
            letterSpacing: 20
        }).setOrigin(0.5).setAlpha(0.4);
    }

    private getPointOnLine(line: Line, t: number): { x: number; y: number } {
        return {
            x: line.start.x + (line.end.x - line.start.x) * t,
            y: line.start.y + (line.end.y - line.start.y) * t
        };
    }

    private setupInput(): void {
        this.input.keyboard?.on('keydown-UP', () => this.navigate(-1));
        this.input.keyboard?.on('keydown-W', () => this.navigate(-1));
        this.input.keyboard?.on('keydown-LEFT', () => this.navigate(-1));
        this.input.keyboard?.on('keydown-DOWN', () => this.navigate(1));
        this.input.keyboard?.on('keydown-S', () => this.navigate(1));
        this.input.keyboard?.on('keydown-RIGHT', () => this.navigate(1));
        this.input.keyboard?.on('keydown-ENTER', () => this.confirmSelection());
        this.input.keyboard?.on('keydown-SPACE', () => this.confirmSelection());

        this.menuOptions.forEach((option, index) => {
            if (option.textObject) {
                option.textObject.setInteractive({ useHandCursor: true });

                option.textObject.on('pointerover', () => {
                    if (!this.isTransitioning && this.selectedIndex !== index) {
                        this.selectOption(index);
                    }
                });

                option.textObject.on('pointerdown', () => {
                    if (!this.isTransitioning) {
                        if (this.selectedIndex === index) {
                            this.confirmSelection();
                        } else {
                            this.selectOption(index);
                        }
                    }
                });
            }
        });
    }

    private navigate(direction: number): void {
        if (this.isTransitioning) return;

        const newIndex = Phaser.Math.Clamp(
            this.selectedIndex + direction,
            0,
            this.menuOptions.length - 1
        );

        if (newIndex !== this.selectedIndex) {
            this.selectOption(newIndex);
        }
    }

    private selectOption(index: number): void {
        const fromPos = this.menuOptions[this.selectedIndex].position;
        const toPos = this.menuOptions[index].position;

        // Create navigation pulse
        this.spawnPulse(this.menuLineIndex, fromPos, toPos > fromPos ? 1 : -1, Math.abs(toPos - fromPos) / 0.3);

        // Animate indicator
        const menuLine = this.lines[this.menuLineIndex];
        const targetPos = this.getPointOnLine(menuLine, toPos);

        this.tweens.add({
            targets: this.menuIndicator,
            x: targetPos.x,
            y: targetPos.y,
            duration: 300,
            ease: 'Cubic.easeOut'
        });

        this.selectedIndex = index;
        this.updateMenuSelection();
    }

    private updateMenuSelection(): void {
        this.menuOptions.forEach((option, index) => {
            if (option.textObject) {
                this.tweens.add({
                    targets: option.textObject,
                    alpha: index === this.selectedIndex ? 1.0 : 0.6,
                    duration: 200,
                    ease: 'Sine.easeOut'
                });
            }
        });
    }

    private confirmSelection(): void {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const selectedOption = this.menuOptions[this.selectedIndex];

        // Flash effect
        if (selectedOption.textObject) {
            this.tweens.add({
                targets: selectedOption.textObject,
                alpha: { from: 1, to: 0.3 },
                yoyo: true,
                repeat: 2,
                duration: 100
            });
        }

        // Spawn pulses on all lines
        this.lines.forEach((_, i) => {
            this.spawnPulse(i, 0.5, Math.random() > 0.5 ? 1 : -1, 0.4);
        });

        // Transition
        this.time.delayedCall(600, () => {
            this.cameras.main.fadeOut(400, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start(selectedOption.scene);
            });
        });
    }

    private spawnPulse(lineIndex: number, startProgress: number, direction: number, speed: number): void {
        const line = this.lines[lineIndex];
        const pos = this.getPointOnLine(line, startProgress);

        const pulseGraphic = this.add.circle(pos.x, pos.y, 5, 0xffffff, 0.8);

        const pulse: Pulse = {
            lineIndex,
            progress: startProgress,
            speed: direction * speed,
            active: true,
            graphics: pulseGraphic
        };

        this.pulses.push(pulse);
    }

    private spawnAmbientPulse(): void {
        const availableLines = this.lines
            .map((_, i) => i)
            .filter(i => i !== this.menuLineIndex);

        if (availableLines.length === 0) return;

        const lineIndex = Phaser.Math.RND.pick(availableLines);
        const direction = Math.random() > 0.5 ? 1 : -1;
        const startProgress = direction > 0 ? 0 : 1;

        this.spawnPulse(lineIndex, startProgress, direction, 0.15 + Math.random() * 0.1);
    }

    update(time: number, delta: number): void {
        // Spawn ambient pulses
        if (time > this.nextPulseTime) {
            this.spawnAmbientPulse();
            this.nextPulseTime = time + Phaser.Math.Between(3000, 5000);
        }

        // Update pulses
        this.pulses = this.pulses.filter(pulse => {
            if (!pulse.active || !pulse.graphics) return false;

            pulse.progress += pulse.speed * (delta / 1000);

            // Update position
            const line = this.lines[pulse.lineIndex];
            const pos = this.getPointOnLine(line, pulse.progress);
            pulse.graphics.setPosition(pos.x, pos.y);

            // Fade based on progress
            const distFromCenter = Math.abs(pulse.progress - 0.5) * 2;
            pulse.graphics.setAlpha(0.8 * (1 - distFromCenter * 0.5));

            // Remove if out of bounds
            if (pulse.progress < -0.1 || pulse.progress > 1.1) {
                pulse.graphics.destroy();
                return false;
            }

            return true;
        });

        // Redraw lines
        this.drawLines();
    }

    private drawLines(): void {
        this.graphics.clear();

        this.lines.forEach(line => {
            const alpha = line.brightness;
            // Crisp 1px lines in Canvas mode
            this.graphics.lineStyle(1, 0xffffff, alpha);
            this.graphics.beginPath();
            // Offset by 0.5 for pixel-perfect rendering in Canvas
            this.graphics.moveTo(Math.floor(line.start.x) + 0.5, Math.floor(line.start.y) + 0.5);
            this.graphics.lineTo(Math.floor(line.end.x) + 0.5, Math.floor(line.end.y) + 0.5);
            this.graphics.strokePath();
        });
    }
}
