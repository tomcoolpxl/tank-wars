# Tank Wars (Deterministic P2P Artillery)

A deterministic, peer-to-peer artillery game built with Phaser and WebRTC. Inspired by classic artillery games, featuring a neon vector aesthetic and perfectly synchronized physics.

## Features

- **Deterministic Simulation**: Lockstep synchronization ensures both players see the exact same physics and outcomes.
- **Automated P2P Networking**: Direct connection between players using PeerJS (WebRTC) with zero-config setup.
- **Fixed-Point Math**: Custom math library to ensure cross-platform determinism.
- **Neon Aesthetic**: Glowing vector graphics with screen-space effects.
- **One-Link Handshake**: Share a single link to connect instantly—no manual SDP exchange required.
- **Session Persistence**: Stay connected after a match ends and start a new game instantly with the same opponent.

## How to Play

### Hosting a Game
1. Open the game and click **HOST NEW GAME**.
2. Wait for your **Room ID** to be generated.
3. Click **COPY INVITE LINK** and send it to your opponent.
4. Keep the tab open; the game starts automatically when they join!
5. After a match ends, click **PLAY AGAIN** to start a new round with the same player.

### Joining a Game
1. Simply click the **Invite Link** sent by the host.
2. The game will automatically connect and synchronize.
3. (Alternatively) Click **JOIN GAME** and paste the host's **Room ID**.

### Controls
- **Left/Right Arrows**: Adjust firing angle.
- **Up/Down Arrows**: Adjust firing power.
- **Spacebar**: Fire projectile.

### Debugging
You can enable detailed debug logs in the browser console by setting global flags:
```javascript
window.DEBUG_SIM = true;     // Simulation events
window.DEBUG_NET = true;     // Networking messages
window.DEBUG_TANK = true;    // Tank physics
window.DEBUG_PROJ = true;    // Projectile physics
window.DEBUG_RULES = true;   // State machine
window.DEBUG_TERRAIN = true; // Terrain changes
window.DEBUG_HUD = true;     // HUD interactions
```

## Technical Details

### Determinism
The simulation runs at a fixed 60Hz. All physics calculations use fixed-point arithmetic (1,000,000x scale) to avoid floating-point drift between different browsers or operating systems.

### Networking
We use **PeerJS** for automated WebRTC signaling. This allows for a serverless P2P experience where players connect via unique Room IDs or invitation links. 

**Handshake & Sync:**
- **Automated Exchange**: When a joiner uses a link, the Offer/Answer exchange happens automatically.
- **Seed Synchronization**: The host generates a shared 32-bit seed upon connection to ensure identical terrain and RNG state.
- **State Validation**: Clients exchange state hashes after every turn to verify perfect synchronization.

## Documentation

For more detailed technical documentation, please refer to the following files in the `docs/` directory:

- [Requirements](docs/REQUIREMENTS.md) - Detailed project requirements and scope.
- [Testing Guide](docs/TESTING.md) - How to run and write tests, including determinism tests.
- [Code Exploration](docs/CODE_EXPLORATION.md) - Deep dive into the architecture and deterministic engine.

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
