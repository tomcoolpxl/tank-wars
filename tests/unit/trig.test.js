import { describe, it, expect } from 'vitest';
import { getSin, getCos, getAtan2 } from '../../src/simulation/trigLUT.js';
import { FP } from '../../src/simulation/constants.js';

describe('Trig LUT', () => {
    it('should return correct sine values', () => {
        expect(getSin(0)).toBe(0);
        expect(getSin(90)).toBe(1 * FP);
        expect(getSin(180)).toBe(0);
        
        // Approx sin(30) = 0.5
        expect(getSin(30)).toBeCloseTo(0.5 * FP, -1);
    });

    it('should handle negative angles in getSin', () => {
        expect(getSin(-90)).toBe(-1 * FP);
    });

    it('should return correct sine values for all quadrants', () => {
        expect(getSin(45)).toBeGreaterThan(0);
        expect(getSin(135)).toBeGreaterThan(0);
        expect(getSin(225)).toBeLessThan(0);
        expect(getSin(315)).toBeLessThan(0);
    });

    it('should return correct cosine values', () => {
        expect(getCos(0)).toBe(1 * FP);
        expect(getCos(90)).toBe(0);
        expect(getCos(180)).toBe(-1 * FP);

        // Approx cos(60) = 0.5
        expect(getCos(60)).toBeCloseTo(0.5 * FP, -1);
    });

    it('should return correct cosine values for all quadrants', () => {
        expect(getCos(45)).toBeGreaterThan(0);
        expect(getCos(135)).toBeLessThan(0);
        expect(getCos(225)).toBeLessThan(0);
        expect(getCos(315)).toBeGreaterThan(0);
    });

    it('should return 0 for unsupported x in getAtan2', () => {
        expect(getAtan2(10, 7)).toBe(0);
    });
});
