import type { CanvasKit, Paint, Surface, Typeface } from 'canvaskit-wasm';
import { MenuCallbacks, SkiaMenuStyle } from './SkiaMenu';
import {
  createCamera,
  resetCamera,
  setCameraTarget,
  stepCamera,
} from './starmap/camera/controller';
import { worldToScreen } from './starmap/camera/transforms';
import { hitTestStarMap } from './starmap/input/hitTest';
import { smoothFactor } from './starmap/math/smoothing';
import { drawAsteroidBelts } from './starmap/render/passes/asteroidBelts';
import { drawCentralStar } from './starmap/render/passes/centralStar';
import { drawDeepSpaceObjects } from './starmap/render/passes/deepSpaceObjects';
import { drawPlanetInfoPanel } from './starmap/render/passes/infoPanel';
import { drawOrbitingObjects } from './starmap/render/passes/orbitingObjects';
import { drawOrbitPaths } from './starmap/render/passes/orbitPaths';
import {
  drawParticles,
  type Particle,
} from './starmap/render/passes/particles';
import {
  drawPlanetHoverLabel,
  drawPlanets,
} from './starmap/render/passes/planets';
import { drawScanlines } from './starmap/render/passes/scanlines';
import { drawStars } from './starmap/render/passes/stars';
import { drawZoomIndicator } from './starmap/render/passes/zoomIndicator';
import { SkiaPixelRenderer } from './starmap/render/SkiaPixelRenderer';
import { BlackoutShader } from './starmap/shaders/BlackoutShader';
import { NebulaShader } from './starmap/shaders/NebulaShader';
import { advanceComets } from './starmap/sim/deepSpace';
import {
  advanceAsteroidBelts,
  advanceOrbitingObjects,
  advancePlanetOrbits,
} from './starmap/sim/orbits';
import { stepParticles } from './starmap/sim/particles';
import { spawnPlanetExplosionParticles } from './starmap/sim/particlesSpawn';
import { TransferTrafficSystem } from './starmap/traffic/TransferTrafficSystem';
import { measurePixelTextWidth } from './starmap/ui/pixelFont3x5';
import { drawPixelText } from './starmap/ui/pixelTextDraw';

interface Planet {
  name: string;
  description: string;
  type: string;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
  size: number;
  color: number[];
  hasRing?: boolean;
  moon?: {
    orbitRadius: number;
    orbitSpeed: number;
    angle: number;
    size: number;
  };
}

interface Star {
  x: number;
  y: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

type OrbitingObjectKind = 'station' | 'probe' | 'ship';

interface OrbitingObject {
  kind: OrbitingObjectKind;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
  size: number;
  color: number[];
  blinkSpeed?: number;
}

interface AsteroidBelt {
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
  thickness: number;
  color: number[];
  asteroids: { angleOffset: number; radiusOffset: number; size: number }[];
}

type DeepSpaceObject =
  | {
      kind: 'nebula';
      x: number;
      y: number;
      size: number;
      color: number[];
      opacity: number;
      points: { dx: number; dy: number; opacity: number }[];
    }
  | {
      kind: 'roguePlanet';
      x: number;
      y: number;
      size: number;
      color: number[];
      opacity: number;
    }
  | {
      kind: 'derelict';
      x: number;
      y: number;
      size: number;
      color: number[];
      opacity: number;
    }
  | {
      kind: 'beacon';
      x: number;
      y: number;
      size: number;
      color: number[];
      opacity: number;
      blinkSpeed: number;
    }
  | {
      kind: 'comet';
      x: number;
      y: number;
      size: number;
      color: number[];
      opacity: number;
      vx: number;
      vy: number;
      tail: number;
    };

export class StarMapPixelStyle extends SkiaMenuStyle {
  private planets: Planet[] = [];
  private stars: Star[] = [];
  private particles: Particle[] = [];
  private orbitingObjects: OrbitingObject[] = [];
  private asteroidBelts: AsteroidBelt[] = [];
  private deepSpaceObjects: DeepSpaceObject[] = [];
  private transferTraffic: TransferTrafficSystem | null = null;
  private startTime = 0;
  private particlesSpawned = false;
  private lastTime = 0;
  private shakePhase = 0; // 0 = no shake, progresses during pre-explosion
  private planetShakeOffsets: { seed: number; delay: number }[] = []; // Randomized per planet

  private readonly STAR_COUNT_NEAR = 70;
  private readonly STAR_COUNT_FAR = 160;
  private readonly PIXEL_SIZE = 3; // Size of each "pixel"
  private starPixelSize = 2;
  private readonly TARGET_PARTICLE_COUNT = 220;
  private readonly SHAKE_DURATION = 0.3; // Shake for 30% of transition before exploding
  private systemBaseOrbit = 0;

  // Exploration / fog-of-war (world-space radius from the sun)
  private unlockRadius = 0;
  private targetUnlockRadius = 0;
  private unlockStep = 4;
  private unlockMinRadius = 0;
  private unlockMaxRadius = 0;
  private readonly UNLOCK_EDGE_PX = 36; // screen-pixel thickness of the pixelated boundary

  // Zoom state
  private zoom = 1;
  private targetZoom = 1;
  private readonly MIN_ZOOM = 0.35;
  private readonly MAX_ZOOM = 3;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;

  // Camera state (world-space offsets; sun is (0,0))
  private camera = createCamera();
  private followPlanetIndex: number | null = null;
  private readonly CAMERA_LERP = 0.085;
  private readonly STAR_PARALLAX = 0.18;
  private readonly DEEP_SPACE_PARALLAX = 0.75;
  private readonly MAX_DELTA_TIME = 0.05;
  private readonly ORBIT_SPEED_SCALE = 0.35;

