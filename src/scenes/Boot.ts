import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create() {
    // Skip directly to MainMenu - no assets needed for our minimalist design
    this.scene.start('MainMenu');
  }
}
