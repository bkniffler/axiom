export interface DeepSpaceObjectLike {
    kind: string;
}

export interface CometLike extends DeepSpaceObjectLike {
    kind: 'comet';
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export function advanceComets(objects: DeepSpaceObjectLike[], deltaSeconds: number, wrap: number): void {
    for (const obj of objects) {
        if (obj.kind !== 'comet') continue;

        const comet = obj as unknown as CometLike;
        comet.x += comet.vx * deltaSeconds;
        comet.y += comet.vy * deltaSeconds;

        if (comet.x > wrap) comet.x = -wrap;
        if (comet.y < -wrap) comet.y = wrap;
    }
}
