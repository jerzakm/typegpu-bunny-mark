import {
  SPRITE_COUNT,
  SPRITE_TYPES,
  SPRITE_COLUMNS,
  SPRITE_ROWS,
  GRAVITY,
  BOUNCE_DAMPING,
  BOUNDS_LEFT,
  BOUNDS_RIGHT,
  BOUNDS_BOTTOM,
  BOUNDS_TOP,
  SCALE_X,
  SCALE_Y,
  TARGET_FRAME_TIME,
} from "./constants";
import type { PhysicsState } from "./types";

let xorSeed = 0xdeadbeef;

const fastRandom = (): number => {
  xorSeed ^= xorSeed << 13;
  xorSeed ^= xorSeed >>> 17;
  xorSeed ^= xorSeed << 5;
  return (xorSeed >>> 0) / 0xffffffff;
};

const rand = (min = 0, max = 1) => min + Math.random() * (max - min);

export const createPhysicsState = (): PhysicsState => {
  const physics = new Float32Array(SPRITE_COUNT * 4);
  const positions = new Float32Array(SPRITE_COUNT * 2);

  for (let i = 0; i < SPRITE_COUNT; i++) {
    const physOffset = i * 4;
    physics[physOffset] = rand(-0.95, 0.95);
    physics[physOffset + 1] = rand(-0.95, 0.95);
    physics[physOffset + 2] = rand(-0.015, 0.015);
    physics[physOffset + 3] = rand(-0.01, 0.01);

    const posOffset = i * 2;
    positions[posOffset] = physics[physOffset];
    positions[posOffset + 1] = physics[physOffset + 1];
  }

  return { physics, positions };
};

export const createStaticData = (): Float32Array => {
  const staticData = new Float32Array(SPRITE_COUNT * 4);

  for (let i = 0; i < SPRITE_COUNT; i++) {
    const bunnyIndex = Math.floor(rand(0, SPRITE_TYPES));
    const col = bunnyIndex % SPRITE_COLUMNS;
    const row = Math.floor(bunnyIndex / SPRITE_COLUMNS);

    const offset = i * 4;
    staticData[offset] = SCALE_X;
    staticData[offset + 1] = SCALE_Y;
    staticData[offset + 2] = col / SPRITE_COLUMNS;
    staticData[offset + 3] = row / SPRITE_ROWS;
  }

  return staticData;
};

export const updatePhysics = (state: PhysicsState, deltaTime: number): void => {
  const { physics, positions } = state;
  const dt = deltaTime / TARGET_FRAME_TIME;
  const gravityDt = GRAVITY * dt;
  const rightBound = BOUNDS_RIGHT - SCALE_X;
  const topBound = BOUNDS_TOP - SCALE_Y;

  for (let i = 0; i < SPRITE_COUNT; i++) {
    const physOffset = i << 2;

    let posX = physics[physOffset];
    let posY = physics[physOffset + 1];
    let velX = physics[physOffset + 2];
    let velY = physics[physOffset + 3] + gravityDt;

    posX += velX * dt;
    posY += velY * dt;

    if (posX > rightBound) {
      velX = -velX;
      posX = rightBound;
    } else if (posX < BOUNDS_LEFT) {
      velX = -velX;
      posX = BOUNDS_LEFT;
    }

    if (posY < BOUNDS_BOTTOM) {
      velY = -velY * BOUNCE_DAMPING;
      posY = BOUNDS_BOTTOM;
      velY += (fastRandom() * 0.006 + 0.003) * (fastRandom() > 0.5 ? 1 : 0);
    } else if (posY > topBound) {
      velY = -velY;
      posY = topBound;
    }

    physics[physOffset] = posX;
    physics[physOffset + 1] = posY;
    physics[physOffset + 2] = velX;
    physics[physOffset + 3] = velY;

    const posOffset = i << 1;
    positions[posOffset] = posX;
    positions[posOffset + 1] = posY;
  }
};
