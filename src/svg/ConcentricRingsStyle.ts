import { SvgMenuStyle } from './SvgMenu';

export class ConcentricRingsStyle extends SvgMenuStyle {
  private rings: SVGCircleElement[] = [];
  private readonly RING_COUNT = 5;
  private startTime = performance.now();

  protected createVisuals(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxRadius = Math.max(this.width, this.height) * 0.45;

    // Create rings group (behind menu)
    const ringsGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.svg.insertBefore(ringsGroup, this.menuGroup);

    for (let i = 0; i < this.RING_COUNT; i++) {
      const ring = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      const radius = (i + 1) * (maxRadius / this.RING_COUNT);

      ring.setAttribute('cx', String(cx));
      ring.setAttribute('cy', String(cy));
      ring.setAttribute('r', String(radius));
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#ffffff');
      ring.setAttribute('stroke-width', '1');
      ring.setAttribute('opacity', String(0.15 - i * 0.02));
      // SVG vector-effect keeps stroke width constant regardless of transform
      ring.setAttribute('vector-effect', 'non-scaling-stroke');

      ringsGroup.appendChild(ring);
      this.rings.push(ring);
    }
  }

  protected animate(): void {
    const time = (performance.now() - this.startTime) / 1000;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxRadius = Math.max(this.width, this.height) * 0.45;

    this.rings.forEach((ring, i) => {
      // Slow breathing animation
      const baseRadius = (i + 1) * (maxRadius / this.RING_COUNT);
      const breathe = Math.sin(time * 0.5 + i * 0.5) * 8;
      const radius = baseRadius + breathe;

      ring.setAttribute('r', String(radius));
      ring.setAttribute('cx', String(cx));
      ring.setAttribute('cy', String(cy));

      // Subtle opacity variation
      const baseOpacity = 0.15 - i * 0.02;
      const opacityPulse = 0.8 + 0.2 * Math.sin(time * 0.3 + i);
      ring.setAttribute('opacity', String(baseOpacity * opacityPulse));
    });
  }

  onResize(): void {
    super.onResize();
    // Rings will update on next animate() call
  }
}
