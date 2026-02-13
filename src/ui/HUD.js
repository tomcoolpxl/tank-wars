import Phaser from 'phaser';
import { GameState } from '../simulation/rules.js';

export class HUD {
    constructor(scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0);
        this.container.setScrollFactor(0);
        this.container.setDepth(100);

        this.createHUD();
    }

    createHUD() {
        // Style constants
        const textColor = '#00ffff';
        const fontStyle = { font: 'bold 18px monospace', fill: textColor };
        const labelStyle = { font: '14px monospace', fill: textColor };

        // Player 1 Health Bar
        this.p1Label = this.scene.add.text(20, 20, 'PLAYER 1', labelStyle);
        this.p1HealthBG = this.scene.add.graphics();
        this.p1HealthBG.fillStyle(0x333333);
        this.p1HealthBG.fillRect(20, 40, 200, 15);
        this.p1HealthBar = this.scene.add.graphics();
        this.container.add([this.p1Label, this.p1HealthBG, this.p1HealthBar]);

        // Player 2 Health Bar
        this.p2Label = this.scene.add.text(800 - 20, 20, 'PLAYER 2', labelStyle).setOrigin(1, 0);
        this.p2HealthBG = this.scene.add.graphics();
        this.p2HealthBG.fillStyle(0x333333);
        this.p2HealthBG.fillRect(800 - 220, 40, 200, 15);
        this.p2HealthBar = this.scene.add.graphics();
        this.container.add([this.p2Label, this.p2HealthBG, this.p2HealthBar]);

        // Timer
        this.timerText = this.scene.add.text(400, 30, '20', { font: 'bold 32px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.timerLabel = this.scene.add.text(400, 55, 'SECONDS', { font: '10px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.container.add([this.timerText, this.timerLabel]);

        // Wind
        this.windLabel = this.scene.add.text(400, 90, 'WIND', { font: '12px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.windText = this.scene.add.text(400, 105, '0', fontStyle).setOrigin(0.5, 0.5);
        this.windArrow = this.scene.add.graphics();
        this.container.add([this.windLabel, this.windText, this.windArrow]);

        // Angle and Power (Bottom Left for current player)
        this.statsContainer = this.scene.add.container(20, 520);
        this.angleText = this.scene.add.text(0, 0, 'ANGLE: 45°', fontStyle);
        this.powerText = this.scene.add.text(0, 25, 'POWER: 50', fontStyle);
        
        // Power Bar
        this.powerBarBG = this.scene.add.graphics();
        this.powerBarBG.fillStyle(0x333333);
        this.powerBarBG.fillRect(0, 50, 150, 10);
        this.powerBar = this.scene.add.graphics();
        
        this.statsContainer.add([this.angleText, this.powerText, this.powerBarBG, this.powerBar]);
        this.container.add(this.statsContainer);

        // Turn Indicator
        this.turnIndicator = this.scene.add.text(400, 170, 'YOUR TURN', { font: 'bold 24px monospace', fill: '#ffff00' }).setOrigin(0.5, 0.5);
        this.container.add(this.turnIndicator);

        // Debug Info
        this.debugText = this.scene.add.text(10, 580, '', { font: '12px monospace', fill: '#ffffff' });
        this.container.add(this.debugText);

        // Game Over Overlay
        this.gameOverOverlay = this.scene.add.container(0, 0).setVisible(false);
        const bg = this.scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
        this.winText = this.scene.add.text(400, 250, 'PLAYER 1 WINS!', { font: 'bold 48px monospace', fill: '#00ffff' }).setOrigin(0.5, 0.5);
        this.gameOverSubtext = this.scene.add.text(400, 320, 'RELOAD TO PLAY AGAIN', { font: '18px monospace', fill: '#ffffff' }).setOrigin(0.5, 0.5);
        this.gameOverOverlay.add([bg, this.winText, this.gameOverSubtext]);
        this.container.add(this.gameOverOverlay);
    }

    update(simulation, localPlayerIndex) {
        const rules = simulation.rules;
        const activePlayerIndex = rules.activePlayerIndex;
        const isLocalTurn = activePlayerIndex === localPlayerIndex;

        // Update health bars
        this.updateHealthBar(this.p1HealthBar, 20, 40, simulation.tanks[0].health);
        this.updateHealthBar(this.p2HealthBar, 800 - 220, 40, simulation.tanks[1].health);

        // Update timer (show seconds)
        const seconds = Math.ceil(rules.turnTimer / 60);
        this.timerText.setText(seconds.toString());
        this.timerText.setVisible(rules.state === GameState.TURN_AIM);
        this.timerLabel.setVisible(rules.state === GameState.TURN_AIM);

        // Update wind
        this.windText.setText(rules.wind > 0 ? `+${rules.wind}` : rules.wind.toString());
        this.windArrow.clear();
        if (rules.wind !== 0) {
            const isRight = rules.wind > 0;
            const arrowColor = 0x00ffff;
            const arrowSize = Math.min(10 + Math.abs(rules.wind) * 3, 40);
            const xBase = 400;
            const yBase = 125;
            
            this.windArrow.lineStyle(2, arrowColor, 0.8);
            this.windArrow.fillStyle(arrowColor, 0.8);
            
            // Draw arrow line
            const xEnd = isRight ? xBase + arrowSize : xBase - arrowSize;
            this.windArrow.lineBetween(xBase, yBase, xEnd, yBase);
            
            // Draw arrow head
            const headSize = 6;
            if (isRight) {
                this.windArrow.fillTriangle(xEnd, yBase, xEnd - headSize, yBase - headSize/2, xEnd - headSize, yBase + headSize/2);
            } else {
                this.windArrow.fillTriangle(xEnd, yBase, xEnd + headSize, yBase - headSize/2, xEnd + headSize, yBase + headSize/2);
            }
        }

        // Update active player stats
        const activeTank = simulation.tanks[activePlayerIndex];
        this.angleText.setText(`ANGLE: ${activeTank.aimAngle}°`);
        this.powerText.setText(`POWER: ${activeTank.aimPower}`);
        
        // Update Power Bar
        this.powerBar.clear();
        this.powerBar.fillStyle(isLocalTurn ? 0x00ffff : 0x888888, 0.8);
        this.powerBar.fillRect(0, 50, (activeTank.aimPower / 100) * 150, 10);
        
        // Position stats near active player's side or just keep fixed
        // For now, keep fixed but update color
        this.angleText.setFill(isLocalTurn ? '#00ffff' : '#888888');
        this.powerText.setFill(isLocalTurn ? '#00ffff' : '#888888');

        // Update turn indicator
        if (rules.state === GameState.TURN_AIM) {
            this.turnIndicator.setVisible(true);
            this.turnIndicator.setText(isLocalTurn ? 'YOUR TURN' : "OPPONENT'S TURN");
            this.turnIndicator.setFill(isLocalTurn ? '#ffff00' : '#888888');
        } else if (rules.state === GameState.PROJECTILE_FLIGHT) {
            this.turnIndicator.setVisible(false);
        } else {
            this.turnIndicator.setVisible(false);
        }

        // Handle Game Over
        if (rules.state === GameState.GAME_OVER) {
            this.gameOverOverlay.setVisible(true);
            if (rules.winner === -1) {
                this.winText.setText('DRAW!');
            } else {
                this.winText.setText(`PLAYER ${rules.winner + 1} WINS!`);
            }
        } else {
            this.gameOverOverlay.setVisible(false);
        }

        // Highlight active player label
        this.p1Label.setFill(activePlayerIndex === 0 ? '#ffff00' : '#00ffff');
        this.p2Label.setFill(activePlayerIndex === 1 ? '#ffff00' : '#00ffff');

        // Update Debug Info
        this.debugText.setText(`Tick: ${simulation.tickCount} | Turn: ${rules.turnNumber} | Hash: ${simulation.getStateHash()}`);
    }

    updateHealthBar(graphics, x, y, health) {
        graphics.clear();
        if (health <= 0) return;
        
        // Color based on health percentage
        let color = 0x00ff00;
        if (health < 30) color = 0xff0000;
        else if (health < 60) color = 0xffff00;

        graphics.fillStyle(color);
        graphics.fillRect(x, y, (health / 100) * 200, 15);
    }
}
