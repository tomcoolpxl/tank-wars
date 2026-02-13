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

    it('should handle inputs and clamp them', () => {
        const sim = new Simulation(1);
        sim.start();
        const activeIdx = sim.rules.activePlayerIndex;
        const activeTank = sim.tanks[activeIdx];
        
        activeTank.aimAngle = 179;
        activeTank.aimPower = 99;
        
        sim.step({ left: true, up: true }); // left increases angle, up increases power
        expect(activeTank.aimAngle).toBe(180);
        expect(activeTank.aimPower).toBe(100);
        
        sim.step({ left: true, up: true }); // should clamp
        expect(activeTank.aimAngle).toBe(180);
        expect(activeTank.aimPower).toBe(100);

        sim.step({ right: true, down: true }); // right decreases angle, down decreases power
        expect(activeTank.aimAngle).toBe(179);
        expect(activeTank.aimPower).toBe(99);
    });

    it('should reject fire from wrong player index', () => {
        const sim = new Simulation(1);
        sim.start();
        const activeIdx = sim.rules.activePlayerIndex;
        const wrongIdx = 1 - activeIdx;
        
        sim.fire(45, 50, wrongIdx);
        expect(sim.rules.state).toBe(GameState.TURN_AIM);
        expect(sim.projectile).toBeNull();
    });

    it('should detect draw condition', () => {
        const sim = new Simulation(1);
        sim.tanks[0].alive = false;
        sim.tanks[1].alive = false;
        sim.checkWinConditions();
        
        expect(sim.rules.state).toBe(GameState.GAME_OVER);
        expect(sim.rules.winner).toBe(-1);
    });

    it('should run a full turn simulation', () => {
        const sim = new Simulation(123);
        sim.start();
        
        // Fire straight up
        sim.fire(90, 50, sim.rules.activePlayerIndex);
        expect(sim.rules.state).toBe(GameState.PROJECTILE_FLIGHT);
        
        // Step until explosion
        let limit = 2000;
        while (sim.rules.state === GameState.PROJECTILE_FLIGHT && limit-- > 0) {
            sim.step({});
        }
        expect(sim.rules.state).toBe(GameState.POST_EXPLOSION_STABILIZE);
        
        // Step until next turn
        limit = 2000;
        while (sim.rules.state === GameState.POST_EXPLOSION_STABILIZE && limit-- > 0) {
            sim.step({});
        }
        expect(sim.rules.state).toBe(GameState.TURN_AIM);
        expect(sim.rules.turnNumber).toBe(2);
    });
});
