import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tank } from '../../src/simulation/tank.js';
import { Terrain } from '../../src/simulation/terrain.js';
import { FP } from '../../src/simulation/constants.js';

describe('Tank Physics', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { DEBUG_TANK: true });
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('should fall under gravity when in air', () => {
        const terrain = new Terrain(); // All heights 0
        const tank = new Tank(0, 100 * FP, 200 * FP);
        
        const initialVy = tank.vy_fp;
        tank.step(terrain);
        
        expect(tank.vy_fp).toBeLessThan(initialVy);
        expect(tank.y_fp).toBeLessThan(200 * FP);
    });

    it('should log debug info if enabled', () => {
        const tank = new Tank(0, 100 * FP, 200 * FP);
        tank.log('test message');
        expect(console.log).toHaveBeenCalledWith('[TANK 0]', 'test message');
    });

    it('should die if bottom Y < 0', () => {
        const terrain = new Terrain();
        const tank = new Tank(0, 100 * FP, -1 * FP);
        tank.step(terrain);
        expect(tank.alive).toBe(false);
        expect(tank.health).toBe(0);
    });

    it('should stop and snap to ground when hitting terrain', () => {
        const terrain = new Terrain();
        // Set terrain height to 50 at x=100
        for(let i=0; i<terrain.heights.length; i++) terrain.heights[i] = 50;
        
        // Tank just above ground (bottom at 50.1, ground at 50)
        // Tank center y = bottom + height/2 = 50.1 + 0 = 50.1
        const tank = new Tank(0, 100 * FP, 50.1 * FP);
        tank.vy_fp = -1000; // Moving down
        
        tank.step(terrain);
        
        // Should snap to ground: y = 50 + 0 = 50
        expect(Math.floor(tank.y_fp / FP)).toBe(50);
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
        
        expect(Math.floor(tank.y_fp / FP)).toBe(100); // 100 + 0
        expect(tank.vy_fp).toBe(0);
    });

    it('should calculate rotation but NOT slide on steep slopes', () => {
        const terrain = new Terrain();
        // hL=110 (x-4), hR=90 (x+4) -> dh = -20
        terrain.heights.fill(100);
        terrain.heights[(100-4)/2] = 110;
        terrain.heights[(100+4)/2] = 90;
        
        const tank = new Tank(0, 100 * FP, 100 * FP);
        tank.step(terrain);
        
        expect(tank.vx_fp).toBe(0); // No sliding
        expect(tank.baseAngleDeg).not.toBe(0);
    });

    it('should apply friction (stay still) on gentle slopes', () => {
        const terrain = new Terrain();
        terrain.heights.fill(100);
        
        const tank = new Tank(0, 100 * FP, 100 * FP);
        tank.vx_fp = 1000; // Moving initially (e.g. from explosion, though simulation doesn't add vx now)
        
        tank.step(terrain);
        
        expect(tank.vx_fp).toBe(0); // Forced to 0 in step() when on ground
    });
});
