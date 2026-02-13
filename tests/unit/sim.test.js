import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/simulation/sim.js';
import { GameState } from '../../src/simulation/rules.js';

describe('Simulation Lifecycle', () => {
    it('should initialize with correct seed', () => {
        const sim = new Simulation(123);
        expect(sim.seed).toBe(123);
        expect(sim.tanks.length).toBe(2);
    });

    it('should transition to PROJECTILE_FLIGHT on fire', () => {
        const sim = new Simulation(123);
        sim.start();
        sim.fire(45, 50, 0);
        expect(sim.rules.state).toBe(GameState.PROJECTILE_FLIGHT);
        expect(sim.projectile).toBeDefined();
    });

    it('should handle turn timer depletion (auto-fire)', () => {
        const sim = new Simulation(123);
        sim.start();
        sim.rules.turnTimer = 1;
        sim.step({});
        expect(sim.rules.state).toBe(GameState.PROJECTILE_FLIGHT);
    });

    it('should correctly save and load state', () => {
        const sim1 = new Simulation(123);
        sim1.start();
        sim1.step({ up: true }); // Change some state
        
        const state = sim1.getState();
        
        const sim2 = new Simulation(456); // Different seed
        sim2.setState(state);
        
        expect(sim1.getStateHash()).toBe(sim2.getStateHash());
        expect(sim2.tickCount).toBe(sim1.tickCount);
    });
});
