GAME REQUIREMENTS DOCUMENT
Project: Deterministic P2P Artillery Tanks
Hosting: Static (GitHub Pages)
Networking: WebRTC P2P, manual signaling, deterministic lockstep
Rendering: Neon wireframe vector aesthetic (Canvas 2D)
Simulation: Manual fixed-point, fixed timestep, determinism-first

---

1. Logical Coordinate System

Logical resolution: 800 x 600, scaled to fit the browser window while preserving aspect ratio.

Coordinate convention:

* Origin at bottom-left (0,0).
* X increases to the right, Y increases upward.
* Visible map bounds:

  * X in [0, 799]
  * Y in [0, 599]

All simulation is performed in logical coordinates and does not depend on display scaling.

---

2. Deterministic Numeric Model

Fixed-point representation:

* Scale factor FP = 1000.
* Any value v in logical units is stored as v_fp = round(v * FP) as an integer.
* Positions, velocities, accelerations are fixed-point integers.
* Terrain heights are stored as integer logical pixels (not fixed-point), but any tank/projectile vertical position comparisons must use consistent conversions.

Time:

* Fixed timestep: 60 ticks per second.
* Simulation never uses variable delta time.
* Timeouts and durations expressed in ticks.

Rounding and overflow policy:

* All divisions must be integer divisions with explicit rounding rule:

  * Use floor division for positive values.
  * For signed divisions, implement a deterministic signed division helper that rounds toward zero.
* Use 32-bit signed integer safe ranges where possible; if values may exceed, use 64-bit via JS BigInt for those calculations only, or keep magnitudes bounded so Number-safe integers remain below 2^53 - 1.

Determinism requirements:

* No floating-point math in simulation-critical paths (terrain, tank motion, projectile motion, collision, damage).
* No Date.now / performance.now in simulation logic.
* Rendering and particle effects must not influence simulation state.

---

3. Terrain System (Heightmap-Based)

3.1 Heightmap resolution

* Heightmap sample step: 2 pixels per sample.
* Heightmap length: 400 samples.
* Mapping:

  * heightIndex = floor(x / 2)
  * sampleX = heightIndex * 2

3.2 Height constraints

* Minimum terrain height: 80
* Maximum terrain height: 450
* Terrain outside these bounds must be clamped during generation and deformation.

3.3 Deterministic terrain generation

* Terrain is generated from a shared seed using a custom deterministic PRNG.
* Generation produces “mountain-like” profiles without overhangs.
* Must satisfy playability constraints:

  * No near-vertical walls in spawn zones.
  * No terrain so low that tanks spawn close to the bottom edge.
  * No terrain so high that it crowds the top excessively.

3.4 Terrain deformation (craters)

* Terrain deformation is performed by modifying heightmap values.
* Explosion crater radius for deformation: 45 pixels.
* Crater profile:

  * For each heightmap sample within radius (in x distance):

    * Compute horizontal distance dx = abs(sampleX - explosionX) (pixels)
    * If dx <= R:

      * Compute crater depth using a deterministic circular cross-section:
        depth = floor( sqrt(R^2 - dx^2) )
      * NewHeight = max(0, OldHeight - depth)
* R is 45 (pixels).
* sqrt must be deterministic:

  * Implement an integer square root function (isqrt) returning floor(sqrt(n)) for integer n.
  * Avoid Math.sqrt for simulation.

3.5 Terrain rendering

* Render as a neon polyline connecting (x, height(x)).
* Outline only; no fill.

Height sampling for rendering:

* Convert heightmap into points at every 2 pixels, optionally densify visually if needed, but visual interpolation must not affect simulation.

---

4. Tank System

4.1 Tank dimensions

* Tank body: 24 px wide, 12 px tall.
* Tank is simulated using:

  * Position (x_fp, y_fp) representing tank center in fixed-point.
  * AABB footprint for collision checks (rectangle).
* Tank should be considered “resting on terrain” when its bottom is at terrain height under its center, plus optional tolerance (see 4.5).

4.2 Spawn placement

