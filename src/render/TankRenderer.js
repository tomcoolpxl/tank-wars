import { FP, TANK_WIDTH, TANK_HEIGHT } from '../simulation/constants.js';

export class TankRenderer {
    constructor(scene) {
        this.scene = scene;
        this.tankContainers = new Map(); // Map tank ID to Container object
    }

    render(tanks, terrain) {
        tanks.forEach(tank => {
            let container = this.tankContainers.get(tank.id);
            if (!container) {
                container = this.scene.add.container(0, 0);
                
                const glowOuter = this.scene.add.graphics();
                const glowInner = this.scene.add.graphics();
                const main = this.scene.add.graphics();
                const healthBar = this.scene.add.graphics();
                
                container.add([glowOuter, glowInner, main, healthBar]);
                container.setDepth(10);
                this.tankContainers.set(tank.id, container);
                
                container.glowOuter = glowOuter;
                container.glowInner = glowInner;
                container.main = main;
                container.healthBar = healthBar;
            }
            
            const { glowOuter, glowInner, main, healthBar } = container;
            
            main.clear();
            glowInner.clear();
            glowOuter.clear();
            healthBar.clear();

            const color = tank.id === 0 ? 0x00ffff : 0xff00ff;
            const drawColor = tank.alive ? color : 0x555555;
            
            // Draw function to reuse
            const drawBody = (gfx, width, alpha) => {
                gfx.lineStyle(width, drawColor, alpha);
                gfx.strokeRect(-TANK_WIDTH/2, -TANK_HEIGHT/2, TANK_WIDTH, TANK_HEIGHT);
            };

            drawBody(main, 2, 1.0);
            if (tank.alive) {
                drawBody(glowInner, 6, 0.3);
                drawBody(glowOuter, 12, 0.1);
            }
            
            // Position
            const x = tank.x_fp / FP;
            const y = tank.y_fp / FP;
            
            container.x = x;
            container.y = y;
            
            // Rotation based on terrain slope
            if (terrain && tank.alive) {
                const ix = Math.floor(x);
                const hL = terrain.getHeightAtX(ix - 5);
                const hR = terrain.getHeightAtX(ix + 5);
                container.rotation = Math.atan2(hR - hL, 10);
            } else {
                container.rotation = 0;
            }
            
            // Health bar
            if (tank.alive) {
                healthBar.fillStyle(0x00ff00, 0.8);
                const hpPct = tank.health / 100;
                healthBar.fillRect(-15, -20, 30 * hpPct, 4);
                
                // Health bar glow
                healthBar.lineStyle(1, 0x00ff00, 0.3);
                healthBar.strokeRect(-16, -21, 32, 6);
            }
        });
    }

    update(time) {
        this.tankContainers.forEach(container => {
            const flicker = 0.9 + Math.random() * 0.1;
            container.main.alpha = flicker;
            container.glowInner.alpha = flicker * 0.6;
            container.glowOuter.alpha = flicker * 0.3;
        });
    }
}
