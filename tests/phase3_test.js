import { Simulation } from '../src/simulation/sim.js';
import { GameState } from '../src/simulation/rules.js';

console.log("Starting Phase 3 verification...");

const sim = new Simulation(12345);
sim.start();

// Verify initial state
if (sim.rules.state !== GameState.TURN_AIM) {
    console.error("FAIL: Initial state is not TURN_AIM");
    process.exit(1);
}

const activeTank = sim.tanks[sim.rules.activePlayerIndex];
const initialAngle = activeTank.aimAngle;
const initialPower = activeTank.aimPower;

console.log(`Initial Angle: ${initialAngle}, Power: ${initialPower}`);

// Test 1: Hold Left (Angle +) for 10 ticks
for (let i = 0; i < 10; i++) {
    sim.step({ left: true });
}

if (activeTank.aimAngle !== initialAngle + 10) {
    console.error(`FAIL: Angle expected ${initialAngle + 10}, got ${activeTank.aimAngle}`);
    process.exit(1);
}
console.log("PASS: Angle incremented correctly.");

// Test 2: Hold Down (Power -) for 5 ticks
for (let i = 0; i < 5; i++) {
    sim.step({ down: true });
}

if (activeTank.aimPower !== initialPower - 5) {
    console.error(`FAIL: Power expected ${initialPower - 5}, got ${activeTank.aimPower}`);
    process.exit(1);
}
console.log("PASS: Power decremented correctly.");

// Test 3: Auto-fire at tick 1200
// Reset sim for clean timer check or just continue?
// Current turnTimer started at 1200.
// We stepped 15 times. Timer should be 1200 - 15 = 1185.

if (sim.rules.turnTimer !== 1200 - 15) {
    console.error(`FAIL: Timer expected ${1200 - 15}, got ${sim.rules.turnTimer}`);
}

// Run until timer expires
while (sim.rules.turnTimer > 1) { // Stop just before 0
    sim.step({});
}

// Next step should trigger fire
if (sim.rules.state !== GameState.TURN_AIM) {
    console.error("FAIL: State changed too early");
}

sim.step({}); // Timer hits 0 -> Fire

if (sim.rules.state !== GameState.PROJECTILE_FLIGHT) {
    console.error(`FAIL: Auto-fire did not trigger. State: ${sim.rules.state}, Timer: ${sim.rules.turnTimer}`);
    process.exit(1);
}
console.log("PASS: Auto-fire triggered.");

console.log("Phase 3 verification complete.");
