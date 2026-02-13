import Phaser from 'phaser';
import { NetworkManager } from '../net/webrtc.js';

export class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
        this.networkManager = new NetworkManager();
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.text(width / 2, 50, 'TANK WARS', {
            fontSize: '48px',
            fill: '#0f0',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        const lobbyHtml = `
            <div id="lobby-ui" style="color: #0f0; font-family: monospace; background: rgba(0,0,0,0.8); padding: 20px; border: 2px solid #0f0; width: 600px;">
                <div id="initial-actions">
                    <button id="btn-host" style="background: #000; color: #0f0; border: 1px solid #0f0; padding: 10px; cursor: pointer;">HOST GAME</button>
                    <button id="btn-join" style="background: #000; color: #0f0; border: 1px solid #0f0; padding: 10px; cursor: pointer;">JOIN GAME</button>
                </div>

                <div id="host-section" style="display: none; margin-top: 20px;">
                    <p>1. Copy this offer and send it to your opponent:</p>
                    <textarea id="offer-out" readonly style="width: 100%; height: 100px; background: #111; color: #0f0; border: 1px solid #0f0;"></textarea>
                    <button id="btn-copy-offer" style="margin-top: 5px; background: #000; color: #0f0; border: 1px solid #0f0; cursor: pointer;">Copy Offer</button>
                    <p style="margin-top: 20px;">2. Paste the answer from your opponent here:</p>
                    <textarea id="answer-in" style="width: 100%; height: 100px; background: #111; color: #0f0; border: 1px solid #0f0;"></textarea>
                    <button id="btn-connect-host" style="margin-top: 5px; background: #000; color: #0f0; border: 1px solid #0f0; cursor: pointer;">Connect</button>
                </div>

                <div id="join-section" style="display: none; margin-top: 20px;">
                    <p>1. Paste the offer from the host here:</p>
                    <textarea id="offer-in" style="width: 100%; height: 100px; background: #111; color: #0f0; border: 1px solid #0f0;"></textarea>
                    <button id="btn-create-answer" style="margin-top: 5px; background: #000; color: #0f0; border: 1px solid #0f0; cursor: pointer;">Create Answer</button>
                    <div id="answer-section" style="display: none; margin-top: 20px;">
                        <p>2. Copy this answer and send it back to the host:</p>
                        <textarea id="answer-out" readonly style="width: 100%; height: 100px; background: #111; color: #0f0; border: 1px solid #0f0;"></textarea>
                        <button id="btn-copy-answer" style="margin-top: 5px; background: #000; color: #0f0; border: 1px solid #0f0; cursor: pointer;">Copy Answer</button>
                    </div>
                </div>

                <div id="status" style="margin-top: 20px; border-top: 1px solid #0f0; padding-top: 10px;">
                    Status: <span id="status-text">Waiting...</span>
                </div>
            </div>
        `;

        const domElement = this.add.dom(width / 2, height / 2).createFromHTML(lobbyHtml);

        const btnHost = document.getElementById('btn-host');
        const btnJoin = document.getElementById('btn-join');
        const hostSection = document.getElementById('host-section');
        const joinSection = document.getElementById('join-section');
        const initialActions = document.getElementById('initial-actions');
        const statusText = document.getElementById('status-text');

        btnHost.addEventListener('click', async () => {
            initialActions.style.display = 'none';
            hostSection.style.display = 'block';
            statusText.innerText = 'Generating offer...';
            
            const offer = await this.networkManager.createOffer();
            document.getElementById('offer-out').value = offer;
            statusText.innerText = 'Waiting for answer...';
        });

        btnJoin.addEventListener('click', () => {
            initialActions.style.display = 'none';
            joinSection.style.display = 'block';
            statusText.innerText = 'Paste offer and click "Create Answer"';
        });

        document.getElementById('btn-copy-offer').addEventListener('click', () => {
            const copyText = document.getElementById('offer-out');
            copyText.select();
            navigator.clipboard.writeText(copyText.value);
            statusText.innerText = 'Offer copied to clipboard!';
        });

        document.getElementById('btn-connect-host').addEventListener('click', async () => {
            const answerText = document.getElementById('answer-in').value;
            try {
                await this.networkManager.acceptAnswer(answerText);
                statusText.innerText = 'Connecting...';
            } catch (e) {
                statusText.innerText = 'Error: Invalid answer';
            }
        });

        document.getElementById('btn-create-answer').addEventListener('click', async () => {
            const offerText = document.getElementById('offer-in').value;
            try {
                statusText.innerText = 'Generating answer...';
                const answer = await this.networkManager.createAnswer(offerText);
                document.getElementById('answer-out').value = answer;
                document.getElementById('answer-section').style.display = 'block';
                statusText.innerText = 'Answer generated. Send it to the host.';
            } catch (e) {
                statusText.innerText = 'Error: Invalid offer';
            }
        });

        document.getElementById('btn-copy-answer').addEventListener('click', () => {
            const copyText = document.getElementById('answer-out');
            copyText.select();
            navigator.clipboard.writeText(copyText.value);
            statusText.innerText = 'Answer copied to clipboard!';
        });

        this.networkManager.onConnectionStateChange((state) => {
            statusText.innerText = `Connection: ${state}`;
            if (state === 'connected') {
                statusText.innerText = 'CONNECTED! Starting game...';
                this.startGame();
            }
        });
    }

    startGame() {
        if (this.networkManager.isHost) {
            // Generate seed and send MATCH_INIT
            const seed = Math.floor(Math.random() * 0xFFFFFFFF);
            this.networkManager.send({
                type: 'MATCH_INIT',
                seed: seed,
                protocolVersion: '1.0'
            });
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene', { 
                    networkManager: this.networkManager, 
                    isHost: true, 
                    seed: seed 
                });
            });
        } else {
            this.networkManager.onMessage((msg) => {
                if (msg.type === 'MATCH_INIT') {
                    this.scene.start('GameScene', { 
                        networkManager: this.networkManager, 
                        isHost: false, 
                        seed: msg.seed 
                    });
                }
            });
        }
    }
}
