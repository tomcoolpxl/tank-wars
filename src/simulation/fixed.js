import { FP } from './constants.js';

/**
 * Fixed-point multiplication: (a * b) / FP
 */
export function mulFP(a, b) {
    // Using BigInt to prevent overflow during intermediate multiplication
    return Number((BigInt(a) * BigInt(b)) / BigInt(FP));
}

/**
 * Fixed-point division: (a * FP) / b
 * Implements deterministic signed division rounding toward zero.
 */
export function divFP(a, b) {
    if (b === 0) return 0;
    return Number((BigInt(a) * BigInt(FP)) / BigInt(b));
}

export function clamp(val, min, max) {
    return val < min ? min : (val > max ? max : val);
}

export function abs(val) {
    return val < 0 ? -val : val;
}

export function sign(val) {
    return val < 0 ? -1 : (val > 0 ? 1 : 0);
}
