import { describe, expect, it } from 'bun:test';
import { TransferTrafficSystem } from '@/starmap/traffic/TransferTrafficSystem';

describe('TransferTrafficSystem', () => {
  it('keeps arrived ships attached to moving target planet', () => {
    const pixelSize = 2;
    const traffic = new TransferTrafficSystem({
      pixelSize,
      systemBaseOrbit: 100,
      dockTimeSeconds: 100,
      colors: {
        white: [255, 255, 255],
        lightGray: [180, 180, 180],
        cyan: [80, 220, 220],
        blue: [60, 120, 240],
        orange: [240, 140, 60],
      },
    });

    (traffic as any).ships = [
      {
        from: 0,
        to: 1,
        path: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        cumulative: [0, 1],
        totalLength: 1,
        progress: 1,
        speed: 10,
        size: 2,
        color: [255, 255, 255],
        spawnTime: 0,
        arrivedTime: 0,
        state: 'arrived',
        pos: { x: 999, y: 999 },
        heading: { x: 1, y: 0 },
      },
    ];

    const expectedApproach = (pos: { x: number; y: number }, size: number) => {
      const r = Math.max(1, Math.hypot(pos.x, pos.y));
      const offset = size * 2.0 + pixelSize * 6;
      const k = 1 + offset / r;
      return { x: pos.x * k, y: pos.y * k };
    };

    const p1 = { x: 50, y: 0 };
    traffic.update({
      elapsedSeconds: 1,
      deltaSeconds: 1 / 60,
      active: true,
      planets: [
        { pos: { x: 0, y: 0 }, size: 6 },
        { pos: p1, size: 5 },
      ],
    });

    const ship1 = (traffic as any).ships[0];
    const exp1 = expectedApproach(p1, 5);
    expect(ship1.pos.x).toBeCloseTo(exp1.x, 6);
    expect(ship1.pos.y).toBeCloseTo(exp1.y, 6);

    const p2 = { x: 40, y: 30 };
    traffic.update({
      elapsedSeconds: 2,
      deltaSeconds: 1 / 60,
      active: true,
      planets: [
        { pos: { x: 0, y: 0 }, size: 6 },
        { pos: p2, size: 5 },
      ],
    });

    const ship2 = (traffic as any).ships[0];
    const exp2 = expectedApproach(p2, 5);
    expect(ship2.pos.x).toBeCloseTo(exp2.x, 6);
    expect(ship2.pos.y).toBeCloseTo(exp2.y, 6);
  });
});
