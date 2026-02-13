# Tank Wars - Project Context

## Overview
Tank Wars is a deterministic, peer-to-peer (P2P) artillery game. It uses a fixed-point simulation to ensure identical game states across peers without a central server.

## Current Progress
- **Phase 0 (Skeleton):** COMPLETE.
- **Phase 1 (Simulation Core):** COMPLETE.
- **Phase 2 (Phaser Integration):** COMPLETE.
- **Phase 3 (Input System):** COMPLETE.
- **Phase 4 (Networking):** COMPLETE.
- **Phase 5 (HUD & UX):** COMPLETE.
- **Phase 6 (Determinism Harness):** COMPLETE.
- **Phase 7 (Visual Polish):** COMPLETE.
- **Phase 8 (Packaging & Reliability):** COMPLETE.

## Architecture
- **`src/simulation/`**: Pure logic core.
    - `constants.js`: Global config.
    - `fixed.js`: Fixed-point math.
    - `rng.js`: Deterministic PRNG.
    - `trigLUT.js`: Precomputed sin/cos.
    - `isqrt.js`: Integer square root.
    - `terrain.js`: Heightmap and deformation.
    - `tank.js`: Tank physics.
    - `projectile.js`: Projectile physics.
    - `explosion.js`: Damage and crater logic.
    - `rules.js`: Turn-based state machine.
    - `sim.js`: Main Simulation API.
- **`src/net/`**: WebRTC P2P networking.
    - `webrtc.js`: `NetworkManager` for P2P connections.
- **`src/ui/`**: UI components.
    - `HUD.js`: Game overlay (health, stats, timer, game over).
- **`src/render/`**: Phaser-specific rendering helpers.
    - `TerrainRenderer.js`: Neon polyline and glow for terrain.
    - `TankRenderer.js`: Container-based tank with glow and health.
    - `ProjectileRenderer.js`: Projectile with glow and trail.
    - `ExplosionRenderer.js`: Neon expanding rings and particles.
- **`src/scenes/`**: Phaser scenes (`LobbyScene`, `GameScene`).
- **`src/main.js`**: Phaser entry point.
- **`tests/`**: Standalone deterministic logic tests.

## Tests
- `tests/phase3_test.js`: Verifies deterministic input handling (angle/power increments) and authoritative auto-fire timeout. Run with `node tests/phase3_test.js`.
- `tests/determinism.js`: Verifies simulation determinism by running two identical simulations and comparing state hashes turn-by-turn. Run with `node tests/determinism.js`.

## Development Rules
1. **Determinism:** Never use `Math.random()`, `Date.now()`, or floating-point numbers in `src/simulation/`.
2. **Fixed Timestep:** Simulation logic should be stepped at 60Hz.
3. **Phaser Binding:** Phaser should only read from the simulation state to render visuals. It should not modify simulation state directly.
