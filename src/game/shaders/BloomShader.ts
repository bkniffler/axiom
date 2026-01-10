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
uniform vec2 uResolution;

void main(void) {
    vec4 color = texture(uTexture, vTextureCoord);

    // Simple box blur for bloom effect
    vec2 pixelSize = 1.0 / uResolution;
    vec4 bloom = vec4(0.0);

    // Sample surrounding pixels
    for (float x = -2.0; x <= 2.0; x += 1.0) {
        for (float y = -2.0; y <= 2.0; y += 1.0) {
            vec2 offset = vec2(x, y) * pixelSize * 2.0;
            vec4 sample = texture(uTexture, vTextureCoord + offset);
            // Only bloom bright pixels
            float brightness = max(sample.r, max(sample.g, sample.b));
            if (brightness > 0.5) {
                bloom += sample * (brightness - 0.5);
            }
        }
    }
    bloom /= 25.0;

    finalColor = color + bloom * uIntensity;
}
`;

export class BloomFilter extends Filter {
    constructor() {
        const glProgram = GlProgram.from({
            vertex: vertexShader,
            fragment: fragmentShader,
        });

        super({
            glProgram,
            resources: {
                bloomUniforms: {
                    uIntensity: { value: 0.4, type: 'f32' },
                    uResolution: { value: [1920, 1080], type: 'vec2<f32>' },
                },
            },
        });
    }

    get intensity(): number {
        return this.resources.bloomUniforms.uniforms.uIntensity;
    }

    set intensity(value: number) {
        this.resources.bloomUniforms.uniforms.uIntensity = value;
    }

    setResolution(width: number, height: number): void {
        this.resources.bloomUniforms.uniforms.uResolution = [width, height];
    }
}
