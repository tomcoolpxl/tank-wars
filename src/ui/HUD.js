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
            'power-up': false,
            'fire': false
        };

        this.createHUD();
    }

    createHUD() {
        const textColor = '#00ffff';
        const fontStyle = { font: 'bold 18px monospace', fill: textColor };
        const labelStyle = { font: '14px monospace', fill: textColor };
        const statStyle = { font: 'bold 16px monospace', fill: textColor };

        // Player 1 Area
        this.p1Label = this.scene.add.text(20, 15, 'PLAYER 1', labelStyle);
        this.p1HealthBG = this.scene.add.graphics().fillStyle(0x333333).fillRect(20, 35, 200, 12);
        this.p1HealthBar = this.scene.add.graphics();
        this.p1AngleText = this.scene.add.text(20, 60, 'ANG: 45°', statStyle);
        this.p1PowerText = this.scene.add.text(20, 95, 'PWR: 50', statStyle);
        this.container.add([this.p1Label, this.p1HealthBG, this.p1HealthBar, this.p1AngleText, this.p1PowerText]);

        // Player 2 Area
        this.p2Label = this.scene.add.text(800 - 20, 15, 'PLAYER 2', labelStyle).setOrigin(1, 0);
        this.p2HealthBG = this.scene.add.graphics().fillStyle(0x333333).fillRect(800 - 220, 35, 200, 12);
        this.p2HealthBar = this.scene.add.graphics();
        this.p2AngleText = this.scene.add.text(800 - 20, 60, 'ANG: 45°', statStyle).setOrigin(1, 0);
        this.p2PowerText = this.scene.add.text(800 - 20, 95, 'PWR: 50', statStyle).setOrigin(1, 0);
        this.container.add([this.p2Label, this.p2HealthBG, this.p2HealthBar, this.p2AngleText, this.p2PowerText]);

        // Center Area (Timer & Wind)
        this.timerText = this.scene.add.text(400, 25, '20', { font: 'bold 24px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.timerLabel = this.scene.add.text(400, 45, 'SEC', { font: '10px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.container.add([this.timerText, this.timerLabel]);

        this.windLabel = this.scene.add.text(400, 65, 'WIND', { font: '10px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.windText = this.scene.add.text(400, 78, '0', { font: 'bold 16px monospace', fill: textColor }).setOrigin(0.5, 0.5);
        this.windArrow = this.scene.add.graphics();
        this.container.add([this.windLabel, this.windText, this.windArrow]);

        this.createDOMButtons();

        this.turnIndicator = this.scene.add.text(400, 130, 'YOUR TURN', { font: 'bold 20px monospace', fill: '#ffff00' }).setOrigin(0.5, 0.5);
        this.container.add(this.turnIndicator);
        this.statusText = this.scene.add.text(400, 250, '', { font: 'bold 32px monospace', fill: '#ff00ff' }).setOrigin(0.5, 0.5).setVisible(false);
        this.container.add(this.statusText);

        this.gameOverOverlay = this.scene.add.container(0, 0).setVisible(false);
        const bg = this.scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
        
        const winText = document.createElement('div');
        winText.id = 'game-over-title';
        winText.style.cssText = 'color: #00ffff; font-family: monospace; font-weight: bold; font-size: 48px; text-align: center; width: 800px;';
        this.winTextDOM = winText;
        this.winText = this.scene.add.dom(400, 250, winText).setOrigin(0.5, 0.5);

        const subText = document.createElement('div');
        subText.id = 'game-over-subtext';
        subText.style.cssText = 'color: #ffffff; font-family: monospace; font-size: 18px; text-align: center; width: 800px; margin-top: 10px;';
        subText.innerText = 'GAME OVER';
        this.gameOverSubtext = this.scene.add.dom(400, 320, subText).setOrigin(0.5, 0.5);
        
        const playAgainBtn = document.createElement('button');
        playAgainBtn.innerText = 'PLAY AGAIN';
        playAgainBtn.id = 'btn-play-again';
        playAgainBtn.style.cssText = `
            padding: 10px 20px;
            background: #333;
            color: #ffff00;
            border: 2px solid #ffff00;
            font-family: monospace;
            font-weight: bold;
            font-size: 24px;
            cursor: pointer;
            pointer-events: auto;
        `;
        playAgainBtn.onclick = () => {
            this.playAgainBtn.setVisible(false);
            this.scene.events.emit('play-again');
        };
        this.playAgainBtn = this.scene.add.dom(400, 380, playAgainBtn).setOrigin(0.5, 0.5);

        const statusText = document.createElement('div');
        statusText.id = 'play-again-status';
        statusText.style.cssText = 'color: #00ff00; font-family: monospace; font-size: 16px; text-align: center; width: 800px; margin-top: 10px;';
        this.playAgainStatus = this.scene.add.dom(400, 420, statusText).setOrigin(0.5, 0.5);

        this.gameOverOverlay.add([bg, this.winText, this.gameOverSubtext, this.playAgainBtn, this.playAgainStatus]);
        this.container.add(this.gameOverOverlay);
    }

    createDOMButtons() {
        this.domButtons = {};
        const configs = [
            { id: 'angle-down', text: '-' },
            { id: 'angle-up', text: '+' },
            { id: 'power-down', text: '-' },
            { id: 'power-up', text: '+' },
            { id: 'fire', text: 'FIRE' }
        ];

        configs.forEach(cfg => {
            const btn = document.createElement('button');
            btn.id = `btn-${cfg.id}`;
            btn.className = 'hud-button';
            btn.innerText = cfg.text;
            btn.setAttribute('data-testid', cfg.id);
            btn.style.cssText = `
                width: 32px;
                height: 32px;
                background: #111;
                color: #00ffff;
                border: 1px solid #00ffff;
                font-family: monospace;
                font-weight: bold;
                font-size: 18px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
                pointer-events: auto;
            `;

            if (cfg.id === 'fire') {
                btn.style.width = '100px';
                btn.style.height = '35px';
                btn.style.background = '#400';
                btn.style.color = '#ff4444';
                btn.style.border = '2px solid #ff4444';
                btn.style.fontSize = '20px';
            }

            const start = (e) => { 
                e.preventDefault(); 
                this.buttonStates[cfg.id] = true; 
            };
            const stop = (e) => { 
                e.preventDefault(); 
                this.buttonStates[cfg.id] = false; 
            };

            btn.addEventListener('mousedown', start);
            btn.addEventListener('touchstart', start, { passive: false });
            
            if (cfg.id !== 'fire') {
                btn.addEventListener('mouseup', stop);
                btn.addEventListener('mouseleave', stop);
                btn.addEventListener('touchend', stop);
            }

            const domObj = this.scene.add.dom(0, 0, btn).setOrigin(0.5, 0.5).setScrollFactor(0);
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

        if (!isLocalTurn || !isAiming) {
            this.buttonStates['fire'] = false;
        }

        this.updateHealthBar(this.p1HealthBar, 20, 35, simulation.tanks[0].health, 12);
        this.updateHealthBar(this.p2HealthBar, 800 - 220, 35, simulation.tanks[1].health, 12);

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
            this.windArrow.lineBetween(400, 90, xEnd, 90);
            if (isRight) this.windArrow.fillTriangle(xEnd, 90, xEnd - 6, 90 - 3, xEnd - 6, 90 + 3);
            else this.windArrow.fillTriangle(xEnd, 90, xEnd + 6, 90 - 3, xEnd + 6, 90 + 3);
        }

        // Update stats
        simulation.tanks.forEach((tank, idx) => {
            const angleTxt = idx === 0 ? this.p1AngleText : this.p2AngleText;
            const powerTxt = idx === 0 ? this.p1PowerText : this.p2PowerText;
            angleTxt.setText(`ANG: ${tank.aimAngle}°`);
            powerTxt.setText(`PWR: ${tank.aimPower}`);
            
            const color = (idx === activePlayerIndex && isAiming) ? '#ffff00' : '#00ffff';
            angleTxt.setFill(color);
            powerTxt.setFill(color);
        });
        
        if (this.domButtons) {
            const show = isLocalTurn && isAiming;
            Object.keys(this.domButtons).forEach(id => {
                const domObj = this.domButtons[id];
                domObj.setVisible(show);
                if (show) {
                    const isP1 = activePlayerIndex === 0;
                    // Put adjustment buttons next to the stats
                    if (id === 'angle-down') domObj.setPosition(isP1 ? 135 : 665, 67);
                    if (id === 'angle-up') domObj.setPosition(isP1 ? 170 : 630, 67);
                    if (id === 'power-down') domObj.setPosition(isP1 ? 135 : 665, 102);
                    if (id === 'power-up') domObj.setPosition(isP1 ? 170 : 630, 102);
                    
                    // Fire button right of the +- buttons
                    if (id === 'fire') domObj.setPosition(isP1 ? 250 : 540, 85);
                }
            });
        }

        if (isAiming) {
            this.turnIndicator.setVisible(true).setText(isLocalTurn ? 'YOUR TURN' : "OPPONENT'S TURN").setFill(isLocalTurn ? '#ffff00' : '#888888');
        } else {
            this.turnIndicator.setVisible(false);
        }

        if (rules.state === GameState.GAME_OVER) {
            this.gameOverOverlay.setVisible(true);
            const winnerText = rules.winner === -1 ? 'DRAW!' : (rules.winner === -2 ? 'MATCH ABORTED' : `PLAYER ${rules.winner + 1} WINS!`);
            this.winText.node.innerText = winnerText;
            if (rules.winner === -2) {
                this.playAgainBtn.setVisible(false);
            }
        } else {
            this.gameOverOverlay.setVisible(false);
        }
    }

    updateHealthBar(graphics, x, y, health, height = 15) {
        graphics.clear();
        if (health <= 0) return;
        let color = health < 30 ? 0xff0000 : (health < 60 ? 0xffff00 : 0x00ff00);
        graphics.fillStyle(color).fillRect(x, y, (health / 100) * 200, height);
    }

    showStatus(text, duration = 2000) {
        this.statusText.setText(text).setVisible(true);
        if (this.statusTimer) this.statusTimer.remove();
        this.statusTimer = this.scene.time.delayedCall(duration, () => this.statusText.setVisible(false));
    }
}
