/**
 * Deterministic PRNG using xorshift32.
 */
export class RNG {
    constructor(seed = 1) {
        this.state = seed >>> 0;
        if (this.state === 0) this.state = 1;
    }

    /**
     * Returns a 32-bit unsigned integer.
     */
    nextU32() {
        let x = this.state;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.state = x >>> 0;
        return this.state;
    }

    /**
     * Returns an integer in [min, max] inclusive.
     */
    nextInt(min, max) {
        const range = max - min + 1;
        return min + (this.nextU32() % range);
    }
}