  // Visual settings (togglable)
  private showOrbitalLines = true;

  // Mouse interaction
  private mouseX = 0;
  private mouseY = 0;
  private hoveredPlanetIndex = -1;
  private selectedPlanetIndex = -1;
  private hoveredSun = false;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private mouseClickHandler: ((e: MouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  // Transition
  protected transitionDuration = 1800;

  // Paints
  private pixelPaint!: Paint;
  private nebula: NebulaShader | null = null;
  private blackout: BlackoutShader | null = null;
  private renderer: SkiaPixelRenderer | null = null;
  private disposedStyle = false;

  // Retro color palette (limited colors)
  private readonly COLORS = {
    white: [255, 255, 255],
    lightGray: [170, 170, 170],
    midGray: [100, 100, 100],
    darkGray: [50, 50, 50],
    cyan: [0, 255, 255],
    blue: [100, 100, 255],
    purple: [180, 100, 255],
    orange: [255, 150, 50],
    red: [255, 80, 80],
  };

  protected createVisuals(): void {
    const CK = this.CanvasKit;
    this.startTime = performance.now();

    // Stars look best slightly smaller than the rest of the pixel grid.
    this.starPixelSize = Math.max(1, Math.round(this.PIXEL_SIZE * 0.66));

    // Single paint for all pixel drawing - NO anti-aliasing
    this.pixelPaint = new CK.Paint();
    this.pixelPaint.setStyle(CK.PaintStyle.Fill);
    this.pixelPaint.setAntiAlias(false);
    this.renderer = new SkiaPixelRenderer({
      CanvasKit: CK,
      canvas: this.canvas,
      paint: this.pixelPaint,
      pixelSize: this.PIXEL_SIZE,
      starPixelSize: this.starPixelSize,
      white: this.COLORS.white,
    });

    this.initStars();
    this.initPlanets();
    this.initAsteroidBelts();
    this.initOrbitingObjects();
    this.initDeepSpaceObjects();
    this.initUnlockDefaults();
    this.initTransferTraffic();
    this.nebula = new NebulaShader(CK);
    this.nebula.init();
    this.blackout = new BlackoutShader(CK);
    this.blackout.init();
    this.setupZoom();
    this.setupMouseHandlers();
    this.setupKeyHandlers();
  }

  private initTransferTraffic(): void {
    this.transferTraffic = new TransferTrafficSystem({
      pixelSize: this.PIXEL_SIZE,
      systemBaseOrbit: this.systemBaseOrbit,
      colors: {
        white: this.COLORS.white,
        lightGray: this.COLORS.lightGray,
        cyan: this.COLORS.cyan,
        blue: this.COLORS.blue,
        orange: this.COLORS.orange,
      },
      maxShips: 4,
      dockTimeSeconds: 1.6,
    });

    // First ship spawns a moment after entering the menu.
    this.transferTraffic.reset(2.5 + Math.random() * 3.0);
  }

  private setupZoom(): void {
    this.wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.targetZoom = Math.max(
        this.MIN_ZOOM,
        Math.min(this.MAX_ZOOM, this.targetZoom * zoomDelta)
      );
    };
    window.addEventListener('wheel', this.wheelHandler, { passive: false });
  }

  private setupMouseHandlers(): void {
    this.mouseMoveHandler = (e: MouseEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.updateHoveredPlanet();
    };

    this.mouseClickHandler = (e: MouseEvent) => {
      // Don't handle clicks on UI elements
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;

      if (this.hoveredPlanetIndex >= 0) {
        // Toggle selection
        if (this.selectedPlanetIndex === this.hoveredPlanetIndex) {
          this.selectedPlanetIndex = -1;
        } else {
          this.selectedPlanetIndex = this.hoveredPlanetIndex;
        }
        this.focusPlanet(this.hoveredPlanetIndex);
      } else if (this.hoveredSun) {
        this.resetCamera(true);
      } else {
        // Click on empty space deselects
        this.selectedPlanetIndex = -1;
        this.followPlanetIndex = null;
      }
    };

    window.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('click', this.mouseClickHandler);
  }

  private setupKeyHandlers(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (
        e.key === 'r' ||
        e.key === 'R' ||
        e.key === '0' ||
        e.key === 'Escape'
      ) {
        this.resetCamera(true);
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  public resetCamera(animated = true): void {
    this.followPlanetIndex = null;
    this.selectedPlanetIndex = -1;
    if (animated) {
      setCameraTarget(this.camera, 0, 0);
    } else {
      resetCamera(this.camera);
    }
  }

  public setUnlockRadiusWorld(radius: number): void {
    const r = Math.max(0, radius);
    this.targetUnlockRadius = r;
    if (this.unlockRadius <= 0) this.unlockRadius = r;
  }

  public setUnlockStep(step: number, totalSteps = 10): void {
    const steps = Math.max(2, Math.floor(totalSteps));
    const prevStep = this.unlockStep;
    const clamped = Math.max(1, Math.min(steps, Math.floor(step)));
    this.unlockStep = clamped;

    // Last step means fully visible.
    if (clamped >= steps) {
      this.setUnlockRadiusWorld(1e9);
      return;
    }

    const denom = steps - 2;
    const t = denom > 0 ? (clamped - 1) / denom : 1;
    const eased = Math.max(0, Math.min(1, t)) ** 1.25;

    const minR =
      this.unlockMinRadius > 0
        ? this.unlockMinRadius
        : Math.max(1, this.systemBaseOrbit * 1.1);
    const maxR =
      this.unlockMaxRadius > 0
        ? this.unlockMaxRadius
        : Math.max(minR + 1, this.systemBaseOrbit * 5);
    const r = minR + (maxR - minR) * eased;

    // If we were fully revealed, start shrinking from the max bound (not from 1e9),
    // so the animation remains readable.
    if (prevStep >= steps && clamped < steps && this.unlockMaxRadius > 0) {
      this.unlockRadius = this.unlockMaxRadius;
    }

    this.setUnlockRadiusWorld(r);
  }

  public getUnlockStep(): number {
    return this.unlockStep;
  }

  private focusPlanet(index: number): void {
    const planet = this.planets[index];
    if (!planet) return;
    this.followPlanetIndex = index;
    const w = this.getPlanetWorldPosition(planet);
    setCameraTarget(this.camera, w.x, w.y);
  }

  private getPlanetWorldPosition(planet: Planet): { x: number; y: number } {
    return {
      x: Math.cos(planet.angle) * planet.orbitRadius,
      y: Math.sin(planet.angle) * planet.orbitRadius,
    };
  }

  private worldToScreen(
    wx: number,
    wy: number,
    z: number,
    parallax = 1
  ): { x: number; y: number } {
    return worldToScreen(wx, wy, {
      viewportWidth: this.width,
      viewportHeight: this.height,
      cameraX: this.camera.x,
      cameraY: this.camera.y,
      zoom: z,
      parallax,
    });
  }

  private getSunScreenPosition(z: number): { x: number; y: number } {
    return this.worldToScreen(0, 0, z, 1);
  }

  private pixelTextWidth(
    text: string,
    pixelSize: number = this.PIXEL_SIZE
  ): number {
    return measurePixelTextWidth(text, pixelSize);
  }

  private drawPixelAtSize(
    x: number,
    y: number,
    pixelSize: number,
    color: number[],
    opacity: number
  ): void {
    this.renderer?.drawPixelAtSize(x, y, pixelSize, color, opacity);
  }

  private drawPixelTextScaled(
    x: number,
    y: number,
    text: string,
    color: number[],
    opacity: number,
    pixelSize: number
  ): void {
    if (!this.renderer) return;
    drawPixelText(this.renderer, x, y, text, color, opacity, pixelSize);
  }

  protected override drawTitle(opacity = 1): void {
    const title = 'A X I O M';
    const pixelSize = this.PIXEL_SIZE * 2;
    const w = this.pixelTextWidth(title, pixelSize);
    const x = (this.width - w) / 2;
    const y = this.height * 0.18;
    this.drawPixelTextScaled(
      x,
      y,
      title,
      this.COLORS.white,
      0.35 * opacity,
      pixelSize
    );
  }

  protected override drawMenu(opacity = 1): void {
    const options = ['NEW GAME', 'OPTIONS'];
    const pixelSize = this.PIXEL_SIZE * 2;
    const startY = this.height * 0.58;
    const spacing = pixelSize * 8;

    for (let i = 0; i < options.length; i++) {
      const text = options[i];
      const textWidth = this.pixelTextWidth(text, pixelSize);
      const x = (this.width - textWidth) / 2;
      const y = startY + i * spacing;

      const selected = i === this.selectedIndex;
      const baseOpacity = selected ? 1.0 : 0.55;
      const color = selected ? this.COLORS.white : this.COLORS.lightGray;
      this.drawPixelTextScaled(
        x,
        y,
        text,
        color,
        baseOpacity * opacity,
        pixelSize
      );

      if (selected) {
        const indicatorX = x - pixelSize * 3.5;
        const indicatorY = y + pixelSize * 2;
        this.drawPixelAtSize(
          indicatorX,
          indicatorY,
          pixelSize,
          this.COLORS.white,
          0.85 * opacity
        );
        this.drawPixelAtSize(
          indicatorX - pixelSize,
          indicatorY,
          pixelSize,
          this.COLORS.lightGray,
          0.45 * opacity
        );
      }
    }
  }

  private updateHoveredPlanet(): void {
    const z = this.zoom;

    const planets = this.planets.map((p) => {
      const w = this.getPlanetWorldPosition(p);
      return { worldX: w.x, worldY: w.y, size: p.size };
    });
    const hit = hitTestStarMap({
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      zoom: z,
      pixelSize: this.PIXEL_SIZE,
      viewportWidth: this.width,
      viewportHeight: this.height,
      cameraX: this.camera.x,
      cameraY: this.camera.y,
      planets,
    });
    this.hoveredPlanetIndex = hit.hoveredPlanetIndex;
    this.hoveredSun = hit.hoveredSun;

    // Update cursor
    document.body.style.cursor =
      this.hoveredPlanetIndex >= 0 || this.hoveredSun ? 'pointer' : 'default';
  }

  private drawPixel(x: number, y: number, color: number[], opacity = 1): void {
    this.renderer?.drawPixel(x, y, color, opacity);
  }

  private drawPixelCircle(
    cx: number,
    cy: number,
    radius: number,
    color: number[],
    opacity = 1,
    filled = true
  ): void {
    this.renderer?.drawPixelCircle(cx, cy, radius, color, opacity, filled);
  }

  private initStars(): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // "Near" stars populate the default view (zoom=1) so it never looks empty.
    for (let i = 0; i < this.STAR_COUNT_NEAR; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        brightness: 0.35 + Math.random() * 0.65,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1 + Math.random() * 3,
      });
    }

    // "Far" stars live outside the viewport; when you zoom out they compress into view.
    const farRangeX = this.width * 2.2;
    const farRangeY = this.height * 2.2;
    for (let i = 0; i < this.STAR_COUNT_FAR; i++) {
      this.stars.push({
        x: cx + (Math.random() * 2 - 1) * farRangeX,
        y: cy + (Math.random() * 2 - 1) * farRangeY,
        brightness: 0.2 + Math.random() * 0.55,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.6 + Math.random() * 2.2,
      });
    }
  }

