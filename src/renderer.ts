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

const StaticBuffer = d.arrayOf(StaticSpriteData, SPRITE_COUNT);

const ScreenData = d.struct({
  size: d.vec2f,
});

const renderLayout = tgpu.bindGroupLayout({
  staticData: { storage: StaticBuffer },
  screen: { uniform: ScreenData },
});

const instanceLayout = tgpu.vertexLayout(d.arrayOf(d.vec2h), "instance");

export interface Renderer {
  root: TgpuRoot;
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  render: () => void;
  uploadPositions: (positions: Float16Array) => void;
  resize: () => void;
  destroy: () => void;
  onDeviceLost: (callback: () => void) => void;
}

export const createRenderer = async (
  canvas: HTMLCanvasElement,
  spritesheet: SpritesheetData,
  staticData: Float32Array,
  initialPositions: Float16Array
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

  const positionBuffers = [
    root.createBuffer(d.arrayOf(d.vec2h, SPRITE_COUNT)).$usage("vertex"),
    root.createBuffer(d.arrayOf(d.vec2h, SPRITE_COUNT)).$usage("vertex"),
    root.createBuffer(d.arrayOf(d.vec2h, SPRITE_COUNT)).$usage("vertex"),
  ];

  for (const buffer of positionBuffers) {
    device.queue.writeBuffer(
      buffer.buffer,
      0,
      initialPositions as BufferSource
    );
  }

  let currentBufferIndex = 0;

  const staticBuffer = root.createBuffer(StaticBuffer).$usage("storage");
  device.queue.writeBuffer(staticBuffer.buffer, 0, staticData as BufferSource);

  const screenBuffer = root.createBuffer(ScreenData).$usage("uniform");

  const renderBindGroup = root.createBindGroup(renderLayout, {
    staticData: staticBuffer,
    screen: screenBuffer,
  });

  const mainVertex = tgpu["~unstable"].vertexFn({
    in: {
      vertexIndex: d.builtin.vertexIndex,
      instanceId: d.builtin.instanceIndex,
      position: d.vec2f,
    },
    out: { pos: d.builtin.position, texcoord: d.vec2f },
  })(({ vertexIndex, instanceId, position }) => {
    const quadPositions = [
      d.vec2f(0, 0),
      d.vec2f(1, 0),
      d.vec2f(0, 1),
      d.vec2f(0, 1),
      d.vec2f(1, 0),
      d.vec2f(1, 1),
    ];
    const localPos = quadPositions[vertexIndex];

    const sprite = renderLayout.$.staticData[instanceId];
    const screen = renderLayout.$.screen;
    const scale = sprite.scale;
    const uvOffset = sprite.uvOffset;

    const aspectRatio = screen.size.x / screen.size.y;
    const correctedScale = d.vec2f(scale.x / aspectRatio, scale.y);
    const worldPos = d.vec4f(localPos.mul(correctedScale).add(position), 0, 1);

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
    .withVertex(mainVertex, { position: instanceLayout.attrib })
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
    const screenData = new Float32Array([canvas.width, canvas.height]);
    device.queue.writeBuffer(screenBuffer.buffer, 0, screenData);
  };

  const uploadPositions = (positions: Float16Array) => {
    device.queue.writeBuffer(
      positionBuffers[currentBufferIndex].buffer,
      0,
      positions as BufferSource
    );
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
      .with(instanceLayout, positionBuffers[currentBufferIndex])
      .draw(6, SPRITE_COUNT);

    currentBufferIndex = (currentBufferIndex + 1) % 3;
  };

  let deviceLostCallback: (() => void) | null = null;

  device.lost.then((info) => {
    console.error(`WebGPU device was lost: ${info.message}`);
    console.error(`Reason: ${info.reason}`);
    if (deviceLostCallback) {
      deviceLostCallback();
    }
  });

  const destroy = () => {
    for (const buffer of positionBuffers) {
      buffer.destroy();
    }
    staticBuffer.destroy();
    screenBuffer.destroy();
    texture.destroy();
    root.destroy();
  };

  const onDeviceLost = (callback: () => void) => {
    deviceLostCallback = callback;
  };

  return {
    root,
    device,
    canvas,
    render,
    uploadPositions,
    resize,
    destroy,
    onDeviceLost,
  };
};
