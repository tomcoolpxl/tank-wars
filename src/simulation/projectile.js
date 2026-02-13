import { FP, GRAVITY, PROJECTILE_LIFETIME_TICKS } from './constants.js';
import { getSin, getCos } from './trigLUT.js';
import { mulFP } from './fixed.js';

export class Projectile {
    constructor(x_fp, y_fp, angleDeg, power, wind) {
        this.x_fp = x_fp;
        this.y_fp = y_fp;
        
        // v0 = power * 4 units/s
        const v0 = power * 4;
        const v0_fp = v0 * FP;
        
        // vx0 = v0 * cos(angle)
        // vy0 = v0 * sin(angle)
        // Since getSin/getCos return values scaled by FP, we need to div by FP or use mulFP.
        this.vx_fp = Math.floor((v0_fp * getCos(angleDeg)) / FP / 60);
        this.vy_fp = Math.floor((v0_fp * getSin(angleDeg)) / FP / 60);
        
        this.ticksAlive = 0;
        this.active = true;
        
        this.g_per_tick_fp = Math.floor((GRAVITY * FP) / (60 * 60));
        
        // ax_wind = wind * 0.5 units/s^2
        this.ax_wind_tick_fp = Math.floor((wind * 0.5 * FP) / (60 * 60));
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
            this.active = false;
            return { type: 'out-of-bounds' };
        }

        // 2. Terrain collision
        if (y <= terrain.getHeightAtX(x)) {
            this.active = false;
            return { type: 'explosion', x, y };
        }

        // 3. Tank collision (AABB)
        for (const tank of tanks) {
            if (!tank.alive) continue;
            const tx = Math.floor(tank.x_fp / FP);
            const ty = Math.floor(tank.y_fp / FP);
            
            const halfW = 12; // TANK_WIDTH / 2
            const halfH = 6;  // TANK_HEIGHT / 2
            
            if (x >= tx - halfW && x <= tx + halfW && y >= ty - halfH && y <= ty + halfH) {
                this.active = false;
                return { type: 'explosion', x, y };
            }
        }

        // 4. Lifetime cap
        if (this.ticksAlive >= PROJECTILE_LIFETIME_TICKS) {
            this.active = false;
            return { type: 'timeout' };
        }

        return null;
    }
}
