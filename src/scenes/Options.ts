import { type GameObjects, Scene } from 'phaser';

export class Options extends Scene {
  private backText!: GameObjects.Text;

  constructor() {
    super('Options');
  }

  create(): void {
    // Black background matching main menu
    this.cameras.main.setBackgroundColor('#000000');

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Title
    this.add
      .text(512, 300, 'O P T I O N S', {
        fontFamily:
          '"Orbitron", "Exo 2", "Rajdhani", "Helvetica Neue", Arial, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        letterSpacing: 12,
      })
      .setOrigin(0.5)
      .setAlpha(0.4);

    // Coming soon message
    this.add
      .text(512, 384, 'Coming Soon', {
        fontFamily:
          '"Orbitron", "Exo 2", "Rajdhani", "Helvetica Neue", Arial, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setAlpha(0.3);

    // Back option
    this.backText = this.add
      .text(512, 500, 'BACK', {
        fontFamily:
          '"Orbitron", "Exo 2", "Rajdhani", "Helvetica Neue", Arial, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0.6);

    this.backText.setInteractive({ useHandCursor: true });

    this.backText.on('pointerover', () => {
      this.backText.setAlpha(1.0);
    });

    this.backText.on('pointerout', () => {
      this.backText.setAlpha(0.6);
    });

    this.backText.on('pointerdown', () => {
      this.goBack();
    });

    // Keyboard input
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.input.keyboard?.on('keydown-ENTER', () => this.goBack());
    this.input.keyboard?.on('keydown-SPACE', () => this.goBack());
  }

  private goBack(): void {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainMenu');
    });
  }
}
