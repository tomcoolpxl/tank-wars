import { FP, GRAVITY_FP, PROJECTILE_LIFETIME_TICKS, WIND_ACCEL_FP, PROJECTILE_POWER_TO_VEL } from './constants.js';
import { getSin, getCos } from './trigLUT.js';
import { mulFP } from './fixed.js';

export class Projectile {
    constructor(x_fp, y_fp, angleDeg, power, wind, shooterId = -1) {
        this.x_fp = x_fp;
        this.y_fp = y_fp;
        this.shooterId = shooterId;
        
        // v0 = power * multiplier units/s
        const v0 = power * PROJECTILE_POWER_TO_VEL;
        const v0_fp = v0 * FP;
        
        // vx0 = v0 * cos(angle)
        // vy0 = v0 * sin(angle)
        this.vx_fp = Math.floor((v0_fp * getCos(angleDeg)) / FP / 60);
        this.vy_fp = Math.floor((v0_fp * getSin(angleDeg)) / FP / 60);

        // Ensure velocity > 0 if power > 0
        if (power > 0) {
            if (Math.abs(this.vx_fp) < 1 && getCos(angleDeg) !== 0) {
                this.vx_fp = getCos(angleDeg) > 0 ? 1 : -1;
            }
            if (Math.abs(this.vy_fp) < 1 && getSin(angleDeg) !== 0) {
                this.vy_fp = getSin(angleDeg) > 0 ? 1 : -1;
            }
        }
        
        this.ticksAlive = 0;
        this.active = true;
        
        this.g_per_tick_fp = Math.floor(GRAVITY_FP / 3600);
        
        // Use the WIND_ACCEL_FP constant (acceleration units per unit of wind)
        // ax_wind_tick_fp = (wind * WIND_ACCEL_FP) / (60 * 60)
        this.ax_wind_tick_fp = Math.floor((wind * WIND_ACCEL_FP) / 3600);
    }

    log(...args) {
        if (typeof window !== 'undefined' && window.DEBUG_PROJ) {
            console.log('[PROJ]', ...args);
        }
    }

    step(terrain, tanks) {
        if (!this.active) return null;

        this.vx_fp += this.ax_wind_tick_fp;
        this.vy_fp -= this.g_per_tick_fp;
        
        this.x_fp += this.vx_fp;
        this.y_fp += this.vy_fp;
        this.ticksAlive++;

        const x = Math.floor(this.x_fp / FP);
        const y = Math.floor(this.y_fp / FP);

        // 1. Bounds check
        if (x < 0 || x >= 800 || y < 0 || y >= 600) {
            this.log(`Out of bounds: x=${x}, y=${y}`);
            this.active = false;
            return { type: 'out-of-bounds' };
        }

        // 2. Terrain collision
        const groundY = terrain.getHeightAtX(x);
        if (y <= groundY) {
            this.log(`Terrain collision: x=${x}, y=${y}, groundY=${groundY}`);
            this.active = false;
            return { type: 'explosion', x, y };
        }

        // 3. Tank collision (AABB)
        for (const tank of tanks) {
            if (!tank.alive) continue;
            
            // Ignore shooter for the first few ticks to avoid self-collision at launch
            if (tank.id === this.shooterId) {
                if (this.ticksAlive < 20) continue;
            }

            const tx = Math.floor(tank.x_fp / FP);
            const ty = Math.floor(tank.y_fp / FP);
            
            // Dome collision: bounding box for now, could be distance-based
            // Width: 24 (tx-12 to tx+12), Height: 12 (ty to ty+12)
            if (x >= tx - 12 && x <= tx + 12 && y >= ty && y <= ty + 12) {
                this.log(`Tank collision: tankId=${tank.id}, x=${x}, y=${y}`);
                this.active = false;
                return { type: 'explosion', x, y };
            }
        }

        // 4. Lifetime cap
        if (this.ticksAlive >= PROJECTILE_LIFETIME_TICKS) {
            this.log(`Lifetime expired: ticks=${this.ticksAlive}`);
            this.active = false;
            return { type: 'timeout' };
        }

        return null;
    }
}