* Two tanks spawn on terrain surface deterministically.
* Spawn x ranges:

  * Left tank: x in [40, 320]
  * Right tank: x in [480, 760]
* Spawn x is chosen from seed; if chosen point is invalid (too steep locally), re-sample deterministically by advancing PRNG until valid.
* Spawn y determined by terrain height at x.
* Parachute drop is excluded from MVP.

4.3 Slope alignment

* Tank rotation visually matches slope at its x position.
* Slope computed using neighboring height samples:

  * hL = height(index-1), hR = height(index+1)
  * dh = hR - hL
  * dx = 4 pixels (because indices differ by 2 samples = 4 pixels total)
* Orientation angle is computed deterministically:

  * Use a fixed-point atan2 approximation or a small lookup table.
* Rotation affects rendering only unless you decide later to include rotated collision; MVP uses axis-aligned collision.

4.4 Movement: gravity + slope sliding with friction

* Gravity constant: g = 9.8 logical units/s^2 downward.
* Tanks can move horizontally due to sliding if slope angle exceeds static threshold.

Static friction threshold:

* 30 degrees.

Kinetic friction coefficient:

* 0.2 (dimensionless).

Sliding model:

* If slope angle >= 30 degrees:

  * Tank accelerates downhill.
  * Downhill acceleration computed in fixed-point using sin(theta).
  * Apply kinetic friction as a reduction of downhill acceleration:

    * a_down = g * sin(theta)
    * a_eff = a_down * (1 - mu_k) clamped >= 0
* Use deterministic sin approximation / lookup table.

4.5 Terrain contact and tolerance

* Choose “whatever works best” interpreted as:

  * Allow a small vertical tolerance epsilon to prevent jitter due to discrete terrain:

    * epsilon = 1 pixel (converted to fixed-point where needed)
  * When tank bottom is within epsilon above terrain, snap to terrain and set vertical velocity to 0.
* This snapping rule must be deterministic and identical on both peers.

4.6 Health and loss

* Health is integer.
* Max health: 100.
* Loss if:

  * Health <= 0, or
  * Tank center x < 0 or > 799, or
  * Tank bottom y < 0 (safety condition).

4.7 Explosion impulse

* No explosion impulse in MVP.
* Tanks are displaced only via:

  * Terrain removal and subsequent falling.
  * Sliding due to slope.

---

5. Projectile System

5.1 Inputs per shot

ANGLE INPUT AND QUANTIZATION

* Angle is constrained to integer degrees only.
* Valid range: 0..180 inclusive.
* Angle changes by exactly 1 degree per simulation tick when the corresponding input is held (subject to clamping).
* Trig lookup table (sin/cos) is indexed by integer degree only. No sub-degree support exists in MVP.
* Any received network SHOT with a non-integer degree angle (or outside range) is invalid and must abort the match.

* Power: integer 0 to 100 inclusive, step 1.

5.2 Initial velocity from power

* v0 = power * 4 logical units/s.
* Convert to fixed-point:

  * v0_fp = v0 * FP.

Velocity decomposition:

* vx0 = v0 * cos(angle)
* vy0 = v0 * sin(angle)
* cos/sin computed via deterministic integer lookup table indexed by integer degree (181 entries, 0..180).
* The quantization rule is part of determinism and must be identical on both peers.

5.3 Wind
Wind is constant for the duration of a turn.

Wind value:

* Integer in range [-15, +15].

Distribution:

* Biased toward small values (chosen now):

  * Sample from a triangular distribution centered at 0:

    * wind = (randInt(-15, 15) + randInt(-15, 15)) / 2, rounded toward zero.
  * Result range remains [-15, 15], with more probability near 0.
* Implement entirely using deterministic integer RNG.

Wind application:

* Wind is treated as horizontal acceleration:

  * ax_wind = wind * 0.5 logical units/s^2
* Convert to fixed-point per tick.

Wind display:

* Numeric value and a directional bar.

5.4 Gravity

* Same g as tanks: 9.8 logical units/s^2 downward.
* Fixed-point per tick integration.

5.5 Projectile lifetime cap
To avoid long flights:

