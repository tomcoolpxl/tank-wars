## Implementation plan (Phaser + JavaScript, no TypeScript)

### Principles (non-negotiable for this project)

* Deterministic simulation is owned by your code, not Phaser.
* Phaser is used for: rendering, input capture, UI, scene management.
* Simulation runs at a fixed 60 Hz tick using integer fixed-point math.
* Network sync is deterministic lockstep: exchange only seed and shot inputs.
* Anything visual (particles, glow, interpolation) must not write to simulation state.

---

## Phase 0: Project skeleton and deployment

Deliverables

* A Phaser game that loads on GitHub Pages and shows a blank scene at 800x600 logical resolution.
* A build pipeline that outputs static files.

Steps

1. Create repo structure:

   * /src

     * /main.js
     * /scenes/GameScene.js
     * /scenes/LobbyScene.js
     * /simulation (pure logic, no Phaser)
     * /net (webrtc)
     * /render (phaser rendering helpers)
     * /ui (hud + signaling UI)
   * /public (index.html, favicon)
2. Use a simple bundler suited for GitHub Pages:

   * Vite is fine with plain JS.
3. Configure Phaser scale:

   * Base size 800x600.
   * Scale.FIT + autoCenter.
4. Set up GitHub Pages deploy (GitHub Actions or manual docs folder).

Acceptance checks

* Page loads, Phaser canvas appears, resize works, no console errors.

---

## Phase 1: Deterministic simulation core (headless, pure JS)

Goal

* Build the full simulation engine independent of Phaser so it can be unit tested and used identically by both peers.

Deliverables

* A Simulation module that can:

  * Create a match from seed and parameters
  * Advance ticks deterministically
  * Apply player inputs
  * Produce a render snapshot

Key files

* /src/simulation/constants.js
* /src/simulation/rng.js
* /src/simulation/fixed.js
* /src/simulation/isqrt.js
* /src/simulation/trigLUT.js
* /src/simulation/terrain.js
* /src/simulation/tank.js
* /src/simulation/projectile.js
* /src/simulation/explosion.js
* /src/simulation/rules.js (turn state machine)
* /src/simulation/sim.js (public API)

Steps

1. Fixed-point utilities

   * Define FP = 1000.
   * Helpers: mulFP, divFP (signed, deterministic), clamp, sign, abs.
   * Avoid JS floating math in simulation paths.
2. Deterministic RNG

   * Implement xorshift32 or LCG using 32-bit ints via bitwise ops.
   * Functions:

     * nextU32()
     * nextInt(min, max) inclusive
3. Deterministic integer sqrt

   * Implement isqrt(n) returning floor(sqrt(n)) for 32-bit safe ints.
4. Trig lookup table

   * Angle quantization is frozen at 1 integer degree (mandatory per requirements).
   * Precompute sin/cos for exactly 0..180 degrees (181 entries) in fixed-point (scaled by FP).
   * Table is indexed by integer degree only. No sub-degree support.
   * Store as arrays of integers.
5. Terrain heightmap

   * Heightmap step = 2 pixels, length 400.
   * Terrain generation from seed:

     * Use layered deterministic waves + bounded random offsets.
     * Clamp heights to [80, 450].
     * Add smoothing pass (moving average) to avoid extreme slopes.
   * Provide functions:

     * getHeightAtX(xPx) -> yPx (int)
     * deformCrater(xPx, yPx, radiusPx)
6. Tank model

   * State: x_fp, y_fp, vx_fp, vy_fp, health, alive, angle_deg (render only), stable flags.
   * Spawn in left/right ranges; validate slope locally, resample if too steep.
   * Contact resolution:

     * Snap to terrain if within epsilon.
     * Otherwise apply gravity.
   * Sliding:

     * Compute slope angle category using local derivative.
     * If >= 30 degrees, apply downhill acceleration with friction.
