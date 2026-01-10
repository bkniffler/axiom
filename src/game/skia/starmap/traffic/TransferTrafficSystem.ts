import type { Rgb, TransferTrafficColors, TransferTrafficDrawParams, TransferTrafficUpdateParams, TrafficPlanetSnapshot, Vec2 } from './types';
import { planPolarAStarPath } from './PolarAStarPlanner';

interface TransferShip {
    from: number;
    to: number;
    path: Vec2[];
    cumulative: number[];
    totalLength: number;
    progress: number; // world units along path
    speed: number; // world units / second
    size: number;
    color: Rgb;
    spawnTime: number;
    arrivedTime: number | null;
    state: 'path' | 'approach' | 'arrived';
    pos: Vec2;
    heading: Vec2;
}

interface TransferTrafficConfig {
    pixelSize: number;
    systemBaseOrbit: number;
    colors: TransferTrafficColors;
    maxShips?: number;
    dockTimeSeconds?: number;
}

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

const buildCumulative = (path: Vec2[]): { cumulative: number[]; total: number } => {
    const cumulative: number[] = [0];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
        total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        cumulative.push(total);
    }
    return { cumulative, total };
};

const samplePath = (path: Vec2[], cumulative: number[], distance: number): Vec2 => {
    if (path.length === 0) return { x: 0, y: 0 };
    if (path.length === 1) return path[0];
    const total = cumulative[cumulative.length - 1];
    const d = clamp(distance, 0, total);

    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cumulative[mid] < d) lo = mid + 1;
        else hi = mid;
    }

    const i = Math.max(1, lo);
    const d0 = cumulative[i - 1];
    const d1 = cumulative[i];
    const t = d1 === d0 ? 0 : (d - d0) / (d1 - d0);
    return {
        x: path[i - 1].x + (path[i].x - path[i - 1].x) * t,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * t,
    };
};

const normalize = (v: Vec2): Vec2 => {
    const d = Math.hypot(v.x, v.y);
    if (d <= 1e-6) return { x: 1, y: 0 };
    return { x: v.x / d, y: v.y / d };
};

export class TransferTrafficSystem {
    private readonly pixelSize: number;
    private readonly systemBaseOrbit: number;
    private readonly colors: TransferTrafficColors;
    private readonly maxShips: number;
    private readonly dockTimeSeconds: number;

    private ships: TransferShip[] = [];
    private nextSpawnAt = 0;

    constructor(config: TransferTrafficConfig) {
        this.pixelSize = config.pixelSize;
        this.systemBaseOrbit = config.systemBaseOrbit;
        this.colors = config.colors;
        this.maxShips = config.maxShips ?? 4;
        this.dockTimeSeconds = config.dockTimeSeconds ?? 1.6;
    }

    reset(initialDelaySeconds: number = 0): void {
        this.ships = [];
        this.nextSpawnAt = initialDelaySeconds;
    }

    update(params: TransferTrafficUpdateParams): void {
        const { elapsedSeconds, deltaSeconds, active, planets } = params;
        if (!active) return;

        if (this.ships.length < this.maxShips && elapsedSeconds >= this.nextSpawnAt) {
            this.spawnShip(elapsedSeconds, planets);
            this.nextSpawnAt = elapsedSeconds + 4.5 + Math.random() * 6.0;
        }

        for (let i = this.ships.length - 1; i >= 0; i--) {
            const s = this.ships[i];
            const target = this.getPlanetApproachPoint(planets, s.to);

            if (s.state === 'path') {
                s.progress += s.speed * deltaSeconds;
                if (s.progress >= s.totalLength) {
                    s.progress = s.totalLength;
                    s.state = 'approach';
                }
                s.pos = samplePath(s.path, s.cumulative, s.progress);

                const ahead = samplePath(s.path, s.cumulative, Math.min(s.totalLength, s.progress + this.pixelSize * 10));
                s.heading = normalize({ x: ahead.x - s.pos.x, y: ahead.y - s.pos.y });
            } else if (s.state === 'approach') {
                if (!target) {
                    this.ships.splice(i, 1);
                    continue;
                }
                const dx = target.x - s.pos.x;
                const dy = target.y - s.pos.y;
                const dist = Math.hypot(dx, dy);

                const dockRadius = this.pixelSize * 10;
                if (dist <= dockRadius) {
                    s.state = 'arrived';
                    s.arrivedTime = elapsedSeconds;
                    s.pos = target;
                } else {
                    const dir = normalize({ x: dx, y: dy });
                    s.pos = { x: s.pos.x + dir.x * s.speed * deltaSeconds, y: s.pos.y + dir.y * s.speed * deltaSeconds };
                    s.heading = dir;
                }
            } else {
                if (!target) {
                    this.ships.splice(i, 1);
                    continue;
                }

                // Keep "docked" ships visually attached to their target even while planets orbit.
                s.pos = target;
                if (s.arrivedTime !== null && elapsedSeconds - s.arrivedTime > this.dockTimeSeconds) {
                    this.ships.splice(i, 1);
                }
            }
        }
    }

