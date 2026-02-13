/**
 * Deterministic integer square root: floor(sqrt(n))
 */
export function isqrt(n) {
    if (n < 0) return 0;
    if (n < 2) return n;

    let x = n;
    let y = Math.floor((x + 1) / 2);
    while (y < x) {
        x = y;
        y = Math.floor((x + Math.floor(n / x)) / 2);
    }
    return x;
}
