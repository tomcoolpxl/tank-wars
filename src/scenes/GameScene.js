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
        this.simulation = new Simulation(this.seed);
        this.simulation.start();
        this.lastTurnNumber = this.simulation.rules.turnNumber;
        this.lastGameState = this.simulation.rules.state;

        // Send initial state hash to confirm sync at Turn 0
        this.sendHash(0);

        if (this.networkManager) {
            this.networkManager.onMessage((msg) => {
                if (this.isReplaying) return;
                switch (msg.type) {
                    case 'SHOT': this.handleRemoteShot(msg); break;
                    case 'HASH': this.handleRemoteHash(msg); break;
                    case 'SYNC': this.handleRemoteSync(msg); break;
                    case 'ABORT': this.handleRemoteAbort(msg); break;
                }
            });
        }

        this.terrainRenderer = new TerrainRenderer(this);
        this.tankRenderer = new TankRenderer(this);
        this.projectileRenderer = new ProjectileRenderer(this);
        this.explosionRenderer = new ExplosionRenderer(this);

        this.terrainRenderer.render(this.simulation.terrain);
        this.tankRenderer.render(this.simulation.tanks, this.simulation.terrain);
        this.hud = new HUD(this);
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    handleRemoteShot(msg) {
        if (this.simulation.rules.state !== GameState.TURN_AIM) return;
        if (this.simulation.rules.activePlayerIndex === this.localPlayerIndex) {
            this.abortMatch('Protocol Error: SHOT on our turn');
            return;
        }
        if (msg.turnNumber !== this.simulation.rules.turnNumber) {
            this.abortMatch(`Protocol Error: Turn mismatch`);
            return;
        }

        const angle = Math.floor(msg.angle);
        const power = Math.floor(msg.power);
        const isInvalid = !Number.isInteger(angle) || angle < 0 || angle > 180 || 
                          !Number.isInteger(power) || power < 0 || power > 100;
        
        if (isInvalid) {
            this.abortMatch(`Security Error: Invalid parameters`);
            return;
        }

        this.recordShot(angle, power);
        this.simulation.fire(angle, power, this.simulation.rules.activePlayerIndex);
    }

    handleRemoteHash(msg) {
        if (!this.isHost) return;
        const myHash = this.simulation.getStateHash();
        if (msg.hash !== myHash) {
            console.warn(`Desync at turn ${msg.turnNumber}! Local: ${myHash}, Remote: ${msg.hash}`);
            this.networkManager.send({
                type: 'SYNC',
                state: this.simulation.getState(),
                turnNumber: msg.turnNumber
            });
        }
    }

    handleRemoteSync(msg) {
        if (this.isHost) return;
        this.simulation.setState(msg.state);
        this.terrainRenderer.render(this.simulation.terrain);
        this.tankRenderer.render(this.simulation.tanks, this.simulation.terrain);
    }

    handleRemoteAbort(msg) {
        this.simulation.rules.state = GameState.GAME_OVER;
        this.simulation.rules.winner = -2;
        if (this.hud) {
            this.hud.winText.setText('MATCH ABORTED');
            this.hud.gameOverSubtext.setText(msg.reason.toUpperCase());
            this.hud.gameOverOverlay.setVisible(true);
        }
    }

    abortMatch(reason) {
        console.error(`ABORTING: ${reason}`);
        this.handleRemoteAbort({ reason });
        if (this.networkManager) {
            this.networkManager.send({ type: 'ABORT', reason });
        }
    }

    sendHash(turnNumber) {
        if (!this.networkManager || this.isReplaying) return;
        this.networkManager.send({
            type: 'HASH',
            turnNumber: turnNumber,
            hash: this.simulation.getStateHash()
        });
    }

    recordShot(angle, power) {
        this.recordedShots.push({ turn: this.simulation.rules.turnNumber, angle, power });
    }

    update(time, delta) {
        this.tickAccumulator += delta;
        const localTurn = this.simulation.rules.activePlayerIndex === this.localPlayerIndex;
        const isAiming = this.simulation.rules.state === GameState.TURN_AIM;

        const inputs = {
            left: localTurn && isAiming && this.cursors.left.isDown,
            right: localTurn && isAiming && this.cursors.right.isDown,
            up: localTurn && isAiming && this.cursors.up.isDown,
            down: localTurn && isAiming && this.cursors.down.isDown
        };

        let ticksProcessed = 0;
        while (this.tickAccumulator >= TICK_DURATION_MS) {
            this.simulation.autoFireEnabled = localTurn;
            const prevState = this.simulation.rules.state;
            const prevTurn = this.simulation.rules.turnNumber;

            this.simulation.step(inputs);
            
            if (this.simulation.rules.turnNumber !== prevTurn) {
                this.sendHash(prevTurn);
            }

            if (prevState !== GameState.GAME_OVER && this.simulation.rules.state === GameState.GAME_OVER) {
                this.sendHash(this.simulation.rules.turnNumber);
            }

            if (localTurn && prevState === GameState.TURN_AIM && this.simulation.rules.state === GameState.PROJECTILE_FLIGHT) {
                if (this.simulation.rules.turnTimer <= 0) {
                    const activeTank = this.simulation.tanks[this.localPlayerIndex];
                    this.networkManager.send({
                        type: 'SHOT',
                        turnNumber: this.simulation.rules.turnNumber,
                        angle: activeTank.aimAngle,
                        power: activeTank.aimPower
                    });
                    this.recordShot(activeTank.aimAngle, activeTank.aimPower);
                }
            }

            // Passive player timeout fallback
            if (!localTurn && isAiming && this.simulation.rules.turnTimer < -300) {
                const t = this.simulation.tanks[this.simulation.rules.activePlayerIndex];
                this.simulation.fire(t.aimAngle, t.aimPower, this.simulation.rules.activePlayerIndex);
            }

            for (const event of this.simulation.events) {
                if (event.type === 'explosion') {
                    this.explosionRenderer.playExplosion(event.x, event.y);
                    this.terrainRenderer.render(this.simulation.terrain);
                }
            }

            this.tickAccumulator -= TICK_DURATION_MS;
            if (++ticksProcessed > 10) break;
        }

        if (!this.isReplaying && localTurn && isAiming && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            const activeTank = this.simulation.tanks[this.localPlayerIndex];
            this.networkManager.send({
                type: 'SHOT',
                turnNumber: this.simulation.rules.turnNumber,
                angle: activeTank.aimAngle,
                power: activeTank.aimPower
            });
            this.recordShot(activeTank.aimAngle, activeTank.aimPower);
            this.simulation.fire(activeTank.aimAngle, activeTank.aimPower, this.localPlayerIndex);
        }

        this.tankRenderer.render(this.simulation.tanks, this.simulation.terrain);
        this.projectileRenderer.render(this.simulation.projectile);
        this.hud.update(this.simulation, this.localPlayerIndex);
        this.terrainRenderer.update(time);
        this.tankRenderer.update(time);
        this.projectileRenderer.update(time);
    }
}