  private initPlanets(): void {
    const baseOrbit = Math.min(this.width, this.height) * 0.28;
    this.systemBaseOrbit = baseOrbit;

    const planetData: Array<{
      name: string;
      type: string;
      color: number[];
      description: string;
      orbitFactor: number;
      sizePx: number;
      hasRing?: boolean;
      hasMoon?: boolean;
    }> = [
      {
        name: 'Meridia',
        type: 'Ice World',
        color: this.COLORS.cyan,
        description:
          'A frozen world with vast ice plains and hidden oceans beneath the surface.',
        orbitFactor: 0.55,
        sizePx: 3.2,
      },
      {
        name: 'Solara',
        type: 'Desert Planet',
        color: this.COLORS.orange,
        description:
          'Scorched by twin suns, rich in rare minerals and ancient ruins.',
        orbitFactor: 0.75,
        sizePx: 3.8,
        hasMoon: true,
      },
      {
        name: 'Verdant',
        type: 'Garden World',
        color: this.COLORS.blue,
        description:
          'A temperate world wrapped in dense cloud bands and emerald continents.',
        orbitFactor: 0.95,
        sizePx: 4.2,
      },
      {
        name: 'Pyronis',
        type: 'Volcanic',
        color: this.COLORS.red,
        description:
          'An unstable world of constant eruptions and rivers of molten rock.',
        orbitFactor: 1.12,
        sizePx: 4.6,
      },
      {
        name: 'Nebulos',
        type: 'Gas Giant',
        color: this.COLORS.purple,
        description:
          'A massive gas giant with swirling storms and a spectacular ring system.',
        orbitFactor: 1.35,
        sizePx: 6.2,
        hasRing: true,
      },
      {
        name: 'Aquaris',
        type: 'Ocean World',
        color: this.COLORS.blue,
        description:
          'Covered entirely by water, home to bioluminescent life forms.',
        orbitFactor: 1.6,
        sizePx: 4.8,
      },
      {
        name: 'Kryos',
        type: 'Cryo Dwarf',
        color: this.COLORS.lightGray,
        description:
          'A tiny icy dwarf with a glittering dust halo and silent canyons.',
        orbitFactor: 1.9,
        sizePx: 2.6,
      },
      {
        name: 'Aurelion',
        type: 'Storm Giant',
        color: this.COLORS.orange,
        description: 'Bands of amber storms race across a crushing atmosphere.',
        orbitFactor: 2.25,
        sizePx: 6.8,
        hasRing: true,
      },
      {
        name: 'Umbra',
        type: 'Shadow Planet',
        color: this.COLORS.midGray,
        description:
          'A dim world that eats starlight; its nightside never ends.',
        orbitFactor: 2.6,
        sizePx: 4.3,
      },
      {
        name: 'Cindara',
        type: 'Ash World',
        color: this.COLORS.darkGray,
        description: 'A carbon-black sphere with thin rings of powdered stone.',
        orbitFactor: 2.95,
        sizePx: 3.9,
        hasRing: true,
      },
      {
        name: 'Heliox',
        type: 'Helium Giant',
        color: this.COLORS.cyan,
        description:
          'A pale giant with high-altitude lightning and shimmering auroras.',
        orbitFactor: 3.3,
        sizePx: 7.4,
      },
      {
        name: 'Driftveil',
        type: 'Frost Ring',
        color: this.COLORS.lightGray,
        description: 'A distant world surrounded by needle-thin ice rings.',
        orbitFactor: 3.7,
        sizePx: 4.1,
        hasRing: true,
      },
    ];

    for (const data of planetData) {
      const orbitRadius = baseOrbit * data.orbitFactor;
      const orbitSpeed = 0.11 / (0.7 + data.orbitFactor);
      const size = data.sizePx * this.PIXEL_SIZE;

      const planet: Planet = {
        name: data.name,
        type: data.type,
        description: data.description,
        orbitRadius,
        orbitSpeed,
        angle: Math.random() * Math.PI * 2,
        size,
        color: data.color,
        hasRing: data.hasRing ?? false,
      };

      if (data.hasMoon) {
        planet.moon = {
          orbitRadius: size * 2.2,
          orbitSpeed: 0.35,
          angle: Math.random() * Math.PI * 2,
          size: this.PIXEL_SIZE,
        };
      }

      this.planets.push(planet);

      this.planetShakeOffsets.push({
        seed: Math.random() * 1000,
        delay: Math.random() * 0.15,
      });
    }
  }

