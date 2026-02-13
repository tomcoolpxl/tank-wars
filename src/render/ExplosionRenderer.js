export class ExplosionRenderer {
    constructor(scene) {
        this.scene = scene;
    }

    playExplosion(x, y) {
        // Visual-only effect: multiple expanding rings for neon look
        const createRing = (radius, color, alpha, duration, scale) => {
            const circle = this.scene.add.circle(x, y, radius, color, alpha);
            circle.setDepth(30);
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
        createRing(5, 0xffaa00, 0.2, 400, 15);
        // Middle ring
        createRing(5, 0xff5500, 0.5, 300, 12);
        // Inner core ring
        createRing(5, 0xffffff, 0.8, 200, 8);
        
        // Neon Particles
        const colors = [0xffaa00, 0xff5500, 0xffffff];
        colors.forEach(color => {
            const particles = this.scene.add.particles(x, y, 'particle', {
                speed: { min: 80, max: 200 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.8, end: 0 },
                alpha: { start: 1, end: 0 },
                blendMode: 'ADD',
                lifespan: 800,
                gravityY: 400,
                quantity: 10,
                tint: color
            });
            
            this.scene.time.delayedCall(800, () => {
                particles.destroy();
            });
        });

        // Flash effect
        const flash = this.scene.add.circle(x, y, 10, 0xffffff, 0.8);
        flash.setDepth(40);
        this.scene.tweens.add({
            targets: flash,
            scale: 20,
            alpha: 0,
            duration: 100,
            onComplete: () => flash.destroy()
        });
    }
}
