export interface CameraTransformParams {
  viewportWidth: number;
  viewportHeight: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  parallax?: number;
}

export function worldToScreen(
  wx: number,
  wy: number,
  params: CameraTransformParams
): { x: number; y: number } {
  const cx = params.viewportWidth / 2;
  const cy = params.viewportHeight / 2;
  const parallax = params.parallax ?? 1;
  return {
    x: cx + (wx - params.cameraX * parallax) * params.zoom,
    y: cy + (wy - params.cameraY * parallax) * params.zoom,
  };
}
