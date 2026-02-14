import { FP, VIEWPORT_HEIGHT } from '../simulation/constants.js';
import { RENDER_DEPTHS, COLORS, TRAIL_CONFIG, PROJECTILE_VISUALS } from './constants.js';

export class ProjectileRenderer {
    constructor(scene) {
        this.scene = scene;
        this.glowOuter = this.scene.add.graphics();
        this.glowMid = this.scene.add.graphics();
        this.glowInner = this.scene.add.graphics();
        this.main = this.scene.add.graphics();
        this.trail = this.scene.add.graphics();
        
        this.glowOuter.setDepth(RENDER_DEPTHS.GLOW_OUTER);
        this.glowMid.setDepth(RENDER_DEPTHS.GLOW_MID);
        this.glowInner.setDepth(RENDER_DEPTHS.GLOW_INNER);
        this.main.setDepth(RENDER_DEPTHS.PROJECTILE);
        this.trail.setDepth(RENDER_DEPTHS.TRAIL);
        
        this.trailPoints = [];
        this.maxTrailPoints = TRAIL_CONFIG.MAX_POINTS;
    }

    render(projectile) {
        this.main.clear();
        this.glowInner.clear();
        this.glowMid.clear();
        this.glowOuter.clear();
        
        if (!projectile) {
            this.trail.clear();
            this.trailPoints = [];
            return;
        }
        
        const x = projectile.x_fp / FP;
        const y = VIEWPORT_HEIGHT - (projectile.y_fp / FP);
        
        // Add to trail
        this.trailPoints.push({ x, y });
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }
        
        // Draw trail
        this.trail.clear();
        if (this.trailPoints.length > 1) {
            this.trail.lineStyle(TRAIL_CONFIG.LINE_WIDTH, COLORS.TRAIL, TRAIL_CONFIG.ALPHA);
            this.trail.beginPath();
            this.trail.moveTo(this.trailPoints[0].x, this.trailPoints[0].y);
            for (let i = 1; i < this.trailPoints.length; i++) {
                this.trail.lineTo(this.trailPoints[i].x, this.trailPoints[i].y);
            }
            this.trail.strokePath();
        }
        
        const color = COLORS.PROJECTILE;
        
        this.main.fillStyle(color, 1.0);
        this.main.fillCircle(x, y, PROJECTILE_VISUALS.MAIN_RADIUS);
        
        this.glowInner.fillStyle(color, PROJECTILE_VISUALS.GLOW_INNER_ALPHA);
        this.glowInner.fillCircle(x, y, PROJECTILE_VISUALS.GLOW_INNER_RADIUS);

        this.glowMid.fillStyle(color, PROJECTILE_VISUALS.GLOW_MID_ALPHA);
        this.glowMid.fillCircle(x, y, PROJECTILE_VISUALS.GLOW_MID_RADIUS);
        
        this.glowOuter.fillStyle(color, PROJECTILE_VISUALS.GLOW_OUTER_ALPHA);
        this.glowOuter.fillCircle(x, y, PROJECTILE_VISUALS.GLOW_OUTER_RADIUS);
    }

    update(time) {
        const pulse = PROJECTILE_VISUALS.PULSE_BASE + Math.sin(time / PROJECTILE_VISUALS.PULSE_SPEED_DIVISOR) * PROJECTILE_VISUALS.PULSE_AMPLITUDE;
        this.main.alpha = pulse;
        this.glowInner.alpha = pulse * PROJECTILE_VISUALS.PULSE_ALPHA_INNER;
        this.glowMid.alpha = pulse * PROJECTILE_VISUALS.PULSE_ALPHA_MID;
        this.glowOuter.alpha = pulse * PROJECTILE_VISUALS.PULSE_ALPHA_OUTER;
    }
}
