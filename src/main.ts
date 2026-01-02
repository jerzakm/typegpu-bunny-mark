import "./style.css";
import { SPRITE_COUNT } from "./constants";
import { createPhysicsState, createStaticData, updatePhysics } from "./physics";
import { createRenderer } from "./renderer";
import { generateSpritesheet } from "./spritesheet";
import { createUI } from "./ui";

const init = async () => {
  createUI();

  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  const spritesheet = await generateSpritesheet();
  const physicsState = createPhysicsState();
  const staticData = createStaticData();

  const renderer = await createRenderer(
    canvas,
    spritesheet,
    staticData,
    physicsState.positions
  );

  renderer.resize();
  window.addEventListener("resize", renderer.resize);

  let lastTime = performance.now();

  const animate = () => {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - lastTime, 100);
    lastTime = currentTime;

    updatePhysics(physicsState, deltaTime);
    renderer.uploadPositions(physicsState.positions);
    renderer.render();

    requestAnimationFrame(animate);
  };

  animate();
  console.log(`${SPRITE_COUNT.toLocaleString()} bunnies bouncing!`);
};

init();
