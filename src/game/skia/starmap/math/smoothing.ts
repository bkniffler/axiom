export function smoothFactor(perFrameAt60: number, deltaSeconds: number): number {
    return 1 - Math.pow(1 - perFrameAt60, deltaSeconds * 60);
}