  private initUnlockDefaults(): void {
    const maxPlanet = this.planets.reduce(
      (m, p) => Math.max(m, p.orbitRadius + p.size),
      0
    );
    const maxBelt = this.asteroidBelts.reduce(
      (m, b) => Math.max(m, b.orbitRadius + b.thickness),
      0
    );
    const maxOrbiting = this.orbitingObjects.reduce(
      (m, o) => Math.max(m, o.orbitRadius + o.size),
      0
    );
    const maxDeep = this.deepSpaceObjects.reduce((m, o) => {
      const d = Math.hypot(o.x, o.y);
      switch (o.kind) {
        case 'nebula':
          return Math.max(m, d + o.size);
        case 'comet':
          return Math.max(m, d + o.tail * this.PIXEL_SIZE);
        case 'roguePlanet':
        case 'derelict':
        case 'beacon':
          return Math.max(m, d + o.size * 2);
      }
    }, 0);

    this.unlockMinRadius = Math.max(1, this.systemBaseOrbit * 1.1);
    this.unlockMaxRadius = Math.max(
      this.unlockMinRadius + 1,
      Math.max(maxPlanet, maxBelt, maxOrbiting, maxDeep) * 1.05
    );

    // Only set a default if the user/app hasn't already picked a radius.
    if (this.targetUnlockRadius <= 0) {
      this.setUnlockStep(this.unlockStep, 10);
      this.unlockRadius = this.targetUnlockRadius;
    }
  }

