# Tank Wars - Project Context

## Overview
Tank Wars is a deterministic, peer-to-peer (P2P) artillery game. It uses a fixed-point simulation to ensure identical game states across peers without a central server.

## Current Progress
- **Phase 0 (Skeleton):** COMPLETE.
- **Phase 1 (Simulation Core):** COMPLETE.
- **Phase 2 (Phaser Integration):** COMPLETE.
- **Phase 3 (Input System):** COMPLETE.

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
- **`src/render/`**: Phaser-specific rendering helpers.
- **`src/scenes/`**: Phaser scenes.
- **`src/main.js`**: Phaser entry point.
- **`tests/`**: Standalone deterministic logic tests.

## Tests
- `tests/phase3_test.js`: Verifies deterministic input handling (angle/power increments) and authoritative auto-fire timeout. Run with `node tests/phase3_test.js`.

## Development Rules
1. **Determinism:** Never use `Math.random()`, `Date.now()`, or floating-point numbers in `src/simulation/`.
2. **Fixed Timestep:** Simulation logic should be stepped at 60Hz.
3. **Phaser Binding:** Phaser should only read from the simulation state to render visuals. It should not modify simulation state directly.
