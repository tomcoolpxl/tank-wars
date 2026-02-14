import Phaser from 'phaser';
import { GameState } from '../simulation/rules.js';

export class HUD {
    constructor(scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0);
        this.container.setScrollFactor(0);
        this.container.setDepth(100);

        this.buttonStates = {
            'angle-down': false,
            'angle-up': false,
            'power-down': false,
            'power-up': false
        };

        this.createHUD();
    }

    createHUD() {
        const textColor = '#00ffff';
        const fontStyle = { font: 'bold 18px monospace', fill: textColor };
        const labelStyle = { font: '14px monospace', fill: textColor };

        this.p1Label = this.scene.add.text(20, 20, 'PLAYER 1', labelStyle);
        this.p1HealthBG = this.scene.add.graphics();
        this.p1HealthBG.fillStyle(0x333333);
        this.p1HealthBG.fillRect(20, 40, 200, 15);
        this.p1HealthBar = this.scene.add.graphics();
        this.container.add([this.p1Label, this.p1HealthBG, this.p1HealthBar]);

        this.p2Label = this.scene.add.text(800 - 20, 20, 'PLAYER 2', labelStyle).setOrigin(1, 0);
        this.p2HealthBG = this.scene.add.graphics();
        this.p2HealthBG.fillStyle(0x333333);
        this.p2HealthBG.fillRect(800 - 220, 40, 200, 15);
        this.p2HealthBar = this.scene.add.graphics();
        this.container.add([this.p2Label, this.p2HealthBG, this.p2HealthBar]);

        this.timerText = this.scene.add.text(400, 30, '20', { font: 'bold 32px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.timerLabel = this.scene.add.text(400, 55, 'SECONDS', { font: '10px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.container.add([this.timerText, this.timerLabel]);

        this.windLabel = this.scene.add.text(400, 90, 'WIND', { font: '12px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.windText = this.scene.add.text(400, 105, '0', fontStyle).setOrigin(0.5, 0.5);
        this.windArrow = this.scene.add.graphics();
        this.container.add([this.windLabel, this.windText, this.windArrow]);

        this.statsContainer = this.scene.add.container(20, 520);
        const labelStyle2 = { font: 'bold 16px monospace', fill: textColor };
        this.angleLabel = this.scene.add.text(0, 0, 'ANGLE:', labelStyle2);
        this.angleText = this.scene.add.text(70, 0, '45°', fontStyle);
        this.powerLabel = this.scene.add.text(0, 30, 'POWER:', labelStyle2);
        this.powerText = this.scene.add.text(70, 30, '50', fontStyle);
        this.powerBarBG = this.scene.add.graphics();
        this.powerBarBG.fillStyle(0x333333);
        this.powerBarBG.fillRect(0, 60, 150, 10);
        this.powerBar = this.scene.add.graphics();
        this.statsContainer.add([this.angleLabel, this.angleText, this.powerLabel, this.powerText, this.powerBarBG, this.powerBar]);
        this.container.add(this.statsContainer);

        this.createDOMButtons();

        this.turnIndicator = this.scene.add.text(400, 170, 'YOUR TURN', { font: 'bold 24px monospace', fill: '#ffff00' }).setOrigin(0.5, 0.5);
        this.container.add(this.turnIndicator);
        this.statusText = this.scene.add.text(400, 250, '', { font: 'bold 32px monospace', fill: '#ff00ff' }).setOrigin(0.5, 0.5).setVisible(false);
        this.container.add(this.statusText);

        this.gameOverOverlay = this.scene.add.container(0, 0).setVisible(false);
        const bg = this.scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
        this.winText = this.scene.add.text(400, 250, 'PLAYER 1 WINS!', { font: 'bold 48px monospace', fill: '#00ffff' }).setOrigin(0.5, 0.5);
        this.gameOverSubtext = this.scene.add.text(400, 320, 'RELOAD TO PLAY AGAIN', { font: '18px monospace', fill: '#ffffff' }).setOrigin(0.5, 0.5);
        this.gameOverOverlay.add([bg, this.winText, this.gameOverSubtext]);
        this.container.add(this.gameOverOverlay);
    }

    createDOMButtons() {
        this.domButtons = {};
        const configs = [
            { id: 'angle-down', text: '-', x: 130, y: 518 },
            { id: 'angle-up', text: '+', x: 165, y: 518 },
            { id: 'power-down', text: '-', x: 130, y: 548 },
            { id: 'power-up', text: '+', x: 165, y: 548 }
        ];

        configs.forEach(cfg => {
            const btn = document.createElement('button');
            btn.id = `btn-${cfg.id}`;
            btn.className = 'hud-button';
            btn.innerText = cfg.text;
            btn.setAttribute('data-testid', cfg.id);
            btn.style.cssText = `
                width: 30px;
                height: 30px;
                background: #111;
                color: #00ffff;
                border: 1px solid #00ffff;
                font-family: monospace;
                font-weight: bold;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
                pointer-events: auto;
            `;

            const start = (e) => { 
                this.log(`Button press START: ${cfg.id}`);
                e.preventDefault(); 
                this.buttonStates[cfg.id] = true; 
            };
            const stop = (e) => { 
                this.log(`Button press STOP: ${cfg.id}`);
                e.preventDefault(); 
                this.buttonStates[cfg.id] = false; 
            };

            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', stop);
            btn.addEventListener('mouseleave', stop);
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', stop);

            const domObj = this.scene.add.dom(cfg.x, cfg.y, btn).setOrigin(0, 0).setScrollFactor(0);
            this.domButtons[cfg.id] = domObj;
        });
    }

    log(...args) {
        if (typeof window !== 'undefined' && window.DEBUG_HUD) {
            console.log('[HUD]', ...args);
        }
    }

    update(simulation, localPlayerIndex) {
        const rules = simulation.rules;
        const activePlayerIndex = rules.activePlayerIndex;
        const isLocalTurn = activePlayerIndex === localPlayerIndex;
        const isAiming = rules.state === GameState.TURN_AIM;

        this.updateHealthBar(this.p1HealthBar, 20, 40, simulation.tanks[0].health);
        this.updateHealthBar(this.p2HealthBar, 800 - 220, 40, simulation.tanks[1].health);

        const seconds = Math.max(0, Math.ceil(rules.turnTimer / 60));
        this.timerText.setText(seconds.toString()).setVisible(isAiming);
        this.timerLabel.setVisible(isAiming);

        this.windText.setText(rules.wind > 0 ? `+${rules.wind}` : rules.wind.toString());
        this.windArrow.clear();
        if (rules.wind !== 0) {
            const isRight = rules.wind > 0;
            const arrowColor = 0x00ffff;
            const arrowSize = Math.min(10 + Math.abs(rules.wind) * 3, 40);
            this.windArrow.lineStyle(2, arrowColor, 0.8).fillStyle(arrowColor, 0.8);
            const xEnd = isRight ? 400 + arrowSize : 400 - arrowSize;
            this.windArrow.lineBetween(400, 125, xEnd, 125);
            if (isRight) this.windArrow.fillTriangle(xEnd, 125, xEnd - 6, 125 - 3, xEnd - 6, 125 + 3);
            else this.windArrow.fillTriangle(xEnd, 125, xEnd + 6, 125 - 3, xEnd + 6, 125 + 3);
        }

        const activeTank = simulation.tanks[activePlayerIndex];
        this.angleText.setText(`${activeTank.aimAngle}°`);
        this.powerText.setText(`${activeTank.aimPower}`);
        this.powerBar.clear().fillStyle(isLocalTurn ? 0x00ffff : 0x888888, 0.8).fillRect(0, 60, (activeTank.aimPower / 100) * 150, 10);
        
        const color = isLocalTurn ? '#00ffff' : '#888888';
        this.angleText.setFill(color); this.powerText.setFill(color);
        this.angleLabel.setFill(color); this.powerLabel.setFill(color);
        
        if (this.domButtons) {
            const show = isLocalTurn && isAiming;
            Object.values(this.domButtons).forEach(domObj => {
                domObj.setVisible(show);
            });
        }

        if (isAiming) {
            this.turnIndicator.setVisible(true).setText(isLocalTurn ? 'YOUR TURN' : "OPPONENT'S TURN").setFill(isLocalTurn ? '#ffff00' : '#888888');
        } else {
            this.turnIndicator.setVisible(false);
        }

        if (rules.state === GameState.GAME_OVER) {
            this.gameOverOverlay.setVisible(true);
            this.winText.setText(rules.winner === -1 ? 'DRAW!' : (rules.winner === -2 ? 'MATCH ABORTED' : `PLAYER ${rules.winner + 1} WINS!`));
        } else {
            this.gameOverOverlay.setVisible(false);
        }
    }

    updateHealthBar(graphics, x, y, health) {
        graphics.clear();
        if (health <= 0) return;
        let color = health < 30 ? 0xff0000 : (health < 60 ? 0xffff00 : 0x00ff00);
        graphics.fillStyle(color).fillRect(x, y, (health / 100) * 200, 15);
    }

    showStatus(text, duration = 2000) {
        this.statusText.setText(text).setVisible(true);
        if (this.statusTimer) this.statusTimer.remove();
        this.statusTimer = this.scene.time.delayedCall(duration, () => this.statusText.setVisible(false));
    }
}
