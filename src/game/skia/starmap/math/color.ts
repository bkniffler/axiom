export type Rgb = number[];

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
    const tt = Math.max(0, Math.min(1, t));
    return [
        Math.round(a[0] + (b[0] - a[0]) * tt),
        Math.round(a[1] + (b[1] - a[1]) * tt),
        Math.round(a[2] + (b[2] - a[2]) * tt),
    ];
}

