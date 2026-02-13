# Tank Wars (Deterministic P2P Artillery)

A deterministic, peer-to-peer artillery game built with Phaser and WebRTC. Inspired by classic artillery games, featuring a neon vector aesthetic and perfectly synchronized physics.

## Features

- **Deterministic Simulation**: Lockstep synchronization ensures both players see the exact same physics and outcomes.
- **P2P Networking**: Direct connection between players using WebRTC (no game server required).
- **Fixed-Point Math**: Custom math library to ensure cross-platform determinism.
- **Neon Aesthetic**: Glowing vector graphics with screen-space effects.
- **Manual Signaling**: Easy to connect even without a signaling server.

## How to Play

### Hosting a Game
1. Open the game and click **HOST GAME**.
2. Copy the generated **Offer** string.
3. Send this string to your opponent (via chat, email, etc.).
4. Wait for your opponent to send back an **Answer** string.
5. Paste their Answer into the box and click **Connect**.

### Joining a Game
1. Open the game and click **JOIN GAME**.
2. Paste the **Offer** string sent by the host.
3. Click **Create Answer**.
4. Copy the generated **Answer** string and send it back to the host.
5. The game will start automatically once the host connects.

### Controls
- **Left/Right Arrows**: Adjust firing angle.
- **Up/Down Arrows**: Adjust firing power.
- **Spacebar**: Fire projectile.

## Technical Details

### Determinism
The simulation runs at a fixed 60Hz. All physics calculations use fixed-point arithmetic (1000x scale) to avoid floating-point drift between different browsers or operating systems.

### Networking
WebRTC DataChannels are used for low-latency input exchange. We use a manual signaling flow to remain entirely serverless. 

**Note on Connectivity (NAT/Firewall):**
This game uses Google's public STUN servers to discover your network address. However, it does **not** include a TURN server (relay).
- Connection will work on most home networks and mobile hotspots.
- Connection may fail on restrictive corporate or university networks that require a TURN relay.
- If you see "ICE: failed" or the candidate count stays at 0, your network might be blocking the P2P connection.

## Development

### Prerequisites
- Node.js (v18+)
- npm

### Setup
```bash
npm install
```

### Run Locally
```bash
npm run dev
```

### Testing
The project includes a suite of deterministic logic tests and input verification tests.
```bash
npm test
```

### Build for Production
```bash
npm run build
```

## License
MIT
