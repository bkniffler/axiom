import { Container, Filter } from 'pixi.js';
import { VignetteFilter } from './VignetteShader';
import { GrainFilter } from './GrainShader';
import { BloomFilter } from './BloomShader';

export interface PostProcessConfig {
    vignette: number;
    grain: number;
    bloom: number;
}

export class PostProcessor {
    private container: Container;
    private vignetteFilter: VignetteFilter;
    private grainFilter: GrainFilter;
    private bloomFilter: BloomFilter;

    private vignetteEnabled = true;
    private grainEnabled = true;
    private bloomEnabled = true;
    private allEnabled = true;

    constructor(container: Container) {
        this.container = container;
        this.vignetteFilter = new VignetteFilter();
        this.grainFilter = new GrainFilter();
        this.bloomFilter = new BloomFilter();

        this.updateFilters();
    }

    setConfig(config: PostProcessConfig): void {
        this.vignetteFilter.intensity = config.vignette;
        this.grainFilter.intensity = config.grain;
        this.bloomFilter.intensity = config.bloom;
    }

    toggleVignette(): boolean {
        this.vignetteEnabled = !this.vignetteEnabled;
        this.updateFilters();
        return this.vignetteEnabled;
    }

    toggleGrain(): boolean {
        this.grainEnabled = !this.grainEnabled;
        this.updateFilters();
        return this.grainEnabled;
    }

    toggleBloom(): boolean {
        this.bloomEnabled = !this.bloomEnabled;
        this.updateFilters();
        return this.bloomEnabled;
    }

    toggleAll(): boolean {
        this.allEnabled = !this.allEnabled;
        this.updateFilters();
        return this.allEnabled;
    }

    private updateFilters(): void {
        if (!this.allEnabled) {
            this.container.filters = null;
            return;
        }

        const filters: Filter[] = [];

        if (this.bloomEnabled) {
            filters.push(this.bloomFilter);
        }
        if (this.grainEnabled) {
            filters.push(this.grainFilter);
        }
        if (this.vignetteEnabled) {
            filters.push(this.vignetteFilter);
        }

        this.container.filters = filters.length > 0 ? filters : null;
    }

    update(time: number): void {
        this.grainFilter.time = time;
    }

    destroy(): void {
        this.container.filters = null;
    }
}
