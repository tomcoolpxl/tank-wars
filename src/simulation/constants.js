/**
 * Global simulation constants.
 */
export const FP = 1000000;

export const WIDTH = 800;
export const HEIGHT = 600;

export const TICK_RATE = 60;
export const TICK_DURATION_MS = 1000 / TICK_RATE;

// Physics constants in logical units/s^2 (multiplied by FP)
export const GRAVITY_FP = 9800000; // 9.8 * 1,000,000

// Terrain constants
export const TERRAIN_STEP = 2;
export const TERRAIN_SAMPLES = WIDTH / TERRAIN_STEP; // 400
export const TERRAIN_MIN_HEIGHT = 80;
export const TERRAIN_MAX_HEIGHT = 450;

// Tank constants
export const TANK_WIDTH = 24;
export const TANK_HEIGHT = 12;
export const FRICTION_STATIC_THRESHOLD = 30; // degrees
export const FRICTION_KINETIC_FP = 200000; // 0.2 * 1,000,000
export const TANK_SPAWN_LEFT_RANGE = [40, 320];
export const TANK_SPAWN_RIGHT_RANGE = [480, 760];

// Projectile constants
export const PROJECTILE_MAX_POWER = 100;
export const PROJECTILE_POWER_TO_VEL = 4; // power * 4 units/s
export const PROJECTILE_LIFETIME_TICKS = 600;
export const WIND_ACCEL_FP = 500000; // 0.5 * 1,000,000 (acceleration units per unit of wind)

// Explosion constants
export const EXPLOSION_DAMAGE_RADIUS = 60;
export const EXPLOSION_DEFORM_RADIUS = 45;

// Turn constants
export const TURN_DURATION_TICKS = 1200; // 20s
export const STABILIZATION_CAP_TICKS = 480; // 8s