* Maximum projectile lifetime: 10 seconds.
* In ticks: 600 ticks.
* If lifetime exceeded without collision:

  * Projectile is removed.
  * No explosion occurs.
  * Turn ends and physics stabilization begins immediately.

5.6 Collision detection
Each simulation tick:

* Terrain collision:

  * Determine terrain height at projectile x (sample nearest or floor to index).
  * If projectile y <= terrainHeight -> collision.
* Tank collision:

  * Check intersection with tank AABB.
* Map bounds — PROJECTILE OUT-OF-BOUNDS TERMINATION:

  * If the projectile position moves outside the map bounds (x < 0, x > 799, y < 0, y > 599), the projectile is terminated immediately.
  * No explosion is generated when a projectile is terminated due to leaving bounds.
  * The turn proceeds directly to stabilization (tank physics resolution) after termination.

On first collision with terrain or tank:

* Trigger explosion at collision point.
* Stop projectile.

---

6. Explosion, Damage, and Deformation

6.1 Radii

* Damage radius: 60 pixels.
* Terrain deformation radius: 45 pixels.

6.2 Damage falloff (quadratic)
For each tank:

* Compute distance d from explosion center to tank center (in pixels).
* If d >= R (60): damage = 0
* Else:

  * damage = floor( 100 * (1 - (d^2 / R^2)) )
* All operations must be integer:

  * Use fixed-point ratio:

    * ratio = (d^2 * FP) / (R^2)
    * damage = floor(100 * (FP - ratio) / FP)
* Clamp to [0, 100].

6.3 Terrain deformation application

* Apply crater deformation exactly once at explosion.
* Use integer isqrt as specified in Terrain section.
* After deformation, proceed to stabilization.

6.4 Particles and visuals

* Particle effects are purely visual.
* They must use their own PRNG or nondeterministic randomness without feeding back into game logic.
* Particle visuals may be run at render-frame rate; simulation remains tick-based.

---

7. Turn System

7.1 Turn timing

* Each turn lasts 20 seconds.
* In ticks: 1200 ticks.

7.2 Timeout behavior

* Auto-fire when timer reaches 0 using current angle and power.
* Auto-fire must occur at a deterministic tick boundary.

7.3 Turn flow

1. Start turn:

   * Determine active player.
   * Generate wind deterministically for this turn.
   * Reset per-turn timer to 1200 ticks.
2. Aim phase:

   * Player adjusts angle and power.
3. Fire event:

   * Player fires or auto-fire triggers.
4. Projectile simulation:

   * Run until collision, out-of-bounds, or lifetime cap.
5. Explosion and effects:

   * Apply crater deformation and damage.
6. Stabilization phase:

   * Continue simulating tank physics until stable:

     * Both tanks have zero velocity and are not sliding.
   * Add a hard cap to stabilization duration to prevent pathological loops:

     * Stabilization cap: 8 seconds (480 ticks).
     * If cap reached, proceed anyway (deterministic).
7. Check win conditions:

   * Apply fall-off-map loss immediately when detected.
8. Switch active player and repeat.

---

8. Deterministic Lockstep Networking

8.1 Transport

* WebRTC DataChannel.

8.2 Signaling

* Manual copy/paste of offer/answer.
* No signaling server.

8.3 Shared initialization
Upon connection:

* Exchange protocol version string.
* Exchange or agree on match seed:

  * Either generated by host and sent to peer, or derived from both peers (MVP: host generates and sends).
* Confirm readiness and start tick = 0 at agreed moment:

  * Use a short deterministic “start after N ticks” handshake (not wall-clock).

8.4 Messages transmitted during play
Only transmit inputs and confirmations, not state:

* StartMatch { seed, params }
* TurnStartAck (optional)
* ShotInput { turnNumber, angle, power }
* FireAck (optional)
* DesyncCheck (optional, later)

The authoritative state is local simulation; the network is for agreeing on inputs and turn progression.

8.5 SHOT MESSAGE VALIDATION (MVP)

On receipt of SHOT { turnNumber, angleDeg, power }:

