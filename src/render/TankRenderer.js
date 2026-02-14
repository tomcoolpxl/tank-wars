import { FP, TANK_WIDTH, TANK_HEIGHT, VIEWPORT_HEIGHT } from '../simulation/constants.js';

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
                const glowMid = this.scene.add.graphics();
                const glowInner = this.scene.add.graphics();
                const main = this.scene.add.graphics();
                const healthBar = this.scene.add.graphics();
                
                container.add([glowOuter, glowMid, glowInner, main, healthBar]);
                container.setDepth(10);
                this.tankContainers.set(tank.id, container);
                
                container.glowOuter = glowOuter;
                container.glowMid = glowMid;
                container.glowInner = glowInner;
                container.main = main;
                container.healthBar = healthBar;
            }
            
            const { glowOuter, glowMid, glowInner, main, healthBar } = container;
            
            main.clear();
            glowInner.clear();
            glowMid.clear();
            glowOuter.clear();
            healthBar.clear();

            const color = tank.id === 0 ? 0x00ffff : 0xff00ff;
            const drawColor = tank.alive ? color : 0x555555;
            
            // Draw half-circle platform (base)
            main.lineStyle(2, drawColor, 1.0);
            main.beginPath();
            main.arc(0, 0, TANK_WIDTH / 2, Math.PI, 0, false);
            main.lineTo(TANK_WIDTH / 2, 0);
            main.lineTo(-TANK_WIDTH / 2, 0);
            main.closePath();
            main.strokePath();

            if (tank.alive) {
                // Glow for base
                glowInner.lineStyle(6, drawColor, 0.3);
                glowInner.arc(0, 0, TANK_WIDTH / 2, Math.PI, 0, false);
                glowInner.strokePath();

                glowMid.lineStyle(12, drawColor, 0.15);
                glowMid.arc(0, 0, TANK_WIDTH / 2, Math.PI, 0, false);
                glowMid.strokePath();
                
                glowOuter.lineStyle(24, drawColor, 0.05);
                glowOuter.arc(0, 0, TANK_WIDTH / 2, Math.PI, 0, false);
                glowOuter.strokePath();

                // Draw gun barrel
                const angleRad = -tank.aimAngle * Math.PI / 180;
                main.lineStyle(4, drawColor, 1.0);
                main.lineBetween(0, 0, Math.cos(angleRad) * 20, Math.sin(angleRad) * 20);
                
                glowInner.lineStyle(8, drawColor, 0.3);
                glowInner.lineBetween(0, 0, Math.cos(angleRad) * 20, Math.sin(angleRad) * 20);
            }
            
            // Position
            const x = tank.x_fp / FP;
            const y = VIEWPORT_HEIGHT - (tank.y_fp / FP);
            
            container.x = x;
            container.y = y;
            
            // Rotation from simulation (Invert for screen space)
            container.angle = -tank.baseAngleDeg;
        });
    }

    update(time) {
        const pulse = 0.95 + Math.sin(time / 400) * 0.05;
        this.tankContainers.forEach(container => {
            container.main.alpha = pulse;
            container.glowInner.alpha = pulse * 0.6;
            if (container.glowMid) container.glowMid.alpha = pulse * 0.3;
            container.glowOuter.alpha = pulse * 0.15;
        });
    }
}
