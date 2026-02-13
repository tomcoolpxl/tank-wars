export class ExplosionRenderer {
    constructor(scene) {
        this.scene = scene;
        // We'll spawn ephemeral objects for explosions
    }

    playExplosion(x, y) {
        // Visual-only effect: expanding ring
        const circle = this.scene.add.circle(x, y, 5, 0xffaa00, 0.8);
        circle.setDepth(30);
        
        this.scene.tweens.add({
            targets: circle,
            scale: 12, // 5 * 12 = 60 radius (approx damage radius)
            alpha: 0,
            duration: 300,
            onComplete: () => {
                circle.destroy();
            }
        });
        
        // Particles
        // Phase 2: "particles (Phaser particles) seeded with non-sim randomness allowed"
        // Simple particle burst
        const particles = this.scene.add.particles(x, y, 'particle', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            lifespan: 600,
            gravityY: 300,
            quantity: 20
        });
        
        // If 'particle' texture doesn't exist, we should create a fallback or assume it exists.
        // I'll create a simple texture in GameScene if needed.
        // For now, I'll use a circle graphic as texture if possible or just rely on tint.
        // Actually, without a texture, particles might fail or be invisible.
        // I'll make sure GameScene creates a texture.
        
        this.scene.time.delayedCall(600, () => {
            particles.destroy();
        });
    }
}
