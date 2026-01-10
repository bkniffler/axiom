import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface MenuOption {
    text: string;
    action: () => void;
}

export interface ShaderConfig {
    vignette: number;
    grain: number;
    bloom: number;
    chromatic: number;
}

export abstract class MenuStyle {
    protected app: Application;
    protected container: Container;
    protected width: number;
    protected height: number;

    protected menuOptions: { text: string; textObj: Text; action: () => void }[] = [];
    protected selectedIndex = 0;
    protected isTransitioning = false;
    protected menuIndicator!: Graphics;
    protected title!: Text;
    protected destroyed = false;
    protected animationFrames: number[] = [];

    protected shaderConfig: ShaderConfig = {
        vignette: 0.3,
        grain: 0.02,
        bloom: 0.4,
        chromatic: 0.001
    };

    constructor(app: Application) {
        this.app = app;
        this.width = app.screen.width;
        this.height = app.screen.height;
        this.container = new Container();
    }

    protected requestAnimation(callback: () => void): number {
        const frame = requestAnimationFrame(() => {
            if (!this.destroyed) {
                callback();
            }
        });
        this.animationFrames.push(frame);
        return frame;
    }

    private boundUpdate: (() => void) | null = null;

    async init(): Promise<void> {
        this.app.stage.addChild(this.container);
        await this.createVisuals();
        this.createTitle();
        this.createMenuOptions();
        this.createMenuIndicator();
        this.setupInput();
        this.boundUpdate = this.update.bind(this);
        this.app.ticker.add(this.boundUpdate);
    }

    protected abstract createVisuals(): Promise<void> | void;
    protected abstract createMenuIndicator(): void;
    protected abstract updateIndicatorPosition(animate?: boolean): void;
    protected abstract update(): void;

    getShaderConfig(): ShaderConfig {
        return this.shaderConfig;
    }

    protected createTitle(): void {
        const style = new TextStyle({
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: 42,
            fill: 0xffffff,
            letterSpacing: 20,
        });

        this.title = new Text({ text: 'A X I O M', style });
        this.title.anchor.set(0.5);
        this.title.position.set(this.width / 2, this.height * 0.2);
        this.title.alpha = 0.4;
        this.container.addChild(this.title);
    }

    protected createMenuOptions(): void {
        const style = new TextStyle({
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: 18,
            fill: 0xffffff,
            letterSpacing: 4,
        });

        const options = [
            { text: 'NEW GAME', action: () => this.startGame() },
            { text: 'OPTIONS', action: () => this.showOptions() }
        ];

        const startY = this.height * 0.6;
        const spacing = 50;

        options.forEach((opt, i) => {
            const text = new Text({ text: opt.text, style });
            text.anchor.set(0.5);
            text.position.set(this.width / 2, startY + i * spacing);
            text.alpha = 0.6;
            text.eventMode = 'static';
            text.cursor = 'pointer';

            const index = this.menuOptions.length;
            text.on('pointerover', () => this.onHover(index));
            text.on('pointerdown', () => this.onSelect(index));

            this.container.addChild(text);
            this.menuOptions.push({ ...opt, textObj: text });
        });

        this.updateSelection();
    }

    protected setupInput(): void {
        const handler = (e: KeyboardEvent) => {
            if (this.isTransitioning) return;

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
        };

        window.addEventListener('keydown', handler);
        (this as any)._keyHandler = handler;
    }

    protected navigate(direction: number): void {
        const newIndex = Math.max(0, Math.min(this.menuOptions.length - 1, this.selectedIndex + direction));
        if (newIndex !== this.selectedIndex) {
            this.selectedIndex = newIndex;
            this.updateSelection();
            this.updateIndicatorPosition(true);
        }
    }

    protected onHover(index: number): void {
        if (!this.isTransitioning && this.selectedIndex !== index) {
            this.selectedIndex = index;
            this.updateSelection();
            this.updateIndicatorPosition(true);
        }
    }

    protected onSelect(index: number): void {
        if (!this.isTransitioning) {
            if (this.selectedIndex === index) {
                this.confirmSelection();
            } else {
                this.selectedIndex = index;
                this.updateSelection();
                this.updateIndicatorPosition(true);
            }
        }
    }

    protected updateSelection(): void {
        this.menuOptions.forEach((opt, i) => {
            opt.textObj.alpha = i === this.selectedIndex ? 1.0 : 0.6;
        });
    }

    protected confirmSelection(): void {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const selected = this.menuOptions[this.selectedIndex];

        // Flash effect
        let flashes = 0;
        const flash = () => {
            selected.textObj.alpha = selected.textObj.alpha > 0.5 ? 0.3 : 1.0;
            flashes++;
            if (flashes < 6) setTimeout(flash, 100);
        };
        flash();

        setTimeout(() => {
            selected.action();
        }, 600);
    }

    protected startGame(): void {
        console.log('Starting game...');
    }

    protected showOptions(): void {
        console.log('Showing options...');
    }

    onResize(width: number, height: number): void {
        this.width = width;
        this.height = height;

        // Reposition title
        this.title.position.set(this.width / 2, this.height * 0.2);

        // Reposition menu options
        const startY = this.height * 0.6;
        const spacing = 50;
        this.menuOptions.forEach((opt, i) => {
            opt.textObj.position.set(this.width / 2, startY + i * spacing);
        });

        this.updateIndicatorPosition(false);
    }

    destroy(): void {
        this.destroyed = true;

        // Cancel all animation frames
        this.animationFrames.forEach(frame => cancelAnimationFrame(frame));
        this.animationFrames = [];

        if ((this as any)._keyHandler) {
            window.removeEventListener('keydown', (this as any)._keyHandler);
        }
        if (this.boundUpdate) {
            this.app.ticker.remove(this.boundUpdate);
            this.boundUpdate = null;
        }
        this.container.destroy({ children: true });
    }
}
