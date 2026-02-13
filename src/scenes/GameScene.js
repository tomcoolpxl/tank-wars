import Phaser from 'phaser';
import { Simulation } from '../simulation/sim.js';
import { TICK_DURATION_MS } from '../simulation/constants.js';
import { TerrainRenderer } from '../render/TerrainRenderer.js';
import { TankRenderer } from '../render/TankRenderer.js';
import { ProjectileRenderer } from '../render/ProjectileRenderer.js';
import { ExplosionRenderer } from '../render/ExplosionRenderer.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.tickAccumulator = 0;
    }

    preload() {
        // Create a simple particle texture if not present
        if (!this.textures.exists('particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('particle', 8, 8);
        }
    }

    create() {
        // Initialize simulation with a fixed seed for now (or random)
        const seed = Date.now();
        this.simulation = new Simulation(seed);
        this.simulation.start();

        // Initialize renderers
        this.terrainRenderer = new TerrainRenderer(this);
        this.tankRenderer = new TankRenderer(this);
        this.projectileRenderer = new ProjectileRenderer(this);
        this.explosionRenderer = new ExplosionRenderer(this);

        // Initial render
        this.terrainRenderer.render(this.simulation.terrain);
        this.tankRenderer.render(this.simulation.tanks, this.simulation.terrain);

        // Debug text
        this.debugText = this.add.text(10, 10, '', { font: '12px monospace', fill: '#0f0' });
        
        // Input keys
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update(time, delta) {
        this.tickAccumulator += delta;

        // Capture inputs
        const inputs = {
            left: this.cursors.left.isDown,
            right: this.cursors.right.isDown,
            up: this.cursors.up.isDown,
            down: this.cursors.down.isDown,
            fire: this.cursors.space.isDown
        };

        let ticksProcessed = 0;
        // Fixed time step loop
        while (this.tickAccumulator >= TICK_DURATION_MS) {
            this.simulation.step(inputs);
            
            // Handle events
            for (const event of this.simulation.events) {
                if (event.type === 'explosion') {
                    this.explosionRenderer.playExplosion(event.x, event.y);
                    // Update terrain visual
                    this.terrainRenderer.render(this.simulation.terrain);
                }
            }

            this.tickAccumulator -= TICK_DURATION_MS;
            ticksProcessed++;
            
            // Safety break to avoid spiral of death
            if (ticksProcessed > 10) {
                this.tickAccumulator = 0;
                break;
            }
        }

        // Render update (interpolation could be added here later)
        this.tankRenderer.render(this.simulation.tanks, this.simulation.terrain);
        this.projectileRenderer.render(this.simulation.projectile);

        // Debug info
        const activeTank = this.simulation.tanks[this.simulation.rules.activePlayerIndex];
        this.debugText.setText(
            `Tick: ${this.simulation.tickCount}\n` +
            `State: ${this.simulation.rules.state}\n` +
            `Player: ${this.simulation.rules.activePlayerIndex}\n` +
            `Angle: ${activeTank.aimAngle}\n` +
            `Power: ${activeTank.aimPower}\n` +
            `Timer: ${this.simulation.rules.turnTimer}`
        );
    }
}
