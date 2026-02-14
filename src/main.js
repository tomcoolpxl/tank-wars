import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { WIDTH, HEIGHT } from './simulation/constants.js';

const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: 'game-container',
    dom: {
        createContainer: true
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [LobbyScene, GameScene]
};

const game = new Phaser.Game(config);
window.game = game;
