import { MenuCallbacks, SvgMenuStyle } from './SvgMenu';

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
  element: SVGLineElement;
}

interface RainChar {
  x: number;
  y: number;
  speed: number;
  char: string;
  opacity: number;
  element: SVGTextElement;
}

export class DataRainStyle extends SvgMenuStyle {
  private drops: RainDrop[] = [];
  private chars: RainChar[] = [];
  private rainGroup!: SVGGElement;
  private lastTime = performance.now();

  private readonly DROP_COUNT = 40;
  private readonly CHAR_COUNT = 20;
  private readonly CHARS = '0123456789ABCDEF';

  protected createVisuals(): void {
    // Rain group (behind menu)
    this.rainGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.svg.insertBefore(this.rainGroup, this.menuGroup);

    // Create rain drops (lines)
    for (let i = 0; i < this.DROP_COUNT; i++) {
      this.createDrop();
    }

    // Create rain characters
    for (let i = 0; i < this.CHAR_COUNT; i++) {
      this.createChar();
    }
  }

  private createDrop(): void {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const x = Math.random() * this.width;
    const y = Math.random() * this.height - this.height;
    const length = 30 + Math.random() * 60;
    const opacity = 0.05 + Math.random() * 0.15;
    const speed = 80 + Math.random() * 120;

    line.setAttribute('x1', String(x));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(x));
    line.setAttribute('y2', String(y + length));
    line.setAttribute('stroke', '#ffffff');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('opacity', String(opacity));
    line.setAttribute('vector-effect', 'non-scaling-stroke');

    this.rainGroup.appendChild(line);
    this.drops.push({ x, y, speed, length, opacity, element: line });
  }

  private createChar(): void {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    const x = Math.random() * this.width;
    const y = Math.random() * this.height - this.height;
    const char = this.CHARS[Math.floor(Math.random() * this.CHARS.length)];
    const opacity = 0.1 + Math.random() * 0.2;
    const speed = 40 + Math.random() * 60;

    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('opacity', String(opacity));
    text.setAttribute('font-family', 'Courier New, monospace');
    text.setAttribute('font-size', '14');
    text.textContent = char;

    this.rainGroup.appendChild(text);
    this.chars.push({ x, y, speed, char, opacity, element: text });
  }

  protected animate(): void {
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Update drops
    this.drops.forEach((drop) => {
      drop.y += drop.speed * delta;

      if (drop.y > this.height + drop.length) {
        drop.y = -drop.length;
        drop.x = Math.random() * this.width;
      }

      drop.element.setAttribute('x1', String(drop.x));
      drop.element.setAttribute('y1', String(drop.y));
      drop.element.setAttribute('x2', String(drop.x));
      drop.element.setAttribute('y2', String(drop.y + drop.length));
    });

    // Update chars
    const time = now / 1000;
    this.chars.forEach((char) => {
      char.y += char.speed * delta;

      if (char.y > this.height + 20) {
        char.y = -20;
        char.x = Math.random() * this.width;
        char.char = this.CHARS[Math.floor(Math.random() * this.CHARS.length)];
        char.element.textContent = char.char;
      }

      char.element.setAttribute('x', String(char.x));
      char.element.setAttribute('y', String(char.y));

      // Flicker effect
      if (Math.random() < 0.005) {
        char.element.setAttribute('opacity', '0.5');
      } else {
        const flicker =
          char.opacity * (0.8 + 0.2 * Math.sin(time * 5 + char.x));
        char.element.setAttribute('opacity', String(flicker));
      }
    });
  }

  onResize(): void {
    super.onResize();
  }
}
