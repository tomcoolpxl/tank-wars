import { describe, it, expect } from 'vitest';
import { mulFP, divFP, clamp, abs, sign } from '../../src/simulation/fixed.js';
import { FP } from '../../src/simulation/constants.js';

describe('Fixed-Point Math', () => {
    it('should correctly multiply fixed-point numbers', () => {
        // (1.5 * 2.0) = 3.0
        const a = 1.5 * FP;
        const b = 2.0 * FP;
        expect(mulFP(a, b)).toBe(3.0 * FP);

        // (0.1 * 0.1) = 0.01
        const c = 0.1 * FP;
        expect(mulFP(c, c)).toBe(0.01 * FP);
    });

    it('should correctly divide fixed-point numbers', () => {
        // (3.0 / 2.0) = 1.5
        const a = 3.0 * FP;
        const b = 2.0 * FP;
        expect(divFP(a, b)).toBe(1.5 * FP);

        // Round toward zero: 1 / 3 = 0.3333... -> 3333
        expect(divFP(1 * FP, 3 * FP)).toBe(3333);
        
        // Negative division
        expect(divFP(-1 * FP, 3 * FP)).toBe(-3333);
    });

    it('should clamp values correctly', () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should calculate absolute values', () => {
        expect(abs(10)).toBe(10);
        expect(abs(-10)).toBe(10);
        expect(abs(0)).toBe(0);
    });

    it('should return correct sign', () => {
        expect(sign(10)).toBe(1);
        expect(sign(-10)).toBe(-1);
        expect(sign(0)).toBe(0);
    });
});
