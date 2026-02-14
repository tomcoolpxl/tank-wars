import { FP, TANK_WIDTH, TANK_HEIGHT, VIEWPORT_HEIGHT } from '../simulation/constants.js';
import { RENDER_DEPTHS, COLORS, TANK_VISUALS } from './constants.js';

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
                container.setDepth(RENDER_DEPTHS.TANK);
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

            const color = tank.id === 0 ? COLORS.PLAYER_1 : COLORS.PLAYER_2;
            const drawColor = tank.alive ? color : COLORS.DEAD;
            
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
                glowInner.lineStyle(TANK_VISUALS.GLOW_INNER_WIDTH, drawColor, TANK_VISUALS.GLOW_INNER_ALPHA);
                glowInner.arc(0, 0, TANK_WIDTH / 2, Math.PI, 0, false);
                glowInner.strokePath();

                glowMid.lineStyle(TANK_VISUALS.GLOW_MID_WIDTH, drawColor, TANK_VISUALS.GLOW_MID_ALPHA);
                glowMid.arc(0, 0, TANK_WIDTH / 2, Math.PI, 0, false);
                glowMid.strokePath();
                
                glowOuter.lineStyle(TANK_VISUALS.GLOW_OUTER_WIDTH, drawColor, TANK_VISUALS.GLOW_OUTER_ALPHA);
                glowOuter.arc(0, 0, TANK_WIDTH / 2, Math.PI, 0, false);
                glowOuter.strokePath();

                // Draw gun barrel
                const angleRad = -tank.aimAngle * Math.PI / 180;
                main.lineStyle(TANK_VISUALS.BARREL_WIDTH, drawColor, 1.0);
                main.lineBetween(0, 0, Math.cos(angleRad) * TANK_VISUALS.BARREL_LENGTH, Math.sin(angleRad) * TANK_VISUALS.BARREL_LENGTH);
                
                glowInner.lineStyle(TANK_VISUALS.GLOW_BARREL_WIDTH, drawColor, TANK_VISUALS.GLOW_INNER_ALPHA);
                glowInner.lineBetween(0, 0, Math.cos(angleRad) * TANK_VISUALS.BARREL_LENGTH, Math.sin(angleRad) * TANK_VISUALS.BARREL_LENGTH);
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
        const pulse = TANK_VISUALS.PULSE_BASE + Math.sin(time / TANK_VISUALS.PULSE_SPEED_DIVISOR) * TANK_VISUALS.PULSE_AMPLITUDE;
        this.tankContainers.forEach(container => {
            container.main.alpha = pulse;
            container.glowInner.alpha = pulse * TANK_VISUALS.PULSE_INNER_ALPHA_MULT;
            if (container.glowMid) container.glowMid.alpha = pulse * TANK_VISUALS.PULSE_MID_ALPHA_MULT;
            container.glowOuter.alpha = pulse * TANK_VISUALS.PULSE_OUTER_ALPHA_MULT;
        });
    }
}
