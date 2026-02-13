import { TERRAIN_STEP, WIDTH, HEIGHT } from '../simulation/constants.js';

export class TerrainRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        // Move to back so tanks/projectiles are on top
        this.graphics.setDepth(0);
    }

    render(terrain) {
        // Redraw terrain
        this.graphics.clear();
        this.graphics.fillStyle(0x383838);
        this.graphics.lineStyle(2, 0x00ff00);

        this.graphics.beginPath();
        this.graphics.moveTo(0, HEIGHT);
        
        for (let i = 0; i < terrain.heights.length; i++) {
            const x = i * TERRAIN_STEP;
            const y = terrain.heights[i];
            this.graphics.lineTo(x, y);
        }
        
        // Ensure the shape closes properly at the bottom right
        const lastX = (terrain.heights.length - 1) * TERRAIN_STEP;
        this.graphics.lineTo(lastX, HEIGHT);
        this.graphics.lineTo(WIDTH, HEIGHT);
        this.graphics.closePath();
        
        this.graphics.fillPath();
        this.graphics.strokePath();
    }
}
