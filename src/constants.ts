export const SPRITE_COUNT = 1_000_000;
export const SPRITE_COLUMNS = 4;
export const SPRITE_ROWS = 3;
export const SPRITE_TYPES = 12;

export const GRAVITY = -0.00075;
export const BOUNCE_DAMPING = 0.85;
export const BOUNDS_LEFT = -1;
export const BOUNDS_RIGHT = 1;
export const BOUNDS_BOTTOM = -1;
export const BOUNDS_TOP = 1;

export const TEXTURE_WIDTH = 104;
export const TEXTURE_HEIGHT = 111;

export const SCALE_X = 0.015;
export const SCALE_Y = 0.02;

export const TARGET_FPS = 60;
export const TARGET_FRAME_TIME = 1000 / TARGET_FPS;

export const BUNNY_NAMES = [
  "rabbitv3_ash",
  "rabbitv3_batman",
  "rabbitv3_bb8",
  "rabbitv3_frankenstein",
  "rabbitv3_neo",
  "rabbitv3_sonic",
  "rabbitv3_spidey",
  "rabbitv3_stormtrooper",
  "rabbitv3_superman",
  "rabbitv3_tron",
  "rabbitv3_wolverine",
  "rabbitv3",
] as const;

export type BunnyName = (typeof BUNNY_NAMES)[number];
