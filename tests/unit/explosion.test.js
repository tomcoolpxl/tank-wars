import { describe, it, expect } from 'vitest';
import { applyExplosion } from '../../src/simulation/explosion.js';
import { Tank } from '../../src/simulation/tank.js';
import { Terrain } from '../../src/simulation/terrain.js';
import { FP, EXPLOSION_DAMAGE_RADIUS } from '../../src/simulation/constants.js';

describe('Explosion Logic', () => {
    it('should damage tanks within radius', () => {
        const terrain = new Terrain();
        const tank = new Tank(0, 100 * FP, 100 * FP);
        tank.health = 100;
        
        // Direct hit
        applyExplosion(100, 100, terrain, [tank]);
        expect(tank.health).toBe(0);
        expect(tank.alive).toBe(false);
    });

    it('should apply quadratic falloff', () => {
        const terrain = new Terrain();
        const tank = new Tank(0, 100 * FP, 100 * FP);
        tank.health = 100;
        
        // Distance d = 30. R = 60.
        // damage = 100 * (60^2 - 30^2) / 60^2
        // damage = 100 * (3600 - 900) / 3600
        // damage = 100 * 2700 / 3600 = 100 * 0.75 = 75
        applyExplosion(70, 100, terrain, [tank]);
        expect(tank.health).toBe(25);
    });

    it('should not damage tanks outside radius', () => {
        const terrain = new Terrain();
        const tank = new Tank(0, 100 * FP, 100 * FP);
        tank.health = 100;
        
        // Distance 61 > 60
        applyExplosion(161, 100, terrain, [tank]);
        expect(tank.health).toBe(100);
    });

    it('should deform terrain', () => {
        const terrain = new Terrain();
        terrain.heights.fill(200);
        
        applyExplosion(100, 200, terrain, []);
        
        expect(terrain.getHeightAtX(100)).toBeLessThan(200);
    });

    it('should skip dead tanks', () => {
        const terrain = new Terrain();
        const tank = new Tank(0, 100 * FP, 100 * FP);
        tank.health = 0;
        tank.alive = false;
        
        applyExplosion(100, 100, terrain, [tank]);
        expect(tank.health).toBe(0);
        expect(tank.alive).toBe(false);
    });
});
