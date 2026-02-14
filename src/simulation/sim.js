import { RNG } from './rng.js';
import { Terrain } from './terrain.js';
import { Tank } from './tank.js';
import { Projectile } from './projectile.js';
import { Rules, GameState } from './rules.js';
import { applyExplosion } from './explosion.js';
import { getSin, getCos } from './trigLUT.js';
import { 
    FP, STABILIZATION_CAP_TICKS, TANK_SPAWN_LEFT_RANGE, TANK_SPAWN_RIGHT_RANGE 
} from './constants.js';

export class Simulation {
    constructor(seed) {
        this.seed = seed >>> 0;
        this.rng = new RNG(this.seed);
        this.terrain = new Terrain();
        this.terrain.generate(this.seed);
        
        this.tanks = [
            this.createTank(0, TANK_SPAWN_LEFT_RANGE),
            this.createTank(1, TANK_SPAWN_RIGHT_RANGE)
        ];

        for (const tank of this.tanks) {
            tank.step(this.terrain);
        }
        
        this.projectile = null;
        this.rules = new Rules();
        this.tickCount = 0;
        this.events = [];
        this.autoFireEnabled = true;
    }

    log(...args) {
        if (typeof window !== 'undefined' && window.DEBUG_SIM) {
            console.log('[SIM]', ...args);
        }
    }

    createTank(id, range) {
        const x = this.rng.nextInt(range[0], range[1]);
        const y = this.terrain.getHeightAtX(x);
        return new Tank(id, x * FP, (y + 6) * FP);
    }

    start() {
        this.rules.startMatch(this.rng);
    }

