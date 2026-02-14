import { FP, HEIGHT } from '../simulation/constants.js';

export class ProjectileRenderer {
    constructor(scene) {
        this.scene = scene;
        this.glowOuter = this.scene.add.graphics();
        this.glowInner = this.scene.add.graphics();
        this.main = this.scene.add.graphics();
        this.trail = this.scene.add.graphics();
        
        this.glowOuter.setDepth(19);
        this.glowInner.setDepth(20);
        this.main.setDepth(21);
        this.trail.setDepth(18);
        
        this.trailPoints = [];
        this.maxTrailPoints = 20;
    }

    render(projectile) {
        this.main.clear();
        this.glowInner.clear();
        this.glowOuter.clear();
        
        if (!projectile) {
            this.trail.clear();
            this.trailPoints = [];
            return;
        }
        
        const x = projectile.x_fp / FP;
        const y = HEIGHT - (projectile.y_fp / FP);
        
        // Add to trail
        this.trailPoints.push({ x, y });
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }
        
        // Draw trail
        this.trail.clear();
        if (this.trailPoints.length > 1) {
            this.trail.lineStyle(2, 0xffffff, 0.3);
            this.trail.beginPath();
            this.trail.moveTo(this.trailPoints[0].x, this.trailPoints[0].y);
            for (let i = 1; i < this.trailPoints.length; i++) {
                this.trail.lineTo(this.trailPoints[i].x, this.trailPoints[i].y);
            }
            this.trail.strokePath();
        }
        
        const color = 0xffffff;
        
        this.main.fillStyle(color, 1.0);
        this.main.fillCircle(x, y, 3);
        
        this.glowInner.fillStyle(color, 0.4);
        this.glowInner.fillCircle(x, y, 6);
        
        this.glowOuter.fillStyle(color, 0.15);
        this.glowOuter.fillCircle(x, y, 12);
    }

    update(time) {
        const pulse = 0.9 + Math.sin(time / 200) * 0.1;
        this.main.alpha = pulse;
        this.glowInner.alpha = pulse * 0.6;
        this.glowOuter.alpha = pulse * 0.3;
    }
}
