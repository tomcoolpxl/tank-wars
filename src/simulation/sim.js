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

                // Auto-fire on timeout
                if (this.rules.turnTimer <= 0) {
                    this.fire(activeTank.aimAngle, activeTank.aimPower);
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

    fire(angle, power) {
        if (this.rules.state !== GameState.TURN_AIM) return;

        const activeTank = this.tanks[this.rules.activePlayerIndex];
        activeTank.aimAngle = angle;
        activeTank.aimPower = power;

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
        // More robust hash for determinism checking
        let h = 0;
        const hashInt = (val) => {
            h = (Math.imul(h, 31) + (val | 0)) | 0;
        };

        // 1. Terrain
        for (let i = 0; i < this.terrain.heights.length; i++) {
            hashInt(this.terrain.heights[i]);
        }

        // 2. Tanks
        for (const tank of this.tanks) {
            hashInt(tank.x_fp);
            hashInt(tank.y_fp);
            hashInt(tank.vx_fp);
            hashInt(tank.vy_fp);
            hashInt(tank.health);
            hashInt(tank.aimAngle);
            hashInt(tank.aimPower);
            hashInt(tank.alive ? 1 : 0);
        }

        // 3. Projectile
        if (this.projectile) {
            hashInt(1);
            hashInt(this.projectile.x_fp);
            hashInt(this.projectile.y_fp);
            hashInt(this.projectile.vx_fp);
            hashInt(this.projectile.vy_fp);
        } else {
            hashInt(0);
        }

        // 4. Wind and Rules
        hashInt(this.rules.wind);
        hashInt(this.rules.turnNumber);
        hashInt(this.rules.activePlayerIndex);
        hashInt(this.rules.state);
        hashInt(this.rules.turnTimer);

        // 5. RNG State
        hashInt(this.rng.state);

        return h;
    }
}
