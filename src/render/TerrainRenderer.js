import { TERRAIN_STEP, WIDTH, VIEWPORT_HEIGHT } from '../simulation/constants.js';
import { RENDER_DEPTHS, COLORS, TERRAIN_VISUALS } from './constants.js';

export class TerrainRenderer {
    constructor(scene) {
        this.scene = scene;
        this.graphics = scene.add.graphics();
        this.glowGraphics = [
            scene.add.graphics(),
            scene.add.graphics()
        ];
        
        // Order: glow furthest to back, then main line
        this.glowGraphics[1].setDepth(RENDER_DEPTHS.TERRAIN_GLOW_2);
        this.glowGraphics[0].setDepth(RENDER_DEPTHS.TERRAIN_GLOW_1);
        this.graphics.setDepth(RENDER_DEPTHS.TERRAIN_MAIN);
    }

    render(terrain) {
        // Redraw terrain
        this.graphics.clear();
        this.glowGraphics[0].clear();
        this.glowGraphics[1].clear();

        const color = COLORS.TERRAIN;
        
        // Main line
        this.graphics.lineStyle(TERRAIN_VISUALS.LINE_WIDTH, color, 1.0);
        this.drawTerrainPath(this.graphics, terrain);
        
        // Multiple layers of glow for a smoother transition
        this.glowGraphics[0].lineStyle(TERRAIN_VISUALS.GLOW_1_WIDTH, color, TERRAIN_VISUALS.GLOW_1_ALPHA);
        this.drawTerrainPath(this.glowGraphics[0], terrain);
        
        this.glowGraphics[1].lineStyle(TERRAIN_VISUALS.GLOW_2_WIDTH, color, TERRAIN_VISUALS.GLOW_2_ALPHA);
        this.drawTerrainPath(this.glowGraphics[1], terrain);

        if (!this.glow3) {
            this.glow3 = this.scene.add.graphics();
            this.glow3.setDepth(RENDER_DEPTHS.TERRAIN_GLOW_3);
        }
        this.glow3.clear();
        this.glow3.lineStyle(TERRAIN_VISUALS.GLOW_3_WIDTH, color, TERRAIN_VISUALS.GLOW_3_ALPHA);
        this.drawTerrainPath(this.glow3, terrain);

        if (!this.glow4) {
            this.glow4 = this.scene.add.graphics();
            this.glow4.setDepth(RENDER_DEPTHS.TERRAIN_GLOW_4);
        }
        this.glow4.clear();
        this.glow4.lineStyle(TERRAIN_VISUALS.GLOW_4_WIDTH, color, TERRAIN_VISUALS.GLOW_4_ALPHA);
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
        const pulse = TERRAIN_VISUALS.PULSE_BASE + Math.sin(time / TERRAIN_VISUALS.PULSE_SPEED_DIVISOR) * TERRAIN_VISUALS.PULSE_AMPLITUDE;
        this.graphics.alpha = pulse;
        this.glowGraphics[0].alpha = pulse * TERRAIN_VISUALS.PULSE_GLOW_1_ALPHA_MULT;
        this.glowGraphics[1].alpha = pulse * TERRAIN_VISUALS.PULSE_GLOW_2_ALPHA_MULT;
        if (this.glow3) this.glow3.alpha = pulse * TERRAIN_VISUALS.PULSE_GLOW_3_ALPHA_MULT;
        if (this.glow4) this.glow4.alpha = pulse * TERRAIN_VISUALS.PULSE_GLOW_4_ALPHA_MULT;
    }
}
