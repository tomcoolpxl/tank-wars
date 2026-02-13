import { describe, it, expect } from 'vitest';
import { Tank } from '../../src/simulation/tank.js';
import { Terrain } from '../../src/simulation/terrain.js';
import { FP } from '../../src/simulation/constants.js';

describe('Tank Physics', () => {
    it('should fall under gravity when in air', () => {
        const terrain = new Terrain(); // All heights 0
        const tank = new Tank(0, 100 * FP, 200 * FP);
        
        const initialVy = tank.vy_fp;
        tank.step(terrain);
        
        expect(tank.vy_fp).toBeLessThan(initialVy);
        expect(tank.y_fp).toBeLessThan(200 * FP);
    });

    it('should stop and snap to ground when hitting terrain', () => {
        const terrain = new Terrain();
        // Set terrain height to 50 at x=100
        for(let i=0; i<terrain.heights.length; i++) terrain.heights[i] = 50;
        
        // Tank just above ground (bottom at 51, ground at 50)
        // Tank center y = bottom + height/2 = 51 + 6 = 57
        const tank = new Tank(0, 100 * FP, 57 * FP);
        tank.vy_fp = -1000; // Moving down
        
        tank.step(terrain);
        
        // Should snap to ground: y = 50 + 6 = 56
        expect(Math.floor(tank.y_fp / FP)).toBe(56);
        expect(tank.vy_fp).toBe(0);
    });

    it('should die when health reaches 0', () => {
        const terrain = new Terrain();
        const tank = new Tank(0, 100 * FP, 100 * FP);
        tank.health = 0;
        tank.step(terrain);
        expect(tank.alive).toBe(false);
        
        // Calling step on dead tank should do nothing
        const initialX = tank.x_fp;
        tank.step(terrain);
        expect(tank.x_fp).toBe(initialX);
    });

    it('should die when falling out of bounds (horizontal)', () => {
        const terrain = new Terrain();
        const tank = new Tank(0, -10 * FP, 100 * FP);
        tank.step(terrain);
        expect(tank.alive).toBe(false);
    });

    it('should die when falling out of bounds (vertical)', () => {
        const terrain = new Terrain();
        const tank = new Tank(0, 100 * FP, -10 * FP);
        tank.step(terrain);
        expect(tank.alive).toBe(false);
    });

    it('should snap to ground when below ground', () => {
        const terrain = new Terrain();
        for(let i=0; i<terrain.heights.length; i++) terrain.heights[i] = 100;
        
        // Tank way below ground (y=50, ground=100)
        const tank = new Tank(0, 100 * FP, 50 * FP);
        tank.step(terrain);
        
        expect(Math.floor(tank.y_fp / FP)).toBe(106); // 100 + 6
        expect(tank.vy_fp).toBe(0);
    });

    it('should slide on steep slopes (downhill right)', () => {
        const terrain = new Terrain();
        // hL=110 (x-2), hR=90 (x+2) -> dh = -20. slideDir = 1 (right)
        terrain.heights.fill(100);
        terrain.heights[98/2] = 110;
        terrain.heights[102/2] = 90;
        
        const tank = new Tank(0, 100 * FP, 106 * FP);
        tank.step(terrain);
        expect(tank.vx_fp).toBeGreaterThan(0);
    });

    it('should slide on steep slopes (downhill left)', () => {
        const terrain = new Terrain();
        // hL=90 (x-2), hR=110 (x+2) -> dh = 20. slideDir = -1 (left)
        terrain.heights.fill(100);
        terrain.heights[98/2] = 90;
        terrain.heights[102/2] = 110;
        
        const tank = new Tank(0, 100 * FP, 106 * FP);
        tank.step(terrain);
        expect(tank.vx_fp).toBeLessThan(0);
    });

    it('should apply friction on gentle slopes', () => {
        const terrain = new Terrain();
        terrain.heights.fill(100);
        
        const tank = new Tank(0, 100 * FP, 106 * FP);
        tank.vx_fp = 1000; // Moving
        
        tank.step(terrain);
        
        expect(tank.vx_fp).toBeLessThan(1000);
        expect(tank.vx_fp).toBe(800); // 1000 * 0.8
    });
});
