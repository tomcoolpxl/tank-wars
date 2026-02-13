import { FP, TANK_WIDTH, TANK_HEIGHT } from '../simulation/constants.js';

export class TankRenderer {
    constructor(scene) {
        this.scene = scene;
        this.tankGraphics = new Map(); // Map tank ID to Graphics object
    }

    render(tanks, terrain) {
        // Clean up tanks that might have disappeared (though mostly fixed number of tanks)
        // For simplicity, just update existing or create new.
        
        tanks.forEach(tank => {
            let gfx = this.tankGraphics.get(tank.id);
            if (!gfx) {
                gfx = this.scene.add.graphics();
                gfx.setDepth(10);
                this.tankGraphics.set(tank.id, gfx);
            }
            
            gfx.clear();
            if (!tank.alive) {
                gfx.lineStyle(2, 0x555555);
                gfx.fillStyle(0x222222);
            } else {
                // Color based on ID or stable color
                const color = tank.id === 0 ? 0x00ffff : 0xff00ff;
                gfx.lineStyle(2, color);
                gfx.fillStyle(0x000000);
            }
            
            // Draw centered at 0,0 then transform
            gfx.beginPath();
            gfx.rect(-TANK_WIDTH/2, -TANK_HEIGHT/2, TANK_WIDTH, TANK_HEIGHT);
            gfx.strokePath();
            gfx.fillPath();
            
            // Position
            const x = tank.x_fp / FP;
            const y = tank.y_fp / FP;
            
            gfx.x = x;
            gfx.y = y;
            
            // Rotation based on terrain slope
            if (terrain && tank.alive) {
                const ix = Math.floor(x);
                // Sample a bit wider for visual stability
                const hL = terrain.getHeightAtX(ix - 5);
                const hR = terrain.getHeightAtX(ix + 5);
                gfx.rotation = Math.atan2(hR - hL, 10);
            } else {
                gfx.rotation = 0;
            }
            
            // Health bar (simple)
            if (tank.alive) {
                gfx.fillStyle(0x00ff00);
                const hpPct = tank.health / 100; // Assuming 100 max
                gfx.fillRect(-15, -20, 30 * hpPct, 4);
            }
        });
    }
}
