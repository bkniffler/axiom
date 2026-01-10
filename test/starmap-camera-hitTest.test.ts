import { describe, expect, it } from 'bun:test';
import {
  createCamera,
  setCameraTarget,
  stepCamera,
} from '@/starmap/camera/controller';
import { screenToWorld, worldToScreen } from '@/starmap/camera/transforms';
import { hitTestStarMap } from '@/starmap/input/hitTest';

describe('camera transforms', () => {
  it('worldToScreen and screenToWorld are inverses (parallax=1)', () => {
    const params = {
      viewportWidth: 800,
      viewportHeight: 600,
      cameraX: 120,
      cameraY: -45,
      zoom: 0.75,
      parallax: 1,
    } as const;

    const w = { x: 333.25, y: -99.5 };
    const s = worldToScreen(w.x, w.y, params);
    const w2 = screenToWorld(s.x, s.y, params);
    expect(w2.x).toBeCloseTo(w.x, 9);
    expect(w2.y).toBeCloseTo(w.y, 9);
  });
});

describe('camera controller', () => {
  it('moves toward target based on dt', () => {
    const cam = createCamera();
    setCameraTarget(cam, 100, -50);
    stepCamera(cam, 1 / 60, 0.1);
    expect(cam.x).toBeGreaterThan(0);
    expect(cam.y).toBeLessThan(0);
    stepCamera(cam, 1, 0.1);
    expect(cam.x).toBeGreaterThan(50);
  });
});

describe('hitTestStarMap', () => {
  it('detects hovered planet in screen space', () => {
    const res = hitTestStarMap({
      mouseX: 400,
      mouseY: 300,
      zoom: 1,
      pixelSize: 3,
      viewportWidth: 800,
      viewportHeight: 600,
      cameraX: 0,
      cameraY: 0,
      planets: [{ worldX: 0, worldY: 0, size: 10 }],
    });
    expect(res.hoveredPlanetIndex).toBe(0);
    expect(res.hoveredSun).toBe(false);
  });

  it('detects hovered sun when not over a planet', () => {
    const res = hitTestStarMap({
      mouseX: 400,
      mouseY: 300,
      zoom: 1,
      pixelSize: 3,
      viewportWidth: 800,
      viewportHeight: 600,
      cameraX: 0,
      cameraY: 0,
      planets: [{ worldX: 200, worldY: 0, size: 10 }],
    });
    expect(res.hoveredPlanetIndex).toBe(-1);
    expect(res.hoveredSun).toBe(true);
  });
});
