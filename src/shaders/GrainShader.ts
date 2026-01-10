import { Filter, GlProgram } from 'pixi.js';

const vertexShader = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const fragmentShader = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uIntensity;
uniform float uTime;

// Simple hash function for noise
float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void) {
    vec4 color = texture(uTexture, vTextureCoord);

    // Animated film grain
    float grain = (random(vTextureCoord + uTime) - 0.5) * uIntensity;

    finalColor = vec4(color.rgb + grain, color.a);
}
`;

export class GrainFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({
      vertex: vertexShader,
      fragment: fragmentShader,
    });

    super({
      glProgram,
      resources: {
        grainUniforms: {
          uIntensity: { value: 0.03, type: 'f32' },
          uTime: { value: 0, type: 'f32' },
        },
      },
    });
  }

  get intensity(): number {
    return this.resources.grainUniforms.uniforms.uIntensity;
  }

  set intensity(value: number) {
    this.resources.grainUniforms.uniforms.uIntensity = value;
  }

  get time(): number {
    return this.resources.grainUniforms.uniforms.uTime;
  }

  set time(value: number) {
    this.resources.grainUniforms.uniforms.uTime = value;
  }
}
