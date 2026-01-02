import tgpu, { type TgpuRoot } from "typegpu";
import * as d from "typegpu/data";
import * as std from "typegpu/std";
import {
  SPRITE_COUNT,
  SPRITE_COLUMNS,
  SPRITE_ROWS,
  TEXTURE_WIDTH,
  TEXTURE_HEIGHT,
} from "./constants";
import type { SpritesheetData } from "./types";

const StaticSpriteData = d.struct({
  scale: d.vec2f,
  uvOffset: d.vec2f,
});

const PositionBuffer = d.arrayOf(d.vec2f, SPRITE_COUNT);
const StaticBuffer = d.arrayOf(StaticSpriteData, SPRITE_COUNT);

const renderLayout = tgpu.bindGroupLayout({
  positions: { storage: PositionBuffer },
  staticData: { storage: StaticBuffer },
});

export interface Renderer {
  root: TgpuRoot;
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  rawPositionBuffer: GPUBuffer;
  render: () => void;
  uploadPositions: (positions: Float32Array) => void;
  resize: () => void;
}

export const createRenderer = async (
  canvas: HTMLCanvasElement,
  spritesheet: SpritesheetData,
  staticData: Float32Array,
  initialPositions: Float32Array
): Promise<Renderer> => {
  const root = await tgpu.init();
  const device = root.device;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const context = canvas.getContext("webgpu") as GPUCanvasContext;

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  const texture = root["~unstable"]
    .createTexture({
      size: [TEXTURE_WIDTH, TEXTURE_HEIGHT],
      format: "rgba8unorm" as const,
    })
    .$usage("sampled");

  const sampledView = texture.createView();

  const sampler = root["~unstable"].createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = TEXTURE_WIDTH;
  resizedCanvas.height = TEXTURE_HEIGHT;
  const ctx = resizedCanvas.getContext("2d")!;
  ctx.drawImage(spritesheet.canvas, 0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const resizedImageData = ctx.getImageData(
    0,
    0,
    TEXTURE_WIDTH,
    TEXTURE_HEIGHT
  );
  texture.write(resizedImageData.data as unknown as Uint8Array);

  const positionBuffer = root.createBuffer(PositionBuffer).$usage("storage");
  const rawPositionBuffer = positionBuffer.buffer;
  device.queue.writeBuffer(
    rawPositionBuffer,
    0,
    initialPositions as BufferSource
  );

  const staticBuffer = root.createBuffer(StaticBuffer).$usage("storage");
  device.queue.writeBuffer(staticBuffer.buffer, 0, staticData as BufferSource);

  const renderBindGroup = root.createBindGroup(renderLayout, {
    positions: positionBuffer,
    staticData: staticBuffer,
  });

  const mainVertex = tgpu["~unstable"].vertexFn({
    in: {
      vertexIndex: d.builtin.vertexIndex,
      instanceId: d.builtin.instanceIndex,
    },
    out: { pos: d.builtin.position, texcoord: d.vec2f },
  })(({ vertexIndex, instanceId }) => {
    const quadPositions = [
      d.vec2f(0, 0),
      d.vec2f(1, 0),
      d.vec2f(0, 1),
      d.vec2f(0, 1),
      d.vec2f(1, 0),
      d.vec2f(1, 1),
    ];
    const localPos = quadPositions[vertexIndex];

    const position = renderLayout.$.positions[instanceId];
    const sprite = renderLayout.$.staticData[instanceId];
    const scale = sprite.scale;
    const uvOffset = sprite.uvOffset;

    const worldPos = d.vec4f(localPos.mul(scale).add(position), 0, 1);

    const uvScale = d.vec2f(1.0 / SPRITE_COLUMNS, 1.0 / SPRITE_ROWS);
    const uv = d
      .vec2f(localPos.x, 1 - localPos.y)
      .mul(uvScale)
      .add(uvOffset);

    return { pos: worldPos, texcoord: uv };
  });

  const mainFragment = tgpu["~unstable"].fragmentFn({
    out: d.vec4f,
    in: { pos: d.builtin.position, texcoord: d.vec2f },
  })(({ texcoord }) => std.textureSample(sampledView.$, sampler.$, texcoord));

  const renderPipeline = root["~unstable"]
    .withVertex(mainVertex, {})
    .withFragment(mainFragment, {
      format: presentationFormat,
      blend: {
        color: {
          srcFactor: "src-alpha",
          dstFactor: "one-minus-src-alpha",
          operation: "add",
        },
        alpha: {
          srcFactor: "one",
          dstFactor: "one-minus-src-alpha",
          operation: "add",
        },
      },
    })
    .createPipeline();

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  };

  const uploadPositions = (positions: Float32Array) => {
    device.queue.writeBuffer(rawPositionBuffer, 0, positions as BufferSource);
  };

  const render = () => {
    renderPipeline
      .withColorAttachment({
        view: context.getCurrentTexture().createView(),
        clearValue: [0.2, 0.2, 0.25, 1],
        loadOp: "clear",
        storeOp: "store",
      })
      .with(renderBindGroup)
      .draw(6, SPRITE_COUNT);
  };

  return {
    root,
    device,
    canvas,
    rawPositionBuffer,
    render,
    uploadPositions,
    resize,
  };
};