7. Projectile model

   * State: active, x_fp, y_fp, vx_fp, vy_fp, ticksAlive.
   * Launch: angle, power -> initial vx/vy via LUT.
   * Apply gravity + wind accel each tick.
   * Collision:

     * Terrain: y <= height(x)
     * Tanks: AABB hit check
     * Bounds (out-of-bounds termination): if projectile position is outside map bounds (x < 0, x > 799, y < 0, y > 599), terminate immediately. No explosion is generated. Turn proceeds directly to stabilization (tank physics resolution).
   * Lifetime cap: 600 ticks.
8. Explosion and damage

   * Damage radius 60, deform radius 45.
   * Quadratic falloff using integer ratio math.
   * Apply crater deformation through terrain module.
9. Rules / turn state machine

   * States:

     * LOBBY (not in sim if you prefer)
     * TURN_AIM
     * PROJECTILE_FLIGHT
     * POST_EXPLOSION_STABILIZE
     * GAME_OVER
   * Per-turn timer: 1200 ticks.
   * Wind generation at turn start using RNG.
   * Auto-fire on timeout: only the active player (shooter) runs the authoritative timer. When the timer reaches 0, the active player immediately issues the SHOT with current angle/power. The non-active peer must not independently auto-fire; it waits for the SHOT message.
   * Stabilization cap: 480 ticks.

Acceptance checks

* Given same seed and same list of ShotInputs, sim produces identical final state every run.
* Add a deterministic state hash function (debug-only) that hashes key integers each tick or each turn.

---

## Phase 2: Integrate simulation into Phaser (render-only binding)

Goal

* Phaser displays the simulation state without affecting it.

Deliverables

* GameScene that:

  * Owns a Simulation instance.
  * Runs a tick scheduler at 60 Hz independent from Phaser delta.
  * Renders terrain, tanks, projectile, explosion visuals.

Steps

1. Tick scheduler

   * Do not use Phaser’s delta to integrate physics.
   * Use a fixed accumulator:

     * Keep an internal accumulator of real time for scheduling ticks.
     * Execute exactly N simulation ticks when accumulator exceeds tickDuration.
   * Important: simulation tick count is what drives timeouts and determinism.
2. Render snapshot pattern

   * Each simulation tick updates internal state.
   * Rendering reads from state and draws.
   * Optionally create a lightweight snapshot object for rendering:

     * terrain polyline points
     * tank positions/angles/health
     * projectile position
     * active explosion ring radius (visual only can be tied to sim events)
3. Terrain rendering in Phaser

   * Use Phaser.GameObjects.Graphics to draw polyline outline.
   * Cache terrain points from heightmap; update only after deformation.
4. Tank rendering

   * Draw simple wireframe rectangle with rotation (render rotation derived from slope angle calculation or computed in render via height derivative).
5. Projectile rendering

   * Draw a small circle.
6. Explosion visuals

   * On sim explosion event, spawn a visual-only effect entity:

     * expanding ring over 15-20 frames
     * particles (Phaser particles) seeded with non-sim randomness allowed
   * Must not influence sim.

Acceptance checks

* Visuals update smoothly, but sim tick count remains consistent (log ticks).
* Terrain redraw happens only on deformation events.

---

## Phase 3: Input system (deterministic sampling)

Goal

* Inputs feel responsive but remain deterministic and network-friendly.

Deliverables

* Keyboard controls:

  * Left/Right: angle +/- 1 per sim tick when held
  * Up/Down: power +/- 1 per sim tick when held
  * Space: fire
* Aim values are part of sim state, updated only on sim ticks.

Steps

1. In Phaser, capture key states (down/up).
2. Each sim tick, apply at most:

   * one angle increment if key held
   * one power increment if key held
3. Ensure clamp:

   * angle 0..180 (integer degrees only, exactly 1 degree per tick when held)
   * power 0..100 (integer, exactly 1 per tick when held)
4. Fire action:

   * If space is pressed in TURN_AIM state, create a ShotInput event.
   * Debounce so holding space does not auto-fire repeatedly.

Acceptance checks

