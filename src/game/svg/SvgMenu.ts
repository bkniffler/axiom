export interface MenuCallbacks {
    onStartGame: () => void;
    onOptions: () => void;
}

export abstract class SvgMenuStyle {
    protected svg: SVGSVGElement;
    protected width: number;
    protected height: number;
    protected menuGroup: SVGGElement;
    protected selectedIndex = 0;
    protected callbacks: MenuCallbacks;
    protected animationId: number | null = null;

    constructor(container: HTMLElement, callbacks: MenuCallbacks) {
        this.callbacks = callbacks;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Create SVG element
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.background = '#000';
        container.appendChild(this.svg);

        // Menu group
        this.menuGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.menuGroup);

        this.setupInput();
    }

    protected abstract createVisuals(): void;
    protected abstract animate(): void;

    init(): void {
        this.createTitle();
        this.createMenuOptions();
        this.createVisuals();
        this.startAnimation();
    }

    private createTitle(): void {
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', String(this.width / 2));
        title.setAttribute('y', String(this.height * 0.2));
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('fill', '#ffffff');
        title.setAttribute('opacity', '0.4');
        title.setAttribute('font-family', 'Helvetica Neue, Arial, sans-serif');
        title.setAttribute('font-size', '42');
        title.setAttribute('letter-spacing', '20');
        title.textContent = 'A X I O M';
        this.menuGroup.appendChild(title);
    }

    private createMenuOptions(): void {
        const options = ['NEW GAME', 'OPTIONS'];
        const startY = this.height * 0.6;
        const spacing = 50;

        options.forEach((text, i) => {
            const option = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            option.setAttribute('x', String(this.width / 2));
            option.setAttribute('y', String(startY + i * spacing));
            option.setAttribute('text-anchor', 'middle');
            option.setAttribute('fill', '#ffffff');
            option.setAttribute('opacity', i === this.selectedIndex ? '1' : '0.6');
            option.setAttribute('font-family', 'Helvetica Neue, Arial, sans-serif');
            option.setAttribute('font-size', '18');
            option.setAttribute('letter-spacing', '4');
            option.setAttribute('data-index', String(i));
            option.setAttribute('cursor', 'pointer');
            option.textContent = text;
            option.style.transition = 'opacity 0.2s';

            option.addEventListener('mouseenter', () => this.selectOption(i));
            option.addEventListener('click', () => this.confirmSelection());

            this.menuGroup.appendChild(option);
        });

        // Indicator
        const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        indicator.setAttribute('cx', String(this.width / 2));
        indicator.setAttribute('cy', String(startY));
        indicator.setAttribute('r', '5');
        indicator.setAttribute('fill', '#ffffff');
        indicator.setAttribute('id', 'menu-indicator');
        this.menuGroup.appendChild(indicator);
    }

    private setupInput(): void {
        window.addEventListener('keydown', (e) => {
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
        });
    }

    private navigate(dir: number): void {
        const newIndex = Math.max(0, Math.min(1, this.selectedIndex + dir));
        if (newIndex !== this.selectedIndex) {
            this.selectOption(newIndex);
        }
    }

    private selectOption(index: number): void {
        this.selectedIndex = index;

        // Update text opacities
        const texts = this.menuGroup.querySelectorAll('text[data-index]');
        texts.forEach((t, i) => {
            t.setAttribute('opacity', i === index ? '1' : '0.6');
        });

        // Move indicator
        const indicator = this.svg.getElementById('menu-indicator');
        if (indicator) {
            const startY = this.height * 0.6;
            const spacing = 50;
            indicator.setAttribute('cy', String(startY + index * spacing));
        }
    }

    private confirmSelection(): void {
        if (this.selectedIndex === 0) {
            this.callbacks.onStartGame();
        } else {
            this.callbacks.onOptions();
        }
    }

    private startAnimation(): void {
        const loop = () => {
            this.animate();
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    destroy(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.svg.remove();
    }

    onResize(): void {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    }
}
