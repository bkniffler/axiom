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

void main(void) {
    vec4 color = texture(uTexture, vTextureCoord);

    // Calculate vignette
    vec2 uv = vTextureCoord;
    float dist = length(uv - 0.5) * 1.4;
    float vignette = 1.0 - smoothstep(0.4, 0.9, dist);
    vignette = mix(1.0, vignette, uIntensity);

    finalColor = vec4(color.rgb * vignette, color.a);
}
`;

export class VignetteFilter extends Filter {
    constructor() {
        const glProgram = GlProgram.from({
            vertex: vertexShader,
            fragment: fragmentShader,
        });

        super({
            glProgram,
            resources: {
                vignetteUniforms: {
                    uIntensity: { value: 0.3, type: 'f32' },
                },
            },
        });
    }

    get intensity(): number {
        return this.resources.vignetteUniforms.uniforms.uIntensity;
    }

    set intensity(value: number) {
        this.resources.vignetteUniforms.uniforms.uIntensity = value;
    }
}
