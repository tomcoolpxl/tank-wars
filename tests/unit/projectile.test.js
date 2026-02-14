import { describe, it, expect } from 'vitest';
import { Projectile } from '../../src/simulation/projectile.js';
import { Terrain } from '../../src/simulation/terrain.js';
import { Tank } from '../../src/simulation/tank.js';
import { FP } from '../../src/simulation/constants.js';

describe('Projectile Physics', () => {
    it('should follow gravity', () => {
        const p = new Projectile(100 * FP, 300 * FP, 0, 50, 0);
        const initialVy = p.vy_fp;
        p.step(new Terrain(), []);
        expect(p.vy_fp).toBeLessThan(initialVy);
    });

    it('should collide with terrain', () => {
        const terrain = new Terrain();
        for(let i=0; i<terrain.heights.length; i++) terrain.heights[i] = 100;
        
        // Projectile just above terrain at 101, moving down
        const p = new Projectile(100 * FP, 101 * FP, 0, 0, 0);
        p.vy_fp = -2 * FP; 
        
        const result = p.step(terrain, []);
        expect(result.type).toBe('explosion');
        expect(p.active).toBe(false);
    });

    it('should collide with tanks (dome shape)', () => {
        const terrain = new Terrain();
        // Tank at 200, 150. Dome is ty to ty+12.
        const tank = new Tank(0, 200 * FP, 150 * FP);
        
        // Projectile moving through tank dome at height 155
        const p = new Projectile(200 * FP, 156 * FP, 0, 0, 0);
        p.vy_fp = -1 * FP;

        const result = p.step(terrain, [tank]);
        expect(result.type).toBe('explosion');
        expect(p.active).toBe(false);
    });

    it('should respect lifetime cap', () => {
        const p = new Projectile(400 * FP, 500 * FP, 90, 1, 0);
        p.ticksAlive = 599;
        const result = p.step(new Terrain(), []);
        expect(result.type).toBe('timeout');
        expect(p.active).toBe(false);
    });

    it('should go out of bounds', () => {
        const p = new Projectile(799 * FP, 300 * FP, 0, 100, 0);
        const result = p.step(new Terrain(), []);
        expect(result.type).toBe('out-of-bounds');
    });

    it('should return null if step called on inactive projectile', () => {
        const p = new Projectile(100 * FP, 100 * FP, 0, 0, 0);
        p.active = false;
        expect(p.step(new Terrain(), [])).toBeNull();
    });

    it('should ignore self-collision initially but allow it later', () => {
        const shooter = new Tank(0, 100 * FP, 100 * FP);
        const target = new Tank(1, 200 * FP, 200 * FP);
        // Start inside the dome (y=105)
        const p = new Projectile(100 * FP, 105 * FP, 90, 0, 0, 0);
        
        // Ticks 0-19: ignore self
        for (let i = 0; i < 19; i++) {
            expect(p.step(new Terrain(), [shooter, target])).toBeNull();
            p.ticksAlive = i + 1; // Manually advance if needed or just let step do it
        }
        
        // Tick 20+: hit self (we need it to still be inside the dome)
        p.vx_fp = 0;
        p.vy_fp = 0; // stop it from flying out too fast for the test
        const result = p.step(new Terrain(), [shooter, target]);
        expect(result.type).toBe('explosion');
    });
});
