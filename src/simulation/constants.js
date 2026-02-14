/**
 * Global simulation constants.
 */
export const FP = 1000000;

export const WIDTH = 800;
export const HEIGHT = 800; // Increased from 600 to 800
export const SKY_BUFFER = 200; // Invisible area above the viewport for high shots
export const VIEWPORT_HEIGHT = 600; // Original visible height

export const TICK_RATE = 60;
export const TICK_DURATION_MS = 1000 / TICK_RATE;

// Physics constants in logical units/s^2 (multiplied by FP)
export const GRAVITY_FP = 35000000; // 35.0 * 1,000,000 (was 25.0)
export const GRAVITY_PER_TICK_FP = Math.floor(GRAVITY_FP / (TICK_RATE * TICK_RATE));

// Terrain constants
export const TERRAIN_STEP = 2;
export const TERRAIN_SAMPLES = WIDTH / TERRAIN_STEP; // 400
export const TERRAIN_MIN_HEIGHT = 80;
export const TERRAIN_MAX_HEIGHT = 450;
export const TERRAIN_GEN_BASE_RANGE = [150, 300];
export const TERRAIN_GEN_TREND_RANGE = [-2, 2];
export const TERRAIN_GEN_TREND_LIMIT = 5;
export const TERRAIN_GEN_SMOOTH_PASSES = 3;

// Tank constants
export const MAX_HEALTH = 100;
export const TANK_WIDTH = 24;
export const TANK_HEIGHT = 0;
export const FRICTION_STATIC_THRESHOLD = 30; // degrees
export const FRICTION_KINETIC_FP = 200000; // 0.2 * 1,000,000
export const TANK_SPAWN_LEFT_RANGE = [40, 320];
export const TANK_SPAWN_RIGHT_RANGE = [480, 760];
export const TANK_SPAWN_Y_OFFSET = 6;
export const TANK_START_AIM_ANGLE = 90;
export const TANK_START_AIM_POWER = 50;
export const TANK_SLOPE_SAMPLE_DIST = 4;
export const TANK_GROUND_EPSILON = 1;
export const TANK_STABILITY_THRESHOLD = 1000;
export const TANK_DOME_RADIUS_X = 12;
export const TANK_DOME_RADIUS_Y = 12;

// Projectile constants
export const PROJECTILE_MAX_POWER = 100;
export const PROJECTILE_POWER_TO_VEL = 3; // power * 3 units/s
export const PROJECTILE_LIFETIME_TICKS = 1200;
export const WIND_ACCEL_FP = 500000; // 0.5 * 1,000,000 (acceleration units per unit of wind)
export const WIND_ACCEL_PER_TICK_FP = Math.floor(WIND_ACCEL_FP / (TICK_RATE * TICK_RATE));
export const PROJECTILE_SELF_COLLISION_TICKS = 20;
export const PROJECTILE_SPAWN_OFFSET = 20;

// Explosion constants
export const EXPLOSION_DAMAGE_RADIUS = 60;
export const EXPLOSION_DEFORM_RADIUS = 45;

// Turn constants
export const TURN_DURATION_TICKS = 1200; // 20s
export const STABILIZATION_CAP_TICKS = 480; // 8s
export const WIND_MAX_ABS = 15;
