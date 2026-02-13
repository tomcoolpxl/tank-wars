import { describe, it, expect } from 'vitest';
import { getSin, getCos } from '../../src/simulation/trigLUT.js';
import { FP } from '../../src/simulation/constants.js';

describe('Trig LUT', () => {
    it('should return correct sine values', () => {
        expect(getSin(0)).toBe(0);
        expect(getSin(90)).toBe(1 * FP);
        expect(getSin(180)).toBe(0);
        
        // Approx sin(30) = 0.5
        expect(getSin(30)).toBeCloseTo(0.5 * FP, -1);
    });

    it('should return correct cosine values', () => {
        expect(getCos(0)).toBe(1 * FP);
        expect(getCos(90)).toBe(0);
        expect(getCos(180)).toBe(-1 * FP);

        // Approx cos(60) = 0.5
        expect(getCos(60)).toBeCloseTo(0.5 * FP, -1);
    });
});
