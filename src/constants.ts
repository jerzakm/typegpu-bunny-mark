const DEFAULT_COUNT = 100_000;

const getCountFromURL = (): number => {
  const params = new URLSearchParams(window.location.search);
  const count = params.get("bunny-count");
  if (!count) return DEFAULT_COUNT;
  const parsed = parseInt(count, 10);
  return isNaN(parsed)
    ? DEFAULT_COUNT
    : Math.max(1000, Math.min(parsed, 2_000_000));
};

export const SPRITE_COUNT = getCountFromURL();

export const COUNT_PRESETS = [
  { label: "1K", value: 1_000 },
  { label: "50K", value: 50_000 },
  { label: "100K", value: 100_000 },
  { label: "200K", value: 200_000 },
  { label: "500K", value: 500_000 },
  { label: "1M", value: 1_000_000 },
  { label: "1.5M", value: 1_500_000 },
  { label: "2M", value: 2_000_000 },
] as const;

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
