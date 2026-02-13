# Tank Wars - Project Review

## 1. Overview
Tank Wars is a solid implementation of a deterministic P2P artillery game. The core simulation is well-isolated, and the use of fixed-point math and a deterministic PRNG provides a strong foundation for synchronized play.

## 2. Logic Errors & Technical Debt

### 2.1 Critical Desync Risk: Turn Timer Authority
**Severity: High**
Requirement 8.7 states that the non-active peer must not independently enforce timeout or auto-fire, and should only fire upon receiving a `SHOT` message.
- **Issue:** `Simulation.step` (in `sim.js`) contains local auto-fire logic: `if (this.rules.turnTimer <= 0) { this.fire(...) }`. 
- **Impact:** Since `aimAngle` and `aimPower` adjustments are not synchronized via the network during the `TURN_AIM` phase, the non-active peer will have stale aim values. If the timer hits zero, the two peers will fire different projectiles, causing an immediate and unrecoverable desync.
- **Recommendation:** Remove the auto-fire logic from `Simulation.step`. Let the active player's `GameScene` handle the timeout by sending a `SHOT` message.

### 2.2 Inconsistent Friction Logic
**Severity: Low**
Requirement 4.4 specifies a simplified friction model: `a_eff = a_down * (1 - mu_k)`.
- **Issue:** `Tank.applySliding` uses a more realistic but different formula: `g * (sin - mu_k * cos)`. Additionally, when not sliding, a hardcoded `0.8` multiplier is applied to `vx_fp`.
- **Impact:** The tank stops abruptly on flat terrain, and the physics don't strictly match the provided requirements.
- **Recommendation:** Align the sliding formula with the requirements or update the requirements to match the more realistic implementation. Replace the hardcoded `0.8` multiplier with a proper kinetic friction deceleration.

### 2.3 Physics Precision
**Severity: Medium**
The current `FP` scale is 10,000.
- **Issue:** Gravity per tick (`GRAVITY_FP / 3600`) results in a value of `27`. This low resolution can lead to noticeable "staircase" effects in projectile arcs and tank movement.
- **Recommendation:** Consider increasing `FP` to 1,000,000 to allow for smoother sub-pixel physics integration.

### 2.4 Determinism of Trig Tables
**Severity: Low**
`trigLUT.js` initializes its tables using `Math.sin` and `Math.cos` at load time.
- **Issue:** While usually stable on modern browsers, floating-point results for `Math.sin` can technically vary between hardware architectures or JS engine versions.
- **Recommendation:** Hardcode the Sine/Cosine tables as integer arrays to ensure 100% cross-platform consistency.

## 3. UX & Requirements Adherence

### 3.1 Requirement 8.7 Violation
As noted in 2.1, the simulation independently enforces turn timeouts, which contradicts the "Active Peer Authority" model required for P2P synchronization without input-syncing every tick.

### 3.2 Manual Signaling Friction
The current UX requires manual copy-pasting of WebRTC offers and answers.
- **Pros:** Completely serverless, no backend cost.
- **Cons:** High friction for users, prone to errors (e.g., partial copies).
- **Recommendation:** Add a simple "Share Link" feature that encodes the offer in a URL fragment (Base64) to simplify the connection process.

### 3.3 Feedback Loops
- **Good:** The HUD clearly shows health, wind, and turn status.
- **Missing:** There is no visual feedback for *why* a shot might have failed (e.g., "Out of Bounds" vs "Timeout"). The `Simulation` emits events, but the HUD doesn't display text for them.

## 4. Recommendations for Improvement

1.  **Fix Auto-fire:** Move auto-fire logic out of the core simulation and into the `GameScene` (active-only).
2.  **Sync Aiming (Optional):** If visual barrel movement for the opponent is desired, send periodic `AIM_UPDATE` messages or sync inputs every tick (Lockstep).
3.  **Refine Friction:** Implement a consistent friction model that matches the requirements.
4.  **Harden Determinism:** Hardcode the `trigLUT` and increase `FP` scale.
5.  **Improve UI/UX:**
    - Add "Out of Bounds" and "Timeout" notifications.
    - Implement "Copy Invite Link" to reduce manual copy-paste friction.
    - Add a "Match History" or "Replay" feature (the code already has partial support for this).

## 5. Conclusion
The project is well-structured and mostly complete according to the implementation phases. Addressing the desync risk in the turn timer is the most critical next step for a reliable multiplayer experience.
