# Tank Wars - Deep Code Exploration

## Architecture Overview

Tank Wars follows a decoupled architecture where the **Deterministic Simulation Core** is strictly separated from the **Phaser Rendering Layer**. This separation is critical for P2P synchronization and determinism.

- **Simulation (`src/simulation/`)**: Pure JavaScript logic. No `Math.random()`, `Date.now()`, or floating-point numbers.
- **Rendering (`src/render/` & `src/scenes/`)**: Phaser 3 components that visualize the simulation state.
- **Networking (`src/net/`)**: WebRTC-based P2P communication.
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
- **Interpolation:** While currently rendering the current state, the system is structured to support visual interpolation between simulation ticks.

### Renderers (`src/render/`)
- Specialized classes (`TerrainRenderer`, `TankRenderer`, etc.) handle the drawing of simulation objects.
- They use Phaser's Graphics and Containers to create a neon/glow aesthetic.
- **One-way Flow:** Renderers read from the simulation state every frame but never modify it.
- **Clean UI:** Redundant elements like in-world health bars and debug overlays are disabled for a cleaner experience.

---

## 3. Networking (`src/net/webrtc.js`)

Uses P2P WebRTC DataChannels for low-latency communication.

### Connection Protocol
- **Lobby:** Players exchange SDP offers/answers and ICE candidates. Includes a compact, scrollable UI for signaling.
- **DataChannel:** Configured as `ordered: true` to ensure turn messages arrive in sequence.

### Synchronization & Validation
- **SHOT Messages:** Transmit angle and power. Validated for range and turn ownership.
- **State Hashes:** After every turn, clients exchange a hash of the simulation state.
- **Authoritative Host:** If a hash mismatch is detected, the Host sends an authoritative `SYNC` message containing the full simulation state to the Client.

---

## 4. Testing Strategy

### Determinism Tests (`tests/determinism.js`)
- Runs two identical simulations locally with a scripted set of shots.
- Compares the `getStateHash()` result turn-by-turn.
- If even one bit differs, the test fails, indicating a "desync" bug.

### Unit Tests (`tests/unit/`)
- Uses `vitest` to verify individual components like `fixed.js`, `rng.js`, and `terrain.js`.
- Ensures core math remains stable during refactoring.

### E2E Tests (`tests/e2e/`)
- Uses Playwright to simulate full match scenarios in a headless browser.

---

## 5. Key Constants (`src/simulation/constants.js`)

- `PRECISION`: 1,000,000 (Fixed-point scaling).
- `WIDTH` / `HEIGHT`: 800x600 (Logical simulation bounds).
- `GRAVITY_FP`: 35,000,000 (Extreme gravity).
