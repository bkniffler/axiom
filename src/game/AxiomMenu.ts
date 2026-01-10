import { Application, Text, TextStyle } from 'pixi.js';
import { MenuStyle } from './styles/MenuStyle';
import { AxiomCurrentStyle } from './styles/AxiomCurrentStyle';
import { ParticleDriftStyle } from './styles/ParticleDriftStyle';
import { ConcentricRingsStyle } from './styles/ConcentricRingsStyle';
import { HorizonLineStyle } from './styles/HorizonLineStyle';
import { CrystallineStyle } from './styles/CrystallineStyle';
import { PulseEmanationStyle } from './styles/PulseEmanationStyle';
import { DataRainStyle } from './styles/DataRainStyle';
import { PostProcessor } from './shaders/PostProcessor';

type StyleConstructor = new (app: Application) => MenuStyle;

const STYLES: { name: string; constructor: StyleConstructor }[] = [
    { name: 'Axiom Current', constructor: AxiomCurrentStyle },
    { name: 'Particle Drift', constructor: ParticleDriftStyle },
    { name: 'Concentric Rings', constructor: ConcentricRingsStyle },
    { name: 'Horizon Line', constructor: HorizonLineStyle },
    { name: 'Crystalline', constructor: CrystallineStyle },
    { name: 'Pulse Emanation', constructor: PulseEmanationStyle },
    { name: 'Data Rain', constructor: DataRainStyle }
];

export class AxiomMenu {
    private app: Application;
    private currentStyle: MenuStyle | null = null;
    private currentStyleIndex = 0;
    private postProcessor: PostProcessor | null = null;

    private styleLabel!: Text;
    private controlsLabel!: Text;

    constructor(app: Application) {
        this.app = app;
    }

    async init(): Promise<void> {
        // Create UI labels
        this.createLabels();

        // Setup keyboard controls
        this.setupControls();

        // Initialize first style
        await this.switchStyle(0);

        // Update loop for post-processor
        this.app.ticker.add(() => {
            if (this.postProcessor) {
                this.postProcessor.update(performance.now() / 1000);
            }
        });
    }

    private createLabels(): void {
        const labelStyle = new TextStyle({
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: 12,
            fill: 0xffffff,
            letterSpacing: 1,
        });

        // Style name label (top right)
        this.styleLabel = new Text({ text: '', style: labelStyle });
        this.styleLabel.anchor.set(1, 0);
        this.styleLabel.position.set(this.app.screen.width - 20, 20);
        this.styleLabel.alpha = 0.4;
        this.app.stage.addChild(this.styleLabel);

        // Controls label (bottom left)
        this.controlsLabel = new Text({
            text: '1-7: Style  |  F: Toggle FX  |  G/B/V: Grain/Bloom/Vignette',
            style: labelStyle
        });
        this.controlsLabel.position.set(20, this.app.screen.height - 30);
        this.controlsLabel.alpha = 0.3;
        this.app.stage.addChild(this.controlsLabel);
    }

    private setupControls(): void {
        window.addEventListener('keydown', (e) => {
            // Style switching (1-7)
            const num = parseInt(e.key);
            if (num >= 1 && num <= 7) {
                this.switchStyle(num - 1);
                return;
            }

            // Shader toggles
            switch (e.key.toLowerCase()) {
                case 'g':
                    if (this.postProcessor) {
                        const enabled = this.postProcessor.toggleGrain();
                        this.showToast(`Grain: ${enabled ? 'ON' : 'OFF'}`);
                    }
                    break;
                case 'b':
                    if (this.postProcessor) {
                        const enabled = this.postProcessor.toggleBloom();
                        this.showToast(`Bloom: ${enabled ? 'ON' : 'OFF'}`);
                    }
                    break;
                case 'v':
                    if (this.postProcessor) {
                        const enabled = this.postProcessor.toggleVignette();
                        this.showToast(`Vignette: ${enabled ? 'ON' : 'OFF'}`);
                    }
                    break;
                case 'f':
                    if (this.postProcessor) {
                        const enabled = this.postProcessor.toggleAll();
                        this.showToast(`All FX: ${enabled ? 'ON' : 'OFF'}`);
                    }
                    break;
            }
        });
    }

    private async switchStyle(index: number): Promise<void> {
        if (index < 0 || index >= STYLES.length) return;
        if (index === this.currentStyleIndex && this.currentStyle) return;

        // Destroy current style
        if (this.currentStyle) {
            this.currentStyle.destroy();
            this.currentStyle = null;
        }

        // Destroy current post processor
        if (this.postProcessor) {
            this.postProcessor.destroy();
            this.postProcessor = null;
        }

        // Create new style
        this.currentStyleIndex = index;
        const StyleClass = STYLES[index].constructor;
        this.currentStyle = new StyleClass(this.app);
        await this.currentStyle.init();

        // Create post processor with style's shader config
        this.postProcessor = new PostProcessor(this.app.stage);
        this.postProcessor.setConfig(this.currentStyle.getShaderConfig());

        // Update label
        this.styleLabel.text = `${index + 1}. ${STYLES[index].name}`;

        // Ensure labels are on top
        this.app.stage.setChildIndex(this.styleLabel, this.app.stage.children.length - 1);
        this.app.stage.setChildIndex(this.controlsLabel, this.app.stage.children.length - 1);
    }

    private showToast(message: string): void {
        const style = new TextStyle({
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: 14,
            fill: 0xffffff,
        });

        const toast = new Text({ text: message, style });
        toast.anchor.set(0.5);
        toast.position.set(this.app.screen.width / 2, this.app.screen.height - 60);
        toast.alpha = 0.8;
        this.app.stage.addChild(toast);

        // Fade out
        let alpha = 0.8;
        const fade = () => {
            alpha -= 0.02;
            toast.alpha = alpha;
            if (alpha > 0) {
                requestAnimationFrame(fade);
            } else {
                this.app.stage.removeChild(toast);
                toast.destroy();
            }
        };
        setTimeout(fade, 500);
    }

    onResize(width: number, height: number): void {
        if (this.currentStyle) {
            this.currentStyle.onResize(width, height);
        }

        // Reposition labels
        this.styleLabel.position.set(width - 20, 20);
        this.controlsLabel.position.set(20, height - 30);
    }
}
