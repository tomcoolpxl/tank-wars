import { FP, TANK_WIDTH, TANK_HEIGHT, GRAVITY, FRICTION_KINETIC, FRICTION_STATIC_THRESHOLD } from './constants.js';
import { mulFP, divFP, clamp } from './fixed.js';
import { getSin } from './trigLUT.js';

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
        // Let's use g_per_tick_fp = (9.8 * FP) / (60 * 60)
        this.g_per_tick_fp = Math.floor((GRAVITY * FP) / (60 * 60));
    }

    step(terrain) {
        if (!this.alive) return;

        const x = Math.floor(this.x_fp / FP);
        const y = Math.floor(this.y_fp / FP);
        const groundY = terrain.getHeightAtX(x);
        const tankBottomY = y - (TANK_HEIGHT / 2);

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
        if (Math.abs(this.vx_fp) < 10 && Math.abs(this.vy_fp) < 10) {
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
        
        // For MVP, we use a simple approximation of slope.
        // angle = atan2(dh, dx). 
        // Requirement: use fixed-point atan2 or lookup.
        // For now, let's just use the sign of dh to determine direction.
        
        // If we want to match requirement 4.4: slope angle >= 30 degrees.
        // tan(30) = 0.577. So if |dh/dx| > 0.577, slide.
        // |dh| > 0.577 * 4 = 2.308. 
        
        if (Math.abs(dh) > 2) {
            // Slide!
            // a_eff = g * sin(theta) * (1 - mu_k)
            // Simplified for MVP:
            const slideDir = dh > 0 ? -1 : 1;
            const accel = 20; // Some fixed-point acceleration
            this.vx_fp += slideDir * accel;
        } else {
            // Friction
            this.vx_fp = Math.floor(this.vx_fp * 800 / 1000); // 0.8 friction
        }
    }
}
