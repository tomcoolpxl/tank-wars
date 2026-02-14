import { Peer } from 'peerjs';

export class NetworkManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.onMessageCallback = null;
        this.onConnectionStateChangeCallback = null;
        this.isHost = false;
        this.peerId = null;
    }

    /**
     * Initialize PeerJS and start hosting.
     * Returns the Peer ID.
     */
    async host() {
        this.isHost = true;
        return new Promise((resolve, reject) => {
            this.peer = new Peer();

            this.peer.on('open', (id) => {
                this.peerId = id;
                console.log('Peer ID:', id);
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                // If we already have a connection, we might want to reject new ones
                // but for this game we'll just accept the latest.
                this.connection = conn;
                this.setupConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (this.onConnectionStateChangeCallback) {
                    this.onConnectionStateChangeCallback('failed');
                }
                reject(err);
            });
        });
    }

    /**
     * Connect to a host using their Peer ID.
     */
    async join(hostId) {
        this.isHost = false;
        return new Promise((resolve, reject) => {
            this.peer = new Peer();

            this.peer.on('open', (id) => {
                this.peerId = id;
                const conn = this.peer.connect(hostId, {
                    reliable: true
                });
                this.connection = conn;
                this.setupConnection(conn);
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (this.onConnectionStateChangeCallback) {
                    this.onConnectionStateChangeCallback('failed');
                }
                reject(err);
            });
        });
    }

    setupConnection(conn) {
        conn.on('open', () => {
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('connected');
            }
        });

        conn.on('data', (data) => {
            if (this.onMessageCallback) {
                this.onMessageCallback(data);
            }
        });

        conn.on('close', () => {
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('closed');
            }
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('failed');
            }
        });
    }

    send(message) {
        if (this.connection && this.connection.open) {
            this.connection.send(message);
        }
    }

    onMessage(callback) {
        this.onMessageCallback = callback;
    }

    onConnectionStateChange(callback) {
        this.onConnectionStateChangeCallback = callback;
    }

    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
    }
}
