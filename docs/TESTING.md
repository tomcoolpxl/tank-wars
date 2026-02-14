# Tank Wars - Testing Documentation

This document provides detailed information on the testing infrastructure, commands, and workflows for Tank Wars.

## 1. Overview

Tank Wars uses a multi-layered testing approach to ensure determinism, physics correctness, and networking reliability.

*   **Unit Tests:** Fast, isolated tests for the simulation core using `vitest`.
*   **Integration Tests:** Turn-flow and state machine verification.
*   **End-to-End (E2E) Tests:** Multi-browser automation using `playwright` to test PeerJS P2P and synchronized gameplay.
*   **Code Coverage:** Measured via `@vitest/coverage-v8`.

## 2. Quick Start

### 2.1 Install Dependencies
```bash
npm install
# Install Playwright browsers
npx playwright install chromium
```

### 2.2 Run All Tests
```bash
npm test
```

### 2.3 Run Unit Tests with Coverage
```bash
npm run test:unit -- --coverage
```

### 2.4 Run E2E Tests
```bash
npm run test:e2e
```

## 3. Test Structure

### 3.1 Unit Tests (`tests/unit/`)
These tests target the `src/simulation/` directory and run in Node.js.
*   `fixed.test.js`: Fixed-point math verification.
*   `projectile.test.js`: Trajectory and collision logic.
*   `tank.test.js`: Gravity, snapping, and sliding physics.
*   `explosion.test.js`: Damage falloff and terrain deformation.
*   `rules.test.js`: Turn-based state transitions.
*   `sim.test.js`: Full turn integration and state serialization.

### 3.2 E2E Scenarios (`tests/e2e/`)
These tests orchestrate two browser instances to simulate P2P matches using the PeerJS automated handshake.
*   `invite_link.spec.js`: Verification of the automated `#join=ID` handshake flow.
*   `match.spec.js`: Basic match setup, multi-turn synchronization, and gameplay.
*   `scenarios.spec.js`: Advanced edge cases:
    *   **Auto-fire:** Verification of deterministic timeout shooting.
    *   **Out-of-bounds:** Ensuring off-map projectiles terminate without explosion.
    *   **Win Conditions:** Verifying game-over state and UI response.
    *   **Security Validation:** Ensuring the match aborts if a peer sends invalid (non-integer or out-of-range) shot data.

## 4. Determinism Verification

Determinism is the most critical aspect of the project. It is verified in three ways:

1.  **State Hashes:** The simulation generates a recursive hash of all critical state (terrain, tank positions, health, RNG state).
2.  **Turn Synchronization:** In E2E tests, both browser instances compare their state hashes after every turn.
3.  **Standalone Harness:** `tests/determinism.js` can be used to run two parallel simulations headlessly and verify they never drift.
4.  **Seed Sync:** Verified in E2E tests to ensure both peers start with the identical PRNG seed provided by the Host.

## 5. Debugging Test Failures

If a test fails, especially an E2E test, you can gain more insight by enabling debug logs within the test environment.

- **Simulation Logs:** Many E2E tests output `PAGE: [SIM] ...` logs directly to the terminal.
- **Verbose Mode:** Run Playwright with `DEBUG=pw:browser` for browser-level issues.
- **Manual Debugging:** Run the game in dev mode (`npm run dev`) and set `window.DEBUG_NET = true` in the console to watch the handshake and shot exchange in real-time.

## 6. Continuous Integration (CI)

The project is designed to be CI-ready. Note that E2E tests require a display buffer (e.g., `xvfb-run`) and system dependencies for Chromium if run on a headless Linux server.

## 6. Coverage Goals

We aim for:
*   **Statements:** > 90%
*   **Lines:** > 95%
*   **Functions:** 100% in simulation core.
*   **Branches:** > 80%