    draw(params: TransferTrafficDrawParams): void {
        const { elapsedSeconds, transitionProgress, zoom, pixelSize, worldToScreen, drawPixel } = params;
        if (transitionProgress > 0) return;
        if (this.ships.length === 0) return;

        const ps = pixelSize;
        const px = ps * zoom;

        for (const s of this.ships) {
            const dir = Math.atan2(s.heading.y, s.heading.x);
            const { x, y } = worldToScreen(s.pos.x, s.pos.y);

            const tx = Math.cos(dir + Math.PI);
            const ty = Math.sin(dir + Math.PI);
            for (let i = 1; i <= 5; i++) {
                const t = 1 - i / 6;
                drawPixel(x + tx * i * ps * zoom, y + ty * i * ps * zoom, this.colors.lightGray, 0.18 * t);
            }

            const oct = Math.round(((dir + Math.PI) / (Math.PI * 2)) * 8) % 8;
            const o = 0.85;
            const c = s.color;
            const draw = (ox: number, oy: number, color: Rgb, opacity: number) => {
                drawPixel(x + ox * px, y + oy * px, color, opacity);
            };

            draw(0, 0, c, o);

            if (oct === 0) {
                draw(1, 0, c, o);
                draw(-1, 1, c, o * 0.7);
                draw(-1, -1, c, o * 0.7);
            } else if (oct === 4) {
                draw(-1, 0, c, o);
                draw(1, 1, c, o * 0.7);
                draw(1, -1, c, o * 0.7);
            } else if (oct === 2) {
                draw(0, 1, c, o);
                draw(1, -1, c, o * 0.7);
                draw(-1, -1, c, o * 0.7);
            } else if (oct === 6) {
                draw(0, -1, c, o);
                draw(1, 1, c, o * 0.7);
                draw(-1, 1, c, o * 0.7);
            } else if (oct === 1) {
                draw(1, 1, c, o);
                draw(-1, 0, c, o * 0.6);
                draw(0, -1, c, o * 0.6);
            } else if (oct === 3) {
                draw(-1, 1, c, o);
                draw(1, 0, c, o * 0.6);
                draw(0, -1, c, o * 0.6);
            } else if (oct === 5) {
                draw(-1, -1, c, o);
                draw(1, 0, c, o * 0.6);
                draw(0, 1, c, o * 0.6);
            } else {
                draw(1, -1, c, o);
                draw(-1, 0, c, o * 0.6);
                draw(0, 1, c, o * 0.6);
            }

            if (Math.sin(elapsedSeconds * 6 + s.spawnTime) > 0.4) {
                draw(0, 0, this.colors.white, 0.35);
            }
        }
    }

    private spawnShip(elapsedSeconds: number, planets: TrafficPlanetSnapshot[]): void {
        if (planets.length < 2) return;

        let bestFrom = Math.floor(Math.random() * planets.length);
        let bestTo = Math.floor(Math.random() * planets.length);
        if (bestTo === bestFrom) bestTo = (bestTo + 1) % planets.length;

        const tryCount = 6;
        let bestDist = 0;
        for (let i = 0; i < tryCount; i++) {
            const a = Math.floor(Math.random() * planets.length);
            let b = Math.floor(Math.random() * planets.length);
            if (b === a) b = (b + 1) % planets.length;
            const pa = planets[a].pos;
            const pb = planets[b].pos;
            const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
            if (d > bestDist) {
                bestDist = d;
                bestFrom = a;
                bestTo = b;
            }
        }

        const pFrom = planets[bestFrom];
        const pTo = planets[bestTo];
        const start = pFrom.pos;
        const goal = pTo.pos;

        const startR = Math.max(1, Math.hypot(start.x, start.y));
        const goalR = Math.max(1, Math.hypot(goal.x, goal.y));
        const startOffset = pFrom.size * 2.0 + this.pixelSize * 6;
        const goalOffset = pTo.size * 2.0 + this.pixelSize * 6;
        const startPt = { x: start.x * (1 + startOffset / startR), y: start.y * (1 + startOffset / startR) };
        const goalPt = { x: goal.x * (1 + goalOffset / goalR), y: goal.y * (1 + goalOffset / goalR) };

        const obstaclePoints = planets.map((p) => p.pos);
        const path = planPolarAStarPath({
            start: startPt,
            goal: goalPt,
            obstaclePoints,
            pixelSize: this.pixelSize,
            systemBaseOrbit: this.systemBaseOrbit,
        });
        const { cumulative, total } = buildCumulative(path);
        if (total <= 1) return;

        const palette = [this.colors.white, this.colors.lightGray, this.colors.cyan, this.colors.blue, this.colors.orange];
        const color = palette[Math.floor(Math.random() * palette.length)];

        const ship: TransferShip = {
            from: bestFrom,
            to: bestTo,
            path,
            cumulative,
            totalLength: total,
            progress: 0,
            speed: this.pixelSize * (42 + Math.random() * 35),
            size: this.pixelSize * (1.4 + Math.random() * 0.8),
            color,
            spawnTime: elapsedSeconds,
            arrivedTime: null,
            state: 'path',
            pos: startPt,
            heading: { x: 1, y: 0 },
        };

        this.ships.push(ship);
    }

    private getPlanetApproachPoint(planets: TrafficPlanetSnapshot[], index: number): Vec2 | null {
        const planet = planets[index];
        if (!planet) return null;
        const p = planet.pos;
        const r = Math.max(1, Math.hypot(p.x, p.y));
        const offset = planet.size * 2.0 + this.pixelSize * 6;
        const k = 1 + offset / r;
        return { x: p.x * k, y: p.y * k };
    }
}