* Holding keys changes angle/power predictably at 60 steps/sec (1 integer step per tick).
* Timer auto-fire triggers exactly at tick 1200 if no fire — but only on the active player. The non-active peer never locally auto-fires.

---

## Phase 4: WebRTC P2P networking with manual signaling

Goal

* Two browsers connect without a server using copy/paste signaling.
* Lockstep exchange of seed and shot inputs.

Deliverables

* LobbyScene UI:

  * Create offer (Host)
  * Paste offer (Join)
  * Create answer (Join)
  * Paste answer (Host)
  * Connection status display
* A DataChannel message protocol:

  * HELLO/version
  * MATCH_INIT { seed, params }
  * SHOT { turnNumber, angle, power }
  * ACK (optional)
  * DESYNC { turnNumber, hash } (debug)

Steps

1. Implement /src/net/webrtc.js

   * Create RTCPeerConnection (use public STUN servers; no TURN).
   * Create DataChannel on host; joiner listens for ondatachannel.
   * Serialize signaling objects as JSON strings for copy/paste UI.
2. Protocol design

   * Define message schema and validate on receipt.
   * Always include:

     * protocolVersion
     * matchId (random u32)
     * turnNumber

   SHOT message validation (on receipt of SHOT { turnNumber, angleDeg, power }):

   * turnNumber must equal the receiver's expected current turnNumber.
   * The receiver's local rules state must be waiting-for-shot for that turn (not currently simulating a projectile).
   * angleDeg must be an integer in [0, 180].
   * power must be an integer in [0, 100].
   * The sending peer must be the active player for turnNumber.
   * If any validation fails, abort match and show an error.

3. Deterministic start

   * Host generates seed and params.
   * Host sends MATCH_INIT.
   * Both instantiate Simulation with same parameters.
   * Start at tick 0 immediately after both confirm READY.
4. Turn-based sync

   * Only the active player is allowed to send SHOT.
   * Exactly one SHOT message per turnNumber. If a second SHOT arrives for the same turnNumber, treat as protocol violation and abort match.
   * Receiver validates per the SHOT message validation rules above.
   * If any check fails, abort match (MVP).
5. Latency handling

   * Because it is turn-based, latency is acceptable.
   * During opponent aim, local sim can idle; timer on opponent side is authoritative only if both simulate same ticks. To avoid real-time drift:

     * Make turn timer driven by sim ticks, but both peers must advance ticks at same pace.
     * In practice, different machines will not tick exactly the same if based on wall-clock.

Critical decision for “no server” determinism

* You cannot guarantee both peers advance real-time ticks identically without a shared clock.
* The usual deterministic approach here is: advance simulation only on events, not on wall-clock.
* But you require a 20s timer, which is wall-clock by nature.

Solution (frozen per requirements)

TURN TIMER AUTHORITY:

* The 20-second turn timer is authoritative only on the active player (the shooter).
* The non-active peer must not independently enforce timeout or auto-fire.
* When the timer reaches 0 on the active peer, that peer immediately sends SHOT using current angle/power.
* The non-active peer must:

  * Display an "opponent aiming" state.
  * Accept the SHOT message as the sole trigger for projectile simulation on that turn.
  * Never generate an auto-shot locally.
* The simulation tick counter is still used for all physics stepping (60 Hz fixed), but wall-clock progression and timer display are not used to infer shot events on the non-active peer.
* Message ordering: exactly one SHOT per turnNumber. A duplicate SHOT for the same turnNumber is a protocol violation — abort match.

AUTHORITY RULE:

* Physics and game state are deterministic and derived from shared seed plus agreed inputs.
* The only authoritative event that starts projectile simulation on a given turn is the receipt (or local issuance, for the active peer) of the SHOT message for that turnNumber.
* The non-active peer must not infer or synthesize a SHOT event based on its local wall-clock timer.

Acceptance checks

* Host and joiner connect reliably on typical networks.
* Both see identical terrain and tank positions.
* After each shot, both end in identical post-stabilization state.

---

## Phase 5: HUD and game UX

Deliverables

