import { VIEWPORT_HEIGHT, EXPLOSION_DAMAGE_RADIUS } from '../simulation/constants.js';
import { RENDER_DEPTHS, COLORS, EXPLOSION_VISUALS } from './constants.js';

export class ExplosionRenderer {
    constructor(scene) {
        this.scene = scene;
    }

    playPreExplosion(x, simY) {
        const y = VIEWPORT_HEIGHT - simY;
        const blastRadius = EXPLOSION_DAMAGE_RADIUS;

        // Pre-animation: Rapidly expanding thick bordered white see-through circle
        const circle = this.scene.add.circle(x, y, 0, 0xffffff, 0);
        circle.setDepth(RENDER_DEPTHS.FLASH);
        circle.setStrokeStyle(4, 0xffffff, 0.5);
        circle.setFillStyle(0xffffff, 0.1);

        // Main expansion tween
        this.scene.tweens.add({
            targets: circle,
            radius: blastRadius,
            alpha: 1,
            duration: 300, // Rapidly expands (0.3s)
            ease: 'Expo.easeOut',
            onComplete: () => {
                // Fade out after expansion
                this.scene.tweens.add({
                    targets: circle,
                    alpha: 0,
                    duration: 700, // Total 1s for the whole pre-effect
                    onComplete: () => circle.destroy()
                });
            }
        });

        // Fading trail effect: spawn multiple rings during expansion
        const trailCount = 8;
        for (let i = 0; i < trailCount; i++) {
            this.scene.time.delayedCall(i * 40, () => {
                const trailCircle = this.scene.add.circle(x, y, 0, 0xffffff, 0);
                trailCircle.setDepth(RENDER_DEPTHS.EXPLOSION);
                trailCircle.setStrokeStyle(2, 0xffffff, 0.3);
                
                this.scene.tweens.add({
                    targets: trailCircle,
                    radius: blastRadius,
                    alpha: { start: 0.3, to: 0 },
                    duration: 600,
                    ease: 'Quad.easeOut',
                    onComplete: () => trailCircle.destroy()
                });
            });
        }
    }

    playBlastVisuals(x, simY) {
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
