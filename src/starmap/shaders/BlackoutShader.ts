import type {
  Canvas,
  CanvasKit,
  Paint,
  RuntimeEffect,
  Shader,
} from 'canvaskit-wasm';

interface BlackoutDrawParams {
  width: number;
  height: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  pixelSize: number;
  unlockRadius: number;
  edgePx: number;
  fade: number;
}

function buildBlackoutUniforms(params: BlackoutDrawParams): number[] {
  return [
    params.width,
    params.height,
    params.cameraX,
    params.cameraY,
    params.zoom,
    params.pixelSize,
    params.unlockRadius,
    params.edgePx,
    params.fade,
  ];
}

export class BlackoutShader {
  private readonly CK: CanvasKit;
  private effect: RuntimeEffect | null = null;
  private paint: Paint | null = null;
  private shader: Shader | null = null;

  constructor(CK: CanvasKit) {
    this.CK = CK;
  }

  init(): void {
    const CK = this.CK;
    if (!CK.rt_effect || !CK.RuntimeEffect?.Make) return;

    const sksl = `
uniform float2 iResolution;
uniform float2 iCamera;
uniform float iZoom;
uniform float iPixel;
uniform float iUnlockRadius;
uniform float iEdgePx;
uniform float iFade;

float hash(float2 p) {
    return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

half4 main(float2 fragCoord) {
    float ps = max(1.0, iPixel);
    float2 p = floor(fragCoord / ps) * ps + 0.5 * ps;

    float2 center = 0.5 * iResolution;
    float zoom = max(0.001, iZoom);
    float2 world = (p - center) / zoom + iCamera;
    float d = length(world);

    float a = 0.0;
    if (d > iUnlockRadius) {
        float edgeWorld = max(0.001, iEdgePx / zoom);
        if (d < iUnlockRadius + edgeWorld) {
            float t = clamp((d - iUnlockRadius) / edgeWorld, 0.0, 1.0);
            float n = hash(floor(p / ps));
            a = step(n, t);
        } else {
            a = 1.0;
        }
    }

    return half4(half3(0.0), half(clamp(a * iFade, 0.0, 1.0)));
}`;

    this.effect = CK.RuntimeEffect.Make(sksl, (err) =>
      console.warn('Blackout shader error:', err)
    );
    if (!this.effect) return;

    this.paint = new CK.Paint();
    this.paint.setStyle(CK.PaintStyle.Fill);
    this.paint.setAntiAlias(false);
  }

  draw(canvas: Canvas, params: BlackoutDrawParams): void {
    if (!this.effect || !this.paint) return;
    if (params.fade <= 0.001) return;
    if (params.unlockRadius <= 0) return;

    const uniforms = buildBlackoutUniforms(params);
    this.shader?.delete();
    this.shader = this.effect.makeShader(uniforms);
    this.paint.setShader(this.shader);
    canvas.drawRect(
      this.CK.LTRBRect(0, 0, params.width, params.height),
      this.paint
    );
  }

  dispose(): void {
    this.shader?.delete();
    this.shader = null;
    this.effect?.delete();
    this.effect = null;
    this.paint?.delete();
    this.paint = null;
  }
}
