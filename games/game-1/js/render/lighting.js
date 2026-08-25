import { CONFIG } from '../config.js';

export function applyLighting(ctx, viewport, camera, player) {
  const size = CONFIG.CELL_SIZE;
  const px = player.renderX * size + size / 2 - camera.x;
  const py = player.renderY * size + size / 2 - camera.y;
  const radius = CONFIG.PLAYER_VISION * size;
  ctx.save();
  const gradient = ctx.createRadialGradient(px, py, size * 0.52, px, py, radius);
  gradient.addColorStop(0, 'rgba(0, 3, 7, 0)');
  gradient.addColorStop(0.56, 'rgba(0, 3, 7, .08)');
  gradient.addColorStop(0.82, 'rgba(0, 3, 7, .66)');
  gradient.addColorStop(1, 'rgba(0, 3, 7, .94)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.fillStyle = 'rgba(0, 3, 7, .94)';
  ctx.beginPath();
  ctx.rect(0, 0, viewport.width, viewport.height);
  ctx.arc(px, py, radius, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.restore();
}
