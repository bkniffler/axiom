import { describe, expect, it } from 'bun:test';
import { mixRgb } from '@/starmap/math/color';
import { smoothFactor } from '@/starmap/math/smoothing';

describe('smoothFactor', () => {
  it('matches per-frame value at 60fps', () => {
    expect(smoothFactor(0.1, 1 / 60)).toBeCloseTo(0.1, 12);
    expect(smoothFactor(0.085, 1 / 60)).toBeCloseTo(0.085, 12);
  });

  it('returns 0 at dt=0 and increases with dt', () => {
    const a = smoothFactor(0.1, 0);
    const b = smoothFactor(0.1, 1 / 120);
    const c = smoothFactor(0.1, 1 / 60);
    const d = smoothFactor(0.1, 1 / 30);
    expect(a).toBe(0);
    expect(b).toBeGreaterThan(0);
    expect(c).toBeGreaterThan(b);
    expect(d).toBeGreaterThan(c);
  });
});

describe('mixRgb', () => {
  it('mixes channels and clamps t', () => {
    expect(mixRgb([0, 0, 0], [255, 255, 255], 0)).toEqual([0, 0, 0]);
    expect(mixRgb([0, 0, 0], [255, 255, 255], 1)).toEqual([255, 255, 255]);
    expect(mixRgb([0, 0, 0], [255, 255, 255], 2)).toEqual([255, 255, 255]);
    expect(mixRgb([10, 20, 30], [110, 120, 130], 0.5)).toEqual([60, 70, 80]);
  });
});
