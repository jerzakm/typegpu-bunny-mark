import { COUNT_PRESETS, SPRITE_COUNT } from "./constants";

export const createUI = (): void => {
  const nav = document.createElement("nav");
  nav.id = "bunny-nav";

  const label = document.createElement("span");
  label.textContent = `🐰 ${SPRITE_COUNT.toLocaleString()}`;
  nav.appendChild(label);

  const buttons = document.createElement("div");
  buttons.className = "preset-buttons";

  for (const preset of COUNT_PRESETS) {
    const btn = document.createElement("a");
    btn.href = `?bunny-count=${preset.value}`;
    btn.textContent = preset.label;
    btn.className = preset.value === SPRITE_COUNT ? "active" : "";
    buttons.appendChild(btn);
  }

  nav.appendChild(buttons);
  document.body.appendChild(nav);
};
