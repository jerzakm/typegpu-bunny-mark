import { BUNNY_NAMES, type BunnyName } from "./constants";
import type { SpriteFrame, SpritesheetData } from "./types";

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });

const downloadAllBunnies = async (): Promise<
  Map<BunnyName, HTMLImageElement>
> => {
  const results = await Promise.all(
    BUNNY_NAMES.map(async (name) => ({
      name,
      img: await loadImage(`/pixi_bunnies/${name}.png`),
    }))
  );

  return new Map(results.map(({ name, img }) => [name, img]));
};

const calculateLayout = (images: Map<BunnyName, HTMLImageElement>) => {
  let maxWidth = 0;
  let maxHeight = 0;

  for (const img of images.values()) {
    maxWidth = Math.max(maxWidth, img.width);
    maxHeight = Math.max(maxHeight, img.height);
  }

  const columns = Math.ceil(Math.sqrt(images.size));
  const rows = Math.ceil(images.size / columns);

  return { cellWidth: maxWidth, cellHeight: maxHeight, columns, rows };
};

const createSpritesheet = (
  images: Map<BunnyName, HTMLImageElement>
): SpritesheetData => {
  const { cellWidth, cellHeight, columns, rows } = calculateLayout(images);
  const totalWidth = columns * cellWidth;
  const totalHeight = rows * cellHeight;

  const canvas = document.createElement("canvas");
  canvas.width = totalWidth;
  canvas.height = totalHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, totalWidth, totalHeight);

  const frames = new Map<string, SpriteFrame>();
  let frameNumber = 0;

  for (const name of BUNNY_NAMES) {
    const img = images.get(name);
    if (!img) continue;

    const col = frameNumber % columns;
    const row = Math.floor(frameNumber / columns);
    const x = col * cellWidth;
    const y = row * cellHeight;

    const offsetX = Math.floor((cellWidth - img.width) / 2);
    const offsetY = Math.floor((cellHeight - img.height) / 2);

    ctx.drawImage(img, x + offsetX, y + offsetY);

    frames.set(name, {
      frameNumber,
      x,
      y,
      width: cellWidth,
      height: cellHeight,
    });
    frameNumber++;
  }

  return {
    canvas,
    imageData: ctx.getImageData(0, 0, totalWidth, totalHeight),
    frames,
    totalWidth,
    totalHeight,
  };
};

export const generateSpritesheet = async (): Promise<SpritesheetData> => {
  const images = await downloadAllBunnies();
  return createSpritesheet(images);
};

export const getFrame = (
  spritesheet: SpritesheetData,
  name: BunnyName
): SpriteFrame | undefined => spritesheet.frames.get(name);

export const spritesheetToDataURL = (
  spritesheet: SpritesheetData,
  format: "image/png" | "image/jpeg" = "image/png"
): string => spritesheet.canvas.toDataURL(format);

export const downloadSpritesheet = (
  spritesheet: SpritesheetData,
  filename = "bunny-spritesheet.png"
): void => {
  const link = document.createElement("a");
  link.href = spritesheetToDataURL(spritesheet);
  link.download = filename;
  link.click();
};

export const exportFrameDataAsJSON = (spritesheet: SpritesheetData): string =>
  JSON.stringify(
    {
      meta: {
        width: spritesheet.totalWidth,
        height: spritesheet.totalHeight,
        frameCount: spritesheet.frames.size,
      },
      frames: Object.fromEntries(spritesheet.frames),
    },
    null,
    2
  );
