import { describe, it, expect } from 'vitest';
import { Rules, GameState } from '../../src/simulation/rules.js';
import { RNG } from '../../src/simulation/rng.js';

describe('Rules State Machine', () => {
    it('should initialize to LOBBY', () => {
        const rules = new Rules();
        expect(rules.state).toBe(GameState.LOBBY);
    });

    it('should start match correctly', () => {
        const rules = new Rules();
        const rng = new RNG(123);
        rules.startMatch(rng);
        expect(rules.state).toBe(GameState.TURN_AIM);
        expect(rules.turnNumber).toBe(1);
        expect(rules.turnTimer).toBe(1200);
    });

    it('should cycle players each turn', () => {
        const rules = new Rules();
        const rng = new RNG(123);
        rules.startMatch(rng);
        expect(rules.activePlayerIndex).toBe(0);
        
        rules.nextTurn(rng);
        expect(rules.activePlayerIndex).toBe(1);
        expect(rules.turnNumber).toBe(2);

        rules.nextTurn(rng);
        expect(rules.activePlayerIndex).toBe(0);
        expect(rules.turnNumber).toBe(3);
    });
});
