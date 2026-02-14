import { VIEWPORT_HEIGHT } from '../simulation/constants.js';
import { RENDER_DEPTHS, COLORS, EXPLOSION_VISUALS } from './constants.js';

export class ExplosionRenderer {
    constructor(scene) {
        this.scene = scene;
    }

    playExplosion(x, simY) {
        const y = VIEWPORT_HEIGHT - simY;
        // Visual-only effect: multiple expanding rings for neon look
        const createRing = (radius, color, alpha, duration, scale) => {
            const circle = this.scene.add.circle(x, y, radius, color, alpha);
            circle.setDepth(RENDER_DEPTHS.EXPLOSION);
            circle.setStrokeStyle(2, color, alpha);
            circle.setFillStyle(color, alpha * 0.2);
            
            this.scene.tweens.add({
                targets: circle,
                scale: scale,
                alpha: 0,
                duration: duration,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    circle.destroy();
                }
            });
        };

        // Outer glow ring
        createRing(EXPLOSION_VISUALS.RING_START_RADIUS, COLORS.EXPLOSION_OUTER, EXPLOSION_VISUALS.OUTER_ALPHA, EXPLOSION_VISUALS.OUTER_DURATION, EXPLOSION_VISUALS.OUTER_SCALE);
        // Middle ring
        createRing(EXPLOSION_VISUALS.RING_START_RADIUS, COLORS.EXPLOSION_MID, EXPLOSION_VISUALS.MID_ALPHA, EXPLOSION_VISUALS.MID_DURATION, EXPLOSION_VISUALS.MID_SCALE);
        // Inner core ring
        createRing(EXPLOSION_VISUALS.RING_START_RADIUS, COLORS.EXPLOSION_INNER, EXPLOSION_VISUALS.INNER_ALPHA, EXPLOSION_VISUALS.INNER_DURATION, EXPLOSION_VISUALS.INNER_SCALE);
        
        // Neon Particles
        const colors = [COLORS.EXPLOSION_OUTER, COLORS.EXPLOSION_MID, COLORS.EXPLOSION_INNER];
        colors.forEach(color => {
            const particles = this.scene.add.particles(x, y, 'particle', {
                speed: { min: EXPLOSION_VISUALS.PARTICLE_MIN_SPEED, max: EXPLOSION_VISUALS.PARTICLE_MAX_SPEED },
                angle: { min: 0, max: 360 },
                scale: { start: 1.0, end: 0 },
                alpha: { start: 1, end: 0 },
                blendMode: 'ADD',
                lifespan: { min: EXPLOSION_VISUALS.PARTICLE_MIN_LIFESPAN, max: EXPLOSION_VISUALS.PARTICLE_MAX_LIFESPAN },
                gravityY: 0,
                tint: color,
                emitting: false
            });
            
            particles.explode(EXPLOSION_VISUALS.PARTICLE_COUNT);
            
            this.scene.time.delayedCall(EXPLOSION_VISUALS.PARTICLE_DESTROY_DELAY, () => {
                particles.destroy();
            });
        });

        // Flash effect
        const flash = this.scene.add.circle(x, y, EXPLOSION_VISUALS.FLASH_RADIUS, COLORS.EXPLOSION_INNER, EXPLOSION_VISUALS.FLASH_ALPHA);
        flash.setDepth(RENDER_DEPTHS.FLASH);
        this.scene.tweens.add({
            targets: flash,
            scale: EXPLOSION_VISUALS.FLASH_SCALE,
            alpha: 0,
            duration: EXPLOSION_VISUALS.FLASH_DURATION,
            onComplete: () => flash.destroy()
        });
    }
}
