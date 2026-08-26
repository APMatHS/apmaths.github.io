import { CONFIG } from '../config.js';

export function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_DPR);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width: rect.width, height: rect.height, ratio };
}

export function updateCamera(camera, target, viewport, maze, smoothing = 0.14) {
  const worldWidth = maze.cols * CONFIG.CELL_SIZE;
  const worldHeight = maze.rows * CONFIG.CELL_SIZE;
  const wantedX = target.renderX * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2 - viewport.width / 2;
  const wantedY = target.renderY * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2 - viewport.height / 2;
  const maxX = Math.max(0, worldWidth - viewport.width);
  const maxY = Math.max(0, worldHeight - viewport.height);
  camera.x += (Math.max(0, Math.min(maxX, wantedX)) - camera.x) * smoothing;
  camera.y += (Math.max(0, Math.min(maxY, wantedY)) - camera.y) * smoothing;
}
