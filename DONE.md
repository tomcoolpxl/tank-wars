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

## Current State
- Phaser renders and accepts user input for the deterministic simulation.
- Players can adjust angle/power and fire manually or wait for timeout.
- Simulation state remains fully deterministic and independent of frame rate.
- Debug overlay shows real-time simulation state (tick, timer, aim values).
- Verification test suite started in `tests/`.
