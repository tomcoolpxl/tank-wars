import { FP, EXPLOSION_DAMAGE_RADIUS, EXPLOSION_DEFORM_RADIUS, MAX_HEALTH } from './constants.js';

export function applyExplosion(ex, ey, terrain, tanks) {
    // 1. Terrain deformation
    terrain.deformCrater(ex, ey, EXPLOSION_DEFORM_RADIUS);
    
    // 2. Damage to tanks
    const R = EXPLOSION_DAMAGE_RADIUS;
    const R2 = R * R;
    
    for (const tank of tanks) {
        if (!tank.alive) continue;
        
        const tx = Math.floor(tank.x_fp / FP);
        const ty = Math.floor(tank.y_fp / FP);
        
        const dx = tx - ex;
        const dy = ty - ey;
        const d2 = dx * dx + dy * dy;
        
        if (d2 < R2) {
            // Quadratic falloff: damage = floor(MAX_HEALTH * (1 - (d^2 / R^2)))
            // damage = floor(MAX_HEALTH * (R2 - d2) / R2)
            const damage = Math.floor((MAX_HEALTH * (R2 - d2)) / R2);
            tank.health = Math.max(0, tank.health - damage);
            if (tank.health <= 0) {
                tank.alive = false;
            }
        }
    }
}