  private lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  private initAsteroidBelts(): void {
    const baseOrbit = Math.min(this.width, this.height) * 0.28;

    const belts: Array<{
      orbitFactor: number;
      thicknessPx: number;
      count: number;
      speed: number;
      color: number[];
      seed: number;
    }> = [
      {
        orbitFactor: 1.48,
        thicknessPx: 22,
        count: 90,
        speed: 0.07,
        color: this.COLORS.darkGray,
        seed: 321,
      },
      {
        orbitFactor: 2.85,
        thicknessPx: 28,
        count: 120,
        speed: 0.04,
        color: this.COLORS.midGray,
        seed: 987,
      },
    ];

    for (const belt of belts) {
      const rng = this.lcg(belt.seed);
      const orbitRadius = baseOrbit * belt.orbitFactor;
      const asteroids: {
        angleOffset: number;
        radiusOffset: number;
        size: number;
      }[] = [];

      for (let i = 0; i < belt.count; i++) {
        asteroids.push({
          angleOffset: (i / belt.count) * Math.PI * 2 + (rng() - 0.5) * 0.06,
          radiusOffset: (rng() - 0.5) * belt.thicknessPx,
          size: rng() > 0.86 ? this.PIXEL_SIZE * 2 : this.PIXEL_SIZE,
        });
      }

      this.asteroidBelts.push({
        orbitRadius,
        orbitSpeed: belt.speed,
        angle: rng() * Math.PI * 2,
        thickness: belt.thicknessPx,
        color: belt.color,
        asteroids,
      });
    }
  }

  private initOrbitingObjects(): void {
    const baseOrbit = Math.min(this.width, this.height) * 0.28;

    const objects: Array<{
      kind: OrbitingObjectKind;
      orbitFactor: number;
      orbitSpeed: number;
      size: number;
      color: number[];
      blinkSpeed?: number;
    }> = [
      {
        kind: 'station',
        orbitFactor: 1.25,
        orbitSpeed: 0.075,
        size: this.PIXEL_SIZE * 2.2,
        color: this.COLORS.lightGray,
      },
      {
        kind: 'probe',
        orbitFactor: 1.78,
        orbitSpeed: 0.09,
        size: this.PIXEL_SIZE * 1.2,
        color: this.COLORS.cyan,
        blinkSpeed: 4.5,
      },
      {
        kind: 'ship',
        orbitFactor: 2.15,
        orbitSpeed: 0.06,
        size: this.PIXEL_SIZE * 2.0,
        color: this.COLORS.white,
      },
      {
        kind: 'probe',
        orbitFactor: 3.25,
        orbitSpeed: 0.03,
        size: this.PIXEL_SIZE * 1.1,
        color: this.COLORS.orange,
        blinkSpeed: 3.2,
      },
    ];

    for (const obj of objects) {
      this.orbitingObjects.push({
        kind: obj.kind,
        orbitRadius: baseOrbit * obj.orbitFactor,
        orbitSpeed: obj.orbitSpeed,
        angle: Math.random() * Math.PI * 2,
        size: obj.size,
        color: obj.color,
        blinkSpeed: obj.blinkSpeed,
      });
    }
  }

  private initDeepSpaceObjects(): void {
    const world = Math.max(this.width, this.height);
    const rng = this.lcg(424242);

    const makeNebula = (
      x: number,
      y: number,
      size: number,
      color: number[],
      opacity: number,
      seed: number
    ): DeepSpaceObject => {
      const r = this.lcg(seed);
      const points: { dx: number; dy: number; opacity: number }[] = [];
      const count = 120;
      for (let i = 0; i < count; i++) {
        const a = r() * Math.PI * 2;
        const d = r() ** 1.8 * size;
        points.push({
          dx: Math.cos(a) * d + (r() - 0.5) * this.PIXEL_SIZE * 3,
          dy: Math.sin(a) * d + (r() - 0.5) * this.PIXEL_SIZE * 3,
          opacity: 0.2 + r() * 0.8,
        });
      }
      return { kind: 'nebula', x, y, size, color, opacity, points };
    };

    this.deepSpaceObjects.push(
      makeNebula(
        -world * 1.55,
        -world * 0.85,
        140,
        this.COLORS.purple,
        0.22,
        1001
      ),
      makeNebula(world * 1.35, world * 1.15, 160, this.COLORS.blue, 0.2, 2002),
      {
        kind: 'roguePlanet',
        x: world * 1.5,
        y: -world * 1.05,
        size: this.PIXEL_SIZE * 7.5,
        color: this.COLORS.darkGray,
        opacity: 0.9,
      },
      {
        kind: 'derelict',
        x: -world * 1.25,
        y: world * 1.25,
        size: this.PIXEL_SIZE * 7,
        color: this.COLORS.midGray,
        opacity: 0.55,
      },
      {
        kind: 'beacon',
        x: world * 1.85,
        y: world * 0.2,
        size: this.PIXEL_SIZE * 2,
        color: this.COLORS.cyan,
        opacity: 0.75,
        blinkSpeed: 3.8,
      },
      {
        kind: 'beacon',
        x: -world * 1.85,
        y: -world * 0.15,
        size: this.PIXEL_SIZE * 2,
        color: this.COLORS.orange,
        opacity: 0.7,
        blinkSpeed: 2.9,
      },
      {
        kind: 'comet',
        x: -world * 2.1,
        y: world * (0.7 + rng() * 0.2),
        size: this.PIXEL_SIZE * 2.6,
        color: this.COLORS.white,
        opacity: 0.9,
        vx: 42,
        vy: -11,
        tail: 22,
      }
    );
  }

