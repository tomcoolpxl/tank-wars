import { describe, it, expect } from 'vitest';
import { isqrt } from '../../src/simulation/isqrt.js';

describe('Integer Square Root', () => {
    it('should calculate square root of positive integers', () => {
        expect(isqrt(0)).toBe(0);
        expect(isqrt(1)).toBe(1);
        expect(isqrt(4)).toBe(2);
        expect(isqrt(9)).toBe(3);
        expect(isqrt(10)).toBe(3); // floor(sqrt(10))
        expect(isqrt(15)).toBe(3);
        expect(isqrt(16)).toBe(4);
        expect(isqrt(10000)).toBe(100);
    });

    it('should return 0 for negative integers', () => {
        expect(isqrt(-1)).toBe(0);
        expect(isqrt(-100)).toBe(0);
    });
});
