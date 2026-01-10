import { describe, expect, it } from 'bun:test';
import { mixRgb } from '@/starmap/math/color';
import { smoothFactor } from '@/starmap/math/smoothing';
import { buildBlackoutUniforms } from '@/starmap/shaders/BlackoutShader';
import { buildNebulaUniforms } from '@/starmap/shaders/NebulaShader';

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

describe('shader uniform builders', () => {
  it('buildNebulaUniforms matches expected order/length', () => {
    const u = buildNebulaUniforms({
      width: 800,
      height: 600,
      timeSeconds: 1.25,
      cameraX: 10,
      cameraY: -5,
      zoom: 0.75,
      pixelSize: 3,
      fade: 0.9,
    });
    expect(u.length).toBe(8);
    expect(u[0]).toBe(800);
    expect(u[1]).toBe(600);
    expect(u[2]).toBe(1.25);
    expect(u[3]).toBe(10);
    expect(u[4]).toBe(-5);
    expect(u[5]).toBe(0.75);
    expect(u[6]).toBe(3);
    expect(u[7]).toBe(0.9);
  });

  it('buildBlackoutUniforms matches expected order/length', () => {
    const u = buildBlackoutUniforms({
      width: 800,
      height: 600,
      cameraX: 10,
      cameraY: -5,
      zoom: 0.75,
      pixelSize: 3,
      unlockRadius: 1234,
      edgePx: 36,
      fade: 1,
    });
    expect(u.length).toBe(9);
    expect(u[0]).toBe(800);
    expect(u[1]).toBe(600);
    expect(u[2]).toBe(10);
    expect(u[3]).toBe(-5);
    expect(u[4]).toBe(0.75);
    expect(u[5]).toBe(3);
    expect(u[6]).toBe(1234);
    expect(u[7]).toBe(36);
    expect(u[8]).toBe(1);
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
