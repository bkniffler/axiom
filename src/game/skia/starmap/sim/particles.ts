import type { Particle } from '../render/passes/particles';

export interface StepParticlesParams {
    particles: Particle[];
    deltaSeconds: number;
    transitionProgress: number;
    shakeDuration: number;
    zoom: number;
    centerX: number;
    centerY: number;
}

export function stepParticles(params: StepParticlesParams): void {
    const timeSinceSpawn = Math.max(0, params.transitionProgress - params.shakeDuration) / (1 - params.shakeDuration);
    const pullStrength = (3000 + timeSinceSpawn * 10000) * params.zoom * params.zoom;

    for (let i = params.particles.length - 1; i >= 0; i--) {
        const p = params.particles[i];
        p.life -= params.deltaSeconds / p.maxLife;
        if (p.life <= 0) {
            params.particles.splice(i, 1);
            continue;
        }

        const dx = params.centerX - p.x;
        const dy = params.centerY - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 8) {
            const pullForce = pullStrength / Math.max(30, dist * 0.5);
            p.vx += (dx / dist) * pullForce * params.deltaSeconds;
            p.vy += (dy / dist) * pullForce * params.deltaSeconds;
        } else {
            p.life = 0;
            params.particles.splice(i, 1);
            continue;
        }

        p.x += p.vx * params.deltaSeconds;
        p.y += p.vy * params.deltaSeconds;
    }
}

