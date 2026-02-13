import { TERRAIN_STEP, WIDTH, HEIGHT } from '../simulation/constants.js';

export class TerrainRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        this.glowGraphics = [
            scene.add.graphics(),
            scene.add.graphics()
        ];
        
        // Order: glow furthest to back, then main line
        this.glowGraphics[1].setDepth(0);
        this.glowGraphics[0].setDepth(1);
        this.graphics.setDepth(2);
    }

    render(terrain) {
        // Redraw terrain
        this.graphics.clear();
        this.glowGraphics[0].clear();
        this.glowGraphics[1].clear();

        const color = 0x00ff00;
        
        // Main line
        this.graphics.lineStyle(2, color, 1.0);
        this.drawTerrainPath(this.graphics, terrain);
        
        // Inner glow
        this.glowGraphics[0].lineStyle(6, color, 0.3);
        this.drawTerrainPath(this.glowGraphics[0], terrain);
        
        // Outer glow
        this.glowGraphics[1].lineStyle(12, color, 0.1);
        this.drawTerrainPath(this.glowGraphics[1], terrain);
    }

    drawTerrainPath(graphics, terrain) {
        graphics.beginPath();
        graphics.moveTo(0, HEIGHT - terrain.heights[0]);
        
        for (let i = 1; i < terrain.heights.length; i++) {
            const x = i * TERRAIN_STEP;
            const y = HEIGHT - terrain.heights[i];
            graphics.lineTo(x, y);
        }
        graphics.strokePath();
    }

    update(time) {
        // Subtle flicker
        const flicker = 0.8 + Math.random() * 0.2;
        this.graphics.alpha = flicker;
        this.glowGraphics[0].alpha = flicker * 0.6;
        this.glowGraphics[1].alpha = flicker * 0.3;
    }
}
