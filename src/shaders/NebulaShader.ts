import type {
  Canvas,
  CanvasKit,
  Paint,
  RuntimeEffect,
  Shader,
} from 'canvaskit-wasm';

interface NebulaDrawParams {
  width: number;
  height: number;
  timeSeconds: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  pixelSize: number;
  fade: number;
}

function buildNebulaUniforms(params: NebulaDrawParams): number[] {
  return [
    params.width,
    params.height,
    params.timeSeconds,
    params.cameraX,
    params.cameraY,
    params.zoom,
    params.pixelSize,
    params.fade,
  ];
}

export class NebulaShader {
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
uniform float iTime;
uniform float2 iCamera;
uniform float iZoom;
uniform float iPixel;
uniform float iFade;

float hash(float2 p) {
    return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    float a = hash(i);
    float b = hash(i + float2(1.0, 0.0));
    float c = hash(i + float2(0.0, 1.0));
    float d = hash(i + float2(1.0, 1.0));
    float2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(float2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.0;
        a *= 0.5;
    }
    return v;
}

half4 main(float2 fragCoord) {
    float ps = max(1.0, iPixel);
    float2 p = floor(fragCoord / ps) * ps + 0.5 * ps;

    float2 center = 0.5 * iResolution;
    float minDim = min(iResolution.x, iResolution.y);
    float2 uv = (p - center) / minDim;
    float r = length(uv);

    // Stronger toward the edges (obscure rims), still faintly present in the center.
    float rim = smoothstep(0.28, 1.15, r);
    float centerSoft = 0.25 + 0.75 * rim;

    float zoom = max(0.001, iZoom);
    float2 world = (p - center) / zoom + iCamera * 0.75;

    // Large scale fields, with gentle flow.
    float2 q = world * 0.003 + float2(iTime * 0.03, -iTime * 0.02);
    float n1 = fbm(q);
    float n2 = fbm(q * 2.1 + float2(5.2, 1.3));

    // Domain warp adds nebula swirls/filaments without looking like random pixels.
    float2 warp = float2(fbm(q + float2(0.0, 7.0)), fbm(q + float2(9.0, 0.0)));
    q += (warp - 0.5) * 2.3;

    float base = fbm(q * 1.7);
    float detail = fbm(q * 3.6 + float2(12.0, 4.0));

    // Dust lanes (dark) and emission (bright).
    float dust = smoothstep(0.45, 0.9, n1) * smoothstep(0.35, 0.85, detail);
    float emission = smoothstep(0.52, 0.92, base) * (0.6 + 0.4 * smoothstep(0.3, 0.8, n2));
    float filaments = smoothstep(0.55, 0.95, detail) * (1.0 - smoothstep(0.25, 0.6, base));

    float density = (0.55 * emission + 0.45 * filaments);
    density *= centerSoft;
    density *= (0.55 + 0.45 * (1.0 - dust));

    float alpha = density * (0.55 + 0.25 * rim) * iFade;

    // Palette (matches the menu vibe): purple/blue/cyan with dusty grays.
    float3 purple = float3(180.0, 100.0, 255.0) / 255.0;
    float3 blue   = float3(100.0, 100.0, 255.0) / 255.0;
    float3 cyan   = float3(0.0, 255.0, 255.0) / 255.0;
    float3 gray   = float3(80.0, 80.0, 95.0) / 255.0;

    float3 col = mix(purple, blue, n1);
    col = mix(col, cyan, n2 * 0.6);

    // Bright knots.
    float knots = pow(max(0.0, detail - 0.68), 2.0) * 1.2;
    col += knots * float3(0.25, 0.35, 0.45);

    // Dust darkening and overall brightness tied to density.
    col = mix(col, gray, dust * 0.75);
    col *= 0.08 + density * 0.85;

    // A bit more obscuring at the corners.
    float vignette = smoothstep(1.4, 0.6, r);
    col *= vignette;
    alpha *= (0.75 + 0.25 * vignette);

    return half4(half3(col), half(clamp(alpha, 0.0, 0.95)));
}`;

    this.effect = CK.RuntimeEffect.Make(sksl, (err) =>
      console.warn('Nebula shader error:', err)
    );
    if (!this.effect) return;

    this.paint = new CK.Paint();
    this.paint.setStyle(CK.PaintStyle.Fill);
    this.paint.setAntiAlias(false);
  }

  draw(canvas: Canvas, params: NebulaDrawParams): void {
    if (!this.effect || !this.paint) return;
    if (params.fade <= 0.001) return;

    const uniforms = buildNebulaUniforms(params);
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
