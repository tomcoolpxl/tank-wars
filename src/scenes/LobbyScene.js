import Phaser from 'phaser';
import { NetworkManager } from '../net/webrtc.js';

export class LobbyScene extends Phaser.Scene {
    constructor() {
        super('LobbyScene');
        this.networkManager = new NetworkManager();
        this.syncInterval = null;
        this.gameStarting = false;
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
                .ui-card { color: #0f0; font-family: monospace; background: rgba(0,0,0,0.9); padding: 25px; border: 2px solid #0f0; width: 500px; box-shadow: 0 0 20px rgba(0,255,0,0.2); }
                .input-field { width: 100%; padding: 12px; background: #111; color: #0f0; border: 1px solid #0f0; margin: 10px 0; box-sizing: border-box; font-family: monospace; font-size: 16px; }
                .primary-btn { background: #000; color: #0f0; border: 1px solid #0f0; padding: 15px; cursor: pointer; width: 100%; font-size: 18px; font-family: monospace; margin-bottom: 10px; }
                .secondary-btn { background: #000; color: #ff0; border: 1px solid #ff0; padding: 10px; cursor: pointer; width: 48%; font-family: monospace; font-size: 12px; }
            </style>
            <div id="lobby-ui" class="ui-card">
                <div id="initial-actions">
                    <button id="btn-host" class="primary-btn">HOST NEW GAME</button>
                    <button id="btn-join" class="primary-btn">JOIN GAME</button>
                </div>

                <div id="host-section" style="display: none; margin-top: 10px; text-align: center;">
                    <p style="margin: 10px 0; font-size: 16px; color: #0f0;">YOU ARE HOSTING</p>
                    <div style="background: #111; border: 1px dashed #0f0; padding: 10px; margin: 15px 0;">
                        <p style="margin: 0 0 5px 0; color: #888; font-size: 12px;">ROOM ID</p>
                        <div id="room-id-display" style="font-size: 24px; letter-spacing: 2px; color: #fff;">--------</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                        <button id="btn-copy-id" class="secondary-btn">COPY ID</button>
                        <button id="btn-copy-link" class="secondary-btn">COPY INVITE LINK</button>
                    </div>
                    <p id="host-waiting-msg" style="margin: 10px 0; color: #0f0; animation: blink 1s infinite;">Waiting for opponent...</p>
                </div>

                <div id="join-section" style="display: none; margin-top: 10px;">
                    <p style="margin: 5px 0;">Enter Host Room ID:</p>
                    <input type="text" id="join-id-input" class="input-field" placeholder="Paste ID here...">
                    <button id="btn-connect-joiner" class="primary-btn" style="margin-top: 10px;">CONNECT TO HOST</button>
                </div>

                <div id="status" style="margin-top: 20px; border-top: 1px solid #0f0; padding-top: 15px;">
                    <div id="status-text" style="font-size: 14px; color: #0f0;">Status: Ready</div>
                    <button id="btn-cancel" style="margin-top: 15px; background: #000; color: #f44; border: 1px solid #f44; cursor: pointer; display: none; padding: 10px; width: 100%; font-family: monospace;">CANCEL / BACK</button>
                </div>
            </div>
            <style> @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } } </style>
        `;

        this.add.dom(width / 2, 110).createFromHTML(lobbyHtml).setOrigin(0.5, 0);

        const btnHost = document.getElementById('btn-host');
        const btnJoin = document.getElementById('btn-join');
        const hostSection = document.getElementById('host-section');
        const joinSection = document.getElementById('join-section');
        const initialActions = document.getElementById('initial-actions');
        const statusText = document.getElementById('status-text');
        const btnCancel = document.getElementById('btn-cancel');
        const roomIdDisplay = document.getElementById('room-id-display');
        const joinIdInput = document.getElementById('join-id-input');

        const cleanup = () => {
            if (this.syncInterval) clearInterval(this.syncInterval);
            window.location.hash = '';
            this.gameStarting = false;
        };

        this.events.on('shutdown', cleanup);

        const checkHash = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#join=')) {
                const hostId = hash.substring(6);
                this.prepareJoinUI(hostId);
                this.performJoin(hostId);
            }
        };

        checkHash();
        window.addEventListener('hashchange', checkHash);

        btnCancel.addEventListener('click', () => {
            this.networkManager.disconnect(); // Manual disconnect
            cleanup();
            this.scene.restart();
        });

        btnHost.addEventListener('click', async () => {
            initialActions.style.display = 'none';
            hostSection.style.display = 'block';
            btnCancel.style.display = 'block';
            statusText.innerText = 'Status: Registering...';
            try {
                const id = await this.networkManager.host();
                roomIdDisplay.innerText = id;
                statusText.innerText = 'Status: Online';
                document.getElementById('btn-copy-id').onclick = () => {
                    navigator.clipboard.writeText(id);
                    if (!this.gameStarting) statusText.innerText = 'Status: ID Copied!';
                };
                document.getElementById('btn-copy-link').onclick = () => {
                    const url = `${window.location.origin}${window.location.pathname}#join=${id}`;
                    navigator.clipboard.writeText(url);
                    if (!this.gameStarting) statusText.innerText = 'Status: Link Copied!';
                };
            } catch (err) {
                statusText.innerText = 'Status: Registration Error';
                statusText.style.color = '#f00';
            }
        });

        btnJoin.addEventListener('click', () => {
            initialActions.style.display = 'none';
            joinSection.style.display = 'block';
            btnCancel.style.display = 'block';
            statusText.innerText = 'Status: Enter Room ID';
        });

        document.getElementById('btn-connect-joiner').addEventListener('click', () => {
            const hostId = joinIdInput.value.trim();
            if (hostId) this.performJoin(hostId);
        });

        this.networkManager.onConnectionStateChange((state) => {
            if (state === 'connected') {
                statusText.style.color = '#0f0';
                statusText.innerText = 'Status: CONNECTED! Syncing...';
                if (this.networkManager.isHost) {
                    const seed = Math.floor(Math.random() * 0xFFFFFFFF);
                    if (this.syncInterval) clearInterval(this.syncInterval);
                    this.syncInterval = setInterval(() => {
                        if (this.networkManager.connection && this.networkManager.connection.open) {
                            this.networkManager.send({ type: 'MATCH_INIT', seed });
                        }
                    }, 500);
                }
            } else if (state === 'closed' || state === 'failed') {
                statusText.style.color = '#f00';
                statusText.innerText = `Status: ${state.toUpperCase()}`;
            }
        });

        this.networkManager.onMessage((msg) => {
            if (msg.type === 'MATCH_INIT' && !this.networkManager.isHost) {
                if (this.gameStarting) return;
                this.networkManager.send({ type: 'ACK_MATCH_INIT', seed: msg.seed });
                this.startGame(msg.seed);
            } else if (msg.type === 'ACK_MATCH_INIT' && this.networkManager.isHost) {
                if (this.gameStarting) return;
                if (this.syncInterval) {
                    clearInterval(this.syncInterval);
                    this.syncInterval = null;
                }
                this.startGame(msg.seed);
            }
        });
    }

    prepareJoinUI(hostId) {
        const joinSection = document.getElementById('join-section');
        const initialActions = document.getElementById('initial-actions');
        const btnCancel = document.getElementById('btn-cancel');
        const joinIdInput = document.getElementById('join-id-input');
        if (initialActions) initialActions.style.display = 'none';
        if (joinSection) joinSection.style.display = 'block';
        if (btnCancel) btnCancel.style.display = 'block';
        if (joinIdInput) joinIdInput.value = hostId;
    }

    async performJoin(hostId) {
        document.getElementById('status-text').innerText = 'Status: Connecting...';
        try {
            await this.networkManager.join(hostId);
        } catch (err) {
            document.getElementById('status-text').innerText = 'Status: Connection Failed';
        }
    }

    startGame(seed) {
        if (this.gameStarting) return;
        this.gameStarting = true;
        document.getElementById('status-text').innerText = 'Status: STARTING GAME...';
        this.time.delayedCall(300, () => {
            this.scene.start('GameScene', { 
                networkManager: this.networkManager, 
                isHost: this.networkManager.isHost, 
                seed: seed 
            });
        });
    }
}
