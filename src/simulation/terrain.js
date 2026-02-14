import { RNG } from './rng.js';
import { isqrt } from './isqrt.js';
import { 
    TERRAIN_SAMPLES, TERRAIN_STEP, TERRAIN_MIN_HEIGHT, TERRAIN_MAX_HEIGHT, WIDTH,
    TERRAIN_GEN_BASE_RANGE, TERRAIN_GEN_TREND_RANGE, TERRAIN_GEN_TREND_LIMIT,
    TERRAIN_GEN_SMOOTH_PASSES
} from './constants.js';

export class Terrain {
    constructor() {
        this.heights = new Int32Array(TERRAIN_SAMPLES);
    }

    log(...args) {
        if (typeof window !== 'undefined' && window.DEBUG_TERRAIN) {
            console.log('[TERRAIN]', ...args);
        }
    }

    generate(seed) {
        const rng = new RNG(seed);
        
        // Simple deterministic terrain generation using layered waves
        // This produces a "mountain-like" profile without overhangs.
        
        const baseHeight = rng.nextInt(TERRAIN_GEN_BASE_RANGE[0], TERRAIN_GEN_BASE_RANGE[1]);
        
        // Random walk generation
        let currentH = baseHeight;
        let trend = 0;
        for (let i = 0; i < TERRAIN_SAMPLES; i++) {
            trend += rng.nextInt(TERRAIN_GEN_TREND_RANGE[0], TERRAIN_GEN_TREND_RANGE[1]);
            trend = Math.max(-TERRAIN_GEN_TREND_LIMIT, Math.min(TERRAIN_GEN_TREND_LIMIT, trend));
            currentH += trend;
            currentH = Math.max(TERRAIN_MIN_HEIGHT, Math.min(TERRAIN_MAX_HEIGHT, currentH));
            this.heights[i] = currentH;
        }
        
        // Smoothing pass
        for (let pass = 0; pass < TERRAIN_GEN_SMOOTH_PASSES; pass++) {
            for (let i = 1; i < TERRAIN_SAMPLES - 1; i++) {
                this.heights[i] = Math.floor((this.heights[i-1] + this.heights[i] + this.heights[i+1]) / 3);
            }
        }
    }

    getHeightAtX(x) {
        const px = Math.floor(x);
        if (px < 0) return this.heights[0];
        if (px >= WIDTH) return this.heights[TERRAIN_SAMPLES - 1];
        
        const index = Math.floor(px / TERRAIN_STEP);
        return this.heights[index];
    }

    deformCrater(ex, ey, r) {
        const r2 = r * r;
        const startIndex = Math.max(0, Math.floor((ex - r) / TERRAIN_STEP));
        const endIndex = Math.min(TERRAIN_SAMPLES - 1, Math.floor((ex + r) / TERRAIN_STEP));
        
        for (let i = startIndex; i <= endIndex; i++) {
            const sampleX = i * TERRAIN_STEP;
            const dx = Math.abs(sampleX - ex);
            if (dx <= r) {
                const depth = isqrt(r2 - dx * dx);
                // Crater center is at (ex, ey). The terrain is modified at sampleX.
                // If ey is near the terrain, we subtract. 
                // Requirements: NewHeight = max(0, OldHeight - depth)
                // This assumes the explosion happens *on* the terrain.
                this.heights[i] = Math.max(0, this.heights[i] - depth);
            }
        }
    }
}
