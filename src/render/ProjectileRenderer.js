import { FP } from '../simulation/constants.js';

export class ProjectileRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(20);
    }

    render(projectile) {
        this.graphics.clear();
        
        if (!projectile) return;
        
        const x = projectile.x_fp / FP;
        const y = projectile.y_fp / FP;
        
        this.graphics.fillStyle(0xffffff);
        this.graphics.fillCircle(x, y, 3);
        
        // Optional: Trail? Phase 7 says "Optional projectile trail".
        // Keep it simple for Phase 2.
    }
}
