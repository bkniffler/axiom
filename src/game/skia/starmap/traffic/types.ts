export interface Vec2 {
    x: number;
    y: number;
}

export type Rgb = number[];

export interface TransferTrafficColors {
    white: Rgb;
    lightGray: Rgb;
    cyan: Rgb;
    blue: Rgb;
    orange: Rgb;
}

export interface TrafficPlanetSnapshot {
    pos: Vec2;
    size: number;
}

export interface TransferTrafficUpdateParams {
    elapsedSeconds: number;
    deltaSeconds: number;
    active: boolean;
    planets: TrafficPlanetSnapshot[];
}

export interface TransferTrafficDrawParams {
    elapsedSeconds: number;
    transitionProgress: number;
    zoom: number;
    pixelSize: number;
    worldToScreen: (wx: number, wy: number) => { x: number; y: number };
    drawPixel: (x: number, y: number, color: Rgb, opacity: number) => void;
}
