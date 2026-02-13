# Implementation Progress

## Phase 0: Project skeleton and deployment - COMPLETED
- [x] Create repo structure: `/src`, `/src/simulation`, `/src/net`, `/src/render`, `/src/ui`, `/public`.
- [x] Configure Vite for plain JS and ES modules.
- [x] Configure Phaser scale (800x600, FIT).
- [x] Basic Phaser scene loading.

## Phase 1: Deterministic simulation core (headless, pure JS) - COMPLETED
- [x] Fixed-point utilities (FP=1000, mulFP, divFP).
- [x] Deterministic RNG (xorshift32).
- [x] Deterministic integer sqrt (isqrt).
- [x] Trig lookup table (1-degree steps, 0..180).
- [x] Terrain heightmap (generation, sampling, deformation).
- [x] Tank model (gravity, sliding, terrain contact).
- [x] Projectile model (gravity, wind, collision, bounds check).
- [x] Explosion and damage (quadratic falloff).
- [x] Rules / turn state machine.
- [x] Simulation entry point (`Simulation` class).

## Phase 2: Integrate simulation into Phaser (render-only binding) - COMPLETED
- [x] GameScene owns `Simulation` instance.
- [x] Tick scheduler running at 60 Hz independent of Phaser delta.
- [x] Render snapshot pattern (reading state from sim).
- [x] Terrain rendering using Graphics.
- [x] Tank rendering (wireframe + rotation).
- [x] Projectile rendering.
- [x] Explosion visuals (events triggering visual effects).

## Phase 3: Input system (deterministic sampling) - COMPLETED
- [x] Keyboard controls for angle (Left/Right) and power (Up/Down).
- [x] Angle and power changes are deterministic (1 step per sim tick).
- [x] Value clamping (Angle: 0..180, Power: 0..100).
- [x] Fire action (Space) integrated with turn state machine.
- [x] Auto-fire on turn timer expiration (1200 ticks).

## Phase 4: WebRTC P2P networking with manual signaling - COMPLETED
- [x] Implement `NetworkManager` for WebRTC (offer/answer/data channel).
- [x] LobbyScene with HTML UI for manual signaling (copy/paste).
- [x] Message protocol for `MATCH_INIT` (shared seed) and `SHOT` (inputs).
- [x] Turn Timer Authority: active player is authoritative for auto-fire.
- [x] Network shot validation (turn number, range checks).
- [x] GameScene integration: local vs remote turns.

## Phase 5: HUD and game UX - COMPLETED
- [x] Implement `HUD` class in `src/ui/HUD.js`.
- [x] Display health bars for both players.
- [x] Display current angle and power (interactive for local player).
- [x] Display wind speed and direction bar.
- [x] Authoritative turn timer display (seconds).
- [x] Active player indicator and turn notifications.
- [x] Game over overlay with winner announcement.
- [x] Integrated HUD into `GameScene` and removed debug text.

## Phase 6: Determinism test harness (essential) - COMPLETED
- [x] Implement robust `getStateHash()` in `Simulation`.
- [x] Add debug overlay to HUD (tick, turn, hash).
- [x] Implement turn-by-turn determinism test harness (`tests/determinism.js`).
- [x] Add shot recording and replay functionality to `GameScene`.
- [x] Keybinds for dev mode: 'P' to print replay, 'R' to restart with replay.

## Current State
- Full P2P connectivity via manual signaling is implemented.
- The game features a complete neon-themed HUD showing vital game information.
- Turn-based logic is fully functional with authoritative timing and remote shot sync.
- Game over conditions are detected and displayed to both players.
