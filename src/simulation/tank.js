import { FP, TANK_WIDTH, TANK_HEIGHT, GRAVITY_FP, FRICTION_KINETIC_FP, FRICTION_STATIC_THRESHOLD } from './constants.js';
import { mulFP, divFP, clamp } from './fixed.js';
import { getSin } from './trigLUT.js';
import { isqrt } from './isqrt.js';

export class Tank {
    constructor(id, x_fp, y_fp) {
        this.id = id;
        this.x_fp = x_fp;
        this.y_fp = y_fp;
        this.vx_fp = 0;
        this.vy_fp = 0;
        this.health = 100;
        this.alive = true;
        this.baseAngleDeg = 0; // Deterministic rotation in degrees
        this.stable = false;
        
        // Aiming state (Phase 3)
        // Now relative to the base (0 is flat right, 90 is up, 180 is flat left)
        this.aimAngle = 90; // integer degrees, relative to platform
        this.aimPower = 50; // integer 0..100
        
        // Per-tick gravity in fixed-point
        // g = 9.8 units/s^2. Ticks = 60/s. 
        // g_per_tick = 9.8 / (60 * 60) units/tick^2.
        // g_per_tick_fp = (GRAVITY_FP) / (60 * 60)
        this.g_per_tick_fp = Math.floor(GRAVITY_FP / 3600);
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
        const epsilon = 1; // 1 pixel
        
        // Calculate slope for rotation
        const hL = terrain.getHeightAtX(x - 4);
        const hR = terrain.getHeightAtX(x + 4);
        // angle = atan2(dy, dx)
        this.baseAngleDeg = Math.floor(Math.atan2(hR - hL, 8) * 180 / Math.PI);

        if (tankBottomY <= groundY + epsilon && tankBottomY >= groundY - epsilon) {
            // On ground
            this.y_fp = (groundY + (TANK_HEIGHT / 2)) * FP;
            this.vy_fp = 0;
            this.vx_fp = 0; // No horizontal movement
        } else if (tankBottomY > groundY) {
            // In air
            this.vy_fp -= this.g_per_tick_fp;
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
        if (finalX < 0 || finalX >= 800 || finalY < 0) {
            this.health = 0;
            this.alive = false;
        }
        
        if (this.health <= 0) {
            this.alive = false;
        }
        
        // Update stability
        // Thresholds adjusted for higher FP (1000 FP units = 0.001 pixels/tick)
        if (Math.abs(this.vx_fp) < 1000 && Math.abs(this.vy_fp) < 1000) {
            this.stable = true;
        } else {
            this.stable = false;
        }
    }
}
