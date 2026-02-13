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
        this.angle_deg = 0; // Visual rotation
        this.stable = false;
        
        // Aiming state (Phase 3)
        this.aimAngle = 45; // integer degrees
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
        
        if (tankBottomY <= groundY + epsilon && tankBottomY >= groundY - epsilon) {
            // On ground
            this.y_fp = (groundY + (TANK_HEIGHT / 2)) * FP;
            this.vy_fp = 0;
            
            // Check for sliding
            this.applySliding(terrain, x);
        } else if (tankBottomY > groundY) {
            // In air
            this.vy_fp -= this.g_per_tick_fp;
            this.stable = false;
        } else {
            // Below ground (after terrain removal)
            this.y_fp = (groundY + (TANK_HEIGHT / 2)) * FP;
            this.vy_fp = 0;
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

    applySliding(terrain, x) {
        // 4.3 Slope alignment & 4.4 Movement: sliding
        // Index difference of 2 samples = 4 pixels
        const hL = terrain.getHeightAtX(x - 2);
        const hR = terrain.getHeightAtX(x + 2);
        const dh = hR - hL;
        const dx = 4;
        
        const dh_abs = Math.abs(dh);
        
        // Threshold: |dh/dx| > tan(FRICTION_STATIC_THRESHOLD)
        // tan(30) = 0.577. 0.577 * 4 = 2.308. So |dh| > 2 is approx 30 deg.
        if (dh_abs > 2) {
            // Slide!
            const dist_sq_fp = (dx * dx + dh_abs * dh_abs) * FP * FP;
            const dist_fp = isqrt(dist_sq_fp);
            
            const sin_fp = Math.floor((dh_abs * FP * FP) / dist_fp);
            
            // Requirement 4.4: a_eff = a_down * (1 - mu_k)
            // a_down = g * sin(theta)
            const a_down_fp = mulFP(GRAVITY_FP, sin_fp);
            const one_minus_mu_k_fp = FP - FRICTION_KINETIC_FP;
            let accel_fp = mulFP(a_down_fp, one_minus_mu_k_fp);
            
            // Convert from units/s^2 to units/tick^2
            accel_fp = Math.floor(accel_fp / 3600);
            
            const slideDir = dh > 0 ? -1 : 1;
            this.vx_fp += slideDir * accel_fp;
        } else {
            // Friction deceleration on flat ground
            // a = mu_k * g
            const friction_decel_fp = Math.floor(mulFP(FRICTION_KINETIC_FP, GRAVITY_FP) / 3600);
            if (this.vx_fp > 0) {
                this.vx_fp = Math.max(0, this.vx_fp - friction_decel_fp);
            } else if (this.vx_fp < 0) {
                this.vx_fp = Math.min(0, this.vx_fp + friction_decel_fp);
            }
        }
    }
}