* turnNumber must equal the receiver's expected current turnNumber.
* The receiver's local rules state must be waiting-for-shot for that turn (i.e. not currently simulating a projectile for that turn).
* angleDeg must be an integer in [0, 180].
* power must be an integer in [0, 100].
* The sending peer must be the active player for turnNumber.
* If any validation fails, abort match and show an error.

8.6 Desync policy (MVP)

* No automatic recovery.
* If a required message is missing or invalid:

  * Abort match with error.
* Optional later:

  * Per-turn checksum comparison (hash of key state).

8.7 TURN TIMER AUTHORITY AND CLOCKING

* The 20-second turn timer is authoritative only on the active player (the shooter).
* The non-active peer must not independently enforce timeout or auto-fire.
* When the timer reaches 0 on the active peer, that peer must immediately send the SHOT message using the current angle and power values.
* The non-active peer must:

  * Display an "opponent aiming" state.
  * Accept the SHOT message as the sole trigger for projectile simulation on that turn.
  * Never generate an auto-shot locally.
* The simulation tick counter is still used for all physics stepping (60 Hz fixed), but wall-clock progression and timer display are not used to infer shot events on the non-active peer.
* Message ordering rule:

  * Exactly one SHOT message per turnNumber.
  * If a second SHOT arrives for the same turnNumber, treat as protocol violation and abort match.

8.8 AUTHORITY RULE

* Physics and game state are deterministic and derived from shared seed plus agreed inputs.
* The only authoritative event that starts projectile simulation on a given turn is the receipt (or local issuance, for the active peer) of the SHOT message for that turnNumber.
* The non-active peer must not infer or synthesize a SHOT event based on its local wall-clock timer.

---

9. UI Requirements

HUD (always visible):

* Health bars for both tanks.
* Turn timer countdown (seconds).
* Current angle numeric.
* Current power numeric.
* Wind numeric and direction bar.
* Active player indicator.

Controls (keyboard):

* Left/Right: adjust angle (step 1 degree per key repeat).
* Up/Down: adjust power (step 1 per key repeat).
* Space: fire.

Input repeat:

* Use a deterministic input sampling approach:

  * Sample input state once per simulation tick.
  * Apply at most one increment per tick for each control.
* Do not tie input increments to OS key repeat timing.

---

10. Rendering Requirements (Neon Vector Look)

Canvas:

* Single canvas, scaled.
* Clear each frame to black.

Terrain:

* Polyline stroke along terrain surface.
* Neon glow effect using layered strokes (render-only).

Tanks:

* Wireframe outline rectangles.
* Rotate to match slope visually.

Projectile:

* Small bright point.

Explosion:

* Expanding ring and particles.

No screen shake.

Rendering must never affect simulation state.

---

11. Codebase Structure Requirements

Strict module separation:

* simulation/

  * rng (seeded deterministic PRNG)
  * math (fixed-point helpers, trig tables, isqrt, clamp)
  * terrain (heightmap gen, sampling, deformation)
  * tanks (spawn, motion, friction, terrain contact)
  * projectile (launch, step, collision)
  * explosion (damage, crater)
  * rules (turn state machine, timers, win conditions)
  * state (serialization for debugging, optional)
* networking/

  * webrtc connection, signaling UI, message schema validation
* rendering/

  * draw terrain, tanks, projectile, explosion visuals
* ui/

  * HUD, input handling, menus/lobby
* main/

  * boot, game loop, tick scheduler, scene wiring

Simulation must be testable headlessly (no DOM dependencies) to help verify determinism.

---

12. Remaining Implementation-Level Questions (minimal)

These are not design questions; they are final parameter choices that impact determinism and balance:

1. Angle quantization: keep true 1-degree steps (matches your UI) or allow finer (0.1 degree) internally while UI shows 1 degree?

1-degree

2. Out-of-bounds projectile handling: confirm “no explosion” on leaving bounds, or should it explode at boundary edge?

“no explosion” on leaving bounds

3. Stabilization cap: 8 seconds (480 ticks) acceptable, or prefer a different cap?

8s is acceptable
