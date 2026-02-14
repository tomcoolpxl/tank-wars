import { TERRAIN_STEP, WIDTH, VIEWPORT_HEIGHT } from '../simulation/constants.js';

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
        
        // Multiple layers of glow for a smoother transition
        this.glowGraphics[0].lineStyle(4, color, 0.4);
        this.drawTerrainPath(this.glowGraphics[0], terrain);
        
        this.glowGraphics[1].lineStyle(8, color, 0.2);
        this.drawTerrainPath(this.glowGraphics[1], terrain);

        if (!this.glow3) {
            this.glow3 = this.scene.add.graphics();
            this.glow3.setDepth(0);
        }
        this.glow3.clear();
        this.glow3.lineStyle(16, color, 0.1);
        this.drawTerrainPath(this.glow3, terrain);

        if (!this.glow4) {
            this.glow4 = this.scene.add.graphics();
            this.glow4.setDepth(-1);
        }
        this.glow4.clear();
        this.glow4.lineStyle(32, color, 0.05);
        this.drawTerrainPath(this.glow4, terrain);
    }

    drawTerrainPath(graphics, terrain) {
        graphics.beginPath();
        graphics.moveTo(0, VIEWPORT_HEIGHT - terrain.heights[0]);
        
        for (let i = 1; i < terrain.heights.length; i++) {
            const x = i * TERRAIN_STEP;
            const y = VIEWPORT_HEIGHT - terrain.heights[i];
            graphics.lineTo(x, y);
        }
        graphics.strokePath();
    }

    update(time) {
        // Smooth sine-wave glow instead of random flicker
        const pulse = 0.9 + Math.sin(time / 500) * 0.1;
        this.graphics.alpha = pulse;
        this.glowGraphics[0].alpha = pulse * 0.6;
        this.glowGraphics[1].alpha = pulse * 0.3;
        if (this.glow3) this.glow3.alpha = pulse * 0.15;
        if (this.glow4) this.glow4.alpha = pulse * 0.07;
    }
}
