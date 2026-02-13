import { describe, it, expect } from 'vitest';
import { RNG } from '../../src/simulation/rng.js';

describe('Deterministic RNG', () => {
    it('should produce the same sequence for the same seed', () => {
        const rng1 = new RNG(12345);
        const rng2 = new RNG(12345);

        for (let i = 0; i < 100; i++) {
            expect(rng1.nextU32()).toBe(rng2.nextU32());
        }
    });

    it('should produce different sequences for different seeds', () => {
        const rng1 = new RNG(12345);
        const rng2 = new RNG(67890);

        let matchCount = 0;
        for (let i = 0; i < 100; i++) {
            if (rng1.nextU32() === rng2.nextU32()) matchCount++;
        }
        // Statistically, 100 random 32-bit ints shouldn't match much
        expect(matchCount).toBeLessThan(5);
    });

    it('should respect integer range', () => {
        const rng = new RNG(42);
        const min = 10;
        const max = 20;
        for (let i = 0; i < 1000; i++) {
            const val = rng.nextInt(min, max);
            expect(val).toBeGreaterThanOrEqual(min);
            expect(val).toBeLessThanOrEqual(max);
        }
    });
});
