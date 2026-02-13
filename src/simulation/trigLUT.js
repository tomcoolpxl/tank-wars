import { FP } from './constants.js';

/**
 * Trigonometry Lookup Table
 * Precomputed sin/cos for 0..180 degrees in fixed-point.
 * Angle quantization is exactly 1 integer degree.
 */

const SIN_LUT = new Int32Array(181);
const COS_LUT = new Int32Array(181);

for (let deg = 0; deg <= 180; deg++) {
    const rad = (deg * Math.PI) / 180;
    SIN_LUT[deg] = Math.round(Math.sin(rad) * FP);
    COS_LUT[deg] = Math.round(Math.cos(rad) * FP);
}

export function getSin(deg) {
    if (deg < 0) return -SIN_LUT[Math.abs(deg) % 181]; // Basic symmetry if needed
    return SIN_LUT[deg % 181];
}

export function getCos(deg) {
    // cos(x) for x in [0, 180] is precomputed.
    // If deg > 180, we could use symmetry, but requirements say input is 0..180.
    return COS_LUT[deg % 181];
}