    step(inputs = {}) {
        this.events = [];
        this.tickCount++;

        switch (this.rules.state) {
            case GameState.TURN_AIM:
                this.rules.turnTimer--;
                if (this.rules.turnTimer <= 0 && this.autoFireEnabled) {
                    this.log(`Timer expired. Auto-firing. turnTimer=${this.rules.turnTimer}`);
                    const t = this.tanks[this.rules.activePlayerIndex];
                    this.fire(t.aimAngle, t.aimPower, this.rules.activePlayerIndex);
                    break;
                }
                const activeTank = this.tanks[this.rules.activePlayerIndex];
                if (inputs.left) {
                    activeTank.aimAngle = (activeTank.aimAngle + 1) | 0;
                    this.log(`Input LEFT -> aimAngle=${activeTank.aimAngle}`);
                }
                if (inputs.right) {
                    activeTank.aimAngle = (activeTank.aimAngle - 1) | 0;
                    this.log(`Input RIGHT -> aimAngle=${activeTank.aimAngle}`);
                }
                if (inputs.up) {
                    activeTank.aimPower = (activeTank.aimPower + 1) | 0;
                    this.log(`Input UP -> aimPower=${activeTank.aimPower}`);
                }
                if (inputs.down) {
                    activeTank.aimPower = (activeTank.aimPower - 1) | 0;
                    this.log(`Input DOWN -> aimPower=${activeTank.aimPower}`);
                }
                
                if (activeTank.aimAngle < 0) activeTank.aimAngle = 0;
                if (activeTank.aimAngle > 180) activeTank.aimAngle = 180;
                if (activeTank.aimPower < 0) activeTank.aimPower = 0;
                if (activeTank.aimPower > 100) activeTank.aimPower = 100;
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

    fire(angle, power, playerIndex) {
        this.log(`fire() called: angle=${angle}, power=${power}, playerIndex=${playerIndex}`);
        if (this.rules.state !== GameState.TURN_AIM) {
            this.log(`fire() ignored: state is ${this.rules.state}`);
            return;
        }
        if (playerIndex !== undefined && playerIndex !== this.rules.activePlayerIndex) return;

        const activeTank = this.tanks[this.rules.activePlayerIndex];
        activeTank.aimAngle = angle | 0;
        activeTank.aimPower = power | 0;

        const totalAngle = (activeTank.baseAngleDeg + activeTank.aimAngle) | 0;
        const spawnX = activeTank.x_fp + Math.floor(20 * getCos(totalAngle));
        const spawnY = activeTank.y_fp + Math.floor(20 * getSin(totalAngle));

        this.projectile = new Projectile(spawnX, spawnY, totalAngle, activeTank.aimPower, this.rules.wind, activeTank.id);
        this.rules.state = GameState.PROJECTILE_FLIGHT;
    }

    checkWinConditions() {
        const aliveTanks = this.tanks.filter(t => t.alive);
        if (aliveTanks.length === 0) {
            this.rules.state = GameState.GAME_OVER;
            this.rules.winner = -1;
        } else if (aliveTanks.length === 1) {
            this.rules.state = GameState.GAME_OVER;
            this.rules.winner = aliveTanks[0].id;
        }
    }

    getStateHash() {
        let h = 0;
        const hashInt = (val) => { h = (Math.imul(h, 31) + (val | 0)) | 0; };
        for (let i = 0; i < this.terrain.heights.length; i++) hashInt(this.terrain.heights[i]);
        for (const t of this.tanks) {
            hashInt(t.x_fp); hashInt(t.y_fp); hashInt(t.health);
            hashInt(t.baseAngleDeg); hashInt(t.aimAngle); hashInt(t.aimPower);
            hashInt(t.alive ? 1 : 0);
        }
        if (this.projectile) {
            hashInt(1); hashInt(this.projectile.x_fp); hashInt(this.projectile.y_fp);
        } else {
            hashInt(0);
        }
        hashInt(this.rules.wind); hashInt(this.rules.turnNumber);
        hashInt(this.rules.activePlayerIndex); hashInt(this.rules.state === GameState.GAME_OVER ? 1 : 0);
        hashInt(this.rules.winner !== null ? this.rules.winner : -3);
        hashInt(this.rng.state);
        return h;
    }

    getState() {
        return {
            terrain: Array.from(this.terrain.heights),
            tanks: this.tanks.map(t => ({
                id: t.id, x_fp: t.x_fp, y_fp: t.y_fp, vx_fp: t.vx_fp, vy_fp: t.vy_fp,
                health: t.health, alive: t.alive, baseAngleDeg: t.baseAngleDeg,
                aimAngle: t.aimAngle, aimPower: t.aimPower
            })),
            rules: {
                turnNumber: this.rules.turnNumber, activePlayerIndex: this.rules.activePlayerIndex,
                state: this.rules.state, turnTimer: this.rules.turnTimer,
                wind: this.rules.wind, winner: this.rules.winner,
                stabilizationTimer: this.rules.stabilizationTimer
            },
            rngState: this.rng.state,
            tickCount: this.tickCount
        };
    }

    setState(state) {
        for (let i = 0; i < state.terrain.length; i++) this.terrain.heights[i] = state.terrain[i];
        for (let i = 0; i < state.tanks.length; i++) {
            const s = state.tanks[i]; const t = this.tanks[i];
            t.x_fp = s.x_fp; t.y_fp = s.y_fp; t.vx_fp = s.vx_fp; t.vy_fp = s.vy_fp;
            t.health = s.health; t.alive = s.alive; t.baseAngleDeg = s.baseAngleDeg;
            t.aimAngle = s.aimAngle; t.aimPower = s.aimPower;
        }
        this.rules.turnNumber = state.rules.turnNumber;
        this.rules.activePlayerIndex = state.rules.activePlayerIndex;
        this.rules.state = state.rules.state;
        this.rules.turnTimer = state.rules.turnTimer;
        this.rules.wind = state.rules.wind;
        this.rules.winner = state.rules.winner;
        this.rules.stabilizationTimer = state.rules.stabilizationTimer;
        this.rng.state = state.rngState;
        this.tickCount = state.tickCount;
    }
}
