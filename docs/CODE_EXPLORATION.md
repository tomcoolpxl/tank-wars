# Tank Wars - Deep Code Exploration

## Architecture Overview

Tank Wars follows a decoupled architecture where the **Deterministic Simulation Core** is strictly separated from the **Phaser Rendering Layer**. This separation is critical for P2P synchronization and determinism.

- **Simulation (`src/simulation/`)**: Pure JavaScript logic. No `Math.random()`, `Date.now()`, or floating-point numbers.
- **Rendering (`src/render/` & `src/scenes/`)**: Phaser 3 components that visualize the simulation state.
- **Networking (`src/net/`)**: Automated PeerJS-based P2P communication.
- **UI/HUD (`src/ui/`)**: Overlay for game stats and status.

---

## 1. Deterministic Simulation Core

The simulation ensures that given the same seed and input sequence, the game state remains identical across all clients.

### Fixed-Point Math (`fixed.js`)
- Uses a scaling factor (1,000,000) for "real" numbers.
- Employs `BigInt` for intermediate calculations to prevent precision loss and overflows.
- Constants like `GRAVITY` are defined in fixed-point.

### Trigonometry LUT (`trigLUT.js`)
- Precomputed sine and cosine values for degrees 0-359.
- Avoids variations in browser-specific floating-point implementations of `Math.sin` and `Math.cos`.

### PRNG (`rng.js`)
- Implements the `xorshift32` algorithm.
- Initialized with a shared seed at the start of the match.

### Terrain (`terrain.js`)
- Generated using a deterministic random walk.
- **Destructible:** Crates are created using an integer square root (`isqrt.js`) algorithm to ensure crater shapes are identical on all peers.

### Physics (`tank.js`, `projectile.js`)
- **Tanks:** Non-movable platforms that fall under gravity and tilt to match the terrain slope.
- **Projectiles:** Affected by wind (fixed-point) and extreme gravity (35.0). Collision detection uses the terrain heightmap and tank domes.

---

## 2. Phaser Integration & Rendering

Phaser acts as a "view" in the MVC pattern.

### The Game Loop (`GameScene.js`)
- Implements a **Fixed Timestep** loop (`update` method).
- Accumulates delta time and calls `simulation.step()` at 60Hz.

### Renderers (`src/render/`)
- Specialized classes (`TerrainRenderer`, `TankRenderer`, etc.) handle the drawing of simulation objects.
- They use Phaser's Graphics and Containers to create a neon/glow aesthetic.
- **One-way Flow:** Renderers read from the simulation state every frame but never modify it.

---

## 3. Networking (`src/net/webrtc.js`)

Uses **PeerJS** for automated WebRTC P2P communication.

### Connection Protocol
- **Signaling:** PeerJS handles the Offer/Answer/ICE exchange automatically using a cloud signaling service.
- **Invite Links:** A room ID is embedded in the URL hash (`#join=ID`), allowing for a "one-click" join experience.
- **Symmetric UI:** Both host and joiner have clear visibility of the Room ID for manual entry if needed.

### Synchronization & Handshake
- **Seed Sync:** Upon connection, the Host generates a random 32-bit seed and sends it via `MATCH_INIT`.
- **Sync ACK:** The Joiner acknowledges the seed. Only after this handshake is complete does the match transition to the GameScene.
- **SHOT Messages:** Transmit angle and power. Validated for range and turn ownership.
- **State Hashes:** After every turn, clients exchange a hash of the simulation state to verify determinism.

## 4. Debugging and Logging

The system uses a non-intrusive logging pattern to assist in debugging complex deterministic failures.

### Logging Pattern
Each simulation component implements a `.log()` method that checks for a specific global flag. This avoids console noise during normal gameplay while allowing deep inspection of physics or networking issues.

- **Simulation (`DEBUG_SIM`)**: Tracks high-level logic (firing, state transitions).
- **Physics (`DEBUG_TANK`, `DEBUG_PROJ`)**: Tracks per-tick position and velocity updates.
- **Rules (`DEBUG_RULES`)**: Tracks turn timers and wind generation.
- **Networking (`DEBUG_NET`)**: Tracks P2P message payloads and connection states.
- **HUD (`DEBUG_HUD`)**: Tracks button presses and UI updates.

### Desync Debugging
When a desync occurs (detected via `handleRemoteHash`), the Host automatically sends its full state to the Joiner (`SYNC` message). Setting `DEBUG_NET = true` is the primary way to investigate why hashes might have diverged.

---

## 5. Testing Strategy

### Determinism Tests (`tests/determinism.js`)
- Runs two identical simulations locally with a scripted set of shots.
- Compares the `getStateHash()` result turn-by-turn.

### Unit Tests (`tests/unit/`)
- Uses `vitest` to verify individual components like `fixed.js`, `rng.js`, and `terrain.js`.

### E2E Tests (`tests/e2e/`)
- Uses Playwright to simulate full match scenarios.
- Tests the automated PeerJS handshake and multi-turn synchronization.

---

## 5. Key Constants (`src/simulation/constants.js`)

- `PRECISION`: 1,000,000 (Fixed-point scaling).
- `WIDTH` / `HEIGHT`: 800x600 (Logical simulation bounds).
- `GRAVITY_FP`: 35,000,000 (Extreme gravity).
