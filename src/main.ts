import "./style.css";
import { SPRITE_COUNT } from "./constants";
import { createPhysicsState, createStaticData, updatePhysics } from "./physics";
import { createRenderer, type Renderer } from "./renderer";
import { generateSpritesheet } from "./spritesheet";
import { createUI } from "./ui";

let renderer: Renderer | null = null;
let animationId: number | null = null;

const cleanup = () => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (renderer) {
    renderer.destroy();
    renderer = null;
  }
};

window.addEventListener("beforeunload", cleanup);
window.addEventListener("pagehide", cleanup);

const init = async () => {
  createUI();

  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  const spritesheet = await generateSpritesheet();
  const physicsState = createPhysicsState();
  const staticData = createStaticData();

  renderer = await createRenderer(
    canvas,
    spritesheet,
    staticData,
    physicsState.positions
  );

  renderer.onDeviceLost(async () => {
    console.log("Attempting to recover from device loss...");
    cleanup();
    setTimeout(() => init(), 1000);
  });

  renderer.resize();
  window.addEventListener("resize", renderer.resize);

  let lastTime = performance.now();

  const animate = () => {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - lastTime, 100);
    lastTime = currentTime;

    updatePhysics(physicsState, deltaTime);
    renderer?.uploadPositions(physicsState.positions);
    renderer?.render();

    animationId = requestAnimationFrame(animate);
  };

  animate();
  console.log(`${SPRITE_COUNT.toLocaleString()} bunnies bouncing!`);
};

init();
