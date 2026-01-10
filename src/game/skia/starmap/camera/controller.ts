import { smoothFactor } from '../math/smoothing';

export interface CameraState {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
}

export function createCamera(): CameraState {
    return { x: 0, y: 0, targetX: 0, targetY: 0 };
}

export function setCameraTarget(camera: CameraState, x: number, y: number): void {
    camera.targetX = x;
    camera.targetY = y;
}

export function resetCamera(camera: CameraState): void {
    camera.x = 0;
    camera.y = 0;
    camera.targetX = 0;
    camera.targetY = 0;
}

export function stepCamera(camera: CameraState, deltaSeconds: number, perFrameAt60: number): void {
    const factor = smoothFactor(perFrameAt60, deltaSeconds);
    camera.x += (camera.targetX - camera.x) * factor;
    camera.y += (camera.targetY - camera.y) * factor;
}

