import Phaser from 'phaser';
import { Simulation } from '../simulation/sim.js';
import { TICK_DURATION_MS } from '../simulation/constants.js';
import { GameState } from '../simulation/rules.js';
import { TerrainRenderer } from '../render/TerrainRenderer.js';
import { TankRenderer } from '../render/TankRenderer.js';
import { ProjectileRenderer } from '../render/ProjectileRenderer.js';
import { ExplosionRenderer } from '../render/ExplosionRenderer.js';
import { HUD } from '../ui/HUD.js';

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

    init(data) {
        this.networkManager = data.networkManager;
        this.isHost = data.isHost;
        this.seed = data.seed;
        this.localPlayerIndex = this.isHost ? 0 : 1;
        this.recordedShots = [];
        
        this.isReplaying = !!data.replayShots;
        this.replayShots = data.replayShots || [];
        this.replayIndex = 0;
        
        this.lastTurnNumber = 0;
        this.lastGameState = null;
    }

    create() {
        // Initialize simulation with the shared seed
        this.simulation = new Simulation(this.seed);
        this.simulation.start();
        this.lastTurnNumber = this.simulation.rules.turnNumber;
        this.lastGameState = this.simulation.rules.state;

        // Listen for network messages
        if (this.networkManager) {
            this.networkManager.onMessage((msg) => {
                if (this.isReplaying) return;
                switch (msg.type) {
                    case 'SHOT':
                        this.handleRemoteShot(msg);
                        break;
                    case 'HASH':
                        this.handleRemoteHash(msg);
                        break;
                    case 'SYNC':
                        this.handleRemoteSync(msg);
                        break;
                }
            });
        }

        // Initialize renderers
        this.terrainRenderer = new TerrainRenderer(this);
        this.tankRenderer = new TankRenderer(this);
        this.projectileRenderer = new ProjectileRenderer(this);
        this.explosionRenderer = new ExplosionRenderer(this);

        // Initial render
        this.terrainRenderer.render(this.simulation.terrain);
        this.tankRenderer.render(this.simulation.tanks, this.simulation.terrain);

        // Initialize HUD
        this.hud = new HUD(this);
        
        // Input keys
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    }

    handleRemoteShot(msg) {
        if (this.simulation.rules.state !== GameState.TURN_AIM) return;
        if (this.simulation.rules.activePlayerIndex === this.localPlayerIndex) {
            this.abortMatch('Protocol Error: Received SHOT on our turn');
            return;
        }
        if (msg.turnNumber !== this.simulation.rules.turnNumber) {
            this.abortMatch(`Protocol Error: Turn mismatch (Expected ${this.simulation.rules.turnNumber}, got ${msg.turnNumber})`);
            return;
        }

        // 8.5 SHOT MESSAGE VALIDATION: angleDeg must be an integer in [0, 180]
        const angle = msg.angle;
        const power = msg.power;
        
        const isInvalid = !Number.isInteger(angle) || angle < 0 || angle > 180 || 
                          !Number.isInteger(power) || power < 0 || power > 100;
        
        if (isInvalid) {
            this.abortMatch(`Security Error: Invalid SHOT parameters (${angle}, ${power})`);
            return;
        }

        this.recordShot(angle, power);
        this.simulation.fire(angle, power, this.simulation.rules.activePlayerIndex);
    }

    abortMatch(reason) {
        console.error(`ABORTING MATCH: ${reason}`);
        this.simulation.rules.state = GameState.GAME_OVER;
        this.simulation.rules.winner = -2; // Special value for aborted/error
        
        // Show error on HUD
        if (this.hud) {
            this.hud.winText.setText('MATCH ABORTED');
            this.hud.gameOverSubtext.setText(reason.toUpperCase());
            this.hud.gameOverOverlay.setVisible(true);
        }
    }

    handleRemoteHash(msg) {
        if (!this.isHost) return; // Only host validates hashes
        
        const myHash = this.simulation.getStateHash();
        if (msg.hash !== myHash) {
            console.warn(`Hash mismatch detected at turn ${msg.turnNumber}! (Remote: ${msg.hash}, Local: ${myHash})`);
            console.warn('Sending authoritative state SYNC to client.');
            this.networkManager.send({
                type: 'SYNC',
                state: this.simulation.getState()
            });
        } else {
            console.log(`Hash match at turn ${msg.turnNumber}.`);
        }
    }

    handleRemoteSync(msg) {
        if (this.isHost) return; // Client only accepts sync from host
        console.log('Received authoritative state SYNC from host. Applying...');
        this.simulation.setState(msg.state);
        // Refresh visuals
        this.terrainRenderer.render(this.simulation.terrain);
        this.tankRenderer.render(this.simulation.tanks, this.simulation.terrain);
    }

    handleTurnTransition() {
        if (!this.networkManager || this.isReplaying) return;
        
        const hash = this.simulation.getStateHash();
        console.log(`Turn ended. Sending HASH: ${hash} for turn ${this.lastTurnNumber}`);
        this.networkManager.send({
            type: 'HASH',
            turnNumber: this.lastTurnNumber,
            hash: hash
        });
    }

    recordShot(angle, power) {
        this.recordedShots.push({
            turn: this.simulation.rules.turnNumber,
            player: this.simulation.rules.activePlayerIndex,
            angle,
            power,
            hashBefore: this.simulation.getStateHash()
        });
        console.log(`Recorded shot: Turn ${this.simulation.rules.turnNumber}, Player ${this.simulation.rules.activePlayerIndex}, Angle ${angle}, Power ${power}`);
    }

    update(time, delta) {
        this.tickAccumulator += delta;

        const isMyTurn = this.simulation.rules.activePlayerIndex === this.localPlayerIndex;
        const isAiming = this.simulation.rules.state === GameState.TURN_AIM;

        // Capture inputs ONLY if it is my turn
        const inputs = {
            left: isMyTurn && isAiming && this.cursors.left.isDown,
            right: isMyTurn && isAiming && this.cursors.right.isDown,
            up: isMyTurn && isAiming && this.cursors.up.isDown,
            down: isMyTurn && isAiming && this.cursors.down.isDown
        };

        let ticksProcessed = 0;
        // Fixed time step loop
        while (this.tickAccumulator >= TICK_DURATION_MS) {
            this.simulation.step(inputs);
            
            // Detect turn transition
            if (this.simulation.rules.turnNumber !== this.lastTurnNumber) {
                this.handleTurnTransition();
                this.lastTurnNumber = this.simulation.rules.turnNumber;
            }

            // Detect state transition (e.g. from manual or auto fire)
            if (this.simulation.rules.state !== this.lastGameState) {
                // If it transitioned to PROJECTILE_FLIGHT and it's our turn, we might need to record/send SHOT
                // but Simulation.step doesn't know about networking.
                // For auto-fire, we should have sent it. 
                // Wait, if Simulation handles auto-fire, how does the remote peer know?
                // The remote peer's Simulation will also auto-fire at the same tick. 
                // So we don't strictly need to send a SHOT message for auto-fire if it's deterministic.
                this.lastGameState = this.simulation.rules.state;
            }

            // Check for local fire
            if (!this.isReplaying && isMyTurn && isAiming) {
                const activeTank = this.simulation.tanks[this.localPlayerIndex];
                if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                    const shotData = {
                        type: 'SHOT',
                        turnNumber: this.simulation.rules.turnNumber,
                        angle: activeTank.aimAngle,
                        power: activeTank.aimPower
                    };
                    this.networkManager.send(shotData);
                    this.recordShot(activeTank.aimAngle, activeTank.aimPower);
                    this.simulation.fire(activeTank.aimAngle, activeTank.aimPower, this.localPlayerIndex);
                }
            }

            // Auto-fire replay shots
            if (this.isReplaying && isAiming && this.replayIndex < this.replayShots.length) {
                const nextShot = this.replayShots[this.replayIndex];
                if (nextShot.turn === this.simulation.rules.turnNumber) {
                    this.simulation.fire(nextShot.angle, nextShot.power, this.simulation.rules.activePlayerIndex);
                    this.replayIndex++;
                }
            }

            // Handle events
            for (const event of this.simulation.events) {
                if (event.type === 'explosion') {
                    this.explosionRenderer.playExplosion(event.x, event.y);
                    // Update terrain visual
                    this.terrainRenderer.render(this.simulation.terrain);
                } else if (event.type === 'out-of-bounds') {
                    this.hud.showStatus('OUT OF BOUNDS', 2000);
                } else if (event.type === 'timeout') {
                    this.hud.showStatus('PROJECTILE TIMEOUT', 2000);
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

        // Update HUD
        this.hud.update(this.simulation, this.localPlayerIndex);

        // Apply visual effects (flicker, etc)
        this.terrainRenderer.update(time);
        this.tankRenderer.update(time);
        this.projectileRenderer.update(time);

        if (Phaser.Input.Keyboard.JustDown(this.pKey)) {
            console.log('--- REPLAY DATA ---');
            console.log('Seed:', this.seed);
            console.log('Shots:', JSON.stringify(this.recordedShots, null, 2));
            console.log('-------------------');
        }

        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            console.log('RESTARTING WITH REPLAY...');
            this.scene.restart({
                networkManager: this.networkManager,
                isHost: this.isHost,
                seed: this.seed,
                replayShots: this.recordedShots
            });
        }
    }
}
