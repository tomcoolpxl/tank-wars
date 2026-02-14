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
        this.pendingRemoteHashes = {};
        this.localTurnHashes = {};
        this.pendingRemoteShots = []; // Buffer for SHOT messages that arrive early
    }

    log(...args) {
        if (typeof window !== 'undefined' && window.DEBUG_NET) {
            console.log('[NET]', ...args);
        }
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

        // Input repeaters for smooth but controlled aiming
        this.repeaters = {
            left: new TickRepeater(20, 4),
            right: new TickRepeater(20, 4),
            up: new TickRepeater(20, 4),
            down: new TickRepeater(20, 4)
        };

        this.events.on('shutdown', () => {
            const buttons = document.querySelectorAll('.hud-button');
            buttons.forEach(btn => btn.remove());
        });
    }

    handleRemoteShot(msg) {
        this.log(`Received SHOT:`, msg);
        // Buffer the shot instead of rejecting it if we're not ready yet
        this.pendingRemoteShots.push(msg);
        this.processPendingShots();
    }

    processPendingShots() {
        if (this.simulation.rules.state !== GameState.TURN_AIM) return;
        
        const currentTurn = this.simulation.rules.turnNumber;
        const activeIdx = this.simulation.rules.activePlayerIndex;
        
        for (let i = 0; i < this.pendingRemoteShots.length; i++) {
            const msg = this.pendingRemoteShots[i];
            
            // Only process shots for the CURRENT turn
            if (msg.turnNumber === currentTurn) {
                if (activeIdx === this.localPlayerIndex) {
                    this.abortMatch('Protocol Error: SHOT on our turn');
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
                this.simulation.fire(angle, power, activeIdx);
                
                // Remove the processed shot
                this.pendingRemoteShots.splice(i, 1);
                return; // One shot per turn
            } else if (msg.turnNumber < currentTurn) {
                // Stale shot, remove it
                this.pendingRemoteShots.splice(i, 1);
                i--;
            }
            // If msg.turnNumber > currentTurn, keep it buffered for future
        }
    }

    handleRemoteHash(msg) {
        this.pendingRemoteHashes[msg.turnNumber] = msg.hash;
        this.validateHashes(msg.turnNumber);
    }

    validateHashes(turnNumber) {
        const remoteHash = this.pendingRemoteHashes[turnNumber];
        const localHash = this.localTurnHashes[turnNumber];
        
        if (remoteHash !== undefined && localHash !== undefined) {
            if (remoteHash !== localHash) {
                console.warn(`Desync at turn ${turnNumber}! Local: ${localHash}, Remote: ${remoteHash}`);
                // Only host initiates SYNC
                if (this.isHost) {
                    this.networkManager.send({
                        type: 'SYNC',
                        state: this.simulation.getState(),
                        turnNumber: turnNumber
                    });
                }
            } else {
                this.log(`Sync confirmed for turn ${turnNumber}`);
            }
            // Cleanup
            delete this.pendingRemoteHashes[turnNumber];
            delete this.localTurnHashes[turnNumber];
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

    sendHash(turnNumber, hash) {
        if (!this.networkManager || this.isReplaying) return;
        const finalHash = (hash !== undefined) ? hash : this.simulation.getStateHash();
        
        this.localTurnHashes[turnNumber] = finalHash;

        this.networkManager.send({
            type: 'HASH',
            turnNumber: turnNumber,
            hash: finalHash
        });

        this.validateHashes(turnNumber);
    }

    recordShot(angle, power) {
        this.recordedShots.push({ turn: this.simulation.rules.turnNumber, angle, power });
    }

    update(time, delta) {
        this.tickAccumulator += delta;
        const localTurn = this.simulation.rules.activePlayerIndex === this.localPlayerIndex;
        const isAiming = this.simulation.rules.state === GameState.TURN_AIM;

        const hudButtons = this.hud ? this.hud.buttonStates : {};

        let ticksProcessed = 0;
        while (this.tickAccumulator >= TICK_DURATION_MS) {
            // Always ensure autoFireEnabled matches our local turn status
            this.simulation.autoFireEnabled = localTurn;
            
            const prevState = this.simulation.rules.state;
            const prevTurn = this.simulation.rules.turnNumber;

            // Update inputs for this specific tick
            const inputs = {
                left: localTurn && isAiming && this.repeaters.left.update(this.cursors.left.isDown || hudButtons['angle-up'], this.simulation.tickCount),
                right: localTurn && isAiming && this.repeaters.right.update(this.cursors.right.isDown || hudButtons['angle-down'], this.simulation.tickCount),
                up: localTurn && isAiming && this.repeaters.up.update(this.cursors.up.isDown || hudButtons['power-up'], this.simulation.tickCount),
                down: localTurn && isAiming && this.repeaters.down.update(this.cursors.down.isDown || hudButtons['power-down'], this.simulation.tickCount)
            };

            this.simulation.step(inputs);
            
            if (isAiming) {
                this.processPendingShots();
            }

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

class TickRepeater {
    constructor(delayTicks = 24, rateTicks = 6) {
        this.delayTicks = delayTicks;
        this.rateTicks = rateTicks;
        this.startTick = -1;
        this.lastTriggerTick = -1;
    }

    update(isDown, currentTick) {
        if (!isDown) {
            this.startTick = -1;
            this.lastTriggerTick = -1;
            return false;
        }

        if (this.startTick === -1) {
            this.startTick = currentTick;
            this.lastTriggerTick = currentTick;
            return true;
        }

        const elapsed = currentTick - this.startTick;
        if (elapsed < this.delayTicks) return false;

        if (currentTick - this.lastTriggerTick >= this.rateTicks) {
            this.lastTriggerTick = currentTick;
            return true;
        }

        return false;
    }
}
