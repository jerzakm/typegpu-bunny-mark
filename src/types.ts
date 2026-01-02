export interface SpriteFrame {
  frameNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpritesheetData {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  frames: Map<string, SpriteFrame>;
  totalWidth: number;
  totalHeight: number;
}

export interface PhysicsState {
  physics: Float32Array;
  positions: Float32Array;
}
