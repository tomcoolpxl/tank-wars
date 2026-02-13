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
- **Phase 9 (Advanced Testing & Coverage):** COMPLETE.

## Architecture
- **`src/simulation/`**: Pure logic core.
    - `constants.js`: Global config (FP=10000, integer-based constants).
    - `fixed.js`: Fixed-point math.
    - `rng.js`: Deterministic PRNG.
    - `trigLUT.js`: Precomputed sin/cos.
    - `isqrt.js`: Integer square root (used for physics/explosions).
    - `terrain.js`: Heightmap and deformation.
    - `tank.js`: Tank physics (improved slope-based sliding).
    - `projectile.js`: Projectile physics (self-collision protection).
    - `explosion.js`: Damage and crater logic.
    - `rules.js`: Turn-based state machine.
    - `sim.js`: Main Simulation API (includes state serialization for resync).
- **`src/net/`**: WebRTC P2P networking.
- **`src/ui/`**: UI components (HUD, Lobby).
- **`src/render/`**: Phaser-specific rendering helpers.
- **`src/scenes/`**: Phaser scenes (`LobbyScene`, `GameScene`).
- **`src/main.js`**: Phaser entry point.
- **`tests/`**: Unit, Integration, and E2E test suites.

## Tests
- **Unit Tests (`vitest`):** Comprehensive coverage of simulation logic. Run with `npm run test:unit`.
- **E2E Tests (`playwright`):** Full match automation, P2P handshake, and security validation. Run with `npm run test:e2e`.
- **Coverage:** Measured via `@vitest/coverage-v8`. Current line coverage > 95%.
- **See `TESTING.md` for detailed instructions.**

## Development Rules
1. **Determinism:** Never use `Math.random()`, `Date.now()`, or floating-point numbers in `src/simulation/`.
2. **Fixed Timestep:** Simulation logic should be stepped at 60Hz.
3. **Phaser Binding:** Phaser should only read from the simulation state to render visuals. It should not modify simulation state directly.
4. **Networking Reliability:** The `NetworkManager` includes a 2-second timeout for ICE gathering to ensure handshakes complete even in restricted network environments.
5. **State Hashing:** `Simulation.getStateHash()` excludes `turnTimer` and `tickCount` to allow for minor P2P timing jitter while ensuring core game state (positions, health, terrain) remains perfectly synchronized.

