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
            <div id="lobby-ui" style="color: #0f0; font-family: monospace; background: rgba(0,0,0,0.9); padding: 25px; border: 2px solid #0f0; width: 500px; box-shadow: 0 0 20px rgba(0,255,0,0.2);">
                <div id="initial-actions">
                    <button id="btn-host" style="background: #000; color: #0f0; border: 1px solid #0f0; padding: 15px; cursor: pointer; width: 100%; font-size: 18px; margin-bottom: 10px;">HOST NEW GAME</button>
                    <button id="btn-join" style="background: #000; color: #0f0; border: 1px solid #0f0; padding: 15px; cursor: pointer; width: 100%; font-size: 18px;">JOIN GAME</button>
                </div>

                <div id="host-section" style="display: none; margin-top: 10px; text-align: center;">
                    <p style="margin: 10px 0; font-size: 16px;">GAME READY!</p>
                    <p style="margin: 5px 0; color: #888;">Share this link with your opponent:</p>
                    <button id="btn-copy-link" style="background: #000; color: #ff0; border: 1px solid #ff0; padding: 12px; cursor: pointer; width: 100%; margin: 10px 0; font-weight: bold;">COPY INVITE LINK</button>
                    <p style="margin: 10px 0; color: #0f0;">Waiting for opponent to connect...</p>
                </div>

                <div id="join-section" style="display: none; margin-top: 10px;">
                    <p style="margin: 5px 0;">Enter Host Room ID:</p>
                    <input type="text" id="join-id-input" style="width: 100%; padding: 10px; background: #111; color: #0f0; border: 1px solid #0f0; margin-bottom: 10px;" placeholder="Paste Room ID here...">
                    <button id="btn-connect-joiner" style="background: #000; color: #0f0; border: 1px solid #0f0; padding: 10px; cursor: pointer; width: 100%;">CONNECT</button>
                </div>

                <div id="status" style="margin-top: 20px; border-top: 1px solid #0f0; padding-top: 15px;">
                    <div id="status-text" style="font-size: 14px;">Waiting...</div>
                    <button id="btn-cancel" style="margin-top: 15px; background: #000; color: #f44; border: 1px solid #f44; cursor: pointer; display: none; padding: 5px 10px; width: 100%;">CANCEL</button>
                </div>
            </div>
        `;

        this.add.dom(width / 2, 110).createFromHTML(lobbyHtml).setOrigin(0.5, 0);

        const btnHost = document.getElementById('btn-host');
        const btnJoin = document.getElementById('btn-join');
        const hostSection = document.getElementById('host-section');
        const joinSection = document.getElementById('join-section');
        const initialActions = document.getElementById('initial-actions');
        const statusText = document.getElementById('status-text');
        const btnCancel = document.getElementById('btn-cancel');

        const checkHash = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#join=')) {
                const hostId = hash.substring(6);
                this.autoJoin(hostId);
            }
        };

        checkHash();
        window.addEventListener('hashchange', checkHash);
        
        this.events.on('shutdown', () => {
            window.removeEventListener('hashchange', checkHash);
        });

        btnCancel.addEventListener('click', () => {
            this.networkManager.disconnect();
            this.scene.restart();
            window.location.hash = '';
        });

        btnHost.addEventListener('click', async () => {
            initialActions.style.display = 'none';
            hostSection.style.display = 'block';
            btnCancel.style.display = 'block';
            statusText.innerText = 'Registering on network...';

            try {
                const id = await this.networkManager.host();
                statusText.innerText = 'Online. Share the link!';
                
                document.getElementById('btn-copy-link').onclick = () => {
                    const url = `${window.location.origin}${window.location.pathname}#join=${id}`;
                    navigator.clipboard.writeText(url);
                    statusText.innerText = 'Link copied to clipboard!';
                };
            } catch (err) {
                statusText.innerText = 'Error: Could not register room';
                statusText.style.color = '#f00';
            }
        });

        btnJoin.addEventListener('click', () => {
            initialActions.style.display = 'none';
            joinSection.style.display = 'block';
            btnCancel.style.display = 'block';
            statusText.innerText = 'Enter Room ID';
        });

        document.getElementById('btn-connect-joiner').addEventListener('click', () => {
            const hostId = document.getElementById('join-id-input').value.trim();
            if (hostId) {
                this.autoJoin(hostId);
            }
        });

        this.networkManager.onConnectionStateChange((state) => {
            statusText.innerText = `Status: ${state.toUpperCase()}`;
            if (state === 'connected') {
                statusText.style.color = '#0f0';
                statusText.innerText = 'CONNECTED! Syncing...';
                
                if (this.networkManager.isHost) {
                    // Give WebRTC a tiny bit of time to settle data flow
                    this.time.delayedCall(500, () => {
                        const seed = Math.floor(Math.random() * 0xFFFFFFFF);
                        console.log('Sending MATCH_INIT with seed:', seed);
                        this.networkManager.send({
                            type: 'MATCH_INIT',
                            seed: seed,
                            protocolVersion: '1.0'
                        });
                        this.startGame(seed);
                    });
                }
            } else if (state === 'failed' || state === 'closed') {
                statusText.style.color = '#f00';
            }
        });

        // For Joiner: listen for MATCH_INIT
        if (!this.networkManager.isHost) {
            this.networkManager.onMessage((msg) => {
                if (msg.type === 'MATCH_INIT') {
                    console.log('Received MATCH_INIT with seed:', msg.seed);
                    this.startGame(msg.seed);
                }
            });
        }
    }

    async autoJoin(hostId) {
        const initialActions = document.getElementById('initial-actions');
        const joinSection = document.getElementById('join-section');
        const btnCancel = document.getElementById('btn-cancel');
        const statusText = document.getElementById('status-text');

        if (initialActions) initialActions.style.display = 'none';
        if (joinSection) joinSection.style.display = 'block';
        if (btnCancel) btnCancel.style.display = 'block';
        
        const input = document.getElementById('join-id-input');
        if (input) input.value = hostId;

        // Ensure we listen for MATCH_INIT even in autoJoin flow
        this.networkManager.onMessage((msg) => {
            if (msg.type === 'MATCH_INIT') {
                console.log('Received MATCH_INIT in autoJoin with seed:', msg.seed);
                this.startGame(msg.seed);
            }
        });

        statusText.innerText = 'Connecting to host...';
        try {
            await this.networkManager.join(hostId);
        } catch (err) {
            statusText.innerText = 'Error: Connection failed';
            statusText.style.color = '#f00';
        }
    }

    startGame(seed) {
        const statusText = document.getElementById('status-text');
        if (statusText) statusText.innerText = 'STARTING GAME...';
        
        this.time.delayedCall(200, () => {
            this.scene.start('GameScene', { 
                networkManager: this.networkManager, 
                isHost: this.networkManager.isHost, 
                seed: seed 
            });
        });
    }
}
