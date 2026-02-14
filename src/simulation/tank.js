import { 
    FP, TANK_WIDTH, TANK_HEIGHT, GRAVITY_PER_TICK_FP, 
    MAX_HEALTH, TANK_START_AIM_ANGLE, TANK_START_AIM_POWER,
    TANK_SLOPE_SAMPLE_DIST, TANK_GROUND_EPSILON, TANK_STABILITY_THRESHOLD,
    WIDTH
} from './constants.js';
import { mulFP, divFP, clamp } from './fixed.js';
import { getSin, getAtan2 } from './trigLUT.js';
import { isqrt } from './isqrt.js';

export class Tank {
    constructor(id, x_fp, y_fp) {
        this.id = id;
        this.x_fp = x_fp;
        this.y_fp = y_fp;
        this.vx_fp = 0;
        this.vy_fp = 0;
        this.health = MAX_HEALTH;
        this.alive = true;
        this.baseAngleDeg = 0; // Deterministic rotation in degrees
        this.stable = false;
        
        // Aiming state (Phase 3)
        // Now relative to the base (0 is flat right, 90 is up, 180 is flat left)
        this.aimAngle = TANK_START_AIM_ANGLE; // integer degrees, relative to platform
        this.aimPower = TANK_START_AIM_POWER; // integer 0..100
    }

    log(...args) {
        if (typeof window !== 'undefined' && window.DEBUG_TANK) {
            console.log(`[TANK ${this.id}]`, ...args);
        }
    }

    step(terrain) {
        if (!this.alive) return;

        const x = Math.floor(this.x_fp / FP);
        const y = Math.floor(this.y_fp / FP);
        const groundY = terrain.getHeightAtX(x);
        const tankBottomY = y - (TANK_HEIGHT / 2);

        // 4.6 Health and loss: Tank bottom y < 0 (safety condition)
        if (tankBottomY < 0) {
            this.health = 0;
            this.alive = false;
            return;
        }

        // 4.5 Terrain contact and tolerance
        const epsilon = TANK_GROUND_EPSILON;
        
        // Calculate slope for rotation
        const hL = terrain.getHeightAtX(x - TANK_SLOPE_SAMPLE_DIST);
        const hR = terrain.getHeightAtX(x + TANK_SLOPE_SAMPLE_DIST);
        // Use deterministic getAtan2
        this.baseAngleDeg = getAtan2(hR - hL, TANK_SLOPE_SAMPLE_DIST * 2);

        if (tankBottomY <= groundY + epsilon && tankBottomY >= groundY - epsilon) {
            // On ground
            this.y_fp = (groundY + (TANK_HEIGHT / 2)) * FP;
            this.vy_fp = 0;
            this.vx_fp = 0; // No horizontal movement
        } else if (tankBottomY > groundY) {
            // In air
            this.vy_fp -= GRAVITY_PER_TICK_FP;
            this.vx_fp = 0; // Fall straight down
            this.stable = false;
        } else {
            // Below ground (after terrain removal)
            this.y_fp = (groundY + (TANK_HEIGHT / 2)) * FP;
            this.vy_fp = 0;
            this.vx_fp = 0;
            this.stable = false;
        }

        this.x_fp += this.vx_fp;
        this.y_fp += this.vy_fp;
        
        // Bounds check
        const finalX = Math.floor(this.x_fp / FP);
        const finalY = Math.floor(this.y_fp / FP);
        if (finalX < 0 || finalX >= WIDTH || finalY < 0) {
            this.health = 0;
            this.alive = false;
        }
        
        if (this.health <= 0) {
            this.alive = false;
        }
        
        // Update stability
        // Thresholds adjusted for higher FP (1000 FP units = 0.001 pixels/tick)
        if (Math.abs(this.vx_fp) < TANK_STABILITY_THRESHOLD && Math.abs(this.vy_fp) < TANK_STABILITY_THRESHOLD) {
            this.stable = true;
        } else {
            this.stable = false;
        }
    }
}
