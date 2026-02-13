import { describe, it, expect } from 'vitest';
import { Terrain } from '../../src/simulation/terrain.js';
import { TERRAIN_MIN_HEIGHT, TERRAIN_MAX_HEIGHT, WIDTH } from '../../src/simulation/constants.js';

describe('Terrain', () => {
    it('should generate deterministic terrain', () => {
        const t1 = new Terrain();
        const t2 = new Terrain();
        t1.generate(12345);
        t2.generate(12345);

        expect(t1.heights).toEqual(t2.heights);
    });

    it('should stay within height bounds', () => {
        const t = new Terrain();
        t.generate(999);
        for (let h of t.heights) {
            expect(h).toBeGreaterThanOrEqual(TERRAIN_MIN_HEIGHT);
            expect(h).toBeLessThanOrEqual(TERRAIN_MAX_HEIGHT);
        }
    });

    it('should correctly sample height at X', () => {
        const t = new Terrain();
        t.generate(1);
        const h0 = t.getHeightAtX(0);
        expect(h0).toBe(t.heights[0]);

        const hMid = t.getHeightAtX(WIDTH / 2);
        expect(hMid).toBe(t.heights[t.heights.length / 2]);

        expect(t.getHeightAtX(-10)).toBe(t.heights[0]);
        expect(t.getHeightAtX(WIDTH + 10)).toBe(t.heights[t.heights.length - 1]);
    });

    it('should deform correctly with a crater', () => {
        const t = new Terrain();
        t.generate(1);
        const originalHeight = t.getHeightAtX(100);
        
        // Explosion at x=100
        t.deformCrater(100, originalHeight, 10);
        
        const newHeight = t.getHeightAtX(100);
        expect(newHeight).toBeLessThan(originalHeight);
        expect(newHeight).toBe(originalHeight - 10); // at dx=0, depth is isqrt(100-0) = 10
    });
});