* HUD overlay:

  * health bars
  * current angle/power
  * wind numeric + bar
  * active player indicator
  * timer for active player (authoritative)
* Basic game over screen.

Steps

1. Implement /src/ui/hud.js that reads sim state and draws text/bars using Phaser Text + Graphics.
2. Ensure HUD reads only; never writes sim state directly (except via input actions).

Acceptance checks

* HUD updates on tick boundaries; no flicker.

---

## Phase 6: Determinism test harness (essential)

Goal

* Detect drift early.

Deliverables

* A local test page or dev mode that:

  * Runs simulation twice with same seed and scripted inputs
  * Compares state hashes at end of each turn
* A debug overlay that can show:

  * current tick
  * turn number
  * state hash

Steps

1. Implement simStateHash(state) that hashes:

   * terrain heights (sampled or full)
   * tank x/y/vx/vy/health
   * projectile state
   * current wind
   * RNG state
2. In dev mode:

   * record all ShotInputs and seeds
   * allow replay deterministically

Acceptance checks

* Replays match exactly.

---

## Phase 7: Visual polish (still deterministic-safe)

Deliverables

* Neon look improvements:

  * multi-stroke glow technique
  * subtle flicker (render-only)
* Particles on explosion (render-only)
* Optional projectile trail (render-only)

Steps

* Keep all particle randomness outside sim.
* Ensure terrain redraw is efficient:

  * Only rebuild polyline points after crater.

Acceptance checks

* No measurable change to sim hashes when enabling/disabling effects.

---

## Phase 8: Packaging for GitHub Pages and reliability pass

Deliverables

* Stable build, minimal console warnings.
* Clear instructions in README for:

  * how to host
  * how to connect via manual signaling
  * known limitations (NAT issues, no TURN)

Steps

* Add connection troubleshooting UI:

  * show ICE candidates gathered count
  * show connection state
* Add a “copy to clipboard” button for offer/answer.

Acceptance checks

* Two different machines can connect and play a full match.

---

## Risk register (things likely to bite)

1. Clock-based turn timer vs determinism

* Resolved: the active player is the sole authority for turn timing. The non-active peer never auto-fires locally; it waits for the SHOT message. See TURN TIMER AUTHORITY and AUTHORITY RULE in Phase 4.

2. Phaser update loop vs fixed tick

* Never use Phaser delta for sim integration.
* Always drive sim ticks yourself.

3. JS number pitfalls

* Even with fixed-point, intermediate multiplication can exceed 32-bit.
* Keep values bounded and use safe integer arithmetic.
* Use bitwise ops only where safe (32-bit signed).

4. WebRTC connectivity

* Without TURN, some users cannot connect.
* You accepted this tradeoff; document it.

5. Heightmap limitations

* No caves/overhangs. Ensure crater deformation rules never attempt them.

---

## Concrete milestone order (what to build in what order)

Milestone 1: Headless sim demo (no Phaser)

* Generate terrain, spawn tanks, simulate one scripted shot, print state hash.

Milestone 2: Phaser renders sim state

* Terrain and tanks drawn, no input.

Milestone 3: Local hotseat gameplay

* Single browser, both players on same keyboard with turn switching.

Milestone 4: Add wind per turn and timer (active-player authoritative)

* Auto-fire implemented.

Milestone 5: Add WebRTC and manual signaling lobby

* Two browsers, sync seed, exchange shots.

Milestone 6: Add terrain deformation + stabilization

* Tanks fall/slide.

Milestone 7: Add HUD + game over

* Usable MVP.

Milestone 8: Determinism replay tooling

* Record/replay shot list.

Milestone 9: Visual polish

* Neon glow and particles.

---

## Frozen decisions (confirmed in requirements)

1. Angle quantization: **1 integer degree only**. Trig LUT is 181 entries (0..180). Any received SHOT with non-integer or out-of-range angle aborts the match.

2. Projectile leaving bounds: **no explosion**. Projectile is terminated immediately when outside map bounds. Turn proceeds directly to stabilization.

