import { Simulation } from '../src/simulation/sim.js';
import { GameState } from '../src/simulation/rules.js';

/**
 * Runs a simulation with a set of scripted shots and returns the final state hash.
 */
function runSimulation(seed, shots) {
    const sim = new Simulation(seed);
    sim.start();

    let shotIndex = 0;
    let ticks = 0;
    const MAX_TICKS = 20000; // Safety cap
    const turnHashes = [];

    while (sim.rules.state !== GameState.GAME_OVER && ticks < MAX_TICKS) {
        if (sim.rules.state === GameState.TURN_AIM && shotIndex < shots.length) {
            const shot = shots[shotIndex++];
            sim.fire(shot.angle, shot.power, sim.rules.activePlayerIndex);
            
            // Step until next turn or game over
            while (sim.rules.state !== GameState.TURN_AIM && sim.rules.state !== GameState.GAME_OVER && ticks < MAX_TICKS) {
                sim.step({});
                ticks++;
            }
            turnHashes.push({
                turn: sim.rules.turnNumber,
                hash: sim.getStateHash()
            });
        } else {
            sim.step({});
            ticks++;
        }
    }

    return {
        hash: sim.getStateHash(),
        ticks: sim.tickCount,
        turnNumber: sim.rules.turnNumber,
        winner: sim.rules.winner,
        turnHashes
    };
}

const SEED = 12345;
const SHOTS = [
    { angle: 45, power: 50 },
    { angle: 135, power: 60 },
    { angle: 60, power: 80 },
    { angle: 120, power: 70 },
    { angle: 30, power: 90 },
    { angle: 150, power: 40 }
];

console.log("Running Simulation 1...");
const result1 = runSimulation(SEED, SHOTS);

console.log("Running Simulation 2...");
const result2 = runSimulation(SEED, SHOTS);

console.log("\nResults:");
console.log("Sim 1:", { ...result1, turnHashes: result1.turnHashes.length });
console.log("Sim 2:", { ...result2, turnHashes: result2.turnHashes.length });

// Compare turn-by-turn hashes
let drifted = false;
if (result1.turnHashes.length !== result2.turnHashes.length) {
    console.error("FAILURE: Different number of turns simulated!");
    drifted = true;
} else {
    for (let i = 0; i < result1.turnHashes.length; i++) {
        if (result1.turnHashes[i].hash !== result2.turnHashes[i].hash) {
            console.error(`FAILURE: Drift at turn ${result1.turnHashes[i].turn}!`);
            drifted = true;
        }
    }
}

if (!drifted && result1.hash === result2.hash) {
    console.log("\nSUCCESS: Simulations are deterministic turn-by-turn!");
} else {
    console.error("\nFAILURE: Simulations drifted!");
    process.exit(1);
}
