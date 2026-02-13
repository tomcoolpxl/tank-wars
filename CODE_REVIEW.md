# Code Review - Tank Wars

## 1. Determinism & Physics

### Precision Issues in Gravity
The simulation uses a fixed-point constant `FP = 1000`. Gravity is calculated as:
```javascript
this.g_per_tick_fp = Math.floor((GRAVITY * FP) / (60 * 60));
```
With `GRAVITY = 9.8`, this results in `g_per_tick_fp = 2`. 
- **Finding:** This represents a significant precision loss. The actual value should be `2.722...`. Over 60 ticks (1 second), the cumulative error in velocity is `0.722 * 60 = 43.3` FP units (0.043 pixels). While small, this precision loss can be avoided by increasing `FP` to `10000` or by storing velocity in `FP_units/s` and only scaling by `dt` during position updates.
- **Recommendation:** Increase `FP` to `10000` to capture more fractional detail in acceleration.

### Floating Point Constants
`constants.js` contains floating point values:
```javascript
export const GRAVITY = 9.8; 
export const FRICTION_KINETIC = 0.2;
```
- **Finding:** While these are currently converted to fixed-point during initialization, it is safer for absolute determinism to define them as integer constants (e.g., `GRAVITY_FP = 9800`) to ensure identical behavior across all JS engines without any float-to-int rounding ambiguity.
- **Recommendation:** Replace all floating point constants in `constants.js` with their fixed-point equivalents.

### Sliding Physics (MVP Simplification)
The `applySliding` method in `tank.js` is highly simplified:
```javascript
if (Math.abs(dh) > 2) {
    const slideDir = dh > 0 ? -1 : 1;
    const accel = 20; 
    this.vx_fp += slideDir * accel;
}
```
- **Finding:** It uses a hardcoded `accel = 20` and doesn't use the `FRICTION_KINETIC` constant. It also doesn't calculate the actual slope angle for `sin(theta)` as suggested by the requirements.
- **Recommendation:** Implement proper slope-based acceleration using the `trigLUT.js` and the kinetic friction constant.

## 2. Networking (WebRTC)

### State Synchronization
- **Finding:** The current implementation relies on peers receiving `SHOT` messages and executing the same logic. It uses state hashing for verification, but there is no automated "resync" mechanism if a drift is detected.
- **Recommendation:** Add a hash-check after each turn. If hashes mismatch, the host should send an authoritative state snapshot to the client.

### Error Handling
- **Finding:** `NetworkManager` has basic error handling but doesn't handle ICE restart or connection timeouts gracefully in the UI.
- **Recommendation:** Add connection timeout logic and improve user feedback in `LobbyScene` when a connection fails.

## 3. Rendering & UI

### Decoupling
- **Finding:** Excellent separation between `src/simulation` and `src/render`. The simulation is pure logic and can be tested in Node.js environments.
- **Recommendation:** Maintain this separation. Ensure no Phaser-specific types or browser APIs leak into the simulation.

### HUD Polish
- **Finding:** The HUD is functional but basic.
- **Recommendation:** Add visual feedback for wind direction (e.g., an arrow) and a power bar.

## 4. Testing & Automation

### Current State
- **Finding:** Tests exist in `tests/` but are not integrated into `package.json`. They must be run manually.
- **Recommendation:** Add a `test` script to `package.json` that runs all verification scripts.

### Automated Testing Plan
- **Goal:** Fully automated CI-ready test suite.
- **Actions:**
    1.  Add `npm test` script.
    2.  Create a `test-all.js` runner that executes both `phase3_test.js` and `determinism.js`.
    3.  Ensure tests return non-zero exit codes on failure.

## 5. Security & Reliability

### Input Validation
- **Finding:** `handleRemoteShot` validates `angle` and `power` but doesn't strictly check if it's actually the sender's turn in a way that prevents cheating (though determinism would catch the drift).
- **Recommendation:** Ensure the simulation itself rejects `fire()` calls if the `activePlayerIndex` doesn't match the expected sender (if that information is available).
