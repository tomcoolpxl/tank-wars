import { TURN_DURATION_TICKS } from './constants.js';

export const GameState = {
    LOBBY: 'LOBBY',
    TURN_AIM: 'TURN_AIM',
    PROJECTILE_FLIGHT: 'PROJECTILE_FLIGHT',
    POST_EXPLOSION_STABILIZE: 'POST_EXPLOSION_STABILIZE',
    GAME_OVER: 'GAME_OVER'
};

export class Rules {
    constructor() {
        this.state = GameState.LOBBY;
        this.activePlayerIndex = 0;
        this.turnNumber = 0;
        this.turnTimer = 0;
        this.stabilizationTimer = 0;
        this.wind = 0;
        this.winner = null;
    }

    log(...args) {
        if (typeof window !== 'undefined' && window.DEBUG_RULES) {
            console.log('[RULES]', ...args);
        }
    }

    startMatch(rng) {
        this.log('startMatch()');
        this.state = GameState.TURN_AIM;
        this.activePlayerIndex = 0;
        this.turnNumber = 1;
        this.startTurn(rng);
    }

    startTurn(rng) {
        this.turnTimer = TURN_DURATION_TICKS;
        // Wind: triangular distribution centered at 0
        // wind = (randInt(-15, 15) + randInt(-15, 15)) / 2
        const r1 = rng.nextInt(-15, 15);
        const r2 = rng.nextInt(-15, 15);
        // Use Math.trunc to ensure consistent rounding towards zero for both positive and negative results
        this.wind = Math.trunc((r1 + r2) / 2);
        this.log(`startTurn(): turn=${this.turnNumber}, player=${this.activePlayerIndex}, wind=${this.wind}`);
    }

    nextTurn(rng) {
        this.activePlayerIndex = 1 - this.activePlayerIndex;
        this.turnNumber++;
        this.state = GameState.TURN_AIM;
        this.log(`nextTurn(): moving to turn=${this.turnNumber}, player=${this.activePlayerIndex}`);
        this.startTurn(rng);
    }
}