  private drawNebulaShader(elapsed: number, transitionProgress: number): void {
    if (!this.nebula) return;
    if (this.particlesSpawned) return;

    const fade =
      transitionProgress > 0 ? Math.max(0, 1 - transitionProgress * 1.2) : 1;
    this.nebula.draw(this.canvas, {
      width: this.width,
      height: this.height,
      timeSeconds: elapsed,
      cameraX: this.camera.x,
      cameraY: this.camera.y,
      zoom: this.zoom,
      pixelSize: this.PIXEL_SIZE,
      fade,
    });
  }

  private drawBlackoutShader(transitionProgress: number): void {
    if (!this.blackout) return;
    if (this.particlesSpawned) return;
    if (this.unlockRadius <= 0) return;

    const fade =
      transitionProgress > 0 ? Math.max(0, 1 - transitionProgress * 1.2) : 1;
    this.blackout.draw(this.canvas, {
      width: this.width,
      height: this.height,
      cameraX: this.camera.x,
      cameraY: this.camera.y,
      zoom: this.zoom,
      pixelSize: this.PIXEL_SIZE,
      unlockRadius: this.unlockRadius,
      edgePx: this.UNLOCK_EDGE_PX,
      fade,
    });
  }

  private updateDeepSpaceObjects(deltaTime: number): void {
    const world = Math.max(this.width, this.height);
    const wrap = world * 2.2;
    advanceComets(this.deepSpaceObjects, deltaTime, wrap);
  }

