import { FP, TANK_WIDTH, TANK_HEIGHT, HEIGHT } from '../simulation/constants.js';

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
            
            // Draw half-circle platform (base)
            main.lineStyle(2, drawColor, 1.0);
            main.beginPath();
            // Arc: x, y, radius, startAngle, endAngle, anticlockwise
            // Half circle facing up: from PI to 0 (or vice versa depending on Phaser's coordinate system)
            // Actually, Phaser arc is center x, y.
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
                
                glowOuter.lineStyle(12, drawColor, 0.1);
                glowOuter.arc(0, 0, TANK_WIDTH / 2, Math.PI, 0, false);
                glowOuter.strokePath();

                // Draw gun barrel
                // aimAngle is relative to the flat line of the half circle.
                // 0 is right, 90 is up, 180 is left.
                // In our half circle, the flat line is at y=0.
                // So we want to rotate by -aimAngle (Phaser is clockwise).
                const angleRad = -tank.aimAngle * Math.PI / 180;
                main.lineStyle(4, drawColor, 1.0);
                main.lineBetween(0, 0, Math.cos(angleRad) * 20, Math.sin(angleRad) * 20);
            }
            
            // Position
            const x = tank.x_fp / FP;
            const y = HEIGHT - (tank.y_fp / FP);
            
            container.x = x;
            container.y = y;
            
            // Rotation from simulation (Invert for screen space)
            container.angle = -tank.baseAngleDeg;
            
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
