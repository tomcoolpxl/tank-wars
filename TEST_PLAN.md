# Tank Wars Test Plan

This document outlines the testing strategy for ensuring the correctness, determinism, and reliability of Tank Wars.

## 1. Testing Levels

### 1.1 Unit Tests (Simulation Core)
Focus on individual modules in `src/simulation/`. These tests ensure that the building blocks of the physics and math are correct and deterministic.
*   **Fixed-Point Math (`fixed.js`):** Test precision, rounding toward zero, and division.
*   **Deterministic RNG (`rng.js`):** Verify that the same seed always produces the same sequence.
*   **Trigonometry (`trigLUT.js`):** Verify the lookup table values for 0-180 degrees.
*   **Terrain (`terrain.js`):** Test generation bounds, height sampling, and crater deformation.
*   **Physics (`tank.js`, `projectile.js`):** Test gravity, friction, and collision detection.

### 1.2 Integration Tests (Simulation State Machine)
Focus on `src/simulation/rules.js` and `src/simulation/sim.js`.
*   **State Transitions:** Verify the turn flow (Aim -> Projectile -> Explosion -> Stabilization -> Next Turn).
*   **Win Conditions:** Verify game over states (Health <= 0, Fall out of bounds).
*   **Regression & Determinism:** Run full simulations and compare state hashes to ensure no drift occurs over long matches.

### 1.3 End-to-End (E2E) Tests (P2P Networking)
Focus on the interaction between two game instances using Playwright.
*   **P2P Handshake:** Automate the manual WebRTC signaling (copy-paste) between two browser contexts.
*   **Synchronized Play:** Execute shots in one instance and verify that the other instance receives and processes them identically.
*   **Fail-Fast/Timeouts:** Ensure tests fail if a connection isn't established or a turn doesn't complete within a reasonable timeframe.

## 2. Automation Strategy

### 2.1 Test Runner
*   **Unit/Integration:** Use `vitest` for fast, ESM-native testing of the simulation logic.
*   **E2E:** Use `playwright` to orchestrate multi-browser testing.
*   **Main Command:** `npm test` runs both unit and E2E tests.

### 2.2 Running Tests
```bash
# Run all tests (Unit + E2E)
npm test

# Run only unit tests
npm run test:unit

# Run only E2E tests
npm run test:e2e
```

### 2.3 Continuous Integration
*   The test suite is designed to run in a CI environment.
*   Note: E2E tests require system dependencies (libnspr4, etc.) to run Chromium.

## 3. Current Status
*   **Unit Tests:** 30 tests passing, covering math, RNG, trig, terrain, tanks, projectiles, and rules.
*   **E2E Tests:** Skeleton and full match flow implemented. Handshake and turn synchronization are automated.
*   **Determinism:** Verified through both dedicated unit tests and cross-instance hash checks in E2E.