  protected animate(time: number): void {
    const elapsed = (time - this.startTime) / 1000;
    const deltaTimeRaw =
      this.lastTime > 0 ? (time - this.lastTime) / 1000 : 1 / 60;
    const deltaTime = Math.min(this.MAX_DELTA_TIME, Math.max(0, deltaTimeRaw));
    this.lastTime = time;

    this.zoom += (this.targetZoom - this.zoom) * smoothFactor(0.1, deltaTime);

    const transitionProgress = this.getTransitionProgress();

    // Calculate shake phase (planets shake before exploding)
    if (transitionProgress > 0 && transitionProgress < this.SHAKE_DURATION) {
      this.shakePhase = transitionProgress / this.SHAKE_DURATION;
    } else if (transitionProgress >= this.SHAKE_DURATION) {
      this.shakePhase = 0;
    }

    // Spawn particles after shake phase ends (stop animating planets immediately after)
    if (transitionProgress >= this.SHAKE_DURATION && !this.particlesSpawned) {
      this.particlesSpawned = true;

      const z = this.zoom;
      const spawnPlanets = this.planets.map((planet) => {
        const w = this.getPlanetWorldPosition(planet);
        const { x: px, y: py } = this.worldToScreen(w.x, w.y, z, 1);
        let moonScreenX: number | undefined;
        let moonScreenY: number | undefined;
        if (planet.moon) {
          const mwx =
            w.x + Math.cos(planet.moon.angle) * planet.moon.orbitRadius;
          const mwy =
            w.y + Math.sin(planet.moon.angle) * planet.moon.orbitRadius;
          const { x: mx, y: my } = this.worldToScreen(mwx, mwy, z, 1);
          moonScreenX = mx;
          moonScreenY = my;
        }
        return {
          color: planet.color,
          size: planet.size,
          screenX: px,
          screenY: py,
          moonScreenX,
          moonScreenY,
        };
      });

      this.particles = spawnPlanetExplosionParticles({
        planets: spawnPlanets,
        pixelSize: this.PIXEL_SIZE,
        targetParticleCount: this.TARGET_PARTICLE_COUNT,
        lightGray: this.COLORS.lightGray,
      });
    }

    if (!this.particlesSpawned) {
      advancePlanetOrbits(this.planets, deltaTime, this.ORBIT_SPEED_SCALE);
      if (transitionProgress === 0) {
        advanceAsteroidBelts(
          this.asteroidBelts,
          deltaTime,
          this.ORBIT_SPEED_SCALE
        );
        advanceOrbitingObjects(
          this.orbitingObjects,
          deltaTime,
          this.ORBIT_SPEED_SCALE
        );
      }
    }

    // Stop following once transition starts.
    if (transitionProgress > 0 && this.followPlanetIndex !== null) {
      this.followPlanetIndex = null;
    }

    // Freeze camera when transitioning so particles/background stay coherent.
    if (transitionProgress > 0) {
      setCameraTarget(this.camera, this.camera.x, this.camera.y);
    }

    // Follow selected planet while idle (keeps it centered as it orbits).
    if (
      !this.particlesSpawned &&
      transitionProgress === 0 &&
      this.followPlanetIndex !== null
    ) {
      const planet = this.planets[this.followPlanetIndex];
      if (planet) {
        const w = this.getPlanetWorldPosition(planet);
        setCameraTarget(this.camera, w.x, w.y);
      }
    }

    stepCamera(this.camera, deltaTime, this.CAMERA_LERP);

    // Animate exploration radius changes smoothly.
    if (this.targetUnlockRadius > 0) {
      const unlockFactor = smoothFactor(0.08, deltaTime);
      this.unlockRadius +=
        (this.targetUnlockRadius - this.unlockRadius) * unlockFactor;
    }

    this.transferTraffic?.update({
      elapsedSeconds: elapsed,
      deltaSeconds: deltaTime,
      active: !this.particlesSpawned && transitionProgress === 0,
      planets: this.planets.map((planet) => ({
        pos: this.getPlanetWorldPosition(planet),
        size: planet.size,
      })),
    });

    this.updateDeepSpaceObjects(deltaTime);
    this.drawAllElements(elapsed, transitionProgress);

    // Update and draw particles during transition (after shake)
    if (this.particlesSpawned) {
      stepParticles({
        particles: this.particles,
        deltaSeconds: deltaTime,
        transitionProgress,
        shakeDuration: this.SHAKE_DURATION,
        zoom: this.zoom,
        centerX: this.width / 2,
        centerY: this.height / 2,
      });
      if (this.renderer) {
        drawParticles({ renderer: this.renderer, particles: this.particles });
      }
    }

    if (this.renderer) {
      drawScanlines({
        renderer: this.renderer,
        width: this.width,
        height: this.height,
        pixelSize: this.PIXEL_SIZE,
        transitionProgress,
        color: [0, 0, 0],
      });
      drawZoomIndicator({
        renderer: this.renderer,
        width: this.width,
        height: this.height,
        zoom: this.zoom,
        pixelSize: this.PIXEL_SIZE,
        lightGray: this.COLORS.lightGray,
      });

      if (this.hoveredPlanetIndex >= 0 && this.selectedPlanetIndex < 0) {
        const planet = this.planets[this.hoveredPlanetIndex];
        if (planet) {
          drawPlanetHoverLabel({
            renderer: this.renderer,
            planet,
            zoom: this.zoom,
            pixelSize: this.PIXEL_SIZE,
            worldToScreen: (wx: number, wy: number) =>
              this.worldToScreen(wx, wy, this.zoom, 1),
            color: this.COLORS.white,
            opacity: 0.9,
          });
        }
      }

      drawPlanetInfoPanel({
        renderer: this.renderer,
        viewportWidth: this.width,
        viewportHeight: this.height,
        pixelSize: this.PIXEL_SIZE,
        selected:
          this.selectedPlanetIndex >= 0
            ? {
                name: this.planets[this.selectedPlanetIndex].name,
                type: this.planets[this.selectedPlanetIndex].type,
                description: this.planets[this.selectedPlanetIndex].description,
                color: this.planets[this.selectedPlanetIndex].color,
              }
            : null,
        lightGray: this.COLORS.lightGray,
        midGray: this.COLORS.midGray,
      });
    }

    // Keep hover state accurate even while camera animates.
    this.updateHoveredPlanet();
  }

  protected override getMenuOpacity(transitionProgress: number): number {
    if (transitionProgress <= 0) return 1;
    return Math.max(0, 1 - transitionProgress * 12);
  }

  protected override drawTransition(progress: number): void {
    const CK = this.CanvasKit;

    // Fade to black - slower, starts later
    const t = Math.max(0, Math.min(1, (progress - 0.7) / 0.3));
    const alpha = t * t;

    if (alpha > 0) {
      this.pixelPaint.setColor(CK.Color(0, 0, 0, alpha));
      this.canvas.drawRect(
        CK.LTRBRect(0, 0, this.width, this.height),
        this.pixelPaint
      );
    }

    if (progress >= 1 && !this.startGameTriggered) {
      this.startGameTriggered = true;
      this.callbacks.onStartGame();
      this.destroy();
    }
  }

  private drawAllElements(elapsed: number, transitionProgress: number): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxDim = Math.max(this.width, this.height);

    const p = Math.max(0, Math.min(1, transitionProgress));
    const pull = p * p;
    const collapse = Math.max(0.02, 1 - pull * 0.98);
    const sceneFade = p > 0 ? Math.max(0, 1 - p * 1.1) : 1;

    // === STARS (scale position from center by zoom) ===
    if (this.renderer) {
      drawStars({
        renderer: this.renderer,
        stars: this.stars,
        elapsedSeconds: elapsed,
        transitionProgress,
        sceneFade,
        zoom: this.zoom,
        cx,
        cy,
        maxDim,
        starParallax: this.STAR_PARALLAX,
        worldToScreen: (wx: number, wy: number, parallax: number) =>
          this.worldToScreen(wx, wy, this.zoom, parallax),
      });
    }

    // === NEBULA (shader layer) ===
    this.drawNebulaShader(elapsed, transitionProgress);

    // === DEEP SPACE OBJECTS (some not orbiting the sun) ===
    if (this.renderer) {
      drawDeepSpaceObjects({
        renderer: this.renderer,
        objects: this.deepSpaceObjects,
        elapsedSeconds: elapsed,
        transitionProgress: p,
        pull,
        collapse,
        sceneFade,
        zoom: this.zoom,
        pixelSize: this.PIXEL_SIZE,
        deepSpaceParallax: this.DEEP_SPACE_PARALLAX,
        cx,
        cy,
        maxDim,
        worldToScreen: (wx: number, wy: number, parallax: number) =>
          this.worldToScreen(wx, wy, this.zoom, parallax),
        lightGray: this.COLORS.lightGray,
        white: this.COLORS.white,
      });
    }

