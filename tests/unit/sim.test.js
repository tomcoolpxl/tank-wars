import { describe, it, expect } from 'vitest';
import { Simulation } from '../../src/simulation/sim.js';
import { GameState } from '../../src/simulation/rules.js';
import { FP } from '../../src/simulation/constants.js';

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
        sim.autoFireEnabled = true;
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

        // Test clamping to 0
        activeTank.aimAngle = 1;
        activeTank.aimPower = 1;
        sim.step({ right: true, down: true });
        expect(activeTank.aimAngle).toBe(0);
        expect(activeTank.aimPower).toBe(0);
        sim.step({ right: true, down: true });
        expect(activeTank.aimAngle).toBe(0);
        expect(activeTank.aimPower).toBe(0);
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

    it('should calculate state hash with projectile and dead tank', () => {
        const sim = new Simulation(123);
        sim.start();
        sim.tanks[1].alive = false; // Cover dead tank branch in hash
        sim.fire(45, 50, 0);
        const hash = sim.getStateHash();
        expect(hash).not.toBe(0);
    });

    it('should detect draw condition', () => {
        const sim = new Simulation(1);
        sim.tanks[0].alive = false;
        sim.tanks[1].alive = false;
        sim.checkWinConditions();
        
        expect(sim.rules.state).toBe(GameState.GAME_OVER);
        expect(sim.rules.winner).toBe(-1);
    });

    it('should detect single winner', () => {
        const sim = new Simulation(1);
        sim.tanks[0].alive = true;
        sim.tanks[1].alive = false;
        sim.checkWinConditions();
        
        expect(sim.rules.state).toBe(GameState.GAME_OVER);
        expect(sim.rules.winner).toBe(0);
    });

    it('should stabilize on timer even if not stable', () => {
        const sim = new Simulation(123);
        sim.rules.state = GameState.POST_EXPLOSION_STABILIZE;
        sim.rules.stabilizationTimer = 1;
        
        // Force instability
        sim.tanks[0].vx_fp = 1000;
        
        sim.step({});
        expect(sim.rules.state).toBe(GameState.TURN_AIM);
    });

    it('should handle PROJECTILE_FLIGHT state with null projectile', () => {
        const sim = new Simulation(123);
        sim.rules.state = GameState.PROJECTILE_FLIGHT;
        sim.projectile = null;
        sim.step({}); // Should not crash and just do nothing
        expect(sim.rules.state).toBe(GameState.PROJECTILE_FLIGHT);
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

    it('should ignore fire() when not in TURN_AIM state', () => {
        const sim = new Simulation(123);
        sim.rules.state = GameState.PROJECTILE_FLIGHT;
        sim.fire(45, 50, 0);
        expect(sim.projectile).toBeNull();
    });

    it('should handle turn timer already at 0', () => {
        const sim = new Simulation(123);
        sim.start();
        sim.autoFireEnabled = true;
        sim.rules.turnTimer = 0;
        sim.step({});
        expect(sim.rules.state).toBe(GameState.PROJECTILE_FLIGHT);
    });

    it('should correctly restore all state fields in setState', () => {
        const sim = new Simulation(123);
        const state = sim.getState();
        state.rules.wind = 99;
        state.tanks[0].health = 42;
        state.tickCount = 1337;
        
        sim.setState(state);
        expect(sim.rules.wind).toBe(99);
        expect(sim.tanks[0].health).toBe(42);
        expect(sim.tickCount).toBe(1337);
    });

    it('should trigger explosion event in simulation', () => {
        const sim = new Simulation(123);
        sim.start();
        
        // Place a tank right in front of the active tank
        const activeIdx = sim.rules.activePlayerIndex;
        const targetIdx = 1 - activeIdx;
        const activeTank = sim.tanks[activeIdx];
        const targetTank = sim.tanks[targetIdx];
        
        targetTank.x_fp = activeTank.x_fp + (50 * FP);
        targetTank.y_fp = activeTank.y_fp;
        
        // Fire towards target
        sim.fire(0, 50, activeIdx);
        
        let limit = 100;
        while (sim.rules.state === GameState.PROJECTILE_FLIGHT && limit-- > 0) {
            sim.step({});
        }
        
        expect(sim.events.some(e => e.type === 'explosion')).toBe(true);
    });

    it('should handle GAME_OVER during stabilization', () => {
        const sim = new Simulation(123);
        sim.start();
        sim.rules.state = GameState.POST_EXPLOSION_STABILIZE;
        
        // Kill all tanks during stabilization
        sim.tanks[0].alive = false;
        sim.tanks[1].alive = false;
        
        sim.step({});
        expect(sim.rules.state).toBe(GameState.GAME_OVER);
    });
});
