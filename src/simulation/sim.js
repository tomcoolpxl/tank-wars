import { RNG } from './rng.js';
import { Terrain } from './terrain.js';
import { Tank } from './tank.js';
import { Projectile } from './projectile.js';
import { Rules, GameState } from './rules.js';
import { applyExplosion } from './explosion.js';
import { 
    FP, STABILIZATION_CAP_TICKS, TANK_SPAWN_LEFT_RANGE, TANK_SPAWN_RIGHT_RANGE 
} from './constants.js';

export class Simulation {
    constructor(seed) {
        this.seed = seed;
        this.rng = new RNG(seed);
        this.terrain = new Terrain();
        this.terrain.generate(seed);
        
        this.tanks = [
            this.createTank(0, TANK_SPAWN_LEFT_RANGE),
            this.createTank(1, TANK_SPAWN_RIGHT_RANGE)
        ];
        
        this.projectile = null;
        this.rules = new Rules();
        this.tickCount = 0;
        this.events = [];
    }

    createTank(id, range) {
        const x = this.rng.nextInt(range[0], range[1]);
        const y = this.terrain.getHeightAtX(x);
        return new Tank(id, x * FP, (y + 6) * FP); // Start slightly above ground
    }

    start() {
        this.rules.startMatch(this.rng);
    }

    step(inputs = {}) {
        this.events = [];
        this.tickCount++;

        switch (this.rules.state) {
            case GameState.TURN_AIM:
                // Decrement timer
                if (this.rules.turnTimer > 0) {
                    this.rules.turnTimer--;
                }

                // Apply inputs to active tank
                const activeTank = this.tanks[this.rules.activePlayerIndex];
                
                if (inputs.left) activeTank.aimAngle += 1;
                if (inputs.right) activeTank.aimAngle -= 1;
                if (inputs.up) activeTank.aimPower += 1;
                if (inputs.down) activeTank.aimPower -= 1;

                // Clamp values
                if (activeTank.aimAngle < 0) activeTank.aimAngle = 0;
                if (activeTank.aimAngle > 180) activeTank.aimAngle = 180;
                if (activeTank.aimPower < 0) activeTank.aimPower = 0;
                if (activeTank.aimPower > 100) activeTank.aimPower = 100;

                // Fire condition: Input space OR timer expired
                if (inputs.fire || this.rules.turnTimer <= 0) {
                    this.handleShot(activeTank.aimAngle, activeTank.aimPower);
                }
                break;

            case GameState.PROJECTILE_FLIGHT:
                if (this.projectile) {
                    const result = this.projectile.step(this.terrain, this.tanks);
                    if (result) {
                        if (result.type === 'explosion') {
                            applyExplosion(result.x, result.y, this.terrain, this.tanks);
                            this.events.push({ type: 'explosion', x: result.x, y: result.y });
                        }
                        this.projectile = null;
                        this.rules.state = GameState.POST_EXPLOSION_STABILIZE;
                        this.rules.stabilizationTimer = STABILIZATION_CAP_TICKS;
                    }
                }
                break;

            case GameState.POST_EXPLOSION_STABILIZE:
                let allStable = true;
                for (const tank of this.tanks) {
                    tank.step(this.terrain);
                    if (!tank.stable) allStable = false;
                }
                
                this.rules.stabilizationTimer--;
                
                if (allStable || this.rules.stabilizationTimer <= 0) {
                    this.checkWinConditions();
                    if (this.rules.state !== GameState.GAME_OVER) {
                        this.rules.nextTurn(this.rng);
                    }
                }
                break;
        }
    }

    handleShot(angle, power) {
        if (this.rules.state !== GameState.TURN_AIM) return;

        const activeTank = this.tanks[this.rules.activePlayerIndex];
        this.projectile = new Projectile(
            activeTank.x_fp, 
            activeTank.y_fp, 
            angle, 
            power, 
            this.rules.wind
        );
        this.rules.state = GameState.PROJECTILE_FLIGHT;
    }

    checkWinConditions() {
        const aliveTanks = this.tanks.filter(t => t.alive);
        if (aliveTanks.length === 0) {
            this.rules.state = GameState.GAME_OVER;
            this.rules.winner = -1; // Draw
        } else if (aliveTanks.length === 1) {
            this.rules.state = GameState.GAME_OVER;
            this.rules.winner = aliveTanks[0].id;
        }
    }

    getStateHash() {
        // Very basic hash for determinism checking
        let h = 0;
        for (let i = 0; i < this.terrain.heights.length; i++) {
            h = (h * 31 + this.terrain.heights[i]) | 0;
        }
        for (const tank of this.tanks) {
            h = (h * 31 + tank.x_fp) | 0;
            h = (h * 31 + tank.y_fp) | 0;
            h = (h * 31 + tank.health) | 0;
        }
        return h;
    }
}