    // === CENTRAL STAR (always visible as the singularity) ===
    const pulse = Math.floor(elapsed * 4) % 2 === 0;
    const z = this.zoom; // Shorthand for zoom
    const sun = this.getSunScreenPosition(z);

    if (this.particlesSpawned) {
      // After explosion: draw as dark singularity core (scaled)
      const singularitySize = (2 + p * 4) * z;
      const singularityOpacity = Math.max(0.3, 1 - p * 0.4);
      this.drawPixelCircle(
        cx,
        cy,
        singularitySize * this.PIXEL_SIZE,
        this.COLORS.darkGray,
        singularityOpacity * 0.4
      );
      this.drawPixelCircle(
        cx,
        cy,
        this.PIXEL_SIZE * 1.5 * z,
        this.COLORS.white,
        singularityOpacity
      );
      return; // Only singularity after explosion
    }

    // === ORBITAL PATHS (dotted circles) ===
    if (this.renderer) {
      drawOrbitPaths({
        renderer: this.renderer,
        show: this.showOrbitalLines,
        sunScreenX: sun.x,
        sunScreenY: sun.y,
        zoom: z,
        pixelSize: this.PIXEL_SIZE,
        planets: this.planets.map((pl) => ({
          orbitRadius: pl.orbitRadius,
          color: pl.color,
        })),
        belts: this.asteroidBelts.map((b) => ({ orbitRadius: b.orbitRadius })),
        darkGray: this.COLORS.darkGray,
        midGray: this.COLORS.midGray,
      });
    }

    // Normal central star with pulsing cross (scaled)
    if (this.renderer) {
      drawCentralStar({
        renderer: this.renderer,
        sunX: sun.x,
        sunY: sun.y,
        zoom: z,
        pixelSize: this.PIXEL_SIZE,
        pulse,
        white: this.COLORS.white,
        lightGray: this.COLORS.lightGray,
      });
    }

    // === ASTEROID BELTS (orbiting) ===
    if (this.renderer) {
      drawAsteroidBelts({
        renderer: this.renderer,
        belts: this.asteroidBelts,
        transitionProgress: p,
        zoom: z,
        pixelSize: this.PIXEL_SIZE,
        worldToScreen: (wx: number, wy: number) =>
          this.worldToScreen(wx, wy, z, 1),
      });
    }

    // === ORBITING OBJECTS (stations/probes/ships) ===
    if (this.renderer) {
      drawOrbitingObjects({
        renderer: this.renderer,
        objects: this.orbitingObjects,
        elapsedSeconds: elapsed,
        transitionProgress: p,
        zoom: z,
        pixelSize: this.PIXEL_SIZE,
        white: this.COLORS.white,
        lightGray: this.COLORS.lightGray,
        worldToScreen: (wx: number, wy: number) =>
          this.worldToScreen(wx, wy, z, 1),
      });
    }

    // === TRANSFER SHIPS (planet-to-planet traffic) ===
    this.transferTraffic?.draw({
      elapsedSeconds: elapsed,
      transitionProgress: p,
      zoom: z,
      pixelSize: this.PIXEL_SIZE,
      worldToScreen: (wx: number, wy: number) =>
        this.worldToScreen(wx, wy, z, 1),
      drawPixel: (x: number, y: number, color: number[], opacity: number) =>
        this.drawPixel(x, y, color, opacity),
    });

    // === PLANETS (with shake effect during shake phase) ===
    if (this.renderer) {
      drawPlanets({
        renderer: this.renderer,
        planets: this.planets,
        shakeOffsets: this.planetShakeOffsets,
        selectedPlanetIndex: this.selectedPlanetIndex,
        elapsedSeconds: elapsed,
        shakePhase: this.shakePhase,
        zoom: z,
        pixelSize: this.PIXEL_SIZE,
        white: this.COLORS.white,
        lightGray: this.COLORS.lightGray,
        worldToScreen: (wx: number, wy: number) =>
          this.worldToScreen(wx, wy, z, 1),
      });
    }

    // === UNLOCK BLACKOUT (hard fog-of-war) ===
    this.drawBlackoutShader(transitionProgress);
  }

  // Settings API
  setShowOrbitalLines(show: boolean): void {
    this.showOrbitalLines = show;
  }

  getShowOrbitalLines(): boolean {
    return this.showOrbitalLines;
  }

  destroy(): void {
    if (this.disposedStyle) return;
    this.disposedStyle = true;
    super.destroy();
    if (this.wheelHandler) {
      window.removeEventListener('wheel', this.wheelHandler);
      this.wheelHandler = null;
    }
    if (this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = null;
    }
    if (this.mouseClickHandler) {
      window.removeEventListener('click', this.mouseClickHandler);
      this.mouseClickHandler = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    document.body.style.cursor = 'default';
    this.nebula?.dispose();
    this.nebula = null;
    this.blackout?.dispose();
    this.blackout = null;
    this.renderer = null;
    this.pixelPaint?.delete();
    this.planets = [];
    this.stars = [];
    this.particles = [];
    this.orbitingObjects = [];
    this.asteroidBelts = [];
    this.deepSpaceObjects = [];
    this.transferTraffic?.reset();
    this.transferTraffic = null;
    this.planetShakeOffsets = [];
  }
}
