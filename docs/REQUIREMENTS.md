GAME REQUIREMENTS DOCUMENT
Project: Deterministic P2P Artillery Tanks
Hosting: Static (GitHub Pages)
Networking: WebRTC P2P (PeerJS), automated signaling, deterministic lockstep
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

All simulation is performed in logical coordinates and does not depend on display scaling. The Renderer is responsible for inverting the Y-axis for screen space (where Y=0 is top).

---

2. Deterministic Numeric Model

Fixed-point representation:

* Scale factor FP = 1000000.
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
      * NewHeight = Math.max(0, OldHeight - depth)
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

4. Tank System (Platform Mode)

4.1 Tank dimensions

* Tank base: 24 px wide (TANK_WIDTH).
* Tank shape: Half-circle (dome) with radius 12 px resting on terrain.
* Tank position (x_fp, y_fp) represents the center of the base.
* Tank is considered “resting on terrain” when its base is at terrain height.

4.2 Spawn placement

* Two tanks spawn on terrain surface deterministically.
* Spawn x ranges:

  * Left tank: x in [40, 320]
  * Right tank: x in [480, 760]
* Spawn x is chosen from seed.
* Spawn y determined by terrain height at x.

4.3 Slope alignment

* Platforms tilt to match the terrain slope (base aligns with local height samples).
* Slope computed using neighboring height samples:

  * hL = height(index-2), hR = height(index+2) (8px span)
  * baseAngleDeg = Math.floor(atan2(hR - hL, 8) * 180 / PI)
* This base angle is used to rotate the platform and the relative gun.

4.4 Non-Movable Physics

* Platforms are fixed horizontally (vx_fp = 0).
* Subject to vertical gravity until they hit terrain.
* Restabilize if terrain is removed beneath them.

4.5 Health and loss

* Health is integer.
* Max health: 100.
* Loss if:

  * Health <= 0, or
  * Tank center x < 0 or > 799, or
  * Tank base y < 0 (safety condition).

---

5. Projectile System

5.1 Inputs per shot

ANGLE INPUT AND QUANTIZATION

* Angle is RELATIVE to the platform base.
* Valid range: 0..180 inclusive.
* 0 is flat right (relative to base), 90 is straight up (relative to base), 180 is flat left.
* Shot launch angle = baseAngleDeg + relativeAngle.

* Power: integer 0 to 100 inclusive, step 1.

5.2 Initial velocity from power

* v0 = power * 3 logical units/s.
* vx0 = v0 * cos(launchAngle) / 60
* vy0 = v0 * sin(launchAngle) / 60
* cos/sin computed via deterministic integer lookup table indexed by integer degree.
* Minimum velocity: If power > 0, initial vx and vy are clamped to at least 1 logical unit/tick in the intended direction.
* Launch Position: Projectile spawns at the tip of the tank barrel (20 units from center) to avoid immediate self-collision.

5.3 Wind
Wind is constant for the duration of a turn.

Wind value:

* Integer in range [-15, +15].

Wind application:

* Wind is treated as horizontal acceleration:

  * ax_wind = wind * 0.5 logical units/s^2

5.4 Extreme Gravity

* Gravity constant: g = 35.0 logical units/s^2 downward.
* High gravity necessitates steep firing angles.

5.5 Projectile lifetime cap

* Maximum projectile lifetime: 10 seconds (600 ticks).
* If lifetime exceeded: removed, no explosion.

5.6 Collision detection

* Terrain collision: y_fp / FP <= terrainHeight at x.
* Tank collision: Half-circle dome check.
  * Intersection with box: x in [tx-12, tx+12] and y in [ty, ty+12].
  * Shooter Immunity: The projectile ignores collisions with the shooter for the first 20 ticks.

---

6. Explosion, Damage, and Deformation

6.1 Radii

* Damage radius: 60 pixels.
* Terrain deformation radius: 45 pixels.

6.2 Damage falloff (quadratic)
For each tank:

* Compute distance d from explosion center to tank center.
* damage = floor( 100 * (1 - (d^2 / R^2)) )
* Clamp to [0, 100].

---

7. Turn System

7.1 Turn timing

* Each turn lasts 20 seconds (1200 ticks).

7.2 Auto-fire behavior

* Simulation.step automatically triggers fire() with current aim parameters when turnTimer reaches 0.

7.3 Turn flow

1. Start turn (Active player, wind, reset timer).
2. Aim phase (Inputs adjust relative angle/power).
3. Fire event (Manual or Auto).
4. Projectile simulation (Run until collision or timeout).
5. Explosion and effects (Deformation, damage).
6. Stabilization phase (Tanks fall if terrain removed).
7. Check win conditions.
8. Switch active player.

---

8. Deterministic Lockstep Networking

Protocol:
* Automated handshake via PeerJS.
* Shared 32-bit seed exchange upon connection.
* Ordered DataChannels for SHOT and SYNC messages.
* Turn-based state hash validation.

---

9. UI Requirements

HUD:
* Relative Angle shown.
* Health, Timer, Wind, Active Player.
* No debug text (ticks/hashes) shown in production HUD.

Lobby:
* Host Room ID visibility.
* Join Invitation Links (one-click join).
* Status reporting (Registering, Online, Syncing, Connected).

Controls:
* Left/Right: relative angle.
* Up/Down: power.
* Space: fire.

---

10. Rendering Requirements (Neon Vector Look)

* Y-AXIS INVERSION: Simulation Y is up, Renderer Y is down (Phaser).
* Renderer uses `HEIGHT - y` for all positions.
* Tanks rendered as domes (half-circles) + gun barrels.
* Gun barrel angle = -(baseAngleDeg + relativeAngle) in screen space.
* No health bars rendered on top of tank sprites (HUD only).
