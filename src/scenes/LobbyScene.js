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
            <style>
                #lobby-ui::-webkit-scrollbar { width: 8px; }
                #lobby-ui::-webkit-scrollbar-track { background: #111; }
                #lobby-ui::-webkit-scrollbar-thumb { background: #0f0; }
                #lobby-ui button:hover { background: #030 !important; }
            </style>
            <div id="lobby-ui" style="color: #0f0; font-family: monospace; background: rgba(0,0,0,0.9); padding: 15px; border: 2px solid #0f0; width: 600px; max-height: 460px; overflow-y: auto; box-shadow: 0 0 20px rgba(0,255,0,0.2);">
                <div id="initial-actions">
                    <button id="btn-host" style="background: #000; color: #0f0; border: 1px solid #0f0; padding: 10px; cursor: pointer;">HOST GAME</button>
                    <button id="btn-join" style="background: #000; color: #0f0; border: 1px solid #0f0; padding: 10px; cursor: pointer;">JOIN GAME</button>
                </div>

                <div id="host-section" style="display: none; margin-top: 10px;">
                    <p style="margin: 5px 0;">1. Copy this offer and send it to your opponent:</p>
                    <textarea id="offer-out" readonly style="width: 100%; height: 60px; background: #111; color: #0f0; border: 1px solid #0f0; font-size: 12px;"></textarea>
                    <div style="margin-top: 5px;">
                        <button id="btn-copy-offer" style="background: #000; color: #0f0; border: 1px solid #0f0; padding: 5px; cursor: pointer;">Copy Offer</button>
                        <button id="btn-copy-link" style="background: #000; color: #ff0; border: 1px solid #ff0; padding: 5px; cursor: pointer;">Copy Invite Link</button>
                    </div>
                    <p style="margin: 10px 0 5px 0;">2. Paste the answer from your opponent here:</p>
                    <textarea id="answer-in" style="width: 100%; height: 60px; background: #111; color: #0f0; border: 1px solid #0f0; font-size: 12px;"></textarea>
                    <button id="btn-connect-host" style="margin-top: 5px; background: #000; color: #0f0; border: 1px solid #0f0; cursor: pointer; padding: 5px 10px;">Connect</button>
                </div>

                <div id="join-section" style="display: none; margin-top: 10px;">
                    <p style="margin: 5px 0;">1. Paste the offer from the host here:</p>
                    <textarea id="offer-in" style="width: 100%; height: 60px; background: #111; color: #0f0; border: 1px solid #0f0; font-size: 12px;"></textarea>
                    <button id="btn-create-answer" style="margin-top: 5px; background: #000; color: #0f0; border: 1px solid #0f0; cursor: pointer; padding: 5px 10px;">Create Answer</button>
                    <div id="answer-section" style="display: none; margin-top: 10px;">
                        <p style="margin: 5px 0;">2. Copy this answer and send it back to the host:</p>
                        <textarea id="answer-out" readonly style="width: 100%; height: 60px; background: #111; color: #0f0; border: 1px solid #0f0; font-size: 12px;"></textarea>
                        <button id="btn-copy-answer" style="margin-top: 5px; background: #000; color: #0f0; border: 1px solid #0f0; cursor: pointer; padding: 5px 10px;">Copy Answer</button>
                    </div>
                </div>

                <div id="status" style="margin-top: 15px; border-top: 1px solid #0f0; padding-top: 10px;">
                    <div>Status: <span id="status-text">Waiting...</span></div>
                    <div style="font-size: 10px; margin-top: 5px; color: #0a0;">
                        ICE: <span id="ice-status">new</span> | Candidates: <span id="ice-count">0</span>
                    </div>
                    <button id="btn-cancel" style="margin-top: 10px; background: #000; color: #f44; border: 1px solid #f44; cursor: pointer; display: none; padding: 5px 10px;">CANCEL</button>
                </div>
            </div>
        `;

        const domElement = this.add.dom(width / 2, 110).createFromHTML(lobbyHtml).setOrigin(0.5, 0);

        const btnHost = document.getElementById('btn-host');
        const btnJoin = document.getElementById('btn-join');
        const hostSection = document.getElementById('host-section');
        const joinSection = document.getElementById('join-section');
        const initialActions = document.getElementById('initial-actions');
        const statusText = document.getElementById('status-text');
        const iceStatus = document.getElementById('ice-status');
        const iceCount = document.getElementById('ice-count');
        const btnCancel = document.getElementById('btn-cancel');

        // Check for offer in URL hash
        const checkHash = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#offer=')) {
                const encodedOffer = hash.substring(7);
                try {
                    const decodedOffer = atob(encodedOffer);
                    initialActions.style.display = 'none';
                    joinSection.style.display = 'block';
                    btnCancel.style.display = 'inline-block';
                    document.getElementById('offer-in').value = decodedOffer;
                    statusText.innerText = 'Offer loaded from link. Click "Create Answer".';
                } catch (e) {
                    console.error('Failed to decode offer from URL');
                }
            }
        };

        checkHash();

        let connectionTimeout = null;
        const startTimeout = () => {
            if (connectionTimeout) clearTimeout(connectionTimeout);
            connectionTimeout = setTimeout(() => {
                if (statusText.innerText.includes('Connecting')) {
                    statusText.innerText = 'Connection timed out. Retrying...';
                    statusText.style.color = '#f88';
                }
            }, 20000);
        };

        const resetUI = () => {
            if (connectionTimeout) clearTimeout(connectionTimeout);
            this.scene.restart();
        };

        btnCancel.addEventListener('click', resetUI);

        this.networkManager.onIceUpdate((state, count) => {
            iceStatus.innerText = state;
            iceCount.innerText = count;
        });

        btnHost.addEventListener('click', async () => {
            initialActions.style.display = 'none';
            hostSection.style.display = 'block';
            btnCancel.style.display = 'inline-block';
            statusText.innerText = 'Generating offer...';
            
            const offer = await this.networkManager.createOffer();
            const offerOut = document.getElementById('offer-out');
            offerOut.value = offer;
            offerOut.dispatchEvent(new Event('input', { bubbles: true }));
            statusText.innerText = 'Waiting for answer...';
        });

        btnJoin.addEventListener('click', () => {
            initialActions.style.display = 'none';
            joinSection.style.display = 'block';
            btnCancel.style.display = 'inline-block';
            statusText.innerText = 'Paste offer and click "Create Answer"';
        });

        document.getElementById('btn-copy-offer').addEventListener('click', () => {
            const copyText = document.getElementById('offer-out');
            copyText.select();
            navigator.clipboard.writeText(copyText.value);
            statusText.innerText = 'Offer copied to clipboard!';
        });

        document.getElementById('btn-copy-link').addEventListener('click', () => {
            const offer = document.getElementById('offer-out').value;
            if (!offer) return;
            const encoded = btoa(offer);
            const url = window.location.origin + window.location.pathname + '#offer=' + encoded;
            navigator.clipboard.writeText(url);
            statusText.innerText = 'Invite link copied to clipboard!';
        });

        document.getElementById('btn-connect-host').addEventListener('click', async () => {
            const answerText = document.getElementById('answer-in').value;
            try {
                statusText.innerText = 'Connecting...';
                startTimeout();
                await this.networkManager.acceptAnswer(answerText);
            } catch (e) {
                statusText.innerText = 'Error: Invalid answer format';
                statusText.style.color = '#f00';
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
                statusText.innerText = 'Error: Invalid offer format';
                statusText.style.color = '#f00';
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
                if (connectionTimeout) clearTimeout(connectionTimeout);
                statusText.innerText = 'CONNECTED! Starting game...';
                statusText.style.color = '#0f0';
                this.startGame();
            } else if (state === 'failed' || state === 'closed') {
                statusText.style.color = '#f00';
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
