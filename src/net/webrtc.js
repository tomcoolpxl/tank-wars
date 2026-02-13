export class NetworkManager {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.onMessageCallback = null;
        this.onConnectionStateChangeCallback = null;
        this.onIceUpdateCallback = null;
        this.isHost = false;
        this.iceCandidatesCount = 0;

        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    async createOffer() {
        this.isHost = true;
        this.setupPeerConnection();
        this.dataChannel = this.peerConnection.createDataChannel('game-channel', {
            ordered: true
        });
        this.setupDataChannel(this.dataChannel);

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.peerConnection.removeEventListener('icecandidate', checkState);
                resolve(JSON.stringify(this.peerConnection.localDescription));
            }, 2000);

            const checkState = () => {
                if (this.peerConnection.iceGatheringState === 'complete') {
                    clearTimeout(timeout);
                    this.peerConnection.removeEventListener('icecandidate', checkState);
                    resolve(JSON.stringify(this.peerConnection.localDescription));
                }
            };

            if (this.peerConnection.iceGatheringState === 'complete') {
                clearTimeout(timeout);
                resolve(JSON.stringify(this.peerConnection.localDescription));
            } else {
                this.peerConnection.addEventListener('icecandidate', checkState);
            }
        });
    }

    async createAnswer(offerJson) {
        this.isHost = false;
        this.setupPeerConnection();
        
        const offer = JSON.parse(offerJson);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.peerConnection.removeEventListener('icecandidate', checkState);
                resolve(JSON.stringify(this.peerConnection.localDescription));
            }, 2000);

            const checkState = () => {
                if (this.peerConnection.iceGatheringState === 'complete') {
                    clearTimeout(timeout);
                    this.peerConnection.removeEventListener('icecandidate', checkState);
                    resolve(JSON.stringify(this.peerConnection.localDescription));
                }
            };

            if (this.peerConnection.iceGatheringState === 'complete') {
                clearTimeout(timeout);
                resolve(JSON.stringify(this.peerConnection.localDescription));
            } else {
                this.peerConnection.addEventListener('icecandidate', checkState);
            }
        });
    }

    async acceptAnswer(answerJson) {
        const answer = JSON.parse(answerJson);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.config);
        this.iceCandidatesCount = 0;

        this.peerConnection.onconnectionstatechange = () => {
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback(this.peerConnection.connectionState);
            }
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.iceCandidatesCount++;
            }
            if (this.onIceUpdateCallback) {
                this.onIceUpdateCallback(this.peerConnection.iceGatheringState, this.iceCandidatesCount);
            }
        };

        this.peerConnection.onicegatheringstatechange = () => {
            if (this.onIceUpdateCallback) {
                this.onIceUpdateCallback(this.peerConnection.iceGatheringState, this.iceCandidatesCount);
            }
        };

        if (!this.isHost) {
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannel(this.dataChannel);
            };
        }
    }

    setupDataChannel(channel) {
        channel.onopen = () => {
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('connected');
            }
        };

        channel.onclose = () => {
            if (this.onConnectionStateChangeCallback) {
                this.onConnectionStateChangeCallback('closed');
            }
        };

        channel.onmessage = (event) => {
            if (this.onMessageCallback) {
                const data = JSON.parse(event.data);
                this.onMessageCallback(data);
            }
        };
    }

    send(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(message));
        }
    }

    onMessage(callback) {
        this.onMessageCallback = callback;
    }

    onConnectionStateChange(callback) {
        this.onConnectionStateChangeCallback = callback;
    }

    onIceUpdate(callback) {
        this.onIceUpdateCallback = callback;
    }
}
